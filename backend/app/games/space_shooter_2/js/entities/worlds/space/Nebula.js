// ===== NEBULA =====
export class Nebula {
    constructor(canvasWidth, canvasHeight, theme = null) {
        this.x = window.randomSecure() * canvasWidth;
        this.y = -200 - window.randomSecure() * 300;
        this.radius = 80 + window.randomSecure() * 150;
        this.speed = 5 + window.randomSecure() * 8;
        const colors = (theme && theme.nebula) ? theme.nebula : Nebula.DEFAULT_COLORS;
        this.color = colors[Math.floor(window.randomSecure() * colors.length)];
        this.alpha = 0.03 + window.randomSecure() * 0.04;
    }

    update(dt, canvasWidth, canvasHeight) {
        this.y += this.speed * dt;
        if (this.y > canvasHeight + this.radius) {
            this.y = -this.radius * 2;
            this.x = window.randomSecure() * canvasWidth;
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
