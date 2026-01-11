// terrain.js - Three.js terrain generation

class TerrainGenerator {
    constructor(scene) {
        this.scene = scene;
        this.rows = [];
        this.currentMaxZ = 0;
        this.currentZone = null;
        this.zoneRowsRemaining = 0;
        this.currentScore = 0; // Track score for progressive difficulty
        
        // OTTIMIZZAZIONE: Sistema terrain tiles con InstancedMesh globale
        // Invece di ~1000 mesh separate, usiamo 4 InstancedMesh (una per tipo)
        this.terrainTypes = ['grass', 'road', 'water', 'rail'];
        this.terrainMeshes = {}; // InstancedMesh per ogni tipo di terreno
        this.terrainTilePositions = {}; // Map<type, Map<"x,z", index>>
        this.maxTilesPerType = 2000; // Capacità massima per tipo
        this.tilesPerRow = 25; // Da -12 a +12
        
        // NUOVO: Sistema rotaie ottimizzato con InstancedMesh globale
        this.railRowsZ = new Set(); // Traccia le posizioni Z delle rotaie
        this.globalRailMesh = null; // InstancedMesh globale per tutte le traverse
        this.globalRailsMesh = null; // Mesh per i binari metallici
        this.maxRailRows = 20; // Massimo numero di righe rotaia visibili
        this.sleepersPerRow = 50; // Traverse per riga
        
        // Pre-cache pool for warning lights only (rails now use global InstancedMesh)
        this.warningLightPool = [];
        
        // Animation time per cascate (invece di Date.now() ripetuto)
        this.waterfallAnimTime = 0;
        this.initObjectPools();
        
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
    
    initObjectPools() {
        console.log('🔧 Initializing global InstancedMesh systems...');
        
        // =====================================================
        // TERRAIN TILES - InstancedMesh per tipo (colore fisso, no setColorAt)
        // =====================================================
        const tileGeometry = GeometryPool.getBoxGeometry(1, 0.5, 1);
        
        // Colori fissi per ogni tipo (evita creazione di nuovi shader)
        this.terrainColors = {
            grass: 0x5FAD56,  // Verde
            road: 0x555555,   // Asfalto grigio
            water: 0x2196F3,  // Blu
            rail: 0x8B7355    // Ghiaia/sabbia
        };
        
        for (const type of this.terrainTypes) {
            // Materiale con colore fisso (POOLED per evitare nuovi shader)
            const isWater = type === 'water';
            const material = MaterialPool.getMaterial(this.terrainColors[type], {
                poolable: !isWater, // L'acqua ha trasparenza quindi non poolabile
                transparent: isWater,
                opacity: isWater ? 0.9 : 1.0
            });
            const mesh = new THREE.InstancedMesh(tileGeometry, material, this.maxTilesPerType);
            mesh.count = 0;
            mesh.frustumCulled = false;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.terrainMeshes[type] = mesh;
            this.terrainTilePositions[type] = new Map();
        }
        console.log(`✅ Terrain InstancedMesh created (4 types, ${this.maxTilesPerType} tiles each)`);
        
        // =====================================================
        // RAIL SLEEPERS - InstancedMesh globale
        // =====================================================
        const sleeperGeometry = GeometryPool.getBoxGeometry(0.15, 0.12, 0.85);
        const sleeperMaterial = MaterialPool.getMaterial(0x6B4423, { poolable: true });
        const totalSleepers = this.maxRailRows * this.sleepersPerRow;
        this.globalRailMesh = new THREE.InstancedMesh(sleeperGeometry, sleeperMaterial, totalSleepers);
        this.globalRailMesh.count = 0;
        this.globalRailMesh.frustumCulled = false;
        this.scene.add(this.globalRailMesh);
        
        // Binari metallici
        const railGeometry = GeometryPool.getBoxGeometry(24, 0.1, 0.1);
        const railMaterial = MaterialPool.getMaterial(0xA8A8A8, { poolable: true });
        this.globalRailsMesh = new THREE.InstancedMesh(railGeometry, railMaterial, this.maxRailRows * 2);
        this.globalRailsMesh.count = 0;
        this.globalRailsMesh.frustumCulled = false;
        this.scene.add(this.globalRailsMesh);
        
        // Pre-calcola offset traverse
        this.sleeperOffsets = [];
        for (let i = 0; i < this.sleepersPerRow; i++) {
            this.sleeperOffsets.push(-12 + (i * 0.5));
        }
        console.log(`✅ Rail InstancedMesh created (${totalSleepers} sleepers capacity)`);
        
        // =====================================================
        // WARNING LIGHTS - Pool di oggetti (reduced)
        // =====================================================
        // Reduce pre-created warning lights to save memory and GPU cost on mobile devices
        for (let i = 0; i < 32; i++) {
            const light = Models.createTrainWarningLight();
            light.visible = false;
            this.scene.add(light);
            this.warningLightPool.push(light);
        }
        console.log(`✅ Pre-cached ${this.warningLightPool.length} warning lights`);
    }
    
    // NUOVO: Aggiorna la InstancedMesh globale delle rotaie
    updateGlobalRailMesh() {
        const matrix = new THREE.Matrix4();
        let sleeperIndex = 0;
        let railIndex = 0;
        
        // Itera su tutte le righe rotaia attive
        for (const z of this.railRowsZ) {
            // Aggiungi traverse per questa riga
            for (let i = 0; i < this.sleepersPerRow && sleeperIndex < this.globalRailMesh.count; i++) {
                const x = this.sleeperOffsets[i];
                matrix.makeTranslation(x, 0.2, z);
                this.globalRailMesh.setMatrixAt(sleeperIndex, matrix);
                sleeperIndex++;
            }
            
            // Aggiungi i 2 binari metallici per questa riga
            if (railIndex < this.globalRailsMesh.count) {
                // Binario sinistro
                matrix.makeTranslation(0, 0.28, z - 0.32);
                this.globalRailsMesh.setMatrixAt(railIndex, matrix);
                railIndex++;
                
                // Binario destro
                matrix.makeTranslation(0, 0.28, z + 0.32);
                this.globalRailsMesh.setMatrixAt(railIndex, matrix);
                railIndex++;
            }
        }
        
        this.globalRailMesh.instanceMatrix.needsUpdate = true;
        this.globalRailsMesh.instanceMatrix.needsUpdate = true;
    }
    
    // NUOVO: Aggiunge una riga rotaia al sistema globale
    addRailRow(z) {
        if (this.railRowsZ.has(z)) return; // Già presente
        
        this.railRowsZ.add(z);
        
        // Aggiorna il count delle istanze
        this.globalRailMesh.count = this.railRowsZ.size * this.sleepersPerRow;
        this.globalRailsMesh.count = this.railRowsZ.size * 2;
        
        // Ricostruisci la mesh (necessario per aggiungere nuove righe)
        this.updateGlobalRailMesh();
    }
    
    // NUOVO: Rimuove una riga rotaia dal sistema globale
    removeRailRow(z) {
        if (!this.railRowsZ.has(z)) return;
        
        this.railRowsZ.delete(z);
        
        // Aggiorna il count delle istanze
        this.globalRailMesh.count = this.railRowsZ.size * this.sleepersPerRow;
        this.globalRailsMesh.count = this.railRowsZ.size * 2;
        
        // Ricostruisci la mesh
        this.updateGlobalRailMesh();
    }
    
    // =====================================================
    // TERRAIN TILES - Metodi per InstancedMesh
    // =====================================================
    
    // Aggiunge una riga di tiles al sistema InstancedMesh
    addTerrainRow(z, type) {
        const mesh = this.terrainMeshes[type];
        const positions = this.terrainTilePositions[type];
        const matrix = new THREE.Matrix4();
        
        for (let x = -12; x <= 12; x++) {
            const key = `${x},${z}`;
            if (positions.has(key)) continue; // Già presente
            
            const index = mesh.count;
            if (index >= this.maxTilesPerType) {
                console.warn(`⚠️ Max tiles reached for type ${type}`);
                return;
            }
            
            // Solo l'acqua ha y=-0.25 per effetto profondità
            const tileY = (type === 'water') ? -0.25 : 0;
            matrix.makeTranslation(x, tileY, z);
            mesh.setMatrixAt(index, matrix);
            
            positions.set(key, index);
            mesh.count++;
        }
        mesh.instanceMatrix.needsUpdate = true;
    }
    
    // Rimuove una riga di tiles dal sistema InstancedMesh
    removeTerrainRow(z, type) {
        const mesh = this.terrainMeshes[type];
        const positions = this.terrainTilePositions[type];
        const matrix = new THREE.Matrix4();
        
        // Trova tutti i tiles da rimuovere
        const toRemove = [];
        for (let x = -12; x <= 12; x++) {
            const key = `${x},${z}`;
            if (positions.has(key)) {
                toRemove.push({ key, index: positions.get(key) });
            }
        }
        
        if (toRemove.length === 0) return;
        
        // Rimuovi sostituendo con l'ultimo elemento (swap-and-pop)
        toRemove.sort((a, b) => b.index - a.index); // Ordina per indice decrescente
        
        for (const { key, index } of toRemove) {
            const lastIndex = mesh.count - 1;
            
            if (index < lastIndex) {
                // Copia l'ultimo elemento nella posizione da rimuovere
                const lastMatrix = new THREE.Matrix4();
                mesh.getMatrixAt(lastIndex, lastMatrix);
                mesh.setMatrixAt(index, lastMatrix);
                
                // Aggiorna la mappa delle posizioni
                for (const [k, v] of positions.entries()) {
                    if (v === lastIndex) {
                        positions.set(k, index);
                        break;
                    }
                }
            }
            
            positions.delete(key);
            mesh.count--;
        }
        
        mesh.instanceMatrix.needsUpdate = true;
    }
    
    // Ricostruisce tutte le InstancedMesh dei terrain (usato dopo clear)
    rebuildAllTerrainMeshes() {
        const matrix = new THREE.Matrix4();
        
        for (const type of this.terrainTypes) {
            const mesh = this.terrainMeshes[type];
            const positions = this.terrainTilePositions[type];
            
            let index = 0;
            for (const [key, _] of positions.entries()) {
                const [x, z] = key.split(',').map(Number);
                const tileY = (type === 'water') ? -0.25 : 0;
                matrix.makeTranslation(x, tileY, z);
                mesh.setMatrixAt(index, matrix);
                positions.set(key, index);
                index++;
            }
            mesh.count = index;
            mesh.instanceMatrix.needsUpdate = true;
        }
    }
    
    generateInitialTerrain() {
        // Generate terrain behind spawn point (with dense obstacles to block backward movement)
        // Extended to -20 to ensure full visual coverage behind player
        for (let z = -20; z < -2; z++) {
            const row = this.createRow(z, 'grass');
            // Mark as barrier zone - will add extra dense decorations
            row.isBarrier = true;
        }
        
        // Start with safe grass zone at spawn point (NO OBSTACLES)
        for (let z = -2; z < 3; z++) {
            const row = this.createRow(z, 'grass');
            row.isSafeZone = true; // Mark as safe - no tree/rock obstacles
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
            tiles: [], // Non più usato per mesh individuali, ma manteniamo per compatibilità
            decorations: [],
            obstacles: []
        };
        
        // OTTIMIZZATO: Usa InstancedMesh invece di mesh individuali
        // Questo riduce i draw calls da ~25 per riga a 0 (gestito globalmente)
        this.addTerrainRow(z, type);
        
        // Add decorations based on type
        if (type === 'grass') {
            this.addGrassDecorations(row);
        } else if (type === 'rail') {
            this.addRailDecorations(row);
        } else if (type === 'water') {
            this.addWaterDecorations(row);
        } else if (type === 'road') {
            // Add dashed markings between consecutive road rows
            this.addRoadMarkings(row);
        }
        
        this.rows.push(row);
        return row;
    }
    
    addRoadMarkings(row) {
        // Add dashed center markings BETWEEN consecutive road rows.
        // We only add markings when the previous row is also 'road'.
        if (!this.rows || this.rows.length === 0) return;
        const prevRow = this.rows[this.rows.length - 1];
        if (!prevRow || prevRow.type !== 'road') return;

        // Compute z position between the two rows
        const zBetween = (prevRow.z + row.z) / 2;

        // Create a group to hold dash segments
        const group = new THREE.Group();
        group.userData.isRoadStripe = true;

        // Segment dimensions and spacing (thinner and shorter dashes)
        const segmentLength = 0.5; // shorter dash along X
        const segmentDepth = 0.08; // slim depth along Z
        const segmentHeight = 0.01; // very thin
        const gap = 0.35; // small gap between dashes
        const step = segmentLength + gap;

        // Horizontal range: extend to full map edges (-12..12)
        const startX = -12.0;
        const endX = 12.0;

        const geom = GeometryPool.getBoxGeometry(segmentLength, segmentHeight, segmentDepth);
        const mat = MaterialPool.getMaterial(0xFFFFFF, { poolable: true });

        // Place dashes centered on X; raise slightly above ground to avoid z-fighting
        const yPos = 0.255;
        for (let x = startX; x <= endX; x += step) {
            const seg = new THREE.Mesh(geom, mat);
            seg.position.set(x + segmentLength / 2, yPos, zBetween);
            seg.userData.isRoadMark = true;
            group.add(seg);
        }

        this.scene.add(group);
        // Attach to the current row decorations so it will be cleaned up with this row
        row.decorations.push(group);
    }
    
    addGrassDecorations(row) {
        const decorationChance = 0.35; // Densità originale
        const isBarrier = row.isBarrier;
        const isSafeZone = row.isSafeZone;
        
        // Genera decorazioni ogni 1 unità x (densità originale)
        for (let x = -12; x <= 12; x += 1) {
            const roundedX = Math.round(x);
            const isEdge = roundedX === -8 || roundedX === 8;
            const isOutside = roundedX < -8 || roundedX > 8;
            const isPlayable = roundedX >= -7 && roundedX <= 7;
            
            // DENSE OBSTACLES IN BARRIER ZONE (behind spawn point)
            if (isBarrier && isPlayable && Math.random() < 0.6) {
                const decoration = Math.random() < 0.7 ? Models.createTree() : Models.createRock();
                decoration.userData.isObstacle = true;
                decoration.userData.gridX = roundedX;
                decoration.userData.gridZ = row.z;
                decoration.position.set(x, 0.2, row.z);
                decoration.scale.multiplyScalar(1.3);
                this.scene.add(decoration);
                row.decorations.push(decoration);
                continue;
            }
            
            // Force obstacles at borders for visual boundary
            if (isEdge && Math.random() < 0.5) {
                const decoration = Math.random() < 0.5 ? Models.createTree() : Models.createRock();
                decoration.userData.isObstacle = true;
                decoration.userData.gridX = roundedX;
                decoration.userData.gridZ = row.z;
                decoration.position.set(x, 0.2, row.z);
                decoration.scale.multiplyScalar(1.2);
                this.scene.add(decoration);
                row.decorations.push(decoration);
            }
            // Decorazioni fuori dall'area giocabile - alberi, rocce e fiori
            else if (isOutside && Math.random() < 0.25) {
                const rand = Math.random();
                let decoration;
                if (rand < 0.4) {
                    decoration = Models.createTree();
                } else if (rand < 0.7) {
                    decoration = Models.createRock();
                } else {
                    decoration = Models.createFlower();
                }
                decoration.position.set(
                    x + (Math.random() - 0.5) * 0.8,
                    0.2,
                    row.z + (Math.random() - 0.5) * 0.8
                );
                this.scene.add(decoration);
                row.decorations.push(decoration);
            }
            // Decorazioni nell'area giocabile
            else if (isPlayable && Math.random() < decorationChance) {
                const rand = Math.random();
                let decoration;
                
                // Safe zone: solo decorazioni non-ostacolo (fiori e erba)
                if (isSafeZone) {
                    if (rand < 0.5) {
                        decoration = Models.createFlower();
                    } else {
                        decoration = Models.createGrassTuft();
                    }
                }
                // Area normale: mix di ostacoli e decorazioni
                else if (rand < 0.2) {
                    // Rocce come ostacoli
                    decoration = Models.createRock();
                    decoration.userData.isObstacle = true;
                    decoration.userData.gridX = roundedX;
                    decoration.userData.gridZ = row.z;
                    decoration.scale.multiplyScalar(1.5);
                } else if (rand < 0.35) {
                    // Alberi come ostacoli
                    decoration = Models.createTree();
                    decoration.userData.isObstacle = true;
                    decoration.userData.gridX = roundedX;
                    decoration.userData.gridZ = row.z;
                } else if (rand < 0.65) {
                    // Fiori decorativi
                    decoration = Models.createFlower();
                } else {
                    // Ciuffi d'erba
                    decoration = Models.createGrassTuft();
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
        // NUOVO: Usa il sistema globale InstancedMesh invece di creare oggetti individuali
        // Questo elimina completamente il lag!
        this.addRailRow(row.z);
        
        // Marca la riga come rotaia per il cleanup
        row.isRailRow = true;
        
        // Get pre-cached warning lights from pool
        let leftLight, rightLight;
        if (this.warningLightPool.length >= 2) {
            leftLight = this.warningLightPool.pop();
            rightLight = this.warningLightPool.pop();
            leftLight.visible = true;
            rightLight.visible = true;
            
            // Ensure lights are OFF when reused
            [leftLight, rightLight].forEach(light => {
                const lightMesh = light.children.find(c => c.userData.isWarningLight);
                const glow = light.children.find(c => c.userData.isWarningGlow);
                if (lightMesh) {
                    // Prefer material swap if available
                    if (lightMesh.userData && lightMesh.userData.offMaterial) {
                        lightMesh.material = lightMesh.userData.offMaterial;
                    } else {
                        lightMesh.material.opacity = 0.1;
                        if (lightMesh.material.emissive) lightMesh.material.emissive.setHex(0x000000);
                        if (typeof lightMesh.material.emissiveIntensity !== 'undefined') lightMesh.material.emissiveIntensity = 0;
                    }
                }
                if (glow) {
                    if (glow.userData && typeof glow.userData.offOpacity !== 'undefined') {
                        glow.material.opacity = glow.userData.offOpacity;
                    } else {
                        glow.material.opacity = 0.0;
                    }
                }
            });
        } else {
            console.warn('⚠️ Warning light pool exhausted, creating new lights');
            leftLight = Models.createTrainWarningLight();
            rightLight = Models.createTrainWarningLight();
            this.scene.add(leftLight);
            this.scene.add(rightLight);
        }
        
        // Posiziona le luci di avvertimento
        leftLight.position.set(-4, 0, row.z - 0.6);
        // Rotate pole so the housing faces forward like before (use Y rotation)
        leftLight.rotation.y = Math.PI;
        leftLight.userData.isWarningLight = true;
        row.decorations.push(leftLight);
        
        rightLight.position.set(4, 0, row.z - 0.6);
        // Rotate pole so the housing faces forward like before (use Y rotation)
        rightLight.rotation.y = Math.PI;
        rightLight.userData.isWarningLight = true;
        row.decorations.push(rightLight);
        
        // Store lights for flashing when train comes
        row.warningLights = [leftLight, rightLight];
    }
    
    addWaterDecorations(row) {
        // Cascate su ogni riga d'acqua (come prima)
        const leftWaterfall = this.createWaterfall();
        leftWaterfall.position.set(-7.5, 0.05, row.z);
        this.scene.add(leftWaterfall);
        row.decorations.push(leftWaterfall);
        row.leftWaterfall = leftWaterfall;
        
        const rightWaterfall = this.createWaterfall();
        rightWaterfall.position.set(7.5, 0.05, row.z);
        this.scene.add(rightWaterfall);
        row.decorations.push(rightWaterfall);
        row.rightWaterfall = rightWaterfall;
    }
    
    createWaterfall() {
        // OTTIMIZZATO: Usa materiali condivisi (creati una sola volta)
        if (!TerrainGenerator.waterfallMaterial) {
            TerrainGenerator.waterfallMaterial = new THREE.MeshBasicMaterial({
                color: 0xaaddff,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            TerrainGenerator.waterfallGeometry = new THREE.PlaneGeometry(2, 1);
            TerrainGenerator.foamMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.9
            });
        }
        
        const waterfallGroup = new THREE.Group();
        
        const waterfall = new THREE.Mesh(TerrainGenerator.waterfallGeometry, TerrainGenerator.waterfallMaterial);
        waterfall.rotation.x = -Math.PI / 2;
        waterfall.position.y = 0.1;
        waterfallGroup.add(waterfall);
        
        // 2 particelle di schiuma per riga
        const foamGeometry = GeometryPool.getBoxGeometry(0.3, 0.2, 0.3);
        waterfallGroup.userData.foamParticles = [];
        
        for (let i = 0; i < 2; i++) {
            const foam = new THREE.Mesh(foamGeometry, TerrainGenerator.foamMaterial);
            foam.position.set(0, 0.15, (Math.random() - 0.5) * 0.8);
            foam.userData.animOffset = Math.random() * Math.PI * 2;
            foam.userData.flowSpeed = 0.03 + Math.random() * 0.04;
            foam.userData.startX = (Math.random() - 0.5) * 1.5;
            waterfallGroup.add(foam);
            waterfallGroup.userData.foamParticles.push(foam);
        }
        
        waterfallGroup.userData.isWaterfall = true;
        return waterfallGroup;
    }
    
    update(playerZ, currentScore, normalizedDelta = 1) {
        // Update score for progressive terrain difficulty
        if (currentScore !== undefined) {
            this.currentScore = currentScore;
        }
        
        // OTTIMIZZAZIONE: Anima solo le cascate vicine (evita forEach su tutte le righe)
        const animationDistance = 15;
        const minZ = Math.floor(playerZ - animationDistance);
        const maxZ = Math.floor(playerZ + animationDistance);
        
        // Itera solo sulle righe vicine invece di tutte
        for (let z = minZ; z <= maxZ; z++) {
            const row = this.getRowAt(z);
            if (row && row.type === 'water') {
                if (row.leftWaterfall) this.animateWaterfall(row.leftWaterfall, normalizedDelta);
                if (row.rightWaterfall) this.animateWaterfall(row.rightWaterfall, normalizedDelta);
            }
        }
        
        // Generate new terrain ahead gradually (1 row at a time when needed)
        const generationDistance = 15;
        if (this.currentMaxZ < playerZ + generationDistance) {
            // Generate only 1 row per frame to avoid lag spikes
            if (!this.currentZoneRows || this.currentZoneRows <= 0) {
                const zone = this.getNextZone();
                this.currentZoneRows = zone.minRows + Math.floor(Math.random() * (zone.maxRows - zone.minRows + 1));
            }
            
            this.currentMaxZ++;
            this.createRow(this.currentMaxZ, this.currentZone.type);
            this.currentZoneRows--;
        }
        
        // Cleanup old rows less frequently (every 10th frame)
        if (!this.cleanupCounter) this.cleanupCounter = 0;
        this.cleanupCounter++;
        if (this.cleanupCounter % 10 !== 0) return;
        
        const cleanupDistance = 12;
        this.rows = this.rows.filter(row => {
            if (row.z < playerZ - cleanupDistance) {
                // OTTIMIZZATO: Rimuovi tiles dalla InstancedMesh
                this.removeTerrainRow(row.z, row.type);
                
                // Rimuovi la riga rotaia dal sistema globale
                if (row.isRailRow) {
                    this.removeRailRow(row.z);
                }
                
                row.decorations.forEach(dec => {
                    // Return warning lights to pool
                    if (dec.userData.isWarningLight) {
                        dec.visible = false;
                        dec.position.set(0, 0, 0);
                        dec.rotation.set(0,0,0);
                        
                        // Reset material state to OFF and hide glow
                        const lightMesh = dec.children.find(c => c.userData.isWarningLight);
                        const glow = dec.children.find(c => c.userData.isWarningGlow);
                        if (lightMesh) {
                            if (lightMesh.userData && lightMesh.userData.offMaterial) {
                                lightMesh.material = lightMesh.userData.offMaterial;
                            } else {
                                lightMesh.material.opacity = 0.1;
                                if (lightMesh.material.emissive) lightMesh.material.emissive.setHex(0x000000);
                                if (typeof lightMesh.material.emissiveIntensity !== 'undefined') lightMesh.material.emissiveIntensity = 0;
                            }
                        }
                        if (glow) {
                            if (glow.userData && typeof glow.userData.offOpacity !== 'undefined') {
                                glow.material.opacity = glow.userData.offOpacity;
                            } else {
                                glow.material.opacity = 0.0;
                            }
                        }
                        // Reset dome material if present
                        const dome = dec.children.find(c => c.userData.isWarningDome);
                        if (dome && dome.userData && dome.userData.offMaterial) {
                            dome.material = dome.userData.offMaterial;
                        }
                        
                        this.warningLightPool.push(dec);
                    } else {
                        // Normal disposal
                        this.scene.remove(dec);
                        if (dec.geometry) dec.geometry.dispose();
                        if (dec.material) dec.material.dispose();
                    }
                });
                return false;
            }
            return true;
        });
    }
    
    animateWaterfall(waterfall, normalizedDelta = 1) {
        if (!waterfall.userData.foamParticles) return;
        
        // Cache isLeftSide una sola volta alla creazione
        if (waterfall.userData.isLeftSide === undefined) {
            waterfall.userData.isLeftSide = waterfall.position.x < 0;
            waterfall.userData.flowDirection = waterfall.userData.isLeftSide ? -1 : 1;
        }
        
        const isLeftSide = waterfall.userData.isLeftSide;
        const flowDirection = waterfall.userData.flowDirection;
        
        // Anima le particelle di schiuma
        waterfall.userData.foamParticles.forEach(foam => {
            foam.position.x += foam.userData.flowSpeed * flowDirection * normalizedDelta;
            foam.rotation.y += 0.08 * normalizedDelta;
            foam.rotation.z += 0.03 * normalizedDelta;
            
            // Reset quando escono dall'area
            if ((isLeftSide && foam.position.x < -1.5) || (!isLeftSide && foam.position.x > 1.5)) {
                foam.position.x = foam.userData.startX;
                foam.position.z = (Math.random() - 0.5) * 0.8;
            }
        });
        
        // Effetto pulsante sull'opacità - usa timestamp passato invece di Date.now()
        if (waterfall.children[0]) {
            // Usa il framecount del terreno invece di Date.now() per evitare chiamata costosa
            if (!this.waterfallAnimTime) this.waterfallAnimTime = 0;
            this.waterfallAnimTime += 0.002 * normalizedDelta;
            waterfall.children[0].material.opacity = 0.6 + Math.sin(this.waterfallAnimTime) * 0.15;
        }
    }
    
    getRowAt(z) {
        // Cache per l'ultima riga richiesta (chiamato spesso con stesso Z)
        const roundedZ = Math.round(z);
        if (this._lastGetZ === roundedZ && this._lastGetRow) {
            return this._lastGetRow;
        }
        
        const row = this.rows.find(row => row.z === roundedZ);
        
        // Salva in cache
        this._lastGetZ = roundedZ;
        this._lastGetRow = row;
        
        return row;
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
            // Non più necessario rimuovere tiles individuali - usiamo InstancedMesh
            row.decorations.forEach(dec => {
                // Restituisci le warning lights al pool invece di distruggerle
                if (dec.userData.isWarningLight) {
                    // Reset visual state: core material off, glow opacity off, dome off
                    const lightMesh = dec.children.find(c => c.userData && c.userData.isWarningLight);
                    const glow = dec.children.find(c => c.userData && c.userData.isWarningGlow);
                    const dome = dec.children.find(c => c.userData && c.userData.isWarningDome);

                    if (lightMesh) {
                        if (lightMesh.userData && lightMesh.userData.offMaterial) {
                            lightMesh.material = lightMesh.userData.offMaterial;
                        } else {
                            lightMesh.material.opacity = 0.35;
                        }
                    }
                    if (glow) {
                        if (typeof glow.userData.offOpacity !== 'undefined') {
                            glow.material.opacity = glow.userData.offOpacity;
                        } else {
                            glow.material.opacity = 0.0;
                        }
                    }
                    if (dome && dome.userData && dome.userData.offMaterial) {
                        dome.material = dome.userData.offMaterial;
                    }

                    dec.visible = false;
                    dec.position.set(0, 0, 0);
                    dec.rotation.y = 0;
                    this.warningLightPool.push(dec);
                } else {
                    this.scene.remove(dec);
                    dec.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    });
                }
            });
        });
        this.rows = [];
        this.currentMaxZ = 0;
        
        // Reset del sistema rotaie globale
        this.railRowsZ.clear();
        this.globalRailMesh.count = 0;
        this.globalRailMesh.instanceMatrix.needsUpdate = true;
        this.globalRailsMesh.count = 0;
        this.globalRailsMesh.instanceMatrix.needsUpdate = true;
        
        // Reset delle InstancedMesh terrain
        for (const type of this.terrainTypes) {
            this.terrainMeshes[type].count = 0;
            this.terrainMeshes[type].instanceMatrix.needsUpdate = true;
            this.terrainTilePositions[type].clear();
        }
    }
}
