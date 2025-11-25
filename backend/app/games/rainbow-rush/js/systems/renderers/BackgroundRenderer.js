/**
 * BackgroundRenderer - Handles background layers and particles
 * Single Responsibility: Background visualization
 */
import { RenderingUtils } from './RenderingUtils.js';

export class BackgroundRenderer {
    constructor(renderer, canvasWidth, canvasHeight) {
        this.renderer = renderer;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.backgroundLayers = [];
        this.backgroundParticles = [];
        this.ambientParticles = [];
        this.backgroundColor = [0.4, 0.7, 1.0, 1.0]; // Default sky blue
        this.initAmbientParticles();
    }

    setBackground(layers, particles) {
        this.backgroundLayers = layers;
        this.backgroundParticles = particles;
    }

    setBackgroundColor(color) {
        this.backgroundColor = color;
    }

    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        // Reinitialize ambient particles with new canvas dimensions
        this.initAmbientParticles();
    }

    initAmbientParticles() {
        // Stars
        for (let i = 0; i < 15; i++) {
            this.ambientParticles.push({
                type: 'star',
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 1.5,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 3,
                brightness: 0.4, // Ridotto da 0.6
                color: [1.0, 1.0, 0.9]
            });
        }
        
        // Mist - RIDOTTE da 3 a 1
        for (let i = 0; i < 1; i++) {
            const hue = Math.random();
            this.ambientParticles.push({
                type: 'mist',
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 60, // Ridotto da 80
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 10,
                hue: hue,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
        
        // Energy particles - RIDOTTE da 8 a 5
        for (let i = 0; i < 5; i++) {
            this.ambientParticles.push({
                type: 'energy',
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 2 + Math.random() * 3,
                vx: (Math.random() - 0.5) * 40,
                vy: (Math.random() - 0.5) * 40,
                life: 1.0,
                maxLife: 2 + Math.random() * 3,
                color: [0.4 + Math.random() * 0.6, 0.5 + Math.random() * 0.5, 0.8 + Math.random() * 0.2]
            });
        }
    }

    update(deltaTime) {
        const time = Date.now() / 1000;
        
        this.ambientParticles.forEach(p => {
            if (p.type === 'mist') {
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                
                if (p.x < -p.size) p.x = this.canvasWidth + p.size;
                if (p.x > this.canvasWidth + p.size) p.x = -p.size;
                if (p.y < -p.size) p.y = this.canvasHeight + p.size;
                if (p.y > this.canvasHeight + p.size) p.y = -p.size;
            } else if (p.type === 'energy') {
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.life -= deltaTime;
                
                if (p.life <= 0) {
                    p.x = Math.random() * this.canvasWidth;
                    p.y = Math.random() * this.canvasHeight;
                    p.vx = (Math.random() - 0.5) * 40;
                    p.vy = (Math.random() - 0.5) * 40;
                    p.life = p.maxLife;
                }
                
                if (p.x < 0) p.x = this.canvasWidth;
                if (p.x > this.canvasWidth) p.x = 0;
                if (p.y < 0) p.y = this.canvasHeight;
                if (p.y > this.canvasHeight) p.y = 0;
            }
        });
    }

    render(time) {
        // Draw base background color to cover entire canvas
        this.renderer.drawRect(0, 0, this.canvasWidth, this.canvasHeight, this.backgroundColor);
        
        this.renderBackgroundLayers();
        this.renderBackgroundParticles();
        this.renderAmbientParticles(time);
    }

    renderBackgroundLayers() {
        const time = Date.now() / 1000;
        
        for (const layer of this.backgroundLayers) {
            switch (layer.type) {
                case 'sky_gradient':
                    // Draw sky with gradient effect
                    const skyTopColor = [0.5, 0.2, 0.15, 1.0]; // Lighter red at top
                    const skyBottomColor = layer.color; // Darker at horizon
                    
                    // Simple gradient using horizontal bands
                    const bands = 20;
                    for (let i = 0; i < bands; i++) {
                        const t = i / bands;
                        const bandY = layer.y + (layer.height * t);
                        const bandHeight = layer.height / bands + 1;
                        const color = [
                            skyTopColor[0] + (skyBottomColor[0] - skyTopColor[0]) * t,
                            skyTopColor[1] + (skyBottomColor[1] - skyTopColor[1]) * t,
                            skyTopColor[2] + (skyBottomColor[2] - skyTopColor[2]) * t,
                            1.0
                        ];
                        this.renderer.drawRect(0, bandY, this.canvasWidth * 10, bandHeight, color);
                    }
                    break;
                    
                case 'ground':
                    // Draw volcanic ground
                    this.renderer.drawRect(0, layer.y, this.canvasWidth * 10, layer.height, layer.color);
                    
                    // Add some ground texture details
                    const numRocks = 15;
                    for (let i = 0; i < numRocks; i++) {
                        const rockX = (this.canvasWidth / numRocks) * i + Math.sin(i * 2.5) * 30;
                        const rockY = layer.y + 10 + Math.random() * 20;
                        const rockSize = 5 + Math.random() * 8;
                        const rockColor = [
                            layer.color[0] * (0.7 + Math.random() * 0.3),
                            layer.color[1] * (0.7 + Math.random() * 0.3),
                            layer.color[2] * (0.7 + Math.random() * 0.3),
                            0.6
                        ];
                        this.renderer.drawCircle(rockX, rockY, rockSize, rockColor);
                    }
                    break;
                    
                case 'wave':
                    this.renderer.drawRect(0, layer.y, 10000, 50, layer.color);
                    break;
                case 'pyramid':
                    this.renderer.drawRect(layer.x, layer.y, layer.width, layer.height, layer.color);
                    break;
                case 'volcano':
                    this.renderVolcano(layer, time);
                    break;
                case 'lava_flow':
                    this.renderLavaFlow(layer, time);
                    break;
                case 'planet':
                    this.renderer.drawCircle(layer.x, layer.y, layer.radius, layer.color);
                    if (layer.radius > 35) {
                        const ringColor = [...layer.color];
                        ringColor[3] *= 0.5;
                        this.renderer.drawRect(layer.x - layer.radius * 1.5, layer.y, layer.radius * 3, 3, ringColor);
                    }
                    break;
                case 'tree':
                    this.renderTree(layer);
                    break;
                case 'crystal':
                    this.renderer.drawRect(layer.x - layer.size / 2, layer.y - layer.size / 2, layer.size, layer.size, layer.color);
                    break;
                case 'moon':
                    this.renderer.drawCircle(layer.x, layer.y, layer.radius, layer.color);
                    this.renderer.drawCircle(layer.x - 10, layer.y - 8, 8, [0.85, 0.85, 0.75, 0.9]);
                    this.renderer.drawCircle(layer.x + 12, layer.y + 5, 6, [0.85, 0.85, 0.75, 0.9]);
                    break;
                case 'sunray':
                    const rayEndX = layer.x + Math.cos(layer.angle) * layer.length;
                    const rayEndY = layer.y + Math.sin(layer.angle) * layer.length;
                    this.renderer.drawRect(layer.x, layer.y, Math.abs(rayEndX - layer.x), 2, layer.color);
                    break;
                case 'seaweed':
                    const sway = Math.sin(time + (layer.swayPhase || 0)) * 5;
                    this.renderer.drawRect(layer.x + sway, layer.y - layer.height, layer.width, layer.height, layer.color);
                    break;
                case 'heatwave':
                    this.renderer.drawRect(0, layer.y, this.canvasWidth, 2, layer.color);
                    break;
                case 'dune':
                    this.renderer.drawCircle(layer.x, layer.y, layer.width / 2, layer.color);
                    break;
                case 'nebula':
                    this.renderer.drawCircle(layer.x, layer.y, layer.width / 2, layer.color);
                    this.renderer.drawCircle(layer.x + 30, layer.y - 20, layer.width / 3, layer.color);
                    break;
                case 'mushroom':
                    this.renderer.drawRect(layer.x + layer.size * 0.3, layer.y, layer.size * 0.4, layer.size * 0.5, [0.9, 0.9, 0.85, 0.7]);
                    this.renderer.drawCircle(layer.x + layer.size / 2, layer.y, layer.size * 0.6, layer.color);
                    break;
                // MIXED THEME LAYERS
                case 'sun':
                    // Sunset ocean - glowing sun
                    const sunGlow = layer.glow ? Math.sin(time * 2) * 0.2 + 0.8 : 1.0;
                    this.renderer.drawCircle(layer.x, layer.y, layer.radius * 1.5 * sunGlow, [...layer.color.slice(0, 3), layer.color[3] * 0.3]);
                    this.renderer.drawCircle(layer.x, layer.y, layer.radius * sunGlow, layer.color);
                    break;
                case 'crystal_hanging':
                    // Crystal cave - hanging crystals (stalactites)
                    const hangGlow = Math.sin(time * 1.5 + layer.glowPhase) * 0.3 + 0.7;
                    const hangColor = [...layer.color.slice(0, 3), layer.color[3] * hangGlow];
                    // Glow
                    this.renderer.drawCircle(layer.x, layer.y + layer.height / 2, layer.width * 1.5, [...layer.color.slice(0, 3), hangColor[3] * 0.2]);
                    // Crystal body (triangle pointing down)
                    this.renderer.drawRect(layer.x - layer.width / 2, layer.y, layer.width, layer.height, hangColor);
                    break;
                case 'crystal_floor':
                    // Crystal cave - floor crystals (stalagmites)
                    const floorGlow = Math.sin(time * 1.5 + layer.glowPhase) * 0.3 + 0.7;
                    const floorColor = [...layer.color.slice(0, 3), layer.color[3] * floorGlow];
                    // Glow
                    this.renderer.drawCircle(layer.x, layer.y - layer.height / 2, layer.width * 1.5, [...layer.color.slice(0, 3), floorColor[3] * 0.2]);
                    // Crystal body (triangle pointing up)
                    this.renderer.drawRect(layer.x - layer.width / 2, layer.y - layer.height, layer.width, layer.height, floorColor);
                    break;
                case 'giant_mushroom':
                    // Mushroom forest - giant glowing mushrooms
                    const mushroomGlow = Math.sin(time * 2 + layer.glowPhase) * 0.3 + 0.7;
                    const stemColor = [0.85, 0.8, 0.75, 0.8];
                    // Glow around cap
                    this.renderer.drawCircle(layer.x, layer.y - layer.stemHeight, layer.size * 1.4, [...layer.color.slice(0, 3), layer.color[3] * 0.3 * mushroomGlow]);
                    // Stem
                    this.renderer.drawRect(layer.x - layer.size * 0.15, layer.y, layer.size * 0.3, layer.stemHeight, stemColor);
                    // Cap
                    const capColor = [...layer.color.slice(0, 3), layer.color[3] * mushroomGlow];
                    this.renderer.drawCircle(layer.x, layer.y - layer.stemHeight, layer.size, capColor);
                    break;
                case 'aurora_wave':
                    // Aurora night - colorful wave patterns
                    const numPoints = 50;
                    const wavePhase = time * layer.speed / 10 + (layer.phaseOffset || 0);
                    for (let i = 0; i < numPoints - 1; i++) {
                        const x1 = (this.canvasWidth / numPoints) * i;
                        const x2 = (this.canvasWidth / numPoints) * (i + 1);
                        const y1 = layer.y + Math.sin((x1 * layer.frequency) + wavePhase) * layer.amplitude;
                        const y2 = layer.y + Math.sin((x2 * layer.frequency) + wavePhase) * layer.amplitude;
                        // Draw thick wave segments
                        this.renderer.drawRect(x1, y1 - 3, x2 - x1 + 1, 6, layer.color);
                    }
                    break;
            }
        }
    }

    renderTree(tree) {
        const trunkColor = [0.3, 0.2, 0.1, tree.color[3]];
        this.renderer.drawRect(tree.x + tree.width * 0.4, tree.y + tree.height * 0.5, tree.width * 0.2, tree.height * 0.5, trunkColor);
        this.renderer.drawCircle(tree.x + tree.width / 2, tree.y + tree.height * 0.3, tree.width * 0.6, tree.color);
    }

    renderBackgroundParticles() {
        const time = Date.now() / 1000;
        
        for (const particle of this.backgroundParticles) {
            switch (particle.type) {
                case 'cloud':
                    this.renderCloud(particle);
                    break;
                case 'bubble':
                case 'star':
                case 'firefly':
                case 'snowflake':
                    this.renderSimpleParticle(particle);
                    break;
                case 'bird':
                    this.renderBird(particle);
                    break;
                case 'fish':
                    this.renderFish(particle);
                    break;
                case 'leaf':
                    this.renderer.drawCircle(particle.x, particle.y, particle.size / 2, particle.color);
                    break;
                case 'sand':
                case 'ember':
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius, particle.color);
                    if (particle.type === 'ember') {
                        // Enhanced ember glow with sparkle
                        const sparkle = particle.sparkle ? Math.sin(time * 8 + particle.sparkle) * 0.3 + 0.7 : 1.0;
                        this.renderer.drawCircle(particle.x, particle.y, particle.radius * 2.5 * sparkle, [1.0, 0.5, 0.0, 0.2]);
                        this.renderer.drawCircle(particle.x, particle.y, particle.radius * 1.5 * sparkle, [1.0, 0.7, 0.0, 0.4]);
                    }
                    break;
                case 'lava_glow':
                    const glowPulse = Math.sin(time * 2 + (particle.pulse || 0)) * 0.3 + 0.7;
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius * glowPulse, particle.color);
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius * 0.5 * glowPulse, [1.0, 0.8, 0.3, 0.6]);
                    break;
                case 'smoke':
                    const smokeExpansion = particle.expansion || 1;
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius * smokeExpansion, particle.color);
                    break;
                case 'shootingStar':
                    this.renderShootingStar(particle);
                    break;
                // MIXED THEME PARTICLES
                case 'glowdust':
                    // Crystal cave glowing dust
                    const dustGlow = Math.sin(time * 3 + particle.floatPhase) * 0.3 + 0.7;
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius * 1.5 * dustGlow, [...particle.color.slice(0, 3), particle.color[3] * 0.3]);
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius * dustGlow, particle.color);
                    break;
                case 'spore':
                    // Mushroom forest spores
                    const sporeGlow = Math.sin(time * 2 + particle.glowPhase) * 0.4 + 0.6;
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius * 2 * sporeGlow, [...particle.color.slice(0, 3), particle.color[3] * 0.2]);
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius * sporeGlow, particle.color);
                    break;
                case 'aurora_particle':
                    // Aurora night shimmering particles
                    const shimmer = Math.sin(time * 4 + particle.shimmer) * 0.5 + 0.5;
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius * (1 + shimmer * 0.5), [...particle.color.slice(0, 3), particle.color[3] * shimmer]);
                    break;
                case 'heatwave':
                    // Desert storm heat waves
                    const heatShimmer = Math.sin(time * 5 + particle.shimmer) * 0.6 + 0.4;
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius * heatShimmer, particle.color);
                    break;
            }
        }
    }

    renderCloud(particle) {
        if (!particle.puffs) return;
        
        for (const puff of particle.puffs) {
            this.renderer.drawCircle(particle.x + puff.offsetX + 2, particle.y + puff.offsetY + 2, puff.radius, [0.6, 0.6, 0.7, 0.2]); // Ombra più scura
        }
        
        for (const puff of particle.puffs) {
            this.renderer.drawCircle(particle.x + puff.offsetX, particle.y + puff.offsetY, puff.radius, particle.color);
        }
        
        for (let i = 0; i < Math.min(2, particle.puffs.length); i++) {
            const puff = particle.puffs[i];
            this.renderer.drawCircle(particle.x + puff.offsetX - puff.radius * 0.3, particle.y + puff.offsetY - puff.radius * 0.3, 
                                    puff.radius * 0.3, [0.95, 0.95, 0.98, 0.3]); // Highlight meno bianco
        }
    }

    renderSimpleParticle(particle) {
        const time = Date.now() / 1000;
        let alpha = particle.color[3];
        
        if (particle.type === 'star') {
            alpha = Math.abs(Math.sin(particle.twinkle || 0)) * 0.8 + 0.2;
            } else if (particle.type === 'firefly') {
                alpha = Math.abs(Math.sin(time / 0.4 + (particle.glowPhase || 0))) * 0.4 + 0.3; // Ridotto range
                this.renderer.drawCircle(particle.x, particle.y, particle.radius * 2.5, [0.9, 0.9, 0.3, alpha * 0.2]); // Alone più scuro
            }        const particleColor = [...particle.color];
        particleColor[3] = alpha;
        this.renderer.drawCircle(particle.x, particle.y, particle.radius, particleColor);
    }

    renderBird(particle) {
        const time = Date.now() / 1000;
        const wingFlap = Math.sin(time / 0.15 + (particle.wingPhase || 0)) * 2;
        this.renderer.drawRect(particle.x - particle.size, particle.y + wingFlap, particle.size, 1, particle.color);
        this.renderer.drawRect(particle.x, particle.y - wingFlap, particle.size, 1, particle.color);
    }

    renderFish(particle) {
        const time = Date.now() / 1000;
        const swimWave = Math.sin(time / 0.3 + (particle.swimPhase || 0)) * 2;
        this.renderer.drawCircle(particle.x, particle.y, particle.size / 2, particle.color);
        this.renderer.drawRect(particle.x - particle.size, particle.y + swimWave, particle.size * 0.6, 2, particle.color);
    }

    renderShootingStar(particle) {
        this.renderer.drawRect(particle.x, particle.y, particle.length, 2, particle.color);
        const trailColor = [...particle.color];
        trailColor[3] *= 0.3;
        this.renderer.drawRect(particle.x + particle.length, particle.y, particle.length * 0.5, 1, trailColor);
    }

    renderAmbientParticles(time) {
        this.ambientParticles.forEach(p => {
            if (p.type === 'star') {
                const twinkle = Math.sin(time * p.twinkleSpeed + p.twinklePhase) * 0.5 + 0.5;
                const alpha = p.brightness * twinkle * 0.4; // Ridotto da 0.6
                const color = [...p.color, alpha];
                
                this.renderer.drawCircle(p.x, p.y, p.size * 1.5, [...p.color, alpha * 0.2]); // Ridotto alone
                this.renderer.drawCircle(p.x, p.y, p.size, color);
                this.renderer.drawCircle(p.x, p.y, p.size * 0.5, [1.0, 1.0, 1.0, twinkle * 0.6]); // Ridotto core
            } else if (p.type === 'mist') {
                const pulse = Math.sin(time * 2 + p.pulsePhase) * 0.3 + 0.5;
                const rgb = RenderingUtils.hslToRgb(p.hue, 0.7, 0.5);
                const alpha = pulse * 0.08; // Ridotto DRASTICAMENTE da 0.15
                this.renderer.drawCircle(p.x, p.y, p.size, [...rgb, alpha]);
            } else if (p.type === 'energy') {
                const alpha = (p.life / p.maxLife) * 0.3; // Ridotto da 0.5
                const color = [...p.color, alpha];
                
                this.renderer.drawCircle(p.x, p.y, p.size * 1.5, color);
                this.renderer.drawCircle(p.x, p.y, p.size, [...p.color, alpha * 1.5]);
            }
        });
    }
    
    /**
     * Render professional volcano with realistic shape
     */
    renderVolcano(volcano, time) {
        const baseX = volcano.x;
        const baseY = volcano.y + volcano.height;
        const width = volcano.width;
        const height = volcano.height;
        const craterWidth = volcano.craterWidth || 60;
        const craterDepth = volcano.craterDepth || 50;
        
        // Volcano body - triangular mountain shape with perspective
        const leftBase = baseX - width / 2;
        const rightBase = baseX + width / 2;
        const peak = volcano.y;
        
        // Dark rock gradient - darker at edges, lighter in center
        const baseColor = volcano.color;
        const lightColor = [baseColor[0] * 1.3, baseColor[1] * 1.3, baseColor[2] * 1.3, baseColor[3]];
        const darkColor = [baseColor[0] * 0.7, baseColor[1] * 0.7, baseColor[2] * 0.7, baseColor[3]];
        
        // Left slope (darker)
        this.renderer.drawTriangle(
            leftBase, baseY,
            baseX - craterWidth / 2, peak,
            baseX, baseY,
            darkColor
        );
        
        // Right slope (lighter - lit by sun)
        this.renderer.drawTriangle(
            baseX, baseY,
            baseX + craterWidth / 2, peak,
            rightBase, baseY,
            lightColor
        );
        
        // Crater interior - glowing lava
        const craterLeftX = baseX - craterWidth / 2;
        const craterRightX = baseX + craterWidth / 2;
        const craterBottomY = peak + craterDepth;
        
        // Inner crater walls (very dark)
        this.renderer.drawTriangle(
            craterLeftX, peak,
            craterLeftX + 5, craterBottomY,
            baseX, craterBottomY,
            [0.08, 0.04, 0.02, 1.0]
        );
        this.renderer.drawTriangle(
            baseX, craterBottomY,
            craterRightX - 5, craterBottomY,
            craterRightX, peak,
            [0.1, 0.05, 0.03, 1.0]
        );
        
        // Lava pool at bottom of crater (animated glow)
        const lavaGlow = Math.sin(time * 2) * 0.15 + 0.85;
        const lavaY = craterBottomY - 5;
        this.renderer.drawRect(
            craterLeftX + 8,
            lavaY,
            craterWidth - 16,
            15,
            [1.0 * lavaGlow, 0.4 * lavaGlow, 0.0, 0.95]
        );
        
        // Bright lava center
        this.renderer.drawRect(
            baseX - craterWidth / 4,
            lavaY + 3,
            craterWidth / 2,
            8,
            [1.0, 0.7 * lavaGlow, 0.2 * lavaGlow, 1.0]
        );
        
        // Lava glow emanating from crater
        for (let i = 0; i < 3; i++) {
            const glowAlpha = (0.3 - i * 0.08) * lavaGlow;
            const glowSize = (i + 1) * 15;
            this.renderer.drawCircle(
                baseX,
                peak + craterDepth / 2,
                craterWidth / 2 + glowSize,
                [1.0, 0.4, 0.0, glowAlpha]
            );
        }
        
        // Rock texture details on slopes
        const numRocks = 8;
        for (let i = 0; i < numRocks; i++) {
            const t = (i + 0.5) / numRocks;
            const y = peak + height * t * 0.7;
            const xOffset = (i % 2 === 0 ? -1 : 1) * (width / 4 + Math.sin(i * 2.5) * width / 8);
            const rockSize = 6 + Math.sin(i * 3) * 4;
            
            this.renderer.drawCircle(
                baseX + xOffset,
                y,
                rockSize,
                [baseColor[0] * 0.6, baseColor[1] * 0.6, baseColor[2] * 0.6, 0.8]
            );
        }
    }
    
    /**
     * Render lava flow with animation - professional organic look
     */
    renderLavaFlow(flow, time) {
        const flowWave = Math.sin(time * 3 + flow.flowPhase) * 4;
        const glowPulse = Math.sin(time * 4 + flow.flowPhase) * 0.2 + 0.8;
        
        // Draw lava flow as series of organic segments
        const segments = 12;
        const segmentHeight = flow.height / segments;
        
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const y = flow.y + i * segmentHeight;
            
            // Width variation - narrower at top, wider at bottom with waves
            const widthFactor = 0.6 + t * 0.4 + Math.sin(time * 5 + flow.flowPhase + i * 0.5) * 0.15;
            const segmentWidth = flow.width * widthFactor;
            
            // Horizontal wave movement
            const wave = Math.sin(time * 4 + flow.flowPhase + i * 0.3) * 5;
            const x = flow.x - segmentWidth / 2 + wave;
            
            // Color gradient - brighter at edges, darker in center for depth
            const brightness = glowPulse * (0.8 + Math.sin(time * 6 + i * 0.4) * 0.2);
            const edgeColor = [1.0 * brightness, 0.35 * brightness, 0.0, flow.color[3]];
            const coreColor = [0.7 * brightness, 0.2 * brightness, 0.0, flow.color[3] * 0.9];
            
            // Main lava segment with rounded edges
            this.renderer.drawRect(x, y, segmentWidth, segmentHeight + 2, edgeColor);
            
            // Inner darker core for depth
            this.renderer.drawRect(
                x + segmentWidth * 0.25,
                y + 1,
                segmentWidth * 0.5,
                segmentHeight,
                coreColor
            );
            
            // Bright flowing center line
            if (i % 2 === 0) {
                this.renderer.drawRect(
                    flow.x - flow.width * 0.15 + wave * 0.5,
                    y,
                    flow.width * 0.3,
                    segmentHeight,
                    [1.0, 0.6 * brightness, 0.1 * brightness, 0.7]
                );
            }
        }
        
        // Lava drips falling from flow
        const numDrips = 3;
        for (let i = 0; i < numDrips; i++) {
            const dripPhase = (time * 2 + flow.flowPhase + i * 2) % 4;
            if (dripPhase < 3) {
                const dripY = flow.y + flow.height * 0.3 + dripPhase * 50;
                const dripX = flow.x + Math.sin(flow.flowPhase + i) * flow.width * 0.3;
                const dripSize = 4 - dripPhase * 0.8;
                
                // Drip glow
                this.renderer.drawCircle(dripX, dripY, dripSize * 2, [1.0, 0.4, 0.0, 0.3]);
                // Drip core
                this.renderer.drawCircle(dripX, dripY, dripSize, [1.0, 0.5, 0.0, 0.9]);
            }
        }
        
        // Ambient glow around entire lava flow
        const glowWidth = flow.width * 4;
        this.renderer.drawRect(
            flow.x - glowWidth / 2,
            flow.y,
            glowWidth,
            flow.height,
            [1.0, 0.25, 0.0, 0.06 * glowPulse]
        );
        
        // Stronger glow near top (crater source)
        this.renderer.drawCircle(
            flow.x,
            flow.y + 30,
            flow.width * 2,
            [1.0, 0.4, 0.0, 0.2 * glowPulse]
        );
    }
    
    drawTriangle(x1, y1, x2, y2, x3, y3, color) {
        // Helper for BackgroundRenderer if not in WebGLRenderer
                this.renderer.drawCircle(p.x, p.y, p.size * 1.5, [...p.color, alpha * 0.15]); // Ridotto alone
                this.renderer.drawCircle(p.x, p.y, p.size, color);
        this.renderer.drawTriangle(x1, y1, x2, y2, x3, y3, color);
    }

    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height; 
    }
}
