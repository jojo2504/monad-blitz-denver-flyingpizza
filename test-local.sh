#!/bin/bash

echo "🍕 Pizza Sky Race - Local Testing Setup"
echo "========================================"
echo ""

# Step 1: Start local Hardhat node
echo "Step 1: Starting local Hardhat node..."
echo "This will create a local blockchain with test accounts"
echo ""

gnome-terminal --tab --title="Hardhat Node" -- bash -c "cd $(pwd) && npx hardhat node; exec bash" 2>/dev/null || \
xterm -e "cd $(pwd) && npx hardhat node" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npx hardhat node"' 2>/dev/null || \
echo "⚠️  Please open a new terminal and run: npx hardhat node"

echo ""
echo "⏳ Waiting 5 seconds for node to start..."
sleep 5

# Step 2: Deploy contracts to local network
echo ""
echo "Step 2: Deploying contracts to local network..."
npx hardhat run scripts/deploy.js --network localhost

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed. Make sure Hardhat node is running!"
    echo "   Run 'npx hardhat node' in a separate terminal first."
    exit 1
fi

# Step 3: Start the multiplayer server
echo ""
echo "Step 3: Starting multiplayer server..."
gnome-terminal --tab --title="Game Server" -- bash -c "cd $(pwd) && npm run server; exec bash" 2>/dev/null || \
xterm -e "cd $(pwd) && npm run server" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npm run server"' 2>/dev/null || \
echo "⚠️  Please open a new terminal and run: npm run server"

echo ""
echo "⏳ Waiting 3 seconds for server to start..."
sleep 3

# Step 4: Start the frontend
echo ""
echo "Step 4: Starting frontend..."
echo ""
echo "================================"
echo "🎮 Starting Pizza Sky Race!"
echo "================================"
echo ""
echo "Frontend will open at: http://localhost:3000"
echo "Backend running at:    http://localhost:3001"
echo "Blockchain RPC:        http://127.0.0.1:8545"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

npm run dev
