from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ==================== Enums ====================
class ProcessingStatus(str, Enum):
    UPLOADING = "uploading"
    VALIDATING = "validating"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ==================== Dataset Schemas ====================
class DatasetBase(BaseModel):
    name: str
    description: Optional[str] = None


class DatasetCreate(DatasetBase):
    pass


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class DatasetSchema(BaseModel):
    id: str
    user_id: str
    name: str
    filename: str
    file_size: int
    format: str
    uploaded_at: datetime
    processing_status: ProcessingStatus
    quality_score: float
    rows_count: Optional[int] = None
    columns_count: Optional[int] = None
    timestamp_column: Optional[str] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== Data Quality Schemas ====================
class DataQualityIssueSchema(BaseModel):
    column: str
    issue_type: str
    severity: str
    count: int
    percentage: float
    details: Optional[str] = None


class DataQualityReportSchema(BaseModel):
    dataset_id: str
    total_rows: int
    total_columns: int
    missing_values_count: int
    duplicate_rows: int
    missing_values_percentage: float
    duplicate_percentage: float
    numerical_columns: int
    categorical_columns: int
    datetime_columns: int
    quality_score: float
    issues: List[DataQualityIssueSchema]
    recommendations: List[str]

    class Config:
        from_attributes = True


# ==================== Forecast Schemas ====================
class DemandForecastSchema(BaseModel):
    timestamp: datetime
    actual_demand: Optional[float] = None
    forecasted_demand: float
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None

    class Config:
        from_attributes = True


class RenewableForecastSchema(BaseModel):
    timestamp: datetime
    solar_generation: float
    wind_generation: float
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None

    class Config:
        from_attributes = True


class PriceAnalysisSchema(BaseModel):
    timestamp: datetime
    actual_price: Optional[float] = None
    forecasted_price: Optional[float] = None
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None
    volatility: Optional[float] = None
    trend: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== Battery & Health Schemas ====================
class BatteryAnalysisSchema(BaseModel):
    timestamp: datetime
    soc: float
    soh: float
    voltage: Optional[float] = None
    current: Optional[float] = None
    temperature: Optional[float] = None
    cycle_count: Optional[int] = None
    health_score: float
    degradation_rate: Optional[float] = None
    anomaly_detected: bool

    class Config:
        from_attributes = True


class MaintenancePredictionSchema(BaseModel):
    asset_id: str
    asset_name: str
    current_health_score: float
    predicted_failure_date: Optional[str] = None
    risk_level: RiskLevel
    recommended_maintenance: str
    confidence: float
    historical_anomalies: int

    class Config:
        from_attributes = True


# ==================== Optimization Schemas ====================
class EnergyIntervalSchema(BaseModel):
    timestamp: datetime
    hour_of_day: int
    expected_demand_kw: float
    solar_generation_kw: float
    wind_generation_kw: float
    renewable_contribution_percent: float
    battery_action: str  # 'charge', 'discharge', 'idle'
    battery_kw: float
    grid_supply_kw: float
    estimated_cost: float
    decision_explanation: str


class OptimizationKPIsSchema(BaseModel):
    total_renewable_utilized_kwh: float
    total_grid_dependency_kwh: float
    total_cost_reduction_percent: float
    co2_reduction_kg: float
    renewable_utilization_percent: float
    battery_cycles_prevented: float


class OptimizationPlanSchema(BaseModel):
    id: str
    dataset_id: str
    timestamp_start: datetime
    timestamp_end: datetime
    created_at: datetime
    execution_status: str
    optimization_objectives: List[str]
    kpis: OptimizationKPIsSchema
    intervals: List[EnergyIntervalSchema]

    class Config:
        from_attributes = True


# ==================== Digital Twin Schemas ====================
class ScenarioParametersSchema(BaseModel):
    solar_generation_factor: float = 1.0
    wind_generation_factor: float = 1.0
    demand_factor: float = 1.0
    battery_capacity_kwh: float
    battery_current_soc: float
    electricity_price_factor: float = 1.0


class ScenarioResultsSchema(BaseModel):
    total_cost: float
    renewable_utilization_percent: float
    grid_dependency_percent: float
    battery_cycles: float
    co2_emissions_kg: float
    intervals: List[EnergyIntervalSchema]


class DigitalTwinScenarioSchema(BaseModel):
    id: str
    dataset_id: str
    scenario_name: str
    scenario_type: str
    parameters: ScenarioParametersSchema
    results: Optional[ScenarioResultsSchema] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== XAI Schemas ====================
class FeatureImportanceSchema(BaseModel):
    feature: str
    importance_score: float
    contribution_direction: str
    contribution_magnitude: float


class XAIExplanationSchema(BaseModel):
    id: str
    prediction_id: str
    prediction_type: str
    model_name: str
    shap_values: Optional[List[float]] = None
    feature_importance: List[FeatureImportanceSchema]
    local_explanation: str
    global_explanation: str
    confidence: float

    class Config:
        from_attributes = True


# ==================== Agent Schemas ====================
class AgentExecutionSchema(BaseModel):
    id: str
    agent_name: str
    status: str
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    confidence_score: Optional[float] = None
    execution_time_ms: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== API Response Schemas ====================
class APIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================== Health Check Schemas ====================
class HealthCheckResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    services: Dict[str, str]
