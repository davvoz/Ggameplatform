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
        
        // Transition system
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.transitionDuration = 2.5; // 2.5 seconds for smooth transition
        this.nextTheme = null;
        this.oldLayers = [];
        this.oldParticles = [];
        this.oldBaseColors = null;
        
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
            this.startTransition(newTheme);
        }
    }
    
    startTransition(newTheme) {
        if (this.isTransitioning) return; // Avoid overlapping transitions
        
        this.isTransitioning = true;
        this.transitionProgress = 0;
        this.nextTheme = newTheme;
        
        // Save old theme data
        this.oldLayers = [...this.layers];
        this.oldParticles = [...this.particles];
        this.oldBaseColors = [...this.baseColors];
        
        // Initialize new theme (but don't switch yet)
        const tempTheme = this.currentTheme;
        this.currentTheme = newTheme;
        this.initializeTheme();
        
        // Store new theme data separately
        const newLayers = [...this.layers];
        const newParticles = [...this.particles];
        const newBaseColors = [...this.baseColors];
        
        // Restore old theme temporarily
        this.currentTheme = tempTheme;
        this.layers = this.oldLayers;
        this.particles = this.oldParticles;
        this.baseColors = this.oldBaseColors;
        
        // Store new theme for transition
        this.newLayers = newLayers;
        this.newParticles = newParticles;
        this.newBaseColors = newBaseColors;
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
        // Sky gradient background - PIÙ BRILLANTE
        this.baseColors = [
            [0.4, 0.7, 1.0, 1.0], // Blu più brillante (era 0.53, 0.81, 0.92)
            [0.6, 0.85, 1.0, 1.0]  // Celeste vivace (era 0.68, 0.85, 0.90)
        ];
        
        // Floating clouds with varied shapes - RIDOTTE
        for (let i = 0; i < 5; i++) { // Ridotto da 8 a 5
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
                color: [0.95, 0.95, 0.98, 0.45 + Math.random() * 0.12], // Meno bianche e meno opache
                type: 'cloud'
            });
        }
        
        // Flying birds
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.4,
                speed: 40 + Math.random() * 30,
                wingPhase: Math.random() * Math.PI * 2,
                size: 4 + Math.random() * 3,
                color: [0.2, 0.2, 0.2, 0.6],
                type: 'bird'
            });
        }
        
        // Sun rays
        for (let i = 0; i < 3; i++) {
            this.layers.push({
                x: this.canvasWidth * 0.8,
                y: this.canvasHeight * 0.15,
                angle: (i * Math.PI / 6) - Math.PI / 12,
                length: 150 + i * 30,
                width: 40,
                color: [1.0, 0.95, 0.7, 0.15],
                type: 'sunray',
                speed: 1 + i * 0.3 // Rotazione lenta
            });
        }
    }
    
    initOcean() {
        this.baseColors = [
            [0.0, 0.5, 1.0, 1.0],  // Blu oceano più brillante (era 0.4, 0.8)
            [0.1, 0.7, 1.0, 1.0]   // Azzurro oceano vivace (era 0.2, 0.6, 0.9)
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
        for (let i = 0; i < 25; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.5 + Math.random() * this.canvasHeight * 0.5,
                radius: 2 + Math.random() * 4,
                speed: 20 + Math.random() * 40,
                wobble: Math.random() * Math.PI * 2,
                color: [1.0, 1.0, 1.0, 0.4],
                type: 'bubble'
            });
        }
        
        // Fish swimming
        for (let i = 0; i < 4; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.6 + Math.random() * this.canvasHeight * 0.3,
                speed: 30 + Math.random() * 25,
                size: 8 + Math.random() * 6,
                swimPhase: Math.random() * Math.PI * 2,
                color: [0.9, 0.5, 0.2, 0.7],
                type: 'fish'
            });
        }
        
        // Seaweed/coral
        for (let i = 0; i < 5; i++) {
            this.layers.push({
                x: (i + 0.5) * this.canvasWidth / 5,
                y: this.canvasHeight * 0.8,
                height: 60 + Math.random() * 40,
                width: 8 + Math.random() * 6,
                swayPhase: Math.random() * Math.PI * 2,
                color: [0.1, 0.6 - i * 0.08, 0.4, 0.6],
                type: 'seaweed',
                speed: 0.5 + Math.random() * 0.5
            });
        }
    }
    
    initPyramids() {
        this.baseColors = [
            [0.85, 0.7, 0.35, 1.0], // Giallo sabbia meno luminoso (ridotta luminosità)
            [0.75, 0.6, 0.25, 1.0]   // Sabbia dorata più scura
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
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                radius: 1 + Math.random() * 2,
                speed: 30 + Math.random() * 40,
                color: [0.9, 0.8, 0.5, 0.5],
                type: 'sand'
            });
        }
        
        // Heat waves
        for (let i = 0; i < 4; i++) {
            this.layers.push({
                y: this.canvasHeight * (0.4 + i * 0.1),
                amplitude: 5 + i * 2,
                frequency: 0.02 + i * 0.005,
                speed: 2 + i * 0.5,
                offset: 0,
                color: [0.9, 0.8, 0.5, 0.08 - i * 0.02], // Ridotta opacità drasticamente
                type: 'heatwave'
            });
        }
        
        // Sand dunes in background
        for (let i = 0; i < 3; i++) {
            this.layers.push({
                x: i * this.canvasWidth / 2,
                y: this.canvasHeight * 0.65,
                width: 300 + Math.random() * 200,
                height: 40 + Math.random() * 30,
                color: [0.88 - i * 0.08, 0.73 - i * 0.08, 0.45, 0.4],
                type: 'dune',
                speed: 5 + i * 3
            });
        }
    }
    
    initVolcano() {
        this.baseColors = [
            [0.5, 0.1, 0.0, 1.0],  // Rosso scuro più intenso (era 0.3, 0.1, 0.1)
            [0.8, 0.3, 0.1, 1.0]   // Rosso-marrone più saturo (era 0.5, 0.2, 0.1)
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
            [0.05, 0.05, 0.2, 1.0], // Blu spazio scuro (ok)
            [0.15, 0.1, 0.4, 1.0]    // Viola più intenso (era 0.25)
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
                type: 'planet',
                speed: 2 + i // Velocità parallasse lenta
            });
        }
    }
    
    initForest() {
        this.baseColors = [
            [0.2, 0.6, 0.3, 1.0],  // Verde bosco più brillante (era 0.4)
            [0.3, 0.7, 0.4, 1.0]   // Verde foresta più vivace (era 0.5)
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
                    layer: layer,
                    speed: 8 + layer * 4 // Parallasse: alberi lontani più lenti
                });
            }
        }
        
        // Fireflies
        for (let i = 0; i < 18; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.8,
                radius: 2,
                speed: 15 + Math.random() * 15,
                floatY: Math.random() * Math.PI * 2,
                glowPhase: Math.random() * Math.PI * 2,
                color: [1.0, 1.0, 0.5, 0.8],
                type: 'firefly'
            });
        }
        
        // Falling leaves
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 3 + Math.random() * 4,
                speed: 15 + Math.random() * 20,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 3,
                drift: (Math.random() - 0.5) * 30,
                color: [0.8, 0.4 + Math.random() * 0.3, 0.1, 0.6],
                type: 'leaf'
            });
        }
        
        // Mushrooms on ground
        for (let i = 0; i < 6; i++) {
            this.layers.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.85,
                size: 6 + Math.random() * 8,
                color: i % 2 === 0 ? [0.9, 0.3, 0.3, 0.7] : [0.8, 0.6, 0.3, 0.7],
                type: 'mushroom',
                speed: 8 + i * 2
            });
        }
    }
    
    initIce() {
        this.baseColors = [
            [0.4, 0.75, 0.95, 1.0], // Azzurro ghiaccio più scuro (ridotta luminosità)
            [0.65, 0.85, 0.98, 1.0]    // Azzurro chiaro meno abbagliante
        ];
        
        // Ice crystals in background
        for (let i = 0; i < 6; i++) {
            this.layers.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.6,
                size: 30 + Math.random() * 40,
                rotation: Math.random() * Math.PI * 2,
                color: [0.6, 0.8, 0.95, 0.4], // Ridotta opacità da 0.6 a 0.4
                type: 'crystal',
                speed: 5 + i * 2 // Velocità parallasse
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
                color: [0.9, 0.95, 1.0, 0.5], // Ridotta opacità e luminosità
                type: 'snowflake'
            });
        }
    }
    
    initNight() {
        this.baseColors = [
            [0.05, 0.1, 0.3, 1.0],  // Blu notte più visibile (era 0.05, 0.2)
            [0.2, 0.15, 0.45, 1.0]    // Viola notte più vivace (era 0.15, 0.1, 0.3)
        ];
        
        // Moon
        this.layers.push({
            x: this.canvasWidth * 0.8,
            y: this.canvasHeight * 0.15,
            radius: 40,
            color: [0.95, 0.95, 0.85, 0.9],
            type: 'moon',
            speed: 2 // Velocità parallasse molto lenta
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
    
    update(deltaTime, cameraSpeed = 0) {
        this.animationTime += deltaTime;
        
        // Handle theme transition
        if (this.isTransitioning) {
            this.transitionProgress += deltaTime / this.transitionDuration;
            
            if (this.transitionProgress >= 1.0) {
                // Transition complete
                this.isTransitioning = false;
                this.transitionProgress = 1.0;
                this.currentTheme = this.nextTheme;
                this.layers = this.newLayers;
                this.particles = this.newParticles;
                this.baseColors = this.newBaseColors;
                this.oldLayers = [];
                this.oldParticles = [];
                this.oldBaseColors = null;
            }
        }
        
        // Update particles (con effetto parallasse camera)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            switch (p.type) {
                case 'cloud':
                    p.x -= (p.speed + cameraSpeed) * deltaTime;
                    if (p.x + (p.baseSize * 3) < 0) {
                        p.x = this.canvasWidth;
                        p.y = Math.random() * this.canvasHeight * 0.6;
                    }
                    break;
                    
                case 'bird':
                    p.x -= (p.speed + cameraSpeed) * deltaTime;
                    p.wingPhase += deltaTime * 5;
                    if (p.x < -20) {
                        p.x = this.canvasWidth + 20;
                        p.y = Math.random() * this.canvasHeight * 0.4;
                    }
                    break;
                    
                case 'fish':
                    p.x -= (p.speed + cameraSpeed) * deltaTime;
                    p.swimPhase += deltaTime * 4;
                    if (p.x < -20) {
                        p.x = this.canvasWidth + 20;
                        p.y = this.canvasHeight * 0.6 + Math.random() * this.canvasHeight * 0.3;
                    }
                    break;
                    
                case 'bubble':
                    p.y -= p.speed * deltaTime;
                    p.wobble += deltaTime * 2;
                    p.x += Math.sin(p.wobble) * 15 * deltaTime;
                    p.x -= cameraSpeed * deltaTime; // Aggiungo effetto camera
                    if (p.y < this.canvasHeight * 0.3) {
                        p.y = this.canvasHeight;
                        p.x = Math.random() * this.canvasWidth;
                    }
                    break;
                    
                case 'leaf':
                    p.y += p.speed * deltaTime;
                    p.x += p.drift * deltaTime;
                    p.x -= cameraSpeed * deltaTime; // Aggiungo effetto camera
                    p.rotation += p.rotationSpeed * deltaTime;
                    if (p.y > this.canvasHeight) {
                        p.y = -10;
                        p.x = Math.random() * this.canvasWidth;
                    }
                    break;
                    
                case 'sand':
                case 'ember':
                    p.x -= (p.speed + cameraSpeed) * deltaTime;
                    if (p.type === 'ember') {
                        p.y -= p.speed * deltaTime * 0.5; // Rise up
                    }
                    if (p.x < 0 || (p.type === 'ember' && p.y < 0)) {
                        p.x = this.canvasWidth;
                        p.y = this.canvasHeight * (0.5 + Math.random() * 0.5);
                    }
                    break;
                    
                case 'star':
                    p.x -= (p.speed + cameraSpeed) * deltaTime;
                    p.twinkle += deltaTime * 2;
                    if (p.x < 0) {
                        p.x = this.canvasWidth;
                        p.y = Math.random() * this.canvasHeight;
                    }
                    break;
                    
                case 'firefly':
                    p.x -= (p.speed + cameraSpeed) * deltaTime;
                    p.y += Math.sin(this.animationTime * 2 + p.floatY) * 0.5;
                    if (p.x < 0) {
                        p.x = this.canvasWidth;
                        p.y = Math.random() * this.canvasHeight * 0.8;
                    }
                    break;
                    
                case 'snowflake':
                    p.y += p.speed * deltaTime;
                    p.x += p.drift * deltaTime;
                    p.x -= cameraSpeed * deltaTime; // Aggiungo effetto camera
                    if (p.y > this.canvasHeight) {
                        p.y = 0;
                        p.x = Math.random() * this.canvasWidth;
                    }
                    break;
                    
                case 'shootingStar':
                    p.x -= (p.speed + cameraSpeed) * deltaTime;
                    p.y += p.speed * deltaTime * 0.3;
                    if (p.x < -p.length) {
                        this.particles.splice(i, 1);
                    }
                    break;
            }
        }
        
        // Update ALL layers con parallasse (non solo wave/pyramid/volcano)
        this.layers.forEach(layer => {
            // Wave layers (ocean)
            if (layer.type === 'wave') {
                layer.offset = (layer.offset || 0) + (layer.speed + cameraSpeed * 0.5) * deltaTime;
            }
            
            // Layers che si muovono orizzontalmente con parallasse
            if (layer.type === 'pyramid' || layer.type === 'volcano' || layer.type === 'dune' || 
                layer.type === 'tree' || layer.type === 'mushroom') {
                const layerSpeed = layer.speed || 10; // Default speed se non definito
                layer.x -= (layerSpeed + cameraSpeed * 0.3) * deltaTime;
                
                // Wrap around quando escono dallo schermo
                const layerWidth = layer.width || 100;
                if (layer.x + layerWidth < 0) {
                    layer.x = this.canvasWidth + Math.random() * 100;
                }
            }
            
            // Seaweed oscillazione
            if (layer.type === 'seaweed') {
                const layerSpeed = layer.speed || 0.5;
                layer.swayPhase = (layer.swayPhase || 0) + layerSpeed * deltaTime;
                // Anche il seaweed si muove leggermente con la camera
                layer.x -= cameraSpeed * 0.2 * deltaTime;
                if (layer.x < -50) {
                    layer.x = this.canvasWidth + 50;
                }
            }
            
            // Heatwave movement
            if (layer.type === 'heatwave') {
                layer.offset = (layer.offset || 0) + (layer.speed + cameraSpeed * 0.3) * deltaTime;
            }
            
            // Sunray rotation
            if (layer.type === 'sunray') {
                layer.angle = (layer.angle || 0) + deltaTime * 0.1;
            }
            
            // Crystal rotation
            if (layer.type === 'crystal') {
                layer.rotation = (layer.rotation || 0) + deltaTime * 0.5;
                // I cristalli si muovono anche loro
                const crystalSpeed = layer.speed || 8;
                layer.x -= (crystalSpeed + cameraSpeed * 0.25) * deltaTime;
                if (layer.x < -100) {
                    layer.x = this.canvasWidth + 100;
                }
            }
            
            // Planet movement (very slow parallax)
            if (layer.type === 'planet') {
                const planetSpeed = layer.speed || 3;
                layer.x -= (planetSpeed + cameraSpeed * 0.15) * deltaTime;
                if (layer.x + layer.radius < 0) {
                    layer.x = this.canvasWidth + layer.radius;
                }
            }
            
            // Moon movement (very slow)
            if (layer.type === 'moon') {
                const moonSpeed = layer.speed || 2;
                layer.x -= (moonSpeed + cameraSpeed * 0.1) * deltaTime;
                if (layer.x + layer.radius < 0) {
                    layer.x = this.canvasWidth + layer.radius;
                }
            }
        });
    }
    
    getBackgroundColor() {
        if (!this.isTransitioning || !this.oldBaseColors || !this.newBaseColors) {
            return this.baseColors[0];
        }
        
        // Smooth easing function (ease-in-out)
        const t = this.transitionProgress < 0.5 
            ? 2 * this.transitionProgress * this.transitionProgress 
            : 1 - Math.pow(-2 * this.transitionProgress + 2, 2) / 2;
        
        // Interpolate between old and new background colors
        const oldColor = this.oldBaseColors[0];
        const newColor = this.newBaseColors[0];
        
        return [
            oldColor[0] + (newColor[0] - oldColor[0]) * t,
            oldColor[1] + (newColor[1] - oldColor[1]) * t,
            oldColor[2] + (newColor[2] - oldColor[2]) * t,
            1.0
        ];
    }
    
    getLayers() {
        if (!this.isTransitioning) {
            return this.layers;
        }
        
        // During transition, blend old and new layers
        const t = this.transitionProgress;
        const fadeOutLayers = this.oldLayers.map(layer => {
            const fadedLayer = { ...layer };
            if (fadedLayer.color) {
                fadedLayer.color = [...fadedLayer.color];
                fadedLayer.color[3] *= (1 - t); // Fade out old layers
            }
            return fadedLayer;
        });
        
        const fadeInLayers = this.newLayers.map(layer => {
            const fadedLayer = { ...layer };
            if (fadedLayer.color) {
                fadedLayer.color = [...fadedLayer.color];
                fadedLayer.color[3] *= t; // Fade in new layers
            }
            return fadedLayer;
        });
        
        return [...fadeOutLayers, ...fadeInLayers];
    }
    
    getParticles() {
        if (!this.isTransitioning) {
            return this.particles;
        }
        
        // During transition, blend old and new particles
        const t = this.transitionProgress;
        const fadeOutParticles = this.oldParticles.map(particle => {
            const fadedParticle = { ...particle };
            if (fadedParticle.color) {
                fadedParticle.color = [...fadedParticle.color];
                fadedParticle.color[3] *= (1 - t); // Fade out old particles
            }
            return fadedParticle;
        });
        
        const fadeInParticles = this.newParticles.map(particle => {
            const fadedParticle = { ...particle };
            if (fadedParticle.color) {
                fadedParticle.color = [...fadedParticle.color];
                fadedParticle.color[3] *= t; // Fade in new particles
            }
            return fadedParticle;
        });
        
        return [...fadeOutParticles, ...fadeInParticles];
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
