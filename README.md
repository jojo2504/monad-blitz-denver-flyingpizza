# 🍕 Pizza Sky Race

> A massively multiplayer blockchain racing game built on the [Monad](https://monad.xyz) testnet — made for the **Monad Blitz Denver Hackathon**.

Players jump through the sky on invisible platforms, collect pizza power-ups, dodge pineapples, and race to the highest score. The winner gets a **Golden Slice NFT** minted gaslessly on-chain.

---

## 🎮 Gameplay

- **Jump** with `SPACE`, `↑`, or tap the screen
- You have **3 jumps** (double/triple jump)
- Platforms scroll from right to left — don't fall!
- Collect 🍕 **Pepperoni** → +6 pts & +2 jumps
- Avoid 🍍 **Pineapple** → -12 pts & gravity spike
- Race lasts **60 seconds** — top score wins
- Winner receives a **Golden Slice ERC-721 NFT**

---

## 🏗️ Architecture

```
monad-blitz-denver-flyingpizza/
├── src/                         # Frontend (Vite + Phaser 3)
│   ├── main.js                  # App entry: UI, wallet, Socket.IO client
│   ├── wallet.js                # ERC-4337 smart account & session key logic
│   └── game/
│       └── GameScene.js         # Phaser 3 game scene (physics, rendering, input)
│
├── server/
│   └── index.js                 # Express + Socket.IO server (race state, leaderboard)
│
├── contracts/
│   ├── PizzaSkyRace.sol         # Race management contract (Ownable, ReentrancyGuard)
│   ├── GoldenSliceNFT.sol       # ERC-721 winner NFT
│   ├── PizzaPaymaster.sol       # ERC-4337 Paymaster (gasless transactions)
│   └── SessionKeyValidator.sol  # ERC-4337 session key validator
│
├── scripts/
│   └── deploy.js                # Hardhat deployment script
│
├── assets/                      # Static assets (served by Vite)
│   ├── chef.png                 # Player character sprite (pixel art pizza chef)
│   ├── pizza.png                # Power-up sprite
│   └── pineapple-bg.png         # Debuff sprite
│
├── index.html                   # Main player page
├── admin.html                   # Admin dashboard (start races manually)
├── vite.config.js               # Vite config (publicDir: assets, port: 3000)
└── hardhat.config.js            # Hardhat config (Monad testnet, chainId 10143)
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [Vite](https://vitejs.dev) + [Phaser 3](https://phaser.io) |
| Multiplayer | [Socket.IO](https://socket.io) |
| Blockchain | [Monad](https://monad.xyz) Testnet (chainId 10143) |
| Wallets | [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) Smart Accounts + Passkeys (WebAuthn) |
| Gasless | Custom Paymaster contract |
| Smart Contracts | Solidity 0.8.23 + OpenZeppelin |
| Deployment | [Railway](https://railway.app) |

### How it works

1. **Player joins** → A smart account (ERC-4337) is created via Passkey (WebAuthn) — no seed phrase needed
2. **Session key** is created so in-game transactions are signed silently
3. **Admin starts the race** via `admin.html` → all connected clients start simultaneously
4. **Game runs client-side** in Phaser 3; height updates are sent via Socket.IO every 500ms
5. **Server maintains** the leaderboard and broadcasts player positions to all clients (10×/s for ghost rendering)
6. **Race ends** after 60s → server emits `raceEnded` with the final leaderboard
7. **Winner** gets a `GoldenSliceNFT` minted gaslessly via the Paymaster

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Install dependencies

```bash
npm install
```

### Run locally (development)

```bash
# Terminal 1 — Backend server
npm run server

# Terminal 2 — Frontend (Vite dev server)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The admin panel is at [http://localhost:3000/admin.html](http://localhost:3000/admin.html).

> Tip: open the game on multiple tabs or devices and start the race from the admin panel to test multiplayer.

### Run in production mode

```bash
npm run build   # Build frontend into dist/
npm start       # Serve frontend + backend on port 3000
```

Or use the convenience script:

```bash
./start.sh
```

---

## 📜 Smart Contracts

### Compile

```bash
npm run compile
```

### Deploy to Monad Testnet

Create a `.env` file at the root:

```env
PRIVATE_KEY=your_deployer_private_key
MONAD_RPC_URL=https://testnet.monad.xyz/rpc
```

Then:

```bash
npm run deploy
```

### Contracts overview

| Contract | Description |
|---|---|
| `PizzaSkyRace.sol` | Tracks races, players, heights, and emits events on-chain |
| `GoldenSliceNFT.sol` | ERC-721 NFT minted to the race winner |
| `PizzaPaymaster.sol` | ERC-4337 Paymaster — sponsors gas for players |
| `SessionKeyValidator.sol` | ERC-4337 module — validates in-game session keys |

### Run tests

```bash
npm test
```

---

## ☁️ Deploy to Railway

1. Push the repo to GitHub
2. Create a new project on [Railway](https://railway.app) from the repo
3. Set the following environment variables:
   - `PRIVATE_KEY` — deployer wallet private key
   - `MONAD_RPC_URL` — Monad RPC endpoint
4. Railway will automatically run `npm run railway` (`vite build && node server/index.js`)

The `Procfile` and `railway.json` are already configured.

---

## 🎛️ Admin Panel

Open `/admin.html` to:
- See the list of connected players
- Start the race manually
- View the live leaderboard during the race

---

## 🕹️ Controls

| Action | Input |
|---|---|
| Jump | `SPACE` / `↑` / Tap screen |
| Mobile jump | On-screen `🍕 JUMP` button |

---

## 📁 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `MONAD_RPC_URL` | Monad RPC endpoint | `https://testnet.monad.xyz/rpc` |
| `PRIVATE_KEY` | Deployer private key | — |

---

## 👥 Team

Built for the **Monad Blitz Denver Hackathon** 🍕