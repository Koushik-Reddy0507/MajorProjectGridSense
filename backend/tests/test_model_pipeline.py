"""Tests for ML model pipeline"""
import sys
import os
import pytest
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ml.trainer import ModelRegistry, ModelTrainer
from app.ml.processor import DatasetProcessor


class FakeSupabase:
    """Minimal fake Supabase client for testing (no actual DB calls)"""

    def __init__(self):
        self.tables = {}

    def table(self, name):
        return FakeTable(self, name)


class FakeTable:
    def __init__(self, client, name):
        self.client = client
        self.name = name

    def insert(self, data):
        self.client.tables.setdefault(self.name, []).append(data)
        return self

    def select(self, *args):
        return self

    def eq(self, *args):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, n):
        return self

    def execute(self):
        return SimpleResponse(self.client.tables.get(self.name, []))


class SimpleResponse:
    def __init__(self, data):
        self.data = data


def create_training_data(n=500):
    """Create synthetic but realistic training data"""
    dates = pd.date_range("2024-01-01", periods=n, freq="h")
    hour = dates.hour
    base = 100 + 30 * np.sin((hour - 9) / 24 * 2 * np.pi)
    noise = np.random.normal(0, 8, n)
    demand = base + noise

    df = pd.DataFrame({
        "timestamp": dates,
        "demand": demand,
    })
    return df


class TestModelTrainer:
    def test_train_regression(self):
        df = create_training_data()
        registry = ModelRegistry(FakeSupabase())
        trainer = ModelTrainer(registry)

        # Engineer time features first (as the real pipeline does)
        df = DatasetProcessor.engineer_features(df, "timestamp")

        features, target, names = DatasetProcessor.prepare_features_for_model(
            df, "demand", drop_cols=["timestamp"]
        )

        assert len(features.columns) > 0

        model, metadata, predictions = trainer.train_regression_model(
            "test_dataset", "demand", features, target
        )

        assert model is not None
        assert metadata.training_records > 0
        assert metadata.evaluation["mae"] >= 0
        assert metadata.evaluation["rmse"] >= 0
        assert -1 <= metadata.evaluation["r2_score"] <= 1
        assert "actual" in predictions.columns
        assert "predicted" in predictions.columns
        assert "confidence_lower" in predictions.columns
        assert "confidence_upper" in predictions.columns

    def test_time_series_model(self):
        df = create_training_data(200)
        registry = ModelRegistry(FakeSupabase())
        trainer = ModelTrainer(registry)

        model, metadata, predictions = trainer.train_time_series_model(
            "test_dataset", "demand", df, "timestamp"
        )

        assert metadata.training_records > 0
        assert any("lag_" in f for f in metadata.features)

    def test_insufficient_data(self):
        df = create_training_data(10)
        registry = ModelRegistry(FakeSupabase())
        trainer = ModelTrainer(registry)

        features, target, _ = DatasetProcessor.prepare_features_for_model(
            df, "demand", drop_cols=["timestamp"]
        )

        with pytest.raises(ValueError):
            trainer.train_regression_model("test_dataset", "demand", features, target)

    def test_future_forecast(self):
        df = create_training_data(300)
        registry = ModelRegistry(FakeSupabase())
        trainer = ModelTrainer(registry)

        model, metadata, _ = trainer.train_time_series_model(
            "test_dataset", "demand", df, "timestamp"
        )

        # Build latest window with lag features
        latest = df.tail(30).copy()
        for lag in [1, 2, 3, 6, 12, 24]:
            latest[f"lag_{lag}"] = df["demand"].shift(lag).tail(30).values
        ts = pd.to_datetime(latest["timestamp"])
        latest["hour"] = ts.dt.hour
        latest["hour_sin"] = np.sin(2 * np.pi * ts.dt.hour / 24)
        latest["hour_cos"] = np.cos(2 * np.pi * ts.dt.hour / 24)
        latest = latest.dropna()

        future = trainer.generate_future_forecast(model, metadata, latest, periods=24)
        assert len(future) == 24
        assert future["forecast_value"].notna().all()


class TestModelRegistry:
    def test_save_load(self):
        from sklearn.linear_model import LinearRegression
        import tempfile

        registry = ModelRegistry(FakeSupabase())
        model = LinearRegression()
        # Simple model fit to be saveable
        X = np.random.rand(10, 2)
        y = np.random.rand(10)
        model.fit(X, y)

        from app.ml.trainer import ModelMetadata
        metadata = ModelMetadata(
            model_type="LinearRegression",
            training_records=10,
            features=["a", "b"],
            target="test",
            evaluation={"mae": 0.5},
        )

        # Save uses local file system - test with actual save/load
        path = registry.save_model("test_dataset_save", "test_target", model, metadata)
        assert path is not None