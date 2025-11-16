/**
 * BackgroundSystem - Procedural animated backgrounds that change per level
 * Themes: Ocean, Sky, Pyramids, Volcano, Space, Forest, Ice, Night
 */

export const BackgroundThemes = {
    SKY: 'sky',
    OCEAN: 'ocean',
    PYRAMIDS: 'pyramids',
    VOLCANO: 'volcano',
    SPACE: 'space',
    FOREST: 'forest',
    ICE: 'ice',
    NIGHT: 'night'
};

export class BackgroundSystem {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.currentTheme = BackgroundThemes.SKY;
        this.animationTime = 0;
        this.layers = [];
        this.particles = [];
        
        this.themeSequence = [
            BackgroundThemes.SKY,
            BackgroundThemes.OCEAN,
            BackgroundThemes.PYRAMIDS,
            BackgroundThemes.VOLCANO,
            BackgroundThemes.SPACE,
            BackgroundThemes.FOREST,
            BackgroundThemes.ICE,
            BackgroundThemes.NIGHT
        ];
        
        this.initializeTheme();
    }
    
    setLevel(level) {
        const themeIndex = (level - 1) % this.themeSequence.length;
        const newTheme = this.themeSequence[themeIndex];
        
        if (newTheme !== this.currentTheme) {
            this.currentTheme = newTheme;
            this.initializeTheme();
        }
    }
    
    initializeTheme() {
        this.layers = [];
        this.particles = [];
        
        switch (this.currentTheme) {
            case BackgroundThemes.SKY:
                this.initSky();
                break;
            case BackgroundThemes.OCEAN:
                this.initOcean();
                break;
            case BackgroundThemes.PYRAMIDS:
                this.initPyramids();
                break;
            case BackgroundThemes.VOLCANO:
                this.initVolcano();
                break;
            case BackgroundThemes.SPACE:
                this.initSpace();
                break;
            case BackgroundThemes.FOREST:
                this.initForest();
                break;
            case BackgroundThemes.ICE:
                this.initIce();
                break;
            case BackgroundThemes.NIGHT:
                this.initNight();
                break;
        }
    }
    
    initSky() {
        // Sky gradient background
        this.baseColors = [
            [0.53, 0.81, 0.92, 1.0], // Light blue
            [0.68, 0.85, 0.90, 1.0]  // Lighter blue
        ];
        
        // Floating clouds with varied shapes
        for (let i = 0; i < 8; i++) {
            const baseSize = 40 + Math.random() * 40;
            const numPuffs = 3 + Math.floor(Math.random() * 3); // 3-5 puffs per cloud
            const puffs = [];
            
            for (let j = 0; j < numPuffs; j++) {
                puffs.push({
                    offsetX: (j - numPuffs / 2) * (baseSize * 0.5) + (Math.random() - 0.5) * 20,
                    offsetY: (Math.random() - 0.5) * 15,
                    radius: baseSize * (0.4 + Math.random() * 0.4)
                });
            }
            
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.6,
                baseSize: baseSize,
                puffs: puffs,
                speed: 10 + Math.random() * 20,
                color: [1.0, 1.0, 1.0, 0.7 + Math.random() * 0.2],
                type: 'cloud'
            });
        }
    }
    
    initOcean() {
        this.baseColors = [
            [0.0, 0.4, 0.8, 1.0],  // Deep blue
            [0.2, 0.6, 0.9, 1.0]   // Ocean blue
        ];
        
        // Waves
        for (let i = 0; i < 5; i++) {
            this.layers.push({
                y: this.canvasHeight * (0.7 + i * 0.1),
                amplitude: 20 + i * 5,
                frequency: 0.01 - i * 0.001,
                speed: 1 + i * 0.2,
                color: [0.1 + i * 0.1, 0.5 + i * 0.1, 0.85 - i * 0.05, 0.6 - i * 0.1],
                type: 'wave'
            });
        }
        
        // Bubbles
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * (0.6 + Math.random() * 0.4),
                radius: 3 + Math.random() * 5,
                speed: 20 + Math.random() * 30,
                color: [0.8, 0.9, 1.0, 0.4],
                type: 'bubble'
            });
        }
    }
    
    initPyramids() {
        this.baseColors = [
            [0.95, 0.85, 0.6, 1.0], // Sand yellow
            [0.85, 0.7, 0.4, 1.0]   // Dark sand
        ];
        
        // Pyramids in background
        const pyramidCount = 3;
        for (let i = 0; i < pyramidCount; i++) {
            this.layers.push({
                x: (this.canvasWidth / pyramidCount) * i + 50,
                y: this.canvasHeight * 0.6,
                width: 100 + Math.random() * 80,
                height: 80 + Math.random() * 60,
                color: [0.8 - i * 0.1, 0.65 - i * 0.1, 0.3, 1.0 - i * 0.2],
                type: 'pyramid',
                speed: 10 + i * 5 // Parallax effect
            });
        }
        
        // Sand particles
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                radius: 1 + Math.random() * 2,
                speed: 30 + Math.random() * 40,
                color: [0.9, 0.8, 0.5, 0.5],
                type: 'sand'
            });
        }
    }
    
    initVolcano() {
        this.baseColors = [
            [0.3, 0.1, 0.1, 1.0],  // Dark red
            [0.5, 0.2, 0.1, 1.0]   // Brown-red
        ];
        
        // Volcano in background
        this.layers.push({
            x: this.canvasWidth * 0.6,
            y: this.canvasHeight * 0.5,
            width: 200,
            height: 250,
            color: [0.2, 0.1, 0.1, 1.0],
            type: 'volcano',
            speed: 15
        });
        
        // Lava particles/embers
        for (let i = 0; i < 25; i++) {
            this.particles.push({
                x: this.canvasWidth * 0.6 + Math.random() * 100 - 50,
                y: this.canvasHeight * 0.5 + Math.random() * 100,
                radius: 2 + Math.random() * 4,
                speed: -50 - Math.random() * 80,
                color: [1.0, 0.3 + Math.random() * 0.3, 0.0, 0.9],
                type: 'ember'
            });
        }
    }
    
    initSpace() {
        this.baseColors = [
            [0.05, 0.05, 0.15, 1.0], // Dark space
            [0.1, 0.1, 0.25, 1.0]    // Deep purple
        ];
        
        // Stars
        for (let i = 0; i < 100; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                radius: 1 + Math.random() * 2,
                speed: 5 + Math.random() * 15,
                twinkle: Math.random() * Math.PI * 2,
                color: [1.0, 1.0, 1.0, 0.8],
                type: 'star'
            });
        }
        
        // Planets
        for (let i = 0; i < 3; i++) {
            this.layers.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.5,
                radius: 20 + Math.random() * 40,
                color: [
                    0.3 + Math.random() * 0.7,
                    0.3 + Math.random() * 0.7,
                    0.5 + Math.random() * 0.5,
                    0.7
                ],
                type: 'planet'
            });
        }
    }
    
    initForest() {
        this.baseColors = [
            [0.2, 0.4, 0.3, 1.0],  // Dark green
            [0.3, 0.5, 0.4, 1.0]   // Forest green
        ];
        
        // Trees in background (multiple layers)
        for (let layer = 0; layer < 3; layer++) {
            const treeCount = 5 - layer;
            for (let i = 0; i < treeCount; i++) {
                this.layers.push({
                    x: (this.canvasWidth / treeCount) * i + Math.random() * 50,
                    y: this.canvasHeight * (0.5 + layer * 0.15),
                    width: 40 - layer * 10,
                    height: 80 - layer * 20,
                    color: [0.1 + layer * 0.1, 0.3 + layer * 0.1, 0.15, 0.8 - layer * 0.2],
                    type: 'tree',
                    layer: layer
                });
            }
        }
        
        // Fireflies
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.8,
                radius: 2,
                speed: 15 + Math.random() * 10,
                floatY: Math.sin(Math.random() * Math.PI * 2),
                color: [1.0, 1.0, 0.6, 0.8],
                type: 'firefly'
            });
        }
    }
    
    initIce() {
        this.baseColors = [
            [0.7, 0.85, 0.95, 1.0], // Light ice blue
            [0.8, 0.9, 1.0, 1.0]    // White blue
        ];
        
        // Ice crystals in background
        for (let i = 0; i < 6; i++) {
            this.layers.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.6,
                size: 30 + Math.random() * 40,
                rotation: Math.random() * Math.PI * 2,
                color: [0.8, 0.9, 1.0, 0.6],
                type: 'crystal'
            });
        }
        
        // Snowflakes
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                radius: 2 + Math.random() * 3,
                speed: 30 + Math.random() * 40,
                drift: Math.random() * 20 - 10,
                color: [1.0, 1.0, 1.0, 0.8],
                type: 'snowflake'
            });
        }
    }
    
    initNight() {
        this.baseColors = [
            [0.05, 0.05, 0.2, 1.0],  // Dark night blue
            [0.15, 0.1, 0.3, 1.0]    // Purple night
        ];
        
        // Moon
        this.layers.push({
            x: this.canvasWidth * 0.8,
            y: this.canvasHeight * 0.15,
            radius: 40,
            color: [0.95, 0.95, 0.85, 0.9],
            type: 'moon'
        });
        
        // Stars (more than space)
        for (let i = 0; i < 80; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.7,
                radius: 1 + Math.random() * 2,
                twinkle: Math.random() * Math.PI * 2,
                color: [1.0, 1.0, 0.9, 0.9],
                type: 'star'
            });
        }
        
        // Shooting stars occasionally
        if (Math.random() > 0.5) {
            this.particles.push({
                x: this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.5,
                length: 40,
                speed: 300,
                color: [1.0, 1.0, 1.0, 0.8],
                type: 'shootingStar'
            });
        }
    }
    
    update(deltaTime) {
        this.animationTime += deltaTime;
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            switch (p.type) {
                case 'cloud':
                    p.x -= p.speed * deltaTime;
                    if (p.x + p.width < 0) {
                        p.x = this.canvasWidth;
                        p.y = Math.random() * this.canvasHeight * 0.6;
                    }
                    break;
                    
                case 'bubble':
                    p.y -= p.speed * deltaTime;
                    if (p.y < this.canvasHeight * 0.3) {
                        p.y = this.canvasHeight;
                        p.x = Math.random() * this.canvasWidth;
                    }
                    break;
                    
                case 'sand':
                case 'ember':
                    p.x -= p.speed * deltaTime;
                    if (p.type === 'ember') {
                        p.y += p.speed * deltaTime * 0.5; // Rise up
                    }
                    if (p.x < 0 || (p.type === 'ember' && p.y < 0)) {
                        p.x = this.canvasWidth;
                        p.y = this.canvasHeight * (0.5 + Math.random() * 0.5);
                    }
                    break;
                    
                case 'star':
                    p.x -= p.speed * deltaTime;
                    p.twinkle += deltaTime * 2;
                    if (p.x < 0) {
                        p.x = this.canvasWidth;
                        p.y = Math.random() * this.canvasHeight;
                    }
                    break;
                    
                case 'firefly':
                    p.x -= p.speed * deltaTime;
                    p.y += Math.sin(this.animationTime * 2 + p.floatY) * 0.5;
                    if (p.x < 0) {
                        p.x = this.canvasWidth;
                        p.y = Math.random() * this.canvasHeight * 0.8;
                    }
                    break;
                    
                case 'snowflake':
                    p.y += p.speed * deltaTime;
                    p.x += p.drift * deltaTime;
                    if (p.y > this.canvasHeight) {
                        p.y = 0;
                        p.x = Math.random() * this.canvasWidth;
                    }
                    break;
                    
                case 'shootingStar':
                    p.x -= p.speed * deltaTime;
                    p.y += p.speed * deltaTime * 0.3;
                    if (p.x < -p.length) {
                        this.particles.splice(i, 1);
                    }
                    break;
            }
        }
        
        // Update wave layers for ocean
        if (this.currentTheme === BackgroundThemes.OCEAN) {
            this.layers.forEach(layer => {
                if (layer.type === 'wave') {
                    layer.offset = (layer.offset || 0) + layer.speed * deltaTime;
                }
            });
        }
        
        // Update pyramids and volcano layers
        if (this.currentTheme === BackgroundThemes.PYRAMIDS || this.currentTheme === BackgroundThemes.VOLCANO) {
            this.layers.forEach(layer => {
                if ((layer.type === 'pyramid' || layer.type === 'volcano') && layer.speed) {
                    layer.x -= layer.speed * deltaTime;
                    // Wrap around when off screen
                    if (layer.x + layer.width < 0) {
                        layer.x = this.canvasWidth + Math.random() * 100;
                    }
                }
            });
        }
    }
    
    getBackgroundColor() {
        return this.baseColors[0];
    }
    
    getLayers() {
        return this.layers;
    }
    
    getParticles() {
        return this.particles;
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.initializeTheme();
    }
}
