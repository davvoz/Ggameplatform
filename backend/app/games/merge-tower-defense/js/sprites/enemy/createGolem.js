import { MultiPartSprite, AnimationBuilder, AnimationClip } from
    './../../sprite-animation-system.js';

export function golem() {
    const sprite = new MultiPartSprite('golem');

    // LEFT LEG (chunky rock leg, z-order -10)
    const legLeft = sprite.addPart('legLeft', {
        type: 'ellipse',
        x: 0, y: 0.12,
        width: 0.10, height: 0.24,
        color: '#8b6914',
        fill: true
    }, 0.5, 0, -10);
    legLeft.setBaseTransform(-0.06, 0.22);

    // RIGHT LEG (z-order -10)
    const legRight = sprite.addPart('legRight', {
        type: 'ellipse',
        x: 0, y: 0.12,
        width: 0.10, height: 0.24,
        color: '#8b6914',
        fill: true
    }, 0.5, 0, -10);
    legRight.setBaseTransform(0.06, 0.22);

    // BODY (round rock body with glowing core, z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'ellipse', // Main body - earthy brown
            x: 0, y: 0.05,
            width: 0.3, height: 0.42,
            color: '#665b43ff',
            fill: true
        },
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.08);

    // Parent legs to body
    sprite.setParent('legLeft', 'body');
    sprite.setParent('legRight', 'body');

    // LEFT ARM (rocky arm, z-order 5)
    const armLeft = sprite.addPart('armLeft', [
        {
            type: 'ellipse',
            x: 0, y: 0.12,
            width: 0.10, height: 0.22,
            color: '#9a7018',
            fill: true
        },
        {
            type: 'circle', // Fist
            x: 0, y: 0.24,
            radius: 0.055,
            color: '#8b6514',
            fill: true
        }
    ], 0.5, 0, 5);
    armLeft.setBaseTransform(-0.18, 0.02);
    sprite.setParent('armLeft', 'body');

    // RIGHT ARM (z-order 5)
    const armRight = sprite.addPart('armRight', [
        {
            type: 'ellipse',
            x: 0, y: 0.12,
            width: 0.10, height: 0.22,
            color: '#9a7018',
            fill: true
        },
        {
            type: 'circle', // Fist
            x: 0, y: 0.24,
            radius: 0.055,
            color: '#8b6514',
            fill: true
        }
    ], 0.5, 0, 5);
    armRight.setBaseTransform(0.18, 0.02);
    sprite.setParent('armRight', 'body');

    // HEAD (round rock head with glowing eyes, z-order 10)
    const head = sprite.addPart('head', [
        {
            type: 'circle', // Rock head
            x: 0, y: 0,
            radius: 0.12,
            color: '#b08828',
            fill: true
        },
        {
            type: 'circle', // Left eye glow
            x: -0.045, y: 0,
            radius: 0.025,
            color: '#301301ff',
            fill: true,
            glow: { color: '#ff4400', blur: 6 }
        },
        {
            type: 'circle', // Right eye glow
            x: 0.045, y: 0,
            radius: 0.025,
            color: '#301301ff',
            fill: true,
            glow: { color: '#ff4400', blur: 6 }
        },
        {
            type: 'ellipse', // Brow ridge
            x: 0, y: -0.04,
            width: 0.18, height: 0.06,
            color: '#9a7820',
            fill: true
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.18);
    sprite.setParent('head', 'body');

    // Parts groups
    const allParts = ['body', 'head', 'legLeft', 'legRight', 'armLeft', 'armRight'];

    // Custom IDLE animation - slow, heavy breathing
    const idle = new AnimationClip('idle', 2.5, true);
    idle.addTrack('body', [
        { time: 0, transform: { y: 0, scaleY: 1.0 } },
        { time: 0.625, transform: { y: -0.01, scaleY: 1.02 } },
        { time: 1.25, transform: { y: -0.015, scaleY: 1.03 } },
        { time: 1.875, transform: { y: -0.01, scaleY: 1.02 } },
        { time: 2.5, transform: { y: 0, scaleY: 1.0 } }
    ]);
    idle.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 0.8, transform: { y: -0.01, rotation: 0.04 } },
        { time: 1.6, transform: { y: -0.01, rotation: -0.04 } },
        { time: 2.5, transform: { y: 0, rotation: 0 } }
    ]);
    idle.addTrack('armLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.25, transform: { rotation: -0.05 } },
        { time: 2.5, transform: { rotation: 0 } }
    ]);
    idle.addTrack('armRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.25, transform: { rotation: 0.05 } },
        { time: 2.5, transform: { rotation: 0 } }
    ]);
    idle.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.25, transform: { rotation: 0.02 } },
        { time: 2.5, transform: { rotation: 0 } }
    ]);
    idle.addTrack('legRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.25, transform: { rotation: -0.02 } },
        { time: 2.5, transform: { rotation: 0 } }
    ]);
    sprite.addAnimation(idle);

    // Custom WALK animation - heavy stomping
    const walk = new AnimationClip('walk', 0.9, true);
    walk.addTrack('body', [
        { time: 0, transform: { y: 0, rotation: 0.04 } },
        { time: 0.225, transform: { y: -0.03, rotation: -0.02 } },
        { time: 0.45, transform: { y: 0, rotation: -0.04 } },
        { time: 0.675, transform: { y: -0.03, rotation: 0.02 } },
        { time: 0.9, transform: { y: 0, rotation: 0.04 } }
    ]);
    walk.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0.05 } },
        { time: 0.225, transform: { y: -0.02, rotation: -0.04 } },
        { time: 0.45, transform: { y: 0.01, rotation: -0.05 } },
        { time: 0.675, transform: { y: -0.02, rotation: 0.04 } },
        { time: 0.9, transform: { y: 0, rotation: 0.05 } }
    ]);
    walk.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0.35, y: -0.02 } },
        { time: 0.225, transform: { rotation: 0, y: 0 } },
        { time: 0.45, transform: { rotation: -0.35, y: -0.02 } },
        { time: 0.675, transform: { rotation: 0, y: 0 } },
        { time: 0.9, transform: { rotation: 0.35, y: -0.02 } }
    ]);
    walk.addTrack('legRight', [
        { time: 0, transform: { rotation: -0.35, y: -0.02 } },
        { time: 0.225, transform: { rotation: 0, y: 0 } },
        { time: 0.45, transform: { rotation: 0.35, y: -0.02 } },
        { time: 0.675, transform: { rotation: 0, y: 0 } },
        { time: 0.9, transform: { rotation: -0.35, y: -0.02 } }
    ]);
    walk.addTrack('armLeft', [
        { time: 0, transform: { rotation: -0.2, y: 0 } },
        { time: 0.225, transform: { rotation: 0.12, y: -0.01 } },
        { time: 0.45, transform: { rotation: 0.2, y: 0 } },
        { time: 0.675, transform: { rotation: -0.12, y: -0.01 } },
        { time: 0.9, transform: { rotation: -0.2, y: 0 } }
    ]);
    walk.addTrack('armRight', [
        { time: 0, transform: { rotation: 0.2, y: 0 } },
        { time: 0.225, transform: { rotation: -0.12, y: -0.01 } },
        { time: 0.45, transform: { rotation: -0.2, y: 0 } },
        { time: 0.675, transform: { rotation: 0.12, y: -0.01 } },
        { time: 0.9, transform: { rotation: 0.2, y: 0 } }
    ]);
    sprite.addAnimation(walk);

    // Custom ATTACK animation - slow powerful slam (like healer)
    const attack = new AnimationClip('attack', 1.2, false);
    attack.addTrack('body', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.4, transform: { rotation: -0.1, y: -0.04 } },
        { time: 0.8, transform: { rotation: 0.12, y: 0.02 } },
        { time: 1.2, transform: { rotation: 0, y: 0 } }
    ]);
    attack.addTrack('head', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.4, transform: { rotation: -0.15, y: -0.02 } },
        { time: 0.8, transform: { rotation: 0.18, y: 0.03 } },
        { time: 1.2, transform: { rotation: 0, y: 0 } }
    ]);
    attack.addTrack('armLeft', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.4, transform: { rotation: -0.7, y: -0.06 } },
        { time: 0.8, transform: { rotation: 0.4, y: 0.04 } },
        { time: 1.2, transform: { rotation: 0, y: 0 } }
    ]);
    attack.addTrack('armRight', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.4, transform: { rotation: 0.7, y: -0.06 } },
        { time: 0.8, transform: { rotation: -0.4, y: 0.04 } },
        { time: 1.2, transform: { rotation: 0, y: 0 } }
    ]);
    sprite.addAnimation(attack);

    // SMASH animation - slow ground pound special (like healer)
    const smash = new AnimationClip('smash', 1.5, false);
    smash.addTrack('body', [
        { time: 0, transform: { rotation: 0, y: 0, scaleY: 1.0 } },
        { time: 0.5, transform: { rotation: 0, y: -0.08, scaleY: 1.1 } },
        { time: 0.9, transform: { rotation: 0, y: 0.04, scaleY: 0.88 } },
        { time: 1.5, transform: { rotation: 0, y: 0, scaleY: 1.0 } }
    ]);
    smash.addTrack('head', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.5, transform: { rotation: -0.12, y: -0.04 } },
        { time: 0.9, transform: { rotation: 0.15, y: 0.05 } },
        { time: 1.5, transform: { rotation: 0, y: 0 } }
    ]);
    smash.addTrack('armLeft', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.5, transform: { rotation: -1.0, y: -0.10 } },
        { time: 0.9, transform: { rotation: 0.35, y: 0.08 } },
        { time: 1.5, transform: { rotation: 0, y: 0 } }
    ]);
    smash.addTrack('armRight', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.5, transform: { rotation: 1.0, y: -0.10 } },
        { time: 0.9, transform: { rotation: -0.35, y: 0.08 } },
        { time: 1.5, transform: { rotation: 0, y: 0 } }
    ]);
    smash.addTrack('legLeft', [
        { time: 0, transform: { scaleX: 1.0 } },
        { time: 0.9, transform: { scaleX: 1.12 } },
        { time: 1.5, transform: { scaleX: 1.0 } }
    ]);
    smash.addTrack('legRight', [
        { time: 0, transform: { scaleX: 1.0 } },
        { time: 0.9, transform: { scaleX: 1.12 } },
        { time: 1.5, transform: { scaleX: 1.0 } }
    ]);
    sprite.addAnimation(smash);

    // HIT and DEATH animations
    sprite.addAnimation(AnimationBuilder.createHitAnimation(allParts, 0.25));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(allParts, 1.2));

    return sprite;
}
