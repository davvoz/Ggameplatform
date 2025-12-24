import { MultiPartSprite, AnimationBuilder } from
    './../../sprite-animation-system.js';

export function laser() {
    const sprite = new MultiPartSprite('laser');

    // BASE
    const base = sprite.addPart('base', [
        {
            type: 'polygon',
            points: [
                { x: -0.16, y: 0.14 },
                { x: 0.16, y: 0.14 },
                { x: 0.2, y: 0.24 },
                { x: -0.2, y: 0.24 }
            ],
            color: '#2a2a1a',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'rect',
            x: -0.14, y: 0.16,
            width: 0.28, height: 0.04,
            color: '#ffff00',
            fill: true
        }
    ], 0.5, 0.75);
    base.setBaseTransform(0, 0.15);

    // POWER CORE
    const powerCore = sprite.addPart('powerCore', [
        {
            type: 'rect',
            x: -0.1, y: -0.08,
            width: 0.2, height: 0.16,
            color: '#ffff00',
            fill: true,
            stroke: true,
            strokeWidth: 2
        },
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.06,
            color: '#ffffff',
            fill: true
        },
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.03,
            color: '#ffff00',
            fill: true
        }
    ], 0.5, 0.5);
    powerCore.setBaseTransform(0, -0.04);
    sprite.setParent('powerCore', 'base');

    // CRYSTAL HOUSING
    const housing = sprite.addPart('housing', [
        {
            type: 'rect',
            x: 0.05, y: -0.08,
            width: 0.15, height: 0.16,
            color: '#cccc00',
            fill: true,
            stroke: true,
            strokeWidth: 1
        }
    ], 0.5, 0.5);
    housing.setBaseTransform(0, -0.04);
    sprite.setParent('housing', 'powerCore');

    // FOCUSING CRYSTAL
    const crystal = sprite.addPart('crystal', [
        {
            type: 'polygon',
            points: [
                { x: 0.18, y: 0 },
                { x: 0.28, y: -0.04 },
                { x: 0.28, y: 0.04 }
            ],
            color: '#ffffff',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'circle',
            x: 0.23, y: 0,
            radius: 0.02,
            color: '#ffff00',
            fill: true
        }
    ], 0.5, 0.5);
    crystal.setBaseTransform(0, -0.04);
    sprite.setParent('crystal', 'housing');

    // LENS
    const lens = sprite.addPart('lens', {
        type: 'circle',
        x: 0.3, y: -0.04,
        radius: 0.04,
        color: '#aaffff',
        fill: true,
        stroke: true,
        strokeWidth: 1
    }, 0.5, 0.5);
    lens.setBaseTransform(0, 0);
    sprite.setParent('lens', 'housing');

    // Setup animations
    sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['powerCore', 'crystal'], 2.5));
    sprite.addAnimation(AnimationBuilder.createTowerChargingAnimation(['powerCore', 'crystal'], 0.4));
    sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['lens', 'crystal', 'powerCore'], 0.2));

    return sprite;
}