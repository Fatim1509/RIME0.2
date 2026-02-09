#!/bin/bash

# ============================================
# RIME Development Start Script
# ============================================

set -e

echo "
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🧠 RIME Development Environment                          ║
║   Recursive Intelligence Multi-Agent Environment           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    pkill -f "next dev" || true
    pkill -f "tsx watch" || true
    pkill -f "uvicorn" || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if infrastructure is running
echo -e "${BLUE}Checking infrastructure...${NC}"
if ! docker-compose -f infrastructure/docker-compose.yml ps | grep -q "Up"; then
    echo -e "${YELLOW}Infrastructure not running. Starting...${NC}"
    cd infrastructure
    docker-compose up -d postgres redis
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✓ Infrastructure started${NC}"
    sleep 3
else
    echo -e "${GREEN}✓ Infrastructure already running${NC}"
fi

echo ""
echo -e "${BLUE}Starting RIME services...${NC}"
echo ""

# Start Core Engine
echo -e "${BLUE}Starting Core Engine...${NC}"
cd services/core-engine
npm run dev &
CORE_PID=$!
cd "$PROJECT_ROOT"

# Wait for Core Engine
sleep 3

# Start Screen Service
echo -e "${BLUE}Starting Screen Service...${NC}"
cd services/screen-service
uvicorn capture:app --reload --port 8000 &
SCREEN_PID=$!
cd "$PROJECT_ROOT"

# Wait for Screen Service
sleep 2

# Start Dashboard
echo -e "${BLUE}Starting Dashboard...${NC}"
cd apps/dashboard
npm run dev &
DASHBOARD_PID=$!
cd "$PROJECT_ROOT"

echo ""
echo -e "${GREEN}✓ All services started!${NC}"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Service          │  URL                                   ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Dashboard        │  http://localhost:3000                 ║"
echo "║  Core Engine      │  http://localhost:3001                 ║"
echo "║  Screen Service   │  http://localhost:8000                 ║"
echo "║  Health Check     │  http://localhost:3001/health          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all background processes
wait $CORE_PID $SCREEN_PID $DASHBOARD_PID
