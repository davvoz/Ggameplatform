/**
 * Survivor Arena - Weapon Sprite System
 * Unique animated weapons with professional visuals
 */



// ============================================================================
// WEAPON SPRITES - Each weapon has unique visuals and projectiles
// ============================================================================

const WeaponSpriteFactory = {
    
    // ========== BASIC GUN ==========
    createBasicGun() {
        const sprite = new MultiPartSprite('basicGun');
        
        sprite.addPart('body', [
            // Main body
            { type: 'rect', width: 0.25, height: 0.12, color: '#424242' },
            // Barrel
            { type: 'rect', width: 0.18, height: 0.06, color: '#616161', x: 0.15, y: 0 },
            // Handle
            { type: 'rect', width: 0.08, height: 0.1, color: '#5d4037', x: -0.05, y: 0.08 },
            // Sight
            { type: 'rect', width: 0.03, height: 0.04, color: '#00e676', x: 0.08, y: -0.06 }
        ], 0.5, 0.5, 0);

        // Muzzle flash (hidden by default)
        const flash = sprite.addPart('flash', [
            { type: 'circle', radius: 0.08, color: '#ffeb3b' },
            { type: 'circle', radius: 0.05, color: '#ffffff' }
        ], 0.5, 0.5, 1);
        flash.setBaseTransform(0.28, 0);
        flash.visible = false;

        this.addGunAnimations(sprite);
        return sprite;
    },

    // ========== SHOTGUN ==========
    createShotgun() {
        const sprite = new MultiPartSprite('shotgun');
        
        sprite.addPart('body', [
            // Double barrel
            { type: 'rect', width: 0.35, height: 0.06, color: '#37474f', x: 0, y: -0.025 },
            { type: 'rect', width: 0.35, height: 0.06, color: '#37474f', x: 0, y: 0.025 },
            // Chamber
            { type: 'rect', width: 0.12, height: 0.14, color: '#455a64', x: -0.1, y: 0 },
            // Stock
            { type: 'polygon', points: [
                {x: -0.16, y: -0.06}, {x: -0.16, y: 0.06},
                {x: -0.28, y: 0.1}, {x: -0.28, y: -0.04}
            ], color: '#5d4037' }
        ], 0.5, 0.5, 0);

        const flash = sprite.addPart('flash', [
            { type: 'polygon', points: [
                {x: 0, y: -0.08}, {x: 0.12, y: 0}, {x: 0, y: 0.08}
            ], color: '#ff9800' },
            { type: 'circle', radius: 0.06, color: '#ffeb3b' }
        ], 0.5, 0.5, 1);
        flash.setBaseTransform(0.22, 0);
        flash.visible = false;

        this.addShotgunAnimations(sprite);
        return sprite;
    },

    // ========== SMG (Rapid Fire) ==========
    createSMG() {
        const sprite = new MultiPartSprite('smg');
        
        sprite.addPart('body', [
            // Compact body
            { type: 'rect', width: 0.2, height: 0.1, color: '#263238' },
            // Extended barrel
            { type: 'rect', width: 0.12, height: 0.04, color: '#37474f', x: 0.12, y: 0 },
            // Magazine
            { type: 'rect', width: 0.05, height: 0.12, color: '#ff5722', x: 0, y: 0.08 },
            // Grip
            { type: 'rect', width: 0.06, height: 0.08, color: '#5d4037', x: -0.06, y: 0.06 },
            // Tactical rail
            { type: 'rect', width: 0.12, height: 0.02, color: '#00bcd4', x: 0.02, y: -0.05 }
        ], 0.5, 0.5, 0);

        const flash = sprite.addPart('flash', [
            { type: 'circle', radius: 0.05, color: '#ffeb3b' },
            { type: 'circle', radius: 0.03, color: '#ffffff' }
        ], 0.5, 0.5, 1);
        flash.setBaseTransform(0.2, 0);
        flash.visible = false;

        this.addSMGAnimations(sprite);
        return sprite;
    },

    // ========== SNIPER RIFLE ==========
    createSniper() {
        const sprite = new MultiPartSprite('sniper');
        
        sprite.addPart('body', [
            // Long barrel
            { type: 'rect', width: 0.5, height: 0.05, color: '#1a237e' },
            // Scope
            { type: 'ellipse', width: 0.08, height: 0.06, color: '#311b92', x: 0.05, y: -0.05 },
            { type: 'circle', radius: 0.025, color: '#00e5ff', x: 0.05, y: -0.05 },
            // Body
            { type: 'rect', width: 0.15, height: 0.08, color: '#283593', x: -0.12, y: 0 },
            // Stock
            { type: 'polygon', points: [
                {x: -0.2, y: -0.04}, {x: -0.2, y: 0.04},
                {x: -0.35, y: 0.06}, {x: -0.35, y: -0.02}
            ], color: '#3f51b5' },
            // Bipod
            { type: 'line', x1: 0.15, y1: 0.025, x2: 0.2, y2: 0.1, color: '#455a64', strokeWidth: 0.015 },
            { type: 'line', x1: 0.18, y1: 0.025, x2: 0.23, y2: 0.1, color: '#455a64', strokeWidth: 0.015 }
        ], 0.5, 0.5, 0);

        const flash = sprite.addPart('flash', [
            { type: 'ellipse', width: 0.15, height: 0.06, color: '#2196f3' },
            { type: 'circle', radius: 0.04, color: '#64b5f6' }
        ], 0.5, 0.5, 1);
        flash.setBaseTransform(0.32, 0);
        flash.visible = false;

        this.addSniperAnimations(sprite);
        return sprite;
    },

    // ========== LASER GUN ==========
    createLaser() {
        const sprite = new MultiPartSprite('laser');
        
        sprite.addPart('body', [
            // Futuristic body
            { type: 'polygon', points: [
                {x: -0.15, y: -0.06}, {x: 0.15, y: -0.04},
                {x: 0.2, y: 0}, {x: 0.15, y: 0.04},
                {x: -0.15, y: 0.06}, {x: -0.18, y: 0}
            ], color: '#00838f' },
            // Energy core
            { type: 'circle', radius: 0.04, color: '#00e5ff', x: -0.02, y: 0 },
            { type: 'circle', radius: 0.025, color: '#b2ebf2', x: -0.02, y: 0 },
            // Emitter
            { type: 'circle', radius: 0.03, color: '#006064', x: 0.18, y: 0 },
            { type: 'circle', radius: 0.02, color: '#00bcd4', x: 0.18, y: 0 },
            // Heat sinks
            { type: 'rect', width: 0.02, height: 0.1, color: '#004d40', x: 0.05, y: 0 },
            { type: 'rect', width: 0.02, height: 0.1, color: '#004d40', x: 0.1, y: 0 }
        ], 0.5, 0.5, 0);

        const beam = sprite.addPart('beam', [
            { type: 'rect', width: 0.4, height: 0.02, color: '#00e5ff' },
            { type: 'rect', width: 0.4, height: 0.01, color: '#ffffff' }
        ], 0, 0.5, 1);
        beam.setBaseTransform(0.2, 0);
        beam.visible = false;

        this.addLaserAnimations(sprite);
        return sprite;
    },

    // ========== ROCKET LAUNCHER ==========
    createRocketLauncher() {
        const sprite = new MultiPartSprite('rocketLauncher');
        
        sprite.addPart('body', [
            // Large tube
            { type: 'ellipse', width: 0.4, height: 0.12, color: '#4e342e' },
            // Front opening
            { type: 'circle', radius: 0.05, color: '#3e2723', x: 0.18, y: 0 },
            { type: 'circle', radius: 0.035, color: '#1b1b1b', x: 0.18, y: 0 },
            // Grip
            { type: 'rect', width: 0.06, height: 0.12, color: '#5d4037', x: -0.05, y: 0.08 },
            // Sight
            { type: 'rect', width: 0.08, height: 0.03, color: '#ff5722', x: 0, y: -0.07 },
            // Exhaust vents
            { type: 'rect', width: 0.04, height: 0.08, color: '#3e2723', x: -0.16, y: 0 }
        ], 0.5, 0.5, 0);

        const flash = sprite.addPart('flash', [
            { type: 'polygon', points: [
                {x: 0, y: -0.1}, {x: 0.15, y: 0}, {x: 0, y: 0.1}
            ], color: '#ff9800' },
            { type: 'circle', radius: 0.06, color: '#ff5722' }
        ], 0.5, 0.5, 1);
        flash.setBaseTransform(0.22, 0);
        flash.visible = false;

        // Backblast
        const backblast = sprite.addPart('backblast', [
            { type: 'polygon', points: [
                {x: 0, y: -0.08}, {x: -0.2, y: 0}, {x: 0, y: 0.08}
            ], color: 'rgba(255, 152, 0, 0.6)' }
        ], 0.5, 0.5, -1);
        backblast.setBaseTransform(-0.2, 0);
        backblast.visible = false;

        this.addRocketAnimations(sprite);
        return sprite;
    },

    // ========== FLAMETHROWER ==========
    createFlamethrower() {
        const sprite = new MultiPartSprite('flamethrower');
        
        sprite.addPart('body', [
            // Fuel tank
            { type: 'ellipse', width: 0.15, height: 0.2, color: '#d32f2f', x: -0.12, y: 0 },
            // Pipe
            { type: 'rect', width: 0.25, height: 0.04, color: '#424242', x: 0.05, y: 0 },
            // Nozzle
            { type: 'polygon', points: [
                {x: 0.15, y: -0.03}, {x: 0.22, y: -0.05},
                {x: 0.22, y: 0.05}, {x: 0.15, y: 0.03}
            ], color: '#616161' },
            // Igniter
            { type: 'circle', radius: 0.02, color: '#ff9800', x: 0.22, y: 0 },
            // Handle
            { type: 'rect', width: 0.05, height: 0.08, color: '#5d4037', x: -0.02, y: 0.06 }
        ], 0.5, 0.5, 0);

        // Flame effect
        const flame = sprite.addPart('flame', [
            { type: 'polygon', points: [
                {x: 0, y: -0.06}, {x: 0.25, y: -0.1},
                {x: 0.35, y: 0}, {x: 0.25, y: 0.1}, {x: 0, y: 0.06}
            ], color: '#ff5722' },
            { type: 'polygon', points: [
                {x: 0.05, y: -0.04}, {x: 0.2, y: -0.06},
                {x: 0.28, y: 0}, {x: 0.2, y: 0.06}, {x: 0.05, y: 0.04}
            ], color: '#ff9800' },
            { type: 'polygon', points: [
                {x: 0.1, y: -0.02}, {x: 0.18, y: -0.03},
                {x: 0.22, y: 0}, {x: 0.18, y: 0.03}, {x: 0.1, y: 0.02}
            ], color: '#ffeb3b' }
        ], 0, 0.5, 1);
        flame.setBaseTransform(0.22, 0);
        flame.visible = false;

        this.addFlamethrowerAnimations(sprite);
        return sprite;
    },

    // ========== ELECTRIC/TESLA GUN ==========
    createTesla() {
        const sprite = new MultiPartSprite('tesla');
        
        sprite.addPart('body', [
            // Coil body
            { type: 'ellipse', width: 0.2, height: 0.15, color: '#1565c0' },
            // Tesla coil
            { type: 'circle', radius: 0.06, color: '#0d47a1', x: 0.12, y: 0 },
            { type: 'circle', radius: 0.04, color: '#64b5f6', x: 0.12, y: 0 },
            // Capacitor rings
            { type: 'arc', radius: 0.08, startAngle: 0, endAngle: Math.PI * 2, color: '#2196f3', strokeWidth: 0.02, fill: false, stroke: true },
            // Handle
            { type: 'rect', width: 0.05, height: 0.08, color: '#37474f', x: -0.06, y: 0.08 }
        ], 0.5, 0.5, 0);

        // Electric arc
        const arc = sprite.addPart('arc', [
            { type: 'path', points: [
                {x: 0, y: 0}, {x: 0.08, y: -0.05}, {x: 0.15, y: 0.03},
                {x: 0.22, y: -0.02}, {x: 0.3, y: 0}
            ], color: '#00e5ff', strokeWidth: 0.03 },
            { type: 'path', points: [
                {x: 0, y: 0}, {x: 0.06, y: 0.04}, {x: 0.12, y: -0.03},
                {x: 0.2, y: 0.02}, {x: 0.3, y: 0}
            ], color: '#82b1ff', strokeWidth: 0.02 }
        ], 0, 0.5, 1);
        arc.setBaseTransform(0.15, 0);
        arc.visible = false;

        this.addTeslaAnimations(sprite);
        return sprite;
    },

    // ========== FREEZE GUN ==========
    createFreezeGun() {
        const sprite = new MultiPartSprite('freezeGun');
        
        sprite.addPart('body', [
            // Cryo chamber
            { type: 'ellipse', width: 0.18, height: 0.14, color: '#0277bd' },
            // Ice crystals decoration
            { type: 'polygon', points: [
                {x: -0.06, y: -0.05}, {x: -0.04, y: -0.1}, {x: -0.02, y: -0.05}
            ], color: '#4fc3f7' },
            { type: 'polygon', points: [
                {x: 0.02, y: -0.06}, {x: 0.04, y: -0.12}, {x: 0.06, y: -0.06}
            ], color: '#81d4fa' },
            // Nozzle
            { type: 'rect', width: 0.12, height: 0.06, color: '#01579b', x: 0.12, y: 0 },
            // Handle
            { type: 'rect', width: 0.05, height: 0.08, color: '#263238', x: -0.04, y: 0.08 }
        ], 0.5, 0.5, 0);

        // Freeze effect
        const frost = sprite.addPart('frost', [
            { type: 'polygon', points: [
                {x: 0, y: -0.04}, {x: 0.15, y: -0.08},
                {x: 0.25, y: 0}, {x: 0.15, y: 0.08}, {x: 0, y: 0.04}
            ], color: 'rgba(79, 195, 247, 0.6)' },
            { type: 'polygon', points: [
                {x: 0.05, y: -0.02}, {x: 0.12, y: -0.04},
                {x: 0.18, y: 0}, {x: 0.12, y: 0.04}, {x: 0.05, y: 0.02}
            ], color: 'rgba(255, 255, 255, 0.7)' }
        ], 0, 0.5, 1);
        frost.setBaseTransform(0.18, 0);
        frost.visible = false;

        this.addFreezeAnimations(sprite);
        return sprite;
    },

    // ========== BOOMERANG ==========
    createBoomerang() {
        const sprite = new MultiPartSprite('boomerang');
        
        sprite.addPart('body', [
            // Main body - curved shape
            { type: 'polygon', points: [
                {x: -0.2, y: 0}, {x: -0.15, y: -0.04}, {x: 0, y: -0.06},
                {x: 0.15, y: -0.04}, {x: 0.2, y: 0},
                {x: 0.15, y: 0.03}, {x: 0, y: 0.04}, {x: -0.15, y: 0.03}
            ], color: '#8d6e63' },
            // Tribal markings
            { type: 'line', x1: -0.1, y1: -0.02, x2: -0.05, y2: -0.02, color: '#00e676', strokeWidth: 0.015 },
            { type: 'line', x1: 0.05, y1: -0.02, x2: 0.1, y2: -0.02, color: '#00e676', strokeWidth: 0.015 },
            { type: 'circle', radius: 0.015, color: '#76ff03', x: 0, y: 0 }
        ], 0.5, 0.5, 0);

        // Trail effect
        const trail = sprite.addPart('trail', [
            { type: 'arc', radius: 0.15, startAngle: 0.5, endAngle: 2.5, color: 'rgba(0, 230, 118, 0.4)', strokeWidth: 0.03, fill: false, stroke: true }
        ], 0.5, 0.5, -1);
        trail.visible = false;

        this.addBoomerangAnimations(sprite);
        return sprite;
    },

    // ========== DRONE WEAPON ==========
    createDrone() {
        const sprite = new MultiPartSprite('drone');
        
        sprite.addPart('body', [
            // Central body
            { type: 'circle', radius: 0.12, color: '#37474f' },
            { type: 'circle', radius: 0.08, color: '#546e7a' },
            // Eye/sensor
            { type: 'circle', radius: 0.04, color: '#00e5ff' },
            { type: 'circle', radius: 0.025, color: '#ffffff' }
        ], 0.5, 0.5, 1);

        // Rotors
        const rotor1 = sprite.addPart('rotor1', [
            { type: 'ellipse', width: 0.15, height: 0.03, color: 'rgba(96, 125, 139, 0.7)' }
        ], 0.5, 0.5, 2);
        rotor1.setBaseTransform(-0.12, -0.1);

        const rotor2 = sprite.addPart('rotor2', [
            { type: 'ellipse', width: 0.15, height: 0.03, color: 'rgba(96, 125, 139, 0.7)' }
        ], 0.5, 0.5, 2);
        rotor2.setBaseTransform(0.12, -0.1);

        const rotor3 = sprite.addPart('rotor3', [
            { type: 'ellipse', width: 0.15, height: 0.03, color: 'rgba(96, 125, 139, 0.7)' }
        ], 0.5, 0.5, 2);
        rotor3.setBaseTransform(-0.12, 0.1);

        const rotor4 = sprite.addPart('rotor4', [
            { type: 'ellipse', width: 0.15, height: 0.03, color: 'rgba(96, 125, 139, 0.7)' }
        ], 0.5, 0.5, 2);
        rotor4.setBaseTransform(0.12, 0.1);

        // Weapon mount
        sprite.addPart('weapon', [
            { type: 'rect', width: 0.08, height: 0.04, color: '#263238', x: 0, y: 0.12 }
        ], 0.5, 0.5, 0);

        this.addDroneAnimations(sprite);
        return sprite;
    },

    // ========== SHIELD ==========
    createShield() {
        const sprite = new MultiPartSprite('shield');
        
        sprite.addPart('body', [
            // Outer ring
            { type: 'circle', radius: 0.4, color: 'rgba(0, 229, 255, 0.3)', fill: true },
            { type: 'circle', radius: 0.4, color: '#00e5ff', fill: false, stroke: true, strokeWidth: 0.04 },
            // Inner pattern
            { type: 'circle', radius: 0.3, color: 'rgba(0, 229, 255, 0.2)', fill: false, stroke: true, strokeWidth: 0.02 },
            // Hexagonal pattern
            { type: 'polygon', points: [
                {x: 0, y: -0.25}, {x: 0.22, y: -0.12}, {x: 0.22, y: 0.12},
                {x: 0, y: 0.25}, {x: -0.22, y: 0.12}, {x: -0.22, y: -0.12}
            ], color: 'rgba(0, 229, 255, 0.15)' }
        ], 0.5, 0.5, 0);

        this.addShieldAnimations(sprite);
        return sprite;
    },

    // ========== ANIMATION HELPERS ==========
    
    addGunAnimations(sprite) {
        const fire = new AnimationClip('fire', 0.15, false);
        fire.addTrack('body', [
            { time: 0, transform: { x: 0 } },
            { time: 0.05, transform: { x: -0.02 } },
            { time: 0.15, transform: { x: 0 } }
        ]);
        sprite.addAnimation(fire);
    },

    addShotgunAnimations(sprite) {
        const fire = new AnimationClip('fire', 0.3, false);
        fire.addTrack('body', [
            { time: 0, transform: { x: 0, rotation: 0 } },
            { time: 0.1, transform: { x: -0.05, rotation: 0.1 } },
            { time: 0.3, transform: { x: 0, rotation: 0 } }
        ]);
        sprite.addAnimation(fire);
    },

    addSMGAnimations(sprite) {
        const fire = new AnimationClip('fire', 0.08, false);
        fire.addTrack('body', [
            { time: 0, transform: { x: 0, rotation: 0 } },
            { time: 0.03, transform: { x: -0.01, rotation: -0.02 } },
            { time: 0.08, transform: { x: 0, rotation: 0 } }
        ]);
        sprite.addAnimation(fire);
    },

    addSniperAnimations(sprite) {
        const fire = new AnimationClip('fire', 0.4, false);
        fire.addTrack('body', [
            { time: 0, transform: { x: 0, rotation: 0 } },
            { time: 0.1, transform: { x: -0.08, rotation: 0.05 } },
            { time: 0.4, transform: { x: 0, rotation: 0 } }
        ]);
        sprite.addAnimation(fire);
    },

    addLaserAnimations(sprite) {
        const fire = new AnimationClip('fire', 0.5, true);
        fire.addTrack('body', [
            { time: 0, transform: { scaleX: 1 } },
            { time: 0.25, transform: { scaleX: 1.02 } },
            { time: 0.5, transform: { scaleX: 1 } }
        ]);
        sprite.addAnimation(fire);
    },

    addRocketAnimations(sprite) {
        const fire = new AnimationClip('fire', 0.5, false);
        fire.addTrack('body', [
            { time: 0, transform: { x: 0, rotation: 0 } },
            { time: 0.15, transform: { x: -0.06, rotation: 0.08 } },
            { time: 0.5, transform: { x: 0, rotation: 0 } }
        ]);
        sprite.addAnimation(fire);
    },

    addFlamethrowerAnimations(sprite) {
        const fire = new AnimationClip('fire', 0.3, true);
        fire.addTrack('flame', [
            { time: 0, transform: { scaleX: 0.9, scaleY: 0.9 } },
            { time: 0.15, transform: { scaleX: 1.1, scaleY: 1.1 } },
            { time: 0.3, transform: { scaleX: 0.9, scaleY: 0.9 } }
        ]);
        sprite.addAnimation(fire);
    },

    addTeslaAnimations(sprite) {
        const fire = new AnimationClip('fire', 0.2, true);
        fire.addTrack('arc', [
            { time: 0, transform: { scaleY: 0.8 } },
            { time: 0.1, transform: { scaleY: 1.2 } },
            { time: 0.2, transform: { scaleY: 0.8 } }
        ]);
        sprite.addAnimation(fire);
    },

    addFreezeAnimations(sprite) {
        const fire = new AnimationClip('fire', 0.4, true);
        fire.addTrack('frost', [
            { time: 0, transform: { scaleX: 0.8 } },
            { time: 0.2, transform: { scaleX: 1.2 } },
            { time: 0.4, transform: { scaleX: 0.8 } }
        ]);
        sprite.addAnimation(fire);
    },

    addBoomerangAnimations(sprite) {
        const fly = new AnimationClip('fly', 0.3, true);
        fly.addTrack('body', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.15, transform: { rotation: Math.PI } },
            { time: 0.3, transform: { rotation: Math.PI * 2 } }
        ]);
        sprite.addAnimation(fly);
    },

    addDroneAnimations(sprite) {
        const hover = new AnimationClip('hover', 0.5, true);
        hover.addTrack('body', [
            { time: 0, transform: { y: 0 } },
            { time: 0.25, transform: { y: -0.02 } },
            { time: 0.5, transform: { y: 0 } }
        ]);
        hover.addTrack('rotor1', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.25, transform: { rotation: Math.PI } },
            { time: 0.5, transform: { rotation: Math.PI * 2 } }
        ]);
        hover.addTrack('rotor2', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.25, transform: { rotation: -Math.PI } },
            { time: 0.5, transform: { rotation: -Math.PI * 2 } }
        ]);
        hover.addTrack('rotor3', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.25, transform: { rotation: -Math.PI } },
            { time: 0.5, transform: { rotation: -Math.PI * 2 } }
        ]);
        hover.addTrack('rotor4', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.25, transform: { rotation: Math.PI } },
            { time: 0.5, transform: { rotation: Math.PI * 2 } }
        ]);
        sprite.addAnimation(hover);
    },

    addShieldAnimations(sprite) {
        const pulse = new AnimationClip('pulse', 1.5, true);
        pulse.addTrack('body', [
            { time: 0, transform: { scaleX: 1, scaleY: 1 } },
            { time: 0.75, transform: { scaleX: 1.05, scaleY: 1.05 } },
            { time: 1.5, transform: { scaleX: 1, scaleY: 1 } }
        ]);
        sprite.addAnimation(pulse);
    }
};

// ============================================================================
// PROJECTILE SPRITES
// ============================================================================

const ProjectileSpriteFactory = {
    
    createBullet(color = '#ffeb3b') {
        return {
            parts: [
                { type: 'ellipse', x: 0.5, y: 0.5, width: 0.8, height: 0.4, color: color },
                { type: 'ellipse', x: 0.5, y: 0.5, width: 0.5, height: 0.25, color: '#ffffff' }
            ]
        };
    },

    createShotgunPellet() {
        return {
            parts: [
                { type: 'circle', x: 0.5, y: 0.5, radius: 0.4, color: '#ff9800' },
                { type: 'circle', x: 0.5, y: 0.5, radius: 0.2, color: '#ffeb3b' }
            ]
        };
    },

    createLaserBeam() {
        return {
            parts: [
                { type: 'rect', x: 0.5, y: 0.5, width: 1.0, height: 0.15, color: '#00e5ff' },
                { type: 'rect', x: 0.5, y: 0.5, width: 1.0, height: 0.08, color: '#ffffff' }
            ]
        };
    },

    createRocket() {
        return {
            parts: [
                // Body
                { type: 'ellipse', x: 0.5, y: 0.5, width: 0.7, height: 0.3, color: '#424242' },
                // Warhead
                { type: 'polygon', points: [
                    {x: 0.85, y: 0.5}, {x: 0.7, y: 0.35}, {x: 0.7, y: 0.65}
                ], color: '#ff5722' },
                // Fins
                { type: 'polygon', points: [
                    {x: 0.15, y: 0.5}, {x: 0.25, y: 0.3}, {x: 0.35, y: 0.5}
                ], color: '#616161' },
                { type: 'polygon', points: [
                    {x: 0.15, y: 0.5}, {x: 0.25, y: 0.7}, {x: 0.35, y: 0.5}
                ], color: '#616161' },
                // Exhaust
                { type: 'ellipse', x: 0.1, y: 0.5, width: 0.2, height: 0.15, color: '#ff9800' }
            ]
        };
    },

    createElectricOrb() {
        return {
            parts: [
                { type: 'circle', x: 0.5, y: 0.5, radius: 0.4, color: 'rgba(33, 150, 243, 0.5)' },
                { type: 'circle', x: 0.5, y: 0.5, radius: 0.3, color: '#2196f3' },
                { type: 'circle', x: 0.5, y: 0.5, radius: 0.15, color: '#ffffff' }
            ]
        };
    },

    createIceShard() {
        return {
            parts: [
                { type: 'polygon', points: [
                    {x: 0.9, y: 0.5}, {x: 0.6, y: 0.3}, {x: 0.1, y: 0.5}, {x: 0.6, y: 0.7}
                ], color: '#4fc3f7' },
                { type: 'polygon', points: [
                    {x: 0.8, y: 0.5}, {x: 0.55, y: 0.38}, {x: 0.2, y: 0.5}, {x: 0.55, y: 0.62}
                ], color: '#81d4fa' }
            ]
        };
    },

    createFireball() {
        return {
            parts: [
                { type: 'circle', x: 0.5, y: 0.5, radius: 0.45, color: '#ff5722' },
                { type: 'circle', x: 0.5, y: 0.5, radius: 0.35, color: '#ff9800' },
                { type: 'circle', x: 0.5, y: 0.5, radius: 0.2, color: '#ffeb3b' }
            ]
        };
    },

    createBoomerangProj() {
        return {
            parts: [
                { type: 'polygon', points: [
                    {x: 0.1, y: 0.5}, {x: 0.2, y: 0.35}, {x: 0.5, y: 0.3},
                    {x: 0.8, y: 0.35}, {x: 0.9, y: 0.5},
                    {x: 0.8, y: 0.6}, {x: 0.5, y: 0.65}, {x: 0.2, y: 0.6}
                ], color: '#8d6e63' },
                { type: 'line', x1: 0.3, y1: 0.45, x2: 0.4, y2: 0.45, color: '#00e676', strokeWidth: 0.05 },
                { type: 'line', x1: 0.6, y1: 0.45, x2: 0.7, y2: 0.45, color: '#00e676', strokeWidth: 0.05 }
            ]
        };
    },

    createDroneShot() {
        return {
            parts: [
                { type: 'ellipse', x: 0.5, y: 0.5, width: 0.6, height: 0.3, color: '#00e5ff' },
                { type: 'ellipse', x: 0.5, y: 0.5, width: 0.35, height: 0.15, color: '#ffffff' }
            ]
        };
    },

    createEnemyProjectile() {
        return {
            parts: [
                { type: 'circle', x: 0.5, y: 0.5, radius: 0.4, color: '#f44336' },
                { type: 'circle', x: 0.5, y: 0.5, radius: 0.25, color: '#ff8a80' }
            ]
        };
    }
};

// ============================================================================
// PICKUP SPRITES
// ============================================================================

const PickupSpriteFactory = {

    createXPOrb() {
        const sprite = new MultiPartSprite('xpOrb');
        
        sprite.addPart('glow', [
            { type: 'gradient-circle', radius: 0.5, innerColor: 'rgba(0, 255, 136, 0.4)', outerColor: 'rgba(0, 255, 136, 0)' }
        ], 0.5, 0.5, 0);

        sprite.addPart('core', [
            { type: 'circle', radius: 0.35, color: '#00ff88' },
            { type: 'circle', radius: 0.2, color: '#69f0ae' },
            { type: 'circle', radius: 0.1, color: '#ffffff' }
        ], 0.5, 0.5, 1);

        const pulse = new AnimationClip('pulse', 0.8, true);
        pulse.addTrack('glow', [
            { time: 0, transform: { scaleX: 1, scaleY: 1 } },
            { time: 0.4, transform: { scaleX: 1.3, scaleY: 1.3 } },
            { time: 0.8, transform: { scaleX: 1, scaleY: 1 } }
        ]);
        sprite.addAnimation(pulse);
        sprite.play('pulse');

        return sprite;
    },

    createHealthPack() {
        const sprite = new MultiPartSprite('healthPack');
        
        sprite.addPart('box', [
            // White box
            { type: 'rect', width: 0.7, height: 0.7, color: '#ffffff' },
            { type: 'rect', width: 0.65, height: 0.65, color: '#f5f5f5', fill: false, stroke: true, strokeWidth: 0.03 },
            // Red cross
            { type: 'rect', width: 0.15, height: 0.45, color: '#f44336' },
            { type: 'rect', width: 0.45, height: 0.15, color: '#f44336' }
        ], 0.5, 0.5, 0);

        const pulse = new AnimationClip('pulse', 1.0, true);
        pulse.addTrack('box', [
            { time: 0, transform: { scaleX: 1, scaleY: 1 } },
            { time: 0.5, transform: { scaleX: 1.1, scaleY: 1.1 } },
            { time: 1.0, transform: { scaleX: 1, scaleY: 1 } }
        ]);
        sprite.addAnimation(pulse);
        sprite.play('pulse');

        return sprite;
    },

    createMagnet() {
        const sprite = new MultiPartSprite('magnet');
        
        sprite.addPart('body', [
            // Magnet shape
            { type: 'arc', radius: 0.3, startAngle: Math.PI, endAngle: Math.PI * 2, color: '#9c27b0', strokeWidth: 0.12, fill: false, stroke: true },
            // Poles
            { type: 'rect', width: 0.12, height: 0.2, color: '#f44336', x: -0.3, y: 0.1 },
            { type: 'rect', width: 0.12, height: 0.2, color: '#2196f3', x: 0.3, y: 0.1 }
        ], 0.5, 0.5, 0);

        // Magnetic field lines
        sprite.addPart('field', [
            { type: 'arc', radius: 0.4, startAngle: -0.5, endAngle: 0.5, color: 'rgba(156, 39, 176, 0.3)', strokeWidth: 0.02, fill: false, stroke: true },
            { type: 'arc', radius: 0.5, startAngle: -0.4, endAngle: 0.4, color: 'rgba(156, 39, 176, 0.2)', strokeWidth: 0.02, fill: false, stroke: true }
        ], 0.5, 0.5, 1);

        const pulse = new AnimationClip('pulse', 0.6, true);
        pulse.addTrack('field', [
            { time: 0, transform: { scaleX: 1, scaleY: 1 } },
            { time: 0.3, transform: { scaleX: 1.2, scaleY: 1.2 } },
            { time: 0.6, transform: { scaleX: 1, scaleY: 1 } }
        ]);
        sprite.addAnimation(pulse);
        sprite.play('pulse');

        return sprite;
    },

    createBomb() {
        const sprite = new MultiPartSprite('bomb');
        
        sprite.addPart('body', [
            // Bomb body
            { type: 'circle', radius: 0.35, color: '#37474f' },
            { type: 'circle', radius: 0.3, color: '#455a64' },
            // Fuse top
            { type: 'rect', width: 0.08, height: 0.1, color: '#5d4037', x: 0, y: -0.35 },
            // Skull warning
            { type: 'circle', radius: 0.12, color: '#ffffff', x: 0, y: 0 }
        ], 0.5, 0.5, 0);

        // Fuse spark
        const spark = sprite.addPart('spark', [
            { type: 'circle', radius: 0.06, color: '#ff9800' },
            { type: 'circle', radius: 0.03, color: '#ffeb3b' }
        ], 0.5, 0.5, 1);
        spark.setBaseTransform(0, -0.42);

        const pulse = new AnimationClip('pulse', 0.3, true);
        pulse.addTrack('spark', [
            { time: 0, transform: { scaleX: 0.8, scaleY: 0.8 } },
            { time: 0.15, transform: { scaleX: 1.2, scaleY: 1.2 } },
            { time: 0.3, transform: { scaleX: 0.8, scaleY: 0.8 } }
        ]);
        sprite.addAnimation(pulse);
        sprite.play('pulse');

        return sprite;
    },

    createChest() {
        const sprite = new MultiPartSprite('chest');
        
        // Chest body
        sprite.addPart('body', [
            { type: 'rect', width: 0.7, height: 0.5, color: '#8d6e63' },
            { type: 'rect', width: 0.65, height: 0.45, color: '#a1887f', x: 0, y: 0.02 },
            // Bands
            { type: 'rect', width: 0.7, height: 0.06, color: '#ffd54f', x: 0, y: -0.18 },
            { type: 'rect', width: 0.7, height: 0.06, color: '#ffd54f', x: 0, y: 0.18 },
            // Lock
            { type: 'circle', radius: 0.06, color: '#ffc107' },
            { type: 'rect', width: 0.04, height: 0.06, color: '#ffc107', x: 0, y: 0.06 }
        ], 0.5, 0.5, 0);

        // Lid
        const lid = sprite.addPart('lid', [
            { type: 'polygon', points: [
                {x: -0.35, y: 0}, {x: -0.3, y: -0.15}, {x: 0.3, y: -0.15}, {x: 0.35, y: 0}
            ], color: '#8d6e63' },
            { type: 'rect', width: 0.65, height: 0.04, color: '#ffd54f', x: 0, y: -0.08 }
        ], 0.5, 1, 1);
        lid.setBaseTransform(0, -0.25);

        // Glow
        sprite.addPart('glow', [
            { type: 'gradient-circle', radius: 0.5, innerColor: 'rgba(255, 215, 0, 0.3)', outerColor: 'rgba(255, 215, 0, 0)' }
        ], 0.5, 0.5, -1);

        const pulse = new AnimationClip('pulse', 1.2, true);
        pulse.addTrack('glow', [
            { time: 0, transform: { scaleX: 1, scaleY: 1 } },
            { time: 0.6, transform: { scaleX: 1.2, scaleY: 1.2 } },
            { time: 1.2, transform: { scaleX: 1, scaleY: 1 } }
        ]);
        sprite.addAnimation(pulse);
        sprite.play('pulse');

        return sprite;
    }
};

// Register with SpriteManager
if (typeof spriteManager !== 'undefined') {
    // Weapons
    spriteManager.registerTemplate('weapon-basic', () => WeaponSpriteFactory.createBasicGun());
    spriteManager.registerTemplate('weapon-shotgun', () => WeaponSpriteFactory.createShotgun());
    spriteManager.registerTemplate('weapon-smg', () => WeaponSpriteFactory.createSMG());
    spriteManager.registerTemplate('weapon-sniper', () => WeaponSpriteFactory.createSniper());
    spriteManager.registerTemplate('weapon-laser', () => WeaponSpriteFactory.createLaser());
    spriteManager.registerTemplate('weapon-rocket', () => WeaponSpriteFactory.createRocketLauncher());
    spriteManager.registerTemplate('weapon-flame', () => WeaponSpriteFactory.createFlamethrower());
    spriteManager.registerTemplate('weapon-tesla', () => WeaponSpriteFactory.createTesla());
    spriteManager.registerTemplate('weapon-freeze', () => WeaponSpriteFactory.createFreezeGun());
    spriteManager.registerTemplate('weapon-boomerang', () => WeaponSpriteFactory.createBoomerang());
    spriteManager.registerTemplate('weapon-drone', () => WeaponSpriteFactory.createDrone());
    spriteManager.registerTemplate('weapon-shield', () => WeaponSpriteFactory.createShield());
    
    // Projectiles
    spriteManager.registerTemplate('projectile-bullet', () => ProjectileSpriteFactory.createBullet());
    spriteManager.registerTemplate('projectile-shotgun', () => ProjectileSpriteFactory.createShotgunPellet());
    spriteManager.registerTemplate('projectile-laser', () => ProjectileSpriteFactory.createLaserBeam());
    spriteManager.registerTemplate('projectile-rocket', () => ProjectileSpriteFactory.createRocket());
    spriteManager.registerTemplate('projectile-electric', () => ProjectileSpriteFactory.createElectricOrb());
    spriteManager.registerTemplate('projectile-ice', () => ProjectileSpriteFactory.createIceShard());
    spriteManager.registerTemplate('projectile-fire', () => ProjectileSpriteFactory.createFireball());
    spriteManager.registerTemplate('projectile-boomerang', () => ProjectileSpriteFactory.createBoomerangProj());
    spriteManager.registerTemplate('projectile-drone', () => ProjectileSpriteFactory.createDroneShot());
    spriteManager.registerTemplate('projectile-enemy', () => ProjectileSpriteFactory.createEnemyProjectile());
    
    // Pickups
    spriteManager.registerTemplate('pickup-xp', () => PickupSpriteFactory.createXPOrb());
    spriteManager.registerTemplate('pickup-health', () => PickupSpriteFactory.createHealthPack());
    spriteManager.registerTemplate('pickup-magnet', () => PickupSpriteFactory.createMagnet());
    spriteManager.registerTemplate('pickup-bomb', () => PickupSpriteFactory.createBomb());
    spriteManager.registerTemplate('pickup-chest', () => PickupSpriteFactory.createChest());
}

// Export
if (typeof window !== 'undefined') {
    window.WeaponSpriteFactory = WeaponSpriteFactory;
    window.ProjectileSpriteFactory = ProjectileSpriteFactory;
    window.PickupSpriteFactory = PickupSpriteFactory;
}
