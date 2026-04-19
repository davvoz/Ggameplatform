import SpritesheetLoader from '../SpritesheetLoader.js';

// ═══════════════════════════════════════════════
//  WORLD 2 BOSSES — registry + loader
// ═══════════════════════════════════════════════
const WORLD2_BOSSES = [
    { id: 7, url: 'assets/spritesheets/boss7.png', frames: {
        boss7_core:   { x: 0,   y: 0, w: 105, h: 105 },
        boss7_turret: { x: 105, y: 0, w: 44,  h: 44 },
        boss7_arm:    { x: 149, y: 0, w: 52,  h: 67 },
        boss7_shield: { x: 201, y: 0, w: 102, h: 34 }
    }},
    { id: 8, url: 'assets/spritesheets/boss8.png', frames: {
        boss8_core:   { x: 0,   y: 0, w: 110, h: 110 },
        boss8_turret: { x: 110, y: 0, w: 47,  h: 47 },
        boss8_orb:    { x: 157, y: 0, w: 40,  h: 40 },
        boss8_arm:    { x: 197, y: 0, w: 57,  h: 72 },
        boss8_shield: { x: 254, y: 0, w: 122, h: 37 }
    }},
    { id: 9, url: 'assets/spritesheets/boss9.png', frames: {
        boss9_core:   { x: 0,   y: 0, w: 100, h: 100 },
        boss9_orb:    { x: 100, y: 0, w: 38,  h: 38 },
        boss9_shield: { x: 138, y: 0, w: 47,  h: 30 },
        boss9_arm:    { x: 185, y: 0, w: 50,  h: 62 }
    }},
    { id: 10, url: 'assets/spritesheets/boss10.png', frames: {
        boss10_core:   { x: 0,   y: 0, w: 105, h: 105 },
        boss10_turret: { x: 105, y: 0, w: 47,  h: 47 },
        boss10_orb:    { x: 152, y: 0, w: 42,  h: 42 },
        boss10_weak:   { x: 194, y: 0, w: 36,  h: 36 },
        boss10_arm:    { x: 230, y: 0, w: 54,  h: 72 }
    }},
    { id: 11, url: 'assets/spritesheets/boss11.png', frames: {
        boss11_core:    { x: 0,   y: 0, w: 110, h: 110 },
        boss11_turret:  { x: 110, y: 0, w: 47,  h: 47 },
        boss11_turret2: { x: 157, y: 0, w: 40,  h: 40 },
        boss11_shield:  { x: 197, y: 0, w: 142, h: 37 },
        boss11_shield2: { x: 339, y: 0, w: 42,  h: 30 },
        boss11_arm:     { x: 381, y: 0, w: 57,  h: 77 }
    }},
    { id: 12, url: 'assets/spritesheets/boss12.png', frames: {
        boss12_core:   { x: 0,   y: 0, w: 115, h: 115 },
        boss12_turret: { x: 115, y: 0, w: 50,  h: 50 },
        boss12_orb:    { x: 165, y: 0, w: 42,  h: 42 },
        boss12_shield: { x: 207, y: 0, w: 142, h: 40 },
        boss12_weak:   { x: 349, y: 0, w: 36,  h: 36 },
        boss12_arm:    { x: 385, y: 0, w: 60,  h: 80 }
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

async function generateWorld2BossSprites(sprites) {
    for (const boss of WORLD2_BOSSES) {
        await loadBoss(sprites, boss);
    }
}

export { generateWorld2BossSprites };
