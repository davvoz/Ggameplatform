import { MultiPartSprite, AnimationBuilder, AnimationClip } from
    './../../sprite-animation-system.js';

export function siren() {
    const sprite = new MultiPartSprite('siren');

    // TAIL (mermaid-like tail, behind body, z-order -15)
    const tail = sprite.addPart('tail', [
        {
            type: 'ellipse',
            x: 0, y: 0.15,
            width: 0.18, height: 0.40,
            color: '#2a8a9a',
            fill: true
        },
        {
            type: 'polygon', // Tail fin
            points: [
                { x: 0, y: 0.35 },
                { x: -0.12, y: 0.50 },
                { x: 0, y: 0.45 },
                { x: 0.12, y: 0.50 }
            ],
            color: '#1a7a8a',
            fill: true
        }
    ], 0.5, 0, -15);
    tail.setBaseTransform(0, 0.25);

    // BODY (elegant torso, z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'ellipse',
            x: 0.25, y: 0,
            width: 0, height: 0.45,
            color: '#7ac0d0',
            fill: true
        },
        {
            type: 'ellipse', // Scale pattern
            x: 0.25, y: 0.15,
            width: 0, height: 0.28,
            color: '#5ab0c0',
            fill: true
        },
        {
            type: 'circle', // Jewel ornament
            x: 0, y: 0.08,
            radius: 0.035,
            color: '#ff66aa',
            fill: true,
            glow: { color: '#ff66aa', blur: 6 }
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.12);

    // Parent tail to body
    sprite.setParent('tail', 'body');

    // LEFT FIN (wing-like, z-order -5)
    const finLeft = sprite.addPart('finLeft', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: -0.15, y: 0.05 },
            { x: -0.20, y: 0.25 },
            { x: -0.08, y: 0.20 },
            { x: 0, y: 0.12 }
        ],
        color: '#4aaaba',
        fill: true
    }, 1, 0, -5);
    finLeft.setBaseTransform(-0.16, 0.02);
    sprite.setParent('finLeft', 'body');

    // RIGHT FIN (wing-like, z-order -5)
    const finRight = sprite.addPart('finRight', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: 0.15, y: 0.05 },
            { x: 0.20, y: 0.25 },
            { x: 0.08, y: 0.20 },
            { x: 0, y: 0.12 }
        ],
        color: '#4aaaba',
        fill: true
    }, 0, 0, -5);
    finRight.setBaseTransform(0.16, 0.02);
    sprite.setParent('finRight', 'body');

    // HEAD (beautiful siren face, z-order 10)
    const head = sprite.addPart('head', [
        {
            type: 'ellipse', // Face
            x: 0, y: 0,
            width: 0.24, height: 0.28,
            color: '#9ad0e0',
            fill: true
        },
        {
            type: 'ellipse', // Hair flowing left
            x: -0.10, y: -0.02,
            width: 0.16, height: 0.22,
            color: '#2080a0',
            fill: true
        },
        {
            type: 'ellipse', // Hair flowing right
            x: 0.10, y: -0.02,
            width: 0.16, height: 0.22,
            color: '#2080a0',
            fill: true
        },
        {
            type: 'ellipse', // Hair top
            x: 0, y: -0.10,
            width: 0.28, height: 0.14,
            color: '#1a70a0',
            fill: true
        },
        {
            type: 'circle', // Left eye
            x: -0.05, y: 0.02,
            radius: 0.028,
            color: '#ff44cc',
            fill: true,
            glow: { color: '#ff44cc', blur: 5 }
        },
        {
            type: 'circle', // Right eye
            x: 0.05, y: 0.02,
            radius: 0.028,
            color: '#ff44cc',
            fill: true,
            glow: { color: '#ff44cc', blur: 5 }
        },
        {
            type: 'ellipse', // Lips
            x: 0, y: 0.10,
            width: 0.08, height: 0.04,
            color: '#ff6688',
            fill: true
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.22);
    sprite.setParent('head', 'body');

    // HAIR STRANDS (flowing, z-order 15)
    const hairLeft = sprite.addPart('hairLeft', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: -0.06, y: 0.10 },
            { x: -0.10, y: 0.28 },
            { x: -0.04, y: 0.22 },
            { x: 0, y: 0.08 }
        ],
        color: '#1a70a0',
        fill: true
    }, 1, 0, 15);
    hairLeft.setBaseTransform(-0.12, -0.06);
    sprite.setParent('hairLeft', 'head');

    const hairRight = sprite.addPart('hairRight', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: 0.06, y: 0.10 },
            { x: 0.10, y: 0.28 },
            { x: 0.04, y: 0.22 },
            { x: 0, y: 0.08 }
        ],
        color: '#1a70a0',
        fill: true
    }, 0, 0, 15);
    hairRight.setBaseTransform(0.12, -0.06);
    sprite.setParent('hairRight', 'head');

    // CHARM AURA (magical particles, z-order 20)
    const aura1 = sprite.addPart('aura1', {
        type: 'circle',
        x: 0, y: 0,
        radius: 0.02,
        color: '#ff66cc',
        fill: true,
        glow: { color: '#ff66cc', blur: 6 }
    }, 0.5, 0.5, 20);
    aura1.setBaseTransform(-0.20, 0.0);

    const aura2 = sprite.addPart('aura2', {
        type: 'circle',
        x: 0, y: 0,
        radius: 0.02,
        color: '#ff88dd',
        fill: true,
        glow: { color: '#ff88dd', blur: 6 }
    }, 0.5, 0.5, 20);
    aura2.setBaseTransform(0.20, 0.05);

    const aura3 = sprite.addPart('aura3', {
        type: 'circle',
        x: 0, y: 0,
        radius: 0.015,
        color: '#ffaaee',
        fill: true,
        glow: { color: '#ffaaee', blur: 5 }
    }, 0.5, 0.5, 20);
    aura3.setBaseTransform(0, -0.20);

    // Parts groups
    const allParts = ['body', 'head', 'tail', 'finLeft', 'finRight', 'hairLeft', 'hairRight', 'aura1', 'aura2', 'aura3'];
    const bodyParts = ['body', 'head', 'tail', 'finLeft', 'finRight', 'hairLeft', 'hairRight'];

    // Custom IDLE animation - floating elegantly with hair flowing
    const idle = new AnimationClip('idle', 2.5, true);
    idle.addTrack('body', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 0.625, transform: { y: -0.04, rotation: 0.03 } },
        { time: 1.25, transform: { y: -0.06, rotation: 0 } },
        { time: 1.875, transform: { y: -0.04, rotation: -0.03 } },
        { time: 2.5, transform: { y: 0, rotation: 0 } }
    ]);
    idle.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 0.625, transform: { y: -0.02, rotation: 0.06 } },
        { time: 1.25, transform: { y: -0.03, rotation: 0 } },
        { time: 1.875, transform: { y: -0.02, rotation: -0.06 } },
        { time: 2.5, transform: { y: 0, rotation: 0 } }
    ]);
    idle.addTrack('tail', [
        { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
        { time: 0.625, transform: { rotation: 0.15, scaleX: 0.95 } },
        { time: 1.25, transform: { rotation: 0, scaleX: 1.0 } },
        { time: 1.875, transform: { rotation: -0.15, scaleX: 0.95 } },
        { time: 2.5, transform: { rotation: 0, scaleX: 1.0 } }
    ]);
    idle.addTrack('finLeft', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.5, transform: { rotation: -0.2, y: -0.02 } },
        { time: 1.0, transform: { rotation: 0.1, y: 0.01 } },
        { time: 1.5, transform: { rotation: -0.15, y: -0.01 } },
        { time: 2.0, transform: { rotation: 0.05, y: 0 } },
        { time: 2.5, transform: { rotation: 0, y: 0 } }
    ]);
    idle.addTrack('finRight', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.5, transform: { rotation: 0.2, y: -0.02 } },
        { time: 1.0, transform: { rotation: -0.1, y: 0.01 } },
        { time: 1.5, transform: { rotation: 0.15, y: -0.01 } },
        { time: 2.0, transform: { rotation: -0.05, y: 0 } },
        { time: 2.5, transform: { rotation: 0, y: 0 } }
    ]);
    idle.addTrack('hairLeft', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 0.625, transform: { rotation: -0.15, scaleY: 1.08 } },
        { time: 1.25, transform: { rotation: 0.1, scaleY: 0.95 } },
        { time: 1.875, transform: { rotation: -0.1, scaleY: 1.05 } },
        { time: 2.5, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    idle.addTrack('hairRight', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 0.625, transform: { rotation: 0.15, scaleY: 1.08 } },
        { time: 1.25, transform: { rotation: -0.1, scaleY: 0.95 } },
        { time: 1.875, transform: { rotation: 0.1, scaleY: 1.05 } },
        { time: 2.5, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    sprite.addAnimation(idle);

    // Custom WALK animation - swimming/gliding motion
    const walk = new AnimationClip('walk', 0.7, true);
    walk.addTrack('body', [
        { time: 0, transform: { y: 0, rotation: 0.04, scaleY: 1.0 } },
        { time: 0.175, transform: { y: -0.05, rotation: -0.04, scaleY: 0.97 } },
        { time: 0.35, transform: { y: 0, rotation: -0.04, scaleY: 1.0 } },
        { time: 0.525, transform: { y: -0.05, rotation: 0.04, scaleY: 0.97 } },
        { time: 0.7, transform: { y: 0, rotation: 0.04, scaleY: 1.0 } }
    ]);
    walk.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0.05 } },
        { time: 0.175, transform: { y: -0.03, rotation: -0.06 } },
        { time: 0.35, transform: { y: 0.01, rotation: 0 } },
        { time: 0.525, transform: { y: -0.03, rotation: 0.06 } },
        { time: 0.7, transform: { y: 0, rotation: 0.05 } }
    ]);
    walk.addTrack('tail', [
        { time: 0, transform: { rotation: 0.35, y: 0 } },
        { time: 0.175, transform: { rotation: 0, y: 0.02 } },
        { time: 0.35, transform: { rotation: -0.35, y: 0 } },
        { time: 0.525, transform: { rotation: 0, y: 0.02 } },
        { time: 0.7, transform: { rotation: 0.35, y: 0 } }
    ]);
    walk.addTrack('finLeft', [
        { time: 0, transform: { rotation: 0.2, y: 0 } },
        { time: 0.175, transform: { rotation: -0.25, y: -0.03 } },
        { time: 0.35, transform: { rotation: 0.15, y: 0 } },
        { time: 0.525, transform: { rotation: -0.2, y: -0.02 } },
        { time: 0.7, transform: { rotation: 0.2, y: 0 } }
    ]);
    walk.addTrack('finRight', [
        { time: 0, transform: { rotation: -0.2, y: 0 } },
        { time: 0.175, transform: { rotation: 0.25, y: -0.03 } },
        { time: 0.35, transform: { rotation: -0.15, y: 0 } },
        { time: 0.525, transform: { rotation: 0.2, y: -0.02 } },
        { time: 0.7, transform: { rotation: -0.2, y: 0 } }
    ]);
    walk.addTrack('hairLeft', [
        { time: 0, transform: { rotation: 0.2, scaleY: 1.0 } },
        { time: 0.35, transform: { rotation: -0.25, scaleY: 1.1 } },
        { time: 0.7, transform: { rotation: 0.2, scaleY: 1.0 } }
    ]);
    walk.addTrack('hairRight', [
        { time: 0, transform: { rotation: -0.2, scaleY: 1.0 } },
        { time: 0.35, transform: { rotation: 0.25, scaleY: 1.1 } },
        { time: 0.7, transform: { rotation: -0.2, scaleY: 1.0 } }
    ]);
    sprite.addAnimation(walk);

    // Aura orbit animation (runs alongside idle/walk)
    const auraOrbit = new AnimationClip('auraOrbit', 3.0, true);
    auraOrbit.addTrack('aura1', [
        { time: 0, transform: { x: -0.20, y: 0.0 } },
        { time: 0.75, transform: { x: 0, y: -0.22 } },
        { time: 1.5, transform: { x: 0.20, y: 0.0 } },
        { time: 2.25, transform: { x: 0, y: 0.20 } },
        { time: 3.0, transform: { x: -0.20, y: 0.0 } }
    ]);
    auraOrbit.addTrack('aura2', [
        { time: 0, transform: { x: 0.20, y: 0.05 } },
        { time: 0.75, transform: { x: 0.05, y: 0.22 } },
        { time: 1.5, transform: { x: -0.20, y: 0.05 } },
        { time: 2.25, transform: { x: -0.05, y: -0.18 } },
        { time: 3.0, transform: { x: 0.20, y: 0.05 } }
    ]);
    auraOrbit.addTrack('aura3', [
        { time: 0, transform: { x: 0, y: -0.20 } },
        { time: 0.75, transform: { x: -0.18, y: 0.06 } },
        { time: 1.5, transform: { x: 0.18, y: 0.06 } },
        { time: 2.25, transform: { x: -0.10, y: -0.15 } },
        { time: 3.0, transform: { x: 0, y: -0.20 } }
    ]);
    sprite.addAnimation(auraOrbit);

    // Custom ATTACK animation
    const attack = new AnimationClip('attack', 0.5, false);
    attack.addTrack('body', [
        { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
        { time: 0.15, transform: { rotation: -0.15, scaleX: 0.95 } },
        { time: 0.3, transform: { rotation: 0.2, scaleX: 1.08 } },
        { time: 0.5, transform: { rotation: 0, scaleX: 1.0 } }
    ]);
    attack.addTrack('head', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.15, transform: { rotation: -0.1, y: -0.02 } },
        { time: 0.3, transform: { rotation: 0.15, y: 0.02 } },
        { time: 0.5, transform: { rotation: 0, y: 0 } }
    ]);
    attack.addTrack('finLeft', [
        { time: 0, transform: { rotation: 0, x: 0 } },
        { time: 0.15, transform: { rotation: 0.25, x: 0.03 } },
        { time: 0.3, transform: { rotation: -0.35, x: -0.05 } },
        { time: 0.5, transform: { rotation: 0, x: 0 } }
    ]);
    attack.addTrack('finRight', [
        { time: 0, transform: { rotation: 0, x: 0 } },
        { time: 0.15, transform: { rotation: -0.25, x: -0.03 } },
        { time: 0.3, transform: { rotation: 0.35, x: 0.05 } },
        { time: 0.5, transform: { rotation: 0, x: 0 } }
    ]);
    attack.addTrack('tail', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.15, transform: { rotation: 0.2 } },
        { time: 0.3, transform: { rotation: -0.25 } },
        { time: 0.5, transform: { rotation: 0 } }
    ]);
    sprite.addAnimation(attack);

    // CHARM animation - siren's special ability (mesmerizing song)
    const charm = new AnimationClip('charm', 1.0, false);
    charm.addTrack('body', [
        { time: 0, transform: { rotation: 0, y: 0, scaleY: 1.0 } },
        { time: 0.25, transform: { rotation: -0.08, y: -0.04, scaleY: 1.05 } },
        { time: 0.5, transform: { rotation: 0.08, y: -0.06, scaleY: 1.08 } },
        { time: 0.75, transform: { rotation: -0.04, y: -0.04, scaleY: 1.04 } },
        { time: 1.0, transform: { rotation: 0, y: 0, scaleY: 1.0 } }
    ]);
    charm.addTrack('head', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.2, transform: { rotation: -0.15, y: 0.03 } },
        { time: 0.4, transform: { rotation: 0.2, y: 0.05 } },
        { time: 0.6, transform: { rotation: 0.15, y: 0.04 } },
        { time: 0.8, transform: { rotation: -0.1, y: 0.02 } },
        { time: 1.0, transform: { rotation: 0, y: 0 } }
    ]);
    charm.addTrack('finLeft', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 0.25, transform: { rotation: -0.4, scaleY: 1.15 } },
        { time: 0.5, transform: { rotation: -0.5, scaleY: 1.2 } },
        { time: 0.75, transform: { rotation: -0.3, scaleY: 1.1 } },
        { time: 1.0, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    charm.addTrack('finRight', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 0.25, transform: { rotation: 0.4, scaleY: 1.15 } },
        { time: 0.5, transform: { rotation: 0.5, scaleY: 1.2 } },
        { time: 0.75, transform: { rotation: 0.3, scaleY: 1.1 } },
        { time: 1.0, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    charm.addTrack('hairLeft', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 0.25, transform: { rotation: -0.25, scaleY: 1.2 } },
        { time: 0.5, transform: { rotation: -0.35, scaleY: 1.3 } },
        { time: 0.75, transform: { rotation: -0.2, scaleY: 1.15 } },
        { time: 1.0, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    charm.addTrack('hairRight', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 0.25, transform: { rotation: 0.25, scaleY: 1.2 } },
        { time: 0.5, transform: { rotation: 0.35, scaleY: 1.3 } },
        { time: 0.75, transform: { rotation: 0.2, scaleY: 1.15 } },
        { time: 1.0, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    charm.addTrack('tail', [
        { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
        { time: 0.25, transform: { rotation: 0.2, scaleX: 1.05 } },
        { time: 0.5, transform: { rotation: -0.2, scaleX: 1.1 } },
        { time: 0.75, transform: { rotation: 0.1, scaleX: 1.05 } },
        { time: 1.0, transform: { rotation: 0, scaleX: 1.0 } }
    ]);
    sprite.addAnimation(charm);

    // HIT and DEATH animations using AnimationBuilder
    sprite.addAnimation(AnimationBuilder.createHitAnimation(bodyParts, 0.25));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(allParts, 1.2));

    return sprite;
}
