/**
 * Ping Share Card
 * Paints the picture of a finished game for a ping: 1200 × 630 (the feeds'
 * format), the game's cover framed on the left over a blurred copy of itself,
 * and on the right the game's title, the score, the XP earned and the player.
 * Painted in the browser, posted as a JPEG.
 */

import { getGameResourceUrl } from './api.js';

const WIDTH = 1200;
const HEIGHT = 630;
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const COLORS = {
    background: '#0a0e17',
    primary: '#00d9ff',
    purple: '#b388ff',
    green: '#69f0ae',
    text: '#ffffff',
    muted: '#b4bcd0'
};
const COVER = { x: 56, y: 96, width: 560, height: 420, radius: 24 };
const COLUMN = { x: 664, width: 480 };
const LOGO_URL = '/icons/icon-192x192.png';
const IMAGE_TIMEOUT_MS = 6000;
const JPEG_QUALITY = 0.88;

/**
 * Paint the picture of a game's result
 * @param {Object} card - Card data from the pings preview
 * @returns {Promise<{dataUrl: string, base64: string}>}
 */
export async function paintPingCard(card) {
    const [cover, logo] = await Promise.all([
        loadImage(coverUrlOf(card)),
        loadImage(LOGO_URL)
    ]);

    // A cover from another origin without CORS taints the canvas: paint without it
    try {
        return exportCanvas(draw(card, cover, logo));
    } catch {
        return exportCanvas(draw(card, null, logo));
    }
}

function coverUrlOf(card) {
    if (!card.thumbnail) return null;
    if (card.thumbnail.startsWith('http')) return card.thumbnail;
    return getGameResourceUrl(card.game_id, card.thumbnail);
}

function exportCanvas(canvas) {
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    return { dataUrl, base64: dataUrl.split(',')[1] };
}

function loadImage(url) {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => resolve(null), IMAGE_TIMEOUT_MS);
        img.crossOrigin = 'anonymous';
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = url;
    });
}

function draw(card, cover, logo) {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    drawBackground(ctx, cover);
    drawHeader(ctx, logo);
    drawCover(ctx, cover);
    drawResult(ctx, card);
    drawFooter(ctx, card);
    return canvas;
}

function drawBackground(ctx, cover) {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (cover) {
        ctx.save();
        ctx.filter = 'blur(28px) brightness(0.45) saturate(1.2)';
        drawImageCovering(ctx, cover, -60, -60, WIDTH + 120, HEIGHT + 120);
        ctx.restore();
    } else {
        const glow = ctx.createRadialGradient(300, 300, 40, 300, 300, 700);
        glow.addColorStop(0, 'rgba(179, 136, 255, 0.35)');
        glow.addColorStop(1, 'rgba(10, 14, 23, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    const shade = ctx.createLinearGradient(0, 0, WIDTH, 0);
    shade.addColorStop(0, 'rgba(10, 14, 23, 0.25)');
    shade.addColorStop(0.55, 'rgba(10, 14, 23, 0.7)');
    shade.addColorStop(1, 'rgba(10, 14, 23, 0.9)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawHeader(ctx, logo) {
    let x = COVER.x;
    if (logo) {
        ctx.drawImage(logo, x, 26, 48, 48);
        x += 62;
    }
    ctx.fillStyle = COLORS.text;
    ctx.font = `800 28px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('CUR8 GAMES', x, 51);

    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.primary;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText('📣 PINGS', WIDTH - 56, 51);
    ctx.textAlign = 'left';
}

function drawCover(ctx, cover) {
    const { x, y, width, height, radius } = COVER;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 217, 255, 0.45)';
    ctx.shadowBlur = 40;
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = '#141824';
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedRect(ctx, x, y, width, height, radius);
    ctx.clip();
    if (cover) {
        drawImageCovering(ctx, cover, x, y, width, height);
    } else {
        ctx.fillStyle = COLORS.muted;
        ctx.font = `160px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎮', x + width / 2, y + height / 2);
        ctx.textAlign = 'left';
    }
    ctx.restore();

    ctx.save();
    roundedRect(ctx, x, y, width, height, radius);
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLORS.primary;
    ctx.stroke();
    ctx.restore();
}

function drawResult(ctx, card) {
    const { x, width } = COLUMN;
    ctx.textBaseline = 'alphabetic';

    // Game title, at most two lines
    ctx.fillStyle = COLORS.text;
    ctx.font = `800 46px ${FONT}`;
    const titleLines = wrapText(ctx, card.game_title, width, 2);
    titleLines.forEach((line, index) => ctx.fillText(line, x, 150 + index * 54));
    let y = 150 + (titleLines.length - 1) * 54;

    // Score
    y += 70;
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText('S C O R E', x, y);

    y += 108;
    const score = Number(card.score || 0).toLocaleString('en-US');
    ctx.font = `900 ${fitFontSize(ctx, score, width, 120, 900)}px ${FONT}`;
    const gold = ctx.createLinearGradient(0, y - 100, 0, y);
    gold.addColorStop(0, '#ffe082');
    gold.addColorStop(1, '#ffb300');
    ctx.fillStyle = gold;
    ctx.shadowColor = 'rgba(255, 179, 0, 0.35)';
    ctx.shadowBlur = 24;
    ctx.fillText(score, x, y);
    ctx.shadowBlur = 0;

    // XP and duration
    y += 40;
    let pillX = x;
    pillX = drawPill(ctx, `⭐ +${formatXp(card.xp_earned)} XP`, pillX, y, COLORS.green);
    if (card.duration_seconds > 0) {
        drawPill(ctx, `⏱️ ${formatDuration(card.duration_seconds)}`, pillX + 14, y, COLORS.purple);
    }

    // Player, below the labels however long the title
    ctx.fillStyle = COLORS.primary;
    ctx.font = `700 32px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ellipsize(ctx, `@${card.username}`, width), x, Math.max(500, y + 46 + 48));
}

function drawFooter(ctx, card) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, HEIGHT - 70, WIDTH, 70);

    ctx.fillStyle = COLORS.muted;
    ctx.font = `600 24px ${FONT}`;
    ctx.textBaseline = 'middle';
    const host = (card.platform_url || '').replace(/^https?:\/\//, '');
    ctx.fillText(`Play at ${host}`, COVER.x, HEIGHT - 35);

    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.primary;
    ctx.fillText('#cur8 #pings', WIDTH - 56, HEIGHT - 35);
    ctx.textAlign = 'left';
}

/** A rounded label; returns where it ends */
function drawPill(ctx, text, x, y, color) {
    ctx.font = `700 24px ${FONT}`;
    const width = ctx.measureText(text).width + 36;
    const height = 46;
    roundedRect(ctx, x, y, width, height, height / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 18, y + height / 2 + 1);
    return x + width;
}

function drawImageCovering(ctx, img, x, y, width, height) {
    const scale = Math.max(width / img.width, height / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    ctx.drawImage(img, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}

function fitFontSize(ctx, text, maxWidth, size, weight) {
    let fontSize = size;
    ctx.font = `${weight} ${fontSize}px ${FONT}`;
    while (fontSize > 40 && ctx.measureText(text).width > maxWidth) {
        fontSize -= 4;
        ctx.font = `${weight} ${fontSize}px ${FONT}`;
    }
    return fontSize;
}

function wrapText(ctx, text, maxWidth, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth || !line) {
            line = candidate;
        } else {
            lines.push(line);
            line = word;
        }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines) return lines.map((l) => ellipsize(ctx, l, maxWidth));
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = ellipsize(ctx, `${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, maxWidth);
    return kept;
}

function ellipsize(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
        cut = cut.slice(0, -1);
    }
    return `${cut}…`;
}

function formatXp(xp) {
    return Number((xp || 0).toFixed(2)).toString();
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, '0');
    return minutes > 0 ? `${minutes}m ${secs}s` : `${seconds}s`;
}
