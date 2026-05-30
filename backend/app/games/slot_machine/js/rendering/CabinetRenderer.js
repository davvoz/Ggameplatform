/**
 * Draws the slot-machine "cabinet": frame around the reels, top title sign,
 * jackpot ticker panel, LED border, and animated arcade chrome.
 */
import { GameConfig } from '../config/GameConfig.js';

export class CabinetRenderer {
    t = 0;
    _mobile = GameConfig.IS_MOBILE;
    _gradTop = null;
    _gradFrame = null;
    _gradFrameInner = null;
    _gradHud = null;
    _gradButtons = null;

    update(dt) { this.t += dt; }

    render(ctx, runCtx) {
        this._drawTopSign(ctx, runCtx);
        this._drawReelFrame(ctx);
        this._drawHUDPanel(ctx);
        this._drawButtonsPanel(ctx);
        if (!this._mobile) this._drawLEDBorder(ctx);
    }

    _drawTopSign(ctx, _runCtx) {
        const L = GameConfig.LAYOUT;
        const COL = GameConfig.COLOR;
        if (!this._gradTop) {
            const g = ctx.createLinearGradient(0, L.HEADER_Y, 0, L.HEADER_Y + L.HEADER_HEIGHT);
            g.addColorStop(0, '#2a0050');
            g.addColorStop(1, '#0a0020');
            this._gradTop = g;
        }
        ctx.fillStyle = this._gradTop;
        ctx.roundRect(10, L.HEADER_Y + 8, GameConfig.VIEW_WIDTH - 20, L.HEADER_HEIGHT - 16, 14);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = COL.NEON_VIOLET;
        ctx.shadowColor = COL.NEON_VIOLET;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    _drawReelFrame(ctx) {
        const L = GameConfig.LAYOUT;
        const COL = GameConfig.COLOR;
        const x = L.REEL_AREA_X - 14;
        const y = L.REEL_AREA_Y - 14;
        const w = L.REEL_AREA_W + 28;
        const h = L.REEL_AREA_H + 28;
        if (!this._gradFrame) {
            const g = ctx.createLinearGradient(0, y, 0, y + h);
            g.addColorStop(0, '#3a0070');
            g.addColorStop(1, '#1a0040');
            this._gradFrame = g;
        }
        if (!this._gradFrameInner) {
            const ig = ctx.createLinearGradient(0, L.REEL_AREA_Y, 0, L.REEL_AREA_Y + L.REEL_AREA_H);
            ig.addColorStop(0, 'rgba(0,0,0,0.65)');
            ig.addColorStop(0.5, 'rgba(0,0,0,0)');
            ig.addColorStop(1, 'rgba(0,0,0,0.65)');
            this._gradFrameInner = ig;
        }
        ctx.fillStyle = this._gradFrame;
        ctx.roundRect(x, y, w, h, 18);
        ctx.fill();
        // Inner reel window (dark)
        ctx.fillStyle = COL.REEL_BG_TOP;
        ctx.roundRect(L.REEL_AREA_X, L.REEL_AREA_Y, L.REEL_AREA_W, L.REEL_AREA_H, 10);
        ctx.fill();
        // Inner gradient overlay (depth)
        ctx.fillStyle = this._gradFrameInner;
        ctx.fillRect(L.REEL_AREA_X, L.REEL_AREA_Y, L.REEL_AREA_W, L.REEL_AREA_H);
        // Neon frame
        ctx.lineWidth = 3;
        ctx.strokeStyle = COL.NEON_CYAN;
        ctx.shadowColor = COL.NEON_CYAN;
        ctx.shadowBlur = 14;
        ctx.roundRect(L.REEL_AREA_X, L.REEL_AREA_Y, L.REEL_AREA_W, L.REEL_AREA_H, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    _drawHUDPanel(ctx) {
        const L = GameConfig.LAYOUT;
        if (!this._gradHud) {
            const g = ctx.createLinearGradient(0, L.HUD_Y, 0, L.HUD_Y + L.HUD_HEIGHT);
            g.addColorStop(0, '#1a0040');
            g.addColorStop(1, '#0a0020');
            this._gradHud = g;
        }
        ctx.fillStyle = this._gradHud;
        ctx.roundRect(10, L.HUD_Y, GameConfig.VIEW_WIDTH - 20, L.HUD_HEIGHT - 6, 12);
        ctx.fill();
        ctx.strokeStyle = GameConfig.COLOR.NEON_GOLD;
        ctx.shadowColor = GameConfig.COLOR.NEON_GOLD;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    _drawButtonsPanel(ctx) {
        const L = GameConfig.LAYOUT;
        if (!this._gradButtons) {
            const g = ctx.createLinearGradient(0, L.BUTTONS_Y, 0, L.BUTTONS_Y + L.BUTTONS_HEIGHT);
            g.addColorStop(0, '#2a0050');
            g.addColorStop(1, '#0a0010');
            this._gradButtons = g;
        }
        ctx.fillStyle = this._gradButtons;
        ctx.roundRect(10, L.BUTTONS_Y, GameConfig.VIEW_WIDTH - 20, L.BUTTONS_HEIGHT, 14);
        ctx.fill();
    }

    _drawLEDBorder(ctx) {
        const COL = GameConfig.COLOR;
        const W = GameConfig.VIEW_WIDTH, H = GameConfig.VIEW_HEIGHT;
        ctx.save();
        const margin = 4;
        const stepX = 18, stepY = 22;
        const phase = Math.floor(this.t * 6);
        const colors = [COL.NEON_VIOLET, COL.NEON_CYAN, COL.NEON_GOLD, COL.NEON_RED];
        const drawDot = (x, y, idx) => {
            ctx.fillStyle = colors[(idx + phase) % colors.length];
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        };
        let idx = 0;
        for (let x = margin; x < W - margin; x += stepX) drawDot(x, margin, idx++);
        for (let y = margin; y < H - margin; y += stepY) drawDot(W - margin, y, idx++);
        for (let x = W - margin; x > margin; x -= stepX) drawDot(x, H - margin, idx++);
        for (let y = H - margin; y > margin; y -= stepY) drawDot(margin, y, idx++);
        ctx.restore();
    }

}
