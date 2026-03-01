/**
 * LevelOutroCinematic — "LEVEL CLEAR!" celebration with zoom effect.
 *
 * Exposes .zoom, .zoomProgress, .pcx, .pcy for Game.js camera transform.
 */
import CinematicScene from './CinematicScene.js';
import { getLevelData } from '../../LevelData.js';
import { title } from '../../FontConfig.js';

export default class LevelOutroCinematic extends CinematicScene {

    setup() {
        const g = this.game;
        const w = g.logicalWidth;
        const h = g.logicalHeight;
        const entities = g.entityManager;

        this.duration = 3.5;

        // Player centre (zoom target)
        this.pcx = entities.player
            ? entities.player.position.x + entities.player.width / 2
            : w / 2;
        this.pcy = entities.player
            ? entities.player.position.y + entities.player.height / 2
            : h * 0.8;

        this.levelNum  = g.levelManager.currentLevel;
        this.levelName = getLevelData(this.levelNum)?.name
                         || `Sector ${this.levelNum}`;
        this.zoom         = 1;
        this.zoomProgress = 0;
    }

    /* ── update ──────────────────────────────────────── */
    onUpdate(dt) {
        const t   = this.timer;
        const dur = this.duration;
        const p   = t / dur;

        if (p < 0.3)        this.zoom = 1 + (p / 0.3) * 0.5;
        else if (p < 0.7)   this.zoom = 1.5;
        else                 this.zoom = 1.5 - ((p - 0.7) / 0.3) * 0.5;

        this.zoomProgress = Math.min(1, p / 0.3);
    }

    /* ── render ──────────────────────────────────────── */
    onRender(ctx, w, h) {
        const g   = this.game;
        const t   = this.timer;
        const dur = this.duration;
        const p   = t / dur;
        const cx  = w / 2;
        const cy  = h / 3;

        /* dark overlay — ramps to near-opaque at the end for seamless
           transition into the level-complete screen (background ~0.94) */
        let bgAlpha;
        if (p < 0.8) {
            bgAlpha = Math.min(0.4, p * 1.5);
        } else {
            // 0.4 → 0.94 over the last 20%
            bgAlpha = 0.4 + ((p - 0.8) / 0.2) * 0.54;
        }
        ctx.fillStyle = `rgba(0,0,0,${bgAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);

        /* celebration rays */
        if (p > 0.1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const rayCount = 12;
            const rayAlpha = Math.min(1, (p - 0.1) * 3) *
                             (p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1);

            for (let i = 0; i < rayCount; i++) {
                const angle     = (i / rayCount) * Math.PI * 2 + g.gameTime * 0.5;
                const rayLength = 250 + Math.sin(g.gameTime * 3 + i) * 40;
                const rayGrad   = ctx.createLinearGradient(
                    cx, cy,
                    cx + Math.cos(angle) * rayLength,
                    cy + Math.sin(angle) * rayLength
                );
                rayGrad.addColorStop(0, `rgba(255,215,0,${(0.35 * rayAlpha).toFixed(3)})`);
                rayGrad.addColorStop(1, 'rgba(255,100,0,0)');

                ctx.strokeStyle = rayGrad;
                ctx.lineWidth   = 18 + Math.sin(g.gameTime * 5 + i * 2) * 8;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * rayLength,
                           cy + Math.sin(angle) * rayLength);
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
        }

        /* "LEVEL CLEAR!" text */
        if (p > 0.05) {
            const textProg  = Math.min(1, (p - 0.05) / 0.15);
            const textAlpha = Math.min(1, (p - 0.05) * 6) *
                              (p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1);
            const textScale = textProg < 0.5 ? 1 + (1 - textProg / 0.5) * 0.5 : 1;

            ctx.save();
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.translate(cx, cy);
            ctx.scale(textScale, textScale);
            ctx.translate(-cx, -cy);

            const fontSize = Math.min(36, w * 0.085);
            ctx.font = title(fontSize, 'bold');
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur  = 25;
            ctx.globalAlpha = textAlpha;
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth   = 4;
            ctx.strokeText('LEVEL CLEAR!', cx, cy - 10);
            ctx.fillStyle = `rgba(255,215,0,${textAlpha.toFixed(3)})`;
            ctx.fillText('LEVEL CLEAR!', cx, cy - 10);

            /* level name */
            if (p > 0.2) {
                const subAlpha = Math.min(1, (p - 0.2) * 5) *
                                 (p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1);
                const subFS = Math.min(16, w * 0.04);
                ctx.font        = title(subFS, 'bold');
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur  = 15;
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth   = 3;
                ctx.strokeText(`» ${this.levelName.toUpperCase()} «`, cx, cy + 22);
                ctx.fillStyle = `rgba(0,255,255,${subAlpha.toFixed(3)})`;
                ctx.fillText(`» ${this.levelName.toUpperCase()} «`, cx, cy + 22);
            }
            ctx.restore();
        }

        /* orbiting stars */
        if (p > 0.15) {
            const starAlpha = Math.min(1, (p - 0.15) * 4) *
                              (p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1);
            ctx.save();
            ctx.shadowBlur = 0;
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2 + g.gameTime * 2;
                const dist  = 70 + Math.sin(g.gameTime * 4 + i) * 20;
                const sx    = cx + Math.cos(angle) * dist;
                const sy    = cy + Math.sin(angle) * dist;
                const sz    = 2.5 + Math.sin(g.gameTime * 6 + i * 3) * 1.5;
                ctx.globalAlpha = starAlpha * 0.85;
                ctx.fillStyle   = '#ffffff';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur  = 6;
                ctx.beginPath();
                ctx.arc(sx, sy, sz, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        /* "GET READY!" pulsing text */
        if (p > 0.7 && p < 0.95) {
            const readyAlpha = Math.sin((p - 0.7) / 0.25 * Math.PI * 4) * 0.5 + 0.5;
            ctx.save();
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            const rfs = Math.min(18, w * 0.045);
            ctx.font        = title(rfs, 'bold');
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur  = 20;
            ctx.fillStyle   = `rgba(255,100,0,${readyAlpha.toFixed(3)})`;
            ctx.fillText('GET READY!', cx, cy + 60);
            ctx.restore();
        }

        /* initial golden flash */
        if (t < 0.2) {
            const flashAlpha = (1 - t / 0.2) * 0.3;
            ctx.fillStyle = `rgba(255,230,150,${flashAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }
    }
}
