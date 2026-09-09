"""Weather Service - OpenWeather API integration for live weather data"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class WeatherService:
    """Service for fetching live weather data from OpenWeather API"""

    def __init__(self):
        self.api_key = settings.OPENWEATHER_API_KEY
        self.base_url = settings.OPENWEATHER_BASE_URL

    async def get_current_weather(self, city=None, lat=None, lon=None) -> Dict[str, Any]:
        """Get current weather data by city name or coordinates"""
        if not self.api_key:
            raise ValueError("OpenWeather API key not configured")

        params = {
            "appid": self.api_key,
            "units": "metric",
        }

        if city:
            params["q"] = city
        elif lat is not None and lon is not None:
            params["lat"] = lat
            params["lon"] = lon
        else:
            raise ValueError("Either city name or coordinates (lat, lon) must be provided")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/weather", params=params)
                response.raise_for_status()
                data = response.json()

            return self._format_current_weather(data)
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenWeather API error: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 404:
                raise ValueError("City not found")
            elif e.response.status_code == 401:
                raise ValueError("Invalid OpenWeather API key")
            raise ValueError(f"Weather API error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Request error fetching weather: {e}")
            raise ValueError("Failed to connect to weather service")

    async def get_forecast(self, city=None, lat=None, lon=None) -> Dict[str, Any]:
        """Get 5-day weather forecast by city name or coordinates"""
        if not self.api_key:
            raise ValueError("OpenWeather API key not configured")

        params = {
            "appid": self.api_key,
            "units": "metric",
        }

        if city:
            params["q"] = city
        elif lat is not None and lon is not None:
            params["lat"] = lat
            params["lon"] = lon
        else:
            raise ValueError("Either city name or coordinates (lat, lon) must be provided")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/forecast", params=params)
                response.raise_for_status()
                data = response.json()

            return self._format_forecast(data)
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenWeather API error: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 404:
                raise ValueError("City not found")
            elif e.response.status_code == 401:
                raise ValueError("Invalid OpenWeather API key")
            raise ValueError(f"Weather API error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Request error fetching forecast: {e}")
            raise ValueError("Failed to connect to weather service")

    async def get_air_quality(self, lat: float, lon: float) -> Dict[str, Any]:
        """Get air quality data for coordinates"""
        if not self.api_key:
            raise ValueError("OpenWeather API key not configured")

        params = {
            "appid": self.api_key,
            "lat": lat,
            "lon": lon,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "http://api.openweathermap.org/data/2.5/air_pollution",
                    params=params
                )
                response.raise_for_status()
                data = response.json()

            if data.get("list"):
                aqi_data = data["list"][0]
                return {
                    "aqi": aqi_data["main"]["aqi"],
                    "components": aqi_data["components"],
                    "timestamp": datetime.utcfromtimestamp(aqi_data["dt"]).isoformat(),
                }
            return {"aqi": None, "components": {}, "timestamp": None}
        except Exception as e:
            logger.error(f"Air quality API error: {e}")
            return {"aqi": None, "components": {}, "timestamp": None}

    def _format_current_weather(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Format raw API response into structured weather data"""
        weather = data.get("weather", [{}])[0]
        main = data.get("main", {})
        wind = data.get("wind", {})
        sys = data.get("sys", {})
        clouds = data.get("clouds", {})

        return {
            "location": {
                "city": data.get("name", "Unknown"),
                "country": sys.get("country", ""),
                "coordinates": {
                    "lat": data.get("coord", {}).get("lat"),
                    "lon": data.get("coord", {}).get("lon"),
                },
            },
            "weather": {
                "main": weather.get("main", ""),
                "description": weather.get("description", "").capitalize(),
                "icon": weather.get("icon", ""),
                "icon_url": f"https://openweathermap.org/img/wn/{weather.get('icon', '01d')}@2x.png",
            },
            "temperature": {
                "current": main.get("temp"),
                "feels_like": main.get("feels_like"),
                "min": main.get("temp_min"),
                "max": main.get("temp_max"),
            },
            "humidity": main.get("humidity"),
            "pressure": main.get("pressure"),
            "wind": {
                "speed": wind.get("speed"),
                "direction": wind.get("deg"),
                "gust": wind.get("gust"),
            },
            "visibility": data.get("visibility"),
            "clouds": clouds.get("all"),
            "sunrise": datetime.utcfromtimestamp(sys.get("sunrise", 0)).isoformat() if sys.get("sunrise") else None,
            "sunset": datetime.utcfromtimestamp(sys.get("sunset", 0)).isoformat() if sys.get("sunset") else None,
            "timestamp": datetime.utcfromtimestamp(data.get("dt", 0)).isoformat(),
        }

    def _format_forecast(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Format raw forecast API response into structured data"""
        city = data.get("city", {})
        forecast_list = data.get("list", [])

        # Group forecast by day
        daily_forecasts: Dict[str, Dict[str, Any]] = {}
        hourly_forecasts = []

        for item in forecast_list:
            dt = datetime.utcfromtimestamp(item.get("dt", 0))
            date_key = dt.strftime("%Y-%m-%d")

            weather = item.get("weather", [{}])[0]
            main = item.get("main", {})
            wind = item.get("wind", {})

            hourly_entry = {
                "datetime": dt.isoformat(),
                "hour": dt.strftime("%H:%M"),
                "temperature": main.get("temp"),
                "feels_like": main.get("feels_like"),
                "humidity": main.get("humidity"),
                "weather": {
                    "main": weather.get("main", ""),
                    "description": weather.get("description", "").capitalize(),
                    "icon": weather.get("icon", ""),
                    "icon_url": f"https://openweathermap.org/img/wn/{weather.get('icon', '01d')}@2x.png",
                },
                "wind_speed": wind.get("speed"),
                "wind_direction": wind.get("deg"),
                "precipitation_probability": item.get("pop", 0) * 100,
                "clouds": item.get("clouds", {}).get("all"),
            }
            hourly_forecasts.append(hourly_entry)

            if date_key not in daily_forecasts:
                daily_forecasts[date_key] = {
                    "date": date_key,
                    "day_name": dt.strftime("%A"),
                    "temp_min": main.get("temp"),
                    "temp_max": main.get("temp"),
                    "weather": weather,
                    "hourly": [],
                }
            else:
                if main.get("temp") < daily_forecasts[date_key]["temp_min"]:
                    daily_forecasts[date_key]["temp_min"] = main.get("temp")
                if main.get("temp") > daily_forecasts[date_key]["temp_max"]:
                    daily_forecasts[date_key]["temp_max"] = main.get("temp")

            daily_forecasts[date_key]["hourly"].append(hourly_entry)

        return {
            "location": {
                "city": city.get("name", "Unknown"),
                "country": city.get("country", ""),
                "coordinates": {
                    "lat": city.get("coord", {}).get("lat"),
                    "lon": city.get("coord", {}).get("lon"),
                },
            },
            "daily_forecasts": list(daily_forecasts.values()),
            "hourly_forecasts": hourly_forecasts,
        }


# Singleton instance
weather_service = WeatherService()
