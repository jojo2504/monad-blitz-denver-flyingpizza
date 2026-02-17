# Quick Start Guide

## Setup (5 minutes)

### 1. Install Dependencies

```bash
chmod +x setup.sh
./setup.sh
```

Or manually:

```bash
npm install
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` and add:

```env
MONAD_RPC_URL=https://testnet.monad.xyz/rpc
PRIVATE_KEY=your_private_key_here
```

Get testnet tokens from the Monad faucet.

### 3. Deploy Contracts

```bash
npm run deploy
```

Copy the contract addresses from the output and update your `.env`:

```env
GAME_CONTRACT_ADDRESS=0x...
PAYMASTER_CONTRACT_ADDRESS=0x...
SESSION_KEY_VALIDATOR_ADDRESS=0x...
NFT_CONTRACT_ADDRESS=0x...
```

Also update the frontend `.env` variables (VITE_* prefix).

### 4. Start the Game

```bash
# Terminal 1: Start multiplayer server
npm run server

# Terminal 2: Start frontend
npm run dev
```

Open `http://localhost:3000` in your browser!

## Playing the Game

### Host Setup (Projector/Big Screen)

1. Open the game on your computer
2. Display it on a projector/large screen
3. Show the QR code
4. Wait for players to join

### Player Setup (Phone)

1. Scan the QR code on the big screen
2. Tap "Join Race with Passkey"
3. Authenticate with FaceID/TouchID
4. Tap JUMP to play
5. Race for 60 seconds!

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     MONAD BLOCKCHAIN                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PizzaSkyRace│  │  Paymaster   │  │ SessionKey   │ │
│  │   Contract   │  │   Contract   │  │  Validator   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│               MULTIPLAYER SERVER (Node.js)               │
│                    Socket.IO WebSocket                   │
│              Race Management + Leaderboards              │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (Phaser.js)                    │
│     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│     │   Player 1  │  │   Player 2  │  │   Player N  │  │
│     │   (Phone)   │  │   (Phone)   │  │   (Phone)   │  │
│     └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Key Features Implemented

✅ **ERC-4337 Smart Accounts**: Wallet creation via Passkey (WebAuthn)
✅ **Session Keys**: 90-second temporary keys for gasless gameplay
✅ **Paymaster**: Sponsors all transaction fees
✅ **Real-time Multiplayer**: Socket.IO for 50+ concurrent players
✅ **On-chain State**: Heights and power-ups recorded on Monad
✅ **NFT Rewards**: Golden Slice NFT minted to winners
✅ **Mobile-First**: QR code scanning + touch controls

## Troubleshooting

### "Cannot connect to server"
- Ensure server is running: `npm run server`
- Check VITE_WEBSOCKET_URL in .env

### "Contract deployment failed"
- Verify you have Monad testnet tokens
- Check MONAD_RPC_URL and PRIVATE_KEY in .env
- Try a different RPC endpoint

### "Passkey not working"
- Use HTTPS or localhost only
- Requires browser with WebAuthn (Chrome/Safari/Edge)
- Try different device with biometric authentication

### Game is laggy
- Reduce MAX_PLAYERS in PizzaSkyRace.sol
- Optimize blockchain update frequency in wallet.js
- Use local Monad node for testing

## Development Tips

### Testing Locally

```bash
# Start local Hardhat node
npx hardhat node

# Deploy to localhost
npx hardhat run scripts/deploy.js --network localhost

# Update .env to use localhost RPC
MONAD_RPC_URL=http://127.0.0.1:8545
```

### Debugging

- Check browser console for frontend errors
- Check server logs for backend errors
- Use Hardhat console for contract testing
- Monitor Monad testnet explorer for transactions

### Customization

- **Game duration**: Edit `RACE_DURATION` in PizzaSkyRace.sol
- **Max players**: Edit `MAX_PLAYERS` in PizzaSkyRace.sol
- **Power-up duration**: Edit power-up logic in GameScene.js
- **Visual style**: Edit CSS in index.html and sprite creation in GameScene.js

## Demo Script for Hackathon

1. **Setup** (Before demo)
   - Deploy contracts
   - Start server and frontend
   - Display on projector

2. **Introduction** (30 seconds)
   - "Pizza Sky Race: Massively multiplayer blockchain racing"
   - "Instant onboarding with zero Web3 friction"

3. **Live Demo** (2 minutes)
   - Ask 3-5 volunteers to scan QR code
   - Show Smart Account creation with Passkey
   - Start race and show real-time gameplay
   - Display leaderboard updates
   - Show winner receiving NFT

4. **Technical Highlights** (1 minute)
   - ERC-4337 for gasless transactions
   - Session Keys for seamless gameplay
   - Monad for high-throughput multiplayer
   - WebAuthn for user-friendly auth

5. **Q&A**

## Next Steps / Future Improvements

- [ ] Integrate proper ERC-4337 bundler (e.g., Stackup, Pimlico)
- [ ] Add tournament mode with multiple rounds
- [ ] Implement power-up trading/marketplace
- [ ] Add custom avatar NFTs for players
- [ ] Build mobile native apps (iOS/Android)
- [ ] Add spectator mode for non-players
- [ ] Implement team races
- [ ] Add achievement system with NFT badges
- [ ] Create DAO for community governance

## Resources

- [Monad Docs](https://docs.monad.xyz)
- [ERC-4337 Guide](https://eips.ethereum.org/EIPS/eip-4337)
- [Phaser Examples](https://phaser.io/examples)
- [WebAuthn Guide](https://webauthn.guide/)

---

**Need help? Check GAME_README.md for full documentation!**
