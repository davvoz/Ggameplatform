/**
 * RenderingSystem - Handles all game entity rendering
 * Follows Single Responsibility and Open/Closed Principles
 */
import { WebGLRenderer } from '../core/WebGLRenderer.js';
import { PlatformTypes } from './ProceduralLevelGenerator.js';
import { PowerupUIRenderer } from './PowerupUIRenderer.js';

export class RenderingSystem {
    constructor(gl, canvasWidth, canvasHeight) {
        this.renderer = new WebGLRenderer(gl);
        this.backgroundLayers = [];
        this.backgroundParticles = [];
        this.powerupUIRenderer = new PowerupUIRenderer(this.renderer, canvasWidth, canvasHeight);
        this.powerupTimers = null;
        this.player = null;
        this.levelUpAnimation = null;
        this.comboAnimation = null;
        this.floatingTexts = [];
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Canvas 2D per testo
        this.textCanvas = document.getElementById('textCanvas');
        if (this.textCanvas) {
            this.textCanvas.width = canvasWidth;
            this.textCanvas.height = canvasHeight;
            this.textCtx = this.textCanvas.getContext('2d');
        }
        
        // PARTICELLE AMBIENTALI DI SFONDO
        this.ambientParticles = [];
        this.initAmbientParticles();
    }
    
    initAmbientParticles() {
        // Stelle scintillanti (minime)
        for (let i = 0; i < 15; i++) {
            this.ambientParticles.push({
                type: 'star',
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 1.5,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 3,
                brightness: 0.6,
                color: [1.0, 1.0, 0.9]
            });
        }
        
        // Nebbia colorata (minima)
        for (let i = 0; i < 3; i++) {
            const hue = Math.random();
            this.ambientParticles.push({
                type: 'mist',
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 80,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 10,
                hue: hue,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
        
        // Particelle energetiche (minime)
        for (let i = 0; i < 8; i++) {
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

    setBackground(layers, particles) {
        this.backgroundLayers = layers;
        this.backgroundParticles = particles;
    }

    setPowerupTimers(timers) {
        this.powerupTimers = timers;
    }

    setPlayer(player) {
        this.player = player;
    }

    setLevelUpAnimation(animation) {
        this.levelUpAnimation = animation;
    }
    
    setComboAnimation(animation) {
        this.comboAnimation = animation;
    }
    
    setFloatingTexts(texts) {
        this.floatingTexts = texts;
    }
    
    setAchievementNotifications(notifications) {
        this.achievementNotifications = notifications;
    }
    
    setScreenFlash(flash) {
        this.screenFlash = flash;
    }
    
    setCombo(combo) {
        this.currentCombo = combo || 0;
    }
    
    setLevelTransition(transition) {
        this.levelTransition = transition;
    }

    update(deltaTime, entities) {
        this.powerupUIRenderer.update(deltaTime);
        
        // Update particelle ambientali
        this.updateAmbientParticles(deltaTime);
        
        // Update level transition
        if (this.levelTransition) {
            this.levelTransition.progress += deltaTime / this.levelTransition.duration;
            
            // Fasi: 0-0.3 zoom in, 0.3-0.7 hold, 0.7-1.0 zoom out
            if (this.levelTransition.progress < 0.3) {
                this.levelTransition.scale = (this.levelTransition.progress / 0.3) * 1.5;
                this.levelTransition.alpha = this.levelTransition.progress / 0.3;
            } else if (this.levelTransition.progress < 0.7) {
                this.levelTransition.scale = 1.5;
                this.levelTransition.alpha = 1.0;
            } else {
                const fadeOut = (this.levelTransition.progress - 0.7) / 0.3;
                this.levelTransition.scale = 1.5 + fadeOut * 0.5;
                this.levelTransition.alpha = 1.0 - fadeOut;
            }
            
            this.levelTransition.rotation += deltaTime * 0.5;
            
            // Update particles
            this.levelTransition.particles.forEach(p => {
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.life -= deltaTime;
            });
            
            this.levelTransition.particles = this.levelTransition.particles.filter(p => p.life > 0);
            
            // Update rays
            this.levelTransition.rays.forEach(ray => {
                ray.length = Math.min(ray.length + ray.speed * deltaTime * 1000, ray.maxLength);
                ray.angle += deltaTime * 2;
            });
            
            if (this.levelTransition.progress >= 1.0) {
                this.levelTransition = null;
            }
        }
    }

    render(gl, entities) {
        // Pulisci text canvas
        if (this.textCtx) {
            this.textCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        
        // Render background layers first
        this.renderBackgroundLayers();
        this.renderBackgroundParticles();
        
        // Render particelle ambientali (PRIMA delle entità per stare sullo sfondo)
        this.renderAmbientParticles();

        // Render entities
        for (const entity of entities) {
            this.renderEntity(entity);
        }

        // Render powerup UI on top
        if (this.powerupTimers) {
            // Passa la salute del player al renderer UI
            if (this.player) {
                this.powerupUIRenderer.setPlayerHealth(this.player.health, this.player.maxHealth);
            }
            this.powerupUIRenderer.render(this.powerupTimers);
        }
        
        // Render floating texts
        for (const text of this.floatingTexts) {
            this.renderFloatingText(text);
        }
        
        // Render combo animation
        if (this.comboAnimation) {
            this.renderComboAnimation(this.comboAnimation);
        }

        // Render level up animation on top of everything
        if (this.levelUpAnimation) {
            this.renderLevelUpAnimation(this.levelUpAnimation);
        }
        
        // Render achievement notifications
        if (this.achievementNotifications) {
            this.renderAchievementNotifications(this.achievementNotifications);
        }
        
        // Render level transition (EPICO!)
        if (this.levelTransition) {
            this.renderLevelTransition(this.levelTransition);
        }
        
        // Render screen flash effect (last, on top of everything)
        if (this.screenFlash && this.screenFlash.alpha > 0) {
            this.renderScreenFlash(this.screenFlash);
        }
    }

    renderLevelUpAnimation(animation) {
        if (!animation || !animation.active) return;

        const progress = animation.progress;
        const level = animation.level;

        // Easing function per animazioni fluide
        const easeInOut = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const easedProgress = easeInOut(progress);

        // Badge più PICCOLO e discreto
        const baseWidth = 200;  // Era 400
        const baseHeight = 60;  // Era 150

        // Animazione scala: cresce velocemente, resta stabile, poi si rimpicciolisce
        let scale;
        if (progress < 0.2) {
            scale = progress / 0.2;
        } else if (progress < 0.8) {
            scale = 1.0;
        } else {
            scale = 1.0 - (progress - 0.8) / 0.2;
        }

        const width = baseWidth * scale;
        const height = baseHeight * scale;
        const x = 400 - width / 2;
        const y = 200 - height / 2;

        const alpha = progress < 0.2 ? progress / 0.2 : (progress > 0.8 ? (1.0 - progress) / 0.2 : 1.0);

        // Raggi di luce più piccoli e meno invadenti
        const numRays = 12;  // Era 16
        const rayLength = Math.min(width, height) * 1.5;  // Era * 2.5
        const rotation = (Date.now() % 3000) / 3000 * Math.PI * 2;

        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2 + rotation;
            const rayAlpha = alpha * 0.15 * (1 + Math.sin(Date.now() / 200 + i) * 0.3);  // Era 0.3

            const x1 = 400;
            const y1 = 200;
            const x2 = 400 + Math.cos(angle) * rayLength;
            const y2 = 200 + Math.sin(angle) * rayLength;

            this.drawLine(x1, y1, x2, y2, [1.0, 0.9, 0.4, rayAlpha], 2);  // Era 3
        }

        // Sfondo scuro semi-trasparente più piccolo
        const bgColor = [0.05, 0.05, 0.1, alpha * 0.85];
        const padding = 8;  // Era 12
        this.drawRect(x - padding, y - padding, width + padding * 2, height + padding * 2, bgColor);

        // Bordo dorato più sottile
        const borderColor = [1.0, 0.85, 0.3, alpha];
        const borderWidth = 3;  // Era 8
        this.drawRect(x - padding, y - padding, width + padding * 2, borderWidth, borderColor);
        this.drawRect(x - padding, y + height + padding - borderWidth, width + padding * 2, borderWidth, borderColor);
        this.drawRect(x - padding, y - padding, borderWidth, height + padding * 2, borderColor);
        this.drawRect(x + width + padding - borderWidth, y - padding, borderWidth, height + padding * 2, borderColor);

        // Glow dorato più discreto
        const glowLayers = 4;  // Era 8
        for (let i = 0; i < glowLayers; i++) {
            const glowAlpha = alpha * 0.08 / (i + 1);  // Era 0.15
            const glowExpand = i * 3;  // Era i * 5
            this.drawRect(
                x - padding - glowExpand,
                y - padding - glowExpand,
                width + padding * 2 + glowExpand * 2,
                height + padding * 2 + glowExpand * 2,
                [1.0, 0.9, 0.4, glowAlpha]
            );
        }

        // Gradiente principale più delicato
        const gradient1 = [1.0, 0.9, 0.3, alpha * 0.9];
        const gradient2 = [1.0, 0.7, 0.2, alpha * 0.9];
        this.drawRect(x, y, width, height * 0.5, gradient1);
        this.drawRect(x, y + height * 0.5, width, height * 0.5, gradient2);

        // Highlight più sottile
        const highlightColor = [1.0, 1.0, 1.0, alpha * 0.25];  // Era 0.4
        this.drawRect(x, y, width, height * 0.25, highlightColor);  // Era 0.3

        // Scintille rotanti più piccole
        const numSparkles = 8;  // Era 12
        const sparkleRadius = Math.max(width, height) * 0.5;  // Era * 0.6
        const sparkleRotation = (Date.now() % 2000) / 2000 * Math.PI * 2;

        for (let i = 0; i < numSparkles; i++) {
            const angle = (i / numSparkles) * Math.PI * 2 + sparkleRotation;
            const sparkleX = 400 + Math.cos(angle) * sparkleRadius;
            const sparkleY = 200 + Math.sin(angle) * sparkleRadius;
            const sparkleSize = 4 * scale;  // Era 6

            const sparkleAlpha = alpha * (0.6 + Math.sin(Date.now() / 150 + i) * 0.4);
            const sparkleColor = [1.0, 1.0, 0.8, sparkleAlpha];

            this.drawStar(sparkleX, sparkleY, sparkleSize, sparkleColor);
        }

        // Testo "LEVEL X" più piccolo
        const textColor = [0.1, 0.05, 0.0, alpha];
        const fontSize = height * 0.45;  // Era * 0.5
        const text = `✨ LEVEL ${level} ✨`;

        // Centra il testo nel badge
        const textWidth = text.length * fontSize * 0.5;  // Era * 0.6
        const textX = 400 - textWidth / 2;
        const textY = 200 - fontSize / 2;

        // Simulazione testo con rettangoli più piccoli
        const charWidth = fontSize * 0.45;  // Era * 0.55
        const charSpacing = fontSize * 0.08;  // Era * 0.1

        for (let i = 0; i < text.length; i++) {
            const charX = textX + i * (charWidth + charSpacing);
            const charY = textY;

            // Ombra del testo più sottile
            this.drawRect(charX + 2, charY + 2, charWidth, fontSize, [0, 0, 0, alpha * 0.4]);  // Era 0.5

            // Carattere
            this.drawRect(charX, charY, charWidth, fontSize, textColor);
        }
    }
    
    renderComboAnimation(animation) {
        if (!animation || !this.textCtx) return;
        
        const alpha = animation.life / animation.maxLife;
        const x = animation.x;
        const y = animation.floatY;
        const fontSize = animation.fontSize * animation.scale;
        
        // Alone colorato pulsante (WebGL)
        const glowSize = fontSize * 1.5;
        const glowColor = [...animation.color];
        glowColor[3] = alpha * 0.3 * (0.7 + Math.sin(animation.pulsePhase) * 0.3);
        
        for (let i = 0; i < 3; i++) {
            const size = glowSize + i * 15;
            const layerAlpha = glowColor[3] / (i + 1);
            const layerColor = [...animation.color];
            layerColor[3] = layerAlpha;
            this.renderer.drawCircle(x + 80, y + fontSize/2, size, layerColor);
        }
        
        // Sfondo scuro (WebGL)
        const bgWidth = this.textCtx.measureText(animation.text).width + 40;
        const bgColor = [0.05, 0.05, 0.15, alpha * 0.85];
        this.renderer.drawRect(x - 10, y - 10, bgWidth + 20, fontSize + 20, bgColor);
        
        // Bordo colorato (WebGL)
        const borderColor = [...animation.color];
        borderColor[3] = alpha;
        this.renderer.drawRect(x - 10, y - 10, bgWidth + 20, 3, borderColor);
        this.renderer.drawRect(x - 10, y + fontSize + 7, bgWidth + 20, 3, borderColor);
        this.renderer.drawRect(x - 10, y - 10, 3, fontSize + 20, borderColor);
        this.renderer.drawRect(x + bgWidth + 7, y - 10, 3, fontSize + 20, borderColor);
        
        // TESTO VERO con Canvas 2D
        this.textCtx.save();
        this.textCtx.globalAlpha = alpha;
        this.textCtx.font = `bold ${fontSize}px Arial, sans-serif`;
        this.textCtx.textAlign = 'left';
        this.textCtx.textBaseline = 'top';
        
        // Ombra
        this.textCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.textCtx.fillText(animation.text, x + 2, y + 2);
        
        // Testo principale
        const rgbColor = `rgb(${animation.color[0] * 255}, ${animation.color[1] * 255}, ${animation.color[2] * 255})`;
        this.textCtx.fillStyle = rgbColor;
        this.textCtx.fillText(animation.text, x, y);
        
        this.textCtx.restore();
        
        // Barra progresso combo timer (WebGL)
        const combo = animation.combo;
        if (combo >= 2) {
            const barWidth = bgWidth;
            const barHeight = 4;
            const barY = y + fontSize + 15;
            
            // Background barra
            this.renderer.drawRect(x, barY, barWidth, barHeight, [0.2, 0.2, 0.2, alpha * 0.6]);
            
            // Barra colorata
            const progress = animation.life / animation.maxLife;
            const barColor = progress > 0.3 ? [...animation.color] : [1.0, 0.3, 0.0, alpha];
            this.renderer.drawRect(x, barY, barWidth * progress, barHeight, barColor);
        }
        
        // Particelle scintillanti (WebGL)
        const time = Date.now() / 1000;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time * 3;
            const radius = fontSize * 0.8;
            const px = x + bgWidth/2 + Math.cos(angle) * radius;
            const py = y + fontSize/2 + Math.sin(angle) * radius;
            const sparkleSize = 3 + Math.sin(time * 5 + i) * 1.5;
            const sparkleColor = [...animation.color];
            sparkleColor[3] = alpha * (0.6 + Math.sin(time * 8 + i) * 0.4);
            this.renderer.drawCircle(px, py, sparkleSize, sparkleColor);
        }
    }
    
    renderAchievementNotifications(notifications) {
        if (!notifications || !this.textCtx) return;
        
        const startY = 120;
        const spacing = 70;
        
        notifications.forEach((notif, index) => {
            const y = startY + index * spacing;
            const alpha = notif.alpha;
            const time = (Date.now() - notif.time) / 1000;
            
            // Tipo di notifica determina il colore
            let textColor, glowColor;
            switch(notif.type) {
                case 'achievement':
                    textColor = 'rgb(255, 215, 0)';
                    glowColor = [1.0, 0.84, 0.0, alpha];
                    break;
                case 'warning':
                    textColor = 'rgb(255, 77, 77)';
                    glowColor = [1.0, 0.3, 0.3, alpha];
                    break;
                case 'streak':
                    textColor = 'rgb(255, 128, 0)';
                    glowColor = [1.0, 0.5, 0.0, alpha];
                    break;
                default:
                    textColor = 'rgb(51, 153, 255)';
                    glowColor = [0.2, 0.6, 1.0, alpha];
            }
            
            const boxX = this.canvasWidth - 400;
            
            // Testo con ombra elegante
            this.textCtx.save();
            this.textCtx.globalAlpha = alpha;
            
            // Ombra morbida multipla per effetto glow
            this.textCtx.shadowColor = textColor;
            this.textCtx.shadowBlur = 20;
            this.textCtx.shadowOffsetX = 0;
            this.textCtx.shadowOffsetY = 0;
            
            // Titolo grande
            this.textCtx.font = 'bold 26px Arial, sans-serif';
            this.textCtx.fillStyle = textColor;
            this.textCtx.textAlign = 'right';
            this.textCtx.fillText(notif.title, boxX + 350, y);
            
            // Messaggio più piccolo sotto
            this.textCtx.font = '18px Arial, sans-serif';
            this.textCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.textCtx.shadowBlur = 10;
            this.textCtx.fillText(notif.message, boxX + 350, y + 30);
            
            this.textCtx.restore();
            
            // Particelle scintillanti per achievement e streak
            if (notif.type === 'achievement' || notif.type === 'streak') {
                const numParticles = notif.type === 'achievement' ? 12 : 8;
                for (let i = 0; i < numParticles; i++) {
                    const angle = (i / numParticles) * Math.PI * 2 + time * 2.5;
                    const radius = 30 + Math.sin(time * 3 + i) * 8;
                    const px = boxX + 20 + Math.cos(angle) * radius;
                    const py = y + 15 + Math.sin(angle) * radius;
                    const size = 2.5 + Math.sin(time * 4 + i) * 1.5;
                    const color = [...glowColor];
                    color[3] = alpha * (0.6 + Math.sin(time * 5 + i) * 0.4);
                    this.renderer.drawCircle(px, py, size, color);
                }
            }
            
            // Linea decorativa sotto
            const lineWidth = 300 * alpha;
            const lineX = boxX + 350 - lineWidth;
            this.renderer.drawRect(lineX, y + 45, lineWidth, 2, [...glowColor, alpha * 0.5]);
        });
    }
    
    renderFloatingText(text) {
        if (!text || !this.textCtx) return;
        
        const alpha = text.alpha;
        const fontSize = text.fontSize;
        
        // TESTO VERO con Canvas 2D
        this.textCtx.save();
        this.textCtx.globalAlpha = alpha;
        this.textCtx.font = `bold ${fontSize}px Arial, sans-serif`;
        this.textCtx.textAlign = 'center';
        this.textCtx.textBaseline = 'middle';
        
        // Alone glow
        this.textCtx.shadowColor = `rgba(${text.color[0] * 255}, ${text.color[1] * 255}, ${text.color[2] * 255}, ${alpha * 0.8})`;
        this.textCtx.shadowBlur = 10;
        
        // Ombra
        this.textCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.textCtx.fillText(text.text, text.x + 2, text.y + 2);
        
        // Reset shadow
        this.textCtx.shadowBlur = 0;
        
        // Testo principale
        const rgbColor = `rgb(${text.color[0] * 255}, ${text.color[1] * 255}, ${text.color[2] * 255})`;
        this.textCtx.fillStyle = rgbColor;
        this.textCtx.fillText(text.text, text.x, text.y);
        
        this.textCtx.restore();
    }

    renderEntity(entity) {
        const entityType = entity.entityType || entity.type;
        switch (entityType) {
            case 'safetyPlatform':
                this.renderSafetyPlatform(entity);
                break;
            case 'platform':
                this.renderPlatform(entity);
                break;
            case 'player':
                this.renderPlayer(entity);
                break;
            case 'collectible':
                this.renderCollectible(entity);
                break;
            case 'heart':
                this.renderHeart(entity);
                break;
            case 'boost':
                this.renderBoost(entity);
                break;
            case 'magnet':
                this.renderMagnetBonus(entity);
                break;
            case 'timeslow':
                this.renderTimeSlowBonus(entity);
                break;
            case 'shield':
                this.renderShieldBonus(entity);
                break;
            case 'multiplier':
                this.renderMultiplierBonus(entity);
                break;
            case 'rainbow':
                this.renderRainbowBonus(entity);
                break;
            case 'powerup':
                this.renderPowerup(entity);
                break;
            case 'powerupParticle':
                this.renderPowerupParticle(entity);
                break;
            case 'boostParticle':
                this.renderBoostParticle(entity);
                break;
            case 'spike':
            case 'enemy':
                this.renderObstacle(entity);
                break;
        }
    }

    renderBackgroundLayers() {
        for (const layer of this.backgroundLayers) {
            switch (layer.type) {
                case 'wave':
                    this.renderWave(layer);
                    break;
                case 'pyramid':
                    this.renderPyramid(layer);
                    break;
                case 'volcano':
                    this.renderVolcano(layer);
                    break;
                case 'planet':
                    this.renderer.drawCircle(layer.x, layer.y, layer.radius, layer.color);
                    // Planet ring for some
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
                    this.renderCrystal(layer);
                    break;
                case 'moon':
                    this.renderer.drawCircle(layer.x, layer.y, layer.radius, layer.color);
                    // Moon craters
                    const craterColor = [0.85, 0.85, 0.75, 0.9];
                    this.renderer.drawCircle(layer.x - 10, layer.y - 8, 8, craterColor);
                    this.renderer.drawCircle(layer.x + 12, layer.y + 5, 6, craterColor);
                    break;
                case 'sunray':
                    // Sun rays
                    const rayEndX = layer.x + Math.cos(layer.angle) * layer.length;
                    const rayEndY = layer.y + Math.sin(layer.angle) * layer.length;
                    this.renderer.drawRect(layer.x, layer.y, Math.abs(rayEndX - layer.x), 2, layer.color);
                    break;
                case 'seaweed':
                    // Swaying seaweed
                    const sway = Math.sin(Date.now() / 1000 + layer.swayPhase) * 5;
                    this.renderer.drawRect(layer.x + sway, layer.y - layer.height, layer.width, layer.height, layer.color);
                    break;
                case 'heatwave':
                    // Wavy heat distortion line
                    this.renderer.drawRect(0, layer.y, this.canvasWidth, 2, layer.color);
                    break;
                case 'dune':
                    // Sand dune arc
                    this.renderer.drawCircle(layer.x, layer.y, layer.width / 2, layer.color);
                    break;
                case 'nebula':
                    // Nebula cloud
                    this.renderer.drawCircle(layer.x, layer.y, layer.width / 2, layer.color);
                    this.renderer.drawCircle(layer.x + 30, layer.y - 20, layer.width / 3, layer.color);
                    break;
                case 'mushroom':
                    // Mushroom cap and stem
                    this.renderer.drawRect(layer.x + layer.size * 0.3, layer.y, layer.size * 0.4, layer.size * 0.5, [0.9, 0.9, 0.85, 0.7]);
                    this.renderer.drawCircle(layer.x + layer.size / 2, layer.y, layer.size * 0.6, layer.color);
                    break;
            }
        }
    }

    renderBackgroundParticles() {
        for (const particle of this.backgroundParticles) {
            switch (particle.type) {
                case 'cloud':
                    // Fluffy cloud shape with multiple overlapping puffs
                    if (particle.puffs) {
                        // Light shadow for depth
                        const shadowColor = [0.8, 0.8, 0.9, 0.3];
                        for (const puff of particle.puffs) {
                            this.renderer.drawCircle(
                                particle.x + puff.offsetX + 2,
                                particle.y + puff.offsetY + 2,
                                puff.radius,
                                shadowColor
                            );
                        }

                        // Main cloud puffs
                        for (const puff of particle.puffs) {
                            this.renderer.drawCircle(
                                particle.x + puff.offsetX,
                                particle.y + puff.offsetY,
                                puff.radius,
                                particle.color
                            );
                        }

                        // Highlights on top
                        const highlightColor = [1.0, 1.0, 1.0, 0.5];
                        for (let i = 0; i < Math.min(2, particle.puffs.length); i++) {
                            const puff = particle.puffs[i];
                            this.renderer.drawCircle(
                                particle.x + puff.offsetX - puff.radius * 0.3,
                                particle.y + puff.offsetY - puff.radius * 0.3,
                                puff.radius * 0.3,
                                highlightColor
                            );
                        }
                    }
                    break;

                case 'bubble':
                case 'star':
                case 'firefly':
                case 'snowflake':
                    const alpha = particle.type === 'star' ?
                        Math.abs(Math.sin(particle.twinkle)) * 0.8 + 0.2 :
                        particle.type === 'firefly' ?
                            Math.abs(Math.sin(Date.now() / 400 + particle.glowPhase)) * 0.6 + 0.4 :
                            particle.color[3];
                    const particleColor = [...particle.color];
                    particleColor[3] = alpha;
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius, particleColor);
                    // Firefly glow
                    if (particle.type === 'firefly') {
                        const glowColor = [1.0, 1.0, 0.3, alpha * 0.3];
                        this.renderer.drawCircle(particle.x, particle.y, particle.radius * 3, glowColor);
                    }
                    break;

                case 'bird':
                    // Simple bird shape (V)
                    const wingFlap = Math.sin(Date.now() / 150 + particle.wingPhase) * 2;
                    this.renderer.drawRect(particle.x - particle.size, particle.y + wingFlap, particle.size, 1, particle.color);
                    this.renderer.drawRect(particle.x, particle.y - wingFlap, particle.size, 1, particle.color);
                    break;

                case 'fish':
                    // Fish body
                    const swimWave = Math.sin(Date.now() / 300 + particle.swimPhase) * 2;
                    this.renderer.drawCircle(particle.x, particle.y, particle.size / 2, particle.color);
                    // Tail
                    this.renderer.drawRect(particle.x - particle.size, particle.y + swimWave, particle.size * 0.6, 2, particle.color);
                    break;

                case 'leaf':
                    // Rotating leaf
                    const leafSize = particle.size;
                    this.renderer.drawCircle(particle.x, particle.y, leafSize / 2, particle.color);
                    break;

                case 'sand':
                case 'ember':
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius, particle.color);
                    if (particle.type === 'ember') {
                        // Glow effect for embers
                        const glowColor = [1.0, 0.5, 0.0, 0.3];
                        this.renderer.drawCircle(particle.x, particle.y, particle.radius * 2, glowColor);
                    }
                    break;

                case 'shootingStar':
                    // Draw shooting star as line with trail
                    this.renderer.drawRect(particle.x, particle.y, particle.length, 2, particle.color);
                    const trailColor = [...particle.color];
                    trailColor[3] *= 0.3;
                    this.renderer.drawRect(particle.x + particle.length, particle.y, particle.length * 0.5, 1, trailColor);
                    break;
            }
        }
    }

    renderWave(wave) {
        // Simple wave representation
        this.renderer.drawRect(0, wave.y, 10000, 50, wave.color);
    }

    renderPyramid(pyramid) {
        // Triangle shape for pyramid
        this.renderer.drawRect(
            pyramid.x,
            pyramid.y,
            pyramid.width,
            pyramid.height,
            pyramid.color
        );
    }

    renderVolcano(volcano) {
        // Triangle for volcano
        this.renderer.drawRect(
            volcano.x - volcano.width / 2,
            volcano.y,
            volcano.width,
            volcano.height,
            volcano.color
        );
    }

    renderTree(tree) {
        // Trunk
        const trunkColor = [0.3, 0.2, 0.1, tree.color[3]];
        this.renderer.drawRect(
            tree.x + tree.width * 0.4,
            tree.y + tree.height * 0.5,
            tree.width * 0.2,
            tree.height * 0.5,
            trunkColor
        );
        // Foliage
        this.renderer.drawCircle(
            tree.x + tree.width / 2,
            tree.y + tree.height * 0.3,
            tree.width * 0.6,
            tree.color
        );
    }

    renderCrystal(crystal) {
        // Diamond shape for crystal
        this.renderer.drawRect(
            crystal.x - crystal.size / 2,
            crystal.y - crystal.size / 2,
            crystal.size,
            crystal.size,
            crystal.color
        );
    }

    renderPlatform(platform) {
        const time = Date.now() / 1000;
        let renderColor = platform.color;
        let baseX = platform.x;
        let baseY = platform.y;

        // Crumbling effect
        if (platform.isCrumbling && platform.crumbleTimer) {
            const crumbleProgress = platform.crumbleTimer / platform.crumbleDuration;
            renderColor = [...platform.color];
            renderColor[3] = 1.0 - crumbleProgress * 0.7;

            // Shake effect PIÙ VIOLENTO
            baseX += (Math.random() - 0.5) * crumbleProgress * 8;
            baseY += (Math.random() - 0.5) * crumbleProgress * 8;
            
            // Particelle di polvere che cadono
            for (let i = 0; i < 6; i++) {
                const px = baseX + Math.random() * platform.width;
                const py = baseY + platform.height + Math.random() * 15 * crumbleProgress;
                const pSize = 1 + Math.random() * 2;
                this.renderer.drawCircle(px, py, pSize, [0.6, 0.5, 0.4, (1 - crumbleProgress) * 0.6]);
            }
        }
        
        // Combo color boost - platforms glow more with higher combo
        const comboBoost = Math.min(this.currentCombo / 50, 1.0);
        if (comboBoost > 0) {
            renderColor = [...renderColor];
            renderColor[0] = Math.min(renderColor[0] * (1.0 + comboBoost * 0.5), 1.0);
            renderColor[1] = Math.min(renderColor[1] * (1.0 + comboBoost * 0.5), 1.0);
            renderColor[2] = Math.min(renderColor[2] * (1.0 + comboBoost * 0.5), 1.0);
        }

        // Shadow MULTIPLA con blur effect
        for (let i = 0; i < 3; i++) {
            this.renderer.drawRect(
                baseX + 2 + i,
                baseY + platform.height + i,
                platform.width,
                2,
                [0.0, 0.0, 0.0, 0.15 / (i + 1)]
            );
        }

        // Main platform body con gradiente verticale
        const topColor = [...renderColor];
        const bottomColor = [...renderColor];
        bottomColor[0] *= 0.7;
        bottomColor[1] *= 0.7;
        bottomColor[2] *= 0.7;
        
        // Top half (più chiaro)
        this.renderer.drawRect(baseX, baseY, platform.width, platform.height * 0.5, topColor);
        // Bottom half (più scuro)
        this.renderer.drawRect(baseX, baseY + platform.height * 0.5, platform.width, platform.height * 0.5, bottomColor);

        // Top half (più chiaro)
        this.renderer.drawRect(baseX, baseY, platform.width, platform.height * 0.5, topColor);
        // Bottom half (più scuro)
        this.renderer.drawRect(baseX, baseY + platform.height * 0.5, platform.width, platform.height * 0.5, bottomColor);

        // Top highlight BRILLANTE con pulsazione
        const highlightPulse = Math.sin(time * 3) * 0.1 + 0.5 + comboBoost * 0.3;
        this.renderer.drawRect(baseX + 3, baseY + 1, platform.width - 6, 2, [1.0, 1.0, 1.0, highlightPulse]);
        
        // Bordo luminoso su tutti i lati
        const borderGlow = 0.4 + Math.sin(time * 4) * 0.2;
        const borderColor = [...renderColor];
        borderColor[3] = borderGlow;
        this.renderer.drawRect(baseX, baseY, platform.width, 1, borderColor); // Top
        this.renderer.drawRect(baseX, baseY + platform.height - 1, platform.width, 1, borderColor); // Bottom
        this.renderer.drawRect(baseX, baseY, 1, platform.height, borderColor); // Left
        this.renderer.drawRect(baseX + platform.width - 1, baseY, 1, platform.height, borderColor); // Right

        // Type-specific ANIMAZIONI SPETTACOLARI
        if (platform.platformType !== PlatformTypes.NORMAL) {
            switch (platform.platformType) {
                case PlatformTypes.FAST: {
                    // Solo 2 linee di velocità
                    for (let i = 0; i < 2; i++) {
                        const lineX = baseX + ((time * 300 + i * 40) % platform.width);
                        this.renderer.drawRect(lineX, baseY + 3, 2, platform.height - 6, [1.0, 0.5, 0.2, 0.4]);
                    }
                    break;
                }

                case PlatformTypes.SLOW: {
                    // Cristalli di ghiaccio (ridotti)
                    for (let i = 0; i < 4; i++) {
                        const crystalX = baseX + (platform.width / 8) * i;
                        const crystalY = baseY + platform.height / 2;
                        const crystalSize = 3 + Math.abs(Math.sin(time * 3 + i * 0.5)) * 3;
                        
                        // Esagono di ghiaccio
                        for (let j = 0; j < 6; j++) {
                            const angle = (j / 6) * Math.PI * 2 + time;
                            const px = crystalX + Math.cos(angle) * crystalSize;
                            const py = crystalY + Math.sin(angle) * crystalSize;
                            this.renderer.drawCircle(px, py, 1.5, [0.7, 0.9, 1.0, 0.8]);
                        }
                        
                        // Centro brillante
                        this.renderer.drawCircle(crystalX, crystalY, crystalSize * 0.5, [1.0, 1.0, 1.0, 0.9]);
                    }
                    
                    // Neve che cade (ridotta)
                    for (let i = 0; i < 6; i++) {
                        const snowX = baseX + (platform.width / 12) * i + Math.sin(time * 2 + i) * 8;
                        const snowY = baseY - ((time * 30 + i * 10) % 30);
                        const snowSize = 1 + Math.sin(time * 5 + i) * 0.5;
                        this.renderer.drawCircle(snowX, snowY, snowSize, [0.9, 0.95, 1.0, 0.7]);
                    }
                    
                    break;
                }

                case PlatformTypes.BOUNCY: {
                    // Solo onde d'urto verdi semplici
                    const wavePhase = (time * 4) % 1;
                    const waveY = baseY + platform.height + wavePhase * 30;
                    const waveAlpha = (1 - wavePhase) * 0.6;
                    this.renderer.drawRect(baseX, waveY, platform.width, 2, [0.4, 1.0, 0.6, waveAlpha]);
                    this.renderer.drawRect(baseX, waveY - 5, platform.width, 1, [0.6, 1.0, 0.8, waveAlpha * 0.5]);
                    break;
                }

                case PlatformTypes.CRUMBLING: {
                    // Solo alone rosso di pericolo pulsante
                    const dangerPulse = Math.sin(time * 8) * 0.3 + 0.4;
                    this.renderer.drawRect(baseX, baseY, platform.width, 2, [1.0, 0.3, 0.2, dangerPulse]);
                    this.renderer.drawRect(baseX, baseY + platform.height - 2, platform.width, 2, [1.0, 0.3, 0.2, dangerPulse]);
                    break;
                }
                    
                case PlatformTypes.SPRING: {
                    const springTime = platform.springAnimationTime || 0;
                    const compression = platform.springCompression || 0;
                    
                    // Animazione molla compressa - MOLLE PIÙ STRETTE E ALTE
                    const numCoils = 8; // Aumentato da 6 a 8 per più densità
                    const coilSpacing = platform.width / (numCoils + 1);
                    const baseCoilHeight = platform.height * 1.2; // Aumentato da 0.6 a 1.2 (più alte)
                    
                    for (let i = 0; i < numCoils; i++) {
                        const coilX = baseX + coilSpacing * (i + 1);
                        const oscillation = Math.sin(springTime * 8 + i * 0.5) * 2;
                        
                        // Altezza molla con compressione
                        const coilHeight = baseCoilHeight * (1 - compression * 0.7) + oscillation;
                        const coilY = baseY + platform.height - coilHeight;
                        
                        // Molla con gradiente (chiaro -> scuro)
                        const topColor = [1.0, 0.6, 1.0, 1.0];
                        const bottomColor = [0.8, 0.3, 0.8, 1.0];
                        
                        // Molle molto strette per look più professionale
                        const coilWidth = 1.8;
                        
                        // Top half
                        this.renderer.drawRect(coilX - coilWidth/2, coilY, coilWidth, coilHeight * 0.5, topColor);
                        // Bottom half
                        this.renderer.drawRect(coilX - coilWidth/2, coilY + coilHeight * 0.5, coilWidth, coilHeight * 0.5, bottomColor);
                        
                        // Highlight sulla molla (più stretto)
                        this.renderer.drawRect(coilX - 0.6, coilY + 1, 1.2, coilHeight * 0.3, [1.0, 1.0, 1.0, 0.5]);
                    }
                    
                    // Energia accumulata (più compressa = più energia)
                    if (compression > 0.3) {
                        const energyPulse = Math.sin(springTime * 15) * 0.5 + 0.5;
                        const energyColor = [1.0, 1.0, 0.3, compression * 0.8 * energyPulse];
                        this.renderer.drawRect(baseX, baseY - 3, platform.width, 3, energyColor);
                        
                    }
                    break;
                }

                case 'RESCUE': {
                    // Laser effect - elaborate rescue platform visualization
                    const time = Date.now() / 1000;
                    const phase = platform.laserPhase || 0;
                    
                    // Pulsating core
                    const pulse = Math.sin(time * 8 + phase) * 0.3 + 0.7;
                    const coreColor = [0.2 * pulse, 1.0 * pulse, 0.4 * pulse, 0.9];
                    
                    // Energy core lines
                    for (let i = 0; i < 3; i++) {
                        const offset = i * (platform.width / 3);
                        const linePhase = time * 10 + phase + i * 0.5;
                        const lineAlpha = (Math.sin(linePhase) * 0.5 + 0.5) * 0.8;
                        this.renderer.drawRect(
                            baseX + offset + 5, 
                            baseY + 2, 
                            2, 
                            platform.height - 4, 
                            [0.3, 1.0, 0.5, lineAlpha]
                        );
                    }
                    
                    // Top laser beam
                    const beamWidth = platform.width * (0.8 + Math.sin(time * 6 + phase) * 0.15);
                    const beamX = baseX + (platform.width - beamWidth) / 2;
                    this.renderer.drawRect(beamX, baseY - 1, beamWidth, 1, [0.5, 1.0, 0.6, 0.9]);
                    
                    // Outer glow
                    const glowPulse = Math.sin(time * 5 + phase) * 0.4 + 0.6;
                    this.renderer.drawRect(beamX - 2, baseY - 3, beamWidth + 4, 2, [0.2, 0.9, 0.4, glowPulse * 0.4]);
                    
                    // Scanning line effect
                    const scanPos = ((time * 2 + phase) % 1) * platform.width;
                    this.renderer.drawRect(
                        baseX + scanPos - 1, 
                        baseY, 
                        2, 
                        platform.height, 
                        [1.0, 1.0, 1.0, 0.7]
                    );
                    
                    // Energy particles
                    for (let i = 0; i < 4; i++) {
                        const particlePhase = (time * 3 + phase + i * 1.5) % (Math.PI * 2);
                        const particleX = baseX + platform.width * (0.2 + i * 0.2);
                        const particleY = baseY + platform.height / 2 + Math.sin(particlePhase) * 3;
                        this.renderer.drawCircle(particleX, particleY, 1.5, [0.7, 1.0, 0.8, 0.8]);
                    }
                    break;
                }
            }
        }
    }

    renderPlayer(player) {
        const centerX = player.x + player.width / 2;
        // Applica offset idle per animazione di respirazione
        const idleOffset = player.getIdleOffset ? player.getIdleOffset() : 0;
        const centerY = player.y + player.height / 2 + idleOffset;
        
        // Ottieni squash/stretch e rotazione
        const squashStretch = player.getSquashStretch ? player.getSquashStretch() : { squash: 0, stretch: 0 };
        const rotation = player.getRotation ? player.getRotation() : 0;
        const cameraShake = player.getCameraShake ? player.getCameraShake() : { x: 0, y: 0 };
        
        // Applica camera shake alla posizione
        const shakenX = centerX + cameraShake.x;
        const shakenY = centerY + cameraShake.y;
        
        // Calcola dimensioni con squash & stretch (minimo per forma tonda)
        const baseRadius = player.width / 2;
        const radiusX = baseRadius * (1 + squashStretch.squash * 0.1 - squashStretch.stretch * 0.05);
        const radiusY = baseRadius * (1 - squashStretch.squash * 0.1 + squashStretch.stretch * 0.05);
        const avgRadius = (radiusX + radiusY) / 2;

        // Render trail particles first
        const trailParticles = player.getTrailParticles();
        for (const particle of trailParticles) {
            const alpha = particle.life / particle.maxLife;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.7;
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 12, particleColor);
        }
        
        // Render boost particles
        if (player.boostActive && player.getBoostParticles) {
            const boostParticles = player.getBoostParticles();
            for (const particle of boostParticles) {
                const alpha = particle.life / particle.maxLife;
                const particleColor = [...particle.color];
                particleColor[3] = alpha * 0.9;
                
                // Glow
                const glowColor = [...particle.color];
                glowColor[3] = alpha * 0.3;
                this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, particle.size * 2, glowColor);
                
                // Particle
                this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, particle.size, particleColor);
            }
        }

        // FLASH ROSSO quando danneggiato
        if (player.damageFlash && player.damageFlash > 0) {
            const flashIntensity = Math.min(player.damageFlash * 2, 1.0);
            const redFlash = [1.0, 0.1, 0.1, flashIntensity * 0.6];
            this.renderer.drawCircle(centerX, centerY, avgRadius * 2.5, redFlash);

            // Flash rosso intenso sul player
            const redOverlay = [1.0, 0.2, 0.2, flashIntensity * 0.8];
            this.renderer.drawCircle(centerX, centerY, avgRadius * 1.5, redOverlay);
        }

        if (!player.alive) {
            // Render dead state with fade
            const fadedColor = [...player.color];
            fadedColor[3] = 0.3;
            this.renderer.drawCircle(centerX, centerY, avgRadius, fadedColor);
        } else {
            // Determina il power-up attivo
            const activePowerups = [];
            if (player.powerups.immortality) activePowerups.push({ type: 'immortality', color: [1.0, 0.84, 0.0, 1.0], name: 'IMMORTALE' });
            if (player.powerups.flight) activePowerups.push({ type: 'flight', color: [0.4, 0.85, 1.0, 1.0], name: 'VOLO' });
            if (player.powerups.superJump) activePowerups.push({ type: 'superJump', color: [1.0, 0.2, 0.6, 1.0], name: 'SUPER SALTO' });

            // EFFETTI POWER-UP MOLTO VISIBILI
            if (activePowerups.length > 0) {
                const pulse = Math.abs(Math.sin(player.animationTime * 5)) * 0.4 + 0.6;
                const fastPulse = Math.abs(Math.sin(player.animationTime * 8)) * 0.3 + 0.7;

                activePowerups.forEach((powerup, index) => {
                    const rotationOffset = player.animationTime * 3 + index * Math.PI * 2 / activePowerups.length;

                    // 1. ENORME ALONE ESTERNO pulsante
                    const outerGlowSize = 50 * pulse;
                    const outerGlow = [...powerup.color];
                    outerGlow[3] = 0.25 * pulse;
                    this.renderer.drawCircle(centerX, centerY, avgRadius + outerGlowSize, outerGlow);

                    // 2. ALONE MEDIO
                    const midGlowSize = 30 * fastPulse;
                    const midGlow = [...powerup.color];
                    midGlow[3] = 0.4 * fastPulse;
                    this.renderer.drawCircle(centerX, centerY, avgRadius + midGlowSize, midGlow);

                    // 3. CONTORNO COLORATO SPESSO
                    const borderThickness = 5;
                    for (let i = 0; i < borderThickness; i++) {
                        const borderColor = [...powerup.color];
                        borderColor[3] = 0.8 - (i * 0.15);
                        this.renderer.drawCircle(centerX, centerY, avgRadius + 8 + i, borderColor);
                    }

                    // 4. PARTICELLE ORBITANTI GRANDI (più visibili)
                    const numParticles = 8;
                    for (let i = 0; i < numParticles; i++) {
                        const angle = rotationOffset + (i * Math.PI * 2 / numParticles);
                        const orbitRadius = 35 + index * 8;
                        const px = centerX + Math.cos(angle) * orbitRadius;
                        const py = centerY + Math.sin(angle) * orbitRadius;

                        // Particella grande con alone
                        const particleGlow = [...powerup.color];
                        particleGlow[3] = 0.4;
                        this.renderer.drawCircle(px, py, 8, particleGlow);

                        const particleColor = [...powerup.color];
                        particleColor[3] = 0.9;
                        this.renderer.drawCircle(px, py, 5, particleColor);
                    }

                    // 5. RAGGI DI LUCE rotanti
                    for (let i = 0; i < 6; i++) {
                        const rayAngle = rotationOffset * 0.7 + (i * Math.PI * 2 / 6);
                        const rayLength = 25 + Math.sin(player.animationTime * 6 + i) * 8;
                        const rayEndX = centerX + Math.cos(rayAngle) * (avgRadius + rayLength);
                        const rayEndY = centerY + Math.sin(rayAngle) * (avgRadius + rayLength);

                        const rayColor = [...powerup.color];
                        rayColor[3] = 0.6 * pulse;

                        // Simula raggio con cerchi sfumati
                        for (let j = 0; j < 5; j++) {
                            const t = j / 5;
                            const rx = centerX + (rayEndX - centerX) * t;
                            const ry = centerY + (rayEndY - centerY) * t;
                            const rSize = 4 - j * 0.6;
                            const rColor = [...rayColor];
                            rColor[3] = rayColor[3] * (1 - t * 0.7);
                            this.renderer.drawCircle(rx, ry, rSize, rColor);
                        }
                    }
                });
            }

            // CORPO PRINCIPALE - forma arrotondata più bella
            let bodyColor = [0.3, 0.7, 1.0, 1.0]; // Azzurro più vivace

            // Cambia colore in base al powerup attivo
            if (player.powerups.immortality) {
                bodyColor = [1.0, 0.9, 0.2, 1.0]; // Oro brillante
            } else if (player.powerups.flight) {
                bodyColor = [0.5, 0.9, 1.0, 1.0]; // Azzurro cielo
            } else if (player.powerups.superJump) {
                bodyColor = [1.0, 0.4, 0.7, 1.0]; // Rosa vivace
            }
            
            // BOOST ATTIVO - alone cyan pulsante
            if (player.boostActive) {
                const boostPulse = Math.abs(Math.sin(player.animationTime * 10)) * 0.5 + 0.5;
                
                // Enormi aloni cyan
                const boostGlow1 = [0.0, 1.0, 0.9, boostPulse * 0.4];
                const boostGlow2 = [0.0, 0.8, 1.0, boostPulse * 0.3];
                
                this.renderer.drawCircle(centerX, centerY, avgRadius * 4, boostGlow1);
                this.renderer.drawCircle(centerX, centerY, avgRadius * 2.5, boostGlow2);
                
                // Strisce di velocità dietro
                for (let i = 0; i < 5; i++) {
                    const lineX = centerX - avgRadius - i * 15;
                    const lineLength = 20 + i * 5;
                    const lineAlpha = (1 - i * 0.15) * boostPulse;
                    const lineColor = [0.0, 1.0, 0.9, lineAlpha];
                    
                    this.renderer.drawRect(lineX - lineLength, centerY - 2, lineLength, 4, lineColor);
                }
                
                // Tint cyan sul corpo
                const cyanTint = [0.0, 1.0, 0.9, 0.3 * boostPulse];
                this.renderer.drawCircle(centerX, centerY, avgRadius * 1.3, cyanTint);
            }

            // Flickering durante invulnerabilità
            if (player.invulnerable) {
                const flicker = Math.floor(Date.now() / 100) % 2;
                if (flicker === 0) {
                    bodyColor[3] = 0.4; // Semi-trasparente
                }
            }

            // Ombra sotto il corpo (ellittica con squash)
            const shadowColor = [0.0, 0.0, 0.0, 0.3];
            this.renderer.drawCircle(shakenX + 2, shakenY + 3 + radiusY * 0.3, radiusX * 1.1, shadowColor);

            // Corpo principale - QUADRATO
            const size = player.width;
            const rectX = shakenX - size / 2;
            const rectY = shakenY - size / 2;
            this.renderer.drawRect(rectX, rectY, size, size, bodyColor);

            // Highlight per dare profondità
            const highlightColor = [1.0, 1.0, 1.0, 0.4];
            this.renderer.drawCircle(shakenX - size * 0.2, shakenY - size * 0.2, size * 0.2, highlightColor);

            // OCCHI GRANDI E ESPRESSIVI con diverse espressioni
            const expression = player.getExpression ? player.getExpression() : 'happy';
            const isBlinking = player.isEyeBlinking ? player.isEyeBlinking() : false;
            
            let eyeY = shakenY - radiusY * 0.2;
            let eyeSize = 6;
            let pupilOffsetX = 0;
            let pupilOffsetY = 0;
            let pupilSize = 3;
            
            // Modifica occhi in base all'espressione
            switch(expression) {
                case 'worried':
                    eyeSize = 7; // Occhi più grandi quando preoccupato
                    pupilSize = 4;
                    pupilOffsetY = 2; // Pupille verso il basso
                    break;
                case 'excited':
                    eyeSize = 8; // Occhi molto aperti
                    pupilSize = 4;
                    break;
                case 'surprised':
                    eyeSize = 9; // Occhi spalancati
                    pupilSize = 5;
                    break;
                case 'determined':
                    eyeSize = 5; // Occhi più stretti, concentrato
                    pupilSize = 3;
                    pupilOffsetY = -1;
                    break;
                case 'happy':
                default:
                    eyeSize = 6;
                    pupilSize = 3;
                    break;
            }

            if (!isBlinking) {
                // Bianchi degli occhi con contorno
                const eyeWhite = [1.0, 1.0, 1.0, 1.0];
                const eyeOutline = [0.0, 0.0, 0.0, 0.4];

                // Occhio sinistro
                this.renderer.drawCircle(shakenX - 7, eyeY, eyeSize + 1, eyeOutline);
                this.renderer.drawCircle(shakenX - 7, eyeY, eyeSize, eyeWhite);

                // Occhio destro
                this.renderer.drawCircle(shakenX + 7, eyeY, eyeSize + 1, eyeOutline);
                this.renderer.drawCircle(shakenX + 7, eyeY, eyeSize, eyeWhite);

                // Pupille
                const pupilColor = [0.0, 0.0, 0.0, 1.0];
                this.renderer.drawCircle(shakenX - 7 + pupilOffsetX, eyeY + pupilOffsetY, pupilSize, pupilColor);
                this.renderer.drawCircle(shakenX + 7 + pupilOffsetX, eyeY + pupilOffsetY, pupilSize, pupilColor);

                // Riflessi negli occhi
                const glintColor = [1.0, 1.0, 1.0, 0.8];
                this.renderer.drawCircle(shakenX - 8, eyeY - 1, 1.5, glintColor);
                this.renderer.drawCircle(shakenX + 6, eyeY - 1, 1.5, glintColor);
            } else {
                // Occhi chiusi (blink) - linee orizzontali
                const blinkColor = [0.0, 0.0, 0.0, 0.8];
                this.renderer.drawRect(shakenX - 10, eyeY, 6, 2, blinkColor);
                this.renderer.drawCircle(shakenX - 7, eyeY, 3, blinkColor);
                this.renderer.drawRect(shakenX + 4, eyeY, 6, 2, blinkColor);
                this.renderer.drawCircle(shakenX + 7, eyeY, 3, blinkColor);
            }

            // BOCCA ESPRESSIVA in base all'espressione
            const mouthY = shakenY + radiusY * 0.4;
            const mouthColor = [0.0, 0.0, 0.0, 0.7];

            switch(expression) {
                case 'worried':
                    // Bocca preoccupata (curva verso il basso)
                    for (let i = 0; i < 7; i++) {
                        const t = i / 6;
                        const angle = Math.PI * 0.7 + (t * Math.PI * 0.6);
                        const smileRadius = 8;
                        const sx = shakenX + Math.cos(angle) * smileRadius;
                        const sy = mouthY + 3 + Math.sin(angle) * smileRadius * 0.6;
                        this.renderer.drawCircle(sx, sy, 1.5, mouthColor);
                    }
                    break;
                    
                case 'excited':
                    // Bocca molto felice (grande sorriso)
                    for (let i = 0; i < 9; i++) {
                        const t = i / 8;
                        const angle = Math.PI * 0.15 + (t * Math.PI * 0.7);
                        const smileRadius = 10;
                        const sx = shakenX + Math.cos(angle) * smileRadius;
                        const sy = mouthY + Math.sin(angle) * smileRadius * 0.7;
                        this.renderer.drawCircle(sx, sy, 2, mouthColor);
                    }
                    break;
                    
                case 'surprised':
                    // Bocca "O" sorpresa
                    this.renderer.drawCircle(shakenX, mouthY + 2, 5, mouthColor);
                    const innerMouth = [0.4, 0.2, 0.2, 1.0];
                    this.renderer.drawCircle(shakenX, mouthY + 2, 4, innerMouth);
                    break;
                    
                case 'determined':
                    // Bocca determinata (linea dritta)
                    this.renderer.drawRect(shakenX - 6, mouthY, 12, 2, mouthColor);
                    break;
                    
                case 'happy':
                default:
                    // Sorriso normale
                    for (let i = 0; i < 7; i++) {
                        const t = i / 6;
                        const angle = Math.PI * 0.2 + (t * Math.PI * 0.6);
                        const smileRadius = 8;
                        const sx = shakenX + Math.cos(angle) * smileRadius;
                        const sy = mouthY + Math.sin(angle) * smileRadius * 0.6;
                        this.renderer.drawCircle(sx, sy, 1.5, mouthColor);
                    }
                    break;
            }

            // ANIMAZIONI EXTRA quando ha power-up
            if (activePowerups.length > 0) {
                // Stelle scintillanti attorno al personaggio
                for (let i = 0; i < 4; i++) {
                    const sparkleAngle = player.animationTime * 4 + i * Math.PI / 2;
                    const sparkleDistance = 22 + Math.sin(player.animationTime * 6 + i) * 5;
                    const sx = centerX + Math.cos(sparkleAngle) * sparkleDistance;
                    const sy = centerY + Math.sin(sparkleAngle) * sparkleDistance;

                    const sparkleColor = [...activePowerups[0].color];
                    sparkleColor[3] = 0.8;

                    // Stella a 4 punte
                    this.renderer.drawCircle(sx, sy, 3, sparkleColor);
                    this.renderer.drawCircle(sx - 2, sy, 1, sparkleColor);
                    this.renderer.drawCircle(sx + 2, sy, 1, sparkleColor);
                    this.renderer.drawCircle(sx, sy - 2, 1, sparkleColor);
                    this.renderer.drawCircle(sx, sy + 2, 1, sparkleColor);
                }
            }
            
            // SCUDO BONUS - rendering spettacolare
            if (player.shieldActive) {
                const shieldRadius = avgRadius * 2;
                const shieldPulse = Math.sin(player.animationTime * 8) * 0.15 + 1.0;
                const sides = 8;
                
                // Alone esterno
                for (let i = 0; i < 3; i++) {
                    const auraRadius = shieldRadius * (1.5 + i * 0.3) * shieldPulse;
                    const auraColor = [0.0, 1.0, 0.5, (0.3 - i * 0.08) * shieldPulse];
                    this.renderer.drawCircle(centerX, centerY, auraRadius, auraColor);
                }
                
                // Esagono rotante
                for (let i = 0; i < sides; i++) {
                    const angle1 = (Math.PI * 2 * i) / sides + player.shieldRotation;
                    const angle2 = (Math.PI * 2 * (i + 1)) / sides + player.shieldRotation;
                    
                    const x1 = centerX + Math.cos(angle1) * shieldRadius * shieldPulse;
                    const y1 = centerY + Math.sin(angle1) * shieldRadius * shieldPulse;
                    const x2 = centerX + Math.cos(angle2) * shieldRadius * shieldPulse;
                    const y2 = centerY + Math.sin(angle2) * shieldRadius * shieldPulse;
                    
                    // Linee dello scudo
                    const shieldColor = [0.0, 1.0, 0.7, 0.8];
                    this.renderer.drawCircle(x1, y1, 4, shieldColor);
                    
                    // Connessioni tra i vertici
                    const steps = 5;
                    for (let s = 0; s <= steps; s++) {
                        const t = s / steps;
                        const x = x1 + (x2 - x1) * t;
                        const y = y1 + (y2 - y1) * t;
                        this.renderer.drawCircle(x, y, 2, shieldColor);
                    }
                }
                
                // Particelle scintillanti sullo scudo
                for (let i = 0; i < 12; i++) {
                    const sparkAngle = (Math.PI * 2 * i) / 12 + player.shieldRotation * 2;
                    const sparkDist = shieldRadius * shieldPulse;
                    const sx = centerX + Math.cos(sparkAngle) * sparkDist;
                    const sy = centerY + Math.sin(sparkAngle) * sparkDist;
                    const sparkColor = [1.0, 1.0, 1.0, 0.9 * shieldPulse];
                    this.renderer.drawCircle(sx, sy, 3, sparkColor);
                }
            }
        }
    }

    renderCollectible(collectible) {
        const time = Date.now() / 1000;
        const pulsePhase = collectible.pulsePhase || 0;
        const pulseRadius = collectible.radius + Math.sin(time * 4 + pulsePhase) * 2;
        const rotation = time * 3 + pulsePhase;

        // Alone semplice (2 layer)
        this.renderer.drawCircle(
            collectible.x,
            collectible.y,
            pulseRadius * 1.8,
            [...collectible.color, 0.3]
        );
        this.renderer.drawCircle(
            collectible.x,
            collectible.y,
            pulseRadius * 1.3,
            [...collectible.color, 0.5]
        );

        // Anello esterno rotante (8 segmenti arcobaleno)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + rotation;
            const arcX = collectible.x + Math.cos(angle) * pulseRadius * 1.8;
            const arcY = collectible.y + Math.sin(angle) * pulseRadius * 1.8;
            const hue = (i / 8);
            const rgb = this.hslToRgb(hue, 1.0, 0.6);
            this.renderer.drawCircle(arcX, arcY, 2.5, [...rgb, 0.9]);
        }

        // Main body con gradiente radiale (simulato con cerchi concentrici)
        const numLayers = 5;
        for (let i = 0; i < numLayers; i++) {
            const layerRadius = pulseRadius * (1 - i * 0.2);
            const layerAlpha = 1.0 - i * 0.15;
            const layerColor = [...collectible.color];
            // Più chiaro verso il centro
            layerColor[0] = Math.min(layerColor[0] * (1 + i * 0.2), 1.0);
            layerColor[1] = Math.min(layerColor[1] * (1 + i * 0.2), 1.0);
            layerColor[2] = Math.min(layerColor[2] * (1 + i * 0.2), 1.0);
            layerColor[3] = layerAlpha;
            this.renderer.drawCircle(collectible.x, collectible.y, layerRadius, layerColor);
        }

        // Stella centrale rotante (5 punte)
        const starPoints = 5;
        const starRotation = time * 2 + pulsePhase;
        for (let i = 0; i < starPoints * 2; i++) {
            const angle = (i / (starPoints * 2)) * Math.PI * 2 + starRotation;
            const radius = i % 2 === 0 ? pulseRadius * 0.6 : pulseRadius * 0.3;
            const px = collectible.x + Math.cos(angle) * radius;
            const py = collectible.y + Math.sin(angle) * radius;
            
            // Linee della stella
            const nextI = (i + 1) % (starPoints * 2);
            const nextAngle = (nextI / (starPoints * 2)) * Math.PI * 2 + starRotation;
            const nextRadius = nextI % 2 === 0 ? pulseRadius * 0.6 : pulseRadius * 0.3;
            const nextPx = collectible.x + Math.cos(nextAngle) * nextRadius;
            const nextPy = collectible.y + Math.sin(nextAngle) * nextRadius;
            
            // Disegna segmento stella
            const steps = 3;
            for (let j = 0; j < steps; j++) {
                const t = j / steps;
                const lineX = px + (nextPx - px) * t;
                const lineY = py + (nextPy - py) * t;
                this.renderer.drawCircle(lineX, lineY, 1.5, [1.0, 1.0, 0.5, 0.9]);
            }
        }

        // Highlight centrale super brillante
        const sparkleSize = pulseRadius * 0.35;
        const sparkleColor = [1.0, 1.0, 1.0, 0.95 + Math.sin(time * 8) * 0.05];
        this.renderer.drawCircle(
            collectible.x - sparkleSize * 0.2,
            collectible.y - sparkleSize * 0.2,
            sparkleSize,
            sparkleColor
        );

        // Particelle scintillanti (2 soltanto)
        for (let i = 0; i < 2; i++) {
            const angle = (i / 12) * Math.PI * 2 + time * 4 + pulsePhase;
            const orbitRadius = pulseRadius * 2.2 + Math.sin(time * 6 + i) * 3;
            const px = collectible.x + Math.cos(angle) * orbitRadius;
            const py = collectible.y + Math.sin(angle) * orbitRadius;
            const pSize = 1.5 + Math.sin(time * 10 + i) * 0.8;
            const hue = ((i / 12) + time * 0.3) % 1;
            const rgb = this.hslToRgb(hue, 1.0, 0.7);
            this.renderer.drawCircle(px, py, pSize, [...rgb, 0.85]);
        }

        // Trail effect (scia dietro)
        for (let i = 0; i < 5; i++) {
            const trailAlpha = (1 - i * 0.2) * 0.4;
            const trailSize = pulseRadius * (1 - i * 0.1);
            const trailY = collectible.y + i * 2;
            this.renderer.drawCircle(collectible.x, trailY, trailSize, [...collectible.color, trailAlpha]);
        }
    }

    renderHeart(heart) {
        // Animazione float
        const time = Date.now() / 1000;
        const floatY = heart.y + Math.sin(heart.pulsePhase + time * 2) * (heart.floatAmplitude || 8);
        const pulse = Math.sin(heart.pulsePhase + time * 4) * 0.25 + 1.0;
        const size = heart.radius * pulse;

        // ✨ ALONE ESTERNO - 3 layers di glow rosso intenso
        const glowColor = [...heart.color];
        for (let i = 0; i < 3; i++) {
            glowColor[3] = (0.35 - i * 0.1) * pulse;
            this.renderer.drawCircle(heart.x, floatY, size * (3.0 - i * 0.5), glowColor);
        }

        // ❤️ FORMA CUORE PERFETTA

        // Top lobes (i due cerchi superiori)
        const lobeRadius = size * 0.55;
        const lobeOffset = size * 0.4;
        this.renderer.drawCircle(heart.x - lobeOffset, floatY - size * 0.15, lobeRadius, heart.color);
        this.renderer.drawCircle(heart.x + lobeOffset, floatY - size * 0.15, lobeRadius, heart.color);

        // Corpo centrale (rettangolo che connette i lobi)
        this.renderer.drawRect(
            heart.x - size * 0.7,
            floatY,
            size * 1.4,
            size * 0.8,
            heart.color
        );

        // Punta del cuore (5 rettangoli a scala per formare triangolo)
        const pointSteps = 5;
        for (let i = 0; i < pointSteps; i++) {
            const stepHeight = size * 0.25;
            const stepWidth = size * 1.4 * (1 - (i + 1) / pointSteps);
            const stepY = floatY + size * 0.8 + i * stepHeight;
            this.renderer.drawRect(
                heart.x - stepWidth / 2,
                stepY,
                stepWidth,
                stepHeight + 2, // +2 per evitare gap
                heart.color
            );
        }

        // ✨ HIGHLIGHT bianco per profondità (sui lobi)
        const highlightColor = [1.0, 1.0, 1.0, 0.5 * pulse];
        this.renderer.drawCircle(heart.x - lobeOffset * 0.6, floatY - size * 0.3, size * 0.2, highlightColor);
        this.renderer.drawCircle(heart.x + lobeOffset * 0.6, floatY - size * 0.3, size * 0.2, highlightColor);

        // ⭐ SPARKLES rotanti attorno al cuore (6 particelle)
        const sparkleColor = [1.0, 1.0, 1.0, 0.9 * pulse];
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time * 2.5;
            const orbitRadius = size * 2.2;
            const px = heart.x + Math.cos(angle) * orbitRadius;
            const py = floatY + Math.sin(angle) * orbitRadius;
            const sparkleSize = 2.5 + Math.sin(time * 5 + i) * 1;
            this.renderer.drawCircle(px, py, sparkleSize, sparkleColor);
        }
    }

    renderBoost(boost) {
        const time = Date.now() / 1000;
        const pulse = Math.abs(Math.sin(boost.pulsePhase + time * 5)) * 0.4 + 0.6;
        const currentRadius = boost.radius * pulse;
        
        // ENORME alone pulsante esterno
        for (let i = 0; i < 4; i++) {
            const auraSize = currentRadius * (4.5 - i * 0.7);
            const auraColor = [...boost.color];
            auraColor[3] = (0.35 - i * 0.08) * pulse;
            this.renderer.drawCircle(boost.x, boost.y, auraSize, auraColor);
        }
        
        // Render trail particles
        for (const particle of boost.trailParticles) {
            const alpha = particle.life / particle.maxLife;
            const pColor = [...particle.color];
            pColor[3] = alpha * 0.6;
            this.renderer.drawCircle(particle.x, particle.y, particle.size, pColor);
        }
        
        // Anello rotante esterno
        const ringCount = 8;
        for (let i = 0; i < ringCount; i++) {
            const angle = boost.rotationAngle + (i * Math.PI * 2 / ringCount);
            const ringRadius = currentRadius * 2.3;
            const rx = boost.x + Math.cos(angle) * ringRadius;
            const ry = boost.y + Math.sin(angle) * ringRadius;
            const ringColor = [0.3, 1.0, 1.0, 0.9 * pulse];
            this.renderer.drawCircle(rx, ry, 7, ringColor);
        }
        
        // Corpo principale - forma di FRECCIA verso destra
        const arrowWidth = currentRadius * 2.5;
        const arrowHeight = currentRadius * 1.8;
        const arrowX = boost.x - arrowWidth * 0.3;
        const arrowY = boost.y;
        
        // Corpo freccia (rettangolo)
        const bodyColor = [...boost.color];
        this.renderer.drawRect(
            arrowX - arrowWidth * 0.3,
            arrowY - arrowHeight * 0.25,
            arrowWidth * 0.6,
            arrowHeight * 0.5,
            bodyColor
        );
        
        // Punta freccia (triangolo fatto con rettangoli degradanti)
        const tipSteps = 6;
        for (let i = 0; i < tipSteps; i++) {
            const stepWidth = arrowWidth * 0.4 * (1 - i / tipSteps);
            const stepHeight = arrowHeight * (1 - i / tipSteps) * 0.5;
            const stepX = arrowX + arrowWidth * 0.3 + i * (arrowWidth * 0.15);
            
            this.renderer.drawRect(
                stepX,
                arrowY - stepHeight / 2,
                arrowWidth * 0.15,
                stepHeight,
                bodyColor
            );
        }
        
        // Glow bianco interno
        const innerGlow = [1.0, 1.0, 1.0, 0.9];
        this.renderer.drawRect(
            arrowX - arrowWidth * 0.2,
            arrowY - arrowHeight * 0.15,
            arrowWidth * 0.4,
            arrowHeight * 0.3,
            innerGlow
        );
        
        // Linee di velocità dietro la freccia
        const speedLineCount = 4;
        for (let i = 0; i < speedLineCount; i++) {
            const lineX = arrowX - arrowWidth * 0.5 - i * 12;
            const lineLength = 15 + i * 5;
            const lineY = arrowY + (Math.random() - 0.5) * arrowHeight * 0.6;
            const lineAlpha = (1 - i * 0.2) * pulse;
            const lineColor = [...boost.color];
            lineColor[3] = lineAlpha;
            
            this.renderer.drawRect(lineX - lineLength, lineY, lineLength, 3, lineColor);
        }
        
        // Particelle scintillanti orbitanti
        const sparkleCount = 6;
        for (let i = 0; i < sparkleCount; i++) {
            const angle = -boost.rotationAngle * 1.8 + (i * Math.PI * 2 / sparkleCount);
            const distance = currentRadius * 1.9;
            const sx = boost.x + Math.cos(angle) * distance;
            const sy = boost.y + Math.sin(angle) * distance;
            
            const sparkleSize = 4 + Math.sin(time * 7 + i) * 2;
            const sparkleColor = [1.0, 1.0, 1.0, 0.9 * pulse];
            
            // Glow sparkle
            const sparkleGlow = [...boost.color];
            sparkleGlow[3] = 0.5;
            this.renderer.drawCircle(sx, sy, sparkleSize * 2, sparkleGlow);
            
            // Sparkle
            this.renderer.drawCircle(sx, sy, sparkleSize, sparkleColor);
        }
        
        // Testo "BOOST" al centro (simulato con rettangoli)
        const textScale = 0.6;
        const charHeight = 8 * textScale;
        const charSpacing = 6 * textScale;
        const textStartX = arrowX - arrowWidth * 0.15;
        const textColor = [0.0, 0.2, 0.2, 1.0];
        
        // Disegna lettere stilizzate ">>" per indicare velocità
        for (let i = 0; i < 2; i++) {
            const baseX = textStartX + i * charSpacing * 2;
            // Simbolo ">" stilizzato
            this.renderer.drawRect(baseX, arrowY - charHeight * 0.3, charSpacing, 2, textColor);
            this.renderer.drawRect(baseX, arrowY + charHeight * 0.3, charSpacing, 2, textColor);
            this.renderer.drawRect(baseX + charSpacing * 0.7, arrowY, 2, charHeight * 0.6, textColor);
        }
    }
    
    renderBoostParticle(particle) {
        const alpha = particle.life / particle.maxLife;
        const color = [...particle.color];
        color[3] *= alpha;
        
        // Multi-layer glow for spectacular effect
        if (particle.glow) {
            // Outer glow (largest, most transparent)
            const outerGlow = [...color];
            outerGlow[3] *= 0.15;
            this.renderer.drawCircle(particle.x, particle.y, particle.size * 4, outerGlow);
            
            // Middle glow
            const midGlow = [...color];
            midGlow[3] *= 0.3;
            this.renderer.drawCircle(particle.x, particle.y, particle.size * 2.5, midGlow);
            
            // Inner glow
            const innerGlow = [...color];
            innerGlow[3] *= 0.5;
            this.renderer.drawCircle(particle.x, particle.y, particle.size * 1.5, innerGlow);
        }
        
        // Main particle
        this.renderer.drawCircle(particle.x, particle.y, particle.size, color);
        
        // Bright white core
        const coreColor = [1.0, 1.0, 1.0, alpha * 0.8];
        this.renderer.drawCircle(particle.x, particle.y, particle.size * 0.4, coreColor);
    }

    renderPowerup(powerup) {
        // Rotation effect più marcato
        const rotationPulse = Math.sin(powerup.rotationAngle * 2) * 0.3 + 1.0;
        const bigPulse = Math.abs(Math.sin(powerup.rotationAngle * 3)) * 0.5 + 0.5;
        const currentRadius = powerup.radius * rotationPulse;

        // ENORME alone esterno multiplo
        for (let i = 0; i < 3; i++) {
            const auraSize = currentRadius * (4 - i * 0.8);
            const auraColor = [...powerup.glowColor];
            auraColor[3] = (0.3 - i * 0.08) * bigPulse;
            this.renderer.drawCircle(
                powerup.x,
                powerup.y,
                auraSize,
                auraColor
            );
        }

        // Anello rotante colorato
        const ringCount = 12;
        for (let i = 0; i < ringCount; i++) {
            const angle = powerup.rotationAngle * 2 + (i * Math.PI * 2 / ringCount);
            const ringRadius = currentRadius * 2.2;
            const rx = powerup.x + Math.cos(angle) * ringRadius;
            const ry = powerup.y + Math.sin(angle) * ringRadius;
            const ringColor = [...powerup.color];
            ringColor[3] = 0.8 * bigPulse;
            this.renderer.drawCircle(rx, ry, 6, ringColor);
        }

        // Corpo principale più grande
        this.renderer.drawCircle(
            powerup.x,
            powerup.y,
            currentRadius,
            powerup.color
        );

        // Inner glow brillante
        const innerGlowColor = [1.0, 1.0, 1.0, 0.9];
        this.renderer.drawCircle(
            powerup.x,
            powerup.y,
            currentRadius * 0.7,
            innerGlowColor
        );

        // Centro con colore del powerup
        const centerColor = [...powerup.color];
        centerColor[3] = 1.0;
        this.renderer.drawCircle(
            powerup.x,
            powerup.y,
            currentRadius * 0.5,
            centerColor
        );

        // Particelle orbitanti grandi
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = (-powerup.rotationAngle * 1.5 + (i * Math.PI * 2 / particleCount));
            const distance = currentRadius * 1.8;
            const px = powerup.x + Math.cos(angle) * distance;
            const py = powerup.y + Math.sin(angle) * distance;

            // Alone particella
            const particleGlow = [...powerup.color];
            particleGlow[3] = 0.5;
            this.renderer.drawCircle(px, py, 8, particleGlow);

            // Particella
            const particleColor = [...powerup.color];
            particleColor[3] = 0.9;
            this.renderer.drawCircle(px, py, 5, particleColor);
        }

        // Stella pulsante al centro
        const starPoints = 8;
        for (let i = 0; i < starPoints; i++) {
            const angle = powerup.rotationAngle * 3 + (i * Math.PI * 2 / starPoints);
            const rayLength = currentRadius * 0.4 * bigPulse;
            const sx = powerup.x + Math.cos(angle) * rayLength;
            const sy = powerup.y + Math.sin(angle) * rayLength;

            const starColor = [1.0, 1.0, 1.0, 0.8 * bigPulse];
            this.renderer.drawCircle(sx, sy, 3, starColor);
        }
    }

    renderPowerupParticle(particle) {
        // Calculate alpha based on lifetime
        const alpha = particle.life / particle.maxLife;
        const color = [...particle.color];
        color[3] *= alpha;
        
        // Render based on shape
        if (particle.shape === 'circle') {
            // Multi-layer spectacular glow
            if (particle.glow) {
                // Outer glow (largest, most transparent)
                const outerGlow = [...color];
                outerGlow[3] *= 0.12;
                this.renderer.drawCircle(particle.x, particle.y, particle.size * 3.5, outerGlow);
                
                // Middle glow
                const midGlow = [...color];
                midGlow[3] *= 0.25;
                this.renderer.drawCircle(particle.x, particle.y, particle.size * 2.3, midGlow);
                
                // Inner glow
                const innerGlow = [...color];
                innerGlow[3] *= 0.4;
                this.renderer.drawCircle(particle.x, particle.y, particle.size * 1.4, innerGlow);
            }
            
            // Main particle
            this.renderer.drawCircle(particle.x, particle.y, particle.size, color);
            
            // Bright white core
            const brightColor = [1.0, 1.0, 1.0, alpha * 0.9];
            this.renderer.drawCircle(particle.x, particle.y, particle.size * 0.5, brightColor);
        } else {
            // Rotated square with glow
            if (particle.glow) {
                // Glow effect for squares
                const glowColor = [...color];
                glowColor[3] *= 0.3;
                this.renderer.drawCircle(particle.x, particle.y, particle.size * 1.8, glowColor);
            }
            
            const halfSize = particle.size / 2;
            const cos = Math.cos(particle.rotation);
            const sin = Math.sin(particle.rotation);
            
            // Calculate rotated corners
            const corners = [
                {x: -halfSize, y: -halfSize},
                {x: halfSize, y: -halfSize},
                {x: halfSize, y: halfSize},
                {x: -halfSize, y: halfSize}
            ].map(p => ({
                x: particle.x + p.x * cos - p.y * sin,
                y: particle.y + p.x * sin + p.y * cos
            }));
            
            // Draw diamond/square shape
            const glowColor = [...color];
            glowColor[3] *= 0.3;
            this.renderer.drawRect(
                particle.x - particle.size * 1.2,
                particle.y - particle.size * 1.2,
                particle.size * 2.4,
                particle.size * 2.4,
                glowColor
            );
            
            this.renderer.drawRect(
                particle.x - halfSize,
                particle.y - halfSize,
                particle.size,
                particle.size,
                color
            );
        }
    }

    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.powerupUIRenderer.updateDimensions(width, height);
        
        // Ridimensiona text canvas
        if (this.textCanvas) {
            this.textCanvas.width = width;
            this.textCanvas.height = height;
        }
    }
    
    drawLine(x1, y1, x2, y2, color, width) {
        // Simula linea con rettangolo sottile
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Approssimazione semplice
        const steps = Math.ceil(length / 5);
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const x = x1 + dx * t;
            const y = y1 + dy * t;
            this.renderer.drawRect(x, y, width, width, color);
        }
    }
    
    drawRect(x, y, width, height, color) {
        this.renderer.drawRect(x, y, width, height, color);
    }
    
    drawStar(x, y, size, color) {
        // Stella a 4 punte
        this.renderer.drawCircle(x, y, size, color);
        this.renderer.drawRect(x - size * 1.5, y - 1, size * 3, 2, color);
        this.renderer.drawRect(x - 1, y - size * 1.5, 2, size * 3, color);
    }

    renderSafetyPlatform(platform) {
        const time = Date.now() / 1000;
        let alpha = 1.0;

        // Dissolving effect
        if (platform.isDissolving && platform.dissolveProgress) {
            alpha = 1.0 - platform.dissolveProgress;

            // Particle effect while dissolving
            for (let i = 0; i < 5; i++) {
                const particleX = platform.x + Math.random() * platform.width;
                const particleY = platform.y + Math.random() * platform.height;
                const particleColor = [...platform.color];
                particleColor[3] = alpha * 0.5;
                this.renderer.drawCircle(particleX, particleY, 2, particleColor);
            }
        }

        // Pulsing glow when active
        const pulse = Math.sin(time * 3) * 0.3 + 0.7;

        // Glow effect
        const glowColor = [...platform.color];
        glowColor[3] = 0.3 * pulse * alpha;
        this.renderer.drawRect(
            platform.x - 3,
            platform.y - 3,
            platform.width + 6,
            platform.height + 6,
            glowColor
        );

        // Main platform with transparency
        const mainColor = [...platform.color];
        mainColor[3] = alpha;
        this.renderer.drawRect(
            platform.x,
            platform.y,
            platform.width,
            platform.height,
            mainColor
        );

        // Warning stripes when dissolving
        if (platform.isDissolving) {
            for (let i = 0; i < platform.width; i += 20) {
                const stripeColor = [1.0, 0.5, 0.0, alpha * 0.6];
                this.renderer.drawRect(
                    platform.x + i,
                    platform.y,
                    10,
                    platform.height,
                    stripeColor
                );
            }
        }

        // Top highlight
        const highlightColor = [1.0, 1.0, 1.0, 0.5 * alpha];
        this.renderer.drawRect(
            platform.x,
            platform.y,
            platform.width,
            2,
            highlightColor
        );

        // Timer indicator when player is on platform
        if (platform.playerOnPlatform && platform.timeOnPlatform !== undefined && platform.maxTimeOnPlatform) {
            const timerProgress = platform.timeOnPlatform / platform.maxTimeOnPlatform;
            const centerX = platform.x + platform.width / 2;
            const centerY = platform.y - 40;
            const radius = 20;
            
            // Outer ring (background)
            const bgColor = [0.2, 0.2, 0.2, 0.6];
            this.renderer.drawCircle(centerX, centerY, radius + 2, bgColor);
            
            // Warning color transition
            let ringColor;
            if (timerProgress < 0.5) {
                // Green to yellow
                ringColor = [
                    timerProgress * 2,
                    1.0,
                    0.0,
                    0.9
                ];
            } else {
                // Yellow to red
                ringColor = [
                    1.0,
                    1.0 - (timerProgress - 0.5) * 2,
                    0.0,
                    0.9
                ];
            }
            
            // Draw timer ring segments
            const segments = 24;
            const filledSegments = Math.floor(segments * (1 - timerProgress));
            
            for (let i = 0; i < segments; i++) {
                if (i < filledSegments) {
                    const angle1 = (i / segments) * Math.PI * 2 - Math.PI / 2;
                    const angle2 = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2;
                    const angleMiddle = (angle1 + angle2) / 2;
                    
                    // Calculate segment position
                    const x = centerX + Math.cos(angleMiddle) * radius;
                    const y = centerY + Math.sin(angleMiddle) * radius;
                    
                    // Pulsing effect
                    const segmentPulse = Math.sin(time * 8 + i * 0.2) * 0.2 + 0.8;
                    const segmentColor = [...ringColor];
                    segmentColor[3] *= segmentPulse;
                    
                    this.renderer.drawCircle(x, y, 3, segmentColor);
                }
            }
            
            // Inner circle with time remaining
            const innerColor = [0.1, 0.1, 0.1, 0.8];
            this.renderer.drawCircle(centerX, centerY, radius - 5, innerColor);
            
            // Center glow
            const glowIntensity = timerProgress > 0.7 ? (timerProgress - 0.7) / 0.3 : 0;
            if (glowIntensity > 0) {
                const warningGlow = [1.0, 0.3, 0.0, glowIntensity * 0.5];
                this.renderer.drawCircle(centerX, centerY, radius - 3, warningGlow);
            }
            
            // Countdown number
            const timeLeft = Math.ceil(platform.maxTimeOnPlatform - platform.timeOnPlatform);
            const numberColor = timerProgress > 0.7 ? [1.0, 0.3, 0.0, 1.0] : [1.0, 1.0, 1.0, 1.0];
            
            // Draw simple number using rectangles
            const fontSize = 12;
            const numberStr = timeLeft.toString();
            const charWidth = 7;
            const totalWidth = numberStr.length * charWidth;
            let charX = centerX - totalWidth / 2;
            
            for (const char of numberStr) {
                // Draw a simple filled rectangle for each character
                // This is a simplified representation
                const segments = this.getDigitSegments(char);
                const segW = 1.5;
                const segH = fontSize / 3;
                
                // Draw 7-segment display
                if (segments[0]) this.renderer.drawRect(charX + 1, centerY - fontSize/2, charWidth - 2, segW, numberColor); // top
                if (segments[1]) this.renderer.drawRect(charX, centerY - fontSize/2, segW, segH, numberColor); // top-left
                if (segments[2]) this.renderer.drawRect(charX + charWidth - segW, centerY - fontSize/2, segW, segH, numberColor); // top-right
                if (segments[3]) this.renderer.drawRect(charX + 1, centerY - segW/2, charWidth - 2, segW, numberColor); // middle
                if (segments[4]) this.renderer.drawRect(charX, centerY, segW, segH, numberColor); // bottom-left
                if (segments[5]) this.renderer.drawRect(charX + charWidth - segW, centerY, segW, segH, numberColor); // bottom-right
                if (segments[6]) this.renderer.drawRect(charX + 1, centerY + fontSize/2 - segW, charWidth - 2, segW, numberColor); // bottom
                
                charX += charWidth + 1;
            }
            
            // Warning particles when time is running out
            if (timerProgress > 0.8) {
                const particleCount = 3;
                for (let i = 0; i < particleCount; i++) {
                    const angle = (time * 5 + i * (Math.PI * 2 / particleCount)) % (Math.PI * 2);
                    const distance = radius + 8 + Math.sin(time * 10 + i) * 3;
                    const px = centerX + Math.cos(angle) * distance;
                    const py = centerY + Math.sin(angle) * distance;
                    
                    const particleColor = [1.0, 0.4, 0.0, 0.8];
                    this.renderer.drawCircle(px, py, 2, particleColor);
                }
            }
        }

        // Respawn indicator (if respawning)
        if (!platform.isDissolving && platform.respawnProgress && platform.respawnProgress > 0) {
            const respawnWidth = platform.width * platform.respawnProgress;
            const respawnColor = [0.2, 0.8, 0.4, 0.4];
            this.renderer.drawRect(
                platform.x,
                platform.y - 5,
                respawnWidth,
                3,
                respawnColor
            );
        }
    }

    getDigitSegments(digit) {
        // Returns which segments to light for 7-segment display
        // [top, top-left, top-right, middle, bottom-left, bottom-right, bottom]
        const segments = {
            '0': [true, true, true, false, true, true, true],
            '1': [false, false, true, false, false, true, false],
            '2': [true, false, true, true, true, false, true],
            '3': [true, false, true, true, false, true, true],
            '4': [false, true, true, true, false, true, false],
            '5': [true, true, false, true, false, true, true],
            '6': [true, true, false, true, true, true, true],
            '7': [true, false, true, false, false, true, false],
            '8': [true, true, true, true, true, true, true],
            '9': [true, true, true, true, false, true, true]
        };
        
        return segments[digit] || segments['0'];
    }

    renderObstacle(obstacle) {
        if (obstacle.type === 'spike') {
            this.renderSpike(obstacle);
        } else {
            this.renderEnemy(obstacle);
        }
    }

    renderSpike(spike) {
        const time = Date.now() / 1000;
        const offset = spike.animationOffset || 0;
        const wobble = Math.sin(time * 4 + offset) * 2;
        const pulse = Math.sin(time * 6 + offset) * 0.15 + 0.85;

        // Shadow multi-layer
        for (let i = 0; i < 3; i++) {
            this.renderer.drawRect(
                spike.x + 3 + i,
                spike.y + spike.height + i,
                spike.width,
                2,
                [0.0, 0.0, 0.0, 0.2 / (i + 1)]
            );
        }

        // Alone rosso pulsante di pericolo
        for (let i = 0; i < 4; i++) {
            this.renderer.drawRect(
                spike.x + wobble - i * 2,
                spike.y - i * 2,
                spike.width + i * 4,
                spike.height + i * 4,
                [1.0, 0.2, 0.2, pulse * 0.15 / (i + 1)]
            );
        }

        // Main spike body con gradiente verticale rosso scuro -> rosso brillante
        const topColor = [0.6 * pulse, 0.1, 0.1, 1.0];
        const bottomColor = [1.0 * pulse, 0.3, 0.2, 1.0];
        this.renderer.drawRect(spike.x + wobble, spike.y, spike.width, spike.height * 0.5, topColor);
        this.renderer.drawRect(spike.x + wobble, spike.y + spike.height * 0.5, spike.width, spike.height * 0.5, bottomColor);

        // Punte triangolari sopra
        const numSpikes = 5;
        for (let i = 0; i < numSpikes; i++) {
            const spikeX = spike.x + wobble + (spike.width / numSpikes) * i + spike.width / (numSpikes * 2);
            const spikeHeight = 8 + Math.sin(time * 8 + offset + i) * 2;
            const spikeY = spike.y - spikeHeight;
            const spikeWidth = 4;
            
            // Triangolo rosso brillante
            this.renderer.drawRect(spikeX - spikeWidth/2, spikeY + spikeHeight * 0.7, spikeWidth, spikeHeight * 0.3, [1.0, 0.4, 0.3, 1.0]);
            this.renderer.drawRect(spikeX - spikeWidth * 0.3, spikeY + spikeHeight * 0.4, spikeWidth * 0.6, spikeHeight * 0.3, [1.0, 0.6, 0.4, 1.0]);
            this.renderer.drawRect(spikeX - 1, spikeY, 2, spikeHeight * 0.4, [1.0, 0.8, 0.6, 1.0]);
        }

        // Highlight luccicante sui bordi
        const shimmer = Math.sin(time * 10 + offset) * 0.4 + 0.6;
        this.renderer.drawRect(spike.x + wobble, spike.y, 2, spike.height, [1.0, 0.5, 0.4, shimmer]);
        this.renderer.drawRect(spike.x + wobble + spike.width - 2, spike.y, 2, spike.height, [1.0, 0.5, 0.4, shimmer]);
        
        // Scintille rosse rotanti
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time * 3 + offset;
            const radius = 12 + Math.sin(time * 5 + i) * 3;
            const px = spike.x + wobble + spike.width / 2 + Math.cos(angle) * radius;
            const py = spike.y + spike.height / 2 + Math.sin(angle) * radius;
            const sparkleSize = 1.5 + Math.sin(time * 12 + i) * 0.8;
            this.renderer.drawCircle(px, py, sparkleSize, [1.0, 0.3, 0.2, 0.7]);
        }
    }

    renderEnemy(enemy) {
        const time = Date.now() / 1000;
        const offset = enemy.animationOffset || 0;
        const bounce = Math.sin(time * 3 + offset) * 5;
        const squish = Math.abs(Math.sin(time * 3 + offset)) * 0.15 + 0.85;
        const rotation = Math.sin(time * 2 + offset) * 0.1;

        // Shadow dinamica che cambia con il bounce
        const shadowWidth = enemy.width * (1.2 - Math.abs(bounce) * 0.02);
        this.renderer.drawRect(
            enemy.x + (enemy.width - shadowWidth) / 2,
            enemy.y + enemy.height + Math.abs(bounce) * 0.5,
            shadowWidth,
            4,
            [0.0, 0.0, 0.0, 0.35]
        );

        // Alone viola pulsante
        const glowPulse = Math.sin(time * 5 + offset) * 0.3 + 0.5;
        for (let i = 0; i < 3; i++) {
            this.renderer.drawRect(
                enemy.x - i * 3,
                enemy.y + bounce - i * 3,
                enemy.width + i * 6,
                enemy.height * squish + i * 6,
                [0.6, 0.3, 1.0, glowPulse * 0.2 / (i + 1)]
            );
        }

        // Main enemy body (squishing) con gradiente
        const bodyTopColor = [0.5, 0.2, 0.8, 1.0];
        const bodyBottomColor = [0.3, 0.1, 0.6, 1.0];
        this.renderer.drawRect(enemy.x, enemy.y + bounce, enemy.width, enemy.height * squish * 0.5, bodyTopColor);
        this.renderer.drawRect(enemy.x, enemy.y + bounce + enemy.height * squish * 0.5, enemy.width, enemy.height * squish * 0.5, bodyBottomColor);

        // Bordo luminoso
        const borderGlow = Math.sin(time * 8 + offset) * 0.3 + 0.6;
        this.renderer.drawRect(enemy.x, enemy.y + bounce, enemy.width, 1, [0.8, 0.5, 1.0, borderGlow]);
        this.renderer.drawRect(enemy.x, enemy.y + bounce + enemy.height * squish - 1, enemy.width, 1, [0.8, 0.5, 1.0, borderGlow]);

        // Enemy eyes GRANDI e ANIMATI
        const eyeScale = 1.0 + Math.sin(time * 10 + offset) * 0.2;
        const eyeY = enemy.y + bounce + enemy.height * squish * 0.35;
        
        // Occhi bianchi con pupille rosse
        this.renderer.drawCircle(enemy.x + enemy.width * 0.3, eyeY, 4 * eyeScale, [1.0, 1.0, 1.0, 1.0]);
        this.renderer.drawCircle(enemy.x + enemy.width * 0.7, eyeY, 4 * eyeScale, [1.0, 1.0, 1.0, 1.0]);
        
        // Pupille rosse che si muovono
        const pupilOffsetX = Math.sin(time * 2 + offset) * 1.5;
        const pupilOffsetY = Math.cos(time * 3 + offset) * 1;
        this.renderer.drawCircle(enemy.x + enemy.width * 0.3 + pupilOffsetX, eyeY + pupilOffsetY, 2, [1.0, 0.0, 0.0, 1.0]);
        this.renderer.drawCircle(enemy.x + enemy.width * 0.7 + pupilOffsetX, eyeY + pupilOffsetY, 2, [1.0, 0.0, 0.0, 1.0]);
        
        // Highlight occhi
        this.renderer.drawCircle(enemy.x + enemy.width * 0.3 - 1, eyeY - 1, 1.5, [1.0, 1.0, 1.0, 0.9]);
        this.renderer.drawCircle(enemy.x + enemy.width * 0.7 - 1, eyeY - 1, 1.5, [1.0, 1.0, 1.0, 0.9]);

        // Bocca cattiva
        const mouthY = enemy.y + bounce + enemy.height * squish * 0.65;
        const mouthWidth = enemy.width * 0.5;
        const mouthX = enemy.x + (enemy.width - mouthWidth) / 2;
        this.renderer.drawRect(mouthX, mouthY, mouthWidth, 2, [0.2, 0.0, 0.0, 1.0]);
        
        // Denti appuntiti
        for (let i = 0; i < 4; i++) {
            const toothX = mouthX + (mouthWidth / 4) * i + mouthWidth / 8;
            this.renderer.drawRect(toothX - 1, mouthY - 3, 2, 3, [1.0, 1.0, 1.0, 0.9]);
        }
        
        // Particelle malvagie viola
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 4 + offset;
            const radius = 18 + Math.sin(time * 6 + i) * 4;
            const px = enemy.x + enemy.width / 2 + Math.cos(angle) * radius;
            const py = enemy.y + bounce + enemy.height * squish / 2 + Math.sin(angle) * radius;
            const pSize = 1 + Math.sin(time * 15 + i) * 0.5;
            this.renderer.drawCircle(px, py, pSize, [0.7, 0.4, 1.0, 0.6]);
        }
    }
    
    renderScreenFlash(flash) {
        // Full screen overlay with the flash color
        const flashColor = [...flash.color, flash.alpha];
        this.renderer.drawRect(0, 0, this.canvasWidth, this.canvasHeight, flashColor);
    }
    
    renderMagnetBonus(bonus) {
        const time = Date.now() / 1000;
        const pulse = Math.sin(bonus.pulsePhase) * 0.3 + 1.0;
        const size = bonus.radius * pulse;
        
        // Alone semplice (2 layer)
        this.renderer.drawCircle(bonus.x, bonus.y, size * 2.5, [1.0, 0.3, 0.9, 0.3]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 1.8, [1.0, 0.4, 0.9, 0.5]);
        
        // Magnete base
        const magnetWidth = size * 0.6;
        const magnetHeight = size * 1.0;
        
        // Polo Nord (rosso)
        this.renderer.drawRect(bonus.x - magnetWidth - 2, bonus.y - magnetHeight/2, magnetWidth, magnetHeight, [1.0, 0.2, 0.2, 1.0]);
        // Polo Sud (blu)
        this.renderer.drawRect(bonus.x + 2, bonus.y - magnetHeight/2, magnetWidth, magnetHeight, [0.2, 0.3, 1.0, 1.0]);
        // Barra
        this.renderer.drawRect(bonus.x - 3, bonus.y - magnetHeight/2 - 4, 6, 4, [0.7, 0.7, 0.7, 1.0]);
        
        // Core
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.3, [1.0, 1.0, 1.0, 0.9]);
    }
    
    renderTimeSlowBonus(bonus) {
        const time = Date.now() / 1000;
        const pulse = Math.sin(bonus.pulsePhase) * 0.2 + 1.0;
        const size = bonus.radius * pulse;
        
        // Alone semplice
        this.renderer.drawCircle(bonus.x, bonus.y, size * 2, [0.3, 0.6, 1.0, 0.3]);
        
        // Corpo orologio
        this.renderer.drawCircle(bonus.x, bonus.y, size, bonus.color);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.8, [0.3, 0.5, 0.8, 1.0]);
        
        // Lancette (animazione LENTA)
        const slowRotation = time * 0.3;
        const hourAngle = slowRotation - Math.PI / 2;
        const minuteAngle = slowRotation * 3 - Math.PI / 2;
        
        // Lancetta ore
        const hourLen = size * 0.5;
        for (let i = 0; i < 3; i++) {
            const t = i / 3;
            const px = bonus.x + Math.cos(hourAngle) * hourLen * t;
            const py = bonus.y + Math.sin(hourAngle) * hourLen * t;
            this.renderer.drawCircle(px, py, 2.5, [1.0, 1.0, 1.0, 1.0]);
        }
        
        // Lancetta minuti
        const minuteLen = size * 0.7;
        for (let i = 0; i < 4; i++) {
            const t = i / 4;
            const px = bonus.x + Math.cos(minuteAngle) * minuteLen * t;
            const py = bonus.y + Math.sin(minuteAngle) * minuteLen * t;
            this.renderer.drawCircle(px, py, 1.8, [0.9, 0.95, 1.0, 1.0]);
        }
        
        // Perno
        this.renderer.drawCircle(bonus.x, bonus.y, 4, [1.0, 1.0, 1.0, 1.0]);
    }
    
    renderShieldBonus(bonus) {
        const time = Date.now() / 1000;
        const pulse = Math.sin(bonus.pulsePhase) * 0.25 + 1.0;
        const size = bonus.radius * pulse;
        
        // Barriera difensiva (cerchi protettivi)
        for (let ring = 0; ring < 4; ring++) {
            const ringPhase = (time * 3 + ring * 0.25) % 1;
            const ringSize = size * (2.5 + ringPhase * 2);
            const ringAlpha = (1 - ringPhase) * 0.6;
            this.renderer.drawCircle(bonus.x, bonus.y, ringSize, [0.3, 1.0, 0.5, ringAlpha]);
        }
        
        // Alone verde energetico
        for (let i = 0; i < 5; i++) {
            const auraColor = [...bonus.glowColor];
            auraColor[3] = (0.6 - i * 0.1) * pulse;
            this.renderer.drawCircle(bonus.x, bonus.y, size * (3 + i * 0.4), auraColor);
        }
        
        // Scudo esagonale ROTANTE con prospettiva 3D
        const sides = 6;
        const hexRotation = bonus.rotation + time * 1.5;
        
        // Esagono esterno (bordo)
        for (let i = 0; i < sides; i++) {
            const angle1 = (Math.PI * 2 * i) / sides + hexRotation;
            const angle2 = (Math.PI * 2 * (i + 1)) / sides + hexRotation;
            const x1 = bonus.x + Math.cos(angle1) * size * 1.3;
            const y1 = bonus.y + Math.sin(angle1) * size * 1.3;
            const x2 = bonus.x + Math.cos(angle2) * size * 1.3;
            const y2 = bonus.y + Math.sin(angle2) * size * 1.3;
            
            // Linea del bordo (spessa)
            const steps = 8;
            for (let j = 0; j < steps; j++) {
                const t = j / steps;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                this.renderer.drawCircle(px, py, 4, [0.3, 1.0, 0.5, 1.0]);
            }
            
            // Highlight sui vertici
            this.renderer.drawCircle(x1, y1, 6, [0.6, 1.0, 0.7, 1.0]);
            this.renderer.drawCircle(x1, y1, 4, [1.0, 1.0, 1.0, 0.9]);
        }
        
        // Esagono medio (pattern energetico)
        for (let i = 0; i < sides; i++) {
            const angle1 = (Math.PI * 2 * i) / sides + hexRotation;
            const angle2 = (Math.PI * 2 * (i + 1)) / sides + hexRotation;
            const midAngle = (angle1 + angle2) / 2;
            const x1 = bonus.x + Math.cos(angle1) * size * 0.9;
            const y1 = bonus.y + Math.sin(angle1) * size * 0.9;
            const x2 = bonus.x + Math.cos(angle2) * size * 0.9;
            const y2 = bonus.y + Math.sin(angle2) * size * 0.9;
            const mx = bonus.x + Math.cos(midAngle) * size * 0.9;
            const my = bonus.y + Math.sin(midAngle) * size * 0.9;
            
            // Linea al centro (pattern)
            const steps = 5;
            for (let j = 0; j < steps; j++) {
                const t = j / steps;
                const px = mx + (bonus.x - mx) * t;
                const py = my + (bonus.y - my) * t;
                this.renderer.drawCircle(px, py, 2.5, [0.4, 1.0, 0.6, 0.8]);
            }
        }
        
        // Centro scudo con gradiente
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.7, [0.2, 0.8, 0.4, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.5, [0.4, 1.0, 0.6, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.3, [0.7, 1.0, 0.8, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.15, [1.0, 1.0, 1.0, 1.0]);
        
    }
    
    renderMultiplierBonus(bonus) {
        const time = Date.now() / 1000;
        const pulse = Math.sin(bonus.pulsePhase) * 0.35 + 1.0;
        const size = bonus.radius * pulse;
        
        // Raggi di luce dorata (ridotti)
        const numRays = 8;
        for (let i = 0; i < numRays; i++) {
            const rayAngle = (i / numRays) * Math.PI * 2 + bonus.rotation;
            const rayLength = size * (3 + Math.sin(time * 5 + i * 0.5) * 1.5);
            const rayWidth = 4 + Math.sin(time * 8 + i) * 2;
            
            // Raggio con gradiente
            for (let j = 0; j < 8; j++) {
                const t = j / 8;
                const px = bonus.x + Math.cos(rayAngle) * rayLength * t;
                const py = bonus.y + Math.sin(rayAngle) * rayLength * t;
                const rayAlpha = (1 - t) * 0.8;
                const raySize = rayWidth * (1 - t * 0.5);
                this.renderer.drawCircle(px, py, raySize, [1.0, 0.9, 0.3, rayAlpha]);
            }
        }
        
        // Alone oro massiccio pulsante
        for (let i = 0; i < 6; i++) {
            const auraColor = [...bonus.glowColor];
            auraColor[3] = (0.7 - i * 0.1) * pulse;
            this.renderer.drawCircle(bonus.x, bonus.y, size * (3.5 + i * 0.5), auraColor);
        }
        
        // Stella dorata 3D (8 punte con profondità)
        const spikes = 8;
        const starRotation = bonus.rotation + time * 2;
        
        // Layer di profondità della stella
        for (let layer = 2; layer >= 0; layer--) {
            const layerSize = size * (1.4 - layer * 0.15);
            const layerAlpha = 1.0 - layer * 0.2;
            
            for (let i = 0; i < spikes; i++) {
                const angle = (Math.PI * 2 * i) / spikes + starRotation + layer * 0.1;
                const x = bonus.x + Math.cos(angle) * layerSize;
                const y = bonus.y + Math.sin(angle) * layerSize;
                const spikeSize = 6 - layer * 1.5;
                
                // Punta stella
                this.renderer.drawCircle(x, y, spikeSize, [1.0, 0.8 - layer * 0.15, 0.2, layerAlpha]);
                
                // Alone sulla punta
                this.renderer.drawCircle(x, y, spikeSize * 1.8, [1.0, 0.9, 0.5, layerAlpha * 0.3]);
            }
        }
        
        // Anelli interni (dettaglio stella)
        for (let ring = 0; ring < 3; ring++) {
            const ringSize = size * (0.9 - ring * 0.25);
            const ringColor = ring === 0 ? [1.0, 0.9, 0.3, 1.0] : 
                            ring === 1 ? [1.0, 0.85, 0.2, 1.0] : 
                                        [1.0, 0.75, 0.1, 1.0];
            this.renderer.drawCircle(bonus.x, bonus.y, ringSize, ringColor);
        }
        
        // Core
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.4, [1.0, 1.0, 1.0, 1.0]);
        
        // Testo X3 semplice
        if (this.textCtx) {
            this.textCtx.save();
            this.textCtx.font = 'bold 20px Arial';
            this.textCtx.textAlign = 'center';
            this.textCtx.textBaseline = 'middle';
            
            // Testo semplice
            this.textCtx.fillStyle = 'rgb(255, 230, 100)';
            this.textCtx.fillText('x3', bonus.x, bonus.y);
            
            this.textCtx.restore();
        }
    }
    
    renderRainbowBonus(bonus) {
        const time = Date.now() / 1000;
        const pulse = Math.sin(bonus.pulsePhase) * 0.4 + 1.0;
        const size = bonus.radius * pulse;
        
        // ESPLOSIONE arcobaleno con onde multiple
        for (let wave = 0; wave < 4; wave++) {
            const wavePhase = (time * 2 + wave * 0.25) % 1;
            const waveSize = size * (3 + wavePhase * 5);
            const waveAlpha = (1 - wavePhase) * 0.6;
            const hue = ((bonus.rainbowPhase * 100 + wave * 90) % 360) / 360;
            const rgb = this.hslToRgb(hue, 1.0, 0.6);
            this.renderer.drawCircle(bonus.x, bonus.y, waveSize, [...rgb, waveAlpha]);
        }
        
        // Alone arcobaleno STRATIFICATO (10 layer!)
        for (let i = 0; i < 10; i++) {
            const hue = ((bonus.rainbowPhase * 100 + i * 36) % 360) / 360;
            const rgb = this.hslToRgb(hue, 1.0, 0.5);
            const auraColor = [...rgb, (0.7 - i * 0.06) * pulse];
            this.renderer.drawCircle(bonus.x, bonus.y, size * (4 + i * 0.35), auraColor);
        }
        
        // Spirale arcobaleno rotante
        const numSpirals = 3;
        for (let s = 0; s < numSpirals; s++) {
            const spiralRotation = time * (s % 2 === 0 ? 2 : -2) + s * Math.PI * 2 / numSpirals;
            for (let i = 0; i < 30; i++) {
                const t = i / 30;
                const angle = spiralRotation + t * Math.PI * 4;
                const radius = size * (0.5 + t * 2.5);
                const px = bonus.x + Math.cos(angle) * radius;
                const py = bonus.y + Math.sin(angle) * radius;
                const hue = ((bonus.rainbowPhase * 100 + i * 12) % 360) / 360;
                const rgb = this.hslToRgb(hue, 1.0, 0.6);
                const spiralAlpha = (1 - t) * 0.9;
                this.renderer.drawCircle(px, py, 3, [...rgb, spiralAlpha]);
            }
        }
        
        // Cerchi concentrici arcobaleno con gradiente
        for (let i = 0; i < 7; i++) {
            const hue = ((bonus.rainbowPhase * 100 + i * 51.4) % 360) / 360;
            const rgb = this.hslToRgb(hue, 1.0, 0.5);
            const ringSize = size * (1.2 - i * 0.15);
            this.renderer.drawCircle(bonus.x, bonus.y, ringSize, [...rgb, 1.0]);
            
            // Highlight su ogni anello
            const highlightSize = ringSize * 0.85;
            this.renderer.drawCircle(bonus.x - 3, bonus.y - 3, highlightSize * 0.3, [1.0, 1.0, 1.0, 0.5]);
        }
        
        // Raggi prismatici esplosivi (24 raggi)
        const numRays = 24;
        for (let i = 0; i < numRays; i++) {
            const rayAngle = (i / numRays) * Math.PI * 2 + time * 1.5;
            const rayLength = size * (2.5 + Math.sin(time * 4 + i * 0.2) * 1);
            const hue = ((bonus.rainbowPhase * 100 + i * 15) % 360) / 360;
            const rgb = this.hslToRgb(hue, 1.0, 0.6);
            
            // Raggio con gradiente
            for (let j = 0; j < 6; j++) {
                const t = j / 6;
                const px = bonus.x + Math.cos(rayAngle) * rayLength * t;
                const py = bonus.y + Math.sin(rayAngle) * rayLength * t;
                const rayAlpha = (1 - t) * 0.8;
                const raySize = 4 * (1 - t * 0.6);
                this.renderer.drawCircle(px, py, raySize, [...rgb, rayAlpha]);
            }
        }
        
        // Particelle arcobaleno orbitanti (30 particelle!)
        for (let i = 0; i < 30; i++) {
            const orbitAngle = (i / 30) * Math.PI * 2 + time * 4;
            const orbitRadius = size * (2.8 + Math.sin(time * 6 + i) * 0.5);
            const px = bonus.x + Math.cos(orbitAngle) * orbitRadius;
            const py = bonus.y + Math.sin(orbitAngle) * orbitRadius;
            const hue = ((bonus.rainbowPhase * 100 + i * 12) % 360) / 360;
            const rgb = this.hslToRgb(hue, 1.0, 0.7);
            const pSize = 2.5 + Math.sin(time * 10 + i) * 1.2;
            this.renderer.drawCircle(px, py, pSize, [...rgb, 0.95]);
            
            // Alone sulle particelle
            this.renderer.drawCircle(px, py, pSize * 2, [...rgb, 0.3]);
        }
        
        // Stelle arcobaleno rotanti (6 stelle)
        for (let star = 0; star < 6; star++) {
            const starAngle = (star / 6) * Math.PI * 2 + time * 2;
            const starX = bonus.x + Math.cos(starAngle) * size * 2.2;
            const starY = bonus.y + Math.sin(starAngle) * size * 2.2;
            const hue = ((bonus.rainbowPhase * 100 + star * 60) % 360) / 360;
            const rgb = this.hslToRgb(hue, 1.0, 0.6);
            
            // Stella 5 punte
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2 + time * 3;
                const radius = i % 2 === 0 ? 6 : 3;
                const px = starX + Math.cos(angle) * radius;
                const py = starY + Math.sin(angle) * radius;
                this.renderer.drawCircle(px, py, 2, [...rgb, 1.0]);
            }
        }
        
        // Trail particles (migliorate)
        bonus.particles.forEach(p => {
            const alpha = p.life / 0.8;
            const pColor = [...p.color];
            pColor[3] = alpha * 0.9;
            this.renderer.drawCircle(p.x, p.y, p.size * alpha * 1.5, pColor);
            
            // Alone sulla particella
            const glowColor = [...p.color];
            glowColor[3] = alpha * 0.4;
            this.renderer.drawCircle(p.x, p.y, p.size * alpha * 2.5, glowColor);
        });
        
        // Core SUPER brillante pulsante
        const coreSize = size * 0.5 * pulse;
        this.renderer.drawCircle(bonus.x, bonus.y, coreSize, [1.0, 1.0, 1.0, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, coreSize * 0.7, [1.0, 1.0, 0.9, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, coreSize * 0.4, [1.0, 1.0, 1.0, 1.0]);
        
        // Croce luminosa centrale
        const crossSize = coreSize * 1.5;
        this.renderer.drawRect(bonus.x - crossSize, bonus.y - 2, crossSize * 2, 4, [1.0, 1.0, 1.0, 0.8]);
        this.renderer.drawRect(bonus.x - 2, bonus.y - crossSize, 4, crossSize * 2, [1.0, 1.0, 1.0, 0.8]);
    }
    
    hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [r, g, b];
    }
    
    updateAmbientParticles(deltaTime) {
        const time = Date.now() / 1000;
        
        this.ambientParticles.forEach(p => {
            if (p.type === 'mist') {
                // Movimento nebbia
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                
                // Wrap around screen
                if (p.x < -p.size) p.x = this.canvasWidth + p.size;
                if (p.x > this.canvasWidth + p.size) p.x = -p.size;
                if (p.y < -p.size) p.y = this.canvasHeight + p.size;
                if (p.y > this.canvasHeight + p.size) p.y = -p.size;
            } else if (p.type === 'energy') {
                // Movimento particelle energetiche
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.life -= deltaTime;
                
                // Respawn quando muoiono
                if (p.life <= 0) {
                    p.x = Math.random() * this.canvasWidth;
                    p.y = Math.random() * this.canvasHeight;
                    p.vx = (Math.random() - 0.5) * 40;
                    p.vy = (Math.random() - 0.5) * 40;
                    p.life = p.maxLife;
                }
                
                // Wrap around
                if (p.x < 0) p.x = this.canvasWidth;
                if (p.x > this.canvasWidth) p.x = 0;
                if (p.y < 0) p.y = this.canvasHeight;
                if (p.y > this.canvasHeight) p.y = 0;
            }
        });
    }
    
    renderAmbientParticles() {
        const time = Date.now() / 1000;
        
        this.ambientParticles.forEach(p => {
            if (p.type === 'star') {
                // Scintillio
                const twinkle = Math.sin(time * p.twinkleSpeed + p.twinklePhase) * 0.5 + 0.5;
                const alpha = p.brightness * twinkle * 0.6;
                const color = [...p.color, alpha];
                
                // Stella con alone
                this.renderer.drawCircle(p.x, p.y, p.size * 2, [...p.color, alpha * 0.3]);
                this.renderer.drawCircle(p.x, p.y, p.size, color);
                
                // Scintilla centrale
                const sparkleAlpha = twinkle * 0.9;
                this.renderer.drawCircle(p.x, p.y, p.size * 0.5, [1.0, 1.0, 1.0, sparkleAlpha]);
            } else if (p.type === 'mist') {
                // Nebbia colorata
                const pulse = Math.sin(time * 2 + p.pulsePhase) * 0.3 + 0.5;
                const rgb = this.hslToRgb(p.hue, 0.7, 0.5);
                const alpha = pulse * 0.15;
                this.renderer.drawCircle(p.x, p.y, p.size, [...rgb, alpha]);
            } else if (p.type === 'energy') {
                // Particella energetica
                const alpha = (p.life / p.maxLife) * 0.5;
                const color = [...p.color, alpha];
                
                // Alone
                this.renderer.drawCircle(p.x, p.y, p.size * 2, [...p.color, alpha * 0.3]);
                // Core
                this.renderer.drawCircle(p.x, p.y, p.size, color);
            }
        });
    }
    
    renderLevelTransition(transition) {
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        
        // Render particles
        transition.particles.forEach(p => {
            const alpha = (p.life / p.maxLife) * transition.alpha;
            const pColor = [...p.color];
            pColor[3] = alpha;
            this.renderer.drawCircle(p.x, p.y, p.size, pColor);
        });
        
        // Render rays
        transition.rays.forEach(ray => {
            const x1 = centerX;
            const y1 = centerY;
            const x2 = centerX + Math.cos(ray.angle) * ray.length;
            const y2 = centerY + Math.sin(ray.angle) * ray.length;
            
            // Simulare raggio con rettangoli
            const rayColor = [1.0, 1.0, 0.5, transition.alpha * 0.3];
            for (let i = 0; i < ray.length; i += 20) {
                const x = x1 + Math.cos(ray.angle) * i;
                const y = y1 + Math.sin(ray.angle) * i;
                this.renderer.drawCircle(x, y, 3, rayColor);
            }
        });
        
        // Render text GIGANTE con Canvas 2D
        if (this.textCtx) {
            this.textCtx.save();
            this.textCtx.translate(centerX, centerY);
            this.textCtx.rotate(transition.rotation * 0.1);
            
            const fontSize = 120 * transition.scale;
            this.textCtx.font = `bold ${fontSize}px Arial`;
            this.textCtx.textAlign = 'center';
            this.textCtx.textBaseline = 'middle';
            
            // Glow effect
            this.textCtx.shadowColor = '#fff';
            this.textCtx.shadowBlur = 40 * transition.scale;
            
            // Gradient text
            const gradient = this.textCtx.createLinearGradient(0, -fontSize/2, 0, fontSize/2);
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.5, '#FFA500');
            gradient.addColorStop(1, '#FF4500');
            
            this.textCtx.fillStyle = gradient;
            this.textCtx.globalAlpha = transition.alpha;
            this.textCtx.fillText(transition.message, 0, 0);
            
            // Outline
            this.textCtx.strokeStyle = '#fff';
            this.textCtx.lineWidth = 4;
            this.textCtx.strokeText(transition.message, 0, 0);
            
            this.textCtx.restore();
        }
    }
}
