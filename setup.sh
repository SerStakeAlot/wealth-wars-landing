#!/bin/bash
# Quick Setup Script for Wealth Wars Backend
# 
# This script helps you quickly set up and start the backend services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$PROJECT_ROOT/packages/backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Wealth Wars Backend Setup${NC}"
echo -e "${BLUE}================================${NC}\n"

# Check if running in the correct directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: Must be run from project root${NC}"
  exit 1
fi

# Step 1: Install dependencies
echo -e "${YELLOW}[1/6] Installing dependencies...${NC}"
if npm install; then
  echo -e "${GREEN}✓ Dependencies installed${NC}\n"
else
  echo -e "${RED}✗ Failed to install dependencies${NC}"
  exit 1
fi

# Step 2: Setup environment file
echo -e "${YELLOW}[2/6] Setting up environment...${NC}"
if [ ! -f "$BACKEND_DIR/.env" ]; then
  if [ -f "$BACKEND_DIR/.env.example" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo -e "${GREEN}✓ Created .env from template${NC}"
    echo -e "${YELLOW}⚠ Please edit packages/backend/.env with your configuration${NC}\n"
    
    # Prompt for quick config
    read -p "Do you want to configure now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      ${EDITOR:-nano} "$BACKEND_DIR/.env"
    fi
  else
    echo -e "${YELLOW}⚠ .env.example not found, skipping${NC}\n"
  fi
else
  echo -e "${GREEN}✓ .env already exists${NC}\n"
fi

# Step 3: Build Anchor program
echo -e "${YELLOW}[3/6] Building Anchor program...${NC}"
if command -v anchor &> /dev/null; then
  if anchor build; then
    echo -e "${GREEN}✓ Anchor program built${NC}\n"
  else
    echo -e "${YELLOW}⚠ Anchor build failed (may need to deploy first)${NC}\n"
  fi
else
  echo -e "${YELLOW}⚠ Anchor not found, skipping${NC}\n"
fi

# Step 4: Generate Prisma client
echo -e "${YELLOW}[4/6] Generating Prisma client...${NC}"
cd "$BACKEND_DIR"
if npx prisma generate; then
  echo -e "${GREEN}✓ Prisma client generated${NC}\n"
else
  echo -e "${RED}✗ Failed to generate Prisma client${NC}"
  exit 1
fi
cd "$PROJECT_ROOT"

# Step 5: Check database
echo -e "${YELLOW}[5/6] Checking database connection...${NC}"
source "$BACKEND_DIR/.env" 2>/dev/null || true

if [ -n "$DATABASE_URL" ]; then
  cd "$BACKEND_DIR"
  if npx prisma db push --skip-generate 2>/dev/null; then
    echo -e "${GREEN}✓ Database schema synced${NC}\n"
  else
    echo -e "${YELLOW}⚠ Database not available (will try migrations on start)${NC}\n"
  fi
  cd "$PROJECT_ROOT"
else
  echo -e "${YELLOW}⚠ DATABASE_URL not set, skipping${NC}\n"
fi

# Step 6: Make scripts executable
echo -e "${YELLOW}[6/6] Setting up service scripts...${NC}"
chmod +x "$PROJECT_ROOT/scripts/service.sh" 2>/dev/null || true
echo -e "${GREEN}✓ Service scripts ready${NC}\n"

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Setup complete!${NC}"
echo -e "${BLUE}================================${NC}\n"

echo -e "Next steps:\n"
echo -e "1. ${YELLOW}Configure environment:${NC}"
echo -e "   nano packages/backend/.env\n"

echo -e "2. ${YELLOW}Start local Solana validator (if testing locally):${NC}"
echo -e "   solana-test-validator\n"

echo -e "3. ${YELLOW}Deploy the program:${NC}"
echo -e "   anchor deploy\n"

echo -e "4. ${YELLOW}Start the backend service:${NC}"
echo -e "   ./scripts/service.sh start\n"

echo -e "5. ${YELLOW}Check status and logs:${NC}"
echo -e "   ./scripts/service.sh status"
echo -e "   ./scripts/service.sh logs\n"

echo -e "${BLUE}For more options, see: packages/backend/OPERATIONS.md${NC}\n"

# Offer to start now
read -p "Start the service now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n${GREEN}Starting service...${NC}\n"
  ./scripts/service.sh start
fi
