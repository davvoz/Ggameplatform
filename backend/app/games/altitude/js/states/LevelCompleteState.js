/**
 * LevelCompleteState - Celebration cinematic + score summary + shop prompt.
 *
 * Phases:
 *   0  (0.0 – 0.8s)  — "LEVEL CLEAR!" zooms in with radial rays
 *   1  (0.8 – 2.8s)  — Stats panel slides up (score, coins, enemies)
 *   2  (2.8s+)       — Two buttons appear: CONTINUE → next level, SHOP → shop
 */

import { State } from './State.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT, COLORS, TIME_BONUS } from '../config/Constants.js';
import { getLevelData, TOTAL_LEVELS } from '../config/LevelData.js';
import { bitmapFont } from '../graphics/BitmapFont.js';
const PHASE_DURATIONS = [0.8, 2.0]; // cumulative: phase 0 ends at 0.8, phase 1 at 2.8

export class LevelCompleteState extends State {
    #timer = 0;
    #phase = 0;
    #panelY = DESIGN_HEIGHT + 40;   // slides from below
    #btnAlpha = 0;
    #selectedBtn = 0;               // 0 = CONTINUE, 1 = SHOP

    // Snapshot of stats when we entered
    #score = 0;
    #coins = 0;
    #enemies = 0;
    #levelName = '';
    #levelId = 0;
    #isLastLevel = false;

    // Time-bonus data
    #levelTime = 0;
    #medal = 'none';
    #bonusScore = 0;
    #bonusCoins = 0;
    #bonusAnim = 0;   // 0→1 for rolling-counter animation
    #levelScreenCount = 1;

    // Celebration rays
    #rays = [];

    // Lightning
    #flashAlpha        = 0;
    #lightningStrikes  = [];   // [{pts, branches, angle, life, maxLife}]
    #lightningChannels = [];   // [{angle, timer}]

    enter() {
        this.#timer = 0;
        this.#phase = 0;
        this.#panelY = DESIGN_HEIGHT + 40;
        this.#btnAlpha = 0;
        this.#selectedBtn = 0;

        const li = this._game.currentLevel ?? 0;
        const ld = getLevelData(li);
        this.#levelId = li + 1;
        this.#levelName = ld?.name ?? `Level ${this.#levelId}`;
        this.#isLastLevel = li >= TOTAL_LEVELS - 1;

        // Unlock the next level so it becomes selectable in LevelSelectState
        this._game.unlockLevel(li + 1);

        // Snapshot session stats
        this.#score  = this._game.score;
        this.#coins  = this._game.sessionCoins;
        this.#enemies = this._game.enemiesDefeated;

        // Time-bonus snapshot
        this.#levelTime  = this._game.levelTime  ?? 0;
        this.#medal      = this._game.timeMedal  ?? 'none';
        this.#bonusScore = this._game.timeBonusScore ?? 0;
        this.#bonusCoins = this._game.timeBonusCoins ?? 0;
        this.#bonusAnim  = 0;
        this.#levelScreenCount = ld?.screens?.length ?? 1;

        // Notify platform of level completion
        this._game.platform.levelCompleted(this.#levelId);

        // Generate celebration rays
        this.#rays = Array.from({ length: 24 }, (_, i) => ({
            angle: (i / 24) * Math.PI * 2,
            speed: 60 + Math.random() * 40,
        }));

        // Lightning
        this.#flashAlpha        = 0.9;
        this.#lightningStrikes  = [];
        this.#lightningChannels = Array.from({ length: 8 }, (_, i) => ({
            angle: (i / 8) * Math.PI * 2,
            timer: Math.random() * 0.25,   // stagger so they don't all fire at once
        }));

        this._game.sound.playUpgrade?.();
    }

    exit() {
        // nothing
    }

    update(dt) {
        this.#timer += dt;

        // Phase transitions
        if (this.#phase === 0 && this.#timer >= PHASE_DURATIONS[0]) {
            this.#phase = 1;
        }
        if (this.#phase === 1 && this.#timer >= PHASE_DURATIONS[0] + PHASE_DURATIONS[1]) {
            this.#phase = 2;
        }

        // Slide panel up during phase 1
        if (this.#phase >= 1) {
            const target = DESIGN_HEIGHT * 0.35;
            this.#panelY += (target - this.#panelY) * Math.min(1, dt * 8);
        }

        // Fade in buttons during phase 2
        if (this.#phase >= 2) {
            this.#btnAlpha = Math.min(1, this.#btnAlpha + dt * 3);
            // Animate bonus counter
            this.#bonusAnim = Math.min(1, this.#bonusAnim + dt * 1.2);
        }

        // Flash decay
        if (this.#flashAlpha > 0) this.#flashAlpha = Math.max(0, this.#flashAlpha - dt * 3.0);

        // Animate lightning strikes during phases 0 and 1
        if (this.#phase < 2) {
            const t2  = Math.max(0, this.#timer);
            const len = Math.min(450, t2 * 400) * 0.85;
            // Age and cull dead strikes
            for (const s of this.#lightningStrikes) s.life -= dt;
            this.#lightningStrikes = this.#lightningStrikes.filter(s => s.life > 0);
            // Tick per-channel timers and fire new strikes
            if (len > 20) {
                for (const ch of this.#lightningChannels) {
                    ch.timer -= dt;
                    if (ch.timer <= 0) {
                        this.#lightningStrikes.push(
                            this.#spawnStrike(ch.angle, len,
                                DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.22)
                        );
                        ch.timer = 0.10 + Math.random() * 0.42;
                    }
                }
            }
        }

        // Input: tap/click only (mobile-first)
        if (this.#phase >= 2) {
            const input = this._game.input;

            if (input.justTapped) {
                const tx = input.tapX;
                const ty = input.tapY;
                input.consumeTap();
                this.#handleTap(tx, ty);
            }
        }
    }

    #handleTap(tx, ty) {
        const bw     = 120;
        const bh     = 44;
        const gap    = 16;
        const totalW = 2 * bw + gap;
        const startX = (DESIGN_WIDTH - totalW) / 2;
        const by     = this.#panelY + 316 + 12;  // panel height + gap

        if (ty >= by && ty <= by + bh) {
            for (let i = 0; i < 2; i++) {
                const bx = startX + i * (bw + gap);
                if (tx >= bx && tx <= bx + bw) {
                    this.#selectedBtn = i;
                    this.#activate();
                    return;
                }
            }
        }
    }

    #activate() {
        if (this.#isLastLevel) {
            // Last level: btn 0 = INFINITE, btn 1 = LEVELS
            if (this.#selectedBtn === 0) {
                this._game.nextLevel();
                this._game.startInfinite();
            } else {
                this._game.fsm.transition('levelSelect');
            }
        } else if (this.#selectedBtn === 1) {
            // Open shop, then automatically continue to next level when closed
            this._game.nextLevel();
            this._game.openShop('playing');
        } else {
            // Continue directly to next level
            this._game.nextLevel();
            this._game.resetSession();
            this._game.fsm.transition('playing');
        }
    }

    draw(ctx) {
        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        this.#drawRays(ctx);
        this.#drawTitle(ctx);
        this.#drawStatsPanel(ctx);
        this.#drawButtons(ctx);

        // Screen flash on top
        if (this.#flashAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.#flashAlpha * 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
            ctx.restore();
        }
    }

    #drawRays(ctx) {
        const t   = Math.max(0, this.#timer);
        const cx  = DESIGN_WIDTH  / 2;
        const cy  = DESIGN_HEIGHT * 0.22;
        const len = Math.min(450, t * 400);
        const rot = t * 0.25;

        ctx.save();

        // Wide triangular rays (alternating gold / purple)
        const alpha = 0.25 * Math.min(1, t / 0.35);
        for (let i = 0; i < 24; i++) {
            const angle = rot + (i / 24) * Math.PI * 2;
            ctx.fillStyle   = i % 2 === 0 ? COLORS.NEON_YELLOW : COLORS.NEON_PURPLE;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            const h = 0.07;
            ctx.lineTo(cx + Math.cos(angle - h) * len, cy + Math.sin(angle - h) * len);
            ctx.lineTo(cx + Math.cos(angle + h) * len, cy + Math.sin(angle + h) * len);
            ctx.closePath();
            ctx.fill();
        }

        // White lightning strikes (independent flicker per channel)
        if (this.#lightningStrikes.length > 0) {
            ctx.lineCap  = 'round';
            ctx.lineJoin = 'round';

            const drawBoltPath = (bpts, sx, sy, fwdX, fwdY, pX, pY, bLen, alpha, lw, glowW, glowCol) => {
                // Glow pass
                ctx.strokeStyle = glowCol;
                ctx.shadowColor = glowCol;
                ctx.shadowBlur  = 12;
                ctx.lineWidth   = glowW;
                ctx.globalAlpha = alpha * 0.45;
                ctx.beginPath();
                for (let s = 0; s < bpts.length; s++) {
                    const { f, j } = bpts[s];
                    if (s === 0) ctx.moveTo(sx + fwdX * bLen * f + pX * j, sy + fwdY * bLen * f + pY * j);
                    else         ctx.lineTo(sx + fwdX * bLen * f + pX * j, sy + fwdY * bLen * f + pY * j);
                }
                ctx.stroke();
                // Core pass
                ctx.strokeStyle = '#ffffff';
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur  = 5;
                ctx.lineWidth   = lw;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                for (let s = 0; s < bpts.length; s++) {
                    const { f, j } = bpts[s];
                    if (s === 0) ctx.moveTo(sx + fwdX * bLen * f + pX * j, sy + fwdY * bLen * f + pY * j);
                    else         ctx.lineTo(sx + fwdX * bLen * f + pX * j, sy + fwdY * bLen * f + pY * j);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
            };

            for (const strike of this.#lightningStrikes) {
                const lr = strike.life / strike.maxLife;
                // Sharp flash: full for first 50%, then steep fade
                const sAlpha = Math.min(1, t / 0.2) * (lr > 0.5 ? 1 : (lr / 0.5) * (lr / 0.5));
                if (sAlpha < 0.03) continue;

                const angle = -rot * 1.8 + strike.angle;
                const cosA  =  Math.cos(angle);
                const sinA  =  Math.sin(angle);
                const perpX = -Math.sin(angle);
                const perpY =  Math.cos(angle);

                // Main bolt
                drawBoltPath(strike.pts, cx, cy, cosA, sinA, perpX, perpY,
                    len, sAlpha, 1.2, 3.5, '#88ccff');

                // Branches
                for (const br of strike.branches) {
                    const brStartX = cx + cosA * len * br.f0 + perpX * br.j0;
                    const brStartY = cy + sinA * len * br.f0 + perpY * br.j0;
                    const brAngle  = angle + br.angle;
                    const brLen    = len * br.lenFrac;
                    drawBoltPath(br.pts, brStartX, brStartY,
                        Math.cos(brAngle), Math.sin(brAngle),
                        -Math.sin(brAngle), Math.cos(brAngle),
                        brLen, sAlpha * 0.75, 0.8, 2.2, '#aaddff');
                }
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // ── Celebration helpers ──────────────────────────────────────────────────

    static #CONFETTI_COLORS = ['#FFD700','#FF4466','#00FFAA','#AA88FF','#00CCFF','#FF8800','#FF66CC','#ffffff'];

    /**
     * Spawn a single lightning strike on the given channel angle.
     * Path uses recursive midpoint displacement for a fractal, branching look.
     */
    #spawnStrike(channelAngle, boltLen, cx, cy) {
        // Main bolt — 4 subdivision levels → ~17 jagged segments
        const pts = this.#midpointDisplace([{ f: 0, j: 0 }, { f: 1, j: 0 }], 58, 4);

        // 1–3 sub-branches forking off at random intermediate points
        const branches = [];
        for (let i = 3; i < pts.length - 2; i++) {
            if (Math.random() < 0.22 && branches.length < 3) {
                const side    = Math.random() < 0.5 ? 1 : -1;
                const spread  = 0.45 + Math.random() * 0.70;
                const lenFrac = 0.18 + Math.random() * 0.28;
                branches.push({
                    f0: pts[i].f,
                    j0: pts[i].j,
                    angle: side * spread,   // relative to bolt axis
                    lenFrac,
                    pts: this.#midpointDisplace([{ f: 0, j: 0 }, { f: 1, j: 0 }], 32, 3),
                });
            }
        }

        const life = 0.04 + Math.random() * 0.10;
        return { pts, branches, angle: channelAngle, life, maxLife: life };
    }

    /** Recursive midpoint displacement (fractal subdivision) for a jagged path. */
    #midpointDisplace(pts, disp, levels) {
        for (let lv = 0; lv < levels; lv++) {
            const next = [];
            for (let i = 0; i < pts.length - 1; i++) {
                next.push(pts[i]);
                next.push({
                    f: (pts[i].f + pts[i + 1].f) / 2,
                    j: (pts[i].j + pts[i + 1].j) / 2 + (Math.random() - 0.5) * 2 * disp,
                });
            }
            next.push(pts[pts.length - 1]);
            pts  = next;
            disp *= 0.55;
        }
        return pts;
    }





    #drawTitle(ctx) {
        const t = this.#timer;
        // Zoom: starts at 0, peaks at 1.3, then settles at 1.0
        let scale;
        if (t < 0.3) {
            scale = t / 0.3 * 1.3;
        } else if (t < 0.6) {
            scale = 1.3 - ((t - 0.3) / 0.3) * 0.3;
        } else {
            scale = 1.0;
        }

        const cx = DESIGN_WIDTH / 2;
        const cy = DESIGN_HEIGHT * 0.22;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // Glow
        ctx.shadowColor = COLORS.NEON_YELLOW ?? '#f0e060';
        ctx.shadowBlur = 30;

        ctx.fillStyle = COLORS.NEON_YELLOW ?? '#f0e060';
        // ctx.font = 'bold 36px monospace';
        // ctx.textAlign = 'center';
        // ctx.textBaseline = 'middle';
        // ctx.fillText('LEVEL CLEAR!', 0, 0);
        //shadow
        bitmapFont.drawText(ctx, 'LEVEL CLEAR!', 4, 4, 40, {
            align: 'center', color: 'rgba(0, 0, 0, 1)',
        });
        bitmapFont.drawText(ctx, 'LEVEL CLEAR!', 0, 0, 40, {
            align: 'center', color: COLORS.NEON_YELLOW,
            });


        ctx.shadowBlur = 0;

        // Level name below title
        // ctx.fillStyle = COLORS.UI_TEXT;
        // ctx.font = '16px monospace';
        // ctx.fillText(this.#levelName, 0, 36);
        //shadow
        bitmapFont.drawText(ctx, this.#levelName, 2, 38, 28, {
            align: 'center', color: 'rgba(0, 0, 0, 1)',
        });
        bitmapFont.drawText(ctx, this.#levelName, 0, 36, 28, {
            align: 'center', color: COLORS.UI_TEXT,
        });

        // Infinite mode unlock banner
        if (this.#isLastLevel) {
            ctx.fillStyle = COLORS.NEON_PURPLE ?? '#cc88ff';
            ctx.shadowColor = COLORS.NEON_PURPLE ?? '#cc88ff';
            ctx.shadowBlur = 20;
            ctx.font = 'bold 14px monospace';
            ctx.fillText('\u221e INFINITE MODE UNLOCKED!', 0, 62);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    #drawStatsPanel(ctx) {
        if (this.#phase < 1) return;

        const PH  = 316;        // panel height
        const pw  = 290;
        const px  = (DESIGN_WIDTH - pw) / 2;
        const py  = this.#panelY;
        const lx  = px + 20;
        const rx  = px + pw - 20;
        const LH  = 22;  // base line height

        // ── Panel background ──────────────────────────────────────────
        ctx.save();
        ctx.fillStyle   = COLORS.PANEL_BG;
        ctx.strokeStyle = COLORS.UI_BORDER;
        ctx.lineWidth   = 1.5;
        this.#roundRect(ctx, px, py, pw, PH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.textBaseline = 'top';

        // ── Medal palette ─────────────────────────────────────────────
        let medalColor, medalIcon, medalLabel;
        const medal = this.#medal;
        if (medal === 'gold')        { medalColor = TIME_BONUS.GOLD_COLOR;            medalIcon = '\uD83E\uDD47'; medalLabel = 'GOLD';   }
        else if (medal === 'silver') { medalColor = TIME_BONUS.SILVER_COLOR;          medalIcon = '\uD83E\uDD48'; medalLabel = 'SILVER'; }
        else if (medal === 'bronze') { medalColor = TIME_BONUS.BRONZE_COLOR;          medalIcon = '\uD83E\uDD49'; medalLabel = 'BRONZE'; }
        else                         { medalColor = COLORS.UI_TEXT_DIM;               medalIcon = '\u2014';       medalLabel = '\u2014'; }

        // ── Animated values ───────────────────────────────────────────
        const animBonus      = this.#bonusAnim;
        const baseScore      = Math.max(0, Math.floor(this.#score) - this.#bonusScore);
        const baseCoins      = Math.max(0, this.#coins - this.#bonusCoins);
        const animBonusPts   = Math.floor(this.#bonusScore * animBonus);
        const animBonusCoins = Math.floor(this.#bonusCoins * animBonus);
        const animTotal      = baseScore + animBonusPts;
        const animTotalCoins = baseCoins + animBonusCoins;

        // ─────────────────────────────────────────────────────────────
        // Helper: draw a label row
        const row = (label, value, labelClr, valueClr, boldValue, glow) => {
            ctx.font      = '12px monospace';
            ctx.fillStyle = labelClr;
            ctx.textAlign = 'left';
            ctx.fillText(label, lx, currentY);
            ctx.font      = boldValue ? 'bold 13px monospace' : '13px monospace';
            ctx.fillStyle = valueClr;
            ctx.textAlign = 'right';
            if (glow) { ctx.shadowColor = valueClr; ctx.shadowBlur = 6; }
            ctx.fillText(value, rx, currentY);
            ctx.shadowBlur = 0;
        };
        const dividerLine = () => {
            ctx.strokeStyle = 'rgba(120, 150, 255, 0.25)';
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.moveTo(lx, currentY);
            ctx.lineTo(rx, currentY);
            ctx.stroke();
        };
        const sectionLabel = (text) => {
            ctx.font      = 'bold 9px monospace';
            ctx.fillStyle = COLORS.UI_TEXT_DIM;
            ctx.textAlign = 'left';
            ctx.fillText(text, lx, currentY);
        };

        let currentY = py + 12;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SECTION: POINTS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        sectionLabel('POINTS');
        currentY += 15;

        row('Gameplay',
            `${baseScore.toLocaleString()} pts`,
            COLORS.UI_TEXT_DIM, COLORS.UI_TEXT, false, false);
        currentY += LH;

        if (this.#bonusScore > 0) {
            row(`${medalIcon} Time bonus`,
                `+${animBonusPts.toLocaleString()} pts`,
                medalColor, medalColor, true, true);
        } else {
            row('\u23F1 Time bonus', 'no bonus',
                COLORS.UI_TEXT_DIM, COLORS.UI_TEXT_DIM, false, false);
        }
        currentY += LH + 4;

        dividerLine();
        currentY += 7;

        // TOTAL pts
        ctx.font      = 'bold 14px monospace';
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.textAlign = 'left';
        ctx.fillText('= TOTAL', lx, currentY);
        ctx.fillStyle = COLORS.UI_TEXT;
        ctx.shadowColor = COLORS.UI_TEXT;
        ctx.shadowBlur  = 6;
        ctx.textAlign   = 'right';
        ctx.fillText(`${animTotal.toLocaleString()} pts`, rx, currentY);
        ctx.shadowBlur = 0;
        currentY += 26;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SECTION: COINS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        sectionLabel('COINS');
        currentY += 15;

        row('Collected',
            `+${baseCoins}  \uD83E\uDE99`,
            COLORS.UI_TEXT_DIM, COLORS.COIN_GOLD, false, false);
        currentY += LH;

        if (this.#bonusCoins > 0) {
            row(`${medalIcon} Time bonus`,
                `+${animBonusCoins}  \uD83E\uDE99`,
                medalColor, medalColor, true, true);
        } else {
            row('\u23F1 Time bonus', '\u2014  \uD83E\uDE99',
                COLORS.UI_TEXT_DIM, COLORS.UI_TEXT_DIM, false, false);
        }
        currentY += LH + 4;

        dividerLine();
        currentY += 7;

        // TOTAL coins
        ctx.font      = 'bold 14px monospace';
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.textAlign = 'left';
        ctx.fillText('= TOTAL', lx, currentY);
        ctx.fillStyle = COLORS.COIN_GOLD;
        ctx.shadowColor = COLORS.COIN_GOLD;
        ctx.shadowBlur  = 5;
        ctx.textAlign   = 'right';
        ctx.fillText(`${animTotalCoins}  \uD83E\uDE99`, rx, currentY);
        ctx.shadowBlur = 0;
        currentY += 26;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SECTION: TIME & MEDAL
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        sectionLabel('TIME & MEDAL');
        currentY += 15;

        // Time left, medal right
        ctx.font      = '13px monospace';
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.textAlign = 'left';
        ctx.fillText('Your time', lx, currentY);
        ctx.fillStyle   = COLORS.UI_TEXT;
        ctx.textAlign   = 'right';
        ctx.fillText(LevelCompleteState.#formatTime(this.#levelTime), rx, currentY);
        currentY += LH;

        // ── Threshold bar: three columns  🥇≤30:00   🥈≤50:00   🥉≤1:15 ──────────
        const tGold   = TIME_BONUS.GOLD_PER_SCREEN   * (this.#levelScreenCount ?? 1);
        const tSilver = TIME_BONUS.SILVER_PER_SCREEN * (this.#levelScreenCount ?? 1);
        const tBronze = TIME_BONUS.BRONZE_PER_SCREEN * (this.#levelScreenCount ?? 1);
        const thr = [
            { icon: '\uD83E\uDD47', limit: tGold,   color: TIME_BONUS.GOLD_COLOR,   won: this.#medal === 'gold' },
            { icon: '\uD83E\uDD48', limit: tSilver, color: TIME_BONUS.SILVER_COLOR, won: this.#medal === 'silver' },
            { icon: '\uD83E\uDD49', limit: tBronze, color: TIME_BONUS.BRONZE_COLOR, won: this.#medal === 'bronze' },
        ];
        const thrW  = (rx - lx) / 3;
        ctx.font = '10px monospace';
        ctx.textBaseline = 'top';
        thr.forEach((th, i) => {
            const cx = lx + thrW * i + thrW / 2;
            ctx.globalAlpha = th.won ? 1 : 0.35;
            ctx.fillStyle   = th.color;
            if (th.won) { ctx.shadowColor = th.color; ctx.shadowBlur = 7; }
            ctx.textAlign = 'center';
            ctx.fillText(`${th.icon}\u2264${LevelCompleteState.#formatTime(th.limit)}`, cx, currentY);
            ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;
        ctx.textBaseline = 'top';
        currentY += 16;

        // Par time row (small hint)
        ctx.font      = '10px monospace';
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.textAlign = 'left';
        ctx.fillText(`Target: \u2264${LevelCompleteState.#formatTime(tGold)} for gold`, lx, currentY);
        currentY += 16;

        // Medal (same row)
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.font      = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Medal', lx, currentY);
        ctx.fillStyle   = medalColor;
        ctx.shadowColor = medalColor;
        ctx.shadowBlur  = medal !== 'none' ? 9 : 0;
        ctx.font        = 'bold 13px monospace';
        ctx.textAlign   = 'right';
        ctx.fillText(`${medalIcon}  ${medalLabel}`, rx, currentY);
        ctx.shadowBlur = 0;
        currentY += LH;

        // Enemies — small, bottom of panel
        ctx.font      = '11px monospace';
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.textAlign = 'left';
        ctx.fillText(`${this.#enemies} ${this.#enemies === 1 ? 'enemy' : 'enemies'} defeated`, lx, currentY);

        ctx.restore();
    }

    static #formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    #drawButtons(ctx) {
        if (this.#btnAlpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.#btnAlpha;

        const btns = this.#isLastLevel
            ? [{ label: ' INFINITE', icon: '' }, { label: 'LEVELS', icon: '' }]
            : [{ label: 'CONTINUE', icon: '' }, { label: 'SHOP', icon: '' }];

        const bw = 120;
        const bh = 44;
        const gap = 16;
        const totalW = btns.length * bw + (btns.length - 1) * gap;
        const startX = (DESIGN_WIDTH - totalW) / 2;
        const by = this.#panelY + 316 + 12;  // panel height + gap

        btns.forEach((btn, i) => {
            const bx = startX + i * (bw + gap);
            const selected = i === this.#selectedBtn;

            ctx.fillStyle = COLORS.UI_PANEL;
            ctx.strokeStyle =  COLORS.UI_BORDER;
            ctx.lineWidth = 1 ;
            this.#roundRect(ctx, bx, by, bw, bh, 8);
            ctx.fill();
            ctx.stroke();



            //Shadow
            bitmapFont.drawText(ctx, `${btn.label}`, bx + bw / 2 + 2, by + bh / 2 + 2, 24, {
                align: 'center', color: 'rgba(0, 0, 0, 1)',
            });
            bitmapFont.drawText(ctx, `${btn.label}`, bx + bw / 2, by + bh / 2, 24, {
                align: 'center', color:   COLORS.UI_TEXT_DIM,
            });

        });

        // Hint text
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Tap a button to continue', DESIGN_WIDTH / 2, by + bh + 18);

        ctx.restore();
    }

    #roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }
}
