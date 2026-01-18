/**
 * Star - Stella per lo sfondo parallax
 */
class Star {
    constructor(canvasWidth, canvasHeight, layer = 1) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.layer = layer;
        
        this.speed = 20 + layer * 40;
        this.size = 0.5 + layer * 0.7;
        
        this.brightness = 0.3 + Math.random() * 0.7;
        this.twinkleSpeed = 1 + Math.random() * 3;
        this.twinkleOffset = Math.random() * Math.PI * 2;
        
        // Star color variation
        const colorTypes = ['white', 'blue', 'yellow', 'red'];
        this.colorType = colorTypes[Math.floor(Math.random() * colorTypes.length)];
        
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    update(deltaTime) {
        this.y += this.speed * deltaTime;
        
        if (this.y > this.canvasHeight) {
            this.y = -5;
            this.x = Math.random() * this.canvasWidth;
        }
    }

    render(ctx, time) {
        const twinkle = Math.sin(time * this.twinkleSpeed + this.twinkleOffset) * 0.3 + 0.7;
        const alpha = this.brightness * twinkle;
        
        const colors = {
            white: { r: 255, g: 255, b: 255 },
            blue: { r: 150, g: 200, b: 255 },
            yellow: { r: 255, g: 240, b: 180 },
            red: { r: 255, g: 180, b: 150 }
        };
        
        const color = colors[this.colorType];
        
        // Star core semplificato (no glow per performance)
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Nebula - Floating space cloud
 */
class Nebula {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.reset(true);
    }
    
    reset(initial = false) {
        this.x = Math.random() * this.canvasWidth;
        this.y = initial ? Math.random() * this.canvasHeight : -200;
        this.size = 150 + Math.random() * 200;
        this.speed = 10 + Math.random() * 15;
        this.alpha = 0.05 + Math.random() * 0.1;
        
        const nebulaColors = [
            { r: 100, g: 50, b: 150 },   // Purple
            { r: 50, g: 100, b: 150 },   // Blue
            { r: 150, g: 50, b: 100 },   // Magenta
            { r: 50, g: 150, b: 130 },   // Teal
            { r: 80, g: 60, b: 140 }     // Deep purple
        ];
        this.color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }
    
    update(deltaTime) {
        this.y += this.speed * deltaTime;
        this.rotation += this.rotationSpeed * deltaTime;
        
        if (this.y > this.canvasHeight + this.size) {
            this.reset();
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Multi-layer nebula effect
        for (let i = 3; i >= 1; i--) {
            const layerSize = this.size * (1 + i * 0.3);
            const layerAlpha = this.alpha / i;
            
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, layerSize);
            gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${layerAlpha})`);
            gradient.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${layerAlpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(0, 0, layerSize, layerSize * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

/**
 * ShootingStar - Occasional shooting star effect
 */
class ShootingStar {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.active = false;
        this.timer = 5 + Math.random() * 10;
    }
    
    spawn() {
        this.x = Math.random() * this.canvasWidth;
        this.y = -10;
        this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5;
        this.speed = 600 + Math.random() * 400;
        this.length = 40 + Math.random() * 60;
        this.alpha = 1;
        this.active = true;
    }
    
    update(deltaTime) {
        if (!this.active) {
            this.timer -= deltaTime;
            if (this.timer <= 0) {
                this.spawn();
                this.timer = 8 + Math.random() * 15;
            }
            return;
        }
        
        this.x += Math.cos(this.angle) * this.speed * deltaTime;
        this.y += Math.sin(this.angle) * this.speed * deltaTime;
        this.alpha -= deltaTime * 0.8;
        
        if (this.alpha <= 0 || this.y > this.canvasHeight || this.x > this.canvasWidth) {
            this.active = false;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        const endX = this.x - Math.cos(this.angle) * this.length;
        const endY = this.y - Math.sin(this.angle) * this.length;
        
        // Glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        const gradient = ctx.createLinearGradient(this.x, this.y, endX, endY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.alpha})`);
        gradient.addColorStop(0.2, `rgba(200, 220, 255, ${this.alpha * 0.8})`);
        gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Bright core
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - Math.cos(this.angle) * this.length * 0.3, 
                   this.y - Math.sin(this.angle) * this.length * 0.3);
        ctx.stroke();
        
        ctx.restore();
    }
}

/**
 * StarField - Gestisce il campo stellare di background avanzato
 */
class StarField {
    constructor(canvasWidth, canvasHeight) {
        this.stars = [];
        this.nebulae = [];
        this.shootingStars = [];
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        this.init();
    }

    init() {
        // Create stars on different layers (minimo per performance)
        const starCounts = { 1: 15, 2: 10, 3: 5 };
        
        for (const [layer, count] of Object.entries(starCounts)) {
            for (let i = 0; i < count; i++) {
                this.stars.push(new Star(this.canvasWidth, this.canvasHeight, parseInt(layer)));
            }
        }
        
        // Nebulae e shooting stars disabilitate per performance
    }

    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        this.stars.forEach(star => {
            star.canvasWidth = canvasWidth;
            star.canvasHeight = canvasHeight;
            if (star.x > canvasWidth) star.x = Math.random() * canvasWidth;
            if (star.y > canvasHeight) star.y = Math.random() * canvasHeight;
        });
        
        this.nebulae.forEach(nebula => {
            nebula.canvasWidth = canvasWidth;
            nebula.canvasHeight = canvasHeight;
        });
        
        this.shootingStars.forEach(ss => {
            ss.canvasWidth = canvasWidth;
            ss.canvasHeight = canvasHeight;
        });
    }

    update(deltaTime) {
        this.stars.forEach(star => star.update(deltaTime));
    }

    render(ctx, time) {
        // Render stars only (performance ottimizzata)
        this.stars.forEach(star => star.render(ctx, time));
    }
    
    /**
     * Imposta la qualità del campo stellare
     * @param {string} quality - 'high', 'medium', 'low'
     */
    setQuality(quality) {
        // Rimuovi tutte le stelle esistenti
        this.stars = [];
        
        let starCounts;
        switch (quality) {
            case 'high':
                // Molte stelle, multi-layer, con glow
                starCounts = { 1: 40, 2: 30, 3: 20 };
                break;
            case 'medium':
                // Stelle moderate
                starCounts = { 1: 20, 2: 15, 3: 8 };
                break;
            case 'low':
                // Minimo di stelle
                starCounts = { 1: 8, 2: 5, 3: 2 };
                break;
            default:
                starCounts = { 1: 15, 2: 10, 3: 5 };
        }
        
        for (const [layer, count] of Object.entries(starCounts)) {
            for (let i = 0; i < count; i++) {
                this.stars.push(new Star(this.canvasWidth, this.canvasHeight, parseInt(layer)));
            }
        }
        
        console.log(`🌟 StarField quality: ${quality} (${this.stars.length} stars)`);
    }
}
