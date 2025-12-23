import { MultiPartSprite ,AnimationBuilder} from 
//backend\app\games\merge-tower-defense\js\sprite-animation-system.js
'./../../sprite-animation-system.js';

export function grunt() {
    const sprite = new MultiPartSprite('grunt');

    // LEFT LEG (behind body, z-order -10)
    const legLeft = sprite.addPart('legLeft', {
        type: 'ellipse',
        x: 0, y: 0.18,
        width: 0.14, height: 0.36,
        color: '#2a4a3a',
        fill: true
    }, 0.5, 0, -10);
    legLeft.setBaseTransform(-0.08, 0.28);

    // RIGHT LEG (behind body, z-order -10)
    const legRight = sprite.addPart('legRight', {
        type: 'ellipse',
        x: 0, y: 0.18,
        width: 0.14, height: 0.36,
        color: '#2a4a3a',
        fill: true
    }, 0.5, 0, -10);
    legRight.setBaseTransform(0.08, 0.28);

    // BODY (main part, z-order 0)
    const body = sprite.addPart('body', [
        {
            type: 'ellipse',
            x: 0.05, y: 0,
            width: 0.5, height: 0.65,
            color: '#3a5a4a',
            fill: true
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, 0.25);

    // Parent legs to body
    sprite.setParent('legLeft', 'body');
    sprite.setParent('legRight', 'body');

    // SHOULDERS (z-order 5)
    const shoulders = sprite.addPart('shoulders', {
        type: 'rect',
        x: 0.3, y: 0,
        width: 0.66, height: 0.05,
        color: '#07c465ff',
        fill: true
    }, 0.5, 0.5, 5);
    shoulders.setBaseTransform(0, -0.08);
    sprite.setParent('shoulders', 'body');

    // HEAD (z-order 10)
    const head = sprite.addPart('head', [
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.18,
            color: '#2d4a3a',
            fill: true
        },
        {
            type: 'circle',
            x: -0.08, y: -0.02,
            radius: 0.04,
            color: '#ff3333',
            fill: true
        },
        {
            type: 'circle',
            x: 0.08, y: -0.02,
            radius: 0.04,
            color: '#ff3333',
            fill: true
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.25);
    sprite.setParent('head', 'body');

    // Setup animations with legs for real walk cycle
    const walkParts = ['body', 'head', 'shoulders', 'legLeft', 'legRight'];
    sprite.addAnimation(AnimationBuilder.createIdleAnimation(['head', 'body', 'shoulders'], 2.0));
    sprite.addAnimation(AnimationBuilder.createWalkAnimation(walkParts, 0.5));
    // Natural attack motion (wind-up + strike) using body/head
    sprite.addAnimation(AnimationBuilder.createAttackAnimation(['body', 'head', 'shoulders'], 0.6));
    sprite.addAnimation(AnimationBuilder.createHitAnimation(['body', 'head', 'shoulders', 'legLeft', 'legRight'], 0.25));
    sprite.addAnimation(AnimationBuilder.createDeathAnimation(['body', 'head', 'shoulders', 'legLeft', 'legRight'], 1.2));

    return sprite;
}