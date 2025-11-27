/**
 * CollectibleRenderer - Renders collectibles, hearts, and various bonuses
 * Single Responsibility: Bonus items visualization
 */
import { IEntityRenderer } from './IEntityRenderer.js';
import { RenderingUtils } from './RenderingUtils.js';

export class CollectibleRenderer extends IEntityRenderer {
    constructor(renderer, textCtx = null) {
        super(renderer);
        this.textCtx = textCtx;
    }

    render(entity, context) {
        const { time } = context;
        
        // Render label
        const labelY = entity.y - (entity.radius || entity.height / 2) - 8;
        this.renderCollectibleLabel(entity, entity.x, labelY);
        
        switch(entity.entityType || entity.type) {
            case 'collectible':
                this.renderCollectible(entity, time);
                break;
            case 'heart':
            case 'health':
                this.renderHeart(entity, time);
                break;
            case 'boost':
                this.renderBoost(entity, time);
                break;
            case 'magnet':
                this.renderMagnetBonus(entity, time);
                break;
            case 'coinrain':
            case 'coinRain':
                this.renderCoinRainBonus(entity, time);
                break;
            case 'shield':
                this.renderShieldBonus(entity, time);
                break;
            case 'multiplier':
                this.renderMultiplierBonus(entity, time);
                break;
            case 'rainbow':
                this.renderRainbowBonus(entity, time);
                break;
            case 'instantflight':
            case 'flightBonus':
                this.renderFlightBonus(entity, time);
                break;
            case 'recharge':
            case 'rechargeBonus':
                this.renderRechargeBonus(entity, time);
                break;
            case 'heartrecharge':
            case 'heartRechargeBonus':
                this.renderHeartRechargeBonus(entity, time);
                break;
            case 'powerup':
                this.renderPowerup(entity, time);
                break;
        }
    }

    renderCollectible(collectible, time) {
        // Rotazione 3D semplice (effetto flip)
        const rotation = (time * 3 + (collectible.pulsePhase || 0)) % (Math.PI * 2);
        const scaleX = Math.abs(Math.cos(rotation)); // Effetto 3D flip (da 0 a 1)
        const radiusX = collectible.radius * Math.max(0.2, scaleX); // Larghezza (minimo 0.2 per visibilità)
        const radiusY = collectible.radius; // Altezza costante
        
        // Leggero bounce verticale
        const bounce = Math.sin(time * 4 + (collectible.pulsePhase || 0)) * 2;
        const y = collectible.y + bounce;
        
        // Glow esterno dorato semplice
        const glowSize = collectible.radius * 1.8;
        this.renderer.drawCircle(collectible.x, y, glowSize, [1.0, 0.84, 0.0, 0.2]);
        
        // Moneta - disegnata con ellissi (cerchi schiacciati orizzontalmente)
        // Bordo esterno scuro (metallo)
        this.renderEllipse(collectible.x, y, radiusX, radiusY, [0.8, 0.6, 0.0, 1.0]);
        
        // Interno dorato
        const innerRadiusX = radiusX * 0.85;
        const innerRadiusY = radiusY * 0.85;
        this.renderEllipse(collectible.x, y, innerRadiusX, innerRadiusY, [1.0, 0.84, 0.0, 1.0]);
        
        // Riflesso luminoso (quando la moneta è di fronte)
        if (scaleX > 0.5) {
            const highlightRadiusX = radiusX * 0.4;
            const highlightRadiusY = radiusY * 0.35;
            this.renderEllipse(
                collectible.x - radiusX * 0.15,
                y - radiusY * 0.25,
                highlightRadiusX,
                highlightRadiusY,
                [1.0, 1.0, 0.9, 0.5 * scaleX]
            );
        }
        
        // Simbolo centrale (solo quando visibile di fronte)
        if (scaleX > 0.3) {
            const symbolRadiusX = radiusX * 0.5;
            const symbolRadiusY = radiusY * 0.5;
            // Cerchio centrale come simbolo della moneta
            this.renderEllipse(collectible.x, y, symbolRadiusX, symbolRadiusY, [1.0, 0.95, 0.4, 1.0]);
            // Punto centrale
            this.renderEllipse(collectible.x, y, symbolRadiusX * 0.3, symbolRadiusY * 0.3, [1.0, 1.0, 1.0, 0.9]);
        }
    }
    
    // Helper per disegnare ellissi (cerchi schiacciati)
    renderEllipse(x, y, radiusX, radiusY, color) {
        // Approssima ellisse con più cerchi
        const steps = 8;
        for (let i = 0; i < steps; i++) {
            const offset = (i - steps / 2) * (radiusY * 2 / steps);
            const width = radiusX * Math.sqrt(1 - Math.pow(offset / radiusY, 2));
            if (width > 0) {
                this.renderer.drawCircle(x, y + offset, width, color);
            }
        }
    }

    renderStar(x, y, radius, time) {
        const starPoints = 5;
        const starRotation = time * 2;
        for (let i = 0; i < starPoints * 2; i++) {
            const angle = (i / (starPoints * 2)) * Math.PI * 2 + starRotation;
            const r = i % 2 === 0 ? radius * 0.6 : radius * 0.3;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            
            const nextI = (i + 1) % (starPoints * 2);
            const nextAngle = (nextI / (starPoints * 2)) * Math.PI * 2 + starRotation;
            const nextR = nextI % 2 === 0 ? radius * 0.6 : radius * 0.3;
            const nextPx = x + Math.cos(nextAngle) * nextR;
            const nextPy = y + Math.sin(nextAngle) * nextR;
            
            for (let j = 0; j < 3; j++) {
                const t = j / 3;
                const lx = px + (nextPx - px) * t;
                const ly = py + (nextPy - py) * t;
                this.renderer.drawCircle(lx, ly, 1.5, [1.0, 1.0, 0.5, 0.9]);
            }
        }
    }

    renderHeart(heart, time) {
        const offset = heart.pulsePhase || 0;
        const floatY = heart.y + Math.sin(offset + time * 2) * (heart.floatAmplitude || 8);
        const pulse = Math.sin(offset + time * 4) * 0.25 + 1.0;
        const size = heart.radius * pulse;

        // Glows
        RenderingUtils.drawGlow(this.renderer, heart.x, floatY, size * 3, heart.color, 3, 0.35 * pulse, 0.1);

        // Heart shape
        const lobeRadius = size * 0.55;
        const lobeOffset = size * 0.4;
        this.renderer.drawCircle(heart.x - lobeOffset, floatY - size * 0.15, lobeRadius, heart.color);
        this.renderer.drawCircle(heart.x + lobeOffset, floatY - size * 0.15, lobeRadius, heart.color);
        this.renderer.drawRect(heart.x - size * 0.7, floatY, size * 1.4, size * 0.8, heart.color);

        // Point
        for (let i = 0; i < 5; i++) {
            const stepHeight = size * 0.25;
            const stepWidth = size * 1.4 * (1 - (i + 1) / 5);
            const stepY = floatY + size * 0.8 + i * stepHeight;
            this.renderer.drawRect(heart.x - stepWidth / 2, stepY, stepWidth, stepHeight + 2, heart.color);
        }

        // Highlights
        this.renderer.drawCircle(heart.x - lobeOffset * 0.6, floatY - size * 0.3, size * 0.2, [1.0, 1.0, 1.0, 0.5 * pulse]);
        this.renderer.drawCircle(heart.x + lobeOffset * 0.6, floatY - size * 0.3, size * 0.2, [1.0, 1.0, 1.0, 0.5 * pulse]);

        // Sparkles
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time * 2.5;
            const orbitRadius = size * 2.2;
            const px = heart.x + Math.cos(angle) * orbitRadius;
            const py = floatY + Math.sin(angle) * orbitRadius;
            const sparkleSize = 2.5 + Math.sin(time * 5 + i) * 1;
            this.renderer.drawCircle(px, py, sparkleSize, [1.0, 1.0, 1.0, 0.9 * pulse]);
        }
    }

    renderBoost(boost, time) {
        const pulse = Math.abs(Math.sin((boost.pulsePhase || 0) + time * 5)) * 0.3 + 0.7;
        const currentRadius = boost.radius * pulse;
        
        // Alone semplice
        const auraSize = currentRadius * 1.5;
        const auraColor = [...boost.color];
        auraColor[3] = 0.3 * pulse;
        this.renderer.drawCircle(boost.x, boost.y, auraSize, auraColor);
        
        // Freccia semplice verso destra
        const arrowWidth = currentRadius * 2;
        const arrowHeight = currentRadius * 1.5;
        const arrowX = boost.x;
        const arrowY = boost.y;
        
        // Corpo freccia
        this.renderer.drawRect(
            arrowX - arrowWidth * 0.3,
            arrowY - arrowHeight * 0.2,
            arrowWidth * 0.5,
            arrowHeight * 0.4,
            boost.color
        );
        
        // Punta freccia (triangolo semplice)
        for (let i = 0; i < 3; i++) {
            const stepHeight = arrowHeight * (1 - i / 3) * 0.4;
            const stepX = arrowX + arrowWidth * 0.2 + i * (arrowWidth * 0.2);
            
            this.renderer.drawRect(
                stepX,
                arrowY - stepHeight / 2,
                arrowWidth * 0.2,
                stepHeight,
                boost.color
            );
        }
    }

    renderPowerup(powerup, time) {
        const radius = powerup.radius || 20;
        const rotationPulse = Math.sin((powerup.rotationAngle || 0) * 2) * 0.3 + 1.0;
        const bigPulse = Math.abs(Math.sin((powerup.rotationAngle || 0) * 3)) * 0.5 + 0.5;
        const currentRadius = radius * rotationPulse;

        // Alone esterno ridotto
        for (let i = 0; i < 2; i++) {
            const auraSize = currentRadius * (2.2 - i * 0.5);
            const auraColor = [...powerup.glowColor];
            auraColor[3] = (0.15 - i * 0.05) * bigPulse;
            this.renderer.drawCircle(powerup.x, powerup.y, auraSize, auraColor);
        }

        // Anello rotante colorato
        const ringCount = 8;
        for (let i = 0; i < ringCount; i++) {
            const angle = (powerup.rotationAngle || 0) * 2 + (i * Math.PI * 2 / ringCount);
            const ringRadius = currentRadius * 1.6;
            const rx = powerup.x + Math.cos(angle) * ringRadius;
            const ry = powerup.y + Math.sin(angle) * ringRadius;
            const ringColor = [...powerup.color];
            ringColor[3] = 0.5 * bigPulse;
            this.renderer.drawCircle(rx, ry, 4, ringColor);
        }

        // Corpo principale
        this.renderer.drawCircle(powerup.x, powerup.y, currentRadius, powerup.color);

        // Inner glow brillante
        this.renderer.drawCircle(powerup.x, powerup.y, currentRadius * 0.7, [1.0, 1.0, 1.0, 0.5]);

        // Centro con colore del powerup
        const centerColor = [...powerup.color];
        centerColor[3] = 1.0;
        this.renderer.drawCircle(powerup.x, powerup.y, currentRadius * 0.5, centerColor);

        // Particelle orbitanti
        const particleCount = 6;
        for (let i = 0; i < particleCount; i++) {
            const angle = (-(powerup.rotationAngle || 0) * 1.5 + (i * Math.PI * 2 / particleCount));
            const distance = currentRadius * 1.5;
            const px = powerup.x + Math.cos(angle) * distance;
            const py = powerup.y + Math.sin(angle) * distance;

            // Alone particella
            const particleGlow = [...powerup.color];
            particleGlow[3] = 0.3;
            this.renderer.drawCircle(px, py, 5, particleGlow);

            // Particella
            const particleColor = [...powerup.color];
            particleColor[3] = 0.7;
            this.renderer.drawCircle(px, py, 3, particleColor);
        }

        // Stella pulsante al centro
        const starPoints = 6;
        for (let i = 0; i < starPoints; i++) {
            const angle = (powerup.rotationAngle || 0) * 3 + (i * Math.PI * 2 / starPoints);
            const rayLength = currentRadius * 0.3 * bigPulse;
            const sx = powerup.x + Math.cos(angle) * rayLength;
            const sy = powerup.y + Math.sin(angle) * rayLength;

            const starColor = [1.0, 1.0, 1.0, 0.5 * bigPulse];
            this.renderer.drawCircle(sx, sy, 2, starColor);
        }
    }

    renderMagnetBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.3 + 1.0;
        const size = bonus.radius * pulse;
        
        this.renderer.drawCircle(bonus.x, bonus.y, size * 1.5, [1.0, 0.3, 0.9, 0.2]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 1.2, [1.0, 0.4, 0.9, 0.3]);
        
        const magnetWidth = size * 0.6;
        const magnetHeight = size * 1.0;
        
        this.renderer.drawRect(bonus.x - magnetWidth - 2, bonus.y - magnetHeight/2, magnetWidth, magnetHeight, [1.0, 0.2, 0.2, 1.0]);
        this.renderer.drawRect(bonus.x + 2, bonus.y - magnetHeight/2, magnetWidth, magnetHeight, [0.2, 0.3, 1.0, 1.0]);
        this.renderer.drawRect(bonus.x - 3, bonus.y - magnetHeight/2 - 4, 6, 4, [0.7, 0.7, 0.7, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.3, [1.0, 1.0, 1.0, 0.9]);
    }

    renderCoinRainBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.3 + 1.0;
        const size = bonus.radius * pulse;
        
        // Glow dorato esterno
        RenderingUtils.drawGlow(this.renderer, bonus.x, bonus.y, size * 2.5, bonus.glowColor, 6, 0.5 * pulse, 0.1);
        
        // Cerchio principale oro
        this.renderer.drawCircle(bonus.x, bonus.y, size, bonus.color);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.85, [1.0, 0.95, 0.6, 1.0]);
        
        // Disegna monete che orbitano
        const numCoins = 5;
        for (let i = 0; i < numCoins; i++) {
            const angle = (bonus.coinOrbitPhase + i * (Math.PI * 2 / numCoins));
            const orbitRadius = size * 1.5;
            const coinX = bonus.x + Math.cos(angle) * orbitRadius;
            const coinY = bonus.y + Math.sin(angle) * orbitRadius;
            const coinSize = 6;
            
            // Moneta orbitante
            this.renderer.drawCircle(coinX, coinY, coinSize, [1.0, 0.84, 0.0, 1.0]);
            this.renderer.drawCircle(coinX, coinY, coinSize * 0.7, [1.0, 0.95, 0.4, 1.0]);
        }
        
        // Brillantini sparkle
        for (let i = 0; i < 8; i++) {
            const sparkleAngle = bonus.sparklePhase + i * (Math.PI / 4);
            const sparkleRadius = size * 1.2 + Math.sin(bonus.sparklePhase * 3 + i) * 8;
            const sparkleX = bonus.x + Math.cos(sparkleAngle) * sparkleRadius;
            const sparkleY = bonus.y + Math.sin(sparkleAngle) * sparkleRadius;
            const sparkleAlpha = (Math.sin(bonus.sparklePhase * 4 + i) + 1) * 0.5;
            
            this.renderer.drawCircle(sparkleX, sparkleY, 3, [1.0, 1.0, 0.8, sparkleAlpha]);
        }
        
        // Centro luminoso
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.4, [1.0, 1.0, 1.0, 0.9]);
    }

    renderShieldBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.25 + 1.0;
        const size = bonus.radius * pulse;
        
        RenderingUtils.drawGlow(this.renderer, bonus.x, bonus.y, size * 2.0, bonus.glowColor, 4, 0.4 * pulse, 0.08);
        
        // Hexagon
        const sides = 6;
        const hexRotation = (bonus.rotation || 0) + time * 1.5;
        
        for (let i = 0; i < sides; i++) {
            const angle1 = (Math.PI * 2 * i) / sides + hexRotation;
            const angle2 = (Math.PI * 2 * (i + 1)) / sides + hexRotation;
            const x1 = bonus.x + Math.cos(angle1) * size * 1.3;
            const y1 = bonus.y + Math.sin(angle1) * size * 1.3;
            const x2 = bonus.x + Math.cos(angle2) * size * 1.3;
            const y2 = bonus.y + Math.sin(angle2) * size * 1.3;
            
            for (let j = 0; j < 8; j++) {
                const t = j / 8;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                this.renderer.drawCircle(px, py, 4, [0.3, 1.0, 0.5, 1.0]);
            }
            this.renderer.drawCircle(x1, y1, 6, [0.6, 1.0, 0.7, 1.0]);
            this.renderer.drawCircle(x1, y1, 4, [1.0, 1.0, 1.0, 0.9]);
        }
        
        // Center
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.7, [0.2, 0.8, 0.4, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.5, [0.4, 1.0, 0.6, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.15, [1.0, 1.0, 1.0, 1.0]);
    }

    renderMultiplierBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.35 + 1.0;
        const size = bonus.radius * pulse;
        
        // Light rays - ridotti
        for (let i = 0; i < 6; i++) {
            const rayAngle = (i / 6) * Math.PI * 2 + (bonus.rotation || 0);
            const rayLength = size * (2 + Math.sin(time * 5 + i * 0.5) * 0.8);
            
            for (let j = 0; j < 6; j++) {
                const t = j / 6;
                const px = bonus.x + Math.cos(rayAngle) * rayLength * t;
                const py = bonus.y + Math.sin(rayAngle) * rayLength * t;
                const rayAlpha = (1 - t) * 0.5;
                this.renderer.drawCircle(px, py, 3 * (1 - t * 0.5), [1.0, 0.9, 0.3, rayAlpha]);
            }
        }
        
        RenderingUtils.drawGlow(this.renderer, bonus.x, bonus.y, size * 2.0, bonus.glowColor, 4, 0.4 * pulse, 0.08);
        
        // Star
        const starPoints = 8;
        for (let i = 0; i < starPoints; i++) {
            const angle = (Math.PI * 2 * i) / starPoints + (bonus.rotation || 0) + time * 2;
            const x = bonus.x + Math.cos(angle) * size * 1.4;
            const y = bonus.y + Math.sin(angle) * size * 1.4;
            this.renderer.drawCircle(x, y, 6, [1.0, 0.8, 0.2, 1.0]);
        }
        
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.9, [1.0, 0.9, 0.3, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.4, [1.0, 1.0, 1.0, 1.0]);
    }

    renderRainbowBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.4 + 1.0;
        const size = bonus.radius * pulse;
        
        // Rainbow layers - ridotti
        for (let i = 0; i < 6; i++) {
            const hue = ((bonus.rainbowPhase * 100 + i * 60) % 360) / 360;
            const rgb = RenderingUtils.hslToRgb(hue, 1.0, 0.5);
            this.renderer.drawCircle(bonus.x, bonus.y, size * (2.5 + i * 0.2), [...rgb, (0.4 - i * 0.05) * pulse]);
        }
        
        // Concentric rings
        for (let i = 0; i < 7; i++) {
            const hue = ((bonus.rainbowPhase * 100 + i * 51.4) % 360) / 360;
            const rgb = RenderingUtils.hslToRgb(hue, 1.0, 0.5);
            this.renderer.drawCircle(bonus.x, bonus.y, size * (1.2 - i * 0.15), [...rgb, 1.0]);
        }
        
        // Orbiting particles - ridotte
        for (let i = 0; i < 15; i++) {
            const orbitAngle = (i / 15) * Math.PI * 2 + time * 4;
            const orbitRadius = size * (2.0 + Math.sin(time * 6 + i) * 0.3);
            const px = bonus.x + Math.cos(orbitAngle) * orbitRadius;
            const py = bonus.y + Math.sin(orbitAngle) * orbitRadius;
            const hue = ((bonus.rainbowPhase * 100 + i * 24) % 360) / 360;
            const rgb = RenderingUtils.hslToRgb(hue, 1.0, 0.7);
            this.renderer.drawCircle(px, py, 2 + Math.sin(time * 10 + i) * 0.8, [...rgb, 0.8]);
        }
        
        // Core
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.5 * pulse, [1.0, 1.0, 1.0, 1.0]);
    }
    
    renderFlightBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.3 + 1.0;
        const size = bonus.radius * pulse;
        const wingPhase = Math.sin(bonus.wingPhase);
        
        // Glow esterno azzurro - ridotto
        RenderingUtils.drawGlow(this.renderer, bonus.x, bonus.y, size * 2.0, bonus.glowColor, 4, 0.4 * pulse, 0.08);
        
        // Cerchio principale
        this.renderer.drawCircle(bonus.x, bonus.y, size * 1.5, [...bonus.color, 0.4]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 1.2, [...bonus.color, 0.7]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.9, bonus.color);
        
        // Ali animate (battito) - ridotte
        const wingWidth = size * 1.2;
        const wingHeight = size * 0.8;
        const wingY = wingPhase * 8; // Movimento su/giù
        
        // Ala sinistra
        this.renderer.drawCircle(
            bonus.x - size * 1.0, 
            bonus.y + wingY, 
            wingWidth, 
            [0.8, 0.95, 1.0, 0.4 + wingPhase * 0.15]
        );
        
        // Ala destra
        this.renderer.drawCircle(
            bonus.x + size * 1.0, 
            bonus.y - wingY, 
            wingWidth, 
            [0.8, 0.95, 1.0, 0.4 - wingPhase * 0.15]
        );
        
        // Piume decorative
        for (let i = 0; i < 3; i++) {
            const featherAngle = (i / 3) * Math.PI * 0.5 - Math.PI * 0.25;
            const featherDist = size * 1.8;
            
            // Sinistra
            const fx1 = bonus.x - size * 1.2 + Math.cos(featherAngle) * featherDist;
            const fy1 = bonus.y + wingY + Math.sin(featherAngle) * featherDist;
            this.renderer.drawCircle(fx1, fy1, 3, [1.0, 1.0, 1.0, 0.5]);
            
            // Destra
            const fx2 = bonus.x + size * 1.2 + Math.cos(Math.PI - featherAngle) * featherDist;
            const fy2 = bonus.y - wingY + Math.sin(Math.PI - featherAngle) * featherDist;
            this.renderer.drawCircle(fx2, fy2, 3, [1.0, 1.0, 1.0, 0.5]);
        }
        
        // Centro luminoso
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.5, [1.0, 1.0, 1.0, 1.0]);
        
        // Sparkle
        const sparkleSize = size * 0.3;
        this.renderer.drawCircle(
            bonus.x - sparkleSize * 0.3, 
            bonus.y - sparkleSize * 0.3, 
            sparkleSize, 
            [1.0, 1.0, 1.0, 0.9 + Math.sin(time * 10) * 0.1]
        );
    }
    
    renderRechargeBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.35 + 1.0;
        const size = bonus.radius * pulse;
        const energyPhase = bonus.energyPhase;
        
        // Glow esterno verde elettrico pulsante - ridotto
        RenderingUtils.drawGlow(this.renderer, bonus.x, bonus.y, size * 2.2, bonus.glowColor, 5, 0.5 * pulse, 0.08);
        
        // Anelli energetici espandenti
        for (let i = 0; i < 3; i++) {
            const ringPhase = (energyPhase + i * 2) % 6;
            const ringSize = size * (0.8 + ringPhase * 0.4);
            const ringAlpha = (1 - ringPhase / 6) * 0.8;
            this.renderer.drawCircle(
                bonus.x, 
                bonus.y, 
                ringSize, 
                [0.2, 1.0, 0.4, ringAlpha]
            );
        }
        
        // Cerchi concentrici pulsanti
        this.renderer.drawCircle(bonus.x, bonus.y, size * 1.8, [0.1, 0.8, 0.3, 0.4]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 1.4, [0.2, 1.0, 0.4, 0.6]);
        this.renderer.drawCircle(bonus.x, bonus.y, size, bonus.color);
        
        // Simbolo batteria/energia al centro
        const batteryWidth = size * 0.8;
        const batteryHeight = size * 1.2;
        const batteryX = bonus.x - batteryWidth / 2;
        const batteryY = bonus.y - batteryHeight / 2;
        
        // Corpo batteria
        this.renderer.drawRect(
            batteryX, 
            batteryY, 
            batteryWidth, 
            batteryHeight, 
            [0.15, 0.8, 0.3, 1.0]
        );
        
        // Polo positivo
        this.renderer.drawRect(
            bonus.x - size * 0.2, 
            batteryY - size * 0.2, 
            size * 0.4, 
            size * 0.2, 
            [0.2, 1.0, 0.4, 1.0]
        );
        
        // Barre energia interne (animate)
        const barCount = 4;
        const barHeight = (batteryHeight - 8) / barCount;
        for (let i = 0; i < barCount; i++) {
            const barPulse = Math.sin(energyPhase * 2 + i * 0.5) * 0.3 + 0.7;
            this.renderer.drawRect(
                batteryX + 4, 
                batteryY + 4 + i * barHeight, 
                batteryWidth - 8, 
                barHeight - 2, 
                [0.4, 1.0, 0.5, barPulse]
            );
        }
        
        // Particelle orbitanti elettriche - ridotte
        const particleCount = 6;
        for (let i = 0; i < particleCount; i++) {
            const orbitAngle = (i / particleCount) * Math.PI * 2 + bonus.orbitPhase;
            const orbitRadius = size * (1.8 + Math.sin(energyPhase + i) * 0.2);
            const px = bonus.x + Math.cos(orbitAngle) * orbitRadius;
            const py = bonus.y + Math.sin(orbitAngle) * orbitRadius;
            const particleSize = 2.5 + Math.sin(energyPhase * 3 + i) * 1;
            
            // Particella con scia
            this.renderer.drawCircle(px, py, particleSize, [0.5, 1.0, 0.6, 1.0]);
            
            // Scia
            const trailAngle = orbitAngle + Math.PI;
            const tx = px + Math.cos(trailAngle) * particleSize * 2;
            const ty = py + Math.sin(trailAngle) * particleSize * 2;
            this.renderer.drawCircle(tx, ty, particleSize * 0.5, [0.3, 0.8, 0.4, 0.5]);
        }
        
        // Fulmini casuali
        if (Math.random() < 0.3) {
            const boltCount = 3;
            for (let i = 0; i < boltCount; i++) {
                const boltAngle = Math.random() * Math.PI * 2;
                const boltLength = size * (1.5 + Math.random() * 0.8);
                const boltX = bonus.x + Math.cos(boltAngle) * boltLength;
                const boltY = bonus.y + Math.sin(boltAngle) * boltLength;
                
                // Linea fulmine (simulata con cerchietti)
                const steps = 5;
                for (let s = 0; s < steps; s++) {
                    const t = s / steps;
                    const sx = bonus.x + (boltX - bonus.x) * t;
                    const sy = bonus.y + (boltY - bonus.y) * t;
                    this.renderer.drawCircle(sx, sy, 2, [1.0, 1.0, 1.0, 1 - t]);
                }
            }
        }
        
        // Centro ultra luminoso
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.4, [1.0, 1.0, 1.0, 1.0]);
        
        // Sparkle centrale
        const sparkleSize = size * 0.25;
        this.renderer.drawCircle(
            bonus.x - sparkleSize * 0.2, 
            bonus.y - sparkleSize * 0.2, 
            sparkleSize, 
            [1.0, 1.0, 1.0, 0.95 + Math.sin(time * 12) * 0.05]
        );
    }
    
    renderHeartRechargeBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.4 + 1.0;
        const size = bonus.radius * pulse;
        const heartPhase = bonus.heartPhase;
        const glowPhase = bonus.glowPhase;
        
        // Glow esterno rosa/rosso pulsante molto intenso
        RenderingUtils.drawGlow(this.renderer, bonus.x, bonus.y, size * 5, bonus.glowColor, 10, 0.9 * pulse, 0.15);
        
        // Anelli concentrici rosa che pulsano
        for (let i = 0; i < 4; i++) {
            const ringPulse = Math.sin(glowPhase + i * 0.8) * 0.3 + 1.0;
            const ringSize = size * (1.3 + i * 0.4) * ringPulse;
            const ringAlpha = (0.6 - i * 0.12) * pulse;
            this.renderer.drawCircle(
                bonus.x, 
                bonus.y, 
                ringSize, 
                [1.0, 0.3 + i * 0.1, 0.5, ringAlpha]
            );
        }
        
        // Cuori orbitanti
        const heartCount = 8;
        for (let i = 0; i < heartCount; i++) {
            const orbitAngle = (i / heartCount) * Math.PI * 2 + heartPhase;
            const orbitRadius = size * (2.5 + Math.sin(heartPhase * 2 + i) * 0.4);
            const hx = bonus.x + Math.cos(orbitAngle) * orbitRadius;
            const hy = bonus.y + Math.sin(orbitAngle) * orbitRadius;
            const heartSize = 6 + Math.sin(heartPhase * 3 + i) * 2;
            const heartPulse = Math.sin(heartPhase * 4 + i * 0.5) * 0.3 + 1.0;
            
            // Cuoricino (doppio cerchio per formare cuore stilizzato)
            this.renderer.drawCircle(hx - heartSize * 0.25, hy - heartSize * 0.15, heartSize * 0.5 * heartPulse, [1.0, 0.2, 0.4, 0.9]);
            this.renderer.drawCircle(hx + heartSize * 0.25, hy - heartSize * 0.15, heartSize * 0.5 * heartPulse, [1.0, 0.2, 0.4, 0.9]);
            this.renderer.drawCircle(hx, hy + heartSize * 0.2, heartSize * 0.6 * heartPulse, [1.0, 0.2, 0.4, 0.9]);
            
            // Glow cuoricino
            this.renderer.drawCircle(hx, hy, heartSize * 1.2, [1.0, 0.5, 0.7, 0.3]);
        }
        
        // Cerchio centrale principale
        this.renderer.drawCircle(bonus.x, bonus.y, size * 1.6, [1.0, 0.15, 0.4, 0.5]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 1.2, [1.0, 0.2, 0.45, 0.7]);
        this.renderer.drawCircle(bonus.x, bonus.y, size, bonus.color);
        
        // Cuore centrale grande (battito)
        const heartBeat = Math.sin(heartPhase * 5) * 0.2 + 1.0;
        const centerHeartSize = size * 0.7 * heartBeat;
        
        // Cuore stilizzato centrale (3 cerchi)
        this.renderer.drawCircle(
            bonus.x - centerHeartSize * 0.3, 
            bonus.y - centerHeartSize * 0.2, 
            centerHeartSize * 0.6, 
            [1.0, 1.0, 1.0, 1.0]
        );
        this.renderer.drawCircle(
            bonus.x + centerHeartSize * 0.3, 
            bonus.y - centerHeartSize * 0.2, 
            centerHeartSize * 0.6, 
            [1.0, 1.0, 1.0, 1.0]
        );
        this.renderer.drawCircle(
            bonus.x, 
            bonus.y + centerHeartSize * 0.3, 
            centerHeartSize * 0.8, 
            [1.0, 1.0, 1.0, 1.0]
        );
        
        // Particelle cuoricini che volano via
        if (Math.random() < 0.4) {
            const particleAngle = Math.random() * Math.PI * 2;
            const particleSpeed = 50 + Math.random() * 30;
            // Questi verranno renderizzati dal particle system
        }
        
        // Croce medica/più al centro (simbolo ricarica)
        const crossSize = size * 0.35;
        const crossThickness = crossSize * 0.35;
        
        // Barra orizzontale
        this.renderer.drawRect(
            bonus.x - crossSize, 
            bonus.y - crossThickness / 2, 
            crossSize * 2, 
            crossThickness, 
            [1.0, 0.9, 0.95, 0.9]
        );
        
        // Barra verticale
        this.renderer.drawRect(
            bonus.x - crossThickness / 2, 
            bonus.y - crossSize, 
            crossThickness, 
            crossSize * 2, 
            [1.0, 0.9, 0.95, 0.9]
        );
        
        // Centro luminoso brillante
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.25, [1.0, 1.0, 1.0, 1.0]);
        
        // Sparkle effect
        const sparkleSize = size * 0.3;
        const sparkleOffset = Math.sin(time * 8) * sparkleSize * 0.15;
        this.renderer.drawCircle(
            bonus.x + sparkleOffset, 
            bonus.y - sparkleOffset, 
            sparkleSize * 0.8, 
            [1.0, 1.0, 1.0, 0.85 + Math.sin(time * 10) * 0.15]
        );
        
        // Emoji cuore al centro (💕) - renderizzato tramite context
        this.renderEmojiOnBonus(bonus.x, bonus.y, '💕', size * 1.2);
    }
    
    renderEmojiOnBonus(x, y, emoji, size) {
        // Questo metodo sarà sovrascritto dal sistema di rendering principale
        // che ha accesso al canvas 2D context
        if (this.textCtx) {
            this.textCtx.save();
            this.textCtx.textAlign = 'center';
            this.textCtx.textBaseline = 'middle';
            this.textCtx.font = `bold ${size}px Arial`;
            
            // Ombra per migliore visibilità
            this.textCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.textCtx.shadowBlur = 4;
            this.textCtx.shadowOffsetX = 2;
            this.textCtx.shadowOffsetY = 2;
            this.textCtx.fillText(emoji, x, y);
            
            this.textCtx.restore();
        }
    }
    
    renderCollectibleLabel(entity, x, y) {
        if (!this.renderer || !this.renderer.textCtx) return;
        
        const ctx = this.renderer.textCtx;
        let label = (entity.entityType || entity.type || 'ITEM').toUpperCase();
        
        // Shorten some labels
        if (label === 'INSTANTFLIGHT') label = 'FLIGHT';
        if (label === 'HEARTRECHARGE') label = 'HEART+';
        if (label === 'COINRAIN') label = 'COIN RAIN';
        if (label === 'FLIGHTBONUS') label = 'FLIGHT';
        if (label === 'RECHARGEBONUS') label = 'RECHARGE';
        if (label === 'HEARTRECHARGEBONUS') label = 'HEART+';
        
        ctx.save();
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Background
        const metrics = ctx.measureText(label);
        const padding = 3;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = 11;
        
        ctx.fillStyle = 'rgba(100, 50, 0, 0.7)';
        ctx.fillRect(x - bgWidth / 2, y - bgHeight, bgWidth, bgHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - bgWidth / 2, y - bgHeight, bgWidth, bgHeight);
        
        // Text
        ctx.fillStyle = '#ffcc66';
        ctx.fillText(label, x, y);
        
        ctx.restore();
    }
}
