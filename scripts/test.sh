#!/bin/bash

# ============================================
# RIME Test Script
# ============================================

set -e

echo "
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🧠 RIME Test Suite                                       ║
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

# Parse arguments
RUN_UNIT=true
RUN_INTEGRATION=false
RUN_E2E=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)
            RUN_UNIT=true
            shift
            ;;
        --integration)
            RUN_INTEGRATION=true
            RUN_UNIT=false
            shift
            ;;
        --e2e)
            RUN_E2E=true
            RUN_UNIT=false
            shift
            ;;
        --all)
            RUN_UNIT=true
            RUN_INTEGRATION=true
            RUN_E2E=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Track results
TOTAL_PASSED=0
TOTAL_FAILED=0

# Run Core Engine tests
if [ "$RUN_UNIT" = true ]; then
    echo -e "${BLUE}Running Core Engine tests...${NC}"
    cd services/core-engine
    
    if npm test 2>/dev/null; then
        echo -e "${GREEN}✓ Core Engine tests passed${NC}"
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ Core Engine tests skipped or failed${NC}"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
    
    cd "$PROJECT_ROOT"
fi

# Run Dashboard tests
if [ "$RUN_UNIT" = true ]; then
    echo ""
    echo -e "${BLUE}Running Dashboard tests...${NC}"
    cd apps/dashboard
    
    if npm test 2>/dev/null; then
        echo -e "${GREEN}✓ Dashboard tests passed${NC}"
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ Dashboard tests skipped or failed${NC}"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
    
    cd "$PROJECT_ROOT"
fi

# Run Screen Service tests
if [ "$RUN_UNIT" = true ]; then
    echo ""
    echo -e "${BLUE}Running Screen Service tests...${NC}"
    cd services/screen-service
    
    if python3 -m pytest 2>/dev/null; then
        echo -e "${GREEN}✓ Screen Service tests passed${NC}"
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ Screen Service tests skipped or failed${NC}"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
    
    cd "$PROJECT_ROOT"
fi

# Run VS Code Extension tests
if [ "$RUN_UNIT" = true ]; then
    echo ""
    echo -e "${BLUE}Running VS Code Extension tests...${NC}"
    cd apps/vscode-extension
    
    if npm test 2>/dev/null; then
        echo -e "${GREEN}✓ VS Code Extension tests passed${NC}"
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ VS Code Extension tests skipped or failed${NC}"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
    
    cd "$PROJECT_ROOT"
fi

# Run Integration tests
if [ "$RUN_INTEGRATION" = true ]; then
    echo ""
    echo -e "${BLUE}Running Integration tests...${NC}"
    
    # Start test environment
    echo -e "${BLUE}Starting test environment...${NC}"
    cd infrastructure
    docker-compose -f docker-compose.yml up -d postgres redis
    cd "$PROJECT_ROOT"
    
    sleep 5
    
    cd services/core-engine
    if npm run test:integration 2>/dev/null; then
        echo -e "${GREEN}✓ Integration tests passed${NC}"
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ Integration tests skipped or failed${NC}"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
    cd "$PROJECT_ROOT"
    
    # Cleanup
    cd infrastructure
    docker-compose down
    cd "$PROJECT_ROOT"
fi

# Run E2E tests
if [ "$RUN_E2E" = true ]; then
    echo ""
    echo -e "${BLUE}Running E2E tests...${NC}"
    echo -e "${YELLOW}E2E tests require the full application to be running${NC}"
    
    # Check if services are running
    if curl -s http://localhost:3001/health > /dev/null; then
        echo -e "${GREEN}✓ Services are running${NC}"
        
        # Run E2E tests
        cd apps/dashboard
        if npm run test:e2e 2>/dev/null; then
            echo -e "${GREEN}✓ E2E tests passed${NC}"
            TOTAL_PASSED=$((TOTAL_PASSED + 1))
        else
            echo -e "${YELLOW}⚠ E2E tests skipped or failed${NC}"
            TOTAL_FAILED=$((TOTAL_FAILED + 1))
        fi
        cd "$PROJECT_ROOT"
    else
        echo -e "${RED}✗ Services not running. Start with ./scripts/dev-start.sh${NC}"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Test Summary                            ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Passed: $TOTAL_PASSED                                        ║"
echo "║  Failed: $TOTAL_FAILED                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"

if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
