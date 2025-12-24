import { MultiPartSprite, AnimationBuilder } from
    './../../sprite-animation-system.js';

export function basic() {
    const sprite = new MultiPartSprite('basic');

    // Static platform base with mounting bolts
    const base = sprite.addPart('base', [
        {
            type: 'polygon',
            points: [
                { x: -0.17, y: 0.15 },
                { x: 0.17, y: 0.15 },
                { x: 0.22, y: 0.27 },
                { x: -0.22, y: 0.27 }
            ],
            color: '#6868ff',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'circle',
            x: -0.18, y: 0.24,
            radius: 0.015,
            color: '#05b0c7',
            fill: true
        },
        {
            type: 'circle',
            x: 0.18, y: 0.24,
            radius: 0.015,
            color: '#db0505',
            fill: true
        }
    ], 0.5, 0.75);
    base.setBaseTransform(0, 0.15);

    // Mounting column with rotation ring
    const column = sprite.addPart('column', [
        {
            type: 'rect',
            x: -0.09, y: 0,
            width: 0.18, height: 0.16,
            color: '#0202ff',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'rect',
            x: -0.1, y: 0.06,
            width: 0.2, height: 0.02,
            color: '#f7c57a',
            fill: true
        }
    ], 0.5, 0.5);
    column.setBaseTransform(0, 0.07);
    sprite.setParent('column', 'base');

    // Rotating turret housing with sensor and vents
    const turret = sprite.addPart('turret', [
        {
            type: 'rect',
            x: -0.16, y: -0.1,
            width: 0.32, height: 0.2,
            color: '#2370bd',
            fill: true,
            stroke: true,
            strokeWidth: 2
        },
        {
            type: 'rect',
            x: -0.025, y: -0.08,
            width: 0.05, height: 0.06,
            color: '#b6f800',
            fill: true
        },
        {
            type: 'circle',
            x: 0, y: -0.05,
            radius: 0.012,
            color: '#88ccff',
            fill: true
        },
        {
            type: 'rect',
            x: -0.14, y: -0.04,
            width: 0.02, height: 0.08,
            color: '#00ff15',
            fill: true
        },
        {
            type: 'rect',
            x: 0.12, y: -0.04,
            width: 0.02, height: 0.08,
            color: '#7ff033',
            fill: true
        }
    ], 0.5, 0.5);
    turret.setBaseTransform(0, -0.07);
    sprite.setParent('turret', 'column');

    // Weapon barrel with segmented muzzle brake
    const barrel = sprite.addPart('barrel', [
        {
            type: 'rect',
            x: 0.1, y: -0.05,
            width: 0.30, height: 0.10,
            color: '#a0a0be',
            fill: true,
            stroke: true,
            strokeWidth: 1.5
        },
        {
            type: 'rect',
            x: 0.38, y: -0.055,
            width: 0.02, height: 0.11,
            color: '#4ead0f',
            fill: true
        },
        {
            type: 'rect',
            x: 0.41, y: -0.06,
            width: 0.02, height: 0.12,
            color: '#4ead0f',
            fill: true
        },
        {
            type: 'rect',
            x: 0.44, y: -0.055,
            width: 0.02, height: 0.11,
            color: '#0000aa',
            fill: true
        }
    ], 0.5, 0.5);
    barrel.setBaseTransform(0, -0.07);
    sprite.setParent('barrel', 'turret');

    // Setup animations
    sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['turret', 'barrel'], 2.5));
    sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['barrel', 'turret'], 0.2));

    return sprite;
}