import SpritesheetLoader from '../SpritesheetLoader.js';

// ═══════════════════════════════════════════════
//  WORLD 4 BOSSES — registry + loader
// ═══════════════════════════════════════════════
const WORLD4_BOSSES = [
    { id: 19, url: 'assets/spritesheets/boss19.png', frames: {
        boss19_core_r: { x: 0,   y: 0, w: 60,  h: 68 },
        boss19_core_g: { x: 60,  y: 0, w: 60,  h: 68 },
        boss19_core_b: { x: 120, y: 0, w: 60,  h: 68 },
        boss19_gluon:  { x: 180, y: 0, w: 30,  h: 68 },
        boss19_arm:    { x: 210, y: 0, w: 50,  h: 68 }
    }},
    { id: 20, url: 'assets/spritesheets/boss20.png', frames: {
        boss20_core:   { x: 0,   y: 0, w: 100, h: 100 },
        boss20_em:     { x: 100, y: 0, w: 42,  h: 100 },
        boss20_weak:   { x: 142, y: 0, w: 44,  h: 100 },
        boss20_shield: { x: 186, y: 0, w: 122, h: 100 },
        boss20_arm:    { x: 308, y: 0, w: 54,  h: 100 }
    }},
    { id: 21, url: 'assets/spritesheets/boss21.png', frames: {
        boss21_core:   { x: 0,   y: 0, w: 105, h: 105 },
        boss21_charge: { x: 105, y: 0, w: 34,  h: 105 },
        boss21_arm:    { x: 139, y: 0, w: 56,  h: 105 }
    }},
    { id: 22, url: 'assets/spritesheets/boss22.png', frames: {
        boss22_core:   { x: 0,   y: 0, w: 110, h: 110 },
        boss22_well:   { x: 110, y: 0, w: 46,  h: 110 },
        boss22_weak:   { x: 156, y: 0, w: 38,  h: 110 },
        boss22_shield: { x: 194, y: 0, w: 132, h: 110 },
        boss22_arm:    { x: 326, y: 0, w: 60,  h: 110 }
    }},
    { id: 23, url: 'assets/spritesheets/boss23.png', frames: {
        boss23_matter:   { x: 0,   y: 0, w: 75,  h: 78 },
        boss23_anti:     { x: 75,  y: 0, w: 75,  h: 78 },
        boss23_turret_m: { x: 150, y: 0, w: 40,  h: 78 },
        boss23_turret_a: { x: 190, y: 0, w: 40,  h: 78 },
        boss23_shield:   { x: 230, y: 0, w: 142, h: 78 },
        boss23_arm:      { x: 372, y: 0, w: 58,  h: 78 }
    }},
    { id: 24, url: 'assets/spritesheets/boss24.png', frames: {
        boss24_core:      { x: 0,   y: 0, w: 120, h: 120 },
        boss24_gravity:   { x: 120, y: 0, w: 44,  h: 120 },
        boss24_em:        { x: 164, y: 0, w: 44,  h: 120 },
        boss24_weak:      { x: 208, y: 0, w: 44,  h: 120 },
        boss24_strong:    { x: 252, y: 0, w: 44,  h: 120 },
        boss24_inner:     { x: 296, y: 0, w: 36,  h: 120 },
        boss24_shield:    { x: 332, y: 0, w: 152, h: 120 },
        boss24_shield2:   { x: 484, y: 0, w: 48,  h: 120 },
        boss24_weakpoint: { x: 532, y: 0, w: 40,  h: 120 },
        boss24_arm:       { x: 572, y: 0, w: 64,  h: 120 }
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

async function generateWorld4BossSprites(sprites) {
    for (const boss of WORLD4_BOSSES) {
        await loadBoss(sprites, boss);
    }
}

export { generateWorld4BossSprites };



