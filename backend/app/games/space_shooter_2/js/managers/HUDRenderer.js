import { getLevelData } from '../LevelData.js';

class HUDRenderer {
    constructor(game) {
        this.game = game;
    }

    renderHUD(ctx) {
        const g = this.game;
        if (!g.entityManager.player || g.state === 'gameover' || g.state === 'deathCinematic' || g.state === 'levelIntro' || g.state === 'levelOutro') return;

        const player = g.entityManager.player;
        const w = g.logicalWidth;
        const fs = g.fontScale;
        ctx.save();

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, w, 36);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${14 * fs}px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${g.scoreManager.score.toLocaleString()}`, 10, 24);

        ctx.fillStyle = '#88ff88';
        ctx.textAlign = 'center';
        const levelData = getLevelData(g.levelManager.currentLevel);
        ctx.fillText(`LV.${g.levelManager.currentLevel} - ${levelData?.name || ''}`, w / 2, 24);

        ctx.textAlign = 'right';
        const hpBarW = 80;
        const hpBarH = 10;
        const hpBarX = w - 10 - hpBarW;
        const hpBarY = 50;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
        const hpRatio = player.health / player.maxHealth;
        ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 1;
        ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
        ctx.fillStyle = '#fff';
        ctx.font = `${9 * fs}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`${player.health}/${player.maxHealth}`, hpBarX + hpBarW / 2, hpBarY + 9);

        const wpnY = hpBarY + hpBarH + 12;
        ctx.font = `${8 * fs}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#668899';

        for (let i = 0; i < player.maxWeaponLevel; i++) {
            const starX = hpBarX + i * 14;
            const filled = i < player.weaponLevel;
            ctx.fillStyle = filled ? '#ffaa00' : '#333344';
            ctx.shadowColor = filled ? '#ff8800' : 'transparent';
            ctx.shadowBlur = filled ? 5 : 0;
            ctx.font = `${11 * fs}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillText('★', starX, wpnY + 2);
        }
        ctx.shadowBlur = 0;

        if (g.scoreManager.combo > 1) {
            ctx.textAlign = 'center';
            ctx.font = `bold ${(16 + Math.min(g.scoreManager.combo, 10)) * fs}px Arial`;
            ctx.fillStyle = `rgba(255,${Math.max(100, 255 - g.scoreManager.combo * 15)},50,${0.7 + g.scoreManager.comboTimer * 0.15})`;
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 8;
            ctx.fillText(`${g.scoreManager.combo}x COMBO!`, w / 2, 60);
            ctx.shadowBlur = 0;
        }

        if (player.ultimateData) {
            const ultBarW = 120;
            const ultBarH = 8;
            const ultBarX = w / 2 - ultBarW / 2;
            const ultBarY = g.logicalHeight - 30;
            const charge = player.ultimateCharge / 100;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(ultBarX, ultBarY, ultBarW, ultBarH);

            const ultColor = charge >= 1 ? '#ffd700' : '#8866cc';
            ctx.fillStyle = ultColor;
            ctx.fillRect(ultBarX, ultBarY, ultBarW * charge, ultBarH);
            ctx.strokeStyle = '#ffffff33';
            ctx.lineWidth = 1;
            ctx.strokeRect(ultBarX, ultBarY, ultBarW, ultBarH);

            ctx.font = `${9 * fs}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(
                charge >= 1 ? `${player.ultimateData.icon} READY! [Q]` : `${player.ultimateData.icon} ${Math.floor(player.ultimateCharge)}%`,
                w / 2, ultBarY - 3
            );
        }

        const activePerks = g.perkSystem.getActivePerks();
        if (activePerks.length > 0) {
            const perkSize = 20;
            const perkGap = 4;
            const perkX = 8;
            let perkY = 42;
            ctx.font = `bold ${11 * fs}px Arial`;
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
                    ctx.font = `bold ${8 * fs}px Arial`;
                    ctx.fillStyle = '#fff';
                    ctx.fillText(`×${perk.stacks}`, perkX + perkSize - 2, perkY + 8);
                    ctx.font = `bold ${11 * fs}px Arial`;
                }
                perkY += perkSize + perkGap;
            }
        }

        ctx.restore();
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

        const w = g.canvas.width;
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

        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = fpsColor;
        ctx.fillText(`${g.currentFPS}`, x + 6, y + 18);
        ctx.font = '9px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#668899';
        ctx.fillText('FPS', x + 48, y + 18);

        // AVG / MIN
        ctx.font = '8px "Segoe UI", Arial, sans-serif';
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

        if (phase === 0) {
            const progress = t / 2.0;

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
            ctx.font = `bold ${36 * fs}px monospace`;
            ctx.fillStyle = '#ff2222';
            ctx.fillText('⚠ WARNING ⚠', w / 2, h / 2 - 60);

            if (progress > 0.4) {
                const nameAlpha = Math.min(1, (progress - 0.4) / 0.3);
                ctx.globalAlpha = nameAlpha;
                ctx.shadowColor = boss.def.color;
                ctx.shadowBlur = 15;
                ctx.font = `bold ${22 * fs}px monospace`;
                ctx.fillStyle = boss.def.color;
                ctx.fillText(boss.name.toUpperCase(), w / 2, h / 2);
            }

            if (progress > 0.6) {
                const subAlpha = Math.min(1, (progress - 0.6) / 0.3);
                ctx.globalAlpha = subAlpha * 0.7;
                ctx.shadowBlur = 0;
                ctx.font = `${14 * fs}px monospace`;
                ctx.fillStyle = '#ff8888';
                ctx.fillText('INCOMING THREAT DETECTED', w / 2, h / 2 + 30);
            }

            ctx.restore();
        }

        if (phase === 1) {
            const fade = 1 - Math.min(1, (t - 2.0) / 1.5);
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

        if (phase === 2) {
            const deployP = Math.min(1, (t - 3.5) / 1.0);
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
        ctx.font = `bold ${13 * this.game.fontScale}px monospace`;
        ctx.fillText(n.text, w / 2 + 1, bannerY + bannerH / 2 + 1);

        ctx.fillStyle = n.color;
        ctx.fillText(n.text, w / 2, bannerY + bannerH / 2);

        ctx.restore();
    }

    // Banner methods moved to Game.js (DOM-based)
    showXPBanner() {}
    showStatsBanner() {}
    showLevelUpNotification() {}
    updateBanners() {}
    renderBanners() {}

    reset() {
    }
}

export default HUDRenderer;
