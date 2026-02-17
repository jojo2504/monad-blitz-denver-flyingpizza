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
        this.canDoubleJump = false;
        this.hasPowerUp = false;
        this.powerUpEndTime = 0;
        this.platformTimer = 0;
        this.powerUpTimer = 0;
        this.clouds = [];
        this.gameStarted = true;
        this.isDead = false;
        this.spectating = false;
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
        
        // Create initial ground
        this.createInitialGround();
        
        // Create player (pizza delivery guy) - fixed position on left side, higher up
        this.player = this.physics.add.sprite(150, 300, 'player');
        this.player.setBounce(0);
        this.player.setCollideWorldBounds(false);
        this.player.body.setGravityY(800); // Extra gravity for better jump feel
        
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
        
        // DISABLED: Check for game over (fell off screen)
        // Commented out so player doesn't die for debugging
        /*
        if (this.player.y > 650) {
            this.die();
            return;
        }
        */
        
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
        
        // Spawn new platforms - INCREASED FREQUENCY
        this.platformTimer += delta;
        if (this.platformTimer > 800) {  // Changed from 1500 to 800 (spawn faster)
            this.spawnPlatform();
            this.platformTimer = 0;
        }
        
        // Spawn power-ups - INCREASED FREQUENCY
        this.powerUpTimer += delta;
        if (this.powerUpTimer > 600) {  // Changed from 1200 to 600 (spawn even faster)
            this.spawnPowerUp();
            this.powerUpTimer = 0;
        }
        
        // Update jump counter UI
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;
        if (onGround) {
            this.jumpCounterText.setText('Jumps: 2 ✅');
            this.jumpCounterText.setColor('#00FF00');
        } else if (this.canDoubleJump) {
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
        
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;
        
        console.log('🦘 Jump attempt - onGround:', onGround, 'canDouble:', this.canDoubleJump);
        
        if (onGround) {
            // First jump
            this.player.setVelocityY(this.jumpPower);
            this.isJumping = true;
            this.canDoubleJump = true;
            console.log('✅ First jump! velocity:', this.jumpPower);
        } else if (this.canDoubleJump) {
            // Double jump
            this.player.setVelocityY(this.jumpPower * 0.8);
            this.canDoubleJump = false;
            console.log('✅ Double jump!');
        } else {
            console.log('❌ Cannot jump - not on ground and no double jump');
        }
    }
    
    onLanding() {
        if (this.player && this.player.body && this.player.body.touching.down) {
            console.log('🔽 LANDED on platform');
            this.isJumping = false;
            this.canDoubleJump = false;
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
        // Create ground floor
        for (let i = 0; i < 10; i++) {
            const platform = this.platforms.create(i * 150, 550, 'platform');
            platform.setScale(1).refreshBody();
        }
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
        
        if (type === 'boost') {
            // Pepperoni Pizza - Speed boost!
            this.hasPowerUp = true;
            this.gameSpeed = 450;
            this.powerUpEndTime = Date.now() + 3000;
            
            // Visual feedback - green glow
            player.setTint(0x00FF00);
            
            // Show score popup
            const scoreText = this.add.text(powerUp.x, powerUp.y, '+10', {
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#00FF00'
            });
            this.tweens.add({
                targets: scoreText,
                y: scoreText.y - 50,
                alpha: 0,
                duration: 1000,
                onComplete: () => scoreText.destroy()
            });
            
            console.log('🍕 Pepperoni Pizza! +10 points, Speed boost!');
        } else if (type === 'glue') {
            // Pineapple Pizza - Slow down!
            this.hasPowerUp = true;
            this.gameSpeed = 150;
            this.powerUpEndTime = Date.now() + 3000;
            
            // Visual feedback - red tint
            player.setTint(0xFF0000);
            
            // Show score popup
            const scoreText = this.add.text(powerUp.x, powerUp.y, '-5', {
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#FF0000'
            });
            this.tweens.add({
                targets: scoreText,
                y: scoreText.y - 50,
                alpha: 0,
                duration: 1000,
                onComplete: () => scoreText.destroy()
            });
            
            console.log('🍍 Pineapple Pizza! -5 points, Slowed down!');
        }
        
        powerUp.destroy();
    }
}
