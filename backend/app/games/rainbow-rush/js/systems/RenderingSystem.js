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
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
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

    update(deltaTime, entities) {
        this.powerupUIRenderer.update(deltaTime);
    }

    render(gl, entities) {
        // Render background layers first
        this.renderBackgroundLayers();
        this.renderBackgroundParticles();

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

        // Render level up animation on top of everything
        if (this.levelUpAnimation) {
            this.renderLevelUpAnimation(this.levelUpAnimation);
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
            case 'powerup':
                this.renderPowerup(entity);
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
        let renderColor = platform.color;
        let baseX = platform.x;
        let baseY = platform.y;

        // Crumbling effect
        if (platform.isCrumbling && platform.crumbleTimer) {
            const crumbleProgress = platform.crumbleTimer / platform.crumbleDuration;
            renderColor = [...platform.color];
            renderColor[3] = 1.0 - crumbleProgress * 0.7;

            // Shake effect
            baseX += (Math.random() - 0.5) * crumbleProgress * 5;
            baseY += (Math.random() - 0.5) * crumbleProgress * 5;
        }

        // Shadow (single rect)
        this.renderer.drawRect(
            baseX + 2,
            baseY + platform.height,
            platform.width,
            3,
            [0.0, 0.0, 0.0, 0.2]
        );

        // Main platform body
        this.renderer.drawRect(baseX, baseY, platform.width, platform.height, renderColor);

        // Simple gradient effect (darker bottom stripe)
        const darkColor = [...renderColor];
        darkColor[0] *= 0.6;
        darkColor[1] *= 0.6;
        darkColor[2] *= 0.6;
        this.renderer.drawRect(baseX, baseY + platform.height - 3, platform.width, 3, darkColor);

        // Top highlight
        this.renderer.drawRect(baseX + 2, baseY + 1, platform.width - 4, 1, [1.0, 1.0, 1.0, 0.3]);

        // Type-specific minimal indicators
        if (platform.platformType !== PlatformTypes.NORMAL) {
            let glowColor;

            switch (platform.platformType) {
                case PlatformTypes.FAST:
                    glowColor = [1.0, 0.3, 0.3, 0.5];
                    // 2 speed lines only
                    this.renderer.drawRect(baseX + platform.width * 0.3, baseY + 2, 2, platform.height - 4, [1.0, 0.5, 0.3, 0.5]);
                    this.renderer.drawRect(baseX + platform.width * 0.7, baseY + 2, 2, platform.height - 4, [1.0, 0.5, 0.3, 0.5]);
                    break;

                case PlatformTypes.SLOW:
                    glowColor = [0.3, 0.5, 1.0, 0.5];
                    // 3 ice crystals only
                    this.renderer.drawCircle(baseX + platform.width * 0.25, baseY + platform.height / 2, 2, [0.7, 0.9, 1.0, 0.6]);
                    this.renderer.drawCircle(baseX + platform.width * 0.5, baseY + platform.height / 2, 2, [0.7, 0.9, 1.0, 0.6]);
                    this.renderer.drawCircle(baseX + platform.width * 0.75, baseY + platform.height / 2, 2, [0.7, 0.9, 1.0, 0.6]);
                    break;

                case PlatformTypes.BOUNCY:
                    glowColor = [0.3, 1.0, 0.5, 0.5];
                    // 3 spring coils
                    const bounce = Math.sin(Date.now() / 250) * 0.1 + 1.0;
                    for (let i = 0; i < 3; i++) {
                        const springX = baseX + platform.width / 2 + (i - 1) * 10;
                        this.renderer.drawRect(springX, baseY + platform.height - 4 * bounce, 3, 3 * bounce, [0.4, 1.0, 0.6, 0.6]);
                    }
                    break;

                case PlatformTypes.CRUMBLING:
                    glowColor = [0.6, 0.5, 0.4, 0.4];
                    // 2 crack lines only
                    this.renderer.drawRect(baseX + platform.width * 0.35, baseY, 1, platform.height, [0.3, 0.2, 0.1, 0.5]);
                    this.renderer.drawRect(baseX + platform.width * 0.65, baseY, 1, platform.height, [0.3, 0.2, 0.1, 0.5]);
                    break;
            }

            // Single top glow
            if (glowColor) {
                this.renderer.drawRect(baseX, baseY - 2, platform.width, 2, glowColor);
            }
        }
    }

    renderPlayer(player) {
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        const radius = player.width / 2;

        // Render trail particles first
        const trailParticles = player.getTrailParticles();
        for (const particle of trailParticles) {
            const alpha = particle.life / particle.maxLife;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.7;
            this.renderer.drawCircle(particle.x, particle.y, 12, particleColor);
        }

        // FLASH ROSSO quando danneggiato
        if (player.damageFlash && player.damageFlash > 0) {
            const flashIntensity = Math.min(player.damageFlash * 2, 1.0);
            const redFlash = [1.0, 0.1, 0.1, flashIntensity * 0.6];
            this.renderer.drawCircle(centerX, centerY, radius * 2.5, redFlash);

            // Flash rosso intenso sul player
            const redOverlay = [1.0, 0.2, 0.2, flashIntensity * 0.8];
            this.renderer.drawCircle(centerX, centerY, radius * 1.5, redOverlay);
        }

        if (!player.alive) {
            // Render dead state with fade
            const fadedColor = [...player.color];
            fadedColor[3] = 0.3;
            this.renderer.drawCircle(centerX, centerY, radius, fadedColor);
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
                    this.renderer.drawCircle(centerX, centerY, radius + outerGlowSize, outerGlow);

                    // 2. ALONE MEDIO
                    const midGlowSize = 30 * fastPulse;
                    const midGlow = [...powerup.color];
                    midGlow[3] = 0.4 * fastPulse;
                    this.renderer.drawCircle(centerX, centerY, radius + midGlowSize, midGlow);

                    // 3. CONTORNO COLORATO SPESSO
                    const borderThickness = 5;
                    for (let i = 0; i < borderThickness; i++) {
                        const borderColor = [...powerup.color];
                        borderColor[3] = 0.8 - (i * 0.15);
                        this.renderer.drawCircle(centerX, centerY, radius + 8 + i, borderColor);
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
                        const rayEndX = centerX + Math.cos(rayAngle) * (radius + rayLength);
                        const rayEndY = centerY + Math.sin(rayAngle) * (radius + rayLength);

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

            // Flickering durante invulnerabilità
            if (player.invulnerable) {
                const flicker = Math.floor(Date.now() / 100) % 2;
                if (flicker === 0) {
                    bodyColor[3] = 0.4; // Semi-trasparente
                }
            }

            // Ombra sotto il corpo
            const shadowColor = [0.0, 0.0, 0.0, 0.3];
            this.renderer.drawCircle(centerX + 2, centerY + 3, radius, shadowColor);

            // Corpo principale arrotondato
            this.renderer.drawCircle(centerX, centerY, radius, bodyColor);

            // Highlight per dare profondità
            const highlightColor = [1.0, 1.0, 1.0, 0.4];
            this.renderer.drawCircle(centerX - 4, centerY - 4, radius * 0.4, highlightColor);

            // OCCHI GRANDI E ESPRESSIVI
            const eyeY = centerY - 3;
            const eyeSize = 6;

            // Bianchi degli occhi con contorno
            const eyeWhite = [1.0, 1.0, 1.0, 1.0];
            const eyeOutline = [0.0, 0.0, 0.0, 0.4];

            // Occhio sinistro
            this.renderer.drawCircle(centerX - 7, eyeY, eyeSize + 1, eyeOutline);
            this.renderer.drawCircle(centerX - 7, eyeY, eyeSize, eyeWhite);

            // Occhio destro
            this.renderer.drawCircle(centerX + 7, eyeY, eyeSize + 1, eyeOutline);
            this.renderer.drawCircle(centerX + 7, eyeY, eyeSize, eyeWhite);

            // Pupille grandi
            const pupilColor = [0.0, 0.0, 0.0, 1.0];
            const pupilSize = 3;
            this.renderer.drawCircle(centerX - 7, eyeY, pupilSize, pupilColor);
            this.renderer.drawCircle(centerX + 7, eyeY, pupilSize, pupilColor);

            // Riflessi negli occhi
            const glintColor = [1.0, 1.0, 1.0, 0.8];
            this.renderer.drawCircle(centerX - 8, eyeY - 1, 1.5, glintColor);
            this.renderer.drawCircle(centerX + 6, eyeY - 1, 1.5, glintColor);

            // BOCCA ESPRESSIVA
            const mouthY = centerY + 8;
            const mouthColor = [0.0, 0.0, 0.0, 0.7];

            if (!player.isGrounded && player.velocityY > 0) {
                // Faccia preoccupata quando cade (bocca "O")
                this.renderer.drawCircle(centerX, mouthY, 4, mouthColor);
                const innerMouth = [0.4, 0.2, 0.2, 1.0];
                this.renderer.drawCircle(centerX, mouthY, 3, innerMouth);
            } else {
                // Sorriso felice (semicerchio fatto con cerchi)
                for (let i = 0; i < 7; i++) {
                    const angle = Math.PI * 0.2 + (i * Math.PI * 0.6 / 6);
                    const smileRadius = 8;
                    const sx = centerX + Math.cos(angle) * smileRadius;
                    const sy = mouthY + Math.sin(angle) * smileRadius * 0.6;
                    this.renderer.drawCircle(sx, sy, 1.5, mouthColor);
                }
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
        }
    }

    renderCollectible(collectible) {
        // Enhanced pulsing effect
        const time = collectible.pulsePhase ? Date.now() / 200 + collectible.pulsePhase : Date.now() / 200;
        const pulseRadius = collectible.radius + Math.sin(time) * 3;

        // Outer glow
        const outerGlowColor = [...collectible.color];
        outerGlowColor[3] = 0.3;
        this.renderer.drawCircle(
            collectible.x,
            collectible.y,
            pulseRadius * 1.5,
            outerGlowColor
        );

        // Main body
        this.renderer.drawCircle(
            collectible.x,
            collectible.y,
            pulseRadius,
            collectible.color
        );

        // Inner sparkle
        const sparkleColor = [1.0, 1.0, 1.0, 0.9];
        const sparkleSize = pulseRadius * 0.4;
        this.renderer.drawCircle(
            collectible.x - sparkleSize * 0.3,
            collectible.y - sparkleSize * 0.3,
            sparkleSize,
            sparkleColor
        );
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

    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.powerupUIRenderer.updateDimensions(width, height);
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

    renderObstacle(obstacle) {
        if (obstacle.type === 'spike') {
            this.renderSpike(obstacle);
        } else {
            this.renderEnemy(obstacle);
        }
    }

    renderSpike(spike) {
        // Enhanced spike with sharper look
        const offset = spike.animationOffset || 0;
        const wobble = Math.sin(Date.now() / 200 + offset) * 1;

        // Shadow
        const shadowColor = [0.0, 0.0, 0.0, 0.3];
        this.renderer.drawRect(
            spike.x + 2,
            spike.y + 2,
            spike.width,
            spike.height,
            shadowColor
        );

        // Main spike body
        this.renderer.drawRect(
            spike.x + wobble,
            spike.y,
            spike.width,
            spike.height,
            spike.color
        );

        // Highlight edge
        const highlightColor = [1.0, 0.4, 0.4, 0.8];
        this.renderer.drawRect(
            spike.x + wobble,
            spike.y,
            2,
            spike.height,
            highlightColor
        );
    }

    renderEnemy(enemy) {
        // Enhanced enemy with animation
        const offset = enemy.animationOffset || 0;
        const bounce = Math.sin(Date.now() / 300 + offset) * 3;
        const squish = Math.abs(Math.sin(Date.now() / 300 + offset)) * 0.1 + 0.9;

        // Shadow
        const shadowColor = [0.0, 0.0, 0.0, 0.3];
        this.renderer.drawRect(
            enemy.x + 2,
            enemy.y + enemy.height,
            enemy.width,
            3,
            shadowColor
        );

        // Main enemy body (squishing)
        this.renderer.drawRect(
            enemy.x,
            enemy.y + bounce,
            enemy.width,
            enemy.height * squish,
            enemy.color
        );

        // Enemy eyes
        const eyeColor = [1.0, 0.0, 0.0, 1.0];
        this.renderer.drawCircle(
            enemy.x + enemy.width * 0.3,
            enemy.y + bounce + enemy.height * 0.3,
            2,
            eyeColor
        );
        this.renderer.drawCircle(
            enemy.x + enemy.width * 0.7,
            enemy.y + bounce + enemy.height * 0.3,
            2,
            eyeColor
        );
    }
}
