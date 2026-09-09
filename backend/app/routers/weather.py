"""Weather Router - OpenWeather API endpoints"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas import APIResponse
from app.services.weather_service import weather_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/current", response_model=APIResponse)
async def get_current_weather(
    city: Optional[str] = Query(None, description="City name (e.g., 'London', 'New York')"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
):
    """Get current weather data by city name or coordinates"""
    try:
        if not city and (lat is None or lon is None):
            raise HTTPException(
                status_code=400,
                detail="Provide either 'city' name or 'lat' and 'lon' coordinates"
            )

        weather_data = await weather_service.get_current_weather(city=city, lat=lat, lon=lon)
        return APIResponse(success=True, data=weather_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching current weather: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch weather data")


@router.get("/forecast", response_model=APIResponse)
async def get_weather_forecast(
    city: Optional[str] = Query(None, description="City name (e.g., 'London', 'New York')"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
):
    """Get 5-day weather forecast by city name or coordinates"""
    try:
        if not city and (lat is None or lon is None):
            raise HTTPException(
                status_code=400,
                detail="Provide either 'city' name or 'lat' and 'lon' coordinates"
            )

        forecast_data = await weather_service.get_forecast(city=city, lat=lat, lon=lon)
        return APIResponse(success=True, data=forecast_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching forecast: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch forecast data")


@router.get("/air-quality", response_model=APIResponse)
async def get_air_quality(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """Get air quality index for coordinates"""
    try:
        aqi_data = await weather_service.get_air_quality(lat=lat, lon=lon)
        return APIResponse(success=True, data=aqi_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching air quality: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch air quality data")
