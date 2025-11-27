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
        
        // Train system - simple and clear
        this.trainTimers = {}; // Track per rail row: {z: {nextSpawn: frameCount, warned: bool}}
        this.frameCount = 0; // Global frame counter
        
        // Difficulty progression system
        this.currentScore = 0;
    }
    
    // Calculate difficulty multipliers based on score (0-100)
    getDifficultySettings() {
        const score = this.currentScore;
        
        // Easy start (score 0-20): 30-50% of full difficulty
        // Medium (score 20-50): 50-80% of full difficulty  
        // Hard (score 50+): 80-100% of full difficulty
        
        let difficulty = 0.3; // Start at 30%
        
        if (score <= 20) {
            // Linear progression from 30% to 50%
            difficulty = 0.3 + (score / 20) * 0.2;
        } else if (score <= 50) {
            // Linear progression from 50% to 80%
            difficulty = 0.5 + ((score - 20) / 30) * 0.3;
        } else {
            // Linear progression from 80% to 100%
            difficulty = 0.8 + Math.min((score - 50) / 50, 0.2);
        }
        
        return {
            vehicleDensity: difficulty,      // How many vehicles per road
            trainFrequency: difficulty,      // How often trains spawn
            platformDensity: difficulty,     // How many logs per water row
            coinSpawnRate: Math.min(difficulty * 1.5, 1.0), // Coins spawn more at higher difficulty
            difficulty: difficulty           // Overall multiplier
        };
    }
    
    updateScore(score) {
        this.currentScore = score;
    }
    
    update(playerZ) {
        this.spawnTimer++;
        this.frameCount++; // Increment global frame counter
        
        // Spawn new vehicles on road rows
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.trySpawnVehicles(playerZ);
            this.trySpawnPlatforms(playerZ);
        }
        
        // Check trains every frame (time-based spawning)
        this.updateTrains(playerZ);
        
        // Spawn coins
        this.trySpawnCoins(playerZ);
        
        // Update platforms (logs)
        this.platforms.forEach((platform, index) => {
            // Emerge animation from waterfall - rise up from below
            // Take into account log length - first block should be usable as soon as it enters playable area
            if (platform.isEmerging) {
                const logHalfLength = platform.length / 2;
                // Complete emerge when leading edge is at -5/+5 (2 units inside playable area)
                // This ensures the front blocks are immediately usable
                const enterEdge = platform.velocity > 0 ? -5 : 5;
                
                // Calculate the leading edge of the log (front end)
                const leadingEdge = platform.velocity > 0 
                    ? platform.mesh.position.x + logHalfLength  // Moving right: front is right side
                    : platform.mesh.position.x - logHalfLength; // Moving left: front is left side
                
                // Check if leading edge has entered playable area enough
                const hasReachedThreshold = platform.velocity > 0 
                    ? leadingEdge >= enterEdge  // Moving right: front edge past -5
                    : leadingEdge <= enterEdge; // Moving left: front edge past +5
                
                // Continue emerging animation
                platform.emergeProgress += 0.04; // Faster emerge for smoother appearance
                const startY = platform.startY || -0.8;
                platform.mesh.position.y = THREE.MathUtils.lerp(startY, platform.targetY, platform.emergeProgress);
                
                // Stop emerging when fully risen AND reached threshold
                if (platform.emergeProgress >= 1 && hasReachedThreshold) {
                    platform.isEmerging = false;
                    platform.mesh.position.y = platform.targetY;
                }
            }
            
            // Submerge animation when exiting playable area - sink down outside play zone
            // Take into account log length - last block should be outside playable area when submerging starts
            // Log center is at mesh.position.x, log extends length/2 in each direction
            const logHalfLength = platform.length / 2;
            const exitEdge = platform.velocity > 0 ? 7 : -7; // Original threshold
            
            // Calculate the trailing edge of the log (back end)
            const trailingEdge = platform.velocity > 0 
                ? platform.mesh.position.x - logHalfLength  // Moving right: back is left side
                : platform.mesh.position.x + logHalfLength; // Moving left: back is right side
            
            // Start submerging when the TRAILING edge exits playable area
            const hasExitedPlayArea = platform.velocity > 0 
                ? trailingEdge >= exitEdge  // Moving right: back edge past +7
                : trailingEdge <= exitEdge; // Moving left: back edge past -7
            
            if (hasExitedPlayArea && !platform.isSubmerging && !platform.isEmerging) {
                platform.isSubmerging = true;
                platform.submergeProgress = 0;
            }
            
            if (platform.isSubmerging) {
                platform.submergeProgress += 0.04; // Match emerge speed
                platform.mesh.position.y = THREE.MathUtils.lerp(platform.targetY, -0.8, platform.submergeProgress);
                
                if (platform.submergeProgress >= 1) {
                    // Log fully submerged - remove it
                    this.scene.remove(platform.mesh);
                    // Don't dispose shared geometries/materials
                    this.platforms.splice(index, 1);
                    return;
                }
            }
            
            // Normal horizontal movement - move even while emerging/submerging
            platform.mesh.position.x += platform.velocity;
            platform.x = platform.mesh.position.x;
        });
        
        // Update vehicles
        this.obstacles.forEach((obstacle, index) => {
            const oldX = obstacle.mesh.position.x;
            obstacle.mesh.position.x += obstacle.velocity;
            
            // Rotate wheels for effect (only if has wheels cached)
            if (obstacle.wheels) {
                obstacle.wheels.forEach(wheel => {
                    wheel.rotation.x += obstacle.velocity * 0.5;
                });
            }
            
            // Fade-out animation when approaching edge (beyond ±8)
            const distanceFromCenter = Math.abs(obstacle.mesh.position.x);
            if (distanceFromCenter > 8) {
                // Start fading at x > 8, fully transparent at x > 12
                const fadeProgress = (distanceFromCenter - 8) / 4;
                const opacity = Math.max(0, 1 - fadeProgress);
                
                // Cache materials on first fade to avoid repeated traverse
                if (!obstacle.cachedMaterials) {
                    obstacle.cachedMaterials = [];
                    obstacle.mesh.traverse(child => {
                        if (child.material) {
                            child.userData.originalOpacity = child.material.opacity || 1;
                            child.material.transparent = true;
                            obstacle.cachedMaterials.push(child.material);
                        }
                    });
                }
                
                // Fast opacity update without traverse
                obstacle.cachedMaterials.forEach((mat, i) => {
                    mat.opacity = mat.userData?.originalOpacity * opacity || opacity;
                });
            }
            
            // Different behavior for trains vs vehicles
            if (obstacle.type === 'train') {
                // Trains don't wrap - they pass through once and get removed far outside visibility
                if (Math.abs(obstacle.mesh.position.x) > 50) {
                    this.scene.remove(obstacle.mesh);
                    // Fast dispose without traverse (geometries/materials are shared, don't dispose)
                    this.obstacles.splice(index, 1);
                }
            } else {
                // Vehicles wrap around (Crossy Road style)
                if (obstacle.mesh.position.x > 12 && obstacle.velocity > 0) {
                    obstacle.mesh.position.x = -12;
                    // Reset opacity using cached materials
                    if (obstacle.cachedMaterials) {
                        obstacle.cachedMaterials.forEach(mat => {
                            mat.opacity = mat.userData?.originalOpacity || 1;
                        });
                    }
                } else if (obstacle.mesh.position.x < -12 && obstacle.velocity < 0) {
                    obstacle.mesh.position.x = 12;
                    // Reset opacity using cached materials
                    if (obstacle.cachedMaterials) {
                        obstacle.cachedMaterials.forEach(mat => {
                            mat.opacity = mat.userData?.originalOpacity || 1;
                        });
                    }
                }
                
                // Remove vehicles if too far (safety)
                if (Math.abs(obstacle.mesh.position.x) > 15) {
                    this.scene.remove(obstacle.mesh);
                    obstacle.mesh.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    });
                    this.obstacles.splice(index, 1);
                }
            }
        });
        
        // Update coins (rotation) - update every other frame for performance
        if (!this.coinUpdateCounter) this.coinUpdateCounter = 0;
        this.coinUpdateCounter++;
        const updateCoins = this.coinUpdateCounter % 2 === 0;
        
        this.coins.forEach((coin, index) => {
            if (updateCoins) {
                coin.mesh.rotation.y += coin.rotationSpeed * 2; // Compensate for skipped frames
            }
            
            // Remove if collected or too far (don't dispose shared geometries/materials)
            if (coin.collected || coin.z < playerZ - 15) {
                this.scene.remove(coin.mesh);
                this.coins.splice(index, 1);
            }
        });
    }
    
    trySpawnVehicles(playerZ) {
        const settings = this.getDifficultySettings();
        
        // Check rows ahead of player for roads
        for (let z = Math.floor(playerZ); z < playerZ + 20; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row || row.type !== 'road') continue;
            
            // Check if already has vehicles currently
            const vehicleCount = this.obstacles.filter(obs => Math.abs(obs.z - z) < 0.5).length;
            
            // Progressive difficulty: 0-2 vehicles based on difficulty
            // At 30% difficulty: 0-1 vehicles (easy start)
            // At 100% difficulty: 1-2 vehicles (full game)
            const maxVehicles = settings.vehicleDensity < 0.5 
                ? (Math.random() < settings.vehicleDensity * 2 ? 1 : 0)
                : Math.floor(Math.random() * 2) + 1;
            
            if (vehicleCount < maxVehicles) {
                this.spawnVehicle(z);
            }
        }
    }
    
    updateTrains(playerZ) {
        // Check each rail row ahead of player
        const minZ = Math.floor(playerZ) - 5;
        const maxZ = Math.floor(playerZ) + 25;
        
        for (let z = minZ; z < maxZ; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row || row.type !== 'rail') continue;
            
            // Initialize timer for this row if new
            if (!this.trainTimers[z]) {
                const settings = this.getDifficultySettings();
                
                // Progressive train frequency - LESS trains for performance:
                // Low difficulty (30%): 15-20 seconds between trains
                // High difficulty (100%): 8-12 seconds between trains
                const minDelay = Math.floor(480 - (settings.trainFrequency * 240)); // 480->240 (8->4 sec)
                const maxDelay = Math.floor(1200 - (settings.trainFrequency * 480)); // 1200->720 (20->12 sec)
                const initialDelay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
                
                this.trainTimers[z] = {
                    nextSpawn: this.frameCount + initialDelay,
                    warned: false,
                    direction: Math.random() < 0.5 ? 1 : -1
                };
            }
            
            const timer = this.trainTimers[z];
            const framesUntilTrain = timer.nextSpawn - this.frameCount;
            
            // Warning 0.75 seconds before (45 frames) - reduced for snappier feel
            if (!timer.warned && framesUntilTrain <= 45 && framesUntilTrain > 0) {
                timer.warned = true;
                if (row.warningLights) {
                    this.startWarningLights(row.warningLights);
                }
            }
            
            // Spawn train
            if (framesUntilTrain <= 0 && !timer.spawned) {
                this.spawnCompleteTrain(row, timer.direction);
                timer.spawned = true;
                
                // Schedule next train with progressive difficulty
                const settings = this.getDifficultySettings();
                const minNext = Math.floor(480 - (settings.trainFrequency * 240));
                const maxNext = Math.floor(1200 - (settings.trainFrequency * 480));
                const nextDelay = minNext + Math.floor(Math.random() * (maxNext - minNext));
                this.trainTimers[z] = {
                    nextSpawn: this.frameCount + nextDelay,
                    warned: false,
                    spawned: false,
                    direction: Math.random() < 0.5 ? 1 : -1
                };
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
    
    spawnCompleteTrain(row, direction) {
        const startTime = performance.now();
        const speed = 0.6 * direction; // Fast but not excessive - reduced for performance
        const startX = direction > 0 ? -35 : 35; // Spawn far outside
        const trainColor = Math.random() < 0.5 ? 0x9C27B0 : 0xE91E63;
        const railZ = row.z; // Use actual row Z position!
        console.log(`🚂 Starting train spawn at Z=${railZ}...`);
        
        // Locomotive + 11 cars
        const totalCars = 12; // Standard train length
        const carSpacing = 1.5; // Tighter spacing - cars are 1.2 wide, so 0.3 gap between them
        
        for (let i = 0; i < totalCars; i++) {
            const isEngine = (i === 0);
            const trainPart = isEngine ? Models.createTrain(trainColor) : Models.createTrainCar(trainColor);
            
            if (!trainPart) {
                console.error(`❌ Train part ${i} is null!`);
                continue;
            }
            
            // Cars trail BEHIND the locomotive (opposite to movement direction)
            // If moving right (+), cars are to the LEFT (negative offset)
            // If moving left (-), cars are to the RIGHT (positive offset)
            const xOffset = i * carSpacing * (-direction);
            const finalX = startX + xOffset;
            trainPart.position.set(finalX, 0.2, railZ);
            trainPart.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
            
            this.scene.add(trainPart);
            
            this.obstacles.push({
                mesh: trainPart,
                velocity: speed,
                z: railZ,
                type: 'train',
                boundingBox: new THREE.Box3().setFromObject(trainPart)
            });
        }
        
        const elapsed = performance.now() - startTime;
        console.log(`🚂 Train spawn completed in ${elapsed.toFixed(2)}ms (${totalCars} cars)`);
    }
    

    
    startWarningLights(lights) {
        console.log('🚨 WARNING LIGHTS ACTIVATED!');
        lights.forEach(lightGroup => {
            const lightMesh = lightGroup.children.find(c => c.userData.isWarningLight);
            const pointLight = lightGroup.children.find(c => c.userData.isWarningPointLight);
            
            if (lightMesh) {
                const startTime = Date.now();
                
                const flashInterval = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    if (elapsed > 2000) { // 2 seconds
                        clearInterval(flashInterval);
                        lightMesh.material.opacity = 0.1;
                        lightMesh.material.emissive.setHex(0x000000);
                        lightMesh.material.emissiveIntensity = 0;
                        if (pointLight) pointLight.intensity = 0;
                        return;
                    }
                    // Fast dramatic flash - on/off
                    const flashCycle = Math.floor(elapsed / 150) % 2;
                    const isOn = flashCycle === 0;
                    if (isOn) {
                        // ON - bright red glow
                        lightMesh.material.opacity = 0.8;
                        lightMesh.material.emissive.setHex(0xff0000);
                        lightMesh.material.emissiveIntensity = 1.0;
                        if (pointLight) pointLight.intensity = 10.0;
                    } else {
                        // OFF - transparent
                        lightMesh.material.opacity = 0.1;
                        lightMesh.material.emissive.setHex(0x000000);
                        lightMesh.material.emissiveIntensity = 0;
                        if (pointLight) pointLight.intensity = 0;
                    }
                }, 75); // Update faster for clear on/off effect
            }
        });
    }
    
    trySpawnCoins(playerZ) {
        // Spawn coins on safe terrain - only ahead of player, never behind
        // Only spawn coins at least 3 rows ahead to prevent spawning at current position
        const minSpawnDistance = 5;  // Increased from 3 to 5
        const maxSpawnDistance = 20;
        
        // Track furthest spawned position to prevent backward spawning
        if (!this.furthestCoinZ) this.furthestCoinZ = playerZ;
        const startZ = Math.max(Math.floor(playerZ) + minSpawnDistance, this.furthestCoinZ);
        
        for (let z = startZ; z < playerZ + maxSpawnDistance; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row) continue;
            
            // Only on grass or safe areas
            if (row.type !== 'grass') continue;
            
            // Check if already has coin
            const hasCoin = this.coins.some(coin => Math.abs(coin.z - z) < 0.5);
            if (hasCoin) continue;
            
            // Progressive coin spawn rate:
            // Low difficulty: 4% (fewer distractions)
            // High difficulty: 12% (more coins to collect)
            const settings = this.getDifficultySettings();
            const spawnRate = 0.04 + (settings.coinSpawnRate * 0.08); // 4% to 12%
            
            if (Math.random() < spawnRate) {
                this.spawnCoin(z);
                this.furthestCoinZ = Math.max(this.furthestCoinZ, z);
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
            
            // Progressive platform density:
            // Low difficulty: 4-5 logs (easy crossings)
            // High difficulty: 3-4 logs (harder rhythm)
            const settings = this.getDifficultySettings();
            const desiredLogs = settings.platformDensity < 0.5 
                ? Math.floor(4 + Math.random() * 2) // 4-5 logs (easy)
                : Math.floor(3 + Math.random() * 2); // 3-4 logs (hard)
            
            if (currentLogs < desiredLogs) {
                // Spawn one log at a time
                this.spawnLogRow(z);
            }
        }
    }
    
    spawnLogRow(z) {
        const startTime = performance.now();
        // Get the row to check/set consistent direction
        const row = this.terrain.getRowAt(z);
        if (!row) return;
        
        const elapsedCheck = performance.now() - startTime;
        if (elapsedCheck > 2) console.log(`🪵 Platform spawn prep took ${elapsedCheck.toFixed(2)}ms`);
        
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
        
        // Start at waterfall position, below water surface, will emerge before entering play area
        // Waterfall is at ±7.5, log emerges outside playable area (±7)
        log.position.set(waterfallX, -0.8, z);
        
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
            startY: -0.8,
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
        
        // Reset train system
        this.trainTimers = {};
        this.frameCount = 0;
        
        // Reset coin spawn tracking for next game
        this.furthestCoinZ = undefined;
    }
}
