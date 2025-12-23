import { MultiPartSprite, AnimationBuilder, AnimationClip } from
    //backend\app\games\merge-tower-defense\js\sprite-animation-system.js
    './../../sprite-animation-system.js';

export function healer() {
    const sprite = new MultiPartSprite('healer');

    // LEFT LEG (behind body, z-order -10)
    const legLeft = sprite.addPart('legLeft', {
        type: 'ellipse',
        x: 0, y: 0.16,
        width: 0.12, height: 0.32,
        color: '#6a4a8a',
        fill: true
    }, 0.5, 0, -10);
    legLeft.setBaseTransform(-0.07, 0.30);

    // RIGHT LEG (behind body, z-order -10)
    const legRight = sprite.addPart('legRight', {
        type: 'ellipse',
        x: 0, y: 0.16,
        width: 0.12, height: 0.32,
        color: '#6a4a8a',
        fill: true
    }, 0.5, 0, -10);
    legRight.setBaseTransform(0.07, 0.30);

    // BODY with ornate robe (main part, z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'ellipse',
            x: 0.25, y: 0.05,
            width: 0.48, height: 0.50,
            color: '#aa7acc',
            fill: true
        },
        {
            type: 'polygon', // Vertical stripe decoration
            points: [
                { x: 0.46, y: 0.10 },
                { x: 0.54, y: 0.10 },
                { x: 0.52, y: 0.48 },
                { x: 0.48, y: 0.48 }
            ],
            color: '#dda0ff',
            fill: true
        },
        {
            type: 'circle', // Belt ornament
            x: 0.5, y: 0.38,
            radius: 0.035,
            color: '#ffaa00',
            fill: true
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.18);

    // Parent legs to body
    sprite.setParent('legLeft', 'body');
    sprite.setParent('legRight', 'body');

    // SHOULDERS (z-order 5)
    const shoulders = sprite.addPart('shoulders', {
        type: 'ellipse',
        x: 0, y: 0,
        width: 0.50, height: 0.14,
        color: '#8a5aaa',
        fill: true
    }, 0.5, 0.5, 5);
    shoulders.setBaseTransform(0, -0.06);
    sprite.setParent('shoulders', 'body');

    // HEAD with hood (z-order 10)
    const head = sprite.addPart('head', [
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.13,
            color: '#c9a0dd',
            fill: true
        },
        {
            type: 'ellipse', // Hood
            x: 0, y: -0.06,
            width: 0.28, height: 0.14,
            color: '#8a6aaa',
            fill: true
        },
        {
            type: 'circle', // Left eye
            x: -0.05, y: 0.02,
            radius: 0.025,
            color: '#00ffcc',
            fill: true,
            glow: { color: '#00ffcc', blur: 4 }
        },
        {
            type: 'circle', // Right eye
            x: 0.05, y: 0.02,
            radius: 0.025,
            color: '#00ffcc',
            fill: true,
            glow: { color: '#00ffcc', blur: 4 }
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.22);
    sprite.setParent('head', 'body');

    // STAFF (held at side, z-order 15)
    const staff = sprite.addPart('staff', [
        {
            type: 'rect',
            x: -0.02, y: 0,
            width: 0.04, height: 0.48,
            color: '#5a4a3a',
            fill: true
        },
        {
            type: 'circle', // Healing crystal
            x: 0, y: -0.06,
            radius: 0.055,
            color: '#00ff88',
            fill: true,
            glow: { color: '#00ff88', blur: 10 }
        },
        {
            type: 'polygon', // Crystal fixture
            points: [
                { x: 0, y: -0.12 },
                { x: 0.035, y: -0.06 },
                { x: 0, y: 0 },
                { x: -0.035, y: -0.06 }
            ],
            color: '#ffdd00',
            fill: true
        }
    ], 0.5, 1, 15);
    staff.setBaseTransform(0.18, 0.08);
    sprite.setParent('staff', 'body');

    // AURA PARTICLES (floating around healer)
    const aura1 = sprite.addPart('aura1', {
        type: 'circle',
        x: 0, y: 0,
        radius: 0.018,
        color: '#00ff88',
        fill: true,
        glow: { color: '#00ff88', blur: 5 }
    }, 0.5, 0.5, 20);
    aura1.setBaseTransform(-0.18, 0.0);

    const aura2 = sprite.addPart('aura2', {
        type: 'circle',
        x: 0, y: 0,
        radius: 0.018,
        color: '#00ff88',
        fill: true,
        glow: { color: '#00ff88', blur: 5 }
    }, 0.5, 0.5, 20);
    aura2.setBaseTransform(0.18, 0.05);

    const aura3 = sprite.addPart('aura3', {
        type: 'circle',
        x: 0, y: 0,
        radius: 0.018,
        color: '#00ff88',
        fill: true,
        glow: { color: '#00ff88', blur: 5 }
    }, 0.5, 0.5, 20);
    aura3.setBaseTransform(0, -0.15);

    // Walk parts for proper walking animation
    const walkParts = ['body', 'head', 'shoulders', 'legLeft', 'legRight', 'staff'];
    const allParts = ['body', 'head', 'shoulders', 'legLeft', 'legRight', 'staff', 'aura1', 'aura2', 'aura3'];

    // Use standard walk animation with legs
    sprite.addAnimation(AnimationBuilder.createIdleAnimation(['head', 'body', 'shoulders', 'staff'], 2.0));
    sprite.addAnimation(AnimationBuilder.createWalkAnimation(walkParts, 0.6));

    // Aura orbit animation (runs alongside walk)
    const auraOrbit = new AnimationClip('auraOrbit', 2.5, true);
    auraOrbit.addTrack('aura1', [
        { time: 0, transform: { x: -0.18, y: 0.0 } },
        { time: 0.625, transform: { x: 0, y: -0.18 } },
        { time: 1.25, transform: { x: 0.18, y: 0.0 } },
        { time: 1.875, transform: { x: 0, y: 0.18 } },
        { time: 2.5, transform: { x: -0.18, y: 0.0 } }
    ]);
    auraOrbit.addTrack('aura2', [
        { time: 0, transform: { x: 0.18, y: 0.05 } },
        { time: 0.625, transform: { x: 0.05, y: 0.18 } },
        { time: 1.25, transform: { x: -0.18, y: 0.05 } },
        { time: 1.875, transform: { x: -0.05, y: -0.15 } },
        { time: 2.5, transform: { x: 0.18, y: 0.05 } }
    ]);
    auraOrbit.addTrack('aura3', [
        { time: 0, transform: { x: 0, y: -0.15 } },
        { time: 0.625, transform: { x: -0.15, y: 0.08 } },
        { time: 1.25, transform: { x: 0.15, y: 0.08 } },
        { time: 1.875, transform: { x: -0.08, y: -0.12 } },
        { time: 2.5, transform: { x: 0, y: -0.15 } }
    ]);
    sprite.addAnimation(auraOrbit);

    // Healing cast animation
    const heal = new AnimationClip('heal', 0.8, false);
    heal.addTrack('staff', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 0.3, transform: { y: -0.08, rotation: 0.25 } },
        { time: 0.5, transform: { y: -0.08, rotation: 0.25 } },
        { time: 0.8, transform: { y: 0, rotation: 0 } }
    ]);
    heal.addTrack('body', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.3, transform: { rotation: -0.06 } },
        { time: 0.5, transform: { rotation: -0.06 } },
        { time: 0.8, transform: { rotation: 0 } }
    ]);
    heal.addTrack('head', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.3, transform: { rotation: 0.08 } },
        { time: 0.5, transform: { rotation: 0.08 } },
        { time: 0.8, transform: { rotation: 0 } }
    ]);
    sprite.addAnimation(heal);

    sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head', 'shoulders'], 0.2));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(allParts, 1.2));

    return sprite;
}