/**
 * Cyber Dino Player Sprite Definition
 * Multi-part animated sprite for the player character
 * Features: Cyber armor, dino features, glowing energy cores
 */

import { MultiPartSprite } from '../SpriteAnimationSystem.js';

/**
 * Create player sprite based on affinity focus
 * @param {string} focus - 'ARCANE', 'TECH', or 'PRIMAL'
 */
export function createPlayerSprite(focus = 'TECH') {
    const sprite = new MultiPartSprite('player');
    
    // Color schemes based on focus
    const colors = getColorScheme(focus);
    
    // ========================================================================
    // AURA - Energy field behind character (z-order: -20)
    // ========================================================================
    const aura = sprite.addPart('aura', [
        {
            type: 'ellipse',
            x: 0, y: 0.05,
            width: 0.55, height: 0.65,
            color: colors.auraOuter,
            fill: true
        },
        {
            type: 'ellipse',
            x: 0, y: 0.05,
            width: 0.45, height: 0.55,
            color: colors.auraInner,
            fill: true,
            glow: { color: colors.glowColor, blur: 12 }
        }
    ], 0.5, 0.5, -20);
    aura.setBaseTransform(0, 0);
    aura.opacity = 0.4;

    // ========================================================================
    // LEGS (z-order: -5)
    // ========================================================================
    const legLeft = sprite.addPart('legLeft', [
        // Thigh
        {
            type: 'ellipse',
            x: 0, y: 0.06,
            width: 0.08, height: 0.14,
            color: colors.bodyDark,
            fill: true
        },
        // Shin with cyber armor
        {
            type: 'roundRect',
            x: 0, y: 0.15,
            width: 0.06, height: 0.10,
            radius: 0.01,
            color: colors.armorMain,
            fill: true
        },
        // Foot
        {
            type: 'ellipse',
            x: 0.01, y: 0.22,
            width: 0.08, height: 0.04,
            color: colors.armorDark,
            fill: true
        }
    ], 0.5, 0, -5);
    legLeft.setBaseTransform(-0.08, 0.12);

    const legRight = sprite.addPart('legRight', [
        {
            type: 'ellipse',
            x: 0, y: 0.06,
            width: 0.08, height: 0.14,
            color: colors.bodyDark,
            fill: true
        },
        {
            type: 'roundRect',
            x: 0, y: 0.15,
            width: 0.06, height: 0.10,
            radius: 0.01,
            color: colors.armorMain,
            fill: true
        },
        {
            type: 'ellipse',
            x: 0.01, y: 0.22,
            width: 0.08, height: 0.04,
            color: colors.armorDark,
            fill: true
        }
    ], 0.5, 0, -5);
    legRight.setBaseTransform(0.08, 0.12);

    // ========================================================================
    // TAIL - Dino tail (z-order: -8)
    // ========================================================================
    const tail = sprite.addPart('tail', [
        // Base
        {
            type: 'ellipse',
            x: -0.08, y: 0.02,
            width: 0.18, height: 0.08,
            color: colors.bodyMain,
            fill: true
        },
        // Mid
        {
            type: 'ellipse',
            x: -0.18, y: 0.03,
            width: 0.14, height: 0.06,
            color: colors.bodyDark,
            fill: true
        },
        // Tip with glow
        {
            type: 'ellipse',
            x: -0.26, y: 0.04,
            width: 0.08, height: 0.04,
            color: colors.energyColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 6 }
        }
    ], 0.5, 0.5, -8);
    tail.setBaseTransform(0, 0.08);

    // ========================================================================
    // BODY - Main torso with cyber armor (z-order: 0)
    // ========================================================================
    const body = sprite.addPart('body', [
        // Main body shape
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.30, height: 0.35,
            color: colors.bodyMain,
            fill: true
        },
        // Chest armor plate
        {
            type: 'polygon',
            points: [
                { x: -0.10, y: -0.10 },
                { x: 0.10, y: -0.10 },
                { x: 0.12, y: 0.08 },
                { x: 0, y: 0.12 },
                { x: -0.12, y: 0.08 }
            ],
            color: colors.armorMain,
            fill: true
        },
        // Energy core center
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.05,
            color: colors.energyColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 8 }
        },
        // Core ring
        {
            type: 'circle',
            x: 0, y: 0,
            radius: 0.07,
            color: colors.armorLight,
            fill: false,
            stroke: true,
            strokeWidth: 2
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, -0.02);

    // ========================================================================
    // SHOULDERS (z-order: 5)
    // ========================================================================
    const shoulderLeft = sprite.addPart('shoulderLeft', [
        // Main pauldron
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.12, height: 0.10,
            color: colors.armorMain,
            fill: true
        },
        // Spike
        {
            type: 'polygon',
            points: [
                { x: -0.02, y: -0.04 },
                { x: 0, y: -0.10 },
                { x: 0.02, y: -0.04 }
            ],
            color: colors.armorLight,
            fill: true
        },
        // Energy line
        {
            type: 'line',
            x1: -0.04, y1: 0,
            x2: 0.04, y2: 0,
            color: colors.energyColor,
            strokeWidth: 2,
            glow: { color: colors.glowColor, blur: 4 }
        }
    ], 0.5, 0.5, 5);
    shoulderLeft.setBaseTransform(-0.15, -0.08);

    const shoulderRight = sprite.addPart('shoulderRight', [
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.12, height: 0.10,
            color: colors.armorMain,
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: -0.02, y: -0.04 },
                { x: 0, y: -0.10 },
                { x: 0.02, y: -0.04 }
            ],
            color: colors.armorLight,
            fill: true
        },
        {
            type: 'line',
            x1: -0.04, y1: 0,
            x2: 0.04, y2: 0,
            color: colors.energyColor,
            strokeWidth: 2,
            glow: { color: colors.glowColor, blur: 4 }
        }
    ], 0.5, 0.5, 5);
    shoulderRight.setBaseTransform(0.15, -0.08);

    // ========================================================================
    // ARMS (z-order: 2)
    // ========================================================================
    const armLeft = sprite.addPart('armLeft', [
        // Upper arm
        {
            type: 'ellipse',
            x: 0, y: 0.05,
            width: 0.06, height: 0.12,
            color: colors.bodyDark,
            fill: true
        },
        // Forearm with armor
        {
            type: 'roundRect',
            x: 0, y: 0.14,
            width: 0.05, height: 0.10,
            radius: 0.01,
            color: colors.armorMain,
            fill: true
        },
        // Hand/claw
        {
            type: 'polygon',
            points: [
                { x: -0.03, y: 0.20 },
                { x: 0.03, y: 0.20 },
                { x: 0.04, y: 0.26 },
                { x: 0, y: 0.24 },
                { x: -0.04, y: 0.26 }
            ],
            color: colors.clawColor,
            fill: true
        }
    ], 0.5, 0, 2);
    armLeft.setBaseTransform(-0.14, -0.04);

    const armRight = sprite.addPart('armRight', [
        {
            type: 'ellipse',
            x: 0, y: 0.05,
            width: 0.06, height: 0.12,
            color: colors.bodyDark,
            fill: true
        },
        {
            type: 'roundRect',
            x: 0, y: 0.14,
            width: 0.05, height: 0.10,
            radius: 0.01,
            color: colors.armorMain,
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: -0.03, y: 0.20 },
                { x: 0.03, y: 0.20 },
                { x: 0.04, y: 0.26 },
                { x: 0, y: 0.24 },
                { x: -0.04, y: 0.26 }
            ],
            color: colors.clawColor,
            fill: true
        }
    ], 0.5, 0, 2);
    armRight.setBaseTransform(0.14, -0.04);

    // ========================================================================
    // HEAD - Dino head with cyber visor (z-order: 10)
    // ========================================================================
    const head = sprite.addPart('head', [
        // Back of head
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.20, height: 0.18,
            color: colors.bodyMain,
            fill: true
        },
        // Snout
        {
            type: 'ellipse',
            x: 0.06, y: 0.02,
            width: 0.14, height: 0.10,
            color: colors.bodyMain,
            fill: true
        },
        // Cyber visor
        {
            type: 'roundRect',
            x: 0.02, y: -0.01,
            width: 0.16, height: 0.06,
            radius: 0.02,
            color: colors.visorColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 6 }
        },
        // Visor reflection
        {
            type: 'line',
            x1: -0.04, y1: -0.02,
            x2: 0.08, y2: -0.02,
            color: 'rgba(255,255,255,0.5)',
            strokeWidth: 1
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.22);

    // ========================================================================
    // HEAD CREST - Dino horns/crest (z-order: 12)
    // ========================================================================
    const crest = sprite.addPart('crest', [
        // Main crest
        {
            type: 'polygon',
            points: [
                { x: -0.06, y: 0.02 },
                { x: -0.04, y: -0.10 },
                { x: 0, y: -0.14 },
                { x: 0.04, y: -0.10 },
                { x: 0.06, y: 0.02 }
            ],
            color: colors.armorMain,
            fill: true
        },
        // Crest energy line
        {
            type: 'path',
            points: [
                { x: 0, y: 0 },
                { x: 0, y: -0.12 }
            ],
            color: colors.energyColor,
            strokeWidth: 2,
            stroke: true,
            fill: false,
            glow: { color: colors.glowColor, blur: 4 }
        }
    ], 0.5, 1, 12);
    crest.setBaseTransform(0, -0.28);

    // ========================================================================
    // WEAPON - Energy blade/weapon (z-order: 15)
    // ========================================================================
    const weapon = sprite.addPart('weapon', [
        // Handle
        {
            type: 'roundRect',
            x: 0, y: 0,
            width: 0.04, height: 0.12,
            radius: 0.01,
            color: colors.armorDark,
            fill: true
        },
        // Guard
        {
            type: 'ellipse',
            x: 0, y: -0.05,
            width: 0.08, height: 0.03,
            color: colors.armorMain,
            fill: true
        },
        // Blade
        {
            type: 'polygon',
            points: [
                { x: -0.02, y: -0.06 },
                { x: 0.02, y: -0.06 },
                { x: 0.015, y: -0.28 },
                { x: 0, y: -0.32 },
                { x: -0.015, y: -0.28 }
            ],
            color: colors.weaponColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 10 }
        },
        // Blade core
        {
            type: 'path',
            points: [
                { x: 0, y: -0.08 },
                { x: 0, y: -0.30 }
            ],
            color: '#ffffff',
            strokeWidth: 2,
            stroke: true,
            fill: false
        }
    ], 0.5, 1, 15);
    weapon.setBaseTransform(0.22, 0.05);
    weapon.opacity = 0.9;

    // Set up hierarchy
    sprite.setParent('shoulderLeft', 'body');
    sprite.setParent('shoulderRight', 'body');
    sprite.setParent('armLeft', 'shoulderLeft');
    sprite.setParent('armRight', 'shoulderRight');
    sprite.setParent('crest', 'head');

    return sprite;
}

/**
 * Get color scheme based on affinity focus
 */
function getColorScheme(focus) {
    const schemes = {
        ARCANE: {
            bodyMain: '#4a3a6a',
            bodyDark: '#2a1a4a',
            armorMain: '#6a4a8a',
            armorLight: '#9a7aba',
            armorDark: '#3a2a5a',
            energyColor: '#aa7aff',
            glowColor: '#8855ff',
            visorColor: '#6644cc',
            clawColor: '#5a3a7a',
            weaponColor: '#bb88ff',
            auraOuter: 'rgba(136, 85, 255, 0.15)',
            auraInner: 'rgba(170, 122, 255, 0.25)'
        },
        TECH: {
            bodyMain: '#3a4a5a',
            bodyDark: '#1a2a3a',
            armorMain: '#4a6a8a',
            armorLight: '#7a9aba',
            armorDark: '#2a3a4a',
            energyColor: '#55ccff',
            glowColor: '#00aaff',
            visorColor: '#0088cc',
            clawColor: '#4a5a6a',
            weaponColor: '#66ddff',
            auraOuter: 'rgba(0, 170, 255, 0.15)',
            auraInner: 'rgba(85, 204, 255, 0.25)'
        },
        PRIMAL: {
            bodyMain: '#4a5a3a',
            bodyDark: '#2a3a1a',
            armorMain: '#5a7a4a',
            armorLight: '#8aba6a',
            armorDark: '#3a4a2a',
            energyColor: '#88ff55',
            glowColor: '#55cc00',
            visorColor: '#44aa00',
            clawColor: '#5a6a4a',
            weaponColor: '#99ff66',
            auraOuter: 'rgba(85, 204, 0, 0.15)',
            auraInner: 'rgba(136, 255, 85, 0.25)'
        }
    };

    return schemes[focus] || schemes.TECH;
}
