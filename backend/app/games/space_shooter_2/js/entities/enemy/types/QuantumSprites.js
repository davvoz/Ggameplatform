/**
 * QuantumSprites — Rich procedural cartoon sprites for World 4 enemies.
 *
 * Each enemy gets a unique, detailed, animated sprite drawn entirely via
 * Canvas 2D.  Visual language: glossy spheres, neon outlines, animated
 * internal details, face-like "eyes" for personality, rich gradients.
 *
 * Public API — single entry point:
 *   drawW4Sprite(ctx, type, cx, cy, w, h, time, state)
 *
 *   type  = quark_triplet | neutrino_ghost | boson_carrier
 *           higgs_field   | positron_mirror | gluon_chain
 *   time  = seconds (monotonic)
 *   state = { flavorIdx, fieldRadius, annihilateTimer, reformTimer,
 *             isEndpoint, forceBoosted, ghostX, ghostY, invulnerable }
 */

const TAU = Math.PI * 2;

// ─── helpers ──────────────────────────────────

function glossyGrad(ctx, cx, cy, r, baseColor, lightColor) {
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.05,
        cx, cy, r);
    g.addColorStop(0, lightColor || '#ffffff');
    g.addColorStop(0.25, baseColor);
    g.addColorStop(1, darken(baseColor, 0.4));
    return g;
}

function darken(hex, amount) {
    let r = Number.parseInt(hex.slice(1, 3), 16);
    let g = Number.parseInt(hex.slice(3, 5), 16);
    let b = Number.parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.floor(r * (1 - amount)));
    g = Math.max(0, Math.floor(g * (1 - amount)));
    b = Math.max(0, Math.floor(b * (1 - amount)));
    return `rgb(${r},${g},${b})`;
}

function lighten(hex, amount) {
    let r = Number.parseInt(hex.slice(1, 3), 16);
    let g = Number.parseInt(hex.slice(3, 5), 16);
    let b = Number.parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.floor(r + (255 - r) * amount));
    g = Math.min(255, Math.floor(g + (255 - g) * amount));
    b = Math.min(255, Math.floor(b + (255 - b) * amount));
    return `rgb(${r},${g},${b})`;
}

// ─── menacing eye variants (unique per enemy type) ─────────

/** Void eye — deep abyssal pit with violent plasma rim and jagged corona */
function drawVoidEye(ctx, ex, ey, size, t, color) {
    ctx.save();
    // Outer corona flare
    const corona = ctx.createRadialGradient(ex, ey, size * 0.3, ex, ey, size * 1.4);
    corona.addColorStop(0, 'rgba(0,0,0,0)');
    corona.addColorStop(0.5, (color || '#aa22ff') + '33');
    corona.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = corona;
    ctx.beginPath(); ctx.arc(ex, ey, size * 1.4, 0, TAU); ctx.fill();
    // Main void pit — deeper, sharper gradient
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, size);
    g.addColorStop(0, '#000000');
    g.addColorStop(0.3, '#050008');
    g.addColorStop(0.7, darken(color || '#aa22ff', 0.3));
    g.addColorStop(0.9, color || '#aa22ff');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ex, ey, size, 0, TAU); ctx.fill();
    // Violent plasma wisps — more, faster, brighter
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = color || '#aa22ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color || '#aa22ff';
    ctx.shadowBlur = 4;
    for (let i = 0; i < 5; i++) {
        const a0 = TAU / 5 * i + t * 4.5;
        ctx.beginPath();
        for (let s = 0; s < 10; s++) {
            const frac = s / 10;
            const a = a0 + frac * 3.2;
            const rr = size * frac * 0.95;
            const jitter = Math.sin(t * 12 + i * 3 + s) * size * 0.06;
            const px = ex + Math.cos(a) * (rr + jitter);
            const py = ey + Math.sin(a) * (rr + jitter);
            s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    // Central malice point — tiny bright flicker
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 8);
    ctx.fillStyle = lighten(color || '#aa22ff', 0.6);
    ctx.beginPath(); ctx.arc(ex, ey, size * 0.12, 0, TAU); ctx.fill();
    ctx.restore();
}

/** Slit eye — predatory narrow slit with menacing glow and sharp edges */
function drawSlitEye(ctx, options) {
    const { ex, ey, w, h, t, color, vertical } = options;//
    ctx.save();
    // Outer menacing glow socket — larger, more intense
    const socketG = ctx.createRadialGradient(ex, ey, 0, ex, ey, w * 1.6);
    socketG.addColorStop(0, color || '#ffcc00');
    socketG.addColorStop(0.35, darken(color || '#ffcc00', 0.4));
    socketG.addColorStop(0.7, darken(color || '#ffcc00', 0.8));
    socketG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = socketG;
    ctx.beginPath(); ctx.arc(ex, ey, w * 1.6, 0, TAU); ctx.fill();
    // Dark angular eye shape — diamond instead of ellipse
    ctx.fillStyle = '#000008';
    ctx.beginPath();
    ctx.moveTo(ex - w * 1.1, ey);
    ctx.lineTo(ex, ey - h * 0.9);
    ctx.lineTo(ex + w * 1.1, ey);
    ctx.lineTo(ex, ey + h * 0.9);
    ctx.closePath();
    ctx.fill();
    // Slit pupil — sharper, more aggressive pulse
    const pulse = 0.4 + 0.4 * Math.sin(t * 5);
    ctx.shadowColor = color || '#ffcc00';
    ctx.shadowBlur = 6;
    ctx.fillStyle = color || '#ffcc00';
    if (vertical) {
        ctx.beginPath();
        ctx.ellipse(ex, ey, w * 0.2 * pulse, h * 0.85, 0, 0, TAU);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.ellipse(ex, ey, w * 0.85, h * 0.2 * pulse, 0, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}

/** Compound eye — alien insectoid cluster with scanning glow, cold and predatory */
function drawCompoundEye(ctx, ex, ey, size, t, color) {
    ctx.save();
    const count = 7;
    const cellR = size * 0.36;
    // Outer menacing socket glow
    ctx.globalAlpha = 0.25;
    ctx.shadowColor = color || '#33ff77';
    ctx.shadowBlur = 8;
    ctx.fillStyle = darken(color || '#33ff77', 0.7);
    ctx.beginPath(); ctx.arc(ex, ey, size * 1.1, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // central cell — larger, deeper
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000800';
    ctx.beginPath(); ctx.arc(ex, ey, cellR, 0, TAU); ctx.fill();
    // bright scanning center — sweeps like a targeting laser
    const scanAngle = t * 3;
    const scanX = ex + Math.cos(scanAngle) * cellR * 0.25;
    const scanY = ey + Math.sin(scanAngle) * cellR * 0.25;
    ctx.fillStyle = color || '#33ff77';
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 7);
    ctx.beginPath(); ctx.arc(scanX, scanY, cellR * 0.4, 0, TAU); ctx.fill();
    // surrounding cells — hexagonal, with staggered activation
    for (let i = 0; i < count - 1; i++) {
        const a = TAU / 6 * i + 0.3;
        const cx2 = ex + Math.cos(a) * cellR * 1.7;
        const cy2 = ey + Math.sin(a) * cellR * 1.7;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#000800';
        // Hexagonal cell shape
        ctx.beginPath();
        for (let h2 = 0; h2 < 6; h2++) {
            const ha = TAU / 6 * h2;
            const hx = cx2 + Math.cos(ha) * cellR * 0.8;
            const hy = cy2 + Math.sin(ha) * cellR * 0.8;
            h2 === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
        }
        ctx.closePath(); ctx.fill();
        // Active cell — sequential activation pattern
        const activePhase = (t * 2 + i * 0.5) % 3;
        const cellBright = activePhase < 1 ? 0.8 : 0.15;
        ctx.globalAlpha = cellBright;
        ctx.fillStyle = color || '#33ff77';
        ctx.beginPath(); ctx.arc(cx2, cy2, cellR * 0.35, 0, TAU); ctx.fill();
    }
    ctx.restore();
}

/** Phantom eyes — haunting spectral eyes that stare and track with hollow malice */
function drawPhantomEyes(ctx, cx, cy, r, t, color) {
    ctx.save();
    // Two dominant eyes that stay visible — no cute blinking
    const eyeSpread = r * 0.22;
    const eyeY = cy - r * 0.08;
    for (let side = -1; side <= 1; side += 2) {
        const ex = cx + side * eyeSpread;
        const ey = eyeY;
        const sz = r * 0.14;
        // Spectral glow socket
        ctx.globalAlpha = 0.4;
        ctx.shadowColor = color || '#aa88ff';
        ctx.shadowBlur = 10;
        const socketG = ctx.createRadialGradient(ex, ey, 0, ex, ey, sz * 2);
        socketG.addColorStop(0, color || '#aa88ff');
        socketG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = socketG;
        ctx.beginPath(); ctx.arc(ex, ey, sz * 2, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        // Angular eye shape — narrowed, hostile
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = color || '#aa88ff';
        ctx.beginPath();
        ctx.moveTo(ex - sz * 1.8, ey);
        ctx.quadraticCurveTo(ex, ey - sz * 0.7, ex + sz * 1.8, ey);
        ctx.quadraticCurveTo(ex, ey + sz * 0.5, ex - sz * 1.8, ey);
        ctx.fill();
        // Pitch-black hollow pupil — no soul
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000005';
        ctx.beginPath();
        ctx.arc(ex, ey, sz * 0.5, 0, TAU);
        ctx.fill();
        // Faint inner glow flicker
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 6 + side * 2);
        ctx.fillStyle = lighten(color || '#aa88ff', 0.5);
        ctx.beginPath();
        ctx.arc(ex - sz * 0.15, ey - sz * 0.15, sz * 0.18, 0, TAU);
        ctx.fill();
    }
    // Additional spectral afterimage eyes that drift (unsettling)
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 3; i++) {
        const seed = i * 137.5;
        const phase = Math.sin(t * 1.5 + seed) * 0.5 + 0.5;
        if (phase < 0.4) continue;
        const gx = cx + Math.sin(seed + t * 0.5) * r * 0.3;
        const gy = cy + Math.cos(seed * 0.7 + t * 0.4) * r * 0.2;
        ctx.globalAlpha = phase * 0.2;
        ctx.fillStyle = color || '#aa88ff';
        ctx.beginPath();
        ctx.ellipse(gx, gy, r * 0.06, r * 0.03, 0, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}

/** Cracked maw — wide jagged gash with razor teeth and seething energy */
function drawCrackedMouth(ctx, cx, cy, w, t, color) {
    ctx.save();
    const segments = 8;
    const mouthW = w * 1.3;
    // Upper jaw — sharp zigzag
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(cx - mouthW, cy - 1);
    for (let i = 1; i < segments; i++) {
        const frac = i / segments;
        const px = cx - mouthW + frac * mouthW * 2;
        const teeth = (i % 2 === 0) ? -3 : 3;
        ctx.lineTo(px, cy + teeth);
    }
    ctx.lineTo(cx + mouthW, cy - 1);
    // Lower jaw — deep curve with fangs
    for (let i = segments - 1; i >= 1; i--) {
        const frac = i / segments;
        const px = cx - mouthW + frac * mouthW * 2;
        const depth = Math.sin(frac * Math.PI) * w * 0.7;
        const teeth = (i % 2 === 0) ? -2 : 4;
        ctx.lineTo(px, cy + depth + teeth);
    }
    ctx.closePath();
    ctx.fill();
    // Seething inner energy
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 8);
    ctx.shadowColor = color || '#ff3355';
    ctx.shadowBlur = 6;
    ctx.fillStyle = color || '#ff3355';
    ctx.fill();
    // Sharp fang highlights
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ffffff';
    for (let i = 1; i < segments; i += 2) {
        const frac = i / segments;
        const px = cx - mouthW + frac * mouthW * 2;
        ctx.beginPath();
        ctx.moveTo(px - 1.5, cy);
        ctx.lineTo(px, cy + 4);
        ctx.lineTo(px + 1.5, cy);
        ctx.closePath(); ctx.fill();
    }
    ctx.restore();
}

function drawNeonOutline(ctx, cx, cy, r, color, alpha, width) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  QUARK TRIPLET — 3 orbiting quarks (RGB color charge)
//  with spring-like gluon connections, menacing face on main body
// ═══════════════════════════════════════════════

function drawQuarkTriplet(ctx, options) {
    const { cx, cy, w, t, state } = options;
    const r = w * 0.42;
    const quarkR = r * 0.32;
    const quarkColors = ['#ff3355', '#33ff77', '#3366ff'];
    const orbitR = r * 0.85;
    const reforming = state.reformTimer > 0;

    // Outer energy shell (cartoon bubble)
    ctx.save();
    ctx.globalAlpha = reforming ? 0.3 + 0.2 * Math.sin(t * 12) : 0.15;
    const shellGrad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.3);
    shellGrad.addColorStop(0, 'rgba(255,255,255,0.05)');
    shellGrad.addColorStop(0.6, 'rgba(180,60,220,0.12)');
    shellGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shellGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.3, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Draw 3 quarks orbiting
    for (let i = 0; i < 3; i++) {
        const angle = (TAU / 3) * i + t * 1.5;
        const qx = cx + Math.cos(angle) * orbitR;
        const qy = cy + Math.sin(angle) * orbitR;

        // Gluon spring connection to center
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = quarkColors[i];
        ctx.lineWidth = 2;
        ctx.beginPath();
        const segs = 12;
        for (let s = 0; s <= segs; s++) {
            const frac = s / segs;
            const mx = cx + (qx - cx) * frac;
            const my = cy + (qy - cy) * frac;
            const perp = Math.sin(frac * Math.PI * 4 + t * 8) * 4;
            const dx = qy - cy, dy = -(qx - cx);
            const len = Math.hypot(dx, dy) || 1;
            const px = mx + (dx / len) * perp;
            const py = my + (dy / len) * perp;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();

        // Quark orb — glossy cartoon sphere
        ctx.save();
        ctx.fillStyle = glossyGrad(ctx, qx, qy, quarkR, quarkColors[i], lighten(quarkColors[i], 0.6));
        ctx.beginPath();
        ctx.arc(qx, qy, quarkR, 0, TAU);
        ctx.fill();
        // Cartoon outline
        ctx.strokeStyle = darken(quarkColors[i], 0.3);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    // Central body — dark nucleus with face
    ctx.save();
    ctx.fillStyle = glossyGrad(ctx, cx, cy, r * 0.48, '#331144', '#8844aa');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.48, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#110022';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Menacing void eyes — larger, more intense abyssal pits
    const eyeSpread = r * 0.22;
    drawVoidEye(ctx, cx - eyeSpread, cy - r * 0.08, r * 0.16, t, '#ff3355');
    drawVoidEye(ctx, cx + eyeSpread, cy - r * 0.08, r * 0.16, t, '#3366ff');

    // Heavy angular V-brow ridge — thick, dark, aggressive
    ctx.save();
    ctx.fillStyle = '#0a0018';
    ctx.beginPath();
    ctx.moveTo(cx - eyeSpread - r * 0.2, cy - r * 0.08);
    ctx.lineTo(cx - eyeSpread + r * 0.02, cy - r * 0.28);
    ctx.lineTo(cx - eyeSpread + r * 0.18, cy - r * 0.12);
    ctx.lineTo(cx - eyeSpread + r * 0.02, cy - r * 0.16);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + eyeSpread + r * 0.2, cy - r * 0.08);
    ctx.lineTo(cx + eyeSpread - r * 0.02, cy - r * 0.28);
    ctx.lineTo(cx + eyeSpread - r * 0.18, cy - r * 0.12);
    ctx.lineTo(cx + eyeSpread - r * 0.02, cy - r * 0.16);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Wide cracked maw with seething plasma
    drawCrackedMouth(ctx, cx, cy + r * 0.16, r * 0.2, t, '#cc22ff');

    // Neon orbit ring
    drawNeonOutline(ctx, cx, cy, orbitR, '#aa44ff', 0.25, 1);
}

// ═══════════════════════════════════════════════
//  NEUTRINO GHOST — ethereal, shifting, nearly invisible
//  wispy body with ghostly face, phase-shifting aura
// ═══════════════════════════════════════════════

function drawNeutrinoGhost(ctx, options) {
    const { cx, cy, w, t, state } = options;
    const r = w * 0.46;
    const flavor = state.flavorIdx || 0;
    const flavorColors = ['#aa88ff', '#88ddff', '#ffaa55'];
    const baseColor = flavorColors[flavor];

    // Ethereal wispy outer aura — multiple overlapping translucent blobs
    ctx.save();
    for (let ring = 0; ring < 4; ring++) {
        const offset = ring * TAU * 0.25 + t * 0.8;
        const blobR = r * (1 + ring * 0.15);
        const bx = cx + Math.sin(offset) * r * 0.08;
        const by = cy + Math.cos(offset * 1.3) * r * 0.08;
        ctx.globalAlpha = 0.06 - ring * 0.012;
        const wisp = ctx.createRadialGradient(bx, by, 0, bx, by, blobR);
        wisp.addColorStop(0, baseColor);
        wisp.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = wisp;
        ctx.beginPath();
        ctx.arc(bx, by, blobR, 0, TAU);
        ctx.fill();
    }
    ctx.restore();

    // Wispy tail tendrils
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
        const angle = TAU / 3 * i + t * 0.4;
        ctx.beginPath();
        const startX = cx + Math.cos(angle) * r * 0.3;
        const startY = cy + Math.sin(angle) * r * 0.3;
        ctx.moveTo(startX, startY);
        const cp1x = startX + Math.cos(angle + 0.4) * r * 0.5 + Math.sin(t * 3 + i) * 4;
        const cp1y = startY + Math.sin(angle + 0.4) * r * 0.5;
        const endX = cx + Math.cos(angle) * r * 1.2 + Math.sin(t * 2 + i * 2) * 6;
        const endY = cy + Math.sin(angle) * r * 1.2 + Math.cos(t * 2.5 + i) * 4;
        ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
        ctx.stroke();
    }
    ctx.restore();

    // Main body — translucent teardrop-ish blob
    ctx.save();
    ctx.globalAlpha = 0.55;
    const bodyGrad = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.2, r * 0.05,
        cx, cy, r * 0.7);
    bodyGrad.addColorStop(0, lighten(baseColor, 0.5));
    bodyGrad.addColorStop(0.5, baseColor);
    bodyGrad.addColorStop(1, darken(baseColor, 0.5));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    // Wobbly circle
    for (let a = 0; a < TAU; a += 0.1) {
        const wobble = r * 0.6 + Math.sin(a * 3 + t * 4) * r * 0.06 + Math.sin(a * 5 + t * 2) * r * 0.03;
        const px = cx + Math.cos(a) * wobble;
        const py = cy + Math.sin(a) * wobble;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Ghostly face — haunting spectral eyes with hostile intent
    drawPhantomEyes(ctx, cx, cy, r, t, baseColor);

    // Hollow screaming maw — gaping dark pit with energy wisps
    ctx.save();
    const mouthBreath = Math.sin(t * 3) * 0.4;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#000005';
    ctx.beginPath();
    // Jagged maw shape instead of smooth ellipse
    const mawW = r * 0.16;
    const mawH = r * (0.08 + 0.06 * Math.abs(mouthBreath));
    ctx.moveTo(cx - mawW, cy + r * 0.2);
    ctx.lineTo(cx - mawW * 0.5, cy + r * 0.18);
    ctx.lineTo(cx, cy + r * 0.2 - mawH * 0.3);
    ctx.lineTo(cx + mawW * 0.5, cy + r * 0.18);
    ctx.lineTo(cx + mawW, cy + r * 0.2);
    ctx.lineTo(cx + mawW * 0.7, cy + r * 0.2 + mawH);
    ctx.lineTo(cx, cy + r * 0.2 + mawH * 1.2);
    ctx.lineTo(cx - mawW * 0.7, cy + r * 0.2 + mawH);
    ctx.closePath();
    ctx.fill();
    // Energy wisps escaping — more intense
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 4;
    for (let i = 0; i < 3; i++) {
        const dx = Math.sin(t * 4 + i * 2.1) * r * 0.08;
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy + r * 0.22);
        ctx.quadraticCurveTo(cx + dx * 2.5, cy + r * 0.38, cx + dx * 4, cy + r * 0.52);
        ctx.stroke();
    }
    ctx.restore();

    // Flavor indicator ring
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  BOSON CARRIER — golden energy orb radiating force waves
//  lightning bolts, photon ring, determined face
// ═══════════════════════════════════════════════

function drawBosonCarrier(ctx, options) {
    const { cx, cy, w, t } = options;
    const r = w * 0.44;

    // Radiating force waves (concentric expanding rings)
    ctx.save();
    for (let ring = 0; ring < 3; ring++) {
        const phase = (t * 1.5 + ring * 0.7) % 2;
        const ringR = r * (0.6 + phase * 0.8);
        const alpha = Math.max(0, 0.2 - phase * 0.1);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffee33';
        ctx.lineWidth = 2 - phase * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, TAU);
        ctx.stroke();
    }
    ctx.restore();

    // Lightning bolt spokes
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#ffffaa';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
        const angle = TAU / 4 * i + t * 0.6;
        ctx.beginPath();
        for (let seg = 0; seg < 5; seg++) {
            const dist = r * (0.4 + seg * 0.2);
            const jitter = (Math.random() - 0.5) * 6;
            const nx = cx + Math.cos(angle) * dist + Math.sin(angle + 1.57) * jitter;
            const ny = cy + Math.sin(angle) * dist + Math.cos(angle + 1.57) * jitter;
            ctx.lineTo(nx, ny);
        }
        ctx.stroke();
    }
    ctx.restore();

    // Photon ring (orbiting bright dots)
    ctx.save();
    for (let i = 0; i < 6; i++) {
        const angle = TAU / 6 * i + t * 3;
        const px = cx + Math.cos(angle) * r * 0.7;
        const py = cy + Math.sin(angle) * r * 0.7;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, TAU);
        ctx.fill();
    }
    ctx.restore();

    // Main body — golden glossy sphere
    ctx.save();
    ctx.fillStyle = glossyGrad(ctx, cx, cy, r * 0.55, '#ffcc00', '#ffffbb');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, TAU);
    ctx.fill();
    // Cartoon outline
    ctx.strokeStyle = '#cc8800';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Inner energy core glow
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ffffcc';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Fierce slit eyes — larger, predatory, aggressive
    const eyeSpread = r * 0.2;
    drawSlitEye(ctx, { ex: cx - eyeSpread, ey: cy - r * 0.06, w: r * 0.13, h: r * 0.08, t, color: '#ffcc00', vertical: true });
    drawSlitEye(ctx, { ex: cx + eyeSpread, ey: cy - r * 0.06, w: r * 0.13, h: r * 0.08, t, color: '#ffcc00', vertical: true });

    // Aggressive V-brow — angular dark ridges
    ctx.save();
    ctx.fillStyle = '#2a1800';
    ctx.beginPath();
    ctx.moveTo(cx - eyeSpread - r * 0.18, cy - r * 0.04);
    ctx.lineTo(cx - r * 0.02, cy - r * 0.22);
    ctx.lineTo(cx - r * 0.02, cy - r * 0.14);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + eyeSpread + r * 0.18, cy - r * 0.04);
    ctx.lineTo(cx + r * 0.02, cy - r * 0.22);
    ctx.lineTo(cx + r * 0.02, cy - r * 0.14);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Energy vent mouth — seething heat fracture
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.12, cy + r * 0.1);
    ctx.lineTo(cx - r * 0.06, cy + r * 0.14);
    ctx.lineTo(cx, cy + r * 0.08);
    ctx.lineTo(cx + r * 0.06, cy + r * 0.14);
    ctx.lineTo(cx + r * 0.12, cy + r * 0.1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 5; i++) {
        const frac = (i - 2) / 2;
        const sx = cx + frac * r * 0.12;
        ctx.beginPath();
        ctx.moveTo(sx, cy + r * 0.14);
        ctx.lineTo(sx + Math.sin(t * 6 + i) * 2, cy + r * 0.24 + Math.sin(t * 5 + i * 1.5) * 2);
        ctx.stroke();
    }
    ctx.restore();

    // W/Z boson label glow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffee33';
    ctx.font = `bold ${Math.floor(r * 0.24)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W±', cx, cy + r * 0.38);
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  HIGGS FIELD — massive golden entity with field distortion
//  concentric mass rings, heavy presence, regal face
// ═══════════════════════════════════════════════

function drawHiggsField(ctx, options) {
    const { cx, cy, w, t } = options;
    const r = w * 0.48;

    // Outer mass field distortion rings
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let ring = 0; ring < 5; ring++) {
        const ringR = r * 0.7 + ring * r * 0.25 + Math.sin(t * 1.5 + ring) * 3;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1 + (4 - ring) * 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, TAU);
        ctx.stroke();
    }
    ctx.restore();

    // Higgs potential mexican-hat profile (radial gradient)
    ctx.save();
    ctx.globalAlpha = 0.1;
    const potGrad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.8);
    potGrad.addColorStop(0, '#ffd700');
    potGrad.addColorStop(0.3, 'rgba(255,215,0,0.02)');
    potGrad.addColorStop(0.5, 'rgba(255,215,0,0.08)');
    potGrad.addColorStop(0.7, 'rgba(255,215,0,0.02)');
    potGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = potGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Hovering mass particles attracted inward
    ctx.save();
    for (let i = 0; i < 8; i++) {
        const angle = TAU / 8 * i + t * 0.5;
        const dist = r * 0.8 + Math.sin(t * 2 + i * 1.5) * r * 0.15;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(px, py, 2.5 + Math.sin(t * 3 + i) * 1, 0, TAU);
        ctx.fill();
        // Connecting line to center
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();
    }
    ctx.restore();

    // Main body — large golden sphere with crown-like rim
    ctx.save();
    ctx.fillStyle = glossyGrad(ctx, cx, cy, r * 0.5, '#ffc800', '#ffffcc');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Crown bumps (regal look)
    ctx.save();
    ctx.fillStyle = '#ffd700';
    for (let i = 0; i < 5; i++) {
        const angle = -Math.PI + TAU / 5 * i - TAU * 0.1;
        const bx = cx + Math.cos(angle) * r * 0.48;
        const by = cy + Math.sin(angle) * r * 0.48;
        if (by < cy) {
            ctx.beginPath();
            ctx.moveTo(bx - 4, by + 2);
            ctx.lineTo(bx, by - 6);
            ctx.lineTo(bx + 4, by + 2);
            ctx.fill();
        }
    }
    ctx.restore();

    // Predatory hawk eyes — larger, more imposing, with intense glow
    ctx.save();
    const eyeSpread2 = r * 0.2;
    const eyeY2 = cy - r * 0.06;
    // left eye — larger angular diamond with deep socket
    for (let side = -1; side <= 1; side += 2) {
        const exi = cx + side * eyeSpread2;
        // Dark socket
        ctx.globalAlpha = 0.5;
        const socketG = ctx.createRadialGradient(exi, eyeY2, 0, exi, eyeY2, r * 0.16);
        socketG.addColorStop(0, '#1a0f00');
        socketG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = socketG;
        ctx.beginPath(); ctx.arc(exi, eyeY2, r * 0.16, 0, TAU); ctx.fill();
        // Eye shape — sharper, wider diamond
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#0d0800';
        ctx.beginPath();
        ctx.moveTo(exi - r * 0.16, eyeY2);
        ctx.lineTo(exi, eyeY2 - r * 0.08);
        ctx.lineTo(exi + r * 0.16, eyeY2);
        ctx.lineTo(exi, eyeY2 + r * 0.05);
        ctx.closePath(); ctx.fill();
        // Glowing golden iris — intense, pulsing
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 6;
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 4 + side);
        ctx.beginPath();
        ctx.ellipse(exi, eyeY2, r * 0.06, r * 0.04, 0, 0, TAU);
        ctx.fill();
        // Pinpoint pupil
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(exi, eyeY2, r * 0.02, 0, TAU);
        ctx.fill();
    }
    // Heavy angular brow — commanding, stern
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#3d2a00';
    ctx.beginPath();
    ctx.moveTo(cx - eyeSpread2 - r * 0.18, eyeY2 + r * 0.02);
    ctx.lineTo(cx - r * 0.02, eyeY2 - r * 0.16);
    ctx.lineTo(cx - r * 0.02, eyeY2 - r * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + eyeSpread2 + r * 0.18, eyeY2 + r * 0.02);
    ctx.lineTo(cx + r * 0.02, eyeY2 - r * 0.16);
    ctx.lineTo(cx + r * 0.02, eyeY2 - r * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Stern mouth — heavy downturned line with gravity aura
    ctx.save();
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.75;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.12, cy + r * 0.12);
    ctx.quadraticCurveTo(cx, cy + r * 0.16, cx + r * 0.12, cy + r * 0.12);
    ctx.stroke();
    ctx.restore();

    // "H" label
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(r * 0.2)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H\u2070', cx, cy + r * 0.38);
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  POSITRON MIRROR — half matter / half antimatter
//  split design, sparkly annihilation boundary, manic face
// ═══════════════════════════════════════════════

function drawPositronMirror(ctx, options) {
    const { cx, cy, w, t } = options;
    const r = w * 0.44;
    const splitAngle = t * 0.4;

    // Annihilation sparks along the dividing line
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 6; i++) {
        const frac = (i / 5) * 2 - 1;
        const sx = cx + Math.cos(splitAngle + Math.PI / 2) * r * 0.5 * frac;
        const sy = cy + Math.sin(splitAngle + Math.PI / 2) * r * 0.5 * frac;
        const sparkSize = 1.5 + Math.sin(t * 10 + i * 2) * 1;
        const jitterX = Math.sin(t * 8 + i * 3) * 3;
        const jitterY = Math.cos(t * 7 + i * 2) * 3;
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#ff88cc';
        ctx.beginPath();
        ctx.arc(sx + jitterX, sy + jitterY, sparkSize, 0, TAU);
        ctx.fill();
    }
    ctx.restore();

    // Matter half (blue)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, splitAngle - Math.PI / 2, splitAngle + Math.PI / 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = glossyGrad(ctx, cx - r * 0.15, cy, r * 0.55, '#4488ff', '#aaccff');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Antimatter half (pink/magenta)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, splitAngle + Math.PI / 2, splitAngle + Math.PI * 1.5);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = glossyGrad(ctx, cx + r * 0.15, cy, r * 0.55, '#ff4488', '#ffaacc');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Dividing line (annihilation boundary)
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(splitAngle + Math.PI / 2) * r * 0.55,
        cy + Math.sin(splitAngle + Math.PI / 2) * r * 0.55);
    ctx.lineTo(cx + Math.cos(splitAngle - Math.PI / 2) * r * 0.55,
        cy + Math.sin(splitAngle - Math.PI / 2) * r * 0.55);
    ctx.stroke();
    ctx.restore();

    // Outer cartoon outline
    ctx.save();
    ctx.strokeStyle = '#880044';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // Split-personality eyes — larger, asymmetric, deeply unsettling
    // Left (matter side): cold predatory slit — bigger
    drawSlitEye(ctx, { ex: cx - r * 0.18, ey: cy - r * 0.08, w: r * 0.12, h: r * 0.07, t, color: '#66aaff', vertical: true });

    // Right (antimatter side): wide abyssal void — bigger
    drawVoidEye(ctx, cx + r * 0.18, cy - r * 0.08, r * 0.13, t, '#ff4488');

    // Asymmetric angry brow
    ctx.save();
    ctx.fillStyle = '#220011';
    // Left brow — downward angry
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.32, cy - r * 0.06);
    ctx.lineTo(cx - r * 0.08, cy - r * 0.2);
    ctx.lineTo(cx - r * 0.08, cy - r * 0.12);
    ctx.closePath(); ctx.fill();
    // Right brow — raised, unhinged
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.32, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.08, cy - r * 0.22);
    ctx.lineTo(cx + r * 0.08, cy - r * 0.14);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Twisted jagged gash — wider, with more prominent teeth
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#000008';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.18, cy + r * 0.06);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.12);
    ctx.lineTo(cx - r * 0.03, cy + r * 0.06);
    ctx.lineTo(cx + r * 0.04, cy + r * 0.14);
    ctx.lineTo(cx + r * 0.1, cy + r * 0.04);
    ctx.lineTo(cx + r * 0.16, cy + r * 0.1);
    // Lower jaw curve
    ctx.lineTo(cx + r * 0.1, cy + r * 0.2);
    ctx.lineTo(cx - r * 0.02, cy + r * 0.22);
    ctx.lineTo(cx - r * 0.14, cy + r * 0.16);
    ctx.closePath();
    ctx.fill();
    // Inner annihilation glow
    ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 7);
    ctx.fillStyle = '#ff66aa';
    ctx.shadowColor = '#ff66aa';
    ctx.shadowBlur = 4;
    ctx.fill();
    // Razor fangs
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    const teeth = [[-0.1, 0.09], [-0.03, 0.06], [0.04, 0.1], [0.1, 0.06]];
    for (const [tx, ty] of teeth) {
        ctx.beginPath();
        ctx.moveTo(cx + r * tx - 2, cy + r * ty);
        ctx.lineTo(cx + r * tx, cy + r * ty + 5);
        ctx.lineTo(cx + r * tx + 2, cy + r * ty);
        ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // e+/e- labels
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.font = `bold ${Math.floor(r * 0.18)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaccff';
    ctx.fillText('e\u207b', cx - r * 0.28, cy + r * 0.42);
    ctx.fillStyle = '#ffaacc';
    ctx.fillText('e\u207a', cx + r * 0.28, cy + r * 0.42);
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  GLUON CHAIN — linked chain of colorful energy nodes
//  spring connections, chain expression, sentinel-like
// ═══════════════════════════════════════════════

function drawGluonChain(ctx, options) {
    const { cx, cy, w, t, state } = options;
    const r = w * 0.4;
    const isEndpoint = state.isEndpoint !== false;
    const chainColors = ['#33ff77', '#77ffaa', '#aaffcc'];

    // Chain link background aura
    ctx.save();
    ctx.globalAlpha = isEndpoint ? 0.15 : 0.25;
    const auraColor = isEndpoint ? '#33ff77' : '#00cc55';
    const aura = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.1);
    aura.addColorStop(0, auraColor);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.1, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Chain link segments (3 overlapping rounded shapes forming a link)
    ctx.save();
    ctx.strokeStyle = darken('#33ff77', 0.3);
    ctx.lineWidth = 2;
    // Outer loop
    const loopW = r * 0.5;
    const loopH = r * 0.35;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.8);
    ctx.fillStyle = glossyGrad(ctx, 0, 0, loopW, '#44dd66', '#aaffcc');
    ctx.beginPath();
    ctx.ellipse(0, -loopH * 0.3, loopW, loopH, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = glossyGrad(ctx, 0, 0, loopW, '#22cc44', '#88ffaa');
    ctx.beginPath();
    ctx.ellipse(0, loopH * 0.3, loopW, loopH, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // Connection nubs (top and bottom)
    ctx.save();
    ctx.fillStyle = '#33ff77';
    const nubSize = r * 0.12;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.5, nubSize, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.5, nubSize, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Invulnerable shield glow (middle sections)
    if (!isEndpoint) {
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 4);
        ctx.strokeStyle = '#66ffaa';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#66ffaa';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.55, 0, TAU);
        ctx.stroke();
        ctx.restore();
    }

    // Compound insect eyes — larger, cold predatory scanners
    drawCompoundEye(ctx, cx - r * 0.16, cy - r * 0.06, r * 0.15, t, '#33ff77');
    drawCompoundEye(ctx, cx + r * 0.16, cy - r * 0.06, r * 0.15, t, '#33ff77');

    // Mechanical scar-gash — wider, with faint energy leak
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#005500';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = '#33ff77';
    ctx.shadowBlur = 3;
    // Wider jagged scar
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.12, cy + r * 0.12);
    ctx.lineTo(cx - r * 0.06, cy + r * 0.15);
    ctx.lineTo(cx, cy + r * 0.11);
    ctx.lineTo(cx + r * 0.06, cy + r * 0.15);
    ctx.lineTo(cx + r * 0.12, cy + r * 0.12);
    ctx.stroke();
    ctx.restore();

    // Color charge indicator dots
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
        const angle = TAU / 3 * i - TAU * 0.25 + t * 1.2;
        const dx = Math.cos(angle) * r * 0.32;
        const dy = Math.sin(angle) * r * 0.32;
        ctx.fillStyle = chainColors[i];
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, 2.5, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}


// ═══════════════════════════════════════════════
//  PUBLIC DISPATCHER
// ═══════════════════════════════════════════════


export function drawW4Sprite(ctx, options) {
    const { type, cx, cy, w, h, t, state } = options;
    switch (type) {
        case 'quark_triplet': drawQuarkTriplet(ctx, { cx, cy, w, h, t, state }); break;
        case 'neutrino_ghost': drawNeutrinoGhost(ctx, { cx, cy, w, h, t, state }); break;
        case 'boson_carrier': drawBosonCarrier(ctx, { cx, cy, w, h, t, state }); break;
        case 'higgs_field': drawHiggsField(ctx, { cx, cy, w, h, t, state }); break;
        case 'positron_mirror': drawPositronMirror(ctx, { cx, cy, w, h, t, state }); break;
        case 'gluon_chain': drawGluonChain(ctx, { cx, cy, w, h, t, state }); break;
    }
}
