import CinematicScene from './CinematicScene.js';
import { createBgStars, updateBgStars, renderBgStars, renderVignette, renderSkipHint } from './CinematicUtils.js';
import { SURVIVOR_BOSS_IDS, SURVIVOR_MINIBOSS_IDS, MAX_PICKS } from '../../survivor/SurvivorConfig.js';
import { TOTAL_BOSSES } from '../../survivor/SurvivorTimeline.js';
import { BOSS_DEFS, MINIBOSS_DEFS, EnemyFactory } from '../../entities/Enemy.js';

/**
 * SurvivorOpeningCinematic — Custom intro for World 5 "Custom Survivor".
 *
 * Self-contained cinematic (does NOT extend OpeningCinematic) with a unique
 * tone: glitchy magenta/cyan, "the realities have collapsed" narrative.
 *
 * IMPORTANT: enemies are presented using their REAL idle render. We
 * instantiate actual MultiBoss/Enemy objects via EnemyFactory and force
 * them into the post-entrance state (enterPhase = 3, entering = false)
 * so MultiBossRenderer.render draws their full sprite without running
 * their AI/update loop.
 *
 * Phases:
 *   0:  TITLE      — "WORLD 5 — CUSTOM SURVIVOR"
 *   1:  SUBTITLE   — "ADAPTIVE ARENA"
 *   2:  BOSSES     — 4 real boss idles ("MASTERS OF EVERY REALITY")
 *   3:  MINIBOSSES — 12 real mini-boss idles in a 4×3 grid
 *   4:  RULES      — pick perks · defeat all 4 masters · no second chances
 *   5:  FADE       — to black
 */
const PHASE = {
    TITLE:      { start: 0,    duration: 3.5 },
    SUBTITLE:   { start: 3.5,  duration: 3 },
    BOSSES:     { start: 6.5,  duration: 5 },
    MINIBOSSES: { start: 11.5, duration: 4 },
    RULES:      { start: 15.5, duration: 4 },
    FADE:       { start: 19.5, duration: 1 }
};
const TOTAL_DURATION = 20.5;

export default class SurvivorOpeningCinematic extends CinematicScene {

    setup() {
        const g = this.game;
        this.bgStars = createBgStars(80, g.logicalWidth, g.logicalHeight);
        this.duration = TOTAL_DURATION;
        this._glitchTimer = 0;
        this._lastGlitchOffset = { x: 0, y: 0 };

        this._bosses = this._buildBossActors(g.logicalWidth);
        this._minibosses = this._buildMiniBossActors(g.logicalWidth);
    }

    _buildBossActors(canvasWidth) {
        const out = [];
        for (const id of SURVIVOR_BOSS_IDS) {
            const actor = this._safeMakeBoss(id, canvasWidth);
            out.push({
                id,
                name: BOSS_DEFS[id]?.name || `BOSS ${id}`,
                actor
            });
        }
        return out;
    }

    _safeMakeBoss(id, canvasWidth) {
        try {
            const boss = EnemyFactory.createBoss(0, 0, id, canvasWidth, null, 1);
            this._forceIdle(boss);
            return boss;
        } catch (err) {
            console.warn('[SurvivorCinematic] failed to build boss', id, err);
            return null;
        }
    }

    _buildMiniBossActors(canvasWidth) {
        const out = [];
        for (const id of SURVIVOR_MINIBOSS_IDS) {
            const actor = this._safeMakeMiniBoss(id, canvasWidth);
            out.push({
                id,
                name: MINIBOSS_DEFS[id]?.name || `MINI ${id}`,
                actor
            });
        }
        return out;
    }

    _safeMakeMiniBoss(id, canvasWidth) {
        try {
            const mb = EnemyFactory.createMiniBoss(0, 0, id, canvasWidth, null, 1);
            this._forceIdle(mb);
            return mb;
        } catch (err) {
            console.warn('[SurvivorCinematic] failed to build mini-boss', id, err);
            return null;
        }
    }

    /**
     * Push a freshly-built MultiBoss into "post-entrance idle" so its
     * renderer draws the full sprite without requiring update() ticks.
     */
    _forceIdle(boss) {
        if (!boss) return;
        boss.active = true;
        boss.entering = false;
        boss.enterPhase = 3;
        boss.enterTime = 0;
        boss.enterPartsSpread = 1;
        if (boss.health == null && boss.maxHealth) boss.health = boss.maxHealth;
        if (typeof boss.alpha === 'number') boss.alpha = 1;
    }

    /** Reposition a boss/mini-boss actor to a target screen point. */
    _placeActor(actor, cx, cy) {
        if (!actor) return;
        actor.centerX = cx;
        actor.centerY = cy;
        if (actor.position) {
            actor.position.x = cx - (actor.width || 0) / 2;
            actor.position.y = cy - (actor.height || 0) / 2;
        }
        // Refresh attached parts (multi-boss bodies)
        if (Array.isArray(actor.parts)) {
            for (const part of actor.parts) {
                if (typeof part.updatePosition === 'function') {
                    part.updatePosition(actor.centerX, actor.centerY, actor.moveTimer || 0);
                }
            }
        }
    }

    onUpdate(dt) {
        const g = this.game;
        updateBgStars(this.bgStars, dt, g.logicalWidth, g.logicalHeight);

        this._glitchTimer += dt;
        if (this._glitchTimer > 0.08) {
            this._glitchTimer = 0;
            this._lastGlitchOffset.x = (Math.random() - 0.5) * 6;
            this._lastGlitchOffset.y = (Math.random() - 0.5) * 2;
        }
    }

    onRender(ctx, w, h) {
        ctx.fillStyle = '#0a0014';
        ctx.fillRect(0, 0, w, h);
        renderBgStars(ctx, this.bgStars);
        this._renderGridBackdrop(ctx, w, h);

        const t = this.timer;

        if (this._inPhase(PHASE.TITLE, t))      this._renderTitle(ctx, w, h, t - PHASE.TITLE.start);
        if (this._inPhase(PHASE.SUBTITLE, t))   this._renderSubtitle(ctx, w, h, t - PHASE.SUBTITLE.start);
        if (this._inPhase(PHASE.BOSSES, t))     this._renderBosses(ctx, w, h, t - PHASE.BOSSES.start);
        if (this._inPhase(PHASE.MINIBOSSES, t)) this._renderMinibosses(ctx, w, h, t - PHASE.MINIBOSSES.start);
        if (this._inPhase(PHASE.RULES, t))      this._renderRules(ctx, w, h, t - PHASE.RULES.start);
        if (this._inPhase(PHASE.FADE, t))       this._renderFade(ctx, w, h, t - PHASE.FADE.start);

        renderVignette(ctx, w / 2, h / 2, w, h, 0.55);
        if (this.skipReady) renderSkipHint(ctx, w / 2, h, this.timer, h * 0.08);
    }

    // ───────────────────────────────────────────────
    //  Phase helpers
    // ───────────────────────────────────────────────

    _inPhase(phase, t) {
        return t >= phase.start && t < phase.start + phase.duration;
    }

    _renderGridBackdrop(ctx, w, h) {
        const step = 40;
        const pulse = 0.1 + 0.05 * Math.sin(this.timer * 1.5);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 60, 220, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = 0; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();
        ctx.restore();
    }

    _renderTitle(ctx, w, h, localT) {
        const fontSize = Math.round(28 * (this.game.fontScale || 1));
        ctx.save();
        ctx.font = `900 ${fontSize}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cx = w / 2 + this._lastGlitchOffset.x;
        const cy = h * 0.4 + this._lastGlitchOffset.y;
        const alpha = Math.min(1, localT * 1.5) * Math.min(1, (PHASE.TITLE.duration - localT) * 2);

        ctx.fillStyle = `rgba(255, 60, 220, ${alpha})`;
        ctx.shadowColor = '#ff44ff';
        ctx.shadowBlur = 18;
        ctx.fillText('WORLD 5', cx - 4, cy - fontSize);

        ctx.fillStyle = `rgba(80, 220, 255, ${alpha})`;
        ctx.shadowColor = '#44ddff';
        ctx.fillText('WORLD 5', cx + 4, cy - fontSize);

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowBlur = 8;
        ctx.fillText('WORLD 5', cx, cy - fontSize);

        const fs2 = Math.round(16 * (this.game.fontScale || 1));
        ctx.font = `700 ${fs2}px Orbitron, sans-serif`;
        ctx.fillStyle = `rgba(255, 200, 255, ${alpha})`;
        ctx.shadowColor = '#ff44ff';
        ctx.shadowBlur = 12;
        ctx.fillText('CUSTOM SURVIVOR', cx, cy + 6);

        ctx.restore();
    }

    _renderSubtitle(ctx, w, h, localT) {
        const fs = Math.round(18 * (this.game.fontScale || 1));
        const alpha = Math.min(1, localT * 1.5) * Math.min(1, (PHASE.SUBTITLE.duration - localT) * 1.5);

        ctx.save();
        ctx.font = `700 ${fs}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(80, 220, 255, ${alpha})`;
        ctx.shadowColor = '#44ddff';
        ctx.shadowBlur = 14;
        ctx.fillText('◈ ADAPTIVE ARENA ◈', w / 2, h * 0.42);

        const fs2 = Math.round(11 * (this.game.fontScale || 1));
        ctx.font = `400 ${fs2}px "Space Mono", monospace`;
        ctx.fillStyle = `rgba(220, 220, 220, ${alpha})`;
        ctx.shadowBlur = 4;
        ctx.fillText('Four realities have collapsed into one battlefield.', w / 2, h * 0.5);
        ctx.fillText('Only the prepared survive.', w / 2, h * 0.55);
        ctx.restore();
    }

    _renderBosses(ctx, w, h, localT) {
        const alpha = Math.min(1, localT * 2) * Math.min(1, (PHASE.BOSSES.duration - localT) * 2);
        const fs = Math.round(14 * (this.game.fontScale || 1));
        const fsName = Math.round(11 * (this.game.fontScale || 1));

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${fs}px Orbitron, sans-serif`;
        ctx.fillStyle = `rgba(255, 80, 80, ${alpha})`;
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 16;
        ctx.fillText('☠ MASTERS OF EVERY REALITY ☠', w / 2, h * 0.22);

        // Layout 4 bosses in a row, scaled-down
        const colW = w / this._bosses.length;
        const slotY = h * 0.55;
        const targetSize = Math.min(colW * 0.65, h * 0.4);

        for (let i = 0; i < this._bosses.length; i++) {
            const b = this._bosses[i];
            const cx = colW * (i + 0.5);
            const reveal = Math.max(0, Math.min(1, (localT - i * 0.6) * 2));

            this._drawActor(ctx, b.actor, cx, slotY, targetSize, alpha * reveal);

            // Label
            ctx.font = `600 ${fsName}px "Space Mono", monospace`;
            ctx.shadowBlur = 4;
            ctx.fillStyle = `rgba(255, 220, 220, ${alpha * reveal})`;
            ctx.fillText(b.name, cx, slotY + targetSize * 0.55 + 14);
            ctx.fillStyle = `rgba(180, 180, 180, ${alpha * reveal})`;
            ctx.fillText(`World ${i + 1}`, cx, slotY + targetSize * 0.55 + 28);
        }
        ctx.restore();
    }

    _renderMinibosses(ctx, w, h, localT) {
        const alpha = Math.min(1, localT * 2) * Math.min(1, (PHASE.MINIBOSSES.duration - localT) * 2);
        const fs = Math.round(12 * (this.game.fontScale || 1));

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${fs}px Orbitron, sans-serif`;
        ctx.fillStyle = `rgba(255, 170, 80, ${alpha})`;
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 12;
        ctx.fillText(`⚠ ${this._minibosses.length} ARENA SENTRIES ⚠`, w / 2, h * 0.18);

        const cols = 4, rows = 3;
        const gridW = w * 0.85;
        const gridH = h * 0.65;
        const cellW = gridW / cols;
        const cellH = gridH / rows;
        const ox = (w - gridW) / 2;
        const oy = h * 0.27;
        const targetSize = Math.min(cellW, cellH) * 0.7;

        for (let i = 0; i < this._minibosses.length; i++) {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const cx = ox + cellW * (c + 0.5);
            const cy = oy + cellH * (r + 0.5);
            const reveal = Math.max(0, Math.min(1, (localT - i * 0.15) * 2.5));
            const m = this._minibosses[i];

            this._drawActor(ctx, m.actor, cx, cy, targetSize, alpha * reveal);
        }
        ctx.restore();
    }

    /**
     * Render an enemy actor centered at (cx, cy), scaled to fit `targetSize`.
     * Falls back to a colored diamond if the actor failed to instantiate.
     */
    _drawActor(ctx, actor, cx, cy, targetSize, alphaMul) {
        if (alphaMul <= 0) return;

        if (!actor) {
            ctx.save();
            ctx.globalAlpha = alphaMul;
            ctx.translate(cx, cy);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#ff44ff';
            ctx.shadowColor = '#ff44ff';
            ctx.shadowBlur = 18;
            const s = targetSize * 0.45;
            ctx.fillRect(-s / 2, -s / 2, s, s);
            ctx.restore();
            return;
        }

        const native = Math.max(actor.width || 64, actor.height || 64, 64);
        const scale = Math.min(1, targetSize / native);

        ctx.save();
        ctx.globalAlpha = alphaMul;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        // Place actor at world (0,0) so its centerX/centerY align with (cx,cy)
        this._placeActor(actor, 0, 0);
        try {
            actor.render(ctx, this.game?.assets || null);
        } catch (err) {
            // Defensive fallback if the renderer touches missing state
            console.warn('[SurvivorCinematic] actor render failed', err);
            ctx.fillStyle = '#ff44ff';
            ctx.fillRect(-32, -32, 64, 64);
        }
        ctx.restore();
    }

    _renderRules(ctx, w, h, localT) {
        const alpha = Math.min(1, localT * 2) * Math.min(1, (PHASE.RULES.duration - localT) * 2);
        const fs = Math.round(13 * (this.game.fontScale || 1));
        const fs2 = Math.round(10 * (this.game.fontScale || 1));

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = `700 ${fs}px Orbitron, sans-serif`;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowColor = '#ff44ff';
        ctx.shadowBlur = 14;
        ctx.fillText('★ THE RULES ★', w / 2, h * 0.3);

        ctx.font = `500 ${fs2}px "Space Mono", monospace`;
        ctx.shadowBlur = 4;
        ctx.fillStyle = `rgba(80, 220, 255, ${alpha})`;
        ctx.fillText(`▸ Pick up to ${MAX_PICKS} perks before the run`, w / 2, h * 0.42);
        ctx.fillStyle = `rgba(255, 80, 220, ${alpha})`;
        ctx.fillText(`▸ Defeat the masters of all ${TOTAL_BOSSES} realities`, w / 2, h * 0.5);
        ctx.fillStyle = `rgba(255, 220, 80, ${alpha})`;
        ctx.fillText('▸ Clear waves to unlock each milestone', w / 2, h * 0.58);
        ctx.fillStyle = `rgba(255, 80, 80, ${alpha})`;
        ctx.fillText('▸ No second chances', w / 2, h * 0.66);
        ctx.restore();
    }

    _renderFade(ctx, w, h, localT) {
        const a = Math.min(1, localT / PHASE.FADE.duration);
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }
}
