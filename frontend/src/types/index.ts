// User & Authentication
export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

// Dataset
export interface Dataset {
  id: string
  user_id: string
  name: string
  filename: string
  file_size: number
  format: 'csv' | 'xlsx'
  uploaded_at: string
  processing_status: 'uploading' | 'validating' | 'processing' | 'completed' | 'failed'
  quality_score: number
  rows_count: number
  columns_count: number
  timestamp_column?: string
  timestamp_range?: {
    start: string
    end: string
  }
  detected_variables?: DetectedVariables
  error_message?: string
}

export interface DetectedVariables {
  solar_generation?: string[]
  wind_generation?: string[]
  renewable_generation?: string[]
  electricity_demand?: string[]
  battery_soc?: string[]
  battery_soh?: string[]
  electricity_price?: string[]
  temperature?: string[]
  weather?: string[]
  other?: string[]
}

export interface DataQualityReport {
  dataset_id: string
  total_rows: number
  total_columns: number
  missing_values_count: number
  duplicate_rows: number
  missing_values_percentage: number
  duplicate_percentage: number
  numerical_columns: number
  categorical_columns: number
  datetime_columns: number
  quality_score: number
  issues: DataQualityIssue[]
  recommendations: string[]
}

export interface DataQualityIssue {
  column: string
  issue_type: 'missing_values' | 'duplicates' | 'outliers' | 'invalid_format'
  severity: 'low' | 'medium' | 'high'
  count: number
  percentage: number
  details?: string
}

// Forecasts
export interface DemandForecast {
  dataset_id: string
  timestamp: string
  actual_demand?: number
  forecasted_demand: number
  confidence_lower?: number
  confidence_upper?: number
  mae?: number
  rmse?: number
  r2_score?: number
}

export interface RenewableForecast {
  dataset_id: string
  timestamp: string
  solar_generation: number
  wind_generation: number
  confidence_lower?: number
  confidence_upper?: number
}

export interface PriceAnalysis {
  dataset_id: string
  timestamp: string
  actual_price?: number
  forecasted_price?: number
  confidence_lower?: number
  confidence_upper?: number
  volatility?: number
  trend?: 'up' | 'down' | 'stable'
}

// Battery & Health
export interface BatteryAnalysis {
  dataset_id: string
  timestamp: string
  soc: number // State of Charge %
  soh: number // State of Health %
  voltage?: number
  current?: number
  temperature?: number
  cycle_count?: number
  health_score: number
  degradation_rate?: number
  anomaly_detected: boolean
}

export interface MaintenancePrediction {
  asset_id: string
  asset_name: string
  current_health_score: number
  predicted_failure_date?: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  recommended_maintenance: string
  confidence: number
  historical_anomalies: number
}

// Optimization
export interface OptimizationPlan {
  id: string
  dataset_id: string
  timestamp_start: string
  timestamp_end: string
  created_at: string
  execution_status: 'planned' | 'executing' | 'completed' | 'failed'
  optimization_objectives: string[]
  kpis: OptimizationKPIs
  intervals: EnergyInterval[]
}

export interface OptimizationKPIs {
  total_renewable_utilized_kwh: number
  total_grid_dependency_kwh: number
  total_cost_reduction_percent: number
  co2_reduction_kg: number
  renewable_utilization_percent: number
  battery_cycles_prevented: number
}

export interface EnergyInterval {
  timestamp: string
  hour_of_day: number
  expected_demand_kw: number
  solar_generation_kw: number
  wind_generation_kw: number
  renewable_contribution_percent: number
  battery_action: 'charge' | 'discharge' | 'idle'
  battery_kw: number
  grid_supply_kw: number
  estimated_cost: number
  decision_explanation: string
}

// Digital Twin
export interface DigitalTwinScenario {
  id: string
  dataset_id: string
  scenario_name: string
  scenario_type: 'baseline' | 'what-if' | 'optimization'
  parameters: ScenarioParameters
  results: ScenarioResults
  created_at: string
}

export interface ScenarioParameters {
  solar_generation_factor: number // 0.5 = 50% of actual
  wind_generation_factor: number
  demand_factor: number
  battery_capacity_kwh: number
  battery_current_soc: number
  electricity_price_factor: number
  [key: string]: number
}

export interface ScenarioResults {
  total_cost: number
  renewable_utilization_percent: number
  grid_dependency_percent: number
  battery_cycles: number
  co2_emissions_kg: number
  intervals: EnergyInterval[]
}

// Explainable AI (XAI)
export interface XAIExplanation {
  id: string
  prediction_id: string
  prediction_type: 'demand' | 'renewable' | 'price' | 'maintenance'
  model_name: string
  shap_values?: number[]
  feature_importance?: FeatureImportance[]
  local_explanation: string
  global_explanation: string
  confidence: number
}

export interface FeatureImportance {
  feature: string
  importance_score: number
  contribution_direction: 'positive' | 'negative'
  contribution_magnitude: number
}

// AI Agents
export interface AgentExecution {
  id: string
  agent_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input_data: Record<string, unknown>
  output_data: Record<string, unknown>
  confidence_score?: number
  execution_time_ms: number
  created_at: string
}

// Alerts & Notifications
export interface Alert {
  id: string
  user_id: string
  dataset_id?: string
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  data?: Record<string, unknown>
  read: boolean
  created_at: string
}

// Reports
export interface Report {
  id: string
  dataset_id: string
  report_type: string
  title: string
  generated_at: string
  file_url?: string
  summary?: string
  status: 'generating' | 'ready' | 'failed'
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Dashboard
export interface DashboardData {
  dataset: Dataset
  quality_report: DataQualityReport
  latest_forecasts: {
    demand: DemandForecast[]
    renewable: RenewableForecast[]
    price: PriceAnalysis[]
  }
  battery_health: BatteryAnalysis[]
  maintenance_alerts: MaintenancePrediction[]
  optimization_plan?: OptimizationPlan
  energy_kpis: EnergyKPIs
}

export interface EnergyKPIs {
  current_demand_kw: number
  current_renewable_generation_kw: number
  battery_soc_percent: number
  grid_dependency_percent: number
  cost_per_kwh: number
  co2_emissions_kg_per_kwh: number
}

// Form Data
export interface SignUpFormData {
  email: string
  password: string
  password_confirm: string
  name?: string
}

export interface SignInFormData {
  email: string
  password: string
  remember_me?: boolean
}

export interface DatasetUploadFormData {
  file: File
  description?: string
}
