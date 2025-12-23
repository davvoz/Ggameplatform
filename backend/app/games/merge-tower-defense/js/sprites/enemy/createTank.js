import { MultiPartSprite ,AnimationBuilder} from 
//backend\app\games\merge-tower-defense\js\sprite-animation-system.js
'./../../sprite-animation-system.js';

export function tank() {
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
}