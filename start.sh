#!/bin/bash
# MindPalace — Start both backend and frontend
set -e

echo "=== MindPalace Personal Growth OS ==="
echo ""

# Backend
echo "[1/2] Starting backend on http://localhost:8000 ..."
cd "$(dirname "$0")/backend"
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Frontend
echo "[2/2] Starting frontend on http://localhost:5173 ..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
