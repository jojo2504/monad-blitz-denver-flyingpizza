import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.platforms = null;
        this.score = 0;
        this.gameSpeed = 300;
        this.jumpPower = -600;
        this.isJumping = false;
        this.jumpsRemaining = 3;
        this.hasPowerUp = false;
        this.powerUpEndTime = 0;
        this.heavyDebuffEndTime = 0;
        this.slowdownStacks = 0;
        this.platformTimer = 0;
        this.powerUpTimer = 0;
        this.clouds = [];
        this.gameStarted = false;  // Wait for admin to start
        this.raceStarted = false;  // Race hasn't started yet
        this.isDead = false;
        this.spectating = false;
        this.gameStartTime = 0;
        
        // Multiplayer: other players' ghosts
        this.otherPlayers = {};  // { playerId: { sprite, nameText, scoreText } }
        this.ghostColors = [0xFF69B4, 0x00BFFF, 0x32CD32, 0xFFD700, 0xFF6347, 0x9370DB, 0x00CED1, 0xFF8C00];
        this.ghostColorIndex = 0;
    }
    
    preload() {
        // Load pizza image from assets (Vite's publicDir copies to root of dist)
        this.load.image('pizza', '/pizza.png');
        this.load.image('pineapple', '/pineapple-bg.png');
        this.load.image('chef', '/chef.png');
    }
    
    create() {
        // Create sprites AFTER images are loaded
        this.createSprites();
        
        // Sky background
        this.cameras.main.setBackgroundColor('#87CEEB');
        
        // Add moving clouds for sky effect
        this.createClouds();
        
        // Create ground/platforms group
        this.platforms = this.physics.add.staticGroup();
        
        // Create player (pizza delivery guy) - fixed position on left side, higher up
        this.player = this.physics.add.sprite(150, 300, 'chef');
        this.player.setScale(0.25); // Adjust size for the pixel art chef
        this.player.setBounce(0);
        this.player.setCollideWorldBounds(false);
        // No gravity until race starts
        this.player.body.setGravityY(0);
        this.player.body.setVelocityX(0);
        this.player.body.setVelocityY(0);
        
        // Collisions
        this.physics.add.collider(this.player, this.platforms, () => {
            this.onLanding();
        }, null, this);
        
        // Input - Space, Up Arrow, or Touch to jump
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Touch/Click input
        this.input.on('pointerdown', () => {
            console.log('👆 CLICK/TAP DETECTED - Attempting jump');
            this.jump();
        });
        
        // Power-ups group
        this.powerUps = this.physics.add.group();
        this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);
        
        // Don't start game automatically - wait for admin
        this.gameStarted = false;
        this.raceStarted = false;
        this.isDead = false;
        this.spectating = false;
        this.gameStartTime = null;  // Set at startRace()

        // Show waiting message with pseudo
        const app = this.registry.get('app');
        const pseudo = app?.pseudo || 'Player';

        this.waitingText = this.add.text(400, 280, `Ready, ${pseudo}!`, {
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#FFFF00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        this.waitingSubText = this.add.text(400, 330, 'Waiting for race to start...', {
            fontSize: '24px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        // Jump counter UI
        this.jumpCounterText = this.add.text(400, 50, 'Jumps: 3 ✅', {
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        // Multiplayer: other players' ghosts
        this.createGhostTextures();
        this.otherPlayers = {};
        this.ghostColors = [0xFF69B4, 0x00BFFF, 0x32CD32, 0xFFD700, 0xFF6347, 0x9370DB, 0x00CED1, 0xFF8C00];
        this.ghostColorIndex = 0;

        console.log('🏁 Game scene created — waiting for race start');
    }

    update(time, delta) {
        if (!this.raceStarted) return;

        if (this.isDead) return;

        // Tutorial period: reduced gravity for first 5 seconds after startRace()
        if (this.gameStartTime !== null) {
            const elapsedTime = Date.now() - this.gameStartTime;
            if (elapsedTime > 5000 && this.player.body.gravity.y <= 250) {
                this.player.body.setGravityY(900);
                console.log('⚡ Tutorial over — normal gravity');

                const gravityText = this.add.text(400, 200, 'Gravity Increased!', {
                    fontSize: '32px',
                    fontStyle: 'bold',
                    color: '#FF9900',
                    stroke: '#000000',
                    strokeThickness: 4
                }).setOrigin(0.5).setScrollFactor(0);

                this.tweens.add({
                    targets: gravityText,
                    alpha: 0,
                    y: 150,
                    duration: 2000,
                    onComplete: () => gravityText.destroy()
                });
            }
        }

        // Game over: fell off screen
        if (this.player.y > 650) {
            this.die();
            return;
        }

        // Debug log every second
        if (!this._debugFrameCount) this._debugFrameCount = 0;
        this._debugFrameCount++;
        if (this._debugFrameCount % 60 === 0) {
            console.log('📊 Player State:', {
                position: { x: Math.floor(this.player.x), y: Math.floor(this.player.y) },
                velocity: { x: Math.floor(this.player.body.velocity.x), y: Math.floor(this.player.body.velocity.y) },
                onGround: this.player.body.touching.down || this.player.body.blocked.down,
                score: Math.floor(this.score),
                gameSpeed: this.gameSpeed
            });
        }

        // Keyboard jump
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.jump();
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.jump();

        // Auto-scroll: move platforms left
        this.platforms.getChildren().forEach(platform => {
            platform.x -= this.gameSpeed * (delta / 1000);
            if (platform.x < -100) platform.destroy();
        });

        this.powerUps.getChildren().forEach(powerUp => {
            powerUp.x -= this.gameSpeed * (delta / 1000);
            if (powerUp.x < -50) powerUp.destroy();
        });

        // Move clouds
        this.clouds.forEach(cloud => {
            cloud.x -= 50 * (delta / 1000);
            if (cloud.x < -100) cloud.x = 900;
        });

        // Spawn platforms
        this.platformTimer += delta;
        const platformInterval = Math.max(650, 1100 - Math.floor(this.score * 1.2));
        if (this.platformTimer > platformInterval) {
            this.spawnPlatform();
            this.platformTimer = 0;
        }

        // Spawn power-ups
        this.powerUpTimer += delta;
        const powerUpInterval = Math.max(400, 800 - Math.floor(this.score * 0.8));
        if (this.powerUpTimer > powerUpInterval) {
            this.spawnPowerUp();
            this.powerUpTimer = 0;
        }

        // Jump counter UI - always show actual jumpsRemaining value
        if (this.jumpsRemaining === 3) {
            this.jumpCounterText.setText('Jumps: 3 ✅');
            this.jumpCounterText.setColor('#00FF00');
        } else if (this.jumpsRemaining === 2) {
            this.jumpCounterText.setText('Jumps: 2 🟢');
            this.jumpCounterText.setColor('#00FF00');
        } else if (this.jumpsRemaining === 1) {
            this.jumpCounterText.setText('Jumps: 1 ⚠️');
            this.jumpCounterText.setColor('#FFFF00');
        } else {
            this.jumpCounterText.setText('Jumps: 0 ❌');
            this.jumpCounterText.setColor('#FF0000');
        }

        // Update score
        this.score += this.gameSpeed * (delta / 1000) * 0.1;

        const app = this.registry.get('app');
        if (app) {
            app.updateHeight(Math.floor(this.score));
            app.sendPlayerPosition({
                x: this.player.x,
                y: this.player.y,
                score: Math.floor(this.score),
                velocityY: this.player.body.velocity.y,
                alive: !this.isDead
            });
        }

        // Gradually increase difficulty (respects cumulative slowdown)
        if (this.raceStarted && this.score > 50) {
            this.gameSpeed = Math.min(620, 300 + (this.score / 4.5));
            const baseGravity = 900 + (this.slowdownStacks * 100);
            const targetGravity = Math.min(1500, baseGravity + (this.score * 2.2));
            if (this.player?.body?.gravity?.y < targetGravity) {
                this.player.body.setGravityY(targetGravity);
            }
        }
    }

    startRace() {
        this.gameStarted = true;
        this.raceStarted = true;

        // ✅ Tutorial timer starts NOW at race start, not on first jump
        this.gameStartTime = Date.now();

        // Reduced gravity for tutorial period (5 seconds)
        this.player.body.setGravityY(250);

        if (this.waitingText) this.waitingText.destroy();
        if (this.waitingSubText) this.waitingSubText.destroy();

        // Show "GO!" message
        const goText = this.add.text(400, 300, 'GO!', {
            fontSize: '64px',
            fontStyle: 'bold',
            color: '#00FF00',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.tweens.add({
            targets: goText,
            scale: 2,
            alpha: 0,
            duration: 1000,
            onComplete: () => goText.destroy()
        });

        console.log('🏁 Race started! Tutorial gravity active for 5s');
    }

    jump() {
        if (this.isDead) return;
        if (!this.player || !this.player.body) return;

        const onGround = this.player.body.touching.down || this.player.body.blocked.down;
        
        // Apply cumulative slowdown: each stack reduces jump power by 50
        const effectiveJumpPower = this.jumpPower + (this.slowdownStacks * 50);

        if (onGround) {
            this.player.setVelocityY(effectiveJumpPower);
            this.isJumping = true;
            this.jumpsRemaining = 2;
        } else if (this.jumpsRemaining > 0) {
            this.player.setVelocityY(effectiveJumpPower * 0.85);
            this.jumpsRemaining--;
        }
    }

    onLanding() {
        if (this.player && this.player.body && this.player.body.touching.down) {
            this.isJumping = false;
            this.jumpsRemaining = 3;
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        console.log('💀 You died! Score:', Math.floor(this.score));

        this.player.setVisible(false);

        const app = this.registry.get('app');
        const pseudo = app?.pseudo || 'Player';

        const deathText = this.add.text(400, 250, `${pseudo} fell!`, {
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#FF0000',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        const scoreText = this.add.text(400, 320, `Final Score: ${Math.floor(this.score)}`, {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(400, 380, 'Spectating best player...', {
            fontSize: '24px',
            color: '#FFFF00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.spectating = true;

        if (app && app.socket) {
            console.log('📡 Emitting playerDied event:', {
                raceId: app.currentRaceId,
                playerId: app.playerId,
                finalScore: Math.floor(this.score)
            });
            app.socket.emit('playerDied', {
                raceId: app.currentRaceId,
                playerId: app.playerId,
                finalScore: Math.floor(this.score)
            });
        }
    }

    gameOver() {
        console.log('💀 Game Over! Score:', Math.floor(this.score));
        this.scene.restart();
    }

    createGhostTextures() {
        this.ghostColors.forEach((color, i) => {
            const key = `ghost_${i}`;
            if (this.textures.exists(key)) return;
            const g = this.add.graphics();
            g.fillStyle(color, 0.6);
            g.fillCircle(16, 16, 14);
            g.fillStyle(0xFFFFFF, 0.8);
            g.fillCircle(16, 12, 3);
            g.lineStyle(2, 0x000000, 0.4);
            g.strokeCircle(16, 16, 14);
            g.generateTexture(key, 32, 32);
            g.destroy();
        });
    }

    updateOtherPlayers(playersData) {
        if (!playersData || !this.raceStarted) return;

        const app = this.registry.get('app');
        const myId = app?.playerId;

        playersData.forEach(p => {
            if (p.playerId === myId) return;

            if (!this.otherPlayers[p.playerId]) {
                const colorIdx = this.ghostColorIndex % this.ghostColors.length;
                this.ghostColorIndex++;

                const sprite = this.add.sprite(p.x || 150, p.y || 300, `ghost_${colorIdx}`);
                sprite.setAlpha(0.5);
                sprite.setDepth(50);

                const nameText = this.add.text(p.x || 150, (p.y || 300) - 24, p.pseudo || p.playerId.slice(0, 6), {
                    fontSize: '11px',
                    fontStyle: 'bold',
                    color: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 2
                }).setOrigin(0.5).setDepth(51).setAlpha(0.7);

                const scoreText = this.add.text(p.x || 150, (p.y || 300) - 38, `${p.score || 0}`, {
                    fontSize: '10px',
                    fontStyle: 'bold',
                    color: '#FACC15',
                    stroke: '#000000',
                    strokeThickness: 2
                }).setOrigin(0.5).setDepth(51).setAlpha(0.7);

                this.otherPlayers[p.playerId] = { sprite, nameText, scoreText, colorIdx };
            }

            const ghost = this.otherPlayers[p.playerId];

            if (!p.alive) {
                ghost.sprite.setAlpha(0.2);
                ghost.sprite.setPosition(p.x || 150, 560);
                ghost.nameText.setPosition(p.x || 150, 536);
                ghost.scoreText.setPosition(p.x || 150, 522);
                ghost.nameText.setAlpha(0.3);
                ghost.scoreText.setAlpha(0.3);
                return;
            }

            const targetX = p.x || 150;
            const targetY = p.y || 300;
            ghost.sprite.x += (targetX - ghost.sprite.x) * 0.3;
            ghost.sprite.y += (targetY - ghost.sprite.y) * 0.3;
            ghost.nameText.setPosition(ghost.sprite.x, ghost.sprite.y - 24);
            ghost.scoreText.setText(`${p.score || 0}`);
            ghost.scoreText.setPosition(ghost.sprite.x, ghost.sprite.y - 38);
        });

        const activeIds = new Set(playersData.map(p => p.playerId));
        Object.keys(this.otherPlayers).forEach(id => {
            if (!activeIds.has(id)) {
                const ghost = this.otherPlayers[id];
                ghost.sprite.destroy();
                ghost.nameText.destroy();
                ghost.scoreText.destroy();
                delete this.otherPlayers[id];
            }
        });
    }

    createClouds() {
        for (let i = 0; i < 5; i++) {
            const cloud = this.add.graphics();
            cloud.fillStyle(0xFFFFFF, 0.7);
            cloud.fillCircle(0, 0, 30);
            cloud.fillCircle(25, 0, 35);
            cloud.fillCircle(50, 0, 30);
            cloud.x = Phaser.Math.Between(0, 800);
            cloud.y = Phaser.Math.Between(50, 200);
            this.clouds.push(cloud);
        }
    }

    createSprites() {
        // Create fallback player texture if chef image didn't load
        if (!this.textures.exists('chef')) {
            const playerGraphics = this.add.graphics();
            playerGraphics.fillStyle(0xFF6347, 1);
            playerGraphics.fillCircle(32, 32, 32);
            playerGraphics.fillStyle(0xFFFFFF, 1);
            playerGraphics.fillCircle(32, 24, 8);
            playerGraphics.generateTexture('chef', 64, 64);
            playerGraphics.destroy();
        }
        
        // Platform (cloud/pizza box) - invisible platform
        const platformGraphics = this.add.graphics();
        platformGraphics.fillStyle(0xFFFFFF, 0); // Alpha = 0 pour invisible
        platformGraphics.fillRoundedRect(0, 0, 150, 30, 15);
        platformGraphics.generateTexture('platform', 150, 30);
        platformGraphics.destroy();
    }

    // createInitialGround() — REMOVED: platforms spawn dynamically

    spawnPlatform() {
        const x = 850;

        const gapChance = Math.min(0.35, 0.10 + (this.score / 800));
        if (Math.random() < gapChance) return;

        const numPlatforms = Math.random() > 0.85 ? 2 : 1;

        for (let i = 0; i < numPlatforms; i++) {
            const y = Phaser.Math.Between(320, 520);
            const platform = this.platforms.create(x + (i * 200), y, 'platform');
            const scale = Math.max(0.55, 1 - (this.score / 900));
            platform.setScale(scale, 1).refreshBody();
        }
    }

    spawnPowerUp() {
        const x = 850;
        const isCluster = Math.random() > 0.9;
        const numPowerUps = isCluster ? Phaser.Math.Between(2, 3) : 1;

        for (let i = 0; i < numPowerUps; i++) {
            const y = Phaser.Math.Between(200, 450);
            // 5 pizzas for every 1 pineapple (16.67% chance of pineapple)
            const pineappleChance = 0.1667;
            const isPepperoni = Math.random() > pineappleChance;
            const texture = isPepperoni ? 'pizza' : 'pineapple';
            const powerUp = this.powerUps.create(x + (i * 80), y, texture);
            powerUp.setScale(0.3);  // Make pizza smaller (30% size)
            powerUp.setData('type', isPepperoni ? 'boost' : 'glue');
            powerUp.setData('points', isPepperoni ? 6 : -12);

            this.tweens.add({
                targets: powerUp,
                y: powerUp.y + 10,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });
        }
    }

    collectPowerUp(player, powerUp) {
        const type = powerUp.getData('type');
        const points = powerUp.getData('points');

        this.score += points;

        if (type === 'boost') {
            this.jumpsRemaining = Math.min(this.jumpsRemaining + 2, 3);
            player.setTint(0x00FF00);

            const jumpText = this.add.text(powerUp.x, powerUp.y, '+2 Jumps!', {
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#00FF00'
            });
            this.tweens.add({
                targets: jumpText,
                y: jumpText.y - 50,
                alpha: 0,
                duration: 1000,
                onComplete: () => jumpText.destroy()
            });

            this.time.delayedCall(500, () => {
                if (player.tintTopLeft) player.clearTint();
            });

        } else if (type === 'glue') {
            // Cumulative slowdown: each bad pizza permanently increases slowdown
            this.slowdownStacks++;
            this.jumpsRemaining = Math.min(this.jumpsRemaining + 1, 3);
            
            // Each stack increases gravity by 100
            const newGravity = 900 + (this.slowdownStacks * 100);
            if (this.player?.body) this.player.body.setGravityY(newGravity);

            const jumpText = this.add.text(powerUp.x, powerUp.y, '+1 Jump (Slowed)', {
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#FF4444',
                align: 'center'
            });
            this.tweens.add({
                targets: jumpText,
                y: jumpText.y - 50,
                alpha: 0,
                duration: 1000,
                onComplete: () => jumpText.destroy()
            });
        }

        powerUp.destroy();
    }
}
