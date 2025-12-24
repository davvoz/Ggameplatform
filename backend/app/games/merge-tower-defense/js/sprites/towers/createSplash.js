import { MultiPartSprite, AnimationBuilder } from
    './../../sprite-animation-system.js';

export function splash() {
    const sprite = new MultiPartSprite('splash');

    // BASE (wide and stable)
    const base = sprite.addPart('base', [
        {
            type: 'polygon',
            points: [
                { x: -0.2, y: 0.15 },
                { x: 0.2, y: 0.15 },
                { x: 0.25, y: 0.25 },
                { x: -0.25, y: 0.25 }
            ],
            color: '#3a2a1a',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'rect',
            x: -0.18, y: 0.17,
            width: 0.36, height: 0.05,
            color: '#ff8800',
            fill: true
        }
    ], 0.5, 0.75);
    base.setBaseTransform(0, 0.15);

    // MOUNTING PLATFORM
    const platform = sprite.addPart('platform', {
        type: 'ellipse',
        x: 0, y: 0,
        width: 0.3, height: 0.15,
        color: '#4a3a2a',
        fill: true,
        stroke: true,
        strokeWidth: 1
    }, 0.5, 0.5);
    platform.setBaseTransform(0, 0.02);
    sprite.setParent('platform', 'base');

    // MORTAR BODY
    const mortar = sprite.addPart('mortar', [
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.25, height: 0.2,
            color: '#ff8800',
            fill: true,
            stroke: true,
            strokeWidth: 2
        },
        {
            type: 'rect',
            x: -0.08, y: -0.05,
            width: 0.16, height: 0.1,
            color: '#cc6600',
            fill: true
        }
    ], 0.5, 0.5);
    mortar.setBaseTransform(0, -0.08);
    sprite.setParent('mortar', 'platform');

    // BARREL (angled upward)
    const barrel = sprite.addPart('barrel', [
        {
            type: 'rect',
            x: 0, y: -0.18,
            width: 0.12, height: 0.2,
            color: '#2a1a0a',
            fill: true
        },
        {
            type: 'rect',
            x: 0, y: -0.2,
            width: 0.14, height: 0.05,
            color: '#1a1a0a',
            fill: true
        }
    ], 0.5, 1);
    barrel.setBaseTransform(0, -0.02, -0.3); // Angled
    sprite.setParent('barrel', 'mortar');

    // LOADING MECHANISM
    const loader = sprite.addPart('loader', {
        type: 'rect',
        x: -0.12, y: -0.04,
        width: 0.08, height: 0.08,
        color: '#ff8800',
        fill: true,
        stroke: true,
        strokeWidth: 1
    }, 0.5, 0.5);
    loader.setBaseTransform(0, -0.08);
    sprite.setParent('loader', 'mortar');

    // Setup animations
    sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['mortar'], 2.5));
    sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['barrel', 'mortar', 'loader'], 0.3));

    return sprite;
}
