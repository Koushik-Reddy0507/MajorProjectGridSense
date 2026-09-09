"""Tests for dataset validation & processing"""
import sys
import os
import pytest
import pandas as pd
import numpy as np

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ml.processor import DatasetProcessor


def create_sample_dataset():
    """Create a realistic renewable energy dataset"""
    dates = pd.date_range(start="2024-01-01", end="2024-01-10", freq="h")
    n = len(dates)
    np.random.seed(42)

    # Realistic data with patterns
    hour = dates.hour
    solar = np.maximum(0, np.sin((hour - 6) / 12 * np.pi)) * 50 + np.random.normal(0, 3, n)
    wind = 20 + 15 * np.sin(2 * np.pi * hour / 24) + np.random.normal(0, 5, n)
    demand = 100 + 30 * np.sin((hour - 12) / 24 * np.pi) + np.random.normal(0, 8, n)
    price = 0.15 + 0.05 * np.sin(2 * np.pi * hour / 24) + np.random.normal(0, 0.02, n)
    temp = 20 + 5 * np.sin((hour - 15) / 24 * np.pi) + np.random.normal(0, 1, n)
    soc = 50 + 40 * np.sin(2 * np.pi * np.arange(n) / 12) + np.random.normal(0, 2, n)
    soh = np.linspace(100, 98.5, n) + np.random.normal(0, 0.1, n)

    df = pd.DataFrame({
        "timestamp": dates,
        "solar_generation_kw": solar,
        "wind_generation_kw": wind,
        "electricity_demand_kw": demand,
        "electricity_price": price,
        "temperature_c": temp,
        "battery_soc": soc,
        "battery_soh": soh,
        "voltage": 48 + np.random.normal(0, 0.5, n),
        "current": np.random.normal(10, 2, n),
    })
    return df


class TestColumnDetection:
    def test_detect_timestamp(self):
        df = create_sample_dataset()
        col = DatasetProcessor.detect_timestamp_column(df)
        assert col == "timestamp"

    def test_detect_demand(self):
        df = create_sample_dataset()
        detected = DatasetProcessor.detect_columns(df)
        assert "electricity_demand" in detected
        assert detected["electricity_demand"][0] == "electricity_demand_kw"

    def test_detect_solar(self):
        df = create_sample_dataset()
        detected = DatasetProcessor.detect_columns(df)
        assert "solar_generation" in detected

    def test_detect_battery(self):
        df = create_sample_dataset()
        detected = DatasetProcessor.detect_columns(df)
        assert "battery_soc" in detected
        assert "battery_soh" in detected

    def test_detect_price(self):
        df = create_sample_dataset()
        detected = DatasetProcessor.detect_columns(df)
        assert "electricity_price" in detected


class TestTimestampNormalization:
    def test_parse_dates(self):
        df = create_sample_dataset()
        normalized = DatasetProcessor.normalize_timestamps(df, "timestamp")
        assert pd.api.types.is_datetime64_any_dtype(normalized["timestamp"])
        assert len(normalized) == len(df)

    def test_sort_by_timestamp(self):
        df = create_sample_dataset().sample(frac=1, random_state=1)  # shuffle
        normalized = DatasetProcessor.normalize_timestamps(df, "timestamp")
        assert (normalized["timestamp"].diff().dropna() >= pd.Timedelta(0)).all()


class TestDataQuality:
    def test_quality_score_range(self):
        df = create_sample_dataset()
        report = DatasetProcessor.analyze_data_quality(df)
        assert 0 <= report["quality_score"] <= 100

    def test_quality_counts(self):
        df = create_sample_dataset()
        report = DatasetProcessor.analyze_data_quality(df)
        assert report["total_rows"] == len(df)
        assert report["total_columns"] == len(df.columns)

    def test_missing_values_detection(self):
        df = create_sample_dataset()
        df.loc[df.index[:10], "temperature_c"] = np.nan
        report = DatasetProcessor.analyze_data_quality(df)
        assert report["missing_values_count"] == 10
        assert report["missing_values_percentage"] > 0

    def test_duplicate_detection(self):
        df = create_sample_dataset()
        df = pd.concat([df, df.head(5)])
        report = DatasetProcessor.analyze_data_quality(df)
        assert report["duplicate_rows"] == 5


class TestFeatureEngineering:
    def test_time_features_added(self):
        df = create_sample_dataset()
        engineered = DatasetProcessor.engineer_features(df, "timestamp")
        for col in ["hour", "day_of_week", "month", "hour_sin", "hour_cos", "day_sin", "day_cos"]:
            assert col in engineered.columns

    def test_feature_preparation(self):
        df = create_sample_dataset()
        features, target, names = DatasetProcessor.prepare_features_for_model(
            df, "electricity_demand_kw", drop_cols=["timestamp"]
        )
        assert len(features) == len(target)
        assert "electricity_demand_kw" not in features.columns
        assert len(names) == len(features.columns)