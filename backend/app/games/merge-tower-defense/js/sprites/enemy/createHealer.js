import { MultiPartSprite, AnimationBuilder } from
    //backend\app\games\merge-tower-defense\js\sprite-animation-system.js
    './../../sprite-animation-system.js';

export function healer() {
    const sprite = new MultiPartSprite('healer');

    // BOTTOM ROBE (floats)
    const robeBottom = sprite.addPart('robeBottom', {
        type: 'polygon',
        points: [
            { x: 0.32, y: 0 },
            { x: 0.68, y: 0 },
            { x: 0.65, y: 0.25 },
            { x: 0.35, y: 0.25 }
        ],
        color: '#8a6aaa',
        fill: true
    }, 0.5, 0);
    robeBottom.setBaseTransform(0, 0.65);

    // BODY with ornate robe
    const body = sprite.addPart('body', [
        {
            type: 'ellipse',
            x: 0.25, y: 0.05,
            width: 0.5, height: 0.58,
            color: '#aa7acc',
            fill: true
        },
        {
            type: 'polygon', // Vertical stripe decoration
            points: [
                { x: 0.46, y: 0.08 },
                { x: 0.54, y: 0.08 },
                { x: 0.52, y: 0.55 },
                { x: 0.48, y: 0.55 }
            ],
            color: '#dda0ff',
            fill: true
        },
        {
            type: 'circle', // Belt ornament
            x: 0.5, y: 0.42,
            radius: 0.04,
            color: '#ffaa00',
            fill: true
        }
    ], 0.5, 0.5);
    body.setBaseTransform(0, 0.25);

    // SHOULDERS with cape
    const shoulderLeft = sprite.addPart('shoulderLeft', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: -0.12, y: 0.02 },
            { x: -0.12, y: 0.18 },
            { x: 0, y: 0.15 }
        ],
        color: '#7a5a9a',
        fill: true
    }, 1, 0);
    shoulderLeft.setBaseTransform(-0.02, 0.1);
    sprite.setParent('shoulderLeft', 'body');

    const shoulderRight = sprite.addPart('shoulderRight', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: 0.12, y: 0.02 },
            { x: 0.12, y: 0.18 },
            { x: 0, y: 0.15 }
        ],
        color: '#7a5a9a',
        fill: true
    }, 0, 0);
    shoulderRight.setBaseTransform(0.02, 0.1);
    sprite.setParent('shoulderRight', 'body');

    // HEAD with hood
    const head = sprite.addPart('head', [
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.11,
            color: '#aa9acc',
            fill: true
        },
        {
            type: 'ellipse', // Hood
            x: 0, y: -0.08,
            width: 0.24, height: 0.12,
            color: '#8a6aaa',
            fill: true
        },
        {
            type: 'circle', // Gem on forehead
            x: 0, y: 0.02,
            radius: 0.02,
            color: '#00ffcc',
            fill: true,
            glow: { color: '#00ffcc', blur: 6 }
        }
    ], 0.5, 0.5);
    head.setBaseTransform(0, -0.06);
    sprite.setParent('head', 'body');

    // STAFF (held in front)
    const staff = sprite.addPart('staff', [
        {
            type: 'rect',
            x: 0.08, y: 0,
            width: 0.04, height: 0.52,
            color: '#5a4a3a',
            fill: true
        },
        {
            type: 'circle', // Healing crystal
            x: 0.1, y: -0.04,
            radius: 0.06,
            color: '#00ff88',
            fill: true,
            glow: { color: '#00ff88', blur: 10 }
        },
        {
            type: 'polygon', // Crystal fixture
            points: [
                { x: 0.1, y: -0.1 },
                { x: 0.13, y: -0.04 },
                { x: 0.1, y: 0.02 },
                { x: 0.07, y: -0.04 }
            ],
            color: '#ffdd00',
            fill: true
        }
    ], 0.5, 1);
    staff.setBaseTransform(0.02, 0.15);
    sprite.setParent('staff', 'body');

    // AURA PARTICLES (floating around healer)
    const aura1 = sprite.addPart('aura1', {
        type: 'circle',
        x: 0, y: 0,
        radius: 0.02,
        color: '#00ff88',
        fill: true,
        glow: { color: '#00ff88', blur: 6 }
    }, 0.5, 0.5);
    aura1.setBaseTransform(-0.15, 0.1);

    const aura2 = sprite.addPart('aura2', {
        type: 'circle',
        x: 0, y: 0,
        radius: 0.02,
        color: '#00ff88',
        fill: true,
        glow: { color: '#00ff88', blur: 6 }
    }, 0.5, 0.5);
    aura2.setBaseTransform(0.15, 0.15);

    const aura3 = sprite.addPart('aura3', {
        type: 'circle',
        x: 0, y: 0,
        radius: 0.02,
        color: '#00ff88',
        fill: true,
        glow: { color: '#00ff88', blur: 6 }
    }, 0.5, 0.5);
    aura3.setBaseTransform(0, -0.08);

    // Float animation - entire body levitates
    const float = new AnimationClip('float', 3.0, true);
    float.addTrack('body', [
        { time: 0, transform: { y: 0 } },
        { time: 1.5, transform: { y: -0.05 } },
        { time: 3.0, transform: { y: 0 } }
    ]);
    float.addTrack('robeBottom', [
        { time: 0, transform: { y: 0, scaleX: 1.0 } },
        { time: 0.75, transform: { y: -0.02, scaleX: 1.05 } },
        { time: 1.5, transform: { y: -0.04, scaleX: 1.0 } },
        { time: 2.25, transform: { y: -0.02, scaleX: 0.95 } },
        { time: 3.0, transform: { y: 0, scaleX: 1.0 } }
    ]);
    float.addTrack('staff', [
        { time: 0, transform: { rotation: 0 } },
        { time: 1.5, transform: { rotation: 0.05 } },
        { time: 3.0, transform: { rotation: 0 } }
    ]);

    // Aura particles orbit
    float.addTrack('aura1', [
        { time: 0, transform: { x: -0.15, y: 0.1 } },
        { time: 1.0, transform: { x: 0, y: -0.1 } },
        { time: 2.0, transform: { x: 0.15, y: 0.1 } },
        { time: 3.0, transform: { x: -0.15, y: 0.1 } }
    ]);
    float.addTrack('aura2', [
        { time: 0, transform: { x: 0.15, y: 0.15 } },
        { time: 1.0, transform: { x: -0.15, y: 0.05 } },
        { time: 2.0, transform: { x: 0, y: -0.12 } },
        { time: 3.0, transform: { x: 0.15, y: 0.15 } }
    ]);
    float.addTrack('aura3', [
        { time: 0, transform: { x: 0, y: -0.08 } },
        { time: 1.0, transform: { x: 0.12, y: 0.08 } },
        { time: 2.0, transform: { x: -0.12, y: 0.08 } },
        { time: 3.0, transform: { x: 0, y: -0.08 } }
    ]);

    sprite.addAnimation(float);

    // --- AGGIUNTA: walk = float ---
    const walk = new AnimationClip('walk', 3.0, true);
    walk.tracks = JSON.parse(JSON.stringify(float.tracks));
    sprite.addAnimation(walk);

    // Healing cast animation
    const heal = new AnimationClip('heal', 0.8, false);
    heal.addTrack('staff', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 0.4, transform: { y: -0.1, rotation: 0.2 } },
        { time: 0.8, transform: { y: 0, rotation: 0 } }
    ]);
    heal.addTrack('body', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.4, transform: { rotation: -0.08 } },
        { time: 0.8, transform: { rotation: 0 } }
    ]);
    sprite.addAnimation(heal);

    sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head'], 0.2));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head', 'robeBottom', 'staff'], 1.2));

    return sprite;
}