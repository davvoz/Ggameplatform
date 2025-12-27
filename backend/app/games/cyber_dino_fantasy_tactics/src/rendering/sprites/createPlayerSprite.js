/**
 * Cyber Dino Player Sprite Definition
 * Multi-part animated sprite for the player character
 * Features: Cyber armor, dino features, glowing energy cores
 */

import { MultiPartSprite } from '../SpriteAnimationSystem.js';

/**
 * Create player sprite based on affinity focus
 * @param {string|object} focus - 'ARCANE', 'TECH', 'PRIMAL' or object with affinities {ARCANE: 0.3, TECH: 0.5, PRIMAL: 0.2}
 */
export function createPlayerSprite(focus = 'TECH') {
    const sprite = new MultiPartSprite('player');

    // Calculate affinity weights for visual elements
    let arcaneWeight = 0.33, techWeight = 0.33, primalWeight = 0.33;
    if (typeof focus === 'object') {
        const total = (focus.ARCANE || 0) + (focus.TECH || 0) + (focus.PRIMAL || 0) || 1;
        arcaneWeight = (focus.ARCANE || 0) / total;
        techWeight = (focus.TECH || 0) / total;
        primalWeight = (focus.PRIMAL || 0) / total;
    }

    // Color schemes based on focus
    const colors = getColorScheme(focus);

    // ========================================================================
    // AURA - Energy field behind character (z-order: -20)
    // ARCANE high: Multiple concentric rings with strong glow
    // ARCANE low: Simple single aura
    // ========================================================================
    const auraElements = [];
    
    if (arcaneWeight > 0.4) {
        // High ARCANE: Triple ring system
        auraElements.push(
            {
                type: 'ellipse',
                x: 0, y: 0.05,
                width: 0.65, height: 0.75,
                color: colors.auraOuter,
                fill: true
            },
            {
                type: 'ellipse',
                x: 0, y: 0.05,
                width: 0.52, height: 0.62,
                color: colors.auraInner,
                fill: true,
                glow: { color: colors.glowColor, blur: 18 }
            },
            {
                type: 'ellipse',
                x: 0, y: 0.05,
                width: 0.40, height: 0.50,
                color: colors.energyColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 12 }
            }
        );
    } else {
        // Low ARCANE: Simple aura
        auraElements.push(
            {
                type: 'ellipse',
                x: 0, y: 0.05,
                width: 0.50, height: 0.60,
                color: colors.auraOuter,
                fill: true
            },
            {
                type: 'ellipse',
                x: 0, y: 0.05,
                width: 0.42, height: 0.52,
                color: colors.auraInner,
                fill: true,
                glow: { color: colors.glowColor, blur: 8 }
            }
        );
    }

    const aura = sprite.addPart('aura', auraElements, 0.5, 0.5, -20);
    aura.setBaseTransform(0, 0);
    aura.opacity = 0.4 + arcaneWeight * 0.3;

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
    // PRIMAL high: Articulated tail with dorsal spines
    // PRIMAL low: Smooth simple tail
    // ========================================================================
    const tailElements = [];
    
    if (primalWeight > 0.4) {
        // High PRIMAL: Multi-segment tail with spines
        tailElements.push(
            // Segment 1
            {
                type: 'ellipse',
                x: -0.08, y: 0.02,
                width: 0.20, height: 0.10,
                color: colors.bodyMain,
                fill: true
            },
            // Spine 1
            {
                type: 'polygon',
                points: [
                    { x: -0.08, y: 0 },
                    { x: -0.06, y: -0.05 },
                    { x: -0.04, y: 0 }
                ],
                color: colors.spikeColor,
                fill: true
            },
            // Segment 2
            {
                type: 'ellipse',
                x: -0.20, y: 0.03,
                width: 0.16, height: 0.08,
                color: colors.bodyDark,
                fill: true
            },
            // Spine 2
            {
                type: 'polygon',
                points: [
                    { x: -0.18, y: 0.01 },
                    { x: -0.16, y: -0.04 },
                    { x: -0.14, y: 0.01 }
                ],
                color: colors.spikeColor,
                fill: true
            },
            // Segment 3 with glow
            {
                type: 'ellipse',
                x: -0.30, y: 0.04,
                width: 0.12, height: 0.06,
                color: colors.energyColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 10 }
            }
        );
    } else {
        // Low PRIMAL: Simple smooth tail
        tailElements.push(
            {
                type: 'ellipse',
                x: -0.08, y: 0.02,
                width: 0.18, height: 0.08,
                color: colors.bodyMain,
                fill: true
            },
            {
                type: 'ellipse',
                x: -0.18, y: 0.03,
                width: 0.14, height: 0.06,
                color: colors.bodyDark,
                fill: true
            },
            {
                type: 'ellipse',
                x: -0.26, y: 0.04,
                width: 0.08, height: 0.04,
                color: colors.energyColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 6 }
            }
        );
    }

    const tail = sprite.addPart('tail', tailElements, 0.5, 0.5, -8);
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
    // TECH high: Multi-panel armor with energy circuits
    // TECH low: Simple pauldrons
    // PRIMAL: Adds bone spikes
    // ========================================================================
    const shoulderLeftElements = [];
    const shoulderRightElements = [];
    
    if (techWeight > 0.4) {
        // High TECH: Complex armor with circuits
        const techShoulderLeft = [
            // Main plate
            {
                type: 'polygon',
                points: [
                    { x: -0.06, y: -0.04 },
                    { x: 0.06, y: -0.04 },
                    { x: 0.08, y: 0.04 },
                    { x: -0.08, y: 0.04 }
                ],
                color: colors.armorMain,
                fill: true
            },
            // Upper panel
            {
                type: 'roundRect',
                x: 0, y: -0.05,
                width: 0.10, height: 0.03,
                radius: 0.005,
                color: colors.armorDark,
                fill: true
            },
            // Energy circuit 1
            {
                type: 'line',
                x1: -0.05, y1: -0.01,
                x2: 0.05, y2: -0.01,
                color: colors.energyColor,
                strokeWidth: 2,
                glow: { color: colors.glowColor, blur: 6 }
            },
            // Energy circuit 2
            {
                type: 'line',
                x1: -0.04, y1: 0.02,
                x2: 0.04, y2: 0.02,
                color: colors.energyColor,
                strokeWidth: 1.5,
                glow: { color: colors.glowColor, blur: 4 }
            },
            // Tech node
            {
                type: 'circle',
                x: 0, y: 0,
                radius: 0.015,
                color: colors.energyColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 8 }
            }
        ];
        shoulderLeftElements.push(...techShoulderLeft);
        shoulderRightElements.push(...techShoulderLeft);
    } else {
        // Low TECH: Simple pauldrons
        const simpleShoulderLeft = [
            {
                type: 'ellipse',
                x: 0, y: 0,
                width: 0.12, height: 0.10,
                color: colors.armorMain,
                fill: true
            },
            {
                type: 'line',
                x1: -0.04, y1: 0,
                x2: 0.04, y2: 0,
                color: colors.energyColor,
                strokeWidth: 1.5,
                glow: { color: colors.glowColor, blur: 4 }
            }
        ];
        shoulderLeftElements.push(...simpleShoulderLeft);
        shoulderRightElements.push(...simpleShoulderLeft);
    }
    
    // Add PRIMAL spike if high
    if (primalWeight > 0.4) {
        const spike = {
            type: 'polygon',
            points: [
                { x: -0.02, y: -0.04 },
                { x: 0, y: -0.10 },
                { x: 0.02, y: -0.04 }
            ],
            color: colors.spikeColor,
            fill: true
        };
        shoulderLeftElements.push(spike);
        shoulderRightElements.push(spike);
    }

    const shoulderLeft = sprite.addPart('shoulderLeft', shoulderLeftElements, 0.5, 0.5, 5);
    shoulderLeft.setBaseTransform(-0.15, -0.08);

    const shoulderRight = sprite.addPart('shoulderRight', shoulderRightElements, 0.5, 0.5, 5);
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
    armLeft.setBaseTransform(0, 0.06);

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
    armRight.setBaseTransform(0, 0.06);

    // ========================================================================
    // HEAD - Dino head with cyber visor (z-order: 10)
    // TECH high: Advanced multi-layer HUD visor
    // TECH low: Simple minimalist visor
    // ========================================================================
    const headElements = [
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
        }
    ];
    
    if (techWeight > 0.4) {
        // High TECH: Complex HUD visor with targeting systems
        headElements.push(
            // Main visor
            {
                type: 'roundRect',
                x: 0.02, y: -0.01,
                width: 0.16, height: 0.08,
                radius: 0.02,
                color: colors.visorColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 14 }
            },
            // Upper HUD layer
            {
                type: 'roundRect',
                x: 0.02, y: -0.04,
                width: 0.12, height: 0.02,
                radius: 0.01,
                color: colors.energyColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 6 }
            },
            // Targeting reticle left
            {
                type: 'circle',
                x: -0.02, y: 0,
                radius: 0.01,
                color: colors.energyColor,
                fill: false,
                stroke: true,
                strokeWidth: 1
            },
            // Targeting reticle right
            {
                type: 'circle',
                x: 0.06, y: 0,
                radius: 0.01,
                color: colors.energyColor,
                fill: false,
                stroke: true,
                strokeWidth: 1
            },
            // Scan lines effect
            {
                type: 'line',
                x1: -0.04, y1: -0.01,
                x2: 0.10, y2: -0.01,
                color: `rgba(255,255,255,0.6)`,
                strokeWidth: 1
            },
            {
                type: 'line',
                x1: -0.04, y1: 0.02,
                x2: 0.10, y2: 0.02,
                color: `rgba(255,255,255,0.4)`,
                strokeWidth: 1
            }
        );
    } else {
        // Low TECH: Simple minimalist visor
        headElements.push(
            {
                type: 'roundRect',
                x: 0.02, y: -0.01,
                width: 0.16, height: 0.05,
                radius: 0.02,
                color: colors.visorColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 6 }
            },
            {
                type: 'line',
                x1: -0.02, y1: -0.02,
                x2: 0.10, y2: -0.02,
                color: `rgba(255,255,255,0.4)`,
                strokeWidth: 1
            }
        );
    }

    const head = sprite.addPart('head', headElements, 0.5, 0.5, 10);
    head.setBaseTransform(0, -0.27);

    // ========================================================================
    // HEAD CREST - Dino horns/crest (z-order: 12)
    // PRIMAL high: Branched antler-like horns
    // PRIMAL low: Small horn nubs
    // ========================================================================
    const crestElements = [];
    
    if (primalWeight > 0.4) {
        // High PRIMAL: Branched elaborate horns
        crestElements.push(
            // Left main horn
            {
                type: 'polygon',
                points: [
                    { x: -0.04, y: -0.02 },
                    { x: -0.10, y: -0.14 },
                    { x: -0.02, y: -0.10 }
                ],
                color: colors.bodyDark,
                fill: true,
                glow: { color: colors.glowColor, blur: 10 }
            },
            // Left branch 1
            {
                type: 'polygon',
                points: [
                    { x: -0.06, y: -0.08 },
                    { x: -0.10, y: -0.10 },
                    { x: -0.05, y: -0.09 }
                ],
                color: colors.bodyDark,
                fill: true
            },
            // Left branch 2
            {
                type: 'polygon',
                points: [
                    { x: -0.08, y: -0.11 },
                    { x: -0.12, y: -0.15 },
                    { x: -0.07, y: -0.12 }
                ],
                color: colors.bodyDark,
                fill: true
            },
            // Right main horn
            {
                type: 'polygon',
                points: [
                    { x: 0.04, y: -0.02 },
                    { x: 0.10, y: -0.14 },
                    { x: 0.02, y: -0.10 }
                ],
                color: colors.bodyDark,
                fill: true,
                glow: { color: colors.glowColor, blur: 10 }
            },
            // Right branch 1
            {
                type: 'polygon',
                points: [
                    { x: 0.06, y: -0.08 },
                    { x: 0.10, y: -0.10 },
                    { x: 0.05, y: -0.09 }
                ],
                color: colors.bodyDark,
                fill: true
            },
            // Right branch 2
            {
                type: 'polygon',
                points: [
                    { x: 0.08, y: -0.11 },
                    { x: 0.12, y: -0.15 },
                    { x: 0.07, y: -0.12 }
                ],
                color: colors.bodyDark,
                fill: true
            }
        );
    } else {
        // Low PRIMAL: Small simple nubs
        crestElements.push(
            {
                type: 'polygon',
                points: [
                    { x: -0.04, y: -0.02 },
                    { x: -0.06, y: -0.08 },
                    { x: -0.02, y: -0.06 }
                ],
                color: colors.bodyDark,
                fill: true,
                glow: { color: colors.glowColor, blur: 4 }
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.04, y: -0.02 },
                    { x: 0.06, y: -0.08 },
                    { x: 0.02, y: -0.06 }
                ],
                color: colors.bodyDark,
                fill: true,
                glow: { color: colors.glowColor, blur: 4 }
            }
        );
    }

    const crest = sprite.addPart('crest', crestElements, 0.5, 1, 12);
    crest.setBaseTransform(0, -0.09);

    // ========================================================================
    // WEAPON (z-order: 15)
    // Different weapon types based on affinity combination
    // ========================================================================
    const weaponElements = [];
    let weaponTransform = { x: 0.2, y: 0.2, angle: 2 };
    let weaponOpacity = 1.0;
    
    const dominant = Math.max(arcaneWeight, techWeight, primalWeight);
    
    if (arcaneWeight === dominant && techWeight > 0.2) {
        // ARCANE+TECH: Energy sword with magical aura
        weaponElements.push(
            // Handle
            {
                type: 'roundRect',
                x: 0, y: 0,
                width: 0.04, height: 0.14,
                radius: 0.01,
                color: colors.armorDark,
                fill: true
            },
            // Guard
            {
                type: 'ellipse',
                x: 0, y: -0.06,
                width: 0.10, height: 0.03,
                color: colors.armorMain,
                fill: true
            },
            // Blade aura (outer)
            {
                type: 'polygon',
                points: [
                    { x: -0.03, y: -0.08 },
                    { x: 0.03, y: -0.08 },
                    { x: 0.02, y: -0.30 },
                    { x: 0, y: -0.34 },
                    { x: -0.02, y: -0.30 }
                ],
                color: colors.energyColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 18 },
                opacity: 0.4
            },
            // Blade core
            {
                type: 'polygon',
                points: [
                    { x: -0.018, y: -0.08 },
                    { x: 0.018, y: -0.08 },
                    { x: 0.012, y: -0.30 },
                    { x: 0, y: -0.32 },
                    { x: -0.012, y: -0.30 }
                ],
                color: colors.weaponColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 12 }
            },
            // Core highlight
            {
                type: 'path',
                points: [
                    { x: 0, y: -0.10 },
                    { x: 0, y: -0.30 }
                ],
                color: '#ffffff',
                strokeWidth: 2,
                stroke: true,
                fill: false
            }
        );
        weaponOpacity = 0.85 + arcaneWeight * 0.15;
    } else if (primalWeight === dominant && primalWeight > 0.5) {
        // PRIMAL dominant: Organic claw weapon
        weaponElements.push(
            // Base/mounting
            {
                type: 'ellipse',
                x: 0, y: 0,
                width: 0.07, height: 0.12,
                color: colors.bodyMain,
                fill: true
            },
            // Claw 1
            {
                type: 'polygon',
                points: [
                    { x: -0.025, y: -0.03 },
                    { x: -0.05, y: -0.24 },
                    { x: -0.01, y: -0.22 }
                ],
                color: colors.clawColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 8 }
            },
            // Claw 2 (center)
            {
                type: 'polygon',
                points: [
                    { x: 0, y: -0.03 },
                    { x: -0.015, y: -0.30 },
                    { x: 0.015, y: -0.28 }
                ],
                color: colors.clawColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 8 }
            },
            // Claw 3
            {
                type: 'polygon',
                points: [
                    { x: 0.025, y: -0.03 },
                    { x: 0.05, y: -0.22 },
                    { x: 0.01, y: -0.20 }
                ],
                color: colors.clawColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 8 }
            },
            // Energy veins
            {
                type: 'line',
                x1: 0, y1: 0,
                x2: -0.02, y2: -0.15,
                color: colors.energyColor,
                strokeWidth: 1.5,
                glow: { color: colors.glowColor, blur: 4 }
            },
            {
                type: 'line',
                x1: 0, y1: 0,
                x2: 0.02, y2: -0.13,
                color: colors.energyColor,
                strokeWidth: 1.5,
                glow: { color: colors.glowColor, blur: 4 }
            }
        );
    } else if (techWeight === dominant && techWeight > 0.5) {
        // TECH dominant: Plasma rifle
        weaponElements.push(
            // Grip
            {
                type: 'roundRect',
                x: 0, y: 0.05,
                width: 0.05, height: 0.12,
                radius: 0.01,
                color: colors.armorDark,
                fill: true
            },
            // Trigger guard
            {
                type: 'roundRect',
                x: 0.01, y: 0.04,
                width: 0.03, height: 0.04,
                radius: 0.005,
                color: colors.armorMain,
                fill: true
            },
            // Barrel housing
            {
                type: 'roundRect',
                x: 0, y: -0.12,
                width: 0.06, height: 0.20,
                radius: 0.01,
                color: colors.armorMain,
                fill: true
            },
            // Barrel tip
            {
                type: 'circle',
                x: 0, y: -0.22,
                radius: 0.035,
                color: colors.armorDark,
                fill: true
            },
            // Energy coil 1
            {
                type: 'line',
                x1: -0.025, y1: -0.08,
                x2: 0.025, y2: -0.08,
                color: colors.energyColor,
                strokeWidth: 2,
                glow: { color: colors.glowColor, blur: 6 }
            },
            // Energy coil 2
            {
                type: 'line',
                x1: -0.025, y1: -0.13,
                x2: 0.025, y2: -0.13,
                color: colors.energyColor,
                strokeWidth: 2,
                glow: { color: colors.glowColor, blur: 6 }
            },
            // Energy coil 3
            {
                type: 'line',
                x1: -0.025, y1: -0.18,
                x2: 0.025, y2: -0.18,
                color: colors.energyColor,
                strokeWidth: 2,
                glow: { color: colors.glowColor, blur: 6 }
            },
            // Muzzle glow
            {
                type: 'circle',
                x: 0, y: -0.22,
                radius: 0.018,
                color: colors.energyColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 14 }
            },
            // Scope/sight
            {
                type: 'roundRect',
                x: 0, y: -0.10,
                width: 0.04, height: 0.06,
                radius: 0.01,
                color: colors.visorColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 4 }
            }
        );
        weaponTransform = { x: 0.18, y: 0.08, angle: 8 };
    } else {
        // Balanced: Simple energy blade
        weaponElements.push(
            {
                type: 'roundRect',
                x: 0, y: 0,
                width: 0.04, height: 0.12,
                radius: 0.01,
                color: colors.armorDark,
                fill: true
            },
            {
                type: 'ellipse',
                x: 0, y: -0.05,
                width: 0.08, height: 0.03,
                color: colors.armorMain,
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: -0.02, y: -0.06 },
                    { x: 0.02, y: -0.06 },
                    { x: 0, y: -0.28 }
                ],
                color: colors.weaponColor,
                fill: true,
                glow: { color: colors.glowColor, blur: 10 }
            }
        );
    }

    const weapon = sprite.addPart('weapon', weaponElements, 0.5, 1, 15);
    weapon.setBaseTransform(weaponTransform.x, weaponTransform.y, weaponTransform.angle);
    weapon.opacity = weaponOpacity;

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
 * @param {string|object} focus - Single affinity string or object with percentages
 */
function getColorScheme(focus) {
   const schemes = {
    ARCANE: {
        // BODY
        bodyDark: '#1F0F66',
        bodyMain: '#5B3BFF',

        // ARMOR
        armorDark: '#49003F',
        armorMain: '#254715',
        armorLight: '#DBDF0D',

        // DETAILS
        visorColor: '#FFFFFF',
        clawColor: '#321FBF',
        weaponColor: '#FF7BFF',

        // ENERGY / FX
        energyColor: '#FFE6FF',
        glowColor: '#FF2BFF',

        // AURA
        auraInner: 'rgba(255, 230, 255, 0.55)',
        auraOuter: 'rgba(255, 43, 255, 0.28)'
    },

    TECH: {
        // BODY
        bodyDark: '#003B66',
        bodyMain: '#00A2FF',

        // ARMOR
        armorDark: '#004A80',
        armorMain: '#F52BDA',
        armorLight: '#00343F',

        // DETAILS
        visorColor: '#FFFFFF',
        clawColor: '#006FB3',
        weaponColor: '#F949FF',

        // ENERGY / FX
        energyColor: '#180B61',
        glowColor: '#00FFF0',

        // AURA
        auraInner: 'rgba(214, 248, 255, 0.55)',
        auraOuter: 'rgba(33, 39, 126, 0.28)'
    },

    PRIMAL: {
        // BODY
        bodyDark: '#D42E18',
        bodyMain: '#63D800',

        // ARMOR
        armorDark: '#2F6B00',
        armorMain: '#A8FF3D',
        armorLight: '#DFBD00',

        // DETAILS
        visorColor: '#660303',
        clawColor: '#3E8F00',
        weaponColor: '#DFFF4D',

        // ENERGY / FX
        energyColor: '#F8FFE6',
        glowColor: '#B6FF00',

        // AURA
        auraInner: 'rgba(182, 97, 0, 0.7)',
        auraOuter: 'rgba(182, 255, 0, 0.28)'
    }
};


    // If focus is a string, return the single scheme
    if (typeof focus === 'string') {
        return schemes[focus] || schemes.TECH;
    }

    // If focus is an object with affinities, mix colors
    const arcane = focus.ARCANE || 0;
    const tech = focus.TECH || 0;
    const primal = focus.PRIMAL || 0;

    // Normalize percentages
    const total = arcane + tech + primal || 1;
    const m = arcane / total;
    const t = tech / total;
    const p = primal / total;

    // Mix each color property
    const mixedScheme = {};
    const colorKeys = Object.keys(schemes.ARCANE);

    for (const key of colorKeys) {
        const arcaneColor = schemes.ARCANE[key];
        const techColor = schemes.TECH[key];
        const primalColor = schemes.PRIMAL[key];

        mixedScheme[key] = mixThreeColors(arcaneColor, techColor, primalColor, m, t, p);
    }

    return mixedScheme;
}

/**
 * Mix three colors based on weights
 * @param {string} color1 - First color (ARCANE)
 * @param {string} color2 - Second color (TECH)
 * @param {string} color3 - Third color (PRIMAL)
 * @param {number} w1 - Weight for color1
 * @param {number} w2 - Weight for color2
 * @param {number} w3 - Weight for color3
 */
function mixThreeColors(color1, color2, color3, w1, w2, w3) {
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    const c3 = parseColor(color3);

    const r = Math.round(c1.r * w1 + c2.r * w2 + c3.r * w3);
    const g = Math.round(c1.g * w1 + c2.g * w2 + c3.g * w3);
    const b = Math.round(c1.b * w1 + c2.b * w2 + c3.b * w3);

    // Handle rgba colors
    if (c1.a !== undefined || c2.a !== undefined || c3.a !== undefined) {
        const a1 = c1.a !== undefined ? c1.a : 1;
        const a2 = c2.a !== undefined ? c2.a : 1;
        const a3 = c3.a !== undefined ? c3.a : 1;
        const a = a1 * w1 + a2 * w2 + a3 * w3;
        return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    }

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Parse color string to RGB(A)
 */
function parseColor(color) {
    // Handle hex colors
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            return {
                r: parseInt(hex[0] + hex[0], 16),
                g: parseInt(hex[1] + hex[1], 16),
                b: parseInt(hex[2] + hex[2], 16)
            };
        }
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16)
        };
    }

    // Handle rgba colors
    if (color.startsWith('rgba')) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3]),
                a: match[4] ? parseFloat(match[4]) : undefined
            };
        }
    }

    // Handle rgb colors
    if (color.startsWith('rgb')) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            };
        }
    }

    // Default fallback
    return { r: 255, g: 255, b: 255 };
}
