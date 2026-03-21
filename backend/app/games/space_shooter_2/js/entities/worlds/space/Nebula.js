// ===== NEBULA =====
export class Nebula {
    constructor(canvasWidth, canvasHeight, theme = null) {
        this.x = Math.random() * canvasWidth;
        this.y = -200 - Math.random() * 300;
        this.radius = 80 + Math.random() * 150;
        this.speed = 5 + Math.random() * 8;
        const colors = (theme && theme.nebula) ? theme.nebula : Nebula.DEFAULT_COLORS;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = 0.03 + Math.random() * 0.04;
    }

    update(dt, canvasWidth, canvasHeight) {
        this.y += this.speed * dt;
        if (this.y > canvasHeight + this.radius) {
            this.y = -this.radius * 2;
            this.x = Math.random() * canvasWidth;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        ctx.restore();
    }
}
