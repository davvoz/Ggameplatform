import { MultiPartSprite, AnimationBuilder } from
    './../../sprite-animation-system.js';

export function rapid() {
    const sprite = new MultiPartSprite('rapid');

    // BASE
    const base = sprite.addPart('base', {
        type: 'polygon',
        points: [
            { x: -0.14, y: 0.15 },
            { x: 0.14, y: 0.15 },
            { x: 0.18, y: 0.24 },
            { x: -0.18, y: 0.24 }
        ],
        color: '#ff8800',
        fill: true,
        stroke: true,
        strokeWidth: 1
    }, 0.5, 0.75);
    base.setBaseTransform(0, 0.15);

    // TURRET CORE
    const turret = sprite.addPart('turret', [
        {
            type: 'rect',
            x: -0.13, y: -0.09,
            width: 0.26, height: 0.18,
            color: '#cc00ff',
            fill: true,
            stroke: true,
            strokeWidth: 2
        },
        {
            type: 'rect',
            x: -0.04, y: -0.02,
            width: 0.08, height: 0.12,
            color: '#00ddff',
            fill: true
        }
    ], 0.5, 0.5);
    turret.setBaseTransform(0, -0.05);
    sprite.setParent('turret', 'base');

    // LEFT BARREL
    const barrelLeft = sprite.addPart('barrelLeft', [
        {
            type: 'rect',
            x: 0.08, y: -0.02,
            width: 0.28, height: 0.04,
            color: '#ff0000',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'rect',
            x: 0.34, y: -0.025,
            width: 0.03, height: 0.05,
            color: '#00ff00',
            fill: true
        }
    ], 0.5, 0.5);
    barrelLeft.setBaseTransform(0, -0.11);
    sprite.setParent('barrelLeft', 'turret');

    // RIGHT BARREL
    const barrelRight = sprite.addPart('barrelRight', [
        {
            type: 'rect',
            x: 0.08, y: -0.02,
            width: 0.28, height: 0.04,
            color: '#ff0000',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'rect',
            x: 0.34, y: -0.025,
            width: 0.03, height: 0.05,
            color: '#ffff00',
            fill: true
        }
    ], 0.5, 0.5);
    barrelRight.setBaseTransform(0, 0.01);
    sprite.setParent('barrelRight', 'turret');

    // Setup animations
    sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['turret'], 2.0));
    sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['barrelLeft', 'barrelRight', 'turret'], 0.15));

    return sprite;
}