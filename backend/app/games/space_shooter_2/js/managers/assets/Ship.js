import SpritesheetLoader from './SpritesheetLoader.js';

// ================================================================
//  PLAYER SHIPS  (128×128 canvas, drawn big and cartoon-like)
// ================================================================

// ── Vanguard banking spritesheet: 5 frames × 128px ──
const VANGUARD_BANK_URL = 'assets/spritesheets/ship_vanguard_bank.png';
const VANGUARD_BANK_SIZE = 128;
const VANGUARD_BANK_COUNT = 5;

// ── Striker banking spritesheet: 5 frames × 128px ──
const STRIKER_BANK_URL = 'assets/spritesheets/ship_striker_bank.png';
const STRIKER_BANK_SIZE = 128;
const STRIKER_BANK_COUNT = 5;

// ── Interceptor banking spritesheet: 5 frames × 128px ──
const INTERCEPTOR_BANK_URL = 'assets/spritesheets/ship_interceptor_bank.png';
const INTERCEPTOR_BANK_SIZE = 128;
const INTERCEPTOR_BANK_COUNT = 5;

// ── Fortress banking spritesheet: 5 frames × 128px ──
const FORTRESS_BANK_URL = 'assets/spritesheets/ship_fortress_bank.png';
const FORTRESS_BANK_SIZE = 128;
const FORTRESS_BANK_COUNT = 5;

// ── Titan banking spritesheet: 5 frames × 128px ──
const TITAN_BANK_URL = 'assets/spritesheets/ship_titan_bank.png';
const TITAN_BANK_SIZE = 128;
const TITAN_BANK_COUNT = 5;

const BANK_CENTER_FRAME = 2;

const SHIP_BANKS = [
    { name: 'vanguard',    url: VANGUARD_BANK_URL,    size: VANGUARD_BANK_SIZE,    count: VANGUARD_BANK_COUNT },
    { name: 'striker',     url: STRIKER_BANK_URL,      size: STRIKER_BANK_SIZE,     count: STRIKER_BANK_COUNT },
    { name: 'interceptor', url: INTERCEPTOR_BANK_URL,  size: INTERCEPTOR_BANK_SIZE, count: INTERCEPTOR_BANK_COUNT },
    { name: 'fortress',    url: FORTRESS_BANK_URL,     size: FORTRESS_BANK_SIZE,    count: FORTRESS_BANK_COUNT },
    { name: 'titan',       url: TITAN_BANK_URL,        size: TITAN_BANK_SIZE,       count: TITAN_BANK_COUNT },
];

async function generateShipSprites(sprites) {
    for (const { name, url, size, count } of SHIP_BANKS) {
        try {
            const frameDefs = {};
            for (let i = 0; i < count; i++) {
                frameDefs[`_bank_${i}`] = { x: i * size, y: 0, w: size, h: size };
            }
            const loaded = await SpritesheetLoader.loadFrames(url, frameDefs);
            const frames = Array.from({ length: count }, (_, i) => loaded[`_bank_${i}`]);
            sprites[`ship_${name}_bank`] = frames;
            sprites[`ship_${name}`] = frames[BANK_CENTER_FRAME];
        } catch {
            console.warn(`${name} banking spritesheet failed to load`);
        }
    }
}


export { generateShipSprites };   