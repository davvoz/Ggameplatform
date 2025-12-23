
import { MultiPartSprite, AnimationClip, AnimationBuilder } from
    './../../sprite-animation-system.js';
export function boss() {
    const sprite = new MultiPartSprite('boss');

    // BODY - massive armored torso
    const body = sprite.addPart('body', [
        {
            type: 'polygon',
            points: [
                { x: 0.2, y: 0.08 },
                { x: 0.8, y: 0.08 },
                { x: 0.75, y: 0.52 },
                { x: 0.25, y: 0.52 }
            ],
            color: '#6a3a3a',
            fill: true
        },
        {
            type: 'rect', // Center plate
            x: 0.42, y: 0.15,
            width: 0.16, height: 0.28,
            color: '#8a4a4a',
            fill: true
        },
        {
            type: 'circle', // Core emblem
            x: 0.5, y: 0.28,
            radius: 0.05,
            color: '#ff0000',
            fill: true,
            glow: { color: '#ff0000', blur: 8 }
        },
        {
            type: 'polygon', // Spikes top
            points: [
                { x: 0.28, y: 0.08 },
                { x: 0.32, y: 0.02 },
                { x: 0.36, y: 0.08 }
            ],
            color: '#aa5a5a',
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: 0.46, y: 0.08 },
                { x: 0.5, y: 0.01 },
                { x: 0.54, y: 0.08 }
            ],
            color: '#aa5a5a',
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: 0.64, y: 0.08 },
                { x: 0.68, y: 0.02 },
                { x: 0.72, y: 0.08 }
            ],
            color: '#aa5a5a',
            fill: true
        }
    ], 0.5, 0.5);
    body.setBaseTransform(0, 0.2);

    // SHOULDER ARMOR (huge pauldrons)
    const shoulderLeft = sprite.addPart('shoulderLeft', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.15, y: -0.02 },
                { x: -0.18, y: 0.08 },
                { x: -0.15, y: 0.18 },
                { x: 0, y: 0.16 }
            ],
            color: '#7a4a4a',
            fill: true
        },
        {
            type: 'polygon', // Spike
            points: [
                { x: -0.15, y: -0.02 },
                { x: -0.18, y: -0.08 },
                { x: -0.12, y: 0 }
            ],
            color: '#aa6a6a',
            fill: true
        }
    ], 1, 0.5);
    shoulderLeft.setBaseTransform(-0.08, 0.08);
    sprite.setParent('shoulderLeft', 'body');

    const shoulderRight = sprite.addPart('shoulderRight', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 0.15, y: -0.02 },
                { x: 0.18, y: 0.08 },
                { x: 0.15, y: 0.18 },
                { x: 0, y: 0.16 }
            ],
            color: '#7a4a4a',
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: 0.15, y: -0.02 },
                { x: 0.18, y: -0.08 },
                { x: 0.12, y: 0 }
            ],
            color: '#aa6a6a',
            fill: true
        }
    ], 0, 0.5);
    shoulderRight.setBaseTransform(0.08, 0.08);
    sprite.setParent('shoulderRight', 'body');

    // ARMS with weapons
    const armLeft = sprite.addPart('armLeft', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.08, y: 0 },
                { x: -0.09, y: 0.26 },
                { x: -0.04, y: 0.26 }
            ],
            color: '#5a3a3a',
            fill: true
        },
        {
            type: 'polygon', // Blade weapon
            points: [
                { x: -0.065, y: 0.26 },
                { x: -0.04, y: 0.26 },
                { x: -0.035, y: 0.36 },
                { x: -0.07, y: 0.36 },
                { x: -0.065, y: 0.42 }
            ],
            color: '#cccccc',
            fill: true
        }
    ], 0.5, 0);
    armLeft.setBaseTransform(-0.05, 0.12);
    sprite.setParent('armLeft', 'body');

    const armRight = sprite.addPart('armRight', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 0.08, y: 0 },
                { x: 0.09, y: 0.26 },
                { x: 0.04, y: 0.26 }
            ],
            color: '#5a3a3a',
            fill: true
        },
        {
            type: 'polygon', // Mace weapon
            points: [
                { x: 0.04, y: 0.26 },
                { x: 0.07, y: 0.26 },
                { x: 0.07, y: 0.36 }
            ],
            color: '#888888',
            fill: true
        },
        {
            type: 'circle',
            x: 0.055, y: 0.38,
            radius: 0.03,
            color: '#aaaaaa',
            fill: true
        }
    ], 0.5, 0);
    armRight.setBaseTransform(0.05, 0.12);
    sprite.setParent('armRight', 'body');

    // HEAD with horned helmet
    const head = sprite.addPart('head', [
        {
            type: 'rect',
            x: -0.08, y: 0,
            width: 0.16, height: 0.14,
            color: '#8a5a5a',
            fill: true
        },
        {
            type: 'rect', // Visor
            x: -0.06, y: 0.05,
            width: 0.12, height: 0.03,
            color: '#ff3333',
            fill: true,
            glow: { color: '#ff3333', blur: 6 }
        },
        {
            type: 'polygon', // Left horn
            points: [
                { x: -0.08, y: 0 },
                { x: -0.13, y: -0.12 },
                { x: -0.07, y: 0.02 }
            ],
            color: '#aa6a6a',
            fill: true
        },
        {
            type: 'polygon', // Right horn
            points: [
                { x: 0.08, y: 0 },
                { x: 0.13, y: -0.12 },
                { x: 0.07, y: 0.02 }
            ],
            color: '#aa6a6a',
            fill: true
        }
    ], 0.5, 1);
    head.setBaseTransform(0, -0.03);
    sprite.setParent('head', 'body');

    // LEFT LEG (massive, z-order -10)
    const legLeft = sprite.addPart('legLeft', {
        type: 'polygon',
        points: [
            { x: -0.08, y: 0 },
            { x: 0.08, y: 0 },
            { x: 0.06, y: 0.36 },
            { x: -0.06, y: 0.36 }
        ],
        color: '#5a3a3a',
        fill: true
    }, 0.5, 0, -10);
    legLeft.setBaseTransform(-0.10, 0.22);
    sprite.setParent('legLeft', 'body');

    // RIGHT LEG (z-order -10)
    const legRight = sprite.addPart('legRight', {
        type: 'polygon',
        points: [
            { x: -0.08, y: 0 },
            { x: 0.08, y: 0 },
            { x: 0.06, y: 0.36 },
            { x: -0.06, y: 0.36 }
        ],
        color: '#5a3a3a',
        fill: true
    }, 0.5, 0, -10);
    legRight.setBaseTransform(0.10, 0.22);
    sprite.setParent('legRight', 'body');

    // Heavy walk animation - slow and powerful with legs
    const walk = new AnimationClip('walk', 1.5, true);
    walk.addTrack('body', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 0.375, transform: { y: -0.06, rotation: 0.05 } },
        { time: 0.75, transform: { y: 0, rotation: 0 } },
        { time: 1.125, transform: { y: -0.06, rotation: -0.05 } },
        { time: 1.5, transform: { y: 0, rotation: 0 } }
    ]);
    walk.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0.5, y: -0.04 } },
        { time: 0.375, transform: { rotation: 0, y: 0 } },
        { time: 0.75, transform: { rotation: -0.5, y: -0.04 } },
        { time: 1.125, transform: { rotation: 0, y: 0 } },
        { time: 1.5, transform: { rotation: 0.5, y: -0.04 } }
    ]);
    walk.addTrack('legRight', [
        { time: 0, transform: { rotation: -0.5, y: -0.04 } },
        { time: 0.375, transform: { rotation: 0, y: 0 } },
        { time: 0.75, transform: { rotation: 0.5, y: -0.04 } },
        { time: 1.125, transform: { rotation: 0, y: 0 } },
        { time: 1.5, transform: { rotation: -0.5, y: -0.04 } }
    ]);
    walk.addTrack('shoulderLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.75, transform: { rotation: 0.1 } },
        { time: 1.5, transform: { rotation: 0 } }
    ]);
    walk.addTrack('shoulderRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.75, transform: { rotation: -0.1 } },
        { time: 1.5, transform: { rotation: 0 } }
    ]);
    walk.addTrack('armLeft', [
        { time: 0, transform: { rotation: -0.3 } },
        { time: 0.75, transform: { rotation: 0.3 } },
        { time: 1.5, transform: { rotation: -0.3 } }
    ]);
    walk.addTrack('armRight', [
        { time: 0, transform: { rotation: 0.3 } },
        { time: 0.75, transform: { rotation: -0.3 } },
        { time: 1.5, transform: { rotation: 0.3 } }
    ]);

    sprite.addAnimation(walk);

    // Idle animation for Boss
    const idle = new AnimationClip('idle', 2.0, true);
    idle.addTrack('body', [
        { time: 0, transform: { y: 0 } },
        { time: 1.0, transform: { y: -0.02 } },
        { time: 2.0, transform: { y: 0 } }
    ]);
    idle.addTrack('head', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.0, transform: { rotation: 0.03 } },
        { time: 2.0, transform: { rotation: 0 } }
    ]);
    sprite.addAnimation(idle);

    // Attack animation - powerful swing
    const attack = new AnimationClip('attack', 0.8, false);
    attack.addTrack('armRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.3, transform: { rotation: -0.5 } },
        { time: 0.5, transform: { rotation: 0.3 } },
        { time: 0.8, transform: { rotation: 0 } }
    ]);
    attack.addTrack('armLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.3, transform: { rotation: 0.5 } },
        { time: 0.5, transform: { rotation: -0.3 } },
        { time: 0.8, transform: { rotation: 0 } }
    ]);
    attack.addTrack('body', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.3, transform: { rotation: 0.12 } },
        { time: 0.5, transform: { rotation: -0.08 } },
        { time: 0.8, transform: { rotation: 0 } }
    ]);
    sprite.addAnimation(attack);

    sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head', 'legLeft', 'legRight'], 0.25));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head', 'armLeft', 'armRight', 'legLeft', 'legRight'], 1.5));

    return sprite;
}