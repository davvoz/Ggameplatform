
import SpritesheetLoader from '../SpritesheetLoader.js';

// ═══════════════════════════════════════════════════
//  WORLD 4 MINI-BOSSES — registry + loader
// ═══════════════════════════════════════════════════
const WORLD4_MINIBOSSES = [
    { id: 13, url: 'assets/spritesheets/miniboss13.png', frames: {
        mboss13_core: { x: 0,  y: 0, w: 71, h: 71 },
        mboss13_orb:  { x: 71, y: 0, w: 28, h: 28 }
    }},
    { id: 14, url: 'assets/spritesheets/miniboss14.png', frames: {
        mboss14_core:   { x: 0,   y: 0, w: 74, h: 74 },
        mboss14_shield: { x: 74,  y: 0, w: 77, h: 30 },
        mboss14_arm:    { x: 151, y: 0, w: 36, h: 47 }
    }},
    { id: 15, url: 'assets/spritesheets/miniboss15.png', frames: {
        mboss15_core:   { x: 0,   y: 0, w: 66, h: 66 },
        mboss15_shield: { x: 66,  y: 0, w: 42, h: 28 },
        mboss15_turret: { x: 108, y: 0, w: 30, h: 30 }
    }},
    { id: 16, url: 'assets/spritesheets/miniboss16.png', frames: {
        mboss16_core:   { x: 0,   y: 0, w: 71, h: 71 },
        mboss16_pod:    { x: 71,  y: 0, w: 36, h: 46 },
        mboss16_turret: { x: 107, y: 0, w: 28, h: 28 }
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

async function generateWorld4MiniBossSprites(sprites) {
    for (const miniboss of WORLD4_MINIBOSSES) {
        await loadMiniBoss(sprites, miniboss);
    }
}

export { generateWorld4MiniBossSprites };

