import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { ethers } from 'ethers';
import { startAuthentication } from '@simplewebauthn/browser';
import QRCode from 'qrcode';
import { WalletManager } from './wallet';
import { GameScene } from './game/GameScene';

// Server port for WebSocket and API (same host as frontend, different port)
const SERVER_PORT = 3000;

// Game Configuration
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600,
        parent: 'phaser-game'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },  // No gravity until race starts
            debug: false
        }
    },
    scene: [GameScene]
};

class PizzaSkyRaceApp {
    constructor() {
        this.game = null;
        this.socket = null;
        this.walletManager = null;
        this.currentRaceId = null;
        this.playerId = null;
        this.timeRemaining = 60;
        this.currentHeight = 0;
        
        this.init();
    }
    
    async init() {
        // Initialize wallet manager
        this.walletManager = new WalletManager();
        
        // Connect to WebSocket server
        // In production: use same origin (Railway serves both frontend and backend)
        // In local dev: frontend on 3001, server on 3000
        let wsUrl;
        if (window.location.hostname === 'localhost') {
            // Local dev: connect to server port
            wsUrl = `http://localhost:${SERVER_PORT}`;
        } else {
            // Production: connect to same origin (auto-detects wss:// for HTTPS)
            wsUrl = window.location.origin;
        }
        console.log('🔌 Connecting to:', wsUrl);
        this.socket = io(wsUrl);

        // IMPORTANT: without this, timer/leaderboard events won't be handled
        this.setupSocketListeners();
        
        this.setupUI();
        
        // Generate QR code for joining
        await this.generateQRCode();
    }
    
    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected - ID:', this.socket.id);
            this.updateAdminDashboard();
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ WebSocket disconnected');
        });
        
        this.socket.on('raceStarted', (data) => {
            console.log('Race started:', data);
            this.currentRaceId = data.raceId;
            this.startGame();
        });
        
        this.socket.on('manualRaceStart', (data) => {
            console.log('🏁 Manual race start triggered!');
            this.currentRaceId = data.raceId;
            this.startGame();
        });

        // When player joins, just set race ID - don't start game yet
        // Wait for admin to trigger manualRaceStart
        this.socket.on('joinedRace', (data) => {
            if (!this.currentRaceId) {
                this.currentRaceId = data.raceId;
            }
            this.updateStatus(`Waiting for race to start... (${data.playerCount} players)`);
            // Don't call this.startGame() here - wait for manualRaceStart
        });
        
        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
            this.updateStatus(`${data.playerCount} players in race`);
        });
        
        this.socket.on('heightUpdate', (data) => {
            this.updateLeaderboard(data.leaderboard);
        });
        
        this.socket.on('raceEnded', (data) => {
            this.endGame(data);
        });
        
        this.socket.on('timer', (data) => {
            this.timeRemaining = data.timeRemaining;
            this.updateTimer(this.timeRemaining);
        });
        
        // Multiplayer: receive other players' positions
        this.socket.on('playersPositions', (data) => {
            if (!this.game) return;
            const scene = this.game.scene.getScene('GameScene');
            if (scene && scene.updateOtherPlayers) {
                scene.updateOtherPlayers(data.players);
            }
        });
    }
    
    setupUI() {
        const joinBtn = document.getElementById('join-btn');
        const jumpBtn = document.getElementById('jump-btn');
        
        joinBtn.addEventListener('click', () => this.joinRace());
        if (jumpBtn) jumpBtn.addEventListener('click', () => this.jump());
        
        // Mobile controls
        if ('ontouchstart' in window && jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.jump();
            });
        }
    }
    
    async generateQRCode() {
        const qrContainer = document.getElementById('qr-code');
        // Use LAN URL from server so phone can open the game (same WiFi) or Railway URL in production
        let url = window.location.href;
        try {
            // Use same protocol and hostname as current page, API is on same server
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            const port = window.location.port ? `:${window.location.port}` : '';
            const serverBase = `${protocol}//${hostname}${port}`;
            const res = await fetch(`${serverBase}/api/host-url`);
            if (res.ok) {
                const { appUrl } = await res.json();
                if (appUrl) url = appUrl;
            }
        } catch (e) {
            console.warn('Could not get LAN URL for QR, using current:', e);
        }
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(url, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            qrContainer.innerHTML = `<img src="${qrCodeDataUrl}" alt="QR Code" />`;
        } catch (error) {
            console.error('Failed to generate QR code:', error);
        }
    }
    
    async joinRace() {
        try {
            this.updateStatus('Creating Smart Account...');
            
            // Connect to WebSocket server if not already connected
            if (!this.socket) {
                console.log('🔌 Connecting to game server...');
                const wsUrl = window.location.hostname === 'localhost' 
                    ? `http://localhost:${SERVER_PORT}` 
                    : window.location.origin;
                console.log('🔌 Socket URL:', wsUrl);
                this.socket = io(wsUrl);
                this.setupSocketListeners();
                
                // Wait for connection
                await new Promise((resolve) => {
                    this.socket.once('connect', resolve);
                });
                console.log('✅ Connected to game server');
            }
            
            // Create Smart Account with Passkey
            const account = await this.walletManager.createSmartAccount();
            this.playerId = account.address;
            
            this.updateStatus('Creating Session Key...');
            
            // Create session key (90 seconds)
            await this.walletManager.createSessionKey(90);
            
            this.updateStatus('Joining race...');
            
            // Emit join event to server
            this.socket.emit('joinRace', {
                playerId: this.playerId,
                address: account.address
            });
            
            // Update UI
            document.getElementById('wallet-info').textContent = 
                `Wallet: ${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
            
            // Hide login screen, show game
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');
            
            // Initialize Phaser game
            this.game = new Phaser.Game(config);
            this.game.registry.set('app', this);
            
        } catch (error) {
            console.error('Failed to join race:', error);
            this.updateStatus('❌ Failed to join. Please try again.');
        }
    }
    
    startGame() {
        this.updateStatus('🏁 Race started! GO!');
        
        // Start the race in the game scene
        const scene = this.game.scene.getScene('GameScene');
        if (scene && scene.startRace) {
            scene.startRace();
        }
        
        // Start sending height updates
        this.heightUpdateInterval = setInterval(() => {
            this.sendHeightUpdate();
        }, 500);
        
        // Position broadcast throttle
        this._lastPositionSend = 0;
    }
    
    // Send player position for multiplayer ghost rendering
    sendPlayerPosition(posData) {
        if (!this.socket || !this.currentRaceId || !this.playerId) return;
        
        // Throttle: send at most every 100ms
        const now = Date.now();
        if (now - (this._lastPositionSend || 0) < 100) return;
        this._lastPositionSend = now;
        
        this.socket.emit('playerPosition', {
            raceId: this.currentRaceId,
            playerId: this.playerId,
            x: posData.x,
            y: posData.y,
            score: posData.score,
            velocityY: posData.velocityY,
            alive: posData.alive
        });
    }
    
    jump() {
        if (!this.game) return;
        
        const scene = this.game.scene.scenes[0];
        if (scene && scene.jump) {
            scene.jump();
        }
    }
    
    async sendHeightUpdate() {
        if (!this.currentRaceId || !this.playerId) return;
        
        try {
            // Send to server via WebSocket
            this.socket.emit('updateHeight', {
                raceId: this.currentRaceId,
                playerId: this.playerId,
                height: this.currentHeight
            });
            
            // Update on-chain (batched/debounced in production)
            // Using session key for gasless transactions
            if (this.currentHeight % 100 === 0) { // Only update blockchain every 100m
                await this.walletManager.updateHeightOnChain(
                    this.currentRaceId,
                    this.currentHeight
                );
            }
        } catch (error) {
            console.error('Failed to update height:', error);
        }
    }
    
    updateHeight(height) {
        this.currentHeight = height;
        document.getElementById('height').textContent = `Score: ${Math.floor(height)}`;
    }
    
    updateTimer(seconds) {
        document.getElementById('timer').textContent = seconds;
    }
    
    updateLeaderboard(leaderboard) {
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '';
        
        leaderboard.slice(0, 10).forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = 'player-entry';
            const isMe = entry.playerId === this.playerId;
            div.innerHTML = `
                ${index + 1}. ${isMe ? '👤 YOU' : '🍕'} 
                ${entry.playerId.slice(0, 6)}... 
                <span style="float: right">${Math.floor(entry.height)} pts</span>
            `;
            if (isMe) {
                div.style.background = 'rgba(255, 215, 0, 0.3)';
                div.style.fontWeight = 'bold';
            }
            list.appendChild(div);
        });
    }
    
    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }
    
    async endGame(data) {
        if (this.heightUpdateInterval) {
            clearInterval(this.heightUpdateInterval);
        }
        
        const isWinner = data.winner === this.playerId;
        
        if (isWinner) {
            this.updateStatus('🎉 YOU WON! Golden Slice NFT minted!');
            
            // Mint NFT to winner
            try {
                await this.walletManager.mintGoldenSlice(
                    this.currentRaceId,
                    this.currentHeight
                );
            } catch (error) {
                console.error('Failed to mint NFT:', error);
            }
        } else {
            this.updateStatus(`Race ended! Winner: ${data.winner.slice(0, 6)}...`);
        }
        
        // Show final leaderboard
        this.updateLeaderboard(data.finalLeaderboard);
        
        // Offer to play again after 5 seconds
        setTimeout(() => {
            if (confirm('Race finished! Play again?')) {
                window.location.reload();
            }
        }, 5000);
    }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PizzaSkyRaceApp();
});
