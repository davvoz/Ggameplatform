// terrain.js - Three.js terrain generation

class TerrainGenerator {
    constructor(scene) {
        this.scene = scene;
        this.rows = [];
        this.currentMaxZ = 0;
        this.currentZone = null;
        this.zoneRowsRemaining = 0;
        this.currentScore = 0; // Track score for progressive difficulty
        
        // Terrain zone definitions - EASY START (lots of grass, very rare trains)
        this.easyZones = [
            { type: 'grass', minRows: 3, maxRows: 5 },
            { type: 'road', minRows: 2, maxRows: 3 },
            { type: 'grass', minRows: 3, maxRows: 5 },
            { type: 'water', minRows: 1, maxRows: 2 },
            { type: 'grass', minRows: 4, maxRows: 6 },
            { type: 'road', minRows: 2, maxRows: 3 },
            { type: 'grass', minRows: 3, maxRows: 4 },
            { type: 'grass', minRows: 2, maxRows: 4 },
            { type: 'grass', minRows: 3, maxRows: 5 },
            { type: 'rail', minRows: 1, maxRows: 1 } // Very rare - 1/10 chance
        ];
        
        // Terrain zone definitions - MEDIUM (balanced, rare trains)
        this.mediumZones = [
            { type: 'grass', minRows: 2, maxRows: 3 },
            { type: 'road', minRows: 3, maxRows: 4 },
            { type: 'grass', minRows: 2, maxRows: 3 },
            { type: 'water', minRows: 2, maxRows: 3 },
            { type: 'grass', minRows: 2, maxRows: 3 },
            { type: 'road', minRows: 3, maxRows: 4 },
            { type: 'grass', minRows: 2, maxRows: 3 },
            { type: 'grass', minRows: 2, maxRows: 3 },
            { type: 'grass', minRows: 2, maxRows: 3 },
            { type: 'rail', minRows: 1, maxRows: 1 } // Very rare - 1/10 chance
        ];
        
        // Terrain zone definitions - HARD (current level)
        this.hardZones = [
            { type: 'grass', minRows: 1, maxRows: 2 }, // Less grass
            { type: 'road', minRows: 4, maxRows: 6 },  // Longer roads
            { type: 'grass', minRows: 1, maxRows: 2 },
            { type: 'water', minRows: 3, maxRows: 4 }, // Wide rivers
            { type: 'grass', minRows: 1, maxRows: 2 },
            { type: 'road', minRows: 4, maxRows: 5 },
            { type: 'grass', minRows: 1, maxRows: 2 },
            { type: 'rail', minRows: 1, maxRows: 2 }   // Double rails
        ];
    }
    
    generateInitialTerrain() {
        // Generate terrain behind spawn point (with dense obstacles to block backward movement)
        // Extended to -20 to ensure full visual coverage behind player
        for (let z = -20; z < -2; z++) {
            const row = this.createRow(z, 'grass');
            // Mark as barrier zone - will add extra dense decorations
            row.isBarrier = true;
        }
        
        // Start with safe grass zone at spawn point
        for (let z = -2; z < 3; z++) {
            this.createRow(z, 'grass');
        }
        
        // Generate zones ahead
        let z = 3;
        while (z <= 35) {
            const zone = this.getNextZone();
            const numRows = zone.minRows + Math.floor(Math.random() * (zone.maxRows - zone.minRows + 1));
            
            for (let i = 0; i < numRows && z <= 35; i++, z++) {
                this.createRow(z, zone.type);
            }
        }
        
        this.currentMaxZ = 35;
    }
    
    getZoneTypes() {
        // Progressive difficulty based on score
        if (this.currentScore < 50) {
            return this.easyZones;  // 🟢 Easy
        } else if (this.currentScore < 150) {
            return this.mediumZones; // 🟡 Medium
        } else {
            return this.hardZones;   // 🟠 Hard/Extreme
        }
    }
    
    updateScore(score) {
        this.currentScore = score;
    }
    
    getNextZone() {
        // Cycle through zone types for variety but realism
        const availableZones = [...this.getZoneTypes()];
        
        // Don't repeat same zone type
        if (this.currentZone) {
            const filtered = availableZones.filter(z => z.type !== this.currentZone.type);
            if (filtered.length > 0) {
                this.currentZone = filtered[Math.floor(Math.random() * filtered.length)];
                return this.currentZone;
            }
        }
        
        this.currentZone = availableZones[Math.floor(Math.random() * availableZones.length)];
        return this.currentZone;
    }
    
    createRow(z, type) {
        const row = {
            z: z,
            type: type,
            tiles: [],
            decorations: [],
            obstacles: []
        };
        
        // Create tiles across the row (wide visual coverage)
        // Playable area is -7 to +7, but we generate -25 to +25 for full visual coverage
        for (let x = -25; x <= 25; x++) {
            const tile = Models.createTerrainBlock(type);
            tile.position.set(x, 0, z);
            this.scene.add(tile);
            row.tiles.push(tile);
        }
        
        // Add decorations based on type
        if (type === 'grass') {
            this.addGrassDecorations(row);
        } else if (type === 'rail') {
            this.addRailDecorations(row);
        } else if (type === 'water') {
            this.addWaterDecorations(row);
        }
        
        this.rows.push(row);
        return row;
    }
    
    addRoadMarkings(row) {
        // TODO: Add road markings later
    }
    
    addGrassDecorations(row) {
        const decorationChance = 0.4;
        const isBarrier = row.isBarrier; // Dense obstacles behind spawn
        
        for (let x = -25; x <= 25; x++) {
            // Create natural borders with trees/rocks at edges
            const isEdge = x === -8 || x === 8;
            const isOutside = x < -8 || x > 8;
            const isPlayable = x >= -7 && x <= 7;
            
            // DENSE OBSTACLES IN BARRIER ZONE (behind spawn point)
            if (isBarrier && isPlayable && Math.random() < 0.8) {
                const decoration = Math.random() < 0.7 ? Models.createTree() : Models.createRock();
                decoration.userData.isObstacle = true;
                decoration.userData.gridX = x;
                decoration.userData.gridZ = row.z;
                decoration.position.set(x, 0.2, row.z);
                decoration.scale.multiplyScalar(1.3);
                this.scene.add(decoration);
                row.decorations.push(decoration);
                continue;
            }
            
            // Force obstacles at borders for visual boundary
            if (isEdge && Math.random() < 0.7) {
                const decoration = Math.random() < 0.5 ? Models.createTree() : Models.createRock();
                decoration.userData.isObstacle = true;
                decoration.userData.gridX = x;
                decoration.userData.gridZ = row.z;
                decoration.position.set(x, 0.2, row.z);
                decoration.scale.multiplyScalar(1.2); // Slightly bigger at edges
                this.scene.add(decoration);
                row.decorations.push(decoration);
            }
            // Dense decorations outside playable area
            else if (isOutside && Math.random() < 0.6) {
                const rand = Math.random();
                const decoration = rand < 0.5 ? Models.createTree() : 
                                 rand < 0.8 ? Models.createRock() : Models.createFlower();
                decoration.position.set(
                    x + (Math.random() - 0.5) * 0.8,
                    0.2,
                    row.z + (Math.random() - 0.5) * 0.8
                );
                this.scene.add(decoration);
                row.decorations.push(decoration);
            }
            // Normal decorations in playable area
            else if (isPlayable && Math.random() < decorationChance) {
                const rand = Math.random();
                let decoration;
                
                if (rand < 0.6) { // More grass/flowers
                    decoration = rand < 0.3 ? Models.createGrassTuft() : Models.createFlower();
                } else if (rand < 0.85) {
                    decoration = Models.createRock();
                    decoration.userData.isObstacle = true;
                    decoration.userData.gridX = x;
                    decoration.userData.gridZ = row.z;
                    decoration.scale.multiplyScalar(1.5); // Make rocks bigger!
                } else {
                    decoration = Models.createTree();
                    decoration.userData.isObstacle = true;
                    decoration.userData.gridX = x;
                    decoration.userData.gridZ = row.z;
                }
                
                decoration.position.set(
                    x + (Math.random() - 0.5) * 0.6,
                    0.2,
                    row.z + (Math.random() - 0.5) * 0.6
                );
                
                this.scene.add(decoration);
                row.decorations.push(decoration);
            }
        }
    }
    
    addRailDecorations(row) {
        // Add one rail track centered (it extends along Z axis)
        const track = Models.createRailTrack();
        track.position.set(0, 0.2, row.z);
        this.scene.add(track);
        row.decorations.push(track);
        
        // Add permanent warning lights symmetrically on sides, slightly before rails
        const leftLight = Models.createTrainWarningLight();
        leftLight.position.set(-4, 0, row.z - 0.6); // Left side, 2 blocks closer
        leftLight.rotation.y = Math.PI; // Rotate 180° to face rails
        this.scene.add(leftLight);
        row.decorations.push(leftLight);
        
        const rightLight = Models.createTrainWarningLight();
        rightLight.position.set(4, 0, row.z - 0.6); // Right side, 2 blocks closer
        rightLight.rotation.y = Math.PI; // Rotate 180° to face rails
        this.scene.add(rightLight);
        row.decorations.push(rightLight);
        
        // Store lights for flashing when train comes
        row.warningLights = [leftLight, rightLight];
    }
    
    addWaterDecorations(row) {
        // Add waterfalls at the edges (±7.5 is edge of playable area)
        // Left waterfall
        const leftWaterfall = this.createWaterfall();
        leftWaterfall.position.set(-7.5, 0.3, row.z);
        this.scene.add(leftWaterfall);
        row.decorations.push(leftWaterfall);
        row.leftWaterfall = leftWaterfall;
        
        // Right waterfall
        const rightWaterfall = this.createWaterfall();
        rightWaterfall.position.set(7.5, 0.3, row.z);
        this.scene.add(rightWaterfall);
        row.decorations.push(rightWaterfall);
        row.rightWaterfall = rightWaterfall;
    }
    
    createWaterfall() {
        // Create a waterfall effect - horizontal flowing water
        const waterfallGroup = new THREE.Group();
        
        // Main waterfall plane - horizontal on ground
        const geometry = new THREE.PlaneGeometry(2, 1); // Long along Z, narrow along X
        const material = new THREE.MeshBasicMaterial({
            color: 0xaaddff, // Light blue-white
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const waterfall = new THREE.Mesh(geometry, material);
        waterfall.rotation.x = -Math.PI / 2; // Flat on ground
        waterfall.position.y = 0.1; // Slightly above water
        waterfallGroup.add(waterfall);
        
        // Add foam particles that flow horizontally
        const foamGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3);
        const foamMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        waterfallGroup.userData.foamParticles = [];
        waterfallGroup.userData.direction = 0; // Will be set based on position
        
        for (let i = 0; i < 6; i++) {
            const foam = new THREE.Mesh(foamGeometry, foamMaterial);
            foam.position.set(
                0, // Will move along X
                0.15,
                (Math.random() - 0.5) * 0.8 // Random Z position
            );
            foam.userData.animOffset = Math.random() * Math.PI * 2;
            foam.userData.flowSpeed = 0.03 + Math.random() * 0.04;
            foam.userData.startX = (Math.random() - 0.5) * 1.5;
            waterfallGroup.add(foam);
            waterfallGroup.userData.foamParticles.push(foam);
        }
        
        waterfallGroup.userData.isWaterfall = true;
        return waterfallGroup;
    }
    
    update(playerZ, currentScore) {
        // Update score for progressive terrain difficulty
        if (currentScore !== undefined) {
            this.currentScore = currentScore;
        }
        
        // Animate only waterfalls near player (optimization)
        const animationDistance = 20;
        this.rows.forEach(row => {
            if (Math.abs(row.z - playerZ) < animationDistance) {
                if (row.leftWaterfall) this.animateWaterfall(row.leftWaterfall);
                if (row.rightWaterfall) this.animateWaterfall(row.rightWaterfall);
            }
        });
        
        // Generate new terrain ahead gradually (1 row at a time when needed)
        const generationDistance = 35;
        if (this.currentMaxZ < playerZ + generationDistance) {
            // Generate only 1 row per frame to avoid lag spikes
            if (!this.currentZoneRows || this.currentZoneRows <= 0) {
                const zone = this.getNextZone();
                this.currentZoneRows = zone.minRows + Math.floor(Math.random() * (zone.maxRows - zone.minRows + 1));
            }
            
            const startTime = performance.now();
            this.currentMaxZ++;
            this.createRow(this.currentMaxZ, this.currentZone.type);
            this.currentZoneRows--;
            const elapsed = performance.now() - startTime;
            if (elapsed > 5) console.log(`⚠️ Terrain row ${this.currentMaxZ} took ${elapsed.toFixed(2)}ms`);
        }
        
        // Cleanup old rows less frequently (every 10th frame)
        if (!this.cleanupCounter) this.cleanupCounter = 0;
        this.cleanupCounter++;
        if (this.cleanupCounter % 10 !== 0) return;
        
        const cleanupDistance = 20;
        this.rows = this.rows.filter(row => {
            if (row.z < playerZ - cleanupDistance) {
                // Remove all meshes
                row.tiles.forEach(tile => {
                    this.scene.remove(tile);
                    tile.geometry.dispose();
                    tile.material.dispose();
                });
                row.decorations.forEach(dec => {
                    this.scene.remove(dec);
                    if (dec.geometry) dec.geometry.dispose();
                    if (dec.material) dec.material.dispose();
                    // Handle groups
                    dec.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    });
                });
                return false;
            }
            return true;
        });
    }
    
    animateWaterfall(waterfall) {
        if (!waterfall.userData.foamParticles) return;
        
        // Determine flow direction based on waterfall position (left = flow left, right = flow right)
        const isLeftSide = waterfall.position.x < 0;
        const flowDirection = isLeftSide ? -1 : 1; // Left side flows left (negative X), right side flows right (positive X)
        
        // Animate foam particles flowing horizontally
        waterfall.userData.foamParticles.forEach(foam => {
            foam.position.x += foam.userData.flowSpeed * flowDirection;
            foam.rotation.y += 0.08; // Spin horizontally
            foam.rotation.z += 0.03;
            
            // Reset when flowing too far
            if ((isLeftSide && foam.position.x < -1.5) || (!isLeftSide && foam.position.x > 1.5)) {
                foam.position.x = foam.userData.startX;
                foam.position.z = (Math.random() - 0.5) * 0.8;
            }
        });
        
        // Pulse the main waterfall opacity
        if (waterfall.children[0]) {
            const time = Date.now() * 0.002;
            waterfall.children[0].material.opacity = 0.6 + Math.sin(time) * 0.15;
        }
    }
    
    getRowAt(z) {
        return this.rows.find(row => row.z === Math.round(z));
    }
    
    getTerrainTypeAt(x, z) {
        const row = this.getRowAt(z);
        return row ? row.type : 'grass';
    }
    
    isWater(x, z) {
        return this.getTerrainTypeAt(x, z) === 'water';
    }
    
    isRoad(x, z) {
        const type = this.getTerrainTypeAt(x, z);
        return type === 'road' || type === 'rail';
    }
    
    hasObstacle(gridX, gridZ) {
        const row = this.getRowAt(gridZ);
        if (!row) return false;
        
        // Check all decorations for obstacles at this grid position
        for (const decoration of row.decorations) {
            if (decoration.userData.isObstacle) {
                const dx = Math.abs(decoration.userData.gridX - gridX);
                const dz = Math.abs(decoration.userData.gridZ - gridZ);
                if (dx < 0.5 && dz < 0.5) {
                    return true;
                }
            }
        }
        return false;
    }
    
    clear() {
        this.rows.forEach(row => {
            row.tiles.forEach(tile => {
                this.scene.remove(tile);
                tile.geometry.dispose();
                tile.material.dispose();
            });
            row.decorations.forEach(dec => {
                this.scene.remove(dec);
                dec.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            });
        });
        this.rows = [];
        this.currentMaxZ = 0;
    }
}
