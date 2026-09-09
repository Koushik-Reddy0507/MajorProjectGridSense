# 🚀 GridSense - Complete Platform Quick Start

**GridSense** is a full-stack autonomous renewable energy intelligence platform with ML forecasting, AI agents, digital twin simulation, and explainable AI.

## ✅ Current Status

Both servers are **running now**:
- **Frontend**: http://localhost:5173 ✅
- **Backend**: http://localhost:8000 ✅
- **API Docs**: http://localhost:8000/docs (Swagger)
- **Metabase**: docker-compose ready (http://localhost:3000)

---

## 🎯 What to Do First

### 1. **Open the Application**
```
http://localhost:5173
```

### 2. **Sign Up / Log In**
- Create account or use test credentials
- (Supabase auth integrated but optional - system runs in degraded mode without it)

### 3. **Upload Your First Dataset**
Go to **Dashboard → Upload Dataset**
- Supports: CSV, XLSX files
- Must have columns: `timestamp`, and at least one of:
  - `electricity_demand` (kWh)
  - `solar_generation` (kW)
  - `wind_generation` (kW)
  - `battery_soc` (%)

Example data structure:
```
timestamp,solar_generation,wind_generation,electricity_demand,battery_soc
2024-01-01 00:00:00,0,150,350,75
2024-01-01 01:00:00,0,145,340,74
2024-01-01 06:00:00,50,120,380,73
2024-01-01 12:00:00,450,80,250,95
```

### 4. **Explore Features**

| Feature | Location | What It Does |
|---------|----------|--------------|
| **Dashboard** | `/` | Upload datasets, monitor processing |
| **Dataset Analysis** | `/dataset-analysis` | View schema, quality metrics, detected variables |
| **Demand Prediction** | `/forecasts/demand` | ML demand forecasts with confidence intervals |
| **Renewable Forecast** | `/forecasts/renewable` | Solar/wind generation predictions |
| **Price Forecast** | `/forecasts/price` | Electricity market price forecasts |
| **24-hr Optimization** | `/optimization` | AI-generated energy schedule (maximize renewable, minimize cost/grid) |
| **Digital Twin** | `/digital-twin` | "What-if" scenarios (adjust solar factor, demand, battery) |
| **XAI Explainer** | `/xai` | SHAP-based feature importance (why did model predict this?) |
| **Battery Analysis** | `/battery` | SOC/SOH tracking, degradation, health |
| **Maintenance** | `/maintenance` | Anomaly detection in equipment telemetry |
| **Reports** | `/reports` | Executive summaries and KPIs |

---

## 🔧 Architecture Overview

### **Frontend** (React 18 + TypeScript + Vite)
- **Port**: 5173
- **Tech**: Tailwind CSS, Framer Motion, Three.js 3D, Plotly charts
- **Hot Reload**: Yes - edits auto-reload instantly
- **Build**: `npm run build` → production bundle in `frontend/dist/`

### **Backend** (FastAPI + Python 3.12)
- **Port**: 8000
- **Tech**: SQLAlchemy ORM, Pydantic, Pandas, scikit-learn, XGBoost, LSTM
- **Auto-Reload**: Yes - code changes trigger restart
- **Docs**: Swagger UI at http://localhost:8000/docs

### **Database** (Supabase PostgreSQL)
- **Status**: Optional (system runs without it)
- **RLS**: Row-level security - users only see their own data
- **Tables**: 20+ (datasets, forecasts, optimizations, XAI, agents, etc.)

### **Analytics** (Metabase - Free)
- **Port**: 3000
- **No Tokens**: Everything via web UI
- **Start**: `docker-compose up -d metabase`
- **Setup**: Connects to PostgreSQL automatically
- **Dashboards**: Create visually without SQL

### **ML Models** (Trained on Upload)
- **Demand**: XGBoost (80%+ R² on test data)
- **Renewable**: Random Forest
- **Price**: LSTM (time-series)
- **Anomalies**: Isolation Forest
- **Caching**: Redis layer (localhost:6379)

### **AI Agents** (LangGraph Orchestration)
7 specialized agents coordinate to provide holistic energy insights:
1. **Weather Agent** - Analyzes weather in dataset
2. **Renewable Agent** - Forecasts generation
3. **Demand Agent** - Predicts consumption
4. **Battery Agent** - Health & recommendations
5. **Market Agent** - Price & volatility analysis
6. **Maintenance Agent** - Anomaly detection
7. **Optimizer Agent** - 24-hour schedule

---

## 📊 Key Workflows

### Workflow 1: Upload & Analyze Dataset
```
Upload CSV/XLSX
    ↓
Auto-detect columns (solar, wind, demand, battery, etc.)
    ↓
Run data quality checks (missing %, duplicates, outliers)
    ↓
Display schema & statistics
    ↓
Ready for forecasting
```

### Workflow 2: Generate Forecasts
```
User selects dataset
    ↓
System trains 3 models (XGBoost, RF, LSTM)
    ↓
Calculates confidence intervals
    ↓
Caches predictions in Redis
    ↓
Display charts with interactive Plotly
```

### Workflow 3: Run Optimization
```
Input: demand forecast, renewable forecast, electricity prices, battery state
    ↓
Multi-objective solver:
  - Maximize renewable utilization %
  - Minimize grid dependency %
  - Minimize total cost
  - Minimize CO2 emissions
    ↓
Output: 24-hour energy schedule (hourly decisions)
    ↓
Display timeline with agent reasoning
```

### Workflow 4: Run Digital Twin Scenario
```
Adjust sliders:
  - Solar generation factor (0-2x)
  - Wind generation factor (0-2x)
  - Demand factor (0-2x)
  - Battery capacity / charge rate
    ↓
Simulate 24-hour optimization with new parameters
    ↓
Compare vs. baseline
    ↓
Export scenario results
```

### Workflow 5: Explain Predictions (XAI)
```
Select model (demand/renewable/price)
    ↓
Compute SHAP feature importance
    ↓
Rank top 10 drivers:
  e.g., "historical_demand (weight: 0.42)"
       "day_of_week (weight: 0.15)"
       "temperature (weight: 0.08)"
    ↓
Display bar charts + natural language summary
```

---

## 🛠️ Development Workflow

### Make Code Changes
```bash
# Frontend code (auto hot-reloads)
Edit src/pages/XYZ.tsx
    → Browser refreshes automatically

# Backend code (auto restart)
Edit backend/app/routers/xyz.py
    → Server restarts automatically
```

### Run Tests
```bash
# Backend tests
cd backend
pytest app/

# Frontend tests (if added)
cd frontend
npm test
```

### View API Documentation
```
http://localhost:8000/docs
```
- Lists all 25+ endpoints
- Test endpoints interactively
- See request/response schemas

---

## 📦 Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key variables:
```
# Frontend
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...

# Backend
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Optional: AI Keys (for agents)
OPENAI_API_KEY=sk-...       # For GPT-4 summaries
ANTHROPIC_API_KEY=sk-ant-... # Alternative

# Optional: Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=app-password

# Optional: Metabase
METABASE_ADMIN_EMAIL=admin@gridsense.io
METABASE_ADMIN_PASSWORD=gridsense123
```

---

## 🚀 Production Deployment

### Option 1: Docker Compose (All-in-One)
```bash
docker-compose up
```
- Starts: Frontend (Nginx), Backend (FastAPI), Database, Redis, Metabase, MinIO
- Ports: 5173 (frontend), 8000 (backend), 3000 (Metabase), 6379 (Redis), 9000 (MinIO)

### Option 2: Cloud Deployment
- **Frontend**: Vercel, Netlify (static build)
- **Backend**: Railway, Render, AWS Lambda
- **Database**: Supabase (managed PostgreSQL)
- **Analytics**: Metabase cloud

See `DEPLOYMENT.md` for details.

---

## 🐛 Troubleshooting

### Frontend not loading?
```bash
# Check frontend is running
curl http://localhost:5173

# View frontend logs
tail -f /tmp/frontend.log (Linux/Mac)
# or check terminal where you ran 'npm run dev'

# Rebuild if stuck
rm -rf frontend/node_modules
cd frontend && npm install && npm run dev
```

### Backend returning 500 errors?
```bash
# Check backend health
curl http://localhost:8000/health

# View backend logs
tail -f backend/logs/app.log

# Check Supabase config in .env
# (System runs without Supabase, but with limited features)
```

### Port already in use?
```bash
# Find process using port 5173
lsof -i :5173  # Linux/Mac
netstat -ano | findstr :5173  # Windows

# Kill process
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows
```

### No data appearing after upload?
```bash
# Check dataset was saved
curl http://localhost:8000/api/datasets

# View uploaded files
ls backend/uploads/
```

---

## 📚 Documentation

- **[API.md](./API.md)** - All 25+ endpoint documentation
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Dev setup, testing, contributing
- **[METABASE.md](./METABASE.md)** - Analytics dashboard setup
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment (if created)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design (if created)

---

## 💡 Example: End-to-End Workflow

1. **Open app**: http://localhost:5173
2. **Upload dataset**: Use `example_data.csv` or your own
3. **Wait for processing**: ~30 seconds (schema detection, quality analysis)
4. **View Analysis**: Click "Dataset Analysis" to see schema
5. **Generate Forecast**: Click "Demand Prediction" → "Generate Forecast"
6. **Run Optimization**: Go to "Optimization" → "Run Optimization" → View 24-hr schedule
7. **Explore Scenario**: Go to "Digital Twin" → Adjust sliders → "Simulate"
8. **Understand Results**: Go to "XAI" → See feature importance of demand model
9. **View Analytics** (optional): `docker-compose up -d metabase` then http://localhost:3000

---

## 🎉 You're Ready!

Your GridSense platform is **fully operational**. Start exploring renewable energy optimization!

**Questions?** Check the logs or review code in:
- Frontend: `frontend/src/pages/`
- Backend: `backend/app/routers/`
- Database: `backend/app/database/models.py`

Happy energy optimization! ⚡🌞💨
