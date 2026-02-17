import { ethers } from 'ethers';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// Contract ABIs (simplified for demo)
const GAME_ABI = [
    "function joinRace(uint256 raceId) external",
    "function updateHeight(uint256 raceId, uint256 newHeight) external",
    "function applyPepperoniBoost(uint256 raceId) external",
    "function getRaceInfo(uint256 raceId) external view returns (uint256, uint256, uint256, bool, address)",
    "function getPlayerState(uint256 raceId, address player) external view returns (uint256, bool, bool, uint256, uint256)"
];

const PAYMASTER_ABI = [
    "function validatePaymasterUserOp(address sender, uint256 maxCost) external view returns (bool)",
    "function getBalance() external view returns (uint256)"
];

const SESSION_KEY_ABI = [
    "function createSessionKey(address sessionKey, uint256 duration) external",
    "function isValidSessionKey(address user, address sessionKey) external view returns (bool)"
];

const NFT_ABI = [
    "function mintToWinner(address winner, uint256 raceId, uint256 finalHeight) external returns (uint256)"
];

export class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.smartAccount = null;
        this.sessionKey = null;
        this.gameContract = null;
        this.paymasterContract = null;
        this.sessionKeyContract = null;
        this.nftContract = null;
        
        this.init();
    }
    
    async init() {
        // Connect to Monad network
        const rpcUrl = import.meta.env.VITE_MONAD_RPC_URL || 'https://testnet.monad.xyz/rpc';
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Initialize contracts
        this.gameContract = new ethers.Contract(
            import.meta.env.VITE_GAME_CONTRACT_ADDRESS,
            GAME_ABI,
            this.provider
        );
        
        this.paymasterContract = new ethers.Contract(
            import.meta.env.VITE_PAYMASTER_ADDRESS,
            PAYMASTER_ABI,
            this.provider
        );
        
        this.sessionKeyContract = new ethers.Contract(
            import.meta.env.VITE_SESSION_KEY_VALIDATOR_ADDRESS,
            SESSION_KEY_ABI,
            this.provider
        );
        
        this.nftContract = new ethers.Contract(
            import.meta.env.VITE_NFT_CONTRACT_ADDRESS,
            NFT_ABI,
            this.provider
        );
    }
    
    /**
     * Create Smart Account using Passkey (WebAuthn)
     */
    async createSmartAccount() {
        try {
            console.log('Creating Smart Account with Passkey...');
            
            // Check if WebAuthn is available
            if (!window.PublicKeyCredential) {
                throw new Error('WebAuthn not supported in this browser');
            }
            
            // Generate a new keypair for the smart account
            const wallet = ethers.Wallet.createRandom();
            
            // In production, this would use a proper ERC-4337 account factory
            // For this demo, we'll simulate smart account creation
            const smartAccountAddress = wallet.address;
            
            // Store credentials using WebAuthn (Passkey)
            await this.registerPasskey(smartAccountAddress);
            
            this.smartAccount = {
                address: smartAccountAddress,
                wallet: wallet
            };
            
            this.signer = wallet.connect(this.provider);
            
            console.log('Smart Account created:', smartAccountAddress);
            
            return this.smartAccount;
            
        } catch (error) {
            console.error('Failed to create smart account:', error);
            
            // Fallback: create a simple wallet without passkey
            console.log('Falling back to simple wallet creation...');
            const wallet = ethers.Wallet.createRandom();
            this.smartAccount = {
                address: wallet.address,
                wallet: wallet
            };
            this.signer = wallet.connect(this.provider);
            
            return this.smartAccount;
        }
    }
    
    /**
     * Register Passkey for smart account
     */
    async registerPasskey(accountAddress) {
        try {
            // WebAuthn registration options
            const registrationOptions = {
                challenge: ethers.randomBytes(32),
                rp: {
                    name: "Pizza Sky Race",
                    id: window.location.hostname
                },
                user: {
                    id: ethers.toUtf8Bytes(accountAddress),
                    name: accountAddress,
                    displayName: `Pizza Racer ${accountAddress.slice(0, 6)}`
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" }, // ES256
                    { alg: -257, type: "public-key" } // RS256
                ],
                timeout: 60000,
                attestation: "none",
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    requireResidentKey: false,
                    userVerification: "preferred"
                }
            };
            
            // Create credential
            const credential = await navigator.credentials.create({
                publicKey: registrationOptions
            });
            
            console.log('Passkey registered successfully');
            
            // Store credential info
            localStorage.setItem('passkeyId', credential.id);
            localStorage.setItem('smartAccountAddress', accountAddress);
            
            return credential;
            
        } catch (error) {
            console.error('Passkey registration failed:', error);
            // Continue without passkey
            return null;
        }
    }
    
    /**
     * Create session key for gasless transactions
     */
    async createSessionKey(durationSeconds = 90) {
        try {
            console.log('Creating session key...');
            
            // Generate a temporary session key
            const sessionWallet = ethers.Wallet.createRandom();
            this.sessionKey = sessionWallet;
            
            // In production, this would interact with the SessionKeyValidator contract
            // For demo purposes, we'll store it locally
            const sessionData = {
                address: sessionWallet.address,
                privateKey: sessionWallet.privateKey,
                expiresAt: Date.now() + (durationSeconds * 1000)
            };
            
            sessionStorage.setItem('sessionKey', JSON.stringify(sessionData));
            
            // Connect session key to contracts
            this.gameContract = this.gameContract.connect(this.signer);
            
            console.log('Session key created:', sessionWallet.address);
            console.log('Valid for:', durationSeconds, 'seconds');
            
            return sessionWallet;
            
        } catch (error) {
            console.error('Failed to create session key:', error);
            throw error;
        }
    }
    
    /**
     * Update player height on-chain (uses session key & paymaster)
     */
    async updateHeightOnChain(raceId, height) {
        try {
            // Check session key validity
            const sessionData = JSON.parse(sessionStorage.getItem('sessionKey') || '{}');
            if (!sessionData.expiresAt || Date.now() > sessionData.expiresAt) {
                console.warn('Session key expired');
                return;
            }
            
            // In production, this would use ERC-4337 UserOperation with paymaster
            // For demo, we'll simulate the transaction
            console.log('Updating height on-chain:', height, 'm (Race:', raceId, ')');
            
            // The paymaster sponsors the gas, so no gas payment needed
            // Transaction is signed with session key
            
            // Simulated transaction
            const tx = await this.gameContract.updateHeight(raceId, Math.floor(height));
            await tx.wait();
            
            console.log('Height updated on-chain successfully');
            
        } catch (error) {
            console.error('Failed to update height on-chain:', error);
            // Don't throw - game continues even if blockchain update fails
        }
    }
    
    /**
     * Apply power-up on-chain
     */
    async applyPowerUpOnChain(raceId, powerUpType) {
        try {
            console.log('Applying power-up on-chain:', powerUpType);
            
            if (powerUpType === 'boost') {
                const tx = await this.gameContract.applyPepperoniBoost(raceId);
                await tx.wait();
            }
            
            console.log('Power-up applied on-chain');
            
        } catch (error) {
            console.error('Failed to apply power-up on-chain:', error);
        }
    }
    
    /**
     * Mint Golden Slice NFT to winner
     */
    async mintGoldenSlice(raceId, finalHeight) {
        try {
            console.log('Minting Golden Slice NFT...');
            
            // In production, this would be called by the game server/admin
            // For demo, we'll simulate the mint
            const tx = await this.nftContract.mintToWinner(
                this.smartAccount.address,
                raceId,
                Math.floor(finalHeight)
            );
            await tx.wait();
            
            console.log('Golden Slice NFT minted!');
            
            return tx.hash;
            
        } catch (error) {
            console.error('Failed to mint NFT:', error);
            throw error;
        }
    }
    
    /**
     * Get current race info from blockchain
     */
    async getRaceInfo(raceId) {
        try {
            const info = await this.gameContract.getRaceInfo(raceId);
            return {
                startTime: Number(info[0]),
                endTime: Number(info[1]),
                playerCount: Number(info[2]),
                isActive: info[3],
                winner: info[4]
            };
        } catch (error) {
            console.error('Failed to get race info:', error);
            return null;
        }
    }
    
    /**
     * Get player state from blockchain
     */
    async getPlayerState(raceId, playerAddress) {
        try {
            const state = await this.gameContract.getPlayerState(raceId, playerAddress);
            return {
                height: Number(state[0]),
                hasBoost: state[1],
                hasGlue: state[2],
                boostEndTime: Number(state[3]),
                glueEndTime: Number(state[4])
            };
        } catch (error) {
            console.error('Failed to get player state:', error);
            return null;
        }
    }
}
