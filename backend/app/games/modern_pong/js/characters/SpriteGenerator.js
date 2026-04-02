/**
 * Procedural pixel-art sprite generator.
 * Creates character spritesheets entirely via Canvas 2D — no external assets.
 * Each character gets idle, move, hit, and stun animation frames.
 */
export class SpriteGenerator {
    static #cache = new Map();

    static FRAME_SIZE = 96;
    static CHAR_SCALE = 2;
    static ART_CENTER_Y = 0.63;
    static ANIM_FRAMES = {
        idle: 6,
        moveUp: 6,
        moveDown: 6,
        moveLeft: 6,
        moveRight: 6,
        hit: 5,
        stun: 4,
        celebrate: 6,
    };

    /**
     * Generate a full spritesheet for a character palette.
     * Returns an offscreen canvas with all frames laid out in rows.
     */
    static generate(characterData) {
        const cacheKey = characterData.id + '_' + SpriteGenerator.FRAME_SIZE;
        if (SpriteGenerator.#cache.has(cacheKey)) {
            return SpriteGenerator.#cache.get(cacheKey);
        }

        const fs = SpriteGenerator.FRAME_SIZE;
        const anims = SpriteGenerator.ANIM_FRAMES;
        const maxCols = Math.max(...Object.values(anims));
        const rows = Object.keys(anims).length;

        const canvas = document.createElement('canvas');
        canvas.width = maxCols * fs;
        canvas.height = rows * fs;
        const ctx = canvas.getContext('2d');

        let rowIdx = 0;

        for (const [animName, frameCount] of Object.entries(anims)) {
            for (let frame = 0; frame < frameCount; frame++) {
                const ox = frame * fs;
                const oy = rowIdx * fs;
                SpriteGenerator.#drawCharacterFrame(ctx, ox, oy, fs, characterData, animName, frame);
            }
            rowIdx++;
        }

        const artScaledSize = SpriteGenerator.CHAR_SCALE * 32;
        const sheet = {
            canvas, anims, frameSize: fs, maxCols,
            renderScale: fs / artScaledSize,
            artCenterY: SpriteGenerator.ART_CENTER_Y,
        };
        SpriteGenerator.#cache.set(cacheKey, sheet);
        return sheet;
    }

    static #drawCharacterFrame(ctx, ox, oy, size, charData, anim, frame) {
        const s = size;
        const half = s / 2;
        const sc = SpriteGenerator.CHAR_SCALE;
        const p = charData.palette;
        const id = charData.id;

        ctx.save();
        ctx.translate(ox, oy);

        /* ---- animation transforms ---- */
        const totalFrames = SpriteGenerator.ANIM_FRAMES[anim] || 6;
        const t = frame * Math.PI * 2 / totalFrames;
        let offX = 0, offY = 0, squash = 1, stretch = 1, rotation = 0;
        let legPhase = 0, armMode = 0; // 0=idle, 1=punch, 2=up
        const moving = anim.startsWith('move');

        switch (anim) {
            case 'idle':
                offY = Math.sin(t) * 2 * sc;
                rotation = Math.sin(t * 0.5) * 0.02;
                squash = 1 + Math.sin(t) * 0.018;
                stretch = 1 - Math.sin(t) * 0.018;
                break;
            case 'moveUp':
                offY = (-2 + Math.abs(Math.sin(t)) * 2) * sc;
                legPhase = t;
                rotation = Math.sin(t) * 0.04;
                squash = 1 - Math.abs(Math.sin(t)) * 0.04;
                stretch = 1 + Math.abs(Math.sin(t)) * 0.04;
                break;
            case 'moveDown':
                offY = (2 - Math.abs(Math.sin(t)) * 2) * sc;
                legPhase = t;
                rotation = Math.sin(t) * 0.04;
                squash = 1 - Math.abs(Math.sin(t)) * 0.04;
                stretch = 1 + Math.abs(Math.sin(t)) * 0.04;
                break;
            case 'moveLeft':
                offX = (-2 + Math.sin(t) * 2) * sc;
                legPhase = t;
                rotation = -0.05;
                squash = 1.03; stretch = 0.97;
                break;
            case 'moveRight':
                offX = (2 - Math.sin(t) * 2) * sc;
                legPhase = t;
                rotation = 0.05;
                squash = 1.03; stretch = 0.97;
                break;
            case 'hit': {
                const hitPhases = [
                    { oy: 1, sq: 0.92, st: 1.08, arm: 0 },
                    { oy: -2, sq: 1.18, st: 0.82, arm: 1 },
                    { oy: -3, sq: 1.22, st: 0.78, arm: 1 },
                    { oy: -1.5, sq: 1.08, st: 0.92, arm: 1 },
                    { oy: 0, sq: 1, st: 1, arm: 0 },
                ];
                const hp = hitPhases[Math.min(frame, hitPhases.length - 1)];
                offY = hp.oy * sc; squash = hp.sq; stretch = hp.st; armMode = hp.arm;
                break;
            }
            case 'stun': {
                const wobbleAngles = [-0.1, 0.1, -0.07, 0.04];
                const wobbleX = [-2.5, 2.5, -1.5, 1];
                rotation = wobbleAngles[frame % 4];
                offX = wobbleX[frame % 4] * sc;
                offY = (frame === 3 ? 1.5 : 0) * sc;
                break;
            }
            case 'celebrate': {
                const celebPhases = [
                    { oy: 1.5, sq: 1.12, st: 0.88 },
                    { oy: -4, sq: 0.86, st: 1.14 },
                    { oy: -8, sq: 0.9, st: 1.1 },
                    { oy: -5, sq: 0.93, st: 1.07 },
                    { oy: -1, sq: 1.1, st: 0.9 },
                    { oy: 0, sq: 1, st: 1 },
                ];
                const cp = celebPhases[Math.min(frame, celebPhases.length - 1)];
                offY = cp.oy * sc; squash = cp.sq; stretch = cp.st;
                armMode = 2;
                break;
            }
        }

        ctx.translate(half + offX, s * SpriteGenerator.ART_CENTER_Y + offY);
        if (rotation !== 0) ctx.rotate(rotation);
        ctx.scale(squash, stretch);

        const wide = id === 'tank';
        const bw = wide ? 7 : 5; // body half-width in sc
        const PR = SpriteGenerator.#pixelRect;
        const RR = SpriteGenerator.#roundedRect;

        /* ==== 1. SHADOW ==== */
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(0, 12 * sc, (bw + 4) * sc, 2.5 * sc, 0, 0, Math.PI * 2);
        ctx.fill();

        /* ==== 2. LEGS ==== */
        const lk = Math.sin(legPhase) * 2 * sc;
        // Leg columns
        ctx.fillStyle = p.outline;
        PR(ctx, -3 * sc, 5 * sc - lk, 3 * sc, 6 * sc);
        PR(ctx, 0 * sc, 5 * sc + lk, 3 * sc, 6 * sc);
        // Shoes (rounded-ish)
        ctx.fillStyle = p.secondary;
        RR(ctx, -4 * sc, 10 * sc - lk, 5 * sc, 3 * sc, sc);
        RR(ctx, -1 * sc, 10 * sc + lk, 5 * sc, 3 * sc, sc);
        // Shoe highlight
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.2;
        PR(ctx, -3 * sc, 10 * sc - lk, 3 * sc, sc);
        PR(ctx, 0 * sc, 10 * sc + lk, 3 * sc, sc);
        ctx.globalAlpha = 1;
        // Shoe contours (pencil)
        ctx.strokeStyle = p.outline; ctx.lineWidth = 0.7 * sc;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        SpriteGenerator.#strokeRoundedRect(ctx, -4 * sc, 10 * sc - lk, 5 * sc, 3 * sc, sc);
        SpriteGenerator.#strokeRoundedRect(ctx, -1 * sc, 10 * sc + lk, 5 * sc, 3 * sc, sc);

        /* ==== 3. BODY ==== */
        // Outline
        ctx.fillStyle = p.outline;
        RR(ctx, -(bw + 1) * sc, -2 * sc, (bw + 1) * 2 * sc, 8 * sc, 2 * sc);
        // Fill
        ctx.fillStyle = p.primary;
        RR(ctx, -bw * sc, -1 * sc, bw * 2 * sc, 7 * sc, 2 * sc);
        // Highlight strip (top)
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.15;
        RR(ctx, -(bw - 1) * sc, -1 * sc, (bw - 1) * 2 * sc, 2 * sc, sc);
        ctx.globalAlpha = 1;
        // Shadow strip (bottom)
        ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.12;
        PR(ctx, -(bw - 1) * sc, 4 * sc, (bw - 1) * 2 * sc, 2 * sc);
        ctx.globalAlpha = 1;
        // Cross-hatch shading (pencil sketch)
        ctx.save();
        ctx.strokeStyle = p.outline; ctx.lineWidth = 0.35 * sc;
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const hx = (-(bw - 2) + i * (bw - 1) * 0.5) * sc;
            ctx.moveTo(hx, 3 * sc);
            ctx.lineTo(hx + 1.5 * sc, 6 * sc);
        }
        ctx.stroke();
        ctx.restore();
        // Belt / sash
        ctx.fillStyle = p.secondary;
        PR(ctx, -(bw - 1) * sc, 2 * sc, (bw - 1) * 2 * sc, 2 * sc);
        // Belt buckle
        ctx.fillStyle = p.accent;
        PR(ctx, -sc, 2 * sc, 2 * sc, 2 * sc);

        // Per-character body detail
        SpriteGenerator.#drawBodyDetail(ctx, sc, p, id, bw);
        // Body contour (pencil)
        ctx.strokeStyle = p.outline; ctx.lineWidth = 0.8 * sc;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        SpriteGenerator.#strokeRoundedRect(ctx, -(bw + 1) * sc, -2 * sc, (bw + 1) * 2 * sc, 8 * sc, 2 * sc);

        /* ==== 4. ARMS + HANDS ==== */
        const armX = bw + 1;
        ctx.fillStyle = p.secondary;
        const armStroke = () => {
            ctx.strokeStyle = p.outline; ctx.lineWidth = 0.6 * sc;
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        };
        if (armMode === 2) {
            // Celebrate — arms raised
            PR(ctx, -(armX + 2) * sc, (-9 - frame) * sc, 3 * sc, 7 * sc);
            PR(ctx, (armX - 1) * sc, (-9 - frame) * sc, 3 * sc, 7 * sc);
            // Gloves / hands
            ctx.fillStyle = p.skin;
            RR(ctx, -(armX + 2) * sc, (-10 - frame) * sc, 3 * sc, 2 * sc, sc);
            RR(ctx, (armX - 1) * sc, (-10 - frame) * sc, 3 * sc, 2 * sc, sc);
            // Arm + hand contours (pencil)
            armStroke();
            ctx.strokeRect(Math.round(-(armX + 2) * sc), Math.round((-9 - frame) * sc), Math.round(3 * sc), Math.round(7 * sc));
            ctx.strokeRect(Math.round((armX - 1) * sc), Math.round((-9 - frame) * sc), Math.round(3 * sc), Math.round(7 * sc));
            SpriteGenerator.#strokeRoundedRect(ctx, -(armX + 2) * sc, (-10 - frame) * sc, 3 * sc, 2 * sc, sc);
            SpriteGenerator.#strokeRoundedRect(ctx, (armX - 1) * sc, (-10 - frame) * sc, 3 * sc, 2 * sc, sc);
        } else if (armMode === 1) {
            // Hit — arms forward
            PR(ctx, -(armX + 3) * sc, -2 * sc, 4 * sc, 4 * sc);
            PR(ctx, (armX - 1) * sc, -2 * sc, 4 * sc, 4 * sc);
            ctx.fillStyle = p.skin;
            RR(ctx, -(armX + 4) * sc, -1 * sc, 2 * sc, 2 * sc, sc);
            RR(ctx, (armX + 2) * sc, -1 * sc, 2 * sc, 2 * sc, sc);
            // Arm + hand contours (pencil)
            armStroke();
            ctx.strokeRect(Math.round(-(armX + 3) * sc), Math.round(-2 * sc), Math.round(4 * sc), Math.round(4 * sc));
            ctx.strokeRect(Math.round((armX - 1) * sc), Math.round(-2 * sc), Math.round(4 * sc), Math.round(4 * sc));
            SpriteGenerator.#strokeRoundedRect(ctx, -(armX + 4) * sc, -1 * sc, 2 * sc, 2 * sc, sc);
            SpriteGenerator.#strokeRoundedRect(ctx, (armX + 2) * sc, -1 * sc, 2 * sc, 2 * sc, sc);
        } else {
            // Normal with swing
            const aSwing = moving ? Math.sin(legPhase) * 2 * sc : Math.sin(t) * 0.5 * sc;
            PR(ctx, -(armX + 2) * sc, -1 * sc + aSwing, 3 * sc, 6 * sc);
            PR(ctx, (armX - 1) * sc, -1 * sc - aSwing, 3 * sc, 6 * sc);
            // Hands
            ctx.fillStyle = p.skin;
            RR(ctx, -(armX + 2) * sc, 4 * sc + aSwing, 3 * sc, 2 * sc, sc);
            RR(ctx, (armX - 1) * sc, 4 * sc - aSwing, 3 * sc, 2 * sc, sc);
            // Arm + hand contours (pencil)
            armStroke();
            ctx.strokeRect(Math.round(-(armX + 2) * sc), Math.round(-1 * sc + aSwing), Math.round(3 * sc), Math.round(6 * sc));
            ctx.strokeRect(Math.round((armX - 1) * sc), Math.round(-1 * sc - aSwing), Math.round(3 * sc), Math.round(6 * sc));
            SpriteGenerator.#strokeRoundedRect(ctx, -(armX + 2) * sc, 4 * sc + aSwing, 3 * sc, 2 * sc, sc);
            SpriteGenerator.#strokeRoundedRect(ctx, (armX - 1) * sc, 4 * sc - aSwing, 3 * sc, 2 * sc, sc);
        }

        /* ==== 5. HEAD (big chibi) ==== */
        // Head outline
        ctx.fillStyle = p.outline;
        RR(ctx, -8 * sc, -14 * sc, 16 * sc, 13 * sc, 5 * sc);
        // Skin fill
        ctx.fillStyle = p.skin;
        RR(ctx, -7 * sc, -13 * sc, 14 * sc, 11 * sc, 4 * sc);
        // Forehead highlight
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.10;
        RR(ctx, -5 * sc, -12 * sc, 10 * sc, 3 * sc, 2 * sc);
        ctx.globalAlpha = 1;
        // Cheek blush
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = p.accent;
        SpriteGenerator.#pixelEllipse(ctx, -5 * sc, -5 * sc, 2 * sc, 1.5 * sc);
        SpriteGenerator.#pixelEllipse(ctx, 5 * sc, -5 * sc, 2 * sc, 1.5 * sc);
        ctx.globalAlpha = 1;
        // Head side hatching (pencil sketch)
        ctx.save();
        ctx.strokeStyle = p.outline; ctx.lineWidth = 0.3 * sc;
        ctx.globalAlpha = 0.14;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const hy = (-8 + i * 2) * sc;
            ctx.moveTo(5 * sc, hy);
            ctx.lineTo(6.5 * sc, hy + 1.5 * sc);
        }
        ctx.stroke();
        ctx.restore();
        // Head contour (pencil)
        ctx.strokeStyle = p.outline; ctx.lineWidth = 0.8 * sc;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        SpriteGenerator.#strokeRoundedRect(ctx, -8 * sc, -14 * sc, 16 * sc, 13 * sc, 5 * sc);

        /* ==== 6. HEADGEAR (per character) ==== */
        SpriteGenerator.#drawHeadgear(ctx, sc, p, id, anim, frame);

        /* ==== 7. EYES (per character) ==== */
        SpriteGenerator.#drawEyes(ctx, sc, p, id, anim, frame);

        /* ==== 8. MOUTH ==== */
        SpriteGenerator.#drawMouth(ctx, sc, p, id, anim, frame);

        /* ==== Stun sparkles ==== */
        if (anim === 'stun') {
            const sOff = frame * 1.5;
            // Orbiting stars
            for (let i = 0; i < 4; i++) {
                const a = sOff + i * Math.PI / 2;
                const orbitR = (8 + Math.sin(frame * 0.8 + i) * 2) * sc;
                const sx = Math.cos(a) * orbitR;
                const sy = -15 * sc + Math.sin(a) * 3 * sc;
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(a);
                ctx.fillStyle = i % 2 === 0 ? p.accent : '#ffffff';
                PR(ctx, -sc * 0.5, -sc * 0.3, sc, sc * 0.6);
                PR(ctx, -sc * 0.3, -sc * 0.5, sc * 0.6, sc);
                ctx.restore();
            }
            // Dizzy swirl
            ctx.strokeStyle = p.accent;
            ctx.lineWidth = 0.5 * sc;
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 3; a += 0.3) {
                const sr = (2 + a * 1.2) * sc;
                const sx = Math.cos(a + sOff) * sr;
                const sy = -15 * sc + Math.sin(a + sOff) * sr * 0.3;
                a === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        /* ==== Aura glow ==== */
        if (anim === 'hit' || anim === 'celebrate') {
            const glowIntensity = 0.15 + Math.sin(frame * Math.PI / 2) * 0.1;
            ctx.globalAlpha = glowIntensity;
            const grad = ctx.createRadialGradient(0, -2 * sc, 2 * sc, 0, -2 * sc, 15 * sc);
            grad.addColorStop(0, p.accent);
            grad.addColorStop(0.6, p.secondary);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, -2 * sc, 15 * sc, 15 * sc, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        /* ==== Per-character ambient particles ==== */
        SpriteGenerator.#drawCharacterParticles(ctx, sc, p, id, anim, frame, totalFrames);

        ctx.restore();
    }

    /* ---- Per-character headgear ---- */
    static #drawHeadgear(ctx, sc, p, id, anim, frame) {
        const PR = SpriteGenerator.#pixelRect;
        const RR = SpriteGenerator.#roundedRect;
        const totalFrames = SpriteGenerator.ANIM_FRAMES[anim] || 6;
        const t = frame * Math.PI * 2 / totalFrames;

        switch (id) {
            case 'blaze': {
                // Flame crown with per-frame flicker
                ctx.fillStyle = p.primary;
                PR(ctx, -6 * sc, -15 * sc, 12 * sc, 3 * sc);
                // Side flames with flicker offset
                const flicker1 = Math.sin(t * 2) * 0.5 * sc;
                const flicker2 = Math.cos(t * 2 + 1) * 0.5 * sc;
                ctx.fillStyle = p.secondary;
                PR(ctx, -5 * sc, -16 * sc + flicker1, 3 * sc, 2 * sc);
                PR(ctx, 2 * sc, -16 * sc + flicker2, 3 * sc, 2 * sc);
                // Center flame with height variation
                const centerH = 3 + Math.sin(t * 3) * 0.8;
                ctx.fillStyle = p.accent;
                PR(ctx, -2 * sc, (-17 - Math.sin(t) * 0.5) * sc, 4 * sc, centerH * sc);
                PR(ctx, -1 * sc, (-18 - Math.sin(t * 2) * 0.5) * sc, 2 * sc, sc);
                // Flame tip with color cycling
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3;
                PR(ctx, Math.sin(t) * 0.5 * sc, (-18 - Math.sin(t * 2) * 0.5) * sc, sc, sc);
                // Floating ember sparks
                ctx.fillStyle = p.accent; ctx.globalAlpha = 0.5;
                PR(ctx, (Math.sin(t + 1) * 3) * sc, (-19 - Math.abs(Math.sin(t))) * sc, sc * 0.7, sc * 0.7);
                PR(ctx, (Math.cos(t + 2) * 2) * sc, (-18.5 - Math.abs(Math.cos(t))) * sc, sc * 0.5, sc * 0.5);
                ctx.globalAlpha = 1;
                break;
            }
            case 'frost': {
                // Ice crystal tiara with shimmer effect
                ctx.fillStyle = p.accent;
                PR(ctx, -6 * sc, -15 * sc, 12 * sc, 2 * sc);
                // 3 crystals with varying alpha for shimmer
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.7 + Math.sin(t * 2) * 0.3;
                PR(ctx, -1 * sc, -17 * sc, 2 * sc, 2 * sc);
                ctx.globalAlpha = 0.7 + Math.sin(t * 2 + 2) * 0.3;
                PR(ctx, -4 * sc, -16 * sc, 2 * sc, sc);
                ctx.globalAlpha = 0.7 + Math.sin(t * 2 + 4) * 0.3;
                PR(ctx, 2 * sc, -16 * sc, 2 * sc, sc);
                ctx.globalAlpha = 1;
                // Crystal sparkle with moving highlight
                ctx.fillStyle = p.secondary; ctx.globalAlpha = 0.7;
                const sparkX = Math.sin(t) * sc;
                PR(ctx, sparkX, -17 * sc, sc, sc);
                ctx.globalAlpha = 1;
                // Flowing hair wisps with sway
                const hairSway = Math.sin(t * 0.7) * 0.5 * sc;
                ctx.fillStyle = p.secondary;
                PR(ctx, -7 * sc + hairSway, -10 * sc, 2 * sc, 4 * sc);
                PR(ctx, 5 * sc - hairSway, -10 * sc, 2 * sc, 4 * sc);
                // Tiny ice sparkle floating near tiara
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.4 + Math.sin(t * 3) * 0.3;
                PR(ctx, (Math.sin(t * 1.5) * 5) * sc, -16 * sc, sc * 0.5, sc * 0.5);
                ctx.globalAlpha = 1;
                break;
            }
            case 'shadow': {
                // Dark hood / cowl with inner glow
                ctx.fillStyle = p.primary;
                RR(ctx, -8 * sc, -16 * sc, 16 * sc, 7 * sc, 5 * sc);
                // Hood inner shadow
                ctx.fillStyle = p.outline;
                RR(ctx, -6 * sc, -11 * sc, 12 * sc, 2 * sc, sc);
                // Hood tip
                ctx.fillStyle = p.primary;
                PR(ctx, -1 * sc, -17 * sc, 2 * sc, sc);
                // Inner hood glow (mysterious)
                ctx.fillStyle = p.eyes; ctx.globalAlpha = 0.08 + Math.sin(t) * 0.05;
                RR(ctx, -5 * sc, -12 * sc, 10 * sc, 3 * sc, sc);
                ctx.globalAlpha = 1;
                // Scarf tails (flow while moving + breathe while idle)
                ctx.fillStyle = p.accent;
                const scarfOff = anim.startsWith('move') ? Math.sin(t) * 1.5 * sc : Math.sin(t * 0.5) * 0.5 * sc;
                PR(ctx, -8 * sc, -6 * sc, 2 * sc, 5 * sc + scarfOff);
                PR(ctx, 6 * sc, -6 * sc, 2 * sc, 5 * sc - scarfOff);
                // Scarf tip accent
                ctx.fillStyle = p.secondary; ctx.globalAlpha = 0.5;
                PR(ctx, -8 * sc, -1 * sc + scarfOff, 2 * sc, sc);
                PR(ctx, 6 * sc, -1 * sc - scarfOff, 2 * sc, sc);
                ctx.globalAlpha = 1;
                break;
            }
            case 'tank': {
                // Heavy metal helmet
                ctx.fillStyle = p.primary;
                RR(ctx, -9 * sc, -16 * sc, 18 * sc, 7 * sc, 3 * sc);
                // Central ridge with highlight
                ctx.fillStyle = p.accent;
                PR(ctx, -1 * sc, -17 * sc, 2 * sc, 6 * sc);
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.15;
                PR(ctx, 0, -17 * sc, sc, 6 * sc);
                ctx.globalAlpha = 1;
                // Visor slit
                ctx.fillStyle = p.outline;
                PR(ctx, -6 * sc, -10 * sc, 12 * sc, sc);
                // Visor reflection sweep
                const visorX = -6 + (frame % totalFrames) * (12 / totalFrames);
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.25;
                PR(ctx, visorX * sc, -10 * sc, 3 * sc, sc);
                ctx.globalAlpha = 1;
                // Side rivets with metallic shine
                ctx.fillStyle = p.secondary;
                PR(ctx, -7 * sc, -12 * sc, sc, sc);
                PR(ctx, 6 * sc, -12 * sc, sc, sc);
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.3;
                PR(ctx, -7 * sc, -12 * sc, sc * 0.5, sc * 0.5);
                PR(ctx, 6 * sc, -12 * sc, sc * 0.5, sc * 0.5);
                ctx.globalAlpha = 1;
                break;
            }
            case 'spark': {
                // Electric spiky hair
                ctx.fillStyle = p.primary;
                PR(ctx, -5 * sc, -15 * sc, 10 * sc, 2 * sc);
                // Spikes with per-frame crackle jitter
                const jitter = Math.sin(t * 3) * 0.3 * sc;
                ctx.fillStyle = p.accent;
                PR(ctx, -4 * sc, (-17 + Math.sin(t * 2) * 0.3) * sc, 2 * sc, 2 * sc);
                PR(ctx, -1 * sc, (-19 + jitter) * sc, 2 * sc, 4 * sc);
                PR(ctx, 2 * sc, (-17 + Math.cos(t * 2) * 0.3) * sc, 2 * sc, 2 * sc);
                // Extra side spikes
                PR(ctx, -6 * sc, (-15 + Math.sin(t * 2 + 1) * 0.3) * sc, sc, sc);
                PR(ctx, 5 * sc, (-15 + Math.cos(t * 2 + 1) * 0.3) * sc, sc, sc);
                // Electric tips with flashing
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
                PR(ctx, jitter * 0.5, (-19 + jitter) * sc, sc, sc);
                PR(ctx, -3 * sc, (-17 + Math.sin(t * 2) * 0.3) * sc, sc, sc);
                PR(ctx, 3 * sc, (-17 + Math.cos(t * 2) * 0.3) * sc, sc, sc);
                ctx.globalAlpha = 1;
                // Goggle strap
                ctx.fillStyle = p.outline;
                PR(ctx, -7 * sc, -10 * sc, 2 * sc, sc);
                PR(ctx, 5 * sc, -10 * sc, 2 * sc, sc);
                break;
            }
            case 'venom': {
                // Hoodie
                ctx.fillStyle = p.primary;
                RR(ctx, -8 * sc, -16 * sc, 16 * sc, 6 * sc, 4 * sc);
                // Hood peak
                ctx.fillStyle = p.secondary;
                PR(ctx, -2 * sc, -17 * sc, 4 * sc, sc);
                // Toxic drip marks (animated dripping)
                ctx.fillStyle = p.accent;
                const drip = (frame * 0.4) % 2;
                PR(ctx, -6 * sc, (-10 + drip * 0.5) * sc, sc, (3 + drip * 0.3) * sc);
                PR(ctx, 5 * sc, (-11 + drip * 0.3) * sc, sc, (2 + drip * 0.2) * sc);
                PR(ctx, -5 * sc, (-8 + drip * 0.4) * sc, sc, (2 + drip * 0.2) * sc);
                // Drip droplet falling
                ctx.globalAlpha = 0.6;
                const dropY = (-7 + drip * 2) * sc;
                ctx.beginPath();
                ctx.arc(-6 * sc + sc * 0.5, dropY, sc * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }
        }
    }

    /* ---- Per-character eyes ---- */
    static #drawEyes(ctx, sc, p, id, anim, frame) {
        const PR = SpriteGenerator.#pixelRect;

        if (anim === 'stun') {
            // Enhanced dizzy X-eyes with spiral effect
            ctx.fillStyle = p.outline;
            // Left X
            PR(ctx, -5 * sc, -9 * sc, sc, sc);
            PR(ctx, -3 * sc, -9 * sc, sc, sc);
            PR(ctx, -4 * sc, -10 * sc, sc, sc);
            PR(ctx, -4 * sc, -8 * sc, sc, sc);
            // Right X
            PR(ctx, 2 * sc, -9 * sc, sc, sc);
            PR(ctx, 4 * sc, -9 * sc, sc, sc);
            PR(ctx, 3 * sc, -10 * sc, sc, sc);
            PR(ctx, 3 * sc, -8 * sc, sc, sc);
            return;
        }

        if (anim === 'celebrate') {
            // Happy crescent eyes (^_^)
            ctx.strokeStyle = p.outline;
            ctx.lineWidth = sc * 0.8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(-3.5 * sc, -8 * sc, 2 * sc, Math.PI + 0.3, -0.3);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(3.5 * sc, -8 * sc, 2 * sc, Math.PI + 0.3, -0.3);
            ctx.stroke();
            // Sparkle dots near eyes
            ctx.fillStyle = p.accent;
            ctx.globalAlpha = 0.7;
            PR(ctx, -6 * sc, -10 * sc, sc * 0.7, sc * 0.7);
            PR(ctx, 5.5 * sc, -10 * sc, sc * 0.7, sc * 0.7);
            ctx.globalAlpha = 1;
            return;
        }

        // Idle blink on last 2 frames
        if (anim === 'idle' && frame >= 4) {
            ctx.fillStyle = p.outline;
            PR(ctx, -5 * sc, -8 * sc, 3 * sc, sc);
            PR(ctx, 2 * sc, -8 * sc, 3 * sc, sc);
            // Tiny highlight even when blinking
            ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.3;
            PR(ctx, -5 * sc, -8 * sc, sc, sc * 0.5);
            PR(ctx, 2 * sc, -8 * sc, sc, sc * 0.5);
            ctx.globalAlpha = 1;
            return;
        }

        // Add glow for hit frames
        if (anim === 'hit') {
            ctx.shadowColor = p.eyes;
            ctx.shadowBlur = 4 * sc;
        }

        switch (id) {
            case 'blaze': {
                // Fierce angled eyes (wider, angular)
                ctx.fillStyle = '#ffffff';
                PR(ctx, -5 * sc, -9 * sc, 3 * sc, 2 * sc);
                PR(ctx, 2 * sc, -9 * sc, 3 * sc, 2 * sc);
                // Iris
                ctx.fillStyle = p.eyes;
                PR(ctx, -4 * sc, -8 * sc, 2 * sc, 1 * sc);
                PR(ctx, 3 * sc, -8 * sc, 2 * sc, 1 * sc);
                // Angry brow line
                ctx.fillStyle = p.outline;
                PR(ctx, -5 * sc, -10 * sc, 3 * sc, sc);
                PR(ctx, 2 * sc, -10 * sc, 3 * sc, sc);
                // Highlight
                ctx.fillStyle = '#ffffff';
                PR(ctx, -5 * sc, -9 * sc, sc, sc);
                PR(ctx, 2 * sc, -9 * sc, sc, sc);
                break;
            }
            case 'frost': {
                // Large round gentle eyes
                ctx.fillStyle = '#ffffff';
                PR(ctx, -5 * sc, -10 * sc, 3 * sc, 3 * sc);
                PR(ctx, 2 * sc, -10 * sc, 3 * sc, 3 * sc);
                // Large iris
                ctx.fillStyle = p.eyes;
                PR(ctx, -4 * sc, -9 * sc, 2 * sc, 2 * sc);
                PR(ctx, 3 * sc, -9 * sc, 2 * sc, 2 * sc);
                // Double highlight
                ctx.fillStyle = '#ffffff';
                PR(ctx, -5 * sc, -10 * sc, sc, sc);
                PR(ctx, 2 * sc, -10 * sc, sc, sc);
                PR(ctx, -3 * sc, -8 * sc, sc, sc);
                PR(ctx, 4 * sc, -8 * sc, sc, sc);
                break;
            }
            case 'shadow': {
                // Narrow glowing slits
                ctx.fillStyle = p.eyes;
                ctx.shadowColor = p.eyes; ctx.shadowBlur = 4 * sc;
                PR(ctx, -5 * sc, -8 * sc, 4 * sc, sc);
                PR(ctx, 1 * sc, -8 * sc, 4 * sc, sc);
                ctx.shadowBlur = 0;
                // Bright center
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6;
                PR(ctx, -4 * sc, -8 * sc, 2 * sc, sc);
                PR(ctx, 2 * sc, -8 * sc, 2 * sc, sc);
                ctx.globalAlpha = 1;
                break;
            }
            case 'tank': {
                // Small determined eyes (behind visor)
                ctx.fillStyle = '#ffffff';
                PR(ctx, -4 * sc, -9 * sc, 2 * sc, 2 * sc);
                PR(ctx, 2 * sc, -9 * sc, 2 * sc, 2 * sc);
                ctx.fillStyle = p.eyes;
                PR(ctx, -3 * sc, -8 * sc, sc, sc);
                PR(ctx, 3 * sc, -8 * sc, sc, sc);
                // Highlight
                ctx.fillStyle = '#ffffff';
                PR(ctx, -4 * sc, -9 * sc, sc, sc);
                PR(ctx, 2 * sc, -9 * sc, sc, sc);
                break;
            }
            case 'spark': {
                // Goggle-framed eyes (dark ring around each)
                ctx.fillStyle = p.outline;
                PR(ctx, -6 * sc, -10 * sc, 5 * sc, 4 * sc);
                PR(ctx, 1 * sc, -10 * sc, 5 * sc, 4 * sc);
                ctx.fillStyle = '#ffffff';
                PR(ctx, -5 * sc, -9 * sc, 3 * sc, 2 * sc);
                PR(ctx, 2 * sc, -9 * sc, 3 * sc, 2 * sc);
                ctx.fillStyle = p.eyes;
                PR(ctx, -4 * sc, -8 * sc, 2 * sc, sc);
                PR(ctx, 3 * sc, -8 * sc, 2 * sc, sc);
                // Goggle shine
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.4;
                PR(ctx, -5 * sc, -9 * sc, sc, sc);
                PR(ctx, 2 * sc, -9 * sc, sc, sc);
                ctx.globalAlpha = 1;
                break;
            }
            case 'venom': {
                // Serpent eyes (colored fill + vertical slit pupil)
                ctx.fillStyle = p.eyes;
                ctx.shadowColor = p.eyes; ctx.shadowBlur = 3 * sc;
                PR(ctx, -5 * sc, -10 * sc, 3 * sc, 3 * sc);
                PR(ctx, 2 * sc, -10 * sc, 3 * sc, 3 * sc);
                ctx.shadowBlur = 0;
                // Vertical slit pupil
                ctx.fillStyle = p.outline;
                PR(ctx, -4 * sc, -10 * sc, sc, 3 * sc);
                PR(ctx, 3 * sc, -10 * sc, sc, 3 * sc);
                // Highlight
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.4;
                PR(ctx, -5 * sc, -10 * sc, sc, sc);
                PR(ctx, 2 * sc, -10 * sc, sc, sc);
                ctx.globalAlpha = 1;
                break;
            }
            default: {
                // Fallback standard eyes
                ctx.fillStyle = '#ffffff';
                PR(ctx, -5 * sc, -9 * sc, 3 * sc, 3 * sc);
                PR(ctx, 2 * sc, -9 * sc, 3 * sc, 3 * sc);
                ctx.fillStyle = p.eyes;
                PR(ctx, -4 * sc, -8 * sc, 2 * sc, 2 * sc);
                PR(ctx, 3 * sc, -8 * sc, 2 * sc, 2 * sc);
                ctx.fillStyle = '#ffffff';
                PR(ctx, -5 * sc, -9 * sc, sc, sc);
                PR(ctx, 2 * sc, -9 * sc, sc, sc);
            }
        }

        if (anim === 'hit') {
            ctx.shadowBlur = 0;
        }
    }

    /* ---- Mouth (per-character, per-animation) ---- */
    static #drawMouth(ctx, sc, p, id, anim, frame) {
        const PR = SpriteGenerator.#pixelRect;
        if (anim === 'celebrate') {
            // Big happy grin with teeth and tongue
            ctx.fillStyle = p.outline;
            PR(ctx, -3 * sc, -5 * sc, 6 * sc, 3 * sc);
            ctx.fillStyle = '#ffffff';
            PR(ctx, -2 * sc, -5 * sc, 4 * sc, sc);
            // Tongue peek
            ctx.fillStyle = '#ff7777';
            PR(ctx, -sc, -3 * sc, 2 * sc, sc);
        } else if (anim === 'stun') {
            // Wavy open mouth with wobble
            const wobble = Math.sin(frame * Math.PI * 0.5) * sc * 0.5;
            ctx.fillStyle = p.outline;
            PR(ctx, -1.5 * sc + wobble, -5 * sc, 3 * sc, 2 * sc);
            ctx.fillStyle = '#330000'; ctx.globalAlpha = 0.5;
            PR(ctx, -sc + wobble, -4 * sc, 2 * sc, sc);
            ctx.globalAlpha = 1;
        } else if (anim === 'hit') {
            // Battle cry — wide open mouth
            ctx.fillStyle = p.outline;
            PR(ctx, -2 * sc, -5 * sc, 4 * sc, 3 * sc);
            ctx.fillStyle = '#660000'; ctx.globalAlpha = 0.6;
            PR(ctx, -1 * sc, -4 * sc, 2 * sc, 2 * sc);
            ctx.globalAlpha = 1;
            // Teeth top row
            ctx.fillStyle = '#ffffff';
            PR(ctx, -1 * sc, -5 * sc, sc, sc);
            PR(ctx, 0, -5 * sc, sc, sc);
        } else {
            // Per-character idle/move mouth
            switch (id) {
                case 'blaze':
                case 'tank':
                    // Determined frown
                    ctx.fillStyle = p.outline;
                    PR(ctx, -2 * sc, -4 * sc, 4 * sc, sc);
                    break;
                case 'frost':
                case 'spark':
                    // Small smile curve
                    ctx.fillStyle = p.outline;
                    PR(ctx, -2 * sc, -4 * sc, 4 * sc, sc);
                    ctx.fillStyle = p.skin;
                    PR(ctx, -2 * sc, -4 * sc, sc, sc);
                    PR(ctx, sc, -4 * sc, sc, sc);
                    break;
                case 'shadow':
                    // Thin neutral line
                    ctx.fillStyle = p.outline;
                    PR(ctx, -sc, -4 * sc, 2 * sc, sc);
                    break;
                case 'venom':
                    // Mischievous smirk
                    ctx.fillStyle = p.outline;
                    PR(ctx, -2 * sc, -4 * sc, 4 * sc, sc);
                    PR(ctx, sc, -5 * sc, sc, sc);
                    break;
                default:
                    ctx.fillStyle = p.outline;
                    PR(ctx, -1 * sc, -4 * sc, 2 * sc, sc);
                    break;
            }
        }
    }

    /* ---- Per-character body detail ---- */
    static #drawBodyDetail(ctx, sc, p, id, bw) {
        const PR = SpriteGenerator.#pixelRect;
        switch (id) {
            case 'blaze':
                // Shoulder pads
                ctx.fillStyle = p.accent;
                PR(ctx, -(bw + 1) * sc, -2 * sc, 2 * sc, 2 * sc);
                PR(ctx, (bw - 1) * sc, -2 * sc, 2 * sc, 2 * sc);
                // Chest emblem
                ctx.fillStyle = p.accent;
                PR(ctx, -sc, 0, 2 * sc, sc);
                break;
            case 'frost':
                // Robe trim (slightly wider at bottom)
                ctx.fillStyle = p.accent; ctx.globalAlpha = 0.3;
                PR(ctx, -(bw + 1) * sc, 4 * sc, (bw + 1) * 2 * sc, 2 * sc);
                ctx.globalAlpha = 1;
                // Chest gem
                ctx.fillStyle = '#ffffff';
                PR(ctx, 0, 0, sc, sc);
                break;
            case 'shadow':
                // Cross-body strap
                ctx.fillStyle = p.accent;
                for (let i = 0; i < 4; i++) {
                    PR(ctx, (-3 + i * 2) * sc, (-1 + i) * sc, 2 * sc, sc);
                }
                break;
            case 'tank':
                // Armor plates on chest
                ctx.fillStyle = p.secondary;
                PR(ctx, -(bw - 1) * sc, -1 * sc, (bw - 1) * 2 * sc, sc);
                PR(ctx, -(bw - 1) * sc, 1 * sc, (bw - 1) * 2 * sc, sc);
                // Side reinforcements
                ctx.fillStyle = p.accent;
                PR(ctx, -bw * sc, 0, sc, 4 * sc);
                PR(ctx, (bw - 1) * sc, 0, sc, 4 * sc);
                break;
            case 'spark':
                // Electric zigzag on chest
                ctx.fillStyle = p.accent;
                PR(ctx, -2 * sc, -1 * sc, sc, sc);
                PR(ctx, -sc, 0, sc, sc);
                PR(ctx, 0, -1 * sc, sc, sc);
                PR(ctx, sc, 0, sc, sc);
                break;
            case 'venom':
                // Toxic drip pattern on body
                ctx.fillStyle = p.accent;
                PR(ctx, -(bw - 2) * sc, 4 * sc, sc, 2 * sc);
                PR(ctx, (bw - 3) * sc, 3 * sc, sc, 3 * sc);
                PR(ctx, 0, 5 * sc, sc, sc);
                break;
        }
    }

    /* ---- Per-character ambient particles ---- */
    static #drawCharacterParticles(ctx, sc, p, id, anim, frame, totalFrames) {
        const PR = SpriteGenerator.#pixelRect;
        const t = frame * Math.PI * 2 / totalFrames;

        switch (id) {
            case 'blaze': {
                // Rising flame particles
                const numFlames = anim === 'hit' ? 5 : 3;
                for (let i = 0; i < numFlames; i++) {
                    const seed = i * 2.39996;
                    const life = (frame * 0.3 + seed) % 1;
                    const fx = (Math.sin(seed * 3) * 6 + Math.sin(t + seed) * 2) * sc;
                    const fy = (-14 - life * 8) * sc;
                    const fSize = (1 - life * 0.5) * sc;
                    ctx.globalAlpha = 0.7 * (1 - life);
                    ctx.fillStyle = life < 0.3 ? p.accent : (life < 0.6 ? p.secondary : p.primary);
                    PR(ctx, fx - fSize / 2, fy - fSize / 2, fSize, fSize);
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 'frost': {
                // Floating ice sparkles
                for (let i = 0; i < 4; i++) {
                    const seed = i * 1.618;
                    const angle = t + seed * Math.PI;
                    const radius = (10 + Math.sin(angle * 0.7) * 3) * sc;
                    const fx = Math.cos(angle) * radius;
                    const fy = -8 * sc + Math.sin(angle * 1.3) * 5 * sc;
                    const sparkleSize = (0.6 + Math.sin(t + i * 2) * 0.3) * sc;
                    ctx.globalAlpha = 0.5 + Math.sin(t + i) * 0.3;
                    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : p.accent;
                    ctx.save();
                    ctx.translate(fx, fy);
                    ctx.rotate(angle);
                    PR(ctx, -sparkleSize / 2, 0, sparkleSize, sparkleSize * 0.5);
                    PR(ctx, 0, -sparkleSize / 2, sparkleSize * 0.5, sparkleSize);
                    ctx.restore();
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 'shadow': {
                // Dark mist wisps
                ctx.globalAlpha = 0.2;
                for (let i = 0; i < 3; i++) {
                    const seed = i * 2.1;
                    const wx = (Math.sin(t + seed) * 8) * sc;
                    const wy = (5 + Math.cos(t * 0.5 + seed) * 3) * sc;
                    const wLen = (4 + Math.sin(t + i) * 2) * sc;
                    ctx.fillStyle = p.primary;
                    ctx.beginPath();
                    ctx.ellipse(wx, wy, wLen, sc * 0.8, t + seed, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 'tank': {
                // Ground dust puffs when moving
                if (anim.startsWith('move') || anim === 'celebrate') {
                    ctx.globalAlpha = 0.25;
                    ctx.fillStyle = '#ccbb99';
                    for (let i = 0; i < 3; i++) {
                        const dx = (Math.sin(t + i * 2) * 5) * sc;
                        const dy = (11 + Math.sin(frame * 0.7 + i * 1.3) * 1.5) * sc;
                        const dSize = (1 + Math.sin(t + i) * 0.5) * sc;
                        ctx.beginPath();
                        ctx.ellipse(dx, dy, dSize, dSize * 0.6, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                }
                break;
            }
            case 'spark': {
                // Electric arcs between hair spikes
                ctx.strokeStyle = p.accent;
                ctx.lineWidth = 0.5 * sc;
                ctx.globalAlpha = 0.6 + Math.sin(t * 2) * 0.3;
                for (let i = 0; i < 2; i++) {
                    const startX = (i === 0 ? -3 : 1) * sc;
                    const startY = -17 * sc;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    for (let j = 1; j <= 3; j++) {
                        const bx = startX + (Math.sin(t + i + j) * 3) * sc;
                        const by = startY + j * 2 * sc * (i === 0 ? -0.3 : 0.3);
                        ctx.lineTo(bx, by);
                    }
                    ctx.stroke();
                }
                // Floating spark points
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 3; i++) {
                    const sa = t * 2 + i * Math.PI * 2 / 3;
                    const sr = (11 + Math.sin(sa) * 2) * sc;
                    const sx = Math.cos(sa) * sr;
                    const sy = -8 * sc + Math.sin(sa * 1.5) * 4 * sc;
                    PR(ctx, sx, sy, sc * 0.7, sc * 0.7);
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 'venom': {
                // Toxic rising bubbles
                for (let i = 0; i < 4; i++) {
                    const seed = i * 1.8;
                    const life = (frame * 0.25 + seed * 0.3) % 1;
                    const bx = (Math.sin(seed * 5) * 6 + Math.sin(t + seed) * 1.5) * sc;
                    const by = (6 - life * 14) * sc;
                    const bSize = (0.5 + (1 - life) * 0.8) * sc;
                    ctx.globalAlpha = 0.5 * (1 - life * 0.8);
                    ctx.fillStyle = i % 2 === 0 ? p.accent : p.secondary;
                    ctx.beginPath();
                    ctx.arc(bx, by, bSize, 0, Math.PI * 2);
                    ctx.fill();
                    // Bubble highlight
                    ctx.fillStyle = '#ffffff';
                    ctx.globalAlpha = 0.3 * (1 - life);
                    PR(ctx, bx - bSize * 0.3, by - bSize * 0.3, bSize * 0.4, bSize * 0.4);
                }
                ctx.globalAlpha = 1;
                break;
            }
        }
    }

    /* ---- Helpers ---- */

    static #pixelRect(ctx, x, y, w, h) {
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }

    static #pixelEllipse(ctx, cx, cy, rx, ry) {
        ctx.beginPath();
        ctx.ellipse(Math.round(cx), Math.round(cy), rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    static #roundedRect(ctx, x, y, w, h, r) {
        x = Math.round(x); y = Math.round(y);
        w = Math.round(w); h = Math.round(h);
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fill();
    }

    static #strokeRoundedRect(ctx, x, y, w, h, r) {
        x = Math.round(x); y = Math.round(y);
        w = Math.round(w); h = Math.round(h);
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.stroke();
    }

    /**
     * Generate a chibi portrait (for menus/HUD).
     */

    static generatePortrait(characterData, portraitSize = 60) {
        const cacheKey = `portrait_${characterData.id}_${portraitSize}`;
        if (SpriteGenerator.#cache.has(cacheKey)) {
            return SpriteGenerator.#cache.get(cacheKey);
        }

        const canvas = document.createElement('canvas');
        canvas.width = portraitSize;
        canvas.height = portraitSize;
        const ctx = canvas.getContext('2d');
        const p = characterData.palette;
        const id = characterData.id;
        const s = portraitSize;
        const u = s / 32; // unit

        // Background circle
        ctx.fillStyle = p.outline;
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.primary;
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2);
        ctx.fill();

        // Inner gradient-like highlight
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.08;
        ctx.beginPath();
        ctx.arc(s / 2, s * 0.4, s / 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Head (fills most of portrait)
        const headW = s * 0.6;
        const headH = s * 0.5;
        const headY = s * 0.22;

        // Head outline
        ctx.fillStyle = p.outline;
        SpriteGenerator.#roundedRect(ctx,
            s / 2 - headW / 2 - 1, headY - 1,
            headW + 2, headH + 2, headW * 0.35
        );
        // Head fill
        ctx.fillStyle = p.skin;
        SpriteGenerator.#roundedRect(ctx,
            s / 2 - headW / 2, headY,
            headW, headH, headW * 0.3
        );
        // Forehead highlight
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.12;
        SpriteGenerator.#roundedRect(ctx,
            s / 2 - headW * 0.3, headY + 2,
            headW * 0.6, headH * 0.25, headW * 0.15
        );
        ctx.globalAlpha = 1;

        // Eyes (big, centered)
        const eyeY = headY + headH * 0.45;
        const eyeW = 3 * u;
        const eyeH = 3 * u;
        const eyeGap = 1 * u;

        // White sclera
        ctx.fillStyle = '#ffffff';
        SpriteGenerator.#pixelRect(ctx, s / 2 - eyeGap - eyeW, eyeY, eyeW, eyeH);
        SpriteGenerator.#pixelRect(ctx, s / 2 + eyeGap, eyeY, eyeW, eyeH);
        // Iris
        ctx.fillStyle = p.eyes;
        SpriteGenerator.#pixelRect(ctx, s / 2 - eyeGap - eyeW + u, eyeY + u, 2 * u, 2 * u);
        SpriteGenerator.#pixelRect(ctx, s / 2 + eyeGap + u, eyeY + u, 2 * u, 2 * u);
        // Highlight
        ctx.fillStyle = '#ffffff';
        SpriteGenerator.#pixelRect(ctx, s / 2 - eyeGap - eyeW, eyeY, u, u);
        SpriteGenerator.#pixelRect(ctx, s / 2 + eyeGap, eyeY, u, u);

        // Mouth
        ctx.fillStyle = p.outline;
        SpriteGenerator.#pixelRect(ctx, s / 2 - u, eyeY + eyeH + 2 * u, 2 * u, u);

        // Headgear mini (per-character)
        const hairY = headY - 3 * u;
        switch (id) {
            case 'blaze':
                ctx.fillStyle = p.accent;
                SpriteGenerator.#pixelRect(ctx, s / 2 - 3 * u, hairY, 6 * u, 3 * u);
                SpriteGenerator.#pixelRect(ctx, s / 2 - u, hairY - 2 * u, 2 * u, 2 * u);
                break;
            case 'frost':
                ctx.fillStyle = p.accent;
                SpriteGenerator.#pixelRect(ctx, s / 2 - 4 * u, hairY + u, 8 * u, 2 * u);
                ctx.fillStyle = '#ffffff';
                SpriteGenerator.#pixelRect(ctx, s / 2 - u, hairY, 2 * u, u);
                break;
            case 'shadow':
                ctx.fillStyle = p.primary;
                SpriteGenerator.#roundedRect(ctx, s / 2 - headW / 2 - 1, hairY, headW + 2, 5 * u, headW * 0.3);
                break;
            case 'tank':
                ctx.fillStyle = p.primary;
                SpriteGenerator.#roundedRect(ctx, s / 2 - headW / 2 - 2, hairY, headW + 4, 5 * u, 3 * u);
                ctx.fillStyle = p.accent;
                SpriteGenerator.#pixelRect(ctx, s / 2 - u, hairY, 2 * u, 4 * u);
                break;
            case 'spark':
                ctx.fillStyle = p.accent;
                SpriteGenerator.#pixelRect(ctx, s / 2 - 3 * u, hairY + u, 6 * u, 2 * u);
                SpriteGenerator.#pixelRect(ctx, s / 2 - u, hairY - 2 * u, 2 * u, 3 * u);
                ctx.fillStyle = '#ffffff';
                SpriteGenerator.#pixelRect(ctx, s / 2, hairY - 2 * u, u, u);
                break;
            case 'venom':
                ctx.fillStyle = p.primary;
                SpriteGenerator.#roundedRect(ctx, s / 2 - headW / 2, hairY, headW, 4 * u, headW * 0.3);
                ctx.fillStyle = p.secondary;
                SpriteGenerator.#pixelRect(ctx, s / 2 - 2 * u, hairY, 4 * u, u);
                break;
        }

        // Body hint (lower third)
        ctx.fillStyle = p.primary;
        SpriteGenerator.#roundedRect(ctx,
            s / 2 - headW / 2 - 2, s * 0.7,
            headW + 4, s * 0.28, 3 * u
        );
        // Accent stripe on body
        ctx.fillStyle = p.secondary;
        SpriteGenerator.#pixelRect(ctx,
            s / 2 - headW / 4, s * 0.76,
            headW / 2, 2 * u
        );

        // Border ring
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();

        SpriteGenerator.#cache.set(cacheKey, canvas);
        return canvas;
    }
}
