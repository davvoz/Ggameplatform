import {
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM, ARENA_MID_Y,
    POWERUP_SIZE
} from '../config/Constants.js';

/**
 * Power-up entity — spawns on the field, collected on contact.
 */
export class PowerUp {
    #type;
    #x;
    #y;
    #alive = true;
    #pulsePhase = 0;

    constructor(type, x, y) {
        this.#type = type;
        this.#x = x;
        this.#y = y;
    }

    get type() { return this.#type; }
    get x() { return this.#x; }
    get y() { return this.#y; }
    get alive() { return this.#alive; }
    get radius() { return POWERUP_SIZE / 2; }

    collect() { this.#alive = false; }

    update(dt) {
        this.#pulsePhase += dt / 500;
    }

    draw(ctx) {
        if (!this.#alive) return;

        const pulse = 1 + Math.sin(this.#pulsePhase * Math.PI) * 0.15;
        const size = POWERUP_SIZE * pulse;
        const half = size / 2;

        ctx.save();
        ctx.translate(this.#x, this.#y);

        // Glow
        ctx.shadowColor = this.#type.color;
        ctx.shadowBlur = 10;

        // Diamond shape
        ctx.fillStyle = this.#type.color;
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(half, 0);
        ctx.lineTo(0, half);
        ctx.lineTo(-half, 0);
        ctx.closePath();
        ctx.fill();

        // Inner icon (pixel art)
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        this.#drawIcon(ctx, this.#type.icon);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(half, 0);
        ctx.lineTo(0, half);
        ctx.lineTo(-half, 0);
        ctx.closePath();
        ctx.stroke();

        // ---- Floating label ----
        this.#drawLabel(ctx, half);

        ctx.restore();
    }

    #drawLabel(ctx, half) {
        const name = this.#type.name;
        const color = this.#type.color;
        const floatY = -half - 10 + Math.sin(this.#pulsePhase * Math.PI * 0.8) * 2;

        ctx.font = 'bold 7px "Rajdhani", "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const metrics = ctx.measureText(name);
        const tw = metrics.width;
        const padX = 5;
        const pillW = tw + padX * 2;
        const pillH = 12;
        const r = pillH / 2;
        

        // Pill background
        const px = -pillW / 2;
        const py = floatY - pillH / 2;
        ctx.beginPath();
        ctx.moveTo(px + r, py);
        ctx.lineTo(px + pillW - r, py);
        ctx.arcTo(px + pillW, py, px + pillW, py + r, r);
        ctx.lineTo(px + pillW, py + pillH - r);
        ctx.arcTo(px + pillW, py + pillH, px + pillW - r, py + pillH, r);
        ctx.lineTo(px + r, py + pillH);
        ctx.arcTo(px, py + pillH, px, py + pillH - r, r);
        ctx.lineTo(px, py + r);
        ctx.arcTo(px, py, px + r, py, r);
        ctx.closePath();

        ctx.fillStyle = 'rgba(8,8,24,0.82)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label text
        ctx.fillStyle = color;
        ctx.fillText(name, 0, floatY + 0.5);
    }

    #drawIcon(ctx, icon) {
        const s = 2;
        switch (icon) {
            case 'fire':
                // Flame shape
                ctx.fillRect(-s, -s * 2, s * 2, s * 3);
                ctx.fillRect(-s * 2, -s, s, s * 2);
                ctx.fillRect(0, -s * 3, s, s);
                break;
            case 'shield':
                // Shield shape (U bracket)
                ctx.fillRect(-s * 2, -s * 2, s * 4, s);
                ctx.fillRect(-s * 2, -s * 2, s, s * 4);
                ctx.fillRect(s, -s * 2, s, s * 4);
                ctx.fillRect(-s, s, s * 2, s);
                break;
            case 'multi':
                // Three dots
                ctx.fillRect(-s * 2, -s, s * 2, s * 2);
                ctx.fillRect(0, -s * 2, s * 2, s * 2);
                ctx.fillRect(s, s, s * 2, s * 2);
                break;
            case 'grow':
                // Up arrow
                ctx.fillRect(-s, -s * 2, s * 2, s);
                ctx.fillRect(-s * 2, -s, s * 4, s * 2);
                ctx.fillRect(-s, s, s * 2, s);
                break;
            case 'freeze':
                // Snowflake / cross
                ctx.fillRect(-s, -s * 2, s * 2, s * 4);
                ctx.fillRect(-s * 2, -s, s * 4, s * 2);
                ctx.fillRect(-s * 2, -s * 2, s, s);
                ctx.fillRect(s, s, s, s);
                break;
            case 'magnet':
                // U-magnet shape
                ctx.fillRect(-s * 2, -s * 2, s, s * 4);
                ctx.fillRect(s, -s * 2, s, s * 4);
                ctx.fillRect(-s * 2, s, s * 4, s);
                break;
            case 'speed':
                // Lightning bolt
                ctx.fillRect(0, -s * 2, s, s * 4);
                ctx.fillRect(-s, -s, s, s * 2);
                ctx.fillRect(s, -s, s, s * 2);
                break;
            default:
                ctx.fillRect(-s, -s, s * 2, s * 2);
                break;
        }
    }

    toNetState() {
        return {
            typeId: this.#type.id,
            x: this.#x,
            y: this.#y,
            alive: this.#alive,
        };
    }
}

/**
 * Creates a random power-up at a random field position.
 */
export function spawnRandomPowerUp(types) {
    const type = types[Math.floor(Math.random() * types.length)];
    const margin = POWERUP_SIZE * 2;
    const x = ARENA_LEFT + margin + Math.random() * (ARENA_RIGHT - ARENA_LEFT - margin * 2);

    // Spawn near the center line (contested zone)
    const zoneHeight = (ARENA_BOTTOM - ARENA_TOP) * 0.3;
    const y = ARENA_MID_Y + (Math.random() - 0.5) * zoneHeight;

    return new PowerUp(type, x, y);
}
