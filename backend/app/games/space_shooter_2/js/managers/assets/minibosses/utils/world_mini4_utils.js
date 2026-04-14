
import { _mkCanvas, outlineAndFill, drawHighlight, _drawPartEye } from '../../Helper.js';
import { C_WHITE} from '../../../../entities/LevelsThemes.js';


export function createMiniBossOrb(accent, dark, sprites) {

    const S = 28, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 9);
    g.addColorStop(0, C_WHITE); g.addColorStop(0.3, accent); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
    // Tiny playful dot eyes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx - 2.5, cy - 1, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 2.5, cy - 1, 1, 0, Math.PI * 2); ctx.fill();
    // Tiny smile
    ctx.strokeStyle = '#000'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy + 2, 2, 0.1, Math.PI - 0.1); ctx.stroke();
    sprites['mboss13_orb'] = cv;

}

export function createMiniBossCore(color, accent, dark, sprites) {

    const S = 71, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 28;
    // Phase-shimmer aura
    const aura = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.12);
    aura.addColorStop(0, color + '00'); aura.addColorStop(0.6, color + '18');
    aura.addColorStop(1, color + '00');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2); ctx.fill();
    // Rounded triangular body (quark-ness)
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
        const na = (Math.PI * 2 / 3) * (i + 1) - Math.PI / 2;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        const midA = (a + na) / 2;
        ctx.quadraticCurveTo(cx + r * 1.12 * Math.cos(midA), cy + r * 1.12 * Math.sin(midA),
            cx + r * Math.cos(na), cy + r * Math.sin(na));
    }
    ctx.closePath();
    outlineAndFill(ctx, color, '#111', 2.5);
    // Inner charm swirl pattern
    ctx.strokeStyle = accent + '44'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 3; t += 0.2) {
        const sr = 4 + t * 2.5; if (sr > r * 0.8) break;
        const px = cx + sr * Math.cos(t), py = cy + sr * Math.sin(t);
        if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Mischievous cat-like eyes
    for (const sx of [-1, 1]) {
        const ex = cx + sx * 8, ey = cy - 4;
        ctx.fillStyle = '#111'; ctx.beginPath();
        ctx.moveTo(ex - 5 * sx, ey - 2); ctx.quadraticCurveTo(ex, ey - 5, ex + 5 * sx, ey);
        ctx.quadraticCurveTo(ex, ey + 3, ex - 5 * sx, ey - 2); ctx.fill();
        // Vertical slit pupil
        ctx.fillStyle = '#ffdd44'; ctx.beginPath();
        ctx.ellipse(ex + sx * 0.5, ey - 0.5, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath();
        ctx.ellipse(ex + sx * 0.5, ey - 0.5, 0.8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - sx, ey - 2, 0.7, 0, Math.PI * 2); ctx.fill();
    }
    // Cheshire grin
    ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 6);
    ctx.quadraticCurveTo(cx - 5, cy + 12, cx, cy + 8);
    ctx.quadraticCurveTo(cx + 5, cy + 12, cx + 10, cy + 6);
    ctx.stroke();
    // "C" charm inscription on forehead
    ctx.fillStyle = accent + '66'; ctx.font = 'italic 9px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('c', cx, cy - r * 0.55);
    drawHighlight(ctx, cx - 12, cy - r * 0.7, 24, 10, 0.14);
    sprites['mboss13_core'] = cv;

}

export function createMiniBossArm(dark, accent, sprites) {

    const cv = _mkCanvas(36, 47), ctx = cv.getContext('2d'), cx = 18, cy = 24;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20);
    ctx.quadraticCurveTo(cx + 14, cy - 10, cx + 12, cy + 8);
    ctx.lineTo(cx + 8, cy + 20);
    ctx.lineTo(cx - 8, cy + 20);
    ctx.lineTo(cx - 12, cy + 8);
    ctx.quadraticCurveTo(cx - 14, cy - 10, cx, cy - 20);
    ctx.closePath();
    outlineAndFill(ctx, dark, '#111', 2);
    // Wave line down center
    ctx.strokeStyle = accent + '66'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = -16; y <= 16; y += 1) {
        const px = cx + Math.sin(y * 0.5) * 4;
        if (y === -16) ctx.moveTo(px, cy + y); else ctx.lineTo(px, cy + y);
    }
    ctx.stroke();
    // Barrel
    ctx.fillStyle = '#335566'; ctx.beginPath();
    ctx.roundRect(cx - 3, cy - 24, 6, 8, 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
    sprites['mboss14_arm'] = cv;

}

export function createMiniBossShield(dark, accent, sprites) {

    const cv = _mkCanvas(77, 30), ctx = cv.getContext('2d');
    ctx.beginPath(); ctx.roundRect(6, 6, 65, 18, 3);
    outlineAndFill(ctx, dark, '#111', 2);
    // Standing wave pattern on shield
    ctx.strokeStyle = accent + '88'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 10; x <= 67; x += 1) {
        const py = 15 + Math.sin(x * 0.2) * 4;
        if (x === 10) ctx.moveTo(x, py); else ctx.lineTo(x, py);
    }
    ctx.stroke();
    sprites['mboss14_shield'] = cv;

}

export function generateMiniBossCore(color, dark, accent, sprites) {

    const S = 74, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 30;
    // Standing-wave aura
    ctx.strokeStyle = color + '22'; ctx.lineWidth = 1;
    for (let i = 3; i >= 1; i--) {
        ctx.beginPath(); ctx.arc(cx, cy, r + i * 4, 0, Math.PI * 2); ctx.stroke();
    }
    // Diamond-square body (strange geometry)
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.7, cy - r * 0.35);
    ctx.lineTo(cx + r, cy + r * 0.1);
    ctx.lineTo(cx + r * 0.6, cy + r * 0.75);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.6, cy + r * 0.75);
    ctx.lineTo(cx - r, cy + r * 0.1);
    ctx.lineTo(cx - r * 0.7, cy - r * 0.35);
    ctx.closePath();
    outlineAndFill(ctx, color, '#111', 2.5);
    // Oscillation wave pattern
    ctx.strokeStyle = dark + '55'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let x = -r * 0.7; x <= r * 0.7; x += 1) {
            const py = cy - 10 + i * 10 + Math.sin(x * 0.3 + i * 1.5) * 3;
            if (x === -r * 0.7) ctx.moveTo(cx + x, py); else ctx.lineTo(cx + x, py);
        }
        ctx.stroke();
    }
    // Hypnotic concentric-ring eyes
    for (const sx of [-1, 1]) {
        const ex = cx + sx * 9, ey = cy - 5;
        // Outer socket
        ctx.fillStyle = '#0a2233'; ctx.beginPath();
        ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        // Concentric rings
        ctx.strokeStyle = accent; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.stroke();
        // Center dot
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // "~" oscillation mouth
    ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 9);
    for (let x = -8; x <= 8; x += 1) {
        ctx.lineTo(cx + x, cy + 9 + Math.sin(x * 0.6) * 2.5);
    }
    ctx.stroke();
    // "s" strange marking
    ctx.fillStyle = accent + '55'; ctx.font = 'italic 9px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('s', cx, cy - r * 0.6);
    drawHighlight(ctx, cx - 14, cy - r * 0.8, 28, 10, 0.12);
    sprites['mboss14_core'] = cv;

}

export function createTurret2(accent, dark, sprites) {

    const S = 30, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    outlineAndFill(ctx, accent, '#111', 2);
    _drawPartEye(ctx, cx, cy + 1, 4, '#ffaa00');
    // Barrel
    ctx.fillStyle = dark; ctx.beginPath();
    ctx.roundRect(cx - 2.5, cy - 14, 5, 8, 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.stroke();
    sprites['mboss15_turret'] = cv;

}

export function createMiniBossShield2(dark, accent, sprites) {

    const cv = _mkCanvas(42, 28), ctx = cv.getContext('2d');
    ctx.beginPath(); ctx.roundRect(6, 6, 30, 16, 3);
    outlineAndFill(ctx, dark, '#111', 2);
    // Harmonic wave
    ctx.strokeStyle = accent + '88'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 9; x <= 33; x += 1) {
        const py = 14 + Math.sin(x * 0.4) * 3;
        if (x === 9) ctx.moveTo(x, py); else ctx.lineTo(x, py);
    }
    ctx.stroke();
    sprites['mboss15_shield'] = cv;

}

export function generateMiniBossCore2(color, dark, accent, sprites) {

    const S = 66, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 26;
    // Resonance halo
    ctx.strokeStyle = color + '15'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = color + '10'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.stroke();
    // Octagonal body — resonator chamber
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i - Math.PI / 8;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    outlineAndFill(ctx, color, '#111', 2.5);
    // Inner resonance pattern — concentric pentagons
    ctx.strokeStyle = dark + '44'; ctx.lineWidth = 0.7;
    for (let ring = 2; ring >= 1; ring--) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
            const pr = r * 0.3 * ring;
            const px = cx + pr * Math.cos(a), py = cy + pr * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
    }
    // Stern, focused eyes — resonator precision
    for (const sx of [-1, 1]) {
        const ex = cx + sx * 8, ey = cy - 4;
        ctx.fillStyle = '#222200'; ctx.beginPath();
        ctx.ellipse(ex, ey, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        // Target-reticle iris
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#664400'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(ex - 3, ey); ctx.lineTo(ex + 3, ey); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex, ey - 3); ctx.lineTo(ex, ey + 3); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, 1, 0, Math.PI * 2); ctx.fill();
        // Flat heavy brow
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ex - sx * 6, ey - 5.5); ctx.lineTo(ex + sx * 4, ey - 5); ctx.stroke();
    }
    // Firm clenched mouth
    ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 6, cy + 9); ctx.lineTo(cx + 6, cy + 9); ctx.stroke();
    // "t" top marking
    ctx.fillStyle = accent + '55'; ctx.font = 'italic 8px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('t', cx, cy + 17);
    drawHighlight(ctx, cx - 10, cy - r * 0.7, 20, 8, 0.12);
    sprites['mboss15_core'] = cv;

}

export function createMiniBossTurret3(accent, dark, sprites) {

    const S = 28, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    outlineAndFill(ctx, accent, '#111', 2);
    _drawPartEye(ctx, cx, cy + 1, 3.5, '#66cc22');
    // Barrel
    ctx.fillStyle = dark; ctx.beginPath();
    ctx.roundRect(cx - 2.5, cy - 12, 5, 7, 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
    sprites['mboss16_turret'] = cv;

}

export function createMiniBossPod(dark, accent, sprites) {

    const cv = _mkCanvas(36, 46), ctx = cv.getContext('2d'), cx = 18, cy = 23;
    // Rounded pod shape
    ctx.beginPath();
    ctx.ellipse(cx, cy, 12, 18, 0, 0, Math.PI * 2);
    outlineAndFill(ctx, dark, '#111', 2);
    // Inner crack
    ctx.strokeStyle = accent + '55'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 2, cy);
    ctx.lineTo(cx - 1, cy + 10); ctx.stroke();
    // Tiny scared face
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 3, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
    // "O" surprised mouth
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy + 4, 2.5, 0, Math.PI * 2); ctx.stroke();
    sprites['mboss16_pod'] = cv;

}

export function createMiniBossAura(color, accent, dark, sprites) {

    const S = 71, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 28;
    // Decay particle cloud aura
    ctx.save(); ctx.globalAlpha = 0.08;
    for (let i = 0; i < 8; i++) {
        const angle = Math.PI * 2 * (i / 8);
        const dist = r * 0.9 + (i % 3) * 3;
        ctx.fillStyle = i % 2 === 0 ? color : accent;
        ctx.beginPath(); ctx.arc(cx + dist * Math.cos(angle), cy + dist * Math.sin(angle), 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // Slightly oblong body with visible crack line
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.85, 0, 0, Math.PI * 2);
    outlineAndFill(ctx, color, '#111', 2.5);
    // Central division crack — the split line
    ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.75);
    ctx.lineTo(cx + 2, cy - r * 0.3);
    ctx.lineTo(cx - 1, cy + r * 0.1);
    ctx.lineTo(cx + 1, cy + r * 0.5);
    ctx.lineTo(cx, cy + r * 0.8);
    ctx.stroke();
    // Branch cracks
    ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(cx + 2, cy - r * 0.3); ctx.lineTo(cx + 10, cy - r * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 1, cy + r * 0.1); ctx.lineTo(cx - 8, cy + r * 0.2); ctx.stroke();
    // Asymmetric nervous eyes — left eye bigger, right eye smaller (unstable!)
    {
        const ex = cx - 9, ey = cy - 5;
        ctx.fillStyle = '#112211'; ctx.beginPath();
        ctx.ellipse(ex, ey, 6, 5, -0.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#ccff88'; ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + 1, ey, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 1, ey - 1.5, 0.8, 0, Math.PI * 2); ctx.fill();
    }
    {
        const ex = cx + 9, ey = cy - 4;
        ctx.fillStyle = '#112211'; ctx.beginPath();
        ctx.ellipse(ex, ey, 4.5, 3.5, 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#aaddaa'; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Worried/strained mouth
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 8);
    ctx.quadraticCurveTo(cx - 3, cy + 12, cx, cy + 8);
    ctx.quadraticCurveTo(cx + 3, cy + 12, cx + 7, cy + 8);
    ctx.stroke();
    // "b" bottom marking
    ctx.fillStyle = accent + '44'; ctx.font = 'italic 8px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('b', cx, cy + 18);
    drawHighlight(ctx, cx - 12, cy - r * 0.7, 24, 10, 0.12);
    sprites['mboss16_core'] = cv;
}

