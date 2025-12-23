import { MultiPartSprite, AnimationClip, AnimationBuilder } from './../../sprite-animation-system.js';


export function flyer() {
    const sprite = new MultiPartSprite('flyer');

    // BODY (larger core)
    const body = sprite.addPart('body', {
        type: 'ellipse',
        x: 0, y: 0,
        width: 0.40, height: 0.50,
        color: '#4a3a5a',
        fill: true
    }, 0.5, 0.5);
    body.setBaseTransform(0, 0);

    // HEAD (larger)
    const head = sprite.addPart('head', [
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.18,
            color: '#3a2a4a',
            fill: true
        },
        {
            type: 'circle',
            x: -0.07, y: -0.03,
            radius: 0.06,
            color: '#ffff00',
            fill: true
        },
        {
            type: 'circle',
            x: 0.07, y: -0.03,
            radius: 0.06,
            color: '#ffff00',
            fill: true
        }
    ], 0.5, 0.5);
    head.setBaseTransform(0, -0.28);
    sprite.setParent('head', 'body');

    // LEFT WING (will flap) - MUCH bigger wings
    const wingLeft = sprite.addPart('wingLeft', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.42, y: -0.22 },
                { x: -0.48, y: 0.06 },
                { x: -0.32, y: 0.20 },
                { x: -0.10, y: 0.16 }
            ],
            color: '#6a4a7a',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'polygon',
            points: [
                { x: -0.18, y: -0.08 },
                { x: -0.38, y: -0.16 },
                { x: -0.28, y: 0.10 }
            ],
            color: 'rgba(138, 98, 158, 0.6)',
            fill: true
        }
    ], 1, 0.5); // Pivot at body connection
    wingLeft.setBaseTransform(-0.18, 0);
    sprite.setParent('wingLeft', 'body');

    // RIGHT WING - MUCH bigger wings
    const wingRight = sprite.addPart('wingRight', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 0.42, y: -0.22 },
                { x: 0.48, y: 0.06 },
                { x: 0.32, y: 0.20 },
                { x: 0.10, y: 0.16 }
            ],
            color: '#6a4a7a',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'polygon',
            points: [
                { x: 0.18, y: -0.08 },
                { x: 0.38, y: -0.16 },
                { x: 0.28, y: 0.10 }
            ],
            color: 'rgba(138, 98, 158, 0.6)',
            fill: true
        }
    ], 0, 0.5);
    wingRight.setBaseTransform(0.18, 0);
    sprite.setParent('wingRight', 'body');

    // TAIL (larger)
    const tail = sprite.addPart('tail', {
        type: 'polygon',
        points: [
            { x: 0, y: 0 },
            { x: -0.08, y: 0.28 },
            { x: 0.08, y: 0.28 }
        ],
        color: '#4a3a5a',
        fill: true
    }, 0.5, 0);
    tail.setBaseTransform(0, 0.24);
    sprite.setParent('tail', 'body');

    // Wing flap animation - MOLTO più ampio e visibile
    const fly = new AnimationClip('fly', 0.20, true);
    fly.addTrack('wingLeft', [
        { time: 0, transform: { rotation: 0.5, scaleY: 1.0, scaleX: 1.0 } },
        { time: 0.05, transform: { rotation: -1.2, scaleY: 0.75, scaleX: 0.9 } },
        { time: 0.10, transform: { rotation: -0.8, scaleY: 0.85, scaleX: 0.95 } },
        { time: 0.15, transform: { rotation: -0.3, scaleY: 0.95, scaleX: 1.0 } },
        { time: 0.20, transform: { rotation: 0.5, scaleY: 1.0, scaleX: 1.0 } }
    ]);
    fly.addTrack('wingRight', [
        { time: 0, transform: { rotation: -0.5, scaleY: 1.0, scaleX: 1.0 } },
        { time: 0.05, transform: { rotation: 1.2, scaleY: 0.75, scaleX: 0.9 } },
        { time: 0.10, transform: { rotation: 0.8, scaleY: 0.85, scaleX: 0.95 } },
        { time: 0.15, transform: { rotation: 0.3, scaleY: 0.95, scaleX: 1.0 } },
        { time: 0.20, transform: { rotation: -0.5, scaleY: 1.0, scaleX: 1.0 } }
    ]);
    fly.addTrack('body', [
        { time: 0, transform: { y: 0.03, rotation: 0.03 } },
        { time: 0.05, transform: { y: -0.08, rotation: -0.04 } },
        { time: 0.10, transform: { y: -0.05, rotation: -0.02 } },
        { time: 0.15, transform: { y: -0.02, rotation: 0 } },
        { time: 0.20, transform: { y: 0.03, rotation: 0.03 } }
    ]);
    fly.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0.05 } },
        { time: 0.05, transform: { y: -0.04, rotation: -0.08 } },
        { time: 0.10, transform: { y: -0.02, rotation: -0.03 } },
        { time: 0.15, transform: { y: -0.01, rotation: 0 } },
        { time: 0.20, transform: { y: 0, rotation: 0.05 } }
    ]);
    fly.addTrack('tail', [
        { time: 0, transform: { rotation: 0.15 } },
        { time: 0.10, transform: { rotation: -0.20 } },
        { time: 0.20, transform: { rotation: 0.15 } }
    ]);

    sprite.addAnimation(fly);

    // --- AGGIUNTA: walk = fly (stessa durata 0.20) ---
    const walk = new AnimationClip('walk', 0.20, true);
    walk.tracks = JSON.parse(JSON.stringify(fly.tracks));
    sprite.addAnimation(walk);

    // Idle - gentle hovering
    const idle = new AnimationClip('idle', 0.5, true);
    idle.addTrack('wingLeft', [
        { time: 0, transform: { rotation: 0.1 } },
        { time: 0.25, transform: { rotation: -0.3 } },
        { time: 0.5, transform: { rotation: 0.1 } }
    ]);
    idle.addTrack('wingRight', [
        { time: 0, transform: { rotation: -0.1 } },
        { time: 0.25, transform: { rotation: 0.3 } },
        { time: 0.5, transform: { rotation: -0.1 } }
    ]);
    idle.addTrack('body', [
        { time: 0, transform: { y: 0 } },
        { time: 0.25, transform: { y: -0.03 } },
        { time: 0.5, transform: { y: 0 } }
    ]);
    sprite.addAnimation(idle);

    sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head', 'wingLeft', 'wingRight'], 0.2));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head', 'wingLeft', 'wingRight', 'tail'], 1.0));

    return sprite;
}