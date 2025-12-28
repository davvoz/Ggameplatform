/**
 * Cyber Dino Player Sprite Definition
 * Multi-part animated sprite for the player character
 * Features: Cyber armor, dino features, glowing energy cores
 */

import { MultiPartSprite } from '../SpriteAnimationSystem.js';

/**
 * Create player sprite based on affinity focus and equipment
 * @param {string|object} focus - 'ARCANE', 'TECH', 'PRIMAL' or object with affinities {ARCANE: 0.3, TECH: 0.5, PRIMAL: 0.2}
 * @param {object} equipment - Character equipment (weaponMain, armorChest, etc.)
 */
export function createPlayerSprite(focus = 'TECH', equipment = {}) {
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
    
    // Override colors based on equipment if available
    if (equipment.weaponMain) {
        const weaponColor = getEquipmentColor(equipment.weaponMain, colors.weaponColor);
        colors.weaponColor = weaponColor;
        colors.glowColor = weaponColor;
    }
    
    if (equipment.armorChest) {
        const armorColorNew = getEquipmentColor(equipment.armorChest, colors.armorMain);
        colors.armorMain = armorColorNew;
        // Adjust related armor colors
        const parsed = parseColor(armorColorNew);
        colors.armorHighlight = `rgb(${Math.min(255, parsed.r * 1.3)}, ${Math.min(255, parsed.g * 1.3)}, ${Math.min(255, parsed.b * 1.3)})`;
        colors.armorDark = `rgb(${parsed.r * 0.7}, ${parsed.g * 0.7}, ${parsed.b * 0.7})`;
    }

    // Pre-calculate armor visibility settings for early use (legs, etc.)
    const hasArmorLegs = equipment.armorLegs != null || equipment.armorChest != null;
    const armorLegsItem = equipment.armorLegs || equipment.armorChest;
    const legArmorFocus = armorLegsItem?.meta?.focus || (techWeight >= arcaneWeight && techWeight >= primalWeight ? 'TECH' : (arcaneWeight >= primalWeight ? 'ARCANE' : 'PRIMAL'));
    const legArmorRarity = armorLegsItem?.rarity || 'COMMON';
    const legArmorColors = hasArmorLegs ? getArmorVisualColors(legArmorFocus, legArmorRarity) : null;

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
    // LEGS (z-order: -5) - Now with visible armor
    // ========================================================================
    const legArmorMain = hasArmorLegs ? legArmorColors.main : colors.armorMain;
    const legArmorDark = hasArmorLegs ? legArmorColors.dark : colors.armorDark;
    const legArmorTrim = hasArmorLegs ? legArmorColors.trim : colors.energyColor;
    const legArmorGlow = hasArmorLegs ? legArmorColors.glow : colors.glowColor;
    const legGlowIntensity = legArmorRarity === 'LEGENDARY' ? 8 : legArmorRarity === 'EPIC' ? 6 : 4;
    
    const legLeftElements = [
        // Thigh
        {
            type: 'ellipse',
            x: 0, y: 0.06,
            width: 0.09, height: 0.16,
            color: colors.bodyDark,
            fill: true
        },
        // Shin armor plate - larger and more visible
        {
            type: 'roundRect',
            x: 0, y: 0.15,
            width: 0.075, height: 0.13,
            radius: 0.015,
            color: legArmorMain,
            fill: true,
            glow: hasArmorLegs ? { color: legArmorGlow, blur: legGlowIntensity } : undefined
        },
        // Shin armor trim
        {
            type: 'line',
            x1: -0.028, y1: 0.15,
            x2: 0.028, y2: 0.15,
            color: legArmorTrim,
            strokeWidth: 2,
            glow: { color: legArmorGlow, blur: 4 }
        },
        // Knee plate
        {
            type: 'circle',
            x: 0, y: 0.10,
            radius: 0.022,
            color: legArmorDark,
            fill: true,
            glow: hasArmorLegs ? { color: legArmorGlow, blur: 4 } : undefined
        },
        // Foot armor
        {
            type: 'ellipse',
            x: 0.01, y: 0.24,
            width: 0.10, height: 0.05,
            color: legArmorDark,
            fill: true
        }
    ];
    
    const legLeft = sprite.addPart('legLeft', legLeftElements, 0.5, 0, -5);
    legLeft.setBaseTransform(-0.08, 0.12);

    const legRightElements = [
        {
            type: 'ellipse',
            x: 0, y: 0.06,
            width: 0.09, height: 0.16,
            color: colors.bodyDark,
            fill: true
        },
        {
            type: 'roundRect',
            x: 0, y: 0.15,
            width: 0.075, height: 0.13,
            radius: 0.015,
            color: legArmorMain,
            fill: true,
            glow: hasArmorLegs ? { color: legArmorGlow, blur: legGlowIntensity } : undefined
        },
        {
            type: 'line',
            x1: -0.028, y1: 0.15,
            x2: 0.028, y2: 0.15,
            color: legArmorTrim,
            strokeWidth: 2,
            glow: { color: legArmorGlow, blur: 4 }
        },
        {
            type: 'circle',
            x: 0, y: 0.10,
            radius: 0.022,
            color: legArmorDark,
            fill: true,
            glow: hasArmorLegs ? { color: legArmorGlow, blur: 4 } : undefined
        },
        {
            type: 'ellipse',
            x: 0.01, y: 0.24,
            width: 0.10, height: 0.05,
            color: legArmorDark,
            fill: true
        }
    ];
    
    const legRight = sprite.addPart('legRight', legRightElements, 0.5, 0, -5);
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
    // BODY - Main torso with VISIBLE cyber armor (z-order: 0)
    // Now equipment-dependent with clear armor visibility
    // ========================================================================
    const hasArmor = equipment.armorChest != null;
    const armorItem = equipment.armorChest;
    const armorFocus = armorItem?.meta?.focus || (techWeight >= arcaneWeight && techWeight >= primalWeight ? 'TECH' : (arcaneWeight >= primalWeight ? 'ARCANE' : 'PRIMAL'));
    const armorRarity = armorItem?.rarity || 'COMMON';
    const armorColors = getArmorVisualColors(armorFocus, armorRarity);
    const armorGlowIntensity = armorRarity === 'LEGENDARY' ? 16 : armorRarity === 'EPIC' ? 12 : armorRarity === 'RARE' ? 8 : 5;
    
    const bodyElements = [
        // Main body shape
        {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.30, height: 0.35,
            color: colors.bodyMain,
            fill: true
        }
    ];
    
    // Add armor based on equipment
    if (hasArmor) {
        // Equipped armor - much more visible with distinct plates
        bodyElements.push(
            // Main chest plate - larger and more prominent
            {
                type: 'polygon',
                points: [
                    { x: -0.13, y: -0.12 },
                    { x: 0.13, y: -0.12 },
                    { x: 0.15, y: 0.10 },
                    { x: 0, y: 0.15 },
                    { x: -0.15, y: 0.10 }
                ],
                color: armorColors.main,
                fill: true,
                glow: { color: armorColors.glow, blur: armorGlowIntensity }
            },
            // Upper chest highlight plate
            {
                type: 'polygon',
                points: [
                    { x: -0.10, y: -0.11 },
                    { x: 0.10, y: -0.11 },
                    { x: 0.08, y: -0.04 },
                    { x: -0.08, y: -0.04 }
                ],
                color: armorColors.highlight,
                fill: true
            },
            // Left armor panel
            {
                type: 'polygon',
                points: [
                    { x: -0.14, y: -0.08 },
                    { x: -0.08, y: -0.06 },
                    { x: -0.10, y: 0.08 },
                    { x: -0.15, y: 0.06 }
                ],
                color: armorColors.dark,
                fill: true
            },
            // Right armor panel
            {
                type: 'polygon',
                points: [
                    { x: 0.14, y: -0.08 },
                    { x: 0.08, y: -0.06 },
                    { x: 0.10, y: 0.08 },
                    { x: 0.15, y: 0.06 }
                ],
                color: armorColors.dark,
                fill: true
            },
            // Armor trim lines - horizontal
            {
                type: 'line',
                x1: -0.12, y1: -0.06,
                x2: 0.12, y2: -0.06,
                color: armorColors.trim,
                strokeWidth: 2,
                glow: { color: armorColors.glow, blur: 6 }
            },
            {
                type: 'line',
                x1: -0.10, y1: 0.04,
                x2: 0.10, y2: 0.04,
                color: armorColors.trim,
                strokeWidth: 2,
                glow: { color: armorColors.glow, blur: 6 }
            },
            // Energy core center - larger and brighter
            {
                type: 'circle',
                x: 0, y: -0.01,
                radius: 0.06,
                color: armorColors.glow,
                fill: true,
                glow: { color: armorColors.glow, blur: armorGlowIntensity + 4 }
            },
            // Core ring - larger
            {
                type: 'circle',
                x: 0, y: -0.01,
                radius: 0.08,
                color: armorColors.trim,
                fill: false,
                stroke: true,
                strokeWidth: 3,
                glow: { color: armorColors.glow, blur: 4 }
            }
        );
        
        // Add extra decoration for high rarity
        if (armorRarity === 'LEGENDARY' || armorRarity === 'EPIC') {
            bodyElements.push(
                // Corner gems/nodes
                {
                    type: 'circle',
                    x: -0.10, y: -0.08,
                    radius: 0.02,
                    color: armorColors.glow,
                    fill: true,
                    glow: { color: armorColors.glow, blur: 8 }
                },
                {
                    type: 'circle',
                    x: 0.10, y: -0.08,
                    radius: 0.02,
                    color: armorColors.glow,
                    fill: true,
                    glow: { color: armorColors.glow, blur: 8 }
                }
            );
        }
    } else {
        // Default armor - visible but simpler
        bodyElements.push(
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
                fill: true,
                glow: { color: colors.glowColor, blur: 4 }
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
        );
    }
    
    const body = sprite.addPart('body', bodyElements, 0.5, 0.5, 0);
    body.setBaseTransform(0, -0.02);

    // ========================================================================
    // SHOULDERS (z-order: 5)
    // Now equipment-aware with enhanced visibility
    // ========================================================================
    const shoulderLeftElements = [];
    const shoulderRightElements = [];
    
    // Use armor colors if equipped, otherwise base colors
    const shoulderColor = hasArmor ? armorColors.main : colors.armorMain;
    const shoulderHighlight = hasArmor ? armorColors.highlight : colors.armorLight;
    const shoulderDark = hasArmor ? armorColors.dark : colors.armorDark;
    const shoulderTrim = hasArmor ? armorColors.trim : colors.energyColor;
    const shoulderGlow = hasArmor ? armorColors.glow : colors.glowColor;
    const shoulderGlowAmount = hasArmor ? armorGlowIntensity : 6;
    
    if (techWeight > 0.4 || hasArmor) {
        // Tech/Equipped: Complex armor with circuits - LARGER
        const techShoulderLeft = [
            // Main plate - larger
            {
                type: 'polygon',
                points: [
                    { x: -0.08, y: -0.06 },
                    { x: 0.08, y: -0.06 },
                    { x: 0.10, y: 0.06 },
                    { x: -0.10, y: 0.06 }
                ],
                color: shoulderColor,
                fill: true,
                glow: { color: shoulderGlow, blur: shoulderGlowAmount }
            },
            // Upper panel
            {
                type: 'roundRect',
                x: 0, y: -0.06,
                width: 0.14, height: 0.04,
                radius: 0.008,
                color: shoulderHighlight,
                fill: true
            },
            // Energy circuit 1
            {
                type: 'line',
                x1: -0.07, y1: -0.01,
                x2: 0.07, y2: -0.01,
                color: shoulderTrim,
                strokeWidth: 3,
                glow: { color: shoulderGlow, blur: 8 }
            },
            // Energy circuit 2
            {
                type: 'line',
                x1: -0.06, y1: 0.03,
                x2: 0.06, y2: 0.03,
                color: shoulderTrim,
                strokeWidth: 2,
                glow: { color: shoulderGlow, blur: 6 }
            },
            // Tech node - larger
            {
                type: 'circle',
                x: 0, y: 0,
                radius: 0.022,
                color: shoulderTrim,
                fill: true,
                glow: { color: shoulderGlow, blur: 10 }
            }
        ];
        shoulderLeftElements.push(...techShoulderLeft);
        shoulderRightElements.push(...techShoulderLeft);
    } else {
        // Simple pauldrons - still enhanced
        const simpleShoulderLeft = [
            {
                type: 'ellipse',
                x: 0, y: 0,
                width: 0.14, height: 0.12,
                color: shoulderColor,
                fill: true,
                glow: { color: shoulderGlow, blur: 4 }
            },
            {
                type: 'line',
                x1: -0.05, y1: 0,
                x2: 0.05, y2: 0,
                color: shoulderTrim,
                strokeWidth: 2,
                glow: { color: shoulderGlow, blur: 6 }
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
    // ARMS (z-order: 2) - Now equipment-aware with visible armor
    // ========================================================================
    // Arm armor colors match chest armor if equipped
    const armArmorColor = hasArmor ? armorColors.main : colors.armorMain;
    const armArmorTrim = hasArmor ? armorColors.trim : colors.energyColor;
    const armArmorGlow = hasArmor ? armorColors.glow : colors.glowColor;
    
    const armLeftElements = [
        // Upper arm
        {
            type: 'ellipse',
            x: 0, y: 0.05,
            width: 0.07, height: 0.14,
            color: colors.bodyDark,
            fill: true
        },
        // Forearm armor plate - larger and more visible
        {
            type: 'roundRect',
            x: 0, y: 0.14,
            width: 0.065, height: 0.12,
            radius: 0.015,
            color: armArmorColor,
            fill: true,
            glow: hasArmor ? { color: armArmorGlow, blur: 4 } : undefined
        },
        // Armor trim line
        {
            type: 'line',
            x1: -0.025, y1: 0.14,
            x2: 0.025, y2: 0.14,
            color: armArmorTrim,
            strokeWidth: 2,
            glow: { color: armArmorGlow, blur: 4 }
        },
        // Hand/claw
        {
            type: 'polygon',
            points: [
                { x: -0.035, y: 0.22 },
                { x: 0.035, y: 0.22 },
                { x: 0.045, y: 0.29 },
                { x: 0, y: 0.27 },
                { x: -0.045, y: 0.29 }
            ],
            color: colors.clawColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 3 }
        }
    ];
    
    const armLeft = sprite.addPart('armLeft', armLeftElements, 0.5, 0, 2);
    armLeft.setBaseTransform(0, 0.06);

    const armRightElements = [
        {
            type: 'ellipse',
            x: 0, y: 0.05,
            width: 0.07, height: 0.14,
            color: colors.bodyDark,
            fill: true
        },
        {
            type: 'roundRect',
            x: 0, y: 0.14,
            width: 0.065, height: 0.12,
            radius: 0.015,
            color: armArmorColor,
            fill: true,
            glow: hasArmor ? { color: armArmorGlow, blur: 4 } : undefined
        },
        {
            type: 'line',
            x1: -0.025, y1: 0.14,
            x2: 0.025, y2: 0.14,
            color: armArmorTrim,
            strokeWidth: 2,
            glow: { color: armArmorGlow, blur: 4 }
        },
        {
            type: 'polygon',
            points: [
                { x: -0.035, y: 0.22 },
                { x: 0.035, y: 0.22 },
                { x: 0.045, y: 0.29 },
                { x: 0, y: 0.27 },
                { x: -0.045, y: 0.29 }
            ],
            color: colors.clawColor,
            fill: true,
            glow: { color: colors.glowColor, blur: 3 }
        }
    ];
    
    const armRight = sprite.addPart('armRight', armRightElements, 0.5, 0, 2);
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
    // Now renders based on ACTUAL EQUIPPED ITEM for clear visibility
    // ========================================================================
    const weaponElements = [];
    let weaponTransform = { x: 0.22, y: 0.08, angle: -25 };
    let weaponOpacity = 1.0;
    
    const dominant = Math.max(arcaneWeight, techWeight, primalWeight);
    const hasWeapon = equipment.weaponMain != null;
    const weaponItem = equipment.weaponMain;
    const weaponFocus = weaponItem?.meta?.focus || (arcaneWeight >= techWeight && arcaneWeight >= primalWeight ? 'ARCANE' : (techWeight >= primalWeight ? 'TECH' : 'PRIMAL'));
    const weaponRarity = weaponItem?.rarity || 'COMMON';
    
    // Weapon glow intensity based on rarity
    const weaponGlowIntensity = weaponRarity === 'LEGENDARY' ? 22 : weaponRarity === 'EPIC' ? 18 : weaponRarity === 'RARE' ? 14 : 10;
    
    // Get weapon-specific colors
    const weaponColors = getWeaponVisualColors(weaponFocus, weaponRarity, colors);
    
    if (hasWeapon || arcaneWeight === dominant && techWeight > 0.2) {
        // Energy sword - now larger and more visible with equipment colors
        weaponElements.push(
            // Handle - larger and more prominent
            {
                type: 'roundRect',
                x: 0, y: 0.02,
                width: 0.06, height: 0.18,
                radius: 0.015,
                color: weaponColors.handle,
                fill: true
            },
            // Guard - larger crossguard
            {
                type: 'ellipse',
                x: 0, y: -0.07,
                width: 0.16, height: 0.05,
                color: weaponColors.guard,
                fill: true,
                glow: { color: weaponColors.glow, blur: 8 }
            },
            // Blade aura (outer) - much larger
            {
                type: 'polygon',
                points: [
                    { x: -0.05, y: -0.10 },
                    { x: 0.05, y: -0.10 },
                    { x: 0.035, y: -0.42 },
                    { x: 0, y: -0.48 },
                    { x: -0.035, y: -0.42 }
                ],
                color: weaponColors.bladeAura,
                fill: true,
                glow: { color: weaponColors.glow, blur: weaponGlowIntensity + 6 },
                opacity: 0.5
            },
            // Blade core - main visible blade
            {
                type: 'polygon',
                points: [
                    { x: -0.028, y: -0.10 },
                    { x: 0.028, y: -0.10 },
                    { x: 0.018, y: -0.40 },
                    { x: 0, y: -0.45 },
                    { x: -0.018, y: -0.40 }
                ],
                color: weaponColors.blade,
                fill: true,
                glow: { color: weaponColors.glow, blur: weaponGlowIntensity }
            },
            // Core highlight - energy line
            {
                type: 'path',
                points: [
                    { x: 0, y: -0.12 },
                    { x: 0, y: -0.42 }
                ],
                color: '#ffffff',
                strokeWidth: 3,
                stroke: true,
                fill: false,
                glow: { color: weaponColors.glow, blur: 6 }
            },
            // Rune marks on blade (for visibility)
            {
                type: 'circle',
                x: 0, y: -0.18,
                radius: 0.012,
                color: weaponColors.glow,
                fill: true,
                glow: { color: weaponColors.glow, blur: 8 }
            },
            {
                type: 'circle',
                x: 0, y: -0.28,
                radius: 0.010,
                color: weaponColors.glow,
                fill: true,
                glow: { color: weaponColors.glow, blur: 6 }
            }
        );
        weaponTransform = { x: 0.24, y: 0.05, angle: -30 };
        weaponOpacity = 1.0;
    } else if (primalWeight === dominant && primalWeight > 0.3) {
        // PRIMAL dominant: Organic claw weapon - larger and more visible
        weaponElements.push(
            // Base/mounting - larger
            {
                type: 'ellipse',
                x: 0, y: 0,
                width: 0.10, height: 0.16,
                color: weaponColors.handle,
                fill: true
            },
            // Claw 1 - larger
            {
                type: 'polygon',
                points: [
                    { x: -0.035, y: -0.04 },
                    { x: -0.08, y: -0.34 },
                    { x: -0.015, y: -0.30 }
                ],
                color: weaponColors.blade,
                fill: true,
                glow: { color: weaponColors.glow, blur: weaponGlowIntensity }
            },
            // Claw 2 (center) - larger
            {
                type: 'polygon',
                points: [
                    { x: 0, y: -0.04 },
                    { x: -0.02, y: -0.40 },
                    { x: 0.02, y: -0.38 }
                ],
                color: weaponColors.blade,
                fill: true,
                glow: { color: weaponColors.glow, blur: weaponGlowIntensity }
            },
            // Claw 3 - larger
            {
                type: 'polygon',
                points: [
                    { x: 0.035, y: -0.04 },
                    { x: 0.08, y: -0.30 },
                    { x: 0.015, y: -0.28 }
                ],
                color: weaponColors.blade,
                fill: true,
                glow: { color: weaponColors.glow, blur: weaponGlowIntensity }
            },
            // Energy veins - more prominent
            {
                type: 'line',
                x1: 0, y1: 0,
                x2: -0.04, y2: -0.22,
                color: weaponColors.glow,
                strokeWidth: 3,
                glow: { color: weaponColors.glow, blur: 8 }
            },
            {
                type: 'line',
                x1: 0, y1: 0,
                x2: 0, y2: -0.26,
                color: weaponColors.glow,
                strokeWidth: 3,
                glow: { color: weaponColors.glow, blur: 8 }
            },
            {
                type: 'line',
                x1: 0, y1: 0,
                x2: 0.04, y2: -0.20,
                color: weaponColors.glow,
                strokeWidth: 3,
                glow: { color: weaponColors.glow, blur: 8 }
            }
        );
        weaponTransform = { x: 0.22, y: 0.12, angle: -20 };
    } else if (techWeight === dominant && techWeight > 0.3) {
        // TECH dominant: Plasma rifle - larger and more visible
        weaponElements.push(
            // Grip - larger
            {
                type: 'roundRect',
                x: 0, y: 0.08,
                width: 0.07, height: 0.16,
                radius: 0.015,
                color: weaponColors.handle,
                fill: true
            },
            // Trigger guard
            {
                type: 'roundRect',
                x: 0.015, y: 0.06,
                width: 0.04, height: 0.05,
                radius: 0.008,
                color: weaponColors.guard,
                fill: true
            },
            // Barrel housing - larger
            {
                type: 'roundRect',
                x: 0, y: -0.16,
                width: 0.08, height: 0.28,
                radius: 0.015,
                color: weaponColors.guard,
                fill: true
            },
            // Barrel tip - larger
            {
                type: 'circle',
                x: 0, y: -0.30,
                radius: 0.05,
                color: weaponColors.handle,
                fill: true
            },
            // Energy coils - more prominent
            {
                type: 'line',
                x1: -0.035, y1: -0.10,
                x2: 0.035, y2: -0.10,
                color: weaponColors.glow,
                strokeWidth: 3,
                glow: { color: weaponColors.glow, blur: 10 }
            },
            {
                type: 'line',
                x1: -0.035, y1: -0.17,
                x2: 0.035, y2: -0.17,
                color: weaponColors.glow,
                strokeWidth: 3,
                glow: { color: weaponColors.glow, blur: 10 }
            },
            {
                type: 'line',
                x1: -0.035, y1: -0.24,
                x2: 0.035, y2: -0.24,
                color: weaponColors.glow,
                strokeWidth: 3,
                glow: { color: weaponColors.glow, blur: 10 }
            },
            // Muzzle glow - larger
            {
                type: 'circle',
                x: 0, y: -0.30,
                radius: 0.028,
                color: weaponColors.glow,
                fill: true,
                glow: { color: weaponColors.glow, blur: weaponGlowIntensity + 8 }
            },
            // Scope/sight - larger
            {
                type: 'roundRect',
                x: 0, y: -0.12,
                width: 0.05, height: 0.08,
                radius: 0.012,
                color: weaponColors.blade,
                fill: true,
                glow: { color: weaponColors.glow, blur: 6 }
            },
            // Scope lens
            {
                type: 'circle',
                x: 0, y: -0.12,
                radius: 0.015,
                color: '#ffffff',
                fill: true,
                glow: { color: weaponColors.glow, blur: 4 }
            }
        );
        weaponTransform = { x: 0.20, y: 0.06, angle: -35 };
    } else {
        // Balanced: Energy blade - still larger and visible
        weaponElements.push(
            // Handle - larger
            {
                type: 'roundRect',
                x: 0, y: 0.02,
                width: 0.055, height: 0.16,
                radius: 0.012,
                color: weaponColors.handle,
                fill: true
            },
            // Guard - larger
            {
                type: 'ellipse',
                x: 0, y: -0.06,
                width: 0.12, height: 0.045,
                color: weaponColors.guard,
                fill: true,
                glow: { color: weaponColors.glow, blur: 6 }
            },
            // Blade - larger
            {
                type: 'polygon',
                points: [
                    { x: -0.03, y: -0.08 },
                    { x: 0.03, y: -0.08 },
                    { x: 0.01, y: -0.38 },
                    { x: 0, y: -0.42 },
                    { x: -0.01, y: -0.38 }
                ],
                color: weaponColors.blade,
                fill: true,
                glow: { color: weaponColors.glow, blur: weaponGlowIntensity }
            },
            // Energy core line
            {
                type: 'line',
                x1: 0, y1: -0.10,
                x2: 0, y2: -0.38,
                color: '#ffffff',
                strokeWidth: 2,
                glow: { color: weaponColors.glow, blur: 6 }
            }
        );
        weaponTransform = { x: 0.24, y: 0.08, angle: -28 };
    }

    const weapon = sprite.addPart('weapon', weaponElements, 0.5, 1, 15);
    weapon.setBaseTransform(weaponTransform.x, weaponTransform.y + 0.1,- weaponTransform.angle * Math.PI / 100);
    weapon.opacity = weaponOpacity;
    // Add glow to entire weapon part based on rarity
    if (weaponRarity === 'LEGENDARY' || weaponRarity === 'EPIC') {
        weapon.glowColor = weaponColors.glow;
        weapon.glowIntensity = weaponRarity === 'LEGENDARY' ? 1.5 : 1.0;
    }

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
 * Get equipment-specific color or fall back to default
 */
function getEquipmentColor(item, defaultColor) {
    if (!item) return defaultColor;
    
    // Use item rarity to determine color variations
    const focus = item.meta?.focus;
    const rarity = item.rarity;
    
    // Base colors by affinity
    if (focus === 'ARCANE') {
        if (rarity === 'LEGENDARY') return '#bf5af2';
        if (rarity === 'EPIC') return '#9d4edd';
        if (rarity === 'RARE') return '#7b2cbf';
        return '#5a189a';
    }
    if (focus === 'TECH') {
        if (rarity === 'LEGENDARY') return '#ffd60a';
        if (rarity === 'EPIC') return '#ffc300';
        if (rarity === 'RARE') return '#ffb703';
        return '#fb8500';
    }
    if (focus === 'PRIMAL') {
        if (rarity === 'LEGENDARY') return '#4cd964';
        if (rarity === 'EPIC') return '#38b54a';
        if (rarity === 'RARE') return '#2d9233';
        return '#207227';
    }
    
    return defaultColor;
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

/**
 * Get weapon-specific visual colors based on focus and rarity
 * Returns distinct, high-visibility colors for weapon parts
 */
function getWeaponVisualColors(focus, rarity, baseColors) {
    const rarityMultipliers = {
        'LEGENDARY': { brightness: 1.4, saturation: 1.2 },
        'EPIC': { brightness: 1.25, saturation: 1.1 },
        'RARE': { brightness: 1.1, saturation: 1.0 },
        'COMMON': { brightness: 1.0, saturation: 0.9 }
    };
    
    const mult = rarityMultipliers[rarity] || rarityMultipliers['COMMON'];
    
    // High contrast weapon colors by focus
    const weaponSchemes = {
        'ARCANE': {
            handle: '#2a1a4a',
            guard: '#6b3fa0',
            blade: '#bf5af2',
            bladeAura: 'rgba(191, 90, 242, 0.6)',
            glow: '#ff66ff'
        },
        'TECH': {
            handle: '#1a3a4a',
            guard: '#4a7a9a',
            blade: '#00d4ff',
            bladeAura: 'rgba(0, 212, 255, 0.6)',
            glow: '#00ffff'
        },
        'PRIMAL': {
            handle: '#2a3a1a',
            guard: '#5a7a3a',
            blade: '#88ff44',
            bladeAura: 'rgba(136, 255, 68, 0.6)',
            glow: '#aaff00'
        }
    };
    
    const scheme = weaponSchemes[focus] || weaponSchemes['TECH'];
    
    // Apply rarity brightness boost
    if (rarity === 'LEGENDARY') {
        scheme.blade = '#ffffff';
        scheme.bladeAura = `rgba(255, 255, 255, 0.7)`;
        scheme.glow = focus === 'ARCANE' ? '#ff00ff' : focus === 'PRIMAL' ? '#00ff00' : '#00ffff';
    } else if (rarity === 'EPIC') {
        scheme.glow = focus === 'ARCANE' ? '#ff88ff' : focus === 'PRIMAL' ? '#88ff88' : '#88ffff';
    }
    
    return scheme;
}

/**
 * Get armor-specific visual colors based on focus and rarity
 * Returns distinct colors for armor panels
 */
function getArmorVisualColors(focus, rarity) {
    const armorSchemes = {
        'ARCANE': {
            main: '#4a2080',
            highlight: '#7a40b0',
            dark: '#2a1050',
            trim: '#bf5af2',
            glow: '#ff66ff'
        },
        'TECH': {
            main: '#2a4a6a',
            highlight: '#4a7a9a',
            dark: '#1a2a4a',
            trim: '#00d4ff',
            glow: '#00ffff'
        },
        'PRIMAL': {
            main: '#3a5a2a',
            highlight: '#5a8a4a',
            dark: '#1a3a1a',
            trim: '#88ff44',
            glow: '#aaff00'
        }
    };
    
    const scheme = armorSchemes[focus] || armorSchemes['TECH'];
    
    // Rarity color enhancements
    if (rarity === 'LEGENDARY') {
        scheme.trim = '#ffd700';
        scheme.glow = '#ffff00';
    } else if (rarity === 'EPIC') {
        scheme.highlight = '#8a6ab0';
    }
    
    return scheme;
}
