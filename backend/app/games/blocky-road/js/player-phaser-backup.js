// Player Class - Blockchain character with smooth animations
class Player {
    constructor(scene, gridX, gridZ) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridZ = gridZ;
        this.isMoving = false;
        this.isAlive = true;
        this.direction = 'up';
        
        // Create player sprite (cubic voxel style)
        this.createPlayerSprite();
        
        // Movement queue for smooth controls
        this.moveQueue = [];
        this.canMove = true;
    }

    createPlayerSprite() {
        const x = this.gridX * GAME_CONFIG.TILE_SIZE;
        const y = this.gridZ * GAME_CONFIG.TILE_SIZE;
        
        // Create container for player parts
        this.container = this.scene.add.container(x, y);
        
        // Body (3D cube effect with gradient)
        const body = this.scene.add.rectangle(0, 5, 35, 35, GAME_CONFIG.COLORS.PLAYER);
        body.setStrokeStyle(3, 0x000000);
        const bodyTop = this.scene.add.polygon(0, -12, [
            -17.5, 0, 0, -10, 17.5, 0
        ], GAME_CONFIG.COLORS.PLAYER + 0x222222);
        bodyTop.setStrokeStyle(2, 0x000000);
        
        // Head (smaller 3D cube)
        const head = this.scene.add.rectangle(0, -22, 28, 28, GAME_CONFIG.COLORS.PLAYER);
        head.setStrokeStyle(2, 0x000000);
        const headTop = this.scene.add.polygon(0, -36, [
            -14, 0, 0, -8, 14, 0
        ], GAME_CONFIG.COLORS.PLAYER + 0x222222);
        headTop.setStrokeStyle(2, 0x000000);
        
        // Eyes (bigger and more expressive)
        const leftEye = this.scene.add.circle(-8, -23, 5, 0xffffff);
        const rightEye = this.scene.add.circle(8, -23, 5, 0xffffff);
        const leftPupil = this.scene.add.circle(-8, -22, 3, 0x000000);
        const rightPupil = this.scene.add.circle(8, -22, 3, 0x000000);
        
        // Bitcoin symbol on body (bigger)
        const btcText = this.scene.add.text(0, 5, '₿', {
            fontSize: '28px',
            color: '#FFD700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        this.container.add([bodyTop, body, headTop, head, leftEye, rightEye, leftPupil, rightPupil, btcText]);
        
        // Shadow (more realistic)
        this.shadow = this.scene.add.ellipse(x, y + 30, 45, 18, 0x000000, 0.4);
        this.shadow.setDepth(99);
        
        // Set depth for proper layering
        this.container.setDepth(100);
        
        // Store parts for animations
        this.body = body;
        this.bodyTop = bodyTop;
        this.head = head;
        this.headTop = headTop;
        this.leftEye = leftEye;
        this.rightEye = rightEye;
        this.leftPupil = leftPupil;
        this.rightPupil = rightPupil;
        
        // Idle animation - subtle bounce
        this.scene.tweens.add({
            targets: this.container,
            y: y - 2,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    move(direction) {
        if (!this.canMove || !this.isAlive || this.isMoving) {
            this.moveQueue.push(direction);
            return;
        }

        this.isMoving = true;
        this.direction = direction;
        
        let targetX = this.gridX;
        let targetZ = this.gridZ;
        
        switch (direction) {
            case 'up':
                targetZ -= 1;
                break;
            case 'down':
                targetZ += 1;
                break;
            case 'left':
                targetX -= 1;
                break;
            case 'right':
                targetX += 1;
                break;
        }
        
        // Check bounds - solo laterali, NON avanti!
        if (targetX < 0 || targetX >= 10) {
            this.isMoving = false;
            return;
        }
        
        // MOVIMENTO INFINITO - genera terrain se non esiste
        let terrain = this.scene.terrainManager.getTerrain(targetZ);
        if (!terrain) {
            // Forza generazione del terrain
            terrain = this.scene.terrainManager.createRow(targetZ);
        }
        
        // Perform move animation
        this.animateMove(targetX, targetZ, direction);
    }

    animateMove(targetX, targetZ, direction) {
        const startX = this.container.x;
        const startY = this.container.y;
        const endX = targetX * GAME_CONFIG.TILE_SIZE;
        const endY = targetZ * GAME_CONFIG.TILE_SIZE;
        
        // Stop idle animation
        this.scene.tweens.killTweensOf(this.container);
        
        // Anticipation - squash down
        this.scene.tweens.add({
            targets: [this.body, this.head, this.bodyTop, this.headTop],
            scaleY: 0.7,
            scaleX: 1.3,
            duration: 80,
            ease: 'Quad.easeIn',
            onComplete: () => {
                // Main hop movement
                this.scene.tweens.add({
                    targets: this.container,
                    x: endX,
                    y: endY,
                    duration: GAME_CONFIG.PLAYER_SPEED,
                    ease: 'Sine.easeInOut'
                });
                
                // Stretch during jump
                this.scene.tweens.add({
                    targets: [this.body, this.head, this.bodyTop, this.headTop],
                    scaleY: 1.3,
                    scaleX: 0.9,
                    duration: GAME_CONFIG.PLAYER_SPEED / 3,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        // Return to normal
                        this.scene.tweens.add({
                            targets: [this.body, this.head, this.bodyTop, this.headTop],
                            scaleY: 1,
                            scaleX: 1,
                            duration: GAME_CONFIG.PLAYER_SPEED / 2,
                            ease: 'Elastic.easeOut'
                        });
                    }
                });
                
                // Arc jump with shadow
                let progress = 0;
                const jumpHeight = 35;
                const jumpTween = this.scene.tweens.add({
                    targets: { val: 0 },
                    val: 1,
                    duration: GAME_CONFIG.PLAYER_SPEED,
                    ease: 'Sine.easeInOut',
                    onUpdate: (tween) => {
                        const t = tween.getValue();
                        const arc = Math.sin(t * Math.PI) * jumpHeight;
                        this.container.y = startY + (endY - startY) * t - arc;
                        
                        // Shadow scales with height
                        const shadowScale = 1 - (arc / jumpHeight) * 0.5;
                        this.shadow.setScale(shadowScale);
                        this.shadow.setAlpha(0.4 * shadowScale);
                    },
                    onComplete: () => {
                        this.gridX = targetX;
                        this.gridZ = targetZ;
                        this.isMoving = false;
                        
                        // Land impact
                        this.scene.tweens.add({
                            targets: [this.body, this.head, this.bodyTop, this.headTop],
                            scaleY: 0.8,
                            scaleX: 1.2,
                            duration: 100,
                            yoyo: true,
                            ease: 'Quad.easeOut',
                            onComplete: () => {
                                // Resume idle animation
                                this.scene.tweens.add({
                                    targets: this.container,
                                    y: endY - 2,
                                    duration: 800,
                                    yoyo: true,
                                    repeat: -1,
                                    ease: 'Sine.easeInOut'
                                });
                            }
                        });
                        
                        // Update shadow
                        this.shadow.setPosition(endX, endY + 30);
                        this.shadow.setScale(1);
                        this.shadow.setAlpha(0.4);
                        
                        // Landing particles
                        this.createLandingParticles(endX, endY);
                        
                        // Check for collisions
                        this.checkCollisions();
                        
                        // Notify game
                        this.scene.onPlayerMove(targetZ, direction);
                        
                        // Process queue
                        if (this.moveQueue.length > 0) {
                            const nextMove = this.moveQueue.shift();
                            setTimeout(() => this.move(nextMove), 50);
                        }
                        
                        Utils.playSound(this.scene, 'hop', 0.3);
                    }
                });
            }
        });
    }

    createLandingParticles(x, y) {
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i + Math.PI / 4;
            const particle = this.scene.add.circle(x, y + 20, 3, 0xffffff, 0.8);
            particle.setDepth(98);
            
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * 20,
                y: y + 20 + Math.sin(angle) * 10,
                alpha: 0,
                duration: 300,
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    checkCollisions() {
        if (!this.isAlive) return;
        
        const terrain = this.scene.terrainManager.getTerrain(this.gridZ);
        if (!terrain) return;
        
        // Get obstacles at current position
        const obstacles = this.scene.obstacleManager.getObstaclesAt(this.gridX, this.gridZ);
        
        // Check veicoli/treni - MORTE ISTANTANEA
        for (let obstacle of obstacles) {
            if (obstacle.type === 'vehicle' || obstacle.type === 'train') {
                // Controlla sovrapposizione precisa
                const dist = Math.abs(obstacle.gridX - this.gridX);
                if (dist < 0.8) { // Tolleranza collisione
                    this.die('crushed');
                    return;
                }
            } else if (obstacle.type === 'coin') {
                this.collectCoin(obstacle);
            }
        }
        
        // Check ACQUA - devi essere SU una piattaforma
        if (terrain.type === GAME_CONFIG.TERRAIN_TYPES.WATER) {
            const platforms = obstacles.filter(o => o.type === 'platform');
            let onPlatform = false;
            
            for (let platform of platforms) {
                const dist = Math.abs(platform.gridX - this.gridX);
                if (dist < 0.7) {
                    onPlatform = true;
                    // Muovi il player con la piattaforma!
                    this.gridX = platform.gridX;
                    const x = this.gridX * GAME_CONFIG.TILE_SIZE;
                    this.container.x = x;
                    this.shadow.x = x;
                    break;
                }
            }
            
            if (!onPlatform) {
                this.die('drowned');
                return;
            }
        }
    }

    collectCoin(coin) {
        this.scene.addScore(GAME_CONFIG.COIN_VALUE);
        this.scene.coinsCollected++;
        this.scene.obstacleManager.removeObstacle(coin);
        
        // Particle effect
        this.createCoinEffect(coin.sprite.x, coin.sprite.y);
        
        Utils.playSound(this.scene, 'coin', 0.5);
        Utils.vibrate([50]);
    }

    createCoinEffect(x, y) {
        const particles = [];
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const particle = this.scene.add.circle(
                x, y, 3, GAME_CONFIG.COLORS.COIN
            );
            particle.setDepth(150);
            
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * 30,
                y: y + Math.sin(angle) * 30,
                alpha: 0,
                duration: 500,
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    die(reason = 'collision') {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        this.canMove = false;
        
        Utils.playSound(this.scene, 'death', 0.7);
        Utils.vibrate([100, 50, 100]);
        
        // Death animation
        this.scene.tweens.add({
            targets: this.container,
            scaleX: 0,
            scaleY: 0,
            angle: 360,
            alpha: 0,
            duration: 500,
            ease: 'Back.easeIn',
            onComplete: () => {
                this.scene.gameOver();
            }
        });
        
        // Hide shadow
        this.scene.tweens.add({
            targets: this.shadow,
            alpha: 0,
            duration: 300
        });
    }

    reset() {
        this.gridX = GAME_CONFIG.PLAYER_START_X;
        this.gridZ = GAME_CONFIG.PLAYER_START_Z;
        this.isMoving = false;
        this.isAlive = true;
        this.canMove = true;
        this.moveQueue = [];
        
        const x = this.gridX * GAME_CONFIG.TILE_SIZE;
        const y = this.gridZ * GAME_CONFIG.TILE_SIZE;
        
        this.container.setPosition(x, y);
        this.container.setScale(1);
        this.container.setAngle(0);
        this.container.setAlpha(1);
        
        this.shadow.setPosition(x, y + 25);
        this.shadow.setAlpha(0.3);
    }

    destroy() {
        if (this.container) this.container.destroy();
        if (this.shadow) this.shadow.destroy();
    }
}
