/**
 * DeathCinematic — explosion rings, debris, cracks, embers, glitch "GAME OVER".
 *
 * Not skippable. Duration: 6.5 s.
 */
import CinematicScene from './CinematicScene.js';
import { getLevelData } from '../../LevelData.js';
import { title, ui } from '../../FontConfig.js';

export default class DeathCinematic extends CinematicScene {

    setup({ deathX, deathY } = {}) {
        const g = this.game;
        const w = g.logicalWidth;
        const h = g.logicalHeight;

        this.duration = 6.5;
        this.deathX = deathX ?? w / 2;
        this.deathY = deathY ?? h / 2;

        /* explosion rings */
        this.rings = [];
        for (let i = 0; i < 5; i++) {
            this.rings.push({
                x: this.deathX, y: this.deathY,
                radius: 0,
                maxRadius: 180 + i * 100,
                speed: 200 + i * 60,
                alpha: 0.7,
                delay: i * 0.15,
                hue: [0, 20, 350, 30, 10][i]
            });
        }

        /* debris */
        this.debris = [];
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 300 + 80;
            this.debris.push({
                x: this.deathX, y: this.deathY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 12,
                size: Math.random() * 6 + 2,
                life: 1,
                maxLife: Math.random() * 2.0 + 1.0,
                hue: Math.floor(Math.random() * 40)
            });
        }

        /* cracks */
        this.cracks = [];
        const crackCount = 12;
        for (let i = 0; i < crackCount; i++) {
            const baseAngle = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
            const segments = [];
            let ccx = this.deathX, ccy = this.deathY;
            const segCount = Math.floor(Math.random() * 4) + 3;
            for (let s = 0; s < segCount; s++) {
                const segLen   = Math.random() * 50 + 30;
                const deviation = (Math.random() - 0.5) * 0.6;
                const nx = ccx + Math.cos(baseAngle + deviation) * segLen;
                const ny = ccy + Math.sin(baseAngle + deviation) * segLen;
                segments.push({ x: nx, y: ny });
                ccx = nx; ccy = ny;
            }
            this.cracks.push({ segments, revealSpeed: Math.random() * 2 + 2.5 });
        }

        this.glitchChars = '█▓▒░╠╣╚╗┃━▀▄《》';

        /* embers */
        this.embers = [];
        for (let i = 0; i < 30; i++) {
            this.embers.push({
                x: Math.random() * w,
                y: h + Math.random() * 40,
                vx: (Math.random() - 0.5) * 30,
                vy: -(Math.random() * 80 + 40),
                size: Math.random() * 3 + 1,
                life: Math.random() * 2 + 1,
                hue: Math.floor(Math.random() * 30 + 10),
                flicker: Math.random() * Math.PI * 2
            });
        }

        this.cameraPulse = 0;
    }

    /* ── update ──────────────────────────────────────── */
    onUpdate(dt) {
        const g = this.game;
        const w = g.logicalWidth;
        const h = g.logicalHeight;
        const t = this.timer;

        /* rings */
        for (const ring of this.rings) {
            if (t < ring.delay) continue;
            ring.radius += ring.speed * dt;
            ring.alpha = Math.max(0, 0.7 * (1 - ring.radius / ring.maxRadius));
        }

        /* debris */
        for (const d of this.debris) {
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vy += 60 * dt;
            d.rot += d.rotSpeed * dt;
            d.life -= dt / d.maxLife;
        }
        this.debris = this.debris.filter(d => d.life > 0);

        /* embers */
        for (const e of this.embers) {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.flicker += dt * 8;
            e.life -= dt * 0.5;
        }
        this.embers = this.embers.filter(e => e.life > 0);

        if (t > 0.8 && t < 5.0 && Math.random() < 0.35) {
            this.embers.push({
                x: Math.random() * w,
                y: h + 10,
                vx: (Math.random() - 0.5) * 40,
                vy: -(Math.random() * 60 + 30),
                size: Math.random() * 2.5 + 0.5,
                life: Math.random() * 1.5 + 0.5,
                hue: Math.floor(Math.random() * 30 + 10),
                flicker: Math.random() * Math.PI * 2
            });
        }

        /* camera pulse */
        if (t < 0.5) {
            this.cameraPulse = Math.sin(t * 30) * Math.max(0, 1 - t / 0.5) * 3;
        }

        /* shake */
        if (t > 1.8 && t < 2.1) {
            g.postProcessing.shake(4, 0.15);
        }
    }

    /* ── render ──────────────────────────────────────── */
    onRender(ctx, w, h) {
        const g   = this.game;
        const t   = this.timer;
        const dur = this.duration;
        const dx  = this.deathX;
        const dy  = this.deathY;

        /* dark radial overlay */
        const darkProgress = Math.min(1, t / 2.0);
        const darkAlpha    = darkProgress * 0.65;
        if (darkAlpha > 0.01) {
            const grad = ctx.createRadialGradient(dx, dy, 10, dx, dy, w * 0.9);
            grad.addColorStop(0,   `rgba(40,0,0,${(darkAlpha * 0.3).toFixed(3)})`);
            grad.addColorStop(0.5, `rgba(20,0,0,${(darkAlpha * 0.6).toFixed(3)})`);
            grad.addColorStop(1,   `rgba(0,0,0,${darkAlpha.toFixed(3)})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        /* explosion rings */
        ctx.save();
        for (const ring of this.rings) {
            if (ring.alpha <= 0.01 || ring.radius <= 0) continue;
            ctx.strokeStyle = `hsla(${ring.hue},100%,50%,${(ring.alpha * 0.4).toFixed(3)})`;
            ctx.lineWidth   = 8;
            ctx.shadowColor = `hsla(${ring.hue},100%,60%,0.6)`;
            ctx.shadowBlur  = 20;
            ctx.beginPath(); ctx.arc(dx, dy, ring.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = `hsla(${ring.hue},90%,65%,${ring.alpha.toFixed(3)})`;
            ctx.lineWidth   = 3;
            ctx.shadowBlur  = 15;
            ctx.beginPath(); ctx.arc(dx, dy, ring.radius, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();

        /* debris pieces */
        ctx.save();
        for (const d of this.debris) {
            ctx.globalAlpha = Math.max(0, d.life);
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rot);
            ctx.fillStyle   = `hsl(${d.hue},90%,55%)`;
            ctx.shadowColor = `hsl(${d.hue},100%,70%)`;
            ctx.shadowBlur  = 6;
            ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size * 0.6);
            ctx.restore();
        }
        ctx.restore();

        /* cracks */
        if (t > 0.2 && t < 5.2) {
            const crackAlpha = t < 1.0 ? (t - 0.2) / 0.8
                             : t > 4.5 ? Math.max(0, (5.2 - t) / 0.7)
                             : 1;
            ctx.save();
            ctx.strokeStyle = `rgba(255,80,40,${(crackAlpha * 0.7).toFixed(3)})`;
            ctx.lineWidth   = 2;
            ctx.shadowColor = 'rgba(255,60,20,0.8)';
            ctx.shadowBlur  = 8;

            for (const crack of this.cracks) {
                const revealedSegs = Math.min(
                    crack.segments.length,
                    Math.floor((t - 0.2) * crack.revealSpeed)
                );
                if (revealedSegs <= 0) continue;
                ctx.beginPath();
                ctx.moveTo(dx, dy);
                for (let i = 0; i < revealedSegs; i++) {
                    ctx.lineTo(crack.segments[i].x, crack.segments[i].y);
                }
                ctx.stroke();
                if (revealedSegs > 0 && t < 3.5) {
                    const tip = crack.segments[revealedSegs - 1];
                    ctx.fillStyle = `rgba(255,200,100,${(crackAlpha * 0.8).toFixed(3)})`;
                    ctx.beginPath(); ctx.arc(tip.x, tip.y, 2.5, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
        }

        /* embers */
        ctx.save();
        for (const e of this.embers) {
            const flick = 0.5 + 0.5 * Math.sin(e.flicker);
            ctx.globalAlpha = Math.min(e.life, 1) * flick;
            ctx.fillStyle   = `hsl(${e.hue},100%,60%)`;
            ctx.shadowColor = `hsl(${e.hue},100%,80%)`;
            ctx.shadowBlur  = 8;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        /* static / noise */
        if (t > 0.3 && t < 5.8) {
            const staticAlpha = Math.min(0.12, (t - 0.3) * 0.06) *
                                (t > 5.0 ? Math.max(0, (5.8 - t) / 0.8) : 1);
            ctx.save();
            ctx.globalAlpha = staticAlpha;
            for (let y = 0; y < h; y += 3) {
                if (Math.random() < 0.35) {
                    const br = Math.floor(Math.random() * 80 + 20);
                    ctx.fillStyle = `rgb(${br},${Math.floor(br * 0.3)},${Math.floor(br * 0.3)})`;
                    ctx.fillRect(0, y, w, 1);
                }
            }
            if (Math.random() < 0.15) {
                const bandY = Math.random() * h;
                const bandH = Math.random() * 8 + 2;
                ctx.globalAlpha = staticAlpha * 2;
                ctx.fillStyle = 'rgba(255,30,30,0.15)';
                ctx.fillRect(0, bandY, w, bandH);
            }
            ctx.restore();
        }

        /* "GAME OVER" glitch text */
        if (t > 1.8) {
            const textBaseStr = 'GAME OVER';
            const textAppear  = Math.min(1, (t - 1.8) / 0.5);
            const textFade    = t > 5.0 ? Math.max(0, 1 - (t - 5.0) / (dur - 5.0)) : 1;
            const eased       = 1 - Math.pow(1 - textAppear, 4);

            ctx.save();
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';

            const titleY    = h * 0.42;
            const fontSize  = Math.min(52, w * 0.12);
            const glitchInt = Math.max(0, 1 - (t - 1.8) / 1.0);

            let displayText = '';
            for (let i = 0; i < textBaseStr.length; i++) {
                if (glitchInt > 0 && Math.random() < glitchInt * 0.7) {
                    displayText += this.glitchChars[
                        Math.floor(Math.random() * this.glitchChars.length)
                    ];
                } else {
                    displayText += textBaseStr[i];
                }
            }

            const glitchOX = glitchInt > 0.1 ? (Math.random() - 0.5) * 12 * glitchInt : 0;
            const glitchOY = glitchInt > 0.2 ? (Math.random() - 0.5) * 6  * glitchInt : 0;
            const slamScale = t < 2.1 ? 1.3 + (1 - eased) * 0.8 : 1.0;

            ctx.translate(w / 2 + glitchOX, titleY + glitchOY);
            ctx.scale(slamScale, slamScale);
            ctx.translate(-w / 2, -titleY);

            ctx.font = title(fontSize);

            /* chromatic aberration */
            if (glitchInt > 0.05) {
                const caOff = glitchInt * 4;
                ctx.globalAlpha = eased * textFade * 0.3;
                ctx.fillStyle   = '#ff0000';
                ctx.fillText(displayText, w / 2 - caOff, titleY);
                ctx.fillStyle   = '#0066ff';
                ctx.fillText(displayText, w / 2 + caOff, titleY);
            }

            ctx.globalAlpha = eased * textFade;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth   = 5;
            ctx.strokeText(displayText, w / 2, titleY);

            ctx.shadowColor = 'rgba(255,30,0,0.9)';
            ctx.shadowBlur  = 30 * textFade;
            ctx.fillStyle   = '#ff3333';
            ctx.fillText(displayText, w / 2, titleY);

            ctx.shadowBlur  = 0;
            ctx.globalAlpha = eased * textFade * 0.3;
            ctx.fillStyle   = '#ffffff';
            ctx.fillText(displayText, w / 2, titleY);

            /* underline */
            if (eased > 0.5 && t < 5.2) {
                const lineW     = w * 0.35 * Math.min(1, (eased - 0.5) * 2);
                const lineAlpha = textFade * (eased - 0.5) * 2;
                ctx.globalAlpha = Math.min(1, lineAlpha) * 0.6;
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth   = 2;
                ctx.shadowColor = 'rgba(255,60,30,0.8)';
                ctx.shadowBlur  = 10;
                ctx.beginPath();
                ctx.moveTo(w / 2 - lineW / 2, titleY + fontSize * 0.55);
                ctx.lineTo(w / 2 + lineW / 2, titleY + fontSize * 0.55);
                ctx.stroke();
            }
            ctx.restore();

            /* level + score sub-text */
            if (t > 2.6 && t < 5.2) {
                const subProg = Math.min(1, (t - 2.6) / 0.5);
                const subFade = t > 4.6 ? Math.max(0, (5.2 - t) / 0.6) : 1;
                const subEased = 1 - Math.pow(1 - subProg, 3);

                ctx.save();
                ctx.textAlign    = 'center';
                ctx.textBaseline = 'middle';

                const subY  = h * 0.54;
                const subFS = Math.min(16, w * 0.038);
                ctx.font        = ui(subFS, 600);
                ctx.globalAlpha = subEased * subFade;
                ctx.fillStyle   = '#aa6666';
                ctx.shadowColor = 'rgba(255,50,50,0.4)';
                ctx.shadowBlur  = 8;

                const ld = getLevelData(g.levelManager.currentLevel);
                ctx.fillText(
                    `LEVEL ${g.levelManager.currentLevel} — ${ld?.name?.toUpperCase() || 'SECTOR ' + g.levelManager.currentLevel}`,
                    w / 2, subY
                );

                if (t > 3.0) {
                    const scoreProg  = Math.min(1, (t - 3.0) / 0.4);
                    const scoreEased = 1 - Math.pow(1 - scoreProg, 2);
                    ctx.globalAlpha  = scoreEased * subFade;
                    ctx.fillStyle    = '#888888';
                    ctx.font = ui(Math.min(13, w * 0.03));
                    ctx.fillText(
                        `SCORE: ${g.scoreManager.score.toLocaleString()}`,
                        w / 2, subY + subFS * 1.8
                    );
                }
                ctx.restore();
            }
        }

        /* pulsing red border */
        if (t > 0.5 && t < 5.5) {
            const frameProg = Math.min(1, (t - 0.5) / 0.5);
            const frameFade = t > 4.8 ? Math.max(0, (5.5 - t) / 0.7) : 1;
            const pulse     = 0.5 + 0.5 * Math.sin(t * 4);
            const frameAlpha = frameProg * frameFade * pulse * 0.25;

            ctx.save();
            ctx.strokeStyle = `rgba(255,30,0,${frameAlpha.toFixed(3)})`;
            ctx.lineWidth   = 4;
            ctx.shadowColor = 'rgba(255,0,0,0.6)';
            ctx.shadowBlur  = 20;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.restore();
        }

        /* final fade to black */
        if (t > 5.0) {
            const blackAlpha = Math.min(1, (t - 5.0) / (dur - 5.0));
            ctx.fillStyle = `rgba(0,0,0,${blackAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }

        /* initial impact flash */
        if (t < 0.3) {
            const flashAlpha = (1 - t / 0.3) * 0.5;
            ctx.fillStyle = `rgba(255,100,50,${flashAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }
    }
}
