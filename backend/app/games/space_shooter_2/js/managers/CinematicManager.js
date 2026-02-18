import { SHIP_DATA } from '../entities/Player.js';
import { BOSS_DEFS, MINIBOSS_DEFS } from '../entities/Enemy.js';
import { getLevelData } from '../LevelData.js';
import { PERK_CATALOG, PERK_CATEGORIES } from '../PerkSystem.js';

/**
 * Render all parts of a boss/mini-boss definition at (centerX, centerY)
 * with a given scale, spread (0=collapsed, 1=fully deployed), and time for orbiting/bob.
 * Renders in correct draw order: arm → shield → turret → weakpoint → core.
 */
function renderBossPartsAtPosition(ctx, assets, def, centerX, centerY, scale, spread, time) {
    const order = ['arm', 'shield', 'turret', 'weakpoint', 'core'];
    for (const role of order) {
        for (const p of def.parts) {
            if (p.role !== role) continue;

            let ox = p.offsetX || 0;
            let oy = p.offsetY || 0;

            // Orbit
            if (p.orbitRadius > 0) {
                const angle = (p.orbitAngle || 0) + (p.orbitSpeed || 0) * time;
                ox = Math.cos(angle) * p.orbitRadius;
                oy = Math.sin(angle) * p.orbitRadius;
            }

            // Bob
            if (p.bobAmplitude > 0) {
                oy += Math.sin(time * (p.bobSpeed || 1) + (p.offsetX || 0)) * p.bobAmplitude;
            }

            // Apply spread (collapse towards center when spread < 1)
            ox *= spread;
            oy *= spread;

            const pw = p.width * scale;
            const ph = p.height * scale;
            const px = centerX + ox * scale - pw / 2;
            const py = centerY + oy * scale - ph / 2;

            ctx.save();

            // Part rotation
            const rot = (p.rotationSpeed || 0) * time;
            if (rot !== 0) {
                ctx.translate(px + pw / 2, py + ph / 2);
                ctx.rotate(rot);
                ctx.translate(-(px + pw / 2), -(py + ph / 2));
            }

            const sprite = p.spriteKey && assets ? assets.getSprite(p.spriteKey) : null;
            if (sprite) {
                ctx.drawImage(sprite, px - 2 * scale, py - 2 * scale, pw + 4 * scale, ph + 4 * scale);
            } else {
                // Fallback colored shape
                const partCX = px + pw / 2;
                const partCY = py + ph / 2;
                ctx.fillStyle = p.role === 'core' ? '#ff2244' : p.role === 'turret' ? '#ffaa33' :
                    p.role === 'shield' ? '#4488ff' : '#cc6633';
                ctx.beginPath();
                ctx.arc(partCX, partCY, pw / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 1.5 * scale;
                ctx.stroke();
            }

            ctx.restore();
        }
    }
}

class CinematicManager {
    constructor(game) {
        this.game = game;
        this.cinematic = null;
        this.levelIntro = null;
        this.levelOutro = null;
        this._deathCine = null;
        this._cinematicOnComplete = null;
        this._cinematicSkipHandler = null;
    }

    startCinematic(onComplete) {
        this._cinematicOnComplete = onComplete || null;
        this._beginCinematic();
    }

    _beginCinematic() {
        const g = this.game;
        const w = g.logicalWidth;
        const h = g.logicalHeight;

        const ships = Object.values(SHIP_DATA);
        const bosses = Object.values(BOSS_DEFS).map((b, i) => ({ ...b, id: i + 1 }));
        const miniBosses = Object.values(MINIBOSS_DEFS).map((mb, i) => ({ ...mb, id: i + 1 }));

        const bgStars = [];
        for (let i = 0; i < 50; i++) {
            bgStars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                speed: 20 + Math.random() * 60,
                size: 0.5 + Math.random() * 1.5,
                brightness: 0.3 + Math.random() * 0.7
            });
        }

        this.cinematic = {
            timer: 0,
            duration: 56.0,
            ships,
            bosses,
            miniBosses,
            bgStars,
            skipReady: false,
            _soundsPlayed: {}
        };

        g.state = 'cinematic';
        g.uiManager.hideHudButtons();
        g.sound.playCinematicIntro();

        this._cinematicSkipHandler = () => {
            if (this.cinematic && this.cinematic.skipReady) {
                this.skipCinematic();
            }
        };
        g.canvas.addEventListener('pointerdown', this._cinematicSkipHandler, { once: false });
    }

    skipCinematic() {
        if (!this.cinematic) return;
        this.cinematic = null;
        if (this._cinematicSkipHandler) {
            this.game.canvas.removeEventListener('pointerdown', this._cinematicSkipHandler);
            this._cinematicSkipHandler = null;
        }
        if (this._cinematicOnComplete) {
            this._cinematicOnComplete();
            this._cinematicOnComplete = null;
        }
    }

    updateCinematic(dt) {
        if (!this.cinematic) return;
        const g = this.game;
        const c = this.cinematic;
        c.timer += dt;

        if (!c.skipReady && c.timer > 0.5) c.skipReady = true;

        if (c.skipReady) {
            for (const [, pressed] of g.input.keys) {
                if (pressed) {
                    g.input.keys.clear();
                    this.skipCinematic();
                    return;
                }
            }
        }

        const h = g.logicalHeight;
        for (const s of c.bgStars) {
            s.y += s.speed * dt;
            if (s.y > h) { s.y = 0; s.x = Math.random() * g.logicalWidth; }
        }

        const t = c.timer;
        if (t >= 4.5 && !c._soundsPlayed.ships) {
            c._soundsPlayed.ships = true;
            g.sound.playCinematicWhoosh();
        }
        if (t >= 19.5 && !c._soundsPlayed.minibosses) {
            c._soundsPlayed.minibosses = true;
            g.sound.playCinematicBossReveal();
        }
        if (t >= 31.5 && !c._soundsPlayed.bosses) {
            c._soundsPlayed.bosses = true;
            g.sound.playCinematicBossReveal();
        }

        if (c.timer >= c.duration) {
            this.skipCinematic();
        }
    }

    renderCinematic(ctx, w, h) {
        if (!this.cinematic) return;
        const g = this.game;
        const c = this.cinematic;
        const t = c.timer;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        for (const s of c.bgStars) {
            ctx.globalAlpha = s.brightness * 0.6;
            ctx.fillStyle = '#aabbdd';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        const easeOut = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
        const easeInOut = (x) => { const v = Math.min(1, Math.max(0, x)); return v < 0.5 ? 4*v*v*v : 1 - Math.pow(-2*v+2, 3)/2; };

        const cx = w / 2;
        const cy = h / 2;

        if (t < 4.8) {
            const holdEnd = 4.0;
            const holdAlpha = t > holdEnd ? Math.max(0, 1 - (t - holdEnd) / 0.8) : 1;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let titleSize = Math.min(56, w * 0.13);
            let titleFont = `900 ${titleSize}px 'Segoe UI', Arial, sans-serif`;
            ctx.font = titleFont;
            let totalW = ctx.measureText('SPACE SHOOTER 2').width;
            const maxTitleW = w * 0.88;
            if (totalW > maxTitleW) {
                titleSize = titleSize * (maxTitleW / totalW);
                titleFont = `900 ${titleSize}px 'Segoe UI', Arial, sans-serif`;
                ctx.font = titleFont;
            }

            const spaceW = ctx.measureText('SPACE ').width;
            const shooterW = ctx.measureText('SHOOTER ').width;
            const twoW = ctx.measureText('2').width;
            totalW = spaceW + shooterW + twoW;
            const baseX = cx - totalW / 2;

            if (t > 0) {
                const w1t = Math.min(1, t / 0.4);
                const w1enter = easeOut(w1t);
                const w1y = cy - 15 + (1 - w1enter) * (-h * 0.4);
                const w1alpha = w1enter * holdAlpha;

                if (t > 0.35 && t < 1.0) {
                    const ringT = (t - 0.35) / 0.65;
                    const ringR = ringT * w * 0.35;
                    ctx.globalAlpha = (1 - ringT) * 0.25 * holdAlpha;
                    ctx.strokeStyle = '#4488ff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(baseX + spaceW / 2, cy - 15, ringR, 0, Math.PI * 2);
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

            if (t > 1.6) {
                const w3t = Math.min(1, (t - 1.6) / 0.5);
                const w3enter = easeOut(w3t);
                const w3scale = 3.0 - (3.0 - 1.0) * w3enter;
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

            if (t > 2.4) {
                const subAlpha = easeOut((t - 2.4) / 0.6) * holdAlpha;
                ctx.globalAlpha = subAlpha * 0.8;
                ctx.shadowColor = 'rgba(68,136,255,0.3)';
                ctx.shadowBlur = 10;
                const subSize = Math.min(16, w * 0.038);
                ctx.font = `400 ${subSize}px 'Segoe UI', Arial, sans-serif`;
                ctx.fillStyle = '#8899bb';
                ctx.letterSpacing = '3px';
                ctx.fillText('TACTICAL EVOLUTION', cx, cy + 35);
                ctx.letterSpacing = '0px';
            }

            ctx.restore();
        }

        if (t >= 4.2 && t < 19.8) {
            const phaseT = t - 4.5;
            const ships = c.ships;
            const phaseDuration = 15.0;

            if (phaseT >= 0 && phaseT < phaseDuration) {
                const hdrEnter = easeOut(Math.min(1, phaseT / 0.4));
                const hdrExit = phaseT > phaseDuration - 0.5 ? easeOut((phaseT - (phaseDuration - 0.5)) / 0.5) : 0;
                const hdrPulse = 0.8 + 0.2 * Math.sin(phaseT * 2);
                ctx.save();
                ctx.globalAlpha = (hdrEnter - hdrExit) * hdrPulse;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const hdrSize = Math.min(18, w * 0.04);
                ctx.font = `bold ${hdrSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.shadowColor = 'rgba(100,180,255,0.6)';
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#aaccee';
                ctx.letterSpacing = '4px';
                ctx.fillText('▸ FLEET ROSTER ◂', cx, h * 0.12);
                ctx.restore();
            }

            for (let i = 0; i < ships.length; i++) {
                const shipStart = i * 3.0;
                const shipT = phaseT - shipStart;
                if (shipT < 0 || shipT > 3.4) continue;

                const ship = ships[i];
                const sprite = g.assets.getSprite(`ship_${ship.id}`);

                const enter = easeOut(Math.min(1, shipT / 0.35));
                const exit = shipT > 2.5 ? easeOut((shipT - 2.5) / 0.5) : 0;
                const xPos = cx + (1 - enter) * (-w * 0.4) + exit * (w * 0.4);
                const yPos = cy - 15;
                const alpha = Math.min(enter, 1 - exit);

                if (alpha > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = alpha;

                    if (sprite) {
                        const spriteSize = 90;
                        ctx.drawImage(sprite, xPos - spriteSize / 2, yPos - spriteSize / 2, spriteSize, spriteSize);

                        ctx.globalAlpha = alpha * 0.15;
                        const grad = ctx.createRadialGradient(xPos, yPos, 0, xPos, yPos, spriteSize);
                        grad.addColorStop(0, ship.color);
                        grad.addColorStop(1, 'transparent');
                        ctx.fillStyle = grad;
                        ctx.fillRect(xPos - spriteSize, yPos - spriteSize, spriteSize * 2, spriteSize * 2);
                    }

                    ctx.globalAlpha = alpha;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const nameSize = Math.min(26, w * 0.058);
                    ctx.font = `bold ${nameSize}px 'Orbitron', 'Segoe UI', monospace`;
                    ctx.shadowColor = ship.color;
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = ship.color;
                    ctx.fillText(ship.name.toUpperCase(), xPos, yPos + 55);

                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = alpha * 0.6;
                    const descSize = Math.min(14, w * 0.032);
                    ctx.font = `${descSize}px 'Segoe UI', sans-serif`;
                    ctx.fillStyle = '#99aabb';
                    const desc = ship.description.length > 40 ? ship.description.substring(0, 40) + '...' : ship.description;
                    ctx.fillText(desc, xPos, yPos + 82);

                    const stats = ship.stats;
                    const barW = 70;
                    const barH = 4;
                    const barStartY = yPos + 104;
                    const statKeys = ['hp', 'speed', 'fireRate', 'resist'];
                    const statLabels = ['HP', 'SPD', 'FIRE', 'RES'];
                    ctx.globalAlpha = alpha * 0.5;
                    for (let s = 0; s < statKeys.length; s++) {
                        const val = stats[statKeys[s]] / 10;
                        const by = barStartY + s * 14;
                        ctx.font = `${Math.min(10, w * 0.022)}px monospace`;
                        ctx.textAlign = 'right';
                        ctx.fillStyle = '#556677';
                        ctx.fillText(statLabels[s], xPos - barW / 2 - 5, by + barH);
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        ctx.fillRect(xPos - barW / 2, by, barW, barH);
                        ctx.fillStyle = ship.color;
                        ctx.fillRect(xPos - barW / 2, by, barW * val, barH);
                    }

                    ctx.restore();
                }
            }
        }

        if (t >= 19.2 && t < 31.8) {
            const phaseT = t - 19.5;
            const phaseDuration = 12.0;

            if (phaseT >= 0 && phaseT < phaseDuration) {
                const hdrEnter = easeOut(Math.min(1, phaseT / 0.3));
                const hdrExit = phaseT > phaseDuration - 0.5 ? easeOut((phaseT - (phaseDuration - 0.5)) / 0.5) : 0;
                const hdrPulse = 0.8 + 0.2 * Math.sin(phaseT * 2.5);
                ctx.save();
                ctx.globalAlpha = (hdrEnter - hdrExit) * hdrPulse;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const hdrSize = Math.min(18, w * 0.04);
                ctx.font = `bold ${hdrSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.shadowColor = 'rgba(255,200,50,0.6)';
                ctx.shadowBlur = 14;
                ctx.fillStyle = '#ffdd55';
                ctx.fillText('⚠ MINI-BOSSES ⚠', cx, h * 0.12);
                ctx.restore();
            }

            for (let i = 0; i < c.miniBosses.length; i++) {
                const mbStart = i * 3.0;
                const mbT = phaseT - mbStart;
                if (mbT < 0 || mbT > 3.4) continue;

                const mb = c.miniBosses[i];

                const enter = easeOut(Math.min(1, mbT / 0.3));
                const exit = mbT > 2.5 ? easeOut((mbT - 2.5) / 0.5) : 0;
                const alpha = Math.min(enter, 1 - exit);

                const fromLeft = i % 2 === 0;
                const slideOffset = fromLeft ? (1 - enter) * (-w * 0.5) + exit * (w * 0.5)
                                              : (1 - enter) * (w * 0.5) + exit * (-w * 0.5);
                const xPos = cx + slideOffset;
                const yPos = cy - 10;

                if (alpha > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = alpha;

                    const glowR = 70;
                    ctx.globalAlpha = alpha * 0.15;
                    const grd = ctx.createRadialGradient(xPos, yPos, 0, xPos, yPos, glowR);
                    grd.addColorStop(0, mb.color);
                    grd.addColorStop(1, 'transparent');
                    ctx.fillStyle = grd;
                    ctx.fillRect(xPos - glowR, yPos - glowR, glowR * 2, glowR * 2);

                    ctx.globalAlpha = alpha;
                    // Render all multi-parts with assembly animation
                    const mbDef = MINIBOSS_DEFS[mb.id] || MINIBOSS_DEFS[1];
                    const mbSpread = easeOut(Math.min(1, mbT / 0.6));
                    const mbScale = 1.1;
                    renderBossPartsAtPosition(ctx, g.assets, mbDef, xPos, yPos, mbScale, mbSpread, mbT);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const nameSize = Math.min(24, w * 0.052);
                    ctx.font = `bold ${nameSize}px 'Orbitron', 'Segoe UI', monospace`;
                    ctx.shadowColor = mb.color;
                    ctx.shadowBlur = 14;
                    ctx.fillStyle = mb.color;
                    ctx.fillText(mb.name.toUpperCase(), xPos, yPos + 58);

                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = alpha * 0.5;
                    const patSize = Math.min(13, w * 0.028);
                    ctx.font = `${patSize}px monospace`;
                    ctx.fillStyle = '#888';
                    ctx.fillText(`pattern: ${mb.movePattern}`, xPos, yPos + 84);

                    ctx.restore();
                }
            }
        }

        if (t >= 31.2 && t < 49.8) {
            const phaseT = t - 31.5;
            const phaseDuration = 18.0;

            if (phaseT >= 0 && phaseT < phaseDuration) {
                const hdrEnter = easeOut(Math.min(1, phaseT / 0.3));
                const hdrExit = phaseT > phaseDuration - 0.5 ? easeOut((phaseT - (phaseDuration - 0.5)) / 0.5) : 0;
                const flash = Math.sin(phaseT * 4) > 0 ? 1.0 : 0.75;
                ctx.save();
                ctx.globalAlpha = (hdrEnter - hdrExit) * flash;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const hdrSize = Math.min(22, w * 0.05);
                ctx.font = `bold ${hdrSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.shadowColor = '#ff2200';
                ctx.shadowBlur = 25;
                ctx.fillStyle = '#ff3322';
                ctx.fillText('☠ BOSS TARGETS ☠', cx, h * 0.1);
                ctx.restore();
            }

            if (phaseT > 0) {
                const scanY = (phaseT * 100) % h;
                ctx.save();
                ctx.globalAlpha = 0.06;
                ctx.strokeStyle = '#ff2200';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, scanY);
                ctx.lineTo(w, scanY);
                ctx.stroke();
                ctx.restore();
            }

            const bossInterval = 3.0;
            for (let i = 0; i < c.bosses.length; i++) {
                const bStart = i * bossInterval;
                const bT = phaseT - bStart;
                if (bT < 0 || bT > bossInterval + 0.4) continue;

                const boss = c.bosses[i];

                const enter = easeOut(Math.min(1, bT / 0.3));
                const exit = bT > bossInterval - 0.2 ? easeOut((bT - (bossInterval - 0.2)) / 0.4) : 0;
                const alpha = Math.min(enter, 1 - exit);
                const scale = 0.3 + enter * 0.7 - exit * 0.3;

                const yPos = cy - 5;

                if (alpha > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = alpha;

                    const glowR = 95 * scale;
                    ctx.globalAlpha = alpha * 0.18;
                    const grd = ctx.createRadialGradient(cx, yPos, 0, cx, yPos, glowR);
                    grd.addColorStop(0, boss.color);
                    grd.addColorStop(0.6, boss.color + '44');
                    grd.addColorStop(1, 'transparent');
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.arc(cx, yPos, glowR, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.globalAlpha = alpha * 0.5;
                    ctx.strokeStyle = '#ff3322';
                    ctx.lineWidth = 2.5;
                    const bw = 65 * scale, bh = 65 * scale;
                    const blx = cx - bw, bly = yPos - bh;
                    const brx = cx + bw, bry = yPos + bh;
                    const cLen = 16;
                    ctx.beginPath(); ctx.moveTo(blx, bly + cLen); ctx.lineTo(blx, bly); ctx.lineTo(blx + cLen, bly); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(brx - cLen, bly); ctx.lineTo(brx, bly); ctx.lineTo(brx, bly + cLen); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(blx, bry - cLen); ctx.lineTo(blx, bry); ctx.lineTo(blx + cLen, bry); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(brx - cLen, bry); ctx.lineTo(brx, bry); ctx.lineTo(brx, bry - cLen); ctx.stroke();

                    ctx.globalAlpha = alpha;
                    // Render all multi-parts with assembly animation
                    const bossDef = BOSS_DEFS[boss.id] || BOSS_DEFS[1];
                    const bossSpread = easeOut(Math.min(1, bT / 0.8));
                    renderBossPartsAtPosition(ctx, g.assets, bossDef, cx, yPos, scale, bossSpread, bT);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const nameSize = Math.min(28, w * 0.06) * Math.min(1, scale + 0.2);
                    ctx.font = `bold ${nameSize}px 'Orbitron', 'Segoe UI', monospace`;
                    ctx.shadowColor = boss.color;
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = boss.color;
                    ctx.fillText(boss.name.toUpperCase(), cx, yPos + 74 * scale);

                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = alpha * 0.6;
                    const lvlSize = Math.min(14, w * 0.03);
                    ctx.font = `${lvlSize}px monospace`;
                    ctx.fillStyle = '#cc6655';
                    ctx.fillText(`LEVEL ${boss.id * 5}`, cx, yPos + 98 * scale);

                    ctx.restore();

                    if (bT > 0 && bT < 0.05 && i > 0) {
                        g.sound.playCinematicWhoosh();
                    }
                }
            }
        }

        if (t >= 49.2 && t < 55.5) {
            const phaseT = t - 49.5;
            const phaseDuration = 5.5;

            if (phaseT >= 0) {
                const fadeIn = easeOut(Math.min(1, phaseT / 0.4));
                const fadeOut = phaseT > phaseDuration - 1.0 ? Math.max(0, 1 - (phaseT - (phaseDuration - 1.0)) / 0.8) : 1;
                const alpha = fadeIn * fadeOut;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Layout: compute total content height then center vertically
                const perks = PERK_CATALOG;
                const cols = 5;
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

                // Title — white/grey palette
                const titleY = contentTop + txtSize / 2;
                ctx.font = `bold ${txtSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.shadowColor = 'rgba(255,255,255,0.5)';
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#ffffff';
                ctx.fillText('UPGRADE YOUR SHIP', cx, titleY);
                ctx.shadowBlur = 0;

                // Grid starting position
                const startX = cx - gridW / 2;
                const startY = contentTop + txtSize + titleToGridGap;

                // Sequential light-up timing
                const lightUpDelay = 0.08;
                const lightUpDuration = 0.25;
                const lightUpStart = 0.5;

                for (let i = 0; i < perks.length; i++) {
                    const perk = perks[i];
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const ix = startX + col * iconSpacingX;
                    const iy = startY + row * iconSpacingY;

                    // Time since this perk's light-up trigger
                    const perkTrigger = lightUpStart + i * lightUpDelay;
                    const timeSinceTrigger = phaseT - perkTrigger;

                    // Base dim alpha (perk not yet lit)
                    let perkAlpha = 0.15;
                    let glowAmount = 0;
                    let iconScale = 1.0;

                    if (timeSinceTrigger >= 0) {
                        const flashProgress = Math.min(1, timeSinceTrigger / lightUpDuration);
                        const flash = flashProgress < 0.3 ? easeOut(flashProgress / 0.3) : 1.0;
                        const settle = flashProgress < 0.3 ? 1.0 : 1 - (flashProgress - 0.3) / 0.7 * 0.4;
                        perkAlpha = 0.15 + 0.85 * flash * settle;
                        glowAmount = flashProgress < 0.4 ? (1 - flashProgress / 0.4) : 0;
                        iconScale = 1.0 + glowAmount * 0.4;
                    }

                    ctx.save();
                    ctx.globalAlpha = alpha * perkAlpha;

                    // Glow burst — white
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

                    // Icon — white when lit, dark grey when dim
                    const iSize = Math.min(22, w * 0.048) * iconScale;
                    ctx.font = `${iSize}px monospace`;
                    ctx.fillStyle = timeSinceTrigger >= 0 ? '#ffffff' : '#333333';
                    if (timeSinceTrigger >= 0 && glowAmount > 0.1) {
                        ctx.shadowColor = '#ffffff';
                        ctx.shadowBlur = 12 * glowAmount;
                    }
                    ctx.fillText(perk.icon, ix, iy);
                    ctx.shadowBlur = 0;

                    // Perk name — light grey
                    if (timeSinceTrigger >= lightUpDuration * 0.5) {
                        const nameAlpha = easeOut(Math.min(1, (timeSinceTrigger - lightUpDuration * 0.5) / 0.3));
                        ctx.globalAlpha = alpha * nameAlpha * 0.45;
                        const pNameSize = Math.min(7, w * 0.016);
                        ctx.font = `${pNameSize}px 'Segoe UI', sans-serif`;
                        ctx.fillStyle = '#999999';
                        ctx.fillText(perk.name, ix, iy + 14);
                    }

                    ctx.restore();
                }

                // Subtitle — grey
                ctx.globalAlpha = alpha * 0.4;
                const subtitleY = startY + gridH + gridToSubGap;
                ctx.font = `${subSize}px 'Segoe UI', sans-serif`;
                ctx.fillStyle = '#888888';
                ctx.fillText(`${perks.length} tactical perks to discover`, cx, subtitleY);

                ctx.restore();
            }
        }

        const barH = h * 0.08;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, barH);
        ctx.fillRect(0, h - barH, w, barH);

        ctx.strokeStyle = 'rgba(100,180,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, barH); ctx.lineTo(w, barH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, h - barH); ctx.lineTo(w, h - barH); ctx.stroke();

        if (c.skipReady) {
            const skipAlpha = 0.55 + 0.25 * Math.sin(t * 3);
            ctx.save();
            ctx.globalAlpha = skipAlpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const skipSize = Math.min(14, w * 0.032);
            ctx.font = `bold ${skipSize}px 'Segoe UI', sans-serif`;
            ctx.fillStyle = '#aabbcc';
            ctx.shadowColor = 'rgba(100,180,255,0.5)';
            ctx.shadowBlur = 6;
            ctx.fillText('▸ TAP TO SKIP ◂', cx, h - barH / 2);
            ctx.restore();
        }

        if (t > 55.0) {
            const fadeAlpha = Math.min(1, (t - 55.0) / 1.0);
            ctx.fillStyle = `rgba(0,0,0,${fadeAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }

        const vigGrad = ctx.createRadialGradient(cx, cy, w * 0.25, cx, cy, w * 0.75);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, w, h);
    }

    beginLevelIntro() {
        const g = this.game;
        const levelData = getLevelData(g.levelManager.currentLevel);
        const w = g.logicalWidth;
        const h = g.logicalHeight;

        const warpStars = [];
        for (let i = 0; i < 80; i++) {
            warpStars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                z: Math.random() * 1.5 + 0.5,
                len: Math.random() * 60 + 40,
                brightness: Math.random() * 0.6 + 0.4
            });
        }

        const scanLines = [];
        for (let i = 0; i < 4; i++) {
            scanLines.push({
                y: Math.random() * h,
                speed: (Math.random() * 120 + 60) * (Math.random() < 0.5 ? 1 : -1),
                alpha: Math.random() * 0.15 + 0.05,
                width: Math.random() * 2 + 1
            });
        }

        this.levelIntro = {
            timer: 0,
            duration: 3.5,
            warpStars,
            scanLines,
            levelNum: g.levelManager.currentLevel,
            levelName: levelData ? levelData.name : `Sector ${g.levelManager.currentLevel}`,
            isBossLevel: [5, 10, 15, 20, 25, 30].includes(g.levelManager.currentLevel)
        };

        g.state = 'levelIntro';
        g.uiManager.hideHudButtons();
        g.sound.playLevelIntro();
    }

    updateLevelIntro(dt) {
        if (!this.levelIntro) return;
        const g = this.game;
        this.levelIntro.timer += dt;

        const w = g.logicalWidth;
        const h = g.logicalHeight;
        for (const s of this.levelIntro.warpStars) {
            s.y += s.z * 900 * dt;
            if (s.y > h + s.len) {
                s.y = -s.len;
                s.x = Math.random() * w;
            }
        }

        for (const sl of this.levelIntro.scanLines) {
            sl.y += sl.speed * dt;
            if (sl.y > h) sl.y = -2;
            if (sl.y < -2) sl.y = h;
        }

        if (this.levelIntro.timer >= this.levelIntro.duration) {
            this.levelIntro = null;
            g.state = 'playing';
            g.uiManager.showHudButtons();
        }
    }

    renderLevelIntro(ctx, w, h) {
        if (!this.levelIntro) return;
        const intro = this.levelIntro;
        const t = intro.timer;
        const dur = intro.duration;

        const warpEnd = 0.8;
        const titleStart = 0.6;
        const titleFullAt = 1.1;
        const fadeStart = 2.6;

        const warpIntensity = t < warpEnd
            ? Math.min(1, t / 0.3)
            : Math.max(0, 1 - (t - warpEnd) / 0.6);

        if (warpIntensity > 0) {
            ctx.save();
            for (const s of intro.warpStars) {
                const streakLen = s.len * warpIntensity;
                const alpha = s.brightness * warpIntensity * 0.8;
                ctx.strokeStyle = `rgba(180,220,255,${alpha.toFixed(3)})`;
                ctx.lineWidth = s.z * 1.8;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x, s.y - streakLen);
                ctx.stroke();
            }
            ctx.restore();
        }

        const vigAlpha = t < 0.4 ? t / 0.4 * 0.5
            : t > fadeStart ? Math.max(0, 0.5 * (1 - (t - fadeStart) / (dur - fadeStart)))
            : 0.5;
        if (vigAlpha > 0.01) {
            const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.8);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, `rgba(0,0,0,${vigAlpha.toFixed(3)})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.save();
        for (const sl of intro.scanLines) {
            const slAlpha = sl.alpha * (t < 0.3 ? t / 0.3 : t > fadeStart ? Math.max(0, 1 - (t - fadeStart) / 0.5) : 1);
            if (slAlpha > 0.005) {
                ctx.strokeStyle = `rgba(100,200,255,${slAlpha.toFixed(3)})`;
                ctx.lineWidth = sl.width;
                ctx.beginPath();
                ctx.moveTo(0, sl.y);
                ctx.lineTo(w, sl.y);
                ctx.stroke();
            }
        }
        ctx.restore();

        if (t > 0.2 && t < fadeStart + 0.5) {
            const lineAlpha = t < 0.5 ? (t - 0.2) / 0.3
                : t > fadeStart ? Math.max(0, 1 - (t - fadeStart) / 0.5) : 1;
            ctx.save();
            ctx.strokeStyle = `rgba(0,180,255,${(lineAlpha * 0.6).toFixed(3)})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(0,180,255,0.8)';
            ctx.shadowBlur = 12;

            const lineW = w * 0.7 * Math.min(1, (t - 0.2) / 0.5);
            const lcx = w / 2;
            ctx.beginPath();
            ctx.moveTo(lcx - lineW / 2, h * 0.28);
            ctx.lineTo(lcx + lineW / 2, h * 0.28);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(lcx - lineW / 2, h * 0.62);
            ctx.lineTo(lcx + lineW / 2, h * 0.62);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.restore();
        }

        if (t > titleStart) {
            const titleProgress = Math.min(1, (t - titleStart) / (titleFullAt - titleStart));
            const titleFade = t > fadeStart ? Math.max(0, 1 - (t - fadeStart) / (dur - fadeStart)) : 1;
            const eased = 1 - Math.pow(1 - titleProgress, 3);

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const levelLabel = `LEVEL ${intro.levelNum}`;
            const slideX = w / 2 + (1 - eased) * (-w * 0.4);
            const mainY = h * 0.38;

            ctx.shadowColor = 'rgba(0,180,255,0.9)';
            ctx.shadowBlur = 25 * titleFade;

            const fontSize = Math.min(42, w * 0.09);
            ctx.font = `bold ${fontSize}px 'Orbitron', 'Segoe UI', monospace`;
            ctx.fillStyle = `rgba(255,255,255,${(titleFade * eased).toFixed(3)})`;
            ctx.fillText(levelLabel, slideX, mainY);

            const nameDelay = 0.2;
            if (t > titleStart + nameDelay) {
                const nameProgress = Math.min(1, (t - titleStart - nameDelay) / 0.5);
                const nameEased = 1 - Math.pow(1 - nameProgress, 3);
                const nameSlideX = w / 2 + (1 - nameEased) * (w * 0.3);
                const nameY = h * 0.46;

                ctx.shadowColor = intro.isBossLevel ? 'rgba(255,60,60,0.8)' : 'rgba(0,255,180,0.6)';
                ctx.shadowBlur = 15 * titleFade;

                const nameFontSize = Math.min(22, w * 0.05);
                ctx.font = `600 ${nameFontSize}px 'Orbitron', 'Segoe UI', monospace`;
                const nameColor = intro.isBossLevel ? `rgba(255,120,100,${(titleFade * nameEased).toFixed(3)})` : `rgba(120,255,200,${(titleFade * nameEased).toFixed(3)})`;
                ctx.fillStyle = nameColor;
                ctx.fillText(`» ${intro.levelName.toUpperCase()} «`, nameSlideX, nameY);
            }

            if (intro.isBossLevel && t > titleStart + 0.5) {
                const warnProg = Math.min(1, (t - titleStart - 0.5) / 0.4);
                const warnEased = 1 - Math.pow(1 - warnProg, 2);
                const pulse = 0.7 + Math.sin(t * 6) * 0.3;
                const warnY = h * 0.54;

                ctx.shadowColor = 'rgba(255,30,30,0.9)';
                ctx.shadowBlur = 20 * titleFade;

                const warnFontSize = Math.min(16, w * 0.035);
                ctx.font = `bold ${warnFontSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.fillStyle = `rgba(255,80,60,${(titleFade * warnEased * pulse).toFixed(3)})`;
                ctx.fillText('⚠ BOSS SECTOR ⚠', w / 2, warnY);
            }

            if (eased > 0.5) {
                const bracketAlpha = titleFade * Math.min(1, (eased - 0.5) * 2);
                ctx.strokeStyle = `rgba(0,180,255,${(bracketAlpha * 0.5).toFixed(3)})`;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 0;

                const bSize = 20;
                const pad = w * 0.12;
                const top = h * 0.30;
                const bottom = h * 0.60;

                ctx.beginPath();
                ctx.moveTo(pad, top + bSize);
                ctx.lineTo(pad, top);
                ctx.lineTo(pad + bSize, top);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(w - pad, top + bSize);
                ctx.lineTo(w - pad, top);
                ctx.lineTo(w - pad - bSize, top);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(pad, bottom - bSize);
                ctx.lineTo(pad, bottom);
                ctx.lineTo(pad + bSize, bottom);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(w - pad, bottom - bSize);
                ctx.lineTo(w - pad, bottom);
                ctx.lineTo(w - pad - bSize, bottom);
                ctx.stroke();
            }

            ctx.restore();
        }

        if (t > fadeStart) {
            const flashProg = (t - fadeStart) / (dur - fadeStart);
            const flashAlpha = flashProg < 0.3 ? flashProg / 0.3 * 0.15 : 0.15 * (1 - (flashProg - 0.3) / 0.7);
            if (flashAlpha > 0.005) {
                ctx.fillStyle = `rgba(180,220,255,${flashAlpha.toFixed(3)})`;
                ctx.fillRect(0, 0, w, h);
            }
        }
    }

    beginLevelOutro() {
        const g = this.game;
        const w = g.logicalWidth;
        const h = g.logicalHeight;
        const entities = g.entityManager;
        const pcx = entities.player ? entities.player.position.x + entities.player.width / 2 : w / 2;
        const pcy = entities.player ? entities.player.position.y + entities.player.height / 2 : h * 0.8;

        this.levelOutro = {
            timer: 0,
            duration: 3.5,
            pcx, pcy,
            levelNum: g.levelManager.currentLevel,
            levelName: getLevelData(g.levelManager.currentLevel)?.name || `Sector ${g.levelManager.currentLevel}`,
            zoom: 1,
            zoomProgress: 0
        };

        g.state = 'levelOutro';
        g.uiManager.hideHudButtons();
        g.sound.playLevelOutro();

        entities.bullets = entities.bullets.filter(b => b.owner === 'player');

        g.postProcessing.flash({ r: 255, g: 215, b: 0 }, 0.4);
    }

    updateLevelOutro(dt) {
        if (!this.levelOutro) return;
        const outro = this.levelOutro;
        outro.timer += dt;
        const t = outro.timer;
        const dur = outro.duration;
        const progress = t / dur;

        if (progress < 0.3) {
            outro.zoom = 1 + (progress / 0.3) * 0.5;
        } else if (progress < 0.7) {
            outro.zoom = 1.5;
        } else {
            outro.zoom = 1.5 - ((progress - 0.7) / 0.3) * 0.5;
        }
        outro.zoomProgress = Math.min(1, progress / 0.3);

        if (t >= dur) {
            this.levelOutro = null;
            this.game.levelManager.finalizeLevelComplete();
        }
    }

    renderLevelOutro(ctx, w, h) {
        if (!this.levelOutro) return;
        const g = this.game;
        const outro = this.levelOutro;
        const t = outro.timer;
        const dur = outro.duration;
        const progress = t / dur;
        const cx = w / 2;
        const cy = h / 3;

        const bgAlpha = Math.min(0.4, progress * 1.5);
        ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);

        if (progress > 0.1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const rayCount = 12;
            const rayAlpha = Math.min(1, (progress - 0.1) * 3) *
                (progress > 0.85 ? Math.max(0, (1 - progress) / 0.15) : 1);

            for (let i = 0; i < rayCount; i++) {
                const angle = (i / rayCount) * Math.PI * 2 + g.gameTime * 0.5;
                const rayLength = 250 + Math.sin(g.gameTime * 3 + i) * 40;
                const rayGrad = ctx.createLinearGradient(
                    cx, cy,
                    cx + Math.cos(angle) * rayLength,
                    cy + Math.sin(angle) * rayLength
                );
                rayGrad.addColorStop(0, `rgba(255, 215, 0, ${(0.35 * rayAlpha).toFixed(3)})`);
                rayGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');

                ctx.strokeStyle = rayGrad;
                ctx.lineWidth = 18 + Math.sin(g.gameTime * 5 + i * 2) * 8;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(
                    cx + Math.cos(angle) * rayLength,
                    cy + Math.sin(angle) * rayLength
                );
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
        }

        if (progress > 0.05) {
            const textProg = Math.min(1, (progress - 0.05) / 0.15);
            const textAlpha = Math.min(1, (progress - 0.05) * 6) *
                (progress > 0.85 ? Math.max(0, (1 - progress) / 0.15) : 1);
            const textScale = textProg < 0.5
                ? 1 + (1 - textProg / 0.5) * 0.5
                : 1;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.translate(cx, cy);
            ctx.scale(textScale, textScale);
            ctx.translate(-cx, -cy);

            const fontSize = Math.min(36, w * 0.085);
            ctx.font = `bold ${fontSize}px 'Orbitron', 'Segoe UI', monospace`;

            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 25;

            ctx.globalAlpha = textAlpha;
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 4;
            ctx.strokeText('LEVEL CLEAR!', cx, cy - 10);

            ctx.fillStyle = `rgba(255, 215, 0, ${textAlpha.toFixed(3)})`;
            ctx.fillText('LEVEL CLEAR!', cx, cy - 10);

            if (progress > 0.2) {
                const subAlpha = Math.min(1, (progress - 0.2) * 5) *
                    (progress > 0.85 ? Math.max(0, (1 - progress) / 0.15) : 1);
                const subFontSize = Math.min(16, w * 0.04);
                ctx.font = `bold ${subFontSize}px 'Orbitron', 'Segoe UI', monospace`;
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 15;
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 3;
                ctx.strokeText(`» ${outro.levelName.toUpperCase()} «`, cx, cy + 22);
                ctx.fillStyle = `rgba(0, 255, 255, ${subAlpha.toFixed(3)})`;
                ctx.fillText(`» ${outro.levelName.toUpperCase()} «`, cx, cy + 22);
            }

            ctx.restore();
        }

        if (progress > 0.15) {
            const starAlpha = Math.min(1, (progress - 0.15) * 4) *
                (progress > 0.85 ? Math.max(0, (1 - progress) / 0.15) : 1);
            ctx.save();
            ctx.shadowBlur = 0;
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2 + g.gameTime * 2;
                const dist = 70 + Math.sin(g.gameTime * 4 + i) * 20;
                const sx = cx + Math.cos(angle) * dist;
                const sy = cy + Math.sin(angle) * dist;
                const sz = 2.5 + Math.sin(g.gameTime * 6 + i * 3) * 1.5;

                ctx.globalAlpha = starAlpha * 0.85;
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(sx, sy, sz, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        if (progress > 0.7 && progress < 0.95) {
            const readyAlpha = Math.sin((progress - 0.7) / 0.25 * Math.PI * 4) * 0.5 + 0.5;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const readyFontSize = Math.min(18, w * 0.045);
            ctx.font = `bold ${readyFontSize}px 'Orbitron', 'Segoe UI', monospace`;
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 20;
            ctx.fillStyle = `rgba(255, 100, 0, ${readyAlpha.toFixed(3)})`;
            ctx.fillText('GET READY!', cx, cy + 60);
            ctx.restore();
        }

        if (t < 0.2) {
            const flashAlpha = (1 - t / 0.2) * 0.3;
            ctx.fillStyle = `rgba(255,230,150,${flashAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    beginDeathCinematic(deathX, deathY) {
        const g = this.game;
        const w = g.logicalWidth;
        const h = g.logicalHeight;

        const rings = [];
        for (let i = 0; i < 5; i++) {
            rings.push({
                x: deathX, y: deathY,
                radius: 0,
                maxRadius: 180 + i * 100,
                speed: 200 + i * 60,
                alpha: 0.7,
                delay: i * 0.15,
                hue: [0, 20, 350, 30, 10][i]
            });
        }

        const debris = [];
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 300 + 80;
            debris.push({
                x: deathX, y: deathY,
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

        const cracks = [];
        const crackCount = 12;
        for (let i = 0; i < crackCount; i++) {
            const baseAngle = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
            const segments = [];
            let ccx = deathX, ccy = deathY;
            const segCount = Math.floor(Math.random() * 4) + 3;
            for (let s = 0; s < segCount; s++) {
                const segLen = Math.random() * 50 + 30;
                const deviation = (Math.random() - 0.5) * 0.6;
                const nx = ccx + Math.cos(baseAngle + deviation) * segLen;
                const ny = ccy + Math.sin(baseAngle + deviation) * segLen;
                segments.push({ x: nx, y: ny });
                ccx = nx;
                ccy = ny;
            }
            cracks.push({ segments, maxLen: segments.length, revealSpeed: Math.random() * 2 + 2.5 });
        }

        const glitchChars = '█▓▒░╠╣╚╗┃━▀▄《》';

        const embers = [];
        for (let i = 0; i < 30; i++) {
            embers.push({
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

        this._deathCine = {
            timer: 0,
            duration: 6.5,
            deathX, deathY,
            rings, debris, cracks,
            glitchChars,
            embers,
            textGlitchSeed: Math.random() * 1000,
            slowMotion: 0.15,
            cameraPulse: 0
        };

        g.state = 'deathCinematic';
    }

    updateDeathCinematic(dt) {
        if (!this._deathCine) return;
        const g = this.game;
        const cine = this._deathCine;
        cine.timer += dt;
        const t = cine.timer;
        const w = g.logicalWidth;
        const h = g.logicalHeight;

        for (const ring of cine.rings) {
            if (t < ring.delay) continue;
            ring.radius += ring.speed * dt;
            ring.alpha = Math.max(0, 0.7 * (1 - ring.radius / ring.maxRadius));
        }

        for (const d of cine.debris) {
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vy += 60 * dt;
            d.rot += d.rotSpeed * dt;
            d.life -= dt / d.maxLife;
        }
        cine.debris = cine.debris.filter(d => d.life > 0);

        for (const e of cine.embers) {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.flicker += dt * 8;
            e.life -= dt * 0.5;
        }
        cine.embers = cine.embers.filter(e => e.life > 0);

        if (t > 0.8 && t < 5.0 && Math.random() < 0.35) {
            cine.embers.push({
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

        if (t < 0.5) {
            cine.cameraPulse = Math.sin(t * 30) * Math.max(0, 1 - t / 0.5) * 3;
        }

        if (t > 1.8 && t < 2.1) {
            g.postProcessing.shake(4, 0.15);
        }

        if (t >= cine.duration) {
            this._deathCine = null;
            g.state = 'gameover';
            g.sound.playGameOver();
            g.uiManager.showGameOverScreen();
        }
    }

    renderDeathCinematic(ctx, w, h) {
        if (!this._deathCine) return;
        const g = this.game;
        const cine = this._deathCine;
        const t = cine.timer;
        const dur = cine.duration;
        const dx = cine.deathX;
        const dy = cine.deathY;

        const darkProgress = Math.min(1, t / 2.0);
        const darkAlpha = darkProgress * 0.65;
        if (darkAlpha > 0.01) {
            const grad = ctx.createRadialGradient(dx, dy, 10, dx, dy, w * 0.9);
            grad.addColorStop(0, `rgba(40,0,0,${(darkAlpha * 0.3).toFixed(3)})`);
            grad.addColorStop(0.5, `rgba(20,0,0,${(darkAlpha * 0.6).toFixed(3)})`);
            grad.addColorStop(1, `rgba(0,0,0,${darkAlpha.toFixed(3)})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.save();
        for (const ring of cine.rings) {
            if (ring.alpha <= 0.01 || ring.radius <= 0) continue;

            ctx.strokeStyle = `hsla(${ring.hue}, 100%, 50%, ${(ring.alpha * 0.4).toFixed(3)})`;
            ctx.lineWidth = 8;
            ctx.shadowColor = `hsla(${ring.hue}, 100%, 60%, 0.6)`;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(dx, dy, ring.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = `hsla(${ring.hue}, 90%, 65%, ${ring.alpha.toFixed(3)})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(dx, dy, ring.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        for (const d of cine.debris) {
            ctx.globalAlpha = Math.max(0, d.life);
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rot);
            ctx.fillStyle = `hsl(${d.hue}, 90%, 55%)`;
            ctx.shadowColor = `hsl(${d.hue}, 100%, 70%)`;
            ctx.shadowBlur = 6;
            ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size * 0.6);
            ctx.restore();
        }
        ctx.restore();

        if (t > 0.2 && t < 5.2) {
            const crackAlpha = t < 1.0 ? (t - 0.2) / 0.8 : t > 4.5 ? Math.max(0, (5.2 - t) / 0.7) : 1;
            ctx.save();
            ctx.strokeStyle = `rgba(255, 80, 40, ${(crackAlpha * 0.7).toFixed(3)})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(255, 60, 20, 0.8)';
            ctx.shadowBlur = 8;

            for (const crack of cine.cracks) {
                const revealedSegs = Math.min(crack.segments.length,
                    Math.floor((t - 0.2) * crack.revealSpeed));
                if (revealedSegs <= 0) continue;

                ctx.beginPath();
                ctx.moveTo(dx, dy);
                for (let i = 0; i < revealedSegs; i++) {
                    ctx.lineTo(crack.segments[i].x, crack.segments[i].y);
                }
                ctx.stroke();

                if (revealedSegs > 0 && t < 3.5) {
                    const tip = crack.segments[revealedSegs - 1];
                    ctx.fillStyle = `rgba(255, 200, 100, ${(crackAlpha * 0.8).toFixed(3)})`;
                    ctx.beginPath();
                    ctx.arc(tip.x, tip.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        ctx.save();
        for (const e of cine.embers) {
            const flick = 0.5 + 0.5 * Math.sin(e.flicker);
            ctx.globalAlpha = Math.min(e.life, 1) * flick;
            ctx.fillStyle = `hsl(${e.hue}, 100%, 60%)`;
            ctx.shadowColor = `hsl(${e.hue}, 100%, 80%)`;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        if (t > 0.3 && t < 5.8) {
            const staticAlpha = Math.min(0.12, (t - 0.3) * 0.06) *
                (t > 5.0 ? Math.max(0, (5.8 - t) / 0.8) : 1);
            ctx.save();
            ctx.globalAlpha = staticAlpha;
            for (let y = 0; y < h; y += 3) {
                if (Math.random() < 0.35) {
                    const brightness = Math.floor(Math.random() * 80 + 20);
                    ctx.fillStyle = `rgb(${brightness},${Math.floor(brightness * 0.3)},${Math.floor(brightness * 0.3)})`;
                    ctx.fillRect(0, y, w, 1);
                }
            }
            if (Math.random() < 0.15) {
                const bandY = Math.random() * h;
                const bandH = Math.random() * 8 + 2;
                ctx.globalAlpha = staticAlpha * 2;
                ctx.fillStyle = `rgba(255, 30, 30, 0.15)`;
                ctx.fillRect(0, bandY, w, bandH);
            }
            ctx.restore();
        }

        if (t > 1.8) {
            const textBaseStr = 'GAME OVER';
            const textAppear = Math.min(1, (t - 1.8) / 0.5);
            const textFade = t > 5.0 ? Math.max(0, 1 - (t - 5.0) / (dur - 5.0)) : 1;
            const eased = 1 - Math.pow(1 - textAppear, 4);

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const titleY = h * 0.42;
            const fontSize = Math.min(52, w * 0.12);

            const glitchIntensity = Math.max(0, 1 - (t - 1.8) / 1.0);
            let displayText = '';
            for (let i = 0; i < textBaseStr.length; i++) {
                if (glitchIntensity > 0 && Math.random() < glitchIntensity * 0.7) {
                    displayText += cine.glitchChars[Math.floor(Math.random() * cine.glitchChars.length)];
                } else {
                    displayText += textBaseStr[i];
                }
            }

            const glitchOffsetX = glitchIntensity > 0.1 ? (Math.random() - 0.5) * 12 * glitchIntensity : 0;
            const glitchOffsetY = glitchIntensity > 0.2 ? (Math.random() - 0.5) * 6 * glitchIntensity : 0;

            const slamScale = t < 2.1 ? 1.3 + (1 - eased) * 0.8 : 1.0;
            ctx.translate(w / 2 + glitchOffsetX, titleY + glitchOffsetY);
            ctx.scale(slamScale, slamScale);
            ctx.translate(-(w / 2), -titleY);

            ctx.font = `900 ${fontSize}px 'Segoe UI', 'Orbitron', monospace`;

            if (glitchIntensity > 0.05) {
                const caOffset = glitchIntensity * 4;
                ctx.globalAlpha = eased * textFade * 0.3;
                ctx.fillStyle = '#ff0000';
                ctx.fillText(displayText, w / 2 - caOffset, titleY);
                ctx.fillStyle = '#0066ff';
                ctx.fillText(displayText, w / 2 + caOffset, titleY);
            }

            ctx.globalAlpha = eased * textFade;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 5;
            ctx.strokeText(displayText, w / 2, titleY);

            ctx.shadowColor = 'rgba(255, 30, 0, 0.9)';
            ctx.shadowBlur = 30 * textFade;
            ctx.fillStyle = '#ff3333';
            ctx.fillText(displayText, w / 2, titleY);

            ctx.shadowBlur = 0;
            ctx.globalAlpha = eased * textFade * 0.3;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(displayText, w / 2, titleY);

            if (eased > 0.5 && t < 5.2) {
                const lineW = w * 0.35 * Math.min(1, (eased - 0.5) * 2);
                const lineAlpha = textFade * (eased - 0.5) * 2;
                ctx.globalAlpha = Math.min(1, lineAlpha) * 0.6;
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 2;
                ctx.shadowColor = 'rgba(255,60,30,0.8)';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(w / 2 - lineW / 2, titleY + fontSize * 0.55);
                ctx.lineTo(w / 2 + lineW / 2, titleY + fontSize * 0.55);
                ctx.stroke();
            }

            ctx.restore();

            if (t > 2.6 && t < 5.2) {
                const subProgress = Math.min(1, (t - 2.6) / 0.5);
                const subFade = t > 4.6 ? Math.max(0, (5.2 - t) / 0.6) : 1;
                const subEased = 1 - Math.pow(1 - subProgress, 3);

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const subY = h * 0.54;
                const subFontSize = Math.min(16, w * 0.038);
                ctx.font = `600 ${subFontSize}px 'Segoe UI', monospace`;
                ctx.globalAlpha = subEased * subFade;
                ctx.fillStyle = '#aa6666';
                ctx.shadowColor = 'rgba(255,50,50,0.4)';
                ctx.shadowBlur = 8;
                const levelData = getLevelData(g.levelManager.currentLevel);
                ctx.fillText(
                    `LEVEL ${g.levelManager.currentLevel} — ${levelData?.name?.toUpperCase() || 'SECTOR ' + g.levelManager.currentLevel}`,
                    w / 2, subY
                );

                if (t > 3.0) {
                    const scoreProg = Math.min(1, (t - 3.0) / 0.4);
                    const scoreEased = 1 - Math.pow(1 - scoreProg, 2);
                    ctx.globalAlpha = scoreEased * subFade;
                    ctx.fillStyle = '#888888';
                    ctx.font = `400 ${Math.min(13, w * 0.03)}px 'Segoe UI', monospace`;
                    ctx.fillText(`SCORE: ${g.scoreManager.score.toLocaleString()}`, w / 2, subY + subFontSize * 1.8);
                }

                ctx.restore();
            }
        }

        if (t > 0.5 && t < 5.5) {
            const frameProg = Math.min(1, (t - 0.5) / 0.5);
            const frameFade = t > 4.8 ? Math.max(0, (5.5 - t) / 0.7) : 1;
            const pulse = 0.5 + 0.5 * Math.sin(t * 4);
            const frameAlpha = frameProg * frameFade * pulse * 0.25;

            ctx.save();
            ctx.strokeStyle = `rgba(255, 30, 0, ${frameAlpha.toFixed(3)})`;
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
            ctx.shadowBlur = 20;
            ctx.strokeRect(6, 6, w - 12, h - 12);
            ctx.restore();
        }

        if (t > 5.0) {
            const blackAlpha = Math.min(1, (t - 5.0) / (dur - 5.0));
            ctx.fillStyle = `rgba(0,0,0,${blackAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }

        if (t < 0.3) {
            const flashAlpha = (1 - t / 0.3) * 0.5;
            ctx.fillStyle = `rgba(255,100,50,${flashAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    reset() {
        this.cinematic = null;
        this.levelIntro = null;
        this.levelOutro = null;
        this._deathCine = null;
        this._cinematicOnComplete = null;
        if (this._cinematicSkipHandler) {
            this.game.canvas.removeEventListener('pointerdown', this._cinematicSkipHandler);
            this._cinematicSkipHandler = null;
        }
    }
}

export default CinematicManager;
