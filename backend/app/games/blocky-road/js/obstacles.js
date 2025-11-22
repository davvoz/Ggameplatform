// obstacles.js - Three.js vehicles and obstacles

class ObstacleManager {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.obstacles = []; // Cars and trains
        this.platforms = []; // Logs and lily pads on water
        this.coins = [];
        
        // Vehicle spawn settings
        this.spawnTimer = 0;
        this.spawnInterval = 100; // frames between checks
    }
    
    update(playerZ) {
        this.spawnTimer++;
        
        // Spawn new vehicles on road rows
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.trySpawnVehicles(playerZ);
            this.trySpawnPlatforms(playerZ);
        }
        
        // Spawn coins
        this.trySpawnCoins(playerZ);
        
        // Update platforms (logs)
        this.platforms.forEach((platform, index) => {
            platform.mesh.position.x += platform.velocity;
            
            // Remove if too far
            if (Math.abs(platform.mesh.position.x) > 15) {
                this.scene.remove(platform.mesh);
                platform.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.platforms.splice(index, 1);
            }
        });
        
        // Update vehicles
        this.obstacles.forEach((obstacle, index) => {
            obstacle.mesh.position.x += obstacle.velocity;
            
            // Rotate wheels for effect
            obstacle.mesh.children.forEach(child => {
                if (child.userData.isWheel) {
                    child.rotation.x += obstacle.velocity * 0.5;
                }
            });
            
            // Remove if too far
            if (Math.abs(obstacle.mesh.position.x) > 15) {
                this.scene.remove(obstacle.mesh);
                obstacle.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.obstacles.splice(index, 1);
            }
        });
        
        // Update coins (rotation)
        this.coins.forEach((coin, index) => {
            coin.mesh.rotation.y += coin.rotationSpeed;
            
            // Remove if collected or too far
            if (coin.collected || coin.z < playerZ - 15) {
                this.scene.remove(coin.mesh);
                coin.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.coins.splice(index, 1);
            }
        });
    }
    
    trySpawnVehicles(playerZ) {
        // Check rows ahead of player
        for (let z = Math.floor(playerZ); z < playerZ + 20; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row) continue;
            
            // Check if already has vehicles
            const hasVehicle = this.obstacles.some(obs => Math.abs(obs.z - z) < 0.5);
            if (hasVehicle) continue;
            
            // Spawn based on terrain type
            if (row.type === 'road') {
                if (Math.random() < 0.3) {
                    this.spawnVehicle(z);
                }
            } else if (row.type === 'rail') {
                if (Math.random() < 0.2) {
                    this.spawnTrain(z);
                }
            }
        }
    }
    
    spawnVehicle(z) {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const startX = direction > 0 ? -12 : 12;
        
        // Variable speeds for different vehicles
        const speedVariants = [0.025, 0.035, 0.045, 0.06];
        const speed = speedVariants[Math.floor(Math.random() * speedVariants.length)] * direction;
        
        const color = Materials.getRandomCarColor();
        const car = Models.createCar(color);
        car.position.set(startX, 0.2, z);
        
        // Face the direction of travel (rotate 90° based on direction)
        car.rotation.y = (Math.PI / 2) * direction;
        
        this.scene.add(car);
        
        this.obstacles.push({
            mesh: car,
            velocity: speed,
            z: z,
            type: 'car',
            boundingBox: new THREE.Box3().setFromObject(car)
        });
    }
    
    spawnTrain(z) {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const startX = direction > 0 ? -15 : 15;
        const speed = 0.08 * direction; // Trains are faster!
        
        const trainColor = Math.random() < 0.5 ? 0x9C27B0 : 0xE91E63;
        const train = Models.createTrain(trainColor);
        train.position.set(startX, 0.2, z);
        
        // Face the direction of travel (rotate 90° based on direction)
        train.rotation.y = (Math.PI / 2) * direction;
        
        this.scene.add(train);
        
        this.obstacles.push({
            mesh: train,
            velocity: speed,
            z: z,
            type: 'train',
            boundingBox: new THREE.Box3().setFromObject(train)
        });
    }
    
    trySpawnCoins(playerZ) {
        // Spawn coins on safe terrain
        for (let z = Math.floor(playerZ) + 5; z < playerZ + 15; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row) continue;
            
            // Only on grass or safe areas
            if (row.type !== 'grass') continue;
            
            // Check if already has coin
            const hasCoin = this.coins.some(coin => Math.abs(coin.z - z) < 0.5);
            if (hasCoin) continue;
            
            // Random spawn
            if (Math.random() < 0.15) {
                this.spawnCoin(z);
            }
        }
    }
    
    spawnCoin(z) {
        const x = Math.floor(Math.random() * 11) - 5; // -5 to 5
        const coin = Models.createCoin();
        coin.position.set(x, 0.8, z);
        
        this.scene.add(coin);
        
        this.coins.push({
            mesh: coin,
            x: x,
            z: z,
            collected: false,
            rotationSpeed: 0.05
        });
    }
    
    checkVehicleCollision(playerPos) {
        const playerBox = new THREE.Box3(
            new THREE.Vector3(playerPos.worldX - 0.4, 0, playerPos.worldZ - 0.4),
            new THREE.Vector3(playerPos.worldX + 0.4, 1, playerPos.worldZ + 0.4)
        );
        
        for (const obstacle of this.obstacles) {
            obstacle.boundingBox.setFromObject(obstacle.mesh);
            
            if (playerBox.intersectsBox(obstacle.boundingBox)) {
                return true;
            }
        }
        
        return false;
    }
    
    checkCoinCollision(playerPos, onCollect) {
        for (const coin of this.coins) {
            if (coin.collected) continue;
            
            const dx = coin.x - playerPos.x;
            const dz = coin.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < 0.6) {
                coin.collected = true;
                if (onCollect) onCollect(coin);
                return coin;
            }
        }
        
        return null;
    }
    
    trySpawnPlatforms(playerZ) {
        // Check water rows ahead of player
        for (let z = Math.floor(playerZ); z < playerZ + 20; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row || row.type !== 'water') continue;
            
            // Check if already has platforms
            const hasPlatform = this.platforms.some(plat => Math.abs(plat.z - z) < 0.5);
            if (hasPlatform) continue;
            
            // Spawn logs on this water row
            if (Math.random() < 0.8) {
                this.spawnLogRow(z);
            }
        }
    }
    
    spawnLogRow(z) {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const speed = (0.02 + Math.random() * 0.02) * direction;
        const spacing = 4 + Math.random() * 3;
        const logLength = 2 + Math.floor(Math.random() * 3); // 2-4 units
        
        // Spawn multiple logs in this row
        const numLogs = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numLogs; i++) {
            const startX = direction > 0 ? -10 - (i * spacing) : 10 + (i * spacing);
            const log = Models.createLog(logLength);
            log.position.set(startX, 0.25, z);
            
            this.scene.add(log);
            
            this.platforms.push({
                mesh: log,
                velocity: speed,
                z: z,
                x: startX,
                length: logLength,
                type: 'log'
            });
        }
    }
    
    getPlatformsAt(z) {
        // Return platforms (logs) in water at this row
        return this.platforms.filter(plat => Math.abs(plat.z - z) < 0.5);
    }
    
    clear() {
        this.obstacles.forEach(obs => {
            this.scene.remove(obs.mesh);
            obs.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        
        this.platforms.forEach(plat => {
            this.scene.remove(plat.mesh);
            plat.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        
        this.coins.forEach(coin => {
            this.scene.remove(coin.mesh);
            coin.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        
        this.obstacles = [];
        this.platforms = [];
        this.coins = [];
        this.spawnTimer = 0;
    }
}
