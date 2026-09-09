from supabase import create_client, Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Get Supabase client singleton.

    Falls back to a local file-based storage client when Supabase
    credentials are not configured, so every feature of the platform
    keeps working (uploads, forecasts, analyses...) without cloud setup.
    """
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            logger.warning(
                "Supabase not configured - using LOCAL FILE STORAGE (backend/data/). "
                "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend/.env for cloud persistence."
            )
            from app.services.local_store import LocalSupabaseClient
            _supabase_client = LocalSupabaseClient()
        else:
            _supabase_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
    return _supabase_client


async def init_db():
    """Initialize database connection"""
    try:
        supabase = get_supabase()
        logger.info("Supabase client initialized successfully")
        return supabase
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {e}")
        raise


async def close_db():
    """Close database connections"""
    global _supabase_client
    _supabase_client = None
    logger.info("Database connections closed")
