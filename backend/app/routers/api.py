"""GridSense API - complete endpoint wiring for all modules"""
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, UploadFile, File, Query

from app.config import settings
from app.database import get_supabase
from app.schemas import APIResponse
from app.services.dataset_service import DatasetService
from app.ml.forecasting import DemandForecastService, RenewableForecastService, PriceAnalysisService
from app.ml.health_analysis import BatteryAnalysisService, MaintenanceAnalysisService
from app.optimization.engine import OptimizationEngine
from app.digital_twin.simulator import DigitalTwinSimulator
from app.xai.explainer import XAIExplanationService, SHAP_AVAILABLE
from app.agents.orchestrator import AgentOrchestrator, LANGGRAPH_AVAILABLE

logger = logging.getLogger(__name__)
router = APIRouter()


def get_service_deps():
    """Helper to build service dependencies"""
    supabase = get_supabase()
    return {
        "dataset": DatasetService(supabase),
        "demand": DemandForecastService(supabase),
        "renewable": RenewableForecastService(supabase),
        "prices": PriceAnalysisService(supabase),
        "battery": BatteryAnalysisService(supabase),
        "maintenance": MaintenanceAnalysisService(supabase),
        "optimization": OptimizationEngine(supabase),
        "twin": DigitalTwinSimulator(supabase),
        "xai": XAIExplanationService(supabase),
        "agents": AgentOrchestrator(supabase),
        "supabase": supabase,
    }


# ==================== DATASETS ====================

@router.post("/datasets/upload", response_model=APIResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    description: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """Upload dataset (CSV/XLSX) and start background processing"""
    services = get_service_deps()
    try:
        result = await services["dataset"].upload_dataset(file, description, background_tasks)
        return APIResponse(success=True, data=result, message="Dataset upload started")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")


@router.get("/datasets", response_model=APIResponse)
async def list_datasets():
    """List datasets"""
    services = get_service_deps()
    try:
        datasets, total = await services["dataset"].list_datasets(1, 100)
        return APIResponse(success=True, data={"items": datasets, "total": total})
    except Exception as e:
        logger.error(f"List datasets error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list datasets")


@router.get("/datasets/{dataset_id}", response_model=APIResponse)
async def get_dataset(dataset_id: str):
    """Get dataset details"""
    services = get_service_deps()
    dataset = await services["dataset"].get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return APIResponse(success=True, data=dataset)


@router.get("/datasets/{dataset_id}/schema", response_model=APIResponse)
async def get_schema(dataset_id: str):
    """Get detected schema & column mappings"""
    services = get_service_deps()
    try:
        # Detect schema live from records
        supabase = services["supabase"]
        resp = supabase.table("dataset_records").select("*").eq("dataset_id", dataset_id).limit(1).execute()
        
        dataset = await services["dataset"].get_dataset(dataset_id)
        
        if resp.data and dataset:
            from app.ml.processor import DatasetProcessor
            import pandas as pd
            record = resp.data[0]
            data = record.get("data") or {}
            
            columns = []
            detected_variables = {k: [] for k in [
                "solar_generation", "wind_generation", "renewable_generation",
                "electricity_demand", "battery_soc", "battery_soh",
                "electricity_price", "temperature", "voltage", "current",
                "humidity", "cloud_cover", "wind_speed", "irradiance",
                "cycle_count", "charge_rate", "discharge_rate", "other"
            ]}
            
            for col_name, value in data.items():
                col_type = type(value).__name__
                detected_variables.setdefault("other", []).append(col_name) if col_name not in [
                    "timestamp"
                ] else None
                columns.append({
                    "name": col_name,
                    "type": col_type,
                    "detected_role": "unknown",
                    "missing_pct": 0,
                })
            
            # Use pattern detection on full column list
            if dataset.get("timestamp_column"):
                detected_variables["timestamp"] = [dataset["timestamp_column"]]
            
            return APIResponse(success=True, data={
                "dataset_id": dataset_id,
                "columns": columns,
                "detected_variables": detected_variables,
                "timestamp_column": dataset.get("timestamp_column"),
                "total_columns": dataset.get("columns_count"),
                "total_rows": dataset.get("rows_count"),
            })
        return APIResponse(success=True, data={
            "dataset_id": dataset_id,
            "columns": [],
            "detected_variables": {},
            "timestamp_column": None,
        })
    except Exception as e:
        logger.error(f"Schema error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get schema")


@router.get("/datasets/{dataset_id}/quality", response_model=APIResponse)
async def get_quality(dataset_id: str):
    """Get data quality report"""
    services = get_service_deps()
    report = await services["dataset"].get_quality_report(dataset_id)
    if not report:
        raise HTTPException(status_code=404, detail="Quality report not found")
    return APIResponse(success=True, data=report)


@router.post("/datasets/{dataset_id}/analyze", response_model=APIResponse)
async def analyze_dataset(dataset_id: str, background_tasks: BackgroundTasks = BackgroundTasks()):
    """Trigger full analysis pipeline: demand, renewable, prices, battery, maintenance"""
    services = get_service_deps()
    
    # Run all analyses in background
    background_tasks.add_task(run_full_analysis, dataset_id)
    
    return APIResponse(
        success=True,
        message="Full analysis pipeline started",
        data={"dataset_id": dataset_id, "status": "ANALYZING"},
    )


def run_full_analysis(dataset_id: str):
    """Background full analysis pipeline"""
    import traceback
    try:
        services = get_service_deps()
        logger.info(f"Starting full analysis for dataset {dataset_id}")

        # Demand forecast
        try:
            result = services["demand"].forecast_demand(dataset_id)
            logger.info(f"Demand: {result['status']} - {result['message']}")
        except Exception as e:
            logger.error(f"Demand analysis failed: {e}\n{traceback.format_exc()}")

        # Renewable forecast
        try:
            result = services["renewable"].forecast_renewable(dataset_id)
            logger.info(f"Renewable: {result['status']} - {result['message']}")
        except Exception as e:
            logger.error(f"Renewable analysis failed: {e}\n{traceback.format_exc()}")

        # Price analysis
        try:
            result = services["prices"].analyze_prices(dataset_id)
            logger.info(f"Prices: {result['status']} - {result['message']}")
        except Exception as e:
            logger.error(f"Price analysis failed: {e}\n{traceback.format_exc()}")

        # Battery analysis
        try:
            result = services["battery"].analyze_battery(dataset_id)
            logger.info(f"Battery: {result['status']} - {result['message']}")
        except Exception as e:
            logger.error(f"Battery analysis failed: {e}\n{traceback.format_exc()}")

        # Maintenance analysis
        try:
            result = services["maintenance"].analyze_maintenance(dataset_id)
            logger.info(f"Maintenance: {result['status']} - {result['message']}")
        except Exception as e:
            logger.error(f"Maintenance analysis failed: {e}\n{traceback.format_exc()}")

        # Agent orchestration
        try:
            result = services["agents"].run_pipeline(dataset_id)
            logger.info(f"Agents: {result['status']}")
        except Exception as e:
            logger.error(f"Agent pipeline failed: {e}\n{traceback.format_exc()}")

        # Update dataset status
        try:
            supabase = services["supabase"]
            supabase.table("datasets").update({
                "processing_status": "completed",
            }).eq("id", dataset_id).execute()
        except Exception as e:
            logger.error(f"Status update failed: {e}")

        logger.info(f"Full analysis completed for dataset {dataset_id}")
    except Exception as e:
        logger.error(f"Analysis pipeline error: {e}\n{traceback.format_exc()}")


# ==================== DEMAND ====================

@router.post("/demand/forecast/{dataset_id}", response_model=APIResponse)
async def demand_forecast(dataset_id: str, background_tasks: BackgroundTasks = BackgroundTasks()):
    """Generate demand forecast"""
    services = get_service_deps()
    try:
        result = services["demand"].forecast_demand(dataset_id)
        return APIResponse(
            success=True,
            message=result["message"],
            data=result["data"],
            error=None if result["status"] == "COMPLETED" else result["message"],
        )
    except Exception as e:
        logger.error(f"Demand forecast error: {e}")
        raise HTTPException(status_code=500, detail="Demand forecast failed")


@router.get("/demand/forecast/{dataset_id}", response_model=APIResponse)
async def get_demand_forecast(dataset_id: str):
    """Get stored demand forecast"""
    services = get_service_deps()
    try:
        resp = services["supabase"].table("demand_forecasts") \
            .select("*").eq("dataset_id", dataset_id).order("timestamp").limit(48).execute()
        return APIResponse(success=True, data=resp.data)
    except Exception as e:
        logger.error(f"Get demand forecast error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get forecasts")


# ==================== RENEWABLE ====================

@router.post("/renewables/forecast/{dataset_id}", response_model=APIResponse)
async def renewable_forecast(dataset_id: str):
    """Generate renewable forecast"""
    services = get_service_deps()
    try:
        result = services["renewable"].forecast_renewable(dataset_id)
        return APIResponse(
            success=True,
            message=result["message"],
            data=result["data"],
            error=None if result["status"] == "COMPLETED" else result["message"],
        )
    except Exception as e:
        logger.error(f"Renewable forecast error: {e}")
        raise HTTPException(status_code=500, detail="Renewable forecast failed")


@router.get("/renewables/forecast/{dataset_id}", response_model=APIResponse)
async def get_renewable_forecast(dataset_id: str):
    """Get stored renewable forecast"""
    services = get_service_deps()
    try:
        resp = services["supabase"].table("renewable_forecasts") \
            .select("*").eq("dataset_id", dataset_id).order("timestamp").limit(48).execute()
        return APIResponse(success=True, data=resp.data)
    except Exception as e:
        logger.error(f"Get renewable forecast error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get forecasts")


# ==================== PRICES ====================

@router.post("/prices/analyze/{dataset_id}", response_model=APIResponse)
async def price_analyze(dataset_id: str):
    """Analyze electricity prices"""
    services = get_service_deps()
    try:
        result = services["prices"].analyze_prices(dataset_id)
        return APIResponse(
            success=True,
            message=result["message"],
            data=result["data"],
            error=None if result["status"] == "COMPLETED" else result["message"],
        )
    except Exception as e:
        logger.error(f"Price analysis error: {e}")
        raise HTTPException(status_code=500, detail="Price analysis failed")


@router.get("/prices/forecast/{dataset_id}", response_model=APIResponse)
async def get_prices(dataset_id: str):
    """Get price analysis & forecast"""
    services = get_service_deps()
    try:
        resp = services["supabase"].table("electricity_prices") \
            .select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
        if resp.data:
            data = resp.data[0]
            return APIResponse(success=True, data=data)
        return APIResponse(success=True, data=None, message="No price analysis yet")
    except Exception as e:
        logger.error(f"Get prices error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get prices")


# ==================== BATTERY ====================

@router.post("/battery/analyze/{dataset_id}", response_model=APIResponse)
async def battery_analyze(dataset_id: str):
    """Analyze battery health"""
    services = get_service_deps()
    try:
        result = services["battery"].analyze_battery(dataset_id)
        return APIResponse(
            success=True,
            message=result["message"],
            data=result["data"],
            error=None if result["status"] == "COMPLETED" else result["message"],
        )
    except Exception as e:
        logger.error(f"Battery analysis error: {e}")
        raise HTTPException(status_code=500, detail="Battery analysis failed")


@router.get("/battery/{dataset_id}", response_model=APIResponse)
async def get_battery(dataset_id: str):
    """Get battery analysis"""
    services = get_service_deps()
    try:
        resp = services["supabase"].table("battery_analysis") \
            .select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
        if resp.data:
            return APIResponse(success=True, data=json.loads(resp.data[0]["analysis"]))
        return APIResponse(success=True, data=None, message="No battery analysis yet")
    except Exception as e:
        logger.error(f"Get battery error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get battery analysis")


# ==================== MAINTENANCE ====================

@router.post("/maintenance/analyze/{dataset_id}", response_model=APIResponse)
async def maintenance_analyze(dataset_id: str):
    """Analyze predictive maintenance"""
    services = get_service_deps()
    try:
        result = services["maintenance"].analyze_maintenance(dataset_id)
        return APIResponse(
            success=True,
            message=result["message"],
            data=result["data"],
            error=None if result["status"] == "COMPLETED" else result["message"],
        )
    except Exception as e:
        logger.error(f"Maintenance analysis error: {e}")
        raise HTTPException(status_code=500, detail="Maintenance analysis failed")


@router.get("/maintenance/{dataset_id}", response_model=APIResponse)
async def get_maintenance(dataset_id: str):
    """Get maintenance analysis"""
    services = get_service_deps()
    try:
        resp = services["supabase"].table("maintenance_predictions") \
            .select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
        if resp.data:
            return APIResponse(success=True, data=json.loads(resp.data[0]["analysis"]))
        return APIResponse(success=True, data=None, message="No maintenance analysis yet")
    except Exception as e:
        logger.error(f"Get maintenance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get maintenance analysis")


# ==================== WEATHER ====================

@router.post("/weather/analyze/{dataset_id}", response_model=APIResponse)
async def weather_analyze(dataset_id: str):
    """Analyze weather data in dataset"""
    services = get_service_deps()
    try:
        supabase = services["supabase"]
        resp = supabase.table("dataset_records").select("*").eq("dataset_id", dataset_id).limit(5000).execute()
        import pandas as pd
        if not resp.data:
            return APIResponse(success=False, error="DATA_NOT_AVAILABLE", message="No dataset records")
        df = pd.DataFrame(resp.data)
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
        if not weather_vars:
            return APIResponse(
                success=False,
                error="DATA_NOT_AVAILABLE",
                message="REQUIRED COLUMN(S) NOT FOUND. Weather analysis requires temperature, humidity, cloud cover, wind speed or irradiance columns.",
                data=None,
            )
        return APIResponse(success=True, data=weather_vars)
    except Exception as e:
        logger.error(f"Weather analysis error: {e}")
        raise HTTPException(status_code=500, detail="Weather analysis failed")


@router.get("/weather/{dataset_id}", response_model=APIResponse)
async def get_weather(dataset_id: str):
    """Get weather analysis"""
    return await weather_analyze(dataset_id)


# ==================== OPTIMIZATION ====================

@router.post("/optimization/run/{dataset_id}", response_model=APIResponse)
async def optimization_run(dataset_id: str, background_tasks: BackgroundTasks = BackgroundTasks()):
    """Run 24-hour optimization"""
    services = get_service_deps()
    try:
        result = services["optimization"].optimize(dataset_id)
        if result["status"] == "COMPLETED":
            plan_id = services["optimization"].store_plan(dataset_id, result)
            result["data"]["plan_id"] = plan_id
        return APIResponse(
            success=True,
            message=result["message"],
            data=result["data"],
            error=None if result["status"] == "COMPLETED" else result["message"],
        )
    except Exception as e:
        logger.error(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail="Optimization failed")


@router.get("/optimization/plan/{dataset_id}", response_model=APIResponse)
async def get_optimization_plan(dataset_id: str):
    """Get latest optimization plan"""
    services = get_service_deps()
    try:
        resp = services["supabase"].table("optimization_plans") \
            .select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
        if resp.data:
            plan = resp.data[0]
            plan["kpis"] = json.loads(plan.get("kpis") or "{}")
            plan["intervals"] = json.loads(plan.get("intervals") or "[]")
            return APIResponse(success=True, data=plan)
        return APIResponse(success=True, data=None, message="No optimization plan yet")
    except Exception as e:
        logger.error(f"Get plan error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get plan")


@router.get("/optimization/results/{dataset_id}", response_model=APIResponse)
async def get_optimization_results(dataset_id: str):
    """Get optimization results"""
    return await get_optimization_plan(dataset_id)


# ==================== DIGITAL TWIN ====================

@router.post("/digital-twin/simulate", response_model=APIResponse)
async def twin_simulate(payload: Dict[str, Any]):
    """Run digital twin simulation"""
    services = get_service_deps()
    dataset_id = payload.get("dataset_id")
    parameters = payload.get("parameters", {})
    scenario_name = payload.get("scenario_name", "What-If Scenario")
    if not dataset_id:
        raise HTTPException(status_code=400, detail="dataset_id is required")
    try:
        result = services["twin"].simulate(dataset_id, parameters, scenario_name)
        return APIResponse(
            success=True,
            message=result["message"],
            data=result["data"],
            error=None if result["status"] == "SIMULATED" else result["message"],
        )
    except Exception as e:
        logger.error(f"Twin simulate error: {e}")
        raise HTTPException(status_code=500, detail="Simulation failed")


@router.get("/digital-twin/scenarios/{dataset_id}", response_model=APIResponse)
async def list_twin_scenarios(dataset_id: str):
    """List twin scenarios"""
    services = get_service_deps()
    try:
        resp = services["supabase"].table("digital_twin_scenarios") \
            .select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(10).execute()
        return APIResponse(success=True, data=resp.data)
    except Exception as e:
        logger.error(f"List scenarios error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list scenarios")


# ==================== XAI ====================

@router.get("/xai/explain/{dataset_id}", response_model=APIResponse)
async def xai_explain(dataset_id: str):
    """Get XAI explanations for dataset models"""
    services = get_service_deps()
    try:
        supabase = services["supabase"]
        resp = supabase.table("xai_explanations") \
            .select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(10).execute()
        return APIResponse(success=True, data=resp.data)
    except Exception as e:
        logger.error(f"XAI explain error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get explanations")


@router.post("/xai/generate/{dataset_id}", response_model=APIResponse)
async def xai_generate(dataset_id: str):
    """Generate SHAP / model-based explanations for all models trained on a dataset"""
    services = get_service_deps()
    try:
        result = services["xai"].explain_dataset_models(dataset_id)
        return APIResponse(
            success=True,
            message=result["message"],
            data=result["data"],
            error=None if result["status"] == "COMPLETED" else result["message"],
        )
    except Exception as e:
        logger.error(f"XAI generate error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate explanations")


# ==================== AGENTS ====================

@router.post("/agents/run", response_model=APIResponse)
async def agents_run(payload: Dict[str, Any]):
    """Run agent pipeline"""
    services = get_service_deps()
    dataset_id = payload.get("dataset_id")
    if not dataset_id:
        raise HTTPException(status_code=400, detail="dataset_id is required")
    try:
        opt_result = payload.get("optimization_result")
        result = services["agents"].run_pipeline(dataset_id, opt_result)
        return APIResponse(success=True, data=result)
    except Exception as e:
        logger.error(f"Agents run error: {e}")
        raise HTTPException(status_code=500, detail="Agent pipeline failed")


@router.get("/agents/history/{dataset_id}", response_model=APIResponse)
async def agents_history(dataset_id: str):
    """Get agent execution history"""
    services = get_service_deps()
    try:
        resp = services["supabase"].table("ai_agents") \
            .select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(50).execute()
        events = []
        for r in resp.data:
            r["input_data"] = json.loads(r.get("input_data") or "{}")
            r["output_data"] = json.loads(r.get("output_data") or "{}")
            events.append(r)
        return APIResponse(success=True, data=events)
    except Exception as e:
        logger.error(f"Agents history error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get history")


# ==================== REPORTS ====================

@router.post("/reports/generate", response_model=APIResponse)
async def reports_generate(payload: Dict[str, Any]):
    """Generate a report"""
    services = get_service_deps()
    dataset_id = payload.get("dataset_id")
    report_type = payload.get("report_type", "summary")
    if not dataset_id:
        raise HTTPException(status_code=400, detail="dataset_id is required")
    try:
        import uuid
        report_id = str(uuid.uuid4())
        supabase = services["supabase"]
        supabase.table("reports").insert({
            "id": report_id,
            "dataset_id": dataset_id,
            "report_type": report_type,
            "title": f"{report_type.upper()} Report",
            "status": "ready",
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
        return APIResponse(success=True, data={"id": report_id, "status": "ready"})
    except Exception as e:
        logger.error(f"Report generate error: {e}")
        raise HTTPException(status_code=500, detail="Report generation failed")


@router.get("/reports/{dataset_id}", response_model=APIResponse)
async def reports_list(dataset_id: str):
    """List reports for dataset"""
    services = get_service_deps()
    try:
        resp = services["supabase"].table("reports") \
            .select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(20).execute()
        return APIResponse(success=True, data=resp.data)
    except Exception as e:
        logger.error(f"Reports list error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list reports")


# ==================== DASHBOARD ====================

@router.get("/dashboard/{dataset_id}", response_model=APIResponse)
async def dashboard(dataset_id: str):
    """Get dashboard data for dataset"""
    services = get_service_deps()
    try:
        supabase = services["supabase"]
        result = {"dataset": None, "quality": None, "forecasts": {}, "analysis": {}, "optimization": None}

        # Dataset
        result["dataset"] = await services["dataset"].get_dataset(dataset_id)

        # Quality
        result["quality"] = await services["dataset"].get_quality_report(dataset_id)

        # Demand forecast
        try:
            resp = supabase.table("demand_forecasts").select("*").eq("dataset_id", dataset_id).order("timestamp").limit(24).execute()
            result["forecasts"]["demand"] = resp.data
        except Exception:
            pass

        # Battery
        try:
            resp = supabase.table("battery_analysis").select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
            if resp.data:
                result["analysis"]["battery"] = json.loads(resp.data[0]["analysis"])
        except Exception:
            pass

        # Maintenance
        try:
            resp = supabase.table("maintenance_predictions").select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
            if resp.data:
                result["analysis"]["maintenance"] = json.loads(resp.data[0]["analysis"])
        except Exception:
            pass

        # Prices
        try:
            resp = supabase.table("electricity_prices").select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
            if resp.data:
                result["analysis"]["prices"] = json.loads(resp.data[0].get("analysis") or "{}")
                result["forecasts"]["prices"] = json.loads(resp.data[0].get("forecast") or "null")
        except Exception:
            pass

        # Optimization plan
        try:
            resp = supabase.table("optimization_plans").select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
            if resp.data:
                plan = resp.data[0]
                plan["kpis"] = json.loads(plan.get("kpis") or "{}")
                plan["intervals"] = json.loads(plan.get("intervals") or "[]")
                result["optimization"] = plan
        except Exception:
            pass

        return APIResponse(success=True, data=result)
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard")


# ==================== ALERTS ====================

@router.get("/alerts", response_model=APIResponse)
async def list_alerts():
    """List alerts"""
    services = get_service_deps()
    try:
        resp = services["supabase"].table("alerts") \
            .select("*").limit(50).execute()
        return APIResponse(success=True, data=resp.data)
    except Exception as e:
        logger.error(f"List alerts error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list alerts")


# ==================== AI COPILOT ====================

@router.post("/copilot/ask", response_model=APIResponse)
async def copilot_ask(payload: Dict[str, Any]):
    """AI Copilot - answers questions from actual dataset analysis"""
    services = get_service_deps()
    question = payload.get("question", "")
    dataset_id = payload.get("dataset_id")
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    if not dataset_id:
        raise HTTPException(status_code=400, detail="dataset_id is required")

    try:
        supabase = services["supabase"]
        # Retrieve relevant data before answering
        context = {"question": question, "dataset_id": dataset_id, "findings": []}

        # Load analysis results
        try:
            resp = supabase.table("battery_analysis").select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
            if resp.data:
                context["findings"].append({"type": "battery", "data": json.loads(resp.data[0]["analysis"])})
        except Exception:
            pass

        try:
            resp = supabase.table("maintenance_predictions").select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
            if resp.data:
                context["findings"].append({"type": "maintenance", "data": json.loads(resp.data[0]["analysis"])})
        except Exception:
            pass

        try:
            resp = supabase.table("demand_forecasts").select("*").eq("dataset_id", dataset_id).order("timestamp").limit(24).execute()
            if resp.data:
                context["findings"].append({"type": "demand_forecast", "data": resp.data})
        except Exception:
            pass

        try:
            resp = supabase.table("optimization_plans").select("*").eq("dataset_id", dataset_id).order("created_at", desc=True).limit(1).execute()
            if resp.data:
                plan = resp.data[0]
                context["findings"].append({
                    "type": "optimization",
                    "data": {
                        "kpis": json.loads(plan.get("kpis") or "{}"),
                        "execution_status": plan.get("execution_status"),
                    },
                })
        except Exception:
            pass

        # Generate answer from actual retrieved data - no fabrication
        answer_parts = ["Based on the analysis of your uploaded dataset:"]
        for finding in context["findings"]:
            if finding["type"] == "battery" and finding["data"]:
                d = finding["data"]
                if d.get("health_score") is not None:
                    answer_parts.append(
                        f"Your battery health score is {d['health_score']}/100 "
                        f"(SOC: {d.get('soc_latest', 'N/A')}%, SOH: {d.get('soh_latest', 'N/A')}%)"
                    )
            elif finding["type"] == "maintenance" and finding["data"]:
                d = finding["data"]
                answer_parts.append(
                    f"{d.get('total_anomalies', 0)} anomalies detected across {d.get('total_assets', 0)} monitored assets."
                )
            elif finding["type"] == "demand_forecast" and finding["data"]:
                values = [f["forecasted_demand"] for f in finding["data"] if f.get("forecasted_demand")]
                if values:
                    answer_parts.append(
                        f"Forecast demand ranges from {min(values):.1f} kW to {max(values):.1f} kW over the next 24 hours."
                    )
            elif finding["type"] == "optimization" and finding["data"]:
                kpis = finding["data"].get("kpis", {})
                if kpis:
                    answer_parts.append(
                        f"The optimization plan achieves {kpis.get('renewable_utilization_percent', 'N/A')}% renewable utilization "
                        f"with {kpis.get('total_cost_reduction_percent', 'N/A')}% estimated cost reduction."
                    )

        if len(answer_parts) == 1:
            answer_parts.append(
                "No analysis results have been computed yet for this dataset. Run the analysis pipeline first."
            )

        return APIResponse(success=True, data={"answer": " ".join(answer_parts), "context": context})
    except Exception as e:
        logger.error(f"Copilot error: {e}")
        raise HTTPException(status_code=500, detail="Copilot failed")


# ==================== HEALTH ====================

@router.get("/health", response_model=APIResponse)
async def health():
    """System health check"""
    services = get_service_deps()
    try:
        # Check database connectivity
        db_status = "connected"
        try:
            services["supabase"].table("datasets").select("id").limit(1).execute()
        except Exception:
            db_status = "disconnected"

        return APIResponse(success=True, data={
            "status": "healthy",
            "services": {
                "database": db_status,
                "ml": "ready",
                "agents": "ready" if LANGGRAPH_AVAILABLE else "fallback_sequential",
                "xai": "ready" if SHAP_AVAILABLE else "fallback_model_importance",
                "optimization": "ready",
                "digital_twin": "ready",
                "weather": "ready" if settings.OPENWEATHER_API_KEY else "not_configured",
            },
            "timestamp": datetime.utcnow().isoformat(),
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")


# ==================== WEATHER ====================
# Weather endpoints using OpenWeather API

@router.get("/weather/current", response_model=APIResponse)
async def get_current_weather(
    city: Optional[str] = Query(None, description="City name (e.g., 'London', 'New York')"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
):
    """Get current weather data by city name or coordinates"""
    from app.services.weather_service import weather_service

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


@router.get("/weather/forecast", response_model=APIResponse)
async def get_weather_forecast(
    city: Optional[str] = Query(None, description="City name (e.g., 'London', 'New York')"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
):
    """Get 5-day weather forecast by city name or coordinates"""
    from app.services.weather_service import weather_service

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


@router.get("/weather/air-quality", response_model=APIResponse)
async def get_air_quality(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """Get air quality index for coordinates"""
    from app.services.weather_service import weather_service

    try:
        aqi_data = await weather_service.get_air_quality(lat=lat, lon=lon)
        return APIResponse(success=True, data=aqi_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching air quality: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch air quality data")