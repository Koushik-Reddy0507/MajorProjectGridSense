"""
GridSense Battery & Maintenance Analysis
All values computed from actual dataset telemetry
"""
import logging
import json
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)


class BatteryAnalysisService:
    """Battery health analysis from actual SOC/SOH/telemetry"""

    def __init__(self, supabase):
        self.supabase = supabase

    def _load_dataset_data(self, dataset_id: str) -> Optional[pd.DataFrame]:
        try:
            response = self.supabase.table("dataset_records") \
                .select("*") \
                .eq("dataset_id", dataset_id) \
                .limit(10000) \
                .execute()
            if not response.data:
                return None
            return pd.DataFrame(response.data)
        except Exception as e:
            logger.error(f"Error loading dataset data: {e}")
            return None

    def analyze_battery(self, dataset_id: str) -> Dict[str, Any]:
        """Analyze battery health from dataset"""
        from app.ml.processor import DatasetProcessor

        df = self._load_dataset_data(dataset_id)
        if df is None or df.empty:
            return {"status": "DATA_NOT_AVAILABLE", "message": "No dataset records found", "data": None}

        processor = DatasetProcessor()
        detected = processor.detect_columns(df)

        soc_cols = detected.get("battery_soc", [])
        soh_cols = detected.get("battery_soh", [])
        voltage_cols = detected.get("voltage", [])
        current_cols = detected.get("current", [])
        temperature_cols = detected.get("temperature", [])
        cycle_cols = detected.get("cycle_count", [])
        timestamp_col = processor.detect_timestamp_column(df)

        if not soc_cols and not soh_cols:
            return {
                "status": "DATA_NOT_AVAILABLE",
                "message": "REQUIRED COLUMN(S) NOT FOUND. Battery analysis requires SOC (soc, state_of_charge) and/or SOH (soh, state_of_health) columns.",
                "data": None,
            }

        results = {"timestamp": None, "columns_used": {}}

        # SOC analysis
        if soc_cols:
            soc_col = soc_cols[0]
            soc = pd.to_numeric(df[soc_col], errors="coerce").dropna()
            if not soc.empty:
                results.update({
                    "soc_latest": round(float(soc.iloc[-1]), 2),
                    "soc_mean": round(float(soc.mean()), 2),
                    "soc_min": round(float(soc.min()), 2),
                    "soc_max": round(float(soc.max()), 2),
                    "soc_std": round(float(soc.std()), 2),
                })
                results["columns_used"]["soc"] = soc_col

                # SOC trends: charge/discharge cycle count from actual trajectory
                soc_diff = soc.diff()
                # Count cycles: number of full charge-discharge transitions
                cycles = 0
                in_discharge = False
                for d in soc_diff.dropna().values:
                    if d < -1:  # discharging
                        in_discharge = True
                    elif d > 1 and in_discharge:  # charging after discharge
                        cycles += 1
                        in_discharge = False
                results["detected_cycles"] = cycles

        # SOH analysis
        if soh_cols:
            soh_col = soh_cols[0]
            soh = pd.to_numeric(df[soh_col], errors="coerce").dropna()
            if not soh.empty:
                results.update({
                    "soh_latest": round(float(soh.iloc[-1]), 2),
                    "soh_mean": round(float(soh.mean()), 2),
                    "soh_start": round(float(soh.iloc[0]), 2),
                    "soh_degradation_total": round(float(soh.iloc[0] - soh.iloc[-1]), 2),
                })
                results["columns_used"]["soh"] = soh_col

                # Degradation rate per 100 cycles if possible
                if results.get("detected_cycles", 0) > 0:
                    results["degradation_per_100_cycles"] = round(
                        results["soh_degradation_total"] / results["detected_cycles"] * 100, 4
                    )

        # Health score (0-100) - derived from actual SOH and SOC health
        if soh_cols:
            soh = pd.to_numeric(df[soh_cols[0]], errors="coerce").dropna()
            # Normalize SOH to 0-100 scale if on 0-1 scale
            soh_norm = soh * 100 if soh.max() <= 1.0 else soh
            health_score = round(float(soh_norm.mean()), 1)
        elif soc_cols:
            soc = pd.to_numeric(df[soc_cols[0]], errors="coerce").dropna()
            # Without SOH, use SOC variability and range as basic health proxy
            # (data-driven, not hardcoded)
            soc_norm = soc * 100 if soc.max() <= 1.0 else soc
            range_pct = (soc_norm.max() - soc_norm.min()) / 100 * 100
            health_score = round(max(0, min(100, range_pct)), 1)
        else:
            health_score = None

        if health_score is not None:
            results["health_score"] = health_score

        # Voltage analysis
        if voltage_cols:
            v = pd.to_numeric(df[voltage_cols[0]], errors="coerce").dropna()
            if not v.empty:
                results["voltage"] = {
                    "latest": round(float(v.iloc[-1]), 2),
                    "mean": round(float(v.mean()), 2),
                    "min": round(float(v.min()), 2),
                    "max": round(float(v.max()), 2),
                    "std": round(float(v.std()), 2),
                }
                results["columns_used"]["voltage"] = voltage_cols[0]

        # Current analysis
        if current_cols:
            c = pd.to_numeric(df[current_cols[0]], errors="coerce").dropna()
            if not c.empty:
                results["current"] = {
                    "latest": round(float(c.iloc[-1]), 2),
                    "mean": round(float(c.mean()), 2),
                    "min": round(float(c.min()), 2),
                    "max": round(float(c.max()), 2),
                }
                results["columns_used"]["current"] = current_cols[0]

        # Temperature analysis
        if temperature_cols:
            t = pd.to_numeric(df[temperature_cols[0]], errors="coerce").dropna()
            if not t.empty:
                results["temperature"] = {
                    "latest": round(float(t.iloc[-1]), 2),
                    "mean": round(float(t.mean()), 2),
                    "min": round(float(t.min()), 2),
                    "max": round(float(t.max()), 2),
                    "std": round(float(t.std()), 2),
                }
                results["columns_used"]["temperature"] = temperature_cols[0]

        # Cycle count column
        if cycle_cols:
            cc = pd.to_numeric(df[cycle_cols[0]], errors="coerce").dropna()
            if not cc.empty:
                results["cycle_count"] = {
                    "latest": int(cc.iloc[-1]),
                    "max": int(cc.max()),
                }
                results["columns_used"]["cycle_count"] = cycle_cols[0]

        # Anomaly detection on telemetry (Isolation Forest)
        anomalies = []
        anomaly_cols = []
        if voltage_cols:
            anomaly_cols.append(voltage_cols[0])
        if current_cols:
            anomaly_cols.append(current_cols[0])
        if temperature_cols:
            anomaly_cols.append(temperature_cols[0])
        if soc_cols:
            anomaly_cols.append(soc_cols[0])

        if len(anomaly_cols) >= 2:
            try:
                telemetry = df[anomaly_cols].apply(pd.to_numeric, errors="coerce").dropna()
                if len(telemetry) >= 10:
                    iso_forest = IsolationForest(contamination=0.05, random_state=42)
                    preds = iso_forest.fit_predict(telemetry)
                    anomaly_idx = np.where(preds == -1)[0]
                    anomalies = [int(i) for i in anomaly_idx]
            except Exception as e:
                logger.warning(f"Anomaly detection failed: {e}")

        results["anomaly_count"] = len(anomalies)
        results["anomaly_indices"] = anomalies[:100]  # cap for response

        # Timestamp
        if timestamp_col:
            results["timestamp"] = pd.to_datetime(df[timestamp_col]).iloc[-1].isoformat()

        # Store analysis
        try:
            self.supabase.table("battery_analysis").insert({
                "dataset_id": dataset_id,
                "analysis": json.dumps(results),
                "created_at": pd.Timestamp.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"Could not persist battery analysis: {e}")

        return {
            "status": "COMPLETED",
            "message": "Battery analysis completed",
            "data": results,
        }


class MaintenanceAnalysisService:
    """Predictive maintenance from actual asset telemetry"""

    def __init__(self, supabase):
        self.supabase = supabase

    def _load_dataset_data(self, dataset_id: str) -> Optional[pd.DataFrame]:
        try:
            response = self.supabase.table("dataset_records") \
                .select("*") \
                .eq("dataset_id", dataset_id) \
                .limit(10000) \
                .execute()
            if not response.data:
                return None
            return pd.DataFrame(response.data)
        except Exception as e:
            logger.error(f"Error loading dataset data: {e}")
            return None

    def analyze_maintenance(self, dataset_id: str) -> Dict[str, Any]:
        """Predictive maintenance analysis from actual telemetry"""
        from app.ml.processor import DatasetProcessor

        df = self._load_dataset_data(dataset_id)
        if df is None or df.empty:
            return {"status": "DATA_NOT_AVAILABLE", "message": "No dataset records found", "data": None}

        processor = DatasetProcessor()
        detected = processor.detect_columns(df)

        telemetry_cols = []
        for key in ["voltage", "current", "temperature", "battery_soc", "battery_soh",
                    "cycle_count", "wind_speed", "solar_generation", "wind_generation"]:
            if key in detected:
                telemetry_cols.extend(detected.get(key, []))

        # De-duplicate and drop non-numeric metadata columns. The timestamp column
        # can accidentally match patterns like 'amp' (inside 'time-STAMP'), and
        # pd.to_numeric would turn it into all-NaN which would wipe every row.
        timestamp_col = processor.detect_timestamp_column(df)
        seen_cols = set()
        cleaned_cols = []
        for col in telemetry_cols:
            if col in seen_cols or col == timestamp_col:
                continue
            if pd.to_numeric(df[col], errors="coerce").notna().sum() == 0:
                continue  # column has no numeric values at all
            seen_cols.add(col)
            cleaned_cols.append(col)
        telemetry_cols = cleaned_cols

        if not telemetry_cols:
            return {
                "status": "DATA_NOT_AVAILABLE",
                "message": "REQUIRED COLUMN(S) NOT FOUND. Maintenance analysis requires asset telemetry columns (voltage, current, temperature, etc.).",
                "data": None,
            }

        # Build telemetry dataframe - keep rows with at least one valid reading,
        # then fill remaining gaps with column medians (avoids dropping everything
        # when individual telemetry columns have scattered missing values).
        telemetry = df[telemetry_cols].apply(pd.to_numeric, errors="coerce")
        telemetry = telemetry.dropna(how="all")
        if not telemetry.empty:
            telemetry = telemetry.fillna(telemetry.median())

        if len(telemetry) < 10:
            return {"status": "INSUFFICIENT_DATA", "message": "Need at least 10 valid telemetry records.", "data": None}

        # Anomaly detection - Isolation Forest
        anomalies = []
        try:
            iso_forest = IsolationForest(contamination=min(0.1, 5 / len(telemetry)), random_state=42)
            preds = iso_forest.fit_predict(telemetry)
            anomaly_bool = preds == -1
            anomalies = [int(i) for i in np.where(anomaly_bool)[0]]
        except Exception as e:
            logger.warning(f"Anomaly detection failed: {e}")

        # Statistical anomaly detection (z-score beyond 3 std)
        stat_anomalies = []
        try:
            z_scores = np.abs((telemetry - telemetry.mean()) / telemetry.std())
            for col in telemetry.columns:
                col_anomalies = np.where(z_scores[col] > 3)[0]
                stat_anomalies.extend([int(i) for i in col_anomalies])
        except Exception:
            pass

        all_anomaly_indices = sorted(set(anomalies + stat_anomalies))

        # Per-column health assessment (data-driven)
        asset_health = []
        for col in telemetry_cols:
            series = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(series) < 5:
                continue

            # Stability metric: coefficient of variation (lower = healthier)
            cv = series.std() / series.mean() if series.mean() != 0 else 0
            # Change rate
            change_rate = (series.iloc[-1] - series.iloc[0]) / abs(series.iloc[0]) if series.iloc[0] != 0 else 0
            # Anomaly rate in this column
            col_anomalies = sum(1 for i in all_anomaly_indices if i < len(series))

            # Health score (0-100) derived from these metrics
            health = 100.0
            health -= min(40, cv * 50)  # volatility penalty
            health -= min(30, abs(change_rate) * 30)  # drift penalty
            health -= min(20, col_anomalies * 5)  # anomaly penalty
            health = round(max(0, min(100, health)), 1)

            risk = "low"
            if health < 50:
                risk = "critical"
            elif health < 70:
                risk = "high"
            elif health < 85:
                risk = "medium"

            asset_health.append({
                "asset_id": f"asset_{len(asset_health) + 1}",
                "asset_name": col,
                "column": col,
                "current_health_score": health,
                "risk_level": risk,
                "coefficient_of_variation": round(float(cv), 4),
                "change_rate": round(float(change_rate), 4),
                "anomaly_count": col_anomalies,
            })

        # Recommendations based on actual findings
        recommendations = []
        for asset in asset_health:
            if asset["risk_level"] in ("high", "critical"):
                recommendations.append({
                    "asset": asset["asset_name"],
                    "action": f"Inspect {asset['asset_name']} - health score {asset['current_health_score']}/100 with {asset['anomaly_count']} anomalies detected. Increased telemetry variance and drift observed.",
                    "priority": asset["risk_level"],
                })
            elif asset["risk_level"] == "medium":
                recommendations.append({
                    "asset": asset["asset_name"],
                    "action": f"Monitor {asset['asset_name']} - moderate health ({asset['current_health_score']}/100). Schedule routine inspection.",
                    "priority": "medium",
                })

        results = {
            "total_assets": len(asset_health),
            "total_anomalies": len(all_anomaly_indices),
            "anomaly_indices": all_anomaly_indices[:200],
            "asset_health": asset_health,
            "recommendations": recommendations,
            "anomaly_detection_methods": ["isolation_forest", "statistical_zscore"],
        }

        # Store
        try:
            self.supabase.table("maintenance_predictions").insert({
                "dataset_id": dataset_id,
                "analysis": json.dumps(results),
                "created_at": pd.Timestamp.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"Could not persist maintenance analysis: {e}")

        return {
            "status": "COMPLETED",
            "message": "Maintenance analysis completed",
            "data": results,
        }