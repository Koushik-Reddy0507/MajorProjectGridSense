import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "GridSense"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("BACKEND_DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("BACKEND_LOG_LEVEL", "INFO")

    # API
    API_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

    # CORS - Support both localhost and Vercel deployments
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:4173").split(",")
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: list[str] = ["*"]
    CORS_HEADERS: list[str] = ["*"]

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/gridsense"
    )

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ML & AI
    MAX_DATASET_SIZE_MB: int = int(os.getenv("MAX_DATASET_SIZE_MB", "500"))
    ML_MODEL_CACHE_ENABLED: bool = os.getenv("ML_MODEL_CACHE_ENABLED", "true").lower() == "true"
    LANGRAPH_DEBUG: bool = os.getenv("LANGRAPH_DEBUG", "false").lower() == "true"

    # External APIs
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    OPENWEATHER_BASE_URL: str = os.getenv(
        "OPENWEATHER_BASE_URL",
        "https://api.openweathermap.org/data/2.5"
    )
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    # Integrations
    ENABLE_GRAFANA_INTEGRATION: bool = os.getenv("ENABLE_GRAFANA_INTEGRATION", "true").lower() == "true"
    GRAFANA_URL: str = os.getenv("GRAFANA_URL", "http://localhost:3000")
    GRAFANA_API_KEY: str = os.getenv("GRAFANA_API_KEY", "")

    # Feature Flags
    ENABLE_EXPERIMENTAL_FEATURES: bool = os.getenv("ENABLE_EXPERIMENTAL_FEATURES", "false").lower() == "true"

    class Config:
        case_sensitive = True


settings = Settings()
