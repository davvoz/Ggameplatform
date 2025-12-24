/**
 * Multi-Part Tower Sprite Definitions
 * Each tower built from independent animated parts for professional animations
 */

import { AnimationBuilder, AnimationClip } from './sprite-animation-system.js';
import { basic } from './sprites/towers/createBasic.js';
import { electric } from './sprites/towers/createElectric.js';
import { freeze } from './sprites/towers/createFreeze.js';
import { laser } from './sprites/towers/createLaser.js';
import { rapid } from './sprites/towers/createRapid.js';
import { sniper } from './sprites/towers/createSniper.js';
import { splash } from './sprites/towers/createSplash.js';

export const MultiPartTowerSprites = {

    /**
     * Create BASIC tower with rotating turret
     */
    createBasic() {
        return basic();
    },

    /**
     * Create RAPID tower with twin barrels
     */
    createRapid() {
        return rapid();
    },

    /**
     * Create SNIPER tower with long barrel and scope
     */
    createSniper() {
        return sniper();
    },

    /**
     * Create SPLASH tower with mortar launcher
     */
    createSplash() {
        return splash();
    },

    /**
     * Create FREEZE tower with cryo emitters
     */
    createFreeze() {
        return freeze();
    },

    /**
     * Create LASER tower with focusing crystal
     */
    createLaser() {
        return laser();
    },

    /**
     * Create ELECTRIC tower with tesla coils
     */
    createElectric() {
        return electric();
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
    AnimationBuilder.createTowerIdleAnimation = function (partNames, duration) {
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
    AnimationBuilder.createTowerFireAnimation = function (partNames, duration) {
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
    AnimationBuilder.createTowerChargingAnimation = function (partNames, duration) {
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
