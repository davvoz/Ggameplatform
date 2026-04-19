import SpritesheetLoader from '../SpritesheetLoader.js';

// ═══════════════════════════════════════════════════
//  WORLD 3 MINI-BOSSES — registry + loader
// ═══════════════════════════════════════════════════
const WORLD3_MINIBOSSES = [
    { id: 9, url: 'assets/spritesheets/miniboss9.png', frames: {
        mboss9_core:   { x: 0,   y: 0, w: 71, h: 71 },
        mboss9_blade:  { x: 71,  y: 0, w: 32, h: 45 },
        mboss9_turret: { x: 103, y: 0, w: 30, h: 30 }
    }},
    { id: 10, url: 'assets/spritesheets/miniboss10.png', frames: {
        mboss10_core:   { x: 0,   y: 0, w: 76, h: 76 },
        mboss10_shield: { x: 76,  y: 0, w: 82, h: 30 },
        mboss10_turret: { x: 158, y: 0, w: 34, h: 34 }
    }},
    { id: 11, url: 'assets/spritesheets/miniboss11.png', frames: {
        mboss11_core: { x: 0,  y: 0, w: 66, h: 66 },
        mboss11_orb:  { x: 66, y: 0, w: 30, h: 30 }
    }},
    { id: 12, url: 'assets/spritesheets/miniboss12.png', frames: {
        mboss12_core:   { x: 0,   y: 0, w: 71, h: 71 },
        mboss12_arm:    { x: 71,  y: 0, w: 34, h: 44 },
        mboss12_shield: { x: 105, y: 0, w: 72, h: 28 }
    }}
];

async function loadMiniBoss(sprites, miniboss) {
    try {
        const loaded = await SpritesheetLoader.loadFrames(miniboss.url, miniboss.frames);
        Object.assign(sprites, loaded);
    } catch {
        console.warn(`MiniBoss${miniboss.id} spritesheet failed to load`);
    }
}

async function generateWorld3MiniBossSprites(sprites) {
    for (const miniboss of WORLD3_MINIBOSSES) {
        await loadMiniBoss(sprites, miniboss);
    }
}

export { generateWorld3MiniBossSprites };