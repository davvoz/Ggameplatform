/**
 * Multi-Part Enemy Sprite Definitions
 * Each enemy built from independent animated parts
 */

import { MultiPartSprite, AnimationBuilder } from './sprite-animation-system.js';

export const MultiPartEnemySprites = {

    /**
     * Create GRUNT with separate body parts
     */
    createGrunt() {
        const sprite = new MultiPartSprite('grunt');

        // BODY (main part)
        const body = sprite.addPart('body', [
            {
                type: 'ellipse',
                x: 0.25, y: 0,
                width: 0.5, height: 0.65,
                color: '#3a5a4a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.13, y: 0.15,
                width: 0.24, height: 0.08,
                color: '#5a7a6a',
                fill: true
            }
        ], 0.5, 0.5);
        body.setBaseTransform(0, 0.25);

        // SHOULDERS
        const shoulders = sprite.addPart('shoulders', {
            type: 'rect',
            x: 0, y: 0,
            width: 0.56, height: 0.15,
            color: '#4a6a5a',
            fill: true
        }, 0.5, 0.5);
        shoulders.setBaseTransform(0, -0.08);
        sprite.setParent('shoulders', 'body');

        // HEAD
        const head = sprite.addPart('head', [
            {
                type: 'circle',
                x: 0, y: 0,
                radius: 0.18,
                color: '#2d4a3a',
                fill: true
            },
            {
                type: 'circle',
                x: -0.08, y: -0.02,
                radius: 0.04,
                color: '#ff3333',
                fill: true
            },
            {
                type: 'circle',
                x: 0.08, y: -0.02,
                radius: 0.04,
                color: '#ff3333',
                fill: true
            }
        ], 0.5, 0.5);
        head.setBaseTransform(0, -0.25);
        sprite.setParent('head', 'body');

        // Setup animations
        sprite.addAnimation(AnimationBuilder.createIdleAnimation(['head', 'body'], 2.0));
        sprite.addAnimation(AnimationBuilder.createWalkAnimation(['body', 'head'], 1.0));
        sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head', 'shoulders'], 0.25));
        sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head'], 1.2));

        return sprite;
    },

    /**
     * Create RUSHER with dynamic parts
     */
    createRusher() {
        const sprite = new MultiPartSprite('rusher');

        // BODY (lean forward)
        const body = sprite.addPart('body', [
            {
                type: 'ellipse',
                x: 0.15, y: 0,
                width: 0.35, height: 0.55,
                color: '#8a3a3a',
                fill: true
            },
            {
                type: 'path',
                points: [
                    { x: -0.05, y: 0 },
                    { x: -0.15, y: 0.02 }
                ],
                color: '#ff6666',
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'path',
                points: [
                    { x: -0.05, y: 0.1 },
                    { x: -0.13, y: 0.12 }
                ],
                color: '#ff6666',
                stroke: true,
                strokeWidth: 2
            }
        ], 0.5, 0.5);
        body.setBaseTransform(0, 0.1, 0.1); // Leaning forward

        // HORNS
        const hornLeft = sprite.addPart('hornLeft', {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.05, y: -0.08 },
                { x: 0.03, y: -0.02 }
            ],
            color: '#aa4a4a',
            fill: true
        }, 0.5, 1);
        hornLeft.setBaseTransform(-0.05, -0.1);

        const hornRight = sprite.addPart('hornRight', {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 0.05, y: -0.08 },
                { x: -0.03, y: -0.02 }
            ],
            color: '#aa4a4a',
            fill: true
        }, 0.5, 1);
        hornRight.setBaseTransform(0.05, -0.1);

        // HEAD (aggressive)
        const head = sprite.addPart('head', [
            {
                type: 'ellipse',
                x: 0, y: 0,
                width: 0.22, height: 0.26,
                color: '#6a2a2a',
                fill: true
            },
            {
                type: 'circle',
                x: -0.06, y: -0.02,
                radius: 0.05,
                color: '#ffaa00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.1, y: -0.02,
                radius: 0.05,
                color: '#ffaa00',
                fill: true
            }
        ], 0.5, 0.5);
        head.setBaseTransform(0.02, -0.22, 0.05);
        sprite.setParent('head', 'body');
        sprite.setParent('hornLeft', 'head');
        sprite.setParent('hornRight', 'head');

        // Fast walk animation
        const fastWalk = AnimationBuilder.createWalkAnimation(['body', 'head'], 0.4);
        sprite.addAnimation(fastWalk);
        sprite.addAnimation(AnimationBuilder.createIdleAnimation(['head', 'body'], 1.0));
        sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head'], 0.2));
        sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head'], 0.8));

        return sprite;
    },

    /**
     * Create TANK with heavy armor parts
     */
    createTank() {
        const sprite = new MultiPartSprite('tank');

        // BODY (heavy and large)
        const body = sprite.addPart('body', [
            {
                type: 'rect',
                x: 0, y: 0,
                width: 0.5, height: 0.5,
                color: '#4a4a6a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.03, y: 0.03,
                width: 0.44, height: 0.12,
                color: '#6a6a8a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.03, y: 0.2,
                width: 0.44, height: 0.12,
                color: '#6a6a8a',
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.25, y: 0.07 },
                    { x: 0.2, y: 0.13 },
                    { x: 0.2, y: 0.19 },
                    { x: 0.25, y: 0.23 },
                    { x: 0.3, y: 0.19 },
                    { x: 0.3, y: 0.13 }
                ],
                color: '#8a8aaa',
                fill: true
            }
        ], 0.5, 0.5);
        body.setBaseTransform(0, 0.2);

        // SHOULDER PAULDRONS
        const shoulderLeft = sprite.addPart('shoulderLeft', {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.08,
            color: '#5a5a7a',
            fill: true
        }, 0.5, 0.5);
        shoulderLeft.setBaseTransform(-0.28, 0.03);
        sprite.setParent('shoulderLeft', 'body');

        const shoulderRight = sprite.addPart('shoulderRight', {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.08,
            color: '#5a5a7a',
            fill: true
        }, 0.5, 0.5);
        shoulderRight.setBaseTransform(0.28, 0.03);
        sprite.setParent('shoulderRight', 'body');

        // HEAD
        const head = sprite.addPart('head', [
            {
                type: 'rect',
                x: 0, y: 0,
                width: 0.36, height: 0.3,
                color: '#3a3a5a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.04, y: 0.09,
                width: 0.28, height: 0.06,
                color: '#ff4444',
                fill: true
            }
        ], 0.5, 0.5);
        head.setBaseTransform(0, -0.25);
        sprite.setParent('head', 'body');

        // Slow heavy animations
        sprite.addAnimation(AnimationBuilder.createIdleAnimation(['head', 'body'], 3.0));
        const slowWalk = AnimationBuilder.createWalkAnimation(['body', 'head'], 1.5);
        sprite.addAnimation(slowWalk);
        sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head'], 0.3));
        sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head'], 1.5));

        return sprite;
    },

    /**
     * Create FLYER with animated wings
     */
    createFlyer() {
        const sprite = new MultiPartSprite('flyer');

        // BODY (small core)
        const body = sprite.addPart('body', {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.25, height: 0.35,
            color: '#4a3a5a',
            fill: true
        }, 0.5, 0.5);
        body.setBaseTransform(0, 0);

        // HEAD
        const head = sprite.addPart('head', [
            {
                type: 'circle',
                x: 0, y: 0,
                radius: 0.12,
                color: '#3a2a4a',
                fill: true
            },
            {
                type: 'circle',
                x: -0.05, y: -0.02,
                radius: 0.04,
                color: '#ffff00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.05, y: -0.02,
                radius: 0.04,
                color: '#ffff00',
                fill: true
            }
        ], 0.5, 0.5);
        head.setBaseTransform(0, -0.18);
        sprite.setParent('head', 'body');

        // LEFT WING (will flap)
        const wingLeft = sprite.addPart('wingLeft', [
            {
                type: 'polygon',
                points: [
                    { x: 0, y: 0 },
                    { x: -0.2, y: -0.1 },
                    { x: -0.15, y: 0.1 },
                    { x: -0.03, y: 0.1 }
                ],
                color: '#6a4a7a',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'polygon',
                points: [
                    { x: -0.1, y: -0.05 },
                    { x: -0.18, y: -0.08 },
                    { x: -0.13, y: 0.05 }
                ],
                color: 'rgba(138, 98, 158, 0.5)',
                fill: true
            }
        ], 1, 0.5); // Pivot at body connection
        wingLeft.setBaseTransform(-0.125, 0);
        sprite.setParent('wingLeft', 'body');

        // RIGHT WING
        const wingRight = sprite.addPart('wingRight', [
            {
                type: 'polygon',
                points: [
                    { x: 0, y: 0 },
                    { x: 0.2, y: -0.1 },
                    { x: 0.15, y: 0.1 },
                    { x: 0.03, y: 0.1 }
                ],
                color: '#6a4a7a',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.1, y: -0.05 },
                    { x: 0.18, y: -0.08 },
                    { x: 0.13, y: 0.05 }
                ],
                color: 'rgba(138, 98, 158, 0.5)',
                fill: true
            }
        ], 0, 0.5);
        wingRight.setBaseTransform(0.125, 0);
        sprite.setParent('wingRight', 'body');

        // TAIL
        const tail = sprite.addPart('tail', {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.05, y: 0.2 },
                { x: 0.05, y: 0.2 }
            ],
            color: '#4a3a5a',
            fill: true
        }, 0.5, 0);
        tail.setBaseTransform(0, 0.175);
        sprite.setParent('tail', 'body');

        // Wing flap animation
        const fly = new AnimationClip('fly', 0.3, true);
        fly.addTrack('wingLeft', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.15, transform: { rotation: -0.6 } },
            { time: 0.3, transform: { rotation: 0 } }
        ]);
        fly.addTrack('wingRight', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.15, transform: { rotation: 0.6 } },
            { time: 0.3, transform: { rotation: 0 } }
        ]);
        fly.addTrack('body', [
            { time: 0, transform: { y: 0 } },
            { time: 0.15, transform: { y: -0.05 } },
            { time: 0.3, transform: { y: 0 } }
        ]);

        sprite.addAnimation(fly);

        // --- AGGIUNTA: walk = fly ---
        const walk = new AnimationClip('walk', 0.3, true);
        walk.tracks = JSON.parse(JSON.stringify(fly.tracks));
        sprite.addAnimation(walk);

        sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head'], 0.2));
        sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head', 'wingLeft', 'wingRight', 'tail'], 1.0));

        return sprite;
    },

    /**
     * Create HEALER with floating robes and glowing aura
     */
    createHealer() {
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
    },

    /**
     * Create BOSS with massive armored form
     */
    createBoss() {
        const sprite = new MultiPartSprite('boss');

        // BODY - massive armored torso
        const body = sprite.addPart('body', [
            {
                type: 'polygon',
                points: [
                    { x: 0.2, y: 0.08 },
                    { x: 0.8, y: 0.08 },
                    { x: 0.75, y: 0.52 },
                    { x: 0.25, y: 0.52 }
                ],
                color: '#6a3a3a',
                fill: true
            },
            {
                type: 'rect', // Center plate
                x: 0.42, y: 0.15,
                width: 0.16, height: 0.28,
                color: '#8a4a4a',
                fill: true
            },
            {
                type: 'circle', // Core emblem
                x: 0.5, y: 0.28,
                radius: 0.05,
                color: '#ff0000',
                fill: true,
                glow: { color: '#ff0000', blur: 8 }
            },
            {
                type: 'polygon', // Spikes top
                points: [
                    { x: 0.28, y: 0.08 },
                    { x: 0.32, y: 0.02 },
                    { x: 0.36, y: 0.08 }
                ],
                color: '#aa5a5a',
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.46, y: 0.08 },
                    { x: 0.5, y: 0.01 },
                    { x: 0.54, y: 0.08 }
                ],
                color: '#aa5a5a',
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.64, y: 0.08 },
                    { x: 0.68, y: 0.02 },
                    { x: 0.72, y: 0.08 }
                ],
                color: '#aa5a5a',
                fill: true
            }
        ], 0.5, 0.5);
        body.setBaseTransform(0, 0.2);

        // SHOULDER ARMOR (huge pauldrons)
        const shoulderLeft = sprite.addPart('shoulderLeft', [
            {
                type: 'polygon',
                points: [
                    { x: 0, y: 0 },
                    { x: -0.15, y: -0.02 },
                    { x: -0.18, y: 0.08 },
                    { x: -0.15, y: 0.18 },
                    { x: 0, y: 0.16 }
                ],
                color: '#7a4a4a',
                fill: true
            },
            {
                type: 'polygon', // Spike
                points: [
                    { x: -0.15, y: -0.02 },
                    { x: -0.18, y: -0.08 },
                    { x: -0.12, y: 0 }
                ],
                color: '#aa6a6a',
                fill: true
            }
        ], 1, 0.5);
        shoulderLeft.setBaseTransform(-0.08, 0.08);
        sprite.setParent('shoulderLeft', 'body');

        const shoulderRight = sprite.addPart('shoulderRight', [
            {
                type: 'polygon',
                points: [
                    { x: 0, y: 0 },
                    { x: 0.15, y: -0.02 },
                    { x: 0.18, y: 0.08 },
                    { x: 0.15, y: 0.18 },
                    { x: 0, y: 0.16 }
                ],
                color: '#7a4a4a',
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.15, y: -0.02 },
                    { x: 0.18, y: -0.08 },
                    { x: 0.12, y: 0 }
                ],
                color: '#aa6a6a',
                fill: true
            }
        ], 0, 0.5);
        shoulderRight.setBaseTransform(0.08, 0.08);
        sprite.setParent('shoulderRight', 'body');

        // ARMS with weapons
        const armLeft = sprite.addPart('armLeft', [
            {
                type: 'polygon',
                points: [
                    { x: 0, y: 0 },
                    { x: -0.08, y: 0 },
                    { x: -0.09, y: 0.26 },
                    { x: -0.04, y: 0.26 }
                ],
                color: '#5a3a3a',
                fill: true
            },
            {
                type: 'polygon', // Blade weapon
                points: [
                    { x: -0.065, y: 0.26 },
                    { x: -0.04, y: 0.26 },
                    { x: -0.035, y: 0.36 },
                    { x: -0.07, y: 0.36 },
                    { x: -0.065, y: 0.42 }
                ],
                color: '#cccccc',
                fill: true
            }
        ], 0.5, 0);
        armLeft.setBaseTransform(-0.05, 0.12);
        sprite.setParent('armLeft', 'body');

        const armRight = sprite.addPart('armRight', [
            {
                type: 'polygon',
                points: [
                    { x: 0, y: 0 },
                    { x: 0.08, y: 0 },
                    { x: 0.09, y: 0.26 },
                    { x: 0.04, y: 0.26 }
                ],
                color: '#5a3a3a',
                fill: true
            },
            {
                type: 'polygon', // Mace weapon
                points: [
                    { x: 0.04, y: 0.26 },
                    { x: 0.07, y: 0.26 },
                    { x: 0.07, y: 0.36 }
                ],
                color: '#888888',
                fill: true
            },
            {
                type: 'circle',
                x: 0.055, y: 0.38,
                radius: 0.03,
                color: '#aaaaaa',
                fill: true
            }
        ], 0.5, 0);
        armRight.setBaseTransform(0.05, 0.12);
        sprite.setParent('armRight', 'body');

        // HEAD with horned helmet
        const head = sprite.addPart('head', [
            {
                type: 'rect',
                x: -0.08, y: 0,
                width: 0.16, height: 0.14,
                color: '#8a5a5a',
                fill: true
            },
            {
                type: 'rect', // Visor
                x: -0.06, y: 0.05,
                width: 0.12, height: 0.03,
                color: '#ff3333',
                fill: true,
                glow: { color: '#ff3333', blur: 6 }
            },
            {
                type: 'polygon', // Left horn
                points: [
                    { x: -0.08, y: 0 },
                    { x: -0.13, y: -0.12 },
                    { x: -0.07, y: 0.02 }
                ],
                color: '#aa6a6a',
                fill: true
            },
            {
                type: 'polygon', // Right horn
                points: [
                    { x: 0.08, y: 0 },
                    { x: 0.13, y: -0.12 },
                    { x: 0.07, y: 0.02 }
                ],
                color: '#aa6a6a',
                fill: true
            }
        ], 0.5, 1);
        head.setBaseTransform(0, -0.03);
        sprite.setParent('head', 'body');

        // Heavy walk animation - slow and powerful
        const walk = new AnimationClip('walk', 1.8, true);
        walk.addTrack('body', [
            { time: 0, transform: { y: 0, rotation: 0 } },
            { time: 0.45, transform: { y: -0.02, rotation: 0.02 } },
            { time: 0.9, transform: { y: 0, rotation: 0 } },
            { time: 1.35, transform: { y: -0.02, rotation: -0.02 } },
            { time: 1.8, transform: { y: 0, rotation: 0 } }
        ]);
        walk.addTrack('shoulderLeft', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.9, transform: { rotation: 0.08 } },
            { time: 1.8, transform: { rotation: 0 } }
        ]);
        walk.addTrack('shoulderRight', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.9, transform: { rotation: -0.08 } },
            { time: 1.8, transform: { rotation: 0 } }
        ]);

        sprite.addAnimation(walk);

        // Attack animation - powerful swing
        const attack = new AnimationClip('attack', 0.8, false);
        attack.addTrack('armRight', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.3, transform: { rotation: -0.5 } },
            { time: 0.5, transform: { rotation: 0.3 } },
            { time: 0.8, transform: { rotation: 0 } }
        ]);
        attack.addTrack('armLeft', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.3, transform: { rotation: 0.5 } },
            { time: 0.5, transform: { rotation: -0.3 } },
            { time: 0.8, transform: { rotation: 0 } }
        ]);
        attack.addTrack('body', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.3, transform: { rotation: 0.12 } },
            { time: 0.5, transform: { rotation: -0.08 } },
            { time: 0.8, transform: { rotation: 0 } }
        ]);
        sprite.addAnimation(attack);

        sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head'], 0.25));
        sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head', 'armLeft', 'armRight'], 1.5));

        return sprite;
    }
};

// Export

