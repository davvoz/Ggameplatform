/**
 * AssetManager - Professional cartoon-style procedural sprite generation
 * All sprites are large, detailed, with thick outlines, highlights,
 * shading panels, and glowing accents for a polished cartoon look.
 */
class AssetManager {
    constructor() {
        this.sprites = {};
        this.loaded = false;
    }

    async load() {
        this.generateShipSprites();
        this.generateEnemySprites();
        this.generateBossSprites();
        this.generateMiniBossSprites();
        this.generatePerkDeviceSprites();
        this.loaded = true;
    }

    // ===== HELPER: cartoon outline path =====
    outlineAndFill(ctx, fillColor, outlineColor = '#111', lineWidth = 3) {
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    // ===== HELPER: inner highlight strip =====
    drawHighlight(ctx, x, y, w, h, alpha = 0.25) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.35, y + h * 0.2, w * 0.22, h * 0.12, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ===== HELPER: cockpit bubble =====
    drawCockpit(ctx, cx, cy, rx, ry, tint = '#88ddff') {
        const cg = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 0, cx, cy, Math.max(rx, ry));
        cg.addColorStop(0, '#ffffff');
        cg.addColorStop(0.3, tint);
        cg.addColorStop(0.7, '#2255aa');
        cg.addColorStop(1, '#112244');
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = cg;
        ctx.fill();
        ctx.strokeStyle = '#11223366';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(cx - rx * 0.25, cy - ry * 0.3, Math.min(rx, ry) * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    // ===== HELPER: engine nozzle =====
    drawEngineNozzle(ctx, cx, by, width, height, color) {
        ctx.beginPath();
        ctx.moveTo(cx - width / 2, by - height);
        ctx.lineTo(cx - width * 0.65, by);
        ctx.lineTo(cx + width * 0.65, by);
        ctx.lineTo(cx + width / 2, by - height);
        ctx.closePath();
        ctx.fillStyle = '#333';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();
        const eg = ctx.createLinearGradient(cx, by - height, cx, by);
        eg.addColorStop(0, 'rgba(0,0,0,0)');
        eg.addColorStop(0.5, color);
        eg.addColorStop(1, '#fff');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.moveTo(cx - width * 0.3, by - height * 0.5);
        ctx.lineTo(cx - width * 0.45, by);
        ctx.lineTo(cx + width * 0.45, by);
        ctx.lineTo(cx + width * 0.3, by - height * 0.5);
        ctx.closePath();
        ctx.fill();
    }

    // ================================================================
    //  PLAYER SHIPS  (128×128 canvas, drawn big and cartoon-like)
    // ================================================================

    generateShipSprites() {
        const ships = {
            vanguard:    { body: '#3377ee', accent: '#66aaff', dark: '#1a4499', wing: '#2266cc', engine: '#44bbff' },
            interceptor: { body: '#22cc66', accent: '#66ffaa', dark: '#117744', wing: '#11aa55', engine: '#44ffaa' },
            fortress:    { body: '#6666dd', accent: '#9999ff', dark: '#3333aa', wing: '#5555cc', engine: '#8888ff' },
            striker:     { body: '#ee7722', accent: '#ffaa55', dark: '#aa4400', wing: '#cc6611', engine: '#ffcc44' },
            titan:       { body: '#dd3366', accent: '#ff77aa', dark: '#991144', wing: '#cc2255', engine: '#ff88bb' }
        };
        for (const [name, col] of Object.entries(ships)) {
            this.sprites[`ship_${name}`] = this.createShipSprite(name, col);
        }
    }

    createShipSprite(name, c) {
        const S = 128;
        const cv = document.createElement('canvas');
        cv.width = S; cv.height = S;
        const ctx = cv.getContext('2d');
        const cx = S / 2, cy = S / 2;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (name) {

        // ── VANGUARD ──────────────────────────────
        case 'vanguard': {
            // Wings
            ctx.beginPath();
            ctx.moveTo(cx, 18);
            ctx.lineTo(cx + 42, cy + 20);
            ctx.lineTo(cx + 38, cy + 34);
            ctx.lineTo(cx + 10, cy + 14);
            ctx.closePath();
            this.outlineAndFill(ctx, c.wing);
            ctx.beginPath();
            ctx.moveTo(cx, 18);
            ctx.lineTo(cx - 42, cy + 20);
            ctx.lineTo(cx - 38, cy + 34);
            ctx.lineTo(cx - 10, cy + 14);
            ctx.closePath();
            this.outlineAndFill(ctx, c.wing);

            // Wing tip pylons
            ctx.fillStyle = c.accent;
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.roundRect(cx + sx * 36 - 3, cy + 20, 6, 16, 2);
                ctx.fill(); ctx.stroke();
            }

            // Main body
            ctx.beginPath();
            ctx.moveTo(cx, 10);
            ctx.bezierCurveTo(cx + 18, 20, cx + 16, cy + 10, cx + 12, cy + 36);
            ctx.lineTo(cx + 6, cy + 40);
            ctx.lineTo(cx, cy + 34);
            ctx.lineTo(cx - 6, cy + 40);
            ctx.lineTo(cx - 12, cy + 36);
            ctx.bezierCurveTo(cx - 16, cy + 10, cx - 18, 20, cx, 10);
            ctx.closePath();
            this.outlineAndFill(ctx, c.body);

            // Panel lines
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 8, 30); ctx.lineTo(cx - 10, cy + 20);
            ctx.moveTo(cx + 8, 30); ctx.lineTo(cx + 10, cy + 20);
            ctx.stroke();

            this.drawHighlight(ctx, cx - 12, 16, 24, 50);
            this.drawCockpit(ctx, cx, cy - 10, 7, 12);

            // Engines
            this.drawEngineNozzle(ctx, cx - 6, cy + 42, 8, 8, c.engine);
            this.drawEngineNozzle(ctx, cx + 6, cy + 42, 8, 8, c.engine);
            break;
        }

        // ── INTERCEPTOR ──────────────────────────
        case 'interceptor': {
            // Swept razor wings
            ctx.beginPath();
            ctx.moveTo(cx + 6, cy - 10);
            ctx.lineTo(cx + 52, cy + 6);
            ctx.lineTo(cx + 48, cy + 18);
            ctx.lineTo(cx + 14, cy + 10);
            ctx.closePath();
            this.outlineAndFill(ctx, c.wing);
            ctx.beginPath();
            ctx.moveTo(cx - 6, cy - 10);
            ctx.lineTo(cx - 52, cy + 6);
            ctx.lineTo(cx - 48, cy + 18);
            ctx.lineTo(cx - 14, cy + 10);
            ctx.closePath();
            this.outlineAndFill(ctx, c.wing);

            // Wing details
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx + 20, cy); ctx.lineTo(cx + 44, cy + 10);
            ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 44, cy + 10);
            ctx.stroke();

            // Slim fuselage
            ctx.beginPath();
            ctx.moveTo(cx, 8);
            ctx.bezierCurveTo(cx + 10, 18, cx + 10, cy + 14, cx + 8, cy + 36);
            ctx.lineTo(cx + 4, cy + 40);
            ctx.lineTo(cx, cy + 36);
            ctx.lineTo(cx - 4, cy + 40);
            ctx.lineTo(cx - 8, cy + 36);
            ctx.bezierCurveTo(cx - 10, cy + 14, cx - 10, 18, cx, 8);
            ctx.closePath();
            this.outlineAndFill(ctx, c.body);

            this.drawHighlight(ctx, cx - 8, 14, 16, 50);
            this.drawCockpit(ctx, cx, cy - 12, 5, 10, '#88ffcc');

            // Wing-tip guns
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.roundRect(cx + sx * 48 - 3, cy + 2, 6, 18, 2);
                ctx.fillStyle = '#555';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Single big engine
            this.drawEngineNozzle(ctx, cx, cy + 42, 12, 10, c.engine);
            break;
        }

        // ── FORTRESS ─────────────────────────────
        case 'fortress': {
            // Heavy side armor blocks
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(cx + sx * 14, cy - 16);
                ctx.lineTo(cx + sx * 40, cy - 6);
                ctx.lineTo(cx + sx * 44, cy + 20);
                ctx.lineTo(cx + sx * 36, cy + 32);
                ctx.lineTo(cx + sx * 14, cy + 24);
                ctx.closePath();
                this.outlineAndFill(ctx, c.wing);
                ctx.strokeStyle = c.dark;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx + sx * 20, cy - 10);
                ctx.lineTo(cx + sx * 22, cy + 18);
                ctx.moveTo(cx + sx * 30, cy - 2);
                ctx.lineTo(cx + sx * 30, cy + 24);
                ctx.stroke();
            }

            // Turrets on armor
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.arc(cx + sx * 36, cy + 4, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#555';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.beginPath();
                ctx.roundRect(cx + sx * 34, cy - 10, 4, 14, 1);
                ctx.fillStyle = '#444';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Thick body
            ctx.beginPath();
            ctx.moveTo(cx, 16);
            ctx.bezierCurveTo(cx + 20, 22, cx + 18, cy + 16, cx + 14, cy + 36);
            ctx.lineTo(cx + 8, cy + 40);
            ctx.lineTo(cx, cy + 34);
            ctx.lineTo(cx - 8, cy + 40);
            ctx.lineTo(cx - 14, cy + 36);
            ctx.bezierCurveTo(cx - 18, cy + 16, cx - 20, 22, cx, 16);
            ctx.closePath();
            this.outlineAndFill(ctx, c.body);

            // Front shield plate
            ctx.beginPath();
            ctx.moveTo(cx - 12, 22);
            ctx.lineTo(cx, 14);
            ctx.lineTo(cx + 12, 22);
            ctx.lineTo(cx + 10, 30);
            ctx.lineTo(cx - 10, 30);
            ctx.closePath();
            this.outlineAndFill(ctx, c.accent, c.dark, 2);

            this.drawHighlight(ctx, cx - 14, 18, 28, 40, 0.2);
            this.drawCockpit(ctx, cx, cy - 4, 8, 10, '#aaaaff');

            this.drawEngineNozzle(ctx, cx - 8, cy + 42, 10, 10, c.engine);
            this.drawEngineNozzle(ctx, cx + 8, cy + 42, 10, 10, c.engine);
            break;
        }

        // ── STRIKER ──────────────────────────────
        case 'striker': {
            // Forward-swept angular wings
            ctx.beginPath();
            ctx.moveTo(cx + 8, cy - 8);
            ctx.lineTo(cx + 48, cy - 14);
            ctx.lineTo(cx + 44, cy + 2);
            ctx.lineTo(cx + 26, cy + 16);
            ctx.lineTo(cx + 12, cy + 8);
            ctx.closePath();
            this.outlineAndFill(ctx, c.wing);
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy - 8);
            ctx.lineTo(cx - 48, cy - 14);
            ctx.lineTo(cx - 44, cy + 2);
            ctx.lineTo(cx - 26, cy + 16);
            ctx.lineTo(cx - 12, cy + 8);
            ctx.closePath();
            this.outlineAndFill(ctx, c.wing);

            // Gatling pods on wings
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.roundRect(cx + sx * 30 - 4, cy - 18, 8, 22, 3);
                ctx.fillStyle = '#555';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.arc(cx + sx * 30, cy - 16, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Narrow aggressive body
            ctx.beginPath();
            ctx.moveTo(cx, 6);
            ctx.bezierCurveTo(cx + 14, 14, cx + 12, cy + 6, cx + 10, cy + 32);
            ctx.lineTo(cx + 6, cy + 38);
            ctx.lineTo(cx, cy + 32);
            ctx.lineTo(cx - 6, cy + 38);
            ctx.lineTo(cx - 10, cy + 32);
            ctx.bezierCurveTo(cx - 12, cy + 6, cx - 14, 14, cx, 6);
            ctx.closePath();
            this.outlineAndFill(ctx, c.body);

            // Warning stripes
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#000';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(cx - 8, 28 + i * 8, 16, 3);
            }
            ctx.restore();

            this.drawHighlight(ctx, cx - 10, 12, 20, 46);
            this.drawCockpit(ctx, cx, cy - 12, 5, 9, '#ffddaa');

            this.drawEngineNozzle(ctx, cx, cy + 40, 10, 10, c.engine);
            break;
        }

        // ── TITAN ────────────────────────────────
        case 'titan': {
            // Massive shoulder plates
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(cx + sx * 16, 20);
                ctx.lineTo(cx + sx * 50, cy - 8);
                ctx.lineTo(cx + sx * 54, cy + 14);
                ctx.lineTo(cx + sx * 46, cy + 30);
                ctx.lineTo(cx + sx * 32, cy + 36);
                ctx.lineTo(cx + sx * 16, cy + 28);
                ctx.closePath();
                this.outlineAndFill(ctx, c.wing);
                // Reinforcement bolts
                ctx.fillStyle = c.accent;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(cx + sx * (26 + i * 10), cy + 2 + i * 8, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#111';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }

            // Heavy body
            ctx.beginPath();
            ctx.moveTo(cx, 12);
            ctx.bezierCurveTo(cx + 22, 22, cx + 20, cy + 16, cx + 16, cy + 38);
            ctx.lineTo(cx + 10, cy + 44);
            ctx.lineTo(cx, cy + 38);
            ctx.lineTo(cx - 10, cy + 44);
            ctx.lineTo(cx - 16, cy + 38);
            ctx.bezierCurveTo(cx - 20, cy + 16, cx - 22, 22, cx, 12);
            ctx.closePath();
            this.outlineAndFill(ctx, c.body);

            // Front ram plate
            ctx.beginPath();
            ctx.moveTo(cx - 16, 20);
            ctx.lineTo(cx, 10);
            ctx.lineTo(cx + 16, 20);
            ctx.lineTo(cx + 14, 32);
            ctx.lineTo(cx - 14, 32);
            ctx.closePath();
            this.outlineAndFill(ctx, c.accent, c.dark, 2);

            // Armor grooves on body
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - 14, 34); ctx.lineTo(cx - 14, cy + 20);
            ctx.moveTo(cx + 14, 34); ctx.lineTo(cx + 14, cy + 20);
            ctx.moveTo(cx - 10, cy + 8); ctx.lineTo(cx + 10, cy + 8);
            ctx.stroke();

            this.drawHighlight(ctx, cx - 16, 16, 32, 50, 0.18);
            this.drawCockpit(ctx, cx, cy - 2, 9, 12, '#ffaacc');

            // Tri-engine
            this.drawEngineNozzle(ctx, cx - 10, cy + 46, 10, 10, c.engine);
            this.drawEngineNozzle(ctx, cx, cy + 48, 12, 12, c.engine);
            this.drawEngineNozzle(ctx, cx + 10, cy + 46, 10, 10, c.engine);
            break;
        }
        }

        return cv;
    }

    // ================================================================
    //  ENEMIES  (each drawn large with outlines and glowing eyes)
    // ================================================================

    generateEnemySprites() {
        const configs = [
            { name: 'scout',    color: '#ee3333', accent: '#ff7777', dark: '#991111', size: 56 },
            { name: 'fighter',  color: '#ee7700', accent: '#ffaa44', dark: '#994400', size: 64 },
            { name: 'heavy',    color: '#ddaa00', accent: '#ffdd44', dark: '#886600', size: 80 },
            { name: 'phantom',  color: '#9933ee', accent: '#cc77ff', dark: '#551199', size: 60 },
            { name: 'sentinel', color: '#2288ee', accent: '#55bbff', dark: '#114488', size: 72 },
            { name: 'swarm',    color: '#33cc44', accent: '#77ff88', dark: '#117722', size: 44 },
            // ── WORLD 2 ENEMIES ──
            { name: 'stalker',         color: '#228844', accent: '#55cc77', dark: '#115522', size: 58 },
            { name: 'nest',            color: '#886633', accent: '#bbaa66', dark: '#553311', size: 72 },
            { name: 'jungle_vine',     color: '#33bb55', accent: '#66ee88', dark: '#117733', size: 60 },
            { name: 'lava_golem',      color: '#dd4400', accent: '#ff7733', dark: '#882200', size: 74 },
            { name: 'frost_elemental', color: '#44bbff', accent: '#88ddff', dark: '#2266aa', size: 64 },
            { name: 'sand_wurm',       color: '#ccaa44', accent: '#eedd88', dark: '#886622', size: 76 },
            { name: 'mech_drone',      color: '#7799bb', accent: '#aaccdd', dark: '#445566', size: 56 },
            { name: 'toxic_blob',      color: '#88ee22', accent: '#bbff66', dark: '#449911', size: 62 }
        ];
        for (const cfg of configs) {
            this.sprites[`enemy_${cfg.name}`] = this.createEnemySprite(cfg);
        }
    }

    createEnemySprite(cfg) {
        const pad = 16;
        const S = cfg.size + pad * 2;
        const cv = document.createElement('canvas');
        cv.width = S; cv.height = S;
        const ctx = cv.getContext('2d');
        const cx = S / 2, cy = S / 2;
        const r = cfg.size / 2;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (cfg.name) {

        case 'scout': {
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.lineTo(cx - r * 0.9, cy - r * 0.4);
            ctx.bezierCurveTo(cx - r * 0.7, cy - r * 0.8, cx - r * 0.2, cy - r, cx, cy - r * 0.6);
            ctx.bezierCurveTo(cx + r * 0.2, cy - r, cx + r * 0.7, cy - r * 0.8, cx + r * 0.9, cy - r * 0.4);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#111', 3);
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.5, cy - r * 0.1); ctx.lineTo(cx - r * 0.7, cy - r * 0.6);
            ctx.moveTo(cx + r * 0.5, cy - r * 0.1); ctx.lineTo(cx + r * 0.7, cy - r * 0.6);
            ctx.stroke();
            this.drawHighlight(ctx, cx - r * 0.4, cy - r * 0.6, r * 0.8, r * 0.5);
            this.drawEnemyEye(ctx, cx, cy - 2, r * 0.22, cfg.color);
            break;
        }

        case 'fighter': {
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.lineTo(cx - r, cy + r * 0.1);
            ctx.lineTo(cx - r * 0.7, cy - r * 0.4);
            ctx.bezierCurveTo(cx - r * 0.4, cy - r * 0.9, cx + r * 0.4, cy - r * 0.9, cx + r * 0.7, cy - r * 0.4);
            ctx.lineTo(cx + r, cy + r * 0.1);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#111', 3);
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.5, cy - r * 0.4); ctx.lineTo(cx - r * 0.6, cy + r * 0.4);
            ctx.moveTo(cx + r * 0.5, cy - r * 0.4); ctx.lineTo(cx + r * 0.6, cy + r * 0.4);
            ctx.stroke();
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.roundRect(cx + sx * r * 0.8 - 3, cy + r * 0.2, 6, 14, 2);
                ctx.fillStyle = '#444';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            this.drawHighlight(ctx, cx - r * 0.4, cy - r * 0.7, r * 0.8, r * 0.6);
            this.drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.24, cfg.color);
            break;
        }

        case 'heavy': {
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.lineTo(cx - r * 0.85, cy + r * 0.5);
            ctx.lineTo(cx - r, cy - r * 0.2);
            ctx.lineTo(cx - r * 0.6, cy - r * 0.85);
            ctx.lineTo(cx + r * 0.6, cy - r * 0.85);
            ctx.lineTo(cx + r, cy - r * 0.2);
            ctx.lineTo(cx + r * 0.85, cy + r * 0.5);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#111', 3.5);
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.5, cy - r * 0.6); ctx.lineTo(cx - r * 0.5, cy + r * 0.5);
            ctx.moveTo(cx + r * 0.5, cy - r * 0.6); ctx.lineTo(cx + r * 0.5, cy + r * 0.5);
            ctx.moveTo(cx - r * 0.7, cy); ctx.lineTo(cx + r * 0.7, cy);
            ctx.stroke();
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.roundRect(cx + sx * r * 0.95 - 4, cy - r * 0.3, 8, 24, 3);
                ctx.fillStyle = '#555';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            this.drawHighlight(ctx, cx - r * 0.4, cy - r * 0.7, r * 0.8, r * 0.5, 0.18);
            this.drawEnemyEye(ctx, cx, cy - r * 0.15, r * 0.28, cfg.color);
            break;
        }

        case 'phantom': {
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.bezierCurveTo(cx - r * 0.3, cy + r * 0.7, cx - r * 0.6, cy + r * 0.9, cx - r * 0.8, cy + r * 0.5);
            ctx.bezierCurveTo(cx - r, cy, cx - r * 0.8, cy - r * 0.6, cx - r * 0.4, cy - r * 0.9);
            ctx.bezierCurveTo(cx - r * 0.1, cy - r, cx + r * 0.1, cy - r, cx + r * 0.4, cy - r * 0.9);
            ctx.bezierCurveTo(cx + r * 0.8, cy - r * 0.6, cx + r, cy, cx + r * 0.8, cy + r * 0.5);
            ctx.bezierCurveTo(cx + r * 0.6, cy + r * 0.9, cx + r * 0.3, cy + r * 0.7, cx, cy + r);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#22114488', 2.5);
            ctx.restore();
            const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
            pg.addColorStop(0, 'rgba(255,255,255,0.15)');
            pg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = pg;
            ctx.fill();
            for (const sx of [-1, 1]) {
                ctx.save();
                ctx.shadowColor = '#ff44ff';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#ff88ff';
                ctx.beginPath();
                ctx.ellipse(cx + sx * r * 0.3, cy - r * 0.15, r * 0.14, r * 0.1, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx + sx * r * 0.3, cy - r * 0.15, r * 0.06, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            break;
        }

        case 'sentinel': {
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r, cy);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#111', 3.5);
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.6);
            ctx.lineTo(cx + r * 0.6, cy);
            ctx.lineTo(cx, cy + r * 0.6);
            ctx.lineTo(cx - r * 0.6, cy);
            ctx.closePath();
            ctx.strokeStyle = cfg.accent;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
            ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
            ctx.stroke();
            this.drawHighlight(ctx, cx - r * 0.3, cy - r * 0.6, r * 0.6, r * 0.5, 0.2);
            this.drawEnemyEye(ctx, cx, cy, r * 0.26, cfg.color);
            break;
        }

        case 'swarm': {
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
            this.outlineAndFill(ctx, cfg.color, '#111', 2.5);
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(cx + sx * r * 0.4, cy - r * 0.3);
                ctx.lineTo(cx + sx * r, cy - r * 0.1);
                ctx.lineTo(cx + sx * r * 0.9, cy + r * 0.4);
                ctx.lineTo(cx + sx * r * 0.4, cy + r * 0.3);
                ctx.closePath();
                this.outlineAndFill(ctx, cfg.accent, '#111', 2);
            }
            this.drawHighlight(ctx, cx - r * 0.3, cy - r * 0.5, r * 0.6, r * 0.4);
            for (const sx of [-1, 1]) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx + sx * r * 0.2, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#111';
                ctx.beginPath();
                ctx.arc(cx + sx * r * 0.22, cy - r * 0.1, r * 0.07, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }

        // ═══════════════════════════════════════
        //  WORLD 2 ENEMY SPRITES
        // ═══════════════════════════════════════

        case 'stalker': {
            // Sleek stealth hunter — angular, low-profile, chameleon-like
            ctx.save();
            ctx.globalAlpha = 0.88;
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.lineTo(cx - r * 0.95, cy + r * 0.15);
            ctx.lineTo(cx - r * 0.6, cy - r * 0.7);
            ctx.bezierCurveTo(cx - r * 0.2, cy - r, cx + r * 0.2, cy - r, cx + r * 0.6, cy - r * 0.7);
            ctx.lineTo(cx + r * 0.95, cy + r * 0.15);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#11332288', 2.5);
            ctx.restore();
            // Camo stripe pattern
            ctx.strokeStyle = cfg.dark; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.2); ctx.lineTo(cx + r * 0.3, cy - r * 0.4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy + r * 0.1); ctx.lineTo(cx + r * 0.7, cy); ctx.stroke();
            ctx.globalAlpha = 1;
            // Predator eyes — twin glowing slits
            for (const sx of [-1, 1]) {
                ctx.save();
                ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 8;
                ctx.fillStyle = '#44ff88';
                ctx.beginPath();
                ctx.ellipse(cx + sx * r * 0.25, cy - r * 0.2, r * 0.12, r * 0.06, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx + sx * r * 0.25, cy - r * 0.2, r * 0.04, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            break;
        }

        case 'nest': {
            // Organic spawner hive — bulbous, textured, with spawn ports
            ctx.beginPath();
            ctx.ellipse(cx, cy, r * 0.9, r * 0.85, 0, 0, Math.PI * 2);
            this.outlineAndFill(ctx, cfg.color, '#111', 3);
            // Organic texture rings
            ctx.strokeStyle = cfg.dark; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.6, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.3, r * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
            // Spawn ports (3 glowing holes)
            for (let i = 0; i < 3; i++) {
                const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
                const px = cx + Math.cos(a) * r * 0.5, py = cy + Math.sin(a) * r * 0.5;
                ctx.save();
                ctx.shadowColor = '#ffaa44'; ctx.shadowBlur = 6;
                ctx.fillStyle = '#ffaa44';
                ctx.beginPath(); ctx.arc(px, py, r * 0.12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff8e0';
                ctx.beginPath(); ctx.arc(px, py, r * 0.06, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            this.drawHighlight(ctx, cx - r * 0.4, cy - r * 0.7, r * 0.8, r * 0.4, 0.12);
            this.drawEnemyEye(ctx, cx, cy, r * 0.18, cfg.accent);
            break;
        }

        case 'jungle_vine': {
            // Whip-like vine creature — elongated, organic
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.bezierCurveTo(cx - r * 0.4, cy + r * 0.6, cx - r * 0.7, cy, cx - r * 0.5, cy - r * 0.5);
            ctx.bezierCurveTo(cx - r * 0.3, cy - r * 0.9, cx + r * 0.3, cy - r * 0.9, cx + r * 0.5, cy - r * 0.5);
            ctx.bezierCurveTo(cx + r * 0.7, cy, cx + r * 0.4, cy + r * 0.6, cx, cy + r);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#111', 2.5);
            // Leaf veins
            ctx.strokeStyle = cfg.dark; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.7); ctx.lineTo(cx, cy + r * 0.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.1); ctx.lineTo(cx, cy - r * 0.35); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r * 0.1); ctx.lineTo(cx, cy - r * 0.35); ctx.stroke();
            // Thorn tips
            for (const sx of [-1, 1]) {
                ctx.fillStyle = '#446633';
                ctx.beginPath();
                ctx.moveTo(cx + sx * r * 0.55, cy); ctx.lineTo(cx + sx * r * 0.8, cy - r * 0.15);
                ctx.lineTo(cx + sx * r * 0.6, cy + r * 0.1); ctx.closePath(); ctx.fill();
            }
            this.drawHighlight(ctx, cx - r * 0.3, cy - r * 0.7, r * 0.6, r * 0.4);
            this.drawEnemyEye(ctx, cx, cy - r * 0.15, r * 0.2, '#66ff44');
            break;
        }

        case 'lava_golem': {
            // Bulky molten rock creature — angular, glowing cracks
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r * 0.8, cy - r * 0.5);
            ctx.lineTo(cx + r, cy + r * 0.2);
            ctx.lineTo(cx + r * 0.7, cy + r * 0.8);
            ctx.lineTo(cx + r * 0.2, cy + r);
            ctx.lineTo(cx - r * 0.2, cy + r);
            ctx.lineTo(cx - r * 0.7, cy + r * 0.8);
            ctx.lineTo(cx - r, cy + r * 0.2);
            ctx.lineTo(cx - r * 0.8, cy - r * 0.5);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#111', 3);
            // Lava crack lines (glowing)
            ctx.save(); ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 5;
            ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.6); ctx.lineTo(cx + r * 0.1, cy + r * 0.2);
            ctx.lineTo(cx - r * 0.2, cy + r * 0.7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r * 0.3); ctx.lineTo(cx + r * 0.5, cy + r * 0.5); ctx.stroke();
            ctx.restore();
            this.drawHighlight(ctx, cx - r * 0.4, cy - r * 0.8, r * 0.8, r * 0.4, 0.1);
            this.drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.25, '#ff6600');
            break;
        }

        case 'frost_elemental': {
            // Crystalline ice entity — geometric, translucent
            ctx.save(); ctx.globalAlpha = 0.9;
            // Main crystal body
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r * 0.6, cy - r * 0.4);
            ctx.lineTo(cx + r * 0.8, cy + r * 0.3);
            ctx.lineTo(cx + r * 0.3, cy + r);
            ctx.lineTo(cx - r * 0.3, cy + r);
            ctx.lineTo(cx - r * 0.8, cy + r * 0.3);
            ctx.lineTo(cx - r * 0.6, cy - r * 0.4);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#111', 2.5);
            ctx.restore();
            // Ice facet lines
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r * 0.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.4); ctx.lineTo(cx + r * 0.3, cy + r * 0.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + r * 0.6, cy - r * 0.4); ctx.lineTo(cx - r * 0.3, cy + r * 0.5); ctx.stroke();
            // Frost shimmer
            const fg = ctx.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, r * 0.6);
            fg.addColorStop(0, 'rgba(255,255,255,0.2)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
            this.drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.22, '#88eeff');
            break;
        }

        case 'sand_wurm': {
            // Segmented burrowing worm — elongated, ridged
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.bezierCurveTo(cx + r * 0.8, cy - r * 0.7, cx + r * 0.9, cy - r * 0.1, cx + r * 0.7, cy + r * 0.5);
            ctx.bezierCurveTo(cx + r * 0.4, cy + r * 0.9, cx - r * 0.4, cy + r * 0.9, cx - r * 0.7, cy + r * 0.5);
            ctx.bezierCurveTo(cx - r * 0.9, cy - r * 0.1, cx - r * 0.8, cy - r * 0.7, cx, cy - r);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#111', 3);
            // Segment ridges
            ctx.strokeStyle = cfg.dark; ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const sy = cy - r * 0.5 + i * r * 0.35;
                const sw = r * (0.6 + i * 0.05);
                ctx.beginPath(); ctx.moveTo(cx - sw, sy); ctx.lineTo(cx + sw, sy); ctx.stroke();
            }
            // Mandible jaws at top
            for (const sx of [-1, 1]) {
                ctx.fillStyle = '#776633';
                ctx.beginPath();
                ctx.moveTo(cx + sx * r * 0.15, cy - r * 0.8);
                ctx.lineTo(cx + sx * r * 0.45, cy - r * 1.05);
                ctx.lineTo(cx + sx * r * 0.35, cy - r * 0.7);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
            }
            this.drawHighlight(ctx, cx - r * 0.3, cy - r * 0.6, r * 0.6, r * 0.4, 0.12);
            this.drawEnemyEye(ctx, cx, cy - r * 0.3, r * 0.22, '#ffdd44');
            break;
        }

        case 'mech_drone': {
            // Compact military drone — boxy, antennae, thruster
            ctx.beginPath();
            ctx.roundRect(cx - r * 0.65, cy - r * 0.55, r * 1.3, r * 1.1, r * 0.15);
            this.outlineAndFill(ctx, cfg.color, '#111', 2.5);
            // Panel lines
            ctx.strokeStyle = cfg.dark; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.55); ctx.lineTo(cx, cy + r * 0.55); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - r * 0.65, cy); ctx.lineTo(cx + r * 0.65, cy); ctx.stroke();
            // Antennae
            for (const sx of [-1, 1]) {
                ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx + sx * r * 0.4, cy - r * 0.55);
                ctx.lineTo(cx + sx * r * 0.55, cy - r * 0.85);
                ctx.stroke();
                ctx.fillStyle = '#ff3333'; ctx.beginPath();
                ctx.arc(cx + sx * r * 0.55, cy - r * 0.85, r * 0.06, 0, Math.PI * 2); ctx.fill();
            }
            // Thruster vents bottom
            for (const sx of [-1, 0, 1]) {
                ctx.fillStyle = '#444'; ctx.beginPath();
                ctx.roundRect(cx + sx * r * 0.35 - 3, cy + r * 0.4, 6, 10, 2); ctx.fill();
                ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
            }
            this.drawHighlight(ctx, cx - r * 0.3, cy - r * 0.4, r * 0.6, r * 0.3, 0.15);
            this.drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.2, '#88ccff');
            break;
        }

        case 'toxic_blob': {
            // Amorphous toxic mass — blobby, dripping, splits on death
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.moveTo(cx + r * 0.6, cy - r * 0.5);
            ctx.bezierCurveTo(cx + r, cy - r * 0.2, cx + r * 0.9, cy + r * 0.5, cx + r * 0.4, cy + r * 0.8);
            ctx.bezierCurveTo(cx + r * 0.1, cy + r, cx - r * 0.3, cy + r * 0.9, cx - r * 0.6, cy + r * 0.6);
            ctx.bezierCurveTo(cx - r, cy + r * 0.3, cx - r * 0.9, cy - r * 0.3, cx - r * 0.5, cy - r * 0.6);
            ctx.bezierCurveTo(cx - r * 0.2, cy - r, cx + r * 0.3, cy - r * 0.8, cx + r * 0.6, cy - r * 0.5);
            ctx.closePath();
            this.outlineAndFill(ctx, cfg.color, '#33660088', 2.5);
            ctx.restore();
            // Toxic glow
            const tg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.6);
            tg.addColorStop(0, 'rgba(200,255,100,0.25)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = tg;
            ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
            // Drip bubbles
            for (let i = 0; i < 3; i++) {
                const bx = cx + (i - 1) * r * 0.35, by = cy + r * 0.4 + i * r * 0.15;
                ctx.fillStyle = 'rgba(150,255,50,0.4)';
                ctx.beginPath(); ctx.arc(bx, by, r * 0.1, 0, Math.PI * 2); ctx.fill();
            }
            // Menacing eye
            this.drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.22, '#ccff33');
            break;
        }
        }
        return cv;
    }

    // Enemy glowing eye helper
    drawEnemyEye(ctx, cx, cy, radius, tint) {
        ctx.save();
        ctx.shadowColor = tint;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = tint;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ================================================================
    //  BOSSES  — Multi-part sprites for 6 unique bosses
    //  Each boss generates: _core, _turret, _arm, _shield, _orb, _weak
    // ================================================================

    generateBossSprites() {
        this._genBoss1Sprites();
        this._genBoss2Sprites();
        this._genBoss3Sprites();
        this._genBoss4Sprites();
        this._genBoss5Sprites();
        this._genBoss6Sprites();
        // World 2 bosses
        this._genBoss7Sprites();
        this._genBoss8Sprites();
        this._genBoss9Sprites();
        this._genBoss10Sprites();
        this._genBoss11Sprites();
        this._genBoss12Sprites();
    }

    // Helper: make a canvas of given size
    _mkCanvas(w, h) {
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        return cv;
    }

    // Helper: draw a menacing eye
    _drawPartEye(ctx, cx, cy, r, color) {
        // Outer
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        // Iris
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // Pupil
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        // Glint
        ctx.beginPath();
        ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }

    // ── BOSS 1: Crimson Vanguard (red, angular) ──
    _genBoss1Sprites() {
        const color = '#dd2222', accent = '#ff6644', dark = '#881111';
        // Core (70x70, pad=10 → 90x90)
        { const S=90, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=35;
          ctx.beginPath();
          ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*0.9,cy-r*0.3); ctx.lineTo(cx+r*0.8,cy+r*0.5);
          ctx.lineTo(cx+r*0.3,cy+r); ctx.lineTo(cx-r*0.3,cy+r); ctx.lineTo(cx-r*0.8,cy+r*0.5);
          ctx.lineTo(cx-r*0.9,cy-r*0.3); ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3);
          // Panel lines
          ctx.strokeStyle=dark; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx-r*0.4,cy-r*0.5); ctx.lineTo(cx-r*0.3,cy+r*0.4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.4,cy-r*0.5); ctx.lineTo(cx+r*0.3,cy+r*0.4); ctx.stroke();
          this._drawPartEye(ctx, cx, cy-5, 10, '#ff3333');
          this.drawHighlight(ctx, cx-15, cy-r*0.8, 30, 15, 0.12);
          // Cannon nozzles at bottom
          for (const sx of [-1,1]) {
            ctx.fillStyle='#555'; ctx.beginPath();
            ctx.roundRect(cx+sx*18-4, cy+r-5, 8, 12, 2); ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
          }
          this.sprites['boss1_core'] = cv;
        }
        // Turret (30x30, pad=6 → 42x42)
        { const S=42, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2);
          this.outlineAndFill(ctx, accent, '#111', 2.5);
          ctx.fillStyle='#555'; ctx.beginPath();
          ctx.roundRect(cx-3, cy-18, 6, 14, 2); ctx.fill();
          ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
          this._drawPartEye(ctx, cx, cy+2, 5, '#ffaa33');
          this.sprites['boss1_turret'] = cv;
        }
        // Arm (35x45, pad=6 → 47x57)
        { const S=57, cv=this._mkCanvas(47,S), ctx=cv.getContext('2d'), cx=47/2, cy=S/2;
          ctx.beginPath();
          ctx.moveTo(cx, cy-25); ctx.lineTo(cx+18, cy-10); ctx.lineTo(cx+15, cy+25);
          ctx.lineTo(cx-15, cy+25); ctx.lineTo(cx-18, cy-10); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2.5);
          ctx.strokeStyle=color; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(cx-8,cy-5); ctx.lineTo(cx+8,cy-5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-6,cy+8); ctx.lineTo(cx+6,cy+8); ctx.stroke();
          this.sprites['boss1_arm'] = cv;
        }
    }

    // ── BOSS 2: Iron Monolith (orange/gold, heavy) ──
    _genBoss2Sprites() {
        const color = '#ee7700', accent = '#ffbb44', dark = '#884400';
        // Core (80x80, pad=10 → 100x100)
        { const S=100, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=40;
          // Blocky armored body
          ctx.beginPath();
          ctx.moveTo(cx-r*0.7, cy-r); ctx.lineTo(cx+r*0.7, cy-r);
          ctx.lineTo(cx+r, cy-r*0.3); ctx.lineTo(cx+r*0.9, cy+r*0.6);
          ctx.lineTo(cx+r*0.5, cy+r); ctx.lineTo(cx-r*0.5, cy+r);
          ctx.lineTo(cx-r*0.9, cy+r*0.6); ctx.lineTo(cx-r, cy-r*0.3);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3.5);
          // Armor plates
          ctx.strokeStyle=dark; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy-r); ctx.lineTo(cx-r*0.3,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.3,cy-r); ctx.lineTo(cx+r*0.3,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-r*0.5,cy); ctx.lineTo(cx+r*0.5,cy); ctx.stroke();
          this._drawPartEye(ctx, cx, cy-8, 12, '#ffcc00');
          this.drawHighlight(ctx, cx-20, cy-r*0.9, 40, 18, 0.1);
          // Vents
          for (let i=-1;i<=1;i++) {
            ctx.fillStyle='#333'; ctx.beginPath();
            ctx.roundRect(cx+i*14-4, cy+r-8, 8, 10, 2); ctx.fill();
          }
          this.sprites['boss2_core'] = cv;
        }
        // Shield (100x25, pad=4 → 108x33)
        { const cv=this._mkCanvas(108,33), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(8, 16); ctx.lineTo(20, 4); ctx.lineTo(88, 4);
          ctx.lineTo(100, 16); ctx.lineTo(88, 28); ctx.lineTo(20, 28); ctx.closePath();
          this.outlineAndFill(ctx, '#4488cc', '#111', 2.5);
          // Energy lines
          ctx.strokeStyle='#88ccff'; ctx.lineWidth=1; ctx.globalAlpha=0.5;
          ctx.beginPath(); ctx.moveTo(25,16); ctx.lineTo(83,16); ctx.stroke();
          ctx.globalAlpha=1;
          this.drawHighlight(ctx, 25, 6, 60, 10, 0.15);
          this.sprites['boss2_shield'] = cv;
        }
        // Turret (35x35, pad=6 → 47)
        { const S=47, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.roundRect(cx-16, cy-16, 32, 32, 6);
          this.outlineAndFill(ctx, accent, '#111', 2.5);
          // Double barrels
          for (const sx of [-1,1]) {
            ctx.fillStyle='#555'; ctx.beginPath();
            ctx.roundRect(cx+sx*8-3, cy-22, 6, 15, 2); ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
          }
          this._drawPartEye(ctx, cx, cy+3, 6, '#ff8800');
          this.sprites['boss2_turret'] = cv;
        }
        // Arm (40x55, pad=6 → 52x67)
        { const cv=this._mkCanvas(52,67), ctx=cv.getContext('2d'), cx=26, cy=67/2;
          ctx.beginPath();
          ctx.moveTo(cx-16, cy-28); ctx.lineTo(cx+16, cy-28);
          ctx.lineTo(cx+20, cy+28); ctx.lineTo(cx-20, cy+28); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2.5);
          ctx.strokeStyle=color; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx-10,cy-10); ctx.lineTo(cx+10,cy-10); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-12,cy+5); ctx.lineTo(cx+12,cy+5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-14,cy+18); ctx.lineTo(cx+14,cy+18); ctx.stroke();
          this.sprites['boss2_arm'] = cv;
        }
    }

    // ── BOSS 3: Void Leviathan (purple, ethereal orbs) ──
    _genBoss3Sprites() {
        const color = '#7722dd', accent = '#bb77ff', dark = '#441188';
        // Core (75x75, pad=10 → 95)
        { const S=95, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=38;
          // Organic flowing shape
          ctx.beginPath();
          ctx.moveTo(cx, cy-r);
          ctx.bezierCurveTo(cx+r*0.8, cy-r*0.8, cx+r, cy-r*0.2, cx+r*0.7, cy+r*0.3);
          ctx.bezierCurveTo(cx+r*0.5, cy+r, cx-r*0.5, cy+r, cx-r*0.7, cy+r*0.3);
          ctx.bezierCurveTo(cx-r, cy-r*0.2, cx-r*0.8, cy-r*0.8, cx, cy-r);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3);
          // Rune marks
          ctx.strokeStyle=accent; ctx.lineWidth=1.5; ctx.globalAlpha=0.4;
          ctx.beginPath(); ctx.arc(cx, cy, r*0.5, 0.3, 2.8); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, r*0.3, -1, 1); ctx.stroke();
          ctx.globalAlpha=1;
          this._drawPartEye(ctx, cx, cy-5, 11, '#aa44ff');
          this.drawHighlight(ctx, cx-15, cy-r*0.8, 30, 15, 0.1);
          this.sprites['boss3_core'] = cv;
        }
        // Orb (28x28, pad=6 → 40)
        { const S=40, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          // Glowing orb
          const g = ctx.createRadialGradient(cx,cy,2,cx,cy,16);
          g.addColorStop(0, '#ddbbff'); g.addColorStop(0.5, accent); g.addColorStop(1, dark);
          ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2);
          ctx.fillStyle=g; ctx.fill();
          ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          // Inner glint
          ctx.beginPath(); ctx.arc(cx-3, cy-3, 3, 0, Math.PI*2);
          ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fill();
          this.sprites['boss3_orb'] = cv;
        }
        // Arm (35x50, pad=6 → 47x62)
        { const cv=this._mkCanvas(47,62), ctx=cv.getContext('2d'), cx=47/2, cy=62/2;
          // Tentacle-like arm
          ctx.beginPath();
          ctx.moveTo(cx, cy-28); ctx.bezierCurveTo(cx+20, cy-15, cx+15, cy+10, cx+8, cy+28);
          ctx.lineTo(cx-8, cy+28); ctx.bezierCurveTo(cx-15, cy+10, cx-20, cy-15, cx, cy-28);
          ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2.5);
          // Glowing segments
          ctx.fillStyle=accent; ctx.globalAlpha=0.3;
          for (let i=0;i<3;i++) {
            ctx.beginPath(); ctx.arc(cx, cy-15+i*15, 5, 0, Math.PI*2); ctx.fill();
          }
          ctx.globalAlpha=1;
          this.sprites['boss3_arm'] = cv;
        }
    }

    // ── BOSS 4: Omega Prime (magenta/gold, regal) ──
    _genBoss4Sprites() {
        const color = '#dd1177', accent = '#ff77bb', dark = '#880044';
        // Core (85x85, pad=10 → 105)
        { const S=105, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=42;
          // Crown-like shape
          ctx.beginPath();
          ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r*0.4, cy-r*0.6);
          ctx.lineTo(cx+r*0.7, cy-r*0.9); ctx.lineTo(cx+r*0.6, cy-r*0.3);
          ctx.lineTo(cx+r, cy); ctx.lineTo(cx+r*0.7, cy+r*0.6);
          ctx.lineTo(cx+r*0.3, cy+r); ctx.lineTo(cx-r*0.3, cy+r);
          ctx.lineTo(cx-r*0.7, cy+r*0.6); ctx.lineTo(cx-r, cy);
          ctx.lineTo(cx-r*0.6, cy-r*0.3); ctx.lineTo(cx-r*0.7, cy-r*0.9);
          ctx.lineTo(cx-r*0.4, cy-r*0.6);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3.5);
          // Gold accents
          ctx.strokeStyle='#ffcc33'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-r*0.4,cy-r*0.3); ctx.lineTo(cx+r*0.4,cy-r*0.3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy+r*0.2); ctx.lineTo(cx+r*0.3,cy+r*0.2); ctx.stroke();
          this._drawPartEye(ctx, cx, cy-5, 13, '#ff3388');
          this.drawHighlight(ctx, cx-20, cy-r*0.85, 40, 18, 0.12);
          this.sprites['boss4_core'] = cv;
        }
        // Weakpoint (25x25, pad=6 → 37)
        { const S=37, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2);
          const g = ctx.createRadialGradient(cx,cy,2,cx,cy,12);
          g.addColorStop(0,'#ffee44'); g.addColorStop(0.6,'#ff4400'); g.addColorStop(1,'#880000');
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          // Pulsing inner
          ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2);
          ctx.fillStyle='#ffff88'; ctx.fill();
          this.sprites['boss4_weak'] = cv;
        }
        // Turret (35x35, pad=6 → 47)
        { const S=47, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath();
          ctx.moveTo(cx, cy-16); ctx.lineTo(cx+16, cy); ctx.lineTo(cx, cy+16);
          ctx.lineTo(cx-16, cy); ctx.closePath();
          this.outlineAndFill(ctx, accent, '#111', 2.5);
          ctx.fillStyle='#555'; ctx.beginPath();
          ctx.roundRect(cx-3, cy-22, 6, 12, 2); ctx.fill();
          ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
          this._drawPartEye(ctx, cx, cy, 5, '#ff44aa');
          this.sprites['boss4_turret'] = cv;
        }
        // Shield (40x20, pad=4 → 48x28)
        { const cv=this._mkCanvas(48,28), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(4,14); ctx.lineTo(12,4); ctx.lineTo(36,4);
          ctx.lineTo(44,14); ctx.lineTo(36,24); ctx.lineTo(12,24); ctx.closePath();
          this.outlineAndFill(ctx, '#ffcc33', '#111', 2);
          ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.globalAlpha=0.3;
          ctx.beginPath(); ctx.moveTo(14,14); ctx.lineTo(34,14); ctx.stroke();
          ctx.globalAlpha=1;
          this.sprites['boss4_shield'] = cv;
        }
        // Arm (40x60, pad=6 → 52x72)
        { const cv=this._mkCanvas(52,72), ctx=cv.getContext('2d'), cx=26, cy=36;
          ctx.beginPath();
          ctx.moveTo(cx, cy-32); ctx.lineTo(cx+20, cy-15); ctx.lineTo(cx+18, cy+32);
          ctx.lineTo(cx-18, cy+32); ctx.lineTo(cx-20, cy-15); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2.5);
          ctx.strokeStyle=color; ctx.lineWidth=1.5;
          for (let i=0;i<3;i++) {
            ctx.beginPath(); ctx.moveTo(cx-12,cy-15+i*16); ctx.lineTo(cx+12,cy-15+i*16); ctx.stroke();
          }
          this.sprites['boss4_arm'] = cv;
        }
    }

    // ── BOSS 5: Nemesis (red/black, fast, many orbs) ──
    _genBoss5Sprites() {
        const color = '#dd3355', accent = '#ff6688', dark = '#771133';
        // Core (70x70, pad=10 → 90)
        { const S=90, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=35;
          // Star-like shape
          ctx.beginPath();
          for (let i=0;i<8;i++) {
            const a = (Math.PI*2/8)*i - Math.PI/2;
            const pr = i%2===0 ? r : r*0.6;
            if (i===0) ctx.moveTo(cx+Math.cos(a)*pr, cy+Math.sin(a)*pr);
            else ctx.lineTo(cx+Math.cos(a)*pr, cy+Math.sin(a)*pr);
          }
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3);
          // Inner circle
          ctx.beginPath(); ctx.arc(cx, cy, r*0.35, 0, Math.PI*2);
          ctx.fillStyle=dark; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          this._drawPartEye(ctx, cx, cy, 10, '#ff2244');
          this.sprites['boss5_core'] = cv;
        }
        // Orb (25-30px, pad=6 → 42)
        { const S=42, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          const g = ctx.createRadialGradient(cx,cy,2,cx,cy,15);
          g.addColorStop(0, '#ffbbcc'); g.addColorStop(0.5, accent); g.addColorStop(1, dark);
          ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI*2);
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx-3, cy-3, 3, 0, Math.PI*2);
          ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.fill();
          this.sprites['boss5_orb'] = cv;
        }
        // Arm (30x40, pad=6 → 42x52)
        { const cv=this._mkCanvas(42,52), ctx=cv.getContext('2d'), cx=21, cy=26;
          ctx.beginPath();
          ctx.moveTo(cx, cy-22); ctx.lineTo(cx+15, cy-8); ctx.lineTo(cx+12, cy+22);
          ctx.lineTo(cx-12, cy+22); ctx.lineTo(cx-15, cy-8); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2);
          ctx.strokeStyle=color; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(cx-8,cy); ctx.lineTo(cx+8,cy); ctx.stroke();
          this.sprites['boss5_arm'] = cv;
        }
    }

    // ── BOSS 6: Apocalypse (red/black/orange, final boss, massive) ──
    _genBoss6Sprites() {
        const color = '#ff2200', accent = '#ff6633', dark = '#880000';
        // Core (90x90, pad=10 → 110)
        { const S=110, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=45;
          // Menacing skull-like shape
          ctx.beginPath();
          ctx.moveTo(cx, cy-r);
          ctx.bezierCurveTo(cx+r*0.6, cy-r, cx+r, cy-r*0.5, cx+r, cy);
          ctx.bezierCurveTo(cx+r, cy+r*0.4, cx+r*0.6, cy+r*0.8, cx+r*0.4, cy+r);
          ctx.lineTo(cx+r*0.15, cy+r*0.7);
          ctx.lineTo(cx, cy+r*0.9);
          ctx.lineTo(cx-r*0.15, cy+r*0.7);
          ctx.lineTo(cx-r*0.4, cy+r);
          ctx.bezierCurveTo(cx-r*0.6, cy+r*0.8, cx-r, cy+r*0.4, cx-r, cy);
          ctx.bezierCurveTo(cx-r, cy-r*0.5, cx-r*0.6, cy-r, cx, cy-r);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 4);
          // Skull details
          ctx.strokeStyle=dark; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-r*0.5,cy-r*0.3); ctx.lineTo(cx-r*0.3,cy+r*0.3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.5,cy-r*0.3); ctx.lineTo(cx+r*0.3,cy+r*0.3); ctx.stroke();
          // Two eyes
          this._drawPartEye(ctx, cx-12, cy-8, 9, '#ff4400');
          this._drawPartEye(ctx, cx+12, cy-8, 9, '#ff4400');
          // Mouth
          ctx.strokeStyle='#111'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-15,cy+15); ctx.lineTo(cx-8,cy+10);
          ctx.lineTo(cx,cy+15); ctx.lineTo(cx+8,cy+10); ctx.lineTo(cx+15,cy+15); ctx.stroke();
          this.drawHighlight(ctx, cx-25, cy-r*0.9, 50, 20, 0.1);
          this.sprites['boss6_core'] = cv;
        }
        // Turret (35x35, pad=6 → 47)
        { const S=47, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath();
          ctx.moveTo(cx, cy-17); ctx.lineTo(cx+17, cy-5); ctx.lineTo(cx+12, cy+17);
          ctx.lineTo(cx-12, cy+17); ctx.lineTo(cx-17, cy-5); ctx.closePath();
          this.outlineAndFill(ctx, accent, '#111', 2.5);
          // Triple barrel
          for (const off of [-7,0,7]) {
            ctx.fillStyle='#444'; ctx.beginPath();
            ctx.roundRect(cx+off-2, cy-24, 4, 12, 1); ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          }
          this._drawPartEye(ctx, cx, cy+3, 5, '#ff6600');
          this.sprites['boss6_turret'] = cv;
        }
        // Orb (28x28, pad=6 → 40)
        { const S=40, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          const g = ctx.createRadialGradient(cx,cy,2,cx,cy,14);
          g.addColorStop(0, '#ffcc66'); g.addColorStop(0.4, accent); g.addColorStop(1, dark);
          ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI*2);
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx-3,cy-3,3,0,Math.PI*2);
          ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.fill();
          this.sprites['boss6_orb'] = cv;
        }
        // Shield (120x25, pad=4 → 128x33)
        { const cv=this._mkCanvas(128,33), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(8,16); ctx.lineTo(20,4); ctx.lineTo(108,4);
          ctx.lineTo(120,16); ctx.lineTo(108,28); ctx.lineTo(20,28); ctx.closePath();
          this.outlineAndFill(ctx, '#cc3300', '#111', 2.5);
          ctx.strokeStyle='#ff8844'; ctx.lineWidth=1; ctx.globalAlpha=0.5;
          ctx.beginPath(); ctx.moveTo(28,16); ctx.lineTo(100,16); ctx.stroke();
          ctx.globalAlpha=1;
          this.drawHighlight(ctx, 25, 6, 78, 10, 0.12);
          this.sprites['boss6_shield'] = cv;
        }
        // Weakpoint (22x22, pad=6 → 34)
        { const S=34, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI*2);
          const g = ctx.createRadialGradient(cx,cy,2,cx,cy,10);
          g.addColorStop(0,'#ffff66'); g.addColorStop(0.5,'#ff6600'); g.addColorStop(1,'#990000');
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2);
          ctx.fillStyle='#ffff88'; ctx.fill();
          this.sprites['boss6_weak'] = cv;
        }
        // Arm (45x65, pad=6 → 57x77)
        { const cv=this._mkCanvas(57,77), ctx=cv.getContext('2d'), cx=57/2, cy=77/2;
          ctx.beginPath();
          ctx.moveTo(cx, cy-35); ctx.lineTo(cx+22, cy-18); ctx.lineTo(cx+20, cy+35);
          ctx.lineTo(cx-20, cy+35); ctx.lineTo(cx-22, cy-18); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 3);
          // Glow segments
          ctx.fillStyle=accent; ctx.globalAlpha=0.3;
          for (let i=0;i<4;i++) {
            ctx.beginPath(); ctx.arc(cx, cy-20+i*14, 4, 0, Math.PI*2); ctx.fill();
          }
          ctx.globalAlpha=1;
          ctx.strokeStyle=color; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx-14,cy-5); ctx.lineTo(cx+14,cy-5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-16,cy+12); ctx.lineTo(cx+16,cy+12); ctx.stroke();
          this.sprites['boss6_arm'] = cv;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  WORLD 2 BOSSES — 6 planetary guardians (Bosses 7–12)
    // ═══════════════════════════════════════════════════════════════

    // ── BOSS 7: Titanus Rex (green, organic, jungle guardian) ──
    _genBoss7Sprites() {
        const color = '#22cc44', accent = '#55ee77', dark = '#117722';
        // Core (85x85 → pad=10 → 105)
        { const S=105, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=42;
          // Massive reptilian skull
          ctx.beginPath();
          ctx.moveTo(cx, cy-r);
          ctx.bezierCurveTo(cx+r*0.7, cy-r, cx+r, cy-r*0.4, cx+r*0.9, cy+r*0.1);
          ctx.lineTo(cx+r*0.7, cy+r*0.7);
          ctx.bezierCurveTo(cx+r*0.3, cy+r, cx-r*0.3, cy+r, cx-r*0.7, cy+r*0.7);
          ctx.lineTo(cx-r*0.9, cy+r*0.1);
          ctx.bezierCurveTo(cx-r, cy-r*0.4, cx-r*0.7, cy-r, cx, cy-r);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3.5);
          // Scale texture
          ctx.strokeStyle=dark; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx-r*0.5,cy-r*0.4); ctx.lineTo(cx-r*0.3,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.5,cy-r*0.4); ctx.lineTo(cx+r*0.3,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-r*0.7,cy+r*0.1); ctx.lineTo(cx+r*0.7,cy+r*0.1); ctx.stroke();
          // Rex teeth at bottom
          ctx.fillStyle='#fff';
          for (let i=-2;i<=2;i++) {
            ctx.beginPath();
            ctx.moveTo(cx+i*10-4, cy+r*0.65); ctx.lineTo(cx+i*10, cy+r*0.9);
            ctx.lineTo(cx+i*10+4, cy+r*0.65); ctx.closePath(); ctx.fill();
          }
          // Twin predator eyes
          this._drawPartEye(ctx, cx-14, cy-10, 10, '#44ff66');
          this._drawPartEye(ctx, cx+14, cy-10, 10, '#44ff66');
          this.drawHighlight(ctx, cx-20, cy-r*0.9, 40, 18, 0.12);
          this.sprites['boss7_core'] = cv;
        }
        // Turret (32x32 → 44)
        { const S=44, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2);
          this.outlineAndFill(ctx, accent, '#111', 2.5);
          // Thorn barrel
          ctx.fillStyle='#446633'; ctx.beginPath();
          ctx.moveTo(cx-2, cy-20); ctx.lineTo(cx+2, cy-20); ctx.lineTo(cx+4, cy-6); ctx.lineTo(cx-4, cy-6); ctx.closePath(); ctx.fill();
          ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
          this._drawPartEye(ctx, cx, cy+2, 5, '#66ff88');
          this.sprites['boss7_turret'] = cv;
        }
        // Arm (40x55 → 52x67)
        { const cv=this._mkCanvas(52,67), ctx=cv.getContext('2d'), cx=26, cy=67/2;
          // Muscular claw arm
          ctx.beginPath();
          ctx.moveTo(cx, cy-28); ctx.lineTo(cx+20, cy-12); ctx.lineTo(cx+18, cy+22);
          ctx.lineTo(cx+8, cy+30); ctx.lineTo(cx-8, cy+30);
          ctx.lineTo(cx-18, cy+22); ctx.lineTo(cx-20, cy-12); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2.5);
          // Claw tips
          ctx.fillStyle=accent;
          ctx.beginPath(); ctx.moveTo(cx-5,cy+30); ctx.lineTo(cx-8,cy+28); ctx.lineTo(cx-2,cy+30); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx+5,cy+30); ctx.lineTo(cx+8,cy+28); ctx.lineTo(cx+2,cy+30); ctx.closePath(); ctx.fill();
          ctx.strokeStyle=color; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(cx-10,cy-5); ctx.lineTo(cx+10,cy-5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-8,cy+10); ctx.lineTo(cx+8,cy+10); ctx.stroke();
          this.sprites['boss7_arm'] = cv;
        }
        // Shield (90x22 → 102x34)
        { const cv=this._mkCanvas(102,34), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(6,17); ctx.lineTo(16,4); ctx.lineTo(86,4);
          ctx.lineTo(96,17); ctx.lineTo(86,30); ctx.lineTo(16,30); ctx.closePath();
          this.outlineAndFill(ctx, '#338844', '#111', 2.5);
          // Vine pattern
          ctx.strokeStyle='#55bb66'; ctx.lineWidth=1; ctx.globalAlpha=0.5;
          ctx.beginPath(); ctx.moveTo(20,17); ctx.bezierCurveTo(35,8,55,26,80,17); ctx.stroke();
          ctx.globalAlpha=1;
          this.drawHighlight(ctx, 20, 6, 60, 10, 0.12);
          this.sprites['boss7_shield'] = cv;
        }
    }

    // ── BOSS 8: Magma Colossus (orange/red, volcanic, massive) ──
    _genBoss8Sprites() {
        const color = '#ff5500', accent = '#ff8833', dark = '#992200';
        // Core (90x90 → 110)
        { const S=110, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=45;
          // Bulky volcanic body
          ctx.beginPath();
          ctx.moveTo(cx-r*0.6, cy-r); ctx.lineTo(cx+r*0.6, cy-r);
          ctx.lineTo(cx+r, cy-r*0.2); ctx.lineTo(cx+r*0.85, cy+r*0.6);
          ctx.lineTo(cx+r*0.4, cy+r); ctx.lineTo(cx-r*0.4, cy+r);
          ctx.lineTo(cx-r*0.85, cy+r*0.6); ctx.lineTo(cx-r, cy-r*0.2);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3.5);
          // Lava veins (glowing)
          ctx.save(); ctx.shadowColor='#ff6600'; ctx.shadowBlur=6;
          ctx.strokeStyle='#ffaa33'; ctx.lineWidth=2.5;
          ctx.beginPath(); ctx.moveTo(cx-r*0.4,cy-r*0.7); ctx.lineTo(cx-r*0.1,cy); ctx.lineTo(cx-r*0.3,cy+r*0.6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.3,cy-r*0.5); ctx.lineTo(cx+r*0.2,cy+r*0.4); ctx.stroke();
          ctx.restore();
          // Armor plates
          ctx.strokeStyle=dark; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy-r); ctx.lineTo(cx-r*0.3,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.3,cy-r); ctx.lineTo(cx+r*0.3,cy+r*0.5); ctx.stroke();
          this._drawPartEye(ctx, cx, cy-8, 13, '#ff4400');
          this.drawHighlight(ctx, cx-22, cy-r*0.9, 44, 18, 0.1);
          this.sprites['boss8_core'] = cv;
        }
        // Turret (35x35 → 47)
        { const S=47, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI*2);
          this.outlineAndFill(ctx, accent, '#111', 2.5);
          // Flame barrel
          for (const sx of [-1,1]) {
            ctx.fillStyle='#555'; ctx.beginPath();
            ctx.roundRect(cx+sx*6-3, cy-20, 6, 14, 2); ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
          }
          this._drawPartEye(ctx, cx, cy+2, 5, '#ff7700');
          this.sprites['boss8_turret'] = cv;
        }
        // Orb (28x28 → 40) — orbiting magma ball
        { const S=40, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          const g = ctx.createRadialGradient(cx,cy,2,cx,cy,14);
          g.addColorStop(0, '#ffdd66'); g.addColorStop(0.5, '#ff6600'); g.addColorStop(1, dark);
          ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI*2);
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx-3, cy-3, 3, 0, Math.PI*2);
          ctx.fillStyle='rgba(255,255,200,0.5)'; ctx.fill();
          this.sprites['boss8_orb'] = cv;
        }
        // Arm (45x60 → 57x72)
        { const cv=this._mkCanvas(57,72), ctx=cv.getContext('2d'), cx=57/2, cy=72/2;
          ctx.beginPath();
          ctx.moveTo(cx, cy-32); ctx.lineTo(cx+22, cy-16); ctx.lineTo(cx+20, cy+32);
          ctx.lineTo(cx-20, cy+32); ctx.lineTo(cx-22, cy-16); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2.5);
          // Lava glow segments
          ctx.save(); ctx.shadowColor='#ff4400'; ctx.shadowBlur=4;
          ctx.fillStyle='#ff8833'; ctx.globalAlpha=0.4;
          for (let i=0;i<3;i++) {
            ctx.beginPath(); ctx.arc(cx, cy-18+i*16, 5, 0, Math.PI*2); ctx.fill();
          }
          ctx.globalAlpha=1; ctx.restore();
          this.sprites['boss8_arm'] = cv;
        }
        // Shield (110x25 → 122x37)
        { const cv=this._mkCanvas(122,37), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(8,18); ctx.lineTo(18,4); ctx.lineTo(104,4);
          ctx.lineTo(114,18); ctx.lineTo(104,32); ctx.lineTo(18,32); ctx.closePath();
          this.outlineAndFill(ctx, '#cc4400', '#111', 2.5);
          ctx.strokeStyle='#ff7744'; ctx.lineWidth=1; ctx.globalAlpha=0.5;
          ctx.beginPath(); ctx.moveTo(25,18); ctx.lineTo(97,18); ctx.stroke();
          ctx.globalAlpha=1;
          this.drawHighlight(ctx, 22, 6, 78, 12, 0.12);
          this.sprites['boss8_shield'] = cv;
        }
    }

    // ── BOSS 9: Frost Sovereign (ice blue, crystalline, regal) ──
    _genBoss9Sprites() {
        const color = '#44bbff', accent = '#88ddff', dark = '#2266aa';
        // Core (80x80 → 100)
        { const S=100, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=40;
          // Crown-like crystal shape
          ctx.beginPath();
          ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r*0.35, cy-r*0.55);
          ctx.lineTo(cx+r*0.65, cy-r*0.85); ctx.lineTo(cx+r*0.55, cy-r*0.25);
          ctx.lineTo(cx+r, cy+r*0.1); ctx.lineTo(cx+r*0.6, cy+r*0.7);
          ctx.lineTo(cx+r*0.2, cy+r); ctx.lineTo(cx-r*0.2, cy+r);
          ctx.lineTo(cx-r*0.6, cy+r*0.7); ctx.lineTo(cx-r, cy+r*0.1);
          ctx.lineTo(cx-r*0.55, cy-r*0.25); ctx.lineTo(cx-r*0.65, cy-r*0.85);
          ctx.lineTo(cx-r*0.35, cy-r*0.55);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3);
          // Ice facets
          ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-r*0.5,cy); ctx.lineTo(cx+r*0.5,cy); ctx.stroke();
          // Frost aura
          const fg=ctx.createRadialGradient(cx,cy,0,cx,cy,r*0.6);
          fg.addColorStop(0,'rgba(200,240,255,0.2)'); fg.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(cx,cy,r*0.6,0,Math.PI*2); ctx.fill();
          this._drawPartEye(ctx, cx, cy-5, 12, '#aaeeff');
          this.drawHighlight(ctx, cx-18, cy-r*0.85, 36, 16, 0.15);
          this.sprites['boss9_core'] = cv;
        }
        // Orb (26x26 → 38) — orbiting ice crystal
        { const S=38, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          const g=ctx.createRadialGradient(cx,cy,2,cx,cy,14);
          g.addColorStop(0,'#eeffff'); g.addColorStop(0.5,accent); g.addColorStop(1,dark);
          ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2);
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          // Sparkle
          ctx.fillStyle='rgba(255,255,255,0.6)';
          ctx.beginPath(); ctx.arc(cx-3, cy-3, 3, 0, Math.PI*2); ctx.fill();
          this.sprites['boss9_orb'] = cv;
        }
        // Shield (35x18 → 47x30)
        { const cv=this._mkCanvas(47,30), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(5,15); ctx.lineTo(12,3); ctx.lineTo(35,3);
          ctx.lineTo(42,15); ctx.lineTo(35,27); ctx.lineTo(12,27); ctx.closePath();
          this.outlineAndFill(ctx, '#66ccee', '#111', 2);
          ctx.strokeStyle='#aaeeff'; ctx.lineWidth=1; ctx.globalAlpha=0.4;
          ctx.beginPath(); ctx.moveTo(15,15); ctx.lineTo(32,15); ctx.stroke();
          ctx.globalAlpha=1;
          this.sprites['boss9_shield'] = cv;
        }
        // Arm (38x50 → 50x62)
        { const cv=this._mkCanvas(50,62), ctx=cv.getContext('2d'), cx=25, cy=31;
          ctx.beginPath();
          ctx.moveTo(cx, cy-28); ctx.lineTo(cx+18, cy-12); ctx.lineTo(cx+15, cy+28);
          ctx.lineTo(cx-15, cy+28); ctx.lineTo(cx-18, cy-12); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2.5);
          // Icicle detail
          ctx.fillStyle=accent; ctx.globalAlpha=0.3;
          for (let i=0;i<3;i++) { ctx.beginPath(); ctx.arc(cx, cy-15+i*14, 4, 0,Math.PI*2); ctx.fill(); }
          ctx.globalAlpha=1;
          this.sprites['boss9_arm'] = cv;
        }
    }

    // ── BOSS 10: Sandstorm Leviathan (gold/sand, desert titan) ──
    _genBoss10Sprites() {
        const color = '#ddaa33', accent = '#eedd88', dark = '#886622';
        // Core (85x85 → 105)
        { const S=105, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=42;
          // Massive sand serpent head
          ctx.beginPath();
          ctx.moveTo(cx, cy-r);
          ctx.bezierCurveTo(cx+r*0.8, cy-r*0.8, cx+r, cy-r*0.2, cx+r*0.8, cy+r*0.3);
          ctx.bezierCurveTo(cx+r*0.6, cy+r*0.8, cx+r*0.2, cy+r, cx, cy+r*0.9);
          ctx.bezierCurveTo(cx-r*0.2, cy+r, cx-r*0.6, cy+r*0.8, cx-r*0.8, cy+r*0.3);
          ctx.bezierCurveTo(cx-r, cy-r*0.2, cx-r*0.8, cy-r*0.8, cx, cy-r);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3.5);
          // Desert markings
          ctx.strokeStyle=dark; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-r*0.4,cy-r*0.5); ctx.lineTo(cx-r*0.2,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.4,cy-r*0.5); ctx.lineTo(cx+r*0.2,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(cx,cy+r*0.1,r*0.5,r*0.15,0,0,Math.PI*2); ctx.stroke();
          // Twin golden eyes
          this._drawPartEye(ctx, cx-13, cy-8, 10, '#ffcc00');
          this._drawPartEye(ctx, cx+13, cy-8, 10, '#ffcc00');
          this.drawHighlight(ctx, cx-20, cy-r*0.9, 40, 18, 0.1);
          this.sprites['boss10_core'] = cv;
        }
        // Turret (35x35 → 47)
        { const S=47, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath();
          ctx.moveTo(cx, cy-17); ctx.lineTo(cx+17, cy-3); ctx.lineTo(cx+12, cy+17);
          ctx.lineTo(cx-12, cy+17); ctx.lineTo(cx-17, cy-3); ctx.closePath();
          this.outlineAndFill(ctx, accent, '#111', 2.5);
          ctx.fillStyle='#555'; ctx.beginPath();
          ctx.roundRect(cx-3, cy-23, 6, 12, 2); ctx.fill();
          ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
          this._drawPartEye(ctx, cx, cy+2, 5, '#ffaa00');
          this.sprites['boss10_turret'] = cv;
        }
        // Orb (30x30 → 42)
        { const S=42, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          const g=ctx.createRadialGradient(cx,cy,2,cx,cy,15);
          g.addColorStop(0,'#ffeeaa'); g.addColorStop(0.5,accent); g.addColorStop(1,dark);
          ctx.beginPath(); ctx.arc(cx,cy,13,0,Math.PI*2);
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx-3,cy-3,3,0,Math.PI*2);
          ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.fill();
          this.sprites['boss10_orb'] = cv;
        }
        // Weakpoint (24x24 → 36)
        { const S=36, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx,cy,11,0,Math.PI*2);
          const g=ctx.createRadialGradient(cx,cy,2,cx,cy,11);
          g.addColorStop(0,'#ffff66'); g.addColorStop(0.5,'#ff8800'); g.addColorStop(1,'#884400');
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2);
          ctx.fillStyle='#ffff88'; ctx.fill();
          this.sprites['boss10_weak'] = cv;
        }
        // Arm (42x60 → 54x72)
        { const cv=this._mkCanvas(54,72), ctx=cv.getContext('2d'), cx=27, cy=36;
          ctx.beginPath();
          ctx.moveTo(cx,cy-32); ctx.lineTo(cx+20,cy-15); ctx.lineTo(cx+18,cy+32);
          ctx.lineTo(cx-18,cy+32); ctx.lineTo(cx-20,cy-15); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2.5);
          ctx.strokeStyle=color; ctx.lineWidth=1.5;
          for (let i=0;i<3;i++) {
            ctx.beginPath(); ctx.moveTo(cx-12,cy-15+i*16); ctx.lineTo(cx+12,cy-15+i*16); ctx.stroke();
          }
          this.sprites['boss10_arm'] = cv;
        }
    }

    // ── BOSS 11: Omega Construct (metallic blue-grey, mechanical titan) ──
    _genBoss11Sprites() {
        const color = '#7799bb', accent = '#aaccdd', dark = '#445566';
        // Core (90x90 → 110)
        { const S=110, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=45;
          // Heavy industrial mech body
          ctx.beginPath();
          ctx.moveTo(cx-r*0.65, cy-r); ctx.lineTo(cx+r*0.65, cy-r);
          ctx.lineTo(cx+r, cy-r*0.35); ctx.lineTo(cx+r*0.95, cy+r*0.55);
          ctx.lineTo(cx+r*0.5, cy+r); ctx.lineTo(cx-r*0.5, cy+r);
          ctx.lineTo(cx-r*0.95, cy+r*0.55); ctx.lineTo(cx-r, cy-r*0.35);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3.5);
          // Rivets & panel lines
          ctx.strokeStyle=dark; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy-r); ctx.lineTo(cx-r*0.3,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.3,cy-r); ctx.lineTo(cx+r*0.3,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-r*0.6,cy-r*0.1); ctx.lineTo(cx+r*0.6,cy-r*0.1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-r*0.5,cy+r*0.3); ctx.lineTo(cx+r*0.5,cy+r*0.3); ctx.stroke();
          // Rivets
          ctx.fillStyle='#556677';
          for (let i=-1;i<=1;i+=2) {
            for (let j=-1;j<=1;j+=2) {
              ctx.beginPath(); ctx.arc(cx+i*r*0.5,cy+j*r*0.3,3,0,Math.PI*2); ctx.fill();
            }
          }
          this._drawPartEye(ctx, cx, cy-12, 14, '#88ccff');
          this.drawHighlight(ctx, cx-22, cy-r*0.9, 44, 18, 0.1);
          // Exhaust vents
          for (let i=-1;i<=1;i++) {
            ctx.fillStyle='#333'; ctx.beginPath();
            ctx.roundRect(cx+i*16-5, cy+r-8, 10, 12, 2); ctx.fill();
          }
          this.sprites['boss11_core'] = cv;
        }
        // Turret (35x35 → 47)
        { const S=47, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.roundRect(cx-16, cy-16, 32, 32, 6);
          this.outlineAndFill(ctx, accent, '#111', 2.5);
          for (const sx of [-1,1]) {
            ctx.fillStyle='#555'; ctx.beginPath();
            ctx.roundRect(cx+sx*8-3, cy-22, 6, 15, 2); ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
          }
          this._drawPartEye(ctx, cx, cy+3, 6, '#88bbff');
          this.sprites['boss11_turret'] = cv;
        }
        // Turret2 (28x28 → 40) — smaller secondary
        { const S=40, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2);
          this.outlineAndFill(ctx, dark, '#111', 2);
          ctx.fillStyle='#666'; ctx.beginPath();
          ctx.roundRect(cx-2, cy-18, 4, 12, 1); ctx.fill();
          ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          this._drawPartEye(ctx, cx, cy+2, 4, '#99ccee');
          this.sprites['boss11_turret2'] = cv;
        }
        // Shield (130x25 → 142x37)
        { const cv=this._mkCanvas(142,37), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(8,18); ctx.lineTo(20,4); ctx.lineTo(122,4);
          ctx.lineTo(134,18); ctx.lineTo(122,32); ctx.lineTo(20,32); ctx.closePath();
          this.outlineAndFill(ctx, '#5577aa', '#111', 2.5);
          ctx.strokeStyle='#88aacc'; ctx.lineWidth=1; ctx.globalAlpha=0.5;
          ctx.beginPath(); ctx.moveTo(28,18); ctx.lineTo(114,18); ctx.stroke();
          ctx.globalAlpha=1;
          this.drawHighlight(ctx, 28, 6, 86, 10, 0.12);
          this.sprites['boss11_shield'] = cv;
        }
        // Shield2 (30x18 → 42x30) — mini side shields
        { const cv=this._mkCanvas(42,30), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(4,15); ctx.lineTo(10,3); ctx.lineTo(32,3);
          ctx.lineTo(38,15); ctx.lineTo(32,27); ctx.lineTo(10,27); ctx.closePath();
          this.outlineAndFill(ctx, '#6688aa', '#111', 2);
          this.sprites['boss11_shield2'] = cv;
        }
        // Arm (45x65 → 57x77)
        { const cv=this._mkCanvas(57,77), ctx=cv.getContext('2d'), cx=57/2, cy=77/2;
          ctx.beginPath();
          ctx.moveTo(cx, cy-35); ctx.lineTo(cx+22, cy-18); ctx.lineTo(cx+20, cy+35);
          ctx.lineTo(cx-20, cy+35); ctx.lineTo(cx-22, cy-18); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 3);
          // Hydraulic details
          ctx.strokeStyle=color; ctx.lineWidth=1.5;
          for (let i=0;i<4;i++) {
            ctx.beginPath(); ctx.moveTo(cx-14,cy-20+i*14); ctx.lineTo(cx+14,cy-20+i*14); ctx.stroke();
          }
          // Rivets
          ctx.fillStyle='#889';
          for (let i=0;i<3;i++) {
            ctx.beginPath(); ctx.arc(cx, cy-18+i*16, 2.5, 0, Math.PI*2); ctx.fill();
          }
          this.sprites['boss11_arm'] = cv;
        }
    }

    // ── BOSS 12: Toxin Emperor (toxic green, final W2 boss, massive) ──
    _genBoss12Sprites() {
        const color = '#88ee00', accent = '#bbff44', dark = '#449911';
        // Core (95x95 → 115)
        { const S=115, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=47;
          // Menacing toxic skull
          ctx.beginPath();
          ctx.moveTo(cx, cy-r);
          ctx.bezierCurveTo(cx+r*0.7, cy-r, cx+r, cy-r*0.4, cx+r, cy);
          ctx.bezierCurveTo(cx+r, cy+r*0.5, cx+r*0.6, cy+r*0.8, cx+r*0.4, cy+r);
          ctx.lineTo(cx+r*0.15, cy+r*0.7);
          ctx.lineTo(cx, cy+r*0.9);
          ctx.lineTo(cx-r*0.15, cy+r*0.7);
          ctx.lineTo(cx-r*0.4, cy+r);
          ctx.bezierCurveTo(cx-r*0.6, cy+r*0.8, cx-r, cy+r*0.5, cx-r, cy);
          ctx.bezierCurveTo(cx-r, cy-r*0.4, cx-r*0.7, cy-r, cx, cy-r);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 4);
          // Toxic vein network
          ctx.save(); ctx.shadowColor='#aaff00'; ctx.shadowBlur=6;
          ctx.strokeStyle='#ccff66'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-r*0.5,cy-r*0.3); ctx.bezierCurveTo(cx-r*0.2,cy,cx+r*0.1,cy-r*0.2,cx+r*0.4,cy+r*0.3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.5,cy-r*0.4); ctx.lineTo(cx+r*0.2,cy+r*0.5); ctx.stroke();
          ctx.restore();
          // Twin toxic eyes
          this._drawPartEye(ctx, cx-14, cy-8, 10, '#aaff00');
          this._drawPartEye(ctx, cx+14, cy-8, 10, '#aaff00');
          // Toxic drip from jaw
          ctx.fillStyle='rgba(180,255,50,0.5)';
          ctx.beginPath(); ctx.ellipse(cx,cy+r*0.75,6,10,0,0,Math.PI*2); ctx.fill();
          this.drawHighlight(ctx, cx-25, cy-r*0.9, 50, 20, 0.1);
          this.sprites['boss12_core'] = cv;
        }
        // Turret (38x38 → 50)
        { const S=50, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath();
          ctx.moveTo(cx, cy-18); ctx.lineTo(cx+18, cy-5); ctx.lineTo(cx+13, cy+18);
          ctx.lineTo(cx-13, cy+18); ctx.lineTo(cx-18, cy-5); ctx.closePath();
          this.outlineAndFill(ctx, accent, '#111', 2.5);
          // Quad toxin nozzles
          for (const off of [-8,0,8]) {
            ctx.fillStyle='#556633'; ctx.beginPath();
            ctx.roundRect(cx+off-2, cy-26, 4, 13, 1); ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          }
          this._drawPartEye(ctx, cx, cy+3, 5, '#88ff00');
          this.sprites['boss12_turret'] = cv;
        }
        // Orb (30x30 → 42) — orbiting toxic sphere
        { const S=42, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          const g=ctx.createRadialGradient(cx,cy,2,cx,cy,15);
          g.addColorStop(0,'#eeffaa'); g.addColorStop(0.4,accent); g.addColorStop(1,dark);
          ctx.beginPath(); ctx.arc(cx,cy,14,0,Math.PI*2);
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          // Bubbles
          ctx.fillStyle='rgba(255,255,255,0.4)';
          ctx.beginPath(); ctx.arc(cx-3,cy-4,3,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx+4,cy+2,2,0,Math.PI*2); ctx.fill();
          this.sprites['boss12_orb'] = cv;
        }
        // Shield (130x28 → 142x40)
        { const cv=this._mkCanvas(142,40), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(8,20); ctx.lineTo(20,4); ctx.lineTo(122,4);
          ctx.lineTo(134,20); ctx.lineTo(122,36); ctx.lineTo(20,36); ctx.closePath();
          this.outlineAndFill(ctx, '#668800', '#111', 2.5);
          ctx.strokeStyle='#aadd33'; ctx.lineWidth=1; ctx.globalAlpha=0.5;
          ctx.beginPath(); ctx.moveTo(28,20); ctx.lineTo(114,20); ctx.stroke();
          ctx.globalAlpha=1;
          this.drawHighlight(ctx, 28, 6, 86, 12, 0.12);
          this.sprites['boss12_shield'] = cv;
        }
        // Weakpoint (24x24 → 36)
        { const S=36, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx,cy,11,0,Math.PI*2);
          const g=ctx.createRadialGradient(cx,cy,2,cx,cy,11);
          g.addColorStop(0,'#ffff66'); g.addColorStop(0.5,'#88ee00'); g.addColorStop(1,'#336600');
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2);
          ctx.fillStyle='#eeff88'; ctx.fill();
          this.sprites['boss12_weak'] = cv;
        }
        // Arm (48x68 → 60x80)
        { const cv=this._mkCanvas(60,80), ctx=cv.getContext('2d'), cx=30, cy=40;
          ctx.beginPath();
          ctx.moveTo(cx, cy-38); ctx.lineTo(cx+24, cy-20); ctx.lineTo(cx+22, cy+38);
          ctx.lineTo(cx-22, cy+38); ctx.lineTo(cx-24, cy-20); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 3);
          // Toxic glow segments
          ctx.save(); ctx.shadowColor='#88ff00'; ctx.shadowBlur=4;
          ctx.fillStyle=accent; ctx.globalAlpha=0.35;
          for (let i=0;i<4;i++) {
            ctx.beginPath(); ctx.arc(cx, cy-22+i*14, 5, 0, Math.PI*2); ctx.fill();
          }
          ctx.globalAlpha=1; ctx.restore();
          ctx.strokeStyle=color; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx-16,cy-5); ctx.lineTo(cx+16,cy-5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-18,cy+12); ctx.lineTo(cx+18,cy+12); ctx.stroke();
          this.sprites['boss12_arm'] = cv;
        }
    }

    // ================================================================
    //  MINI-BOSS SPRITES — 4 unique mini-boss types
    // ================================================================

    generateMiniBossSprites() {
        this._genMiniBoss1Sprites(); // Scarab Drone (teal/green, agile)
        this._genMiniBoss2Sprites(); // Garrison Turret (bronze/orange, heavy)
        this._genMiniBoss3Sprites(); // Phantom Wraith (purple, orbiting)
        this._genMiniBoss4Sprites(); // Inferno Striker (crimson, aggressive)
        // World 2 mini-bosses
        this._genMiniBoss5Sprites(); // Vine Sentinel (jungle green)
        this._genMiniBoss6Sprites(); // Magma Sprite (fiery orange)
        this._genMiniBoss7Sprites(); // Cryo Colossus (ice blue)
        this._genMiniBoss8Sprites(); // Rust Hulk (rusty bronze)
    }

    // ── MINI-BOSS 1: Scarab Drone (teal, insectoid, agile) ──
    _genMiniBoss1Sprites() {
        const color = '#22bbaa', accent = '#44ddcc', dark = '#117766';
        // Core (50x50, pad=8 → 66x66)
        { const S=66, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=25;
          // Insect-like rounded body
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, r*0.8, 0, 0, Math.PI*2);
          this.outlineAndFill(ctx, color, '#111', 2.5);
          // Segmentation lines
          ctx.strokeStyle=dark; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx-r*0.6,cy-r*0.1); ctx.lineTo(cx+r*0.6,cy-r*0.1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-r*0.5,cy+r*0.3); ctx.lineTo(cx+r*0.5,cy+r*0.3); ctx.stroke();
          // Compound eyes
          for (const sx of [-1,1]) {
            this._drawPartEye(ctx, cx+sx*10, cy-8, 6, '#44ffdd');
          }
          this.drawHighlight(ctx, cx-12, cy-r*0.7, 24, 10, 0.15);
          // Small mandibles
          for (const sx of [-1,1]) {
            ctx.fillStyle='#555'; ctx.beginPath();
            ctx.moveTo(cx+sx*6, cy+r*0.6); ctx.lineTo(cx+sx*12, cy+r*0.9);
            ctx.lineTo(cx+sx*4, cy+r*0.8); ctx.closePath(); ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          }
          this.sprites['mboss1_core'] = cv;
        }
        // Blade (20x40, pad=6 → 32x52) — rotating wing
        { const cv=this._mkCanvas(32,52), ctx=cv.getContext('2d'), cx=16, cy=26;
          ctx.beginPath();
          ctx.moveTo(cx, cy-24); ctx.lineTo(cx+14, cy-8);
          ctx.lineTo(cx+10, cy+24); ctx.lineTo(cx-10, cy+24);
          ctx.lineTo(cx-14, cy-8); ctx.closePath();
          this.outlineAndFill(ctx, accent, '#111', 2);
          // Energy vein
          ctx.strokeStyle='#88ffee'; ctx.lineWidth=1; ctx.globalAlpha=0.6;
          ctx.beginPath(); ctx.moveTo(cx,cy-18); ctx.lineTo(cx,cy+18); ctx.stroke();
          ctx.globalAlpha=1;
          this.sprites['mboss1_blade'] = cv;
        }
    }

    // ── MINI-BOSS 2: Garrison Turret (bronze, fortified, slow) ──
    _genMiniBoss2Sprites() {
        const color = '#cc8833', accent = '#eebb55', dark = '#885522';
        // Core (55x55, pad=8 → 71x71)
        { const S=71, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=28;
          // Blocky armored hexagon
          ctx.beginPath();
          for (let i=0;i<6;i++) {
            const a = Math.PI/6 + i*Math.PI/3;
            const px = cx+Math.cos(a)*r, py = cy+Math.sin(a)*r;
            if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
          }
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3);
          // Armor plates
          ctx.strokeStyle=dark; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx,cy+r); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-r*0.8,cy); ctx.lineTo(cx+r*0.8,cy); ctx.stroke();
          this._drawPartEye(ctx, cx, cy-4, 8, '#ffaa22');
          this.drawHighlight(ctx, cx-14, cy-r*0.8, 28, 12, 0.1);
          // Bottom vents
          for (let i=-1;i<=1;i++) {
            ctx.fillStyle='#444'; ctx.beginPath();
            ctx.roundRect(cx+i*10-3, cy+r-6, 6, 8, 2); ctx.fill();
          }
          this.sprites['mboss2_core'] = cv;
        }
        // Shield (60x16, pad=4 → 68x24)
        { const cv=this._mkCanvas(68,24), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(6,12); ctx.lineTo(14,3); ctx.lineTo(54,3);
          ctx.lineTo(62,12); ctx.lineTo(54,21); ctx.lineTo(14,21); ctx.closePath();
          this.outlineAndFill(ctx, '#4488cc', '#111', 2);
          ctx.strokeStyle='#88ccff'; ctx.lineWidth=1; ctx.globalAlpha=0.4;
          ctx.beginPath(); ctx.moveTo(18,12); ctx.lineTo(50,12); ctx.stroke();
          ctx.globalAlpha=1;
          this.sprites['mboss2_shield'] = cv;
        }
        // Turret (22x22, pad=5 → 32x32)
        { const S=32, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2);
          this.outlineAndFill(ctx, accent, '#111', 2);
          // Barrel
          ctx.fillStyle='#555'; ctx.beginPath();
          ctx.roundRect(cx-2, cy-16, 4, 12, 1); ctx.fill();
          ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          this._drawPartEye(ctx, cx, cy+2, 4, '#ff8800');
          this.sprites['mboss2_turret'] = cv;
        }
    }

    // ── MINI-BOSS 3: Phantom Wraith (purple, ethereal, orbiting) ──
    _genMiniBoss3Sprites() {
        const color = '#8833cc', accent = '#bb66ff', dark = '#551199';
        // Core (50x50, pad=8 → 66x66)
        { const S=66, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=25;
          // Ghostly diamond shape
          ctx.beginPath();
          ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r*0.8, cy-r*0.15);
          ctx.lineTo(cx+r*0.6, cy+r*0.7); ctx.lineTo(cx, cy+r);
          ctx.lineTo(cx-r*0.6, cy+r*0.7); ctx.lineTo(cx-r*0.8, cy-r*0.15);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 2.5);
          // Inner glow
          const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r*0.7);
          glow.addColorStop(0, 'rgba(187,102,255,0.3)');
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(cx, cy, r*0.7, 0, Math.PI*2); ctx.fill();
          this._drawPartEye(ctx, cx, cy-5, 8, '#dd55ff');
          this.drawHighlight(ctx, cx-10, cy-r*0.8, 20, 10, 0.12);
          this.sprites['mboss3_core'] = cv;
        }
        // Orb (18x18, pad=5 → 28x28) — orbiting will-o-wisp
        { const S=28, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          // Outer glow
          const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
          glow.addColorStop(0, accent);
          glow.addColorStop(0.6, 'rgba(136,51,204,0.5)');
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.fill();
          // Inner core
          ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2);
          this.outlineAndFill(ctx, accent, '#111', 1.5);
          // Sparkle
          ctx.fillStyle='rgba(255,255,255,0.7)';
          ctx.beginPath(); ctx.arc(cx-2, cy-2, 2, 0, Math.PI*2); ctx.fill();
          this.sprites['mboss3_orb'] = cv;
        }
        // Tail (25x35, pad=5 → 35x45) — wispy tendril
        { const cv=this._mkCanvas(35,45), ctx=cv.getContext('2d'), cx=35/2, cy=45/2;
          ctx.beginPath();
          ctx.moveTo(cx-8, cy-20); ctx.quadraticCurveTo(cx+12, cy-5, cx-5, cy+5);
          ctx.quadraticCurveTo(cx+10, cy+12, cx, cy+20);
          ctx.quadraticCurveTo(cx-8, cy+12, cx+5, cy+5);
          ctx.quadraticCurveTo(cx-12, cy-5, cx+8, cy-20);
          ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2);
          // Wispy glow streaks
          ctx.strokeStyle=accent; ctx.lineWidth=1; ctx.globalAlpha=0.4;
          ctx.beginPath(); ctx.moveTo(cx,cy-15); ctx.quadraticCurveTo(cx+6,cy,cx,cy+15); ctx.stroke();
          ctx.globalAlpha=1;
          this.sprites['mboss3_tail'] = cv;
        }
    }

    // ── MINI-BOSS 4: Inferno Striker (crimson, aggressive) ──
    _genMiniBoss4Sprites() {
        const color = '#cc2233', accent = '#ff5544', dark = '#881122';
        // Core (50x50, pad=8 → 66x66)
        { const S=66, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=25;
          // Angular aggressive shape
          ctx.beginPath();
          ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r*0.9, cy-r*0.35);
          ctx.lineTo(cx+r*0.7, cy+r*0.5); ctx.lineTo(cx+r*0.25, cy+r);
          ctx.lineTo(cx-r*0.25, cy+r); ctx.lineTo(cx-r*0.7, cy+r*0.5);
          ctx.lineTo(cx-r*0.9, cy-r*0.35); ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 2.5);
          // War paint streaks
          ctx.strokeStyle=accent; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(cx-r*0.5,cy-r*0.5); ctx.lineTo(cx-r*0.2,cy+r*0.3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.5,cy-r*0.5); ctx.lineTo(cx+r*0.2,cy+r*0.3); ctx.stroke();
          this._drawPartEye(ctx, cx, cy-6, 8, '#ff3322');
          this.drawHighlight(ctx, cx-12, cy-r*0.8, 24, 10, 0.12);
          // Twin exhausts
          for (const sx of [-1,1]) {
            ctx.fillStyle='#333'; ctx.beginPath();
            ctx.roundRect(cx+sx*14-3, cy+r-4, 6, 8, 2); ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          }
          this.sprites['mboss4_core'] = cv;
        }
        // Side Pod (22x30, pad=5 → 32x40) — weapon nacelle
        { const cv=this._mkCanvas(32,40), ctx=cv.getContext('2d'), cx=16, cy=20;
          ctx.beginPath();
          ctx.moveTo(cx, cy-18); ctx.lineTo(cx+12, cy-8);
          ctx.lineTo(cx+10, cy+18); ctx.lineTo(cx-10, cy+18);
          ctx.lineTo(cx-12, cy-8); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2);
          // Engine glow at bottom
          const eng = ctx.createLinearGradient(cx, cy+10, cx, cy+18);
          eng.addColorStop(0, 'rgba(255,100,50,0)');
          eng.addColorStop(1, 'rgba(255,200,100,0.6)');
          ctx.fillStyle = eng;
          ctx.beginPath(); ctx.roundRect(cx-6, cy+10, 12, 8, 2); ctx.fill();
          // Barrel
          ctx.fillStyle='#555'; ctx.beginPath();
          ctx.roundRect(cx-2, cy-22, 4, 10, 1); ctx.fill();
          ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          this.sprites['mboss4_pod'] = cv;
        }
    }

    // ═══════════════════════════════════════════════════
    //  WORLD 2 MINI-BOSSES — 4 unique planetary types
    // ═══════════════════════════════════════════════════

    // ── MINI-BOSS 5: Vine Sentinel (green, organic, jungle) ──
    _genMiniBoss5Sprites() {
        const color = '#33aa55', accent = '#66dd88', dark = '#117733';
        // Core (55x55, pad=8 → 71x71)
        { const S=71, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=28;
          // Organic rounded body with leaf-like extensions
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, r*0.85, 0, 0, Math.PI*2);
          this.outlineAndFill(ctx, color, '#111', 2.5);
          // Bark texture lines
          ctx.strokeStyle=dark; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx-r*0.5,cy-r*0.4); ctx.lineTo(cx-r*0.3,cy+r*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.5,cy-r*0.4); ctx.lineTo(cx+r*0.3,cy+r*0.5); ctx.stroke();
          // Leaf crown
          for (const sx of [-1,1]) {
            ctx.fillStyle=accent; ctx.beginPath();
            ctx.ellipse(cx+sx*r*0.5, cy-r*0.6, r*0.25, r*0.15, sx*0.4, 0, Math.PI*2);
            ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          }
          this._drawPartEye(ctx, cx, cy-4, 8, '#44ff66');
          this.drawHighlight(ctx, cx-14, cy-r*0.7, 28, 12, 0.12);
          this.sprites['mboss5_core'] = cv;
        }
        // Vine (22x35, pad=5 → 32x45) — whip tendril
        { const cv=this._mkCanvas(32,45), ctx=cv.getContext('2d'), cx=16, cy=45/2;
          ctx.beginPath();
          ctx.moveTo(cx, cy-20);
          ctx.bezierCurveTo(cx+12, cy-10, cx-8, cy+5, cx+6, cy+20);
          ctx.lineTo(cx-6, cy+20);
          ctx.bezierCurveTo(cx-4, cy+5, cx+8, cy-10, cx, cy-20);
          ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2);
          // Thorn tips
          ctx.fillStyle=accent;
          ctx.beginPath(); ctx.moveTo(cx+6,cy+20); ctx.lineTo(cx+3,cy+18); ctx.lineTo(cx+8,cy+16); ctx.closePath(); ctx.fill();
          // Glow vein
          ctx.strokeStyle='#88ffaa'; ctx.lineWidth=1; ctx.globalAlpha=0.5;
          ctx.beginPath(); ctx.moveTo(cx,cy-15); ctx.bezierCurveTo(cx+6,cy-5,cx-4,cy+5,cx+2,cy+15); ctx.stroke();
          ctx.globalAlpha=1;
          this.sprites['mboss5_vine'] = cv;
        }
    }

    // ── MINI-BOSS 6: Magma Sprite (orange, fiery, fast) ──
    _genMiniBoss6Sprites() {
        const color = '#ff6600', accent = '#ff9944', dark = '#aa3300';
        // Core (50x50, pad=8 → 66x66)
        { const S=66, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=25;
          // Flame-shaped body
          ctx.beginPath();
          ctx.moveTo(cx, cy-r);
          ctx.bezierCurveTo(cx+r*0.6, cy-r*0.6, cx+r, cy-r*0.1, cx+r*0.7, cy+r*0.4);
          ctx.bezierCurveTo(cx+r*0.5, cy+r*0.8, cx+r*0.2, cy+r, cx, cy+r*0.8);
          ctx.bezierCurveTo(cx-r*0.2, cy+r, cx-r*0.5, cy+r*0.8, cx-r*0.7, cy+r*0.4);
          ctx.bezierCurveTo(cx-r, cy-r*0.1, cx-r*0.6, cy-r*0.6, cx, cy-r);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 2.5);
          // Inner magma glow
          const mg=ctx.createRadialGradient(cx,cy+r*0.1,0,cx,cy,r*0.6);
          mg.addColorStop(0,'rgba(255,200,100,0.3)'); mg.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(cx,cy,r*0.6,0,Math.PI*2); ctx.fill();
          // Cracks (glowing)
          ctx.save(); ctx.shadowColor='#ff6600'; ctx.shadowBlur=4;
          ctx.strokeStyle='#ffcc44'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy-r*0.3); ctx.lineTo(cx+r*0.1,cy+r*0.3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.3,cy-r*0.2); ctx.lineTo(cx+r*0.2,cy+r*0.4); ctx.stroke();
          ctx.restore();
          this._drawPartEye(ctx, cx, cy-6, 7, '#ff4400');
          this.drawHighlight(ctx, cx-10, cy-r*0.7, 20, 10, 0.1);
          this.sprites['mboss6_core'] = cv;
        }
        // Orb (20x20, pad=5 → 30x30) — orbiting fire ball
        { const S=30, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          const g=ctx.createRadialGradient(cx,cy,1,cx,cy,11);
          g.addColorStop(0,'#ffee88'); g.addColorStop(0.5,accent); g.addColorStop(1,dark);
          ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI*2);
          ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
          ctx.fillStyle='rgba(255,255,200,0.5)';
          ctx.beginPath(); ctx.arc(cx-2,cy-2,2.5,0,Math.PI*2); ctx.fill();
          this.sprites['mboss6_orb'] = cv;
        }
    }

    // ── MINI-BOSS 7: Cryo Colossus (ice blue, slow, fortified) ──
    _genMiniBoss7Sprites() {
        const color = '#55ccff', accent = '#88eeff', dark = '#2277aa';
        // Core (60x60, pad=8 → 76x76)
        { const S=76, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=30;
          // Heavy ice golem — blocky hexagonal
          ctx.beginPath();
          for (let i=0;i<6;i++) {
            const a = Math.PI/6 + i*Math.PI/3;
            const px=cx+Math.cos(a)*r, py=cy+Math.sin(a)*r;
            if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
          }
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 3);
          // Ice plate lines
          ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx,cy+r); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-r*0.85,cy); ctx.lineTo(cx+r*0.85,cy); ctx.stroke();
          // Frost aura
          const fg=ctx.createRadialGradient(cx,cy,0,cx,cy,r*0.7);
          fg.addColorStop(0,'rgba(200,240,255,0.2)'); fg.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(cx,cy,r*0.7,0,Math.PI*2); ctx.fill();
          this._drawPartEye(ctx, cx, cy-4, 9, '#aaeeff');
          this.drawHighlight(ctx, cx-15, cy-r*0.8, 30, 14, 0.12);
          this.sprites['mboss7_core'] = cv;
        }
        // Shield (65x18, pad=4 → 73x26)
        { const cv=this._mkCanvas(73,26), ctx=cv.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(6,13); ctx.lineTo(14,3); ctx.lineTo(59,3);
          ctx.lineTo(67,13); ctx.lineTo(59,23); ctx.lineTo(14,23); ctx.closePath();
          this.outlineAndFill(ctx, '#66ccee', '#111', 2);
          ctx.strokeStyle='#aaeeff'; ctx.lineWidth=1; ctx.globalAlpha=0.4;
          ctx.beginPath(); ctx.moveTo(18,13); ctx.lineTo(55,13); ctx.stroke();
          ctx.globalAlpha=1;
          this.sprites['mboss7_shield'] = cv;
        }
        // Turret (24x24, pad=5 → 34x34)
        { const S=34, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI*2);
          this.outlineAndFill(ctx, accent, '#111', 2);
          ctx.fillStyle='#556'; ctx.beginPath();
          ctx.roundRect(cx-2, cy-17, 4, 12, 1); ctx.fill();
          ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          this._drawPartEye(ctx, cx, cy+2, 4, '#88ddff');
          this.sprites['mboss7_turret'] = cv;
        }
    }

    // ── MINI-BOSS 8: Rust Hulk (rusty brown, mechanical junk titan) ──
    _genMiniBoss8Sprites() {
        const color = '#99775a', accent = '#ccaa88', dark = '#664433';
        // Core (55x55, pad=8 → 71x71)
        { const S=71, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2, r=28;
          // Rough junk-metal body
          ctx.beginPath();
          ctx.moveTo(cx-r*0.6, cy-r); ctx.lineTo(cx+r*0.7, cy-r*0.9);
          ctx.lineTo(cx+r, cy-r*0.2); ctx.lineTo(cx+r*0.8, cy+r*0.6);
          ctx.lineTo(cx+r*0.3, cy+r); ctx.lineTo(cx-r*0.4, cy+r*0.9);
          ctx.lineTo(cx-r, cy+r*0.3); ctx.lineTo(cx-r*0.8, cy-r*0.4);
          ctx.closePath();
          this.outlineAndFill(ctx, color, '#111', 2.5);
          // Rust patches
          ctx.fillStyle='rgba(180,100,50,0.3)';
          ctx.beginPath(); ctx.arc(cx-r*0.3,cy-r*0.2,r*0.25,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx+r*0.2,cy+r*0.3,r*0.2,0,Math.PI*2); ctx.fill();
          // Spot welds / rivets
          ctx.fillStyle='#887766';
          for (let i=0;i<5;i++) {
            const rx=cx+(Math.random()-0.5)*r*1.2, ry=cy+(Math.random()-0.5)*r*1.2;
            ctx.beginPath(); ctx.arc(rx,ry,2,0,Math.PI*2); ctx.fill();
          }
          // Panel lines
          ctx.strokeStyle=dark; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy-r*0.7); ctx.lineTo(cx-r*0.1,cy+r*0.6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+r*0.4,cy-r*0.5); ctx.lineTo(cx+r*0.2,cy+r*0.5); ctx.stroke();
          this._drawPartEye(ctx, cx, cy-6, 8, '#ffaa44');
          this.drawHighlight(ctx, cx-14, cy-r*0.8, 28, 12, 0.1);
          this.sprites['mboss8_core'] = cv;
        }
        // Claw (24x32, pad=5 → 34x42) — scrap claw arm
        { const cv=this._mkCanvas(34,42), ctx=cv.getContext('2d'), cx=17, cy=21;
          ctx.beginPath();
          ctx.moveTo(cx, cy-18); ctx.lineTo(cx+13, cy-6);
          ctx.lineTo(cx+10, cy+18); ctx.lineTo(cx-10, cy+18);
          ctx.lineTo(cx-13, cy-6); ctx.closePath();
          this.outlineAndFill(ctx, dark, '#111', 2);
          // Claw pincers
          for (const sx of [-1,1]) {
            ctx.fillStyle=accent;
            ctx.beginPath();
            ctx.moveTo(cx+sx*5,cy+18); ctx.lineTo(cx+sx*10,cy+15);
            ctx.lineTo(cx+sx*4,cy+14); ctx.closePath(); ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          }
          ctx.strokeStyle=color; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(cx-6,cy); ctx.lineTo(cx+6,cy); ctx.stroke();
          this.sprites['mboss8_claw'] = cv;
        }
        // Turret (22x22, pad=5 → 32x32)
        { const S=32, cv=this._mkCanvas(S,S), ctx=cv.getContext('2d'), cx=S/2, cy=S/2;
          ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2);
          this.outlineAndFill(ctx, accent, '#111', 2);
          ctx.fillStyle='#555'; ctx.beginPath();
          ctx.roundRect(cx-2, cy-16, 4, 12, 1); ctx.fill();
          ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
          this._drawPartEye(ctx, cx, cy+2, 4, '#ddaa66');
          this.sprites['mboss8_turret'] = cv;
        }
    }

    getSprite(name) {
        return this.sprites[name] || null;
    }

    // ================================================================
    //  PERK DEVICE SPRITES — Visual ship attachments for each perk
    //  Each perk has 3 stack levels → slightly bigger each level
    //  Stored as perk_<id>_1, perk_<id>_2, perk_<id>_3
    // ================================================================

    generatePerkDeviceSprites() {
        const defs = [
            // ── OFFENSIVE ──
            { id:'piercing_rounds',  draw: this._drawDev_piercingRounds },
            { id:'critical_strike',  draw: this._drawDev_criticalStrike },
            { id:'explosive_rounds', draw: this._drawDev_explosiveRounds },
            { id:'chain_lightning',  draw: this._drawDev_chainLightning },
            { id:'vampire_rounds',   draw: this._drawDev_vampireRounds },
            { id:'double_barrel',    draw: this._drawDev_doubleBarrel },
            { id:'glass_cannon',     draw: this._drawDev_glassCannon },
            // ── DEFENSIVE ──
            { id:'auto_shield',      draw: this._drawDev_autoShield },
            { id:'phase_dodge',      draw: this._drawDev_phaseDodge },
            { id:'emergency_protocol', draw: this._drawDev_emergencyProtocol },
            { id:'damage_converter', draw: this._drawDev_damageConverter },
            { id:'thorns',           draw: this._drawDev_thorns },
            { id:'fortress_mode',    draw: this._drawDev_fortressMode },
            // ── UTILITY ──
            { id:'magnet_field',     draw: this._drawDev_magnetField },
            { id:'combo_master',     draw: this._drawDev_comboMaster },
            { id:'ultimate_engine',  draw: this._drawDev_ultimateEngine },
            { id:'cool_exhaust',     draw: this._drawDev_coolExhaust },
            { id:'lucky_drops',      draw: this._drawDev_luckyDrops },
            { id:'point_multiplier', draw: this._drawDev_pointMultiplier },
            { id:'orbital_drone',    draw: this._drawDev_orbitalDrone },
            // ── WORLD 2 PERKS ──
            { id:'ricochet_master',  draw: this._drawDev_ricochetMaster },
            { id:'predatore',        draw: this._drawDev_predatore },
            { id:'colpo_critico',    draw: this._drawDev_colpoCritico },
            { id:'scia_infuocata',   draw: this._drawDev_sciaInfuocata },
            { id:'esploratore',      draw: this._drawDev_esploratore },
            { id:'sovraccarico',     draw: this._drawDev_sovraccarico },
        ];

        for (const def of defs) {
            for (let stack = 1; stack <= 3; stack++) {
                const scale = 0.85 + stack * 0.15;     // 1.0, 1.15, 1.3
                const S = Math.ceil(20 * scale);          // base 20px → 20, 23, 26
                const cv = document.createElement('canvas');
                cv.width = S; cv.height = S;
                const ctx = cv.getContext('2d');
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                def.draw.call(this, ctx, S, scale, stack);
                this.sprites[`perk_${def.id}_${stack}`] = cv;
            }
        }
    }

    // ── Individual device draw methods ──
    // All receive (ctx, S=canvas size, scale, stack)
    // Device should be centered in the S×S canvas

    /** Piercing Rounds: pointed drill/arrowhead tip */
    _drawDev_piercingRounds(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.38;
        ctx.beginPath();
        ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r*0.5, cy+r*0.6);
        ctx.lineTo(cx, cy+r*0.3); ctx.lineTo(cx-r*0.5, cy+r*0.6);
        ctx.closePath();
        this.outlineAndFill(ctx, '#ccccdd', '#111', 2);
        // Inner groove
        ctx.strokeStyle='#889'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx,cy-r*0.6); ctx.lineTo(cx,cy+r*0.2); ctx.stroke();
        // Tip glow
        ctx.fillStyle='rgba(100,200,255,0.5)';
        ctx.beginPath(); ctx.arc(cx, cy-r*0.5, r*0.2, 0, Math.PI*2); ctx.fill();
    }

    /** Critical Strike: crosshair reticle */
    _drawDev_criticalStrike(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        ctx.strokeStyle='#ff4444'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*1.2,cy); ctx.lineTo(cx-r*0.4,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.4,cy); ctx.lineTo(cx+r*1.2,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy-r*1.2); ctx.lineTo(cx,cy-r*0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy+r*0.4); ctx.lineTo(cx,cy+r*1.2); ctx.stroke();
        ctx.fillStyle='#ff4444'; ctx.beginPath();
        ctx.arc(cx,cy,r*0.2,0,Math.PI*2); ctx.fill();
    }

    /** Explosive Rounds: small bomb/grenade */
    _drawDev_explosiveRounds(ctx, S, sc) {
        const cx=S/2, cy=S/2+1, r=S*0.3;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        this.outlineAndFill(ctx, '#cc4400', '#111', 2);
        // Fuse
        ctx.strokeStyle='#886644'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.quadraticCurveTo(cx+r*0.5,cy-r*1.6,cx+r*0.3,cy-r*1.3); ctx.stroke();
        // Spark
        ctx.fillStyle='#ffdd44';
        ctx.beginPath(); ctx.arc(cx+r*0.3,cy-r*1.3,r*0.2,0,Math.PI*2); ctx.fill();
        // Band
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx-r*0.7,cy-r*0.2); ctx.lineTo(cx+r*0.7,cy-r*0.2); ctx.stroke();
    }

    /** Chain Lightning: small tesla coil */
    _drawDev_chainLightning(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.32;
        // Base cylinder
        ctx.beginPath();
        ctx.roundRect(cx-r*0.4, cy, r*0.8, r*0.9, 2);
        this.outlineAndFill(ctx, '#556677', '#111', 2);
        // Coil sphere
        ctx.beginPath(); ctx.arc(cx, cy, r*0.45, 0, Math.PI*2);
        this.outlineAndFill(ctx, '#4488ff', '#111', 1.5);
        // Lightning bolts
        ctx.strokeStyle='#88ddff'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,cy-r*0.4); ctx.lineTo(cx-r*0.4,cy-r*0.8);
        ctx.lineTo(cx-r*0.1,cy-r*0.6); ctx.lineTo(cx-r*0.5,cy-r*1.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.1,cy-r*0.3);
        ctx.lineTo(cx+r*0.5,cy-r*0.7); ctx.stroke();
    }

    /** Vampire Rounds: blood fang / red vial */
    _drawDev_vampireRounds(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.3;
        // Vial body
        ctx.beginPath();
        ctx.roundRect(cx-r*0.5, cy-r*0.6, r, r*1.5, 3);
        this.outlineAndFill(ctx, '#880022', '#111', 2);
        // Vial neck
        ctx.beginPath();
        ctx.roundRect(cx-r*0.3, cy-r, r*0.6, r*0.5, 2);
        this.outlineAndFill(ctx, '#aa3344', '#111', 1.5);
        // Blood level
        ctx.fillStyle='rgba(255,0,50,0.6)';
        ctx.beginPath(); ctx.roundRect(cx-r*0.35, cy, r*0.7, r*0.7, 2); ctx.fill();
        // Highlight
        ctx.fillStyle='rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.ellipse(cx-r*0.15, cy-r*0.3, r*0.1, r*0.3, 0, 0, Math.PI*2); ctx.fill();
    }

    /** Double Barrel: twin gun barrels */
    _drawDev_doubleBarrel(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        for (const sx of [-1,1]) {
            ctx.beginPath();
            ctx.roundRect(cx+sx*r*0.3-r*0.2, cy-r, r*0.4, r*2, 3);
            this.outlineAndFill(ctx, '#667788', '#111', 2);
            // Barrel bore
            ctx.fillStyle='#222';
            ctx.beginPath(); ctx.arc(cx+sx*r*0.3, cy-r*0.8, r*0.15, 0, Math.PI*2); ctx.fill();
        }
        // Mount plate
        ctx.beginPath();
        ctx.roundRect(cx-r*0.6, cy+r*0.3, r*1.2, r*0.45, 2);
        this.outlineAndFill(ctx, '#556', '#111', 1.5);
    }

    /** Glass Cannon: cracked crystal skull */
    _drawDev_glassCannon(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        const g=ctx.createRadialGradient(cx-r*0.2,cy-r*0.2,0,cx,cy,r);
        g.addColorStop(0,'#ffeecc'); g.addColorStop(0.5,'#ff6644'); g.addColorStop(1,'#882200');
        ctx.fillStyle=g; ctx.fill();
        ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
        // Skull eyes
        ctx.fillStyle='#111';
        ctx.beginPath(); ctx.arc(cx-r*0.3,cy-r*0.1,r*0.15,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.3,cy-r*0.1,r*0.15,0,Math.PI*2); ctx.fill();
        // Crack lines
        ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx-r*0.2,cy-r*0.3);
        ctx.lineTo(cx+r*0.1,cy); ctx.stroke();
    }

    /** Auto Shield: small satellite dish */
    _drawDev_autoShield(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Dish
        ctx.beginPath();
        ctx.ellipse(cx, cy-r*0.1, r, r*0.6, 0, 0, Math.PI);
        this.outlineAndFill(ctx, '#4488cc', '#111', 2);
        // Inner arc
        ctx.strokeStyle='#88ccff'; ctx.lineWidth=1; ctx.globalAlpha=0.5;
        ctx.beginPath(); ctx.ellipse(cx, cy-r*0.05, r*0.6, r*0.35, 0, 0.2, Math.PI-0.2); ctx.stroke();
        ctx.globalAlpha=1;
        // Stem
        ctx.beginPath(); ctx.roundRect(cx-2, cy+r*0.1, 4, r*0.6, 1);
        this.outlineAndFill(ctx, '#556', '#111', 1.5);
        // Focus dot
        ctx.fillStyle='#aaddff'; ctx.beginPath(); ctx.arc(cx,cy-r*0.1,r*0.15,0,Math.PI*2); ctx.fill();
    }

    /** Phase Dodge: phase-shift ring */
    _drawDev_phaseDodge(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        ctx.setLineDash([3,3]);
        ctx.strokeStyle='#66aaff'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
        // Inner ghost circle
        ctx.globalAlpha=0.3; ctx.fillStyle='#4488ff';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.6,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        // Dashes
        ctx.strokeStyle='#aaccff'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.4,0.5,2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,r*0.4,3.5,5); ctx.stroke();
    }

    /** Emergency Protocol: exclamation warning beacon */
    _drawDev_emergencyProtocol(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.33;
        // Triangular warning shape
        ctx.beginPath();
        ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*0.9,cy+r*0.8);
        ctx.lineTo(cx-r*0.9,cy+r*0.8); ctx.closePath();
        this.outlineAndFill(ctx, '#ffcc00', '#111', 2);
        // Exclamation mark
        ctx.fillStyle='#111';
        ctx.beginPath(); ctx.roundRect(cx-2, cy-r*0.4, 4, r*0.8, 1); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy+r*0.55, 2.5, 0, Math.PI*2); ctx.fill();
    }

    /** Damage Converter: recycling / converter coil */
    _drawDev_damageConverter(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.34;
        // Outer ring
        ctx.strokeStyle='#44aa88'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        // Arrows forming cycle (3 arcs)
        ctx.strokeStyle='#66ffbb'; ctx.lineWidth=2;
        for (let i=0;i<3;i++) {
            const a = i*Math.PI*2/3 - Math.PI/2;
            ctx.beginPath(); ctx.arc(cx,cy,r*0.6,a,a+1.5); ctx.stroke();
            // Arrow tip
            const tx=cx+Math.cos(a+1.5)*r*0.6, ty=cy+Math.sin(a+1.5)*r*0.6;
            ctx.fillStyle='#66ffbb';
            ctx.beginPath(); ctx.arc(tx,ty,r*0.12,0,Math.PI*2); ctx.fill();
        }
    }

    /** Thorns: spiked ring collar */
    _drawDev_thorns(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.42;
        // Center hub
        ctx.beginPath(); ctx.arc(cx,cy,r*0.35,0,Math.PI*2);
        this.outlineAndFill(ctx, '#557744', '#111', 2);
        // Spikes — long and aggressive
        const spikes=8;
        ctx.beginPath();
        for (let i=0;i<spikes;i++) {
            const a=i*Math.PI*2/spikes;
            const ir=r*0.4, or=r*1.15;
            const a1=a-Math.PI/spikes*0.5, a2=a+Math.PI/spikes*0.5;
            ctx.lineTo(cx+Math.cos(a1)*ir, cy+Math.sin(a1)*ir);
            ctx.lineTo(cx+Math.cos(a)*or, cy+Math.sin(a)*or);
            ctx.lineTo(cx+Math.cos(a2)*ir, cy+Math.sin(a2)*ir);
        }
        ctx.closePath();
        this.outlineAndFill(ctx, '#aacc77', '#111', 1.5);
        // Spike tips glow
        ctx.shadowColor='#ccff66'; ctx.shadowBlur=4;
        for (let i=0;i<spikes;i++) {
            const a=i*Math.PI*2/spikes;
            const tipX=cx+Math.cos(a)*r*1.15, tipY=cy+Math.sin(a)*r*1.15;
            ctx.fillStyle='#eeffaa';
            ctx.beginPath(); ctx.arc(tipX,tipY,1.2,0,Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur=0;
    }

    /** Fortress Mode: heavy armor plate */
    _drawDev_fortressMode(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.38;
        // Shield plate
        ctx.beginPath();
        ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*0.8,cy-r*0.5);
        ctx.lineTo(cx+r*0.7,cy+r*0.7); ctx.lineTo(cx,cy+r);
        ctx.lineTo(cx-r*0.7,cy+r*0.7); ctx.lineTo(cx-r*0.8,cy-r*0.5);
        ctx.closePath();
        this.outlineAndFill(ctx, '#5566aa', '#111', 2);
        // Cross  emblem
        ctx.strokeStyle='#8899cc'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(cx,cy-r*0.4); ctx.lineTo(cx,cy+r*0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy); ctx.lineTo(cx+r*0.3,cy); ctx.stroke();
    }

    /** Magnet Field: horseshoe magnet */
    _drawDev_magnetField(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.34;
        // U-shape magnet
        ctx.lineWidth=r*0.35;
        ctx.strokeStyle='#cc2222'; ctx.lineCap='round';
        ctx.beginPath(); ctx.arc(cx,cy+r*0.1,r*0.55,Math.PI,Math.PI*2); ctx.stroke();
        // Red poles
        ctx.fillStyle='#cc2222';
        ctx.beginPath(); ctx.roundRect(cx-r*0.55-r*0.17,cy+r*0.1,r*0.35,r*0.6,2); ctx.fill();
        // Blue pole
        ctx.fillStyle='#2244cc';
        ctx.beginPath(); ctx.roundRect(cx+r*0.55-r*0.17,cy+r*0.1,r*0.35,r*0.6,2); ctx.fill();
        // Outlines
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.roundRect(cx-r*0.55-r*0.17,cy+r*0.1,r*0.35,r*0.6,2); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(cx+r*0.55-r*0.17,cy+r*0.1,r*0.35,r*0.6,2); ctx.stroke();
        // Field lines
        ctx.strokeStyle='rgba(100,150,255,0.4)'; ctx.lineWidth=1; ctx.setLineDash([2,2]);
        ctx.beginPath(); ctx.arc(cx,cy+r*0.1,r*0.85,Math.PI+0.3,Math.PI*2-0.3); ctx.stroke();
        ctx.setLineDash([]);
    }

    /** Combo Master: multiplier badge / star counter */
    _drawDev_comboMaster(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.34;
        // Badge background
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        this.outlineAndFill(ctx, '#dd8800', '#111', 2);
        // × symbol
        ctx.strokeStyle='#fff'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(cx-r*0.35,cy-r*0.35); ctx.lineTo(cx+r*0.35,cy+r*0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.35,cy-r*0.35); ctx.lineTo(cx-r*0.35,cy+r*0.35); ctx.stroke();
    }

    /** Ultimate Engine: glowing star reactor */
    _drawDev_ultimateEngine(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.34;
        // Outer ring
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        this.outlineAndFill(ctx, '#334', '#111', 2);
        // Inner glow
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r*0.7);
        g.addColorStop(0,'#ffff88'); g.addColorStop(0.5,'#ffaa00'); g.addColorStop(1,'rgba(255,150,0,0)');
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.7,0,Math.PI*2); ctx.fill();
        // Star
        ctx.fillStyle='#fff';
        ctx.beginPath();
        for (let i=0;i<5;i++) {
            const a=i*Math.PI*2/5-Math.PI/2;
            const ir=r*0.15, or=r*0.4;
            ctx.lineTo(cx+Math.cos(a)*or, cy+Math.sin(a)*or);
            const a2=a+Math.PI/5;
            ctx.lineTo(cx+Math.cos(a2)*ir, cy+Math.sin(a2)*ir);
        }
        ctx.closePath(); ctx.fill();
    }

    /** Cool Exhaust: radiator / heat fin */
    _drawDev_coolExhaust(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Radiator fins
        const fins=5;
        for (let i=0;i<fins;i++) {
            const fx=cx-r*0.7 + i*(r*1.4/(fins-1));
            ctx.beginPath();
            ctx.roundRect(fx-1.5, cy-r*0.6, 3, r*1.2, 1);
            ctx.fillStyle=i%2===0?'#4488aa':'#55aacc'; ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
        }
        // Frame
        ctx.strokeStyle='#556'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.roundRect(cx-r*0.8,cy-r*0.7,r*1.6,r*1.4,3); ctx.stroke();
        // Snowflake icon
        ctx.strokeStyle='#aaddff'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,cy-r*0.35); ctx.lineTo(cx,cy+r*0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy-r*0.15); ctx.lineTo(cx+r*0.3,cy+r*0.15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy+r*0.15); ctx.lineTo(cx+r*0.3,cy-r*0.15); ctx.stroke();
    }

    /** Lucky Drops: four-leaf clover / dice */
    _drawDev_luckyDrops(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.28;
        // Four leaves
        ctx.fillStyle='#33aa44';
        for (let i=0;i<4;i++) {
            const a=i*Math.PI/2;
            const lx=cx+Math.cos(a)*r*0.4, ly=cy+Math.sin(a)*r*0.4;
            ctx.beginPath(); ctx.arc(lx,ly,r*0.4,0,Math.PI*2); ctx.fill();
        }
        // Outline all
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5;
        for (let i=0;i<4;i++) {
            const a=i*Math.PI/2;
            const lx=cx+Math.cos(a)*r*0.4, ly=cy+Math.sin(a)*r*0.4;
            ctx.beginPath(); ctx.arc(lx,ly,r*0.4,0,Math.PI*2); ctx.stroke();
        }
        // Center
        ctx.fillStyle='#228833';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.2,0,Math.PI*2); ctx.fill();
        // Stem
        ctx.strokeStyle='#226633'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(cx,cy+r*0.2); ctx.lineTo(cx+r*0.2,cy+r*1.1); ctx.stroke();
    }

    /** Point Multiplier: diamond gem */
    _drawDev_pointMultiplier(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*0.7,cy-r*0.2);
        ctx.lineTo(cx+r*0.4,cy+r); ctx.lineTo(cx-r*0.4,cy+r);
        ctx.lineTo(cx-r*0.7,cy-r*0.2); ctx.closePath();
        this.outlineAndFill(ctx, '#44aaff', '#111', 2);
        // Facet lines
        ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-r*0.7,cy-r*0.2); ctx.lineTo(cx,cy+r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.7,cy-r*0.2); ctx.lineTo(cx,cy+r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*0.35,cy-r*0.2); ctx.lineTo(cx+r*0.35,cy-r*0.2); ctx.stroke();
        // Sparkle
        ctx.fillStyle='rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(cx-r*0.15,cy-r*0.35,r*0.12,0,Math.PI*2); ctx.fill();
    }

    /** Orbital Drone: mini satellite */
    _drawDev_orbitalDrone(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.32;
        // Main body cube
        ctx.beginPath(); ctx.roundRect(cx-r*0.4,cy-r*0.4,r*0.8,r*0.8,3);
        this.outlineAndFill(ctx, '#778899', '#111', 2);
        // Solar panels
        for (const sx of [-1,1]) {
            ctx.beginPath();
            ctx.roundRect(cx+sx*r*0.5,cy-r*0.25,r*0.5*sx,r*0.5,2);
            this.outlineAndFill(ctx, '#2244aa', '#111', 1.5);
            // Panel lines
            ctx.strokeStyle='#4466cc'; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(cx+sx*r*0.75,cy-r*0.15); ctx.lineTo(cx+sx*r*0.75,cy+r*0.15); ctx.stroke();
        }
        // Antenna
        ctx.strokeStyle='#aaa'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,cy-r*0.4); ctx.lineTo(cx,cy-r*0.8); ctx.stroke();
        ctx.fillStyle='#ff4444'; ctx.beginPath(); ctx.arc(cx,cy-r*0.8,r*0.12,0,Math.PI*2); ctx.fill();
    }

    // ═══════════════════════════════════════
    //  WORLD 2 PERK DEVICE DRAW METHODS
    // ═══════════════════════════════════════

    /** Ricochet Master: angular bouncing arrow */
    _drawDev_ricochetMaster(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Bouncing path arrows
        ctx.strokeStyle='#ff8800'; ctx.lineWidth=2.5;
        ctx.beginPath();
        ctx.moveTo(cx-r*0.8, cy-r*0.6);
        ctx.lineTo(cx-r*0.1, cy+r*0.3);
        ctx.lineTo(cx+r*0.5, cy-r*0.5);
        ctx.lineTo(cx+r*0.9, cy+r*0.6);
        ctx.stroke();
        // Arrow tip
        ctx.fillStyle='#ff8800';
        ctx.beginPath();
        ctx.moveTo(cx+r*0.9, cy+r*0.6);
        ctx.lineTo(cx+r*0.5, cy+r*0.4);
        ctx.lineTo(cx+r*0.7, cy+r*0.2);
        ctx.closePath(); ctx.fill();
        // Bounce dots at vertices
        ctx.fillStyle='#ffcc44';
        ctx.beginPath(); ctx.arc(cx-r*0.1, cy+r*0.3, r*0.12, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.5, cy-r*0.5, r*0.12, 0, Math.PI*2); ctx.fill();
    }

    /** Predatore: hunter eye / targeting scope */
    _drawDev_predatore(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Scope ring
        ctx.strokeStyle='#22cc66'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        // Crosshair
        ctx.strokeStyle='#33ff88'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx-r*1.1,cy); ctx.lineTo(cx-r*0.3,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.3,cy); ctx.lineTo(cx+r*1.1,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy-r*1.1); ctx.lineTo(cx,cy-r*0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy+r*0.3); ctx.lineTo(cx,cy+r*1.1); ctx.stroke();
        // Predator eye center
        ctx.fillStyle='#44ff88';
        ctx.beginPath(); ctx.ellipse(cx,cy,r*0.25,r*0.15,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#111';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.08,0,Math.PI*2); ctx.fill();
    }

    /** Colpo Critico: shockwave explosion ring */
    _drawDev_colpoCritico(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        // Impact star burst
        ctx.fillStyle='#ff6644';
        ctx.beginPath();
        for (let i=0;i<6;i++) {
            const a=i*Math.PI*2/6-Math.PI/2;
            const ir=r*0.3, or=r*1.05;
            ctx.lineTo(cx+Math.cos(a)*or, cy+Math.sin(a)*or);
            const a2=a+Math.PI/6;
            ctx.lineTo(cx+Math.cos(a2)*ir, cy+Math.sin(a2)*ir);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
        // Shockwave ring
        ctx.strokeStyle='#ffaa44'; ctx.lineWidth=2; ctx.globalAlpha=0.6;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.7,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=1;
        // Center
        ctx.fillStyle='#ffdd44';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.2,0,Math.PI*2); ctx.fill();
    }

    /** Scia Infuocata: fire trail flame */
    _drawDev_sciaInfuocata(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.38;
        // Flame shape
        ctx.beginPath();
        ctx.moveTo(cx, cy-r);
        ctx.bezierCurveTo(cx+r*0.5,cy-r*0.4, cx+r*0.7,cy+r*0.2, cx+r*0.3,cy+r*0.7);
        ctx.bezierCurveTo(cx+r*0.1,cy+r, cx-r*0.1,cy+r, cx-r*0.3,cy+r*0.7);
        ctx.bezierCurveTo(cx-r*0.7,cy+r*0.2, cx-r*0.5,cy-r*0.4, cx,cy-r);
        ctx.closePath();
        const fg=ctx.createLinearGradient(cx,cy-r,cx,cy+r);
        fg.addColorStop(0,'#ffee44'); fg.addColorStop(0.4,'#ff6600'); fg.addColorStop(1,'#cc2200');
        ctx.fillStyle=fg; ctx.fill();
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
        // Inner flame
        ctx.fillStyle='rgba(255,255,200,0.5)';
        ctx.beginPath();
        ctx.ellipse(cx, cy-r*0.2, r*0.2, r*0.4, 0, 0, Math.PI*2); ctx.fill();
    }

    /** Esploratore: compass / radar scanner */
    _drawDev_esploratore(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        // Radar circle
        ctx.strokeStyle='#44aadd'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        // Sweep arc
        ctx.fillStyle='rgba(68,170,221,0.3)';
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r*0.9,-Math.PI/2,0); ctx.closePath(); ctx.fill();
        // Rings
        ctx.strokeStyle='rgba(68,170,221,0.4)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.6,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,r*0.3,0,Math.PI*2); ctx.stroke();
        // Crosshair lines
        ctx.strokeStyle='rgba(68,170,221,0.5)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-r,cy); ctx.lineTo(cx+r,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx,cy+r); ctx.stroke();
        // Sweep line
        ctx.strokeStyle='#88ddff'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+r*0.7,cy-r*0.7); ctx.stroke();
        // Center dot
        ctx.fillStyle='#88ddff';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.1,0,Math.PI*2); ctx.fill();
    }

    /** Sovraccarico: overload energy pulse */
    _drawDev_sovraccarico(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Lightning bolt center
        ctx.fillStyle='#ffdd00';
        ctx.beginPath();
        ctx.moveTo(cx-r*0.15, cy-r*0.9);
        ctx.lineTo(cx+r*0.4, cy-r*0.1);
        ctx.lineTo(cx+r*0.05, cy-r*0.05);
        ctx.lineTo(cx+r*0.3, cy+r*0.9);
        ctx.lineTo(cx-r*0.25, cy+r*0.15);
        ctx.lineTo(cx-r*0.05, cy+r*0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
        // Pulse rings
        ctx.strokeStyle='rgba(255,220,0,0.4)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.8,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle='rgba(255,220,0,0.25)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(cx,cy,r*1.1,0,Math.PI*2); ctx.stroke();
    }
}

export default AssetManager;
