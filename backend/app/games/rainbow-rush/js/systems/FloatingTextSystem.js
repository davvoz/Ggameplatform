/**
 * FloatingTextSystem - Gestisce testi flottanti animati per i power-up
 * Mostra il nome del bonus attivo e il cooldown rimanente
 */

export class FloatingText {
    constructor(text, x, y, color, duration = 2.0) {
        this.reset(text, x, y, color, duration);
    }
    
    reset(text, x, y, color, duration = 2.0) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.startY = y;
        this.color = color;
        this.duration = duration;
        this.life = duration;
        this.fontSize = 60;
        this.offsetY = 0;
        this.bouncePhase = 0;
        this.active = true;
    }
    
    update(deltaTime) {
        if (!this.active) return false;
        
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.active = false;
            return false;
        }
        
        // SEMPLIFICATO: movimento costante, no bounce
        this.offsetY += deltaTime * 5;
        
        return true;
    }
    
    getAlpha() {
        // Fade semplificato
        if (this.life > this.duration - 0.2) {
            return (this.duration - this.life) / 0.2;
        } else if (this.life < 0.5) {
            return this.life / 0.5;
        }
        return 1.0;
    }
    
    getCurrentY() {
        // Movimento semplice senza bounce
        return this.startY - this.offsetY;
    }
}

export class FloatingTextSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.floatingTexts = [];
        this.activePowerupTexts = new Map();
        
        // Object pooling per performance
        this.textPool = [];
        this.maxPoolSize = 20;
        this.maxActiveTexts = 10; // Limite testi contemporanei
        
        // Cache per rendering
        this.renderCache = new Map();
        this.lastRenderFrame = 0;
    }
    
    update(deltaTime, powerupTimers, playerX, playerY) {
        // Aggiorna testi esistenti - batch reverse iteration
        let i = this.floatingTexts.length;
        while (i--) {
            const text = this.floatingTexts[i];
            if (!text.update(deltaTime)) {
                // Ritorna al pool invece di distruggere
                this.returnToPool(text);
                this.floatingTexts.splice(i, 1);
            }
        }
        
        // Aggiorna power-up texts meno frequentemente
        if (powerupTimers) {
            this.updatePowerupTexts(powerupTimers, playerX, playerY);
        }
    }
    
    getFromPool() {
        return this.textPool.pop() || null;
    }
    
    returnToPool(text) {
        if (this.textPool.length < this.maxPoolSize) {
            text.active = false;
            this.textPool.push(text);
        }
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
        // Renderizza testi per power-up attivi - SEMPLIFICATO
        for (const [type, texts] of this.activePowerupTexts.entries()) {
            const timer = powerupTimers[type];
            if (!timer || !timer.active) continue;
            
            // RIMOSSO: pulse e bounce per performance
            
            const x = texts.baseX;
            const y = texts.baseY;
            
            // Nome del power-up statico
            this.renderText(
                texts.name,
                x,
                y,
                texts.color,
                20,
                1.0 // Scala fissa
            );
            
            // Cooldown - SEMPLIFICATO
            const secondsLeft = Math.ceil(timer.duration / 1000);
            const cooldownColor = [...texts.color];
            
            // Colore rosso quando sta per scadere
            if (secondsLeft <= 2) {
                cooldownColor[0] = 1.0;
                cooldownColor[1] = 0.2;
                cooldownColor[2] = 0.2;
            }
            
            // Renderizza numero fisso
            this.renderCooldownNumber(
                secondsLeft,
                x,
                y + 20,
                cooldownColor,
                1.0 // Scala fissa
            );
        }
        
        // RIMOSSO: testi flottanti normali per performance
    }
    
    renderCooldownNumber(number, x, y, color, pulse) {
        // Semplificato - cerchio fisso con numero
        const size = 16;
        const radius = size;
        
        // Singolo cerchio colorato
        const mainColor = [...color];
        mainColor[3] = 0.85;
        this.renderer.drawCircle(x, y, radius, mainColor);
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
        // DISABLED - testi flottanti completamente disabilitati per performance
        // Vengono gestiti solo i badge power-up essenziali tramite Canvas 2D
        return;
    }
    
    addFloatingText(text, x, y, color, duration = 2.0) {
        // Limita numero di testi attivi per performance
        if (this.floatingTexts.length >= this.maxActiveTexts) {
            return; // Scarta se troppi testi attivi
        }
        
        // Usa object pool
        let floatingText = this.getFromPool();
        if (floatingText) {
            floatingText.reset(text, x, y, color, duration);
        } else {
            floatingText = new FloatingText(text, x, y, color, duration);
        }
        
        this.floatingTexts.push(floatingText);
    }
    
    clear() {
        this.floatingTexts = [];
        this.activePowerupTexts.clear();
    }
}
