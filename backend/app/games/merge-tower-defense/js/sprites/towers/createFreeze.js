
import { MultiPartSprite, AnimationBuilder } from
    './../../sprite-animation-system.js';
export function freeze() {
    const sprite = new MultiPartSprite('freeze');

    // BASE
    const base = sprite.addPart('base', [
        {
            type: 'polygon',
            points: [
                { x: -0.15, y: 0.15 },
                { x: 0.15, y: 0.15 },
                { x: 0.18, y: 0.24 },
                { x: -0.18, y: 0.24 }
            ],
            color: '#1a3a4a',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'circle',
            x: -0.12, y: 0.19,
            radius: 0.025,
            color: '#aaffff',
            fill: true
        },
        {
            type: 'circle',
            x: 0.12, y: 0.19,
            radius: 0.025,
            color: '#aaffff',
            fill: true
        }
    ], 0.5, 0.75);
    base.setBaseTransform(0, 0.15);

    // CORE UNIT
    const core = sprite.addPart('core', [
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.12,
            color: '#aaffff',
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
        }
    ], 0.5, 0.5);
    core.setBaseTransform(0, -0.05);
    sprite.setParent('core', 'base');

    // TOP EMITTER
    const emitterTop = sprite.addPart('emitterTop', [
        {
            type: 'rect',
            x: -0.04, y: -0.16,
            width: 0.08, height: 0.12,
            color: '#88ddff',
            fill: true,
            stroke: true,
            strokeWidth: 1
        },
        {
            type: 'polygon',
            points: [
                { x: -0.05, y: -0.16 },
                { x: 0.05, y: -0.16 },
                { x: 0, y: -0.2 }
            ],
            color: '#66ccff',
            fill: true
        }
    ], 0.5, 1);
    emitterTop.setBaseTransform(0, -0.09);
    sprite.setParent('emitterTop', 'core');

    // SIDE EMITTERS
    const emitterLeft = sprite.addPart('emitterLeft', [
        {
            type: 'rect',
            x: -0.12, y: -0.04,
            width: 0.1, height: 0.08,
            color: '#66bbee',
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: -0.12, y: -0.05 },
                { x: -0.12, y: 0.05 },
                { x: -0.16, y: 0 }
            ],
            color: '#4499cc',
            fill: true
        }
    ], 0.5, 0.5);
    emitterLeft.setBaseTransform(-0.06, -0.05);
    sprite.setParent('emitterLeft', 'core');

    const emitterRight = sprite.addPart('emitterRight', [
        {
            type: 'rect',
            x: 0.02, y: -0.04,
            width: 0.1, height: 0.08,
            color: '#66bbee',
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: 0.12, y: -0.05 },
                { x: 0.12, y: 0.05 },
                { x: 0.16, y: 0 }
            ],
            color: '#4499cc',
            fill: true
        }
    ], 0.5, 0.5);
    emitterRight.setBaseTransform(0.06, -0.05);
    sprite.setParent('emitterRight', 'core');

    // Setup animations
    sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['core', 'emitterTop', 'emitterLeft', 'emitterRight'], 2.0));
    sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['emitterTop', 'emitterLeft', 'emitterRight', 'core'], 0.25));

    return sprite;
}
