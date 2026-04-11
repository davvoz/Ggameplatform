/**
 * UpgradeIcons.js — Shared canvas-art icon renderer for upgrade IDs.
 * Used by ShopState (50px cells) and PlayingState HUD (22px badges).
 */

// ── Per-upgrade drawing routines ───────────────────────────────────────────────
// Each function receives (ctx, cx, cy, S, solid) and is assessed for CC
// independently, keeping drawUpgradeIcon itself at CC 1 (the ?? fallback).
const _DRAW = {

    // ── MOBILITY ──────────────────────────────────────────────────────────────

    jump_power(ctx, cx, cy, S, solid) {
        // Upward arrow with spring coil at base
        ctx.beginPath();
        ctx.moveTo(cx,          cy - S*0.4);
        ctx.lineTo(cx + S*0.22, cy - S*0.1);
        ctx.lineTo(cx + S*0.1,  cy - S*0.1);
        ctx.lineTo(cx + S*0.1,  cy + S*0.15);
        ctx.lineTo(cx - S*0.1,  cy + S*0.15);
        ctx.lineTo(cx - S*0.1,  cy - S*0.1);
        ctx.lineTo(cx - S*0.22, cy - S*0.1);
        ctx.closePath();
        solid('#00ffcc', '#006655');
        ctx.strokeStyle = '#00aa88'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const yy = cy + S*0.18 + i * S*0.07;
            ctx.beginPath();
            ctx.moveTo(cx - S*0.12, yy);
            ctx.lineTo(cx + S*0.12, yy);
            ctx.stroke();
        }
    },

    air_control(ctx, cx, cy, S) {
        // Curved double-headed horizontal arrow
        ctx.strokeStyle = '#00eeff'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(S*0.15, cy);
        ctx.bezierCurveTo(S*0.15, cy - S*0.3, S*0.85, cy - S*0.3, S*0.85, cy);
        ctx.stroke();
        ctx.fillStyle = '#00eeff';
        for (const [ax, dir] of [[S*0.15, -1], [S*0.85, 1]]) {
            ctx.beginPath();
            ctx.moveTo(ax + dir*S*0.12, cy - S*0.06);
            ctx.lineTo(ax, cy);
            ctx.lineTo(ax + dir*S*0.12, cy + S*0.06);
            ctx.fill();
        }
        ctx.strokeStyle = 'rgba(0,220,255,0.4)'; ctx.lineWidth = 1.2;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i*S*0.2 - S*0.12, cy + S*0.2);
            ctx.lineTo(cx + i*S*0.2 + S*0.12, cy + S*0.2);
            ctx.stroke();
        }
    },

    double_jump(ctx, cx, cy, S) {
        // Two stacked arrows
        ctx.fillStyle = '#aaffaa'; ctx.strokeStyle = '#008833'; ctx.lineWidth = 1.2;
        for (const [oy, alpha] of [[S*0.1, 1], [S*0.32, 0.55]]) {
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(cx,          cy - oy - S*0.18);
            ctx.lineTo(cx + S*0.2,  cy - oy + S*0.04);
            ctx.lineTo(cx + S*0.08, cy - oy + S*0.04);
            ctx.lineTo(cx + S*0.08, cy - oy + S*0.18);
            ctx.lineTo(cx - S*0.08, cy - oy + S*0.18);
            ctx.lineTo(cx - S*0.08, cy - oy + S*0.04);
            ctx.lineTo(cx - S*0.2,  cy - oy + S*0.04);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
    },

    glide(ctx, cx, cy, S, solid) {
        // Wings spread out
        ctx.fillStyle = '#88ccff'; ctx.strokeStyle = '#2244aa'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(S*0.05, cy - S*0.15); ctx.lineTo(S*0.05, cy + S*0.15);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(S*0.95, cy - S*0.15); ctx.lineTo(S*0.95, cy + S*0.15);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, cy, S*0.1, S*0.28, 0, 0, Math.PI*2);
        solid('#4488cc', '#113388');
    },

    dash(ctx, cx, cy, S) {
        // Speed lines + arrow tip
        ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 1.5;
        for (const [yOff, wScale] of [[-S*0.15, 0.7], [0, 1], [S*0.15, 0.7]]) {
            ctx.globalAlpha = wScale;
            ctx.beginPath();
            ctx.moveTo(S*0.1,  cy + yOff);
            ctx.lineTo(S*0.55, cy + yOff);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffcc00'; ctx.strokeStyle = '#aa6600'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(S*0.88, cy);
        ctx.lineTo(S*0.62, cy - S*0.17);
        ctx.lineTo(S*0.62, cy + S*0.17);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    },

    // ── COMBAT ────────────────────────────────────────────────────────────────

    stomp_power(ctx, cx, cy, S) {
        // Boot hitting down
        ctx.fillStyle = '#cc8844'; ctx.strokeStyle = '#663300'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx - S*0.08, cy - S*0.35, S*0.18, S*0.35, 2);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - S*0.12, cy);         ctx.lineTo(cx - S*0.12, cy + S*0.22);
        ctx.lineTo(cx + S*0.22, cy + S*0.22); ctx.lineTo(cx + S*0.22, cy + S*0.1);
        ctx.lineTo(cx + S*0.06, cy + S*0.1);  ctx.lineTo(cx + S*0.06, cy);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffdd44';
        for (const [sx, sy] of [[-S*0.2, S*0.06], [S*0.28, S*0.04]]) {
            ctx.beginPath();
            ctx.arc(cx + sx, cy + sy, S*0.05, 0, Math.PI*2); ctx.fill();
        }
    },

    shockwave(ctx, cx, cy, S) {
        // Concentric rings radiating from centre
        for (const [r, alpha] of [[S*0.1, 1], [S*0.2, 0.65], [S*0.32, 0.35]]) {
            ctx.strokeStyle = `rgba(255,160,0,${alpha})`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
        }
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath(); ctx.arc(cx, cy, S*0.07, 0, Math.PI*2); ctx.fill();
    },

    spike_head(ctx, cx, cy, S) {
        // Head circle with spikes pointing up
        ctx.fillStyle = '#dddddd'; ctx.strokeStyle = '#555555'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy + S*0.1, S*0.22, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff3344'; ctx.strokeStyle = '#880011'; ctx.lineWidth = 1.2;
        for (let i = -2; i <= 2; i++) {
            const sx = cx + i * S*0.1;
            ctx.beginPath();
            ctx.moveTo(sx,          cy - S*0.38);
            ctx.lineTo(sx - S*0.06, cy - S*0.15);
            ctx.lineTo(sx + S*0.06, cy - S*0.15);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        }
    },

    thick_skin(ctx, cx, cy, S) {
        // Shield shape
        ctx.fillStyle = '#4499ff'; ctx.strokeStyle = '#112266'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx,          cy - S*0.38);
        ctx.lineTo(cx + S*0.3,  cy - S*0.15);
        ctx.lineTo(cx + S*0.3,  cy + S*0.1);
        ctx.quadraticCurveTo(cx + S*0.3, cy + S*0.4, cx, cy + S*0.4);
        ctx.quadraticCurveTo(cx - S*0.3, cy + S*0.4, cx - S*0.3, cy + S*0.1);
        ctx.lineTo(cx - S*0.3,  cy - S*0.15);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy - S*0.2); ctx.lineTo(cx, cy + S*0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - S*0.15, cy); ctx.lineTo(cx + S*0.15, cy); ctx.stroke();
    },

    extra_life(ctx, cx, cy, S, solid) {
        // Heart shape
        ctx.beginPath();
        ctx.moveTo(cx, cy + S*0.28);
        ctx.bezierCurveTo(cx - S*0.38, cy + S*0.05, cx - S*0.38, cy - S*0.28, cx, cy - S*0.1);
        ctx.bezierCurveTo(cx + S*0.38, cy - S*0.28, cx + S*0.38, cy + S*0.05, cx, cy + S*0.28);
        ctx.closePath();
        solid('#ff2244', '#880022');
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx - S*0.09, cy - S*0.06, S*0.07, S*0.11, -0.5, 0, Math.PI*2); ctx.fill();
    },

    // ── COLLECTION ────────────────────────────────────────────────────────────

    coin_magnet_range(ctx, cx, cy, S) {
        // U-shaped magnet in red/blue
        ctx.lineWidth = S*0.14; ctx.lineCap = 'round';
        ctx.strokeStyle = '#2266ff';
        ctx.beginPath();
        ctx.moveTo(cx - S*0.2, cy + S*0.32);
        ctx.lineTo(cx - S*0.2, cy - S*0.1);
        ctx.arc(cx, cy - S*0.1, S*0.2, Math.PI, 0, true);
        ctx.stroke();
        ctx.strokeStyle = '#ff2222';
        ctx.beginPath();
        ctx.moveTo(cx + S*0.2, cy - S*0.1);
        ctx.lineTo(cx + S*0.2, cy + S*0.32);
        ctx.stroke();
        ctx.lineWidth = 1; ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(S*0.22)}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('S', cx - S*0.2, cy + S*0.32);
        ctx.fillText('N', cx + S*0.2, cy + S*0.32);
    },

    coin_value(ctx, cx, cy, S) {
        // Coin with ×2 inside
        ctx.beginPath(); ctx.arc(cx, cy, S*0.32, 0, Math.PI*2);
        ctx.fillStyle = '#ffcc00'; ctx.strokeStyle = '#886600'; ctx.lineWidth = 2;
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, S*0.24, 0, Math.PI*2);
        ctx.strokeStyle = '#ffee88'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#553300';
        ctx.font = `bold ${Math.round(S*0.22)}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('×2', cx, cy);
    },

    powerup_duration(ctx, cx, cy, S) {
        // Hourglass
        ctx.fillStyle = '#99ddff'; ctx.strokeStyle = '#224466'; ctx.lineWidth = 1.5;
        const hw = S*0.22, hh = S*0.38;
        ctx.beginPath();
        ctx.moveTo(cx - hw, cy - hh); ctx.lineTo(cx + hw, cy - hh);
        ctx.lineTo(cx, cy); ctx.lineTo(cx + hw, cy + hh);
        ctx.lineTo(cx - hw, cy + hh); ctx.lineTo(cx, cy);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,200,50,0.7)';
        ctx.beginPath();
        ctx.moveTo(cx - hw*0.5, cy + hh);
        ctx.lineTo(cx + hw*0.5, cy + hh);
        ctx.lineTo(cx, cy + S*0.1);
        ctx.closePath(); ctx.fill();
    },

    lucky_spawn(ctx, cx, cy, S) {
        // Four-leaf clover
        ctx.fillStyle = '#44dd66'; ctx.strokeStyle = '#116622'; ctx.lineWidth = 1.2;
        for (const [ox, oy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
            ctx.beginPath();
            ctx.arc(cx + ox*S*0.14, cy + oy*S*0.14, S*0.17, 0, Math.PI*2);
            ctx.fill(); ctx.stroke();
        }
        ctx.strokeStyle = '#116622'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy + S*0.14);
        ctx.quadraticCurveTo(cx + S*0.12, cy + S*0.35, cx, cy + S*0.42);
        ctx.stroke();
    },

    // ── SCORE ─────────────────────────────────────────────────────────────────

    score_multiplier(ctx, cx, cy, S, solid) {
        // Star
        ctx.fillStyle = '#ffee00'; ctx.strokeStyle = '#886600'; ctx.lineWidth = 1.5;
        const r1 = S*0.38, r2 = S*0.16, pts = 5;
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
            const r = i % 2 === 0 ? r1 : r2;
            const a = (i * Math.PI / pts) - Math.PI/2;
            if (i === 0) ctx.moveTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
            else         ctx.lineTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
    },

    combo_keeper(ctx, cx, cy, S) {
        // Chain links
        ctx.strokeStyle = '#aaccff'; ctx.lineWidth = S*0.1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx - S*0.15, cy, S*0.16, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + S*0.15, cy, S*0.16, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = S*0.06;
        ctx.beginPath();
        ctx.moveTo(cx - S*0.15 + S*0.16, cy);
        ctx.lineTo(cx + S*0.15 - S*0.16, cy);
        ctx.stroke();
    },

    default(ctx, cx, cy, S, solid) {
        // Generic star fallback
        ctx.fillStyle = '#aaaaff'; ctx.strokeStyle = '#4444aa'; ctx.lineWidth = 1.5;
        const r1 = S*0.34, r2 = S*0.15, pts = 5;
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
            const r = i % 2 === 0 ? r1 : r2;
            const a = (i * Math.PI / pts) - Math.PI/2;
            if (i === 0) ctx.moveTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
            else         ctx.lineTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
    },
};

/**
 * Draw a pixel-art icon for the given upgrade id, centred in the S×S box
 * starting at (bx, by).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} id  - upgrade id from UPGRADE_CATALOG
 * @param {number} bx  - top-left x of the bounding box
 * @param {number} by  - top-left y of the bounding box
 * @param {number} S   - bounding box size in pixels (square)
 */
export function drawUpgradeIcon(ctx, id, bx, by, S) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const cx = S / 2, cy = S / 2;
    const solid = (fill, stroke, lw = 1.5) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.fill();
        ctx.stroke();
    };
    (_DRAW[id] ?? _DRAW.default)(ctx, cx, cy, S, solid);
    ctx.restore();
}
