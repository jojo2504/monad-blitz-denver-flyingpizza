# 🎮 Local Testing Guide

## Quick Start (Automated)

```bash
chmod +x test-local.sh
./test-local.sh
```

This will automatically:
1. Start local Hardhat blockchain
2. Deploy all contracts
3. Start multiplayer server
4. Start frontend

---

## Manual Setup (Step by Step)

### Terminal 1: Local Blockchain

```bash
npx hardhat node
```

This creates a local Ethereum node with 20 test accounts pre-funded with 10,000 ETH each.

**Keep this running!** You'll see output like:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

### Terminal 2: Deploy Contracts

Wait for the node to start, then:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

**Copy the contract addresses** from the output! You'll see:
```
Game Contract:          0x5FbDB2315678afecb367f032d93F642f64180aa3
Paymaster:              0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Session Key Validator:  0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NFT Contract:           0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

### Terminal 3: Update Environment

Create a `.env` file with the local addresses:

```bash
# Local Configuration
MONAD_RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract Addresses (from deployment)
GAME_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
PAYMASTER_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
SESSION_KEY_VALIDATOR_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NFT_CONTRACT_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

# Server
PORT=3000
WEBSOCKET_PORT=3001

# Frontend
VITE_GAME_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_PAYMASTER_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_SESSION_KEY_VALIDATOR_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
VITE_NFT_CONTRACT_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_MONAD_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=31337
```

**Note:** The private key above is Hardhat's default test account #0 (safe to use locally).

### Terminal 4: Start Multiplayer Server

```bash
npm run server
```

You should see:
```
🍕 Pizza Sky Race Server running on port 3001
WebSocket: ws://localhost:3001
HTTP API: http://localhost:3001
```

### Terminal 5: Start Frontend

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

---

## 🎮 Testing the Game

### On Your Computer

1. Open **http://localhost:3000** in your browser
2. Click **"Join Race with Passkey"**
3. Click **"JUMP"** button to play
4. Watch the height increase!

### Testing Multiplayer

Open **multiple browser tabs** (or use different browsers):
- Tab 1: http://localhost:3000
- Tab 2: http://localhost:3000 (incognito/private mode)
- Tab 3: http://localhost:3000 (different browser)

Each tab = different player!

### Testing on Phone (Same WiFi)

1. Find your computer's local IP:
   ```bash
   # Linux/Mac
   hostname -I | awk '{print $1}'
   # or
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Update `vite.config.js`:
   ```javascript
   server: {
       port: 3000,
       host: '0.0.0.0',  // Allow external connections
       open: true
   }
   ```

3. Access from phone: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`

---

## 🐛 Troubleshooting

### "Cannot connect to server"

**Check all services are running:**
```bash
# Check Hardhat node
curl http://127.0.0.1:8545

# Check game server
curl http://localhost:3001/health

# Check frontend
curl http://localhost:3000
```

### "Contract deployment failed"

- Make sure Hardhat node is running first
- Try restarting the node and redeploying

### "MetaMask conflicts"

If you have MetaMask installed, it might interfere. Either:
1. Disable MetaMask for localhost
2. Use incognito/private browsing mode
3. Test in a different browser

### Game not loading

1. Check browser console (F12) for errors
2. Verify `.env` has correct contract addresses
3. Restart all services

### WebSocket connection failed

- Make sure server is running on port 3001
- Check firewall isn't blocking the port
- Verify `VITE_WEBSOCKET_URL` in `.env`

---

## 📊 Monitoring

### View Blockchain Transactions

The Hardhat node logs all transactions:
```
eth_sendTransaction
  Contract deployment: PizzaSkyRace
  ...
```

### Check Game State

```bash
# Current race info
curl http://localhost:3001/api/races/current

# Leaderboard
curl http://localhost:3001/api/races/1/leaderboard
```

### Run Tests While Playing

```bash
# Run contract tests
npm test

# Test specific contract
npx hardhat test test/PizzaSkyRace.test.js
```

---

## 🎯 What to Test

### ✅ Basic Gameplay
- [ ] Join race successfully
- [ ] Jump button works
- [ ] Height increases
- [ ] Timer counts down

### ✅ Multiplayer
- [ ] Multiple players can join
- [ ] Leaderboard updates in real-time
- [ ] All players see same timer

### ✅ Power-ups
- [ ] Pepperoni boosts appear
- [ ] Collecting boost increases speed
- [ ] Ananas glue slows down

### ✅ Race End
- [ ] Race ends after 60 seconds
- [ ] Winner is determined correctly
- [ ] Final leaderboard shown

### ✅ Smart Account
- [ ] Passkey creation works (or fallback)
- [ ] Session key created
- [ ] Transactions are gasless

---

## 🚀 Quick Commands

```bash
# Kill all node processes (if stuck)
pkill -f "hardhat node"
pkill -f "node server"

# Fresh restart
npm run compile && npx hardhat node &
sleep 5 && npx hardhat run scripts/deploy.js --network localhost
npm run server &
npm run dev

# Check if ports are in use
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :8545  # Blockchain
```

---

## 📝 Default Test Accounts

Hardhat gives you 20 pre-funded accounts. Account #0 is used for deployment:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Balance: 10000 ETH
```

You can use any of these for testing!

---

## 🎬 Next Steps

Once local testing works:
1. Test on Monad testnet
2. Get testnet tokens from faucet
3. Deploy to testnet
4. Share the URL with friends!

Happy testing! 🍕🚀
