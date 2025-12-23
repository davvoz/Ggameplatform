


import { MultiPartSprite, AnimationBuilder, AnimationClip } from
    './../../sprite-animation-system.js';

export function armored() {
    const sprite = new MultiPartSprite('armored');

    // LEFT LEG (armored, behind body z-order -10)
    const legLeft = sprite.addPart('legLeft', [
        {
            type: 'rect',
            x: -0.05, y: 0.14,
            width: 0.12, height: 0.32,
            color: '#4a4a4a',
            fill: true
        },
        {
            type: 'rect', // Knee plate
            x: -0.06, y: 0.18,
            width: 0.14, height: 0.08,
            color: '#6a6a6a',
            fill: true
        }
    ], 0.5, 0, -10);
    legLeft.setBaseTransform(-0.08, 0.24);

    // RIGHT LEG (armored, behind body z-order -10)
    const legRight = sprite.addPart('legRight', [
        {
            type: 'rect',
            x: -0.05, y: 0.14,
            width: 0.12, height: 0.32,
            color: '#4a4a4a',
            fill: true
        },
        {
            type: 'rect', // Knee plate
            x: -0.06, y: 0.18,
            width: 0.14, height: 0.08,
            color: '#6a6a6a',
            fill: true
        }
    ], 0.5, 0, -10);
    legRight.setBaseTransform(0.08, 0.24);

    // BODY (heavily armored torso, z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'rect',
            x: 0, y: 0,
            width: 0.48, height: 0.48,
            color: '#5a5a5a',
            fill: true
        },
        {
            type: 'rect', // Chest plate
            x: 0.06, y: 0.05,
            width: 0.36, height: 0.20,
            color: '#7a7a7a',
            fill: true
        },
        {
            type: 'rect', // Belt armor
            x: 0.04, y: 0.32,
            width: 0.40, height: 0.10,
            color: '#6a6a6a',
            fill: true
        },
        {
            type: 'polygon', // Center emblem
            points: [
                { x: 0.24, y: 0.10 },
                { x: 0.20, y: 0.18 },
                { x: 0.24, y: 0.22 },
                { x: 0.28, y: 0.18 }
            ],
            color: '#8a8a8a',
            fill: true
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.18);

    // Parent legs to body
    sprite.setParent('legLeft', 'body');
    sprite.setParent('legRight', 'body');

    // SHOULDER PAULDRONS (large armor plates, z-order 5)
    const shoulderLeft = sprite.addPart('shoulderLeft', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.12, y: 0 },
                { x: -0.14, y: 0.10 },
                { x: -0.10, y: 0.16 },
                { x: 0, y: 0.14 }
            ],
            color: '#6a6a6a',
            fill: true
        },
        {
            type: 'rect', // Shoulder rivet
            x: -0.10, y: 0.04,
            width: 0.04, height: 0.04,
            color: '#8a8a8a',
            fill: true
        }
    ], 1, 0.5, 5);
    shoulderLeft.setBaseTransform(-0.20, -0.02);
    sprite.setParent('shoulderLeft', 'body');

    const shoulderRight = sprite.addPart('shoulderRight', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 0.12, y: 0 },
                { x: 0.14, y: 0.10 },
                { x: 0.10, y: 0.16 },
                { x: 0, y: 0.14 }
            ],
            color: '#6a6a6a',
            fill: true
        },
        {
            type: 'rect', // Shoulder rivet
            x: 0.06, y: 0.04,
            width: 0.04, height: 0.04,
            color: '#8a8a8a',
            fill: true
        }
    ], 0, 0.5, 5);
    shoulderRight.setBaseTransform(0.20, -0.02);
    sprite.setParent('shoulderRight', 'body');

    // HEAD (helmet with visor, z-order 10)
    const head = sprite.addPart('head', [
        {
            type: 'rect', // Helmet base
            x: 0, y: 0,
            width: 0.32, height: 0.28,
            color: '#5a5a5a',
            fill: true
        },
        {
            type: 'rect', // Visor slit
            x: 0.04, y: 0.10,
            width: 0.24, height: 0.05,
            color: '#3a7a9a',
            fill: true
        },
        {
            type: 'polygon', // Helmet crest
            points: [
                { x: 0.14, y: 0 },
                { x: 0.16, y: -0.06 },
                { x: 0.18, y: 0 }
            ],
            color: '#7a7a7a',
            fill: true
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.22);
    sprite.setParent('head', 'body');

    // SHIELD (left arm, z-order 15)
    const shield = sprite.addPart('shield', [
        {
            type: 'rect',
            x: 0, y: 0,
            width: 0.14, height: 0.30,
            color: '#6a6a6a',
            fill: true
        },
        {
            type: 'rect', // Shield boss
            x: 0.04, y: 0.10,
            width: 0.06, height: 0.10,
            color: '#8a8a8a',
            fill: true
        }
    ], 0.5, 0.5, 15);
    shield.setBaseTransform(-0.32, 0.08);
    sprite.setParent('shield', 'body');

    // Slow heavy animations (armored units move slower)
    const allParts = ['body', 'head', 'shoulderLeft', 'shoulderRight', 'legLeft', 'legRight', 'shield'];
    const coreParts = ['body', 'head', 'shoulderLeft', 'shoulderRight', 'shield'];
    
    // Custom IDLE animation - heavy breathing, shield ready stance
    const idle = new AnimationClip('idle', 2.5, true);
    idle.addTrack('body', [
        { time: 0, transform: { y: 0, scaleY: 1.0, rotation: 0 } },
        { time: 0.6, transform: { y: -0.02, scaleY: 1.02, rotation: 0.02 } },
        { time: 1.25, transform: { y: -0.03, scaleY: 1.03, rotation: 0 } },
        { time: 1.9, transform: { y: -0.02, scaleY: 1.02, rotation: -0.02 } },
        { time: 2.5, transform: { y: 0, scaleY: 1.0, rotation: 0 } }
    ]);
    idle.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 0.8, transform: { y: -0.01, rotation: 0.06 } },
        { time: 1.6, transform: { y: -0.02, rotation: -0.06 } },
        { time: 2.5, transform: { y: 0, rotation: 0 } }
    ]);
    idle.addTrack('shoulderLeft', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 1.25, transform: { y: -0.02, rotation: -0.05 } },
        { time: 2.5, transform: { y: 0, rotation: 0 } }
    ]);
    idle.addTrack('shoulderRight', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 1.25, transform: { y: -0.02, rotation: 0.05 } },
        { time: 2.5, transform: { y: 0, rotation: 0 } }
    ]);
    idle.addTrack('shield', [
        { time: 0, transform: { x: 0, y: 0, rotation: 0 } },
        { time: 0.5, transform: { x: 0.02, y: -0.01, rotation: 0.08 } },
        { time: 1.25, transform: { x: 0.03, y: 0.02, rotation: 0.1 } },
        { time: 2.0, transform: { x: 0.01, y: -0.01, rotation: 0.05 } },
        { time: 2.5, transform: { x: 0, y: 0, rotation: 0 } }
    ]);
    idle.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.25, transform: { rotation: 0.03 } },
        { time: 2.5, transform: { rotation: 0 } }
    ]);
    idle.addTrack('legRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.25, transform: { rotation: -0.03 } },
        { time: 2.5, transform: { rotation: 0 } }
    ]);
    sprite.addAnimation(idle);

    // Custom WALK animation - heavy stomping
    const walk = new AnimationClip('walk', 0.9, true);
    walk.addTrack('body', [
        { time: 0, transform: { y: 0, rotation: 0.04, scaleY: 1.0 } },
        { time: 0.225, transform: { y: -0.06, rotation: -0.05, scaleY: 0.96 } },
        { time: 0.45, transform: { y: 0, rotation: -0.04, scaleY: 1.0 } },
        { time: 0.675, transform: { y: -0.06, rotation: 0.05, scaleY: 0.96 } },
        { time: 0.9, transform: { y: 0, rotation: 0.04, scaleY: 1.0 } }
    ]);
    walk.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0.05 } },
        { time: 0.225, transform: { y: -0.03, rotation: -0.06 } },
        { time: 0.45, transform: { y: 0.02, rotation: 0 } },
        { time: 0.675, transform: { y: -0.03, rotation: 0.06 } },
        { time: 0.9, transform: { y: 0, rotation: 0.05 } }
    ]);
    walk.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0.5, y: -0.02 } },
        { time: 0.225, transform: { rotation: 0, y: 0 } },
        { time: 0.45, transform: { rotation: -0.5, y: -0.02 } },
        { time: 0.675, transform: { rotation: 0, y: 0 } },
        { time: 0.9, transform: { rotation: 0.5, y: -0.02 } }
    ]);
    walk.addTrack('legRight', [
        { time: 0, transform: { rotation: -0.5, y: -0.02 } },
        { time: 0.225, transform: { rotation: 0, y: 0 } },
        { time: 0.45, transform: { rotation: 0.5, y: -0.02 } },
        { time: 0.675, transform: { rotation: 0, y: 0 } },
        { time: 0.9, transform: { rotation: -0.5, y: -0.02 } }
    ]);
    walk.addTrack('shoulderLeft', [
        { time: 0, transform: { y: 0, rotation: 0.06 } },
        { time: 0.45, transform: { y: -0.03, rotation: -0.06 } },
        { time: 0.9, transform: { y: 0, rotation: 0.06 } }
    ]);
    walk.addTrack('shoulderRight', [
        { time: 0, transform: { y: 0, rotation: -0.06 } },
        { time: 0.45, transform: { y: -0.03, rotation: 0.06 } },
        { time: 0.9, transform: { y: 0, rotation: -0.06 } }
    ]);
    walk.addTrack('shield', [
        { time: 0, transform: { rotation: 0.1, x: 0 } },
        { time: 0.225, transform: { rotation: -0.05, x: 0.02 } },
        { time: 0.45, transform: { rotation: -0.1, x: 0.03 } },
        { time: 0.675, transform: { rotation: 0.05, x: 0.01 } },
        { time: 0.9, transform: { rotation: 0.1, x: 0 } }
    ]);
    sprite.addAnimation(walk);

    // Custom ATTACK animation - shield bash
    const attack = new AnimationClip('attack', 0.8, false);
    attack.addTrack('body', [
        { time: 0, transform: { rotation: 0, x: 0 } },
        { time: 0.2, transform: { rotation: 0.15, x: 0.03 } },
        { time: 0.4, transform: { rotation: -0.2, x: -0.05 } },
        { time: 0.6, transform: { rotation: -0.1, x: -0.02 } },
        { time: 0.8, transform: { rotation: 0, x: 0 } }
    ]);
    attack.addTrack('head', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.2, transform: { rotation: 0.1 } },
        { time: 0.4, transform: { rotation: -0.15 } },
        { time: 0.8, transform: { rotation: 0 } }
    ]);
    attack.addTrack('shield', [
        { time: 0, transform: { rotation: 0, x: 0, scaleX: 1.0 } },
        { time: 0.2, transform: { rotation: 0.3, x: 0.05, scaleX: 0.95 } },
        { time: 0.4, transform: { rotation: -0.4, x: -0.12, scaleX: 1.1 } },
        { time: 0.6, transform: { rotation: -0.2, x: -0.06, scaleX: 1.05 } },
        { time: 0.8, transform: { rotation: 0, x: 0, scaleX: 1.0 } }
    ]);
    attack.addTrack('shoulderLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.2, transform: { rotation: 0.2 } },
        { time: 0.4, transform: { rotation: -0.3 } },
        { time: 0.8, transform: { rotation: 0 } }
    ]);
    attack.addTrack('shoulderRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.4, transform: { rotation: 0.1 } },
        { time: 0.8, transform: { rotation: 0 } }
    ]);
    sprite.addAnimation(attack);

    sprite.addAnimation(AnimationBuilder.createHitAnimation(allParts, 0.3));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(allParts, 1.4));

    return sprite;
}