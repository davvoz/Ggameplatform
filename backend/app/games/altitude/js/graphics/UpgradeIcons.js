/**
 * UpgradeIcons.js — Shared canvas-art icon renderer for upgrade IDs.
 * Used by ShopState (50px cells) and PlayingState HUD (22px badges).
 */

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

    switch (id) {

        // ── MOBILITY ──────────────────────────────────────────────────

        case 'jump_power': {
            // Upward arrow with spring coil at base
            ctx.beginPath();
            ctx.moveTo(cx, cy - S*0.4);
            ctx.lineTo(cx + S*0.22, cy - S*0.1);
            ctx.lineTo(cx + S*0.1, cy - S*0.1);
            ctx.lineTo(cx + S*0.1, cy + S*0.15);
            ctx.lineTo(cx - S*0.1, cy + S*0.15);
            ctx.lineTo(cx - S*0.1, cy - S*0.1);
            ctx.lineTo(cx - S*0.22, cy - S*0.1);
            ctx.closePath();
            solid('#00ffcc', '#006655');
            // spring coil
            ctx.strokeStyle = '#00aa88'; ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                const yy = cy + S*0.18 + i * S*0.07;
                ctx.beginPath();
                ctx.moveTo(cx - S*0.12, yy);
                ctx.lineTo(cx + S*0.12, yy);
                ctx.stroke();
            }
            break;
        }

        case 'air_control': {
            // Curved double-headed horizontal arrow
            ctx.strokeStyle = '#00eeff'; ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(S*0.15, cy);
            ctx.bezierCurveTo(S*0.15, cy - S*0.3, S*0.85, cy - S*0.3, S*0.85, cy);
            ctx.stroke();
            // Arrow heads
            ctx.fillStyle = '#00eeff';
            for (const [ax, dir] of [[S*0.15, -1], [S*0.85, 1]]) {
                ctx.beginPath();
                ctx.moveTo(ax + dir*S*0.12, cy - S*0.06);
                ctx.lineTo(ax, cy);
                ctx.lineTo(ax + dir*S*0.12, cy + S*0.06);
                ctx.fill();
            }
            // Wind lines below
            ctx.strokeStyle = 'rgba(0,220,255,0.4)'; ctx.lineWidth = 1.2;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(cx + i*S*0.2 - S*0.12, cy + S*0.2);
                ctx.lineTo(cx + i*S*0.2 + S*0.12, cy + S*0.2);
                ctx.stroke();
            }
            break;
        }

        case 'double_jump': {
            // Two stacked arrows
            ctx.fillStyle = '#aaffaa'; ctx.strokeStyle = '#008833'; ctx.lineWidth = 1.2;
            for (const [oy, alpha] of [[S*0.1, 1.0], [S*0.32, 0.55]]) {
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.moveTo(cx, cy - oy - S*0.18);
                ctx.lineTo(cx + S*0.2, cy - oy + S*0.04);
                ctx.lineTo(cx + S*0.08, cy - oy + S*0.04);
                ctx.lineTo(cx + S*0.08, cy - oy + S*0.18);
                ctx.lineTo(cx - S*0.08, cy - oy + S*0.18);
                ctx.lineTo(cx - S*0.08, cy - oy + S*0.04);
                ctx.lineTo(cx - S*0.2,  cy - oy + S*0.04);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            break;
        }

        case 'glide': {
            // Wings spread out
            ctx.fillStyle = '#88ccff'; ctx.strokeStyle = '#2244aa'; ctx.lineWidth = 1.5;
            // Left wing
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(S*0.05, cy - S*0.15);
            ctx.lineTo(S*0.05, cy + S*0.15);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Right wing
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(S*0.95, cy - S*0.15);
            ctx.lineTo(S*0.95, cy + S*0.15);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Body
            ctx.beginPath();
            ctx.ellipse(cx, cy, S*0.1, S*0.28, 0, 0, Math.PI*2);
            ctx.fillStyle = '#4488cc'; ctx.strokeStyle = '#113388'; ctx.lineWidth = 1.5;
            ctx.fill(); ctx.stroke();
            break;
        }

        case 'dash': {
            // Speed lines + arrow tip
            ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 1.5;
            for (const [yOff, wScale] of [[-S*0.15, 0.7], [0, 1.0], [S*0.15, 0.7]]) {
                ctx.globalAlpha = wScale;
                ctx.beginPath();
                ctx.moveTo(S*0.1, cy + yOff);
                ctx.lineTo(S*0.55, cy + yOff);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            // Arrow tip pointing right
            ctx.fillStyle = '#ffcc00'; ctx.strokeStyle = '#aa6600'; ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(S*0.88, cy);
            ctx.lineTo(S*0.62, cy - S*0.17);
            ctx.lineTo(S*0.62, cy + S*0.17);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            break;
        }

        // ── COMBAT ────────────────────────────────────────────────────

        case 'stomp_power': {
            // Boot hitting down
            ctx.fillStyle = '#cc8844'; ctx.strokeStyle = '#663300'; ctx.lineWidth = 1.5;
            // Leg shaft
            ctx.beginPath();
            ctx.roundRect(cx - S*0.08, cy - S*0.35, S*0.18, S*0.35, 2);
            ctx.fill(); ctx.stroke();
            // Boot
            ctx.beginPath();
            ctx.moveTo(cx - S*0.12, cy);
            ctx.lineTo(cx - S*0.12, cy + S*0.22);
            ctx.lineTo(cx + S*0.22, cy + S*0.22);
            ctx.lineTo(cx + S*0.22, cy + S*0.1);
            ctx.lineTo(cx + S*0.06, cy + S*0.1);
            ctx.lineTo(cx + S*0.06, cy);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Impact stars
            ctx.fillStyle = '#ffdd44';
            for (const [sx, sy] of [[-S*0.2, S*0.06], [S*0.28, S*0.04]]) {
                ctx.beginPath();
                ctx.arc(cx + sx, cy + sy, S*0.05, 0, Math.PI*2); ctx.fill();
            }
            break;
        }

        case 'shockwave': {
            // Concentric rings radiating from centre
            for (const [r, alpha] of [[S*0.1, 1], [S*0.2, 0.65], [S*0.32, 0.35]]) {
                ctx.strokeStyle = `rgba(255,160,0,${alpha})`; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
            }
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath(); ctx.arc(cx, cy, S*0.07, 0, Math.PI*2); ctx.fill();
            break;
        }

        case 'spike_head': {
            // Head circle with spikes pointing up
            ctx.fillStyle = '#dddddd'; ctx.strokeStyle = '#555555'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(cx, cy + S*0.1, S*0.22, 0, Math.PI*2);
            ctx.fill(); ctx.stroke();
            // Spikes
            ctx.fillStyle = '#ff3344'; ctx.strokeStyle = '#880011'; ctx.lineWidth = 1.2;
            for (let i = -2; i <= 2; i++) {
                const sx = cx + i * S*0.1;
                ctx.beginPath();
                ctx.moveTo(sx, cy - S*0.38);
                ctx.lineTo(sx - S*0.06, cy - S*0.15);
                ctx.lineTo(sx + S*0.06, cy - S*0.15);
                ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            break;
        }

        case 'thick_skin': {
            // Shield shape
            ctx.fillStyle = '#4499ff'; ctx.strokeStyle = '#112266'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - S*0.38);
            ctx.lineTo(cx + S*0.3, cy - S*0.15);
            ctx.lineTo(cx + S*0.3, cy + S*0.1);
            ctx.quadraticCurveTo(cx + S*0.3, cy + S*0.4, cx, cy + S*0.4);
            ctx.quadraticCurveTo(cx - S*0.3, cy + S*0.4, cx - S*0.3, cy + S*0.1);
            ctx.lineTo(cx - S*0.3, cy - S*0.15);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Cross
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, cy - S*0.2); ctx.lineTo(cx, cy + S*0.2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - S*0.15, cy); ctx.lineTo(cx + S*0.15, cy); ctx.stroke();
            break;
        }

        case 'extra_life': {
            // Heart shape
            ctx.fillStyle = '#ff2244'; ctx.strokeStyle = '#880022'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy + S*0.28);
            ctx.bezierCurveTo(cx - S*0.38, cy + S*0.05, cx - S*0.38, cy - S*0.28, cx, cy - S*0.1);
            ctx.bezierCurveTo(cx + S*0.38, cy - S*0.28, cx + S*0.38, cy + S*0.05, cx, cy + S*0.28);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath();
            ctx.ellipse(cx - S*0.09, cy - S*0.06, S*0.07, S*0.11, -0.5, 0, Math.PI*2); ctx.fill();
            break;
        }

        // ── COLLECTION ────────────────────────────────────────────────

        case 'coin_magnet_range': {
            // U-shaped magnet in red/blue
            ctx.lineWidth = S*0.14; ctx.lineCap = 'round';
            // Left pole (blue)
            ctx.strokeStyle = '#2266ff';
            ctx.beginPath();
            ctx.moveTo(cx - S*0.2, cy + S*0.32);
            ctx.lineTo(cx - S*0.2, cy - S*0.1);
            ctx.arc(cx, cy - S*0.1, S*0.2, Math.PI, 0, true);
            ctx.stroke();
            // Right pole (red) — just the right half
            ctx.strokeStyle = '#ff2222';
            ctx.beginPath();
            ctx.moveTo(cx + S*0.2, cy - S*0.1);
            ctx.lineTo(cx + S*0.2, cy + S*0.32);
            ctx.stroke();
            // Pole caps
            ctx.lineWidth = 1; ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(S*0.22)}px monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('S', cx - S*0.2, cy + S*0.32);
            ctx.fillText('N', cx + S*0.2, cy + S*0.32);
            break;
        }

        case 'coin_value': {
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
            break;
        }

        case 'powerup_duration': {
            // Hourglass
            ctx.fillStyle = '#99ddff'; ctx.strokeStyle = '#224466'; ctx.lineWidth = 1.5;
            const hw = S*0.22, hh = S*0.38;
            ctx.beginPath();
            ctx.moveTo(cx - hw, cy - hh); ctx.lineTo(cx + hw, cy - hh);
            ctx.lineTo(cx, cy); ctx.lineTo(cx + hw, cy + hh);
            ctx.lineTo(cx - hw, cy + hh); ctx.lineTo(cx, cy);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Sand fill bottom
            ctx.fillStyle = 'rgba(255,200,50,0.7)';
            ctx.beginPath();
            ctx.moveTo(cx - hw*0.5, cy + hh);
            ctx.lineTo(cx + hw*0.5, cy + hh);
            ctx.lineTo(cx, cy + S*0.1);
            ctx.closePath(); ctx.fill();
            break;
        }

        case 'lucky_spawn': {
            // Four-leaf clover
            ctx.fillStyle = '#44dd66'; ctx.strokeStyle = '#116622'; ctx.lineWidth = 1.2;
            for (const [ox, oy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
                ctx.beginPath();
                ctx.arc(cx + ox*S*0.14, cy + oy*S*0.14, S*0.17, 0, Math.PI*2);
                ctx.fill(); ctx.stroke();
            }
            // Stem
            ctx.strokeStyle = '#116622'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy + S*0.14);
            ctx.quadraticCurveTo(cx + S*0.12, cy + S*0.35, cx, cy + S*0.42);
            ctx.stroke();
            break;
        }

        // ── SCORE ─────────────────────────────────────────────────────

        case 'score_multiplier': {
            // Star
            ctx.fillStyle = '#ffee00'; ctx.strokeStyle = '#886600'; ctx.lineWidth = 1.5;
            const r1 = S*0.38, r2 = S*0.16, pts = 5;
            ctx.beginPath();
            for (let i = 0; i < pts * 2; i++) {
                const r = i % 2 === 0 ? r1 : r2;
                const a = (i * Math.PI / pts) - Math.PI/2;
                i === 0 ? ctx.moveTo(cx + r*Math.cos(a), cy + r*Math.sin(a))
                         : ctx.lineTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            break;
        }

        case 'combo_keeper': {
            // Chain links
            ctx.strokeStyle = '#aaccff'; ctx.lineWidth = S*0.1; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(cx - S*0.15, cy, S*0.16, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx + S*0.15, cy, S*0.16, 0, Math.PI*2); ctx.stroke();
            // Centre link
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = S*0.06;
            ctx.beginPath();
            ctx.moveTo(cx - S*0.15 + S*0.16, cy);
            ctx.lineTo(cx + S*0.15 - S*0.16, cy);
            ctx.stroke();
            break;
        }

        default: {
            // Generic star fallback
            ctx.fillStyle = '#aaaaff'; ctx.strokeStyle = '#4444aa'; ctx.lineWidth = 1.5;
            const r1 = S*0.34, r2 = S*0.15, pts = 5;
            ctx.beginPath();
            for (let i = 0; i < pts * 2; i++) {
                const r = i % 2 === 0 ? r1 : r2;
                const a = (i * Math.PI / pts) - Math.PI/2;
                i === 0 ? ctx.moveTo(cx + r*Math.cos(a), cy + r*Math.sin(a))
                         : ctx.lineTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
        }
    }

    ctx.restore();
}
