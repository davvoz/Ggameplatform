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
        
        // Warning lights animation - frame-based invece di setInterval
        this.activeWarningLights = []; // {lightMesh, pointLight, startFrame, endFrame}
        
        // Limit train spawning to 1 per frame per evitare lag spikes
        this.trainSpawnedThisFrame = false;
        
        // Track last initialized rail Z per sfasare i timer
        this.lastRailZ = -Infinity;
        
        // Difficulty progression system
        this.currentScore = 0;
    }
    
    // Calculate difficulty multipliers based on score (0-100)
    getDifficultySettings() {
        const score = this.currentScore;
        
        // Easy start (score 0-20): 30-50% of full difficulty
        // Easy (score 0-50): 30-50% difficulty
        // Medium (score 50-150): 50-75% difficulty  
        // Hard (score 150-300): 75-95% difficulty
        // Extra Hard (score 300+): 95-100% difficulty
        
        let difficulty = 0.3; // Start at 30%
        
        if (score <= 50) {
            // Linear progression from 30% to 50%
            difficulty = 0.3 + (score / 50) * 0.2;
        } else if (score <= 150) {
            // Linear progression from 50% to 75%
            difficulty = 0.5 + ((score - 50) / 100) * 0.25;
        } else if (score <= 300) {
            // Linear progression from 75% to 95%
            difficulty = 0.75 + ((score - 150) / 150) * 0.2;
        } else {
            // Linear progression from 95% to 100%
            difficulty = 0.95 + Math.min((score - 300) / 200, 0.05);
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
    
    update(playerZ, normalizedDelta = 1) {
        // Use normalizedDelta to accumulate virtual "60fps frames" so timers
        // remain consistent across devices with different refresh rates.
        this.spawnTimer += normalizedDelta;
        this.frameCount += normalizedDelta; // Increment global frame counter (virtual 60fps frames)
        this.trainSpawnedThisFrame = false; // Reset flag ogni frame
        
        // Aggiorna warning lights attive (frame-based, no setInterval)
        this.updateWarningLights();
        
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
        
        // Update platforms (logs) - use reverse loop for safe removal
        for (let index = this.platforms.length - 1; index >= 0; index--) {
            const platform = this.platforms[index];
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
                
                // Continue emerging animation (frame-rate independent)
                platform.emergeProgress += 0.04 * normalizedDelta; // Faster emerge for smoother appearance
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
                platform.submergeProgress += 0.04 * normalizedDelta; // Match emerge speed (frame-rate independent)
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
            platform.mesh.position.x += platform.velocity * normalizedDelta;
            platform.x = platform.mesh.position.x;
        }
        
        // Update vehicles - use reverse loop for safe removal
        for (let index = this.obstacles.length - 1; index >= 0; index--) {
            const obstacle = this.obstacles[index];
            const oldX = obstacle.mesh.position.x;
            obstacle.mesh.position.x += obstacle.velocity * normalizedDelta;
            
            // Rotate wheels for effect (only if has wheels cached)
            if (obstacle.wheels) {
                obstacle.wheels.forEach(wheel => {
                    wheel.rotation.x += obstacle.velocity * 0.5 * normalizedDelta;
                });
            }
            
            // NO FADE-OUT - rimuove shader compilation lag
            // I veicoli semplicemente si teletrasportano (wrap around) come in Crossy Road
            
            // Different behavior for trains vs vehicles
            if (obstacle.type === 'train') {
                // Trains don't wrap - they pass through once and get removed far outside visibility
                if (Math.abs(obstacle.mesh.position.x) > 50) {
                    this.scene.remove(obstacle.mesh);
                    // Fast dispose without traverse (geometries/materials are shared, don't dispose)
                    this.obstacles.splice(index, 1);
                }
            } else {
                // Vehicles wrap around instantly (Crossy Road style) - NO fade
                if (obstacle.mesh.position.x > 12 && obstacle.velocity > 0) {
                    obstacle.mesh.position.x = -12;
                } else if (obstacle.mesh.position.x < -12 && obstacle.velocity < 0) {
                    obstacle.mesh.position.x = 12;
                }
                
                // Remove vehicles if too far (safety)
                if (Math.abs(obstacle.mesh.position.x) > 15) {
                    this.scene.remove(obstacle.mesh);
                    // Don't dispose pooled geometries
                    this.obstacles.splice(index, 1);
                }
            }
        }
        
        // Update coins (rotation) - now frame-rate independent
        for (let index = this.coins.length - 1; index >= 0; index--) {
            const coin = this.coins[index];
            coin.mesh.rotation.y += coin.rotationSpeed * normalizedDelta;
            
            // Remove if collected or too far (don't dispose shared geometries/materials)
            if (coin.collected || coin.z < playerZ - 15) {
                this.scene.remove(coin.mesh);
                this.coins.splice(index, 1);
            }
        }
    }
    
    trySpawnVehicles(playerZ) {
        const settings = this.getDifficultySettings();
        
        // Check rows ahead of player for roads
        // Don't spawn vehicles behind player (playerZ - 3) to reduce computation
        const minSpawnZ = Math.floor(playerZ) - 3;
        for (let z = minSpawnZ; z < playerZ + 20; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row || row.type !== 'road') continue;
            
            // Check if already has vehicles currently
            let vehicleCount = 0;
            for (let i = 0; i < this.obstacles.length; i++) {
                if (Math.abs(this.obstacles[i].z - z) < 0.5) vehicleCount++;
            }
            
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
        
        // Clean up train timers for rows far behind player (more than 10 rows back)
        const cleanupThreshold = Math.floor(playerZ) - 10;
        for (const z in this.trainTimers) {
            if (parseInt(z) < cleanupThreshold) {
                delete this.trainTimers[z];
            }
        }
        
        for (let z = minZ; z < maxZ; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row || row.type !== 'rail') continue;
            
            // Initialize timer for this row if new
            if (!this.trainTimers[z]) {
                // Progressive train frequency based on score (fixed intervals):
                // Score 0-100: 6 seconds
                // Score 100-150: 5 seconds
                // Score 150-300: 4 seconds
                // Score 300+: 3 seconds
                let avgSeconds;
                const score = this.currentScore;
                if (score <= 100) {
                    avgSeconds = 6;
                } else if (score <= 150) {
                    avgSeconds = 5;
                } else if (score <= 300) {
                    avgSeconds = 4;
                } else {
                    avgSeconds = 3;
                }
                const avgFrames = avgSeconds * 60;
                const variance = Math.floor(avgFrames * 0.15); // ±15% variation
                const minDelay = Math.floor(avgFrames - variance);
                const maxDelay = Math.floor(avgFrames + variance);
                let initialDelay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
                
                // OTTIMIZZAZIONE: Se questa rotaia è vicina all'ultima inizializzata,
                // sfasa il timer per evitare spawn simultanei
                if (z - this.lastRailZ <= 3) {
                    // Aggiungi 1-2 secondi di offset (60-120 frames)
                    const offsetFrames = 60 + Math.floor(Math.random() * 60);
                    initialDelay += offsetFrames;
                    console.log(`🛤️ Rail Z=${z} close to last (${this.lastRailZ}), adding ${offsetFrames} frames offset`);
                }
                this.lastRailZ = z;
                
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
            
            // Spawn train (LIMITATO A 1 PER FRAME per evitare lag)
            if (framesUntilTrain <= 0 && !timer.spawned && !this.trainSpawnedThisFrame) {
                this.spawnCompleteTrain(row, timer.direction);
                timer.spawned = true;
                this.trainSpawnedThisFrame = true; // Flag per evitare altri spawn questo frame
                
                // Schedule next train with progressive difficulty (fixed intervals)
                // Score 0-100: 6 seconds
                // Score 100-150: 5 seconds
                // Score 150-300: 4 seconds
                // Score 300+: 3 seconds
                let avgSeconds;
                const score = this.currentScore;
                if (score <= 100) {
                    avgSeconds = 6;
                } else if (score <= 150) {
                    avgSeconds = 5;
                } else if (score <= 300) {
                    avgSeconds = 4;
                } else {
                    avgSeconds = 3;
                }
                const avgFrames = avgSeconds * 60;
                const variance = Math.floor(avgFrames * 0.15); // ±15% variation
                const minNext = Math.floor(avgFrames - variance);
                const maxNext = Math.floor(avgFrames + variance);
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
        const speed = 0.6 * direction;
        const startX = direction > 0 ? -35 : 35;
        const trainColor = Math.random() < 0.5 ? 0x9C27B0 : 0xE91E63;
        const railZ = row.z;
        
        // OTTIMIZZAZIONE: Crea un gruppo per tutto il treno (1 scene.add invece di 12)
        const trainGroup = new THREE.Group();
        const totalCars = 12;
        const carSpacing = 1.5;
        
        // Crea locomotiva
        const locomotive = Models.createTrain(trainColor);
        const trainCarColor = locomotive.userData.trainCarColor;
        locomotive.position.x = 0;
        locomotive.position.y = 0.2;
        locomotive.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
        trainGroup.add(locomotive);
        
        // Crea carrozze
        for (let i = 1; i < totalCars; i++) {
            const trainCar = Models.createTrainCar(trainCarColor);
            if (!trainCar) continue;
            
            // Offset relativo alla locomotiva
            const xOffset = i * carSpacing * (-direction);
            trainCar.position.x = xOffset;
            trainCar.position.y = 0.2;
            trainCar.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
            trainGroup.add(trainCar);
        }
        
        // Posiziona il gruppo nella scena
        trainGroup.position.set(startX, 0, railZ);
        this.scene.add(trainGroup);
        
        // Aggiungi come singolo ostacolo invece di 12 separati
        this.obstacles.push({
            mesh: trainGroup,
            velocity: speed,
            z: railZ,
            type: 'train',
            boundingBox: new THREE.Box3().setFromObject(trainGroup) // 1 calcolo invece di 12
        });
    }
    

    
    startWarningLights(lights) {
        console.log('🚨 WARNING LIGHTS ACTIVATED!');
        const endFrame = this.frameCount + 120; // 2 seconds at 60fps
        
        lights.forEach(lightGroup => {
            // Cache i riferimenti una sola volta invece di find() ripetuto
            if (!lightGroup.userData.cachedRefs) {
                lightGroup.userData.cachedRefs = {
                    lightMesh: lightGroup.children.find(c => c.userData.isWarningLight),
                    pointLight: lightGroup.children.find(c => c.userData.isWarningPointLight)
                };
            }
            
            const { lightMesh, pointLight } = lightGroup.userData.cachedRefs;
            
            if (lightMesh) {
                // Aggiungi alla lista delle luci attive
                this.activeWarningLights.push({
                    lightMesh,
                    pointLight,
                    startFrame: this.frameCount,
                    endFrame: endFrame
                });
            }
        });
    }
    
    updateWarningLights() {
        // Aggiorna tutte le luci attive (molto più efficiente di setInterval)
        for (let i = this.activeWarningLights.length - 1; i >= 0; i--) {
            const light = this.activeWarningLights[i];
            const elapsed = this.frameCount - light.startFrame;
            
            if (this.frameCount >= light.endFrame) {
                // Finito - spegni la luce
                light.lightMesh.material.opacity = 0.1;
                light.lightMesh.material.emissive.setHex(0x000000);
                light.lightMesh.material.emissiveIntensity = 0;
                if (light.pointLight) light.pointLight.intensity = 0;
                this.activeWarningLights.splice(i, 1);
                continue;
            }
            
            // Flash on/off - 9 frames on, 9 frames off (150ms at 60fps)
            const flashCycle = Math.floor(elapsed / 9) % 2;
            const isOn = flashCycle === 0;
            
            if (isOn) {
                light.lightMesh.material.opacity = 0.8;
                light.lightMesh.material.emissive.setHex(0xff0000);
                light.lightMesh.material.emissiveIntensity = 1.0;
                if (light.pointLight) light.pointLight.intensity = 10.0;
            } else {
                light.lightMesh.material.opacity = 0.1;
                light.lightMesh.material.emissive.setHex(0x000000);
                light.lightMesh.material.emissiveIntensity = 0;
                if (light.pointLight) light.pointLight.intensity = 0;
            }
        }
    }
    
    trySpawnCoins(playerZ) {
        // Nuova logica: spawn per zona di grass consecutiva
        const minSpawnDistance = 5;
        const maxSpawnDistance = 20;
        if (!this.furthestCoinZ) this.furthestCoinZ = playerZ;
        const startZ = Math.max(Math.floor(playerZ) + minSpawnDistance, this.furthestCoinZ);

        // Rileva zone di grass consecutive
        let zone = [];
        for (let z = startZ; z < playerZ + maxSpawnDistance; z++) {
            const row = this.terrain.getRowAt(z);
            if (row && row.type === 'grass') {
                zone.push(z);
            } else {
                if (zone.length > 0) {
                    this.spawnCoinsInGrassZone(zone);
                    zone = [];
                }
            }
        }
        // Se la zona arriva fino in fondo
        if (zone.length > 0) {
            this.spawnCoinsInGrassZone(zone);
        }
        this.furthestCoinZ = playerZ + maxSpawnDistance;
    }

    // Spawna monete in una zona di grass consecutiva
    spawnCoinsInGrassZone(zone) {
        if (zone.length === 0) return;
        // Solo probabilità di una moneta singola nella zona
        const spawnRate = 0.18; // 18% di spawn zona
        if (Math.random() < spawnRate) {
            const z = zone[Math.floor(Math.random() * zone.length)];
            this.spawnCoin(z);
        }
    }
    
    spawnCoin(z) {
        // Supporta anche spawnCoin(z, x) per eventi speciali
        let x;
        if (arguments.length > 1) {
            x = arguments[1];
        } else {
            let attempts = 0;
            let validPosition = false;
            while (!validPosition && attempts < 10) {
                x = Math.floor(Math.random() * 13) - 6; // -6 to 6
                // Check if this position has an obstacle or another coin troppo vicino
                const tooClose = this.coins.some(coin => coin.z === z && Math.abs(coin.x - x) < 2);
                if (!this.terrain.hasObstacle(x, z) && !tooClose) {
                    validPosition = true;
                }
                attempts++;
            }
            if (!validPosition) return;
        }

        // Determina la rarità della moneta
        // STEEM: 95%, Bitcoin: 5%
        let coinType = 'steem';
        const rand = Math.random();
        if (rand < 0.05) {
            coinType = 'bitcoin';
        }

        const coin = Models.createCoin(coinType);
        coin.position.set(x, 0.8, z);
        this.scene.add(coin);
        this.coins.push({
            mesh: coin,
            x: x,
            z: z,
            collected: false,
            rotationSpeed: 0.05,
            coinType: coinType
        });
    }
    
    checkVehicleCollision(playerPos) {
        // Only check vehicles on the same row (Z position)
        for (const obstacle of this.obstacles) {
            // Check if vehicle is on same row (within 0.8 units on Z axis)
            const deltaZ = Math.abs(obstacle.mesh.position.z - playerPos.worldZ);
            if (deltaZ > 0.8) continue; // Skip vehicles on different rows
            
            // Per i treni (che sono gruppi), controlla ogni carrozza
            if (obstacle.type === 'train' && obstacle.mesh.children) {
                for (const trainCar of obstacle.mesh.children) {
                    // Posizione world della carrozza
                    const worldPos = new THREE.Vector3();
                    trainCar.getWorldPosition(worldPos);
                    
                    const carLeft = worldPos.x - 0.6;
                    const carRight = worldPos.x + 0.6;
                    const playerLeft = playerPos.worldX - 0.4;
                    const playerRight = playerPos.worldX + 0.4;
                    
                    if (playerRight > carLeft && playerLeft < carRight) {
                        return obstacle;
                    }
                }
            } else {
                // Veicoli normali (auto, camion, moto)
                const vehicleLeft = obstacle.mesh.position.x - 0.6;
                const vehicleRight = obstacle.mesh.position.x + 0.6;
                const playerLeft = playerPos.worldX - 0.4;
                const playerRight = playerPos.worldX + 0.4;
                
                if (playerRight > vehicleLeft && playerLeft < vehicleRight) {
                    return obstacle;
                }
            }
        }
        
        return null;
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
        // Don't spawn platforms behind player (playerZ - 3) to reduce computation
        const minSpawnZ = Math.floor(playerZ) - 3;
        for (let z = minSpawnZ; z < playerZ + 20; z++) {
            const row = this.terrain.getRowAt(z);
            if (!row || row.type !== 'water') continue;
            
            // Count current platforms on this row (including emerging)
            let currentLogs = 0;
            for (let i = 0; i < this.platforms.length; i++) {
                if (Math.abs(this.platforms[i].z - z) < 0.5) currentLogs++;
            }
            
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
    }
    
    getPlatformsAt(z) {
        // Optimized: manual loop instead of filter to avoid array allocation
        const result = [];
        for (let i = 0; i < this.platforms.length; i++) {
            if (Math.abs(this.platforms[i].z - z) < 0.5) {
                result.push(this.platforms[i]);
            }
        }
        return result;
    }
    
    clear() {
        const disposeMaterial = (mat) => {
            if (Array.isArray(mat)) {
                mat.forEach(m => m && typeof m.dispose === 'function' && m.dispose());
            } else if (mat && typeof mat.dispose === 'function') {
                mat.dispose();
            }
        };
        this.obstacles.forEach(obs => {
            this.scene.remove(obs.mesh);
            obs.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) disposeMaterial(child.material);
            });
        });

        this.platforms.forEach(plat => {
            this.scene.remove(plat.mesh);
            plat.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) disposeMaterial(child.material);
            });
        });

        this.coins.forEach(coin => {
            this.scene.remove(coin.mesh);
            coin.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) disposeMaterial(child.material);
            });
        });
        
        this.obstacles = [];
        this.platforms = [];
        this.coins = [];
        this.spawnTimer = 0;
        
        // Reset train system
        this.trainTimers = {};
        this.frameCount = 0;
        this.trainSpawnedThisFrame = false;
        this.lastRailZ = -Infinity;
        
        // Reset warning lights system
        this.activeWarningLights = [];
        
        // Reset difficulty score
        this.currentScore = 0;
        
        // Reset coin spawn tracking for next game
        this.furthestCoinZ = undefined;
    }
}
