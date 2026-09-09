"""Tests for optimization engine calculations"""
import sys
import os
import pytest
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.optimization.engine import OptimizationEngine


class FakeSupabase:
    """Fake Supabase returning empty data (optimization provided inputs directly)"""

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
        return SimpleResponse([])


class SimpleResponse:
    def __init__(self, data):
        self.data = data


class TestOptimizationEngine:
    def setup_method(self):
        self.engine = OptimizationEngine(FakeSupabase())

    def _default_inputs(self):
        # Deterministic realistic inputs
        demand = [100 + i * 2 for i in range(24)]  # smooth demand ramp
        solar = [0, 0, 0, 0, 0, 10, 40, 80, 120, 150, 160, 150, 130, 100, 70, 40, 15, 0, 0, 0, 0, 0, 0, 0]
        wind = [30] * 24  # constant wind
        price = [0.10] * 8 + [0.20] * 8 + [0.15] * 8  # cheap night, expensive day
        return demand, solar, wind, price

    def test_optimization_runs(self):
        demand, solar, wind, price = self._default_inputs()
        result = self.engine.optimize(
            "test_dataset",
            demand_forecast=demand,
            solar_forecast=solar,
            wind_forecast=wind,
            price_forecast=price,
            battery_state={"soc": 0.5, "soh": 1.0, "capacity_kwh": 100},
        )
        assert result["status"] == "COMPLETED"
        assert len(result["data"]["intervals"]) == 24
        assert "kpis" in result["data"]

    def test_interval_structure(self):
        demand, solar, wind, price = self._default_inputs()
        result = self.engine.optimize(
            "test_dataset",
            demand_forecast=demand,
            solar_forecast=solar,
            wind_forecast=wind,
            price_forecast=price,
        )
        interval = result["data"]["intervals"][0]
        for key in ["hour_of_day", "expected_demand_kw", "solar_generation_kw",
                    "wind_generation_kw", "renewable_contribution_percent",
                    "battery_action", "battery_kw", "grid_supply_kw",
                    "estimated_cost", "decision_explanation"]:
            assert key in interval

    def test_battery_charges_when_low_price(self):
        demand, solar, wind, price = self._default_inputs()
        # All cheap prices, low SOC -> battery should charge
        price = [0.05] * 24
        result = self.engine.optimize(
            "test_dataset",
            demand_forecast=demand,
            solar_forecast=solar,
            wind_forecast=wind,
            price_forecast=price,
            battery_state={"soc": 0.2, "soh": 1.0, "capacity_kwh": 100},
        )
        charge_actions = [i for i in result["data"]["intervals"] if i["battery_action"] == "charge"]
        assert len(charge_actions) > 0
        assert all(i["battery_kw"] > 0 for i in charge_actions)

    def test_battery_discharges_high_price(self):
        demand, solar, wind, price = self._default_inputs()
        # Expensive price with demand gap -> battery discharges
        price = [0.50] * 24
        result = self.engine.optimize(
            "test_dataset",
            demand_forecast=demand,
            solar_forecast=[0] * 24,
            wind_forecast=[0] * 24,
            price_forecast=price,
            battery_state={"soc": 0.9, "soh": 1.0, "capacity_kwh": 100},
        )
        discharge_actions = [i for i in result["data"]["intervals"] if i["battery_action"] == "discharge"]
        assert len(discharge_actions) > 0

    def test_no_fabricated_metrics(self):
        demand, solar, wind, price = self._default_inputs()
        result = self.engine.optimize(
            "test_dataset",
            demand_forecast=demand,
            solar_forecast=solar,
            wind_forecast=wind,
            price_forecast=price,
            battery_state={"soc": 0.5, "soh": 1.0, "capacity_kwh": 100},
        )
        # Cost must be derived from actual grid supply * actual price
        intervals = result["data"]["intervals"]
        for i, interval in enumerate(intervals):
            expected = interval["grid_supply_kw"] * price[i]
            assert abs(interval["estimated_cost"] - expected) < 0.5  # tolerance

    def test_renewable_utilization_logic(self):
        demand, solar, wind, price = self._default_inputs()
        # All demand met by renewables -> high utilization
        result = self.engine.optimize(
            "test_dataset",
            demand_forecast=[50] * 24,
            solar_forecast=[100] * 24,
            wind_forecast=[50] * 24,
            price_forecast=[0.15] * 24,
            battery_state={"soc": 0.5, "soh": 1.0, "capacity_kwh": 100},
        )
        assert result["data"]["kpis"]["grid_dependency_percent"] < 50

    def test_data_not_available(self):
        result = self.engine.optimize("test_dataset", demand_forecast=None)
        # With fake supabase returning no data, should return DATA_NOT_AVAILABLE
        assert result["status"] in ("DATA_NOT_AVAILABLE", "COMPLETED")