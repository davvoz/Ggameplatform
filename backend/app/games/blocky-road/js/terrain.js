// terrain.js - Three.js terrain generation

class TerrainGenerator {
    constructor(scene) {
        this.scene = scene;
        this.rows = [];
        this.currentMaxZ = 0;
        
        // Terrain types
        this.terrainTypes = ['grass', 'road', 'rail', 'water'];
        this.weights = {
            grass: 0.3,
            road: 0.35,
            rail: 0.15,
            water: 0.2
        };
    }
    
    generateInitialTerrain() {
        // Start with safe grass rows
        for (let z = -5; z <= 25; z++) {
            if (z < 3) {
                this.createRow(z, 'grass');
            } else {
                const type = this.getRandomTerrainType();
                this.createRow(z, type);
            }
        }
        this.currentMaxZ = 25;
    }
    
    getRandomTerrainType() {
        const rand = Math.random();
        let sum = 0;
        
        for (const [type, weight] of Object.entries(this.weights)) {
            sum += weight;
            if (rand < sum) return type;
        }
        
        return 'grass';
    }
    
    createRow(z, type) {
        const row = {
            z: z,
            type: type,
            tiles: [],
            decorations: [],
            obstacles: []
        };
        
        // Create tiles across the row
        for (let x = -5; x <= 5; x++) {
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
        }
        
        this.rows.push(row);
        return row;
    }
    
    addGrassDecorations(row) {
        const decorationChance = 0.3;
        
        for (let x = -5; x <= 5; x++) {
            if (Math.random() < decorationChance) {
                const rand = Math.random();
                let decoration;
                
                if (rand < 0.4) {
                    decoration = Models.createGrassTuft();
                } else if (rand < 0.7) {
                    decoration = Models.createFlower();
                } else if (rand < 0.85) {
                    decoration = Models.createRock();
                } else {
                    decoration = Models.createTree();
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
        // Add rail tracks across the row
        for (let x = -5; x <= 5; x++) {
            const track = Models.createRailTrack();
            track.position.set(x, 0, row.z);
            this.scene.add(track);
            row.decorations.push(track);
        }
    }
    
    update(playerZ) {
        // Generate new rows ahead
        const generationDistance = 20;
        while (this.currentMaxZ < playerZ + generationDistance) {
            this.currentMaxZ++;
            const type = this.getRandomTerrainType();
            this.createRow(this.currentMaxZ, type);
        }
        
        // Cleanup old rows
        const cleanupDistance = 15;
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
