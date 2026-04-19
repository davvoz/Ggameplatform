import SpritesheetLoader from '../SpritesheetLoader.js';

// ═══════════════════════════════════════════════════
//  WORLD 1 MINI-BOSSES — registry + loader
// ═══════════════════════════════════════════════════
const WORLD1_MINIBOSSES = [
    { id: 1, url: 'assets/spritesheets/miniboss1.png', frames: {
        mboss1_core:  { x: 0,  y: 0, w: 66, h: 66 },
        mboss1_blade: { x: 66, y: 0, w: 32, h: 52 }
    }},
    { id: 2, url: 'assets/spritesheets/miniboss2.png', frames: {
        mboss2_core:   { x: 0,   y: 0, w: 71, h: 71 },
        mboss2_shield: { x: 71,  y: 0, w: 68, h: 24 },
        mboss2_turret: { x: 139, y: 0, w: 32, h: 32 }
    }},
    { id: 3, url: 'assets/spritesheets/miniboss3.png', frames: {
        mboss3_core: { x: 0,  y: 0, w: 66, h: 66 },
        mboss3_orb:  { x: 66, y: 0, w: 28, h: 28 },
        mboss3_tail: { x: 94, y: 0, w: 35, h: 45 }
    }},
    { id: 4, url: 'assets/spritesheets/miniboss4.png', frames: {
        mboss4_core: { x: 0,  y: 0, w: 66, h: 66 },
        mboss4_pod:  { x: 66, y: 0, w: 32, h: 40 }
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

async function generateWorld1MiniBossSprites(sprites) {
    for (const miniboss of WORLD1_MINIBOSSES) {
        await loadMiniBoss(sprites, miniboss);
    }
}

export { generateWorld1MiniBossSprites };
