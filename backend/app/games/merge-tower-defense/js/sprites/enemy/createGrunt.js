import { MultiPartSprite ,AnimationBuilder, AnimationClip} from 
//backend\app\games\merge-tower-defense\js\sprite-animation-system.js
'./../../sprite-animation-system.js';

export function grunt() {
    const sprite = new MultiPartSprite('grunt');

    // LEFT LEG (behind body, z-order -10)
    const legLeft = sprite.addPart('legLeft', [
        {
            type: 'ellipse',
            x: 0, y: 0.12,
            width: 0.12, height: 0.30,
            color: '#2d5a45',
            fill: true
        },
        {
            type: 'ellipse',  // Foot
            x: 0, y: 0.28,
            width: 0.10, height: 0.08,
            color: '#1a3d2e',
            fill: true
        }
    ], 0.5, 0, -10);
    legLeft.setBaseTransform(-0.10, 0.30);

    // RIGHT LEG (behind body, z-order -10)
    const legRight = sprite.addPart('legRight', [
        {
            type: 'ellipse',
            x: 0, y: 0.12,
            width: 0.12, height: 0.30,
            color: '#2d5a45',
            fill: true
        },
        {
            type: 'ellipse',  // Foot
            x: 0, y: 0.28,
            width: 0.10, height: 0.08,
            color: '#1a3d2e',
            fill: true
        }
    ], 0.5, 0, -10);
    legRight.setBaseTransform(0.10, 0.30);

    // BODY (main part, z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'ellipse',  // Main torso
            x: 0, y: 0,
            width: 0.42, height: 0.52,
            color: '#3d6b55',
            fill: true
        },
        {
            type: 'ellipse',  // Chest highlight
            x: 0, y: -0.05,
            width: 0.28, height: 0.30,
            color: '#4a7a65',
            fill: true
        },
        {
            type: 'ellipse',  // Belly
            x: 0, y: 0.12,
            width: 0.22, height: 0.18,
            color: '#4d8070',
            fill: true
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.10);

    // Parent legs to body
    sprite.setParent('legLeft', 'body');
    sprite.setParent('legRight', 'body');

    // LEFT ARM (z-order -5, behind body)
    const armLeft = sprite.addPart('armLeft', [
        {
            type: 'ellipse',
            x: 0, y: 0.10,
            width: 0.10, height: 0.26,
            color: '#3d6b55',
            fill: true
        },
        {
            type: 'circle',  // Hand/claw
            x: 0, y: 0.24,
            radius: 0.06,
            color: '#2d5a45',
            fill: true
        }
    ], 0.5, 0, -5);
    armLeft.setBaseTransform(-0.22, -0.05);
    sprite.setParent('armLeft', 'body');

    // RIGHT ARM (z-order 5, in front)
    const armRight = sprite.addPart('armRight', [
        {
            type: 'ellipse',
            x: 0, y: 0.10,
            width: 0.10, height: 0.26,
            color: '#3d6b55',
            fill: true
        },
        {
            type: 'circle',  // Hand/claw
            x: 0, y: 0.24,
            radius: 0.06,
            color: '#2d5a45',
            fill: true
        }
    ], 0.5, 0, 5);
    armRight.setBaseTransform(0.22, -0.05);
    sprite.setParent('armRight', 'body');

    // SHOULDERS (z-order 6)
    const shoulders = sprite.addPart('shoulders', [
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.52, height: 0.12,
            color: '#4a7a65',
            fill: true
        }
    ], 0.5, 0.5, 6);
    shoulders.setBaseTransform(0, -0.15);
    sprite.setParent('shoulders', 'body');

    // HEAD (z-order 10)
    const head = sprite.addPart('head', [
        {
            type: 'circle',  // Main head
            x: 0, y: 0,
            radius: 0.17,
            color: '#3d6b55',
            fill: true
        },
        {
            type: 'ellipse',  // Brow ridge
            x: 0, y: -0.06,
            width: 0.28, height: 0.08,
            color: '#2d5a45',
            fill: true
        },
        {
            type: 'circle',  // Left eye glow
            x: -0.07, y: 0,
            radius: 0.05,
            color: '#ff2222',
            fill: true,
            glow: { color: '#ff0000', blur: 4 }
        },
        {
            type: 'circle',  // Left eye pupil
            x: -0.07, y: 0.01,
            radius: 0.025,
            color: '#880000',
            fill: true
        },
        {
            type: 'circle',  // Right eye glow
            x: 0.07, y: 0,
            radius: 0.05,
            color: '#ff2222',
            fill: true,
            glow: { color: '#ff0000', blur: 4 }
        },
        {
            type: 'circle',  // Right eye pupil
            x: 0.07, y: 0.01,
            radius: 0.025,
            color: '#880000',
            fill: true
        },
        {
            type: 'polygon',  // Mouth/jaw
            points: [
                { x: -0.08, y: 0.10 },
                { x: 0.08, y: 0.10 },
                { x: 0.05, y: 0.16 },
                { x: -0.05, y: 0.16 }
            ],
            color: '#1a3d2e',
            fill: true
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.30);
    sprite.setParent('head', 'body');

    // Setup animations with arms and legs for more fluid walk cycle
    const allParts = ['body', 'head', 'shoulders', 'legLeft', 'legRight', 'armLeft', 'armRight'];

    // IDLE animation - gentle breathing with arm sway
    const idle = new AnimationClip('idle', 2.5, true);
    idle.addTrack('body', [
        { time: 0, transform: { y: 0, scaleY: 1.0 } },
        { time: 0.625, transform: { y: -0.01, scaleY: 1.02 } },
        { time: 1.25, transform: { y: 0, scaleY: 1.0 } },
        { time: 1.875, transform: { y: 0.01, scaleY: 0.98 } },
        { time: 2.5, transform: { y: 0, scaleY: 1.0 } }
    ]);
    idle.addTrack('head', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.8, transform: { rotation: 0.03 } },
        { time: 1.6, transform: { rotation: -0.03 } },
        { time: 2.5, transform: { rotation: 0 } }
    ]);
    idle.addTrack('armLeft', [
        { time: 0, transform: { rotation: 0.05 } },
        { time: 1.25, transform: { rotation: -0.08 } },
        { time: 2.5, transform: { rotation: 0.05 } }
    ]);
    idle.addTrack('armRight', [
        { time: 0, transform: { rotation: -0.05 } },
        { time: 1.25, transform: { rotation: 0.08 } },
        { time: 2.5, transform: { rotation: -0.05 } }
    ]);
    sprite.addAnimation(idle);

    // WALK animation - smooth shambling with arm swing
    const walk = new AnimationClip('walk', 0.6, true);
    walk.addTrack('body', [
        { time: 0, transform: { y: 0, rotation: 0.02 } },
        { time: 0.15, transform: { y: -0.03, rotation: -0.02 } },
        { time: 0.30, transform: { y: 0, rotation: 0.02 } },
        { time: 0.45, transform: { y: -0.03, rotation: -0.02 } },
        { time: 0.6, transform: { y: 0, rotation: 0.02 } }
    ]);
    walk.addTrack('head', [
        { time: 0, transform: { rotation: 0.04, y: 0 } },
        { time: 0.15, transform: { rotation: -0.06, y: -0.01 } },
        { time: 0.30, transform: { rotation: 0.04, y: 0 } },
        { time: 0.45, transform: { rotation: -0.06, y: -0.01 } },
        { time: 0.6, transform: { rotation: 0.04, y: 0 } }
    ]);
    walk.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0.25, y: 0 } },
        { time: 0.15, transform: { rotation: 0, y: -0.04 } },
        { time: 0.30, transform: { rotation: -0.25, y: 0 } },
        { time: 0.45, transform: { rotation: 0, y: 0 } },
        { time: 0.6, transform: { rotation: 0.25, y: 0 } }
    ]);
    walk.addTrack('legRight', [
        { time: 0, transform: { rotation: -0.25, y: 0 } },
        { time: 0.15, transform: { rotation: 0, y: 0 } },
        { time: 0.30, transform: { rotation: 0.25, y: 0 } },
        { time: 0.45, transform: { rotation: 0, y: -0.04 } },
        { time: 0.6, transform: { rotation: -0.25, y: 0 } }
    ]);
    walk.addTrack('armLeft', [
        { time: 0, transform: { rotation: -0.35 } },
        { time: 0.30, transform: { rotation: 0.35 } },
        { time: 0.6, transform: { rotation: -0.35 } }
    ]);
    walk.addTrack('armRight', [
        { time: 0, transform: { rotation: 0.35 } },
        { time: 0.30, transform: { rotation: -0.35 } },
        { time: 0.6, transform: { rotation: 0.35 } }
    ]);
    walk.addTrack('shoulders', [
        { time: 0, transform: { rotation: 0.03 } },
        { time: 0.30, transform: { rotation: -0.03 } },
        { time: 0.6, transform: { rotation: 0.03 } }
    ]);
    sprite.addAnimation(walk);

    // ATTACK animation - lunge forward with arms
    const attack = new AnimationClip('attack', 0.6, false);
    attack.addTrack('body', [
        { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
        { time: 0.15, transform: { rotation: -0.15, scaleX: 0.95 } },
        { time: 0.35, transform: { rotation: 0.20, scaleX: 1.10 } },
        { time: 0.5, transform: { rotation: 0.08, scaleX: 1.02 } },
        { time: 0.6, transform: { rotation: 0, scaleX: 1.0 } }
    ]);
    attack.addTrack('head', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.15, transform: { rotation: -0.20, y: 0.02 } },
        { time: 0.35, transform: { rotation: 0.25, y: -0.03 } },
        { time: 0.6, transform: { rotation: 0, y: 0 } }
    ]);
    attack.addTrack('armLeft', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 0.15, transform: { rotation: 0.5, scaleY: 0.9 } },
        { time: 0.35, transform: { rotation: -0.8, scaleY: 1.15 } },
        { time: 0.6, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    attack.addTrack('armRight', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 0.15, transform: { rotation: -0.5, scaleY: 0.9 } },
        { time: 0.35, transform: { rotation: 0.8, scaleY: 1.15 } },
        { time: 0.6, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    sprite.addAnimation(attack);

    // HIT and DEATH animations
    sprite.addAnimation(AnimationBuilder.createHitAnimation(allParts, 0.25));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(allParts, 1.2));

    return sprite;
}