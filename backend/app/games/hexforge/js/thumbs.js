import { drawBuilding, drawHero } from './forgeArt.js';
import { BUILDING_INFO, FORM_INFO, HERO_INFO, ITEM_INFO } from './labels.js';

/**
 * Small pictures of buildings and heroes, painted with the game's own art
 * (so the forge shows exactly what you will get). Cached as data URLs.
 */

const cache = new Map();
const SIZES = { core: 3, wall: 1 };

function paint(size, draw) {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas');
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    draw(ctx);
    return canvas.toDataURL();
}

/** Picture of a building type, `px` CSS pixels square. */
export function buildingThumb(type, px = 64) {
    const key = `b:${type}:${px}`;
    if (!cache.has(key)) {
        const cells = SIZES[type] ?? (type === 'rune_trap' ? 1 : 2);
        const info = BUILDING_INFO[type];
        // footprint is cells*64 wide and cells*32 tall, plus the silhouette above it
        const scale = Math.min((px * 0.92) / (cells * 64), (px * 0.92) / (cells * 32 + info.pick + 6));
        const height = (cells * 32 + info.pick) * scale;
        const camera = { scale, ox: px / 2, oy: (px - height) / 2 + info.pick * scale };
        cache.set(key, paint(px, (ctx) => {
            if (type === 'rune_trap') {
                trapIcon(ctx, px);
                return;
            }
            drawBuilding(ctx, camera, { id: 1, type, x: 0, y: 0, size: cells }, { time: 1.3, firing: 0, health: 1 });
        }));
    }
    return cache.get(key);
}

/** Portrait of a hero class (evolved into `form` at `tier`, if given), `px` CSS pixels square. */
export function heroThumb(cls, px = 56, form = null, tier = 1) {
    const evolved = form && tier > 1;
    const key = `h:${cls}:${px}:${evolved ? `${form}${tier}` : ''}`;
    if (!cache.has(key)) {
        cache.set(key, paint(px, (ctx) => {
            const s = (px / 48) * (evolved ? 0.9 - 0.06 * (tier - 2) : 1);     // room for the taller evolved gear
            const tint = evolved ? FORM_INFO[form].accent : HERO_INFO[cls].color;
            const glow = ctx.createRadialGradient(px / 2, px * 0.6, 2, px / 2, px * 0.6, px * 0.5);
            glow.addColorStop(0, `${tint}55`);
            glow.addColorStop(1, `${tint}00`);
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, px, px);
            const hero = { cls, id: 0, facing: 1, form: evolved ? form : null, tier: evolved ? tier : 1 };
            drawHero(ctx, hero, px / 2 - 3 * s, px * (evolved ? 0.95 : 0.92), s, HERO_INFO[cls].color, 0.6);
        }));
    }
    return cache.get(key);
}

/** The portrait of one owned hero, as it is now. */
export function heroPortrait(hero, px = 56) {
    return heroThumb(hero.cls, px, hero.form ?? null, hero.tier ?? 1);
}

/**
 * Picture of a hero item: its icon (from the page's SVG sprite) glowing on a
 * forged-iron disc in the item's colour, as an SVG data URL.
 */
export function itemPicture(type, px = 64) {
    const key = `i:${type}:${px}`;
    if (!cache.has(key)) {
        const info = ITEM_INFO[type];
        const symbol = document.getElementById(`i-${info.icon}`);
        const shape = symbol ? symbol.innerHTML : '';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 48 48">`
            + '<defs><radialGradient id="g" cx="50%" cy="40%" r="60%">'
            + `<stop offset="0" stop-color="${info.color}" stop-opacity="0.55"/>`
            + '<stop offset="0.6" stop-color="#2c1d13"/><stop offset="1" stop-color="#120a06"/></radialGradient></defs>'
            + `<circle cx="24" cy="24" r="22" fill="url(#g)" stroke="${info.color}" stroke-width="2"/>`
            + `<g transform="translate(10 10) scale(1.17)" fill="none" stroke="#fff6e8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${shape}</g>`
            + `<g transform="translate(10 10) scale(1.17)" fill="none" stroke="${info.color}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">${shape}</g>`
            + '</svg>';
        cache.set(key, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    }
    return cache.get(key);
}

function trapIcon(ctx, px) {
    const c = px / 2;
    ctx.strokeStyle = '#ff7a3d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(c, c * 1.15, px * 0.36, px * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(c, c * 1.15, px * 0.2, px * 0.1, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffb347';
    ctx.font = `700 ${Math.round(px * 0.3)}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ᛟ', c, c * 1.0);
}

export function thumbImg(src, className = 'thumb', alt = '') {
    const img = document.createElement('img');
    img.className = className;
    img.src = src;
    img.alt = alt;
    img.decoding = 'async';
    return img;
}
