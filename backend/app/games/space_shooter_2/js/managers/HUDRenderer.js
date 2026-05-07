import { C_WHITE, C_GOLD } from '../entities/LevelsThemes.js';
import { getLevelData } from '../LevelDataFacade.js';
import { ui, mono } from '../FontConfig.js';
import { BLITZ_MAX_CYCLES } from '../entities/worlds/blitz/BlitzConfig.js';

class HUDRenderer {
    constructor(game) {
        this.game = game;
    }

    renderHUD(ctx) {
        const g = this.game;
        if (!g.entityManager.player ||
            g.state === 'gameover' ||
            g.state === 'deathCinematic' ||
            g.state === 'levelIntro' ||
            g.state === 'levelOutro')
            return;

        const player = g.entityManager.player;
        const w = g.logicalWidth;
        const fs = g.fontScale;
        ctx.save();

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, w, 36);

        ctx.fillStyle = C_WHITE;
        ctx.font = ui(14 * fs, 'bold');
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${g.scoreManager.score.toLocaleString()}`, 10, 24);

        ctx.fillStyle = '#88ff88';
        ctx.textAlign = 'center';
        this.renderLevelInformation(g, ctx, w);

        ctx.textAlign = 'right';
        const hpBarW = 80;
        const hpBarH = 10;
        const hpBarX = w - 10 - hpBarW;
        const hpBarY = 50;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
        const hpRatio = player.health / player.maxHealth;
        const lowRatio = hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : lowRatio;
        ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 1;
        ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
        ctx.fillStyle = '#fff';
        ctx.font = ui(9 * fs);
        ctx.textAlign = 'center';
        ctx.fillText(`${player.health}/${player.maxHealth}`, hpBarX + hpBarW / 2, hpBarY + 9);

        this.renderWeaponLevelIndicators(hpBarY, hpBarH, ctx, fs, player, hpBarX);

        if (g.gameMode === 'blitz' && g.blitzMode) {
            this.renderBlitzHUD(g, ctx, fs, w);
        } else {
            this.renderComboMessage(g, ctx, fs, w);
        }
        this.renderActivePerks(g, ctx, fs);

        this.renderUltimateBar(player, w, g, ctx, fs);

        ctx.restore();
    }

    renderLevelInformation(g, ctx, w) {
        if (g.gameMode === 'survivor' && g.survivorMode) {
            const sm = g.survivorMode;
            const sp = sm.getStepProgress();
            const phaseLabel = `PHASE ${sm.getPhase() + 1}/4`;
            const bossLabel = `\u2620 ${sm.bossesDefeated}/4`;
            const stepLabel = sm.isMilestoneActive()
                ? '\u26A1 BOSS FIGHT'
                : `\u2694 ${sp.current}/${sp.target}`;
            ctx.fillText(`${phaseLabel}   ${bossLabel}   ${stepLabel}`, w / 2, 24);
        } else if (g.gameMode === 'blitz' && g.blitzMode) {
            const bm = g.blitzMode;
            const mult = bm.multiplier ?? 0;
            const phase = (bm.getPhase?.() ?? 0) + 1;
            const cycle = (bm.cycle ?? 0) + 1;
            const condA = mult >= 10 ? '#ffd700' : '#ff8c28';
            ctx.fillStyle = mult >= 25 ? '#ffffc8' : condA;
            const milestoneLabel = bm.milestoneActive ? '  ⚠ FIGHT' : `  P${phase}/4`;
            ctx.fillText(`⚡ ×${mult} CHAIN   CYCLE ${cycle}/${BLITZ_MAX_CYCLES}${milestoneLabel}`, w / 2, 24);
        } else {
            const levelData = getLevelData(g.levelManager.currentLevel);
            ctx.fillText(`LV.${g.levelManager.currentLevel} - ${levelData?.name || ''}`, w / 2, 24);
        }
    }

    renderWeaponLevelIndicators(hpBarY, hpBarH, ctx, fs, player, hpBarX) {
        const wpnY = hpBarY + hpBarH + 12;
        ctx.font = ui(8 * fs);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#668899';

        for (let i = 0; i < player.maxWeaponLevel; i++) {
            const starX = hpBarX + i * 14;
            const filled = i < player.weaponLevel;
            ctx.fillStyle = filled ? '#ffaa00' : '#333344';
            ctx.shadowColor = filled ? '#ff8800' : 'transparent';
            ctx.shadowBlur = filled ? 5 : 0;
            ctx.font = ui(11 * fs);
            ctx.textAlign = 'left';
            ctx.fillText('★', starX, wpnY + 2);
        }
        ctx.shadowBlur = 0;
    }

    /**
     * Blitz Run HUD overlay:
     *  - Large pulsing chain multiplier when chain > 1
     *  - Draining chain timer bar
     *  - Unbanked score (bottom-center, flashes red on chain-break)
     *  - Bank hint when canBank
     *  - BANKED splash animation
     *  - Cycle progress bar (kills toward next milestone)
     */
    renderBlitzHUD(g, ctx, fs, w) {
        const bm = g.blitzMode;
        const h = g.logicalHeight;

        // ── Chain multiplier (large, center) ──────────────────
        this.renderChainMultiplier(bm, fs, ctx, w, h);

        // ── Chain timer bar ────────────────────────────────────
        this.renderChainProgressBar(bm, fs, w, h, ctx);

        // ── Cycle / milestone progress (top-left) ─────────────
        this.renderCycleProgress(bm, ctx, fs, w);

        // ── Unbanked score (bottom-center) ────────────────────
        this.renderUnbankedScore(bm, fs, ctx, w, h);

        // ── Bank hint ─────────────────────────────────────────
        this.renderBankHint(bm, ctx, fs, w, h);

        // ── BANKED splash ─────────────────────────────────────
        if (bm.bankAnim.timer > 0) this.renderBankAnimation(bm, ctx, fs, w, h);
    }

    /**
     * Thin gold progress bar (top-right) showing kill progress within the
     * current blitz cycle. Flashes red when a milestone (boss/miniboss) is active.
     */
    renderCycleProgress(bm, ctx, fs, w) {
        // Resolve next event threshold from hardcoded milestones
        const events = [75, 150, 200];
        let nextThreshold = 200;
        for (const t of events) {
            if (bm.cycleKills < t) { nextThreshold = t; break; }
        }

        const barW = Math.round(w * 0.2);
        const barH = Math.round(4 * fs);
        const barX = w - barW - Math.round(8 * fs);
        const barY = Math.round(32 * fs);
        const progress = Math.min(bm.cycleKills / nextThreshold, 1);

        // Background
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#222';
        ctx.fillRect(barX, barY, barW, barH);

        // Fill
        ctx.globalAlpha = bm.milestoneActive ? (0.6 + 0.4 * Math.sin(Date.now() / 120)) : 0.85;
        ctx.fillStyle = bm.milestoneActive ? '#ff4444' : '#ffd700';
        ctx.fillRect(barX, barY, Math.round(barW * progress), barH);
        ctx.restore();

        // Label
        ctx.font = ui(7 * fs);
        ctx.textAlign = 'right';
        ctx.fillStyle = bm.milestoneActive ? '#ff6666' : 'rgba(255,215,0,0.8)';
        const label = bm.milestoneActive ? '⚠ FIGHT' : `${bm.cycleKills}/${nextThreshold}`;
        ctx.fillText(label, w - Math.round(8 * fs), barY - Math.round(3 * fs));
    }

    renderBankHint(bm, ctx, fs, w, h) {
        if (bm.canBank && !this.game.input.isMobile) {
            ctx.font = ui(9 * fs);
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(200,255,200,0.7)';
            ctx.fillText('[E] BANK NOW', w / 2, h - 28);
        }
    }

    /**
     * Full-screen gold burst + "BANKED +X,XXX" text that scales in and floats up.
     *
     * Timeline (t = 0 → 1, normalised from duration → 0):
     *   0.0 – 0.2  scale-in  (overshoot punch)
     *   0.2 – 0.7  hold + float up
     *   0.7 – 1.0  fade out
     */
    renderBankAnimation(bm, ctx, fs, w, h) {
        const { timer, duration, amount } = bm.bankAnim;
        // t goes 1 → 0 as timer counts down
        const t = timer / duration;
        const elapsed = 1 - t;   // 0 → 1

        // ── Burst rays (only first 40% of animation) ──────────
        if (elapsed < 0.4) {
            const burstAlpha = (1 - elapsed / 0.4) * 0.35;
            const RAY_COUNT = 16;
            const cx = w / 2;
            const cy = h / 2;
            const maxLen = Math.max(w, h) * 0.65;
            ctx.save();
            ctx.globalAlpha = burstAlpha;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2 * fs;
            for (let i = 0; i < RAY_COUNT; i++) {
                const angle = (i / RAY_COUNT) * Math.PI * 2;
                const len = maxLen * (0.5 + 0.5 * Math.sin(i * 1.3));
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── Scale-in punch then float ─────────────────────────
        let scale, alpha, offsetY;
        if (elapsed < 0.15) {
            // punch scale-in: 0 → 1.3
            scale = (elapsed / 0.15) * 1.3;
            alpha = 1;
            offsetY = 0;
        } else if (elapsed < 0.7) {
            // hold + slight scale-back + float up
            const hold = (elapsed - 0.15) / 0.55;
            scale = 1.3 - hold * 0.2;   // 1.3 → 1.1
            alpha = 1;
            offsetY = -hold * h * 0.12;
        } else {
            // fade out while continuing to float
            const fade = (elapsed - 0.7) / 0.3;
            scale = 1.1;
            alpha = 1 - fade;
            offsetY = -h * 0.12 - fade * h * 0.06;
        }

        if (alpha <= 0) return;

        const cx = w / 2;
        const cy = h / 2 + offsetY;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // ── Gold background pill ──────────────────────────────
        const pillW = 260 * fs * scale;
        const pillH = 60 * fs * scale;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.roundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, pillH / 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.lineWidth = 2.5 * fs * scale;
        ctx.beginPath();
        ctx.roundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, pillH / 2);
        ctx.stroke();

        // ── "🏦 BANKED" label ──────────────────────────────────
        const fsLabel = Math.round(12 * fs * scale);
        ctx.font = `700 ${fsLabel}px Orbitron, sans-serif`;
        ctx.fillStyle = `rgba(255, 240, 150, ${alpha})`;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12 * scale;
        ctx.fillText('🏦  BANKED', cx, cy - fsLabel * 0.6);

        // ── "+X,XXX" amount ────────────────────────────────────
        const fsAmt = Math.round(20 * fs * scale);
        ctx.font = `900 ${fsAmt}px Orbitron, sans-serif`;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20 * scale;
        ctx.fillText(`+${amount.toLocaleString()}`, cx, cy + fsAmt * 0.55);

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    renderUnbankedScore(bm, fs, ctx, w, h) {
        const unbanked = bm.unbankedScore;
        if (unbanked > 0 || bm.isChainBroke) {
            const flashRed = bm.isChainBroke;
            const condA = (bm.isBankFlash ? '#aaffaa' : '#ffd700');
            const unbankedColor = flashRed ? '#ff3333' : condA;
            const boxW = 200 * fs;
            const boxH = 20 * fs;
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(w / 2 - boxW / 2, h - 58, boxW, boxH);
            ctx.font = ui(11 * fs, 'bold');
            ctx.textAlign = 'center';
            ctx.fillStyle = unbankedColor;
            ctx.shadowColor = unbankedColor;
            ctx.shadowBlur = flashRed ? 10 : 4;
            const brokeAmt = bm.chainBrokeAmount;
            const valA = brokeAmt > 0 ? ` \u2212${brokeAmt.toLocaleString()}` : '';
            const label = flashRed
                ? `\u274C CHAIN BROKE!${valA}`
                : `\uD83C\uDFE6 UNBANKED: ${unbanked.toLocaleString()}`;
            ctx.fillText(label, w / 2, h - 44);
            ctx.shadowBlur = 0;
        }
    }

    renderChainProgressBar(bm, fs, w, h, ctx) {
        if (bm.multiplier > 1 || bm.isChainBroke) {
            const barW = 180 * fs;
            const barH = 6 * fs;
            const barX = w / 2 - barW / 2;
            const barY = h / 2;
            const progress = bm.chainProgress;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barW, barH);

            const condA = progress > 0.15 ? '#ff8800' : '#ff2222';
            const barColor = progress > 0.4 ? '#ffd700' : condA;
            ctx.fillStyle = barColor;
            ctx.fillRect(barX, barY, barW * progress, barH);

            ctx.strokeStyle = '#ffffff33';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barW, barH);
        }
    }

    renderChainMultiplier(bm, fs, ctx, w, h) {
        if (bm.multiplier > 1) {
            const pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.008);
            const fontSize = Math.min(48, 14 + bm.multiplier * 0.6) * fs * pulse;
            ctx.font = `bold ${fontSize}px monospace`;
            ctx.textAlign = 'center';

            const intensity = bm.chainProgress;
            let chainColor;
            if (bm.isChainBroke) chainColor = '#ff2222';
            else if (intensity >= 0.6) chainColor = '#ffffc8';
            else if (intensity >= 0.3) chainColor = '#ffd700';
            else chainColor = '#ff6600';

            ctx.fillStyle = chainColor;
            ctx.shadowColor = chainColor;
            ctx.shadowBlur = 18;
            ctx.fillText(`\u26A1 \xD7${bm.multiplier}`, w / 2, h / 2 - 20);
            ctx.shadowBlur = 0;
        }
    }

    renderComboMessage(g, ctx, fs, w) {
        if (g.scoreManager.combo > 1) {
            ctx.textAlign = 'center';
            ctx.font = ui((16 + Math.min(g.scoreManager.combo, 10)) * fs, 'bold');
            ctx.fillStyle = `rgba(255,${Math.max(100, 255 - g.scoreManager.combo * 15)},50,${0.7 + g.scoreManager.comboTimer * 0.15})`;
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 8;
            ctx.fillText(`${g.scoreManager.combo}x COMBO!`, w / 2, 60);
            ctx.shadowBlur = 0;
        }
    }

    renderUltimateBar(player, w, g, ctx, fs) {
        if (player.ultimateData) {
            const ultBarW = 120;
            const ultBarH = 8;
            const ultBarX = w / 2 - ultBarW / 2;
            const ultBarY = g.logicalHeight - 30;
            const charge = player.ultimateCharge / 100;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(ultBarX, ultBarY, ultBarW, ultBarH);

            const ultColor = charge >= 1 ? C_GOLD : '#8866cc';
            ctx.fillStyle = ultColor;
            ctx.fillRect(ultBarX, ultBarY, ultBarW * charge, ultBarH);
            ctx.strokeStyle = '#ffffff33';
            ctx.lineWidth = 1;
            ctx.strokeRect(ultBarX, ultBarY, ultBarW, ultBarH);

            ctx.font = ui(9 * fs);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            let ultLabel;
            if (charge >= 1) {
                ultLabel = `${player.ultimateData.icon} READY! [Q]`;
            } else {
                const chargeRate = (100 / 30) * (g.perkSystem ? g.perkSystem.getUltChargeMultiplier() : 1);
                const secsLeft = Math.ceil((100 - player.ultimateCharge) / chargeRate);
                ultLabel = `${player.ultimateData.icon} ${secsLeft}s`;
            }
            ctx.fillText(ultLabel, w / 2, ultBarY - 3);
        }
    }

    renderActivePerks(g, ctx, fs) {
        const activePerks = g.perkSystem.getActivePerks();
        if (activePerks.length > 0) {
            const perkSize = 20;
            const perkGap = 4;
            const perkX = 8;
            let perkY = 42;
            ctx.font = ui(11 * fs, 'bold');
            ctx.textAlign = 'center';
            for (const perk of activePerks) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(perkX, perkY, perkSize, perkSize);
                ctx.strokeStyle = perk.rarityData.color;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(perkX, perkY, perkSize, perkSize);
                ctx.fillStyle = perk.rarityData.color;
                ctx.fillText(perk.icon, perkX + perkSize / 2, perkY + 15);
                if (perk.stacks > 1) {
                    ctx.font = ui(8 * fs, 'bold');
                    ctx.fillStyle = '#fff';
                    ctx.fillText(`×${perk.stacks}`, perkX + perkSize - 2, perkY + 8);
                    ctx.font = ui(11 * fs, 'bold');
                }
                perkY += perkSize + perkGap;
            }
        }
    }

    /**
     * Compact FPS monitor – always visible during gameplay.
     * Positioned bottom-left to avoid HUD (top bar), HP (top-right),
     * perks (left column), ultimate bar (bottom-center), and touch controls (bottom-right).
     */
    renderFPSMonitor(ctx) {
        const g = this.game;
        if (!g.showFPSMonitor) return;
        // Only show during active game states
        if (g.state !== 'playing' && g.state !== 'paused' &&
            g.state !== 'levelIntro' && g.state !== 'levelOutro' &&
            g.state !== 'deathCinematic') return;

        const h = g.canvas.height;
        const boxW = 90;
        const boxH = 50;
        // Bottom-left, small margin – away from touch controls (right) and ult bar (center)
        const x = 8;
        const y = h - boxH - 10;

        ctx.save();

        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 8, 16, 0.65)';
        ctx.beginPath();
        ctx.roundRect(x, y, boxW, boxH, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // FPS number with dynamic color
        let fpsColor = '#00ff88';
        if (g.currentFPS < 30) fpsColor = '#ff4444';
        else if (g.currentFPS < 50) fpsColor = '#ffaa00';

        ctx.font = ui(16, 'bold');
        ctx.textAlign = 'left';
        ctx.fillStyle = fpsColor;
        ctx.fillText(`${g.currentFPS}`, x + 6, y + 18);
        ctx.font = ui(9);
        ctx.fillStyle = '#668899';
        ctx.fillText('FPS', x + 48, y + 18);

        // AVG / MIN
        ctx.font = ui(8);
        ctx.fillStyle = '#889999';
        ctx.fillText(`AVG ${g.avgFPS} | MIN ${g.minFPS}`, x + 6, y + 30);

        // Bullet count + perf mode
        const bulletCount = g.entityManager.bullets.length;
        const modeIcons = { high: '🚀', medium: '⚖️', low: '🐢' };
        const modeColors = { high: '#00aaff', medium: '#ffaa00', low: '#88ff88' };
        ctx.fillStyle = '#778888';
        ctx.fillText(`B:${bulletCount}`, x + 6, y + 42);
        ctx.fillStyle = modeColors[g.performanceMode] || '#fff';
        ctx.fillText(`${modeIcons[g.performanceMode] || ''}${g.performanceMode.toUpperCase()}`, x + 38, y + 42);

        ctx.restore();
    }

    renderBossWarningOverlay(ctx, w, h) {
        const boss = this.game.entityManager.boss;
        if (!boss) return;
        const fs = this.game.fontScale;
        const phase = boss.enterPhase;
        const t = boss.enterTime;

        this.fase0(phase, t, ctx, w, h, fs, boss);

        this.fase1(phase, t, ctx, w, h);

        this.fase2(phase, t, ctx, boss, w, h);
    }

    fase2(phase, t, ctx, boss, w, h) {
        if (phase === 2) {
            const deployP = Math.min(1, (t - 3.5) / 1);
            if (deployP > 0.8) {
                const flashAlpha = (deployP - 0.8) / 0.2;
                ctx.save();
                ctx.globalAlpha = flashAlpha * 0.2;
                ctx.fillStyle = boss.def.color;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
            }
        }
    }

    fase1(phase, t, ctx, w, h) {
        if (phase === 1) {
            const fade = 1 - Math.min(1, (t - 2) / 1.5);
            ctx.save();
            ctx.globalAlpha = fade * 0.25;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = fade * 0.15;
            const vig2 = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
            vig2.addColorStop(0, 'rgba(0,0,0,0)');
            vig2.addColorStop(1, 'rgba(200,0,0,1)');
            ctx.fillStyle = vig2;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }
    }

    fase0(phase, t, ctx, w, h, fs, boss) {
        if (phase === 0) {
            const progress = t / 2;

            ctx.save();
            ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            ctx.save();
            const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.7);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, `rgba(180, 0, 0, ${0.3 + 0.2 * Math.sin(t * 4)})`);
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = '#ff0000';
            for (let y = 0; y < h; y += 4) {
                ctx.fillRect(0, y, w, 1);
            }
            ctx.restore();

            const flash = Math.sin(t * 12) > 0 ? 1 : 0.3;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const barH = 32;
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(0, h / 2 - 60 - barH / 2, w, barH);
            ctx.fillRect(0, h / 2 + 60 - barH / 2, w, barH);

            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#000';
            for (let x = -barH; x < w + barH; x += 20) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, h / 2 - 60 - barH / 2);
                ctx.lineTo(x + barH, h / 2 - 60 - barH / 2);
                ctx.lineTo(x + barH - 10, h / 2 - 60 + barH / 2);
                ctx.lineTo(x - 10, h / 2 - 60 + barH / 2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            ctx.globalAlpha = flash;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 20;
            ctx.font = mono(36 * fs);
            ctx.fillStyle = '#ff2222';
            ctx.fillText('⚠ WARNING ⚠', w / 2, h / 2 - 60);

            if (progress > 0.4) {
                const nameAlpha = Math.min(1, (progress - 0.4) / 0.3);
                ctx.globalAlpha = nameAlpha;
                ctx.shadowColor = boss.def.color;
                ctx.shadowBlur = 15;
                ctx.font = mono(22 * fs);
                ctx.fillStyle = boss.def.color;
                ctx.fillText(boss.name.toUpperCase(), w / 2, h / 2);
            }

            if (progress > 0.6) {
                const subAlpha = Math.min(1, (progress - 0.6) / 0.3);
                ctx.globalAlpha = subAlpha * 0.7;
                ctx.shadowBlur = 0;
                ctx.font = mono(14 * fs, 400);
                ctx.fillStyle = '#ff8888';
                ctx.fillText('INCOMING THREAT DETECTED', w / 2, h / 2 + 30);
            }

            ctx.restore();
        }
    }

    renderMiniBossNotification(ctx, w, h) {
        const n = this.game.waveManager.miniBossNotification;
        if (!n) return;

        const progress = 1 - (n.timer / n.maxTimer);
        let alpha = 1;
        if (progress < 0.15) alpha = progress / 0.15;
        else if (progress > 0.85) alpha = (1 - progress) / 0.15;

        ctx.save();
        ctx.globalAlpha = alpha;

        const bannerH = 36;
        const bannerY = h * 0.22;
        const bannerGrad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
        bannerGrad.addColorStop(0, 'rgba(0,0,0,0)');
        bannerGrad.addColorStop(0.2, 'rgba(0,0,0,0.7)');
        bannerGrad.addColorStop(0.8, 'rgba(0,0,0,0.7)');
        bannerGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bannerGrad;
        ctx.fillRect(0, bannerY, w, bannerH);

        ctx.strokeStyle = n.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, bannerY + 2); ctx.lineTo(w, bannerY + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, bannerY + bannerH - 2); ctx.lineTo(w, bannerY + bannerH - 2);
        ctx.stroke();

        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#000';
        ctx.font = mono(13 * this.game.fontScale);
        ctx.fillText(n.text, w / 2 + 1, bannerY + bannerH / 2 + 1);

        ctx.fillStyle = n.color;
        ctx.fillText(n.text, w / 2, bannerY + bannerH / 2);

        ctx.restore();
    }

    // Banner methods moved to Game.js (DOM-based)
    showXPBanner() {
        // Implemented in Game.js using DOM for better animation & styling
    }
    showStatsBanner() {
        // Implemented in Game.js using DOM for better animation & styling
    }
    showLevelUpNotification() {
        // Implemented in Game.js using DOM for better animation & styling
    }
    updateBanners() {
        // Implemented in Game.js using DOM for better animation & styling
    }
    renderBanners() {
        // Implemented in Game.js using DOM for better animation & styling
    }

    reset() {
        // No persistent state in HUDRenderer, but method provided for consistency
    }
}

export default HUDRenderer;
