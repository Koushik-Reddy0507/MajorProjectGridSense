# GridSense Development Setup Guide

## Prerequisites

- **Node.js** 18+ (frontend)
- **Python** 3.10+ (backend)
- **Supabase** account & project
- **Docker** & Docker Compose (optional, for full stack)
- **OpenWeather API Key** (optional, for weather integration)

## Quick Start

### 1. Clone & Install

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key from Supabase
- `VITE_SUPABASE_URL` - Same as above
- `VITE_SUPABASE_ANON_KEY` - Anon key from Supabase

Optional:
- `OPENWEATHER_API_KEY` - For weather integration
- `OPENAI_API_KEY` - For AI Copilot
- `GRAFANA_API_KEY` - For Grafana integration

### 3. Initialize Database

Apply the schema to your Supabase project:

1. Go to Supabase Dashboard → SQL Editor
2. Run the contents of `database/schema.sql`

Or use local PostgreSQL:
```bash
docker-compose up -d postgres
# Wait for initialization
docker-compose exec postgres psql -U gridsense -d gridsense -f /docker-entrypoint-initdb.d/01-schema.sql
```

### 4. Run Development Servers

#### Frontend (Terminal 1)
```bash
cd frontend
npm run dev
# Opens http://localhost:5173
```

#### Backend (Terminal 2)
```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 5. Access Application

1. Open http://localhost:5173
2. Sign Up → Create account
3. Dashboard → Upload Dataset
4. Explore features!

## Development Workflow

### Running Tests

#### Backend Tests
```bash
cd backend
source venv/bin/activate
pytest tests/ -v
pytest tests/test_optimization.py::TestOptimizationEngine::test_battery_charges_when_low_price -v
```

#### Frontend Tests
```bash
cd frontend
npm run test
npm run lint
npm run type-check
```

### Code Quality

```bash
# Backend formatting
cd backend
black app/
isort app/
flake8 app/
mypy app/

# Frontend formatting
cd frontend
npm run lint
npm run type-check
```

### Adding New Features

1. **Backend API**:
   - Add router in `app/routers/`
   - Add schemas in `app/schemas.py`
   - Add services in `app/services/`
   - Add ML in `app/ml/`

2. **Frontend Page**:
   - Create page in `src/pages/`
   - Add to `src/App.tsx` routes
   - Use `src/services/api.ts` for API calls

3. **ML Models**:
   - Add to `app/ml/`
   - Follow pattern in `trainer.py`
   - Register in model registry

4. **AI Agents**:
   - Extend `BaseAgent` in `app/agents/orchestrator.py`
   - Add to orchestrator pipeline

## Project Structure

```
grid/
├── frontend/              # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API clients
│   │   ├── hooks/         # Custom React hooks
│   │   ├── store/         # Zustand state
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utilities
│   │   └── styles/        # Global styles
│   ├── public/            # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── Dockerfile
│
├── backend/               # FastAPI + Python
│   ├── app/
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── database/      # DB access
│   │   ├── ml/            # ML pipelines
│   │   ├── agents/        # LangGraph agents
│   │   ├── optimization/  # Optimization engine
│   │   ├── digital_twin/  # Simulator
│   │   ├── xai/           # Explainable AI
│   │   └── middleware/    # Auth, logging
│   ├── tests/             # Unit tests
│   ├── requirements.txt
│   ├── main.py
│   ├── run.py
│   └── Dockerfile
│
├── database/
│   ├── migrations/
│   └── schema.sql
│
├── grafana/
│   └── provisioning/
│       ├── datasources/
│       └── dashboards/
│
├── docker-compose.yml
├── .env.example
├── API.md
└── README.md
```

## Key Conventions

### Backend
- **Services**: Stateless classes, dependency injection via constructors
- **ML**: No hardcoded values - all derived from dataset
- **Optimization**: Constraints from actual data
- **Error Handling**: Structured exceptions with request IDs
- **Async**: Background tasks for long operations

### Frontend
- **State**: Zustand for global, React Query for server state
- **Components**: Functional, typed with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **3D**: React Three Fiber for turbine visualization

## Debugging

### Backend Logs
```bash
tail -f backend/logs/app.log
```

### Frontend DevTools
- React DevTools browser extension
- TanStack Query DevTools (in dev mode)

### Database
- Supabase Dashboard → Table Editor
- Local: `docker-compose exec postgres psql -U gridsense -d gridsense`

## Deployment

### Production Checklist

- [ ] Supabase production project created
- [ ] Environment variables configured
- [ ] SSL certificates configured
- [ ] Database migrations applied
- [ ] Grafana dashboards deployed
- [ ] API documentation generated
- [ ] Performance monitoring enabled
- [ ] Backup strategy implemented

### Deploy Commands

```bash
# Frontend
cd frontend && npm run build
# Deploy dist/ to Vercel/Netlify

# Backend
docker build -t gridsense-backend ./backend
# Deploy to Heroku/Railway/Render/AWS

# Or use docker-compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing Supabase config" | Check `.env` has `SUPABASE_URL` and `SERVICE_ROLE_KEY` |
| "Module not found" | Run `npm install` in frontend, `pip install -r requirements.txt` in backend |
| "TypeScript errors" | Run `npm run type-check`, fix unused imports |
| "CORS errors" | Add frontend URL to `CORS_ORIGINS` in `.env` |
| "ML training fails" | Check dataset has required columns, sufficient data |

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run full test suite
5. Submit PR

## License

MIT License - See LICENSE file