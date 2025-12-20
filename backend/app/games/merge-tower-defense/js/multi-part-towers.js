/**
 * Multi-Part Tower Sprite Definitions
 * Each tower built from independent animated parts for professional animations
 */

const MultiPartTowerSprites = {

    /**
     * Create BASIC tower with rotating turret
     */
    createBasic() {
        const sprite = new MultiPartSprite('basic');

        // Static platform base with mounting bolts
        const base = sprite.addPart('base', [
            {
                type: 'polygon',
                points: [
                    { x: -0.17, y: 0.15 },
                    { x: 0.17, y: 0.15 },
                    { x: 0.22, y: 0.27 },
                    { x: -0.22, y: 0.27 }
                ],
                color: '#6868ff',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: -0.18, y: 0.24,
                radius: 0.015,
                color: '#05b0c7',
                fill: true
            },
            {
                type: 'circle',
                x: 0.18, y: 0.24,
                radius: 0.015,
                color: '#db0505',
                fill: true
            }
        ], 0.5, 0.75);
        base.setBaseTransform(0, 0.15);

        // Mounting column with rotation ring
        const column = sprite.addPart('column', [
            {
                type: 'rect',
                x: -0.09, y: 0,
                width: 0.18, height: 0.16,
                color: '#0202ff',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: -0.1, y: 0.06,
                width: 0.2, height: 0.02,
                color: '#f7c57a',
                fill: true
            }
        ], 0.5, 0.5);
        column.setBaseTransform(0, 0.07);
        sprite.setParent('column', 'base');

        // Rotating turret housing with sensor and vents
        const turret = sprite.addPart('turret', [
            {
                type: 'rect',
                x: -0.16, y: -0.1,
                width: 0.32, height: 0.2,
                color: '#2370bd',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'rect',
                x: -0.025, y: -0.08,
                width: 0.05, height: 0.06,
                color: '#b6f800',
                fill: true
            },
            {
                type: 'circle',
                x: 0, y: -0.05,
                radius: 0.012,
                color: '#88ccff',
                fill: true
            },
            {
                type: 'rect',
                x: -0.14, y: -0.04,
                width: 0.02, height: 0.08,
                color: '#00ff15',
                fill: true
            },
            {
                type: 'rect',
                x: 0.12, y: -0.04,
                width: 0.02, height: 0.08,
                color: '#7ff033',
                fill: true
            }
        ], 0.5, 0.5);
        turret.setBaseTransform(0, -0.07);
        sprite.setParent('turret', 'column');

        // Weapon barrel with segmented muzzle brake
        const barrel = sprite.addPart('barrel', [
            {
                type: 'rect',
                x: 0.1, y: -0.05,
                width: 0.30, height: 0.10,
                color: '#a0a0be',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'rect',
                x: 0.38, y: -0.055,
                width: 0.02, height: 0.11,
                color: '#4ead0f',
                fill: true
            },
            {
                type: 'rect',
                x: 0.41, y: -0.06,
                width: 0.02, height: 0.12,
                color: '#4ead0f',
                fill: true
            },
            {
                type: 'rect',
                x: 0.44, y: -0.055,
                width: 0.02, height: 0.11,
                color: '#0000aa',
                fill: true
            }
        ], 0.5, 0.5);
        barrel.setBaseTransform(0, -0.07);
        sprite.setParent('barrel', 'turret');

        // Setup animations
        sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['turret', 'barrel'], 2.5));
        sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['barrel', 'turret'], 0.2));

        return sprite;
    },

    /**
     * Create RAPID tower with twin barrels
     */
    createRapid() {
        const sprite = new MultiPartSprite('rapid');

        // BASE
        const base = sprite.addPart('base', {
            type: 'polygon',
            points: [
                { x: -0.14, y: 0.15 },
                { x: 0.14, y: 0.15 },
                { x: 0.18, y: 0.24 },
                { x: -0.18, y: 0.24 }
            ],
            color: '#ff8800',
            fill: true,
            stroke: true,
            strokeWidth: 1
        }, 0.5, 0.75);
        base.setBaseTransform(0, 0.15);

        // TURRET CORE
        const turret = sprite.addPart('turret', [
            {
                type: 'rect',
                x: -0.13, y: -0.09,
                width: 0.26, height: 0.18,
                color: '#cc00ff',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'rect',
                x: -0.04, y: -0.02,
                width: 0.08, height: 0.12,
                color: '#00ddff',
                fill: true
            }
        ], 0.5, 0.5);
        turret.setBaseTransform(0, -0.05);
        sprite.setParent('turret', 'base');

        // LEFT BARREL
        const barrelLeft = sprite.addPart('barrelLeft', [
            {
                type: 'rect',
                x: 0.08, y: -0.02,
                width: 0.28, height: 0.04,
                color: '#ff0000',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: 0.34, y: -0.025,
                width: 0.03, height: 0.05,
                color: '#00ff00',
                fill: true
            }
        ], 0.5, 0.5);
        barrelLeft.setBaseTransform(0, -0.11);
        sprite.setParent('barrelLeft', 'turret');

        // RIGHT BARREL
        const barrelRight = sprite.addPart('barrelRight', [
            {
                type: 'rect',
                x: 0.08, y: -0.02,
                width: 0.28, height: 0.04,
                color: '#ff0000',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: 0.34, y: -0.025,
                width: 0.03, height: 0.05,
                color: '#ffff00',
                fill: true
            }
        ], 0.5, 0.5);
        barrelRight.setBaseTransform(0, 0.01);
        sprite.setParent('barrelRight', 'turret');

        // Setup animations
        sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['turret'], 2.0));
        sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['barrelLeft', 'barrelRight', 'turret'], 0.15));

        return sprite;
    },

    /**
     * Create SNIPER tower with long barrel and scope
     */
    createSniper() {
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
    },

    /**
     * Create SPLASH tower with mortar launcher
     */
    createSplash() {
        const sprite = new MultiPartSprite('splash');

        // BASE (wide and stable)
        const base = sprite.addPart('base', [
            {
                type: 'polygon',
                points: [
                    { x: -0.2, y: 0.15 },
                    { x: 0.2, y: 0.15 },
                    { x: 0.25, y: 0.25 },
                    { x: -0.25, y: 0.25 }
                ],
                color: '#3a2a1a',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: -0.18, y: 0.17,
                width: 0.36, height: 0.05,
                color: '#ff8800',
                fill: true
            }
        ], 0.5, 0.75);
        base.setBaseTransform(0, 0.15);

        // MOUNTING PLATFORM
        const platform = sprite.addPart('platform', {
            type: 'ellipse',
            x: 0, y: 0,
            width: 0.3, height: 0.15,
            color: '#4a3a2a',
            fill: true,
            stroke: true,
            strokeWidth: 1
        }, 0.5, 0.5);
        platform.setBaseTransform(0, 0.02);
        sprite.setParent('platform', 'base');

        // MORTAR BODY
        const mortar = sprite.addPart('mortar', [
            {
                type: 'ellipse',
                x: 0, y: 0,
                width: 0.25, height: 0.2,
                color: '#ff8800',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'rect',
                x: -0.08, y: -0.05,
                width: 0.16, height: 0.1,
                color: '#cc6600',
                fill: true
            }
        ], 0.5, 0.5);
        mortar.setBaseTransform(0, -0.08);
        sprite.setParent('mortar', 'platform');

        // BARREL (angled upward)
        const barrel = sprite.addPart('barrel', [
            {
                type: 'rect',
                x: 0, y: -0.18,
                width: 0.12, height: 0.2,
                color: '#2a1a0a',
                fill: true
            },
            {
                type: 'rect',
                x: 0, y: -0.2,
                width: 0.14, height: 0.05,
                color: '#1a1a0a',
                fill: true
            }
        ], 0.5, 1);
        barrel.setBaseTransform(0, -0.02, -0.3); // Angled
        sprite.setParent('barrel', 'mortar');

        // LOADING MECHANISM
        const loader = sprite.addPart('loader', {
            type: 'rect',
            x: -0.12, y: -0.04,
            width: 0.08, height: 0.08,
            color: '#ff8800',
            fill: true,
            stroke: true,
            strokeWidth: 1
        }, 0.5, 0.5);
        loader.setBaseTransform(0, -0.08);
        sprite.setParent('loader', 'mortar');

        // Setup animations
        sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['mortar'], 2.5));
        sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['barrel', 'mortar', 'loader'], 0.3));

        return sprite;
    },

    /**
     * Create FREEZE tower with cryo emitters
     */
    createFreeze() {
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
    },

    /**
     * Create LASER tower with focusing crystal
     */
    createLaser() {
        const sprite = new MultiPartSprite('laser');

        // BASE
        const base = sprite.addPart('base', [
            {
                type: 'polygon',
                points: [
                    { x: -0.16, y: 0.14 },
                    { x: 0.16, y: 0.14 },
                    { x: 0.2, y: 0.24 },
                    { x: -0.2, y: 0.24 }
                ],
                color: '#2a2a1a',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: -0.14, y: 0.16,
                width: 0.28, height: 0.04,
                color: '#ffff00',
                fill: true
            }
        ], 0.5, 0.75);
        base.setBaseTransform(0, 0.15);

        // POWER CORE
        const powerCore = sprite.addPart('powerCore', [
            {
                type: 'rect',
                x: -0.1, y: -0.08,
                width: 0.2, height: 0.16,
                color: '#ffff00',
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
            },
            {
                type: 'circle',
                x: 0, y: 0,
                radius: 0.03,
                color: '#ffff00',
                fill: true
            }
        ], 0.5, 0.5);
        powerCore.setBaseTransform(0, -0.04);
        sprite.setParent('powerCore', 'base');

        // CRYSTAL HOUSING
        const housing = sprite.addPart('housing', [
            {
                type: 'rect',
                x: 0.05, y: -0.08,
                width: 0.15, height: 0.16,
                color: '#cccc00',
                fill: true,
                stroke: true,
                strokeWidth: 1
            }
        ], 0.5, 0.5);
        housing.setBaseTransform(0, -0.04);
        sprite.setParent('housing', 'powerCore');

        // FOCUSING CRYSTAL
        const crystal = sprite.addPart('crystal', [
            {
                type: 'polygon',
                points: [
                    { x: 0.18, y: 0 },
                    { x: 0.28, y: -0.04 },
                    { x: 0.28, y: 0.04 }
                ],
                color: '#ffffff',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: 0.23, y: 0,
                radius: 0.02,
                color: '#ffff00',
                fill: true
            }
        ], 0.5, 0.5);
        crystal.setBaseTransform(0, -0.04);
        sprite.setParent('crystal', 'housing');

        // LENS
        const lens = sprite.addPart('lens', {
            type: 'circle',
            x: 0.3, y: -0.04,
            radius: 0.04,
            color: '#aaffff',
            fill: true,
            stroke: true,
            strokeWidth: 1
        }, 0.5, 0.5);
        lens.setBaseTransform(0, 0);
        sprite.setParent('lens', 'housing');

        // Setup animations
        sprite.addAnimation(AnimationBuilder.createTowerIdleAnimation(['powerCore', 'crystal'], 2.5));
        sprite.addAnimation(AnimationBuilder.createTowerChargingAnimation(['powerCore', 'crystal'], 0.4));
        sprite.addAnimation(AnimationBuilder.createTowerFireAnimation(['lens', 'crystal', 'powerCore'], 0.2));

        return sprite;
    },

    /**
     * Create ELECTRIC tower with tesla coils
     */
    createElectric() {
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
};

// ============================================================================
// ANIMATION BUILDER - Tower-specific animations
// ============================================================================

// Extend AnimationBuilder with tower-specific animations
if (typeof AnimationBuilder !== 'undefined') {
    
    /**
     * Create idle/scanning animation for towers
     */
    AnimationBuilder.createTowerIdleAnimation = function(partNames, duration) {
        const anim = new AnimationClip('idle', duration, true);
        
        partNames.forEach((name, i) => {
            const offset = i * 0.3;
            
            // Gentle rotation scanning
            anim.addTrack(name, [
                { time: 0 + offset, transform: { rotation: -0.05 } },
                { time: duration / 2 + offset, transform: { rotation: 0.05 } },
                { time: duration + offset, transform: { rotation: -0.05 } }
            ]);
        });
        
        return anim;
    };
    
    /**
     * Create fire/recoil animation for towers
     */
    AnimationBuilder.createTowerFireAnimation = function(partNames, duration) {
        const anim = new AnimationClip('fire', duration, false);
        
        // Barrel recoils
        if (partNames.includes('barrel')) {
            anim.addTrack('barrel', [
                { time: 0, transform: { x: 0 } },
                { time: duration * 0.3, transform: { x: -0.08 } },
                { time: duration, transform: { x: 0 } }
            ]);
        }
        
        // Turret body shakes
        const turretPart = partNames.find(n => n.includes('turret') || n === 'mortar' || n === 'core' || n === 'powerCore');
        if (turretPart) {
            anim.addTrack(turretPart, [
                { time: 0, transform: { y: 0 } },
                { time: duration * 0.3, transform: { y: 0.02 } },
                { time: duration, transform: { y: 0 } }
            ]);
        }
        
        // All parts get slight shake
        partNames.forEach(name => {
            if (name !== 'barrel' && name !== turretPart) {
                anim.addTrack(name, [
                    { time: 0, transform: { rotation: 0 } },
                    { time: duration * 0.4, transform: { rotation: 0.05 } },
                    { time: duration, transform: { rotation: 0 } }
                ]);
            }
        });
        
        return anim;
    };
    
    /**
     * Create charging animation for sniper/laser
     */
    AnimationBuilder.createTowerChargingAnimation = function(partNames, duration) {
        const anim = new AnimationClip('charging', duration, false);
        
        partNames.forEach((name, i) => {
            // Pulse effect
            anim.addTrack(name, [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.5, transform: { scaleX: 1.15, scaleY: 1.15 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0 } }
            ]);
        });
        return anim;
    };
}

// Export to global scope for browser
if (typeof window !== 'undefined') {
    window.MultiPartTowerSprites = MultiPartTowerSprites;
}
