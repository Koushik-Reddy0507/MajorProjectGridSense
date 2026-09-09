from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
from datetime import datetime

from app.config import settings
from app.database import init_db, close_db
from app.middleware.logging import setup_logging
from app.middleware.error_handler import exception_handler

# Setup logging
setup_logging(settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


# ==================== Lifespan Context ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup/shutdown"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except ValueError as e:
        logger.warning(f"Database not configured: {e}. Running without Supabase connection.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}. Running in degraded mode.")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await close_db()


# ==================== Application Factory ====================
def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title=settings.APP_NAME,
        description="Autonomous Renewable Energy Intelligence Platform",
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ==================== Middleware ====================
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_CREDENTIALS,
        allow_methods=settings.CORS_METHODS,
        allow_headers=settings.CORS_HEADERS,
    )

    # Trusted Host - Support localhost and Vercel deployments
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*.localhost", "*.vercel.app", "*.onrender.com"],
    )

    # Request/Response logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        request_id = request.headers.get("x-request-id", str(time.time()))
        start_time = time.time()
        
        response = await call_next(request)
        
        process_time = (time.time() - start_time) * 1000  # ms
        logger.debug(
            f"[{request_id}] {request.method} {request.url.path} "
            f"- {response.status_code} - {process_time:.2f}ms"
        )
        
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id
        return response

    # ==================== Routes ====================
    
    # Health check
    @app.get("/health", tags=["Health"])
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "version": settings.APP_VERSION,
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "connected",
                "redis": "configured" if settings.REDIS_URL else "not_configured",
            }
        }

    # API root
    @app.get("/api", tags=["Info"])
    async def api_root():
        """API root endpoint"""
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "redoc": "/redoc",
        }

    # ==================== API Routes ====================
    from app.routers import api
    app.include_router(api.router, prefix="/api", tags=["GridSense API"])

    # ==================== Exception Handlers ====================
    app.add_exception_handler(Exception, exception_handler)

    return app


# ==================== Application Instance ====================
app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
