"""
GridSense LangGraph Multi-Agent System
Specialized agents that analyze actual dataset information and pass structured
results through shared state.
"""
import logging
import json
import time
import uuid
from typing import Dict, List, Any, TypedDict, Optional
from datetime import datetime
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

try:
    from langgraph.graph import StateGraph, END
    try:
        from langgraph.checkpoint import MemorySaver
    except ImportError:
        MemorySaver = None
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    logger.warning("LangGraph not installed - using fallback sequential agent orchestration")


# ==================== Shared State ====================
class AgentState(TypedDict, total=False):
    dataset_id: str
    stage: str
    messages: List[Dict[str, Any]]
    weather_data: Dict[str, Any]
    renewable_data: Dict[str, Any]
    demand_data: Dict[str, Any]
    battery_data: Dict[str, Any]
    market_data: Dict[str, Any]
    maintenance_data: Dict[str, Any]
    optimization_plan: Dict[str, Any]
    final_recommendation: Dict[str, Any]
    agent_events: List[Dict[str, Any]]


# ==================== Base Agent ====================
class BaseAgent:
    def __init__(self, name: str, description: str, supabase=None):
        self.name = name
        self.description = description
        self.supabase = supabase

    def run(self, state: AgentState) -> AgentState:
        """Run agent logic - overridden by subclasses"""
        raise NotImplementedError

    def _record_event(
        self, state: AgentState, status: str, output: Dict[str, Any],
        input_summary: Dict[str, Any], confidence: Optional[float] = None,
        execution_ms: int = 0,
    ) -> AgentState:
        """Record agent execution event"""
        event = {
            "agent_name": self.name,
            "status": status,
            "input_features": input_summary,
            "output_summary": output,
            "confidence_score": confidence,
            "execution_time_ms": execution_ms,
            "timestamp": datetime.utcnow().isoformat(),
        }
        state.setdefault("agent_events", []).append(event)

        # Persist to Supabase if available
        if self.supabase:
            try:
                self.supabase.table("ai_agents").insert({
                    "dataset_id": state.get("dataset_id"),
                    "agent_name": self.name,
                    "status": status,
                    "input_data": json.dumps(input_summary),
                    "output_data": json.dumps(output),
                    "confidence_score": confidence,
                    "execution_time_ms": execution_ms,
                    "created_at": datetime.utcnow().isoformat(),
                }).execute()
            except Exception as e:
                logger.warning(f"Could not persist agent event: {e}")

        return state


# ==================== Specialized Agents ====================
class WeatherAgent(BaseAgent):
    """Weather Agent - analyzes weather variables in dataset"""

    def __init__(self, supabase=None):
        super().__init__(
            "Weather Agent",
            "Analyzes weather variables (temperature, humidity, wind speed, irradiance, cloud cover)",
            supabase,
        )

    def run(self, state: AgentState) -> AgentState:
        start = time.time()
        state["stage"] = "weather_analysis"

        # Load actual dataset data
        df = self._load_data(state["dataset_id"])
        if df is None or df.empty:
            return self._record_event(state, "failed", {"error": "No data"}, {}, None, int((time.time() - start) * 1000))

        from app.ml.processor import DatasetProcessor
        processor = DatasetProcessor()
        detected = processor.detect_columns(df)

        weather_vars = {}
        for key in ["temperature", "humidity", "cloud_cover", "wind_speed", "irradiance"]:
            if key in detected and detected[key]:
                col = detected[key][0]
                series = pd.to_numeric(df[col], errors="coerce").dropna()
                if not series.empty:
                    weather_vars[key] = {
                        "column": col,
                        "mean": round(float(series.mean()), 2),
                        "min": round(float(series.min()), 2),
                        "max": round(float(series.max()), 2),
                        "latest": round(float(series.iloc[-1]), 2),
                    }

        state["weather_data"] = weather_vars
        return self._record_event(
            state, "completed", weather_vars,
            {"variables": list(weather_vars.keys())},
            0.9 if weather_vars else 0.3,
            int((time.time() - start) * 1000),
        )

    def _load_data(self, dataset_id: str):
        if not self.supabase:
            return None
        try:
            resp = self.supabase.table("dataset_records").select("*").eq("dataset_id", dataset_id).limit(5000).execute()
            return pd.DataFrame(resp.data) if resp.data else None
        except Exception:
            return None


class RenewableAgent(BaseAgent):
    """Renewable Agent - analyzes solar/wind generation"""

    def __init__(self, supabase=None):
        super().__init__(
            "Renewable Agent",
            "Analyzes and forecasts solar and wind generation",
            supabase,
        )

    def run(self, state: AgentState) -> AgentState:
        start = time.time()
        state["stage"] = "renewable_analysis"

        df = self._load_data(state["dataset_id"])
        if df is None or df.empty:
            return self._record_event(state, "failed", {"error": "No data"}, {}, None, int((time.time() - start) * 1000))

        from app.ml.processor import DatasetProcessor
        processor = DatasetProcessor()
        detected = processor.detect_columns(df)

        renewable = {}
        for key in ["solar_generation", "wind_generation", "renewable_generation"]:
            if key in detected and detected[key]:
                col = detected[key][0]
                series = pd.to_numeric(df[col], errors="coerce").dropna()
                if not series.empty:
                    renewable[key] = {
                        "column": col,
                        "mean": round(float(series.mean()), 2),
                        "total": round(float(series.sum()), 2),
                        "max": round(float(series.max()), 2),
                        "latest": round(float(series.iloc[-1]), 2),
                        "capacity_factor_pct": round(float(series.mean() / series.max()) * 100 if series.max() > 0 else 0, 1),
                    }

        state["renewable_data"] = renewable
        return self._record_event(
            state, "completed", renewable,
            {"variables": list(renewable.keys())},
            0.9 if renewable else 0.3,
            int((time.time() - start) * 1000),
        )

    def _load_data(self, dataset_id: str):
        if not self.supabase:
            return None
        try:
            resp = self.supabase.table("dataset_records").select("*").eq("dataset_id", dataset_id).limit(5000).execute()
            return pd.DataFrame(resp.data) if resp.data else None
        except Exception:
            return None


class DemandAgent(BaseAgent):
    """Demand Agent - analyzes historical demand"""

    def __init__(self, supabase=None):
        super().__init__(
            "Demand Agent",
            "Analyzes electricity demand patterns and forecasts",
            supabase,
        )

    def run(self, state: AgentState) -> AgentState:
        start = time.time()
        state["stage"] = "demand_analysis"

        df = self._load_data(state["dataset_id"])
        if df is None or df.empty:
            return self._record_event(state, "failed", {"error": "No data"}, {}, None, int((time.time() - start) * 1000))

        from app.ml.processor import DatasetProcessor
        processor = DatasetProcessor()
        detected = processor.detect_columns(df)
        demand_cols = detected.get("electricity_demand", [])

        if not demand_cols:
            state["demand_data"] = {"available": False}
            return self._record_event(state, "completed", {"available": False}, {}, 0.1, int((time.time() - start) * 1000))

        col = demand_cols[0]
        series = pd.to_numeric(df[col], errors="coerce").dropna()

        timestamp_col = processor.detect_timestamp_column(df)
        hourly_profile = None
        if timestamp_col:
            temp = df[[timestamp_col, col]].copy()
            temp["hour"] = pd.to_datetime(temp[timestamp_col]).dt.hour
            hourly = temp.groupby("hour")[col].mean()
            hourly_profile = {str(h): round(float(v), 2) for h, v in hourly.items()}

        demand = {
            "available": True,
            "column": col,
            "mean": round(float(series.mean()), 2),
            "peak": round(float(series.max()), 2),
            "min": round(float(series.min()), 2),
            "total_energy_kwh": round(float(series.sum()), 2),
            "hourly_profile": hourly_profile,
        }

        state["demand_data"] = demand
        return self._record_event(
            state, "completed", demand, {"column": col},
            0.9, int((time.time() - start) * 1000),
        )

    def _load_data(self, dataset_id: str):
        if not self.supabase:
            return None
        try:
            resp = self.supabase.table("dataset_records").select("*").eq("dataset_id", dataset_id).limit(5000).execute()
            return pd.DataFrame(resp.data) if resp.data else None
        except Exception:
            return None


class BatteryAgent(BaseAgent):
    """Battery Agent - analyzes battery health"""

    def __init__(self, supabase=None):
        super().__init__(
            "Battery Agent",
            "Assesses battery SOC/SOH and usable capacity",
            supabase,
        )

    def run(self, state: AgentState) -> AgentState:
        start = time.time()
        state["stage"] = "battery_analysis"

        battery = {}
        if self.supabase:
            try:
                resp = self.supabase.table("battery_analysis") \
                    .select("*").eq("dataset_id", state["dataset_id"]) \
                    .order("created_at", desc=True).limit(1).execute()
                if resp.data:
                    battery = json.loads(resp.data[0]["analysis"])
            except Exception:
                pass

        state["battery_data"] = battery
        return self._record_event(
            state, "completed", battery, {"analysis": "battery_analysis"},
            0.9 if battery else 0.2,
            int((time.time() - start) * 1000),
        )


class MarketAgent(BaseAgent):
    """Market Agent - analyzes electricity prices"""

    def __init__(self, supabase=None):
        super().__init__(
            "Market Agent",
            "Analyzes electricity market prices",
            supabase,
        )

    def run(self, state: AgentState) -> AgentState:
        start = time.time()
        state["stage"] = "market_analysis"

        market = {}
        if self.supabase:
            try:
                resp = self.supabase.table("electricity_prices") \
                    .select("*").eq("dataset_id", state["dataset_id"]) \
                    .order("created_at", desc=True).limit(1).execute()
                if resp.data:
                    market = json.loads(resp.data[0]["analysis"])
            except Exception:
                pass

        state["market_data"] = market
        return self._record_event(
            state, "completed", market,
            {"analysis": "electricity_prices"},
            0.9 if market else 0.2,
            int((time.time() - start) * 1000),
        )


class MaintenanceAgent(BaseAgent):
    """Maintenance Agent - analyzes asset health"""

    def __init__(self, supabase=None):
        super().__init__(
            "Maintenance Agent",
            "Detects anomalies and assesses asset health",
            supabase,
        )

    def run(self, state: AgentState) -> AgentState:
        start = time.time()
        state["stage"] = "maintenance_analysis"

        maintenance = {}
        if self.supabase:
            try:
                resp = self.supabase.table("maintenance_predictions") \
                    .select("*").eq("dataset_id", state["dataset_id"]) \
                    .order("created_at", desc=True).limit(1).execute()
                if resp.data:
                    maintenance = json.loads(resp.data[0]["analysis"])
            except Exception:
                pass

        state["maintenance_data"] = maintenance
        return self._record_event(
            state, "completed", maintenance,
            {"analysis": "maintenance_predictions"},
            0.9 if maintenance else 0.2,
            int((time.time() - start) * 1000),
        )


class OptimizationAgent(BaseAgent):
    """Optimization Agent - synthesizes final recommendation"""

    def __init__(self, supabase=None, optimization_result: Optional[Dict[str, Any]] = None):
        super().__init__(
            "Optimization Agent",
            "Synthesizes all agent outputs into optimal 24-hour energy plan",
            supabase,
        )
        self.optimization_result = optimization_result

    def run(self, state: AgentState) -> AgentState:
        start = time.time()
        state["stage"] = "optimization"

        # Combine all agent outputs into a final recommendation
        recommendation = {
            "summary": "24-hour energy optimization plan generated from all agent analyses",
            "renewable_utilization": state.get("optimization_plan", {}).get("kpis", {}).get("renewable_utilization_percent"),
            "cost_reduction": state.get("optimization_plan", {}).get("kpis", {}).get("total_cost_reduction_percent"),
            "grid_dependency": state.get("optimization_plan", {}).get("kpis", {}).get("grid_dependency_percent"),
            "assumptions": {
                "weather": bool(state.get("weather_data")),
                "renewable": bool(state.get("renewable_data")),
                "demand": bool(state.get("demand_data", {}).get("available")),
                "battery": bool(state.get("battery_data")),
                "market": bool(state.get("market_data")),
                "maintenance": bool(state.get("maintenance_data")),
            },
        }

        state["final_recommendation"] = recommendation
        return self._record_event(
            state, "completed", recommendation,
            {"agent_inputs": ["weather", "renewable", "demand", "battery", "market", "maintenance"]},
            0.95,
            int((time.time() - start) * 1000),
        )


# ==================== Orchestrator ====================
class AgentOrchestrator:
    """Sequential agent orchestration with LangGraph state flow"""

    def __init__(self, supabase=None):
        self.supabase = supabase
        self.agents = [
            WeatherAgent(supabase),
            RenewableAgent(supabase),
            DemandAgent(supabase),
            BatteryAgent(supabase),
            MarketAgent(supabase),
            MaintenanceAgent(supabase),
        ]

    def run_pipeline(
        self,
        dataset_id: str,
        optimization_result: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Run all agents in sequence with shared state"""
        state: AgentState = {
            "dataset_id": dataset_id,
            "stage": "initialized",
            "messages": [],
            "agent_events": [],
        }

        if LANGGRAPH_AVAILABLE:
            state = self._run_langgraph(state, optimization_result)
        else:
            state = self._run_sequential(state, optimization_result)

        return {
            "status": "COMPLETED",
            "dataset_id": dataset_id,
            "agent_events": state.get("agent_events", []),
            "final_recommendation": state.get("final_recommendation"),
        }

    def _run_sequential(self, state: AgentState, optimization_result: Optional[Dict[str, Any]]) -> AgentState:
        """Fallback sequential execution"""
        for agent in self.agents:
            state = agent.run(state)

        # Optimization agent last
        opt_agent = OptimizationAgent(self.supabase, optimization_result)
        if optimization_result:
            state["optimization_plan"] = optimization_result
        state = opt_agent.run(state)
        return state

    def _run_langgraph(self, state: AgentState, optimization_result: Optional[Dict[str, Any]]) -> AgentState:
        """LangGraph-based execution"""
        try:
            from langgraph.graph import StateGraph, END

            workflow = StateGraph(AgentState)

            # Add agent nodes
            for agent in self.agents:
                workflow.add_node(agent.name, agent.run)

            opt_agent = OptimizationAgent(self.supabase, optimization_result)
            workflow.add_node(opt_agent.name, opt_agent.run)

            # Connect sequentially
            names = [a.name for a in self.agents]
            for i in range(len(names) - 1):
                workflow.add_edge(names[i], names[i + 1])
            workflow.add_edge(names[-1], opt_agent.name)
            workflow.add_edge(opt_agent.name, END)

            # Set entry point
            workflow.set_entry_point(names[0])

            # Compile and run
            app = workflow.compile()
            final_state = app.invoke(state)

            # Set optimization plan if provided
            if optimization_result and "optimization_plan" not in final_state:
                final_state["optimization_plan"] = optimization_result

            return final_state
        except Exception as e:
            logger.warning(f"LangGraph execution failed ({e}) - falling back to sequential")
            return self._run_sequential(state, optimization_result)