/**
 * AbilityUnlockAnimation - Animazione spettacolare per sblocco nuove abilità
 */
export class AbilityUnlockAnimation {
    constructor() {
        this.isActive = false;
        this.abilityType = null; // 'flight' o 'turbo'
        this.timer = 0;
        this.duration = 5.0; // 5 secondi totali
        this.particles = [];
        this.rings = [];
        this.rays = [];
        this.textAlpha = 0;
        this.iconScale = 0;
        this.backgroundAlpha = 0;
    }
    
    /**
     * Avvia l'animazione di sblocco
     */
    start(abilityType) {
        this.isActive = true;
        this.abilityType = abilityType;
        this.timer = 0;
        this.particles = [];
        this.rings = [];
        this.rays = [];
        this.textAlpha = 0;
        this.iconScale = 0;
        this.backgroundAlpha = 0;
        
        // Genera particelle iniziali esplosive
        this.generateExplosionParticles();
        
        // Genera anelli espansivi
        this.generateRings();
        
        // Genera raggi di luce
        this.generateRays();
    }
    
    generateExplosionParticles() {
        const centerX = 400;
        const centerY = 300;
        
        for (let i = 0; i < 100; i++) {
            const angle = (Math.PI * 2 * i) / 100;
            const speed = 100 + Math.random() * 200;
            const color = this.abilityType === 'flight' 
                ? [0.4 + Math.random() * 0.3, 0.8 + Math.random() * 0.2, 1.0, 1.0]
                : [1.0, 0.7 + Math.random() * 0.3, 0.2 + Math.random() * 0.3, 1.0];
            
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                maxLife: 2.0 + Math.random(),
                size: 3 + Math.random() * 5,
                color: color,
                gravity: 50 + Math.random() * 50
            });
        }
    }
    
    generateRings() {
        for (let i = 0; i < 5; i++) {
            this.rings.push({
                radius: 0,
                maxRadius: 300 + i * 50,
                speed: 200 + i * 50,
                alpha: 1.0,
                thickness: 4
            });
        }
    }
    
    generateRays() {
        const numRays = 12;
        for (let i = 0; i < numRays; i++) {
            const angle = (Math.PI * 2 * i) / numRays;
            this.rays.push({
                angle: angle,
                length: 0,
                maxLength: 400,
                speed: 500,
                alpha: 1.0,
                width: 8
            });
        }
    }
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        this.timer += deltaTime;
        
        // Animazione background fade in/out
        if (this.timer < 0.5) {
            this.backgroundAlpha = this.timer / 0.5;
        } else if (this.timer > this.duration - 1.0) {
            this.backgroundAlpha = (this.duration - this.timer) / 1.0;
        } else {
            this.backgroundAlpha = 0.7;
        }
        
        // Animazione testo fade in
        if (this.timer < 1.0) {
            this.textAlpha = this.timer / 1.0;
        } else if (this.timer > this.duration - 1.5) {
            this.textAlpha = (this.duration - this.timer) / 1.5;
        } else {
            this.textAlpha = 1.0;
        }
        
        // Animazione icona bounce
        if (this.timer < 1.5) {
            const t = this.timer / 1.5;
            // Bounce easing
            this.iconScale = this.easeOutBounce(t) * 1.2;
        } else {
            this.iconScale = 1.2 + Math.sin(this.timer * 3) * 0.1;
        }
        
        // Update particelle
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += p.gravity * deltaTime;
            p.life -= deltaTime / p.maxLife;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Continua a generare particelle per i primi 3 secondi
        if (this.timer < 3.0 && Math.random() < 0.3) {
            this.generateExplosionParticles();
        }
        
        // Update anelli
        for (const ring of this.rings) {
            ring.radius += ring.speed * deltaTime;
            if (ring.radius > ring.maxRadius) {
                ring.radius = 0;
                ring.alpha = 1.0;
            }
            ring.alpha = 1.0 - (ring.radius / ring.maxRadius);
        }
        
        // Update raggi
        for (const ray of this.rays) {
            ray.length = Math.min(ray.maxLength, ray.length + ray.speed * deltaTime);
            ray.angle += deltaTime * 0.5;
            
            // Pulsazione alpha
            ray.alpha = 0.6 + Math.sin(this.timer * 5 + ray.angle) * 0.4;
        }
        
        // Termina animazione
        if (this.timer >= this.duration) {
            this.isActive = false;
        }
    }
    
    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
    
    render(renderer) {
        if (!this.isActive) return;
        
        const centerX = 400;
        const centerY = 300;
        
        // Background overlay semi-trasparente
        renderer.drawRect(0, 0, 800, 800, [0, 0, 0, this.backgroundAlpha * 0.8]);
        
        // Raggi di luce
        const rayColor = this.abilityType === 'flight' 
            ? [0.5, 0.9, 1.0]
            : [1.0, 0.8, 0.3];
        
        for (const ray of this.rays) {
            const endX = centerX + Math.cos(ray.angle) * ray.length;
            const endY = centerY + Math.sin(ray.angle) * ray.length;
            
            // Disegna raggio come serie di cerchi
            const steps = 20;
            for (let i = 0; i < steps; i++) {
                const t = i / steps;
                const x = centerX + (endX - centerX) * t;
                const y = centerY + (endY - centerY) * t;
                const size = ray.width * (1 - t * 0.5);
                const alpha = ray.alpha * (1 - t) * this.backgroundAlpha;
                
                renderer.drawCircle(x, y, size, [...rayColor, alpha]);
            }
        }
        
        // Anelli espansivi
        const ringColor = this.abilityType === 'flight'
            ? [0.4, 0.85, 1.0]
            : [1.0, 0.7, 0.2];
        
        for (const ring of this.rings) {
            if (ring.radius > 0) {
                const segments = 60;
                for (let i = 0; i < segments; i++) {
                    const angle = (Math.PI * 2 * i) / segments;
                    const x = centerX + Math.cos(angle) * ring.radius;
                    const y = centerY + Math.sin(angle) * ring.radius;
                    renderer.drawCircle(x, y, ring.thickness, [...ringColor, ring.alpha * this.backgroundAlpha]);
                }
            }
        }
        
        // Particelle
        for (const p of this.particles) {
            const alpha = p.life * this.backgroundAlpha;
            renderer.drawCircle(p.x, p.y, p.size, [...p.color.slice(0, 3), alpha]);
        }
        
        // Glow centrale
        const glowSize = 120 + Math.sin(this.timer * 4) * 20;
        const glowColor = this.abilityType === 'flight'
            ? [0.4, 0.85, 1.0, this.backgroundAlpha * 0.3]
            : [1.0, 0.7, 0.2, this.backgroundAlpha * 0.3];
        
        renderer.drawCircle(centerX, centerY, glowSize, glowColor);
        renderer.drawCircle(centerX, centerY, glowSize * 0.7, [...glowColor.slice(0, 3), glowColor[3] * 1.5]);
        renderer.drawCircle(centerX, centerY, glowSize * 0.4, [...glowColor.slice(0, 3), glowColor[3] * 2]);
        
        // Icona abilità
        const iconSize = 60 * this.iconScale;
        const iconColor = this.abilityType === 'flight'
            ? [0.5, 0.9, 1.0, this.textAlpha]
            : [1.0, 0.8, 0.3, this.textAlpha];
        
        // Disegna icona semplice (cerchio con simbolo)
        renderer.drawCircle(centerX, centerY, iconSize, iconColor);
        renderer.drawCircle(centerX, centerY, iconSize * 0.9, [1.0, 1.0, 1.0, this.textAlpha * 0.8]);
        
        // Simbolo interno
        if (this.abilityType === 'flight') {
            // Simbolo ali/freccia su
            const arrowSize = iconSize * 0.5;
            for (let i = 0; i < 3; i++) {
                const y = centerY - arrowSize + i * 12;
                const width = arrowSize - Math.abs(i - 1) * 10;
                renderer.drawRect(centerX - width / 2, y, width, 8, [0.4, 0.85, 1.0, this.textAlpha]);
            }
        } else {
            // Simbolo razzo/turbo
            const rocketSize = iconSize * 0.5;
            // Corpo razzo
            renderer.drawRect(centerX - 8, centerY - rocketSize, 16, rocketSize * 1.5, [1.0, 0.7, 0.2, this.textAlpha]);
            // Fiamme
            for (let i = 0; i < 3; i++) {
                const flameY = centerY + rocketSize * 0.5 + i * 8;
                const flameSize = 20 - i * 5;
                renderer.drawCircle(centerX, flameY, flameSize, [1.0, 0.4 + i * 0.2, 0.0, this.textAlpha * (1 - i * 0.3)]);
            }
        }
    }
    
    renderText(ctx, canvasWidth, canvasHeight) {
        if (!this.isActive || this.textAlpha <= 0) return;
        
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        ctx.save();
        ctx.globalAlpha = this.textAlpha;
        
        // Titolo "NEW ABILITY UNLOCKED!"
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Ombra
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        // Gradiente testo
        const gradient = ctx.createLinearGradient(centerX - 200, 0, centerX + 200, 0);
        if (this.abilityType === 'flight') {
            gradient.addColorStop(0, '#00BFFF');
            gradient.addColorStop(0.5, '#87CEEB');
            gradient.addColorStop(1, '#00BFFF');
        } else {
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.5, '#FFA500');
            gradient.addColorStop(1, '#FFD700');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillText('🎉 NEW ABILITY UNLOCKED! 🎉', centerX, centerY - 120);
        
        // Nome abilità
        ctx.font = 'bold 64px Arial';
        const abilityName = this.abilityType === 'flight' ? '✈️ FLIGHT MODE ✈️' : '🚀 TURBO BOOST 🚀';
        
        // Effetto pulsante
        const scale = 1 + Math.sin(this.timer * 5) * 0.05;
        ctx.save();
        ctx.translate(centerX, centerY + 120);
        ctx.scale(scale, scale);
        
        ctx.fillStyle = gradient;
        ctx.fillText(abilityName, 0, 0);
        
        ctx.restore();
        
        // Descrizione
        ctx.font = '24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 5;
        
        const description = this.abilityType === 'flight' 
            ? 'Press the FLIGHT button to fly horizontally!'
            : 'Press the TURBO button for super speed!';
        
        ctx.fillText(description, centerX, centerY + 180);
        
        ctx.restore();
    }
    
    isPlaying() {
        return this.isActive;
    }
}
