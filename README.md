# GridSense – Autonomous Renewable Energy Intelligence Platform

✅ **FULLY OPERATIONAL** - Complete full-stack platform for intelligent renewable energy management with ML, AI agents, digital twin, and explainable AI.

## 🚀 Quick Start

**Platform is running right now!**
```
Frontend:  http://localhost:5173  ✅
Backend:   http://localhost:8000  ✅
API Docs:  http://localhost:8000/docs
```

**Next**: Open http://localhost:5173 → Upload dataset → Explore features

See **[QUICKSTART.md](./QUICKSTART.md)** for step-by-step guide.

## 🌿 Platform Overview

GridSense combines machine learning, AI agents, digital twin simulation, and explainable AI to create an autonomous renewable energy management system that:

- **Analyzes uploaded datasets** containing renewable generation, electricity demand, battery telemetry, weather data and electricity prices
- **Predicts demand and renewable generation** with ML models trained on your actual data
- **Optimizes 24-hour energy management** plans to maximize renewable utilization and minimize costs
- **Monitors battery health** and predicts maintenance needs with anomaly detection
- **Simulates scenarios** with an interactive Digital Twin
- **Explains recommendations** using SHAP Explainable AI
- **Coordinates decisions** through LangGraph Multi-Agent AI architecture
- **Visualizes insights** with Metabase dashboards (free, token-free) and interactive Plotly charts

## 🏗️ Architecture

```
GridSense/
├── frontend/                # React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API & Supabase clients
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   ├── styles/          # Global styles
│   │   └── App.tsx          # Main app component
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies
│   ├── tsconfig.json        # TypeScript config
│   ├── tailwind.config.js   # Tailwind CSS config
│   └── vite.config.ts       # Vite build config
│
├── backend/                 # FastAPI + Python
│   ├── app/
│   │   ├── routers/         # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── database/        # Database access layer
│   │   ├── ml/              # ML pipelines & models
│   │   ├── agents/          # LangGraph Multi-Agent system
│   │   ├── optimization/    # Energy optimization engine
│   │   ├── digital_twin/    # Digital Twin simulator
│   │   ├── xai/             # Explainable AI (SHAP)
│   │   ├── middleware/      # Authentication & logging
│   │   └── config.py        # Configuration
│   ├── tests/               # Unit tests
│   ├── requirements.txt     # Python dependencies
│   ├── main.py              # FastAPI application entry
│   └── .env.example         # Environment template
│
├── database/                # Supabase & SQL
│   ├── migrations/          # Database migration files
│   └── schema.sql           # Database schema
│
├── docker-compose.yml       # Local dev environment
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
└── DEVELOPMENT.md           # Development setup guide
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (frontend)
- Python 3.10+ (backend)
- Supabase account & project
- OpenWeather API key (optional)
- Docker & Docker Compose (optional)

### Setup

1. **Clone & Install**
   ```bash
   cd grid
   npm install && cd backend && pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials & API keys
   ```

3. **Run Frontend (Development)**
   ```bash
   cd frontend
   npm run dev
   # Opens http://localhost:5173
   ```

4. **Run Backend (Development)**
   ```bash
   cd backend
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   # API available at http://localhost:8000
   # Docs at http://localhost:8000/docs
   ```

5. **Initialize Database**
   ```bash
   # Run Supabase migrations through CLI or Supabase dashboard
   # Create tables from database/schema.sql
   ```

6. **Access Application**
   - Landing Page: http://localhost:5173
   - Sign Up → Upload Dataset → Explore Features

## 📦 Core Features

### 1. Dataset Intelligence
- CSV/XLSX upload with automatic schema detection
- Intelligent column mapping (weather, renewable, demand, battery, price)
- Data quality analysis (missing values, duplicates, outliers)
- Timestamp normalization & validation
- Data-quality scoring

### 2. Demand Prediction
- ML models trained on uploaded historical demand data
- Time-series forecasting (XGBoost, LSTM, Random Forest)
- Hourly/daily/weekly patterns & seasonality
- Peak demand identification
- Forecast confidence/uncertainty bands

### 3. Renewable Energy Forecasting
- Solar & wind generation prediction
- Weather integration (temperature, cloud cover, wind speed)
- Generation heatmaps & anomaly detection
- Renewable availability timelines
- Historical vs. forecasted comparison

### 4. Electricity Price Analysis
- Price trend analysis from uploaded data
- Peak/off-peak period detection
- Price forecasting with confidence intervals
- Dynamic pricing integration
- Cost-saving opportunity identification

### 5. Battery Health Monitoring
- SOC (State of Charge) & SOH (State of Health) tracking
- Voltage, current & temperature analysis
- Cycle count & degradation curves
- Battery health scoring
- Anomaly detection in battery behavior

### 6. Predictive Maintenance
- Asset health monitoring with actual telemetry
- Anomaly detection (Isolation Forest, Autoencoder)
- Degradation curve analysis
- Maintenance risk assessment
- Evidence-based recommendations

### 7. Multi-Agent AI Orchestration
- **LangGraph-based agent system**
- Weather Agent → Renewable Agent → Demand Agent
- Battery Agent → Market Agent → Maintenance Agent
- Optimization Agent synthesizes decisions
- Agent monitor UI with reasoning transparency

### 8. 24-Hour Energy Optimization
- Maximizes renewable utilization
- Minimizes electricity costs & grid dependency
- Optimizes battery charging/discharging
- Considers asset health & maintenance windows
- Outputs timestamp-indexed optimization plan

### 9. Digital Twin Simulation
- Interactive scenario modeling
- Parameter adjustment (generation, demand, prices, battery)
- Before/after cost & renewable utilization comparison
- Sankey energy-flow visualization
- Scenario persistence & comparison

### 10. Explainable AI (XAI)
- SHAP feature importance for ML models
- Waterfall plots & contribution analysis
- Natural-language explanations
- Local vs. global feature importance
- Transparent decision reasoning

### 11. Advanced Visualizations
- Plotly interactive charts (demand, renewable, prices)
- Energy flow Sankey diagrams
- Battery health gauges & degradation curves
- Heatmaps (generation, demand, prices)
- Time-series confidence bands

### 12. Grafana Integration
- Time-series data dashboarding
- Real-time metric visualization
- Alert configuration & management
- Cross-datasource correlation
- Custom dashboard templates

### 13. Reports & Export
- Professional PDF reports
- Dataset analysis summaries
- Forecast results export
- Optimization plan documents
- Downloadable charts & data

### 14. AI Copilot
- Natural language Q&A on your data
- Contextual analysis assistance
- Recommendation explanation
- Anomaly investigation
- Actionable insights generation

## 🔐 Security & Privacy

- **Supabase Authentication**: Sign Up, Sign In, Forgot Password, 2FA-ready
- **Row Level Security (RLS)**: Users access only their own datasets
- **Encryption**: SSL/TLS for all communications
- **API Security**: CORS, rate limiting, input validation
- **Environment Secrets**: Secure credential management
- **Audit Logging**: Track all data access & modifications

## 📊 Database Schema

Tables:
- `profiles` - User profiles & settings
- `datasets` - Uploaded dataset metadata
- `dataset_columns` - Column mappings & types
- `dataset_records` - Processed data records
- `data_quality_reports` - Quality analysis results
- `demand_forecasts` - Demand prediction outputs
- `renewable_forecasts` - Generation predictions
- `electricity_prices` - Price analysis data
- `battery_analysis` - Battery health metrics
- `asset_health` - Asset condition monitoring
- `maintenance_predictions` - Maintenance recommendations
- `optimization_plans` - 24-hour energy schedules
- `digital_twin_scenarios` - Simulation data
- `xai_explanations` - SHAP & XAI results
- `ai_agents` - Agent execution history
- `alerts` - Anomalies & notifications
- `reports` - Generated report metadata

## 🛠️ Development

### Frontend Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **Three.js/React Three Fiber** - 3D graphics
- **Plotly** - Interactive charts
- **Supabase JS** - Database & Auth client

### Backend Stack
- **FastAPI** - Web framework
- **SQLAlchemy** - ORM
- **Supabase Python** - Database & Auth
- **Scikit-learn** - ML algorithms
- **XGBoost/LightGBM** - Gradient boosting
- **TensorFlow/PyTorch** - Deep learning
- **LangGraph** - AI agent orchestration
- **SHAP** - Explainable AI
- **Pandas** - Data processing
- **Plotly** - Visualization data prep
- **APScheduler** - Background tasks

### Testing
- **Frontend**: Vitest, React Testing Library
- **Backend**: pytest, coverage.py
- **E2E**: Playwright (optional)

## 📈 Performance Considerations

- **Code Splitting**: Lazy-loaded React components
- **Image Optimization**: Compressed assets, WebP format
- **API Caching**: Redis for frequently accessed data
- **Database Indexing**: Optimized query performance
- **Async Processing**: Background jobs for large datasets
- **3D Optimization**: LOD (Level of Detail) for turbine
- **Chunked CSV Upload**: Memory-safe file processing

## 🌍 Deployment

### Production Checklist
- [ ] Supabase production project created
- [ ] Environment variables configured (production)
- [ ] SSL certificates configured
- [ ] Database migrations applied
- [ ] Grafana dashboards deployed
- [ ] API documentation generated
- [ ] Performance monitoring enabled
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented

### Deployment Options
- Vercel/Netlify (frontend)
- Heroku/Railway/Render (backend)
- AWS/GCP/Azure (infrastructure)
- Docker compose (local/self-hosted)

## 📚 Documentation

- `DEVELOPMENT.md` - Development setup & guidelines
- `API.md` - API endpoint documentation
- `DATABASE.md` - Database schema & queries
- `ML.md` - ML model documentation
- `DEPLOYMENT.md` - Production deployment guide
- `TROUBLESHOOTING.md` - Common issues & solutions

## 🤝 Contributing

GridSense is built as a research/production platform. Contributions welcome for:
- New ML models & algorithms
- Additional data sources
- UI/UX improvements
- Performance optimizations
- Documentation enhancements

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [FastAPI Guide](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [SHAP Documentation](https://shap.readthedocs.io/)
- [Three.js Documentation](https://threejs.org/docs/)

## 📞 Support

For issues, questions, or suggestions:
1. Check troubleshooting guide
2. Review API documentation
3. Check Supabase dashboard for data/auth issues
4. Review application logs for errors

---

**GridSense v1.0** - Autonomous Renewable Energy Intelligence Platform
Built with ❤️ for sustainable energy management
