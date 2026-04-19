import SpritesheetLoader from '../SpritesheetLoader.js';

// ═══════════════════════════════════════════════════
//  WORLD 2 MINI-BOSSES — registry + loader
// ═══════════════════════════════════════════════════
const WORLD2_MINIBOSSES = [
    { id: 5, url: 'assets/spritesheets/miniboss5.png', frames: {
        mboss5_core: { x: 0,  y: 0, w: 71, h: 71 },
        mboss5_vine: { x: 71, y: 0, w: 32, h: 45 }
    }},
    { id: 6, url: 'assets/spritesheets/miniboss6.png', frames: {
        mboss6_core: { x: 0,  y: 0, w: 66, h: 66 },
        mboss6_orb:  { x: 66, y: 0, w: 30, h: 30 }
    }},
    { id: 7, url: 'assets/spritesheets/miniboss7.png', frames: {
        mboss7_core:   { x: 0,   y: 0, w: 76, h: 76 },
        mboss7_shield: { x: 76,  y: 0, w: 73, h: 26 },
        mboss7_turret: { x: 149, y: 0, w: 34, h: 34 }
    }},
    { id: 8, url: 'assets/spritesheets/miniboss8.png', frames: {
        mboss8_core:   { x: 0,   y: 0, w: 71, h: 71 },
        mboss8_claw:   { x: 71,  y: 0, w: 34, h: 42 },
        mboss8_turret: { x: 105, y: 0, w: 32, h: 32 }
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

async function generateWorld2MiniBossSprites(sprites) {
    for (const miniboss of WORLD2_MINIBOSSES) {
        await loadMiniBoss(sprites, miniboss);
    }
}

export { generateWorld2MiniBossSprites };
