/**
 * LevelIntroCinematic — Warp-in + Level name display.
 *
 * Boss-level detection is data-driven (checks LevelData.boss field).
 */
import CinematicScene from './CinematicScene.js';
import { easeOut } from './CinematicUtils.js';
import { getLevelData } from '../../LevelData.js';
import { title } from '../../FontConfig.js';

export default class LevelIntroCinematic extends CinematicScene {

    setup() {
        const g = this.game;
        const w = g.logicalWidth;
        const h = g.logicalHeight;
        const level = g.levelManager.currentLevel;
        const levelData = getLevelData(level);

        this.duration = 3.5;
        this.levelNum = level;
        this.levelName = levelData ? levelData.name : `Sector ${level}`;
        this.isBossLevel = !!(levelData && levelData.boss);

        // Warp stars
        this.warpStars = [];
        for (let i = 0; i < 80; i++) {
            this.warpStars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                z: Math.random() * 1.5 + 0.5,
                len: Math.random() * 60 + 40,
                brightness: Math.random() * 0.6 + 0.4
            });
        }

        // Scan lines
        this.scanLines = [];
        for (let i = 0; i < 4; i++) {
            this.scanLines.push({
                y: Math.random() * h,
                speed: (Math.random() * 120 + 60) * (Math.random() < 0.5 ? 1 : -1),
                alpha: Math.random() * 0.15 + 0.05,
                width: Math.random() * 2 + 1
            });
        }
    }

    onUpdate(dt) {
        const g = this.game;
        const w = g.logicalWidth;
        const h = g.logicalHeight;

        for (const s of this.warpStars) {
            s.y += s.z * 900 * dt;
            if (s.y > h + s.len) { s.y = -s.len; s.x = Math.random() * w; }
        }

        for (const sl of this.scanLines) {
            sl.y += sl.speed * dt;
            if (sl.y > h) sl.y = -2;
            if (sl.y < -2) sl.y = h;
        }
    }

    onRender(ctx, w, h) {
        const t = this.timer;
        const dur = this.duration;

        const warpEnd = 0.8;
        const titleStart = 0.6;
        const titleFullAt = 1.1;
        const fadeStart = 2.6;

        // Warp streaks
        const warpIntensity = t < warpEnd
            ? Math.min(1, t / 0.3)
            : Math.max(0, 1 - (t - warpEnd) / 0.6);

        if (warpIntensity > 0) {
            ctx.save();
            for (const s of this.warpStars) {
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

        // Vignette
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

        // Scan lines
        ctx.save();
        for (const sl of this.scanLines) {
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

        // Horizontal lines
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
            ctx.beginPath(); ctx.moveTo(lcx - lineW / 2, h * 0.28); ctx.lineTo(lcx + lineW / 2, h * 0.28); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lcx - lineW / 2, h * 0.62); ctx.lineTo(lcx + lineW / 2, h * 0.62); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Title
        if (t > titleStart) {
            const titleProgress = Math.min(1, (t - titleStart) / (titleFullAt - titleStart));
            const titleFade = t > fadeStart ? Math.max(0, 1 - (t - fadeStart) / (dur - fadeStart)) : 1;
            const eased = 1 - Math.pow(1 - titleProgress, 3);

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const levelLabel = `LEVEL ${this.levelNum}`;
            const slideX = w / 2 + (1 - eased) * (-w * 0.4);
            const mainY = h * 0.38;

            ctx.shadowColor = 'rgba(0,180,255,0.9)';
            ctx.shadowBlur = 25 * titleFade;

            const fontSize = Math.min(42, w * 0.09);
            ctx.font = title(fontSize, 'bold');
            ctx.fillStyle = `rgba(255,255,255,${(titleFade * eased).toFixed(3)})`;
            ctx.fillText(levelLabel, slideX, mainY);

            // Level name
            const nameDelay = 0.2;
            if (t > titleStart + nameDelay) {
                const nameProgress = Math.min(1, (t - titleStart - nameDelay) / 0.5);
                const nameEased = 1 - Math.pow(1 - nameProgress, 3);
                const nameSlideX = w / 2 + (1 - nameEased) * (w * 0.3);
                const nameY = h * 0.46;

                ctx.shadowColor = this.isBossLevel ? 'rgba(255,60,60,0.8)' : 'rgba(0,255,180,0.6)';
                ctx.shadowBlur = 15 * titleFade;

                const nameFontSize = Math.min(22, w * 0.05);
                ctx.font = title(nameFontSize, 600);
                const nameColor = this.isBossLevel
                    ? `rgba(255,120,100,${(titleFade * nameEased).toFixed(3)})`
                    : `rgba(120,255,200,${(titleFade * nameEased).toFixed(3)})`;
                ctx.fillStyle = nameColor;
                ctx.fillText(`» ${this.levelName.toUpperCase()} «`, nameSlideX, nameY);
            }

            // Boss warning
            if (this.isBossLevel && t > titleStart + 0.5) {
                const warnProg = Math.min(1, (t - titleStart - 0.5) / 0.4);
                const warnEased = 1 - Math.pow(1 - warnProg, 2);
                const pulse = 0.7 + Math.sin(t * 6) * 0.3;
                const warnY = h * 0.54;
                ctx.shadowColor = 'rgba(255,30,30,0.9)';
                ctx.shadowBlur = 20 * titleFade;
                const warnFontSize = Math.min(16, w * 0.035);
                ctx.font = title(warnFontSize, 'bold');
                ctx.fillStyle = `rgba(255,80,60,${(titleFade * warnEased * pulse).toFixed(3)})`;
                ctx.fillText('⚠ BOSS SECTOR ⚠', w / 2, warnY);
            }

            // Corner brackets
            if (eased > 0.5) {
                const bracketAlpha = titleFade * Math.min(1, (eased - 0.5) * 2);
                ctx.strokeStyle = `rgba(0,180,255,${(bracketAlpha * 0.5).toFixed(3)})`;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 0;
                const bSize = 20;
                const pad = w * 0.12;
                const top = h * 0.30;
                const bottom = h * 0.60;
                ctx.beginPath(); ctx.moveTo(pad, top + bSize); ctx.lineTo(pad, top); ctx.lineTo(pad + bSize, top); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(w - pad, top + bSize); ctx.lineTo(w - pad, top); ctx.lineTo(w - pad - bSize, top); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(pad, bottom - bSize); ctx.lineTo(pad, bottom); ctx.lineTo(pad + bSize, bottom); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(w - pad, bottom - bSize); ctx.lineTo(w - pad, bottom); ctx.lineTo(w - pad - bSize, bottom); ctx.stroke();
            }

            ctx.restore();
        }

        // Transition flash
        if (t > fadeStart) {
            const flashProg = (t - fadeStart) / (dur - fadeStart);
            const flashAlpha = flashProg < 0.3 ? flashProg / 0.3 * 0.15 : 0.15 * (1 - (flashProg - 0.3) / 0.7);
            if (flashAlpha > 0.005) {
                ctx.fillStyle = `rgba(180,220,255,${flashAlpha.toFixed(3)})`;
                ctx.fillRect(0, 0, w, h);
            }
        }
    }
}
