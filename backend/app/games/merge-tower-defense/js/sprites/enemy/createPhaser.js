import { MultiPartSprite, AnimationBuilder, AnimationClip } from
    './../../sprite-animation-system.js';

export function phaser() {
    const sprite = new MultiPartSprite('phaser');

    // CORE BODY (ethereal energy core, z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.38, height: 0.48,
            color: 'rgba(120, 80, 200, 0.7)',
            fill: true,
            glow: { color: '#7050c8', blur: 8 }
        },
        {
            type: 'ellipse', // Inner glow
            x: 0, y: 0,
            width: 0.26, height: 0.34,
            color: 'rgba(160, 120, 255, 0.5)',
            fill: true,
            glow: { color: '#a078ff', blur: 6 }
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0);

    // ENERGY TAIL (flowing behind, z-order -5)
    const tail = sprite.addPart('tail', [
        {
            type: 'polygon',
            points: [
                { x: 0.15, y: 0 },
                { x: 0.35, y: 0 },
                { x: 0.28, y: 0.35 },
                { x: 0.25, y: 0.42 },
                { x: 0.22, y: 0.35 }
            ],
            color: 'rgba(100, 60, 180, 0.6)',
            fill: true,
            glow: { color: '#6438b4', blur: 5 }
        },
        {
            type: 'polygon',
            points: [
                { x: 0.2, y: 0.1 },
                { x: 0.3, y: 0.1 },
                { x: 0.26, y: 0.3 },
                { x: 0.24, y: 0.3 }
            ],
            color: 'rgba(140, 100, 220, 0.4)',
            fill: true
        }
    ], 0.5, 0, -5);
    tail.setBaseTransform(0, 0.24);
    sprite.setParent('tail', 'body');

    // LEFT WISP (floating energy tendrils, z-order 5)
    const wispLeft = sprite.addPart('wispLeft', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.15, y: -0.05 },
                { x: -0.20, y: 0.08 },
                { x: -0.12, y: 0.18 },
                { x: -0.05, y: 0.12 }
            ],
            color: 'rgba(130, 90, 210, 0.65)',
            fill: true,
            glow: { color: '#825ad2', blur: 6 }
        },
        {
            type: 'ellipse',
            x: -0.12, y: 0.06,
            width: 0.08, height: 0.12,
            color: 'rgba(170, 130, 250, 0.4)',
            fill: true
        }
    ], 1, 0.5, 5);
    wispLeft.setBaseTransform(-0.18, -0.05);
    sprite.setParent('wispLeft', 'body');

    // RIGHT WISP (floating energy tendrils, z-order 5)
    const wispRight = sprite.addPart('wispRight', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 0.15, y: -0.05 },
                { x: 0.20, y: 0.08 },
                { x: 0.12, y: 0.18 },
                { x: 0.05, y: 0.12 }
            ],
            color: 'rgba(130, 90, 210, 0.65)',
            fill: true,
            glow: { color: '#825ad2', blur: 6 }
        },
        {
            type: 'ellipse',
            x: 0.12, y: 0.06,
            width: 0.08, height: 0.12,
            color: 'rgba(170, 130, 250, 0.4)',
            fill: true
        }
    ], 0, 0.5, 5);
    wispRight.setBaseTransform(0.18, -0.05);
    sprite.setParent('wispRight', 'body');

    // HEAD/FACE (ethereal mask, z-order 10)
    const head = sprite.addPart('head', [
        {
            type: 'ellipse', // Face outline
            x: 0, y: 0,
            width: 0.24, height: 0.28,
            color: 'rgba(140, 100, 220, 0.8)',
            fill: true,
            glow: { color: '#8c64dc', blur: 5 }
        },
        {
            type: 'ellipse', // Left eye
            x: -0.06, y: -0.02,
            width: 0.08, height: 0.12,
            color: 'rgba(200, 255, 255, 0.9)',
            fill: true,
            glow: { color: '#c8ffff', blur: 4 }
        },
        {
            type: 'ellipse', // Right eye
            x: 0.06, y: -0.02,
            width: 0.08, height: 0.12,
            color: 'rgba(200, 255, 255, 0.9)',
            fill: true,
            glow: { color: '#c8ffff', blur: 4 }
        },
        {
            type: 'circle', // Left pupil
            x: -0.06, y: 0,
            radius: 0.03,
            color: '#0080ff',
            fill: true
        },
        {
            type: 'circle', // Right pupil
            x: 0.06, y: 0,
            radius: 0.03,
            color: '#0080ff',
            fill: true
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.22);
    sprite.setParent('head', 'body');

    // ENERGY ORB (floating particle, z-order 15)
    const orb = sprite.addPart('orb', {
        type: 'circle',
        x: 0, y: 0,
        radius: 0.04,
        color: 'rgba(180, 150, 255, 0.9)',
        fill: true,
        glow: { color: '#b496ff', blur: 6 }
    }, 0.5, 0.5, 15);
    orb.setBaseTransform(0, -0.35);
    sprite.setParent('orb', 'body');

    // Animations
    const allParts = ['body', 'head', 'wispLeft', 'wispRight', 'tail', 'orb'];

    // IDLE - gentle phase shimmer
    const idle = new AnimationClip('idle', 2.0, true);
    idle.addTrack('body', [
        { time: 0, transform: { y: 0, scaleX: 1.0, scaleY: 1.0, alpha: 0.7 } },
        { time: 0.5, transform: { y: -0.04, scaleX: 1.03, scaleY: 0.98, alpha: 0.85 } },
        { time: 1.0, transform: { y: -0.06, scaleX: 1.05, scaleY: 0.96, alpha: 0.9 } },
        { time: 1.5, transform: { y: -0.04, scaleX: 1.03, scaleY: 0.98, alpha: 0.75 } },
        { time: 2.0, transform: { y: 0, scaleX: 1.0, scaleY: 1.0, alpha: 0.7 } }
    ]);
    idle.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0, scaleX: 1.0 } },
        { time: 0.5, transform: { y: -0.02, rotation: 0.05, scaleX: 1.02 } },
        { time: 1.0, transform: { y: -0.04, rotation: 0, scaleX: 1.04 } },
        { time: 1.5, transform: { y: -0.02, rotation: -0.05, scaleX: 1.02 } },
        { time: 2.0, transform: { y: 0, rotation: 0, scaleX: 1.0 } }
    ]);
    idle.addTrack('wispLeft', [
        { time: 0, transform: { rotation: 0, x: 0, y: 0, alpha: 0.65 } },
        { time: 0.5, transform: { rotation: -0.2, x: -0.02, y: -0.02, alpha: 0.8 } },
        { time: 1.0, transform: { rotation: 0.1, x: 0.01, y: -0.03, alpha: 0.9 } },
        { time: 1.5, transform: { rotation: -0.15, x: -0.01, y: -0.02, alpha: 0.75 } },
        { time: 2.0, transform: { rotation: 0, x: 0, y: 0, alpha: 0.65 } }
    ]);
    idle.addTrack('wispRight', [
        { time: 0, transform: { rotation: 0, x: 0, y: 0, alpha: 0.65 } },
        { time: 0.5, transform: { rotation: 0.2, x: 0.02, y: -0.02, alpha: 0.8 } },
        { time: 1.0, transform: { rotation: -0.1, x: -0.01, y: -0.03, alpha: 0.9 } },
        { time: 1.5, transform: { rotation: 0.15, x: 0.01, y: -0.02, alpha: 0.75 } },
        { time: 2.0, transform: { rotation: 0, x: 0, y: 0, alpha: 0.65 } }
    ]);
    idle.addTrack('tail', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, alpha: 0.6 } },
        { time: 0.5, transform: { scaleX: 0.95, scaleY: 1.05, alpha: 0.7 } },
        { time: 1.0, transform: { scaleX: 0.92, scaleY: 1.08, alpha: 0.8 } },
        { time: 1.5, transform: { scaleX: 0.96, scaleY: 1.04, alpha: 0.65 } },
        { time: 2.0, transform: { scaleX: 1.0, scaleY: 1.0, alpha: 0.6 } }
    ]);
    idle.addTrack('orb', [
        { time: 0, transform: { y: 0, x: 0, scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.4, transform: { y: -0.04, x: -0.03, scaleX: 1.2, scaleY: 1.2 } },
        { time: 0.8, transform: { y: -0.02, x: 0.03, scaleX: 0.9, scaleY: 0.9 } },
        { time: 1.2, transform: { y: -0.05, x: 0.02, scaleX: 1.15, scaleY: 1.15 } },
        { time: 1.6, transform: { y: -0.03, x: -0.02, scaleX: 1.05, scaleY: 1.05 } },
        { time: 2.0, transform: { y: 0, x: 0, scaleX: 1.0, scaleY: 1.0 } }
    ]);
    sprite.addAnimation(idle);

    // WALK/FLY - ethereal gliding with phasing effect
    const walk = new AnimationClip('walk', 0.5, true);
    walk.addTrack('body', [
        { time: 0, transform: { y: 0, rotation: 0.04, scaleY: 1.0, alpha: 0.75 } },
        { time: 0.125, transform: { y: -0.05, rotation: -0.05, scaleY: 0.96, alpha: 0.65 } },
        { time: 0.25, transform: { y: -0.02, rotation: -0.03, scaleY: 1.02, alpha: 0.85 } },
        { time: 0.375, transform: { y: -0.05, rotation: 0.05, scaleY: 0.96, alpha: 0.7 } },
        { time: 0.5, transform: { y: 0, rotation: 0.04, scaleY: 1.0, alpha: 0.75 } }
    ]);
    walk.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0.05 } },
        { time: 0.125, transform: { y: -0.03, rotation: -0.08 } },
        { time: 0.25, transform: { y: 0.01, rotation: 0 } },
        { time: 0.375, transform: { y: -0.03, rotation: 0.08 } },
        { time: 0.5, transform: { y: 0, rotation: 0.05 } }
    ]);
    walk.addTrack('wispLeft', [
        { time: 0, transform: { rotation: 0.15, x: 0.01, scaleY: 1.0 } },
        { time: 0.125, transform: { rotation: -0.25, x: -0.03, scaleY: 0.9 } },
        { time: 0.25, transform: { rotation: 0.1, x: 0.01, scaleY: 1.05 } },
        { time: 0.375, transform: { rotation: -0.2, x: -0.02, scaleY: 0.95 } },
        { time: 0.5, transform: { rotation: 0.15, x: 0.01, scaleY: 1.0 } }
    ]);
    walk.addTrack('wispRight', [
        { time: 0, transform: { rotation: -0.15, x: -0.01, scaleY: 1.0 } },
        { time: 0.125, transform: { rotation: 0.25, x: 0.03, scaleY: 0.9 } },
        { time: 0.25, transform: { rotation: -0.1, x: -0.01, scaleY: 1.05 } },
        { time: 0.375, transform: { rotation: 0.2, x: 0.02, scaleY: 0.95 } },
        { time: 0.5, transform: { rotation: -0.15, x: -0.01, scaleY: 1.0 } }
    ]);
    walk.addTrack('tail', [
        { time: 0, transform: { scaleX: 1.0, rotation: 0.1 } },
        { time: 0.25, transform: { scaleX: 0.95, rotation: -0.15 } },
        { time: 0.5, transform: { scaleX: 1.0, rotation: 0.1 } }
    ]);
    walk.addTrack('orb', [
        { time: 0, transform: { x: 0, y: 0 } },
        { time: 0.125, transform: { x: -0.04, y: -0.02 } },
        { time: 0.25, transform: { x: 0.02, y: -0.03 } },
        { time: 0.375, transform: { x: 0.04, y: -0.02 } },
        { time: 0.5, transform: { x: 0, y: 0 } }
    ]);
    sprite.addAnimation(walk);

    // FLY - same as walk for flying enemies
    const fly = new AnimationClip('fly', 0.5, true);
    fly.tracks = JSON.parse(JSON.stringify(walk.tracks));
    sprite.addAnimation(fly);

    // ATTACK - phase strike with energy surge
    const attack = new AnimationClip('attack', 0.6, false);
    attack.addTrack('body', [
        { time: 0, transform: { rotation: 0, scaleX: 1.0, alpha: 0.75 } },
        { time: 0.15, transform: { rotation: -0.15, scaleX: 0.85, alpha: 0.4 } },
        { time: 0.3, transform: { rotation: 0.2, scaleX: 1.2, alpha: 1.0 } },
        { time: 0.45, transform: { rotation: 0.1, scaleX: 1.05, alpha: 0.85 } },
        { time: 0.6, transform: { rotation: 0, scaleX: 1.0, alpha: 0.75 } }
    ]);
    attack.addTrack('head', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.15, transform: { rotation: -0.2, y: -0.02 } },
        { time: 0.3, transform: { rotation: 0.25, y: 0.04 } },
        { time: 0.45, transform: { rotation: 0.1, y: 0.02 } },
        { time: 0.6, transform: { rotation: 0, y: 0 } }
    ]);
    attack.addTrack('wispLeft', [
        { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
        { time: 0.15, transform: { rotation: 0.4, scaleX: 0.7 } },
        { time: 0.3, transform: { rotation: -0.5, scaleX: 1.3 } },
        { time: 0.6, transform: { rotation: 0, scaleX: 1.0 } }
    ]);
    attack.addTrack('wispRight', [
        { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
        { time: 0.15, transform: { rotation: -0.4, scaleX: 0.7 } },
        { time: 0.3, transform: { rotation: 0.5, scaleX: 1.3 } },
        { time: 0.6, transform: { rotation: 0, scaleX: 1.0 } }
    ]);
    attack.addTrack('orb', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.15, transform: { scaleX: 0.5, scaleY: 0.5 } },
        { time: 0.3, transform: { scaleX: 2.0, scaleY: 2.0 } },
        { time: 0.45, transform: { scaleX: 1.3, scaleY: 1.3 } },
        { time: 0.6, transform: { scaleX: 1.0, scaleY: 1.0 } }
    ]);
    sprite.addAnimation(attack);

    // PHASE animation - becoming intangible
    const phase = new AnimationClip('phase', 0.7, false);
    phase.addTrack('body', [
        { time: 0, transform: { alpha: 0.75, scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.2, transform: { alpha: 0.4, scaleX: 1.1, scaleY: 0.95 } },
        { time: 0.35, transform: { alpha: 0.25, scaleX: 1.15, scaleY: 0.9 } },
        { time: 0.5, transform: { alpha: 0.4, scaleX: 1.1, scaleY: 0.95 } },
        { time: 0.7, transform: { alpha: 0.75, scaleX: 1.0, scaleY: 1.0 } }
    ]);
    phase.addTrack('head', [
        { time: 0, transform: { alpha: 0.8 } },
        { time: 0.2, transform: { alpha: 0.3 } },
        { time: 0.35, transform: { alpha: 0.2 } },
        { time: 0.5, transform: { alpha: 0.3 } },
        { time: 0.7, transform: { alpha: 0.8 } }
    ]);
    phase.addTrack('wispLeft', [
        { time: 0, transform: { alpha: 0.65, scaleX: 1.0 } },
        { time: 0.35, transform: { alpha: 0.15, scaleX: 1.4 } },
        { time: 0.7, transform: { alpha: 0.65, scaleX: 1.0 } }
    ]);
    phase.addTrack('wispRight', [
        { time: 0, transform: { alpha: 0.65, scaleX: 1.0 } },
        { time: 0.35, transform: { alpha: 0.15, scaleX: 1.4 } },
        { time: 0.7, transform: { alpha: 0.65, scaleX: 1.0 } }
    ]);
    phase.addTrack('tail', [
        { time: 0, transform: { alpha: 0.6 } },
        { time: 0.35, transform: { alpha: 0.1 } },
        { time: 0.7, transform: { alpha: 0.6 } }
    ]);
    phase.addTrack('orb', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, alpha: 0.9 } },
        { time: 0.2, transform: { scaleX: 1.5, scaleY: 1.5, alpha: 1.0 } },
        { time: 0.35, transform: { scaleX: 2.0, scaleY: 2.0, alpha: 0.3 } },
        { time: 0.5, transform: { scaleX: 1.5, scaleY: 1.5, alpha: 1.0 } },
        { time: 0.7, transform: { scaleX: 1.0, scaleY: 1.0, alpha: 0.9 } }
    ]);
    sprite.addAnimation(phase);

    sprite.addAnimation(AnimationBuilder.createHitAnimation(allParts, 0.25));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(allParts, 1.2));

    return sprite;
}
