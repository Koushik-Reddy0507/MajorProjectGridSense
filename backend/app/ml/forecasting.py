"""
GridSense Forecasting Service
Generates real forecasts from actual dataset data using trained models
"""
import logging
import json
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np

from app.ml.trainer import ModelRegistry, ModelTrainer
from app.ml.processor import DatasetProcessor

logger = logging.getLogger(__name__)


class DemandForecastService:
    """Electricity demand forecasting from actual historical records"""

    def __init__(self, supabase):
        self.supabase = supabase
        self.registry = ModelRegistry(supabase)
        self.trainer = ModelTrainer(self.registry)

    def _load_dataset_data(self, dataset_id: str) -> Optional[pd.DataFrame]:
        """Load dataset records from Supabase"""
        try:
            response = self.supabase.table("dataset_records") \
                .select("*") \
                .eq("dataset_id", dataset_id) \
                .limit(5000) \
                .execute()
            if not response.data:
                return None
            return pd.DataFrame(response.data)
        except Exception as e:
            logger.error(f"Error loading dataset data: {e}")
            return None

    def forecast_demand(self, dataset_id: str) -> Dict[str, Any]:
        """Generate demand forecast for dataset"""
        df = self._load_dataset_data(dataset_id)
        if df is None or df.empty:
            return {
                "status": "DATA_NOT_AVAILABLE",
                "message": "No dataset records found",
                "data": None,
            }

        # Detect demand column
        processor = DatasetProcessor()
        detected = processor.detect_columns(df)
        demand_cols = detected.get("electricity_demand", [])
        timestamp_col = processor.detect_timestamp_column(df)

        if not demand_cols:
            return {
                "status": "DATA_NOT_AVAILABLE",
                "message": "REQUIRED COLUMN(S) NOT FOUND. Demand prediction requires an electricity demand/consumption column.",
                "data": None,
            }

        demand_col = demand_cols[0]
        if not timestamp_col:
            return {
                "status": "DATA_NOT_AVAILABLE",
                "message": "Timestamp column required for demand forecasting.",
                "data": None,
            }

        # Normalize timestamps
        df = processor.normalize_timestamps(df, timestamp_col)

        # Check if we have enough data
        if len(df) < 24:
            return {
                "status": "INSUFFICIENT_DATA",
                "message": f"Need at least 24 records for forecasting, found {len(df)}",
                "data": None,
            }

        try:
            # Train time-series model (with lags + time features)
            model, metadata, validation_df = self.trainer.train_time_series_model(
                dataset_id,
                demand_col,
                df[[timestamp_col, demand_col]],
                timestamp_col,
            )

            # Generate 24-hour future forecast
            latest = df[[timestamp_col, demand_col]].tail(30).copy()
            # Build lagged features for latest data
            for lag in [1, 2, 3, 6, 12, 24]:
                latest[f"lag_{lag}"] = df[demand_col].shift(lag).tail(30).values
            latest["rolling_mean_6"] = df[demand_col].rolling(6).mean().tail(30).values
            latest["rolling_mean_24"] = df[demand_col].rolling(24).mean().tail(30).values
            latest["rolling_std_24"] = df[demand_col].rolling(24).std().tail(30).values
            ts = pd.to_datetime(latest[timestamp_col])
            latest["hour"] = ts.dt.hour
            latest["day_of_week"] = ts.dt.dayofweek
            latest["hour_sin"] = np.sin(2 * np.pi * ts.dt.hour / 24)
            latest["hour_cos"] = np.cos(2 * np.pi * ts.dt.hour / 24)

            # Drop NaN rows
            latest = latest.dropna()
            if latest.empty:
                return {
                    "status": "INSUFFICIENT_DATA",
                    "message": "Not enough valid data for forecasting after lag processing.",
                    "data": None,
                }

            future = self.trainer.generate_future_forecast(model, metadata, latest, periods=24)

            # Build forecast response with timestamps
            last_ts = pd.to_datetime(df[timestamp_col]).iloc[-1]
            timestamps = [last_ts + pd.Timedelta(hours=i + 1) for i in range(24)]

            # Compute confidence from validation residuals
            residual_std = validation_df.get("residual", pd.Series(dtype=float)).std() if not validation_df.empty else 0
            if pd.isna(residual_std) or residual_std == 0:
                residual_std = float(df[demand_col].std() * 0.1)

            forecast_data = []
            for i, ts in enumerate(timestamps):
                value = float(future.iloc[i]["forecast_value"])
                forecast_data.append({
                    "timestamp": ts.isoformat(),
                    "forecasted_demand": round(value, 2),
                    "confidence_lower": round(value - 1.96 * residual_std, 2),
                    "confidence_upper": round(value + 1.96 * residual_std, 2),
                })

            # Store forecast in Supabase
            try:
                records = [{
                    "dataset_id": dataset_id,
                    "timestamp": entry["timestamp"],
                    "forecasted_demand": entry["forecasted_demand"],
                    "confidence_lower": entry["confidence_lower"],
                    "confidence_upper": entry["confidence_upper"],
                    "model_type": metadata.model_type,
                    "model_version": metadata.version,
                } for entry in forecast_data]
                self.supabase.table("demand_forecasts").insert(records).execute()
            except Exception as e:
                logger.warning(f"Could not persist forecasts: {e}")

            return {
                "status": "COMPLETED",
                "message": "Demand forecast generated",
                "data": {
                    "forecast": forecast_data,
                    "metrics": metadata.evaluation,
                    "model_type": metadata.model_type,
                    "features": metadata.features,
                    "training_records": metadata.training_records,
                    "validation": validation_df.to_dict(orient="records")[:50],
                },
            }

        except ValueError as e:
            return {
                "status": "FAILED",
                "message": str(e),
                "data": None,
            }
        except Exception as e:
            logger.error(f"Error in demand forecasting: {e}", exc_info=True)
            return {
                "status": "FAILED",
                "message": f"Demand forecasting failed: {str(e)}",
                "data": None,
            }


class RenewableForecastService:
    """Renewable energy (solar/wind) forecasting"""

    def __init__(self, supabase):
        self.supabase = supabase
        self.registry = ModelRegistry(supabase)
        self.trainer = ModelTrainer(self.registry)

    def _load_dataset_data(self, dataset_id: str) -> Optional[pd.DataFrame]:
        try:
            response = self.supabase.table("dataset_records") \
                .select("*") \
                .eq("dataset_id", dataset_id) \
                .limit(5000) \
                .execute()
            if not response.data:
                return None
            return pd.DataFrame(response.data)
        except Exception as e:
            logger.error(f"Error loading dataset data: {e}")
            return None

    def forecast_renewable(self, dataset_id: str) -> Dict[str, Any]:
        """Generate renewable forecast"""
        df = self._load_dataset_data(dataset_id)
        if df is None or df.empty:
            return {"status": "DATA_NOT_AVAILABLE", "message": "No dataset records found", "data": None}

        processor = DatasetProcessor()
        detected = processor.detect_columns(df)
        solar_cols = detected.get("solar_generation", [])
        wind_cols = detected.get("wind_generation", [])
        timestamp_col = processor.detect_timestamp_column(df)

        if not solar_cols and not wind_cols:
            return {
                "status": "DATA_NOT_AVAILABLE",
                "message": "REQUIRED COLUMN(S) NOT FOUND. Renewable forecasting requires solar (solar, pv) and/or wind (wind, wind_power) generation columns.",
                "data": None,
            }

        if not timestamp_col:
            return {"status": "DATA_NOT_AVAILABLE", "message": "Timestamp column required.", "data": None}

        df = processor.normalize_timestamps(df, timestamp_col)

        results = {}
        if solar_cols and len(df) >= 24:
            try:
                model, metadata, validation_df = self.trainer.train_time_series_model(
                    dataset_id, solar_cols[0], df[[timestamp_col, solar_cols[0]]], timestamp_col
                )
                latest = df[[timestamp_col, solar_cols[0]]].tail(30).copy()
                for lag in [1, 2, 3, 6, 12, 24]:
                    latest[f"lag_{lag}"] = df[solar_cols[0]].shift(lag).tail(30).values
                ts = pd.to_datetime(latest[timestamp_col])
                latest["hour"] = ts.dt.hour
                latest["hour_sin"] = np.sin(2 * np.pi * ts.dt.hour / 24)
                latest["hour_cos"] = np.cos(2 * np.pi * ts.dt.hour / 24)
                latest = latest.dropna()
                if not latest.empty:
                    future = self.trainer.generate_future_forecast(model, metadata, latest, periods=24)
                    last_ts = pd.to_datetime(df[timestamp_col]).iloc[-1]
                    results["solar"] = {
                        "timestamps": [(last_ts + pd.Timedelta(hours=i + 1)).isoformat() for i in range(24)],
                        "values": [round(float(v), 2) for v in future["forecast_value"]],
                        "metrics": metadata.evaluation,
                        "model_type": metadata.model_type,
                    }
            except Exception as e:
                logger.warning(f"Solar forecast failed: {e}")

        if wind_cols and len(df) >= 24:
            try:
                model, metadata, validation_df = self.trainer.train_time_series_model(
                    dataset_id, wind_cols[0], df[[timestamp_col, wind_cols[0]]], timestamp_col
                )
                latest = df[[timestamp_col, wind_cols[0]]].tail(30).copy()
                for lag in [1, 2, 3, 6, 12, 24]:
                    latest[f"lag_{lag}"] = df[wind_cols[0]].shift(lag).tail(30).values
                ts = pd.to_datetime(latest[timestamp_col])
                latest["hour"] = ts.dt.hour
                latest["hour_sin"] = np.sin(2 * np.pi * ts.dt.hour / 24)
                latest["hour_cos"] = np.cos(2 * np.pi * ts.dt.hour / 24)
                latest = latest.dropna()
                if not latest.empty:
                    future = self.trainer.generate_future_forecast(model, metadata, latest, periods=24)
                    last_ts = pd.to_datetime(df[timestamp_col]).iloc[-1]
                    results["wind"] = {
                        "timestamps": [(last_ts + pd.Timedelta(hours=i + 1)).isoformat() for i in range(24)],
                        "values": [round(float(v), 2) for v in future["forecast_value"]],
                        "metrics": metadata.evaluation,
                        "model_type": metadata.model_type,
                    }
            except Exception as e:
                logger.warning(f"Wind forecast failed: {e}")

        if not results:
            return {"status": "FAILED", "message": "Not enough data for renewable forecasting", "data": None}

        return {"status": "COMPLETED", "message": "Renewable forecast generated", "data": results}


class PriceAnalysisService:
    """Electricity price analysis & forecasting"""

    def __init__(self, supabase):
        self.supabase = supabase
        self.registry = ModelRegistry(supabase)
        self.trainer = ModelTrainer(self.registry)

    def _load_dataset_data(self, dataset_id: str) -> Optional[pd.DataFrame]:
        try:
            response = self.supabase.table("dataset_records") \
                .select("*") \
                .eq("dataset_id", dataset_id) \
                .limit(5000) \
                .execute()
            if not response.data:
                return None
            return pd.DataFrame(response.data)
        except Exception as e:
            logger.error(f"Error loading dataset data: {e}")
            return None

    def analyze_prices(self, dataset_id: str) -> Dict[str, Any]:
        """Analyze electricity prices from actual records"""
        df = self._load_dataset_data(dataset_id)
        if df is None or df.empty:
            return {"status": "DATA_NOT_AVAILABLE", "message": "No dataset records found", "data": None}

        processor = DatasetProcessor()
        detected = processor.detect_columns(df)
        price_cols = detected.get("electricity_price", [])
        timestamp_col = processor.detect_timestamp_column(df)

        if not price_cols:
            return {
                "status": "DATA_NOT_AVAILABLE",
                "message": "REQUIRED COLUMN(S) NOT FOUND. Price analysis requires an electricity price column (price, electricity_price, market_price).",
                "data": None,
            }

        price_col = price_cols[0]
        prices = pd.to_numeric(df[price_col], errors="coerce").dropna()

        if prices.empty:
            return {"status": "DATA_NOT_AVAILABLE", "message": "No valid price values found.", "data": None}

        # Actual statistics from data
        stats = {
            "latest_price": round(float(prices.iloc[-1]), 4),
            "average_price": round(float(prices.mean()), 4),
            "minimum_price": round(float(prices.min()), 4),
            "maximum_price": round(float(prices.max()), 4),
            "median_price": round(float(prices.median()), 4),
            "std_deviation": round(float(prices.std()), 4),
            "volatility": round(float(prices.std() / prices.mean()) * 100, 2) if prices.mean() != 0 else 0,
            "total_records": len(prices),
        }

        # Trend detection via linear regression
        x = np.arange(len(prices))
        slope = np.polyfit(x, prices.values, 1)[0]
        stats["trend"] = "up" if slope > 0.001 else ("down" if slope < -0.001 else "stable")
        stats["trend_slope"] = round(float(slope), 4)

        # Peak/off-peak hours (parse timestamps even when stored as strings)
        if timestamp_col:
            temp = df[[timestamp_col, price_col]].copy()
            parsed_ts = pd.to_datetime(temp[timestamp_col], errors="coerce")
            temp["hour"] = parsed_ts.dt.hour
            temp = temp[temp["hour"].notna()]
            hourly_avg = temp.groupby("hour")[price_col].mean()
            peak_hours = hourly_avg.nlargest(6).index.tolist()
            off_peak_hours = hourly_avg.nsmallest(6).index.tolist()
            stats["peak_hours"] = sorted(peak_hours)
            stats["off_peak_hours"] = sorted(off_peak_hours)
            stats["hourly_profile"] = {
                str(h): round(float(v), 4) for h, v in hourly_avg.items()
            }

        # Price forecast if enough data
        forecast = None
        if len(prices) >= 24 and timestamp_col:
            try:
                model, metadata, validation_df = self.trainer.train_time_series_model(
                    dataset_id, price_col, df[[timestamp_col, price_col]], timestamp_col
                )
                latest = df[[timestamp_col, price_col]].tail(30).copy()
                for lag in [1, 2, 3, 6, 12, 24]:
                    latest[f"lag_{lag}"] = df[price_col].shift(lag).tail(30).values
                ts = pd.to_datetime(latest[timestamp_col])
                latest["hour"] = ts.dt.hour
                latest["hour_sin"] = np.sin(2 * np.pi * ts.dt.hour / 24)
                latest["hour_cos"] = np.cos(2 * np.pi * ts.dt.hour / 24)
                latest = latest.dropna()
                if not latest.empty:
                    future = self.trainer.generate_future_forecast(model, metadata, latest, periods=24)
                    last_ts = pd.to_datetime(df[timestamp_col]).iloc[-1]
                    residual_std = float(df[price_col].std() * 0.1)
                    forecast = {
                        "timestamps": [(last_ts + pd.Timedelta(hours=i + 1)).isoformat() for i in range(24)],
                        "values": [round(float(v), 4) for v in future["forecast_value"]],
                        "confidence_lower": [round(float(v) - 1.96 * residual_std, 4) for v in future["forecast_value"]],
                        "confidence_upper": [round(float(v) + 1.96 * residual_std, 4) for v in future["forecast_value"]],
                        "metrics": metadata.evaluation,
                    }
            except Exception as e:
                logger.warning(f"Price forecast failed: {e}")

        # Store analysis
        try:
            self.supabase.table("electricity_prices").insert({
                "dataset_id": dataset_id,
                "analysis": json.dumps(stats),
                "forecast": json.dumps(forecast) if forecast else None,
                "created_at": pd.Timestamp.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"Could not persist price analysis: {e}")

        return {
            "status": "COMPLETED",
            "message": "Price analysis completed",
            "data": {"statistics": stats, "forecast": forecast},
        }