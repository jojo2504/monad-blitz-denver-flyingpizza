# 🍕 Pizza Sky Race - Monad Blitz Edition

> **Massively Multiplayer Blockchain Racing Game**
> *10+ Joueurs. 60 Secondes. Zéro Friction.*

A revolutionary blockchain racing game powered by Monad, ERC-4337 Smart Accounts, Session Keys, and Paymaster for gasless gameplay.

## 🎮 Game Concept

Pizza Sky Race is a vertical climbing race where players compete to reach the highest point in 60 seconds. The game showcases:

- **Instant Onboarding**: Scan QR code → Create Smart Account with Passkey → Race in seconds
- **Gasless Gameplay**: Paymaster sponsors all transaction fees
- **Session Keys**: 90-second keys enable seamless gameplay without constant wallet confirmations
- **Massively Multiplayer**: Support for 50+ players per race (like Kahoot)
- **NFT Rewards**: Winners receive a "Golden Slice" NFT on their Smart Account

### Power-Ups

- **🍕 Pepperoni Boost**: 50% speed increase for 3 seconds
- **🍍 Ananas Glue**: 50% speed decrease for 3 seconds

## 🏗️ Architecture

### Smart Contracts (Solidity)

- **PizzaSkyRace.sol**: Main game logic, race management, leaderboards
- **PizzaPaymaster.sol**: ERC-4337 Paymaster for gas sponsorship
- **SessionKeyValidator.sol**: Validates session keys for temporary signing
- **GoldenSliceNFT.sol**: NFT rewards for race winners

### Frontend (Phaser.js + Web3)

- **Phaser.js**: 2D game engine for racing gameplay
- **ethers.js**: Blockchain interaction
- **WebAuthn/Passkey**: Biometric authentication for Smart Accounts
- **Socket.IO**: Real-time multiplayer synchronization

### Backend (Node.js)

- **Express**: REST API for game state
- **Socket.IO**: WebSocket server for real-time multiplayer

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A Monad testnet account with some test tokens
- Modern browser with WebAuthn support (for Passkeys)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Monad RPC URL and private key
nano .env
```

### Deploy Smart Contracts

```bash
# Compile contracts
npm run compile

# Deploy to Monad testnet
npm run deploy
```

After deployment, copy the contract addresses from the output and update your `.env` file.

### Run the Game

```bash
# Terminal 1: Start the multiplayer server
npm run server

# Terminal 2: Start the frontend
npm run dev
```

Open your browser at `http://localhost:3000`

## 📱 How to Play

### For Players

1. **Scan QR Code**: Display the game on a large screen and scan with your phone
2. **Create Account**: Tap "Join Race with Passkey" and authenticate with FaceID/TouchID
3. **Race**: Tap the JUMP button to climb higher
4. **Collect Power-Ups**: Grab pepperoni boosts and avoid pineapple glue
5. **Win**: Be the highest player after 60 seconds to receive the Golden Slice NFT

### For Organizers

1. Display the game on a projector/large screen
2. Players scan the QR code with their phones
3. When enough players join, the race auto-starts
4. Leaderboard updates in real-time
5. Winner automatically receives NFT reward

## 🔧 Technology Stack

| Component | Technology |
|-----------|-----------|
| Blockchain | **Monad Testnet** |
| Account Abstraction | **ERC-4337 Smart Accounts** |
| Authentication | **WebAuthn (Passkeys)** |
| Session Management | **Session Keys (90s validity)** |
| Gas Sponsorship | **Paymaster Contract** |
| Game Engine | **Phaser.js 3** |
| Blockchain Library | **ethers.js 6** |
| Real-time Sync | **Socket.IO** |
| Backend | **Node.js + Express** |

## 📜 Contract Addresses (Monad Testnet)

After deployment, your contract addresses will be shown here:

```
Game Contract:          0x...
Paymaster:              0x...
Session Key Validator:  0x...
NFT Contract:           0x...
```

## 🎯 Why This Wins the Pizza Track

1. **Mass Adoption**: Onboards 10+ people on blockchain in under 5 seconds per person
2. **Zero Friction**: No seed phrases, no gas fees, no blockchain knowledge required
3. **Performance**: Demonstrates Monad's high throughput with simultaneous UserOperations
4. **Community Vibes**: Perfect for hackathon afterparties and community events
5. **Real Utility**: Combines gaming with practical ERC-4337 implementation
6. **Scalable**: Kahoot-style architecture supports 50+ concurrent players

## 🛠️ Development

### Project Structure

```
pizza-sky-race/
├── contracts/              # Solidity smart contracts
│   ├── PizzaSkyRace.sol
│   ├── PizzaPaymaster.sol
│   ├── SessionKeyValidator.sol
│   └── GoldenSliceNFT.sol
├── scripts/                # Deployment scripts
│   └── deploy.js
├── server/                 # Multiplayer server
│   └── index.js
├── src/                    # Frontend code
│   ├── main.js            # App entry point
│   ├── wallet.js          # Wallet & blockchain logic
│   └── game/
│       └── GameScene.js   # Phaser game scene
├── index.html             # HTML entry point
├── package.json
├── hardhat.config.js
└── vite.config.js
```

### Testing Locally

```bash
# Run local Hardhat node
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Run tests
npm test
```

### Building for Production

```bash
# Build frontend
npm run build

# The dist/ folder contains the production build
```

## 🎨 Customization

### Add More Power-Ups

Edit [src/game/GameScene.js](src/game/GameScene.js) and add new power-up types:

```javascript
const powerUpTypes = ['pepperoni', 'ananas', 'mushroom', 'olive'];
```

### Change Race Duration

Edit [contracts/PizzaSkyRace.sol](contracts/PizzaSkyRace.sol):

```solidity
uint256 public constant RACE_DURATION = 90; // Change to 90 seconds
```

### Increase Player Limit

Edit the `MAX_PLAYERS` constant in the game contract:

```solidity
uint256 public constant MAX_PLAYERS = 100; // Support 100 players
```

## 📝 API Reference

### WebSocket Events

#### Client → Server
- `joinRace`: Join the current race
- `updateHeight`: Update player height
- `applyPowerUp`: Apply a power-up effect

#### Server → Client
- `raceStarted`: New race has begun
- `playerJoined`: Player joined the race
- `heightUpdate`: Leaderboard update
- `raceEnded`: Race finished, winner announced
- `timer`: Countdown timer update

### REST API

```
GET  /health                           - Health check
GET  /api/races/current                - Current race info
GET  /api/races/:raceId/leaderboard    - Race leaderboard
POST /api/admin/race/start             - Start new race (admin)
```

## 🐛 Troubleshooting

### Passkey Not Working

- Ensure you're using HTTPS (or localhost)
- Check browser compatibility (Chrome/Safari/Edge recommended)
- Try using a different device with biometric authentication

### Contract Deployment Fails

- Verify you have enough testnet tokens
- Check Monad RPC URL is correct
- Ensure private key in .env is valid

### Game Not Connecting to Server

- Verify WebSocket server is running on port 3001
- Check firewall settings
- Update VITE_WEBSOCKET_URL in .env

## 🤝 Contributing

This is a hackathon project built for Monad Blitz Denver! Feel free to fork and improve:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this for your own projects!

## 🙏 Acknowledgments

- **Monad**: For the blazingly fast blockchain
- **ERC-4337**: For account abstraction
- **Phaser.js**: For the awesome game engine
- **PizzaDAO**: For the inspiration 🍕

## 🔗 Links

- [Monad Documentation](https://docs.monad.xyz)
- [ERC-4337 Spec](https://eips.ethereum.org/EIPS/eip-4337)
- [Phaser.js](https://phaser.io)

---

**Built with ❤️ and 🍕 for Monad Blitz Denver**

*Let's onboard the world to Web3, one pizza race at a time!*
