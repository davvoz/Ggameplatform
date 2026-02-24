/**
 * OpeningCinematic — World-aware title sequence.
 *
 * Accepts `worldNum` in setup options (default 1).
 *
 * Unified order for all worlds:
 *   SPACE SHOOTER 2 title → Fleet Roster → World title → Mini-Bosses → Bosses → Perks
 *
 * Timeline durations are computed dynamically from content count,
 * so adding ships / bosses / mini-bosses auto-extends the sequence.
 * Adding World 3+ requires only updating WorldConfig + Enemy.js.
 */
import CinematicScene from './CinematicScene.js';
import {
    easeOut, createBgStars, updateBgStars, renderBgStars,
    renderLetterbox, renderSkipHint, renderVignette
} from './CinematicUtils.js';
import ShowcasePhase from './ShowcasePhase.js';
import { renderShipCard, renderMiniBossCard, renderBossCard } from './EntityCardRenderers.js';
import { getWorldConfig, ITEM_SHOWCASE_TIME } from '../../WorldConfig.js';
import { SHIP_DATA } from '../../entities/Player.js';
import { BOSS_DEFS, MINIBOSS_DEFS } from '../../entities/Enemy.js';
import { PERK_CATALOG } from '../../PerkSystem.js';
import { title, ui, mono } from '../../FontConfig.js';

// ─── Timing constants ─────────────────────────────────
const TITLE_END      = 4.8;   // title phase visual end
const WORLD_TITLE_DUR = 4.5;  // world name presentation duration (after game title, W1 only)
const CROSSFADE      = 0.3;   // overlap between phases
const PERKS_DUR      = 5.5;   // perk showcase duration
const FADE_DUR       = 1.0;   // final fade-to-black

export default class OpeningCinematic extends CinematicScene {

    setup(options = {}) {
        const g = this.game;
        const w = g.logicalWidth;
        const h = g.logicalHeight;

        // ── Determine which world to present ──
        this.worldNum = options.worldNum || 1;
        const worldCfg = getWorldConfig(this.worldNum);

        const bosses     = worldCfg.bossIds.map(id => ({ ...BOSS_DEFS[id], id }));
        const miniBosses = worldCfg.miniBossIds.map(id => ({ ...MINIBOSS_DEFS[id], id }));
        this.bgStars     = createBgStars(50, w, h);

        // Store world theme for rendering
        this.worldCfg    = worldCfg;
        this.themeColor  = worldCfg.themeColor || '#4488ff';

        // ── Build data-driven showcase phases ──
        // Unified order: SS2 title → Ships → World title → Mini-Bosses → Bosses → Perks
        const T = ITEM_SHOWCASE_TIME;
        const ships      = Object.values(SHIP_DATA);
        const shipsStart = TITLE_END - CROSSFADE;

        // World title starts after ships
        this.worldTitleStart = shipsStart + ships.length * T - CROSSFADE;
        this.worldTitleEnd   = this.worldTitleStart + WORLD_TITLE_DUR;

        // Enemies start after world title
        const mbStart   = this.worldTitleEnd - CROSSFADE;
        const bossStart = mbStart + miniBosses.length * T;

        const enemyHeaderColor = this.worldNum === 1 ? undefined : this.themeColor;
        const enemyShadowColor = this.worldNum === 1 ? undefined : this.themeColor;

        this.showcasePhases = [
            new ShowcasePhase({
                header:        { text: '▸ FLEET ROSTER ◂', color: '#aaccee',
                                 shadowColor: 'rgba(100,180,255,0.6)', shadowBlur: 12,
                                 animFreq: 2, letterSpacing: '4px', enterDuration: 0.4 },
                items:         ships,
                cardRenderer:  renderShipCard,
                startTime:     shipsStart,
                slideStyle:    'leftToRight',
                enterDuration: 0.35,
                headerY:       0.12,
                itemYOffset:   -15,
                onPhaseStart:  (g) => g.sound?.playCinematicWhoosh?.(),
            }),
            new ShowcasePhase({
                header:        { text: '⚠ MINI-BOSSES ⚠', color: enemyHeaderColor,
                                 shadowColor: enemyShadowColor },
                items:         miniBosses,
                cardRenderer:  renderMiniBossCard,
                startTime:     mbStart,
                headerY:       0.12,
                itemYOffset:   -10,
                onPhaseStart:  (g) => g.sound?.playCinematicBossReveal?.(),
            }),
            new ShowcasePhase({
                header:        { text: '☠ BOSS TARGETS ☠', color: '#ff3322',
                                 shadowColor: '#ff2200', maxFontSize: 22,
                                 fontSizeRatio: 0.05, shadowBlur: 25, animStyle: 'flash' },
                items:         bosses,
                cardRenderer:  renderBossCard,
                startTime:     bossStart,
                slideStyle:    'center',
                scaleItems:    true,
                scanLine:      true,
                exitFromEnd:   0.2,
                exitDuration:  0.4,
                headerY:       0.10,
                itemYOffset:   -5,
                onPhaseStart:  (g) => g.sound?.playCinematicBossReveal?.(),
                onItemReveal:  (g, i) => { if (i > 0) g.sound?.playCinematicWhoosh?.(); },
            }),
        ];

        this.perksStart = this.showcasePhases[this.showcasePhases.length - 1].endTime;
        this.duration   = this.perksStart + PERKS_DUR + FADE_DUR;

        // Skip section boundaries:
        //   Section 1: SS2 title + ships  →  skip jumps to worldTitleStart
        //   Section 2: world title + enemies + perks  →  skip finishes cinematic
        this._sectionBreak = this.worldTitleStart;

        this._soundsPlayed = {};
    }

    // ═══════════════════════════════════════════════════
    //  SECTION-BASED SKIP
    // ═══════════════════════════════════════════════════

    /**
     * Override base _setupSkipHandler so tapping skips to the next
     * section boundary instead of ending the whole cinematic.
     */
    _setupSkipHandler() {
        this._skipHandler = () => {
            if (this.active && this.skipReady) this._skipToNextSection();
        };
        this.game.canvas.addEventListener('pointerdown', this._skipHandler, { once: false });
    }

    /** Jump to next section, or finish if already in the last section. */
    _skipToNextSection() {
        if (this.timer < this._sectionBreak) {
            // Section 1 → jump to world title
            this.timer = this._sectionBreak;
            this.skipReady = false;  // brief cooldown before next skip
        } else {
            // Section 2 → end cinematic
            this.finish();
        }
    }

    // ═══════════════════════════════════════════════════
    //  UPDATE — overrides base update() for section skip
    // ═══════════════════════════════════════════════════

    /**
     * Override base update() so keyboard skip uses section-based
     * skipping instead of finishing the entire cinematic.
     */
    update(dt) {
        if (!this.active) return;
        this.timer += dt;

        // Enable skip after configurable delay
        if (this._skippable && !this.skipReady && this.timer > this._skipDelay) {
            this.skipReady = true;
        }

        // Keyboard skip → section-aware
        if (this._skippable && this.skipReady) {
            for (const [, pressed] of this.game.input.keys) {
                if (pressed) {
                    this.game.input.keys.clear();
                    this._skipToNextSection();
                    return;
                }
            }
        }

        this.onUpdate(dt);

        // Natural end
        if (this.duration > 0 && this.timer >= this.duration) {
            this.finish();
        }
    }

    onUpdate(dt) {
        const g = this.game;
        updateBgStars(this.bgStars, dt, g.logicalWidth, g.logicalHeight);

        for (const phase of this.showcasePhases) {
            phase.triggerSounds(this.timer, this._soundsPlayed, g);
        }
    }

    // ═══════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════
    onRender(ctx, w, h) {
        const t = this.timer;
        const cx = w / 2;

        // Dark background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        renderBgStars(ctx, this.bgStars);

        // Individual phases
        this._renderTitle(ctx, w, h, t, cx);
        for (const phase of this.showcasePhases) {
            phase.render(ctx, t, w, h, this.game);
        }
        this._renderPerks(ctx, w, h, t, cx);

        // Overlay
        const barH = renderLetterbox(ctx, w, h);
        if (this.skipReady) renderSkipHint(ctx, cx, h, t, barH);

        // Final fade
        if (t > this.duration - FADE_DUR) {
            const fa = Math.min(1, (t - (this.duration - FADE_DUR)) / FADE_DUR);
            ctx.fillStyle = `rgba(0,0,0,${fa.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }

        renderVignette(ctx, cx, h / 2, w, h, 0.5);
    }

    // ───────────────────────────────────────────────────
    //  Phase 1 — Title (world-aware)
    // ───────────────────────────────────────────────────
    _renderTitle(ctx, w, h, t, cx) {
        // All worlds: show "SPACE SHOOTER 2" first, then world name
        if (t < TITLE_END) {
            this._renderTitleWorld1(ctx, w, h, t, cx);
        }
        if (t >= this.worldTitleStart && t < this.worldTitleEnd) {
            const localT = t - this.worldTitleStart;
            this._renderTitleWorldN(ctx, w, h, localT, cx);
        }
    }

    // ───────────────────────────────────────────────────
    //  World 1 — "SPACE SHOOTER 2" (original title)
    // ───────────────────────────────────────────────────
    _renderTitleWorld1(ctx, w, h, t, cx) {
        const cy = h / 2;
        const holdEnd = 3.8;
        // Sharp cut instead of gradual fade
        const holdAlpha = t > holdEnd ? Math.max(0, 1 - Math.pow((t - holdEnd) / 0.25, 2)) : 1;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let titleSize = Math.min(56, w * 0.13);
        let titleFont = title(titleSize);
        ctx.font = titleFont;
        let totalW = ctx.measureText('SPACE SHOOTER 2').width;
        const maxTW = w * 0.88;
        if (totalW > maxTW) {
            titleSize *= maxTW / totalW;
            titleFont = title(titleSize);
            ctx.font = titleFont;
        }

        const spaceW = ctx.measureText('SPACE ').width;
        const shooterW = ctx.measureText('SHOOTER ').width;
        const twoW = ctx.measureText('2').width;
        totalW = spaceW + shooterW + twoW;
        const baseX = cx - totalW / 2;

        // Word 1 — "SPACE"
        if (t > 0) {
            const w1t = Math.min(1, t / 0.4);
            const w1enter = easeOut(w1t);
            const w1y = cy - 15 + (1 - w1enter) * (-h * 0.4);
            const w1alpha = w1enter * holdAlpha;

            if (t > 0.35 && t < 1.0) {
                const ringT = (t - 0.35) / 0.65;
                ctx.globalAlpha = (1 - ringT) * 0.25 * holdAlpha;
                ctx.strokeStyle = '#4488ff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(baseX + spaceW / 2, cy - 15, ringT * w * 0.35, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (w1alpha > 0.01) {
                ctx.font = titleFont;
                ctx.shadowColor = 'rgba(0,150,255,0.9)';
                ctx.shadowBlur = 35 * w1alpha;
                ctx.globalAlpha = w1alpha;

                if (t < 0.6) {
                    const abr = (1 - t / 0.6) * 6;
                    ctx.globalAlpha = w1alpha * 0.3;
                    ctx.fillStyle = '#ff4444';
                    ctx.fillText('SPACE', baseX + spaceW / 2, w1y - abr);
                    ctx.fillStyle = '#4444ff';
                    ctx.fillText('SPACE', baseX + spaceW / 2, w1y + abr);
                }
                ctx.globalAlpha = w1alpha;
                ctx.fillStyle = '#ffffff';
                ctx.fillText('SPACE', baseX + spaceW / 2, w1y);
            }
        }

        // Word 2 — "SHOOTER"
        if (t > 0.8) {
            const w2t = Math.min(1, (t - 0.8) / 0.45);
            const w2enter = easeOut(w2t);
            const w2x = baseX + spaceW + shooterW / 2 + (1 - w2enter) * (w * 0.5);
            const w2alpha = w2enter * holdAlpha;

            if (w2alpha > 0.01) {
                ctx.font = titleFont;
                ctx.shadowColor = 'rgba(0,150,255,0.9)';
                ctx.shadowBlur = 35 * w2alpha;
                const glitchActive = (t - 0.8) < 0.35;
                const gx = glitchActive ? (Math.random() - 0.5) * 6 : 0;
                const gy = glitchActive ? (Math.random() - 0.5) * 3 : 0;

                if ((t - 0.8) < 0.5) {
                    const abr = (1 - (t - 0.8) / 0.5) * 5;
                    ctx.globalAlpha = w2alpha * 0.25;
                    ctx.fillStyle = '#ff4444';
                    ctx.fillText('SHOOTER', w2x + gx - abr, cy - 15 + gy);
                    ctx.fillStyle = '#4444ff';
                    ctx.fillText('SHOOTER', w2x + gx + abr, cy - 15 + gy);
                }
                ctx.globalAlpha = w2alpha;
                ctx.fillStyle = '#ffffff';
                ctx.fillText('SHOOTER', w2x + gx, cy - 15 + gy);
            }
        }

        // Word 3 — "2"
        if (t > 1.6) {
            const w3t = Math.min(1, (t - 1.6) / 0.5);
            const w3enter = easeOut(w3t);
            const w3scale = 3.0 - 2.0 * w3enter;
            const w3alpha = w3enter * holdAlpha;

            if ((t - 1.6) < 0.15) {
                const flashA = (1 - (t - 1.6) / 0.15) * 0.5;
                ctx.globalAlpha = flashA;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
            }

            if ((t - 1.6) > 0.1 && (t - 1.6) < 0.7) {
                const burstT = ((t - 1.6) - 0.1) / 0.6;
                const lineW2 = w * easeOut(burstT);
                ctx.globalAlpha = (1 - burstT) * 0.6 * holdAlpha;
                ctx.fillStyle = '#4488ff';
                ctx.fillRect(cx - lineW2 / 2, cy - 16, lineW2, 3);
            }

            if (w3alpha > 0.01) {
                const numX = baseX + spaceW + shooterW + twoW / 2;
                ctx.save();
                ctx.translate(numX, cy - 15);
                ctx.scale(w3scale, w3scale);
                ctx.font = titleFont;
                ctx.shadowColor = 'rgba(68,136,255,0.9)';
                ctx.shadowBlur = 40 * w3alpha;
                ctx.globalAlpha = w3alpha;
                ctx.fillStyle = '#4488ff';
                ctx.fillText('2', 0, 0);
                ctx.restore();
            }
        }

        // Subtitle
        if (t > 2.4) {
            const subAlpha = easeOut((t - 2.4) / 0.6) * holdAlpha;
            ctx.globalAlpha = subAlpha * 0.8;
            ctx.shadowColor = 'rgba(68,136,255,0.3)';
            ctx.shadowBlur = 10;
            const subSize = Math.min(16, w * 0.038);
            ctx.font = ui(subSize);
            ctx.fillStyle = '#8899bb';
            ctx.letterSpacing = '3px';
            ctx.fillText('TACTICAL EVOLUTION', cx, cy + 35);
            ctx.letterSpacing = '0px';
        }

        ctx.restore();
    }

    // ───────────────────────────────────────────────────
    //  World 2+ — Themed world title with planet accents
    // ───────────────────────────────────────────────────
    _renderTitleWorldN(ctx, w, h, t, cx) {
        const cy = h / 2;
        const holdEnd = 3.8;
        // Sharp cut instead of gradual fade
        const holdAlpha = t > holdEnd ? Math.max(0, 1 - Math.pow((t - holdEnd) / 0.25, 2)) : 1;
        const cfg = this.worldCfg;
        const themeColor = this.themeColor;

        // Parse theme color for glow effects
        const hexToRgb = (hex) => {
            const r = parseInt(hex.slice(1,3), 16);
            const g = parseInt(hex.slice(3,5), 16);
            const b = parseInt(hex.slice(5,7), 16);
            return { r, g, b };
        };
        const rgb = hexToRgb(themeColor);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // ── "WORLD N" label ──
        if (t > 0) {
            const w1t = Math.min(1, t / 0.5);
            const w1enter = easeOut(w1t);
            const labelY = cy - 50 + (1 - w1enter) * (-h * 0.3);
            const w1alpha = w1enter * holdAlpha;

            if (w1alpha > 0.01) {
                const labelSize = Math.min(18, w * 0.045);
                ctx.font = mono(labelSize, 'bold');
                ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`;
                ctx.shadowBlur = 20 * w1alpha;
                ctx.globalAlpha = w1alpha * 0.7;
                ctx.fillStyle = themeColor;
                ctx.fillText(`WORLD ${this.worldNum}`, cx, labelY);

                // Decorative line under label
                const lineW = 60 * w1enter;
                ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${w1alpha * 0.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - lineW, labelY + 12);
                ctx.lineTo(cx + lineW, labelY + 12);
                ctx.stroke();
            }
        }

        // ── World name (large, with glow) ──
        if (t > 0.6) {
            const w2t = Math.min(1, (t - 0.6) / 0.5);
            const w2enter = easeOut(w2t);
            const nameAlpha = w2enter * holdAlpha;
            const nameY = cy - 10;

            // Impact ring
            if (t > 0.6 && t < 1.4) {
                const ringT = (t - 0.6) / 0.8;
                ctx.globalAlpha = (1 - ringT) * 0.2 * holdAlpha;
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, nameY, ringT * w * 0.35, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (nameAlpha > 0.01) {
                let nameSize = Math.min(42, w * 0.11);
                const nameFont = title(nameSize);
                ctx.font = nameFont;
                const nameText = cfg.name.toUpperCase();
                let nameW = ctx.measureText(nameText).width;
                if (nameW > w * 0.88) {
                    nameSize *= (w * 0.88) / nameW;
                    ctx.font = title(nameSize);
                }

                // Chromatic aberration on entry
                if ((t - 0.6) < 0.4) {
                    const abr = (1 - (t - 0.6) / 0.4) * 5;
                    ctx.globalAlpha = nameAlpha * 0.25;
                    ctx.fillStyle = '#ff4444';
                    ctx.fillText(nameText, cx, nameY - abr);
                    ctx.fillStyle = themeColor;
                    ctx.fillText(nameText, cx, nameY + abr);
                }

                ctx.globalAlpha = nameAlpha;
                ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`;
                ctx.shadowBlur = 35 * nameAlpha;
                ctx.fillStyle = '#ffffff';
                ctx.fillText(nameText, cx, nameY);
            }
        }

        // ── Decorative flash + energy burst ──
        if (t > 1.4) {
            const w3t = Math.min(1, (t - 1.4) / 0.5);
            const w3enter = easeOut(w3t);
            const w3alpha = w3enter * holdAlpha;
            const burstY = cy + 40;

            // Flash on entry
            if ((t - 1.4) < 0.12) {
                const flashA = (1 - (t - 1.4) / 0.12) * 0.35;
                ctx.globalAlpha = flashA;
                ctx.fillStyle = themeColor;
                ctx.fillRect(0, 0, w, h);
            }

            // Horizontal energy burst
            if ((t - 1.4) > 0.08 && (t - 1.4) < 0.7) {
                const burstT = ((t - 1.4) - 0.08) / 0.62;
                const lineW2 = w * easeOut(burstT);
                ctx.globalAlpha = (1 - burstT) * 0.5 * holdAlpha;
                ctx.fillStyle = themeColor;
                ctx.fillRect(cx - lineW2 / 2, burstY - 2, lineW2, 3);
            }

            // Decorative diamond symbol
            if (w3alpha > 0.01) {
                const w3scale = 2.5 - 1.5 * w3enter;
                ctx.save();
                ctx.translate(cx, burstY);
                ctx.scale(w3scale, w3scale);
                const symSize = Math.min(28, w * 0.07);
                ctx.font = title(symSize, 'bold');
                ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`;
                ctx.shadowBlur = 20 * w3alpha;
                ctx.globalAlpha = w3alpha;
                ctx.fillStyle = themeColor;
                ctx.fillText('◆', 0, 0);
                ctx.restore();
            }
        }

        // ── Subtitle (planet/theme info) ──
        if (t > 2.2) {
            const subAlpha = easeOut((t - 2.2) / 0.6) * holdAlpha;
            ctx.globalAlpha = subAlpha * 0.7;
            ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`;
            ctx.shadowBlur = 10;
            const subSize = Math.min(14, w * 0.035);
            ctx.font = ui(subSize);
            ctx.fillStyle = themeColor;
            ctx.letterSpacing = '3px';
            const subtitle = cfg.subtitle || cfg.name.toUpperCase();
            ctx.fillText(subtitle, cx, cy + 80);
            ctx.letterSpacing = '0px';

            // Planet list teaser for worlds with planets
            if (cfg.planets && t > 2.8) {
                const plAlpha = easeOut((t - 2.8) / 0.5) * holdAlpha;
                ctx.globalAlpha = plAlpha * 0.4;
                const plSize = Math.min(10, w * 0.025);
                ctx.font = mono(plSize, 400);
                ctx.fillStyle = '#aabbcc';
                ctx.fillText(`${cfg.planets.length} PLANETS TO EXPLORE`, cx, cy + 100);
            }
        }

        ctx.restore();
    }

    // ───────────────────────────────────────────────────
    //  Perk Showcase (World 1: base perks, World 2+: new perks)
    // ───────────────────────────────────────────────────
    _renderPerks(ctx, w, h, t, cx) {
        // Only render for worlds that have a perks phase
        if (this.perksStart == null) return;
        const rStart = this.perksStart - CROSSFADE;
        const rEnd = this.perksStart + PERKS_DUR + 0.5;
        if (t < rStart || t >= rEnd) return;

        const cy = h / 2;
        const phaseT = t - this.perksStart;

        if (phaseT < 0) return;

        // Sharp snap-in and cut-out
        const fadeIn = easeOut(Math.min(1, phaseT / 0.15));
        const fadeOut = phaseT > PERKS_DUR - 0.2
            ? Math.min(1, Math.pow((phaseT - (PERKS_DUR - 0.2)) / 0.2, 2)) : 0;
        const alpha = fadeIn * (1 - fadeOut);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const perks = PERK_CATALOG.filter(p => p.world === this.worldNum);
        const cols = this.worldNum === 1 ? 5 : Math.min(perks.length, 3);
        const rows = Math.ceil(perks.length / cols);
        const txtSize = Math.min(26, w * 0.058);
        const iconSpacingX = Math.min(55, w * 0.12);
        const iconSpacingY = Math.min(42, h * 0.08);
        const gridW = (cols - 1) * iconSpacingX;
        const gridH = (rows - 1) * iconSpacingY;
        const titleToGridGap = 35;
        const gridToSubGap = 30;
        const subSize = Math.min(13, w * 0.028);
        const totalContentH = txtSize + titleToGridGap + gridH + gridToSubGap + subSize;
        const contentTop = cy - totalContentH / 2;

        // Title
        const titleY = contentTop + txtSize / 2;
        ctx.font = title(txtSize, 'bold');
        ctx.shadowColor = this.worldNum === 1 ? 'rgba(255,255,255,0.5)' : `rgba(68,255,136,0.6)`;
        ctx.shadowBlur = 12;
        ctx.fillStyle = this.worldNum === 1 ? '#ffffff' : this.themeColor;
        const perkTitle = this.worldNum === 1 ? 'UPGRADE YOUR SHIP' : 'NEW PERKS UNLOCKED';
        ctx.fillText(perkTitle, cx, titleY);
        ctx.shadowBlur = 0;

        // Grid
        const startX = cx - gridW / 2;
        const startY = contentTop + txtSize + titleToGridGap;
        const lightUpDelay = 0.08;
        const lightUpDuration = 0.25;
        const lightUpStart = 0.5;

        for (let i = 0; i < perks.length; i++) {
            const perk = perks[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const ix = startX + col * iconSpacingX;
            const iy = startY + row * iconSpacingY;

            const perkTrigger = lightUpStart + i * lightUpDelay;
            const tST = phaseT - perkTrigger;

            let perkAlpha = 0.15;
            let glowAmount = 0;
            let iconScale = 1.0;

            if (tST >= 0) {
                const fp = Math.min(1, tST / lightUpDuration);
                const flash = fp < 0.3 ? easeOut(fp / 0.3) : 1.0;
                const settle = fp < 0.3 ? 1.0 : 1 - (fp - 0.3) / 0.7 * 0.4;
                perkAlpha = 0.15 + 0.85 * flash * settle;
                glowAmount = fp < 0.4 ? (1 - fp / 0.4) : 0;
                iconScale = 1.0 + glowAmount * 0.4;
            }

            ctx.save();
            ctx.globalAlpha = alpha * perkAlpha;

            if (glowAmount > 0.01) {
                ctx.save();
                ctx.globalAlpha = alpha * glowAmount * 0.5;
                const glowR = 22;
                const glowGrd = ctx.createRadialGradient(ix, iy, 0, ix, iy, glowR);
                glowGrd.addColorStop(0, '#ffffff');
                glowGrd.addColorStop(0.4, '#bbbbbb');
                glowGrd.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGrd;
                ctx.beginPath();
                ctx.arc(ix, iy, glowR, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            const iSize = Math.min(22, w * 0.048) * iconScale;
            ctx.font = mono(iSize, 400);
            ctx.fillStyle = tST >= 0 ? '#ffffff' : '#333333';
            if (tST >= 0 && glowAmount > 0.1) {
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 12 * glowAmount;
            }
            ctx.fillText(perk.icon, ix, iy);
            ctx.shadowBlur = 0;

            if (tST >= lightUpDuration * 0.5) {
                const nameAlpha = easeOut(Math.min(1, (tST - lightUpDuration * 0.5) / 0.3));
                ctx.globalAlpha = alpha * nameAlpha * 0.45;
                const pNameSize = Math.min(7, w * 0.016);
                ctx.font = ui(pNameSize);
                ctx.fillStyle = '#999999';
                ctx.fillText(perk.name, ix, iy + 14);
            }

            ctx.restore();
        }

        // Subtitle
        ctx.globalAlpha = alpha * 0.4;
        const subtitleY = startY + gridH + gridToSubGap;
        ctx.font = ui(subSize);
        ctx.fillStyle = '#888888';
        const subText = this.worldNum === 1
            ? `${perks.length} tactical perks to discover`
            : `${perks.length} new perks for World ${this.worldNum}`;
        ctx.fillText(subText, cx, subtitleY);

        ctx.restore();
    }
}
