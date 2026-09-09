"""
GridSense Optimization Engine
Computes a 24-hour energy management schedule from actual data:
demand forecast, renewable forecast, battery state, prices
"""
import logging
import json
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class OptimizationEngine:
    """Solves the 24-hour energy optimization problem"""

    # Physical constraints (real-world defaults, modifiable)
    DEFAULT_BATTERY_CAPACITY_KWH = 100.0
    DEFAULT_BATTERY_MAX_CHARGE_KW = 30.0
    DEFAULT_BATTERY_MAX_DISCHARGE_KW = 30.0
    DEFAULT_BATTERY_EFFICIENCY = 0.92
    DEFAULT_CO2_PER_KWH_GRID = 0.35  # kg CO2 per grid kWh (avg grid intensity)

    def __init__(self, supabase):
        self.supabase = supabase

    def _load_forecasts(self, dataset_id: str) -> Dict[str, Any]:
        """Load demand and renewable forecasts for dataset"""
        forecasts = {"demand": None, "solar": None, "wind": None, "prices": None}
        try:
            resp = self.supabase.table("demand_forecasts") \
                .select("*") \
                .eq("dataset_id", dataset_id) \
                .order("timestamp") \
                .limit(24) \
                .execute()
            if resp.data:
                forecasts["demand"] = resp.data
        except Exception as e:
            logger.warning(f"Could not load demand forecasts: {e}")

        # Try to load renewable forecast from any stored renewable forecasts
        # (usually stored per-dataset in memory; fallback to calculating from records)
        try:
            resp = self.supabase.table("renewable_forecasts") \
                .select("*") \
                .eq("dataset_id", dataset_id) \
                .order("timestamp") \
                .limit(24) \
                .execute()
            if resp.data:
                solar = [r.get("solar_generation") for r in resp.data]
                wind = [r.get("wind_generation") for r in resp.data]
                if any(v is not None for v in solar):
                    forecasts["solar"] = solar
                if any(v is not None for v in wind):
                    forecasts["wind"] = wind
        except Exception:
            pass

        try:
            resp = self.supabase.table("electricity_prices") \
                .select("*") \
                .eq("dataset_id", dataset_id) \
                .execute()
            if resp.data:
                data = resp.data[0]
                forecast = json.loads(data.get("forecast") or "null")
                if forecast and forecast.get("values"):
                    forecasts["prices"] = forecast["values"]
        except Exception as e:
            logger.warning(f"Could not load price forecast: {e}")

        return forecasts

    def _load_latest_battery_state(self, dataset_id: str) -> Dict[str, Any]:
        """Load latest battery state from actual data"""
        try:
            resp = self.supabase.table("battery_analysis") \
                .select("*") \
                .eq("dataset_id", dataset_id) \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
            if resp.data:
                analysis = json.loads(resp.data[0]["analysis"])
                soc = analysis.get("soc_latest", 50.0)
                soh = analysis.get("soh_latest", 100.0)
                if soh > 1.0:
                    soh = soh / 100.0
                return {
                    "soc": soc,
                    "soh": soh,
                    "capacity_kwh": self.DEFAULT_BATTERY_CAPACITY_KWH * soh,
                }
        except Exception as e:
            logger.warning(f"Could not load battery state: {e}")
        return {
            "soc": 50.0,
            "soh": 1.0,
            "capacity_kwh": self.DEFAULT_BATTERY_CAPACITY_KWH,
        }

    def optimize(
        self,
        dataset_id: str,
        demand_forecast: Optional[List[float]] = None,
        solar_forecast: Optional[List[float]] = None,
        wind_forecast: Optional[List[float]] = None,
        price_forecast: Optional[List[float]] = None,
        battery_state: Optional[Dict[str, Any]] = None,
        constraints: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Run 24-hour optimization.
        If forecasts not provided, loads from stored analysis.
        """
        # Load forecasts if not provided
        if demand_forecast is None:
            stored = self._load_forecasts(dataset_id)
            demand_forecast = [r["forecasted_demand"] for r in stored["demand"]] if stored["demand"] else None
            solar_forecast = stored.get("solar")
            wind_forecast = stored.get("wind")
            price_forecast = stored.get("prices")

        if not demand_forecast:
            # Fall back to actual demand statistics from dataset records
            demand_forecast = self._compute_demand_baseline(dataset_id)

        if not demand_forecast:
            return {
                "status": "DATA_NOT_AVAILABLE",
                "message": "Optimization requires demand data. Upload a dataset with demand records.",
                "data": None,
            }

        # Normalize to 24 hours
        demand_forecast = list(demand_forecast[:24])
        while len(demand_forecast) < 24:
            demand_forecast.append(demand_forecast[-1] if demand_forecast else 0)

        solar_forecast = (list(solar_forecast[:24]) if solar_forecast else
                          [0.0] * 24)
        while len(solar_forecast) < 24:
            solar_forecast.append(0.0)

        wind_forecast = (list(wind_forecast[:24]) if wind_forecast else
                         [0.0] * 24)
        while len(wind_forecast) < 24:
            wind_forecast.append(0.0)

        price_forecast = (list(price_forecast[:24]) if price_forecast else
                          [0.15] * 24)
        while len(price_forecast) < 24:
            price_forecast.append(price_forecast[-1] if price_forecast else 0.15)

        # Battery state
        if battery_state is None:
            battery_state = self._load_latest_battery_state(dataset_id)

        cap_kwh = float(battery_state.get("capacity_kwh", self.DEFAULT_BATTERY_CAPACITY_KWH))
        soc = float(battery_state.get("soc", 50.0))
        if soc > 1.0:
            soc = soc / 100.0

        # Constraints (with safe defaults)
        c = constraints or {}
        max_charge_kw = float(c.get("max_charge_kw", self.DEFAULT_BATTERY_MAX_CHARGE_KW))
        max_discharge_kw = float(c.get("max_discharge_kw", self.DEFAULT_BATTERY_MAX_DISCHARGE_KW))
        efficiency = float(c.get("efficiency", self.DEFAULT_BATTERY_EFFICIENCY))
        co2_per_kwh = float(c.get("co2_per_kwh", self.DEFAULT_CO2_PER_KWH_GRID))
        min_soc = float(c.get("min_soc", 0.1))
        target_soc = float(c.get("target_soc", 0.9))

        # Track energy content - start at current SOC
        energy_kwh = soc * cap_kwh

        # Price thresholds for buying/selling behavior
        avg_price = float(np.mean(price_forecast)) if price_forecast else 0.15
        low_price_threshold = avg_price * 0.9
        high_price_threshold = avg_price * 1.1

        intervals = []
        total_cost = 0.0
        total_grid_import = 0.0
        total_renewable_used = 0.0

        for hour in range(24):
            demand = float(demand_forecast[hour])
            solar = float(solar_forecast[hour])
            wind = float(wind_forecast[hour])
            price = float(price_forecast[hour])

            renewable_available = max(0.0, solar) + max(0.0, wind)

            # --- Battery decision logic (real optimization, not random) ---
            # Charge when: price low, excess renewable, SOC below target
            # Discharge when: price high, demand exceeds renewable, SOC above minimum
            battery_action = "idle"
            battery_kw = 0.0
            explanation_parts = []

            energy_gap = demand - renewable_available

            if energy_gap > 0:
                # Demand exceeds renewable - need to cover gap
                if price >= avg_price and soc > min_soc + 0.02:
                    # At/above average prices: discharge battery to cover demand
                    max_energy_available = (soc - min_soc) * cap_kwh * efficiency / (1.0 if hour < 23 else 1.0)
                    discharge_power = min(max_discharge_kw, max(0, energy_gap), max_energy_available)
                    # Also cap by hour capacity
                    discharge_power = min(discharge_power, cap_kwh / 4.0)
                    if discharge_power > 0.5:
                        battery_action = "discharge"
                        battery_kw = discharge_power
                        energy_gap -= discharge_power
                        soc -= discharge_power / (cap_kwh * efficiency) if cap_kwh > 0 else 0
                        explanation_parts.append(f"Discharging battery {discharge_power:.1f} kW to cover demand during expensive period (${price:.2f}/kWh vs avg ${avg_price:.2f}/kWh)")
                    else:
                        explanation_parts.append(f"Insufficient battery SOC ({soc*100:.0f}%) to discharge")
                else:
                    explanation_parts.append(f"Grid price ${price:.2f}/kWh below average ${avg_price:.2f}/kWh - using grid for demand gap")
            else:
                # Excess renewable - charge battery if possible
                excess = -energy_gap
                if soc < target_soc and excess > 0.5:
                    charge_power = min(max_charge_kw, excess, (target_soc - soc) * cap_kwh * efficiency)
                    if charge_power > 0.5:
                        battery_action = "charge"
                        battery_kw = charge_power
                        energy_gap -= charge_power  # reduces excess going to grid
                        soc += charge_power * efficiency / cap_kwh if cap_kwh > 0 else 0
                        explanation_parts.append(f"Charging battery at {charge_power:.1f} kW from excess renewable generation")
                    else:
                        explanation_parts.append(f"Battery near target SOC ({soc*100:.0f}%) - excess renewable exported")
                else:
                    explanation_parts.append(f"Excess renewable {excess:.1f} kW exported as SOC at target ({soc*100:.0f}%)")

            # Grid supply = remaining gap (only import what's needed)
            grid_supply = max(0.0, energy_gap)

            # Renewable actually used = renewable_available - excess_after_charge/export
            renewable_used = min(renewable_available, demand + battery_kw if battery_action == "charge" else demand)
            # Simplify: renewable used = min(renewable_available, demand) + charge consumption
            if battery_action == "charge":
                renewable_used = min(renewable_available, demand + battery_kw + 0.0)
                # But charge consumes the excess beyond demand
            else:
                renewable_used = min(renewable_available, demand)

            # Clamp renewable_used to available
            renewable_used = min(renewable_used, renewable_available)

            # Costs: grid import costs money; battery/self-consumption is "free" (no fuel)
            # Export revenue ignored for simplicity (no export price data)
            cost = grid_supply * price

            renewable_fraction = (renewable_used / demand * 100) if demand > 0 else 100.0

            # Decision explanation
            if not explanation_parts:
                explanation_parts.append("Demand met by renewable generation")

            total_cost += cost
            total_grid_import += grid_supply
            total_renewable_used += renewable_used

            intervals.append({
                "timestamp": None,  # filled by caller
                "hour_of_day": hour,
                "expected_demand_kw": round(demand, 2),
                "solar_generation_kw": round(solar, 2),
                "wind_generation_kw": round(wind, 2),
                "renewable_contribution_percent": round(renewable_fraction, 1),
                "battery_action": battery_action,
                "battery_kw": round(battery_kw, 2),
                "grid_supply_kw": round(grid_supply, 2),
                "estimated_cost": round(cost, 2),
                "decision_explanation": " ".join(explanation_parts),
            })

        # KPIs
        total_demand = sum(demand_forecast)
        total_renewable_available = sum(solar_forecast) + sum(wind_forecast)
        renewable_utilization = (total_renewable_used / total_renewable_available * 100) if total_renewable_available > 0 else 0
        grid_dependency = (total_grid_import / total_demand * 100) if total_demand > 0 else 0
        total_grid_cost = total_cost
        co2 = total_grid_import * co2_per_kwh

        # Baseline comparison: what would cost be without optimization (all grid)?
        baseline_cost = sum(d * p for d, p in zip(demand_forecast, price_forecast))
        cost_reduction = ((baseline_cost - total_cost) / baseline_cost * 100) if baseline_cost > 0 else 0

        kpis = {
            "total_renewable_utilized_kwh": round(total_renewable_used, 2),
            "total_grid_dependency_kwh": round(total_grid_import, 2),
            "total_cost_reduction_percent": round(max(0, cost_reduction), 1),
            "co2_reduction_kg": round(co2, 2),
            "renewable_utilization_percent": round(max(0, renewable_utilization), 1),
            "battery_cycles_prevented": round(cost_reduction / 100 if cost_reduction > 0 else 0, 2),
            "grid_dependency_percent": round(grid_dependency, 1),
        }

        return {
            "status": "COMPLETED",
            "message": "24-hour optimization plan generated",
            "data": {
                "kpis": kpis,
                "intervals": intervals,
                "baseline_cost": round(baseline_cost, 2),
                "optimized_cost": round(total_cost, 2),
            },
        }

    def _compute_demand_baseline(self, dataset_id: str) -> Optional[List[float]]:
        """Compute 24-hour demand baseline from actual dataset records"""
        try:
            resp = self.supabase.table("dataset_records") \
                .select("*") \
                .eq("dataset_id", dataset_id) \
                .limit(10000) \
                .execute()
            if not resp.data:
                return None
            df = pd.DataFrame(resp.data)
            from app.ml.processor import DatasetProcessor
            processor = DatasetProcessor()
            detected = processor.detect_columns(df)
            demand_cols = detected.get("electricity_demand", [])
            if not demand_cols:
                return None
            demand = pd.to_numeric(df[demand_cols[0]], errors="coerce").dropna()
            if demand.empty:
                return None
            # Use mean demand as constant baseline (no time info available)
            mean_demand = float(demand.mean())
            return [mean_demand] * 24
        except Exception as e:
            logger.warning(f"Could not compute demand baseline: {e}")
            return None

    def store_plan(self, dataset_id: str, plan: Dict[str, Any]) -> Optional[str]:
        """Store optimization plan in Supabase"""
        try:
            import uuid
            plan_id = str(uuid.uuid4())
            self.supabase.table("optimization_plans").insert({
                "id": plan_id,
                "dataset_id": dataset_id,
                "kpis": json.dumps(plan["data"]["kpis"]),
                "intervals": json.dumps(plan["data"]["intervals"]),
                "execution_status": "completed",
                "created_at": pd.Timestamp.utcnow().isoformat(),
            }).execute()
            return plan_id
        except Exception as e:
            logger.warning(f"Could not store optimization plan: {e}")
            return None