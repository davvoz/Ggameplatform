import { MultiPartSprite, AnimationBuilder } from 
'./../../sprite-animation-system.js';

export function bomber() {
    const sprite = new MultiPartSprite('bomber');

    // LEFT LEG (behind body, z-order -10)
    const legLeft = sprite.addPart('legLeft', {
        type: 'ellipse',
        x: 0, y: 0.16,
        width: 0.13, height: 0.32,
        color: '#3a2a1a',
        fill: true
    }, 0.5, 0, -10);
    legLeft.setBaseTransform(-0.08, 0.26);

    // RIGHT LEG (behind body, z-order -10)
    const legRight = sprite.addPart('legRight', {
        type: 'ellipse',
        x: 0, y: 0.16,
        width: 0.13, height: 0.32,
        color: '#3a2a1a',
        fill: true
    }, 0.5, 0, -10);
    legRight.setBaseTransform(0.08, 0.26);

    // BODY (round and bulky with bomb vest, z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.50, height: 0.60,
            color: '#4a3a2a',
            fill: true
        },
        // Bomb vest straps
        {
            type: 'rect',
            x: 0.15, y: 0.12,
            width: 0.22, height: 0.06,
            color: '#2a2a2a',
            fill: true
        },
        {
            type: 'rect',
            x: 0.15, y: 0.25,
            width: 0.22, height: 0.06,
            color: '#2a2a2a',
            fill: true
        },
        // Bomb pockets
        {
            type: 'circle',
            x: 0.12, y: 0.20,
            radius: 0.05,
            color: '#aa4444',
            fill: true
        },
        {
            type: 'circle',
            x: 0.38, y: 0.20,
            radius: 0.05,
            color: '#aa4444',
            fill: true
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.22);

    // Parent legs to body
    sprite.setParent('legLeft', 'body');
    sprite.setParent('legRight', 'body');

    // BACKPACK (with bomb storage, z-order -5)
    const backpack = sprite.addPart('backpack', [
        {
            type: 'rect',
            x: -0.18, y: -0.05,
            width: 0.16, height: 0.28,
            color: '#5a4a3a',
            fill: true
        },
        {
            type: 'circle',
            x: -0.10, y: 0.04,
            radius: 0.04,
            color: '#dd5555',
            fill: true
        },
        {
            type: 'circle',
            x: -0.10, y: 0.14,
            radius: 0.04,
            color: '#dd5555',
            fill: true
        }
    ], 0.5, 0.5, -5);
    backpack.setBaseTransform(0, 0);
    sprite.setParent('backpack', 'body');

    // SHOULDERS (z-order 5)
    const shoulders = sprite.addPart('shoulders', {
        type: 'rect',
        x: 0, y: 0,
        width: 0.54, height: 0.14,
        color: '#5a4a3a',
        fill: true
    }, 0.5, 0.5, 5);
    shoulders.setBaseTransform(0, -0.10);
    sprite.setParent('shoulders', 'body');

    // LEFT ARM (holding detonator, z-order 3)
    const armLeft = sprite.addPart('armLeft', [
        {
            type: 'ellipse',
            x: 0, y: 0.10,
            width: 0.10, height: 0.22,
            color: '#4a3a2a',
            fill: true
        },
        // Detonator
        {
            type: 'rect',
            x: -0.02, y: 0.20,
            width: 0.08, height: 0.06,
            color: '#cc3333',
            fill: true
        },
        {
            type: 'circle',
            x: 0.02, y: 0.23,
            radius: 0.02,
            color: '#ffff00',
            fill: true,
            glow: { color: '#ffaa00', blur: 4 }
        }
    ], 0.5, 0, 3);
    armLeft.setBaseTransform(-0.20, -0.02);
    sprite.setParent('armLeft', 'shoulders');

    // RIGHT ARM (z-order 3)
    const armRight = sprite.addPart('armRight', {
        type: 'ellipse',
        x: 0, y: 0.10,
        width: 0.10, height: 0.22,
        color: '#4a3a2a',
        fill: true
    }, 0.5, 0, 3);
    armRight.setBaseTransform(0.20, -0.02);
    sprite.setParent('armRight', 'shoulders');

    // HEAD (with goggles, z-order 10)
    const head = sprite.addPart('head', [
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.16,
            color: '#3a2a1a',
            fill: true
        },
        // Goggles
        {
            type: 'circle',
            x: -0.06, y: -0.01,
            radius: 0.05,
            color: '#111111',
            fill: true
        },
        {
            type: 'circle',
            x: 0.06, y: -0.01,
            radius: 0.05,
            color: '#111111',
            fill: true
        },
        {
            type: 'circle',
            x: -0.06, y: -0.01,
            radius: 0.03,
            color: '#00aaff',
            fill: true
        },
        {
            type: 'circle',
            x: 0.06, y: -0.01,
            radius: 0.03,
            color: '#00aaff',
            fill: true
        },
        // Goggle strap
        {
            type: 'path',
            points: [
                { x: -0.10, y: 0 },
                { x: -0.14, y: 0.01 }
            ],
            color: '#2a2a2a',
            stroke: true,
            strokeWidth: 2
        },
        {
            type: 'path',
            points: [
                { x: 0.10, y: 0 },
                { x: 0.14, y: 0.01 }
            ],
            color: '#2a2a2a',
            stroke: true,
            strokeWidth: 2
        },
        // Crazed smile
        {
            type: 'arc',
            x: 0, y: 0.06,
            radius: 0.06,
            startAngle: 0,
            endAngle: Math.PI,
            color: '#ffffff',
            stroke: true,
            strokeWidth: 2
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.26);
    sprite.setParent('head', 'body');

    // FUSE HAT (iconic bomber element, z-order 12)
    const fuse = sprite.addPart('fuse', [
        {
            type: 'polygon',
            points: [
                { x: -0.04, y: 0 },
                { x: 0.04, y: 0 },
                { x: 0.03, y: -0.08 },
                { x: -0.03, y: -0.08 }
            ],
            color: '#6a5a4a',
            fill: true
        },
        {
            type: 'circle',
            x: 0, y: -0.10,
            radius: 0.03,
            color: '#ff6600',
            fill: true,
            glow: { color: '#ff3300', blur: 6 }
        }
    ], 0.5, 1, 12);
    fuse.setBaseTransform(0, -0.14);
    sprite.setParent('fuse', 'head');

    // Setup animations with all parts
    const allParts = ['body', 'head', 'shoulders', 'legLeft', 'legRight', 'backpack', 'armLeft', 'armRight', 'fuse'];
    const bodyParts = ['body', 'head', 'shoulders', 'backpack', 'armLeft', 'armRight', 'fuse'];
    
    sprite.addAnimation(AnimationBuilder.createIdleAnimation(bodyParts, 2.0));
    sprite.addAnimation(AnimationBuilder.createWalkAnimation(allParts, 0.6));
    // Bomber throws explosives - more dramatic wind-up
    sprite.addAnimation(AnimationBuilder.createAttackAnimation(['body', 'head', 'shoulders', 'armLeft', 'armRight', 'fuse'], 0.7));
    sprite.addAnimation(AnimationBuilder.createHitAnimation(allParts, 0.3));
    // Explosive death animation
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(allParts, 1.0));

    return sprite;
}