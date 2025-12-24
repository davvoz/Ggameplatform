
import { MultiPartSprite, AnimationClip, AnimationBuilder } from
    './../../sprite-animation-system.js';
export function boss() {
    const sprite = new MultiPartSprite('boss');

    // DARK AURA - menacing power aura (behind everything, z-order -20)
    const aura = sprite.addPart('aura', [
        {
            type: 'ellipse',
            x: 0, y: 0.10,
            width: 0.50, height: 0.57,
            color: 'rgba(80, 0, 40, 0.25)',
            fill: true
        },
        {
            type: 'ellipse',
            x: 0, y: 0.10,
            width: 0.44, height: 0.50,
            color: 'rgba(120, 10, 60, 0.35)',
            fill: true,
            glow: { color: '#8a0a4a', blur: 8 }
        },
        {
            type: 'ellipse',
            x: 0, y: 0.10,
            width: 0.37, height: 0.44,
            color: 'rgba(150, 20, 80, 0.2)',
            fill: true
        }
    ], 0.5, 0.5, -20);
    aura.setBaseTransform(0, 0.03);

    // CAPE BACK (flowing cape behind body, z-order -8)
    const capeBack = sprite.addPart('capeBack', {
        type: 'polygon',
        points: [
            { x: 0.17, y: 0 },
            { x: 0.50, y: 0 },
            { x: 0.57, y: 0.44 },
            { x: 0.34, y: 0.48 },
            { x: 0.10, y: 0.44 }
        ],
        color: '#1a0a1a',
        fill: true
    }, 0.5, 0, -8);
    capeBack.setBaseTransform(0, 0.03);

    // LEFT LEG (massive demonic leg, z-order -10)
    const legLeft = sprite.addPart('legLeft', [
        {
            type: 'ellipse',
            x: 0, y: 0.12,
            width: 0.09, height: 0.25,
            color: '#2a1a2a',
            fill: true
        },
        {
            type: 'polygon', // Armor plate
            points: [
                { x: -0.03, y: 0.05 },
                { x: 0.03, y: 0.05 },
                { x: 0.04, y: 0.13 },
                { x: -0.04, y: 0.13 }
            ],
            color: '#4a1a3a',
            fill: true
        },
        {
            type: 'ellipse', // Foot
            x: 0, y: 0.23,
            width: 0.08, height: 0.05,
            color: '#1a0a1a',
            fill: true
        }
    ], 0.5, 0, -10);
    legLeft.setBaseTransform(-0.08, 0.16);

    // RIGHT LEG (z-order -10)
    const legRight = sprite.addPart('legRight', [
        {
            type: 'ellipse',
            x: 0, y: 0.12,
            width: 0.09, height: 0.25,
            color: '#2a1a2a',
            fill: true
        },
        {
            type: 'polygon', // Armor plate
            points: [
                { x: -0.03, y: 0.05 },
                { x: 0.03, y: 0.05 },
                { x: 0.04, y: 0.13 },
                { x: -0.04, y: 0.13 }
            ],
            color: '#4a1a3a',
            fill: true
        },
        {
            type: 'ellipse', // Foot
            x: 0, y: 0.23,
            width: 0.08, height: 0.05,
            color: '#1a0a1a',
            fill: true
        }
    ], 0.5, 0, -10);
    legRight.setBaseTransform(0.08, 0.16);

    // BODY - massive armored torso with dark energy (z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'ellipse', // Main torso
            x: 0.1, y: 0,
            width: 0.37, height: 0.41,
            color: '#3a1a2a',
            fill: true
        },
        {
            type: 'ellipse', // Inner dark armor
            x: 0.17, y: 0.03,
            width: 0.32, height: 0.34,
            color: '#2a0a1a',
            fill: true
        },
        {
            type: 'polygon', // Chest plate
            points: [
                { x: 0.27, y: 0.05 },
                { x: 0.40, y: 0.05 },
                { x: 0.39, y: 0.23 },
                { x: 0.34, y: 0.25 },
                { x: 0.28, y: 0.23 }
            ],
            color: '#5a1a3a',
            fill: true
        },
        {
            type: 'polygon', // Left shoulder spike
            points: [
                { x: 0.15, y: 0.01 },
                { x: 0.12, y: -0.03 },
                { x: 0.17, y: 0.04 }
            ],
            color: '#6a2a4a',
            fill: true
        },
        {
            type: 'polygon', // Right shoulder spike
            points: [
                { x: 0.52, y: 0.01 },
                { x: 0.55, y: -0.03 },
                { x: 0.50, y: 0.04 }
            ],
            color: '#6a2a4a',
            fill: true
        },
        {
            type: 'circle', // Dark heart core
            x: 0.34, y: 0.15,
            radius: 0.04,
            color: '#aa0a2a',
            fill: true,
            glow: { color: '#ff1a4a', blur: 7 }
        },
        {
            type: 'circle', // Inner core
            x: 0.34, y: 0.15,
            radius: 0.023,
            color: '#ff2a5a',
            fill: true,
            glow: { color: '#ff2a5a', blur: 4 }
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.10);

    // Parent legs, cape, and aura to body
    sprite.setParent('legLeft', 'body');
    sprite.setParent('legRight', 'body');
    sprite.setParent('capeBack', 'body');
    sprite.setParent('aura', 'body');

    // LEFT SHOULDER (z-order 2)
    const shoulderLeft = sprite.addPart('shoulderLeft', [
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.11, height: 0.09,
            color: '#4a1a3a',
            fill: true
        },
        {
            type: 'polygon', // Spike
            points: [
                { x: -0.04, y: -0.03 },
                { x: -0.07, y: -0.07 },
                { x: -0.03, y: -0.01 }
            ],
            color: '#6a2a4a',
            fill: true
        }
    ], 0.5, 0.5, 2);
    shoulderLeft.setBaseTransform(-0.16, -0.01);
    sprite.setParent('shoulderLeft', 'body');

    // RIGHT SHOULDER (z-order 2)
    const shoulderRight = sprite.addPart('shoulderRight', [
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.11, height: 0.09,
            color: '#4a1a3a',
            fill: true
        },
        {
            type: 'polygon', // Spike
            points: [
                { x: 0.04, y: -0.03 },
                { x: 0.07, y: -0.07 },
                { x: 0.03, y: -0.01 }
            ],
            color: '#6a2a4a',
            fill: true
        }
    ], 0.5, 0.5, 2);
    shoulderRight.setBaseTransform(0.16, -0.01);
    sprite.setParent('shoulderRight', 'body');

    // LEFT ARM (dark armored arm, z-order 3)
    const armLeft = sprite.addPart('armLeft', [
        {
            type: 'ellipse',
            x: 0, y: 0.08,
            width: 0.08, height: 0.19,
            color: '#2a1a2a',
            fill: true
        },
        {
            type: 'polygon', // Claw
            points: [
                { x: -0.03, y: 0.16 },
                { x: -0.04, y: 0.21 },
                { x: 0, y: 0.19 }
            ],
            color: '#5a2a4a',
            fill: true
        },
        {
            type: 'polygon', // Claw
            points: [
                { x: 0.03, y: 0.16 },
                { x: 0.04, y: 0.21 },
                { x: 0, y: 0.19 }
            ],
            color: '#5a2a4a',
            fill: true
        }
    ], 0.5, 0, 3);
    armLeft.setBaseTransform(0, 0.03);
    sprite.setParent('armLeft', 'shoulderLeft');

    // RIGHT ARM (z-order 3)
    const armRight = sprite.addPart('armRight', [
        {
            type: 'ellipse',
            x: 0, y: 0.08,
            width: 0.08, height: 0.19,
            color: '#2a1a2a',
            fill: true
        },
        {
            type: 'polygon', // Claw
            points: [
                { x: -0.03, y: 0.16 },
                { x: -0.04, y: 0.21 },
                { x: 0, y: 0.19 }
            ],
            color: '#5a2a4a',
            fill: true
        },
        {
            type: 'polygon', // Claw
            points: [
                { x: 0.03, y: 0.16 },
                { x: 0.04, y: 0.21 },
                { x: 0, y: 0.19 }
            ],
            color: '#5a2a4a',
            fill: true
        }
    ], 0.5, 0, 3);
    armRight.setBaseTransform(0, 0.03);
    sprite.setParent('armRight', 'shoulderRight');

    // CAPE LEFT WING (flowing cape front parts, z-order 5)
    const capeLeft = sprite.addPart('capeLeft', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: -0.07, y: 0.01 },
            { x: -0.11, y: 0.30 },
            { x: -0.05, y: 0.27 },
            { x: -0.01, y: 0.08 }
        ],
        color: '#2a0a1a',
        fill: true
    }, 1, 0, 5);
    capeLeft.setBaseTransform(-0.15, 0.01);
    sprite.setParent('capeLeft', 'body');

    // CAPE RIGHT WING (z-order 5)
    const capeRight = sprite.addPart('capeRight', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: 0.07, y: 0.01 },
            { x: 0.11, y: 0.30 },
            { x: 0.05, y: 0.27 },
            { x: 0.01, y: 0.08 }
        ],
        color: '#2a0a1a',
        fill: true
    }, 0, 0, 5);
    capeRight.setBaseTransform(0.15, 0.01);
    sprite.setParent('capeRight', 'body');

    // HEAD - demonic skull with horns (z-order 10)
    const head = sprite.addPart('head', [
        {
            type: 'ellipse', // Face/skull
            x: 0, y: 0,
            width: 0.19, height: 0.21,
            color: '#4a2a3a',
            fill: true
        },
        {
            type: 'ellipse', // Inner shadow
            x: 0, y: 0.03,
            width: 0.16, height: 0.17,
            color: '#2a1a2a',
            fill: true
        },
        {
            type: 'polygon', // Left massive horn
            points: [
                { x: -0.07, y: -0.01 },
                { x: -0.12, y: -0.12 },
                { x: -0.09, y: -0.13 },
                { x: -0.05, y: 0 }
            ],
            color: '#5a2a4a',
            fill: true
        },
        {
            type: 'polygon', // Right massive horn
            points: [
                { x: 0.07, y: -0.01 },
                { x: 0.12, y: -0.12 },
                { x: 0.09, y: -0.13 },
                { x: 0.05, y: 0 }
            ],
            color: '#5a2a4a',
            fill: true
        },
        {
            type: 'polygon', // Left smaller horn
            points: [
                { x: -0.09, y: 0.01 },
                { x: -0.13, y: -0.07 },
                { x: -0.08, y: 0.03 }
            ],
            color: '#4a1a3a',
            fill: true
        },
        {
            type: 'polygon', // Right smaller horn
            points: [
                { x: 0.09, y: 0.01 },
                { x: 0.13, y: -0.07 },
                { x: 0.08, y: 0.03 }
            ],
            color: '#4a1a3a',
            fill: true
        },
        {
            type: 'circle', // Left glowing eye
            x: -0.04, y: 0,
            radius: 0.025,
            color: '#ff0a3a',
            fill: true,
            glow: { color: '#ff0a3a', blur: 5 }
        },
        {
            type: 'circle', // Left eye pupil
            x: -0.04, y: 0,
            radius: 0.012,
            color: '#ffaa00',
            fill: true,
            glow: { color: '#ffaa00', blur: 3 }
        },
        {
            type: 'circle', // Right glowing eye
            x: 0.04, y: 0,
            radius: 0.025,
            color: '#ff0a3a',
            fill: true,
            glow: { color: '#ff0a3a', blur: 5 }
        },
        {
            type: 'circle', // Right eye pupil
            x: 0.04, y: 0,
            radius: 0.012,
            color: '#ffaa00',
            fill: true,
            glow: { color: '#ffaa00', blur: 3 }
        },
        {
            type: 'polygon', // Jaw/teeth suggestion
            points: [
                { x: -0.03, y: 0.07 },
                { x: 0, y: 0.09 },
                { x: 0.03, y: 0.07 }
            ],
            color: '#1a0a1a',
            fill: true
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.19);
    sprite.setParent('head', 'body');

    // CROWN SPIKES (menacing crown, z-order 12)
    const crown = sprite.addPart('crown', [
        {
            type: 'polygon',
            points: [
                { x: -0.05, y: -0.11 },
                { x: -0.07, y: -0.16 },
                { x: -0.04, y: -0.11 }
            ],
            color: '#6a2a4a',
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: -0.01, y: -0.11 },
                { x: -0.01, y: -0.17 },
                { x: 0.01, y: -0.11 }
            ],
            color: '#7a3a5a',
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: 0.04, y: -0.11 },
                { x: 0.07, y: -0.16 },
                { x: 0.05, y: -0.11 }
            ],
            color: '#6a2a4a',
            fill: true
        },
        {
            type: 'circle', // Crown jewel
            x: 0, y: -0.13,
            radius: 0.017,
            color: '#aa0a4a',
            fill: true,
            glow: { color: '#ff2a6a', blur: 3 }
        }
    ], 0.5, 0.5, 12);
    crown.setBaseTransform(0, 0);
    sprite.setParent('crown', 'head');

    // Menacing walk animation - slow, powerful, with flowing cape
    const walk = new AnimationClip('walk', 1.8, true);
    walk.addTrack('body', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 0.45, transform: { y: -0.08, rotation: 0.06 } },
        { time: 0.9, transform: { y: 0, rotation: 0 } },
        { time: 1.35, transform: { y: -0.08, rotation: -0.06 } },
        { time: 1.8, transform: { y: 0, rotation: 0 } }
    ]);
    walk.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0.4, y: -0.05 } },
        { time: 0.45, transform: { rotation: 0, y: 0 } },
        { time: 0.9, transform: { rotation: -0.4, y: -0.05 } },
        { time: 1.35, transform: { rotation: 0, y: 0 } },
        { time: 1.8, transform: { rotation: 0.4, y: -0.05 } }
    ]);
    walk.addTrack('legRight', [
        { time: 0, transform: { rotation: -0.4, y: -0.05 } },
        { time: 0.45, transform: { rotation: 0, y: 0 } },
        { time: 0.9, transform: { rotation: 0.4, y: -0.05 } },
        { time: 1.35, transform: { rotation: 0, y: 0 } },
        { time: 1.8, transform: { rotation: -0.4, y: -0.05 } }
    ]);
    walk.addTrack('shoulderLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.9, transform: { rotation: 0.12 } },
        { time: 1.8, transform: { rotation: 0 } }
    ]);
    walk.addTrack('shoulderRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.9, transform: { rotation: -0.12 } },
        { time: 1.8, transform: { rotation: 0 } }
    ]);
    walk.addTrack('armLeft', [
        { time: 0, transform: { rotation: -0.25 } },
        { time: 0.9, transform: { rotation: 0.25 } },
        { time: 1.8, transform: { rotation: -0.25 } }
    ]);
    walk.addTrack('armRight', [
        { time: 0, transform: { rotation: 0.25 } },
        { time: 0.9, transform: { rotation: -0.25 } },
        { time: 1.8, transform: { rotation: 0.25 } }
    ]);
    walk.addTrack('capeLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.45, transform: { rotation: -0.08 } },
        { time: 0.9, transform: { rotation: 0.05 } },
        { time: 1.35, transform: { rotation: 0.08 } },
        { time: 1.8, transform: { rotation: 0 } }
    ]);
    walk.addTrack('capeRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.45, transform: { rotation: 0.08 } },
        { time: 0.9, transform: { rotation: -0.05 } },
        { time: 1.35, transform: { rotation: -0.08 } },
        { time: 1.8, transform: { rotation: 0 } }
    ]);
    walk.addTrack('capeBack', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.9, transform: { rotation: 0.04 } },
        { time: 1.8, transform: { rotation: 0 } }
    ]);
    walk.addTrack('aura', [
        { time: 0, transform: { scale: 1.0, rotation: 0 } },
        { time: 0.6, transform: { scale: 1.05, rotation: 0.02 } },
        { time: 1.2, transform: { scale: 1.0, rotation: 0 } },
        { time: 1.8, transform: { scale: 1.0, rotation: 0 } }
    ]);

    sprite.addAnimation(walk);

    // Menacing idle animation
    const idle = new AnimationClip('idle', 3.0, true);
    idle.addTrack('body', [
        { time: 0, transform: { y: 0 } },
        { time: 1.5, transform: { y: -0.04 } },
        { time: 3.0, transform: { y: 0 } }
    ]);
    idle.addTrack('head', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.0, transform: { rotation: 0.04 } },
        { time: 2.0, transform: { rotation: -0.04 } },
        { time: 3.0, transform: { rotation: 0 } }
    ]);
    idle.addTrack('capeLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.5, transform: { rotation: 0.06 } },
        { time: 3.0, transform: { rotation: 0 } }
    ]);
    idle.addTrack('capeRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.5, transform: { rotation: -0.06 } },
        { time: 3.0, transform: { rotation: 0 } }
    ]);
    idle.addTrack('aura', [
        { time: 0, transform: { scale: 1.0, rotation: 0 } },
        { time: 0.75, transform: { scale: 1.08, rotation: 0.03 } },
        { time: 1.5, transform: { scale: 1.0, rotation: 0 } },
        { time: 2.25, transform: { scale: 1.08, rotation: -0.03 } },
        { time: 3.0, transform: { scale: 1.0, rotation: 0 } }
    ]);
    idle.addTrack('crown', [
        { time: 0, transform: { y: 0 } },
        { time: 1.5, transform: { y: -0.01 } },
        { time: 3.0, transform: { y: 0 } }
    ]);
    sprite.addAnimation(idle);

    // Devastating attack animation - dramatic and powerful
    const attack = new AnimationClip('attack', 1.0, false);
    attack.addTrack('body', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.25, transform: { rotation: 0.18, y: -0.05 } },
        { time: 0.5, transform: { rotation: -0.15, y: 0.02 } },
        { time: 0.75, transform: { rotation: 0.05 } },
        { time: 1.0, transform: { rotation: 0, y: 0 } }
    ]);
    attack.addTrack('armRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.25, transform: { rotation: -0.7 } },
        { time: 0.5, transform: { rotation: 0.5 } },
        { time: 0.75, transform: { rotation: -0.1 } },
        { time: 1.0, transform: { rotation: 0 } }
    ]);
    attack.addTrack('armLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.25, transform: { rotation: 0.6 } },
        { time: 0.5, transform: { rotation: -0.5 } },
        { time: 0.75, transform: { rotation: 0.1 } },
        { time: 1.0, transform: { rotation: 0 } }
    ]);
    attack.addTrack('head', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.25, transform: { rotation: 0.10 } },
        { time: 0.5, transform: { rotation: -0.08 } },
        { time: 1.0, transform: { rotation: 0 } }
    ]);
    attack.addTrack('capeBack', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.3, transform: { rotation: -0.12 } },
        { time: 0.6, transform: { rotation: 0.08 } },
        { time: 1.0, transform: { rotation: 0 } }
    ]);
    attack.addTrack('aura', [
        { time: 0, transform: { scale: 1.0 } },
        { time: 0.5, transform: { scale: 1.15 } },
        { time: 1.0, transform: { scale: 1.0 } }
    ]);
    sprite.addAnimation(attack);

    sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head', 'legLeft', 'legRight', 'aura'], 0.3));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head', 'armLeft', 'armRight', 'legLeft', 'legRight', 'capeLeft', 'capeRight', 'capeBack', 'crown', 'aura'], 2.0));

    return sprite;
}