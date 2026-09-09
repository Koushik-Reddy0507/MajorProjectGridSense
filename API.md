# GridSense API Documentation

## Base URL

- **Development**: `http://localhost:8000/api`
- **Production**: `https://your-domain.com/api`

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Authentication

GridSense uses **Supabase Auth** with JWT tokens. All endpoints (except health check and auth endpoints) require authentication.

### Authentication Methods

1. **Supabase JWT** (recommended)
```
Authorization: Bearer <supabase_jwt_token>
```

2. **Application Access Token**
```
Authorization: Bearer <access_token>
```

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "detail": "Additional details"
}
```

Common status codes:
- `200`: Success
- `400`: Bad request (validation error)
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found
- `422`: Validation error
- `500`: Internal server error

## Endpoints

### 1. Health & System (No Auth Required)

#### GET `/api/health`
Check system health status.
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": "connected",
      "redis": "configured"
    }
  }
}
```

### 2. Datasets

#### POST `/api/datasets/upload`
Upload a CSV or XLSX dataset.

**Request**: Multipart form data
- `file`: The CSV/XLSX file
- `description` (optional): Dataset description

**Response**: Dataset metadata with processing status
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "energy-data.csv",
    "processing_status": "uploading",
    "quality_score": 87.5
  }
}
```

#### GET `/api/datasets`
List all user's datasets.

#### GET `/api/datasets/{id}`
Get dataset details including detected columns and quality.

#### GET `/api/datasets/{id}/schema`
Get detected column mappings.

```json
{
  "success": true,
  "data": {
    "dataset_id": "uuid",
    "columns": [...],
    "detected_variables": {
      "solar_generation": ["solar_power"],
      "electricity_demand": ["demand_kw"],
      "battery_soc": ["soc"],
      "timestamp": ["timestamp"]
    }
  }
}
```

#### GET `/api/datasets/{id}/quality`
Get data quality report with quality score.

#### POST `/api/datasets/{id}/analyze`
Trigger full analysis pipeline (forecasts + battery + maintenance + agents).

### 3. Demand Prediction

#### POST `/api/demand/forecast/{dataset_id}`
Generate demand forecast using ML models.

#### GET `/api/demand/forecast/{dataset_id}`
Get stored demand forecasts.

### 4. Renewable Energy Forecast

#### POST `/api/renewables/forecast/{dataset_id}`
Generate solar/wind generation forecast.

#### GET `/api/renewables/forecast/{dataset_id}`
Get stored renewable forecasts.

### 5. Electricity Prices

#### POST `/api/prices/analyze/{dataset_id}`
Analyze electricity prices and generate forecast.

#### GET `/api/prices/forecast/{dataset_id}`
Get price analysis and forecasts.

### 6. Battery Health

#### POST `/api/battery/analyze/{dataset_id}`
Analyze battery health from telemetry.

#### GET `/api/battery/{dataset_id}`
Get battery health analysis.

### 7. Predictive Maintenance

#### POST `/api/maintenance/analyze/{dataset_id}`
Analyze assets for anomalies and health risks.

#### GET `/api/maintenance/{dataset_id}`
Get maintenance analysis results.

### 8. Weather Analysis

#### POST `/api/weather/analyze/{dataset_id}`
Analyze weather data in dataset.

#### GET `/api/weather/{dataset_id}`
Get weather analysis results.

### 9. Optimization

#### POST `/api/optimization/run/{dataset_id}`
Run 24-hour energy optimization.

#### GET `/api/optimization/plan/{dataset_id}`
Get latest optimization plan.

#### GET `/api/optimization/results/{dataset_id}`
Get optimization results.

### 10. Digital Twin

#### POST `/api/digital-twin/simulate`
Run scenario simulation.

**Request Body**:
```json
{
  "dataset_id": "uuid",
  "scenario_name": "Increase Solar 20%",
  "parameters": {
    "solar_generation_factor": 1.2,
    "wind_generation_factor": 1.0,
    "demand_factor": 1.0,
    "battery_capacity_kwh": 100,
    "battery_current_soc": 60,
    "electricity_price_factor": 1.0
  }
}
```

#### GET `/api/digital-twin/scenarios/{dataset_id}`
List saved scenarios.

### 11. Explainable AI

#### GET `/api/xai/explain/{dataset_id}`
Get SHAP explanations for trained models.

### 12. Multi-Agent AI

#### POST `/api/agents/run`
Run LangGraph agent pipeline.

**Request Body**:
```json
{
  "dataset_id": "uuid"
}
```

#### GET `/api/agents/history/{dataset_id}`
Get agent execution history.

### 13. Reports

#### POST `/api/reports/generate`
Generate a report.

**Request Body**:
```json
{
  "dataset_id": "uuid",
  "report_type": "demand|optimization|quality"
}
```

#### GET `/api/reports/{dataset_id}`
List reports for dataset.

### 14. Dashboard

#### GET `/api/dashboard/{dataset_id}`
Get complete dashboard data (KPIs, forecasts, analysis, optimization plan).

### 15. Alerts

#### GET `/api/alerts`
List system alerts.

### 16. AI Copilot

#### POST `/api/copilot/ask`
Ask questions about your data.

**Request Body**:
```json
{
  "dataset_id": "uuid",
  "question": "What's my battery health?"
}
```

**Response**: Data-grounded answer using actual analysis results (never fabricated).

## System States

The API returns these processing states:
- `UPLOADING`: File is being uploaded
- `VALIDATING`: Schema/data validation in progress
- `PROCESSING`: Data is being processed and stored
- `ANALYZING`: ML models are being trained
- `TRAINING`: Model training in progress
- `FORECASTING`: Generating forecasts
- `OPTIMIZING`: Running optimization
- `COMPLETED`: Processing finished successfully
- `FAILED`: Processing failed
- `DATA_NOT_AVAILABLE`: Required data not found in dataset
- `SOURCE_NOT_CONNECTED`: External data source not connected

## Best Practices

1. **Rate Limiting**: Keep requests under 100 requests/min per user
2. **Caching**: Use `If-None-Match` headers for GET requests
3. **Pagination**: Use `page` and `page_size` query params
4. **Background Processing**: Use the async endpoints for large datasets
5. **File Uploads**: Max file size is 500MB (configurable)

## Authentication Setup

To use authentication, configure Supabase:

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Integration with Frontend

The frontend uses `@/services/api.ts` which automatically:
- Adds JWT tokens to requests
- Handles 401 errors
- Provides typed API clients for every endpoint