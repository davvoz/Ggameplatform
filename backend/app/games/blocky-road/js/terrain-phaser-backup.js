// Terrain Manager - Procedural world generation
class TerrainManager {
    constructor(scene) {
        this.scene = scene;
        this.rows = new Map(); // z-index -> terrain object
        this.currentMaxZ = GAME_CONFIG.PLAYER_START_Z;
        this.lastTerrainType = null;
        
        // Initialize starting rows
        this.generateInitialTerrain();
    }

    generateInitialTerrain() {
        // Generate safe starting area + terrain davanti
        for (let z = GAME_CONFIG.PLAYER_START_Z + 5; z >= GAME_CONFIG.PLAYER_START_Z - 30; z--) {
            if (z >= GAME_CONFIG.PLAYER_START_Z - 1 && z <= GAME_CONFIG.PLAYER_START_Z + 1) {
                this.createRow(z, GAME_CONFIG.TERRAIN_TYPES.SAFE);
            } else {
                this.createRow(z, null); // Genera random
            }
        }
        this.currentMaxZ = GAME_CONFIG.PLAYER_START_Z - 30;
    }

    createRow(z, terrainType = null) {
        if (this.rows.has(z)) return;

        // Choose terrain type
        if (!terrainType) {
            terrainType = this.chooseNextTerrain();
        }

        const terrain = {
            z: z,
            type: terrainType,
            tiles: [],
            lanes: this.getLaneCount(terrainType),
            direction: Math.random() > 0.5 ? 1 : -1 // For vehicles
        };

        // Create visual tiles
        for (let x = 0; x < 10; x++) {
            const tile = this.createTile(x, z, terrainType);
            terrain.tiles.push(tile);
        }

        this.rows.set(z, terrain);
        this.currentMaxZ = Math.min(this.currentMaxZ, z);

        return terrain;
    }

    createTile(x, z, type) {
        const xPos = x * GAME_CONFIG.TILE_SIZE;
        const yPos = z * GAME_CONFIG.TILE_SIZE;
        
        let color, borderColor;
        switch (type) {
            case GAME_CONFIG.TERRAIN_TYPES.ROAD:
                color = GAME_CONFIG.COLORS.ROAD;
                borderColor = 0x444444;
                break;
            case GAME_CONFIG.TERRAIN_TYPES.WATER:
                color = GAME_CONFIG.COLORS.WATER;
                borderColor = 0x1976D2;
                break;
            case GAME_CONFIG.TERRAIN_TYPES.RAIL:
                color = GAME_CONFIG.COLORS.RAIL;
                borderColor = 0x5D4037;
                break;
            case GAME_CONFIG.TERRAIN_TYPES.SAFE:
                color = 0x8BC34A; // Light green
                borderColor = 0x689F38;
                break;
            default:
                color = GAME_CONFIG.COLORS.GRASS;
                borderColor = 0x558B2F;
        }

        // Main tile with subtle gradient effect
        const tile = this.scene.add.rectangle(xPos, yPos, 
            GAME_CONFIG.TILE_SIZE - 1, 
            GAME_CONFIG.TILE_SIZE - 1, 
            color
        );
        tile.setStrokeStyle(2, borderColor, 0.3);
        tile.setDepth(0);

        // Add random color variation
        const colorVariation = Math.random() * 0.1 - 0.05;
        tile.setAlpha(1 + colorVariation);

        // Add decorations based on type
        if (type === GAME_CONFIG.TERRAIN_TYPES.ROAD) {
            this.addRoadMarkings(xPos, yPos, x, z);
        } else if (type === GAME_CONFIG.TERRAIN_TYPES.GRASS) {
            if (Math.random() < 0.15) {
                this.addGrassDecoration(xPos, yPos);
            }
        } else if (type === GAME_CONFIG.TERRAIN_TYPES.WATER) {
            this.addWaterAnimation(tile);
            if (Math.random() < 0.08) {
                this.addWaterRipple(xPos, yPos);
            }
        } else if (type === GAME_CONFIG.TERRAIN_TYPES.RAIL) {
            this.addRailTrack(xPos, yPos, x);
        } else if (type === GAME_CONFIG.TERRAIN_TYPES.SAFE) {
            if (Math.random() < 0.2) {
                this.addFlower(xPos, yPos);
            }
        }

        return tile;
    }

    addRoadMarkings(x, y, gridX, gridZ) {
        // Centerline dashes
        if (gridX === 4 || gridX === 5) {
            const dash = this.scene.add.rectangle(x, y, 6, 25, GAME_CONFIG.COLORS.ROAD_LINES);
            dash.setDepth(1);
            dash.setAlpha(0.8);
        }
    }

    addRailTrack(x, y, gridX) {
        // Railway tracks
        if (gridX === 4 || gridX === 5) {
            const rail = this.scene.add.rectangle(x, y, 8, 60, 0x757575);
            rail.setDepth(1);
            
            // Sleepers
            if (Math.random() < 0.3) {
                const sleeper = this.scene.add.rectangle(x, y, 30, 6, 0x5D4037);
                sleeper.setDepth(1);
                sleeper.setAlpha(0.7);
            }
        }
    }

    addGrassDecoration(x, y) {
        const type = Math.random();
        if (type < 0.5) {
            // Small grass tuft
            for (let i = 0; i < 3; i++) {
                const blade = this.scene.add.rectangle(
                    x + Utils.randomInt(-10, 10),
                    y + Utils.randomInt(-10, 10),
                    2,
                    Utils.randomInt(6, 10),
                    0x66BB6A,
                    0.7
                );
                blade.setDepth(1);
                blade.angle = Utils.randomInt(-20, 20);
            }
        } else {
            // Small rock
            const rock = this.scene.add.circle(
                x + Utils.randomInt(-15, 15),
                y + Utils.randomInt(-15, 15),
                Utils.randomInt(4, 7),
                0x616161,
                0.8
            );
            rock.setDepth(1);
            rock.setStrokeStyle(1, 0x424242, 0.5);
        }
    }

    addFlower(x, y) {
        // Colorful flower
        const colors = [0xFF1744, 0xFFEB3B, 0xFF6F00, 0x00E5FF, 0xE040FB];
        const color = Utils.randomChoice(colors);
        
        const flower = this.scene.add.circle(
            x + Utils.randomInt(-18, 18),
            y + Utils.randomInt(-18, 18),
            5,
            color
        );
        flower.setDepth(1);
        
        // Petal details
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5;
            const petal = this.scene.add.circle(
                flower.x + Math.cos(angle) * 4,
                flower.y + Math.sin(angle) * 4,
                3,
                color,
                0.8
            );
            petal.setDepth(1);
        }
    }

    addWaterAnimation(tile) {
        // Animated water with shimmer
        this.scene.tweens.add({
            targets: tile,
            alpha: 0.85,
            duration: Utils.randomInt(1800, 2200),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * 1000
        });
    }

    addWaterRipple(x, y) {
        const ripple = this.scene.add.circle(
            x + Utils.randomInt(-20, 20),
            y + Utils.randomInt(-20, 20),
            3,
            0x64B5F6,
            0.5
        );
        ripple.setDepth(1);
        
        this.scene.tweens.add({
            targets: ripple,
            scale: 3,
            alpha: 0,
            duration: 2000,
            ease: 'Cubic.easeOut',
            onComplete: () => ripple.destroy()
        });
    }

    chooseNextTerrain() {
        // Weighted random selection with prevention of same type
        let patterns = TERRAIN_PATTERNS.filter(p => p.type !== this.lastTerrainType);
        
        const chosen = Utils.weightedRandom(patterns);
        this.lastTerrainType = chosen.type;
        
        return chosen.type;
    }

    getLaneCount(type) {
        if (type === GAME_CONFIG.TERRAIN_TYPES.ROAD) {
            return Utils.randomChoice([2, 3, 4]);
        } else if (type === GAME_CONFIG.TERRAIN_TYPES.RAIL) {
            return 1;
        }
        return 0;
    }

    update(playerZ) {
        // GENERAZIONE INFINITA - genera sempre 20 righe davanti al player
        const targetZ = playerZ - 20;
        while (this.currentMaxZ > targetZ) {
            this.createRow(this.currentMaxZ - 1);
            this.currentMaxZ--;
        }

        // Remove old rows behind player (mantieni 8 righe dietro)
        const cleanupZ = playerZ + 8;
        const toRemove = [];
        
        this.rows.forEach((terrain, z) => {
            if (z > cleanupZ) {
                toRemove.push(z);
            }
        });

        toRemove.forEach(z => {
            const terrain = this.rows.get(z);
            if (terrain && terrain.tiles) {
                terrain.tiles.forEach(tile => {
                    if (tile && tile.destroy) tile.destroy();
                });
            }
            this.rows.delete(z);
        });
    }

    getTerrain(z) {
        return this.rows.get(z);
    }

    reset() {
        // Clear all terrain
        this.rows.forEach(terrain => {
            terrain.tiles.forEach(tile => tile.destroy());
        });
        this.rows.clear();
        
        this.currentMaxZ = GAME_CONFIG.PLAYER_START_Z;
        this.lastTerrainType = null;
        
        // Regenerate
        this.generateInitialTerrain();
    }

    destroy() {
        this.rows.forEach(terrain => {
            terrain.tiles.forEach(tile => {
                if (tile) tile.destroy();
            });
        });
        this.rows.clear();
    }
}
