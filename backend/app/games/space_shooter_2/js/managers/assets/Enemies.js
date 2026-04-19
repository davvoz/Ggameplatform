import SpritesheetLoader from './SpritesheetLoader.js';

// ================================================================
//  ENEMIES — unified registry (spritesheet + animation metadata)
// ================================================================
const ENEMY_REGISTRY = [
    // ── WORLD 1 ──
    { name: 'scout',           spritesheet: 'assets/spritesheets/enemy_scout.png',           frames: 4, w: 88,  h: 88  },
    { name: 'fighter',         spritesheet: 'assets/spritesheets/enemy_fighter.png',         frames: 4, w: 96,  h: 96  },
    { name: 'swarm',           spritesheet: 'assets/spritesheets/enemy_swarm.png',           frames: 4, w: 76,  h: 76  },
    { name: 'heavy',           spritesheet: 'assets/spritesheets/enemy_heavy.png',           frames: 4, w: 112, h: 112 },
    { name: 'phantom',         spritesheet: 'assets/spritesheets/enemy_phantom.png',         frames: 4, w: 92,  h: 92  },
    { name: 'sentinel',        spritesheet: 'assets/spritesheets/enemy_sentinel.png',        frames: 4, w: 104, h: 104 },
    // ── WORLD 2 ──
    { name: 'stalker',         spritesheet: 'assets/spritesheets/enemy_stalker.png',         frames: 4, w: 90,  h: 90  },
    { name: 'nest',            spritesheet: 'assets/spritesheets/enemy_nest.png',            frames: 4, w: 104, h: 104 },
    { name: 'jungle_vine',     spritesheet: 'assets/spritesheets/enemy_jungle_vine.png',     frames: 4, w: 92,  h: 92  },
    { name: 'lava_golem',      spritesheet: 'assets/spritesheets/enemy_lava_golem.png',      frames: 4, w: 106, h: 106 },
    { name: 'frost_elemental', spritesheet: 'assets/spritesheets/enemy_frost_elemental.png', frames: 4, w: 96,  h: 96  },
    { name: 'sand_wurm',       spritesheet: 'assets/spritesheets/enemy_sand_wurm.png',       frames: 4, w: 108, h: 108 },
    { name: 'mech_drone',      spritesheet: 'assets/spritesheets/enemy_mech_drone.png',      frames: 4, w: 88,  h: 88  },
    { name: 'toxic_blob',      spritesheet: 'assets/spritesheets/enemy_toxic_blob.png',      frames: 4, w: 94,  h: 94  },
    // ── WORLD 3 ──
    { name: 'glitch_drone',    spritesheet: 'assets/spritesheets/enemy_glitch_drone.png',    frames: 4, w: 82,  h: 82  },
    { name: 'data_cube',       spritesheet: 'assets/spritesheets/enemy_data_cube.png',       frames: 4, w: 98,  h: 98  },
    { name: 'fragment_shard',  spritesheet: 'assets/spritesheets/enemy_fragment_shard.png',  frames: 4, w: 90,  h: 90  },
    { name: 'warp_bug',        spritesheet: 'assets/spritesheets/enemy_warp_bug.png',        frames: 4, w: 86,  h: 86  },
    { name: 'error_node',      spritesheet: 'assets/spritesheets/enemy_error_node.png',      frames: 4, w: 106, h: 106 },
    { name: 'mirror_ghost',    spritesheet: 'assets/spritesheets/enemy_mirror_ghost.png',    frames: 4, w: 88,  h: 88  },
    // ── WORLD 4 ──
    { name: 'quark_triplet',   spritesheet: 'assets/spritesheets/enemy_quark_triplet.png',   frames: 6, w: 84,  h: 84  },
    { name: 'neutrino_ghost',  spritesheet: 'assets/spritesheets/enemy_neutrino_ghost.png',  frames: 6, w: 88,  h: 88  },
    { name: 'boson_carrier',   spritesheet: 'assets/spritesheets/enemy_boson_carrier.png',   frames: 6, w: 94,  h: 94  },
    { name: 'higgs_field',     spritesheet: 'assets/spritesheets/enemy_higgs_field.png',     frames: 6, w: 100, h: 100 },
    { name: 'positron_mirror', spritesheet: 'assets/spritesheets/enemy_positron_mirror.png', frames: 6, w: 90,  h: 90  },
    { name: 'gluon_chain',    spritesheet: 'assets/spritesheets/enemy_gluon_chain.png',     frames: 6, w: 82,  h: 82  },
];

function extractAnimatedFrames(image, enemy) {
    const frames = [];
    for (let i = 0; i < enemy.frames; i++) {
        const frame = SpritesheetLoader.extractFrame(image, {
            x: i * enemy.w, y: 0, w: enemy.w, h: enemy.h
        });
        frames.push(frame);
    }
    return frames;
}

function createStaticSprite(image) {
    const cv = document.createElement('canvas');
    cv.width = image.width;
    cv.height = image.height;
    cv.getContext('2d').drawImage(image, 0, 0);
    return cv;
}

function assignSprite(sprites, key, image, enemy) {
    if (enemy.frames > 0) {
        const frames = extractAnimatedFrames(image, enemy);
        sprites[key] = frames[0];
        sprites[key + '_frames'] = frames;
    } else {
        sprites[key] = createStaticSprite(image);
    }
}

async function loadSingleEnemy(sprites, enemy) {
    const key = `enemy_${enemy.name}`;
    try {
        const image = await SpritesheetLoader.loadImage(enemy.spritesheet);
        assignSprite(sprites, key, image, enemy);
    } catch (e) {
        console.warn(`Spritesheet fallback for ${enemy.name}:`, e.message);
    }
}

async function generateEnemySprites(sprites) {
    for (const enemy of ENEMY_REGISTRY) {
        await loadSingleEnemy(sprites, enemy);
    }
}

export { generateEnemySprites };