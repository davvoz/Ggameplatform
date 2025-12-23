// materials.js - Material definitions and helpers

// ===============================
// GEOMETRY & MATERIAL POOL
// ===============================
// Riutilizza geometrie e materiali invece di crearne di nuovi ogni volta
// Soluzione ai freeze causati dalla creazione di centinaia di oggetti

class GeometryPool {
    static geometries = new Map();
    
    static getBoxGeometry(width, height, depth) {
        const key = `box_${width}_${height}_${depth}`;
        if (!this.geometries.has(key)) {
            this.geometries.set(key, new THREE.BoxGeometry(width, height, depth));
        }
        return this.geometries.get(key);
    }
    
    static getCylinderGeometry(radiusTop, radiusBottom, height, radialSegments = 8) {
        const key = `cylinder_${radiusTop}_${radiusBottom}_${height}_${radialSegments}`;
        if (!this.geometries.has(key)) {
            this.geometries.set(key, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments));
        }
        return this.geometries.get(key);
    }
    
    static getConeGeometry(radius, height, radialSegments = 3) {
        const key = `cone_${radius}_${height}_${radialSegments}`;
        if (!this.geometries.has(key)) {
            this.geometries.set(key, new THREE.ConeGeometry(radius, height, radialSegments));
        }
        return this.geometries.get(key);
    }
    
    static getSphereGeometry(radius, widthSegments = 8, heightSegments = 8) {
        const key = `sphere_${radius}_${widthSegments}_${heightSegments}`;
        if (!this.geometries.has(key)) {
            this.geometries.set(key, new THREE.SphereGeometry(radius, widthSegments, heightSegments));
        }
        return this.geometries.get(key);
    }
    
    static clear() {
        this.geometries.forEach(geom => geom.dispose());
        this.geometries.clear();
    }
}

class MaterialPool {
    static materials = new Map();
    
    static getMaterial(color, options = {}) {
        const opts = {
            flatShading: true,
            transparent: false,
            opacity: 1.0,
            ...options
        };
        
        // DISABILITATO IL POOLING - Three.js ha problemi con materiali condivisi
        // che causano dissolvenze e artefatti visivi
        // I materiali sono leggeri, crearli non causa lag (le geometrie sono pooled)
        return new THREE.MeshLambertMaterial({
            color: color,
            flatShading: opts.flatShading,
            transparent: opts.transparent,
            opacity: opts.opacity
        });
    }
    
    static clear() {
        // Niente da pulire se non pooliamo
        this.materials.clear();
    }
}

// ===============================
// TEXTURE CACHE
// ===============================
class TextureCache {
    static textures = new Map();
    static isPreloaded = false;
    
    static async preloadAll() {
        console.log('🎨 Preloading textures...');
        const loader = new THREE.TextureLoader();
        const textureConfigs = [
            { path: 'assets/steem.png', rotate: true, repeat: 0.7 },
            { path: 'assets/bitcoin.png', rotate: true, repeat: 0.7 }
        ];
        
        await Promise.all(textureConfigs.map(config => 
            new Promise((resolve) => {
                loader.load(
                    config.path, 
                    (texture) => {
                        // Pre-configure texture settings
                        texture.center = new THREE.Vector2(0.5, 0.5);
                        if (config.rotate) {
                            texture.rotation = Math.PI / 2;
                        }
                        texture.repeat.set(config.repeat, config.repeat);
                        texture.needsUpdate = true;
                        
                        this.textures.set(config.path, texture);
                        console.log(`✅ Loaded: ${config.path}`);
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.warn(`⚠️ Failed to load: ${config.path}`, error);
                        resolve(); // Continue even if failed
                    }
                );
            })
        ));
        
        this.isPreloaded = true;
        console.log('✅ Texture preloading complete');
    }
    
    static get(path) {
        return this.textures.get(path);
    }
    
    static clear() {
        this.textures.forEach(tex => tex.dispose());
        this.textures.clear();
    }
}

// ===============================
// MATERIALS
// ===============================
const Materials = {
    // Standard materials with proper lighting response
    grass: new THREE.MeshLambertMaterial({ 
        color: 0x7EC850,
        flatShading: true
    }),
    
    road: new THREE.MeshLambertMaterial({ 
        color: 0x4A4A4A,
        flatShading: true
    }),
    
    water: new THREE.MeshLambertMaterial({ 
        color: 0x4DD0E1,
        transparent: true,
        opacity: 0.7,
        flatShading: true
    }),
    
    rail: new THREE.MeshLambertMaterial({ 
        color: 0x8B7355,
        flatShading: true
    }),
    
    // Car colors
    carColors: [
        0xFF4444, // Red
        0x4444FF, // Blue
        0xFFFF44, // Yellow
        0x44FF44, // Green
        0xFF44FF, // Magenta
        0x44FFFF  // Cyan
    ],
    
    getRandomCarColor() {
        return this.carColors[Math.floor(Math.random() * this.carColors.length)];
    }
};
