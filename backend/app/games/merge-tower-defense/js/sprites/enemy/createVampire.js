import { MultiPartSprite, AnimationBuilder, AnimationClip } from
    './../../sprite-animation-system.js';

export function vampire() {
    const sprite = new MultiPartSprite('vampire');

    // LEFT LEG (thin and elegant, behind body z-order -10)
    const legLeft = sprite.addPart('legLeft', {
        type: 'ellipse',
        x: 0, y: 0.16,
        width: 0.10, height: 0.32,
        color: '#1a1a2a',
        fill: true
    }, 0.5, 0, -10);
    legLeft.setBaseTransform(-0.07, 0.24);

    // RIGHT LEG (behind body z-order -10)
    const legRight = sprite.addPart('legRight', {
        type: 'ellipse',
        x: 0, y: 0.16,
        width: 0.10, height: 0.32,
        color: '#1a1a2a',
        fill: true
    }, 0.5, 0, -10);
    legRight.setBaseTransform(0.07, 0.24);

    // CAPE BACK (behind body, z-order -5)
    const capeBack = sprite.addPart('capeBack', {
        type: 'polygon',
        points: [
            { x: 0.3, y: 0 },
            { x: 0.7, y: 0 },
            { x: 0.75, y: 0.5 },
            { x: 0.5, y: 0.55 },
            { x: 0.25, y: 0.5 }
        ],
        color: '#2a0a1a',
        fill: true
    }, 0.5, 0, -5);
    capeBack.setBaseTransform(0, 0.1);

    // BODY (elegant torso, z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'ellipse',
            x: 0.25, y: 0,
            width: 0.42, height: 0.55,
            color: '#3a1a2a',
            fill: true
        },
        {
            type: 'polygon', // Vest/collar detail
            points: [
                { x: 0.42, y: 0.05 },
                { x: 0.5, y: 0.15 },
                { x: 0.58, y: 0.05 },
                { x: 0.58, y: 0.35 },
                { x: 0.42, y: 0.35 }
            ],
            color: '#5a1a3a',
            fill: true
        },
        {
            type: 'circle', // Brooch
            x: 0.5, y: 0.12,
            radius: 0.03,
            color: '#ff2222',
            fill: true,
            glow: { color: '#ff0000', blur: 4 }
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.18);

    // Parent legs to body
    sprite.setParent('legLeft', 'body');
    sprite.setParent('legRight', 'body');
    sprite.setParent('capeBack', 'body');

    // CAPE LEFT (z-order 5)
    const capeLeft = sprite.addPart('capeLeft', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: -0.08, y: 0.02 },
            { x: -0.12, y: 0.35 },
            { x: -0.02, y: 0.30 }
        ],
        color: '#4a0a2a',
        fill: true
    }, 1, 0, 5);
    capeLeft.setBaseTransform(-0.18, 0.02);
    sprite.setParent('capeLeft', 'body');

    // CAPE RIGHT (z-order 5)
    const capeRight = sprite.addPart('capeRight', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: 0.08, y: 0.02 },
            { x: 0.12, y: 0.35 },
            { x: 0.02, y: 0.30 }
        ],
        color: '#4a0a2a',
        fill: true
    }, 0, 0, 5);
    capeRight.setBaseTransform(0.18, 0.02);
    sprite.setParent('capeRight', 'body');

    // HEAD (pale vampire face, z-order 10)
    const head = sprite.addPart('head', [
        {
            type: 'ellipse', // Face
            x: 0, y: 0,
            width: 0.22, height: 0.26,
            color: '#d0c0c8',
            fill: true
        },
        {
            type: 'ellipse', // Hair
            x: 0, y: -0.10,
            width: 0.26, height: 0.14,
            color: '#1a0a1a',
            fill: true
        },
        {
            type: 'circle', // Left eye
            x: -0.05, y: 0,
            radius: 0.03,
            color: '#ff0000',
            fill: true,
            glow: { color: '#ff0000', blur: 3 }
        },
        {
            type: 'circle', // Right eye
            x: 0.05, y: 0,
            radius: 0.03,
            color: '#ff0000',
            fill: true,
            glow: { color: '#ff0000', blur: 3 }
        },
        {
            type: 'polygon', // Left fang
            points: [
                { x: -0.03, y: 0.08 },
                { x: -0.02, y: 0.14 },
                { x: -0.01, y: 0.08 }
            ],
            color: '#ffffff',
            fill: true
        },
        {
            type: 'polygon', // Right fang
            points: [
                { x: 0.03, y: 0.08 },
                { x: 0.02, y: 0.14 },
                { x: 0.01, y: 0.08 }
            ],
            color: '#ffffff',
            fill: true
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.20);
    sprite.setParent('head', 'body');

    // Animations
    const allParts = ['body', 'head', 'capeLeft', 'capeRight', 'capeBack', 'legLeft', 'legRight'];
    const upperParts = ['body', 'head', 'capeLeft', 'capeRight'];

    // Custom IDLE animation with cape flutter - more dramatic
    const idle = new AnimationClip('idle', 2.0, true);
    idle.addTrack('body', [
        { time: 0, transform: { y: 0, scaleY: 1.0, rotation: 0 } },
        { time: 0.5, transform: { y: -0.03, scaleY: 1.02, rotation: 0.02 } },
        { time: 1.0, transform: { y: -0.05, scaleY: 1.04, rotation: 0 } },
        { time: 1.5, transform: { y: -0.03, scaleY: 1.02, rotation: -0.02 } },
        { time: 2.0, transform: { y: 0, scaleY: 1.0, rotation: 0 } }
    ]);
    idle.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 0.5, transform: { y: -0.02, rotation: 0.08 } },
        { time: 1.0, transform: { y: -0.04, rotation: 0 } },
        { time: 1.5, transform: { y: -0.02, rotation: -0.08 } },
        { time: 2.0, transform: { y: 0, rotation: 0 } }
    ]);
    idle.addTrack('capeLeft', [
        { time: 0, transform: { rotation: 0, x: 0, scaleY: 1.0 } },
        { time: 0.4, transform: { rotation: -0.15, x: -0.03, scaleY: 1.05 } },
        { time: 0.8, transform: { rotation: 0.1, x: 0.02, scaleY: 0.98 } },
        { time: 1.2, transform: { rotation: -0.2, x: -0.04, scaleY: 1.08 } },
        { time: 1.6, transform: { rotation: 0.05, x: 0.01, scaleY: 1.0 } },
        { time: 2.0, transform: { rotation: 0, x: 0, scaleY: 1.0 } }
    ]);
    idle.addTrack('capeRight', [
        { time: 0, transform: { rotation: 0, x: 0, scaleY: 1.0 } },
        { time: 0.4, transform: { rotation: 0.15, x: 0.03, scaleY: 1.05 } },
        { time: 0.8, transform: { rotation: -0.1, x: -0.02, scaleY: 0.98 } },
        { time: 1.2, transform: { rotation: 0.2, x: 0.04, scaleY: 1.08 } },
        { time: 1.6, transform: { rotation: -0.05, x: -0.01, scaleY: 1.0 } },
        { time: 2.0, transform: { rotation: 0, x: 0, scaleY: 1.0 } }
    ]);
    idle.addTrack('capeBack', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.5, transform: { scaleX: 1.08, scaleY: 1.03 } },
        { time: 1.0, transform: { scaleX: 1.12, scaleY: 1.06 } },
        { time: 1.5, transform: { scaleX: 1.06, scaleY: 1.02 } },
        { time: 2.0, transform: { scaleX: 1.0, scaleY: 1.0 } }
    ]);
    idle.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.0, transform: { rotation: 0.05 } },
        { time: 2.0, transform: { rotation: 0 } }
    ]);
    idle.addTrack('legRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.0, transform: { rotation: -0.05 } },
        { time: 2.0, transform: { rotation: 0 } }
    ]);
    sprite.addAnimation(idle);

    // Custom WALK animation with cape billowing
    const walk = new AnimationClip('walk', 0.6, true);
    walk.addTrack('body', [
        { time: 0, transform: { y: 0, rotation: 0.05, scaleY: 1.0 } },
        { time: 0.15, transform: { y: -0.06, rotation: -0.06, scaleY: 0.96 } },
        { time: 0.3, transform: { y: 0, rotation: -0.05, scaleY: 1.0 } },
        { time: 0.45, transform: { y: -0.06, rotation: 0.06, scaleY: 0.96 } },
        { time: 0.6, transform: { y: 0, rotation: 0.05, scaleY: 1.0 } }
    ]);
    walk.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0.06 } },
        { time: 0.15, transform: { y: -0.04, rotation: -0.08 } },
        { time: 0.3, transform: { y: 0.02, rotation: 0 } },
        { time: 0.45, transform: { y: -0.04, rotation: 0.08 } },
        { time: 0.6, transform: { y: 0, rotation: 0.06 } }
    ]);
    walk.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0.5, y: -0.02 } },
        { time: 0.15, transform: { rotation: 0, y: 0 } },
        { time: 0.3, transform: { rotation: -0.5, y: -0.02 } },
        { time: 0.45, transform: { rotation: 0, y: 0 } },
        { time: 0.6, transform: { rotation: 0.5, y: -0.02 } }
    ]);
    walk.addTrack('legRight', [
        { time: 0, transform: { rotation: -0.5, y: -0.02 } },
        { time: 0.15, transform: { rotation: 0, y: 0 } },
        { time: 0.3, transform: { rotation: 0.5, y: -0.02 } },
        { time: 0.45, transform: { rotation: 0, y: 0 } },
        { time: 0.6, transform: { rotation: -0.5, y: -0.02 } }
    ]);
    walk.addTrack('capeLeft', [
        { time: 0, transform: { rotation: 0.15, x: 0.02 } },
        { time: 0.15, transform: { rotation: -0.2, x: -0.03 } },
        { time: 0.3, transform: { rotation: 0.1, x: 0.01 } },
        { time: 0.45, transform: { rotation: -0.15, x: -0.02 } },
        { time: 0.6, transform: { rotation: 0.15, x: 0.02 } }
    ]);
    walk.addTrack('capeRight', [
        { time: 0, transform: { rotation: -0.15, x: -0.02 } },
        { time: 0.15, transform: { rotation: 0.2, x: 0.03 } },
        { time: 0.3, transform: { rotation: -0.1, x: -0.01 } },
        { time: 0.45, transform: { rotation: 0.15, x: 0.02 } },
        { time: 0.6, transform: { rotation: -0.15, x: -0.02 } }
    ]);
    walk.addTrack('capeBack', [
        { time: 0, transform: { scaleX: 1.0, y: 0 } },
        { time: 0.3, transform: { scaleX: 1.1, y: -0.02 } },
        { time: 0.6, transform: { scaleX: 1.0, y: 0 } }
    ]);
    sprite.addAnimation(walk);

    // Custom ATTACK animation with cape dramatic sweep
    const attack = new AnimationClip('attack', 0.5, false);
    attack.addTrack('body', [
        { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
        { time: 0.15, transform: { rotation: -0.2, scaleX: 0.95 } },
        { time: 0.3, transform: { rotation: 0.25, scaleX: 1.1 } },
        { time: 0.5, transform: { rotation: 0, scaleX: 1.0 } }
    ]);
    attack.addTrack('head', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.15, transform: { rotation: -0.15, y: -0.02 } },
        { time: 0.3, transform: { rotation: 0.2, y: 0.03 } },
        { time: 0.5, transform: { rotation: 0, y: 0 } }
    ]);
    attack.addTrack('capeLeft', [
        { time: 0, transform: { rotation: 0, x: 0 } },
        { time: 0.15, transform: { rotation: 0.3, x: 0.04 } },
        { time: 0.3, transform: { rotation: -0.4, x: -0.06 } },
        { time: 0.5, transform: { rotation: 0, x: 0 } }
    ]);
    attack.addTrack('capeRight', [
        { time: 0, transform: { rotation: 0, x: 0 } },
        { time: 0.15, transform: { rotation: -0.3, x: -0.04 } },
        { time: 0.3, transform: { rotation: 0.4, x: 0.06 } },
        { time: 0.5, transform: { rotation: 0, x: 0 } }
    ]);
    sprite.addAnimation(attack);

    // DRAIN animation - vampire life steal at wall
    const drain = new AnimationClip('drain', 0.8, false);
    drain.addTrack('body', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.2, transform: { rotation: -0.1, y: -0.03 } },
        { time: 0.5, transform: { rotation: 0.05, y: 0.02 } },
        { time: 0.8, transform: { rotation: 0, y: 0 } }
    ]);
    drain.addTrack('head', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.2, transform: { rotation: -0.2, y: 0.04 } },
        { time: 0.5, transform: { rotation: 0.1, y: 0.06 } },
        { time: 0.8, transform: { rotation: 0, y: 0 } }
    ]);
    drain.addTrack('capeLeft', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 0.2, transform: { rotation: -0.4, scaleY: 1.1 } },
        { time: 0.5, transform: { rotation: -0.2, scaleY: 1.15 } },
        { time: 0.8, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    drain.addTrack('capeRight', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 0.2, transform: { rotation: 0.4, scaleY: 1.1 } },
        { time: 0.5, transform: { rotation: 0.2, scaleY: 1.15 } },
        { time: 0.8, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    drain.addTrack('capeBack', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.3, transform: { scaleX: 1.15, scaleY: 1.1 } },
        { time: 0.6, transform: { scaleX: 1.1, scaleY: 1.05 } },
        { time: 0.8, transform: { scaleX: 1.0, scaleY: 1.0 } }
    ]);
    sprite.addAnimation(drain);

    sprite.addAnimation(AnimationBuilder.createHitAnimation(allParts, 0.25));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(allParts, 1.2));

    return sprite;
}