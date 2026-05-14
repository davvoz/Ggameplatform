import { GameConfig } from '../config/GameConfig.js';

/**
 * Pure functions for canvas drawing primitives used by every UI screen.
 * Stateless. Keep this file primitive-only — no state, no event logic.
 *
 * Bitmap font: callers do not need to know about it. Once `setBitmapFont`
 * is invoked at boot, every `text()` call routes through the bitmap font
 * automatically; the `opts.font` "Npx ..." hint is parsed to derive scale,
 * and the legacy default color (GameConfig.COLOR.TEXT) keeps the baked
 * multi-color art. Any other color tints the glyph atlas.
 */

let _bitmapFont = null;

const _PX_RE = /(\d+(?:\.\d+)?)px/;

function _parsePx(fontHint) {
    if (!fontHint) return 18;
    const m = _PX_RE.exec(fontHint);
    return m ? Number.parseFloat(m[1]) : 18;
}

function _bitmapBaselineFromCss(baseline) {
    if (baseline === 'middle' || baseline === 'top') return baseline;
    return 'alphabetic';
}

export function setBitmapFont(font) {
    _bitmapFont = font;
}

export const UIPainter = Object.freeze({
    fillBackground(ctx, color = GameConfig.COLOR.BG) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, GameConfig.VIEW_WIDTH, GameConfig.VIEW_HEIGHT);
    },

    text(ctx, str, x, y, opts = {}) {
        if (_bitmapFont) {
            const px = _parsePx(opts.font);
            const scale = _bitmapFont.scaleForPx(px);
            const explicitColor = opts.color && opts.color !== GameConfig.COLOR.TEXT
                ? opts.color
                : null;
            _bitmapFont.draw(ctx, String(str), x, y, {
                scale,
                color: explicitColor,
                align: opts.align ?? 'left',
                baseline: _bitmapBaselineFromCss(opts.baseline ?? 'alphabetic')
            });
            return;
        }
        ctx.save();
        ctx.fillStyle = opts.color ?? GameConfig.COLOR.TEXT;
        ctx.font = opts.font ?? '18px system-ui';
        ctx.textAlign = opts.align ?? 'left';
        ctx.textBaseline = opts.baseline ?? 'alphabetic';
        ctx.fillText(str, x, y);
        ctx.restore();
    },

    panel(ctx, x, y, w, h, opts = {}) {
        ctx.save();
        ctx.fillStyle = opts.fill ?? 'rgba(20,16,40,0.85)';
        ctx.strokeStyle = opts.stroke ?? 'rgba(255,255,255,0.18)';
        ctx.lineWidth = opts.lineWidth ?? 1;
        const r = opts.radius ?? 8;
        UIPainter._roundRect(ctx, x, y, w, h, r);
        ctx.fill();
        if (opts.strokeAlpha !== 0) ctx.stroke();
        ctx.restore();
    },

    button(ctx, btn) {
        const enabled = btn.enabled !== false;
        const fill = enabled
            ? (btn.fill ?? 'rgba(95,168,255,0.20)')
            : 'rgba(80,80,100,0.30)';
        const stroke = enabled
            ? (btn.stroke ?? GameConfig.COLOR.PLAYER_TINT)
            : 'rgba(140,140,160,0.5)';
        UIPainter.panel(ctx, btn.x, btn.y, btn.w, btn.h, { fill, stroke, radius: btn.radius ?? 10 });
        UIPainter.text(ctx, btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 6, {
            font: btn.font ?? '18px system-ui',
            color: enabled ? GameConfig.COLOR.TEXT : GameConfig.COLOR.TEXT_DIM,
            align: 'center'
        });
        if (btn.subLabel) {
            UIPainter.text(ctx, btn.subLabel, btn.x + btn.w / 2, btn.y + btn.h - 8, {
                font: '11px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center'
            });
        }
    },

    isInside(p, rect) {
        return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
    },

    /**
     * Draw a single sprite frame contained inside a rect, preserving aspect ratio.
     * Returns true if drawn, false when sheet is missing.
     */
    spriteFrame(ctx, sheet, frameIdx, dx, dy, dw, dh) {
        if (!sheet?.image) return false;
        const r = sheet.rect(frameIdx);
        const scale = Math.min(dw / r.sw, dh / r.sh);
        const w = r.sw * scale;
        const h = r.sh * scale;
        const ox = Math.round(dx + (dw - w) / 2);
        const oy = Math.round(dy + (dh - h) / 2);
        ctx.drawImage(sheet.image, r.sx, r.sy, r.sw, r.sh,
                      ox, oy, Math.round(w), Math.round(h));
        return true;
    },

    bar(ctx, rect, ratio, color) {
        const { x, y, w, h } = rect;
        const r = Math.max(0, Math.min(1, ratio));
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = color; ctx.fillRect(x, y, w * r, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    },

    _roundRect(ctx, x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
    }
});
