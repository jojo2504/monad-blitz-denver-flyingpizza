import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.platforms = null;
        this.score = 0;
        this.gameSpeed = 300;
        this.jumpPower = -400;
        this.isJumping = false;
        this.jumpsRemaining = 3;  // Start with 3 jumps
        this.hasPowerUp = false;
        this.powerUpEndTime = 0;
        this.platformTimer = 0;
        this.powerUpTimer = 0;
        this.clouds = [];
        this.gameStarted = true;
        this.isDead = false;
        this.spectating = false;
        this.gameStartTime = 0;
    }
    
    preload() {
        // Create simple pizza-themed sprites
        this.createSprites();
    }
    
    create() {
        // Sky background
        this.cameras.main.setBackgroundColor('#87CEEB');
        
        // Add moving clouds for sky effect
        this.createClouds();
        
        // Create ground/platforms group
        this.platforms = this.physics.add.staticGroup();
        
        // Create initial platforms
        this.createInitialGround();
        
        // Create player (pizza delivery guy) - fixed position on left side, higher up
        this.player = this.physics.add.sprite(150, 300, 'player');
        this.player.setBounce(0);
        this.player.setCollideWorldBounds(false);
        // Start with very low gravity for easier gameplay
        this.player.body.setGravityY(200); // Very low gravity at start
        
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
        
        this.gameStarted = true;
        this.isDead = false;
        this.spectating = false;
        
        // Jump counter UI
        this.jumpCounterText = this.add.text(400, 50, 'Jumps: 1', {
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
        
        // Track when game started for tutorial period (null until first jump)
        this.gameStartTime = null;
        
        console.log('🏁 Game started! Jump with SPACE to survive!');
    }
    
    update(time, delta) {
        // If dead, don't process player controls
        if (this.isDead) {
            if (this.spectating) {
                // Show spectating message
                return;
            }
            return;
        }
        
        // Tutorial period: easier gravity for first 5 seconds AFTER first jump
        if (this.gameStartTime !== null) {
            const elapsedTime = Date.now() - this.gameStartTime;
            if (elapsedTime > 5000 && this.player.body.gravity.y === 200) {
                // Transition to normal gravity after 5 seconds
                this.player.body.setGravityY(500);  // Reduced from 800 to 500
                console.log('⚡ Gravity increased! Tutorial period over.');
                
                // Show message to player
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
        
        // Check for game over (fell off screen)
        if (this.player.y > 650) {
            this.die();
            return;
        }
        
        // Log player physics state every 60 frames (1 second at 60fps)
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
        
        // Handle jump input - Check both JustDown for keyboard and keep the pointerdown for touch
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            console.log('⌨️ SPACE KEY PRESSED - Attempting jump');
            this.jump();
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            console.log('⌨️ UP ARROW PRESSED - Attempting jump');
            this.jump();
        }
        
        // Auto-scroll: Move platforms and power-ups to the left
        this.platforms.getChildren().forEach(platform => {
            platform.x -= this.gameSpeed * (delta / 1000);
            
            // Remove platforms that are off-screen
            if (platform.x < -100) {
                platform.destroy();
            }
        });
        
        this.powerUps.getChildren().forEach(powerUp => {
            powerUp.x -= this.gameSpeed * (delta / 1000);
            
            // Remove power-ups that are off-screen
            if (powerUp.x < -50) {
                powerUp.destroy();
            }
        });
        
        // Move clouds
        this.clouds.forEach(cloud => {
            cloud.x -= 50 * (delta / 1000);
            if (cloud.x < -100) {
                cloud.x = 900;
            }
        });
        
        // Platform spawning disabled - only 5 initial platforms
        // this.platformTimer += delta;
        // if (this.platformTimer > 800) {
        //     this.spawnPlatform();
        //     this.platformTimer = 0;
        // }
        
        // Spawn power-ups - INCREASED FREQUENCY
        this.powerUpTimer += delta;
        if (this.powerUpTimer > 600) {  // Changed from 1200 to 600 (spawn even faster)
            this.spawnPowerUp();
            this.powerUpTimer = 0;
        }
        
        // Update jump counter UI
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;
        if (onGround) {
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
        
        // Update score (distance traveled)
        this.score += this.gameSpeed * (delta / 1000) * 0.1;
        
        // Update app with current score
        const app = this.registry.get('app');
        if (app) {
            app.updateHeight(Math.floor(this.score));
        }
        
        // Check power-up expiration
        if (this.hasPowerUp && Date.now() > this.powerUpEndTime) {
            this.hasPowerUp = false;
            this.gameSpeed = 300;
            this.player.clearTint();
        }
        
        // Gradually increase difficulty
        if (this.score > 100 && this.gameSpeed < 400) {
            this.gameSpeed = 300 + (this.score / 10);
        }
    }
    
    startRace() {
        this.gameStarted = true;
        if (this.waitingText) {
            this.waitingText.destroy();
        }
        
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
        
        console.log('🏁 Race started! Jump to survive!');
    }
    
    jump() {
        // Can't jump if dead
        if (this.isDead) {
            return;
        }
        
        if (!this.player || !this.player.body) {
            console.log('⚠️ Player body not ready');
            return;
        }
        
        // Start timer on first jump
        if (this.gameStartTime === null) {
            this.gameStartTime = Date.now();
            console.log('⏱️ Timer started on first jump!');
        }
        
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;
        
        console.log('🦘 Jump attempt - onGround:', onGround, 'jumpsRemaining:', this.jumpsRemaining);
        
        if (onGround) {
            // Ground jump - reset to 3 jumps available
            this.player.setVelocityY(this.jumpPower);
            this.isJumping = true;
            this.jumpsRemaining = 2;  // 2 more jumps left after first
            console.log('✅ Ground jump! Jumps remaining:', this.jumpsRemaining);
        } else if (this.jumpsRemaining > 0) {
            // Air jump (2nd or 3rd jump)
            this.player.setVelocityY(this.jumpPower * 0.85);
            this.jumpsRemaining--;
            console.log('✅ Air jump #' + (3 - this.jumpsRemaining) + '! Jumps remaining:', this.jumpsRemaining);
        } else {
            console.log('❌ Cannot jump - no jumps remaining');
        }
    }
    
    onLanding() {
        if (this.player && this.player.body && this.player.body.touching.down) {
            console.log('🔽 LANDED on platform - jumps reset to 3');
            this.isJumping = false;
            this.jumpsRemaining = 3;  // Reset to 3 jumps on landing
        }
    }
    
    die() {
        if (this.isDead) return;
        
        this.isDead = true;
        console.log('💀 You died! Score:', Math.floor(this.score));
        
        // Hide player
        this.player.setVisible(false);
        
        // Show death message
        const deathText = this.add.text(400, 250, 'You Died!', {
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
        
        const spectateText = this.add.text(400, 380, 'Spectating Top Player...', {
            fontSize: '24px',
            color: '#FFFF00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.spectating = true;
        
        // Notify server that player died
        const app = this.registry.get('app');
        if (app && app.socket) {
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
    
    createClouds() {
        // Create background clouds
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
        // Player (pizza delivery person) - orange circle with details
        const playerGraphics = this.add.graphics();
        playerGraphics.fillStyle(0xFF6347, 1);
        playerGraphics.fillCircle(16, 16, 16);
        playerGraphics.fillStyle(0xFFFFFF, 1);
        playerGraphics.fillCircle(16, 12, 4); // Eye
        playerGraphics.generateTexture('player', 32, 32);
        playerGraphics.destroy();
        
        // Platform (cloud/pizza box) - fluffy white platform
        const platformGraphics = this.add.graphics();
        platformGraphics.fillStyle(0xFFFFFF, 1);
        platformGraphics.fillRoundedRect(0, 0, 150, 30, 15);
        platformGraphics.lineStyle(2, 0xCCCCCC, 1);
        platformGraphics.strokeRoundedRect(0, 0, 150, 30, 15);
        platformGraphics.generateTexture('platform', 150, 30);
        platformGraphics.destroy();
        
        // Pepperoni Pizza (good) - red circle with pepperoni
        const pepperoniGraphics = this.add.graphics();
        pepperoniGraphics.fillStyle(0xFF6347, 1);
        pepperoniGraphics.fillCircle(16, 16, 16);
        pepperoniGraphics.fillStyle(0xFF0000, 1);
        pepperoniGraphics.fillCircle(12, 12, 4);
        pepperoniGraphics.fillCircle(20, 12, 4);
        pepperoniGraphics.fillCircle(16, 20, 4);
        pepperoniGraphics.generateTexture('pepperoni', 32, 32);
        pepperoniGraphics.destroy();
        
        // Pineapple Pizza (bad) - yellow with green
        const ananasGraphics = this.add.graphics();
        ananasGraphics.fillStyle(0xFFFF00, 1);
        ananasGraphics.fillCircle(16, 16, 16);
        ananasGraphics.fillStyle(0x00FF00, 1);
        ananasGraphics.fillCircle(16, 10, 5);
        ananasGraphics.lineStyle(3, 0xFF00FF, 1);
        ananasGraphics.strokeCircle(16, 16, 16);
        ananasGraphics.generateTexture('ananas', 32, 32);
        ananasGraphics.destroy();
    }
    
    createInitialGround() {
        // Spawn several initial platforms for player to land on
        for (let i = 0; i < 5; i++) {
            const x = 200 + (i * 150);
            const y = Phaser.Math.Between(350, 450);
            const platform = this.platforms.create(x, y, 'platform');
            platform.setScale(1).refreshBody();
        }
        console.log('🏗️ Created initial platforms:', this.platforms.getChildren().length);
    }
    
    spawnPlatform() {
        const x = 850;
        
        // Spawn 1-2 platforms at different heights for variety
        const numPlatforms = Math.random() > 0.6 ? 2 : 1;
        
        for (let i = 0; i < numPlatforms; i++) {
            const y = Phaser.Math.Between(300, 500);
            const platform = this.platforms.create(x + (i * 200), y, 'platform');
            platform.setScale(1).refreshBody();
        }
    }
    
    spawnPowerUp() {
        const x = 850;
        
        // 50% chance to spawn a cluster of power-ups (increased from 30%)
        const isCluster = Math.random() > 0.5;
        const numPowerUps = isCluster ? Phaser.Math.Between(2, 4) : 1;
        
        for (let i = 0; i < numPowerUps; i++) {
            const y = Phaser.Math.Between(200, 450);
            
            // 70% chance for pepperoni (good), 30% for pineapple (bad)
            const isPepperoni = Math.random() > 0.3;
            const texture = isPepperoni ? 'pepperoni' : 'ananas';
            
            const powerUp = this.powerUps.create(x + (i * 80), y, texture);
            powerUp.setData('type', isPepperoni ? 'boost' : 'glue');
            powerUp.setData('points', isPepperoni ? 10 : -5);
            
            // Add floating animation
            this.tweens.add({
                targets: powerUp,
                y: powerUp.y + 10,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });
        }
        
        console.log(`🍕 Spawned ${numPowerUps} power-up(s)`);
    }
    
    collectPowerUp(player, powerUp) {
        const type = powerUp.getData('type');
        const points = powerUp.getData('points');
        
        console.log(`🎯 POWER-UP COLLECTED: ${type}, Points: ${points}`);
        
        // Add points to score
        this.score += points;
        
        // ALL orbs give 2 jumps
        const previousJumps = this.jumpsRemaining;
        this.jumpsRemaining = Math.min(this.jumpsRemaining + 2, 3); // Add 2 jumps, max 3
        
        console.log(`⬆️ Jumps restored! ${previousJumps} -> ${this.jumpsRemaining}`);
        
        // Visual feedback based on type
        if (type === 'boost') {
            // Pepperoni Pizza - green glow
            player.setTint(0x00FF00);
            
            // Show jump restore popup
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
            
            // Clear tint after short delay
            this.time.delayedCall(500, () => {
                if (player.tintTopLeft) player.clearTint();
            });
            
            console.log('🍕 Pepperoni Pizza! +10 points, +2 jumps!');
        } else if (type === 'glue') {
            // Pineapple Pizza - red tint (still gives jumps but costs points)
            player.setTint(0xFF0000);
            
            // Show jump restore popup
            const jumpText = this.add.text(powerUp.x, powerUp.y, '+2 Jumps!', {
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#FFFF00'
            });
            this.tweens.add({
                targets: jumpText,
                y: jumpText.y - 50,
                alpha: 0,
                duration: 1000,
                onComplete: () => jumpText.destroy()
            });
            
            // Clear tint after short delay
            this.time.delayedCall(500, () => {
                if (player.tintTopLeft) player.clearTint();
            });
            
            console.log('🍍 Pineapple Pizza! -5 points, +2 jumps!');
        }
        
        powerUp.destroy();
    }
}
