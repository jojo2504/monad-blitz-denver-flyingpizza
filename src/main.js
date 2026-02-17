import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { ethers } from 'ethers';
import { startAuthentication } from '@simplewebauthn/browser';
import QRCode from 'qrcode';
import { WalletManager } from './wallet';
import { GameScene } from './game/GameScene';

// Server port for WebSocket and API (same host as frontend, different port)
const SERVER_PORT = 3001;

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
            gravity: { y: 300 },
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
        
        // Connect to WebSocket server (use current hostname so phone connects to LAN IP when on same WiFi)
        // In production on Railway, use wss:// if HTTPS, otherwise ws://
        let wsUrl;
        if (import.meta.env.VITE_WEBSOCKET_URL && import.meta.env.PROD) {
            wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
        } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const port = window.location.port ? `:${window.location.port}` : '';
            wsUrl = `${protocol}//${window.location.hostname}${port}`;
        }
        this.socket = io(wsUrl);
        
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
        
        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
            this.updateStatus(`${data.playerCount} players in race`);
            this.updateAdminDashboard();
        });
        
        this.socket.on('playerLeft', (data) => {
            this.updateAdminDashboard();
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
        
        this.socket.on('lobbyUpdate', (data) => {
            this.updateAdminLobby(data);
        });
    }
    
    setupUI() {
        const joinBtn = document.getElementById('join-btn');
        const jumpBtn = document.getElementById('jump-btn');
        const startRaceBtn = document.getElementById('start-race-btn');
        
        joinBtn.addEventListener('click', () => this.joinRace());
        jumpBtn.addEventListener('click', () => this.jump());
        
        // Admin start race button
        startRaceBtn.addEventListener('click', () => this.manualStartRace());
        
        // Mobile controls
        if ('ontouchstart' in window) {
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
                this.socket = io(import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001');
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
        
        // Start sending height updates
        this.heightUpdateInterval = setInterval(() => {
            this.sendHeightUpdate();
        }, 500);
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
    
    manualStartRace() {
        if (!this.socket) {
            alert('Not connected to server!');
            return;
        }
        
        console.log('🎮 Admin manually starting race...');
        this.socket.emit('adminStartRace');
    }
    
    updateAdminDashboard() {
        if (this.socket) {
            this.socket.emit('getGameState');
        }
    }
    
    updateAdminLobby(data) {
        const playerCountElem = document.getElementById('admin-player-count');
        const statusElem = document.getElementById('admin-status');
        const playerListElem = document.getElementById('admin-player-list');
        
        if (playerCountElem) {
            playerCountElem.textContent = data.playerCount || 0;
        }
        
        if (statusElem) {
            statusElem.textContent = data.raceActive ? 'Racing' : 'Waiting';
            statusElem.style.color = data.raceActive ? '#00FF00' : '#FFFF00';
        }
        
        if (playerListElem && data.players) {
            playerListElem.innerHTML = '';
            data.players.forEach(player => {
                const div = document.createElement('div');
                div.className = 'player-item';
                div.textContent = `${player.slice(0, 8)}...`;
                playerListElem.appendChild(div);
            });
        }
    }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PizzaSkyRaceApp();
});
