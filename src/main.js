import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { ethers } from 'ethers';
import { startAuthentication } from '@simplewebauthn/browser';
import QRCode from 'qrcode';
import { WalletManager } from './wallet';
import { GameScene } from './game/GameScene';

const SERVER_PORT = 3000;

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
            gravity: { y: 0 },
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
        this.pseudo = 'Player';  // player's chosen name
        this.timeRemaining = 60;
        this.currentHeight = 0;
        this.raceActive = false; // true only while race is running

        this.init();
    }

    async init() {
        this.walletManager = new WalletManager();

        let wsUrl;
        if (window.location.hostname === 'localhost') {
            wsUrl = `http://localhost:${SERVER_PORT}`;
        } else {
            wsUrl = window.location.origin;
        }
        console.log('🔌 Connecting to:', wsUrl);
        this.socket = io(wsUrl);

        this.setupSocketListeners();
        this.setupUI();

        await this.generateQRCode();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected - ID:', this.socket.id);
            this.updateAdminDashboard?.();
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

        this.socket.on('joinedRace', (data) => {
            if (!this.currentRaceId) this.currentRaceId = data.raceId;
            this.updateStatus(`En attente du départ... (${data.playerCount} joueurs)`);
        });

        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
            this.updateStatus(`${data.playerCount} joueurs dans la course`);
        });

        this.socket.on('heightUpdate', (data) => {
            // Don't update leaderboard display during an active race
            if (!this.raceActive) {
                this.updateLeaderboard(data.leaderboard);
            }
        });

        this.socket.on('raceEnded', (data) => {
            this.endGame(data);
        });

        this.socket.on('timer', (data) => {
            this.timeRemaining = data.timeRemaining;
            this.updateTimer(this.timeRemaining);
        });

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

        if ('ontouchstart' in window && jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.jump();
            });
        }

        // These panels start hidden; they're revealed at the right moments
        const timerWrapper = document.getElementById('timer-wrapper');
        if (timerWrapper) timerWrapper.style.display = 'none';

        const leaderboardPanel = document.getElementById('leaderboard-panel');
        if (leaderboardPanel) leaderboardPanel.style.display = 'none';
    }

    async generateQRCode() {
        const qrContainer = document.getElementById('qr-code');
        let url = window.location.href;
        try {
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
            console.warn('Could not get LAN URL for QR:', e);
        }
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(url, {
                width: 256,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' }
            });
            qrContainer.innerHTML = `<img src="${qrCodeDataUrl}" alt="QR Code" />`;
        } catch (error) {
            console.error('Failed to generate QR code:', error);
        }
    }

    async joinRace() {
        try {
            // Read pseudo from input field
            const pseudoInput = document.getElementById('pseudo-input');
            const rawPseudo = pseudoInput?.value?.trim();
            this.pseudo = (rawPseudo && rawPseudo.length > 0) ? rawPseudo : 'Player';

            if (this.pseudo.length > 16) {
                this.updateStatus('❌ Pseudo trop long (max 16 caractères)');
                return;
            }

            this.updateStatus('Création du compte...');

            if (!this.socket) {
                const wsUrl = window.location.hostname === 'localhost'
                    ? `http://localhost:${SERVER_PORT}`
                    : window.location.origin;
                this.socket = io(wsUrl);
                this.setupSocketListeners();
                await new Promise((resolve) => {
                    this.socket.once('connect', resolve);
                });
            }

            const account = await this.walletManager.createSmartAccount();
            this.playerId = account.address;

            this.updateStatus('Création de la clé de session...');
            await this.walletManager.createSessionKey(90);

            this.updateStatus('Rejoindre la course...');

            // Send pseudo alongside player ID so server and other clients know the name
            this.socket.emit('joinRace', {
                playerId: this.playerId,
                address: account.address,
                pseudo: this.pseudo
            });

            document.getElementById('wallet-info').textContent =
                `${this.pseudo} — ${account.address.slice(0, 6)}...${account.address.slice(-4)}`;

            // Swap screens
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');

            this.game = new Phaser.Game(config);
            this.game.registry.set('app', this);

        } catch (error) {
            console.error('Failed to join race:', error);
            this.updateStatus('❌ Échec de la connexion. Réessayez.');
        }
    }

    startGame() {
        this.raceActive = true;
        this.updateStatus('🏁 La course commence ! GO!');

        // Show ONLY the timer during the race
        const timerWrapper = document.getElementById('timer-wrapper');
        if (timerWrapper) timerWrapper.style.display = 'block';

        // Keep leaderboard panel hidden during race
        const leaderboardPanel = document.getElementById('leaderboard-panel');
        if (leaderboardPanel) leaderboardPanel.style.display = 'none';

        // Tell the Phaser scene to start
        const scene = this.game.scene.getScene('GameScene');
        if (scene && scene.startRace) {
            scene.startRace();
        }

        this.heightUpdateInterval = setInterval(() => {
            this.sendHeightUpdate();
        }, 500);

        this._lastPositionSend = 0;
    }

    sendPlayerPosition(posData) {
        if (!this.socket || !this.currentRaceId || !this.playerId) return;

        const now = Date.now();
        if (now - (this._lastPositionSend || 0) < 100) return;
        this._lastPositionSend = now;

        this.socket.emit('playerPosition', {
            raceId: this.currentRaceId,
            playerId: this.playerId,
            pseudo: this.pseudo,
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
        if (scene && scene.jump) scene.jump();
    }

    async sendHeightUpdate() {
        if (!this.currentRaceId || !this.playerId) return;
        try {
            this.socket.emit('updateHeight', {
                raceId: this.currentRaceId,
                playerId: this.playerId,
                pseudo: this.pseudo,
                height: this.currentHeight
            });

            if (this.currentHeight % 100 === 0) {
                await this.walletManager.updateHeightOnChain(this.currentRaceId, this.currentHeight);
            }
        } catch (error) {
            console.error('Failed to update height:', error);
        }
    }

    updateHeight(height) {
        // Store internally — no DOM update during race
        this.currentHeight = height;
    }

    updateTimer(seconds) {
        const el = document.getElementById('timer');
        if (el) el.textContent = seconds;
    }

    updateLeaderboard(leaderboard) {
        const list = document.getElementById('leaderboard-list');
        if (!list) return;
        list.innerHTML = '';

        leaderboard.slice(0, 10).forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = 'player-entry';
            const isMe = entry.playerId === this.playerId;
            const displayName = entry.pseudo || entry.playerId.slice(0, 6);
            div.innerHTML = `
                ${index + 1}. ${isMe ? '👤 ' : '🍕 '}
                <strong>${displayName}</strong>
                <span style="float:right">${Math.floor(entry.height)} pts</span>
            `;
            if (isMe) {
                div.style.background = 'rgba(255, 215, 0, 0.3)';
                div.style.fontWeight = 'bold';
            }
            list.appendChild(div);
        });
    }

    updateStatus(message) {
        const el = document.getElementById('status');
        if (el) el.textContent = message;
    }

    async endGame(data) {
        this.raceActive = false;

        if (this.heightUpdateInterval) clearInterval(this.heightUpdateInterval);

        const isWinner = data.winner === this.playerId;
        const winnerName = data.winnerPseudo || data.winner?.slice(0, 6) || '???';

        if (isWinner) {
            this.updateStatus('🎉 TU AS GAGNÉ ! Golden Slice NFT en cours de mint...');
            try {
                await this.walletManager.mintGoldenSlice(this.currentRaceId, this.currentHeight);
            } catch (error) {
                console.error('Failed to mint NFT:', error);
            }
        } else {
            this.updateStatus(`Course terminée ! Gagnant : ${winnerName}`);
        }

        // Hide timer
        const timerWrapper = document.getElementById('timer-wrapper');
        if (timerWrapper) timerWrapper.style.display = 'none';

        // Show leaderboard panel with smooth fade-in
        // ✅ Fix: use setTimeout(0) so the browser paints display:block before the
        //    opacity transition starts (avoids rAF batching both frames together)
        const leaderboardPanel = document.getElementById('leaderboard-panel');
        if (leaderboardPanel) {
            leaderboardPanel.style.opacity = '0';
            leaderboardPanel.style.transform = 'translateY(20px)';
            leaderboardPanel.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            leaderboardPanel.style.display = 'block';
            setTimeout(() => {
                leaderboardPanel.style.opacity = '1';
                leaderboardPanel.style.transform = 'translateY(0)';
            }, 0);
        }

        // Show final score
        const heightDisplay = document.getElementById('height');
        if (heightDisplay) {
            heightDisplay.style.display = 'block';
            heightDisplay.textContent = `Votre score : ${Math.floor(this.currentHeight)}`;
        }

        // Populate final leaderboard
        this.updateLeaderboard(data.finalLeaderboard);

        // Offer replay
        setTimeout(() => {
            if (confirm('Course terminée ! Rejouer ?')) {
                window.location.reload();Ò
            }
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PizzaSkyRaceApp();
});