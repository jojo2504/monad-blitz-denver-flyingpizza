const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');
require('dotenv').config();

/** Get first non-internal IPv4 address for LAN access (e.g. for QR code on phone) */
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from Vite build in production
const path = require('path');
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
    app.use(express.static(path.join(__dirname, '../dist')));
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Game State
const gameState = {
    currentRaceId: 0,
    races: new Map(),
    players: new Map()
};

class Race {
    constructor(raceId) {
        this.raceId = raceId;
        this.startTime = Date.now();
        this.duration = 60000; // 60 seconds
        this.endTime = this.startTime + this.duration;
        this.players = new Map();
        this.isActive = true;
        this.winner = null;
        this.timerInterval = null;
        
        this.startTimer();
    }
    
    addPlayer(playerId, socketId) {
        this.players.set(playerId, {
            playerId,
            socketId,
            height: 0,
            lastUpdate: Date.now(),
            powerUps: []
        });
    }
    
    updatePlayerHeight(playerId, height) {
        const player = this.players.get(playerId);
        if (player) {
            player.height = height;
            player.lastUpdate = Date.now();
        }
    }
    
    getLeaderboard() {
        const leaderboard = Array.from(this.players.values())
            .sort((a, b) => b.height - a.height)
            .map(player => ({
                playerId: player.playerId,
                height: player.height
            }));
        return leaderboard;
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            const timeElapsed = Date.now() - this.startTime;
            const timeRemaining = Math.max(0, Math.ceil((this.duration - timeElapsed) / 1000));
            
            // Broadcast timer to all players
            io.to(`race-${this.raceId}`).emit('timer', { timeRemaining });
            
            // End race when time is up
            if (timeRemaining === 0 && this.isActive) {
                this.endRace();
            }
        }, 1000);
    }
    
    endRace() {
        this.isActive = false;
        clearInterval(this.timerInterval);
        
        const leaderboard = this.getLeaderboard();
        this.winner = leaderboard[0]?.playerId || null;
        
        // Broadcast race end
        io.to(`race-${this.raceId}`).emit('raceEnded', {
            raceId: this.raceId,
            winner: this.winner,
            finalLeaderboard: leaderboard
        });
        
        console.log(`Race ${this.raceId} ended. Winner:`, this.winner);
    }
}

// Socket.IO Connection Handler
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    // Join Race
    socket.on('joinRace', (data) => {
        const { playerId, address } = data;
        
        // Get or create current race
        let currentRace = gameState.races.get(gameState.currentRaceId);
        
        if (!currentRace || !currentRace.isActive || currentRace.players.size >= 50) {
            // Start new race
            gameState.currentRaceId++;
            currentRace = new Race(gameState.currentRaceId);
            gameState.races.set(gameState.currentRaceId, currentRace);
            
            console.log(`Started new race: ${gameState.currentRaceId}`);
            
            // Broadcast race started
            io.emit('raceStarted', {
                raceId: gameState.currentRaceId,
                startTime: currentRace.startTime
            });
        }
        
        // Add player to race
        currentRace.addPlayer(playerId, socket.id);
        gameState.players.set(socket.id, {
            playerId,
            address,
            raceId: currentRace.raceId
        });
        
        // Join socket room
        socket.join(`race-${currentRace.raceId}`);
        
        // Notify player they joined
        socket.emit('joinedRace', {
            raceId: currentRace.raceId,
            playerCount: currentRace.players.size
        });
        
        // Broadcast to all players in race
        io.to(`race-${currentRace.raceId}`).emit('playerJoined', {
            playerId,
            playerCount: currentRace.players.size
        });
        
        console.log(`Player ${playerId} joined race ${currentRace.raceId}`);
    });
    
    // Update Height
    socket.on('updateHeight', (data) => {
        const { raceId, playerId, height } = data;
        const race = gameState.races.get(raceId);
        
        if (race && race.isActive) {
            race.updatePlayerHeight(playerId, height);
            
            // Broadcast updated leaderboard
            const leaderboard = race.getLeaderboard();
            io.to(`race-${raceId}`).emit('heightUpdate', {
                playerId,
                height,
                leaderboard
            });
        }
    });
    
    // Apply Power-Up
    socket.on('applyPowerUp', (data) => {
        const { raceId, playerId, powerUpType, targetPlayerId } = data;
        const race = gameState.races.get(raceId);
        
        if (race && race.isActive) {
            io.to(`race-${raceId}`).emit('powerUpApplied', {
                playerId,
                targetPlayerId,
                powerUpType
            });
        }
    });
    
    // Disconnect
    socket.on('disconnect', () => {
        const playerData = gameState.players.get(socket.id);
        
        if (playerData) {
            const race = gameState.races.get(playerData.raceId);
            if (race) {
                race.players.delete(playerData.playerId);
                
                io.to(`race-${playerData.raceId}`).emit('playerLeft', {
                    playerId: playerData.playerId,
                    playerCount: race.players.size
                });
            }
            
            gameState.players.delete(socket.id);
        }
        
        console.log('Player disconnected:', socket.id);
    });
});

// REST API Endpoints
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// URLs for joining from phone on same WiFi (LAN IP so QR code works) or Railway URL in production
app.get('/api/host-url', (req, res) => {
    if (isProduction && process.env.RAILWAY_PUBLIC_DOMAIN) {
        // In production on Railway, use the public domain
        const protocol = process.env.RAILWAY_STATIC_URL ? 'https' : 'http';
        const domain = process.env.RAILWAY_PUBLIC_DOMAIN || req.headers.host;
        const appUrl = `${protocol}://${domain}`;
        const wsUrl = `wss://${domain}`;
        res.json({ appUrl, wsUrl });
    } else {
        // In development, use LAN IP
        const host = getLocalIP();
        const port = process.env.PORT || 3000;
        const appUrl = `http://${host}:${port}`;
        const wsUrl = `ws://${host}:${process.env.PORT || 3001}`;
        res.json({ appUrl, wsUrl });
    }
});

app.get('/api/races/current', (req, res) => {
    const currentRace = gameState.races.get(gameState.currentRaceId);
    
    if (currentRace) {
        res.json({
            raceId: currentRace.raceId,
            playerCount: currentRace.players.size,
            isActive: currentRace.isActive,
            startTime: currentRace.startTime,
            endTime: currentRace.endTime
        });
    } else {
        res.json({ message: 'No active race' });
    }
});

app.get('/api/races/:raceId/leaderboard', (req, res) => {
    const raceId = parseInt(req.params.raceId);
    const race = gameState.races.get(raceId);
    
    if (race) {
        res.json({
            raceId: race.raceId,
            leaderboard: race.getLeaderboard(),
            isActive: race.isActive,
            winner: race.winner
        });
    } else {
        res.status(404).json({ error: 'Race not found' });
    }
});

// Admin endpoint to start a new race manually
app.post('/api/admin/race/start', (req, res) => {
    gameState.currentRaceId++;
    const newRace = new Race(gameState.currentRaceId);
    gameState.races.set(gameState.currentRaceId, newRace);
    
    io.emit('raceStarted', {
        raceId: gameState.currentRaceId,
        startTime: newRace.startTime
    });
    
    res.json({
        raceId: gameState.currentRaceId,
        message: 'New race started'
    });
});

// Cleanup old races periodically
setInterval(() => {
    const now = Date.now();
    const racesToDelete = [];
    
    gameState.races.forEach((race, raceId) => {
        // Delete races older than 10 minutes
        if (now - race.endTime > 600000) {
            racesToDelete.push(raceId);
        }
    });
    
    racesToDelete.forEach(raceId => {
        gameState.races.delete(raceId);
        console.log(`Cleaned up race ${raceId}`);
    });
}, 300000); // Every 5 minutes

// Serve frontend for all non-API routes in production
if (isProduction) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// Start server
// Railway uses PORT env var, fallback to WEBSOCKET_PORT for local dev
const PORT = process.env.PORT || process.env.WEBSOCKET_PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
    const lan = getLocalIP();
    console.log(`🍕 Pizza Sky Race Server running on port ${PORT}`);
    if (isProduction && process.env.RAILWAY_PUBLIC_DOMAIN) {
        console.log(`🌐 Public URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    } else {
        console.log(`WebSocket: ws://localhost:${PORT}`);
        console.log(`HTTP API: http://localhost:${PORT}`);
        if (lan !== 'localhost') {
            console.log(`📱 Join from phone: http://${lan}:${PORT} (scan QR on game page)`);
        }
    }
});
