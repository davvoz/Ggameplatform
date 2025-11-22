// player.js - Three.js player character with animations

class Player {
    constructor(scene, particleSystem) {
        this.scene = scene;
        this.particleSystem = particleSystem;
        
        // Create player mesh
        this.mesh = Models.createPlayer();
        this.mesh.position.set(0, 0.3, 0);
        this.scene.add(this.mesh);
        
        console.log('🐔 Player created at:', this.mesh.position);
        
        // Grid position (logical)
        this.gridX = 0;
        this.gridZ = 0;
        
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
    }
    
    canMove() {
        return !this.isMoving && this.isAlive;
    }
    
    move(dx, dz, onComplete) {
        if (!this.canMove()) return false;
        
        this.isMoving = true;
        this.gridX += dx;
        this.gridZ += dz;
        
        const targetX = this.gridX;
        const targetZ = this.gridZ;
        
        // Determine jump direction for rotation
        if (dz > 0) {
            this.mesh.rotation.y = 0;
        } else if (dz < 0) {
            this.mesh.rotation.y = Math.PI;
        } else if (dx > 0) {
            this.mesh.rotation.y = -Math.PI / 2;
        } else if (dx < 0) {
            this.mesh.rotation.y = Math.PI / 2;
        }
        
        // Jump animation with TWEEN
        this.animateJump(targetX, targetZ, onComplete);
        
        // Create jump particles
        this.particleSystem.createJumpParticles(this.mesh.position);
        
        return true;
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
        new TWEEN.Tween(this.body.scale)
            .to({ x: 1.2, y: 0.7, z: 1.2 }, this.jumpDuration * 0.2)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        
        // Main jump arc
        new TWEEN.Tween(startPos)
            .to(targetPos, this.jumpDuration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                this.mesh.position.x = startPos.x;
                this.mesh.position.z = startPos.z;
                
                // Arc height
                const progress = (startPos.z - this.mesh.position.z) / (targetZ - this.mesh.position.z);
                this.mesh.position.y = startPos.y + Math.sin(progress * Math.PI) * 0.8;
            })
            .onComplete(() => {
                this.mesh.position.x = targetX;
                this.mesh.position.z = targetZ;
                this.mesh.position.y = 0.2;
                
                // Stretch then back to normal
                new TWEEN.Tween(this.body.scale)
                    .to({ x: 0.8, y: 1.3, z: 0.8 }, this.jumpDuration * 0.15)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .chain(
                        new TWEEN.Tween(this.body.scale)
                            .to({ x: 1, y: 1, z: 1 }, this.jumpDuration * 0.15)
                            .easing(TWEEN.Easing.Quadratic.In)
                    )
                    .start();
                
                this.isMoving = false;
                if (onComplete) onComplete();
            })
            .start();
    }
    
    die() {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        
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
    
    attachToPlatform(platform) {
        this.isOnPlatform = true;
        this.currentPlatform = platform;
    }
    
    detachFromPlatform() {
        this.isOnPlatform = false;
        this.currentPlatform = null;
    }
    
    update() {
        // Move with platform
        if (this.isOnPlatform && this.currentPlatform && !this.isMoving) {
            this.mesh.position.x = this.currentPlatform.mesh.position.x;
            this.gridX = Math.round(this.mesh.position.x);
        }
        
        // Head bob animation when idle
        if (!this.isMoving && this.isAlive) {
            this.head.position.y = 1.0 + Math.sin(Date.now() * 0.003) * 0.05;
        }
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
        this.body.scale.set(1, 1, 1);
        this.isMoving = false;
        this.isAlive = true;
        this.isOnPlatform = false;
        this.currentPlatform = null;
    }
}
