
import { MultiPartSprite, AnimationBuilder } from
    './../../sprite-animation-system.js';

export function electric() {
        const sprite = new MultiPartSprite('electric');

        // BASE
        const base = sprite.addPart('base', [
            {
                type: 'polygon',
                points: [
                    { x: -0.18, y: 0.15 },
                    { x: 0.18, y: 0.15 },
                    { x: 0.22, y: 0.25 },
                    { x: -0.22, y: 0.25 }
                ],
                color: '#1a1a3a',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: -0.16, y: 0.17,
                width: 0.32, height: 0.04,
                color: '#aa88ff',
                fill: true
            }
        ], 0.5, 0.75);
        base.setBaseTransform(0, 0.15);

        // CENTRAL CORE
        const core = sprite.addPart('core', [
            {
                type: 'rect',
                x: -0.08, y: -0.1,
                width: 0.16, height: 0.2,
                color: '#6644cc',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'circle',
                x: 0, y: 0,
                radius: 0.05,
                color: '#aa88ff',
                fill: true
            }
        ], 0.5, 0.5);
        core.setBaseTransform(0, -0.03);
        sprite.setParent('core', 'base');

        // LEFT COIL
        const coilLeft = sprite.addPart('coilLeft', [
            {
                type: 'rect',
                x: -0.18, y: -0.12,
                width: 0.06, height: 0.24,
                color: '#4422aa',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: -0.15, y: -0.12,
                radius: 0.04,
                color: '#8866dd',
                fill: true
            },
            {
                type: 'circle',
                x: -0.15, y: 0.12,
                radius: 0.04,
                color: '#8866dd',
                fill: true
            }
        ], 0.5, 0.5);
        coilLeft.setBaseTransform(-0.05, -0.05);
        sprite.setParent('coilLeft', 'core');

        // RIGHT COIL
        const coilRight = sprite.addPart('coilRight', [
            {
                type: 'rect',
                x: 0.12, y: -0.12,
                width: 0.06, height: 0.24,
                color: '#4422aa',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: 0.15, y: -0.12,
                radius: 0.04,
                color: '#8866dd',
                fill: true
            },
            {
                type: 'circle',
                x: 0.15, y: 0.12,
                radius: 0.04,
                color: '#8866dd',
                fill: true
            }
        ], 0.5, 0.5);
        coilRight.setBaseTransform(0.05, -0.05);
        sprite.setParent('coilRight', 'core');

        // TOP ELECTRODE
        const electrode = sprite.addPart('electrode', [
            {
                type: 'circle',
                x: 0, y: -0.18,
                radius: 0.06,
                color: '#aa88ff',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'circle',
                x: 0, y: -0.18,
                radius: 0.03,
                color: '#ffffff',
                fill: true
            }
        ], 0.5, 0.5);
        electrode.setBaseTransform(0, -0.05);
        sprite.setParent('electrode', 'core');

        // Setup animations
        sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['core', 'coilLeft', 'coilRight', 'electrode'], 1.5));
        sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['electrode', 'coilLeft', 'coilRight', 'core'], 0.2));

        return sprite;
    }