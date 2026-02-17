#!/bin/bash

echo "🍕 Pizza Sky Race - Setup Script"
echo "================================"

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node -v)
echo "Node.js version: $node_version"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your Monad RPC URL and private key"
else
    echo ""
    echo "✅ .env file already exists"
fi

# Compile contracts
echo ""
echo "Compiling smart contracts..."
npm run compile

echo ""
echo "================================"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your Monad testnet credentials"
echo "2. Deploy contracts: npm run deploy"
echo "3. Start server: npm run server (in one terminal)"
echo "4. Start frontend: npm run dev (in another terminal)"
echo ""
echo "🎮 Happy racing!"
