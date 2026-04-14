
import { _mkCanvas, outlineAndFill, drawHighlight, _drawPartEye } from '../../Helper.js';
import { C_WHITE, C_MEDIUM_BLUE, C_VIVID_PURPLE } from '../../../../entities/LevelsThemes.js';

export function generateBoss24ArmSprite(sprites) {

    const cv = _mkCanvas(64, 84), ctx = cv.getContext('2d'), cx = 32, cy = 42;
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 38); ctx.lineTo(cx + 16, cy - 38);
    ctx.lineTo(cx + 20, cy - 26); ctx.lineTo(cx + 18, cy + 28);
    ctx.lineTo(cx + 22, cy + 40); ctx.lineTo(cx - 22, cy + 40);
    ctx.lineTo(cx - 18, cy + 28); ctx.lineTo(cx - 20, cy - 26);
    ctx.closePath();
    const dark = '#223388';
    outlineAndFill(ctx, dark, '#111', 3);
    // 4-force colored bands
    const bandColors = ['#ff4444', '#44ddff', '#cc66ff', '#44ff88'];
    ctx.save(); ctx.shadowBlur = 3;
    for (let i = 0; i < 4; i++) {
        const by = cy - 26 + i * 16;
        ctx.shadowColor = bandColors[i]; ctx.strokeStyle = bandColors[i]; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(cx, by, 18 + (i % 2), 4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    // Central light beam
    ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy - 36); ctx.lineTo(cx, cy + 38); ctx.stroke();
    sprites['boss24_arm'] = cv;

}

export function generateBoss24WeakpointSprite(sprites) {

    const S = 40, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
    g.addColorStop(0, C_WHITE); g.addColorStop(0.3, '#ffdd88'); g.addColorStop(0.7, '#ff8844'); g.addColorStop(1, '#442200');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Crack lines
    ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 4, cy - 10); ctx.lineTo(cx + 2, cy); ctx.lineTo(cx - 2, cy + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 6, cy - 8); ctx.lineTo(cx + 2, cy); ctx.stroke();
    // Pulsing center
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    sprites['boss24_weak'] = cv;

}

export function generateBoss24ShieldSpriteLarge(sprites) {

    const cv = _mkCanvas(48, 32), ctx = cv.getContext('2d'), cx = 24, cy = 16;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + 16 * Math.cos(a), py = cy + 10 * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const dark = '#223388', accent = '#88bbff';
    outlineAndFill(ctx, dark, '#111', 2);
    const ng = ctx.createRadialGradient(cx, cy, 1, cx, cy, 12);
    ng.addColorStop(0, accent); ng.addColorStop(1, dark);
    ctx.fillStyle = ng; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    sprites['boss24_shield2'] = cv;

}

export function generateBoss24ShieldSprite(sprites) {

    const cv = _mkCanvas(152, 38), ctx = cv.getContext('2d');
    ctx.beginPath(); ctx.roundRect(6, 6, 140, 26, 5);
    outlineAndFill(ctx, C_WHITE, '#111', 2.5);
    // Rainbow prismatic shimmer
    const sg = ctx.createLinearGradient(8, 19, 144, 19);
    sg.addColorStop(0, '#ff444466'); sg.addColorStop(0.25, '#44ddff66');
    sg.addColorStop(0.5, '#cc66ff66'); sg.addColorStop(0.75, '#44ff8866');
    sg.addColorStop(1, '#ffdd4466');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.roundRect(8, 8, 136, 22, 4); ctx.fill();
    // Star accents
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = '#ffffff44'; ctx.beginPath();
        ctx.arc(22 + i * 26, 19, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    sprites['boss24_shield'] = cv;

}

export function generateBoss24InnerSprite(sprites) {

    const S = 36, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
    const accent = '#88bbff', dark = '#223388';
    g.addColorStop(0, C_WHITE); g.addColorStop(0.4, accent); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Tiny face
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - 3, cy - 2, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 3, cy - 2, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy + 2, 2, 0.2, Math.PI - 0.2); ctx.stroke();
    sprites['boss24_inner'] = cv;

}

export function generateBoss24GluonSprite(sprites) {

    const S = 44, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 13);
    g.addColorStop(0, C_WHITE); g.addColorStop(0.3, '#44ff88'); g.addColorStop(1, '#003311');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Triple gluon lines
    ctx.lineWidth = 1;
    const gColors = ['#ff444466', '#44ff4466', '#4444ff66'];
    for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = gColors[i];
        const a = (Math.PI * 2 / 3) * i;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx + 10 * Math.cos(a + 0.3), cy + 10 * Math.sin(a + 0.3),
            cx + 11 * Math.cos(a), cy + 11 * Math.sin(a));
        ctx.stroke();
    }
    sprites['boss24_strong'] = cv;

}

export function generateWeakTurretSprite(sprites) {

    const S = 44, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 13);
    g.addColorStop(0, '#ffccff'); g.addColorStop(0.3, '#cc66ff'); g.addColorStop(1, '#330033');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Decay spiral
    ctx.strokeStyle = '#ff88ff55'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3; a += 0.2) {
        const sr = 2 + a * 3; if (sr > 11) break;
        const px = cx + sr * Math.cos(a), py = cy + sr * Math.sin(a);
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    sprites['boss24_weak'] = cv;

}

export function generateBoss24EMSprite(sprites) {

    const S = 44, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 13);
    g.addColorStop(0, C_WHITE); g.addColorStop(0.3, '#44ddff'); g.addColorStop(1, '#003366');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Lightning cross
    ctx.strokeStyle = '#88eeffaa'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 3, cy - 2); ctx.lineTo(cx + 3, cy + 2); ctx.lineTo(cx + 10, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 2, cy - 3); ctx.lineTo(cx + 2, cy + 3); ctx.lineTo(cx, cy + 10); ctx.stroke();
    sprites['boss24_em'] = cv;

}

export function generateBoss24GravitySprite(sprites) {

    const S = 44, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    // Gravity well
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
    g.addColorStop(0, '#000000'); g.addColorStop(0.4, '#331111'); g.addColorStop(0.8, '#ff4444'); g.addColorStop(1, '#ff444400');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Warped space rings
    ctx.strokeStyle = '#ff444455'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(cx, cy, 12, 4, 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, 4, 12, 0.3, 0, Math.PI * 2); ctx.stroke();
    sprites['boss24_gravity'] = cv;

}

export function generateBoss24CoreSprite(sprites) {

    const S = 120, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 50;
    // Grand prismatic aura
    const aura = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.2);
    aura.addColorStop(0, '#ffffff00');
    aura.addColorStop(0.4, '#ffffff08');
    aura.addColorStop(0.7, '#aabbff10');
    aura.addColorStop(1, '#ffffff00');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2); ctx.fill();
    // 12-sided dodecagonal body
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
        const a = (Math.PI / 6) * i - Math.PI / 12;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    // Iridescent gradient fill
    const bg = ctx.createRadialGradient(cx - 10, cy - 10, 5, cx, cy, r);
    bg.addColorStop(0, C_WHITE); bg.addColorStop(0.3, '#eeeeff');
    bg.addColorStop(0.6, '#ccccee'); bg.addColorStop(1, '#9999bb');
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3.5; ctx.stroke();
    // 4-force mandala rings — one per force
    const forceColors = ['#ff4444', '#44ddff', '#cc66ff', '#44ff88'];
    ctx.save(); ctx.globalAlpha = 0.2;
    for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = forceColors[i]; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 0.65, r * 0.22, (Math.PI / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
    // Inner sacred geometry — interlocking triangles
    ctx.strokeStyle = '#88889955'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        for (let j = 0; j < 3; j++) {
            const a = (Math.PI * 2 / 3) * j + i * Math.PI / 3 - Math.PI / 2;
            const px = cx + r * 0.45 * Math.cos(a), py = cy + r * 0.45 * Math.sin(a);
            if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
    }
    // All-seeing central eye — large, ornate
    {
        // Eye shape (almond)
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 3);
        ctx.quadraticCurveTo(cx, cy - 12, cx + 16, cy - 3);
        ctx.quadraticCurveTo(cx, cy + 6, cx - 16, cy - 3);
        ctx.closePath();
        ctx.fillStyle = '#f8f8ff'; ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
        // Iris — prismatic
        const ig = ctx.createRadialGradient(cx, cy - 2, 0, cx, cy - 2, 7);
        ig.addColorStop(0, C_WHITE);
        ig.addColorStop(0.2, '#ffdd44');
        ig.addColorStop(0.4, '#44ddff');
        ig.addColorStop(0.6, '#ff44ff');
        ig.addColorStop(0.8, '#44ff88');
        ig.addColorStop(1, '#333344');
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(cx, cy - 2, 6, 0, Math.PI * 2); ctx.fill();
        // Pupil
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
        // Glint
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - 2, cy - 4, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Serene expression — subtle mouth arc below
    ctx.strokeStyle = '#777799'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 14);
    ctx.quadraticCurveTo(cx, cy + 12, cx + 10, cy + 14);
    ctx.stroke();
    // Four force sigils below the eye (tiny colored marks)
    const sigX = [-12, -4, 4, 12];
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = forceColors[i]; ctx.beginPath();
        ctx.arc(cx + sigX[i], cy + 20, 2, 0, Math.PI * 2); ctx.fill();
    }
    drawHighlight(ctx, cx - 28, cy - r * 0.85, 56, 22, 0.12);
    sprites['boss24_core'] = cv;

}

export function generateBoss23ArmGraphics(sprites) {

    const cv = _mkCanvas(58, 78), ctx = cv.getContext('2d'), cx = 29, cy = 39;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 36); ctx.lineTo(cx + 14, cy - 36);
    ctx.lineTo(cx + 18, cy - 24); ctx.lineTo(cx + 16, cy + 26);
    ctx.lineTo(cx + 20, cy + 36); ctx.lineTo(cx - 20, cy + 36);
    ctx.lineTo(cx - 16, cy + 26); ctx.lineTo(cx - 18, cy - 24);
    ctx.closePath();
    // Left half matter blue, right half antimatter purple
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#223388'; ctx.fillRect(0, 0, cx, 78);
    ctx.fillStyle = '#552288'; ctx.fillRect(cx, 0, 29, 78);
    ctx.restore();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.stroke();
    // Central spiral energy
    ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = -32; y <= 32; y += 1) {
        const px = cx + Math.sin(y * 0.3) * 8;
        if (y === -32) ctx.moveTo(px, cy + y); else ctx.lineTo(px, cy + y);
    }
    ctx.stroke();
    sprites['boss23_arm'] = cv;

}

export function generateBoss23Shield(sprites) {

    const cv = _mkCanvas(142, 36), ctx = cv.getContext('2d');
    ctx.beginPath(); ctx.roundRect(6, 6, 130, 24, 5);
    outlineAndFill(ctx, '#332255', '#111', 2.5);
    // Split gradient
    const sg = ctx.createLinearGradient(6, 18, 136, 18);
    sg.addColorStop(0, '#4488ff88'); sg.addColorStop(0.45, '#88bbff44');
    sg.addColorStop(0.55, '#dd88ff44'); sg.addColorStop(1, '#cc44ff88');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.roundRect(8, 8, 126, 20, 4); ctx.fill();
    // Annihilation line in center
    ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 4;
    ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(71, 8); ctx.lineTo(71, 28); ctx.stroke();
    ctx.restore();
    sprites['boss23_shield'] = cv;

}

export function generateBoss23TurretA(sprites) {

    const S = 40, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    // Spiky body
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
        const a = (Math.PI * 2 / 7) * i - Math.PI / 2;
        const pr = i % 2 === 0 ? 14 : 9;
        const px = cx + pr * Math.cos(a), py = cy + pr * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    outlineAndFill(ctx, C_VIVID_PURPLE, '#111', 2);
    _drawPartEye(ctx, cx, cy, 4.5, '#dd88ff');
    ctx.fillStyle = '#552288'; ctx.beginPath();
    ctx.roundRect(cx - 3, cy - 18, 6, 8, 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
    sprites['boss23_turret_a'] = cv;

}

export function generateBoss23TurretMiddle(sprites) {

    const S = 40, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14); ctx.lineTo(cx + 12, cy - 4);
    ctx.lineTo(cx + 10, cy + 12); ctx.lineTo(cx - 10, cy + 12);
    ctx.lineTo(cx - 12, cy - 4); ctx.closePath();
    outlineAndFill(ctx, C_MEDIUM_BLUE, '#111', 2);
    _drawPartEye(ctx, cx, cy - 1, 4.5, '#88bbff');
    ctx.fillStyle = '#223388'; ctx.beginPath();
    ctx.roundRect(cx - 3, cy - 18, 6, 8, 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
    sprites['boss23_turret_m'] = cv;

}

export function generateAntimatterBossBody(sprites) {

    const color = C_VIVID_PURPLE, accent = '#dd88ff', dark = '#552288';
    const S = 75, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 30;
    // Jagged antimatter body — inverted hexagon with spikes
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6; // offset from matter
        const pr = i % 2 === 0 ? r : r * 0.78;
        const px = cx + pr * Math.cos(a), py = cy + pr * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    outlineAndFill(ctx, color, '#111', 3);
    // Chaotic inner cracks
    ctx.strokeStyle = dark + '88'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 8, cy - 12); ctx.lineTo(cx + 5, cy + 3); ctx.lineTo(cx - 3, cy + 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 10, cy - 8); ctx.lineTo(cx - 4, cy + 6); ctx.stroke();
    // Wild, asymmetric eyes
    {
        const ex = cx - 9, ey = cy - 4;
        ctx.fillStyle = '#1a001a'; ctx.beginPath();
        ctx.ellipse(ex, ey, 5.5, 4.5, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#ff44ff'; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 1, ey - 1, 0.7, 0, Math.PI * 2); ctx.fill();
    }
    {
        const ex = cx + 9, ey = cy - 6; // asymmetric!
        ctx.fillStyle = '#1a001a'; ctx.beginPath();
        ctx.ellipse(ex, ey, 6, 3.5, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#ff88ff'; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + 0.5, ey, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Maniacal grin
    ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 8);
    ctx.quadraticCurveTo(cx - 3, cy + 14, cx, cy + 10);
    ctx.quadraticCurveTo(cx + 3, cy + 14, cx + 10, cy + 8);
    ctx.stroke();
    // "-" antimatter symbol
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 5, cy - r * 0.52); ctx.lineTo(cx + 5, cy - r * 0.52); ctx.stroke();
    drawHighlight(ctx, cx - 14, cy - r * 0.8, 28, 12, 0.1);
    sprites['boss23_anti'] = cv;

}

export function generateMatterBossSprites(sprites) {

    const color = C_MEDIUM_BLUE, accent = '#88bbff', dark = '#223388';
    const S = 75, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 30;
    // Stable crystalline body
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    outlineAndFill(ctx, color, '#111', 3);
    // Inner structure lines
    ctx.strokeStyle = dark + '66'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r * 0.6 * Math.cos(a), cy + r * 0.6 * Math.sin(a)); ctx.stroke();
    }
    // Calm, wise eyes
    for (const sx of [-1, 1]) {
        const ex = cx + sx * 9, ey = cy - 4;
        ctx.fillStyle = '#eeeeff'; ctx.beginPath();
        ctx.ellipse(ex, ey, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.stroke();
        const ig = ctx.createRadialGradient(ex, ey, 0, ex, ey, 3);
        ig.addColorStop(0, '#aaddff'); ig.addColorStop(1, '#224488');
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex, ey, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 1, ey - 1, 0.8, 0, Math.PI * 2); ctx.fill();
    }
    // Determined mouth
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 7, cy + 10); ctx.lineTo(cx + 7, cy + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 6, cy + 11.5); ctx.lineTo(cx + 6, cy + 11.5); ctx.stroke();
    // "+" matter symbol on forehead
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.65); ctx.lineTo(cx, cy - r * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, cy - r * 0.52); ctx.lineTo(cx + 5, cy - r * 0.52); ctx.stroke();
    drawHighlight(ctx, cx - 14, cy - r * 0.8, 28, 12, 0.12);
    sprites['boss23_matter'] = cv;

}

export function createBossArm(dark, sprites) {
    const cv = _mkCanvas(56, 78), ctx = cv.getContext('2d'), cx = 28, cy = 39;
    // Flux tube body (tapered)
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 36); ctx.lineTo(cx + 10, cy - 36);
    ctx.quadraticCurveTo(cx + 20, cy, cx + 14, cy + 36);
    ctx.lineTo(cx - 14, cy + 36);
    ctx.quadraticCurveTo(cx - 20, cy, cx - 10, cy - 36);
    ctx.closePath();
    outlineAndFill(ctx, dark, '#111', 2.5);
    // Color flow lines
    const colors = ['#ff444455', '#44ff4455', '#4444ff55'];
    for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = colors[i]; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let y = -32; y <= 32; y += 1) {
            const px = cx + Math.sin(y * 0.4 + i * 2.1) * (5 + i * 2);
            if (y === -32) ctx.moveTo(px, cy + y); else ctx.lineTo(px, cy + y);
        }
        ctx.stroke();
    }
    sprites['boss21_arm'] = cv;
}

export function createBossChargeOrb(accent, color, dark, sprites) {
    const S = 34, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
    cg.addColorStop(0, C_WHITE); cg.addColorStop(0.2, accent);
    cg.addColorStop(0.6, color); cg.addColorStop(1, dark);
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Tiny quarky face
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx - 3, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 3, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy + 3, 2, 0, Math.PI); ctx.stroke();
    sprites['boss21_charge'] = cv;
}

export function createBossAura(color, dark, sprites) {
    const S = 105, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 42;
    // Triple-layered color charge aura
    ctx.save(); ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ff3333'; ctx.beginPath(); ctx.arc(cx - 6, cy - 3, r * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#33ff33'; ctx.beginPath(); ctx.arc(cx + 6, cy - 3, r * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3333ff'; ctx.beginPath(); ctx.arc(cx, cy + 6, r * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Decagonal body
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const pr = i % 2 === 0 ? r : r * 0.85;
        const px = cx + pr * Math.cos(a), py = cy + pr * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    outlineAndFill(ctx, color, '#111', 3);
    // Inner hexagonal lattice pattern
    ctx.strokeStyle = dark + '55'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r * 0.7 * Math.cos(a), cy + r * 0.7 * Math.sin(a));
        ctx.stroke();
    }
    // Three compound eyes (RGB positions) — the gluon overlord sees all color charges
    const eyeData = [
        { x: cx - 13, y: cy - 10, iris: '#ff4444', brow: -0.3 },
        { x: cx + 13, y: cy - 10, iris: '#4444ff', brow: 0.3 },
        { x: cx, y: cy + 6, iris: '#44ff44', brow: 0 }
    ];
    for (const e of eyeData) {
        // Eye socket
        ctx.fillStyle = '#0a1a0a'; ctx.beginPath();
        ctx.ellipse(e.x, e.y, 6, 5, e.brow * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.stroke();
        // Iris ring
        const ig = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, 4);
        ig.addColorStop(0, C_WHITE); ig.addColorStop(0.3, e.iris); ig.addColorStop(1, '#000');
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(e.x, e.y, 3.8, 0, Math.PI * 2); ctx.fill();
        // Pupil
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.x, e.y, 1.5, 0, Math.PI * 2); ctx.fill();
        // Glint
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x - 1, e.y - 1.5, 0.9, 0, Math.PI * 2); ctx.fill();
        // Brow ridge
        if (e.brow !== 0) {
            ctx.strokeStyle = dark; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(e.x - 7 * Math.sign(e.brow), e.y - 7);
            ctx.lineTo(e.x + 4 * Math.sign(e.brow), e.y - 5.5);
            ctx.stroke();
        }
    }
    // Stern triangular mouth
    ctx.fillStyle = '#0a1a0a';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 16); ctx.lineTo(cx + 10, cy + 16);
    ctx.lineTo(cx, cy + 22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
    drawHighlight(ctx, cx - 22, cy - r * 0.85, 44, 18, 0.1);
    sprites['boss21_core'] = cv;
}

export function createBoss19ArmSprite(sprites) {

    const cv = _mkCanvas(50, 68), ctx = cv.getContext('2d'), cx = 25, cy = 34;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.quadraticCurveTo(cx + 20, cy - 15, cx + 16, cy + 10);
    ctx.lineTo(cx + 12, cy + 30);
    ctx.lineTo(cx - 12, cy + 30);
    ctx.lineTo(cx - 16, cy + 10);
    ctx.quadraticCurveTo(cx - 20, cy - 15, cx, cy - 30);
    ctx.closePath();
    outlineAndFill(ctx, '#662244', '#111', 2.5);
    // Feynman diagram wavy lines
    ctx.strokeStyle = '#ff558855'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const sy = cy - 20 + i * 16;
        for (let x = -10; x <= 10; x += 1) {
            const px = cx + x, py = sy + Math.sin(x * 0.8) * 3;
            if (x === -10) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    sprites['boss19_arm'] = cv;

}

export function createGluonSprite(sprites) {

    const S = 30, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    // Swirling figure-8 knot
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 11);
    g.addColorStop(0, C_WHITE); g.addColorStop(0.3, '#ffdd44'); g.addColorStop(1, '#885500');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Inner coil lines
    ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 2; t += 0.15) {
        const rr = 6 * Math.sin(t * 2);
        const px = cx + rr * Math.cos(t), py = cy + rr * Math.sin(t);
        if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Central dot
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
    sprites['boss19_gluon'] = cv;

}

export function generateQuarkCoreSprites(sprites) {
    function _quarkCore(spriteKey, fill, iris, accent, dark, expression) {
        const S = 60, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 24;
        // Probability-cloud aura
        const aura = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.15);
        aura.addColorStop(0, fill + '00'); aura.addColorStop(0.55, fill + '22');
        aura.addColorStop(0.85, fill + '11'); aura.addColorStop(1, fill + '00');
        ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2); ctx.fill();
        // Body — rounded triangle (quark 3-ness)
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
            const nx = cx + r * Math.cos(a + Math.PI * 2 / 3), ny = cy + r * Math.sin(a + Math.PI * 2 / 3);
            if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
            ctx.quadraticCurveTo(cx + r * 1.15 * Math.cos((a + a + Math.PI * 2 / 3) / 2),
                cy + r * 1.15 * Math.sin((a + a + Math.PI * 2 / 3) / 2), nx, ny);
        }
        ctx.closePath();
        outlineAndFill(ctx, fill, '#111', 2.5);
        // Inner glow ring
        ctx.strokeStyle = accent + '66'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.stroke();
        // Expression-based face
        if (expression === 'angry') {
            // Narrowed angry eyes
            for (const sx of [-1, 1]) {
                const ex = cx + sx * 7, ey = cy - 3;
                ctx.fillStyle = '#111'; ctx.beginPath();
                ctx.ellipse(ex, ey, 4.5, 3, sx * 0.15, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = iris; ctx.beginPath();
                ctx.ellipse(ex + sx * 0.5, ey + 0.5, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + sx * 0.5, ey + 0.5, 1, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - sx * 1, ey - 1, 0.8, 0, Math.PI * 2); ctx.fill();
                // Angry brow
                ctx.strokeStyle = dark; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(ex - sx * 5, ey - 5); ctx.lineTo(ex + sx * 2, ey - 3.5); ctx.stroke();
            }
            // Snarl mouth
            ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(cx - 6, cy + 8); ctx.quadraticCurveTo(cx, cy + 5, cx + 6, cy + 8); ctx.stroke();
        } else if (expression === 'cunning') {
            // Sly half-closed eyes
            for (const sx of [-1, 1]) {
                const ex = cx + sx * 7, ey = cy - 2;
                ctx.fillStyle = '#111'; ctx.beginPath();
                ctx.ellipse(ex, ey, 4, 2.2, sx * 0.2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = iris; ctx.beginPath();
                ctx.ellipse(ex + sx * 1, ey + 0.5, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - sx * 0.5, ey - 0.8, 0.7, 0, Math.PI * 2); ctx.fill();
            }
            // Sly grin
            ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(cx - 7, cy + 7); ctx.quadraticCurveTo(cx, cy + 11, cx + 7, cy + 6); ctx.stroke();
        } else { // 'cold'
            // Vertical slit eyes
            for (const sx of [-1, 1]) {
                const ex = cx + sx * 7, ey = cy - 2;
                ctx.fillStyle = iris; ctx.beginPath();
                ctx.ellipse(ex, ey, 2.5, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.fillStyle = '#000'; ctx.beginPath();
                ctx.ellipse(ex, ey, 1, 3.5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 0.8, ey - 2, 0.8, 0, Math.PI * 2); ctx.fill();
            }
            // Thin flat mouth
            ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(cx - 5, cy + 8); ctx.lineTo(cx + 5, cy + 8); ctx.stroke();
        }
        drawHighlight(ctx, cx - 10, cy - r * 0.8, 20, 8, 0.14);
        sprites[spriteKey] = cv;
    }
    _quarkCore('boss19_core_r', '#dd2244', '#ff6688', '#ff4466', '#881122', 'angry');
    _quarkCore('boss19_core_g', '#22bb44', '#66ff88', '#44dd66', '#116622', 'cunning');
    _quarkCore('boss19_core_b', '#2244dd', '#6688ff', '#4466ff', '#112288', 'cold');
}

export function createBossArmCanvas(dark, accent, sprites) {

    const cv = _mkCanvas(54, 72), ctx = cv.getContext('2d'), cx = 27, cy = 36;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 32); ctx.lineTo(cx + 14, cy - 32);
    ctx.lineTo(cx + 17, cy - 20); ctx.lineTo(cx + 15, cy + 25);
    ctx.lineTo(cx + 19, cy + 34); ctx.lineTo(cx - 19, cy + 34);
    ctx.lineTo(cx - 15, cy + 25); ctx.lineTo(cx - 17, cy - 20);
    ctx.closePath();
    outlineAndFill(ctx, dark, '#111', 2.5);
    // Photon wiggly lines
    ctx.strokeStyle = '#44ddff55'; ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        for (let y = -28; y <= 30; y += 1) {
            const px = cx + Math.sin(y * 0.5 + i * 2) * (6 + i * 3);
            if (y === -28) ctx.moveTo(px, cy + y); else ctx.lineTo(px, cy + y);
        }
        ctx.stroke();
    }
    // Central power line
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy + 32); ctx.stroke();
    sprites['boss20_arm'] = cv;

}

export function createBoss20Shield(accent, sprites) {

    const cv = _mkCanvas(122, 34), ctx = cv.getContext('2d');
    ctx.beginPath(); ctx.roundRect(6, 6, 110, 22, 4);
    outlineAndFill(ctx, '#554400', '#111', 2.5);
    // EM/Weak gradient fill
    const sg = ctx.createLinearGradient(6, 17, 116, 17);
    sg.addColorStop(0, '#44ddff44'); sg.addColorStop(0.5, '#ffaa2244'); sg.addColorStop(1, '#cc66ff44');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.roundRect(8, 8, 106, 18, 3); ctx.fill();
    // Phase boundary dashes
    ctx.setLineDash([4, 4]); ctx.strokeStyle = accent + '88'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(12, 17); ctx.lineTo(108, 17); ctx.stroke();
    ctx.setLineDash([]);
    sprites['boss20_shield'] = cv;

}

export function generateBoss20WeakTurret(sprites) {

    const S = 44, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 15);
    g.addColorStop(0, '#ffaaff'); g.addColorStop(0.4, '#9933cc'); g.addColorStop(1, '#330044');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // W/Z boson rings
    ctx.strokeStyle = '#cc66ff66'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(cx, cy, 10, 5, 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, 5, 10, -0.5, 0, Math.PI * 2); ctx.stroke();
    // Soft inner eye
    ctx.fillStyle = '#ffccff'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#440044'; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
    sprites['boss20_weak'] = cv;

}

export function generateBoss20EMEffect(sprites) {

    const S = 42, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 13);
    g.addColorStop(0, C_WHITE); g.addColorStop(0.3, '#44ddff'); g.addColorStop(1, '#0055aa');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Lightning tendrils
    ctx.strokeStyle = '#88eeff'; ctx.lineWidth = 1;
    const bolts = [[0, -1], [0.87, 0.5], [-0.87, 0.5], [0.87, -0.5], [-0.87, -0.5]];
    for (const [dx, dy] of bolts) {
        ctx.beginPath(); ctx.moveTo(cx, cy);
        let bx = cx, by = cy;
        for (let j = 0; j < 3; j++) {
            bx += dx * 4 + (Math.random() - 0.5) * 3;
            by += dy * 4 + (Math.random() - 0.5) * 3;
            ctx.lineTo(bx, by);
        }
        ctx.stroke();
    }
    // Central flash
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    sprites['boss20_em'] = cv;

}

export function createBossCoreSprites(sprites) {
    const color = '#ffaa22', accent = '#ffdd66', dark = '#885500';
    // Core (80x80 → 100x100) — Dual-nature face: left EM / right Weak

    const S = 100, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 40;
    // Outer glow
    const aura = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.1);
    aura.addColorStop(0, '#ffcc4400'); aura.addColorStop(0.7, '#ffcc4418');
    aura.addColorStop(1, '#ffcc4400');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
    // Octagonal body
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i - Math.PI / 8;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    outlineAndFill(ctx, color, '#111', 3);
    // Dividing line (duality split)
    ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.8); ctx.lineTo(cx, cy + r * 0.8); ctx.stroke();
    // Left side: EM eye — sharp, electric, lightning iris
    {
        const ex = cx - 12, ey = cy - 6;
        ctx.fillStyle = '#111'; ctx.beginPath();
        ctx.moveTo(ex - 7, ey); ctx.quadraticCurveTo(ex, ey - 5, ex + 7, ey);
        ctx.quadraticCurveTo(ex, ey + 5, ex - 7, ey); ctx.fill();
        // Lightning-bolt iris
        ctx.fillStyle = '#44ddff'; ctx.beginPath();
        ctx.moveTo(ex - 1, ey - 3); ctx.lineTo(ex + 2, ey - 0.5);
        ctx.lineTo(ex - 0.5, ey + 0.5); ctx.lineTo(ex + 1, ey + 3);
        ctx.lineTo(ex - 2, ey + 0.5); ctx.lineTo(ex + 0.5, ey - 0.5);
        ctx.closePath(); ctx.fill();
    }
    // Right side: Weak eye — heavy-lidded, glowing softly
    {
        const ex = cx + 12, ey = cy - 6;
        ctx.fillStyle = '#1a0033'; ctx.beginPath();
        ctx.ellipse(ex, ey, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 4);
        eg.addColorStop(0, '#ff88ff'); eg.addColorStop(1, '#660066');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI * 2); ctx.fill();
        // Heavy upper lid
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ex - 6.5, ey - 2); ctx.quadraticCurveTo(ex, ey - 5.5, ex + 6.5, ey - 1); ctx.stroke();
    }
    // Divided mouth — left smirk / right grimace
    ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(cx - 12, cy + 12); ctx.quadraticCurveTo(cx - 4, cy + 16, cx, cy + 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + 12); ctx.quadraticCurveTo(cx + 6, cy + 9, cx + 12, cy + 12); ctx.stroke();
    // Orbital rings (Bohr-model style)
    ctx.save(); ctx.globalAlpha = 0.2; ctx.strokeStyle = accent; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.7, r * 0.25, 0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.7, r * 0.25, -0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    drawHighlight(ctx, cx - 20, cy - r * 0.85, 40, 16, 0.12);
    sprites['boss20_core'] = cv;

    return { accent, dark };
}

export function drawBossArmWithEffects(dark, color, sprites) {

    const cv = _mkCanvas(60, 80), ctx = cv.getContext('2d'), cx = 30, cy = 40;
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 36); ctx.lineTo(cx + 16, cy - 36);
    ctx.lineTo(cx + 20, cy - 24); ctx.lineTo(cx + 18, cy + 26);
    ctx.lineTo(cx + 22, cy + 38); ctx.lineTo(cx - 22, cy + 38);
    ctx.lineTo(cx - 18, cy + 26); ctx.lineTo(cx - 20, cy - 24);
    ctx.closePath();
    outlineAndFill(ctx, dark, '#111', 3);
    // Gravity distortion bands
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 3;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, cy - 18, 18, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, 19, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy + 18, 18, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    sprites['boss22_arm'] = cv;

}

export function drawShieldIndicator(dark, accent, color, sprites) {

    const cv = _mkCanvas(132, 36), ctx = cv.getContext('2d');
    ctx.beginPath(); ctx.roundRect(6, 6, 120, 24, 5);
    outlineAndFill(ctx, dark, '#111', 2.5);
    // Gold fill gradient
    const sg = ctx.createLinearGradient(6, 6, 6, 30);
    sg.addColorStop(0, accent + 'aa'); sg.addColorStop(0.5, color + '66'); sg.addColorStop(1, dark + 'aa');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.roundRect(8, 8, 116, 20, 4); ctx.fill();
    // Ornamental dots
    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = '#fff3'; ctx.beginPath();
        ctx.arc(26 + i * 16, 18, 2, 0, Math.PI * 2); ctx.fill();
    }
    sprites['boss22_shield'] = cv;

}

export function drawHiggsFieldNode(accent, color, dark, sprites) {

    const S = 38, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 12);
    g.addColorStop(0, C_WHITE); g.addColorStop(0.3, accent); g.addColorStop(0.7, color); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // "H" symbol
    ctx.fillStyle = '#44220088'; ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('H', cx, cy + 1);
    // Pulsing halo
    ctx.strokeStyle = accent + '66'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.stroke();
    sprites['boss22_weak'] = cv;

}

export function createGravitationalLens(color, accent, sprites) {

    const S = 46, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
    // Gravitational lensing rings
    ctx.strokeStyle = color + '44'; ctx.lineWidth = 1;
    for (let i = 3; i >= 1; i--) {
        ctx.beginPath(); ctx.arc(cx, cy, 5 + i * 5, 0, Math.PI * 2); ctx.stroke();
    }
    // Core sphere
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
    g.addColorStop(0, '#000'); g.addColorStop(0.4, '#332200'); g.addColorStop(1, color);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Event-horizon ring glow
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 6;
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    sprites['boss22_well'] = cv;

}

export function generateBossCrownSprite(color, dark, sprites) {

    const S = 110, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 45;
    // Massive golden aura
    const aura = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.15);
    aura.addColorStop(0, '#ffd70000'); aura.addColorStop(0.6, '#ffd70015');
    aura.addColorStop(1, '#ffd70000');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2); ctx.fill();
    // Crown-topped body
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy - r * 0.85);
    ctx.lineTo(cx - r * 0.35, cy - r * 0.55);
    ctx.lineTo(cx - r * 0.15, cy - r * 0.9);
    ctx.lineTo(cx + r * 0.15, cy - r * 0.9);
    ctx.lineTo(cx + r * 0.35, cy - r * 0.55);
    ctx.lineTo(cx + r * 0.55, cy - r * 0.85);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.3);
    ctx.lineTo(cx + r * 0.75, cy + r * 0.5);
    ctx.lineTo(cx + r * 0.4, cy + r * 0.85);
    ctx.lineTo(cx - r * 0.4, cy + r * 0.85);
    ctx.lineTo(cx - r * 0.75, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.85, cy - r * 0.3);
    ctx.closePath();
    outlineAndFill(ctx, color, '#111', 3.5);
    // Crown gems
    ctx.fillStyle = '#ff4444';
    for (const dx of [-0.15, 0.15]) {
        ctx.beginPath(); ctx.arc(cx + r * dx, cy - r * 0.82, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.fillStyle = '#4444ff';
    for (const dx of [-0.55, 0.55]) {
        ctx.beginPath(); ctx.arc(cx + r * dx, cy - r * 0.78, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
    }
    // Imperial eyes — oval with diamond-shaped pupils
    for (const sx of [-1, 1]) {
        const ex = cx + sx * 14, ey = cy - 5;
        ctx.fillStyle = '#fff8dd'; ctx.beginPath();
        ctx.ellipse(ex, ey, 7, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        // Golden iris
        const ig = ctx.createRadialGradient(ex, ey, 0, ex, ey, 4);
        ig.addColorStop(0, '#ffee44'); ig.addColorStop(0.6, '#cc8800'); ig.addColorStop(1, '#664400');
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
        // Diamond pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(ex, ey - 2.5); ctx.lineTo(ex + 1.5, ey);
        ctx.lineTo(ex, ey + 2.5); ctx.lineTo(ex - 1.5, ey); ctx.closePath(); ctx.fill();
        // Glint
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 1.5, ey - 1.5, 1, 0, Math.PI * 2); ctx.fill();
        // Regal brow
        ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ex - sx * 8, ey - 7);
        ctx.quadraticCurveTo(ex, ey - 9, ex + sx * 5, ey - 6);
        ctx.stroke();
    }
    // Imposing frowning mouth
    ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 15);
    ctx.quadraticCurveTo(cx - 5, cy + 18, cx, cy + 14);
    ctx.quadraticCurveTo(cx + 5, cy + 18, cx + 12, cy + 15);
    ctx.stroke();
    drawHighlight(ctx, cx - 24, cy - r * 0.5, 48, 18, 0.12);
    sprites['boss22_core'] = cv;

}
