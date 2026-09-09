"""
Local file-based storage backend.

A minimal Supabase-compatible client used as an automatic fallback when
Supabase credentials are not configured. Persists all tables as JSON files
under backend/data/tables/ and uploaded files under backend/data/storage/.

This keeps the entire platform functional (uploads, schema detection,
forecasts, analyses, optimization, digital twin...) in local mode with
zero external services required.
"""
import json
import logging
import os
import threading
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
TABLES_DIR = os.path.join(DATA_DIR, "tables")
STORAGE_DIR = os.path.join(DATA_DIR, "storage")
MAX_TABLE_ROWS = 50000

os.makedirs(TABLES_DIR, exist_ok=True)
os.makedirs(STORAGE_DIR, exist_ok=True)

_io_lock = threading.RLock()


def _json_safe(value: Any) -> Any:
    """Convert numpy/pandas/etc. values into JSON-serializable primitives"""
    try:
        import numpy as _np
        import pandas as _pd
        if value is None or isinstance(value, (bool, int, float, str)):
            return value
        if isinstance(value, _np.bool_):
            return bool(value)
        if isinstance(value, _np.integer):
            return int(value)
        if isinstance(value, _np.floating):
            return float(value) if _np.isfinite(value) else None
        if isinstance(value, _pd.Timestamp):
            return value.isoformat()
    except ImportError:  # pragma: no cover
        pass
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    return str(value)


def _table_path(table: str) -> str:
    return os.path.join(TABLES_DIR, f"{table}.json")


def _load_table(table: str) -> List[Dict[str, Any]]:
    with _io_lock:
        path = _table_path(table)
        if not os.path.exists(path):
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                rows = json.load(f)
            return rows if isinstance(rows, list) else []
        except Exception as e:
            logger.warning(f"Could not load local table '{table}': {e}")
            return []


def _save_table(table: str, rows: List[Dict[str, Any]]) -> None:
    with _io_lock:
        with open(_table_path(table), "w", encoding="utf-8") as f:
            json.dump(rows, f, default=str)


class LocalResult:
    """Mimics supabase-py's APIResponse (only `.data` is used across the app)"""

    def __init__(self, data: Any):
        self.data = data


class LocalTableQuery:
    """Fluent query builder mimicking supabase-py's Postgrest client"""

    def __init__(self, table: str):
        self._table = table
        self._select_cols: Optional[List[str]] = None
        self._filters: List[Tuple[str, str, Any]] = []
        self._order: Optional[Tuple[str, bool]] = None
        self._limit: Optional[int] = None
        self._range: Optional[Tuple[int, int]] = None
        self._action = "select"
        self._payload: Any = None

    # ---------- query building ----------
    def select(self, *cols: str, **_kwargs) -> "LocalTableQuery":
        self._action = "select"
        self._select_cols = list(cols) if cols else None
        return self

    def eq(self, col: str, value: Any) -> "LocalTableQuery":
        self._filters.append((col, "=", value))
        return self

    def neq(self, col: str, value: Any) -> "LocalTableQuery":
        self._filters.append((col, "!=", value))
        return self

    def gte(self, col: str, value: Any) -> "LocalTableQuery":
        self._filters.append((col, ">=", value))
        return self

    def lte(self, col: str, value: Any) -> "LocalTableQuery":
        self._filters.append((col, "<=", value))
        return self

    def order(self, col: str, desc: bool = False, **_kwargs) -> "LocalTableQuery":
        self._order = (col, desc)
        return self

    def limit(self, n: int, **_kwargs) -> "LocalTableQuery":
        self._limit = n
        return self

    def range(self, start: int, end: int, **_kwargs) -> "LocalTableQuery":
        self._range = (start, end)
        return self

    # ---------- mutations ----------
    def insert(self, payload: Any, **_kwargs) -> "LocalTableQuery":
        self._action = "insert"
        self._payload = payload
        return self

    def update(self, payload: Any, **_kwargs) -> "LocalTableQuery":
        self._action = "update"
        self._payload = payload
        return self

    def upsert(self, payload: Any, **_kwargs) -> "LocalTableQuery":
        return self.insert(payload)

    def delete(self, **_kwargs) -> "LocalTableQuery":
        self._action = "delete"
        return self

    # ---------- execution ----------
    def _matches(self, row: Dict[str, Any]) -> bool:
        for col, op, val in self._filters:
            rv = row.get(col)
            if op == "=" and rv != val:
                return False
            if op == "!=" and rv == val:
                return False
            if op == ">=" and not (rv is not None and rv >= val):
                return False
            if op == "<=" and not (rv is not None and rv <= val):
                return False
        return True

    def execute(self) -> LocalResult:
        if self._action == "select":
            rows = [r for r in _load_table(self._table) if self._matches(r)]
            if self._order:
                col, desc = self._order
                try:
                    rows.sort(key=lambda r: (r.get(col) is None, r.get(col)), reverse=desc)
                except TypeError:
                    # Mixed/missing types in this column - fall back to string ordering
                    rows.sort(key=lambda r: (r.get(col) is None, str(r.get(col))), reverse=desc)
            if self._range:
                a, b = self._range
                rows = rows[a:b + 1]
            elif self._limit is not None:
                rows = rows[: self._limit]
            if self._select_cols and "*" not in self._select_cols:
                rows = [{c: r.get(c) for c in self._select_cols} for r in rows]
            return LocalResult(rows)

        rows = _load_table(self._table)

        if self._action == "insert":
            payload = self._payload if isinstance(self._payload, list) else [self._payload]
            payload = [_json_safe(p) for p in payload]
            rows.extend(payload)
            if len(rows) > MAX_TABLE_ROWS:
                rows = rows[-MAX_TABLE_ROWS:]
                logger.info(f"Local table '{self._table}' trimmed to last {MAX_TABLE_ROWS} rows")
            _save_table(self._table, rows)
            return LocalResult(payload)

        if self._action == "update":
            updated = 0
            patch = _json_safe(self._payload)
            for r in rows:
                if self._matches(r):
                    r.update(patch)
                    updated += 1
            _save_table(self._table, rows)
            return LocalResult(updated)

        if self._action == "delete":
            kept = [r for r in rows if not self._matches(r)]
            _save_table(self._table, kept)
            return LocalResult([])

        return LocalResult([])


class LocalStorageBucket:
    def __init__(self, bucket: str):
        self._dir = os.path.join(STORAGE_DIR, bucket)

    def upload(self, path: str, content: Any, **_kwargs) -> Dict[str, str]:
        full = os.path.join(self._dir, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        data = content if isinstance(content, (bytes, bytearray)) else str(content).encode()
        with open(full, "wb") as f:
            f.write(data)
        logger.info(f"Stored file locally: {full} ({len(data)} bytes)")
        return {"Key": path}

    def download(self, path: str) -> bytes:
        with open(os.path.join(self._dir, path), "rb") as f:
            return f.read()

    def remove(self, path: str) -> Dict[str, List[str]]:
        full = os.path.join(self._dir, path)
        if os.path.exists(full):
            os.remove(full)
        return {"deleted": [path]}


class LocalStorage:
    def from_(self, bucket: str) -> LocalStorageBucket:
        return LocalStorageBucket(bucket)


class LocalSupabaseClient:
    """Drop-in replacement for supabase.Client backed by local JSON files"""

    def __init__(self):
        logger.info(f"Local file-based storage initialized at {DATA_DIR}")

    @property
    def storage(self) -> LocalStorage:
        return LocalStorage()

    def table(self, name: str) -> LocalTableQuery:
        return LocalTableQuery(name)
