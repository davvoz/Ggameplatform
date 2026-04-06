/**
 * SpriteGenerator - Procedural pixel-art sprite generation
 * Creates all game graphics via Canvas 2D - no external assets.
 * Follows Single Responsibility: generates and caches sprite sheets.
 */

import { COLORS, ENEMY_TYPES, COLLECTIBLES, POWERUP_TYPES } from '../config/Constants.js';

export class SpriteGenerator {
    static #cache = new Map();
    static FRAME_SIZE = 64;

    /**
     * Get or generate a sprite sheet
     */
    static get(key) {
        return SpriteGenerator.#cache.get(key);
    }

    /**
     * Generate all game sprites
     */
    static generateAll() {
        SpriteGenerator.#generatePlayer();
        SpriteGenerator.#generatePlatforms();
        SpriteGenerator.#generateEnemies();
        SpriteGenerator.#generateCollectibles();
        SpriteGenerator.#generatePowerUps();
        SpriteGenerator.#generateEffects();
    }

    // ═══════════════════════════════════════════════════════════════
    // PLAYER SPRITES
    // ═══════════════════════════════════════════════════════════════

    static #generatePlayer() {
        const size = 56;
        const frames = {
            idle:    4,
            jump:    4,
            fall:    2,
            hurt:    2,
            jetpack: 4,
            land:    3,   // squash on landing
        };

        const totalFrames = Object.values(frames).reduce((a, b) => a + b, 0);
        const canvas = document.createElement('canvas');
        canvas.width  = size * totalFrames;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        let frameX = 0;

        for (let i = 0; i < frames.idle; i++) {
            const bounce = Math.sin((i / frames.idle) * Math.PI * 2) * 2;
            SpriteGenerator.#drawPlayerFrame(ctx, frameX * size, 0, size, 'idle', bounce, 1, false, 0, i);
            frameX++;
        }
        for (let i = 0; i < frames.jump; i++) {
            // Dramatic launch: very stretched at frame 0, tapering to near-normal at apex
            const stretch = 1.42 - (i / (frames.jump - 1)) * 0.40;
            SpriteGenerator.#drawPlayerFrame(ctx, frameX * size, 0, size, 'jump', 0, stretch, false, 0, i);
            frameX++;
        }
        for (let i = 0; i < frames.fall; i++) {
            const squash = 1 - i * 0.1;
            SpriteGenerator.#drawPlayerFrame(ctx, frameX * size, 0, size, 'fall', 0, squash, false, 0, i);
            frameX++;
        }
        for (let i = 0; i < frames.hurt; i++) {
            SpriteGenerator.#drawPlayerFrame(ctx, frameX * size, 0, size, 'hurt', 0, 1, i % 2 === 0, 0, i);
            frameX++;
        }
        for (let i = 0; i < frames.jetpack; i++) {
            SpriteGenerator.#drawPlayerFrame(ctx, frameX * size, 0, size, 'jetpack', 0, 1, false, i, i);
            frameX++;
        }
        // Land: squash deepest at frame 0, recover through frames 1-2
        const landSquash = [0.38, 0.60, 0.82];
        for (let i = 0; i < frames.land; i++) {
            SpriteGenerator.#drawPlayerFrame(ctx, frameX * size, 0, size, 'land', 0, landSquash[i], false, 0, i);
            frameX++;
        }

        SpriteGenerator.#cache.set('player', {
            canvas,
            frames,
            frameSize: size,
            animations: {
                idle:    { start: 0,                                                                         count: frames.idle,    speed: 7  },
                jump:    { start: frames.idle,                                                               count: frames.jump,    speed: 18 },
                fall:    { start: frames.idle + frames.jump,                                                 count: frames.fall,    speed: 6  },
                hurt:    { start: frames.idle + frames.jump + frames.fall,                                   count: frames.hurt,    speed: 15 },
                jetpack: { start: frames.idle + frames.jump + frames.fall + frames.hurt,                     count: frames.jetpack, speed: 12 },
                land:    { start: frames.idle + frames.jump + frames.fall + frames.hurt + frames.jetpack,    count: frames.land,    speed: 24 },
            }
        });
    }

    static #drawPlayerFrame(ctx, ox, oy, size, state, bounce = 0, stretch = 1, flash = false, jetFrame = 0, frame = 0) {
        const cx = ox + size / 2;
        const cy = oy + size / 2 + bounce;

        // ── Palette (flat, bold, few colors) ──────────────────────────────
        const bodyColor = flash ? '#ffffff' : '#00bb99';
        const bodyShade = flash ? '#007766' : '#007766';
        const footColor = '#ff5533';
        const eyeWhite  = '#ffffff';
        const pupilDark = '#001133';

        ctx.save();
        ctx.translate(cx, cy);

        // ── Proportions (stretch drives squash/stretch) ───────────────────
        const sq    = stretch;
        const bodyH = 14 * sq;
        const bodyW = 14 / Math.sqrt(sq);
        const headR = 15;
        const headCY = -bodyH / 2 - headR + 3;  // head center (overlaps body top)
        const bodyBY =  bodyH / 2;               // bottom of body

        // Leg/foot spread: wide on land-squash, narrow on jump
        const legSpd = state === 'land'   ? 6 + (1 - sq) * 10
                     : state === 'jump'   ? 2
                     : 4;
        const legLen = 8 * sq + 3;   // leg stub shortens when squashed

        // ── FEET ─────────────────────────────────────────────────────────
        ctx.fillStyle = footColor;
        [-legSpd, legSpd].forEach(lx => {
            ctx.beginPath();
            ctx.ellipse(lx, bodyBY + legLen + 2, 4.5, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // ── LEG STUBS ────────────────────────────────────────────────────
        ctx.fillStyle = bodyShade;
        [-legSpd, legSpd].forEach(lx => {
            ctx.beginPath();
            ctx.roundRect(lx - 3, bodyBY, 6, legLen + 1, 3);
            ctx.fill();
        });

        // ── BODY ─────────────────────────────────────────────────────────
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH, 5);
        ctx.fill();
        // Belly highlight
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.ellipse(0, -bodyH * 0.05, bodyW * 0.3, bodyH * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── ARM NUBS ─────────────────────────────────────────────────────
        const armAngle = state === 'jump'    ? -0.75 - frame * 0.07
                       : state === 'fall'    ?  0.55
                       : state === 'jetpack' ? -0.45 - (frame % 2) * 0.2
                       : state === 'land'    ?  0.5
                       :                       0.1 + Math.sin(frame * 1.3) * 0.2;
        [-1, 1].forEach(side => {
            ctx.save();
            ctx.translate(side * bodyW / 2, -bodyH * 0.22);
            ctx.rotate(side * armAngle);
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.ellipse(side * 5, 0, 5.5, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = bodyShade;  // hand nub
            ctx.beginPath();
            ctx.arc(side * 9.2, 0, 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // ── HEAD (big — dominant silhouette) ─────────────────────────────
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(0, headCY, headR, 0, Math.PI * 2);
        ctx.fill();
        // Top-left shine
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.ellipse(-headR * 0.28, headCY - headR * 0.33, headR * 0.36, headR * 0.24, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // ── EYES (the whole personality) ──────────────────────────────────
        const eyeY  = headCY - 0.5;
        const eyeSp = 5.8;
        const eRx   = 4.2;
        const eRy   = 5.0;

        if (state === 'hurt') {
            // ✕ eyes
            ctx.strokeStyle = flash ? '#ff0000' : '#ff3333';
            ctx.lineWidth = 2.4; ctx.lineCap = 'round';
            [-eyeSp, eyeSp].forEach(ex => {
                ctx.beginPath(); ctx.moveTo(ex - 3.5, eyeY - 3.5); ctx.lineTo(ex + 3.5, eyeY + 3.5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(ex + 3.5, eyeY - 3.5); ctx.lineTo(ex - 3.5, eyeY + 3.5); ctx.stroke();
            });

        } else if (state === 'land' && sq < 0.75) {
            // Squeezed >< shut (heavy squash frames)
            ctx.strokeStyle = pupilDark;
            ctx.lineWidth = 2.5; ctx.lineCap = 'round';
            [-eyeSp, eyeSp].forEach(ex => {
                ctx.beginPath(); ctx.moveTo(ex - 4, eyeY - 2); ctx.lineTo(ex,      eyeY + 2.5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(ex + 4, eyeY - 2); ctx.lineTo(ex,      eyeY + 2.5); ctx.stroke();
            });

        } else if (state === 'jump') {
            // Wide excited eyes + raised brows + open O-mouth
            [-eyeSp, eyeSp].forEach(ex => {
                ctx.fillStyle = eyeWhite;
                ctx.beginPath(); ctx.ellipse(ex, eyeY, eRx * 1.15, eRy * 1.22, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#2255ff';
                ctx.beginPath(); ctx.ellipse(ex, eyeY - 0.5, 2.5, 2.9, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = pupilDark;
                ctx.beginPath(); ctx.ellipse(ex, eyeY - 0.5, 1.1, 1.4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = eyeWhite;
                ctx.beginPath(); ctx.arc(ex + 1.2, eyeY - 1.8, 0.85, 0, Math.PI * 2); ctx.fill();
            });
            ctx.strokeStyle = bodyShade; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-eyeSp - 4, eyeY - 7); ctx.lineTo(-eyeSp + 3, eyeY - 5.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( eyeSp + 4, eyeY - 7); ctx.lineTo( eyeSp - 3, eyeY - 5.5); ctx.stroke();
            // O-mouth
            ctx.fillStyle = bodyShade;
            ctx.beginPath(); ctx.ellipse(0, eyeY + 6.5, 3.3, 3.8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,50,0.45)';
            ctx.beginPath(); ctx.ellipse(0, eyeY + 7, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill();

        } else if (state === 'fall') {
            // Big scared eyes, pupils shifted up, sweat drop
            [-eyeSp, eyeSp].forEach(ex => {
                ctx.fillStyle = eyeWhite;
                ctx.beginPath(); ctx.ellipse(ex, eyeY, eRx * 1.28, eRy * 1.38, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ff4400';
                ctx.beginPath(); ctx.ellipse(ex, eyeY + 1, 2.7, 2.7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = pupilDark;
                ctx.beginPath(); ctx.ellipse(ex, eyeY - 1.4, 1.2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = eyeWhite;
                ctx.beginPath(); ctx.arc(ex + 1.2, eyeY - 2.2, 0.75, 0, Math.PI * 2); ctx.fill();
            });
            // Inner-raised scared brows
            ctx.strokeStyle = bodyShade; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-eyeSp - 4, eyeY - 5); ctx.lineTo(-eyeSp + 4, eyeY - 7.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( eyeSp + 4, eyeY - 5); ctx.lineTo( eyeSp - 4, eyeY - 7.5); ctx.stroke();
            // Sweat drop
            const sdx = eyeSp + headR * 0.32, sdy = eyeY - 2;
            ctx.fillStyle = '#88ccff';
            ctx.beginPath(); ctx.arc(sdx, sdy + 5.5, 2.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sdx - 2.3, sdy + 4.5); ctx.lineTo(sdx, sdy); ctx.lineTo(sdx + 2.3, sdy + 4.5); ctx.fill();

        } else if (state === 'jetpack') {
            // Cool half-closed eyes + smirk
            [-eyeSp, eyeSp].forEach(ex => {
                ctx.fillStyle = eyeWhite;
                ctx.beginPath(); ctx.ellipse(ex, eyeY, eRx, eRy * 0.62, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#2255ff';
                ctx.beginPath(); ctx.ellipse(ex, eyeY + 0.5, 2.1, 1.6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = pupilDark;
                ctx.beginPath(); ctx.ellipse(ex, eyeY + 0.5, 1.0, 0.9, 0, 0, Math.PI * 2); ctx.fill();
            });
            ctx.strokeStyle = bodyShade; ctx.lineWidth = 2.1; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-eyeSp - 3.8, eyeY - 6); ctx.lineTo(-eyeSp + 3.8, eyeY - 4.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( eyeSp + 3.8, eyeY - 6); ctx.lineTo( eyeSp - 3.8, eyeY - 4.5); ctx.stroke();
            ctx.strokeStyle = bodyShade; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(2, eyeY + 5.5, 4, 0.4, Math.PI - 0.8); ctx.stroke();

        } else {
            // Idle / soft land: happy eyes + smile + blush
            [-eyeSp, eyeSp].forEach((ex, i) => {
                ctx.fillStyle = eyeWhite;
                ctx.beginPath(); ctx.ellipse(ex, eyeY, eRx, eRy + bounce * 0.04, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#2255ff';
                ctx.beginPath(); ctx.ellipse(ex, eyeY, 2.4, 2.9, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = pupilDark;
                ctx.beginPath(); ctx.ellipse(ex, eyeY, 1.1, 1.3, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = eyeWhite;
                ctx.beginPath(); ctx.arc(ex + 1.1, eyeY - 1.5, 0.8, 0, Math.PI * 2); ctx.fill();
            });
            ctx.strokeStyle = bodyShade; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-eyeSp - 3,  eyeY - 6.5); ctx.lineTo(-eyeSp + 3, eyeY - 5.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( eyeSp + 3,  eyeY - 6.5); ctx.lineTo( eyeSp - 3, eyeY - 5.5); ctx.stroke();
            ctx.strokeStyle = bodyShade; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(0, eyeY + 5.5, 5, 0.2, Math.PI - 0.2); ctx.stroke();
            // Blush dots
            ctx.fillStyle = 'rgba(255,120,120,0.42)';
            ctx.beginPath(); ctx.ellipse(-eyeSp - 4, eyeY + 3.5, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse( eyeSp + 4, eyeY + 3.5, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    // PLATFORM SPRITES
    // ═══════════════════════════════════════════════════════════════

    static #generatePlatforms() {
        const width = 80;
        const height = 16;
        const types = ['normal', 'fragile', 'moving', 'bouncy', 'cloud', 'deadly'];
        const colors = {
            normal: COLORS.PLATFORM_NORMAL,
            fragile: COLORS.PLATFORM_FRAGILE,
            moving: COLORS.PLATFORM_MOVING,
            bouncy: COLORS.PLATFORM_BOUNCY,
            cloud: COLORS.PLATFORM_CLOUD,
            deadly: COLORS.PLATFORM_DEADLY,
        };

        const canvas = document.createElement('canvas');
        canvas.width = width * types.length;
        canvas.height = height * 2; // Normal + cracked version
        const ctx = canvas.getContext('2d');

        types.forEach((type, i) => {
            const ox = i * width;
            SpriteGenerator.#drawPlatform(ctx, ox, 0, width, height, colors[type], type, false);
            SpriteGenerator.#drawPlatform(ctx, ox, height, width, height, colors[type], type, true);
        });

        SpriteGenerator.#cache.set('platforms', {
            canvas,
            width,
            height,
            types,
        });
    }

    static #drawPlatform(ctx, ox, oy, w, h, color, type, cracked) {
        ctx.save();
        
        // Base platform
        const gradient = ctx.createLinearGradient(ox, oy, ox, oy + h);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, SpriteGenerator.#darken(color, 0.3));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(ox + 2, oy + 2, w - 4, h - 4, 4);
        ctx.fill();

        // Top highlight
        ctx.fillStyle = SpriteGenerator.#lighten(color, 0.3);
        ctx.beginPath();
        ctx.roundRect(ox + 4, oy + 2, w - 8, 3, 2);
        ctx.fill();

        // Type-specific details
        if (type === 'bouncy') {
            // Springs
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const sx = ox + 15 + i * 25;
                ctx.beginPath();
                ctx.moveTo(sx, oy + h - 3);
                ctx.bezierCurveTo(sx - 5, oy + h - 8, sx + 5, oy + h - 8, sx, oy + h - 3);
                ctx.stroke();
            }
        }

        if (type === 'deadly') {
            // Hazard stripes across the body
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(ox + 2, oy + 2, w - 4, h - 4, 4);
            ctx.clip();
            ctx.strokeStyle = 'rgba(0,0,0,0.45)';
            ctx.lineWidth = 5;
            for (let s = -h; s < w + h; s += 10) {
                ctx.beginPath();
                ctx.moveTo(ox + s, oy);
                ctx.lineTo(ox + s + h, oy + h);
                ctx.stroke();
            }
            ctx.restore();
            // Red glow border
            ctx.strokeStyle = 'rgba(255,0,60,0.9)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(ox + 2, oy + 2, w - 4, h - 4, 4);
            ctx.stroke();
        }

        if (type === 'cloud') {
            // Cloud puffs
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            const puffs = [[15, 4], [30, 2], [50, 4], [65, 3]];
            puffs.forEach(([px, py]) => {
                ctx.beginPath();
                ctx.arc(ox + px, oy + py, 8, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Cracked overlay
        if (cracked) {
            ctx.strokeStyle = SpriteGenerator.#darken(color, 0.5);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ox + w / 2 - 10, oy + 4);
            ctx.lineTo(ox + w / 2, oy + h / 2);
            ctx.lineTo(ox + w / 2 + 8, oy + h - 4);
            ctx.moveTo(ox + w / 2 - 5, oy + h / 2);
            ctx.lineTo(ox + w / 2 + 12, oy + h / 2 - 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    // ENEMY SPRITES
    // ═══════════════════════════════════════════════════════════════

    static #generateEnemies() {
        const size = 48;
        const enemyTypes = Object.keys(ENEMY_TYPES);
        const framesPerEnemy = 4;

        const canvas = document.createElement('canvas');
        canvas.width = size * framesPerEnemy;
        canvas.height = size * enemyTypes.length;
        const ctx = canvas.getContext('2d');

        enemyTypes.forEach((type, row) => {
            for (let frame = 0; frame < framesPerEnemy; frame++) {
                const ox = frame * size;
                const oy = row * size;
                SpriteGenerator.#drawEnemy(ctx, ox, oy, size, type, frame);
            }
        });

        SpriteGenerator.#cache.set('enemies', {
            canvas,
            frameSize: size,
            framesPerEnemy,
            types: enemyTypes,
        });
    }

    static #drawEnemy(ctx, ox, oy, size, type, frame) {
        const cx = ox + size / 2;
        const cy = oy + size / 2;
        const phase = (frame / 4) * Math.PI * 2;

        ctx.save();
        ctx.translate(cx, cy);

        switch (type.toLowerCase()) {
            case 'floater':
                SpriteGenerator.#drawFloater(ctx, phase);
                break;
            case 'chaser':
                SpriteGenerator.#drawChaser(ctx, phase);
                break;
            case 'shooter':
                SpriteGenerator.#drawShooter(ctx, phase);
                break;
            case 'bat':
                SpriteGenerator.#drawBat(ctx, phase);
                break;
            case 'ghost':
                SpriteGenerator.#drawGhost(ctx, phase);
                break;
            default:
                SpriteGenerator.#drawFloater(ctx, phase);
        }

        ctx.restore();
    }

    static #drawFloater(ctx, phase) {
        // phase 0→2π over 4 frames: tentacles sweep fully out (0) → in (π) → out (2π)
        const extend = Math.sin(phase);           // -1..+1  (0=mid, 1=max out, -1=max in)
        const tLen   = 10 + extend * 7;           // tentacle length 3..17 px
        const tCurl  = extend * 0.5;             // curl angle at tip

        // ── Tentacles (drawn first so body covers the roots) ────────
        // Each tentacle has a fixed base length so they look varied
        const tentDefs = [
            { baseLen: 16, curl: 0.35 },   // long
            { baseLen:  9, curl: 0.20 },   // short
            { baseLen: 13, curl: 0.45 },   // medium
            { baseLen:  7, curl: 0.15 },   // very short
            { baseLen: 18, curl: 0.30 },   // extra long
            { baseLen: 11, curl: 0.40 },   // medium-short
        ];
        ctx.lineCap = 'round';
        for (let i = 0; i < tentDefs.length; i++) {
            const { baseLen, curl } = tentDefs[i];
            const a   = (i / tentDefs.length) * Math.PI * 2;
            const alt = (i % 2 === 0) ? extend : -extend;
            const len = baseLen + alt * (baseLen * 0.45);
            const rootX = Math.cos(a) * 10;
            const rootY = Math.sin(a) * 10;
            const tipX  = Math.cos(a + alt * curl) * (10 + len);
            const tipY  = Math.sin(a + alt * curl) * (10 + len);
            const cpX   = Math.cos(a + curl * 0.6) * (10 + len * 0.5);
            const cpY   = Math.sin(a + curl * 0.6) * (10 + len * 0.5);

            ctx.strokeStyle = COLORS.ENEMY_PRIMARY;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(rootX, rootY);
            ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
            ctx.stroke();

            // tip barb
            ctx.fillStyle = COLORS.ENEMY_PRIMARY;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Outer glow ──────────────────────────────────────────────
        const pulse = 1 + extend * 0.06;
        ctx.fillStyle = 'rgba(255,0,60,0.15)';
        ctx.beginPath();
        ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // ── Body gradient ───────────────────────────────────────────
        const grad = ctx.createRadialGradient(0, -3, 2, 0, 0, 12);
        grad.addColorStop(0, COLORS.ENEMY_SECONDARY);
        grad.addColorStop(1, COLORS.ENEMY_PRIMARY);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        // ── Inner dark core ─────────────────────────────────────────
        ctx.fillStyle = '#1a0010';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // ── Eyes with sclera + iris + pupil ─────────────────────────
        ctx.fillStyle = '#ffdddd';
        ctx.beginPath();
        ctx.ellipse(-3.5, -1, 3, 4, -0.2, 0, Math.PI * 2);
        ctx.ellipse(3.5, -1, 3, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-3.5, -0.5, 1.8, 0, Math.PI * 2);
        ctx.arc(3.5, -0.5, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(-3.5, -0.5, 0.7, 1.8, 0, 0, Math.PI * 2);
        ctx.ellipse(3.5, -0.5, 0.7, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── Angry V-brows ────────────────────────────────────────────
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-7, -5.5);
        ctx.lineTo(-1, -4);
        ctx.moveTo(7, -5.5);
        ctx.lineTo(1, -4);
        ctx.stroke();

        // ── Jagged mouth ────────────────────────────────────────────
        ctx.strokeStyle = '#ff0040';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4.5, 4.5);
        ctx.lineTo(-2.5, 7.5);
        ctx.lineTo(-0.5, 4.5);
        ctx.lineTo(1.5, 7.5);
        ctx.lineTo(3.5, 4.5);
        ctx.lineTo(5, 7.5);
        ctx.stroke();
    }

    static #drawChaser(ctx, phase) {
        const pulse = 1 + Math.sin(phase * 2) * 0.08;
        const s = pulse;

        // Motion trail — fading triangles behind
        ctx.fillStyle = 'rgba(255,80,0,0.12)';
        ctx.beginPath();
        ctx.moveTo(0, -10 * s);
        ctx.lineTo(-16 * s, 14 * s);
        ctx.lineTo(16 * s, 14 * s);
        ctx.closePath();
        ctx.fill();

        // Main body — armoured triangular shape
        const grad = ctx.createLinearGradient(0, -14 * s, 0, 14 * s);
        grad.addColorStop(0, '#ff6600');
        grad.addColorStop(1, '#991100');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -13 * s);
        ctx.lineTo(-11 * s, 5 * s);
        ctx.lineTo(-6 * s, 13 * s);
        ctx.lineTo(6 * s, 13 * s);
        ctx.lineTo(11 * s, 5 * s);
        ctx.closePath();
        ctx.fill();

        // Armour ridge
        ctx.strokeStyle = '#ff9944';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -13 * s);
        ctx.lineTo(0, 7 * s);
        ctx.stroke();

        // Side fins
        ctx.fillStyle = '#cc3300';
        ctx.beginPath();
        ctx.moveTo(-11 * s, 5 * s);
        ctx.lineTo(-18 * s, 0);
        ctx.lineTo(-8 * s, -2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(11 * s, 5 * s);
        ctx.lineTo(18 * s, 0);
        ctx.lineTo(8 * s, -2 * s);
        ctx.closePath();
        ctx.fill();

        // Single large cyclopean eye
        ctx.fillStyle = '#ffeecc';
        ctx.beginPath();
        ctx.ellipse(0, 1 * s, 5.5, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.ellipse(0, 1 * s, 3.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Vertical slit pupil
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(0, 1 * s, 1, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye reflection
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.ellipse(-1.5, -0.5 * s, 1, 1.5, -0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    static #drawShooter(ctx, phase) {
        const cannonAngle = Math.sin(phase) * 0.35;
        const charge = (Math.sin(phase * 2) + 1) / 2; // 0..1 charge cycle

        // Body shell — hexagonal armour plate
        const grad = ctx.createLinearGradient(0, -16, 0, 16);
        grad.addColorStop(0, '#aa55ff');
        grad.addColorStop(1, '#440088');
        ctx.fillStyle = grad;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const r = 15;
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                    : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();

        // Hex border
        ctx.strokeStyle = '#cc88ff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner panel
        ctx.fillStyle = '#22003a';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const r = 9;
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                    : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();

        // Targeting eye — pulses with charge
        const eyeR = 3.5 + charge * 2;
        ctx.fillStyle = `rgba(255,0,200,${0.3 + charge * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, -1, eyeR + 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff00cc';
        ctx.beginPath();
        ctx.arc(0, -1, eyeR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1, -2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Cannon barrel
        ctx.save();
        ctx.rotate(cannonAngle);

        // Barrel base
        ctx.fillStyle = '#6600aa';
        ctx.beginPath();
        ctx.roundRect(-5, 11, 10, 6, 2);
        ctx.fill();

        // Barrel tube
        ctx.fillStyle = '#330055';
        ctx.beginPath();
        ctx.roundRect(-3.5, 14, 7, 10, 2);
        ctx.fill();

        // Charge glow at muzzle
        ctx.fillStyle = `rgba(255,0,200,${charge * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, 24, 4 * charge, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Side vents
        ctx.strokeStyle = '#9933ff';
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i += 2) {
            ctx.beginPath();
            ctx.moveTo(i * 10,  3);
            ctx.lineTo(i * 14,  3);
            ctx.moveTo(i * 10,  7);
            ctx.lineTo(i * 13,  7);
            ctx.stroke();
        }
    }

    static #drawBat(ctx, phase) {
        // phase cycles 0 → 2π across the 4 frames.
        // wingY: +1 = fully raised, -1 = fully lowered — gives dramatic flap.
        const flap    = Math.sin(phase);          // -1 … +1
        const wingTipY = flap * 14;              // tip sweeps ±14 px
        const midY    = flap * 7;                // mid-wing follows

        // ── Left wing membrane ───────────────────────────────────────
        ctx.fillStyle = '#3a1a6e';
        ctx.beginPath();
        ctx.moveTo(-4, 2);                       // shoulder (body edge)
        ctx.quadraticCurveTo(-10, midY - 4, -20, wingTipY);   // outer edge
        ctx.quadraticCurveTo(-13, wingTipY + 8, -4, 10);      // trailing edge
        ctx.closePath();
        ctx.fill();

        // Wing bone outline
        ctx.strokeStyle = '#6633bb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-4, 2);
        ctx.quadraticCurveTo(-10, midY - 4, -20, wingTipY);
        ctx.stroke();

        // ── Right wing membrane ──────────────────────────────────────
        ctx.fillStyle = '#3a1a6e';
        ctx.beginPath();
        ctx.moveTo(4, 2);
        ctx.quadraticCurveTo(10, midY - 4, 20, wingTipY);
        ctx.quadraticCurveTo(13, wingTipY + 8, 4, 10);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#6633bb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(4, 2);
        ctx.quadraticCurveTo(10, midY - 4, 20, wingTipY);
        ctx.stroke();

        // ── Body ─────────────────────────────────────────────────────
        ctx.fillStyle = '#1a0a2e';
        ctx.beginPath();
        ctx.ellipse(0, 2, 7, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#5522aa';
        ctx.lineWidth = 1;
        ctx.stroke();

        // ── Ears ─────────────────────────────────────────────────────
        ctx.fillStyle = '#1a0a2e';
        // Left ear
        ctx.beginPath();
        ctx.moveTo(-5, -8);
        ctx.lineTo(-9, -20);
        ctx.lineTo(-1, -10);
        ctx.closePath();
        ctx.fill();
        // Right ear
        ctx.beginPath();
        ctx.moveTo(5, -8);
        ctx.lineTo(9, -20);
        ctx.lineTo(1, -10);
        ctx.closePath();
        ctx.fill();

        // Inner ear pink
        ctx.fillStyle = '#cc44aa';
        ctx.beginPath();
        ctx.moveTo(-5, -10);
        ctx.lineTo(-8, -18);
        ctx.lineTo(-2, -11);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, -10);
        ctx.lineTo(8, -18);
        ctx.lineTo(2, -11);
        ctx.closePath();
        ctx.fill();

        // ── Glowing red eyes ─────────────────────────────────────────
        // glow halo
        ctx.fillStyle = 'rgba(255,0,0,0.25)';
        ctx.beginPath();
        ctx.arc(-4, -2, 6, 0, Math.PI * 2);
        ctx.arc(4, -2, 6, 0, Math.PI * 2);
        ctx.fill();
        // white sclera
        ctx.fillStyle = '#ffcccc';
        ctx.beginPath();
        ctx.arc(-4, -2, 3.5, 0, Math.PI * 2);
        ctx.arc(4, -2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        // red iris
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-4, -2, 2, 0, Math.PI * 2);
        ctx.arc(4, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        // pupil slit
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(-4, -2, 0.7, 2, 0, 0, Math.PI * 2);
        ctx.ellipse(4, -2, 0.7, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── Fangs ────────────────────────────────────────────────────
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-4, 7);
        ctx.lineTo(-2.5, 13);
        ctx.lineTo(-1, 7);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(1, 7);
        ctx.lineTo(2.5, 13);
        ctx.lineTo(4, 7);
        ctx.closePath();
        ctx.fill();
    }

    static #drawGhost(ctx, phase) {
        const bob   = Math.sin(phase) * 5;
        const alpha = 0.55 + Math.sin(phase * 2) * 0.2;
        const wail  = Math.abs(Math.sin(phase));  // 0..1 mouth open

        ctx.globalAlpha = alpha;

        // Outer ethereal glow
        const glow = ctx.createRadialGradient(0, bob - 4, 2, 0, bob - 4, 22);
        glow.addColorStop(0, 'rgba(100,160,255,0.35)');
        glow.addColorStop(1, 'rgba(0,0,80,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, bob - 4, 22, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        const bodyGrad = ctx.createLinearGradient(0, bob - 16, 0, bob + 14);
        bodyGrad.addColorStop(0, '#cce0ff');
        bodyGrad.addColorStop(0.5, '#88aaee');
        bodyGrad.addColorStop(1, '#3355aa');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, bob - 4, 14, Math.PI, 0);     // dome
        ctx.lineTo(14, bob + 10);
        // Ragged bottom with 6 wavy points
        const pts = [14, 7, 0, -7, -14];
        for (let i = 0; i < pts.length; i++) {
            const wx = pts[i];
            const wy = bob + 10 + (i % 2 === 0 ? 7 : 0);
            ctx.lineTo(wx, wy);
        }
        ctx.closePath();
        ctx.fill();

        // Inner shimmer highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.ellipse(-3, bob - 10, 5, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Hollow dark eyes — elongated teardrops
        ctx.fillStyle = '#000033';
        ctx.beginPath();
        ctx.ellipse(-5, bob - 5, 3.5, 5.5, 0, 0, Math.PI * 2);
        ctx.ellipse(5, bob - 5, 3.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Icy blue iris glow
        ctx.fillStyle = `rgba(80,180,255,${0.6 + alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(-5, bob - 5, 2, 0, Math.PI * 2);
        ctx.arc(5, bob - 5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Wailing mouth — opens and closes with phase
        const mouthW = 8;
        const mouthH = 2 + wail * 6;
        ctx.fillStyle = '#000033';
        ctx.beginPath();
        ctx.ellipse(0, bob + 4, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();

        // Teeth inside mouth
        if (wail > 0.3) {
            ctx.fillStyle = 'rgba(200,230,255,0.9)';
            for (let t = -2; t <= 2; t++) {
                ctx.beginPath();
                ctx.moveTo(t * 2.5, bob + 4 - mouthH + 1);
                ctx.lineTo(t * 2.5 - 1.2, bob + 4 - mouthH + 4);
                ctx.lineTo(t * 2.5 + 1.2, bob + 4 - mouthH + 4);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;
    }

    // ═══════════════════════════════════════════════════════════════
    // COLLECTIBLES
    // ═══════════════════════════════════════════════════════════════

    static #generateCollectibles() {
        const size = 32;
        const types = ['coin', 'gem', 'diamond', 'star'];
        const frames = 6;

        const canvas = document.createElement('canvas');
        canvas.width = size * frames;
        canvas.height = size * types.length;
        const ctx = canvas.getContext('2d');

        types.forEach((type, row) => {
            for (let frame = 0; frame < frames; frame++) {
                const ox = frame * size;
                const oy = row * size;
                SpriteGenerator.#drawCollectible(ctx, ox, oy, size, type, frame / frames);
            }
        });

        SpriteGenerator.#cache.set('collectibles', {
            canvas,
            frameSize: size,
            frames,
            types,
        });
    }

    static #drawCollectible(ctx, ox, oy, size, type, t) {
        const cx = ox + size / 2;
        const cy = oy + size / 2;
        const phase = t * Math.PI * 2;
        const scaleX = Math.cos(phase) * 0.3 + 0.7;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scaleX, 1);

        switch (type) {
            case 'coin':
                // Gold coin
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffaa00';
                ctx.beginPath();
                ctx.arc(0, 0, 7, 0, Math.PI * 2);
                ctx.fill();

                // $ symbol
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', 0, 1);
                break;

            case 'gem':
                // Cyan gem
                ctx.fillStyle = COLORS.GEM_CYAN;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(8, -2);
                ctx.lineTo(5, 10);
                ctx.lineTo(-5, 10);
                ctx.lineTo(-8, -2);
                ctx.closePath();
                ctx.fill();

                // Shine
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.moveTo(0, -8);
                ctx.lineTo(4, -2);
                ctx.lineTo(0, 0);
                ctx.lineTo(-4, -2);
                ctx.closePath();
                ctx.fill();
                break;

            case 'diamond':
                // Purple diamond
                ctx.fillStyle = COLORS.GEM_PURPLE;
                ctx.beginPath();
                ctx.moveTo(0, -12);
                ctx.lineTo(10, -4);
                ctx.lineTo(6, 12);
                ctx.lineTo(-6, 12);
                ctx.lineTo(-10, -4);
                ctx.closePath();
                ctx.fill();

                // Facets
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, -12);
                ctx.lineTo(0, 0);
                ctx.lineTo(6, 12);
                ctx.moveTo(0, 0);
                ctx.lineTo(-6, 12);
                ctx.stroke();
                break;

            case 'star':
                // Golden star
                const glow = 0.7 + Math.sin(phase * 2) * 0.3;
                ctx.fillStyle = COLORS.NEON_YELLOW;
                ctx.globalAlpha = glow;
                
                ctx.beginPath();
                for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? 12 : 5;
                    const angle = (i * Math.PI / 5) - Math.PI / 2;
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                
                ctx.globalAlpha = 1;
                break;
        }

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    // POWER-UPS
    // ═══════════════════════════════════════════════════════════════

    static #generatePowerUps() {
        const size = 40;
        const types = Object.keys(POWERUP_TYPES);
        const frames = 4;

        const canvas = document.createElement('canvas');
        canvas.width = size * frames;
        canvas.height = size * types.length;
        const ctx = canvas.getContext('2d');

        types.forEach((type, row) => {
            const powerUp = POWERUP_TYPES[type];
            for (let frame = 0; frame < frames; frame++) {
                SpriteGenerator.#drawPowerUp(ctx, frame * size, row * size, size, powerUp, frame / frames);
            }
        });

        SpriteGenerator.#cache.set('powerups', {
            canvas,
            frameSize: size,
            frames,
            types,
        });
    }

    static #drawPowerUp(ctx, ox, oy, size, powerUp, t) {
        const cx = ox + size / 2;
        const cy = oy + size / 2;
        const pulse = 1 + Math.sin(t * Math.PI * 2) * 0.1;
        const glow = 0.3 + Math.sin(t * Math.PI * 4) * 0.2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);

        // Outer glow
        ctx.fillStyle = powerUp.color;
        ctx.globalAlpha = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Box background
        ctx.fillStyle = powerUp.color;
        ctx.beginPath();
        ctx.roundRect(-14, -14, 28, 28, 6);
        ctx.fill();

        // Inner darker area
        ctx.fillStyle = SpriteGenerator.#darken(powerUp.color, 0.3);
        ctx.beginPath();
        ctx.roundRect(-10, -10, 20, 20, 4);
        ctx.fill();

        // Icon (simplified)
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerUp.icon, 0, 1);

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    // EFFECTS
    // ═══════════════════════════════════════════════════════════════

    static #generateEffects() {
        // Shield effect
        const shieldSize = 64;
        const shieldFrames = 8;
        const shieldCanvas = document.createElement('canvas');
        shieldCanvas.width = shieldSize * shieldFrames;
        shieldCanvas.height = shieldSize;
        const shieldCtx = shieldCanvas.getContext('2d');

        for (let i = 0; i < shieldFrames; i++) {
            const ox = i * shieldSize;
            const phase = (i / shieldFrames) * Math.PI * 2;
            SpriteGenerator.#drawShieldFrame(shieldCtx, ox, 0, shieldSize, phase);
        }

        SpriteGenerator.#cache.set('shield', {
            canvas: shieldCanvas,
            frameSize: shieldSize,
            frames: shieldFrames,
        });
    }

    static #drawShieldFrame(ctx, ox, oy, size, phase) {
        const cx = ox + size / 2;
        const cy = oy + size / 2;
        const radius = size / 2 - 4;

        ctx.save();
        ctx.translate(cx, cy);

        // Rotating hexagonal shield
        ctx.rotate(phase / 2);
        
        const alpha = 0.3 + Math.sin(phase * 2) * 0.2;
        ctx.fillStyle = `rgba(0, 255, 238, ${alpha})`;
        ctx.strokeStyle = COLORS.NEON_CYAN;
        ctx.lineWidth = 2;

        // Hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    static #lighten(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 255 * amount);
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 255 * amount);
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 255 * amount);
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    static #darken(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount));
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }
}
