#!/bin/bash

echo "🍕 Starting Pizza Sky Race..."
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed. Run ./setup.sh first!"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Run ./setup.sh first!"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $SERVER_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start server in background
echo "Starting multiplayer server..."
npm run server &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Start frontend in background
echo "Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "🎮 Pizza Sky Race is running!"
echo "================================"
echo ""
echo "Frontend:  http://localhost:3000"
echo "Server:    http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Wait for processes
wait
