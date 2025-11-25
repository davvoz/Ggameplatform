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
        this.spawnInterval = 10; // Check very frequently for continuous spawning
    }
    
    update(playerZ) {
        this.spawnTimer++;
        
        // Spawn new vehicles on road rows
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.trySpawnVehicles(playerZ);
            this.trySpawnTrains(playerZ);
            this.trySpawnPlatforms(playerZ);
        }
        
        // Spawn coins
        this.trySpawnCoins(playerZ);
        
        // Update platforms (logs)
        this.platforms.forEach((platform, index) => {
            // Emerge animation from waterfall
            if (platform.isEmerging) {
                platform.emergeProgress += 0.02;
                platform.mesh.position.y = THREE.MathUtils.lerp(-0.5, platform.targetY, platform.emergeProgress);
                
                if (platform.emergeProgress >= 1) {
                    platform.isEmerging = false;
                    platform.mesh.position.y = platform.targetY;
                }
            }
            
            // Submerge animation when approaching opposite waterfall
            const oppositeWaterfall = platform.velocity > 0 ? 7.5 : -7.5;
            const distanceToWaterfall = Math.abs(platform.mesh.position.x - oppositeWaterfall);
            
            if (distanceToWaterfall < 1 && !platform.isSubmerging && !platform.isEmerging) {
                platform.isSubmerging = true;
                platform.submergeProgress = 0;
            }
            
            if (platform.isSubmerging) {
                platform.submergeProgress += 0.02;
                platform.mesh.position.y = THREE.MathUtils.lerp(platform.targetY, -0.5, platform.submergeProgress);
                
                if (platform.submergeProgress >= 1) {
                    // Log fully submerged - remove it
                    this.scene.remove(platform.mesh);
                    platform.mesh.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    });
                    this.platforms.splice(index, 1);
                    return;
                }
            }
            
            // Normal horizontal movement
            platform.mesh.position.x += platform.velocity;
            platform.x = platform.mesh.position.x;
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
            
            // Wrap around when reaching offset (Crossy Road style)
            if (obstacle.mesh.position.x > 12 && obstacle.velocity > 0) {
                obstacle.mesh.position.x = -12;
            } else if (obstacle.mesh.position.x < -12 && obstacle.velocity < 0) {
                obstacle.mesh.position.x = 12;
            }
            
            // Remove if too far (safety)
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
        // Check rows ahead of player for roads
        for (let z = Math.floor(playerZ); z < playerZ + 20; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row || row.type !== 'road') continue;
            
            // Check if already has vehicles currently
            const vehicleCount = this.obstacles.filter(obs => Math.abs(obs.z - z) < 0.5).length;
            
            // Crossy Road: 1-2 vehicles per row
            const maxVehicles = Math.floor(Math.random() * 2) + 1; // 1 or 2
            if (vehicleCount < maxVehicles) {
                this.spawnVehicle(z);
            }
        }
    }
    
    trySpawnTrains(playerZ) {
        // Check rail rows ahead of player
        for (let z = Math.floor(playerZ); z < playerZ + 20; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row || row.type !== 'rail') continue;
            
            // Count existing trains on this row
            const existingTrains = this.obstacles.filter(obs => 
                obs.type === 'train' && Math.abs(obs.z - z) < 0.5
            ).length;
            
            // Keep spawning trains continuously (1-2 trains per row)
            if (existingTrains < 1) {
                this.spawnTrain(z);
                if (row.warningLights) {
                    this.flashWarningLights(row.warningLights);
                }
            }
        }
    }
    
    spawnVehicle(z) {
        // Crossy Road style: spawn from outside (±12), move through
        const existingVehicles = this.obstacles.filter(obs => Math.abs(obs.z - z) < 0.5);
        
        // Get or set row speed - all vehicles in same row have SAME speed
        const row = this.terrain.getRowAt(z);
        if (!row) return;
        
        let direction, speed;
        if (!row.vehicleSpeed) {
            // First vehicle in row - set the speed for this row
            direction = Math.random() < 0.5 ? 1 : -1;
            row.vehicleSpeed = (Math.random() * 0.06 + 0.04) * direction; // 0.04-0.10 (increased minimum)
        }
        speed = row.vehicleSpeed;
        direction = speed > 0 ? 1 : -1;
        
        // If row already has vehicles, check if we should spawn another
        if (existingVehicles.length > 0) {
            const startX = direction > 0 ? -12 : 12;
            
            // Check if any vehicle is too close to spawn point
            const tooClose = existingVehicles.some(v => {
                const dist = Math.abs(v.mesh.position.x - startX);
                return dist < 4; // Min spacing 4 units
            });
            
            if (tooClose) return; // Don't spawn yet
        }
        
        const startX = direction > 0 ? -12 : 12;
        
        // Choose random vehicle type for variety
        const rand = Math.random();
        const color = Materials.getRandomCarColor();
        let vehicle;
        let vehicleType;
        
        if (rand < 0.5) {
            // 50% cars
            vehicle = Models.createCar(color);
            vehicleType = 'car';
        } else if (rand < 0.75) {
            // 25% trucks
            vehicle = Models.createTruck(color);
            vehicleType = 'truck';
        } else {
            // 25% motorcycles
            vehicle = Models.createMotorcycle(color);
            vehicleType = 'motorcycle';
        }
        
        vehicle.position.set(startX, 0.2, z);
        
        // Face the direction of travel (rotate 90° based on direction)
        vehicle.rotation.y = (Math.PI / 2) * direction;
        
        this.scene.add(vehicle);
        
        this.obstacles.push({
            mesh: vehicle,
            velocity: speed,
            z: z,
            type: vehicleType,
            boundingBox: new THREE.Box3().setFromObject(vehicle)
        });
    }
    
    spawnTrain(z) {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const startX = direction > 0 ? -25 : 25; // Start even further
        const speed = 0.18 * direction; // Even faster!
        
        const trainColor = Math.random() < 0.5 ? 0x9C27B0 : 0xE91E63;
        const train = Models.createTrain(trainColor);
        train.position.set(startX, 0.2, z);
        
        // Face the direction of travel
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
    

    
    flashWarningLights(lights) {
        lights.forEach(lightGroup => {
            const lightMesh = lightGroup.children.find(c => c.userData.isWarningLight);
            if (lightMesh) {
                // Flash for 3 seconds before train arrives
                const startTime = Date.now();
                const flashInterval = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    if (elapsed > 3000) {
                        clearInterval(flashInterval);
                        lightMesh.material.opacity = 0.2; // Reset to dim
                        return;
                    }
                    // Flash bright red
                    lightMesh.material.opacity = Math.sin(elapsed * 0.015) * 0.4 + 0.5;
                }, 50);
            }
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
        // Try multiple positions to avoid obstacles
        let attempts = 0;
        let x, validPosition = false;
        
        while (!validPosition && attempts < 10) {
            x = Math.floor(Math.random() * 13) - 6; // -6 to 6
            
            // Check if this position has an obstacle
            if (!this.terrain.hasObstacle(x, z)) {
                validPosition = true;
            }
            attempts++;
        }
        
        // If no valid position found, don't spawn coin
        if (!validPosition) return;
        
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
        // Only check vehicles on the same row (Z position)
        for (const obstacle of this.obstacles) {
            // Check if vehicle is on same row (within 0.8 units on Z axis)
            const deltaZ = Math.abs(obstacle.mesh.position.z - playerPos.worldZ);
            if (deltaZ > 0.8) continue; // Skip vehicles on different rows
            
            // Now check X collision on same row
            const vehicleLeft = obstacle.mesh.position.x - 0.6; // Vehicle width buffer
            const vehicleRight = obstacle.mesh.position.x + 0.6;
            const playerLeft = playerPos.worldX - 0.4;
            const playerRight = playerPos.worldX + 0.4;
            
            // Check if player overlaps with vehicle on X axis
            if (playerRight > vehicleLeft && playerLeft < vehicleRight) {
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
            
            // Count current platforms on this row (including emerging)
            const currentLogs = this.platforms.filter(plat => 
                Math.abs(plat.z - z) < 0.5
            ).length;
            
            // Keep spawning until we have 3-4 logs (increased from 3)
            const desiredLogs = 4; // Target 4 logs per row for faster rhythm
            if (currentLogs < desiredLogs) {
                // Spawn one log at a time
                this.spawnLogRow(z);
            }
        }
    }
    
    spawnLogRow(z) {
        // Get the row to check/set consistent direction
        const row = this.terrain.getRowAt(z);
        if (!row) return;
        
        // Check if this row already has a direction set
        // If not, assign one randomly and keep it for all logs in this row
        if (!row.logDirection) {
            row.logDirection = Math.random() < 0.5 ? 1 : -1; // 1 = left-to-right, -1 = right-to-left
        }
        
        const direction = row.logDirection;
        const spawnFromLeft = direction > 0; // If moving right, spawn from left
        
        // Set uniform speed for all logs in this row
        if (!row.logSpeed) {
            row.logSpeed = (Math.random() * 0.05 + 0.03) * direction; // 0.03-0.08 (increased minimum)
        }
        const speed = row.logSpeed;
        
        // Spawn from waterfall edge, moving TOWARD the opposite side
        // Left waterfall = spawn at -7.5, move RIGHT (positive velocity)
        // Right waterfall = spawn at +7.5, move LEFT (negative velocity)
        const waterfallX = spawnFromLeft ? -7.5 : 7.5;
        
        // Add spawn delay to prevent all logs spawning at once
        if (!row.lastLogSpawnTime) {
            row.lastLogSpawnTime = 0;
        }
        const currentTime = Date.now();
        const timeSinceLastSpawn = currentTime - row.lastLogSpawnTime;
        const minSpawnDelay = 800; // Minimum 800ms between log spawns
        
        if (timeSinceLastSpawn < minSpawnDelay) {
            return; // Too soon since last spawn
        }
        
        // Check minimum distance from existing logs on this row
        const existingLogs = this.platforms.filter(plat => Math.abs(plat.z - z) < 0.5);
        const minDistance = 5; // Minimum 5 units between logs (increased)
        
        // Only check logs that are close to spawn point (within field of view)
        for (const existingLog of existingLogs) {
            // Skip logs that are emerging or submerging (they're transitioning)
            if (existingLog.isEmerging || existingLog.isSubmerging) continue;
            
            const distance = Math.abs(existingLog.mesh.position.x - waterfallX);
            if (distance < minDistance) {
                return; // Too close, don't spawn yet
            }
        }
        
        // Update last spawn time
        row.lastLogSpawnTime = currentTime;
        
        // Spawn one log at a time for continuous flow
        const logLength = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
        const log = Models.createLog(logLength);
        
        // Start submerged at waterfall, will emerge with animation
        log.position.set(waterfallX, -0.5, z);
        
        this.scene.add(log);
        
        const platform = {
            mesh: log,
            velocity: speed,
            z: z,
            x: waterfallX,
            length: logLength,
            type: 'log',
            isEmerging: true,
            emergeProgress: 0,
            targetY: 0.25,
            spawnSide: spawnFromLeft ? 'left' : 'right'
        };
        
        this.platforms.push(platform);
    }    getPlatformsAt(z) {
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
