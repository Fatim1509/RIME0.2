#!/bin/bash

# ============================================
# RIME Setup Script
# ============================================

set -e

echo "
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🧠 RIME Setup                                            ║
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

# Check dependencies
echo -e "${BLUE}Checking dependencies...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version 18+ required. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3.11+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version)${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Docker is recommended for running infrastructure.${NC}"
else
    echo -e "${GREEN}✓ Docker $(docker --version)${NC}"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Docker Compose not found.${NC}"
else
    echo -e "${GREEN}✓ Docker Compose $(docker-compose --version)${NC}"
fi

echo ""
echo -e "${BLUE}Setting up RIME...${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Create .env if it doesn't exist
if [ ! -f "infrastructure/.env" ]; then
    echo -e "${BLUE}Creating environment file...${NC}"
    cp infrastructure/.env.example infrastructure/.env
    echo -e "${YELLOW}⚠ Please edit infrastructure/.env with your API keys${NC}"
fi

# Install core engine dependencies
echo -e "${BLUE}Installing Core Engine dependencies...${NC}"
cd services/core-engine
npm install
cd "$PROJECT_ROOT"

# Install dashboard dependencies
echo -e "${BLUE}Installing Dashboard dependencies...${NC}"
cd apps/dashboard
npm install
cd "$PROJECT_ROOT"

# Install VS Code extension dependencies
echo -e "${BLUE}Installing VS Code Extension dependencies...${NC}"
cd apps/vscode-extension
npm install
cd "$PROJECT_ROOT"

# Install screen service dependencies
echo -e "${BLUE}Installing Screen Service dependencies...${NC}"
cd services/screen-service
pip install -r requirements.txt
cd "$PROJECT_ROOT"

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure your environment:"
echo "   ${YELLOW}nano infrastructure/.env${NC}"
echo ""
echo "2. Start infrastructure (PostgreSQL, Redis):"
echo "   ${YELLOW}cd infrastructure && docker-compose up -d${NC}"
echo ""
echo "3. Start the Core Engine:"
echo "   ${YELLOW}cd services/core-engine && npm run dev${NC}"
echo ""
echo "4. Start the Dashboard (new terminal):"
echo "   ${YELLOW}cd apps/dashboard && npm run dev${NC}"
echo ""
echo "5. Open http://localhost:3000 in your browser"
echo ""
echo "For more information, see README.md"
