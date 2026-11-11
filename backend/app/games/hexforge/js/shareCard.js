import { MATERIAL_INFO } from './labels.js';
import { heroThumb } from './thumbs.js';

/**
 * The picture a battle's ping shows (1200 × 630, like the platform's own
 * cards): the battlefield as the replay ended, the verdict, whom it was
 * against, how much fell, the loot and trophies, and the squad.
 */

const W = 1200;
const H = 630;
const PANEL_X = 640;
const GOTHIC = '"Grenze Gotisch", serif';
const SANS = '"Chakra Petch", system-ui, sans-serif';

/** Copy the battlefield now (before anything else draws on it), then paint the card. */
export async function paintBattleCard({ view, won, coreDown, destruction, opponent, pvp, loot, trophies, heroes }) {
    const field = snapshot(view);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    background(ctx, field);
    const accent = won ? '#ffb347' : '#ff5a4a';
    panel(ctx, { won, coreDown, destruction, opponent, pvp, loot, trophies, accent });
    await squad(ctx, heroes);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    return canvas.toDataURL('image/jpeg', 0.86);
}

function snapshot(view) {
    if (!view?.width) return null;
    const copy = document.createElement('canvas');
    copy.width = view.width;
    copy.height = view.height;
    copy.getContext('2d').drawImage(view, 0, 0);
    return copy;
}

function background(ctx, field) {
    ctx.fillStyle = '#120a06';
    ctx.fillRect(0, 0, W, H);
    if (field) {
        // cover the left part with the middle of the battlefield
        const scale = Math.max((PANEL_X + 120) / field.width, H / field.height) * 1.15;
        const w = field.width * scale;
        const h = field.height * scale;
        ctx.drawImage(field, (PANEL_X + 120 - w) / 2, (H - h) / 2, w, h);
    }
    const fade = ctx.createLinearGradient(PANEL_X - 160, 0, PANEL_X + 40, 0);
    fade.addColorStop(0, 'rgba(18, 10, 6, 0)');
    fade.addColorStop(1, 'rgba(18, 10, 6, 0.96)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);
    const bottom = ctx.createLinearGradient(0, H - 190, 0, H);
    bottom.addColorStop(0, 'rgba(10, 5, 3, 0)');
    bottom.addColorStop(1, 'rgba(10, 5, 3, 0.85)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, H - 190, PANEL_X, 190);
}

function panel(ctx, { won, coreDown, destruction, opponent, pvp, loot, trophies, accent }) {
    const x = PANEL_X + 50;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffd9a8';
    ctx.font = `800 40px ${GOTHIC}`;
    ctx.fillText('Hexforge', x, 78);

    ctx.font = `800 96px ${GOTHIC}`;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 26;
    ctx.fillStyle = accent;
    ctx.fillText(won ? 'Victory' : 'Defeat', x, 178);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#c9b39a';
    ctx.font = `700 22px ${SANS}`;
    ctx.fillText(pvp ? 'RAID ON PLAYER' : 'RAID ON OUTPOST', x, 228);
    ctx.fillStyle = '#fff1dc';
    ctx.font = `700 40px ${SANS}`;
    ctx.fillText(fit(ctx, `vs ${opponent}`, W - x - 40), x, 274);

    ctx.font = `800 120px ${SANS}`;
    const gold = ctx.createLinearGradient(0, 300, 0, 410);
    gold.addColorStop(0, '#ffe7b0');
    gold.addColorStop(1, accent);
    ctx.fillStyle = gold;
    ctx.fillText(`${destruction}%`, x - 4, 404);
    ctx.fillStyle = '#c9b39a';
    ctx.font = `700 24px ${SANS}`;
    ctx.fillText(coreDown ? 'DESTROYED · CORE DOWN' : 'DESTROYED · CORE STANDING', x, 444);

    let px = x;
    const gained = Object.entries(loot).filter(([, n]) => n > 0);
    for (const [m, n] of gained) px = pill(ctx, `+${n} ${MATERIAL_INFO[m]?.name ?? m}`, px, 500, MATERIAL_INFO[m]?.color ?? '#ffb347');
    if (trophies) pill(ctx, `${trophies > 0 ? '+' : ''}${trophies} trophies`, gained.length > 2 ? x : px, gained.length > 2 ? 548 : 500, '#ffd75e');
}

function pill(ctx, text, x, y, color) {
    ctx.font = `700 20px ${SANS}`;
    const w = ctx.measureText(text).width + 26;
    if (x + w > W - 30) return x;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y - 26, w, 36, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, x + 13, y);
    return x + w + 10;
}

function fit(ctx, text, width) {
    if (ctx.measureText(text).width <= width) return text;
    let t = text;
    while (t.length > 4 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
    return `${t}…`;
}

async function squad(ctx, heroes) {
    const size = 112;
    const pictures = await Promise.all(heroes.map((h) => load(heroThumb(h.cls, size, h.form ?? null, h.tier ?? 1,
        h.fusion ? { grade: h.grade ?? 1, parts: h.fusion } : null))));
    heroes.forEach((hero, i) => {
        const x = 34 + i * (size + 14);
        const y = H - size - 30;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a100a';
        ctx.fill();
        ctx.clip();
        if (!hero.survived) ctx.filter = 'grayscale(1) brightness(0.55)';
        if (pictures[i]) ctx.drawImage(pictures[i], x, y, size, size);
        ctx.restore();
        ctx.strokeStyle = hero.survived ? '#ffb347' : '#6b5040';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.stroke();
    });
}

function load(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}
