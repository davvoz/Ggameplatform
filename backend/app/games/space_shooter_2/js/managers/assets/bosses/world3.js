import SpritesheetLoader from '../SpritesheetLoader.js';

// ═══════════════════════════════════════════════
//  WORLD 3 BOSSES — registry + loader
// ═══════════════════════════════════════════════
const WORLD3_BOSSES = [
    { id: 13, url: 'assets/spritesheets/boss13.png', frames: {
        boss13_core:   { x: 0,   y: 0, w: 95,  h: 95 },
        boss13_turret: { x: 95,  y: 0, w: 44,  h: 44 },
        boss13_shield: { x: 139, y: 0, w: 112, h: 34 },
        boss13_arm:    { x: 251, y: 0, w: 50,  h: 62 }
    }},
    { id: 14, url: 'assets/spritesheets/boss14.png', frames: {
        boss14_core:   { x: 0,   y: 0, w: 100, h: 100 },
        boss14_orb:    { x: 100, y: 0, w: 40,  h: 40 },
        boss14_shield: { x: 140, y: 0, w: 122, h: 36 },
        boss14_arm:    { x: 262, y: 0, w: 52,  h: 67 }
    }},
    { id: 15, url: 'assets/spritesheets/boss15.png', frames: {
        boss15_core:    { x: 0,   y: 0, w: 105, h: 105 },
        boss15_turret:  { x: 105, y: 0, w: 46,  h: 46 },
        boss15_shield:  { x: 151, y: 0, w: 47,  h: 32 },
        boss15_shield2: { x: 198, y: 0, w: 102, h: 34 },
        boss15_arm:     { x: 300, y: 0, w: 54,  h: 70 }
    }},
    { id: 16, url: 'assets/spritesheets/boss16.png', frames: {
        boss16_core:   { x: 0,   y: 0, w: 110, h: 110 },
        boss16_turret: { x: 110, y: 0, w: 48,  h: 48 },
        boss16_orb:    { x: 158, y: 0, w: 40,  h: 40 },
        boss16_shield: { x: 198, y: 0, w: 132, h: 37 },
        boss16_arm:    { x: 330, y: 0, w: 56,  h: 74 }
    }},
    { id: 17, url: 'assets/spritesheets/boss17.png', frames: {
        boss17_core:   { x: 0,   y: 0, w: 112, h: 112 },
        boss17_turret: { x: 112, y: 0, w: 50,  h: 50 },
        boss17_orb:    { x: 162, y: 0, w: 42,  h: 42 },
        boss17_shield: { x: 204, y: 0, w: 137, h: 36 },
        boss17_weak:   { x: 341, y: 0, w: 36,  h: 36 },
        boss17_arm:    { x: 377, y: 0, w: 58,  h: 77 }
    }},
    { id: 18, url: 'assets/spritesheets/boss18.png', frames: {
        boss18_core:    { x: 0,   y: 0, w: 120, h: 120 },
        boss18_turret:  { x: 120, y: 0, w: 52,  h: 52 },
        boss18_orb:     { x: 172, y: 0, w: 44,  h: 44 },
        boss18_shield:  { x: 216, y: 0, w: 152, h: 40 },
        boss18_shield2: { x: 368, y: 0, w: 44,  h: 30 },
        boss18_weak:    { x: 412, y: 0, w: 38,  h: 38 },
        boss18_arm:     { x: 450, y: 0, w: 62,  h: 82 }
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

async function generateWorld3BossSprites(sprites) {
    for (const boss of WORLD3_BOSSES) {
        await loadBoss(sprites, boss);
    }
}

export { generateWorld3BossSprites };


