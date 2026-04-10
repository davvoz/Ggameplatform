import { BaseSpriteDrawer } from './BaseSpriteDrawer.js';

const SIZE = 56;
const HEAD_RADIUS = 15;
const EYE_SPACING = 5.8;
const EYE_RX = 4.2;
const EYE_RY = 5.0;

const BODY_COLOR = '#00bb99';
const BODY_SHADE = '#007766';
const FOOT_COLOR = '#ff5533';
const EYE_WHITE = '#ffffff';
const PUPIL_DARK = '#001133';
const IRIS_BLUE = '#2255ff';

const FRAME_COUNTS = { idle: 4, jump: 4, fall: 2, hurt: 2, jetpack: 4, land: 3 };
const ANIM_SPEEDS = { idle: 7, jump: 18, fall: 6, hurt: 15, jetpack: 12, land: 24 };
const LAND_SQUASH = [0.38, 0.60, 0.82];

export class PlayerSpriteDrawer extends BaseSpriteDrawer {
    generate() {
        const totalFrames = Object.values(FRAME_COUNTS).reduce((a, b) => a + b, 0);
        const canvas = this.createCanvas(SIZE * totalFrames, SIZE);
        const ctx = canvas.getContext('2d');

        let frameX = 0;
        frameX = this.#generateIdleFrames(ctx, frameX);
        frameX = this.#generateJumpFrames(ctx, frameX);
        frameX = this.#generateFallFrames(ctx, frameX);
        frameX = this.#generateHurtFrames(ctx, frameX);
        frameX = this.#generateJetpackFrames(ctx, frameX);
        this.#generateLandFrames(ctx, frameX);

        return {
            canvas,
            frames: { ...FRAME_COUNTS },
            frameSize: SIZE,
            animations: PlayerSpriteDrawer.#buildAnimations(),
        };
    }

    // ── Frame generation per state ───────────────────────────────

    #generateIdleFrames(ctx, startFrame) {
        for (let i = 0; i < FRAME_COUNTS.idle; i++) {
            const bounce = Math.sin((i / FRAME_COUNTS.idle) * Math.PI * 2) * 2;
            this.#drawFrame(ctx, (startFrame + i) * SIZE, 0, {
                state: 'idle', bounce, stretch: 1, flash: false, frame: i,
            });
        }
        return startFrame + FRAME_COUNTS.idle;
    }

    #generateJumpFrames(ctx, startFrame) {
        for (let i = 0; i < FRAME_COUNTS.jump; i++) {
            const stretch = 1.42 - (i / (FRAME_COUNTS.jump - 1)) * 0.40;
            this.#drawFrame(ctx, (startFrame + i) * SIZE, 0, {
                state: 'jump', bounce: 0, stretch, flash: false, frame: i,
            });
        }
        return startFrame + FRAME_COUNTS.jump;
    }

    #generateFallFrames(ctx, startFrame) {
        for (let i = 0; i < FRAME_COUNTS.fall; i++) {
            const squash = 1 - i * 0.1;
            this.#drawFrame(ctx, (startFrame + i) * SIZE, 0, {
                state: 'fall', bounce: 0, stretch: squash, flash: false, frame: i,
            });
        }
        return startFrame + FRAME_COUNTS.fall;
    }

    #generateHurtFrames(ctx, startFrame) {
        for (let i = 0; i < FRAME_COUNTS.hurt; i++) {
            this.#drawFrame(ctx, (startFrame + i) * SIZE, 0, {
                state: 'hurt', bounce: 0, stretch: 1, flash: i % 2 === 0, frame: i,
            });
        }
        return startFrame + FRAME_COUNTS.hurt;
    }

    #generateJetpackFrames(ctx, startFrame) {
        for (let i = 0; i < FRAME_COUNTS.jetpack; i++) {
            this.#drawFrame(ctx, (startFrame + i) * SIZE, 0, {
                state: 'jetpack', bounce: 0, stretch: 1, flash: false, frame: i,
            });
        }
        return startFrame + FRAME_COUNTS.jetpack;
    }

    #generateLandFrames(ctx, startFrame) {
        for (let i = 0; i < FRAME_COUNTS.land; i++) {
            this.#drawFrame(ctx, (startFrame + i) * SIZE, 0, {
                state: 'land', bounce: 0, stretch: LAND_SQUASH[i], flash: false, frame: i,
            });
        }
    }

    // ── Core frame drawing (decomposed) ──────────────────────────

    #drawFrame(ctx, ox, oy, config) {
        const { state, bounce, stretch, flash, frame } = config;
        const palette = {
            body: flash ? '#ffffff' : BODY_COLOR,
            shade: BODY_SHADE,
            foot: FOOT_COLOR,
        };

        const sq = stretch;
        const bodyH = 14 * sq;
        const bodyW = 14 / Math.sqrt(sq);
        const headCY = -bodyH / 2 - HEAD_RADIUS + 3;
        const bodyBY = bodyH / 2;
        const legSpd = PlayerSpriteDrawer.#calcLegSpread(state, sq);
        const legLen = 8 * sq + 3;
        const geom = { sq, bodyH, bodyW, headCY, bodyBY, legSpd, legLen };

        ctx.save();
        ctx.translate(ox + SIZE / 2, oy + SIZE / 2 + bounce);

        this.#drawFeet(ctx, palette, geom);
        this.#drawLegs(ctx, palette, geom);
        this.#drawTorso(ctx, palette, geom);
        this.#drawArms(ctx, palette, geom, state, frame);
        this.#drawHead(ctx, palette, geom);
        this.#drawExpression(ctx, palette, geom, state, { bounce, frame, flash, stretch });

        ctx.restore();
    }

    // ── Body parts ───────────────────────────────────────────────

    #drawFeet(ctx, palette, geom) {
        ctx.fillStyle = palette.foot;
        [-geom.legSpd, geom.legSpd].forEach(lx => {
            ctx.beginPath();
            ctx.ellipse(lx, geom.bodyBY + geom.legLen + 2, 4.5, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    #drawLegs(ctx, palette, geom) {
        ctx.fillStyle = palette.shade;
        [-geom.legSpd, geom.legSpd].forEach(lx => {
            ctx.beginPath();
            ctx.roundRect(lx - 3, geom.bodyBY, 6, geom.legLen + 1, 3);
            ctx.fill();
        });
    }

    #drawTorso(ctx, palette, geom) {
        ctx.fillStyle = palette.body;
        ctx.beginPath();
        ctx.roundRect(-geom.bodyW / 2, -geom.bodyH / 2, geom.bodyW, geom.bodyH, 5);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.ellipse(0, -geom.bodyH * 0.05, geom.bodyW * 0.3, geom.bodyH * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    #drawArms(ctx, palette, geom, state, frame) {
        const armAngle = PlayerSpriteDrawer.#calcArmAngle(state, frame);
        [-1, 1].forEach(side => {
            ctx.save();
            ctx.translate(side * geom.bodyW / 2, -geom.bodyH * 0.22);
            ctx.rotate(side * armAngle);

            ctx.fillStyle = palette.body;
            ctx.beginPath();
            ctx.ellipse(side * 5, 0, 5.5, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = palette.shade;
            ctx.beginPath();
            ctx.arc(side * 9.2, 0, 2.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }

    #drawHead(ctx, palette, geom) {
        ctx.fillStyle = palette.body;
        ctx.beginPath();
        ctx.arc(0, geom.headCY, HEAD_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.ellipse(
            -HEAD_RADIUS * 0.28, geom.headCY - HEAD_RADIUS * 0.33,
            HEAD_RADIUS * 0.36, HEAD_RADIUS * 0.24,
            -0.4, 0, Math.PI * 2
        );
        ctx.fill();
    }

    // ── Expression dispatch ──────────────────────────────────────

    #drawExpression(ctx, palette, geom, state, extra) {
        const eyeY = geom.headCY - 0.5;
        const ep = { eyeY, eyeSp: EYE_SPACING, eRx: EYE_RX, eRy: EYE_RY };

        if (state === 'hurt') return this.#drawHurtExpression(ctx, ep, extra);
        if (state === 'land' && extra.stretch < 0.75) return this.#drawSqueezedExpression(ctx, ep);
        if (state === 'jump') return this.#drawJumpExpression(ctx, palette, ep);
        if (state === 'fall') return this.#drawFallExpression(ctx, palette, ep);
        if (state === 'jetpack') return this.#drawJetpackExpression(ctx, palette, ep);
        this.#drawIdleExpression(ctx, palette, ep, extra);
    }

    #drawHurtExpression(ctx, ep, extra) {
        ctx.strokeStyle = extra.flash ? '#ff0000' : '#ff3333';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        [-ep.eyeSp, ep.eyeSp].forEach(ex => {
            ctx.beginPath(); ctx.moveTo(ex - 3.5, ep.eyeY - 3.5); ctx.lineTo(ex + 3.5, ep.eyeY + 3.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ex + 3.5, ep.eyeY - 3.5); ctx.lineTo(ex - 3.5, ep.eyeY + 3.5); ctx.stroke();
        });
    }

    #drawSqueezedExpression(ctx, ep) {
        ctx.strokeStyle = PUPIL_DARK;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        [-ep.eyeSp, ep.eyeSp].forEach(ex => {
            ctx.beginPath(); ctx.moveTo(ex - 4, ep.eyeY - 2); ctx.lineTo(ex, ep.eyeY + 2.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ex + 4, ep.eyeY - 2); ctx.lineTo(ex, ep.eyeY + 2.5); ctx.stroke();
        });
    }

    #drawJumpExpression(ctx, palette, ep) {
        const { eyeY, eyeSp, eRx, eRy } = ep;

        [-eyeSp, eyeSp].forEach(ex => {
            ctx.fillStyle = EYE_WHITE;
            ctx.beginPath(); ctx.ellipse(ex, eyeY, eRx * 1.15, eRy * 1.22, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = IRIS_BLUE;
            ctx.beginPath(); ctx.ellipse(ex, eyeY - 0.5, 2.5, 2.9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = PUPIL_DARK;
            ctx.beginPath(); ctx.ellipse(ex, eyeY - 0.5, 1.1, 1.4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = EYE_WHITE;
            ctx.beginPath(); ctx.arc(ex + 1.2, eyeY - 1.8, 0.85, 0, Math.PI * 2); ctx.fill();
        });

        ctx.strokeStyle = palette.shade; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-eyeSp - 4, eyeY - 7); ctx.lineTo(-eyeSp + 3, eyeY - 5.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(eyeSp + 4, eyeY - 7); ctx.lineTo(eyeSp - 3, eyeY - 5.5); ctx.stroke();

        ctx.fillStyle = palette.shade;
        ctx.beginPath(); ctx.ellipse(0, eyeY + 6.5, 3.3, 3.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,50,0.45)';
        ctx.beginPath(); ctx.ellipse(0, eyeY + 7, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    }

    #drawFallExpression(ctx, palette, ep) {
        const { eyeY, eyeSp, eRx, eRy } = ep;

        [-eyeSp, eyeSp].forEach(ex => {
            ctx.fillStyle = EYE_WHITE;
            ctx.beginPath(); ctx.ellipse(ex, eyeY, eRx * 1.28, eRy * 1.38, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff4400';
            ctx.beginPath(); ctx.ellipse(ex, eyeY + 1, 2.7, 2.7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = PUPIL_DARK;
            ctx.beginPath(); ctx.ellipse(ex, eyeY - 1.4, 1.2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = EYE_WHITE;
            ctx.beginPath(); ctx.arc(ex + 1.2, eyeY - 2.2, 0.75, 0, Math.PI * 2); ctx.fill();
        });

        ctx.strokeStyle = palette.shade; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-eyeSp - 4, eyeY - 5); ctx.lineTo(-eyeSp + 4, eyeY - 7.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(eyeSp + 4, eyeY - 5); ctx.lineTo(eyeSp - 4, eyeY - 7.5); ctx.stroke();

        const sdx = eyeSp + HEAD_RADIUS * 0.32;
        const sdy = eyeY - 2;
        ctx.fillStyle = '#88ccff';
        ctx.beginPath(); ctx.arc(sdx, sdy + 5.5, 2.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sdx - 2.3, sdy + 4.5); ctx.lineTo(sdx, sdy); ctx.lineTo(sdx + 2.3, sdy + 4.5);
        ctx.fill();
    }

    #drawJetpackExpression(ctx, palette, ep) {
        const { eyeY, eyeSp, eRx, eRy } = ep;

        [-eyeSp, eyeSp].forEach(ex => {
            ctx.fillStyle = EYE_WHITE;
            ctx.beginPath(); ctx.ellipse(ex, eyeY, eRx, eRy * 0.62, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = IRIS_BLUE;
            ctx.beginPath(); ctx.ellipse(ex, eyeY + 0.5, 2.1, 1.6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = PUPIL_DARK;
            ctx.beginPath(); ctx.ellipse(ex, eyeY + 0.5, 1.0, 0.9, 0, 0, Math.PI * 2); ctx.fill();
        });

        ctx.strokeStyle = palette.shade; ctx.lineWidth = 2.1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-eyeSp - 3.8, eyeY - 6); ctx.lineTo(-eyeSp + 3.8, eyeY - 4.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(eyeSp + 3.8, eyeY - 6); ctx.lineTo(eyeSp - 3.8, eyeY - 4.5); ctx.stroke();

        ctx.strokeStyle = palette.shade; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(2, eyeY + 5.5, 4, 0.4, Math.PI - 0.8); ctx.stroke();
    }

    #drawIdleExpression(ctx, palette, ep, extra) {
        const { eyeY, eyeSp, eRx, eRy } = ep;

        [-eyeSp, eyeSp].forEach(ex => {
            ctx.fillStyle = EYE_WHITE;
            ctx.beginPath(); ctx.ellipse(ex, eyeY, eRx, eRy + extra.bounce * 0.04, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = IRIS_BLUE;
            ctx.beginPath(); ctx.ellipse(ex, eyeY, 2.4, 2.9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = PUPIL_DARK;
            ctx.beginPath(); ctx.ellipse(ex, eyeY, 1.1, 1.3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = EYE_WHITE;
            ctx.beginPath(); ctx.arc(ex + 1.1, eyeY - 1.5, 0.8, 0, Math.PI * 2); ctx.fill();
        });

        ctx.strokeStyle = palette.shade; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-eyeSp - 3, eyeY - 6.5); ctx.lineTo(-eyeSp + 3, eyeY - 5.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(eyeSp + 3, eyeY - 6.5); ctx.lineTo(eyeSp - 3, eyeY - 5.5); ctx.stroke();

        ctx.strokeStyle = palette.shade; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, eyeY + 5.5, 5, 0.2, Math.PI - 0.2); ctx.stroke();

        ctx.fillStyle = 'rgba(255,120,120,0.42)';
        ctx.beginPath(); ctx.ellipse(-eyeSp - 4, eyeY + 3.5, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(eyeSp + 4, eyeY + 3.5, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    }

    // ── Computation helpers ──────────────────────────────────────

    static #calcLegSpread(state, sq) {
        if (state === 'land') return 6 + (1 - sq) * 10;
        if (state === 'jump') return 2;
        return 4;
    }

    static #calcArmAngle(state, frame) {
        if (state === 'jump') return -0.75 - frame * 0.07;
        if (state === 'fall') return 0.55;
        if (state === 'jetpack') return -0.45 - (frame % 2) * 0.2;
        if (state === 'land') return 0.5;
        return 0.1 + Math.sin(frame * 1.3) * 0.2;
    }

    static #buildAnimations() {
        let start = 0;
        const animations = {};
        for (const state of Object.keys(FRAME_COUNTS)) {
            animations[state] = {
                start,
                count: FRAME_COUNTS[state],
                speed: ANIM_SPEEDS[state],
            };
            start += FRAME_COUNTS[state];
        }
        return animations;
    }
}
