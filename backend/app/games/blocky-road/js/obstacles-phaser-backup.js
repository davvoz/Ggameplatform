// Obstacle Manager - Vehicles, coins, platforms, etc.
class ObstacleManager {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.vehiclePool = new ObjectPool(
            () => this.createVehicleSprite(),
            (obj) => obj.setVisible(false)
        );
    }

    createVehicleSprite() {
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(GAME_CONFIG.COLORS.CAR_RED, 1);
        graphics.fillRect(-20, -15, 40, 30);
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(-15, -10, 30, 20);
        graphics.setDepth(50);
        return graphics;
    }

    spawnObstacles(z, terrain) {
        if (!terrain) return;

        switch (terrain.type) {
            case GAME_CONFIG.TERRAIN_TYPES.ROAD:
                this.spawnVehicles(z, terrain);
                break;
            case GAME_CONFIG.TERRAIN_TYPES.WATER:
                this.spawnPlatforms(z, terrain);
                break;
            case GAME_CONFIG.TERRAIN_TYPES.RAIL:
                this.spawnTrain(z, terrain);
                break;
            case GAME_CONFIG.TERRAIN_TYPES.GRASS:
            case GAME_CONFIG.TERRAIN_TYPES.SAFE:
                this.spawnCoins(z, terrain);
                break;
        }
    }

    spawnVehicles(z, terrain) {
        const numVehicles = Utils.randomInt(1, GAME_CONFIG.MAX_CARS_PER_LANE);
        const speed = GAME_CONFIG.INITIAL_CAR_SPEED * (1 + this.scene.score * GAME_CONFIG.SPEED_INCREASE_RATE);
        
        for (let i = 0; i < numVehicles; i++) {
            const lane = Utils.randomInt(0, 9);
            const startX = terrain.direction > 0 ? -2 : 11;
            
            const vehicle = {
                type: 'vehicle',
                gridX: startX,
                gridZ: z,
                lane: lane,
                speed: speed + Utils.randomInt(-20, 20),
                direction: terrain.direction,
                sprite: this.createVehicle(startX, z, terrain.direction)
            };
            
            this.obstacles.push(vehicle);
        }
    }

    createVehicle(gridX, gridZ, direction) {
        const x = gridX * GAME_CONFIG.TILE_SIZE;
        const y = gridZ * GAME_CONFIG.TILE_SIZE;
        
        const colors = [
            GAME_CONFIG.COLORS.CAR_RED,
            GAME_CONFIG.COLORS.CAR_BLUE,
            GAME_CONFIG.COLORS.CAR_GREEN,
            0xFFEB3B, // Yellow
            0xFF6F00, // Orange
            0x9C27B0  // Purple
        ];
        
        const container = this.scene.add.container(x, y);
        const carColor = Utils.randomChoice(colors);
        
        // Shadow
        const shadow = this.scene.add.ellipse(0, 12, 40, 15, 0x000000, 0.3);
        
        // Car body (3D effect)
        const body = this.scene.add.rectangle(0, 0, 40, 22, carColor);
        body.setStrokeStyle(3, 0x000000);
        
        // Car top/roof
        const roof = this.scene.add.rectangle(0, -8, 28, 14, carColor);
        roof.setStrokeStyle(2, 0x000000);
        roof.setAlpha(0.9);
        
        // Windshield (more detailed)
        const windX = direction > 0 ? 10 : -10;
        const windshield = this.scene.add.rectangle(windX, -3, 12, 12, 0x87CEEB, 0.7);
        windshield.setStrokeStyle(2, 0x000000);
        
        // Headlights
        const light1 = this.scene.add.circle(
            direction > 0 ? 18 : -18, 6, 3, 0xFFFFE0
        );
        const light2 = this.scene.add.circle(
            direction > 0 ? 18 : -18, -6, 3, 0xFFFFE0
        );
        light1.setStrokeStyle(1, 0x000000);
        light2.setStrokeStyle(1, 0x000000);
        
        // Wheels (with rotation animation)
        const wheel1 = this.scene.add.circle(-12, 9, 4, 0x424242);
        const wheel2 = this.scene.add.circle(12, 9, 4, 0x424242);
        const wheel3 = this.scene.add.circle(-12, -9, 4, 0x424242);
        const wheel4 = this.scene.add.circle(12, -9, 4, 0x424242);
        
        wheel1.setStrokeStyle(2, 0x000000);
        wheel2.setStrokeStyle(2, 0x000000);
        wheel3.setStrokeStyle(2, 0x000000);
        wheel4.setStrokeStyle(2, 0x000000);
        
        // Wheel hubs
        [wheel1, wheel2, wheel3, wheel4].forEach(wheel => {
            const hub = this.scene.add.circle(wheel.x, wheel.y, 2, 0x757575);
            container.add(hub);
        });
        
        container.add([shadow, body, roof, windshield, light1, light2, wheel1, wheel2, wheel3, wheel4]);
        container.setDepth(50);
        
        if (direction < 0) {
            container.setScale(-1, 1);
        }
        
        // Add subtle bobbing animation
        this.scene.tweens.add({
            targets: container,
            y: y + 1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        return container;
    }

    spawnTrain(z, terrain) {
        const startX = terrain.direction > 0 ? -5 : 15;
        const trainLength = 4;
        
        for (let i = 0; i < trainLength; i++) {
            const train = {
                type: 'train',
                gridX: startX + (i * 2 * terrain.direction),
                gridZ: z,
                speed: GAME_CONFIG.INITIAL_CAR_SPEED * 1.5,
                direction: terrain.direction,
                sprite: this.createTrainCar(startX + (i * 2 * terrain.direction), z, i === 0)
            };
            
            this.obstacles.push(train);
        }
    }

    createTrainCar(gridX, gridZ, isEngine) {
        const x = gridX * GAME_CONFIG.TILE_SIZE;
        const y = gridZ * GAME_CONFIG.TILE_SIZE;
        
        const container = this.scene.add.container(x, y);
        
        // Train car body
        const body = this.scene.add.rectangle(0, 0, 45, 25, GAME_CONFIG.COLORS.TRAIN);
        body.setStrokeStyle(3, 0x000000);
        
        if (isEngine) {
            // Engine details
            const front = this.scene.add.rectangle(20, 0, 10, 20, 0xFFEB3B);
            front.setStrokeStyle(2, 0x000000);
            container.add(front);
        }
        
        // Windows
        const window1 = this.scene.add.rectangle(-10, 0, 8, 8, 0x87CEEB);
        const window2 = this.scene.add.rectangle(10, 0, 8, 8, 0x87CEEB);
        
        container.add([body, window1, window2]);
        container.setDepth(50);
        
        return container;
    }

    spawnPlatforms(z, terrain) {
        const numPlatforms = Utils.randomInt(3, 6);
        
        for (let i = 0; i < numPlatforms; i++) {
            const x = Utils.randomInt(0, 9);
            const startX = terrain.direction > 0 ? x : x;
            
            const platform = {
                type: 'platform',
                gridX: startX,
                gridZ: z,
                speed: 80,
                direction: terrain.direction,
                sprite: this.createPlatform(startX, z)
            };
            
            this.obstacles.push(platform);
        }
    }

    createPlatform(gridX, gridZ) {
        const x = gridX * GAME_CONFIG.TILE_SIZE;
        const y = gridZ * GAME_CONFIG.TILE_SIZE;
        
        const platform = this.scene.add.rectangle(x, y, 40, 40, 0x8B4513);
        platform.setStrokeStyle(2, 0x000000);
        platform.setDepth(10);
        
        // Add floating animation
        this.scene.tweens.add({
            targets: platform,
            y: y - 3,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        return platform;
    }

    spawnCoins(z, terrain) {
        if (Math.random() < 0.3) {
            const x = Utils.randomInt(0, 9);
            
            const coin = {
                type: 'coin',
                gridX: x,
                gridZ: z,
                sprite: this.createCoin(x, z)
            };
            
            this.obstacles.push(coin);
        }
    }

    createCoin(gridX, gridZ) {
        const x = gridX * GAME_CONFIG.TILE_SIZE;
        const y = gridZ * GAME_CONFIG.TILE_SIZE;
        
        const coin = this.scene.add.circle(x, y, 8, GAME_CONFIG.COLORS.COIN);
        coin.setStrokeStyle(2, 0xFF8F00);
        coin.setDepth(80);
        
        // Rotate animation
        this.scene.tweens.add({
            targets: coin,
            scaleX: 0.2,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Bob up and down
        this.scene.tweens.add({
            targets: coin,
            y: y - 5,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        return coin;
    }

    update(delta) {
        const toRemove = [];
        
        for (let obstacle of this.obstacles) {
            if (obstacle.type === 'coin') continue;
            
            // Move obstacle
            obstacle.gridX += (obstacle.direction * obstacle.speed * delta) / 1000;
            
            // Update sprite position
            const x = obstacle.gridX * GAME_CONFIG.TILE_SIZE;
            const y = obstacle.gridZ * GAME_CONFIG.TILE_SIZE;
            
            if (obstacle.sprite) {
                obstacle.sprite.setPosition(x, y);
            }
            
            // Remove if out of bounds
            if (obstacle.gridX < -3 || obstacle.gridX > 12) {
                toRemove.push(obstacle);
            }
        }
        
        // Clean up
        toRemove.forEach(obstacle => this.removeObstacle(obstacle));
    }

    getObstaclesAt(gridX, gridZ) {
        // Range più ampio per collisioni realistiche
        return this.obstacles.filter(obs => {
            if (obs.gridZ !== gridZ) return false;
            const dx = Math.abs(obs.gridX - gridX);
            // Veicoli e treni hanno hitbox più grandi
            const range = (obs.type === 'vehicle' || obs.type === 'train') ? 0.9 : 0.6;
            return dx < range;
        });
    }

    removeObstacle(obstacle) {
        const index = this.obstacles.indexOf(obstacle);
        if (index > -1) {
            this.obstacles.splice(index, 1);
            if (obstacle.sprite) {
                obstacle.sprite.destroy();
            }
        }
    }

    reset() {
        this.obstacles.forEach(obs => {
            if (obs.sprite) obs.sprite.destroy();
        });
        this.obstacles = [];
    }

    destroy() {
        this.reset();
        this.vehiclePool.destroy();
    }
}
