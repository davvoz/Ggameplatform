/**
 * Procedural pixel-art sprite generator.
 * Creates character spritesheets entirely via Canvas 2D — no external assets.
 * Each character gets idle, move, hit, and stun animation frames.
 */
export class SpriteGenerator {
    static #cache = new Map();

    static FRAME_SIZE = 64;
    static ANIM_FRAMES = {
        idle: 4,
        moveUp: 4,
        moveDown: 4,
        moveLeft: 4,
        moveRight: 4,
        hit: 3,
        stun: 2,
        celebrate: 4,
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

        const sheet = { canvas, anims, frameSize: fs, maxCols };
        SpriteGenerator.#cache.set(cacheKey, sheet);
        return sheet;
    }

    static #drawCharacterFrame(ctx, ox, oy, size, charData, anim, frame) {
        const s = size;
        const half = s / 2;
        const sc = s / 32;
        const p = charData.palette;
        const id = charData.id;

        ctx.save();
        ctx.translate(ox, oy);

        /* ---- animation transforms ---- */
        const t = frame * Math.PI / 2;
        let offX = 0, offY = 0, squash = 1, stretch = 1;
        let legPhase = 0, armMode = 0; // 0=idle, 1=punch, 2=up
        const moving = anim.startsWith('move');

        switch (anim) {
            case 'idle':
                offY = Math.sin(t) * 1.2 * sc;
                break;
            case 'moveUp':
                offY = (-1 + Math.abs(Math.sin(t))) * sc;
                legPhase = t; break;
            case 'moveDown':
                offY = (1 - Math.abs(Math.sin(t))) * sc;
                legPhase = t; break;
            case 'moveLeft':
                offX = (-1 + Math.sin(t)) * sc;
                legPhase = t; break;
            case 'moveRight':
                offX = (1 - Math.sin(t)) * sc;
                legPhase = t; break;
            case 'hit':
                squash = 1.15; stretch = 0.85;
                offY = -2 * sc; armMode = 1; break;
            case 'stun':
                offX = ((frame % 2) * 4 - 2) * sc; break;
            case 'celebrate':
                offY = (-3 - Math.abs(Math.sin(t) * 4)) * sc;
                armMode = 2; break;
        }

        ctx.translate(half + offX, half + offY);
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
        SpriteGenerator.#drawEyes(ctx, sc, p, id, anim);

        /* ==== 8. MOUTH ==== */
        SpriteGenerator.#drawMouth(ctx, sc, p, anim);

        /* ==== Stun sparkles ==== */
        if (anim === 'stun') {
            ctx.fillStyle = p.accent;
            const sOff = frame * 1.2;
            for (let i = 0; i < 3; i++) {
                const a = sOff + i * 2.09;
                const sx = Math.cos(a) * 9 * sc;
                const sy = -15 * sc + Math.sin(a) * 3 * sc;
                PR(ctx, sx - sc * 0.5, sy - sc * 0.5, sc, sc);
            }
        }

        /* ==== Aura glow ==== */
        if (anim === 'hit' || anim === 'celebrate') {
            ctx.globalAlpha = 0.12 + Math.sin(frame * Math.PI) * 0.08;
            ctx.fillStyle = p.accent;
            ctx.beginPath();
            ctx.ellipse(0, -2 * sc, 15 * sc, 15 * sc, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    /* ---- Per-character headgear ---- */
    static #drawHeadgear(ctx, sc, p, id, anim, frame) {
        const PR = SpriteGenerator.#pixelRect;
        const RR = SpriteGenerator.#roundedRect;

        switch (id) {
            case 'blaze': {
                // Flame crown — 3 rising flames
                ctx.fillStyle = p.primary;
                PR(ctx, -6 * sc, -15 * sc, 12 * sc, 3 * sc);
                ctx.fillStyle = p.secondary;
                PR(ctx, -5 * sc, -16 * sc, 3 * sc, 2 * sc);
                PR(ctx, 2 * sc, -16 * sc, 3 * sc, 2 * sc);
                ctx.fillStyle = p.accent;
                PR(ctx, -2 * sc, -17 * sc, 4 * sc, 3 * sc);
                PR(ctx, -1 * sc, -18 * sc, 2 * sc, 1 * sc);
                // Flame tip flicker
                ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.5;
                PR(ctx, 0, -18 * sc, sc, sc);
                ctx.globalAlpha = 1;
                break;
            }
            case 'frost': {
                // Ice crystal tiara
                ctx.fillStyle = p.accent;
                PR(ctx, -6 * sc, -15 * sc, 12 * sc, 2 * sc);
                // 3 crystals
                ctx.fillStyle = '#ffffff';
                PR(ctx, -1 * sc, -17 * sc, 2 * sc, 2 * sc);
                PR(ctx, -4 * sc, -16 * sc, 2 * sc, 1 * sc);
                PR(ctx, 2 * sc, -16 * sc, 2 * sc, 1 * sc);
                // Crystal sparkle
                ctx.fillStyle = p.secondary; ctx.globalAlpha = 0.6;
                PR(ctx, 0, -17 * sc, sc, sc);
                ctx.globalAlpha = 1;
                // Flowing hair wisps
                ctx.fillStyle = p.secondary;
                PR(ctx, -7 * sc, -10 * sc, 2 * sc, 4 * sc);
                PR(ctx, 5 * sc, -10 * sc, 2 * sc, 4 * sc);
                break;
            }
            case 'shadow': {
                // Dark hood / cowl
                ctx.fillStyle = p.primary;
                RR(ctx, -8 * sc, -16 * sc, 16 * sc, 7 * sc, 5 * sc);
                // Hood inner shadow
                ctx.fillStyle = p.outline;
                RR(ctx, -6 * sc, -11 * sc, 12 * sc, 2 * sc, sc);
                // Hood tip
                ctx.fillStyle = p.primary;
                PR(ctx, -1 * sc, -17 * sc, 2 * sc, 1 * sc);
                // Scarf tails (flow during movement)
                ctx.fillStyle = p.accent;
                const scarfOff = anim.startsWith('move') ? Math.sin(frame * Math.PI / 2) * sc : 0;
                PR(ctx, -8 * sc, -6 * sc, 2 * sc, 5 * sc + scarfOff);
                PR(ctx, 6 * sc, -6 * sc, 2 * sc, 5 * sc - scarfOff);
                break;
            }
            case 'tank': {
                // Heavy metal helmet
                ctx.fillStyle = p.primary;
                RR(ctx, -9 * sc, -16 * sc, 18 * sc, 7 * sc, 3 * sc);
                // Central ridge
                ctx.fillStyle = p.accent;
                PR(ctx, -1 * sc, -17 * sc, 2 * sc, 6 * sc);
                // Visor slit
                ctx.fillStyle = p.outline;
                PR(ctx, -6 * sc, -10 * sc, 12 * sc, 1 * sc);
                // Side rivets
                ctx.fillStyle = p.secondary;
                PR(ctx, -7 * sc, -12 * sc, sc, sc);
                PR(ctx, 6 * sc, -12 * sc, sc, sc);
                break;
            }
            case 'spark': {
                // Electric spiky hair
                ctx.fillStyle = p.primary;
                PR(ctx, -5 * sc, -15 * sc, 10 * sc, 2 * sc);
                // Spikes
                ctx.fillStyle = p.accent;
                PR(ctx, -4 * sc, -17 * sc, 2 * sc, 2 * sc);
                PR(ctx, -1 * sc, -19 * sc, 2 * sc, 4 * sc);
                PR(ctx, 2 * sc, -17 * sc, 2 * sc, 2 * sc);
                // Electric tips
                ctx.fillStyle = '#ffffff';
                PR(ctx, 0, -19 * sc, sc, sc);
                PR(ctx, -3 * sc, -17 * sc, sc, sc);
                PR(ctx, 3 * sc, -17 * sc, sc, sc);
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
                PR(ctx, -2 * sc, -17 * sc, 4 * sc, 1 * sc);
                // Toxic drip marks on sides
                ctx.fillStyle = p.accent;
                PR(ctx, -6 * sc, -10 * sc, sc, 3 * sc);
                PR(ctx, 5 * sc, -11 * sc, sc, 2 * sc);
                PR(ctx, -5 * sc, -8 * sc, sc, 2 * sc);
                break;
            }
        }
    }

    /* ---- Per-character eyes ---- */
    static #drawEyes(ctx, sc, p, id, anim) {
        const PR = SpriteGenerator.#pixelRect;

        if (anim === 'stun') {
            // Dizzy X-eyes for all
            ctx.fillStyle = p.outline;
            PR(ctx, -5 * sc, -9 * sc, sc, sc);
            PR(ctx, -3 * sc, -9 * sc, sc, sc);
            PR(ctx, -4 * sc, -8 * sc, sc, sc);
            PR(ctx, 2 * sc, -9 * sc, sc, sc);
            PR(ctx, 4 * sc, -9 * sc, sc, sc);
            PR(ctx, 3 * sc, -8 * sc, sc, sc);
            return;
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
    }

    /* ---- Mouth (shared, per-animation) ---- */
    static #drawMouth(ctx, sc, p, anim) {
        const PR = SpriteGenerator.#pixelRect;
        if (anim === 'celebrate') {
            // Wide grin — white teeth
            ctx.fillStyle = p.outline;
            PR(ctx, -3 * sc, -5 * sc, 6 * sc, 2 * sc);
            ctx.fillStyle = '#ffffff';
            PR(ctx, -2 * sc, -5 * sc, 4 * sc, sc);
        } else if (anim === 'stun') {
            // Open O mouth
            ctx.fillStyle = p.outline;
            PR(ctx, -1 * sc, -5 * sc, 2 * sc, 2 * sc);
            ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.4;
            PR(ctx, 0, -4 * sc, sc, sc);
            ctx.globalAlpha = 1;
        } else if (anim === 'hit') {
            // Gritted teeth
            ctx.fillStyle = p.outline;
            PR(ctx, -2 * sc, -5 * sc, 4 * sc, 2 * sc);
            ctx.fillStyle = '#ffffff';
            PR(ctx, -1 * sc, -5 * sc, sc, sc);
            PR(ctx, 0, -5 * sc, sc, sc);
        } else {
            // Neutral small line
            ctx.fillStyle = p.outline;
            PR(ctx, -1 * sc, -4 * sc, 2 * sc, sc);
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
