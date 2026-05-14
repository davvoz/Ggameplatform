import { GameConfig } from '../config/GameConfig.js';

/**
 * ArenaTheme: baked pixel-art battlefield background.
 *
 * One offscreen canvas per theme; render is a single drawImage per frame.
 * Each theme = palette + bridge style + per-theme landmark painter (identity).
 *
 * Public API (consumed by BattleRenderer):
 *   - ArenaTheme.forLevel(levelId) -> themeId
 *   - new ArenaTheme(themeId)
 *   - theme.draw(ctx)
 */
export class ArenaTheme {
    static forLevel(levelId) {
        return ArenaTheme.LEVEL_THEME_MAP[levelId] ?? 'grassland';
    }

    constructor(themeId) {
        this.themeId = ArenaTheme.THEMES[themeId] ? themeId : 'grassland';
        this._def = ArenaTheme.THEMES[this.themeId];
        this._canvas = this._bake();
    }

    draw(ctx) { ctx.drawImage(this._canvas, 0, 0); }

    // --- baking --------------------------------------------------------

    _bake() {
        const W = GameConfig.VIEW_WIDTH;
        const H = GameConfig.VIEW_HEIGHT;
        const cv = (typeof OffscreenCanvas === 'undefined')
            ? Object.assign(document.createElement('canvas'), { width: W, height: H })
            : new OffscreenCanvas(W, H);
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const a = GameConfig.ARENA;
        const midTop = a.BRIDGE_Y_CENTER - a.BRIDGE_HEIGHT / 2;
        const midBot = a.BRIDGE_Y_CENTER + a.BRIDGE_HEIGHT / 2;

        // 1. Backdrop
        ctx.fillStyle = this._def.bg;
        ctx.fillRect(0, 0, W, H);

        // 2. Terrain (smooth gradient per half — far edge dark, near midline lit)
        this._paintTerrainHalf(ctx, 0, a.TOP, W, midTop - a.TOP, true);
        this._paintTerrainHalf(ctx, 0, midBot, W, a.BOTTOM - midBot, false);

        // 3. Subtle team tint (player/enemy halves stay readable)
        ctx.fillStyle = 'rgba(255,90,90,0.06)';
        ctx.fillRect(0, a.TOP, W, midTop - a.TOP);
        ctx.fillStyle = 'rgba(95,168,255,0.06)';
        ctx.fillRect(0, midBot, W, a.BOTTOM - midBot);

        // 4. Landmarks (per-theme silhouettes — the identity layer)
        ArenaTheme._landmarks[this.themeId]?.(ctx, a, W, H);

        // 5. Battle lanes (worn paths from each tower toward the bridge)
        this._paintLanes(ctx, a, W);

        // 6. Midline (river / lava / chasm)
        this._paintMidline(ctx, 0, midTop, W, a.BRIDGE_HEIGHT);

        // 7. Bridge (with drop shadow & highlight)
        this._paintBridge(ctx, a);

        // 8. Vignette
        this._paintVignette(ctx, W, H);

        return cv;
    }

    _paintTerrainHalf(ctx, x, y, w, h, topHalf) {
        const t = this._def.terrain;
        const grd = ctx.createLinearGradient(0, y, 0, y + h);
        if (topHalf) {
            grd.addColorStop(0, t.deep);
            grd.addColorStop(1, t.light);
        } else {
            grd.addColorStop(0, t.light);
            grd.addColorStop(1, t.deep);
        }
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        // Mid-tone band (subtle horizontal depth cue)
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = t.mid;
        ctx.fillRect(x, y + h * 0.45, w, h * 0.1);
        ctx.globalAlpha = 1;
    }

    _paintLanes(ctx, a, W) {
        // Two symmetric darkened bands tower → bridge: gives flow + readability.
        const cx = W / 2;
        const laneW = 28;
        const towers = [
            [a.ENEMY_TOWER_X, a.ENEMY_TOWER_Y],
            [a.PLAYER_TOWER_X, a.PLAYER_TOWER_Y]
        ];
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this._def.terrain.deep;
        for (const [tx, ty] of towers) {
            const dx = cx - tx;
            const dy = a.BRIDGE_Y_CENTER - ty;
            const len = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(ang);
            ctx.fillRect(0, -laneW / 2, len, laneW);
            ctx.restore();
        }
        ctx.restore();
    }

    _paintMidline(ctx, x, y, w, h) {
        const m = this._def.midline;
        // Banks
        ctx.fillStyle = m.bank;
        ctx.fillRect(x, y - 2, w, 3);
        ctx.fillRect(x, y + h - 1, w, 3);
        // Body
        ctx.fillStyle = m.body;
        ctx.fillRect(x, y + 1, w, h - 2);
        // Glow
        if (m.glow) {
            const grd = ctx.createLinearGradient(0, y, 0, y + h);
            grd.addColorStop(0, 'rgba(0,0,0,0)');
            grd.addColorStop(0.5, m.glow);
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(x, y, w, h);
        }
    }

    _paintBridge(ctx, a) {
        const b = this._def.bridge;
        const bx = a.BRIDGE_LEFT_X;
        const by = a.BRIDGE_Y_CENTER - a.BRIDGE_HEIGHT / 2;
        const bw = a.BRIDGE_RIGHT_X - a.BRIDGE_LEFT_X;
        const bh = a.BRIDGE_HEIGHT;

        // Drop shadow (depth)
        ctx.fillStyle = 'rgba(0,0,0,0.40)';
        ctx.fillRect(bx + 2, by + bh, bw, 3);

        // Base
        ctx.fillStyle = b.base;
        ctx.fillRect(bx, by, bw, bh);

        // Plank lines
        ctx.fillStyle = b.line;
        if (b.style === 'planks-h') {
            for (let py = by + 6; py < by + bh; py += 8) ctx.fillRect(bx + 2, py, bw - 4, 1);
        } else {
            const step = b.plankStep ?? 14;
            for (let px = bx + step; px < bx + bw; px += step) ctx.fillRect(px, by + 2, 1, bh - 4);
        }

        // Top highlight (light from above)
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(bx, by, bw, 1);

        // Border
        ctx.strokeStyle = b.edge;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    }

    _paintVignette(ctx, W, H) {
        const grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35,
                                              W / 2, H / 2, Math.max(W, H) * 0.65);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
    }
}

// --- landmark painters: per-theme identity silhouettes -------------------

ArenaTheme._landmarks = {
    grassland(ctx, a, W) {
        // Distant rolling hills + foreground rock clusters near corners.
        const horizon = a.TOP + 18;
        ctx.fillStyle = '#1a3a1a';
        ArenaTheme._hills(ctx, 0, horizon, W, 30, 90, 16);
        ctx.fillStyle = '#0e240e';
        ArenaTheme._hills(ctx, 0, horizon + 12, W, 26, 130, 12);
        const yBot = a.BOTTOM - 12;
        ArenaTheme._rockCluster(ctx, 60, yBot);
        ArenaTheme._rockCluster(ctx, W - 60, yBot);
    },
    forest(ctx, a, W) {
        // Treeline silhouettes top & bottom — dense canopy.
        ArenaTheme._treeline(ctx, 0, a.TOP + 10, W);
        ArenaTheme._treeline(ctx, 0, a.BOTTOM - 26, W);
    },
    arcane(ctx, a, W) {
        // Floating monoliths flanking each half — verticality & mystery.
        ArenaTheme._monolith(ctx, 50,     a.TOP + 30,     24, 80);
        ArenaTheme._monolith(ctx, W - 50, a.TOP + 30,     24, 80);
        ArenaTheme._monolith(ctx, 50,     a.BOTTOM - 110, 24, 80);
        ArenaTheme._monolith(ctx, W - 50, a.BOTTOM - 110, 24, 80);
    },
    iron(ctx, a, W) {
        // Industrial smokestacks at each corner band.
        ArenaTheme._smokestack(ctx, 44,     a.TOP + 8,     20, 72);
        ArenaTheme._smokestack(ctx, W - 64, a.TOP + 8,     20, 72);
        ArenaTheme._smokestack(ctx, 44,     a.BOTTOM - 80, 20, 72);
        ArenaTheme._smokestack(ctx, W - 64, a.BOTTOM - 80, 20, 72);
    },
    infernal(ctx, a, W) {
        // Distant volcanoes + glowing cracked ground band.
        ArenaTheme._volcano(ctx, W * 0.25, a.TOP + 14, 80, 56);
        ArenaTheme._volcano(ctx, W * 0.75, a.TOP + 14, 80, 56);
        ctx.fillStyle = 'rgba(255,90,30,0.10)';
        ctx.fillRect(0, a.BOTTOM - 50, W, 50);
    }
};

// --- silhouette helpers (deterministic, no RNG) --------------------------

ArenaTheme._hills = function (ctx, x, y, w, h, period, amp) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    for (let px = x; px <= x + w; px += 4) {
        const k = (px - x) / period;
        const yy = y + h - amp * (0.5 + 0.5 * Math.sin(k * Math.PI * 2));
        ctx.lineTo(px, yy);
    }
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
};

ArenaTheme._treeline = function (ctx, x, y, w) {
    ctx.fillStyle = '#0a1a0e';
    ctx.fillRect(x, y, w, 22);
    ctx.fillStyle = '#16321a';
    for (let px = x; px < x + w; px += 14) {
        ctx.beginPath();
        ctx.moveTo(px, y + 6);
        ctx.lineTo(px + 7, y - 8);
        ctx.lineTo(px + 14, y + 6);
        ctx.closePath();
        ctx.fill();
    }
};

ArenaTheme._rockCluster = function (ctx, cx, cy) {
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(cx - 14, cy - 6, 28, 10);
    ctx.fillStyle = '#5a5a66';
    ctx.fillRect(cx - 12, cy - 9, 24, 6);
    ctx.fillRect(cx - 6,  cy - 12, 12, 4);
};

ArenaTheme._monolith = function (ctx, cx, cy, w, h) {
    ctx.fillStyle = '#1a0a2a';
    ctx.fillRect(cx - w / 2, cy, w, h);
    ctx.fillStyle = 'rgba(160,90,255,0.65)';
    ctx.fillRect(cx - 1, cy + 8, 2, h - 16);
};

ArenaTheme._smokestack = function (ctx, cx, cy, w, h) {
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(cx - w / 2, cy, w, h);
    ctx.fillStyle = '#3a1408';
    for (let py = cy + 6; py < cy + h; py += 14) ctx.fillRect(cx - w / 2, py, w, 2);
    ctx.fillStyle = '#5a5a66';
    ctx.fillRect(cx - w / 2 - 2, cy - 2, w + 4, 3);
};

ArenaTheme._volcano = function (ctx, cx, cy, w, h) {
    ctx.fillStyle = '#1a0808';
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy + h);
    ctx.lineTo(cx,         cy);
    ctx.lineTo(cx + w / 2, cy + h);
    ctx.closePath();
    ctx.fill();
    // Crater glow
    ctx.fillStyle = 'rgba(255,140,40,0.50)';
    ctx.fillRect(cx - 10, cy - 2, 20, 6);
    ctx.fillStyle = '#ff5a18';
    ctx.fillRect(cx - 6, cy + 2, 12, 4);
};

// --- theme registry ------------------------------------------------------

ArenaTheme.THEMES = Object.freeze({
    grassland: {
        bg: '#0a1a0a',
        terrain: { deep: '#1a3a1a', mid: '#2c5a2c', light: '#3a7a3a' },
        midline: { bank: '#7a5a3a', body: '#2a6aa8', glow: 'rgba(120,200,255,0.10)' },
        bridge:  { style: 'planks-v', base: '#7a5a3a', line: '#3a2a1a', edge: '#2a1a0a', studs: '#bfa07a', plankStep: 12 }
    },
    forest: {
        bg: '#070f08',
        terrain: { deep: '#0f240f', mid: '#1a3a1a', light: '#2a5a32' },
        midline: { bank: '#3a2a18', body: '#1a2238', glow: 'rgba(60,120,180,0.08)' },
        bridge:  { style: 'planks-h', base: '#5a3a1a', line: '#2a1a0a', edge: '#1a0f08', studs: '#8a6a3a', plankStep: 10 }
    },
    arcane: {
        bg: '#0a0418',
        terrain: { deep: '#180a30', mid: '#241640', light: '#33205a' },
        midline: { bank: '#4a2a6a', body: '#1a0a2a', glow: 'rgba(160,90,255,0.22)' },
        bridge:  { style: 'planks-v', base: '#5a3a8a', line: '#a070ff', edge: '#1a0a2a', studs: '#ffffff', plankStep: 14 }
    },
    iron: {
        bg: '#0a0a0e',
        terrain: { deep: '#1a1a22', mid: '#2a2a32', light: '#3d3d48' },
        midline: { bank: '#4a4a55', body: '#3a1408', glow: 'rgba(255,120,40,0.28)' },
        bridge:  { style: 'planks-h', base: '#4a4a55', line: '#1a1a22', edge: '#0a0a0e', studs: '#b8b8c8', plankStep: 8 }
    },
    infernal: {
        bg: '#0a0205',
        terrain: { deep: '#180808', mid: '#2a1010', light: '#4a2020' },
        midline: { bank: '#1a0a0a', body: '#5a1004', glow: 'rgba(255,90,30,0.40)' },
        bridge:  { style: 'planks-v', base: '#1a0a0a', line: '#3a1010', edge: '#000000', studs: '#dcd0c0', plankStep: 12 }
    }
});

ArenaTheme.LEVEL_THEME_MAP = Object.freeze({
    lvl_1_outpost: 'grassland',
    lvl_2_forest:  'forest',
    lvl_3_arcanum: 'arcane',
    lvl_4_iron:    'iron',
    lvl_5_final:   'infernal'
});
