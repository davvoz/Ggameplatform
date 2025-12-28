/**
 * Enemy Sprite Definitions
 * Multi-part animated sprites for enemy characters
 * Features: Menacing designs, dark energy, corrupted tech
 */

import { MultiPartSprite } from '../SpriteAnimationSystem.js';

/**
 * Create enemy sprite based on affinity focus and level
 * @param {string} focus - 'ARCANE', 'TECH', or 'PRIMAL'
 * @param {number} level - Enemy level (affects design complexity)
 */
export function createEnemySprite(focus = 'TECH', level = 1) {
    const sprite = new MultiPartSprite('enemy');
    
    // Color schemes based on focus
    const colors = getEnemyColorScheme(focus);
    
    // ========================================================================
    // DARK AURA - Menacing energy field (z-order: -20)
    // ========================================================================
    const aura = sprite.addPart('aura', [
        {
            type: 'ellipse',
            x: 0, y: 0.05,
            width: 0.60, height: 0.70,
            color: colors.auraOuter,
            fill: true
        },
        {
            type: 'ellipse',
            x: 0, y: 0.05,
            width: 0.48, height: 0.56,
            color: colors.auraInner,
            fill: true,
            glow: { color: colors.glowColor, blur: 15 }
        }
    ], 0.5, 0.5, -20);
    aura.setBaseTransform(0, 0);
    aura.opacity = 0.5;

    // ========================================================================
    // LEGS (z-order: -5)
    // ========================================================================
    const legLeft = sprite.addPart('legLeft', [
        // Thigh - more muscular/monstrous
        {
            type: 'ellipse',
            x: 0, y: 0.06,
            width: 0.09, height: 0.15,
            color: colors.bodyDark,
            fill: true
        },
        // Shin with corrupted armor
        {
            type: 'polygon',
            points: [
                { x: -0.04, y: 0.10 },
                { x: 0.04, y: 0.10 },
                { x: 0.05, y: 0.22 },
                { x: -0.05, y: 0.22 }
            ],
            color: colors.armorMain,
            fill: true
        },
        // Clawed foot
        {
            type: 'polygon',
            points: [
                { x: -0.06, y: 0.22 },
                { x: 0.06, y: 0.22 },
                { x: 0.08, y: 0.26 },
                { x: 0, y: 0.24 },
                { x: -0.08, y: 0.26 }
            ],
            color: colors.clawColor,
            fill: true
        }
    ], 0.5, 0, -5);
    legLeft.setBaseTransform(-0.09, 0.12);

    const legRight = sprite.addPart('legRight', [
        {
            type: 'ellipse',
            x: 0, y: 0.06,
            width: 0.09, height: 0.15,
            color: colors.bodyDark,
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: -0.04, y: 0.10 },
                { x: 0.04, y: 0.10 },
                { x: 0.05, y: 0.22 },
                { x: -0.05, y: 0.22 }
            ],
            color: colors.armorMain,
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: -0.06, y: 0.22 },
                { x: 0.06, y: 0.22 },
                { x: 0.08, y: 0.26 },
                { x: 0, y: 0.24 },
                { x: -0.08, y: 0.26 }
            ],
            color: colors.clawColor,
            fill: true
        }
    ], 0.5, 0, -5);
    legRight.setBaseTransform(0.09, 0.12);

    // ========================================================================
    // TAIL - Corrupted/spiky tail (z-order: -8)
    // ========================================================================
    const tail = sprite.addPart('tail', [
        // Base
        {
            type: 'ellipse',
            x: 0.08, y: 0.02,
            width: 0.20, height: 0.09,
            color: colors.bodyMain,
            fill: true
        },
        // Mid with spikes
        {
            type: 'ellipse',
            x: 0.20, y: 0.03,
            width: 0.16, height: 0.07,
            color: colors.bodyDark,
            fill: true
        },
        // Spike 1
        {
            type: 'polygon',
            points: [
                { x: 0.15, y: 0.02 },
                { x: 0.17, y: -0.04 },
                { x: 0.19, y: 0.02 }
            ],
            color: colors.spikeColor,
            fill: true
        },
        // Spike 2
        {
            type: 'polygon',
            points: [
                { x: 0.22, y: 0.02 },
                { x: 0.24, y: -0.05 },
                { x: 0.26, y: 0.02 }
            ],
            color: colors.spikeColor,
            fill: true
        },
        // Tip with dark energy
        {
            type: 'ellipse',
            x: 0.30, y: 0.04,
            width: 0.10, height: 0.05,
            color: colors.energyColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 8 }
        }
    ], 0.5, 0.5, -8);
    tail.setBaseTransform(-0.07, 0.18, -10);

    // ========================================================================
    // BODY - Corrupted torso with dark core (z-order: 0) - Enhanced visibility
    // ========================================================================
    const body = sprite.addPart('body', [
        // Main body shape - more angular/threatening
        {
            type: 'polygon',
            points: [
                { x: -0.16, y: -0.18 },
                { x: 0.16, y: -0.18 },
                { x: 0.20, y: 0.12 },
                { x: 0, y: 0.18 },
                { x: -0.20, y: 0.12 }
            ],
            color: colors.bodyMain,
            fill: true
        },
        // Inner dark mass
        {
            type: 'ellipse',
            x: 0, y: -0.02,
            width: 0.28, height: 0.30,
            color: colors.bodyDark,
            fill: true
        },
        // Corrupted armor plate - larger and more visible
        {
            type: 'polygon',
            points: [
                { x: -0.12, y: -0.14 },
                { x: 0.12, y: -0.14 },
                { x: 0.14, y: 0.08 },
                { x: 0, y: 0.14 },
                { x: -0.14, y: 0.08 }
            ],
            color: colors.armorMain,
            fill: true,
            glow: { color: colors.glowColor, blur: 8 }
        },
        // Armor upper highlight
        {
            type: 'polygon',
            points: [
                { x: -0.10, y: -0.13 },
                { x: 0.10, y: -0.13 },
                { x: 0.08, y: -0.06 },
                { x: -0.08, y: -0.06 }
            ],
            color: colors.armorDark,
            fill: true
        },
        // Armor side panels
        {
            type: 'polygon',
            points: [
                { x: -0.13, y: -0.10 },
                { x: -0.08, y: -0.08 },
                { x: -0.10, y: 0.06 },
                { x: -0.14, y: 0.04 }
            ],
            color: colors.armorDark,
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: 0.13, y: -0.10 },
                { x: 0.08, y: -0.08 },
                { x: 0.10, y: 0.06 },
                { x: 0.14, y: 0.04 }
            ],
            color: colors.armorDark,
            fill: true
        },
        // Armor trim lines
        {
            type: 'line',
            x1: -0.10, y1: -0.08,
            x2: 0.10, y2: -0.08,
            color: colors.energyColor,
            strokeWidth: 2,
            glow: { color: colors.glowColor, blur: 6 }
        },
        {
            type: 'line',
            x1: -0.08, y1: 0.04,
            x2: 0.08, y2: 0.04,
            color: colors.energyColor,
            strokeWidth: 2,
            glow: { color: colors.glowColor, blur: 6 }
        },
        // Dark core - pulsing - larger
        {
            type: 'circle',
            x: 0, y: -0.02,
            radius: 0.07,
            color: colors.coreColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 16 }
        },
        // Core ring
        {
            type: 'circle',
            x: 0, y: -0.02,
            radius: 0.09,
            color: colors.energyColor,
            fill: false,
            stroke: true,
            strokeWidth: 2,
            glow: { color: colors.glowColor, blur: 4 }
        },
        // Core cracks
        {
            type: 'path',
            points: [
                { x: -0.05, y: -0.05 },
                { x: 0, y: -0.02 },
                { x: 0.05, y: -0.07 }
            ],
            color: colors.energyColor,
            strokeWidth: 2,
            stroke: true,
            fill: false,
            glow: { color: colors.glowColor, blur: 4 }
        }
    ], 0.5, 0.5, 0);
    body.setBaseTransform(0, -0.02);

    // ========================================================================
    // SHOULDERS - Spiked pauldrons (z-order: 5) - Enhanced visibility
    // ========================================================================
    const shoulderLeft = sprite.addPart('shoulderLeft', [
        // Main pauldron - larger
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.16, height: 0.14,
            color: colors.armorMain,
            fill: true,
            glow: { color: colors.glowColor, blur: 6 }
        },
        // Pauldron panel detail
        {
            type: 'ellipse',
            x: 0, y: 0.02,
            width: 0.12, height: 0.08,
            color: colors.armorDark,
            fill: true
        },
        // Energy trim
        {
            type: 'line',
            x1: -0.06, y1: 0,
            x2: 0.06, y2: 0,
            color: colors.energyColor,
            strokeWidth: 2,
            glow: { color: colors.glowColor, blur: 6 }
        },
        // Large spike - larger
        {
            type: 'polygon',
            points: [
                { x: -0.035, y: -0.04 },
                { x: 0, y: -0.18 },
                { x: 0.035, y: -0.04 }
            ],
            color: colors.spikeColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 6 }
        },
        // Small spike
        {
            type: 'polygon',
            points: [
                { x: -0.07, y: -0.02 },
                { x: -0.05, y: -0.10 },
                { x: -0.03, y: -0.02 }
            ],
            color: colors.spikeColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 3 }
        }
    ], 0.5, 0.5, 5);
    shoulderLeft.setBaseTransform(-0.16, -0.10);

    const shoulderRight = sprite.addPart('shoulderRight', [
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.16, height: 0.14,
            color: colors.armorMain,
            fill: true,
            glow: { color: colors.glowColor, blur: 6 }
        },
        {
            type: 'ellipse',
            x: 0, y: 0.02,
            width: 0.12, height: 0.08,
            color: colors.armorDark,
            fill: true
        },
        {
            type: 'line',
            x1: -0.06, y1: 0,
            x2: 0.06, y2: 0,
            color: colors.energyColor,
            strokeWidth: 2,
            glow: { color: colors.glowColor, blur: 6 }
        },
        {
            type: 'polygon',
            points: [
                { x: -0.035, y: -0.04 },
                { x: 0, y: -0.18 },
                { x: 0.035, y: -0.04 }
            ],
            color: colors.spikeColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 6 }
        },
        {
            type: 'polygon',
            points: [
                { x: 0.07, y: -0.02 },
                { x: 0.05, y: -0.10 },
                { x: 0.03, y: -0.02 }
            ],
            color: colors.spikeColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 3 }
        }
    ], 0.5, 0.5, 5);
    shoulderRight.setBaseTransform(0.16, -0.10);

    // ========================================================================

    // ========================================================================
    // ARMS (z-order: 2)
    // ========================================================================
    const armLeft = sprite.addPart('armLeft', [
        // Upper arm
        {
            type: 'ellipse',
            x: 0, y: 0.06,
            width: 0.07, height: 0.14,
            color: colors.bodyDark,
            fill: true
        },
        // Forearm - armored
        {
            type: 'polygon',
            points: [
                { x: -0.03, y: 0.10 },
                { x: 0.03, y: 0.10 },
                { x: 0.04, y: 0.22 },
                { x: -0.04, y: 0.22 }
            ],
            color: colors.armorMain,
            fill: true
        },
        // Clawed hand
        {
            type: 'polygon',
            points: [
                { x: -0.04, y: 0.21 },
                { x: 0.04, y: 0.21 },
                { x: 0.06, y: 0.28 },
                { x: 0.02, y: 0.26 },
                { x: 0, y: 0.30 },
                { x: -0.02, y: 0.26 },
                { x: -0.06, y: 0.28 }
            ],
            color: colors.clawColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 2 }
        }
    ], 0.5, 0, 2);
    armLeft.setBaseTransform(-0.05, -0.04);

    const armRight = sprite.addPart('armRight', [
        {
            type: 'ellipse',
            x: 0, y: 0.06,
            width: 0.07, height: 0.14,
            color: colors.bodyDark,
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: -0.03, y: 0.10 },
                { x: 0.03, y: 0.10 },
                { x: 0.04, y: 0.22 },
                { x: -0.04, y: 0.22 }
            ],
            color: colors.armorMain,
            fill: true
        },
        {
            type: 'polygon',
            points: [
                { x: -0.04, y: 0.21 },
                { x: 0.04, y: 0.21 },
                { x: 0.06, y: 0.28 },
                { x: 0.02, y: 0.26 },
                { x: 0, y: 0.30 },
                { x: -0.02, y: 0.26 },
                { x: -0.06, y: 0.28 }
            ],
            color: colors.clawColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 2 }
        }
    ], 0.5, 0, 2);
    armRight.setBaseTransform(0.05, -0.04);

    // ========================================================================
    // HEAD - Monstrous dino head (z-order: 10)
    // ========================================================================
    const head = sprite.addPart('head', [
        // Back of skull
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.22, height: 0.20,
            color: colors.bodyMain,
            fill: true
        },
        // Snout - more aggressive
        {
            type: 'polygon',
            points: [
                { x: 0.04, y: -0.04 },
                { x: 0.16, y: 0 },
                { x: 0.14, y: 0.06 },
                { x: 0.04, y: 0.06 }
            ],
            color: colors.bodyMain,
            fill: true
        },
        // Lower jaw
        {
            type: 'polygon',
            points: [
                { x: 0.02, y: 0.04 },
                { x: 0.14, y: 0.06 },
                { x: 0.12, y: 0.10 },
                { x: 0.02, y: 0.08 }
            ],
            color: colors.bodyDark,
            fill: true
        },
        // Teeth
        {
            type: 'path',
            points: [
                { x: 0.06, y: 0.04 },
                { x: 0.07, y: 0.06 },
                { x: 0.09, y: 0.04 },
                { x: 0.10, y: 0.06 },
                { x: 0.12, y: 0.04 }
            ],
            color: '#ffffff',
            strokeWidth: 1.5,
            stroke: true,
            fill: false
        },
        // Glowing eyes
        {
            type: 'ellipse',
            x: -0.02, y: -0.02,
            width: 0.08, height: 0.05,
            color: colors.eyeColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 8 }
        },
        // Eye pupil
        {
            type: 'ellipse',
            x: 0, y: -0.02,
            width: 0.03, height: 0.04,
            color: colors.pupilColor,
            fill: true
        }
    ], 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.24);

    // ========================================================================
    // HORNS (z-order: 12)
    // ========================================================================
    const hornLeft = sprite.addPart('hornLeft', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0.02 },
                { x: -0.04, y: -0.14 },
                { x: 0.02, y: -0.12 },
                { x: 0.04, y: 0.02 }
            ],
            color: colors.hornColor,
            fill: true
        },
        // Horn tip glow
        {
            type: 'circle',
            x: -0.02, y: -0.12,
            radius: 0.02,
            color: colors.energyColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 5 }
        }
    ], 0.5, 1, 12);
    hornLeft.setBaseTransform(-0.08, -0.1);

    const hornRight = sprite.addPart('hornRight', [
        {
            type: 'polygon',
            points: [
                { x: 0, y: 0.02 },
                { x: 0.04, y: -0.14 },
                { x: -0.02, y: -0.12 },
                { x: -0.04, y: 0.02 }
            ],
            color: colors.hornColor,
            fill: true
        },
        {
            type: 'circle',
            x: 0.02, y: -0.12,
            radius: 0.02,
            color: colors.energyColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 5 }
        }
    ], 0.5, 1, 12);
    hornRight.setBaseTransform(0.08, -0.1);

    // ========================================================================
    // WEAPON - Dark energy weapon (z-order: 15) - Enhanced visibility
    // ========================================================================
    const weapon = sprite.addPart('weapon', [
        // Handle - larger
        {
            type: 'roundRect',
            x: 0, y: 0.02,
            width: 0.06, height: 0.18,
            radius: 0.015,
            color: colors.armorDark,
            fill: true
        },
        // Guard
        {
            type: 'ellipse',
            x: 0, y: -0.07,
            width: 0.14, height: 0.05,
            color: colors.armorMain,
            fill: true,
            glow: { color: colors.glowColor, blur: 6 }
        },
        // Dark crystal blade - larger and more prominent
        {
            type: 'polygon',
            points: [
                { x: -0.05, y: -0.08 },
                { x: 0.05, y: -0.08 },
                { x: 0.07, y: -0.22 },
                { x: 0, y: -0.45 },
                { x: -0.07, y: -0.22 }
            ],
            color: colors.weaponColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 18 }
        },
        // Inner blade aura
        {
            type: 'polygon',
            points: [
                { x: -0.03, y: -0.10 },
                { x: 0.03, y: -0.10 },
                { x: 0.04, y: -0.20 },
                { x: 0, y: -0.40 },
                { x: -0.04, y: -0.20 }
            ],
            color: colors.coreColor,
            fill: true,
            glow: { color: colors.coreColor, blur: 12 }
        },
        // Dark core energy line
        {
            type: 'path',
            points: [
                { x: 0, y: -0.12 },
                { x: 0, y: -0.38 }
            ],
            color: '#ffffff',
            strokeWidth: 3,
            stroke: true,
            fill: false,
            glow: { color: colors.glowColor, blur: 8 }
        },
        // Rune marks
        {
            type: 'circle',
            x: 0, y: -0.18,
            radius: 0.012,
            color: colors.glowColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 8 }
        },
        {
            type: 'circle',
            x: 0, y: -0.28,
            radius: 0.010,
            color: colors.glowColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 6 }
        }
    ], 0.5, 1, 15);
    weapon.setBaseTransform(0.25, 0.1, 25 * Math.PI / 35);
    weapon.opacity = 1.0;

    // Set up hierarchy
    sprite.setParent('shoulderLeft', 'body');
    sprite.setParent('shoulderRight', 'body');
    sprite.setParent('armLeft', 'shoulderLeft');
    sprite.setParent('armRight', 'shoulderRight');
    sprite.setParent('hornLeft', 'head');
    sprite.setParent('hornRight', 'head');

    // Flip for enemy facing left
    sprite.flipX = true;

    return sprite;
}

/**
 * Get color scheme for enemies based on affinity focus
 */
function getEnemyColorScheme(focus) {
    const schemes = {
        ARCANE: {
            bodyMain: '#4a2a5a',
            bodyDark: '#2a1a3a',
            armorMain: '#5a3a6a',
            armorLight: '#7a5a8a',
            armorDark: '#3a1a4a',
            energyColor: '#cc55ff',
            glowColor: '#aa22ff',
            coreColor: '#ff00ff',
            eyeColor: '#ff55ff',
            pupilColor: '#220022',
            clawColor: '#6a3a7a',
            spikeColor: '#7a4a8a',
            hornColor: '#5a2a6a',
            weaponColor: '#aa44dd',
            auraOuter: 'rgba(170, 34, 255, 0.15)',
            auraInner: 'rgba(204, 85, 255, 0.25)'
        },
        TECH: {
            bodyMain: '#3a3a4a',
            bodyDark: '#1a1a2a',
            armorMain: '#4a4a5a',
            armorLight: '#6a6a7a',
            armorDark: '#2a2a3a',
            energyColor: '#ff5555',
            glowColor: '#ff0000',
            coreColor: '#ff0044',
            eyeColor: '#ff4444',
            pupilColor: '#220000',
            clawColor: '#5a4a4a',
            spikeColor: '#6a5a5a',
            hornColor: '#4a3a3a',
            weaponColor: '#dd4444',
            auraOuter: 'rgba(255, 0, 0, 0.15)',
            auraInner: 'rgba(255, 85, 85, 0.25)'
        },
        PRIMAL: {
            bodyMain: '#5a4a2a',
            bodyDark: '#3a2a1a',
            armorMain: '#6a5a3a',
            armorLight: '#8a7a5a',
            armorDark: '#4a3a2a',
            energyColor: '#ffaa00',
            glowColor: '#ff8800',
            coreColor: '#ff6600',
            eyeColor: '#ffcc00',
            pupilColor: '#221100',
            clawColor: '#6a5a3a',
            spikeColor: '#7a6a4a',
            hornColor: '#5a4a2a',
            weaponColor: '#dd8833',
            auraOuter: 'rgba(255, 136, 0, 0.15)',
            auraInner: 'rgba(255, 170, 0, 0.25)'
        }
    };

    return schemes[focus] || schemes.TECH;
}
