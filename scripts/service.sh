#!/bin/bash
# Wealth Wars Backend Service Control Script
#
# Usage:
#   ./scripts/service.sh start   - Start the backend service
#   ./scripts/service.sh stop    - Stop the backend service
#   ./scripts/service.sh restart - Restart the backend service
#   ./scripts/service.sh status  - Check service status
#   ./scripts/service.sh logs    - Show service logs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/packages/backend"
PID_FILE="$BACKEND_DIR/.service.pid"
LOG_FILE="$BACKEND_DIR/.service.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if service is running
is_running() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

# Start the service
start_service() {
  if is_running; then
    echo -e "${YELLOW}Service is already running${NC}"
    return 0
  fi

  echo -e "${GREEN}Starting Wealth Wars backend service...${NC}"
  
  cd "$BACKEND_DIR"
  
  # Check environment
  if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found in $BACKEND_DIR${NC}"
    exit 1
  fi

  # Source environment
  source .env

  # Check required variables
  if [ -z "$AUTHORITY_SECRET_KEY" ]; then
    echo -e "${RED}Error: AUTHORITY_SECRET_KEY not set in .env${NC}"
    exit 1
  fi

  if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env${NC}"
    exit 1
  fi

  # Start the service in background
  nohup node --loader ts-node/esm src/start-services.ts > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"

  # Wait a bit and check if it's still running
  sleep 2
  if is_running; then
    echo -e "${GREEN}✓ Service started successfully (PID: $(cat $PID_FILE))${NC}"
    echo "Log file: $LOG_FILE"
  else
    echo -e "${RED}✗ Service failed to start${NC}"
    echo "Check logs: tail -f $LOG_FILE"
    exit 1
  fi
}

# Stop the service
stop_service() {
  if ! is_running; then
    echo -e "${YELLOW}Service is not running${NC}"
    return 0
  fi

  echo -e "${GREEN}Stopping Wealth Wars backend service...${NC}"
  
  PID=$(cat "$PID_FILE")
  kill "$PID" 2>/dev/null || true
  
  # Wait for graceful shutdown (max 10 seconds)
  for i in {1..10}; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  # Force kill if still running
  if ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}Force killing service...${NC}"
    kill -9 "$PID" 2>/dev/null || true
  fi

  rm -f "$PID_FILE"
  echo -e "${GREEN}✓ Service stopped${NC}"
}

# Restart the service
restart_service() {
  echo -e "${GREEN}Restarting Wealth Wars backend service...${NC}"
  stop_service
  sleep 2
  start_service
}

# Show service status
show_status() {
  if is_running; then
    PID=$(cat "$PID_FILE")
    echo -e "${GREEN}Service is running${NC}"
    echo "PID: $PID"
    echo "Uptime: $(ps -p $PID -o etime= | xargs)"
    echo "Memory: $(ps -p $PID -o rss= | xargs) KB"
  else
    echo -e "${RED}Service is not running${NC}"
  fi
}

# Show logs
show_logs() {
  if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
  else
    echo -e "${YELLOW}No log file found${NC}"
  fi
}

# Main command handler
case "${1:-}" in
  start)
    start_service
    ;;
  stop)
    stop_service
    ;;
  restart)
    restart_service
    ;;
  status)
    show_status
    ;;
  logs)
    show_logs
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
