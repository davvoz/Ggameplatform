/**
 * Cycling indicator light. Pure visual state holder; a Light has a phase
 * advanced by time and is driven by a mission/section to indicate progress.
 */
export class Light {
    constructor(x, y, color = '#f5c518', radius = 5) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = radius;
        this.on = false;
        this.phase = 0;          // 0..1, used for cycling animation
        this.cycleSpeed = 0;     // 0 = static; >0 = blinks
    }

    update(dt) {
        if (this.cycleSpeed > 0) this.phase = (this.phase + dt * this.cycleSpeed) % 1;
    }

    intensity() {
        if (!this.on) return 0.15;
        if (this.cycleSpeed <= 0) return 1;
        return 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.phase * Math.PI * 2));
    }
}
