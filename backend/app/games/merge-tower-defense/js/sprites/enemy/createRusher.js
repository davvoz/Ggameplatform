import { MultiPartSprite ,AnimationBuilder} from 
//backend\app\games\merge-tower-defense\js\sprite-animation-system.js
'./../../sprite-animation-system.js';
export function rusher() {
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
            x: 0.09, y: 0,
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
}