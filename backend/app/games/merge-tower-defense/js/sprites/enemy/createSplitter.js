import { MultiPartSprite, AnimationBuilder, AnimationClip } from
    './../../sprite-animation-system.js';

export function splitter() {
    const sprite = new MultiPartSprite('splitter');

    // === LEGS (z-order -10) - Multiple tentacle-like legs ===
    const legLeft1 = sprite.addPart('legLeft1', [
        {
            type: 'ellipse',
            x: 0, y: 0.12,
            width: 0.08, height: 0.24,
            color: '#004630ff',
            fill: true
        },
        {
            type: 'circle',
            x: 0, y: 0.24,
            radius: 0.04,
            color: '#1f5c4a',
            fill: true
        }
    ], 0.5, 0, -10);
    legLeft1.setBaseTransform(-0.14, 0.28);

    const legLeft2 = sprite.addPart('legLeft2', [
        {
            type: 'ellipse',
            x: 0, y: 0.10,
            width: 0.07, height: 0.20,
            color: '#2d8066',
            fill: true
        }
    ], 0.5, 0, -10);
    legLeft2.setBaseTransform(-0.08, 0.32);

    const legRight1 = sprite.addPart('legRight1', [
        {
            type: 'ellipse',
            x: 0, y: 0.12,
            width: 0.08, height: 0.24,
            color: '#004630ff',
            fill: true
        },
        {
            type: 'circle',
            x: 0, y: 0.24,
            radius: 0.04,
            color: '#1f5c4a',
            fill: true
        }
    ], 0.5, 0, -10);
    legRight1.setBaseTransform(0.14, 0.28);

    const legRight2 = sprite.addPart('legRight2', [
        {
            type: 'ellipse',
            x: 0, y: 0.10,
            width: 0.07, height: 0.20,
            color: '#2d8066',
            fill: true
        }
    ], 0.5, 0, -10);
    legRight2.setBaseTransform(0.08, 0.32);

    // === BODY (z-order 0) - Blob-like main body ===
    const body = sprite.addPart('body', [
        {
            type: 'ellipse',  // Main blob
            x: 0, y: 0,
            width: 0.48, height: 0.42,
            color: '#bb0202ff',
            fill: true,
            glow: { color: '#2d8066', blur: 4 }
        },
        {
            type: 'ellipse',  // Inner pattern
            x: 0, y: 0.02,
            width: 0.32, height: 0.28,
            color: '#4db888',
            fill: true
        },
        {
            type: 'ellipse',  // Belly nucleus
            x: 0, y: 0.08,
            width: 0.16, height: 0.14,
            color: '#5dcc99',
            fill: true
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.08);

    // Parent legs to body
    sprite.setParent('legLeft1', 'body');
    sprite.setParent('legLeft2', 'body');
    sprite.setParent('legRight1', 'body');
    sprite.setParent('legRight2', 'body');

    // === HEAD NODES (z-order 5) - Two proto-heads that will split ===
    const headLeft = sprite.addPart('headLeft', [
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.11,
            color: '#3d9977',
            fill: true
        },
        {
            type: 'circle',  // Eye
            x: -0.02, y: -0.02,
            radius: 0.035,
            color: '#ff4444',
            fill: true,
            glow: { color: '#ff0000', blur: 3 }
        },
        {
            type: 'circle',  // Pupil
            x: -0.02, y: -0.01,
            radius: 0.015,
            color: '#880000',
            fill: true
        }
    ], 0.5, 0.5, 5);
    headLeft.setBaseTransform(-0.12, -0.18);
    sprite.setParent('headLeft', 'body');

    const headRight = sprite.addPart('headRight', [
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.11,
            color: '#3d9977',
            fill: true
        },
        {
            type: 'circle',  // Eye
            x: 0.02, y: -0.02,
            radius: 0.035,
            color: '#ff4444',
            fill: true,
            glow: { color: '#ff0000', blur: 3 }
        },
        {
            type: 'circle',  // Pupil
            x: 0.02, y: -0.01,
            radius: 0.015,
            color: '#880000',
            fill: true
        }
    ], 0.5, 0.5, 5);
    headRight.setBaseTransform(0.12, -0.18);
    sprite.setParent('headRight', 'body');

    // === CONNECTION (z-order 3) - Tissue connecting the two heads ===
    const connection = sprite.addPart('connection', [
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.30, height: 0.10,
            color: '#4db888',
            fill: true
        }
    ], 0.5, 0.5, 3);
    connection.setBaseTransform(0, -0.16);
    sprite.setParent('connection', 'body');

    // === TENDRILS (z-order -5) - Small appendages ===
    const tendrilLeft = sprite.addPart('tendrilLeft', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.06, y: 0.08 },
                { x: -0.04, y: 0.16 },
                { x: -0.02, y: 0.12 },
                { x: 0.02, y: 0.04 }
            ],
            color: '#2d8066',
            fill: true
        }
    ], 0.5, 0, -5);
    tendrilLeft.setBaseTransform(-0.24, 0.05);
    sprite.setParent('tendrilLeft', 'body');

    const tendrilRight = sprite.addPart('tendrilRight', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 0.06, y: 0.08 },
                { x: 0.04, y: 0.16 },
                { x: 0.02, y: 0.12 },
                { x: -0.02, y: 0.04 }
            ],
            color: '#2d8066',
            fill: true
        }
    ], 0.5, 0, -5);
    tendrilRight.setBaseTransform(0.24, 0.05);
    sprite.setParent('tendrilRight', 'body');

    // === ANIMATIONS ===
    const allParts = ['body', 'headLeft', 'headRight', 'connection', 'legLeft1', 'legLeft2', 'legRight1', 'legRight2', 'tendrilLeft', 'tendrilRight'];

    // IDLE - Pulsating blob with heads swaying
    const idle = new AnimationClip('idle', 2.0, true);
    idle.addTrack('body', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.5, transform: { scaleX: 1.04, scaleY: 0.97 } },
        { time: 1.0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 1.5, transform: { scaleX: 0.97, scaleY: 1.03 } },
        { time: 2.0, transform: { scaleX: 1.0, scaleY: 1.0 } }
    ]);
    idle.addTrack('headLeft', [
        { time: 0, transform: { x: 0, y: 0, rotation: 0 } },
        { time: 0.6, transform: { x: -0.02, y: -0.01, rotation: -0.1 } },
        { time: 1.2, transform: { x: 0.01, y: 0.01, rotation: 0.05 } },
        { time: 2.0, transform: { x: 0, y: 0, rotation: 0 } }
    ]);
    idle.addTrack('headRight', [
        { time: 0, transform: { x: 0, y: 0, rotation: 0 } },
        { time: 0.6, transform: { x: 0.02, y: -0.01, rotation: 0.1 } },
        { time: 1.2, transform: { x: -0.01, y: 0.01, rotation: -0.05 } },
        { time: 2.0, transform: { x: 0, y: 0, rotation: 0 } }
    ]);
    idle.addTrack('connection', [
        { time: 0, transform: { scaleX: 1.0 } },
        { time: 1.0, transform: { scaleX: 1.1 } },
        { time: 2.0, transform: { scaleX: 1.0 } }
    ]);
    idle.addTrack('tendrilLeft', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.0, transform: { rotation: -0.2 } },
        { time: 2.0, transform: { rotation: 0 } }
    ]);
    idle.addTrack('tendrilRight', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.0, transform: { rotation: 0.2 } },
        { time: 2.0, transform: { rotation: 0 } }
    ]);
    sprite.addAnimation(idle);

    // WALK - Crawling motion with blob deformation
    const walk = new AnimationClip('walk', 0.6, true);
    walk.addTrack('body', [
        { time: 0, transform: { y: 0, scaleX: 1.0, scaleY: 1.0, rotation: 0.02 } },
        { time: 0.15, transform: { y: -0.02, scaleX: 1.06, scaleY: 0.95, rotation: -0.02 } },
        { time: 0.30, transform: { y: 0, scaleX: 1.0, scaleY: 1.0, rotation: 0.02 } },
        { time: 0.45, transform: { y: -0.02, scaleX: 0.95, scaleY: 1.05, rotation: -0.02 } },
        { time: 0.6, transform: { y: 0, scaleX: 1.0, scaleY: 1.0, rotation: 0.02 } }
    ]);
    walk.addTrack('headLeft', [
        { time: 0, transform: { y: 0, rotation: 0.1 } },
        { time: 0.15, transform: { y: -0.02, rotation: -0.1 } },
        { time: 0.30, transform: { y: 0, rotation: 0.1 } },
        { time: 0.45, transform: { y: -0.02, rotation: -0.1 } },
        { time: 0.6, transform: { y: 0, rotation: 0.1 } }
    ]);
    walk.addTrack('headRight', [
        { time: 0, transform: { y: 0, rotation: -0.1 } },
        { time: 0.15, transform: { y: -0.02, rotation: 0.1 } },
        { time: 0.30, transform: { y: 0, rotation: -0.1 } },
        { time: 0.45, transform: { y: -0.02, rotation: 0.1 } },
        { time: 0.6, transform: { y: 0, rotation: -0.1 } }
    ]);
    walk.addTrack('legLeft1', [
        { time: 0, transform: { rotation: 0.3, y: 0 } },
        { time: 0.15, transform: { rotation: 0, y: -0.03 } },
        { time: 0.30, transform: { rotation: -0.3, y: 0 } },
        { time: 0.45, transform: { rotation: 0, y: 0 } },
        { time: 0.6, transform: { rotation: 0.3, y: 0 } }
    ]);
    walk.addTrack('legRight1', [
        { time: 0, transform: { rotation: -0.3, y: 0 } },
        { time: 0.15, transform: { rotation: 0, y: 0 } },
        { time: 0.30, transform: { rotation: 0.3, y: 0 } },
        { time: 0.45, transform: { rotation: 0, y: -0.03 } },
        { time: 0.6, transform: { rotation: -0.3, y: 0 } }
    ]);
    walk.addTrack('legLeft2', [
        { time: 0, transform: { rotation: 0.2 } },
        { time: 0.30, transform: { rotation: -0.2 } },
        { time: 0.6, transform: { rotation: 0.2 } }
    ]);
    walk.addTrack('legRight2', [
        { time: 0, transform: { rotation: -0.2 } },
        { time: 0.30, transform: { rotation: 0.2 } },
        { time: 0.6, transform: { rotation: -0.2 } }
    ]);
    walk.addTrack('tendrilLeft', [
        { time: 0, transform: { rotation: 0.15 } },
        { time: 0.30, transform: { rotation: -0.25 } },
        { time: 0.6, transform: { rotation: 0.15 } }
    ]);
    walk.addTrack('tendrilRight', [
        { time: 0, transform: { rotation: -0.15 } },
        { time: 0.30, transform: { rotation: 0.25 } },
        { time: 0.6, transform: { rotation: -0.15 } }
    ]);
    sprite.addAnimation(walk);

    // ATTACK - Heads lunge forward
    const attack = new AnimationClip('attack', 0.5, false);
    attack.addTrack('body', [
        { time: 0, transform: { scaleY: 1.0, rotation: 0 } },
        { time: 0.15, transform: { scaleY: 0.9, rotation: -0.05 } },
        { time: 0.30, transform: { scaleY: 1.15, rotation: 0.1 } },
        { time: 0.5, transform: { scaleY: 1.0, rotation: 0 } }
    ]);
    attack.addTrack('headLeft', [
        { time: 0, transform: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.15, transform: { x: 0.02, y: 0.02, scaleX: 0.9, scaleY: 0.9 } },
        { time: 0.30, transform: { x: -0.06, y: -0.08, scaleX: 1.2, scaleY: 1.2 } },
        { time: 0.5, transform: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 } }
    ]);
    attack.addTrack('headRight', [
        { time: 0, transform: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.15, transform: { x: -0.02, y: 0.02, scaleX: 0.9, scaleY: 0.9 } },
        { time: 0.30, transform: { x: 0.06, y: -0.08, scaleX: 1.2, scaleY: 1.2 } },
        { time: 0.5, transform: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 } }
    ]);
    attack.addTrack('connection', [
        { time: 0, transform: { scaleX: 1.0 } },
        { time: 0.30, transform: { scaleX: 1.5 } },
        { time: 0.5, transform: { scaleX: 1.0 } }
    ]);
    sprite.addAnimation(attack);

    // SPLIT animation - Heads separate dramatically
    const split = new AnimationClip('split', 0.8, false);
    split.addTrack('body', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, alpha: 1.0 } },
        { time: 0.3, transform: { scaleX: 1.3, scaleY: 0.8, alpha: 0.9 } },
        { time: 0.6, transform: { scaleX: 0.6, scaleY: 1.2, alpha: 0.5 } },
        { time: 0.8, transform: { scaleX: 0.3, scaleY: 0.3, alpha: 0 } }
    ]);
    split.addTrack('headLeft', [
        { time: 0, transform: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.4, transform: { x: -0.15, y: -0.1, scaleX: 1.3, scaleY: 1.3 } },
        { time: 0.8, transform: { x: -0.3, y: 0, scaleX: 1.0, scaleY: 1.0 } }
    ]);
    split.addTrack('headRight', [
        { time: 0, transform: { x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.4, transform: { x: 0.15, y: -0.1, scaleX: 1.3, scaleY: 1.3 } },
        { time: 0.8, transform: { x: 0.3, y: 0, scaleX: 1.0, scaleY: 1.0 } }
    ]);
    split.addTrack('connection', [
        { time: 0, transform: { scaleX: 1.0, alpha: 1.0 } },
        { time: 0.4, transform: { scaleX: 2.0, alpha: 0.6 } },
        { time: 0.8, transform: { scaleX: 0.1, alpha: 0 } }
    ]);
    sprite.addAnimation(split);

    // Standard animations
    sprite.addAnimation(AnimationBuilder.createHitAnimation(allParts, 0.25));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(allParts, 1.0));

    return sprite;
}
