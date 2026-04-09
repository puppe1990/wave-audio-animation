#!/bin/bash

# Wave Audio Animation - Start Both Projects
# This script runs the backend and frontend development servers simultaneously

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Starting Wave Audio Animation${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "\n${RED}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Servers stopped.${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${GREEN}Starting backend server...${NC}"
cd backend
source venv/bin/activate
uvicorn app.main:app --reload &
BACKEND_PID=$!
cd ..

# Small delay to ensure backend starts first
sleep 2

# Start Frontend
echo -e "${GREEN}Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Both servers are running!${NC}"
echo -e "${BLUE}Backend PID:${NC} $BACKEND_PID"
echo -e "${BLUE}Frontend PID:${NC} $FRONTEND_PID"
echo -e "${BLUE}================================${NC}"
echo -e "${RED}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
