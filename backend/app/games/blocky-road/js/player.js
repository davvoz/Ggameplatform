// player.js - Three.js player character with animations

class Player {
    constructor(scene, particleSystem) {
        this.scene = scene;
        this.particleSystem = particleSystem;
        
        // Trova posizione di spawn libera da ostacoli
        let spawnX = 0, spawnZ = 0;
        if (window.game && window.game.terrain && window.game.terrain.hasObstacle(spawnX, spawnZ)) {
            // Cerca posizione libera nelle vicinanze (spirale)
            let found = false;
            for (let r = 1; r <= 3 && !found; r++) {
                for (let dx = -r; dx <= r && !found; dx++) {
                    for (let dz = -r; dz <= r && !found; dz++) {
                        if (Math.abs(dx) === r || Math.abs(dz) === r) {
                            if (!window.game.terrain.hasObstacle(spawnX + dx, spawnZ + dz)) {
                                spawnX += dx;
                                spawnZ += dz;
                                found = true;
                            }
                        }
                    }
                }
            }
        }
        // Create player mesh
        this.mesh = Models.createPlayer();
        this.mesh.position.set(spawnX, 0.3, spawnZ);
        this.mesh.visible = true; // Fix invisibility bug
        this.scene.add(this.mesh);

        console.log('🐰 Player spawned at:', this.mesh.position);

        // Grid position (logical)
        this.gridX = spawnX;
        this.gridZ = spawnZ;
        
        // Movement state
        this.isMoving = false;
        this.isAlive = true;
        this.isOnPlatform = false;
        this.currentPlatform = null;
        
        // Animation references
        this.body = this.mesh.userData.body;
        this.head = this.mesh.userData.head;
        
        // Jump timing
        this.jumpDuration = 150; // ms, faster than Phaser (was 300)
        this.activeTweens = []; // Track active tweens for cancellation
    }
    
    canMove() {
        return !this.isMoving && this.isAlive;
    }
    
    move(dx, dz, onComplete) {
        if (!this.isAlive) return false;
        
        // Cancel active tweens to allow instant new movement (BEFORE any checks)
        if (this.isMoving) {
            this.cancelActiveTweens();
            this.isMoving = false; // Reset flag immediately
        }
        
        const targetX = this.gridX + dx;
        const targetZ = this.gridZ + dz;
        
        // Allow lateral movement on platforms (logs)
        if (this.isOnPlatform && dx !== 0 && dz === 0) {
            // Check if still on platform after lateral move
            const platform = this.currentPlatform;
            const logLeft = platform.mesh.position.x - (platform.length / 2);
            const logRight = platform.mesh.position.x + (platform.length / 2);
            
            // Allow movement if still within log bounds
            if (targetX >= logLeft - 0.4 && targetX <= logRight + 0.4) {
                this.isMoving = true;
                this.gridX = targetX;
                // Update platform offset for lateral position
                this.platformOffset = targetX - platform.mesh.position.x;
            } else {
                return false; // Would fall off log
            }
        } else {
            // Normal movement (forward/backward or off platform)
            
            // Check for obstacles (trees, rocks) before moving
            if (window.game && window.game.terrain && window.game.terrain.hasObstacle(targetX, targetZ)) {
                return false; // Can't move - obstacle blocking
            }
            
            // Check boundaries - limit horizontal movement (±7 playable area)
            // Allow moves from -7 to +7 inclusive
            if (targetX < -7 || targetX > 7) {
                console.log('⛔ Out of bounds:', targetX);
                return false; // Out of playable area
            }
            
            // Block backward movement beyond spawn point (z=-2)
            if (targetZ < -2) {
                console.log('⛔ Cannot move backward past spawn point');
                return false; // Blocked by spawn barrier
            }
            
            this.isMoving = true;
            this.gridX = targetX;
            this.gridZ = targetZ;
        }
        
        // Determine jump direction for rotation
        if (dz > 0) {
            this.mesh.rotation.y = 0; // Forward
        } else if (dz < 0) {
            this.mesh.rotation.y = Math.PI; // Backward
        } else if (dx > 0) {
            this.mesh.rotation.y = Math.PI / 2; // Right (swapped)
        } else if (dx < 0) {
            this.mesh.rotation.y = -Math.PI / 2; // Left (swapped)
        }
        
        // Jump animation with TWEEN
        this.animateJump(targetX, targetZ, onComplete);
        
        // Play jump sound
        if (window.game && window.game.audio) {
            window.game.audio.play('jump');
        }
        
        return true;
    }
    
    cancelActiveTweens() {
        // Stop all active tweens immediately
        this.activeTweens.forEach(tween => {
            if (tween && tween.stop) {
                tween.stop();
            }
        });
        this.activeTweens = [];
        
        // Snap position to current grid position (stop mid-animation)
        this.mesh.position.x = this.gridX;
        this.mesh.position.z = this.gridZ;
        this.mesh.position.y = 0.2;
        
        // Reset body scale to normal
        if (this.body && this.body.scale) {
            this.body.scale.set(1, 1, 1);
        }
    }
    
    animateJump(targetX, targetZ, onComplete) {
        const startPos = {
            x: this.mesh.position.x,
            z: this.mesh.position.z,
            y: this.mesh.position.y
        };
        
        const targetPos = {
            x: targetX,
            z: targetZ,
            y: 0.2
        };
        
        // Squash before jump
        const squashTween = new TWEEN.Tween(this.body.scale)
            .to({ x: 1.2, y: 0.7, z: 1.2 }, this.jumpDuration * 0.2)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        this.activeTweens.push(squashTween);
        
        // Main jump arc
        const jumpTween = new TWEEN.Tween(this.mesh.position)
            .to({ x: targetX, z: targetZ }, this.jumpDuration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                // Arc height calculation
                const totalDistance = Math.sqrt(
                    Math.pow(targetX - startPos.x, 2) + 
                    Math.pow(targetZ - startPos.z, 2)
                );
                const currentDistance = Math.sqrt(
                    Math.pow(this.mesh.position.x - startPos.x, 2) + 
                    Math.pow(this.mesh.position.z - startPos.z, 2)
                );
                const progress = currentDistance / totalDistance;
                this.mesh.position.y = startPos.y + Math.sin(progress * Math.PI) * 0.8;
            })
            .onComplete(() => {
                this.mesh.position.x = targetX;
                this.mesh.position.z = targetZ;
                this.mesh.position.y = 0.2;
                
                // Stretch then back to normal
                const stretchTween = new TWEEN.Tween(this.body.scale)
                    .to({ x: 0.8, y: 1.3, z: 0.8 }, this.jumpDuration * 0.15)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .chain(
                        new TWEEN.Tween(this.body.scale)
                            .to({ x: 1, y: 1, z: 1 }, this.jumpDuration * 0.15)
                            .easing(TWEEN.Easing.Quadratic.In)
                    )
                    .start();
                this.activeTweens.push(stretchTween);
                
                this.isMoving = false;
                this.activeTweens = []; // Clear completed tweens
                if (onComplete) onComplete();
            })
            .start();
        this.activeTweens.push(jumpTween);
    }
    
    die(inWater = false) {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        
        if (inWater) {
            // Drowning animation - sink underwater with bubbles
            this.particleSystem.createWaterSplash(this.mesh.position);
            
            // Sink down and spin slowly
            new TWEEN.Tween(this.mesh.position)
                .to({ y: -2 }, 1000)
                .easing(TWEEN.Easing.Quadratic.In)
                .start();
            
            new TWEEN.Tween(this.mesh.rotation)
                .to({ x: Math.PI, y: this.mesh.rotation.y, z: 0 }, 1000)
                .easing(TWEEN.Easing.Quadratic.In)
                .start();
            
            // Scale down slightly as sinking
            new TWEEN.Tween(this.mesh.scale)
                .to({ x: 0.8, y: 0.8, z: 0.8 }, 1000)
                .easing(TWEEN.Easing.Quadratic.In)
                .start();
        } else {
            // Death particles
            this.particleSystem.createDeathParticles(this.mesh.position);
            
            // Death animation - fall and spin
            new TWEEN.Tween(this.mesh.position)
                .to({ y: -2 }, 500)
                .easing(TWEEN.Easing.Quadratic.In)
                .start();
            
            new TWEEN.Tween(this.mesh.rotation)
                .to({ x: Math.PI * 2, z: Math.PI }, 500)
                .easing(TWEEN.Easing.Quadratic.In)
                .start();
        }
    }
    
    attachToPlatform(platform) {
        this.isOnPlatform = true;
        this.currentPlatform = platform;
        // Store offset from platform center for lateral movement
        this.platformOffset = this.mesh.position.x - platform.mesh.position.x;
    }
    
    detachFromPlatform() {
        this.isOnPlatform = false;
        this.currentPlatform = null;
        this.platformOffset = 0;
    }
    
    update(normalizedDelta = 1) {
        // Move with platform while maintaining lateral offset
        if (this.isOnPlatform && this.currentPlatform && !this.isMoving) {
            // Keep player on platform with their offset position
            this.mesh.position.x = this.currentPlatform.mesh.position.x + this.platformOffset;
            this.gridX = Math.round(this.mesh.position.x);
            
            // Check if reached waterfall edges while on platform
            // Waterfalls are at ±7.5, check with small margin
            if (this.mesh.position.x <= -7.3 || this.mesh.position.x >= 7.3) {
                // Player went too far on the log and reached the waterfall!
                console.log('🌊 Player reached waterfall at x:', this.mesh.position.x);
                this.fallInWaterfall();
            }
        }
        
        // Head bob animation when idle
        if (!this.isMoving && this.isAlive) {
            this.head.position.y = 1.0 + Math.sin(Date.now() * 0.003) * 0.05;
        }
    }
    
    fallInWaterfall() {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        this.detachFromPlatform();
        
        // Waterfall death animation - swept away and spin
        this.particleSystem.createWaterSplash(this.mesh.position);
        
        new TWEEN.Tween(this.mesh.position)
            .to({ 
                x: this.mesh.position.x < 0 ? -8 : 8, // Swept to the side
                y: -1.5,
                z: this.mesh.position.z + 2 
            }, 800)
            .easing(TWEEN.Easing.Quadratic.In)
            .start();
        
        new TWEEN.Tween(this.mesh.rotation)
            .to({ x: Math.PI * 3, z: Math.PI * 2 }, 800)
            .easing(TWEEN.Easing.Quadratic.In)
            .start();
    }
    
    getPosition() {
        return {
            x: this.gridX,
            z: this.gridZ,
            worldX: this.mesh.position.x,
            worldZ: this.mesh.position.z
        };
    }
    
    reset(x = 0, z = 0) {
        this.gridX = x;
        this.gridZ = z;
        this.mesh.position.set(x, 0.2, z);
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.scale.set(1, 1, 1);
        this.mesh.visible = true; // FIX: Assicura che il player sia visibile dopo restart
        this.body.scale.set(1, 1, 1);
        this.isMoving = false;
        this.isAlive = true;
        this.isOnPlatform = false;
        this.currentPlatform = null;
        
        // Assicura che il player sia nella scena (fix per restart veloce)
        if (!this.mesh.parent) {
            this.scene.add(this.mesh);
            console.log('🔧 Player re-added to scene');
        }
    }
}
