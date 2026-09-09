#!/bin/bash
# GridSense Full Stack Startup Script
# Starts Frontend, Backend, and supporting services

set -e

echo "🚀 GridSense Full Stack Startup"
echo "================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Backend
echo -e "${BLUE}[1/3]${NC} Starting Backend (FastAPI)..."
cd backend
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"
sleep 3

# 2. Frontend
echo -e "${BLUE}[2/3]${NC} Starting Frontend (React + Vite)..."
cd ../frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓${NC} Frontend started (PID: $FRONTEND_PID)"
sleep 5

# 3. Metabase (Optional)
echo -e "${BLUE}[3/3]${NC} Metabase service ready via docker-compose..."
echo "  To start: docker-compose up -d metabase"
echo ""

# Summary
echo -e "${GREEN}✅ GridSense is running!${NC}"
echo ""
echo "📱 Frontend:  http://localhost:5173"
echo "🔌 Backend:   http://localhost:8000"
echo "📊 API Docs:  http://localhost:8000/docs"
echo "📈 Metabase:  http://localhost:3000 (via docker-compose)"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /tmp/backend.log"
echo "  Frontend: tail -f /tmp/frontend.log"
echo ""
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"

# Keep script running
wait