#!/usr/bin/env bash
# SentinelAI - Complete Project Runner for College Presentation
set -e

echo "=========================================================="
echo "🛡️  SentinelAI - Autonomous Cyber Resilience Platform"
echo "=========================================================="
echo ""

# Ensure backend venv python is available
if [ ! -d "backend/venv" ]; then
    echo "Creating backend virtual environment..."
    python3 -m venv backend/venv
    backend/venv/bin/pip install -r backend/requirements.txt
fi

echo "🚀 Starting FastAPI Multi-Agent Backend on http://localhost:8000..."
cd backend
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Trap exit to cleanup background processes
trap "echo 'Shutting down SentinelAI...'; kill $BACKEND_PID 2>/dev/null; exit 0" INT TERM EXIT

echo "⏳ Waiting for Backend to be healthy..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8000/health > /dev/null; then
        echo "✅ Backend Engine is HEALTHY and Ready!"
        break
    fi
    sleep 0.5
done

echo ""
echo "🌐 Starting Next.js 15 Modern SOC UI on http://localhost:3000..."
echo "=========================================================="
echo "  • Landing Page:        http://localhost:3000"
echo "  • Live SOC Dashboard:  http://localhost:3000/dashboard"
echo "  • Incident Center:     http://localhost:3000/incidents"
echo "  • Attack Topology:     http://localhost:3000/attack-graph"
echo "  • MITRE ATT&CK Matrix: http://localhost:3000/mitre"
echo "  • Threat Intelligence: http://localhost:3000/threat-intel"
echo "  • User Behavior UEBA:  http://localhost:3000/uba"
echo "  • Asset Inventory:     http://localhost:3000/assets"
echo "  • Response SOAR:       http://localhost:3000/soar"
echo "  • Explainable Copilot: http://localhost:3000/copilot"
echo "  • Analytics:           http://localhost:3000/analytics"
echo "  • Backend Swagger:     http://localhost:8000/docs"
echo "=========================================================="
echo ""

npm run dev
