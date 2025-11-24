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
                case 'wave':
                    this.renderer.drawRect(0, layer.y, 10000, 50, layer.color);
                    break;
                case 'pyramid':
                    this.renderer.drawRect(layer.x, layer.y, layer.width, layer.height, layer.color);
                    break;
                case 'volcano':
                    this.renderer.drawRect(layer.x - layer.width / 2, layer.y, layer.width, layer.height, layer.color);
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
            }
        }
    }

    renderTree(tree) {
        const trunkColor = [0.3, 0.2, 0.1, tree.color[3]];
        this.renderer.drawRect(tree.x + tree.width * 0.4, tree.y + tree.height * 0.5, tree.width * 0.2, tree.height * 0.5, trunkColor);
        this.renderer.drawCircle(tree.x + tree.width / 2, tree.y + tree.height * 0.3, tree.width * 0.6, tree.color);
    }

    renderBackgroundParticles() {
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
                        this.renderer.drawCircle(particle.x, particle.y, particle.radius * 2, [1.0, 0.5, 0.0, 0.3]);
                    }
                    break;
                case 'shootingStar':
                    this.renderShootingStar(particle);
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
                
                this.renderer.drawCircle(p.x, p.y, p.size * 1.5, [...p.color, alpha * 0.15]); // Ridotto alone
                this.renderer.drawCircle(p.x, p.y, p.size, color);
            }
        });
    }

    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
}
