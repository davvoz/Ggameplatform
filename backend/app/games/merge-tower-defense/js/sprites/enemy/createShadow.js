import { MultiPartSprite, AnimationBuilder, AnimationClip } from
    './../../sprite-animation-system.js';

export function shadow() {
    const sprite = new MultiPartSprite('shadow');

    // SHADOW TRAIL (behind everything, z-order -15)
    const trail = sprite.addPart('trail', [
        {
            type: 'ellipse',
            x: 0, y: 0.10,
            width: 0.40, height: 0.55,
            color: 'rgba(255, 255, 255, 0.12)',
            fill: true
        },
        {
            type: 'ellipse',
            x: 0, y: 0.10,
            width: 0.35, height: 0.50,
            color: 'rgba(180, 175, 200, 0.3)',
            fill: true
        }
    ], 0.5, 0.5, -15);
    trail.setBaseTransform(-0.08, 0.10);

    // LEFT LEG (wispy, behind body z-order -10)
    const legLeft = sprite.addPart('legLeft', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.04, y: 0.25 },
                { x: 0.02, y: 0.30 },
                { x: 0.04, y: 0 }
            ],
            color: 'rgba(200, 195, 220, 0.5)',
            fill: true
        },
        {
            type: 'circle',
            x: 0, y: 0.28,
            radius: 0.02,
            color: 'rgba(255, 255, 255, 0.5)',
            fill: true
        }
    ], 0.5, 0, -10);
    legLeft.setBaseTransform(-0.06, 0.22);

    // RIGHT LEG (wispy, behind body z-order -10)
    const legRight = sprite.addPart('legRight', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.02, y: 0.25 },
                { x: 0.04, y: 0.30 },
                { x: 0.04, y: 0 }
            ],
            color: 'rgba(200, 195, 220, 0.5)',
            fill: true
        },
        {
            type: 'circle',
            x: 0.02, y: 0.28,
            radius: 0.02,
            color: 'rgba(255, 255, 255, 0.5)',
            fill: true
        }
    ], 0.5, 0, -10);
    legRight.setBaseTransform(0.06, 0.22);

    // BODY (ethereal floating form, z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'ellipse',
            x: 0.22, y: 0,
            width: 0.44, height: 0.52,
            color: 'rgba(40, 35, 55, 0.85)',
            fill: true
        },
        // White ethereal outer glow
        {
            type: 'ellipse',
            x: 0.22, y: 0,
            width: 0.48, height: 0.56,
            color: 'rgba(255, 255, 255, 0.15)',
            fill: true
        },
        // Inner glow core - lighter
        {
            type: 'ellipse',
            x: 0.22, y: 0.05,
            width: 0.28, height: 0.32,
            color: 'rgba(200, 200, 220, 0.35)',
            fill: true,
            glow: { color: '#ffffff', blur: 8 }
        },
        // Dark void center
        {
            type: 'circle',
            x: 0.22, y: 0.10,
            radius: 0.08,
            color: 'rgba(10, 5, 20, 0.9)',
            fill: true
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.15);

    // Parent legs and trail to body
    sprite.setParent('legLeft', 'body');
    sprite.setParent('legRight', 'body');
    sprite.setParent('trail', 'body');

    // WISP LEFT (floating tendrils, z-order 3)
    const wispLeft = sprite.addPart('wispLeft', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.12, y: 0.08 },
                { x: -0.16, y: 0.22 },
                { x: -0.10, y: 0.18 },
                { x: -0.02, y: 0.05 }
            ],
            color: 'rgba(200, 195, 220, 0.5)',
            fill: true
        },
        // White wisp tip
        {
            type: 'circle',
            x: -0.14, y: 0.20,
            radius: 0.025,
            color: 'rgba(255, 255, 255, 0.7)',
            fill: true,
            glow: { color: '#ffffff', blur: 4 }
        }
    ], 1, 0.5, 3);
    wispLeft.setBaseTransform(-0.18, 0.02);
    sprite.setParent('wispLeft', 'body');

    // WISP RIGHT (floating tendrils, z-order 3)
    const wispRight = sprite.addPart('wispRight', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 0.12, y: 0.08 },
                { x: 0.16, y: 0.22 },
                { x: 0.10, y: 0.18 },
                { x: 0.02, y: 0.05 }
            ],
            color: 'rgba(200, 195, 220, 0.5)',
            fill: true
        },
        // White wisp tip
        {
            type: 'circle',
            x: 0.14, y: 0.20,
            radius: 0.025,
            color: 'rgba(255, 255, 255, 0.7)',
            fill: true,
            glow: { color: '#ffffff', blur: 4 }
        }
    ], 0, 0.5, 3);
    wispRight.setBaseTransform(0.18, 0.02);
    sprite.setParent('wispRight', 'body');

    // HEAD (ghostly face, z-order 10)
    const head = sprite.addPart('head', [
        // White outer glow
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.30, height: 0.34,
            color: 'rgba(255, 255, 255, 0.2)',
            fill: true
        },
        // Main face
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.26, height: 0.30,
            color: 'rgba(220, 215, 230, 0.85)',
            fill: true
        },
        // Face shadow detail
        {
            type: 'ellipse',
            x: 0, y: 0.02,
            width: 0.20, height: 0.22,
            color: 'rgba(180, 175, 200, 0.5)',
            fill: true
        },
        // Hollow left eye
        {
            type: 'ellipse',
            x: -0.06, y: -0.02,
            width: 0.06, height: 0.08,
            color: 'rgba(255, 255, 255, 0.95)',
            fill: true,
            glow: { color: '#ffffff', blur: 8 }
        },
        // Hollow right eye  
        {
            type: 'ellipse',
            x: 0.06, y: -0.02,
            width: 0.06, height: 0.08,
            color: 'rgba(255, 255, 255, 0.95)',
            fill: true,
            glow: { color: '#ffffff', blur: 8 }
        },
        // Eye void left
        {
            type: 'circle',
            x: -0.06, y: -0.02,
            radius: 0.02,
            color: '#1a1a2a',
            fill: true
        },
        // Eye void right
        {
            type: 'circle',
            x: 0.06, y: -0.02,
            radius: 0.02,
            color: '#1a1a2a',
            fill: true
        },
        // Ghostly mouth
        {
            type: 'ellipse',
            x: 0, y: 0.08,
            width: 0.08, height: 0.04,
            color: 'rgba(40, 35, 60, 0.7)',
            fill: true
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.22);
    sprite.setParent('head', 'body');

    // HOOD (spectral hood, z-order 8)
    const hood = sprite.addPart('hood', [
        // Hood outer glow
        {
            type: 'polygon',
            points: [
                { x: 0, y: -0.08 },
                { x: -0.16, y: -0.01 },
                { x: -0.18, y: 0.14 },
                { x: 0, y: 0.10 },
                { x: 0.18, y: 0.14 },
                { x: 0.16, y: -0.01 }
            ],
            color: 'rgba(255, 255, 255, 0.15)',
            fill: true
        },
        // Main hood
        {
            type: 'polygon',
            points: [
                { x: 0, y: -0.06 },
                { x: -0.14, y: 0 },
                { x: -0.16, y: 0.12 },
                { x: 0, y: 0.08 },
                { x: 0.16, y: 0.12 },
                { x: 0.14, y: 0 }
            ],
            color: 'rgba(180, 175, 200, 0.75)',
            fill: true
        }
    ], 0.5, 0.5, 8);
    hood.setBaseTransform(0, -0.12);
    sprite.setParent('hood', 'head');

    // Animations - all parts for reference
    const allParts = ['body', 'head', 'hood', 'wispLeft', 'wispRight', 'legLeft', 'legRight', 'trail'];
    const upperParts = ['body', 'head', 'hood', 'wispLeft', 'wispRight'];

    // Custom IDLE animation - ethereal floating with wisps swaying
    const idle = new AnimationClip('idle', 2.5, true);
    idle.addTrack('body', [
        { time: 0, transform: { y: 0, scaleY: 1.0, rotation: 0 } },
        { time: 0.6, transform: { y: -0.04, scaleY: 1.03, rotation: 0.02 } },
        { time: 1.25, transform: { y: -0.06, scaleY: 1.05, rotation: 0 } },
        { time: 1.9, transform: { y: -0.04, scaleY: 1.03, rotation: -0.02 } },
        { time: 2.5, transform: { y: 0, scaleY: 1.0, rotation: 0 } }
    ]);
    idle.addTrack('head', [
        { time: 0, transform: { y: 0, rotation: 0 } },
        { time: 0.6, transform: { y: -0.03, rotation: 0.06 } },
        { time: 1.25, transform: { y: -0.05, rotation: 0 } },
        { time: 1.9, transform: { y: -0.03, rotation: -0.06 } },
        { time: 2.5, transform: { y: 0, rotation: 0 } }
    ]);
    idle.addTrack('hood', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.6, transform: { scaleX: 1.04, scaleY: 1.02 } },
        { time: 1.25, transform: { scaleX: 1.06, scaleY: 1.04 } },
        { time: 1.9, transform: { scaleX: 1.04, scaleY: 1.02 } },
        { time: 2.5, transform: { scaleX: 1.0, scaleY: 1.0 } }
    ]);
    idle.addTrack('wispLeft', [
        { time: 0, transform: { rotation: 0, x: 0, scaleY: 1.0 } },
        { time: 0.5, transform: { rotation: -0.20, x: -0.04, scaleY: 1.08 } },
        { time: 1.0, transform: { rotation: 0.10, x: 0.02, scaleY: 0.95 } },
        { time: 1.5, transform: { rotation: -0.25, x: -0.05, scaleY: 1.12 } },
        { time: 2.0, transform: { rotation: 0.08, x: 0.01, scaleY: 1.0 } },
        { time: 2.5, transform: { rotation: 0, x: 0, scaleY: 1.0 } }
    ]);
    idle.addTrack('wispRight', [
        { time: 0, transform: { rotation: 0, x: 0, scaleY: 1.0 } },
        { time: 0.5, transform: { rotation: 0.20, x: 0.04, scaleY: 1.08 } },
        { time: 1.0, transform: { rotation: -0.10, x: -0.02, scaleY: 0.95 } },
        { time: 1.5, transform: { rotation: 0.25, x: 0.05, scaleY: 1.12 } },
        { time: 2.0, transform: { rotation: -0.08, x: -0.01, scaleY: 1.0 } },
        { time: 2.5, transform: { rotation: 0, x: 0, scaleY: 1.0 } }
    ]);
    idle.addTrack('trail', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, x: 0 } },
        { time: 0.8, transform: { scaleX: 1.15, scaleY: 1.08, x: -0.02 } },
        { time: 1.6, transform: { scaleX: 1.20, scaleY: 1.12, x: 0.02 } },
        { time: 2.5, transform: { scaleX: 1.0, scaleY: 1.0, x: 0 } }
    ]);
    idle.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 1.25, transform: { rotation: 0.08, scaleY: 1.05 } },
        { time: 2.5, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    idle.addTrack('legRight', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
        { time: 1.25, transform: { rotation: -0.08, scaleY: 1.05 } },
        { time: 2.5, transform: { rotation: 0, scaleY: 1.0 } }
    ]);
    sprite.addAnimation(idle);

    // Custom WALK animation - gliding with phasing effect
    const walk = new AnimationClip('walk', 0.7, true);
    walk.addTrack('body', [
        { time: 0, transform: { y: 0, rotation: 0.04, scaleY: 1.0 } },
        { time: 0.175, transform: { y: -0.05, rotation: -0.04, scaleY: 0.97 } },
        { time: 0.35, transform: { y: -0.02, rotation: -0.04, scaleY: 1.0 } },
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
    walk.addTrack('hood', [
        { time: 0, transform: { scaleX: 1.0, y: 0 } },
        { time: 0.35, transform: { scaleX: 1.08, y: -0.02 } },
        { time: 0.7, transform: { scaleX: 1.0, y: 0 } }
    ]);
    walk.addTrack('legLeft', [
        { time: 0, transform: { rotation: 0.4, y: -0.02, scaleY: 0.95 } },
        { time: 0.175, transform: { rotation: 0, y: 0, scaleY: 1.0 } },
        { time: 0.35, transform: { rotation: -0.4, y: -0.02, scaleY: 0.95 } },
        { time: 0.525, transform: { rotation: 0, y: 0, scaleY: 1.0 } },
        { time: 0.7, transform: { rotation: 0.4, y: -0.02, scaleY: 0.95 } }
    ]);
    walk.addTrack('legRight', [
        { time: 0, transform: { rotation: -0.4, y: -0.02, scaleY: 0.95 } },
        { time: 0.175, transform: { rotation: 0, y: 0, scaleY: 1.0 } },
        { time: 0.35, transform: { rotation: 0.4, y: -0.02, scaleY: 0.95 } },
        { time: 0.525, transform: { rotation: 0, y: 0, scaleY: 1.0 } },
        { time: 0.7, transform: { rotation: -0.4, y: -0.02, scaleY: 0.95 } }
    ]);
    walk.addTrack('wispLeft', [
        { time: 0, transform: { rotation: 0.18, x: 0.02, scaleY: 1.0 } },
        { time: 0.175, transform: { rotation: -0.22, x: -0.04, scaleY: 1.1 } },
        { time: 0.35, transform: { rotation: 0.12, x: 0.01, scaleY: 0.95 } },
        { time: 0.525, transform: { rotation: -0.18, x: -0.03, scaleY: 1.08 } },
        { time: 0.7, transform: { rotation: 0.18, x: 0.02, scaleY: 1.0 } }
    ]);
    walk.addTrack('wispRight', [
        { time: 0, transform: { rotation: -0.18, x: -0.02, scaleY: 1.0 } },
        { time: 0.175, transform: { rotation: 0.22, x: 0.04, scaleY: 1.1 } },
        { time: 0.35, transform: { rotation: -0.12, x: -0.01, scaleY: 0.95 } },
        { time: 0.525, transform: { rotation: 0.18, x: 0.03, scaleY: 1.08 } },
        { time: 0.7, transform: { rotation: -0.18, x: -0.02, scaleY: 1.0 } }
    ]);
    walk.addTrack('trail', [
        { time: 0, transform: { scaleX: 1.0, x: -0.03 } },
        { time: 0.35, transform: { scaleX: 1.20, x: -0.06 } },
        { time: 0.7, transform: { scaleX: 1.0, x: -0.03 } }
    ]);
    sprite.addAnimation(walk);

    // Custom ATTACK animation - phase strike with wisps lashing
    const attack = new AnimationClip('attack', 0.55, false);
    attack.addTrack('body', [
        { time: 0, transform: { rotation: 0, scaleX: 1.0, y: 0 } },
        { time: 0.15, transform: { rotation: -0.15, scaleX: 0.92, y: -0.04 } },
        { time: 0.35, transform: { rotation: 0.20, scaleX: 1.15, y: 0.03 } },
        { time: 0.55, transform: { rotation: 0, scaleX: 1.0, y: 0 } }
    ]);
    attack.addTrack('head', [
        { time: 0, transform: { rotation: 0, y: 0 } },
        { time: 0.15, transform: { rotation: -0.12, y: -0.03 } },
        { time: 0.35, transform: { rotation: 0.18, y: 0.04 } },
        { time: 0.55, transform: { rotation: 0, y: 0 } }
    ]);
    attack.addTrack('hood', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.15, transform: { scaleX: 0.95, scaleY: 1.1 } },
        { time: 0.35, transform: { scaleX: 1.15, scaleY: 0.9 } },
        { time: 0.55, transform: { scaleX: 1.0, scaleY: 1.0 } }
    ]);
    attack.addTrack('wispLeft', [
        { time: 0, transform: { rotation: 0, x: 0, scaleY: 1.0 } },
        { time: 0.15, transform: { rotation: 0.35, x: 0.05, scaleY: 0.9 } },
        { time: 0.35, transform: { rotation: -0.50, x: -0.08, scaleY: 1.3 } },
        { time: 0.55, transform: { rotation: 0, x: 0, scaleY: 1.0 } }
    ]);
    attack.addTrack('wispRight', [
        { time: 0, transform: { rotation: 0, x: 0, scaleY: 1.0 } },
        { time: 0.15, transform: { rotation: -0.35, x: -0.05, scaleY: 0.9 } },
        { time: 0.35, transform: { rotation: 0.50, x: 0.08, scaleY: 1.3 } },
        { time: 0.55, transform: { rotation: 0, x: 0, scaleY: 1.0 } }
    ]);
    attack.addTrack('trail', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.35, transform: { scaleX: 1.4, scaleY: 1.2 } },
        { time: 0.55, transform: { scaleX: 1.0, scaleY: 1.0 } }
    ]);
    sprite.addAnimation(attack);

    // PHASE animation - special shadow teleport/phase ability
    const phase = new AnimationClip('phase', 0.6, false);
    phase.addTrack('body', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, y: 0 } },
        { time: 0.15, transform: { scaleX: 0.6, scaleY: 1.3, y: -0.05 } },
        { time: 0.3, transform: { scaleX: 0.2, scaleY: 1.5, y: -0.08 } },
        { time: 0.45, transform: { scaleX: 0.6, scaleY: 1.3, y: -0.05 } },
        { time: 0.6, transform: { scaleX: 1.0, scaleY: 1.0, y: 0 } }
    ]);
    phase.addTrack('head', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.15, transform: { scaleX: 0.7, scaleY: 1.2 } },
        { time: 0.3, transform: { scaleX: 0.3, scaleY: 1.4 } },
        { time: 0.45, transform: { scaleX: 0.7, scaleY: 1.2 } },
        { time: 0.6, transform: { scaleX: 1.0, scaleY: 1.0 } }
    ]);
    phase.addTrack('wispLeft', [
        { time: 0, transform: { scaleX: 1.0, rotation: 0 } },
        { time: 0.3, transform: { scaleX: 0.3, rotation: -0.5 } },
        { time: 0.6, transform: { scaleX: 1.0, rotation: 0 } }
    ]);
    phase.addTrack('wispRight', [
        { time: 0, transform: { scaleX: 1.0, rotation: 0 } },
        { time: 0.3, transform: { scaleX: 0.3, rotation: 0.5 } },
        { time: 0.6, transform: { scaleX: 1.0, rotation: 0 } }
    ]);
    phase.addTrack('trail', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.3, transform: { scaleX: 2.0, scaleY: 0.5 } },
        { time: 0.6, transform: { scaleX: 1.0, scaleY: 1.0 } }
    ]);
    phase.addTrack('legLeft', [
        { time: 0, transform: { scaleY: 1.0 } },
        { time: 0.3, transform: { scaleY: 0.3 } },
        { time: 0.6, transform: { scaleY: 1.0 } }
    ]);
    phase.addTrack('legRight', [
        { time: 0, transform: { scaleY: 1.0 } },
        { time: 0.3, transform: { scaleY: 0.3 } },
        { time: 0.6, transform: { scaleY: 1.0 } }
    ]);
    sprite.addAnimation(phase);

    // HIT animation
    const hit = new AnimationClip('hit', 0.3, false);
    hit.addTrack('body', [
        { time: 0, transform: { x: 0, scaleX: 1.0 } },
        { time: 0.08, transform: { x: -0.06, scaleX: 0.85 } },
        { time: 0.15, transform: { x: 0.04, scaleX: 1.1 } },
        { time: 0.22, transform: { x: -0.02, scaleX: 0.95 } },
        { time: 0.3, transform: { x: 0, scaleX: 1.0 } }
    ]);
    hit.addTrack('head', [
        { time: 0, transform: { rotation: 0 } },
        { time: 0.08, transform: { rotation: -0.20 } },
        { time: 0.15, transform: { rotation: 0.15 } },
        { time: 0.3, transform: { rotation: 0 } }
    ]);
    hit.addTrack('hood', [
        { time: 0, transform: { scaleX: 1.0 } },
        { time: 0.08, transform: { scaleX: 1.15 } },
        { time: 0.3, transform: { scaleX: 1.0 } }
    ]);
    hit.addTrack('wispLeft', [
        { time: 0, transform: { rotation: 0, x: 0 } },
        { time: 0.1, transform: { rotation: 0.30, x: 0.04 } },
        { time: 0.3, transform: { rotation: 0, x: 0 } }
    ]);
    hit.addTrack('wispRight', [
        { time: 0, transform: { rotation: 0, x: 0 } },
        { time: 0.1, transform: { rotation: -0.30, x: -0.04 } },
        { time: 0.3, transform: { rotation: 0, x: 0 } }
    ]);
    hit.addTrack('trail', [
        { time: 0, transform: { scaleX: 1.0 } },
        { time: 0.15, transform: { scaleX: 1.5 } },
        { time: 0.3, transform: { scaleX: 1.0 } }
    ]);
    hit.addTrack('legLeft', [
        { time: 0, transform: { x: 0 } },
        { time: 0.1, transform: { x: -0.03 } },
        { time: 0.3, transform: { x: 0 } }
    ]);
    hit.addTrack('legRight', [
        { time: 0, transform: { x: 0 } },
        { time: 0.1, transform: { x: 0.03 } },
        { time: 0.3, transform: { x: 0 } }
    ]);
    sprite.addAnimation(hit);

    // DEATH animation - dissolve into shadows
    const death = new AnimationClip('death', 1.0, false);
    death.addTrack('body', [
        { time: 0, transform: { y: 0, scaleY: 1.0, scaleX: 1.0, rotation: 0 } },
        { time: 0.2, transform: { y: -0.05, scaleY: 1.2, scaleX: 0.8, rotation: 0.1 } },
        { time: 0.5, transform: { y: 0.05, scaleY: 0.6, scaleX: 1.3, rotation: -0.05 } },
        { time: 0.8, transform: { y: 0.15, scaleY: 0.3, scaleX: 1.6, rotation: 0 } },
        { time: 1.0, transform: { y: 0.25, scaleY: 0.1, scaleX: 2.0, rotation: 0 } }
    ]);
    death.addTrack('head', [
        { time: 0, transform: { y: 0, scaleY: 1.0, scaleX: 1.0, rotation: 0 } },
        { time: 0.2, transform: { y: -0.08, scaleY: 1.1, scaleX: 0.9, rotation: -0.2 } },
        { time: 0.5, transform: { y: 0.02, scaleY: 0.5, scaleX: 1.2, rotation: 0.1 } },
        { time: 1.0, transform: { y: 0.1, scaleY: 0.0, scaleX: 1.5, rotation: 0 } }
    ]);
    death.addTrack('hood', [
        { time: 0, transform: { scaleY: 1.0, scaleX: 1.0 } },
        { time: 0.3, transform: { scaleY: 1.3, scaleX: 1.2 } },
        { time: 0.7, transform: { scaleY: 0.4, scaleX: 1.5 } },
        { time: 1.0, transform: { scaleY: 0.0, scaleX: 2.0 } }
    ]);
    death.addTrack('wispLeft', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0, x: 0 } },
        { time: 0.3, transform: { rotation: -0.5, scaleY: 1.4, x: -0.08 } },
        { time: 0.7, transform: { rotation: -0.8, scaleY: 0.5, x: -0.15 } },
        { time: 1.0, transform: { rotation: -1.0, scaleY: 0.0, x: -0.20 } }
    ]);
    death.addTrack('wispRight', [
        { time: 0, transform: { rotation: 0, scaleY: 1.0, x: 0 } },
        { time: 0.3, transform: { rotation: 0.5, scaleY: 1.4, x: 0.08 } },
        { time: 0.7, transform: { rotation: 0.8, scaleY: 0.5, x: 0.15 } },
        { time: 1.0, transform: { rotation: 1.0, scaleY: 0.0, x: 0.20 } }
    ]);
    death.addTrack('trail', [
        { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
        { time: 0.3, transform: { scaleX: 1.8, scaleY: 0.8 } },
        { time: 0.6, transform: { scaleX: 2.5, scaleY: 0.4 } },
        { time: 1.0, transform: { scaleX: 3.0, scaleY: 0.0 } }
    ]);
    death.addTrack('legLeft', [
        { time: 0, transform: { scaleY: 1.0, y: 0 } },
        { time: 0.4, transform: { scaleY: 0.5, y: 0.05 } },
        { time: 1.0, transform: { scaleY: 0.0, y: 0.1 } }
    ]);
    death.addTrack('legRight', [
        { time: 0, transform: { scaleY: 1.0, y: 0 } },
        { time: 0.4, transform: { scaleY: 0.5, y: 0.05 } },
        { time: 1.0, transform: { scaleY: 0.0, y: 0.1 } }
    ]);
    sprite.addAnimation(death);

    return sprite;
}
