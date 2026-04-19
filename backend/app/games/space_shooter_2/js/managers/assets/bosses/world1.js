import SpritesheetLoader from '../SpritesheetLoader.js';

// ═══════════════════════════════════════════════
//  WORLD 1 BOSSES — registry + loader
// ═══════════════════════════════════════════════
const WORLD1_BOSSES = [
    { id: 1, url: 'assets/spritesheets/boss1.png', frames: {
        boss1_core:   { x: 0,   y: 0, w: 90,  h: 90 },
        boss1_turret: { x: 90,  y: 0, w: 42,  h: 42 },
        boss1_arm:    { x: 132, y: 0, w: 47,  h: 57 }
    }},
    { id: 2, url: 'assets/spritesheets/boss2.png', frames: {
        boss2_core:   { x: 0,   y: 0, w: 100, h: 100 },
        boss2_shield: { x: 100, y: 0, w: 108, h: 33 },
        boss2_turret: { x: 208, y: 0, w: 47,  h: 47 },
        boss2_arm:    { x: 255, y: 0, w: 52,  h: 67 }
    }},
    { id: 3, url: 'assets/spritesheets/boss3.png', frames: {
        boss3_core: { x: 0,   y: 0, w: 95, h: 95 },
        boss3_orb:  { x: 95,  y: 0, w: 40, h: 40 },
        boss3_arm:  { x: 135, y: 0, w: 47, h: 62 }
    }},
    { id: 4, url: 'assets/spritesheets/boss4.png', frames: {
        boss4_core:   { x: 0,   y: 0, w: 105, h: 105 },
        boss4_weak:   { x: 105, y: 0, w: 37,  h: 37 },
        boss4_turret: { x: 142, y: 0, w: 47,  h: 47 },
        boss4_shield: { x: 189, y: 0, w: 48,  h: 28 },
        boss4_arm:    { x: 237, y: 0, w: 52,  h: 72 }
    }},
    { id: 5, url: 'assets/spritesheets/boss5.png', frames: {
        boss5_core: { x: 0,   y: 0, w: 90, h: 90 },
        boss5_orb:  { x: 90,  y: 0, w: 42, h: 42 },
        boss5_arm:  { x: 132, y: 0, w: 42, h: 52 }
    }},
    { id: 6, url: 'assets/spritesheets/boss6.png', frames: {
        boss6_core:   { x: 0,   y: 0, w: 110, h: 110 },
        boss6_turret: { x: 110, y: 0, w: 47,  h: 47 },
        boss6_orb:    { x: 157, y: 0, w: 40,  h: 40 },
        boss6_shield: { x: 197, y: 0, w: 128, h: 33 },
        boss6_weak:   { x: 325, y: 0, w: 34,  h: 34 },
        boss6_arm:    { x: 359, y: 0, w: 57,  h: 77 }
    }}
];

async function loadBoss(sprites, boss) {
    try {
        const loaded = await SpritesheetLoader.loadFrames(boss.url, boss.frames);
        Object.assign(sprites, loaded);
    } catch {
        console.warn(`Boss${boss.id} spritesheet failed to load`);
    }
}

async function generateWorld1BossSprites(sprites) {
    for (const boss of WORLD1_BOSSES) {
        await loadBoss(sprites, boss);
    }
}

export { generateWorld1BossSprites };



