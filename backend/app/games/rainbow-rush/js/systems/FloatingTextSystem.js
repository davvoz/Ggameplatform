/**
 * FloatingTextSystem - Gestisce testi flottanti animati per i power-up
 * Mostra il nome del bonus attivo e il cooldown rimanente
 */

export class FloatingText {
    constructor(text, x, y, color, duration = 2.0) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.startY = y;
        this.color = color;
        this.duration = duration;
        this.life = duration;
        this.fontSize = 60; // ENORME!
        this.offsetY = 0;
        this.bouncePhase = 0;
        console.log('FloatingText created:', text, 'at', x, y, 'fontSize:', this.fontSize);
    }
    
    update(deltaTime) {
        this.life -= deltaTime;
        this.bouncePhase += deltaTime * 3;
        
        // Movimento verso l'alto MOLTO LENTO
        this.offsetY += deltaTime * 5; // Era 20, ora 5
        
        return this.life > 0;
    }
    
    getAlpha() {
        // Fade in nei primi 0.3s, fade out negli ultimi 1.0s
        if (this.life > this.duration - 0.3) {
            return (this.duration - this.life) / 0.3;
        } else if (this.life < 1.0) {
            return this.life / 1.0;
        }
        return 1.0; // Completamente visibile per la maggior parte del tempo
    }
    
    getCurrentY() {
        // Movimento verso l'alto + piccolo rimbalzo
        const bounce = Math.sin(this.bouncePhase * 2) * 3;
        return this.startY - this.offsetY + bounce;
    }
}

export class FloatingTextSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.floatingTexts = [];
        this.activePowerupTexts = new Map(); // powerupType -> {nameText, cooldownText}
    }
    
    update(deltaTime, powerupTimers, playerX, playerY) {
        // Aggiorna testi esistenti
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            if (!text.update(deltaTime)) {
                this.floatingTexts.splice(i, 1);
            }
        }
        
        // Aggiorna o crea testi per power-up attivi
        this.updatePowerupTexts(powerupTimers, playerX, playerY);
    }
    
    updatePowerupTexts(powerupTimers, playerX, playerY) {
        if (!powerupTimers) return;
        
        const activePowerups = [];
        
        // Trova power-up attivi
        for (const [type, timer] of Object.entries(powerupTimers)) {
            if (timer.active && timer.duration > 0) {
                activePowerups.push({ type, timer });
            }
        }
        
        // Rimuovi testi di power-up non più attivi
        for (const [type, texts] of this.activePowerupTexts.entries()) {
            const stillActive = activePowerups.find(p => p.type === type);
            if (!stillActive) {
                this.activePowerupTexts.delete(type);
            }
        }
        
        // Crea o aggiorna testi per power-up attivi
        // POSIZIONE FISSA in alto al centro dello schermo
        const screenCenterX = 400; // Centro schermo (assumendo 800px di larghezza)
        const topMargin = 100; // Margine dall'alto
        
        activePowerups.forEach((powerup, index) => {
            const { type, timer } = powerup;
            
            if (!this.activePowerupTexts.has(type)) {
                // Crea nuovi testi per questo power-up
                const powerupInfo = this.getPowerupInfo(type);
                const offsetX = (activePowerups.length > 1 ? (index - (activePowerups.length - 1) / 2) * 280 : 0);
                
                this.activePowerupTexts.set(type, {
                    type: type,
                    color: powerupInfo.color,
                    name: powerupInfo.name,
                    baseX: screenCenterX + offsetX,
                    baseY: topMargin + index * 80
                });
            }
            // Non aggiorniamo la posizione - resta fissa!
        });
    }
    
    getPowerupInfo(type) {
        switch (type) {
            case 'immortality':
                return {
                    name: '⭐ IMMORTALE ⭐',
                    color: [1.0, 0.9, 0.2, 1.0]
                };
            case 'flight':
                return {
                    name: '🪶 VOLO 🪶',
                    color: [0.5, 0.9, 1.0, 1.0]
                };
            case 'superJump':
                return {
                    name: '⚡ SUPER SALTO ⚡',
                    color: [1.0, 0.4, 0.7, 1.0]
                };
            default:
                return {
                    name: 'BONUS',
                    color: [1.0, 1.0, 1.0, 1.0]
                };
        }
    }
    
    render(powerupTimers) {
        // Renderizza testi per power-up attivi
        for (const [type, texts] of this.activePowerupTexts.entries()) {
            const timer = powerupTimers[type];
            if (!timer || !timer.active) continue;
            
            const time = Date.now() / 1000;
            const pulse = Math.abs(Math.sin(time * 4)) * 0.3 + 0.7;
            const bounce = Math.sin(time * 3) * 5;
            
            const x = texts.baseX;
            const y = texts.baseY + bounce;
            
            // Nome del power-up (più grande e brillante)
            this.renderText(
                texts.name,
                x,
                y,
                texts.color,
                20, // fontSize più piccolo e discreto
                pulse
            );
            
            // Cooldown sotto il nome - PICCOLO E DISCRETO
            const secondsLeft = Math.ceil(timer.duration / 1000);
            const cooldownColor = [...texts.color];
            
            // Colore diventa rosso quando sta per scadere
            if (secondsLeft <= 2) {
                cooldownColor[0] = 1.0;
                cooldownColor[1] = 0.2;
                cooldownColor[2] = 0.2;
            }
            
            // Renderizza un piccolo cerchio con il numero
            this.renderCooldownNumber(
                secondsLeft,
                x,
                y + 20, // Più vicino al badge
                cooldownColor,
                pulse
            );
        }
        
        // Renderizza testi flottanti normali
        for (const text of this.floatingTexts) {
            const alpha = text.getAlpha();
            const color = [...text.color];
            color[3] = alpha;
            
            console.log('Rendering floating text:', text.text, 'life:', text.life, 'alpha:', alpha);
            
            this.renderText(
                text.text,
                text.x,
                text.getCurrentY(),
                color,
                text.fontSize,
                1.0
            );
        }
    }
    
    renderCooldownNumber(number, x, y, color, pulse) {
        // Piccolo badge elegante con il numero
        const size = 18; // Molto più piccolo!
        const radius = size * pulse;
        
        // Sfondo scuro
        const bgColor = [0.1, 0.1, 0.15, 0.85];
        this.renderer.drawCircle(x, y, radius * 1.4, bgColor);
        
        // Cerchio colorato
        const mainColor = [...color];
        mainColor[3] = 0.9;
        this.renderer.drawCircle(x, y, radius, mainColor);
        
        // Centro bianco
        const innerColor = [1.0, 1.0, 1.0, 0.95];
        this.renderer.drawCircle(x, y, radius * 0.55, innerColor);
        
        // Numero rappresentato con pallini (molto più piccoli)
        this.renderNumberBars(number, x, y, color, radius * 0.7);
    }
    
    renderNumberBars(number, x, y, color, size) {
        const numDots = Math.min(Math.max(number, 1), 9);
        
        for (let i = 0; i < numDots; i++) {
            const angle = (i / numDots) * Math.PI * 2 - Math.PI / 2;
            const dotRadius = size * 0.4;
            const dotX = x + Math.cos(angle) * dotRadius;
            const dotY = y + Math.sin(angle) * dotRadius;
            
            const dotColor = [...color];
            dotColor[3] = 0.9;
            this.renderer.drawCircle(dotX, dotY, size * 0.08, dotColor);
        }
    }
    
    renderText(text, x, y, color, fontSize, scale = 1.0) {
        const scaledSize = fontSize * scale;
        
        // Badge GIGANTE per il floating text
        const width = scaledSize * 2;
        const height = scaledSize * 1.5;
        const startX = x - width / 2;
        const startY = y - height / 2;
        
        console.log('RENDERING FLOATING TEXT:', text, 'at', startX, startY, 'size:', width, 'x', height);
        
        // Sfondo NERO SOLIDO molto visibile
        const bgColor = [0.0, 0.0, 0.0, 0.95 * color[3]];
        const padding = 20;
        this.renderer.drawRect(startX - padding, startY - padding, width + padding * 2, height + padding * 2, bgColor);
        
        // Bordo ENORME colorato brillante
        const borderColor = [...color];
        borderColor[3] = 1.0;
        const borderW = 8;
        
        // Bordi spessi
        this.renderer.drawRect(startX - padding, startY - padding, width + padding * 2, borderW, borderColor);
        this.renderer.drawRect(startX - padding, startY + height + padding - borderW, width + padding * 2, borderW, borderColor);
        this.renderer.drawRect(startX - padding, startY - padding, borderW, height + padding * 2, borderColor);
        this.renderer.drawRect(startX + width + padding - borderW, startY - padding, borderW, height + padding * 2, borderColor);
        
        // Riempimento colorato BRILLANTE
        const fillColor = [...color];
        fillColor[3] = 1.0;
        this.renderer.drawRect(startX, startY, width, height, fillColor);
        
        // Highlight bianco
        const highlightColor = [1.0, 1.0, 1.0, 0.6 * color[3]];
        this.renderer.drawRect(startX, startY, width, height * 0.3, highlightColor);
        
        // Icone ENORMI
        const iconRadius = height * 0.4;
        const iconY = startY + height * 0.5;
        
        if (text.includes('⭐') || text.includes('IMMORTALE')) {
            const iconColor = [1.0, 0.9, 0.2, 1.0];
            this.renderer.drawCircle(startX - padding - iconRadius, iconY, iconRadius, iconColor);
            this.renderer.drawCircle(startX + width + padding + iconRadius, iconY, iconRadius, iconColor);
        } else if (text.includes('🪶') || text.includes('VOLO')) {
            const iconColor = [0.5, 0.9, 1.0, 1.0];
            this.renderer.drawCircle(startX - padding - iconRadius, iconY, iconRadius, iconColor);
            this.renderer.drawCircle(startX + width + padding + iconRadius, iconY, iconRadius, iconColor);
        } else if (text.includes('⚡') || text.includes('SUPER')) {
            const iconColor = [1.0, 0.4, 0.7, 1.0];
            this.renderer.drawCircle(startX - padding - iconRadius, iconY, iconRadius, iconColor);
            this.renderer.drawCircle(startX + width + padding + iconRadius, iconY, iconRadius, iconColor);
        }
    }
    
    addFloatingText(text, x, y, color, duration = 2.0) {
        console.log('Adding floating text:', text, 'at', x, y);
        //this.floatingTexts.push(new FloatingText(text, x, y, color, duration));
    }
    
    clear() {
        this.floatingTexts = [];
        this.activePowerupTexts.clear();
    }
}
