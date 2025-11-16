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
    }
    
    setBackground(layers, particles) {
        this.backgroundLayers = layers;
        this.backgroundParticles = particles;
    }
    
    setPowerupTimers(timers) {
        this.powerupTimers = timers;
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
            this.powerupUIRenderer.render(this.powerupTimers);
        }
    }

    renderEntity(entity) {
        switch (entity.type) {
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
                        particle.color[3];
                    const particleColor = [...particle.color];
                    particleColor[3] = alpha;
                    this.renderer.drawCircle(particle.x, particle.y, particle.radius, particleColor);
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
                    // Draw shooting star as line
                    this.renderer.drawRect(particle.x, particle.y, particle.length, 2, particle.color);
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
        // Render trail particles first
        const trailParticles = player.getTrailParticles();
        for (const particle of trailParticles) {
            const alpha = particle.life / particle.maxLife;
            const particleColor = [...particle.color];
            particleColor[3] = alpha;
            this.renderer.drawCircle(particle.x, particle.y, 8, particleColor);
        }
        
        if (!player.alive) {
            // Render dead state with fade
            const fadedColor = [...player.color];
            fadedColor[3] = 0.3;
            this.renderer.drawRect(
                player.x,
                player.y,
                player.width,
                player.height,
                fadedColor
            );
        } else {
            // Multiple powerup indicators
            const activePowerups = [];
            if (player.powerups.immortality) activePowerups.push({ type: 'immortality', color: [1.0, 0.84, 0.0, 1.0] });
            if (player.powerups.flight) activePowerups.push({ type: 'flight', color: [0.4, 0.7, 1.0, 1.0] });
            if (player.powerups.superJump) activePowerups.push({ type: 'superJump', color: [1.0, 0.3, 0.5, 1.0] });
            
            // Render multiple aura layers for each active powerup
            if (activePowerups.length > 0) {
                const pulse = Math.abs(Math.sin(player.animationTime * 4)) * 0.3 + 0.7;
                const basePulse = Math.sin(player.animationTime * 3) * 0.5 + 0.5;
                
                activePowerups.forEach((powerup, index) => {
                    const offset = index * 0.5; // Offset for multiple auras
                    const rotationOffset = player.animationTime * 2 + index * Math.PI * 2 / 3;
                    
                    // Outer rotating aura
                    const glowSize = (12 + index * 3) * pulse;
                    const outerGlow = [...powerup.color];
                    outerGlow[3] = 0.3 * pulse;
                    
                    this.renderer.drawRect(
                        player.x - glowSize / 2,
                        player.y - glowSize / 2,
                        player.width + glowSize,
                        player.height + glowSize,
                        outerGlow
                    );
                    
                    // Orbiting particles
                    for (let i = 0; i < 3; i++) {
                        const angle = rotationOffset + (i * Math.PI * 2 / 3);
                        const radius = 20 + index * 3;
                        const px = player.x + player.width / 2 + Math.cos(angle) * radius;
                        const py = player.y + player.height / 2 + Math.sin(angle) * radius;
                        
                        const particleColor = [...powerup.color];
                        particleColor[3] = 0.8 * basePulse;
                        this.renderer.drawCircle(px, py, 3, particleColor);
                    }
                });
            }
            
            // Main player body - change color based on active powerup
            let bodyColor = [...player.color];
            if (player.powerups.immortality) {
                // Golden tint
                bodyColor = [
                    Math.min(1.0, player.color[0] * 1.5),
                    Math.min(1.0, player.color[1] * 1.3),
                    player.color[2] * 0.8,
                    1.0
                ];
            } else if (player.powerups.flight) {
                // Light blue tint
                bodyColor = [
                    player.color[0] * 0.8,
                    Math.min(1.0, player.color[1] * 1.2),
                    Math.min(1.0, player.color[2] * 1.3),
                    1.0
                ];
            } else if (player.powerups.superJump) {
                // Pink tint
                bodyColor = [
                    Math.min(1.0, player.color[0] * 1.3),
                    player.color[1] * 0.8,
                    Math.min(1.0, player.color[2] * 1.2),
                    1.0
                ];
            }
            
            this.renderer.drawRect(
                player.x,
                player.y,
                player.width,
                player.height,
                bodyColor
            );
            
            // Eyes
            const eyeColor = [1.0, 1.0, 1.0, 1.0];
            const eyeY = player.y + player.height * 0.3;
            this.renderer.drawCircle(
                player.x + player.width * 0.3,
                eyeY,
                3,
                eyeColor
            );
            this.renderer.drawCircle(
                player.x + player.width * 0.7,
                eyeY,
                3,
                eyeColor
            );
            
            // Pupils
            const pupilColor = [0.0, 0.0, 0.0, 1.0];
            this.renderer.drawCircle(
                player.x + player.width * 0.3,
                eyeY,
                1.5,
                pupilColor
            );
            this.renderer.drawCircle(
                player.x + player.width * 0.7,
                eyeY,
                1.5,
                pupilColor
            );
            
            // Smile (simple line)
            if (!player.isGrounded && player.velocityY > 0) {
                // Worried face when falling
                const mouthColor = [0.0, 0.0, 0.0, 0.6];
                this.renderer.drawRect(
                    player.x + player.width * 0.3,
                    player.y + player.height * 0.7,
                    player.width * 0.4,
                    2,
                    mouthColor
                );
            } else {
                // Happy face
                const mouthColor = [0.0, 0.0, 0.0, 0.6];
                this.renderer.drawRect(
                    player.x + player.width * 0.3,
                    player.y + player.height * 0.65,
                    player.width * 0.4,
                    2,
                    mouthColor
                );
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
    
    renderPowerup(powerup) {
        // Rotation effect
        const rotationPulse = Math.sin(powerup.rotationAngle) * 0.2 + 1.0;
        const currentRadius = powerup.radius * rotationPulse;
        
        // Outer aura
        const auraColor = [...powerup.glowColor];
        auraColor[3] = 0.4 * rotationPulse;
        this.renderer.drawCircle(
            powerup.x,
            powerup.y,
            currentRadius * 2,
            auraColor
        );
        
        // Main powerup circle
        this.renderer.drawCircle(
            powerup.x,
            powerup.y,
            currentRadius,
            powerup.color
        );
        
        // Inner glow
        const innerGlowColor = [...powerup.glowColor];
        innerGlowColor[3] = 0.8;
        this.renderer.drawCircle(
            powerup.x,
            powerup.y,
            currentRadius * 0.6,
            innerGlowColor
        );
        
        // Particle trail effect
        if (powerup.particleTimer) {
            const particleCount = 3;
            for (let i = 0; i < particleCount; i++) {
                const angle = (powerup.rotationAngle + (i * Math.PI * 2 / particleCount));
                const distance = currentRadius * 1.5;
                const px = powerup.x + Math.cos(angle) * distance;
                const py = powerup.y + Math.sin(angle) * distance;
                
                const particleColor = [...powerup.color];
                particleColor[3] = 0.6;
                this.renderer.drawCircle(px, py, 3, particleColor);
            }
        }
    }
    
    updateDimensions(width, height) {
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
