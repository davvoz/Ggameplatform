import { MultiPartSprite, AnimationBuilder } from
    './../../sprite-animation-system.js';

export function sniper() {
    const sprite = new MultiPartSprite('sniper');

    // BASE
    const base = sprite.addPart('base', [
        {
            type: 'polygon',
            points: [
                { x: -0.18, y: 0.12 },
                { x: 0.18, y: 0.12 },
                { x: 0.22, y: 0.24 },
                { x: -0.22, y: 0.24 }
            ],
            color: '#3a1a2a',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'rect',
            x: -0.15, y: 0.14,
            width: 0.3, height: 0.03,
            color: '#ff0066',
            fill: true
        }
    ], 0.5, 0.75);
    base.setBaseTransform(0, 0.15);

    // MOUNTING
    const mount = sprite.addPart('mount', {
        type: 'rect',
        x: -0.06, y: 0,
        width: 0.12, height: 0.18,
        color: '#4a2a3a',
        fill: true
    }, 0.5, 0.5);
    mount.setBaseTransform(0, 0.04);
    sprite.setParent('mount', 'base');

    // TURRET BODY (compact)
    const turret = sprite.addPart('turret', [
        {
            type: 'rect',
            x: -0.1, y: -0.06,
            width: 0.2, height: 0.12,
            color: '#ff0066',
            fill: true,
            stroke: true,
            strokeWidth: 2
        },
        {
            type: 'circle',
            x: -0.05, y: 0,
            radius: 0.04,
            color: '#ff3388',
            fill: true
        }
    ], 0.5, 0.5);
    turret.setBaseTransform(0, -0.08);
    sprite.setParent('turret', 'mount');

    // LONG BARREL
    const barrel = sprite.addPart('barrel', [
        {
            type: 'rect',
            x: 0.05, y: -0.035,
            width: 0.35, height: 0.07,
            color: '#2a0a1a',
            fill: true
        },
        {
            type: 'rect',
            x: 0.37, y: -0.04,
            width: 0.05, height: 0.08,
            color: '#1a0a15',
            fill: true
        },
        // Barrel details
        {
            type: 'rect',
            x: 0.15, y: -0.03,
            width: 0.02, height: 0.06,
            color: '#3a1a2a',
            fill: true
        },
        {
            type: 'rect',
            x: 0.25, y: -0.03,
            width: 0.02, height: 0.06,
            color: '#3a1a2a',
            fill: true
        }
    ], 0.5, 0.5);
    barrel.setBaseTransform(0, -0.08);
    sprite.setParent('barrel', 'turret');

    // SCOPE
    const scope = sprite.addPart('scope', [
        {
            type: 'rect',
            x: 0.1, y: -0.11,
            width: 0.12, height: 0.06,
            color: '#ff0066',
            fill: true
        },
        {
            type: 'circle',
            x: 0.16, y: -0.08,
            radius: 0.025,
            color: '#00ffff',
            fill: true
        }
    ], 0.5, 0.5);
    scope.setBaseTransform(0, -0.08);
    sprite.setParent('scope', 'turret');

    // Setup animations
    sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['turret', 'scope'], 3.0));
    sprite.addAnimation(AnimationBuilder.createTowerChargingAnimation(['scope', 'barrel'], 0.5));
    sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['barrel', 'turret'], 0.3));

    return sprite;
}