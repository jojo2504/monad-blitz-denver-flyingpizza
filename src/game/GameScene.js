import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.platforms = [];
        this.height = 0;
        this.scrollSpeed = 0;
        this.jumpPower = -400;
        this.hasPowerUp = false;
        this.powerUpEndTime = 0;
    }
    
    preload() {
        // Create simple pizza-themed sprites
        this.createSprites();
    }
    
    create() {
        // Background
        this.cameras.main.setBackgroundColor('#87CEEB');
        
        // Create player (pizza delivery guy)
        this.player = this.physics.add.sprite(400, 300, 'player');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);
        
        // Create initial platforms
        this.createPlatforms();
        
        // Collisions
        this.physics.add.collider(this.player, this.platforms);
        
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Touch/Click input
        this.input.on('pointerdown', () => {
            this.jump();
        });
        
        // Camera follows player
        this.cameras.main.startFollow(this.player, true, 0, 0.1);
        
        // Power-ups
        this.powerUps = this.physics.add.group();
        this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);
        
        // Spawn power-ups periodically
        this.time.addEvent({
            delay: 3000,
            callback: this.spawnPowerUp,
            callbackScope: this,
            loop: true
        });
    }
    
    update() {
        // Handle movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
        } else {
            this.player.setVelocityX(0);
        }
        
        // Calculate height
        const playerY = this.player.y;
        if (playerY < 300) {
            const heightGain = (300 - playerY) / 10;
            this.height += heightGain * 0.1;
        }
        
        // Update app height
        const app = this.registry.get('app');
        if (app) {
            app.updateHeight(this.height);
        }
        
        // Generate new platforms as we climb
        if (this.player.y < 200) {
            this.generatePlatform();
        }
        
        // Remove platforms that are too far below
        this.platforms.getChildren().forEach(platform => {
            if (platform.y > this.cameras.main.scrollY + 700) {
                platform.destroy();
            }
        });
        
        // Check power-up expiration
        if (this.hasPowerUp && Date.now() > this.powerUpEndTime) {
            this.hasPowerUp = false;
            this.jumpPower = -400;
        }
        
        // Clean up power-ups
        this.powerUps.getChildren().forEach(powerUp => {
            if (powerUp.y > this.cameras.main.scrollY + 700) {
                powerUp.destroy();
            }
        });
    }
    
    jump() {
        if (this.player.body.touching.down) {
            this.player.setVelocityY(this.jumpPower);
        }
    }
    
    createSprites() {
        // Create simple colored shapes for sprites
        
        // Player (pizza delivery person) - orange circle
        const playerGraphics = this.add.graphics();
        playerGraphics.fillStyle(0xFF6347, 1);
        playerGraphics.fillCircle(16, 16, 16);
        playerGraphics.generateTexture('player', 32, 32);
        playerGraphics.destroy();
        
        // Platform (pizza box) - brown rectangle
        const platformGraphics = this.add.graphics();
        platformGraphics.fillStyle(0x8B4513, 1);
        platformGraphics.fillRect(0, 0, 120, 20);
        platformGraphics.lineStyle(2, 0xFFFFFF, 1);
        platformGraphics.strokeRect(0, 0, 120, 20);
        platformGraphics.generateTexture('platform', 120, 20);
        platformGraphics.destroy();
        
        // Pepperoni Boost - red circle
        const pepperoniGraphics = this.add.graphics();
        pepperoniGraphics.fillStyle(0xFF0000, 1);
        pepperoniGraphics.fillCircle(12, 12, 12);
        pepperoniGraphics.generateTexture('pepperoni', 24, 24);
        pepperoniGraphics.destroy();
        
        // Ananas Glue - yellow/green circle
        const ananasGraphics = this.add.graphics();
        ananasGraphics.fillStyle(0xFFFF00, 1);
        ananasGraphics.fillCircle(12, 12, 12);
        ananasGraphics.lineStyle(2, 0x00FF00, 1);
        ananasGraphics.strokeCircle(12, 12, 12);
        ananasGraphics.generateTexture('ananas', 24, 24);
        ananasGraphics.destroy();
    }
    
    createPlatforms() {
        this.platforms = this.physics.add.staticGroup();
        
        // Create initial platforms
        for (let i = 0; i < 10; i++) {
            const x = Phaser.Math.Between(100, 700);
            const y = 100 + (i * 60);
            const platform = this.platforms.create(x, y, 'platform');
            platform.setScale(1).refreshBody();
        }
        
        // Ground platform
        this.platforms.create(400, 580, 'platform')
            .setScale(6, 1)
            .refreshBody();
    }
    
    generatePlatform() {
        const x = Phaser.Math.Between(100, 700);
        const y = this.player.y - 300;
        
        const platform = this.platforms.create(x, y, 'platform');
        platform.setScale(1).refreshBody();
    }
    
    spawnPowerUp() {
        const x = Phaser.Math.Between(100, 700);
        const y = this.player.y - 200;
        
        // 70% chance for pepperoni boost, 30% for ananas glue
        const isPepperoni = Math.random() > 0.3;
        const texture = isPepperoni ? 'pepperoni' : 'ananas';
        
        const powerUp = this.powerUps.create(x, y, texture);
        powerUp.setData('type', isPepperoni ? 'boost' : 'glue');
        powerUp.setVelocity(0, 50);
    }
    
    collectPowerUp(player, powerUp) {
        const type = powerUp.getData('type');
        
        if (type === 'boost') {
            // Pepperoni Boost - increase jump power
            this.hasPowerUp = true;
            this.jumpPower = -600;
            this.powerUpEndTime = Date.now() + 3000;
            
            // Visual feedback
            player.setTint(0xFF0000);
            this.time.delayedCall(3000, () => {
                player.clearTint();
            });
            
            console.log('🍕 Pepperoni Boost activated!');
        } else if (type === 'glue') {
            // Ananas Glue - reduce jump power
            this.hasPowerUp = true;
            this.jumpPower = -200;
            this.powerUpEndTime = Date.now() + 3000;
            
            // Visual feedback
            player.setTint(0xFFFF00);
            this.time.delayedCall(3000, () => {
                player.clearTint();
            });
            
            console.log('🍍 Ananas Glue effect!');
        }
        
        powerUp.destroy();
    }
}
