/**
 * Entity type metadata for the level editor.
 * Each entry describes how to render, hit-test, move, and create each entity.
 */

/** @param {number} px @param {number} py @param {number} ax @param {number} ay @param {number} bx @param {number} by */
function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function snap(v, grid) {
    return grid > 1 ? Math.round(v / grid) * grid : Math.round(v);
}

export const EntityDefs = {

    ballStart: {
        key: 'ballStarts', label: 'Ball Start', color: '#ffffff',
        isLine: false,
        fields: [
            { name: 'x', type: 'number' },
            { name: 'y', type: 'number' },
        ],
        defaults: () => ({ x: 460, y: 660 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest: (e, px, py) => Math.hypot(px - e.x, py - e.y) < 18,
        render(ctx, e, sel) {
            const r     = 14;
            const color = sel ? '#ffffff' : this.color;
            ctx.save();
            ctx.globalAlpha = sel ? 1 : 0.85;
            // Outer dashed circle
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(e.x, e.y, r + 6, 0, Math.PI * 2);
            ctx.strokeStyle = sel ? '#ffff00' : '#aaaaaa';
            ctx.lineWidth   = 1;
            ctx.stroke();
            ctx.setLineDash([]);
            // Ball circle
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.fillStyle   = sel ? '#ffff00' : '#555555';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth   = sel ? 2.5 : 1.5;
            ctx.stroke();
            // Inner cross-hair
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.moveTo(e.x - r + 3, e.y); ctx.lineTo(e.x + r - 3, e.y);
            ctx.moveTo(e.x, e.y - r + 3); ctx.lineTo(e.x, e.y + r - 3);
            ctx.stroke();
            // Label
            ctx.fillStyle    = color;
            ctx.font         = 'bold 8px monospace';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('START', e.x, e.y - r - 2);
            ctx.restore();
        },
    },

    deathLine: {
        key: 'deathLines', label: 'Death Line', color: '#ff2222',
        isLine: true,
        fields: [
            { name: 'ax', type: 'number' },
            { name: 'ay', type: 'number' },
            { name: 'bx', type: 'number' },
            { name: 'by', type: 'number' },
        ],
        defaults: () => ({ ax: 20, ay: 718, bx: 440, by: 718 }),
        getCenter: (e) => ({ x: (e.ax + e.bx) / 2, y: (e.ay + e.by) / 2 }),
        setCenter(e, x, y, g) {
            const cx = (e.ax + e.bx) / 2, cy = (e.ay + e.by) / 2;
            const dx = snap(x, g) - snap(cx, g), dy = snap(y, g) - snap(cy, g);
            e.ax += dx; e.ay += dy; e.bx += dx; e.by += dy;
        },
        hitTest: (e, px, py) => distToSegment(px, py, e.ax, e.ay, e.bx, e.by) < 8,
        render(ctx, e, sel) {
            const color = sel ? '#ffffff' : this.color;
            const mx = (e.ax + e.bx) / 2, my = (e.ay + e.by) / 2;
            ctx.save();
            // Solid line
            ctx.beginPath();
            ctx.moveTo(e.ax, e.ay);
            ctx.lineTo(e.bx, e.by);
            ctx.strokeStyle = color;
            ctx.lineWidth = sel ? 3 : 2.5;
            ctx.lineCap = 'round';
            ctx.stroke();
            // Drawn skull at midpoint
            const r = 7;
            ctx.strokeStyle = color;
            ctx.fillStyle   = color;
            ctx.lineWidth   = 1.2;
            // Cranium
            ctx.beginPath();
            ctx.arc(mx, my - 1, r, Math.PI, 0);
            ctx.lineTo(mx + r, my + 4);
            ctx.lineTo(mx - r, my + 4);
            ctx.closePath();
            ctx.stroke();
            // Jaw teeth gaps
            ctx.lineWidth = 1;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(mx + i * 4, my + 4);
                ctx.lineTo(mx + i * 4, my + 8);
                ctx.stroke();
            }
            // Eyes
            for (const ex of [mx - 3, mx + 3]) {
                ctx.beginPath();
                ctx.arc(ex, my - 2, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            // Nose
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(mx - 1.5, my + 1);
            ctx.lineTo(mx, my + 3);
            ctx.lineTo(mx + 1.5, my + 1);
            ctx.stroke();
            if (sel) {
                ctx.fillStyle = '#ffffff';
                for (const [px, py] of [[e.ax, e.ay], [e.bx, e.by]]) {
                    ctx.beginPath();
                    ctx.arc(px, py, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        },
    },

    bumper: {
        key: 'bumpers', label: 'Bumper', color: '#ff6600',
        isLine: false,
        fields: [
            { name: 'x', type: 'number' },
            { name: 'y', type: 'number' },
        ],
        defaults: () => ({ x: 240, y: 360 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest: (e, px, py) => Math.hypot(px - e.x, py - e.y) < 26,
        render(ctx, e, sel) {
            ctx.beginPath();
            ctx.arc(e.x, e.y, 22, 0, Math.PI * 2);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 2.5 : 1.5;
            ctx.stroke();
            if (sel) { ctx.fillStyle = 'rgba(255,102,0,0.25)'; ctx.fill(); }
        },
    },

    warp: {
        key: 'warps', label: 'Warp', color: '#cc00ff',
        isLine: false,
        fields: [
            { name: 'x',      type: 'number' },
            { name: 'y',      type: 'number' },
            { name: 'radius', type: 'number' },
        ],
        defaults: () => ({ x: 240, y: 360, radius: 18 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest: (e, px, py) => Math.hypot(px - e.x, py - e.y) < (e.radius ?? 18) + 8,
        render(ctx, e, sel) {
            const r = e.radius ?? 18;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 2.5 : 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            // Show name label
            if (e.name) {
                ctx.fillStyle = sel ? '#ffffff' : this.color;
                ctx.font = '8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(e.name, e.x, e.y + r + 10);
            }
        },
    },

    wall: {
        key: 'walls', label: 'Wall', color: '#aaaaaa',
        isLine: true,
        fields: [
            { name: 'ax', type: 'number' },
            { name: 'ay', type: 'number' },
            { name: 'bx', type: 'number' },
            { name: 'by', type: 'number' },
        ],
        defaults: () => ({ ax: 100, ay: 200, bx: 200, by: 300 }),
        getCenter: (e) => ({ x: (e.ax + e.bx) / 2, y: (e.ay + e.by) / 2 }),
        setCenter(e, x, y, g) {
            const cx = (e.ax + e.bx) / 2, cy = (e.ay + e.by) / 2;
            const dx = snap(x, g) - snap(cx, g), dy = snap(y, g) - snap(cy, g);
            e.ax += dx; e.ay += dy; e.bx += dx; e.by += dy;
        },
        hitTest: (e, px, py) => distToSegment(px, py, e.ax, e.ay, e.bx, e.by) < 8,
        render(ctx, e, sel) {
            ctx.beginPath();
            ctx.moveTo(e.ax, e.ay);
            ctx.lineTo(e.bx, e.by);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 3 : 2;
            ctx.stroke();
            if (sel) {
                ctx.fillStyle = '#ffffff';
                for (const [px, py] of [[e.ax, e.ay], [e.bx, e.by]]) {
                    ctx.beginPath();
                    ctx.arc(px, py, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        },
    },

    slingshot: {
        key: 'slingshots', label: 'Slingshot', color: '#ffff00',
        isLine: true,
        fields: [
            { name: 'ax', type: 'number' },
            { name: 'ay', type: 'number' },
            { name: 'bx', type: 'number' },
            { name: 'by', type: 'number' },
            { name: 'nx', type: 'number', step: 0.01 },
            { name: 'ny', type: 'number', step: 0.01 },
        ],
        defaults: () => ({ ax: 50, ay: 450, bx: 130, by: 560, nx: 0.88, ny: -0.47 }),
        getCenter: (e) => ({ x: (e.ax + e.bx) / 2, y: (e.ay + e.by) / 2 }),
        setCenter(e, x, y, g) {
            const cx = (e.ax + e.bx) / 2, cy = (e.ay + e.by) / 2;
            const dx = snap(x, g) - snap(cx, g), dy = snap(y, g) - snap(cy, g);
            e.ax += dx; e.ay += dy; e.bx += dx; e.by += dy;
        },
        hitTest: (e, px, py) => distToSegment(px, py, e.ax, e.ay, e.bx, e.by) < 8,
        render(ctx, e, sel) {
            ctx.beginPath();
            ctx.moveTo(e.ax, e.ay);
            ctx.lineTo(e.bx, e.by);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 3.5 : 2.5;
            ctx.stroke();
            // Normal arrow from midpoint
            const mx = (e.ax + e.bx) / 2, my = (e.ay + e.by) / 2;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(mx + (e.nx ?? 0) * 20, my + (e.ny ?? 0) * 20);
            ctx.strokeStyle = sel ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,0,0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            if (sel) {
                ctx.fillStyle = '#ffffff';
                for (const [px, py] of [[e.ax, e.ay], [e.bx, e.by]]) {
                    ctx.beginPath();
                    ctx.arc(px, py, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        },
    },

    flipper: {
        key: 'flippers', label: 'Flipper', color: '#00ff88',
        isLine: false,
        fields: [
            { name: 'x', type: 'number' },
            { name: 'y', type: 'number' },
            { name: 'side', type: 'select', options: ['LEFT', 'RIGHT'] },
            { name: 'length', type: 'number' },
            { name: 'restAngle',   type: 'number', step: 0.01 },
            { name: 'activeAngle', type: 'number', step: 0.01 },
        ],
        defaults: () => ({ x: 160, y: 605, side: 'LEFT', length: 64, restAngle: 0.42, activeAngle: -0.58 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest: (e, px, py) => Math.hypot(px - e.x, py - e.y) < 20,
        render(ctx, e, sel) {
            const len = e.length ?? 64;
            const ra = e.restAngle ?? 0.42;
            const dir = e.side === 'LEFT' ? 1 : -1;
            const tipX = e.x + dir * Math.cos(ra) * len;
            const tipY = e.y + Math.sin(ra) * len;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(tipX, tipY);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 4 : 3;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = sel ? '#ffffff' : this.color;
            ctx.fill();
        },
    },

    gate: {
        key: 'gates', label: 'Gate', color: '#00ffff',
        isLine: false,
        fields: [
            { name: 'x1', type: 'number' },
            { name: 'x2', type: 'number' },
            { name: 'y', type: 'number' },
            { name: 'dir', type: 'select', options: ['1', '-1'] },
        ],
        defaults: () => ({ x1: 200, x2: 280, y: 4, dir: 1 }),
        getCenter: (e) => ({ x: (e.x1 + e.x2) / 2, y: e.y }),
        setCenter(e, x, y, g) {
            const w = e.x2 - e.x1;
            e.x1 = snap(x - w / 2, g);
            e.x2 = snap(x + w / 2, g);
            e.y = snap(y, g);
        },
        hitTest: (e, px, py) => Math.abs(py - e.y) < 10 && px >= e.x1 - 4 && px <= e.x2 + 4,
        render(ctx, e, sel) {
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.moveTo(e.x1, e.y);
            ctx.lineTo(e.x2, e.y);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 3 : 2;
            ctx.stroke();
            ctx.setLineDash([]);
            // Direction arrow
            const mx = (e.x1 + e.x2) / 2;
            const d = Number(e.dir);
            ctx.beginPath();
            ctx.moveTo(mx - 5, e.y + d * 5);
            ctx.lineTo(mx, e.y + d * 12);
            ctx.lineTo(mx + 5, e.y + d * 5);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        },
    },

    dropTarget: {
        key: 'dropTargets', label: 'Drop Target', color: '#ffaa00',
        isLine: false,
        fields: [
            { name: 'x', type: 'number' },
            { name: 'y', type: 'number' },
        ],
        defaults: () => ({ x: 240, y: 200 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest: (e, px, py) => Math.abs(px - e.x) < 16 && Math.abs(py - e.y) < 10,
        render(ctx, e, sel) {
            ctx.fillStyle = sel ? 'rgba(255,170,0,0.5)' : 'rgba(255,170,0,0.3)';
            ctx.fillRect(e.x - 13, e.y - 5, 26, 10);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 2 : 1.5;
            ctx.strokeRect(e.x - 13, e.y - 5, 26, 10);
        },
    },

    kicker: {
        key: 'kickers', label: 'Kicker', color: '#0088ff',
        isLine: false,
        fields: [
            { name: 'x',            type: 'number' },
            { name: 'y',            type: 'number' },
            { name: 'w',            type: 'number' },
            { name: 'h',            type: 'number' },
            { name: 'angleDeg',     type: 'number', step: 1 },
            { name: 'dirX',         type: 'number', step: 0.01 },
            { name: 'dirY',         type: 'number', step: 0.01 },
            { name: 'power',        type: 'number', step: 0.1 },
            { name: 'circleRadius', type: 'number' },
            { name: 'circleSpeed',  type: 'number', step: 0.1 },
            { name: 'slideRange',   type: 'number' },
            { name: 'slideSpeed',   type: 'number', step: 0.1 },
        ],
        defaults: () => ({ x: 210, y: 200, w: 60, h: 16, angleDeg: 0, dirX: 0, dirY: -1, power: 1 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest: (e, px, py) => Math.hypot(px - e.x, py - e.y) < Math.max((e.w ?? 60), (e.h ?? 16)) / 2 + 8,
        render(ctx, e, sel) {
            const w      = e.w ?? 60;
            const h      = e.h ?? 16;
            const angle  = (e.angleDeg ?? 0) * Math.PI / 180;
            const color  = sel ? '#ffffff' : this.color;
            const plateH = Math.max(4, h * 0.38);

            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(angle);

            // Housing body
            ctx.fillStyle = sel ? 'rgba(0,136,255,0.2)' : '#080812';
            ctx.fillRect(-w/2, -h/2, w, h);

            // Vertical ribs
            const ribCount = Math.max(3, Math.floor(w / 10));
            ctx.strokeStyle = color;
            ctx.lineWidth   = 0.8;
            ctx.globalAlpha = 0.3;
            for (let i = 1; i < ribCount; i++) {
                const rx = -w/2 + i * (w / ribCount);
                ctx.beginPath();
                ctx.moveTo(rx, -h/2 + 2);
                ctx.lineTo(rx,  h/2 - 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Housing border
            ctx.strokeStyle = color;
            ctx.lineWidth   = sel ? 2 : 1.5;
            ctx.strokeRect(-w/2 + 0.5, -h/2 + 0.5, w - 1, h - 1);

            // Piston rods
            ctx.strokeStyle = sel ? 'rgba(255,255,255,0.5)' : 'rgba(0,136,255,0.45)';
            ctx.lineWidth   = 1.5;
            for (const rx of [-w * 0.28, w * 0.28]) {
                ctx.beginPath();
                ctx.moveTo(rx, -h/2 + plateH);
                ctx.lineTo(rx,  h/2 - 2);
                ctx.stroke();
            }

            // Launch plate
            ctx.fillStyle = sel ? 'rgba(255,255,255,0.7)' : color;
            ctx.fillRect(-w/2 + 1, -h/2, w - 2, plateH);

            // Plate highlight stripe
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.moveTo(-w/2 + 5, -h/2 + plateH * 0.45);
            ctx.lineTo( w/2 - 5, -h/2 + plateH * 0.45);
            ctx.stroke();

            // Corner bolts
            ctx.fillStyle = sel ? '#ffffff' : '#8899aa';
            for (const [bx, by] of [[-w/2+3.5, -h/2+3.5], [w/2-3.5, -h/2+3.5], [-w/2+3.5, h/2-3.5], [w/2-3.5, h/2-3.5]]) {
                ctx.beginPath();
                ctx.arc(bx, by, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();

            // Direction arrow in world space (outside rotation)
            const adx = (e.dirX ?? 0) * 22, ady = (e.dirY ?? -1) * 22;
            const ang = Math.atan2(ady, adx);
            ctx.save();
            ctx.globalAlpha = sel ? 0.9 : 0.6;
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + adx, e.y + ady);
            ctx.moveTo(e.x + adx, e.y + ady);
            ctx.lineTo(e.x + adx - 6 * Math.cos(ang - 0.4), e.y + ady - 6 * Math.sin(ang - 0.4));
            ctx.moveTo(e.x + adx, e.y + ady);
            ctx.lineTo(e.x + adx - 6 * Math.cos(ang + 0.4), e.y + ady - 6 * Math.sin(ang + 0.4));
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.restore();
        },
    },

    spring: {
        key: 'springs', label: 'Spring', color: '#ff6688',
        isLine: false,
        fields: [
            { name: 'x',        type: 'number' },
            { name: 'y',        type: 'number' },
            { name: 'radius',   type: 'number' },
            { name: 'angleDeg', type: 'number', step: 1 },
            { name: 'power',    type: 'number' },
            { name: 'cooldown', type: 'number', step: 0.05 },
        ],
        defaults: () => ({ x: 240, y: 300, radius: 20, angleDeg: 270, power: 1300, cooldown: 0.4 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest(e, px, py) {
            const r       = e.radius ?? 20;
            const bodyLen = r * 2.5;
            const D2R     = Math.PI / 180;
            const dx      = Math.cos((e.angleDeg ?? 270) * D2R);
            const dy      = Math.sin((e.angleDeg ?? 270) * D2R);
            const bx = e.x - dx * bodyLen, by = e.y - dy * bodyLen;
            const ex = e.x - bx, ey = e.y - by;
            const fx = px - bx,  fy = py - by;
            const t  = Math.max(0, Math.min(1, (fx * ex + fy * ey) / (ex * ex + ey * ey)));
            return Math.hypot(px - (bx + ex * t), py - (by + ey * t)) < r * 0.9 + 8;
        },
        render(ctx, e, sel) {
            const r       = e.radius ?? 20;
            const D2R     = Math.PI / 180;
            const dx      = Math.cos((e.angleDeg ?? 270) * D2R);
            const dy      = Math.sin((e.angleDeg ?? 270) * D2R);
            const perpX   = -dy,  perpY = dx;
            const color   = sel ? '#ffffff' : this.color;
            const bodyLen = r * 2.5;
            const padH    = r * 0.4;
            const padW    = r * 0.9;
            const amp     = r * 0.28;
            // Geometry: e.x/y = pad center (extended); base behind it
            const bx = e.x - dx * bodyLen;
            const by = e.y - dy * bodyLen;
            // Coil end = just before pad plate
            const clx = (e.x - dx * padH * 0.5) - bx;
            const cly = (e.y - dy * padH * 0.5) - by;

            ctx.strokeStyle = color;

            // Base plate
            ctx.lineWidth = padH + 3;
            ctx.lineCap   = 'butt';
            ctx.beginPath();
            ctx.moveTo(bx + perpX * (padW + 4), by + perpY * (padW + 4));
            ctx.lineTo(bx - perpX * (padW + 4), by - perpY * (padW + 4));
            ctx.stroke();

            // Zigzag coil
            ctx.lineWidth = sel ? 2 : 1.5;
            ctx.lineCap   = 'round';
            ctx.beginPath();
            ctx.moveTo(bx, by);
            const N = 8;
            for (let i = 0; i < N; i++) {
                const t    = (i + 1) / (N + 1);
                const side = i % 2 === 0 ? amp : -amp;
                ctx.lineTo(bx + clx * t + perpX * side, by + cly * t + perpY * side);
            }
            ctx.lineTo(e.x - dx * padH * 0.5, e.y - dy * padH * 0.5);
            ctx.stroke();

            // Launch pad plate
            ctx.lineWidth   = padH;
            ctx.lineCap     = 'butt';
            ctx.strokeStyle = sel ? '#ffffff' : '#ff99bb';
            ctx.beginPath();
            ctx.moveTo(e.x + perpX * padW, e.y + perpY * padW);
            ctx.lineTo(e.x - perpX * padW, e.y - perpY * padW);
            ctx.stroke();

            // Direction indicator (small line beyond pad)
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1;
            ctx.lineCap     = 'round';
            ctx.beginPath();
            ctx.moveTo(e.x + dx * padH,           e.y + dy * padH);
            ctx.lineTo(e.x + dx * (padH + r * 0.5), e.y + dy * (padH + r * 0.5));
            ctx.stroke();
        },
        handles: {
            get(e) {
                const D2R  = Math.PI / 180;
                const r    = e.radius ?? 20;
                const dirX = Math.cos((e.angleDeg ?? 270) * D2R);
                const dirY = Math.sin((e.angleDeg ?? 270) * D2R);
                const perp = { x: -dirY, y: dirX };
                return [
                    { id: 'dir',    x: e.x + dirX * r * 1.4, y: e.y + dirY * r * 1.4 },
                    { id: 'radius', x: e.x + perp.x * r,     y: e.y + perp.y * r     },
                ];
            },
            move(e, id, x, y) {
                const R2D = 180 / Math.PI;
                if (id === 'dir') {
                    e.angleDeg = Math.round(Math.atan2(y - e.y, x - e.x) * R2D);
                } else {
                    e.radius = Math.max(8, Math.round(Math.hypot(x - e.x, y - e.y)));
                }
            },
        },
    },

    launchSpring: {
        key: 'launchSprings', label: 'Launch Spring', color: '#44ddff',
        isLine: false,
        fields: [
            { name: 'x',            type: 'number' },
            { name: 'y',            type: 'number' },
            { name: 'radius',       type: 'number' },
            { name: 'angleDeg',     type: 'number', step: 1 },
            { name: 'maxPower',     type: 'number' },
            { name: 'chargeTime',   type: 'number', step: 0.1 },
            { name: 'maxExtension', type: 'number' },
        ],
        defaults: () => ({ x: 240, y: 600, radius: 20, angleDeg: 270, maxPower: 2000, chargeTime: 1.2, maxExtension: 80 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest(e, px, py) {
            const r   = e.radius ?? 20;
            const ext = e.maxExtension ?? 80;
            const D2R = Math.PI / 180;
            const dx  = Math.cos((e.angleDeg ?? 270) * D2R);
            const dy  = Math.sin((e.angleDeg ?? 270) * D2R);
            const ex  = dx * ext, ey = dy * ext;
            const fx  = px - e.x,  fy = py - e.y;
            const len = ex * ex + ey * ey;
            const t   = len > 0 ? Math.max(0, Math.min(1, (fx * ex + fy * ey) / len)) : 0;
            return Math.hypot(px - (e.x + ex * t), py - (e.y + ey * t)) < r + 8;
        },
        render(ctx, e, sel) {
            const r     = e.radius ?? 20;
            const ext   = e.maxExtension ?? 80;
            const D2R   = Math.PI / 180;
            const dx    = Math.cos((e.angleDeg ?? 270) * D2R);
            const dy    = Math.sin((e.angleDeg ?? 270) * D2R);
            const perpX = -dy, perpY = dx;
            const color = sel ? '#ffffff' : this.color;
            const padH  = r * 0.45;
            const padW  = r * 0.85;
            const amp   = r * 0.22;
            // Barrel end (max extension)
            const barX  = e.x + dx * ext;
            const barY  = e.y + dy * ext;

            ctx.strokeStyle = color;

            // Guide rails (dim)
            ctx.lineWidth   = 1.5;
            ctx.lineCap     = 'butt';
            ctx.globalAlpha = sel ? 0.7 : 0.35;
            ctx.beginPath();
            ctx.moveTo(e.x + perpX * (padW + 3), e.y + perpY * (padW + 3));
            ctx.lineTo(barX + perpX * (padW + 3), barY + perpY * (padW + 3));
            ctx.moveTo(e.x - perpX * (padW + 3), e.y - perpY * (padW + 3));
            ctx.lineTo(barX - perpX * (padW + 3), barY - perpY * (padW + 3));
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Base plate (fixed)
            ctx.lineWidth = padH + 3;
            ctx.lineCap   = 'butt';
            ctx.beginPath();
            ctx.moveTo(e.x + perpX * (padW + 4), e.y + perpY * (padW + 4));
            ctx.lineTo(e.x - perpX * (padW + 4), e.y - perpY * (padW + 4));
            ctx.stroke();

            // Coil (shown fully extended in editor, so you see the full travel)
            const coilEndX = barX - dx * padH * 0.5;
            const coilEndY = barY - dy * padH * 0.5;
            const clx      = coilEndX - e.x;
            const cly      = coilEndY - e.y;
            ctx.lineWidth  = sel ? 2 : 1.5;
            ctx.lineCap    = 'round';
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            const N = 8;
            for (let i = 0; i < N; i++) {
                const t    = (i + 1) / (N + 1);
                const side = i % 2 === 0 ? amp : -amp;
                ctx.lineTo(e.x + clx * t + perpX * side, e.y + cly * t + perpY * side);
            }
            ctx.lineTo(coilEndX, coilEndY);
            ctx.stroke();

            // Launch pad at max extension
            ctx.lineWidth   = padH;
            ctx.lineCap     = 'butt';
            ctx.strokeStyle = sel ? '#ffffff' : '#88eeff';
            ctx.beginPath();
            ctx.moveTo(barX + perpX * padW, barY + perpY * padW);
            ctx.lineTo(barX - perpX * padW, barY - perpY * padW);
            ctx.stroke();

            // Direction arrow
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1;
            ctx.lineCap     = 'round';
            ctx.beginPath();
            ctx.moveTo(barX + dx * padH,             barY + dy * padH);
            ctx.lineTo(barX + dx * (padH + r * 0.5), barY + dy * (padH + r * 0.5));
            ctx.stroke();
        },
        handles: {
            get(e) {
                const D2R  = Math.PI / 180;
                const r    = e.radius ?? 20;
                const ext  = e.maxExtension ?? 80;
                const dirX = Math.cos((e.angleDeg ?? 270) * D2R);
                const dirY = Math.sin((e.angleDeg ?? 270) * D2R);
                const perp = { x: -dirY, y: dirX };
                return [
                    { id: 'dir',       x: e.x + dirX * (ext + r * 0.5), y: e.y + dirY * (ext + r * 0.5) },
                    { id: 'radius',    x: e.x + perp.x * r,             y: e.y + perp.y * r             },
                    { id: 'extension', x: e.x + dirX * ext,             y: e.y + dirY * ext             },
                ];
            },
            move(e, id, x, y) {
                const R2D = 180 / Math.PI;
                if (id === 'dir') {
                    e.angleDeg = Math.round(Math.atan2(y - e.y, x - e.x) * R2D);
                } else if (id === 'radius') {
                    e.radius = Math.max(8, Math.round(Math.hypot(x - e.x, y - e.y)));
                } else {
                    e.maxExtension = Math.max(20, Math.round(Math.hypot(x - e.x, y - e.y)));
                }
            },
        },
    },

    gear: {
        key: 'gears', label: 'Gear', color: '#8888ff',
        isLine: false,
        fields: [
            { name: 'x', type: 'number' },
            { name: 'y', type: 'number' },
            { name: 'teeth', type: 'number' },
            { name: 'speed', type: 'number', step: 0.1 },
            { name: 'angularSpeed', type: 'number', step: 0.1 },
        ],
        defaults: () => ({ x: 240, y: 300, teeth: 12, speed: 5, angularSpeed: 2.8 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest: (e, px, py) => Math.hypot(px - e.x, py - e.y) < 32,
        render(ctx, e, sel) {
            const r = 24;
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 2.5 : 1.5;
            ctx.stroke();
            const n = e.teeth ?? 12;
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r);
                ctx.lineTo(e.x + Math.cos(a) * (r + 6), e.y + Math.sin(a) * (r + 6));
                ctx.strokeStyle = sel ? '#ffffff' : this.color;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = sel ? '#ffffff' : this.color;
            ctx.fill();
        },
    },

    pendulum: {
        key: 'pendulums', label: 'Pendulum', color: '#aa00ff',
        isLine: false,
        fields: [
            { name: 'x', type: 'number' },
            { name: 'y', type: 'number' },
            { name: 'armLength', type: 'number' },
            { name: 'velX', type: 'number', step: 0.01 },
            { name: 'velY', type: 'number', step: 0.01 },
            { name: 'slideRange', type: 'number' },
            { name: 'slideSpeed', type: 'number', step: 0.1 },
        ],
        defaults: () => ({ x: 240, y: 200, armLength: 80, velX: 0.88, velY: 0.52, slideRange: 100, slideSpeed: 0.9 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest: (e, px, py) => Math.hypot(px - e.x, py - e.y) < 20,
        render(ctx, e, sel) {
            const arm = e.armLength ?? 80;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x, e.y + arm);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 2 : 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(e.x, e.y + arm, 10, 0, Math.PI * 2);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 2 : 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = sel ? '#ffffff' : this.color;
            ctx.fill();
        },
    },

    light: {
        key: 'lights', label: 'Light', color: '#ffff88',
        isLine: false,
        fields: [
            { name: 'x', type: 'number' },
            { name: 'y', type: 'number' },
            { name: 'colorKey', type: 'text' },
            { name: 'radius', type: 'number', step: 0.5 },
            { name: 'cycleSpeed', type: 'number', step: 0.1 },
            { name: 'on', type: 'checkbox' },
        ],
        defaults: () => ({ x: 240, y: 300, colorKey: 'accent', radius: 4, cycleSpeed: 1, on: true }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest: (e, px, py) => Math.hypot(px - e.x, py - e.y) < 12,
        render(ctx, e, sel) {
            ctx.beginPath();
            ctx.arc(e.x, e.y, (e.radius ?? 4) + 2, 0, Math.PI * 2);
            ctx.fillStyle = sel ? '#ffffff' : this.color;
            ctx.fill();
            if (sel) {
                ctx.beginPath();
                ctx.arc(e.x, e.y, 12, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        },
    },

    lightRing: {
        key: 'lightRings', label: 'Light Ring', color: '#ff88aa',
        isLine: false,
        fields: [
            { name: 'cx', type: 'number' },
            { name: 'cy', type: 'number' },
            { name: 'radius', type: 'number' },
            { name: 'count', type: 'number' },
            { name: 'colorKey', type: 'text' },
            { name: 'lightRadius', type: 'number', step: 0.5 },
            { name: 'cycleSpeed', type: 'number', step: 0.1 },
            { name: 'on', type: 'checkbox' },
        ],
        defaults: () => ({ cx: 240, cy: 200, radius: 50, count: 8, colorKey: 'accent2', lightRadius: 4, cycleSpeed: 1.5, on: true }),
        getCenter: (e) => ({ x: e.cx, y: e.cy }),
        setCenter: (e, x, y, g) => { e.cx = snap(x, g); e.cy = snap(y, g); },
        hitTest: (e, px, py) =>
            Math.abs(Math.hypot(px - e.cx, py - e.cy) - e.radius) < 12 ||
            Math.hypot(px - e.cx, py - e.cy) < 12,
        render(ctx, e, sel) {
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.arc(e.cx, e.cy, e.radius, 0, Math.PI * 2);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 1.5 : 1;
            ctx.stroke();
            ctx.setLineDash([]);
            const n = e.count ?? 8;
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2;
                const lx = e.cx + Math.cos(a) * e.radius;
                const ly = e.cy + Math.sin(a) * e.radius;
                ctx.beginPath();
                ctx.arc(lx, ly, e.lightRadius ?? 4, 0, Math.PI * 2);
                ctx.fillStyle = sel ? '#ffffff' : this.color;
                ctx.fill();
            }
        },
    },

    curve: {
        key: 'curves', label: 'Curve', color: '#44ccff',
        isLine: false,
        fields: [
            { name: 'cx',         type: 'number' },
            { name: 'cy',         type: 'number' },
            { name: 'radius',     type: 'number' },
            { name: 'startAngle', type: 'number', step: 0.01 },
            { name: 'endAngle',   type: 'number', step: 0.01 },
            { name: 'segments',   type: 'number' },
            { name: 'restitution', type: 'number', step: 0.01 },
        ],
        defaults: () => ({ cx: 240, cy: 100, radius: 60, startAngle: 0, endAngle: -Math.PI / 2, segments: 12, restitution: 0.55 }),
        getCenter: (e) => ({ x: e.cx, y: e.cy }),
        setCenter: (e, x, y, g) => { e.cx = snap(x, g); e.cy = snap(y, g); },
        hitTest: (e, px, py) =>
            Math.abs(Math.hypot(px - e.cx, py - e.cy) - (e.radius ?? 60)) < 12 ||
            Math.hypot(px - e.cx, py - e.cy) < 10,
        render(ctx, e, sel) {
            const n      = e.segments ?? 12;
            const r      = e.radius ?? 60;
            const startA = e.startAngle ?? 0;
            const endA   = e.endAngle ?? -Math.PI / 2;

            // Arc path — identical interpolation to _buildCurves physics
            ctx.beginPath();
            for (let i = 0; i <= n; i++) {
                const a = startA + (i / n) * (endA - startA);
                const x = e.cx + r * Math.cos(a);
                const y = e.cy + r * Math.sin(a);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth   = sel ? 3 : 2;
            ctx.stroke();

            if (sel) {
                // Light sector fill
                ctx.beginPath();
                ctx.moveTo(e.cx, e.cy);
                for (let i = 0; i <= n; i++) {
                    const a = startA + (i / n) * (endA - startA);
                    ctx.lineTo(e.cx + r * Math.cos(a), e.cy + r * Math.sin(a));
                }
                ctx.closePath();
                ctx.fillStyle = 'rgba(68,204,255,0.08)';
                ctx.fill();
            }

            // Center pivot dot
            ctx.beginPath();
            ctx.arc(e.cx, e.cy, 4, 0, Math.PI * 2);
            ctx.fillStyle = sel ? '#ffffff' : this.color;
            ctx.fill();
        },
        handles: {
            get(e) {
                const r   = e.radius     ?? 60;
                const sA  = e.startAngle ?? 0;
                const eA  = e.endAngle   ?? -Math.PI / 2;
                const mA  = (sA + eA) / 2;
                return [
                    { id: 'start',  x: e.cx + r * Math.cos(sA), y: e.cy + r * Math.sin(sA) },
                    { id: 'end',    x: e.cx + r * Math.cos(eA), y: e.cy + r * Math.sin(eA) },
                    { id: 'radius', x: e.cx + r * Math.cos(mA), y: e.cy + r * Math.sin(mA) },
                ];
            },
            move(e, id, x, y, g) {
                const dx = x - e.cx, dy = y - e.cy;
                if (id === 'radius') {
                    e.radius = Math.max(5, Math.round(Math.hypot(dx, dy) / g) * g);
                } else if (id === 'start') {
                    e.startAngle = Math.atan2(dy, dx);
                } else {
                    e.endAngle = Math.atan2(dy, dx);
                }
            },
        },
    },

    warpExit: {
        key: 'warpExits', label: 'Warp Exit', color: '#ff00cc',
        isLine: false,
        fields: [
            { name: 'fromSection', type: 'select', options: ['arkanoid_vault', 'abyss_floor', 'bonus_dungeon', 'upper_table', 'main_table'] },
            { name: 'x',  type: 'number' },
            { name: 'y',  type: 'number' },
            { name: 'vx', type: 'number' },
            { name: 'vy', type: 'number' },
        ],
        defaults: () => ({ fromSection: 'main_table', x: 240, y: 360, vx: 0, vy: -650 }),
        getCenter: (e) => ({ x: e.x, y: e.y }),
        setCenter: (e, x, y, g) => { e.x = snap(x, g); e.y = snap(y, g); },
        hitTest: (e, px, py) => Math.hypot(px - e.x, py - e.y) < 18,
        render(ctx, e, sel) {
            // Landing circle
            ctx.beginPath();
            ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
            ctx.strokeStyle = sel ? '#ffffff' : this.color;
            ctx.lineWidth = sel ? 2.5 : 1.5;
            ctx.stroke();
            if (sel) { ctx.fillStyle = 'rgba(255,0,204,0.2)'; ctx.fill(); }

            // Velocity arrow (normalised to 24px)
            const mag = Math.hypot(e.vx ?? 0, e.vy ?? 0) || 1;
            const nx = (e.vx ?? 0) / mag;
            const ny = (e.vy ?? 0) / mag;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + nx * 24, e.y + ny * 24);
            ctx.strokeStyle = sel ? 'rgba(255,255,255,0.7)' : 'rgba(255,0,204,0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Source label: section abbreviation
            ctx.fillStyle = sel ? '#ffffff' : this.color;
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            const sec = (e.fromSection ?? '?').split('_')[0];
            ctx.fillText(sec, e.x, e.y + 22);
        },
    },

    corridor: {
        key: 'corridors', label: 'Corridor', color: '#88ddaa',
        isLine: false,
        fields: [
            { name: 'cx',          type: 'number' },
            { name: 'cy',          type: 'number' },
            { name: 'angleDeg',    type: 'number', step: 1 },
            { name: 'length',      type: 'number' },
            { name: 'width',       type: 'number' },
            { name: 'restitution', type: 'number', step: 0.01 },
        ],
        defaults: () => ({ cx: 240, cy: 300, angleDeg: 0, length: 120, width: 40, restitution: 0.55 }),
        getCenter: (e) => ({ x: e.cx, y: e.cy }),
        setCenter: (e, x, y, g) => { e.cx = snap(x, g); e.cy = snap(y, g); },
        hitTest(e, px, py) {
            const D2R  = Math.PI / 180;
            const cos  = Math.cos((e.angleDeg ?? 0) * D2R);
            const sin  = Math.sin((e.angleDeg ?? 0) * D2R);
            const half = (e.length ?? 120) / 2;
            const ax   = e.cx - cos * half, ay = e.cy - sin * half;
            const bx   = e.cx + cos * half, by = e.cy + sin * half;
            return distToSegment(px, py, ax, ay, bx, by) < (e.width ?? 40) / 2 + 8;
        },
        render(ctx, e, sel) {
            const D2R  = Math.PI / 180;
            const cos  = Math.cos((e.angleDeg ?? 0) * D2R);
            const sin  = Math.sin((e.angleDeg ?? 0) * D2R);
            const half = (e.length ?? 120) / 2;
            const w2   = (e.width ?? 40) / 2;
            const ox   = -sin * w2, oy = cos * w2;           // perpendicular offset
            const ax   = e.cx - cos * half, ay = e.cy - sin * half;
            const bx   = e.cx + cos * half, by = e.cy + sin * half;
            const color = sel ? '#ffffff' : this.color;
            ctx.strokeStyle = color;
            ctx.lineWidth   = sel ? 2.5 : 1.5;
            ctx.lineCap     = 'round';
            // Wall A
            ctx.beginPath();
            ctx.moveTo(ax + ox, ay + oy);
            ctx.lineTo(bx + ox, by + oy);
            ctx.stroke();
            // Wall B
            ctx.beginPath();
            ctx.moveTo(ax - ox, ay - oy);
            ctx.lineTo(bx - ox, by - oy);
            ctx.stroke();
            // Dashed axis
            ctx.setLineDash([5, 5]);
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            // Center dot
            ctx.beginPath();
            ctx.arc(e.cx, e.cy, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        },
        handles: {
            get(e) {
                const D2R  = Math.PI / 180;
                const cos  = Math.cos((e.angleDeg ?? 0) * D2R);
                const sin  = Math.sin((e.angleDeg ?? 0) * D2R);
                const half = (e.length ?? 120) / 2;
                // Width handle: perpendicular to axis, at midpoint
                const perp = (e.width ?? 40) / 2;
                return [
                    { id: 'a',     x: e.cx - cos * half,   y: e.cy - sin * half },
                    { id: 'b',     x: e.cx + cos * half,   y: e.cy + sin * half },
                    { id: 'width', x: e.cx - sin * perp,   y: e.cy + cos * perp },
                ];
            },
            move(e, id, x, y, g) {
                const R2D  = 180 / Math.PI;
                const D2R  = Math.PI / 180;
                const sx   = Math.round(x / g) * g;
                const sy   = Math.round(y / g) * g;
                const cos  = Math.cos((e.angleDeg ?? 0) * D2R);
                const sin  = Math.sin((e.angleDeg ?? 0) * D2R);
                const half = (e.length ?? 120) / 2;
                if (id === 'a') {
                    // endpoint B is fixed
                    const fixX = e.cx + cos * half, fixY = e.cy + sin * half;
                    e.cx       = Math.round((fixX + sx) / 2);
                    e.cy       = Math.round((fixY + sy) / 2);
                    e.length   = Math.round(Math.hypot(fixX - sx, fixY - sy));
                    e.angleDeg = Math.round(Math.atan2(fixY - sy, fixX - sx) * R2D);
                } else if (id === 'b') {
                    // endpoint A is fixed
                    const fixX = e.cx - cos * half, fixY = e.cy - sin * half;
                    e.cx       = Math.round((fixX + sx) / 2);
                    e.cy       = Math.round((fixY + sy) / 2);
                    e.length   = Math.round(Math.hypot(sx - fixX, sy - fixY));
                    e.angleDeg = Math.round(Math.atan2(sy - fixY, sx - fixX) * R2D);
                } else {
                    // width handle: project drag point onto the perpendicular
                    const perpDist = Math.hypot(sx - e.cx, sy - e.cy);
                    e.width = Math.max(4, Math.round(perpDist * 2 / g) * g);
                }
            },
        },
    },

    curvedCorridor: {
        key: 'curvedCorridors', label: 'Curved Corridor', color: '#ffcc44',
        isLine: false,
        fields: [
            { name: 'cx',             type: 'number' },
            { name: 'cy',             type: 'number' },
            { name: 'midRadius',      type: 'number' },
            { name: 'width',          type: 'number' },
            { name: 'startAngleDeg',  type: 'number', step: 1 },
            { name: 'angularSpanDeg', type: 'number', step: 1 },
            { name: 'segments',       type: 'number' },
            { name: 'restitution',    type: 'number', step: 0.01 },
        ],
        defaults: () => ({ cx: 240, cy: 300, midRadius: 70, width: 40, startAngleDeg: 180, angularSpanDeg: 180, segments: 12, restitution: 0.55 }),
        getCenter: (e) => ({ x: e.cx, y: e.cy }),
        setCenter: (e, x, y, g) => { e.cx = snap(x, g); e.cy = snap(y, g); },
        hitTest(e, px, py) {
            const mid  = e.midRadius ?? 70;
            const half = (e.width ?? 40) / 2;
            const d    = Math.hypot(px - e.cx, py - e.cy);
            return d >= mid - half - 10 && d <= mid + half + 10;
        },
        render(ctx, e, sel) {
            const D2R         = Math.PI / 180;
            const color       = sel ? '#ffffff' : this.color;
            const mid         = e.midRadius         ?? 70;
            const half        = (e.width ?? 40)     / 2;
            const innerRadius = mid - half;
            const outerRadius = mid + half;
            const startAngle  = (e.startAngleDeg  ?? 180) * D2R;
            const endAngle    = startAngle + (e.angularSpanDeg ?? 180) * D2R;
            const ccw         = (e.angularSpanDeg ?? 180) < 0;
            ctx.strokeStyle = color;
            ctx.lineWidth   = sel ? 2.5 : 1.5;
            // Inner arc
            ctx.beginPath();
            ctx.arc(e.cx, e.cy, innerRadius, startAngle, endAngle, ccw);
            ctx.stroke();
            // Outer arc
            ctx.beginPath();
            ctx.arc(e.cx, e.cy, outerRadius, startAngle, endAngle, ccw);
            ctx.stroke();
            // End caps (dashed)
            ctx.setLineDash([3, 3]);
            ctx.globalAlpha = 0.35;
            for (const a of [startAngle, endAngle]) {
                const cosA = Math.cos(a), sinA = Math.sin(a);
                ctx.beginPath();
                ctx.moveTo(e.cx + cosA * innerRadius, e.cy + sinA * innerRadius);
                ctx.lineTo(e.cx + cosA * outerRadius, e.cy + sinA * outerRadius);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            // Pivot dot
            ctx.beginPath();
            ctx.arc(e.cx, e.cy, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        },
        handles: {
            get(e) {
                const D2R = Math.PI / 180;
                const sA  = (e.startAngleDeg  ?? 180) * D2R;
                const eA  = sA + (e.angularSpanDeg ?? 180) * D2R;
                const mA  = (sA + eA) / 2;
                const r   = e.midRadius ?? 70;
                return [
                    { id: 'start',  x: e.cx + r * Math.cos(sA), y: e.cy + r * Math.sin(sA) },
                    { id: 'end',    x: e.cx + r * Math.cos(eA), y: e.cy + r * Math.sin(eA) },
                    { id: 'radius', x: e.cx + r * Math.cos(mA), y: e.cy + r * Math.sin(mA) },
                ];
            },
            move(e, id, x, y, g) {
                const R2D = 180 / Math.PI;
                const dx  = x - e.cx;
                const dy  = y - e.cy;
                if (id === 'radius') {
                    e.midRadius = Math.max(10, Math.round(Math.hypot(dx, dy) / g) * g);
                } else if (id === 'start') {
                    const endAngle   = (e.startAngleDeg ?? 180) + (e.angularSpanDeg ?? 180);
                    e.startAngleDeg  = Math.round(Math.atan2(dy, dx) * R2D);
                    e.angularSpanDeg = Math.round(endAngle - e.startAngleDeg);
                } else {
                    e.angularSpanDeg = Math.round(Math.atan2(dy, dx) * R2D - (e.startAngleDeg ?? 180));
                }
            },
        },
    },
};

/** Returns the EntityDef that owns the given JSON array key (e.g. 'bumpers'). */
export function defByKey(jsonKey) {
    return Object.values(EntityDefs).find(d => d.key === jsonKey) ?? null;
}

// ─── Appended entity definitions ─────────────────────────────────────────────
EntityDefs.brickGrid = {
    key: 'brickGrids', label: 'Brick Grid', color: '#00ccff',
    isLine: false,
    fields: [
        { name: 'x',      type: 'number' },
        { name: 'startY', type: 'number' },
        { name: 'cols',   type: 'number' },
        { name: 'rows',   type: 'number' },
        { name: 'brickW', type: 'number' },
        { name: 'brickH', type: 'number' },
        { name: 'gapX',   type: 'number' },
        { name: 'gapY',   type: 'number' },
    ],
    defaults: () => ({ x: 240, startY: 60, cols: 7, rows: 5, brickW: 54, brickH: 18, gapX: 10, gapY: 12 }),
    getCenter: (e) => ({ x: e.x, y: e.startY + (e.rows * (e.brickH + e.gapY)) / 2 }),
    setCenter: (e, x, y, g) => {
        e.x      = snap(x, g);
        e.startY = Math.round(y - (e.rows * (e.brickH + e.gapY)) / 2);
    },
    hitTest(e, px, py) {
        const totalW = e.cols * e.brickW + (e.cols - 1) * e.gapX;
        const totalH = e.rows * e.brickH + (e.rows - 1) * e.gapY;
        return px >= e.x - totalW / 2 - 6 && px <= e.x + totalW / 2 + 6 &&
               py >= e.startY - 6 && py <= e.startY + totalH + 6;
    },
    render(ctx, e, sel) {
        const totalW = e.cols * e.brickW + (e.cols - 1) * e.gapX;
        const startX = e.x - totalW / 2;
        ctx.strokeStyle = sel ? '#ffffff' : 'rgba(0,204,255,0.5)';
        ctx.lineWidth   = sel ? 1.5 : 0.8;
        for (let r = 0; r < e.rows; r++) {
            for (let c = 0; c < e.cols; c++) {
                const bx = startX + c * (e.brickW + e.gapX);
                const by = e.startY + r * (e.brickH + e.gapY);
                ctx.strokeRect(bx, by, e.brickW, e.brickH);
                if (sel) {
                    ctx.fillStyle = 'rgba(0,204,255,0.08)';
                    ctx.fillRect(bx, by, e.brickW, e.brickH);
                }
            }
        }
        // Label
        ctx.fillStyle   = sel ? '#ffffff' : 'rgba(0,204,255,0.6)';
        ctx.font        = '9px monospace';
        ctx.textAlign   = 'center';
        ctx.fillText(`${e.cols}×${e.rows}  ${e.brickW}×${e.brickH}`, e.x, e.startY - 4);
        // Center handle when selected
        if (sel) {
            const cy = e.startY + (e.rows * (e.brickH + e.gapY)) / 2;
            ctx.beginPath();
            ctx.arc(e.x, cy, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#00ccff';
            ctx.fill();
        }
    },
};

/** All entity type names in display order. */
export const ENTITY_TYPE_ORDER = [
    'ballStart',
    'deathLine',
    'bumper', 'warp', 'wall', 'curve', 'corridor', 'curvedCorridor',
    'slingshot', 'flipper', 'gate', 'dropTarget', 'kicker', 'spring', 'launchSpring', 'gear', 'pendulum',
    'light', 'lightRing', 'warpExit', 'brickGrid',
];

/**
 * Inject the live section keys (from board.json) into warpExit field options.
 * Call once after board.json has been loaded.
 * @param {string[]} keys
 */
export function setLevelKeys(keys) {
    // warpExit: fromSection options
    const exitField = EntityDefs.warpExit.fields.find(f => f.name === 'fromSection');
    if (exitField) exitField.options = [...keys];
    const lastKey = keys.at(-1) ?? 'main_table';
    EntityDefs.warpExit.defaults = () => ({ fromSection: lastKey, x: 240, y: 360, vx: 0, vy: -650 });


}

/** Distance from point to line segment (used for endpoint hit tests). */
export { distToSegment };
