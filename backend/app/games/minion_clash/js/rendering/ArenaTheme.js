import { GameConfig } from '../config/GameConfig.js';

/**
 * ArenaTheme  —  procedural HTML5 battlefield backgrounds.
 *
 * Design goals:
 *   • Atmospheric depth  (sky → far BG → mid BG → ground plane, 3–4 layers)
 *   • Instantly readable macro-silhouettes at a glance during gameplay
 *   • Professional indie feel: rich palettes, subtle noise, parallax layers
 *   • Zero RNG — every pixel is deterministic (seeded math / sine patterns)
 *   • Single baked OffscreenCanvas → one drawImage per frame
 *
 * Public API (consumed by BattleRenderer):
 *   ArenaTheme.forLevel(levelId)  →  themeId string
 *   new ArenaTheme(themeId)
 *   theme.draw(ctx)
 */
export class ArenaTheme {

    static forLevel(levelId) {
        return ArenaTheme.LEVEL_THEME_MAP[levelId] ?? 'grassland';
    }

    constructor(themeId) {
        this.themeId = ArenaTheme.THEMES[themeId] ? themeId : 'grassland';
        this._canvas  = this._bake();
    }

    draw(ctx) { ctx.drawImage(this._canvas, 0, 0); }

    // ─── baking ──────────────────────────────────────────────────────────────

    _bake() {
        const W   = GameConfig.VIEW_WIDTH;   // 480
        const H   = GameConfig.VIEW_HEIGHT;  // 800
        const a   = GameConfig.ARENA;
        const cv  = (typeof OffscreenCanvas === 'undefined')
            ? Object.assign(document.createElement('canvas'), { width: W, height: H })
            : new OffscreenCanvas(W, H);
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const midTop = a.BRIDGE_Y_CENTER - a.BRIDGE_HEIGHT / 2;   // 372
        const midBot = a.BRIDGE_Y_CENTER + a.BRIDGE_HEIGHT / 2;   // 428

        // Delegate to per-theme painter — full creative control per theme.
        ArenaTheme._painters[this.themeId](ctx, W, H, a, midTop, midBot);

        return cv;
    }
}

// ─── SHARED PRIMITIVES ───────────────────────────────────────────────────────
// All helpers are deterministic (seeded sine / integer loops — no Math.random).

const P = {};

/** Horizontal gradient fill over a rect. */
P.vGrad = function (ctx, x, y, w, h, stops) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    stops.forEach(([t, c]) => g.addColorStop(t, c));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
};

/** Radial glow centred on (cx,cy). */
P.radialGlow = function (ctx, cx, cy, r0, r1, c0, c1) {
    const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r1, 0, Math.PI * 2);
    ctx.fill();
};

/** Sky-to-ground full-canvas gradient. */
P.skyGrad = function (ctx, W, H, stops) {
    P.vGrad(ctx, 0, 0, W, H, stops);
};

/**
 * Sine-based undulating silhouette (mountain / hill chain).
 * @param {object} cfg - { yBase, amp, period, phase, height, color }
 */
P.sineShape = function (ctx, W, cfg) {
    const { yBase, amp, period, phase, height, color } = cfg;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, yBase + height);
    for (let x = 0; x <= W; x += 2) {
        const y = yBase - amp * Math.sin((x / period) * Math.PI * 2 + phase);
        ctx.lineTo(x, y);
    }
    ctx.lineTo(W, yBase + height);
    ctx.closePath();
    ctx.fill();
};

/**
 * Worn dirt lane from tower to bridge as a tapered trapezoid.
 * @param {object} cfg - { x1, y1, x2, y2, wNear, wFar, color, alpha }
 */
P.lane = function (ctx, cfg) {
    const { x1, y1, x2, y2, wNear, wFar, color, alpha = 0.22 } = cfg;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const p   = Math.PI / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = color;
    ctx.beginPath();
    ctx.moveTo(x1 + Math.cos(ang + p) * wNear, y1 + Math.sin(ang + p) * wNear);
    ctx.lineTo(x2 + Math.cos(ang + p) * wFar,  y2 + Math.sin(ang + p) * wFar);
    ctx.lineTo(x2 + Math.cos(ang - p) * wFar,  y2 + Math.sin(ang - p) * wFar);
    ctx.lineTo(x1 + Math.cos(ang - p) * wNear, y1 + Math.sin(ang - p) * wNear);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};

/**
 * Crisp vignette (darkens screen edges — every good indie game has one).
 */
P.vignette = function (ctx, W, H, strength = 0.6) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
};

/**
 * Pixel-noise texture pass — adds organic grain without RNG per pixel
 * (uses deterministic sin-based hash → no visible pattern, no randomness).
 */
P.noisePass = function (ctx, W, H, alpha = 0.04) {
    const id  = ctx.getImageData(0, 0, W, H);
    const d   = id.data;
    for (let i = 0; i < d.length; i += 4) {
        const px  = (i >> 2) % W;
        const py  = Math.trunc((i >> 2) / W);
        const n   = (Math.sin(px * 127.1 + py * 311.7) * 43758.5453) % 1;
        const v   = ((n < 0 ? n + 1 : n) - 0.5) * 255 * alpha;
        d[i]     = Math.min(255, Math.max(0, d[i]     + v));
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + v));
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + v));
    }
    ctx.putImageData(id, 0, 0);
};

/**
 * Bridge — parametric stone/wood/obsidian variants.
 * style: 'stone' | 'wood' | 'obsidian' | 'bone'
 */
P.bridge = function (ctx, a, style) {
    const bx = a.BRIDGE_LEFT_X;                             // 130
    const by = a.BRIDGE_Y_CENTER - a.BRIDGE_HEIGHT / 2;    // 372
    const bw = a.BRIDGE_RIGHT_X - a.BRIDGE_LEFT_X;         // 220
    const bh = a.BRIDGE_HEIGHT;                             // 56

    const S = {
        stone:    { base: '#8a7a6a', plank: '#6a5a4a', edge: '#3a2a1a', hl: 'rgba(255,240,200,0.22)', shadow: 'rgba(0,0,0,0.5)' },
        wood:     { base: '#7a5230', plank: '#4a3010', edge: '#2a1808', hl: 'rgba(255,220,160,0.2)', shadow: 'rgba(0,0,0,0.45)' },
        obsidian: { base: '#2a1a4a', plank: '#4a2a8a', edge: '#0a0418', hl: 'rgba(180,120,255,0.3)', shadow: 'rgba(0,0,0,0.7)' },
        bone:     { base: '#d4c8a8', plank: '#a09070', edge: '#604830', hl: 'rgba(255,255,220,0.18)', shadow: 'rgba(80,20,0,0.55)' },
    };
    const style_s = S[style] ?? S.stone;

    // Drop shadow
    ctx.save();
    ctx.fillStyle = style_s.shadow;
    ctx.fillRect(bx + 3, by + bh, bw - 3, 5);
    ctx.restore();

    // Underbelly (stone brackets visible below deck)
    ctx.fillStyle = style_s.edge;
    ctx.fillRect(bx - 4, by + bh - 6, 8, 10);
    ctx.fillRect(bx + bw - 4, by + bh - 6, 8, 10);

    // Deck base
    ctx.fillStyle = style_s.base;
    ctx.fillRect(bx, by, bw, bh);

    // Plank seams (vertical — perspective top-down)
    ctx.fillStyle = style_s.plank;
    const step = style === 'obsidian' ? 18 : 14;
    for (let px = bx + step; px < bx + bw - 2; px += step) {
        ctx.fillRect(px, by + 2, 1, bh - 4);
    }

    // Cross-beam stripes (structural feel)
    ctx.fillStyle = style_s.edge;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(bx, by + Math.floor(bh * 0.3), bw, 2);
    ctx.fillRect(bx, by + Math.floor(bh * 0.68), bw, 2);
    ctx.globalAlpha = 1;

    // Top highlight (rim light from above)
    ctx.fillStyle = style_s.hl;
    ctx.fillRect(bx, by, bw, 2);

    // Railing posts
    ctx.fillStyle = style_s.edge;
    for (let px = bx + 4; px < bx + bw; px += 22) {
        ctx.fillRect(px, by - 4, 3, 6);
        ctx.fillRect(px, by + bh - 2, 3, 6);
    }
    // Railing rails
    ctx.fillStyle = style_s.base;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(bx, by - 3, bw, 2);
    ctx.fillRect(bx, by + bh, bw, 2);
    ctx.globalAlpha = 1;

    // Outer border
    ctx.strokeStyle = style_s.edge;
    ctx.lineWidth   = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
};

/**
 * Team tint overlay — top half = enemy red, bottom half = player blue.
 * Very subtle: just enough to communicate territory.
 */
P.teamTint = function (ctx, W, a, midTop, midBot) {
    ctx.fillStyle = 'rgba(255,70,70,0.055)';
    ctx.fillRect(0, a.TOP, W, midTop - a.TOP);
    ctx.fillStyle = 'rgba(70,130,255,0.055)';
    ctx.fillRect(0, midBot, W, a.BOTTOM - midBot);
};


// ─── THEME PAINTERS ──────────────────────────────────────────────────────────
// Each painter has FULL freedom to express its atmosphere.
// Order of layers: sky → far BG → mid BG → ground → lanes → midline → bridge
//                → team tint → noise → vignette

ArenaTheme._painters = {

    // ══════════════════════════════════════════════════════════════
    // GRASSLAND  — golden-hour meadow, distant mountains, sunlit ford
    // ══════════════════════════════════════════════════════════════
    grassland(ctx, W, H, a, midTop, midBot) {

        // Sky — warm dusk gradient
        P.skyGrad(ctx, W, H, [
            [0, '#1a0e28'],
            [0.18, '#3d1f4a'],
            [0.36, '#c05a28'],
            [0.52, '#e8a040'],
            [0.62, '#6a9a40'],
            [1, '#2a5a18'],
        ]);

        // Far mountain range — 3 depth layers
        P.sineShape(ctx, W, { yBase: 190, amp: 42, period: 110, phase: 0,   height: H, color: '#2a1a38' });
        P.sineShape(ctx, W, { yBase: 205, amp: 30, period: 80,  phase: 1.2, height: H, color: '#3a2a1a' });
        P.sineShape(ctx, W, { yBase: 222, amp: 20, period: 55,  phase: 2.6, height: H, color: '#2a4020' });

        // Mid-distance horizon ridge (enemy side)
        P.sineShape(ctx, W, { yBase: midTop - 80, amp: 18, period: 160, phase: 0.8, height: H, color: '#1e3a18' });
        P.sineShape(ctx, W, { yBase: midTop - 50, amp: 12, period: 100, phase: 1.9, height: H, color: '#2a4a22' });

        // Ground plane — enemy half (far = dark, near midline = light)
        P.vGrad(ctx, 0, a.TOP, W, midTop - a.TOP, [
            [0, '#1c2e14'],
            [0.5, '#2e4e20'],
            [1, '#4a7830'],
        ]);

        // Ground plane — player half
        P.vGrad(ctx, 0, midBot, W, a.BOTTOM - midBot, [
            [0, '#4a7830'],
            [0.5, '#3a6028'],
            [1, '#1e3010'],
        ]);

        // Foreground grass texture strips (horizontal dark lines = blades of grass)
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#0a1a08';
        for (let y = midBot + 20; y < a.BOTTOM; y += 6) ctx.fillRect(0, y, W, 1);
        for (let y = a.TOP + 20;  y < midTop;   y += 7) ctx.fillRect(0, y, W, 1);
        ctx.restore();

        // Sunlight shaft from upper-right (atmospheric)
        ctx.save();
        ctx.globalAlpha = 0.06;
        const sg = ctx.createLinearGradient(W, 0, W * 0.2, H * 0.55);
        sg.addColorStop(0, 'rgba(255,200,80,0.9)');
        sg.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // Battle lanes
        P.lane(ctx, { x1: a.ENEMY_TOWER_X,  y1: a.ENEMY_TOWER_Y,  x2: W / 2, y2: midTop, wNear: 18, wFar: 28, color: '#1a0e08', alpha: 0.28 });
        P.lane(ctx, { x1: a.PLAYER_TOWER_X, y1: a.PLAYER_TOWER_Y, x2: W / 2, y2: midBot, wNear: 18, wFar: 28, color: '#1a0e08', alpha: 0.28 });

        // River (midline) — clear water catching orange sky
        P.vGrad(ctx, 0, midTop, W, a.BRIDGE_HEIGHT, [
            [0, '#5a3a1a'],
            [0.12, '#3060a0'],
            [0.45, '#2878c8'],
            [0.55, '#2878c8'],
            [0.88, '#3060a0'],
            [1, '#5a3a1a'],
        ]);
        // River shimmer
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#e8c060';
        for (let x = 10; x < W - 10; x += 22) ctx.fillRect(x, midTop + 14, 10, 2);
        for (let x = 26; x < W - 10; x += 22) ctx.fillRect(x, midTop + 24, 6, 2);
        ctx.restore();

        P.bridge(ctx, a, 'wood');
        P.teamTint(ctx, W, a, midTop, midBot);
        P.noisePass(ctx, W, H, 0.05);
        P.vignette(ctx, W, H, 0.55);
    },

    // ══════════════════════════════════════════════════════════════
    // FOREST  — ancient twilight canopy, fog-filled ravine midline
    // ══════════════════════════════════════════════════════════════
    forest(ctx, W, H, a, midTop, midBot) {

        // Sky — deep teal-indigo night
        P.skyGrad(ctx, W, H, [
            [0, '#030a0e'],
            [0.25, '#071820'],
            [0.5, '#0a2818'],
            [0.75, '#0d1e10'],
            [1, '#060d06'],
        ]);

        // Distant mountain silhouette
        P.sineShape(ctx, W, { yBase: 200, amp: 50, period: 120, phase: 0.3, height: H, color: '#040c08' });

        // Far canopy wall (enemy side)
        P.sineShape(ctx, W, { yBase: a.TOP + 40, amp: 22, period: 32, phase: 0,   height: midTop + 50, color: '#071208' });
        P.sineShape(ctx, W, { yBase: a.TOP + 28, amp: 18, period: 22, phase: 0.9, height: midTop + 50, color: '#0a1a0c' });
        // Canopy teeth — sharp conifers
        ctx.fillStyle = '#061008';
        for (let x = -8; x < W; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x,      a.TOP + 62);
            ctx.lineTo(x + 8,  a.TOP + 18);
            ctx.lineTo(x + 16, a.TOP + 62);
            ctx.closePath();
            ctx.fill();
        }
        // Same for player side (inverted)
        ctx.fillStyle = '#061008';
        for (let x = -8; x < W; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x,      a.BOTTOM - 62);
            ctx.lineTo(x + 8,  a.BOTTOM - 18);
            ctx.lineTo(x + 16, a.BOTTOM - 62);
            ctx.closePath();
            ctx.fill();
        }

        // Ground — mossy dark earth
        P.vGrad(ctx, 0, a.TOP + 40, W, midTop - a.TOP - 40, [
            [0, '#060e06'],
            [0.5, '#0c1a0c'],
            [1, '#183018'],
        ]);
        P.vGrad(ctx, 0, midBot, W, a.BOTTOM - 60 - midBot, [
            [0, '#183018'],
            [0.5, '#0e180e'],
            [1, '#060e06'],
        ]);

        // Scattered firefly dots (luminous — world identity)
        ctx.save();
        ctx.globalAlpha = 0.7;
        const ffPositions = [
            [40,200],[80,160],[110,230],[160,180],[200,210],[300,190],[340,160],
            [380,220],[420,175],[50,600],[90,640],[140,610],[190,580],[260,630],
            [310,660],[370,620],[430,595],
        ];
        ffPositions.forEach(([fx, fy]) => {
            P.radialGlow(ctx, fx, fy, 0, 5, 'rgba(120,255,120,0.9)', 'rgba(60,200,60,0)');
        });
        ctx.restore();

        // Battle lanes (damp earth paths through the forest)
        P.lane(ctx, { x1: a.ENEMY_TOWER_X,  y1: a.ENEMY_TOWER_Y,  x2: W / 2, y2: midTop, wNear: 16, wFar: 24, color: '#0a0e08', alpha: 0.3 });
        P.lane(ctx, { x1: a.PLAYER_TOWER_X, y1: a.PLAYER_TOWER_Y, x2: W / 2, y2: midBot, wNear: 16, wFar: 24, color: '#0a0e08', alpha: 0.3 });

        // Ravine / fog midline
        P.vGrad(ctx, 0, midTop - 10, W, a.BRIDGE_HEIGHT + 20, [
            [0, '#060e08'],
            [0.2, '#1a3020'],
            [0.5, '#2a4830'],
            [0.8, '#1a3020'],
            [1, '#060e08'],
        ]);
        // Fog wisps
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#80c8a0';
        for (let x = 0; x < W; x += 30) {
            ctx.fillRect(x, midTop + 8, 20, 6);
            ctx.fillRect(x + 14, midTop + 18, 16, 4);
        }
        ctx.restore();

        P.bridge(ctx, a, 'wood');
        P.teamTint(ctx, W, a, midTop, midBot);
        P.noisePass(ctx, W, H, 0.06);
        P.vignette(ctx, W, H, 0.68);
    },

    // ══════════════════════════════════════════════════════════════
    // ARCANE  — ruined archmage fortress, levitating shards, ley-line midline
    // ══════════════════════════════════════════════════════════════
    arcane(ctx, W, H, a, midTop, midBot) {

        // Sky — deep cosmic purple-black
        P.skyGrad(ctx, W, H, [
            [0, '#04010c'],
            [0.2, '#0c0420'],
            [0.45, '#180832'],
            [0.65, '#0e0420'],
            [1, '#04010c'],
        ]);

        // Nebula glow (background atmosphere)
        P.radialGlow(ctx, W * 0.3, 150, 0, 160, 'rgba(100,40,200,0.18)', 'rgba(0,0,0,0)');
        P.radialGlow(ctx, W * 0.75, 280, 0, 120, 'rgba(200,80,255,0.12)', 'rgba(0,0,0,0)');
        P.radialGlow(ctx, W * 0.5, a.BRIDGE_Y_CENTER, 0, 80, 'rgba(180,100,255,0.2)', 'rgba(0,0,0,0)');

        // Distant ruined spires (silhouette layer 1 — darkest, farthest)
        const spires1 = [[60,180,14,90],[120,200,10,70],[W-70,185,14,90],[W-130,205,10,70],
                         [180,210,8,55],[300,195,10,65]];
        ctx.fillStyle = '#0a0418';
        spires1.forEach(([sx, sy, sw, sh]) => {
            ctx.fillRect(sx - sw/2, sy, sw, sh);
            // Spire tip
            ctx.beginPath();
            ctx.moveTo(sx - sw/2, sy);
            ctx.lineTo(sx,        sy - sw * 1.5);
            ctx.lineTo(sx + sw/2, sy);
            ctx.closePath();
            ctx.fill();
        });

        // Ruined arch flanks (mid layer)
        const archData = [[30, a.TOP+60, 22, 110], [W-52, a.TOP+60, 22, 110],
                          [30, a.BOTTOM-170, 22, 110], [W-52, a.BOTTOM-170, 22, 110]];
        ctx.fillStyle = '#14082a';
        archData.forEach(([ax, ay, aw, ah]) => {
            ctx.fillRect(ax, ay, aw, ah);
            // Carved rune glow
            ctx.fillStyle = 'rgba(160,80,255,0.55)';
            ctx.fillRect(ax + aw/2 - 1, ay + 12, 2, ah - 24);
            ctx.fillStyle = '#14082a';
        });

        // Floating shards (iconic identity element)
        const shards = [
            [55,  a.TOP+100, 10, 30, 0.4],
            [W-55,a.TOP+100, 10, 30, 0.4],
            [70,  a.BOTTOM-130,10,30, 0.4],
            [W-70,a.BOTTOM-130,10,30, 0.4],
        ];
        shards.forEach(([sx, sy, sw, sh, alpha]) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(sx, sy);
            ctx.rotate(0.35);
            ctx.fillStyle = '#1a0838';
            ctx.fillRect(-sw/2, -sh/2, sw, sh);
            // Shard edge glow
            ctx.fillStyle = 'rgba(200,120,255,0.7)';
            ctx.fillRect(-1, -sh/2, 2, sh);
            ctx.fillRect(-sw/2, -1, sw, 2);
            ctx.restore();
        });

        // Ground plane — dark arcane stone
        P.vGrad(ctx, 0, a.TOP, W, midTop - a.TOP, [
            [0, '#060210'],
            [0.5, '#100428'],
            [1, '#1c0840'],
        ]);
        P.vGrad(ctx, 0, midBot, W, a.BOTTOM - midBot, [
            [0, '#1c0840'],
            [0.5, '#100428'],
            [1, '#060210'],
        ]);

        // Magic hex-tile pattern (ground)
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = '#a060ff';
        ctx.lineWidth = 0.8;
        for (let gx = 0; gx < W; gx += 28) {
            for (let gy = a.TOP; gy < a.BOTTOM; gy += 24) {
                ctx.strokeRect(gx + (gy % 56 === 0 ? 0 : 14), gy, 28, 24);
            }
        }
        ctx.restore();

        // Battle lanes
        P.lane(ctx, { x1: a.ENEMY_TOWER_X,  y1: a.ENEMY_TOWER_Y,  x2: W / 2, y2: midTop, wNear: 14, wFar: 22, color: '#080218', alpha: 0.35 });
        P.lane(ctx, { x1: a.PLAYER_TOWER_X, y1: a.PLAYER_TOWER_Y, x2: W / 2, y2: midBot, wNear: 14, wFar: 22, color: '#080218', alpha: 0.35 });

        // Ley-line midline — crackling magical barrier
        P.vGrad(ctx, 0, midTop - 4, W, a.BRIDGE_HEIGHT + 8, [
            [0, '#04010c'],
            [0.15, '#1a0440'],
            [0.35, '#301060'],
            [0.5, '#4a1a80'],
            [0.65, '#301060'],
            [0.85, '#1a0440'],
            [1, '#04010c'],
        ]);
        // Ley-line pulses (static geometry)
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#c080ff';
        for (let x = 0; x < W; x += 18) {
            const pulse = Math.sin(x * 0.08) * 6;
            ctx.fillRect(x, a.BRIDGE_Y_CENTER - 1 + pulse, 10, 2);
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        P.bridge(ctx, a, 'obsidian');
        P.teamTint(ctx, W, a, midTop, midBot);
        P.noisePass(ctx, W, H, 0.04);
        P.vignette(ctx, W, H, 0.72);
    },

    // ══════════════════════════════════════════════════════════════
    // IRON  — industrial war-factory, chimneys, slag river, iron bridge
    // ══════════════════════════════════════════════════════════════
    iron(ctx, W, H, a, midTop, midBot) {

        // Sky — heavy smog: charcoal with orange-ember glow near horizon
        P.skyGrad(ctx, W, H, [
            [0, '#080810'],
            [0.28, '#141418'],
            [0.48, '#281408'],
            [0.6, '#3a1e0a'],
            [0.72, '#1e1210'],
            [1, '#0c0c10'],
        ]);

        // Smog layer (horizontal haze bands)
        ctx.save();
        ctx.globalAlpha = 0.12;
        for (let y = 60; y < 280; y += 36) {
            const g = ctx.createLinearGradient(0, y, 0, y + 20);
            g.addColorStop(0, 'rgba(80,40,20,0)');
            g.addColorStop(0.5, 'rgba(80,40,20,1)');
            g.addColorStop(1, 'rgba(80,40,20,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, y, W, 20);
        }
        ctx.restore();

        // Industrial skyline — smokestacks + factory rooflines (enemy side)
        const rooflineData = [
            [0, 180, 60, 100], [55, 160, 40, 120], [90, 175, 50, 105],
            [135, 155, 35, 125],[165, 168, 55, 112],[215, 150, 30, 130],
            [240, 162, 45, 118],[280, 158, 40, 122],[315, 170, 50, 110],
            [360, 155, 35, 125],[390, 165, 55, 115],[435, 175, 50, 105],
        ];
        ctx.fillStyle = '#0c0c14';
        rooflineData.forEach(([rx, ry, rw, rh]) => ctx.fillRect(rx, ry, rw, rh));
        // Factory silhouette layer 2 (brighter)
        ctx.fillStyle = '#141420';
        rooflineData.forEach(([rx, ry, rw, rh]) => ctx.fillRect(rx + 2, ry + 4, rw - 6, rh));

        // Smokestacks with ember-lit tops (iconic read)
        const stacks = [[44,a.TOP+8,12,90],[90,a.TOP+18,10,80],[W-56,a.TOP+8,12,90],[W-100,a.TOP+18,10,80],
                        [44,a.BOTTOM-98,12,90],[90,a.BOTTOM-88,10,80],[W-56,a.BOTTOM-98,12,90],[W-100,a.BOTTOM-88,10,80]];
        stacks.forEach(([sx, sy, sw, sh]) => {
            // Stack body
            ctx.fillStyle = '#1a1a24';
            ctx.fillRect(sx - sw/2, sy, sw, sh);
            // Rivet bands
            ctx.fillStyle = '#2e2e3a';
            for (let ry = sy + 10; ry < sy + sh; ry += 18) ctx.fillRect(sx - sw/2 - 1, ry, sw + 2, 2);
            // Cap
            ctx.fillStyle = '#0a0a10';
            ctx.fillRect(sx - sw/2 - 2, sy - 3, sw + 4, 4);
            // Ember glow at top
            P.radialGlow(ctx, sx, sy - 2, 0, sw * 1.8, 'rgba(255,120,30,0.5)', 'rgba(255,80,0,0)');
        });

        // Ground — dark metallic / ash-coated earth
        P.vGrad(ctx, 0, a.TOP, W, midTop - a.TOP, [
            [0, '#0c0c14'],
            [0.5, '#1a1a22'],
            [1, '#262630'],
        ]);
        P.vGrad(ctx, 0, midBot, W, a.BOTTOM - midBot, [
            [0, '#262630'],
            [0.5, '#1a1a22'],
            [1, '#0c0c14'],
        ]);

        // Metal-plate ground texture
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#3a3a4a';
        ctx.lineWidth   = 1;
        for (let gx = 0; gx < W; gx += 32) ctx.strokeRect(gx, a.TOP, 32, H);
        for (let gy = a.TOP; gy < a.BOTTOM; gy += 32) ctx.strokeRect(0, gy, W, 32);
        ctx.restore();

        // Battle lanes — worn metal tracks
        P.lane(ctx, { x1: a.ENEMY_TOWER_X,  y1: a.ENEMY_TOWER_Y,  x2: W / 2, y2: midTop, wNear: 18, wFar: 28, color: '#080810', alpha: 0.32 });
        P.lane(ctx, { x1: a.PLAYER_TOWER_X, y1: a.PLAYER_TOWER_Y, x2: W / 2, y2: midBot, wNear: 18, wFar: 28, color: '#080810', alpha: 0.32 });

        // Molten slag river
        P.vGrad(ctx, 0, midTop, W, a.BRIDGE_HEIGHT, [
            [0, '#1a0a04'],
            [0.1, '#3a1004'],
            [0.3, '#8a2804'],
            [0.5, '#c84010'],
            [0.7, '#8a2804'],
            [0.9, '#3a1004'],
            [1, '#1a0a04'],
        ]);
        // Lava crust cracks
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#200808';
        for (let x = 10; x < W - 10; x += 24) {
            ctx.fillRect(x, midTop + 8, 12, 2);
            ctx.fillRect(x + 8, midTop + 20, 8, 2);
            ctx.fillRect(x + 2, midTop + 32, 14, 2);
        }
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#ff8020';
        for (let x = 16; x < W - 16; x += 36) ctx.fillRect(x, midTop + 14, 4, 1);
        ctx.restore();

        P.bridge(ctx, a, 'stone');  // iron stone bridge over lava
        P.teamTint(ctx, W, a, midTop, midBot);
        P.noisePass(ctx, W, H, 0.06);
        P.vignette(ctx, W, H, 0.6);
    },

    // ══════════════════════════════════════════════════════════════
    // INFERNAL  — volcanic hellscape, twin volcanoes, lava sea midline
    // ══════════════════════════════════════════════════════════════
    infernal(ctx, W, H, a, midTop, midBot) {

        // Sky — blood-smoke atmosphere
        P.skyGrad(ctx, W, H, [
            [0, '#050002'],
            [0.15, '#150408'],
            [0.3, '#340a0a'],
            [0.48, '#600810'],
            [0.6, '#3a0808'],
            [0.8, '#1a0404'],
            [1, '#050002'],
        ]);

        // Ashen sky particles (horizontal streaks)
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#c04020';
        for (let y = 20; y < 220; y += 14) {
            for (let x = 0; x < W; x += 40) {
                ctx.fillRect(x + ((y * 7) % 38), y, 18, 1);
            }
        }
        ctx.restore();

        // Distant volcanic peaks — 2 iconic volcanoes (dominant silhouettes)
        // Enemy side
        ctx.fillStyle = '#120404';
        ctx.beginPath();
        ctx.moveTo(0,       midTop - 20);
        ctx.lineTo(W * 0.22, a.TOP + 20);
        ctx.lineTo(W * 0.44, midTop - 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0a0202';
        ctx.beginPath();
        ctx.moveTo(W * 0.3, midTop - 20);
        ctx.lineTo(W * 0.52, a.TOP + 8);
        ctx.lineTo(W * 0.74, midTop - 20);
        ctx.closePath();
        ctx.fill();
        // Volcano craters — orange glow
        P.radialGlow(ctx, W * 0.22, a.TOP + 20, 0, 28, 'rgba(255,140,20,0.55)', 'rgba(200,40,0,0)');
        P.radialGlow(ctx, W * 0.52, a.TOP + 8,  0, 32, 'rgba(255,160,30,0.5)', 'rgba(200,40,0,0)');
        // Lava flows down volcano flanks
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#c83010';
        // Left volcano lava
        ctx.beginPath();
        ctx.moveTo(W*0.22-4, a.TOP+24);
        ctx.lineTo(W*0.16, midTop-30);
        ctx.lineTo(W*0.2, midTop-30);
        ctx.lineTo(W*0.22+4, a.TOP+24);
        ctx.closePath();
        ctx.fill();
        // Right volcano lava
        ctx.beginPath();
        ctx.moveTo(W*0.52-4, a.TOP+12);
        ctx.lineTo(W*0.47, midTop-30);
        ctx.lineTo(W*0.5, midTop-30);
        ctx.lineTo(W*0.52+4, a.TOP+12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Ground — scorched basalt
        P.vGrad(ctx, 0, a.TOP, W, midTop - a.TOP, [
            [0, '#080202'],
            [0.5, '#180606'],
            [1, '#2a0c08'],
        ]);
        P.vGrad(ctx, 0, midBot, W, a.BOTTOM - midBot, [
            [0, '#2a0c08'],
            [0.5, '#180606'],
            [1, '#080202'],
        ]);

        // Cracked basalt ground texture
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#c83010';
        ctx.lineWidth   = 0.8;
        const cracks = [
            [20,300, 60,320],[60,330,100,345],[100,310,130,290],[130,290,170,310],
            [200,295,240,325],[270,300,310,280],[340,310,380,330],[400,290,440,315],
            [30,680, 70,650],[100,660,140,680],[180,645,220,670],[250,680,290,655],
            [320,665,360,685],[390,650,430,670],
        ];
        cracks.forEach(([x1,y1,x2,y2]) => {
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        });
        // Glow-filled cracks
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#ff5010';
        ctx.lineWidth   = 1.5;
        cracks.forEach(([x1,y1,x2,y2]) => {
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        });
        ctx.restore();

        // Battle lanes
        P.lane(ctx, { x1: a.ENEMY_TOWER_X,  y1: a.ENEMY_TOWER_Y,  x2: W / 2, y2: midTop, wNear: 16, wFar: 26, color: '#050102', alpha: 0.35 });
        P.lane(ctx, { x1: a.PLAYER_TOWER_X, y1: a.PLAYER_TOWER_Y, x2: W / 2, y2: midBot, wNear: 16, wFar: 26, color: '#050102', alpha: 0.35 });

        // Lava sea midline — the most intense visual element
        P.vGrad(ctx, 0, midTop, W, a.BRIDGE_HEIGHT, [
            [0, '#1a0402'],
            [0.1, '#6a1004'],
            [0.3, '#d03008'],
            [0.5, '#ff5010'],
            [0.7, '#d03008'],
            [0.9, '#6a1004'],
            [1, '#1a0402'],
        ]);
        // Lava surface — bright streaks and dark crust islands
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ff8020';
        for (let x = 8; x < W - 8; x += 20) {
            ctx.fillRect(x, midTop + 12, 8, 2);
            ctx.fillRect(x + 4, midTop + 30, 5, 2);
            ctx.fillRect(x + 1, midTop + 44, 7, 2);
        }
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#1a0404';
        for (let x = 18; x < W - 18; x += 34) {
            ctx.fillRect(x, midTop + 18, 14, 4);
        }
        ctx.restore();

        // Lava ambient glow onto ground
        ctx.save();
        ctx.globalAlpha = 0.12;
        const lavag1 = ctx.createLinearGradient(0, midTop - 40, 0, midTop);
        lavag1.addColorStop(0, 'rgba(255,80,16,0)');
        lavag1.addColorStop(1, 'rgba(255,80,16,1)');
        ctx.fillStyle = lavag1;
        ctx.fillRect(0, midTop - 40, W, 40);
        const lavag2 = ctx.createLinearGradient(0, midBot, 0, midBot + 40);
        lavag2.addColorStop(0, 'rgba(255,80,16,1)');
        lavag2.addColorStop(1, 'rgba(255,80,16,0)');
        ctx.fillStyle = lavag2;
        ctx.fillRect(0, midBot, W, 40);
        ctx.restore();

        P.bridge(ctx, a, 'bone');
        P.teamTint(ctx, W, a, midTop, midBot);
        P.noisePass(ctx, W, H, 0.06);
        P.vignette(ctx, W, H, 0.65);
    },

};

// ─── LEVEL → THEME MAP ───────────────────────────────────────────────────────

ArenaTheme.THEMES = Object.freeze({
    grassland: true, forest: true, arcane: true, iron: true, infernal: true
});

ArenaTheme.LEVEL_THEME_MAP = Object.freeze({
    lvl_1_outpost:  'grassland',
    lvl_2_forest:   'forest',
    lvl_3_arcanum:  'arcane',
    lvl_4_iron:     'iron',
    lvl_5_final:    'infernal',
    lvl_6_siphon:   'arcane',
    lvl_7_fortress: 'iron'
});
