/**
 * Multi-Part Enemy Sprite Definitions
 * Each enemy built from independent animated parts
 */

import { MultiPartSprite, AnimationBuilder, AnimationClip } from './sprite-animation-system.js';

export const MultiPartEnemySprites = {

    /**
     * Create GRUNT with separate body parts
     */
    createGrunt() {
        const sprite = new MultiPartSprite('grunt');

        // LEFT LEG (behind body, z-order -10)
        const legLeft = sprite.addPart('legLeft', {
            type: 'ellipse',
            x: 0, y: 0.18,
            width: 0.14, height: 0.36,
            color: '#2a4a3a',
            fill: true
        }, 0.5, 0, -10);
        legLeft.setBaseTransform(-0.08, 0.28);

        // RIGHT LEG (behind body, z-order -10)
        const legRight = sprite.addPart('legRight', {
            type: 'ellipse',
            x: 0, y: 0.18,
            width: 0.14, height: 0.36,
            color: '#2a4a3a',
            fill: true
        }, 0.5, 0, -10);
        legRight.setBaseTransform(0.08, 0.28);

        // BODY (main part, z-order 0)
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
        ], 0.5, 0.5, 0);
        body.setBaseTransform(0, 0.25);

        // Parent legs to body
        sprite.setParent('legLeft', 'body');
        sprite.setParent('legRight', 'body');

        // SHOULDERS (z-order 5)
        const shoulders = sprite.addPart('shoulders', {
            type: 'rect',
            x: 0, y: 0,
            width: 0.56, height: 0.15,
            color: '#4a6a5a',
            fill: true
        }, 0.5, 0.5, 5);
        shoulders.setBaseTransform(0, -0.08);
        sprite.setParent('shoulders', 'body');

        // HEAD (z-order 10)
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
        ], 0.5, 0.5, 10);
        head.setBaseTransform(0, -0.25);
        sprite.setParent('head', 'body');

        // Setup animations with legs for real walk cycle
        const walkParts = ['body', 'head', 'shoulders', 'legLeft', 'legRight'];
        sprite.addAnimation(AnimationBuilder.createIdleAnimation(['head', 'body', 'shoulders'], 2.0));
        sprite.addAnimation(AnimationBuilder.createWalkAnimation(walkParts, 0.5));
        // Natural attack motion (wind-up + strike) using body/head
        sprite.addAnimation(AnimationBuilder.createAttackAnimation(['body', 'head', 'shoulders'], 0.6));
        sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head', 'shoulders', 'legLeft', 'legRight'], 0.25));
        sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head', 'shoulders', 'legLeft', 'legRight'], 1.2));

        return sprite;
    },

    /**
     * Create RUSHER with dynamic parts
     */
    createRusher() {
        const sprite = new MultiPartSprite('rusher');

        // LEFT LEG (thin and fast, behind body z-order -10)
        const legLeft = sprite.addPart('legLeft', {
            type: 'ellipse',
            x: 0, y: 0.15,
            width: 0.10, height: 0.30,
            color: '#6a2a2a',
            fill: true
        }, 0.5, 0, -10);
        legLeft.setBaseTransform(-0.06, 0.20);

        // RIGHT LEG (behind body z-order -10)
        const legRight = sprite.addPart('legRight', {
            type: 'ellipse',
            x: 0, y: 0.15,
            width: 0.10, height: 0.30,
            color: '#6a2a2a',
            fill: true
        }, 0.5, 0, -10);
        legRight.setBaseTransform(0.06, 0.20);

        // BODY (lean forward, z-order 0)
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
        ], 0.5, 0.5, 0);
        body.setBaseTransform(0, 0.1, 0.1); // Leaning forward

        // Parent legs to body
        sprite.setParent('legLeft', 'body');
        sprite.setParent('legRight', 'body');

        // HORNS (z-order 15)
        const hornLeft = sprite.addPart('hornLeft', {
            type: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: -0.05, y: -0.08 },
                { x: 0.03, y: -0.02 }
            ],
            color: '#aa4a4a',
            fill: true
        }, 0.5, 1, 15);
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
        }, 0.5, 1, 15);
        hornRight.setBaseTransform(0.05, -0.1);

        // HEAD (aggressive, z-order 10)
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
        ], 0.5, 0.5, 10);
        head.setBaseTransform(0.02, -0.22, 0.05);
        sprite.setParent('head', 'body');
        sprite.setParent('hornLeft', 'head');
        sprite.setParent('hornRight', 'head');

        // Fast walk animation - includes legs for running motion
        const walkParts = ['body', 'head', 'hornLeft', 'hornRight', 'legLeft', 'legRight'];
        const fastWalk = AnimationBuilder.createWalkAnimation(walkParts, 0.3);
        sprite.addAnimation(fastWalk);
        sprite.addAnimation(AnimationBuilder.createIdleAnimation(['head', 'body'], 1.0));
        // Add attack animation for rusher (fast jab)
        sprite.addAnimation(AnimationBuilder.createAttackAnimation(['body', 'head'], 0.45));
        sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head', 'legLeft', 'legRight'], 0.2));
        sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head', 'legLeft', 'legRight'], 0.8));

        return sprite;
    },

    /**
     * Create TANK with heavy armor parts
     */
    createTank() {
        const sprite = new MultiPartSprite('tank');

        // LEFT LEG (thick and heavy, behind body z-order -10)
        const legLeft = sprite.addPart('legLeft', {
            type: 'rect',
            x: -0.06, y: 0.16,
            width: 0.14, height: 0.34,
            color: '#3a3a5a',
            fill: true
        }, 0.5, 0, -10);
        legLeft.setBaseTransform(-0.09, 0.22);

        // RIGHT LEG (behind body z-order -10)
        const legRight = sprite.addPart('legRight', {
            type: 'rect',
            x: -0.06, y: 0.16,
            width: 0.14, height: 0.34,
            color: '#3a3a5a',
            fill: true
        }, 0.5, 0, -10);
        legRight.setBaseTransform(0.09, 0.22);

        // BODY (heavy and large, z-order 0)
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
        ], 0.5, 0.5, 0);
        body.setBaseTransform(0, 0.2);

        // Parent legs to body
        sprite.setParent('legLeft', 'body');
        sprite.setParent('legRight', 'body');

        // SHOULDER PAULDRONS (z-order 5)
        const shoulderLeft = sprite.addPart('shoulderLeft', {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.08,
            color: '#5a5a7a',
            fill: true
        }, 0.5, 0.5, 5);
        shoulderLeft.setBaseTransform(-0.28, 0.03);
        sprite.setParent('shoulderLeft', 'body');

        const shoulderRight = sprite.addPart('shoulderRight', {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.08,
            color: '#5a5a7a',
            fill: true
        }, 0.5, 0.5, 5);
        shoulderRight.setBaseTransform(0.28, 0.03);
        sprite.setParent('shoulderRight', 'body');

        // HEAD (z-order 10)
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
        ], 0.5, 0.5, 10);
        head.setBaseTransform(0, -0.25);
        sprite.setParent('head', 'body');

        // Slow heavy animations with legs and shoulder movement
        const allParts = ['body', 'head', 'shoulderLeft', 'shoulderRight', 'legLeft', 'legRight'];
        sprite.addAnimation(AnimationBuilder.createIdleAnimation(['head', 'body', 'shoulderLeft', 'shoulderRight'], 3.0));
        const slowWalk = AnimationBuilder.createWalkAnimation(allParts, 1.0);
        sprite.addAnimation(slowWalk);
        // Heavy attack animation (slower, weighty)
        sprite.addAnimation(AnimationBuilder.createAttackAnimation(['body', 'head', 'shoulderLeft', 'shoulderRight'], 0.7));
        sprite.addAnimation(AnimationBuilder.createHitAnimation(allParts, 0.3));
        sprite.addAnimation(AnimationBuilder.createDeathAnimation(allParts, 1.5));

        return sprite;
    },

    /**
     * Create FLYER with animated wings
     */
    createFlyer() {
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

        // LEFT LEG (massive, z-order -10)
        const legLeft = sprite.addPart('legLeft', {
            type: 'polygon',
            points: [
                { x: -0.08, y: 0 },
                { x: 0.08, y: 0 },
                { x: 0.06, y: 0.36 },
                { x: -0.06, y: 0.36 }
            ],
            color: '#5a3a3a',
            fill: true
        }, 0.5, 0, -10);
        legLeft.setBaseTransform(-0.10, 0.22);
        sprite.setParent('legLeft', 'body');

        // RIGHT LEG (z-order -10)
        const legRight = sprite.addPart('legRight', {
            type: 'polygon',
            points: [
                { x: -0.08, y: 0 },
                { x: 0.08, y: 0 },
                { x: 0.06, y: 0.36 },
                { x: -0.06, y: 0.36 }
            ],
            color: '#5a3a3a',
            fill: true
        }, 0.5, 0, -10);
        legRight.setBaseTransform(0.10, 0.22);
        sprite.setParent('legRight', 'body');

        // Heavy walk animation - slow and powerful with legs
        const walk = new AnimationClip('walk', 1.5, true);
        walk.addTrack('body', [
            { time: 0, transform: { y: 0, rotation: 0 } },
            { time: 0.375, transform: { y: -0.06, rotation: 0.05 } },
            { time: 0.75, transform: { y: 0, rotation: 0 } },
            { time: 1.125, transform: { y: -0.06, rotation: -0.05 } },
            { time: 1.5, transform: { y: 0, rotation: 0 } }
        ]);
        walk.addTrack('legLeft', [
            { time: 0, transform: { rotation: 0.5, y: -0.04 } },
            { time: 0.375, transform: { rotation: 0, y: 0 } },
            { time: 0.75, transform: { rotation: -0.5, y: -0.04 } },
            { time: 1.125, transform: { rotation: 0, y: 0 } },
            { time: 1.5, transform: { rotation: 0.5, y: -0.04 } }
        ]);
        walk.addTrack('legRight', [
            { time: 0, transform: { rotation: -0.5, y: -0.04 } },
            { time: 0.375, transform: { rotation: 0, y: 0 } },
            { time: 0.75, transform: { rotation: 0.5, y: -0.04 } },
            { time: 1.125, transform: { rotation: 0, y: 0 } },
            { time: 1.5, transform: { rotation: -0.5, y: -0.04 } }
        ]);
        walk.addTrack('shoulderLeft', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.75, transform: { rotation: 0.1 } },
            { time: 1.5, transform: { rotation: 0 } }
        ]);
        walk.addTrack('shoulderRight', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.75, transform: { rotation: -0.1 } },
            { time: 1.5, transform: { rotation: 0 } }
        ]);
        walk.addTrack('armLeft', [
            { time: 0, transform: { rotation: -0.3 } },
            { time: 0.75, transform: { rotation: 0.3 } },
            { time: 1.5, transform: { rotation: -0.3 } }
        ]);
        walk.addTrack('armRight', [
            { time: 0, transform: { rotation: 0.3 } },
            { time: 0.75, transform: { rotation: -0.3 } },
            { time: 1.5, transform: { rotation: 0.3 } }
        ]);

        sprite.addAnimation(walk);
        
        // Idle animation for Boss
        const idle = new AnimationClip('idle', 2.0, true);
        idle.addTrack('body', [
            { time: 0, transform: { y: 0 } },
            { time: 1.0, transform: { y: -0.02 } },
            { time: 2.0, transform: { y: 0 } }
        ]);
        idle.addTrack('head', [
            { time: 0, transform: { rotation: 0 } },
            { time: 1.0, transform: { rotation: 0.03 } },
            { time: 2.0, transform: { rotation: 0 } }
        ]);
        sprite.addAnimation(idle);

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

        sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head', 'legLeft', 'legRight'], 0.25));
        sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head', 'armLeft', 'armRight', 'legLeft', 'legRight'], 1.5));

        return sprite;
    }
};

// Export

