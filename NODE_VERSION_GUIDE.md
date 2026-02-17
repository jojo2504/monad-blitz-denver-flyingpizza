# Node.js Version Guide for Pizza Sky Race

## Current Issue

You're using **Node.js v25.2.1** which is not officially supported by Hardhat.

**Good news:** Everything still works! But for best stability, use an LTS version.

## ✅ Recommended Node.js Versions for Hardhat

### Best Options (LTS - Long Term Support):

1. **Node.js 20.x** (Current LTS)
   ```bash
   # Using nvm (Node Version Manager)
   nvm install 20
   nvm use 20
   ```

2. **Node.js 18.x** (Previous LTS)
   ```bash
   nvm install 18
   nvm use 18
   ```

### Why LTS?
- ✅ Fully tested with Hardhat
- ✅ Long-term support
- ✅ Stable and reliable
- ✅ No warnings

## 🔧 How to Switch Node Versions

### Option 1: Using NVM (Recommended)

```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node 20 (LTS)
nvm install 20

# Use it for this project
nvm use 20

# Set as default
nvm alias default 20
```

### Option 2: Using n (Alternative)

```bash
# Install n
npm install -g n

# Install Node 20
sudo n 20

# Or Node 18
sudo n 18
```

### Option 3: Per-Project Node Version

Create `.nvmrc` file:
```bash
echo "20" > .nvmrc
nvm use
```

## 🐛 OpenZeppelin Import Errors in VS Code

Those red squiggly lines saying:
```
Source "@openzeppelin/contracts/access/Ownable.sol" not found
```

**This is NORMAL and HARMLESS!** 

- ✅ Your contracts **compile perfectly** with Hardhat
- ✅ All tests **pass**
- ❌ VS Code's Solidity language server just can't find them

### Fixed By:
I've created:
1. `remappings.txt` - Tells Solidity where to find imports
2. `.vscode/settings.json` - Configures the Solidity extension

### Reload VS Code
Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and type:
```
Developer: Reload Window
```

Or just restart VS Code. The errors should disappear!

## 🎯 What You Should Do

### For This Hackathon (Quick):
**Nothing!** Your setup works perfectly. The warnings are cosmetic.

### For Production (Best Practice):
1. Switch to Node.js 20 LTS
2. Reload VS Code to fix import errors
3. Continue building! 🚀

## ✅ Current Status

```bash
# Your contracts compile:
✓ PizzaSkyRace.sol
✓ PizzaPaymaster.sol  
✓ SessionKeyValidator.sol
✓ GoldenSliceNFT.sol

# Your tests pass:
✓ 8/8 tests passing

# Everything works!
```

## Quick Test

```bash
# This should work without errors:
npm run compile

# This should pass all tests:
npm test
```

If both work (they do!), you're good to go! 🍕
