from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
import traceback

logger = logging.getLogger(__name__)


async def exception_handler(request: Request, exc: Exception):
    """Global exception handler for FastAPI"""
    
    request_id = request.headers.get("x-request-id", "unknown")
    
    logger.error(
        f"[{request_id}] Unhandled exception: {type(exc).__name__}: {str(exc)}\n"
        f"Traceback: {traceback.format_exc()}"
    )
    
    # Return generic error response
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "request_id": request_id,
        },
    )


async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    
    request_id = request.headers.get("x-request-id", "unknown")
    
    logger.warning(
        f"[{request_id}] Validation error: {exc}"
    )
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Validation error",
            "details": exc.errors(),
            "request_id": request_id,
        },
    )
