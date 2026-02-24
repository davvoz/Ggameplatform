
// ===== STAR =====
class Star {
    constructor(canvasWidth, canvasHeight, layer = 0, theme = null) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.layer = layer;
        this.size = 0.5 + layer * 0.8 + Math.random() * 0.5;
        this.speed = 15 + layer * 25 + Math.random() * 10;
        this.brightness = 0.3 + layer * 0.25 + Math.random() * 0.2;
        this.twinkleSpeed = 1 + Math.random() * 3;
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.color = (theme && theme.stars) ? theme.stars[layer] : ['#8899bb', '#aabbdd', '#ddeeff'][layer];
    }

    update(dt, canvasWidth, canvasHeight) {
        this.y += this.speed * dt;
        this.twinklePhase += this.twinkleSpeed * dt;
        if (this.y > canvasHeight + 5) {
            this.y = -5;
            this.x = Math.random() * canvasWidth;
        }
    }

    render(ctx) {
        const twinkle = 0.7 + 0.3 * Math.sin(this.twinklePhase);
        const alpha = this.brightness * twinkle;
        ctx.save();
        ctx.globalAlpha = alpha;

        if (this.layer === 2) {
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
            gradient.addColorStop(0, this.color + 'cc');
            gradient.addColorStop(0.5, this.color + '33');
            gradient.addColorStop(1, this.color + '00');
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x - this.size * 3, this.y - this.size * 3, this.size * 6, this.size * 6);
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export { Star };