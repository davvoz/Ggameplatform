import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM, ARENA_MID_Y
} from '../config/Constants.js';

/**
 * Renders themed arena backgrounds for Story Mode.
 * Each theme overrides the default arena colors, grid style, and goal glow.
 */
export class BackgroundRenderer {

    /**
     * Draw the full arena background for a given theme.
     * Drop-in replacement for HUD.drawArena() when a theme is active.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} theme - from StoryModeConfig THEMES
     */
    static drawThemedArena(ctx, theme) {
        const aW = ARENA_RIGHT - ARENA_LEFT;
        const aH = ARENA_BOTTOM - ARENA_TOP;
        const cx = (ARENA_LEFT + ARENA_RIGHT) / 2;
        const cy = ARENA_MID_Y;

        // Full-screen background
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        // Arena floor
        ctx.fillStyle = theme.floor;
        ctx.fillRect(ARENA_LEFT, ARENA_TOP, aW, aH);

        // Field markings
        ctx.strokeStyle = theme.line;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);

        // Center line
        ctx.beginPath();
        ctx.moveTo(ARENA_LEFT, cy);
        ctx.lineTo(ARENA_RIGHT, cy);
        ctx.stroke();

        // Center circle
        const circleR = 55;
        ctx.beginPath();
        ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = theme.line;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Goal areas (penalty boxes)
        const boxW = 160;
        const boxH = 70;
        const boxX = cx - boxW / 2;
        ctx.strokeRect(boxX, ARENA_TOP, boxW, boxH);
        ctx.strokeRect(boxX, ARENA_BOTTOM - boxH, boxW, boxH);

        // Small goal areas (6-yard box)
        const sBoxW = 80;
        const sBoxH = 30;
        const sBoxX = cx - sBoxW / 2;
        ctx.strokeRect(sBoxX, ARENA_TOP, sBoxW, sBoxH);
        ctx.strokeRect(sBoxX, ARENA_BOTTOM - sBoxH, sBoxW, sBoxH);

        // Penalty dots
        ctx.fillStyle = theme.line;
        ctx.beginPath();
        ctx.arc(cx, ARENA_TOP + boxH - 15, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, ARENA_BOTTOM - boxH + 15, 3, 0, Math.PI * 2);
        ctx.fill();

        // Penalty arcs
        const penArcR = 30;
        ctx.beginPath();
        ctx.arc(cx, ARENA_TOP + boxH - 15, penArcR, 0.3 * Math.PI, 0.7 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, ARENA_BOTTOM - boxH + 15, penArcR, 1.3 * Math.PI, 1.7 * Math.PI);
        ctx.stroke();

        // Corner arcs
        const cornerR = 18;
        ctx.beginPath();
        ctx.arc(ARENA_LEFT, ARENA_TOP, cornerR, 0, Math.PI * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ARENA_RIGHT, ARENA_TOP, cornerR, Math.PI * 0.5, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ARENA_RIGHT, ARENA_BOTTOM, cornerR, Math.PI, Math.PI * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ARENA_LEFT, ARENA_BOTTOM, cornerR, Math.PI * 1.5, Math.PI * 2);
        ctx.stroke();

        // Arena border
        ctx.strokeStyle = theme.accent;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 2;
        ctx.strokeRect(ARENA_LEFT, ARENA_TOP, aW, aH);
        ctx.globalAlpha = 1;

        // Goal zone glows
        const topGlow = ctx.createLinearGradient(0, ARENA_TOP, 0, ARENA_TOP + 15);
        topGlow.addColorStop(0, theme.glow);
        topGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGlow;
        ctx.fillRect(ARENA_LEFT, ARENA_TOP, aW, 15);

        const botGlow = ctx.createLinearGradient(0, ARENA_BOTTOM - 15, 0, ARENA_BOTTOM);
        botGlow.addColorStop(0, 'rgba(0,0,0,0)');
        botGlow.addColorStop(1, theme.glow);
        ctx.fillStyle = botGlow;
        ctx.fillRect(ARENA_LEFT, ARENA_BOTTOM - 15, aW, 15);

        // Accent particles
        BackgroundRenderer.#drawThemeParticles(ctx, theme);
    }

    /**
     * Subtle floating accent particles — deterministic shimmer.
     */
    static #drawThemeParticles(ctx, theme) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = theme.accent;

        // Use theme id hash to create deterministic positions
        const seed = BackgroundRenderer.#hashTheme(theme.id);
        for (let i = 0; i < 12; i++) {
            const px = ARENA_LEFT + ((seed * (i + 1) * 137) % (ARENA_RIGHT - ARENA_LEFT));
            const py = ARENA_TOP + ((seed * (i + 1) * 251) % (ARENA_BOTTOM - ARENA_TOP));
            const size = 1 + (i % 3);
            ctx.fillRect(Math.floor(px), Math.floor(py), size, size);
        }

        ctx.restore();
    }

    static #hashTheme(id) {
        let h = 0;
        for (let i = 0; i < id.length; i++) {
            h = Math.trunc((h * 31 + id.codePointAt(i)) % 1e9);
        }
        return Math.abs(h);
    }
}
