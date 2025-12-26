/**
 * Animation Library for Cyber Dino Fantasy Tactics
 * Collection of pre-built animations for characters
 * Includes: idle, attack, hit, cast, death, guard, victory
 */

import { AnimationClip } from './SpriteAnimationSystem.js';

/**
 * Animation Builder - Factory for creating character animations
 */
export class AnimationLibrary {
    
    /**
     * Get all standard animations for a character
     * @param {Array<string>} partNames - List of part names in the sprite
     */
    static getCharacterAnimations(partNames) {
        return {
            idle: this.createIdleAnimation(partNames),
            attack: this.createAttackAnimation(partNames),
            hit: this.createHitAnimation(partNames),
            cast: this.createCastAnimation(partNames),
            guard: this.createGuardAnimation(partNames),
            death: this.createDeathAnimation(partNames),
            victory: this.createVictoryAnimation(partNames)
        };
    }

    /**
     * Apply all animations to a sprite
     */
    static applyAnimationsToSprite(sprite) {
        const partNames = sprite.getPartNames();
        const animations = this.getCharacterAnimations(partNames);
        
        for (const [name, clip] of Object.entries(animations)) {
            sprite.addAnimation(clip);
        }
        
        // Start with idle animation
        sprite.play('idle');
    }

    // ========================================================================
    // IDLE ANIMATION - Breathing/pulsing effect
    // ========================================================================
    static createIdleAnimation(parts, duration = 2.5) {
        const clip = new AnimationClip('idle', duration, true);

        // Body breathing
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0, scaleY: 1.0 } },
                { time: duration * 0.5, transform: { y: -0.01, scaleY: 1.02 } },
                { time: duration, transform: { y: 0, scaleY: 1.0 } }
            ]);
        }

        // Head subtle bob
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { y: 0, rotation: 0 } },
                { time: duration * 0.3, transform: { y: -0.008, rotation: 0.02 } },
                { time: duration * 0.7, transform: { y: -0.005, rotation: -0.02 } },
                { time: duration, transform: { y: 0, rotation: 0 } }
            ]);
        }

        // Shoulders sway
        if (parts.includes('shoulderLeft')) {
            clip.addTrack('shoulderLeft', [
                { time: 0, transform: { y: 0, rotation: 0 } },
                { time: duration * 0.5, transform: { y: -0.008, rotation: 0.03 } },
                { time: duration, transform: { y: 0, rotation: 0 } }
            ]);
        }
        if (parts.includes('shoulderRight')) {
            clip.addTrack('shoulderRight', [
                { time: 0, transform: { y: 0, rotation: 0 } },
                { time: duration * 0.5, transform: { y: -0.008, rotation: -0.03 } },
                { time: duration, transform: { y: 0, rotation: 0 } }
            ]);
        }

        // Arms subtle swing
        if (parts.includes('armLeft')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.5, transform: { rotation: 0.05 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }
        if (parts.includes('armRight')) {
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.5, transform: { rotation: -0.05 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        // Tail gentle sway
        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.25, transform: { rotation: 0.08 } },
                { time: duration * 0.75, transform: { rotation: -0.08 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        // Aura pulse
        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } },
                { time: duration * 0.5, transform: { scaleX: 1.08, scaleY: 1.08, opacity: 0.55 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } }
            ]);
        }

        // Weapon subtle movement
        if (parts.includes('weapon')) {
            clip.addTrack('weapon', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.5, transform: { rotation: 0.03, y: -0.005 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }

        // Crest subtle pulse
        if (parts.includes('crest')) {
            clip.addTrack('crest', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.5, transform: { scaleY: 1.05 } },
                { time: duration, transform: { scaleY: 1.0 } }
            ]);
        }

        // Horns subtle movement
        if (parts.includes('hornLeft')) {
            clip.addTrack('hornLeft', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.5, transform: { rotation: 0.04 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }
        if (parts.includes('hornRight')) {
            clip.addTrack('hornRight', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.5, transform: { rotation: -0.04 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        return clip;
    }

    // ========================================================================
    // ATTACK ANIMATION - Weapon swing with body motion
    // ========================================================================
    static createAttackAnimation(parts, duration = 0.5) {
        const clip = new AnimationClip('attack', duration, false);

        // Body wind-up and strike
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { x: 0, rotation: 0, scaleX: 1.0 } },
                { time: duration * 0.2, transform: { x: -0.03, rotation: -0.1, scaleX: 0.95 } },
                { time: duration * 0.35, transform: { x: 0.08, rotation: 0.15, scaleX: 1.1 } },
                { time: duration * 0.6, transform: { x: 0.04, rotation: 0.08, scaleX: 1.05 } },
                { time: duration, transform: { x: 0, rotation: 0, scaleX: 1.0 } }
            ]);
        }

        // Head follows attack
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { rotation: 0, x: 0 } },
                { time: duration * 0.2, transform: { rotation: -0.1, x: -0.01 } },
                { time: duration * 0.35, transform: { rotation: 0.12, x: 0.03 } },
                { time: duration * 0.6, transform: { rotation: 0.06, x: 0.01 } },
                { time: duration, transform: { rotation: 0, x: 0 } }
            ]);
        }

        // Weapon swing (main attack motion)
        if (parts.includes('weapon')) {
            clip.addTrack('weapon', [
                { time: 0, transform: { rotation: 0, x: 0, y: 0 } },
                { time: duration * 0.2, transform: { rotation: -0.8, x: -0.05, y: -0.05 } },
                { time: duration * 0.35, transform: { rotation: 0.6, x: 0.12, y: 0.02 } },
                { time: duration * 0.5, transform: { rotation: 0.4, x: 0.08, y: 0 } },
                { time: duration, transform: { rotation: 0, x: 0, y: 0 } }
            ]);
        }

        // Arms follow weapon
        if (parts.includes('armRight')) {
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.2, transform: { rotation: -0.6 } },
                { time: duration * 0.35, transform: { rotation: 0.5 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }
        if (parts.includes('armLeft')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.2, transform: { rotation: 0.2 } },
                { time: duration * 0.35, transform: { rotation: -0.3 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        // Shoulders power through
        if (parts.includes('shoulderRight')) {
            clip.addTrack('shoulderRight', [
                { time: 0, transform: { rotation: 0, x: 0 } },
                { time: duration * 0.2, transform: { rotation: -0.15, x: -0.02 } },
                { time: duration * 0.35, transform: { rotation: 0.2, x: 0.04 } },
                { time: duration, transform: { rotation: 0, x: 0 } }
            ]);
        }

        // Legs brace
        if (parts.includes('legLeft')) {
            clip.addTrack('legLeft', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.2, transform: { rotation: 0.1 } },
                { time: duration * 0.4, transform: { rotation: -0.15 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }
        if (parts.includes('legRight')) {
            clip.addTrack('legRight', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.2, transform: { rotation: -0.1 } },
                { time: duration * 0.4, transform: { rotation: 0.15 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        // Tail whips with attack
        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.2, transform: { rotation: 0.2 } },
                { time: duration * 0.35, transform: { rotation: -0.3 } },
                { time: duration * 0.6, transform: { rotation: -0.1 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        // Aura flares
        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } },
                { time: duration * 0.3, transform: { scaleX: 1.3, scaleY: 1.3, opacity: 0.7 } },
                { time: duration * 0.5, transform: { scaleX: 1.2, scaleY: 1.2, opacity: 0.6 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } }
            ]);
        }

        return clip;
    }

    // ========================================================================
    // HIT ANIMATION - Recoil and flash
    // ========================================================================
    static createHitAnimation(parts, duration = 0.35) {
        const clip = new AnimationClip('hit', duration, false);

        // Body recoils
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { x: 0, scaleX: 1.0, rotation: 0 } },
                { time: duration * 0.15, transform: { x: -0.06, scaleX: 0.92, rotation: -0.1 } },
                { time: duration * 0.4, transform: { x: -0.03, scaleX: 0.96, rotation: -0.05 } },
                { time: duration, transform: { x: 0, scaleX: 1.0, rotation: 0 } }
            ]);
        }

        // Head snaps back
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { x: 0, rotation: 0 } },
                { time: duration * 0.15, transform: { x: -0.04, rotation: -0.15 } },
                { time: duration * 0.4, transform: { x: -0.02, rotation: -0.08 } },
                { time: duration, transform: { x: 0, rotation: 0 } }
            ]);
        }

        // Arms flinch
        if (parts.includes('armLeft')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.15, transform: { rotation: 0.3 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }
        if (parts.includes('armRight')) {
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.15, transform: { rotation: -0.3 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        // Shoulders jolt
        if (parts.includes('shoulderLeft')) {
            clip.addTrack('shoulderLeft', [
                { time: 0, transform: { x: 0, y: 0 } },
                { time: duration * 0.15, transform: { x: -0.02, y: 0.02 } },
                { time: duration, transform: { x: 0, y: 0 } }
            ]);
        }
        if (parts.includes('shoulderRight')) {
            clip.addTrack('shoulderRight', [
                { time: 0, transform: { x: 0, y: 0 } },
                { time: duration * 0.15, transform: { x: -0.02, y: 0.02 } },
                { time: duration, transform: { x: 0, y: 0 } }
            ]);
        }

        // Legs stagger
        if (parts.includes('legLeft')) {
            clip.addTrack('legLeft', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.2, transform: { rotation: 0.15 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }
        if (parts.includes('legRight')) {
            clip.addTrack('legRight', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.2, transform: { rotation: -0.1 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        // Weapon drops slightly
        if (parts.includes('weapon')) {
            clip.addTrack('weapon', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.2, transform: { rotation: -0.2, y: 0.02 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }

        // Aura flickers
        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { opacity: 0.4, scaleX: 1.0 } },
                { time: duration * 0.1, transform: { opacity: 0.8, scaleX: 1.15 } },
                { time: duration * 0.3, transform: { opacity: 0.2, scaleX: 0.9 } },
                { time: duration, transform: { opacity: 0.4, scaleX: 1.0 } }
            ]);
        }

        return clip;
    }

    // ========================================================================
    // CAST ANIMATION - Magic/ability charging
    // ========================================================================
    static createCastAnimation(parts, duration = 0.6) {
        const clip = new AnimationClip('cast', duration, false);

        // Body rises and channels
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0, scaleY: 1.0 } },
                { time: duration * 0.3, transform: { y: -0.04, scaleY: 1.06 } },
                { time: duration * 0.6, transform: { y: -0.03, scaleY: 1.04 } },
                { time: duration, transform: { y: 0, scaleY: 1.0 } }
            ]);
        }

        // Head looks up
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { y: 0, rotation: 0 } },
                { time: duration * 0.3, transform: { y: -0.02, rotation: -0.1 } },
                { time: duration * 0.7, transform: { y: -0.01, rotation: -0.05 } },
                { time: duration, transform: { y: 0, rotation: 0 } }
            ]);
        }

        // Arms raise for channeling
        if (parts.includes('armLeft')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.2, transform: { rotation: -0.6, y: -0.03 } },
                { time: duration * 0.6, transform: { rotation: -0.5, y: -0.02 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }
        if (parts.includes('armRight')) {
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.2, transform: { rotation: 0.6, y: -0.03 } },
                { time: duration * 0.6, transform: { rotation: 0.5, y: -0.02 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }

        // Aura intensifies dramatically
        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } },
                { time: duration * 0.2, transform: { scaleX: 1.2, scaleY: 1.2, opacity: 0.6 } },
                { time: duration * 0.5, transform: { scaleX: 1.5, scaleY: 1.5, opacity: 0.9 } },
                { time: duration * 0.7, transform: { scaleX: 1.3, scaleY: 1.3, opacity: 0.7 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } }
            ]);
        }

        // Weapon glows
        if (parts.includes('weapon')) {
            clip.addTrack('weapon', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, glowIntensity: 0 } },
                { time: duration * 0.3, transform: { scaleX: 1.1, scaleY: 1.1, glowIntensity: 1.0 } },
                { time: duration * 0.6, transform: { scaleX: 1.08, scaleY: 1.08, glowIntensity: 0.8 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0, glowIntensity: 0 } }
            ]);
        }

        // Crest/horns glow
        if (parts.includes('crest')) {
            clip.addTrack('crest', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleY: 1.15 } },
                { time: duration, transform: { scaleY: 1.0 } }
            ]);
        }
        if (parts.includes('hornLeft')) {
            clip.addTrack('hornLeft', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleY: 1.1 } },
                { time: duration, transform: { scaleY: 1.0 } }
            ]);
        }
        if (parts.includes('hornRight')) {
            clip.addTrack('hornRight', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleY: 1.1 } },
                { time: duration, transform: { scaleY: 1.0 } }
            ]);
        }

        // Tail rises
        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.3, transform: { rotation: -0.15, y: -0.02 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }

        return clip;
    }

    // ========================================================================
    // GUARD ANIMATION - Defensive stance
    // ========================================================================
    static createGuardAnimation(parts, duration = 0.4) {
        const clip = new AnimationClip('guard', duration, false);

        // Body braces
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0, scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.2, transform: { y: 0.02, scaleX: 1.08, scaleY: 0.95 } },
                { time: duration * 0.6, transform: { y: 0.015, scaleX: 1.05, scaleY: 0.97 } },
                { time: duration, transform: { y: 0, scaleX: 1.0, scaleY: 1.0 } }
            ]);
        }

        // Head tucks
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { y: 0, rotation: 0 } },
                { time: duration * 0.2, transform: { y: 0.02, rotation: 0.1 } },
                { time: duration * 0.6, transform: { y: 0.01, rotation: 0.05 } },
                { time: duration, transform: { y: 0, rotation: 0 } }
            ]);
        }

        // Arms cross for defense
        if (parts.includes('armLeft')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0, x: 0 } },
                { time: duration * 0.2, transform: { rotation: 0.4, x: 0.04 } },
                { time: duration * 0.7, transform: { rotation: 0.3, x: 0.03 } },
                { time: duration, transform: { rotation: 0, x: 0 } }
            ]);
        }
        if (parts.includes('armRight')) {
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0, x: 0 } },
                { time: duration * 0.2, transform: { rotation: -0.4, x: -0.04 } },
                { time: duration * 0.7, transform: { rotation: -0.3, x: -0.03 } },
                { time: duration, transform: { rotation: 0, x: 0 } }
            ]);
        }

        // Shoulders brace
        if (parts.includes('shoulderLeft')) {
            clip.addTrack('shoulderLeft', [
                { time: 0, transform: { y: 0 } },
                { time: duration * 0.2, transform: { y: 0.02 } },
                { time: duration, transform: { y: 0 } }
            ]);
        }
        if (parts.includes('shoulderRight')) {
            clip.addTrack('shoulderRight', [
                { time: 0, transform: { y: 0 } },
                { time: duration * 0.2, transform: { y: 0.02 } },
                { time: duration, transform: { y: 0 } }
            ]);
        }

        // Aura shields
        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, opacity: 0.4 } },
                { time: duration * 0.2, transform: { scaleX: 1.3, opacity: 0.8 } },
                { time: duration * 0.6, transform: { scaleX: 1.2, opacity: 0.6 } },
                { time: duration, transform: { scaleX: 1.0, opacity: 0.4 } }
            ]);
        }

        // Legs widen stance
        if (parts.includes('legLeft')) {
            clip.addTrack('legLeft', [
                { time: 0, transform: { x: 0 } },
                { time: duration * 0.2, transform: { x: -0.02 } },
                { time: duration, transform: { x: 0 } }
            ]);
        }
        if (parts.includes('legRight')) {
            clip.addTrack('legRight', [
                { time: 0, transform: { x: 0 } },
                { time: duration * 0.2, transform: { x: 0.02 } },
                { time: duration, transform: { x: 0 } }
            ]);
        }

        return clip;
    }

    // ========================================================================
    // DEATH ANIMATION - Collapse and fade
    // ========================================================================
    static createDeathAnimation(parts, duration = 1.2) {
        const clip = new AnimationClip('death', duration, false);

        // Body collapses
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0, rotation: 0, scaleY: 1.0, opacity: 1.0 } },
                { time: duration * 0.2, transform: { y: -0.02, rotation: 0, scaleY: 1.05, opacity: 1.0 } },
                { time: duration * 0.5, transform: { y: 0.08, rotation: -0.2, scaleY: 0.85, opacity: 0.9 } },
                { time: duration * 0.8, transform: { y: 0.15, rotation: -0.8, scaleY: 0.6, opacity: 0.6 } },
                { time: duration, transform: { y: 0.20, rotation: -1.2, scaleY: 0.4, opacity: 0.3 } }
            ]);
        }

        // Head drops
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { y: 0, rotation: 0, opacity: 1.0 } },
                { time: duration * 0.3, transform: { y: 0.01, rotation: 0.15, opacity: 1.0 } },
                { time: duration * 0.7, transform: { y: 0.08, rotation: 0.5, opacity: 0.7 } },
                { time: duration, transform: { y: 0.12, rotation: 0.8, opacity: 0.3 } }
            ]);
        }

        // Arms go limp
        if (parts.includes('armLeft')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.4, transform: { rotation: 0.4 } },
                { time: duration, transform: { rotation: 0.8 } }
            ]);
        }
        if (parts.includes('armRight')) {
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.4, transform: { rotation: -0.3 } },
                { time: duration, transform: { rotation: -0.6 } }
            ]);
        }

        // Legs buckle
        if (parts.includes('legLeft')) {
            clip.addTrack('legLeft', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.5, transform: { rotation: 0.3 } },
                { time: duration, transform: { rotation: 0.6 } }
            ]);
        }
        if (parts.includes('legRight')) {
            clip.addTrack('legRight', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.5, transform: { rotation: -0.2 } },
                { time: duration, transform: { rotation: -0.4 } }
            ]);
        }

        // Weapon falls
        if (parts.includes('weapon')) {
            clip.addTrack('weapon', [
                { time: 0, transform: { rotation: 0, y: 0, opacity: 1.0 } },
                { time: duration * 0.4, transform: { rotation: 0.5, y: 0.05, opacity: 0.8 } },
                { time: duration, transform: { rotation: 1.2, y: 0.15, opacity: 0.2 } }
            ]);
        }

        // Aura fades
        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } },
                { time: duration * 0.3, transform: { scaleX: 1.3, scaleY: 1.3, opacity: 0.6 } },
                { time: duration, transform: { scaleX: 0.5, scaleY: 0.5, opacity: 0 } }
            ]);
        }

        // Tail droops
        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.5, transform: { rotation: 0.3, y: 0.03 } },
                { time: duration, transform: { rotation: 0.5, y: 0.08 } }
            ]);
        }

        return clip;
    }

    // ========================================================================
    // VICTORY ANIMATION - Celebration
    // ========================================================================
    static createVictoryAnimation(parts, duration = 1.0) {
        const clip = new AnimationClip('victory', duration, false);

        // Body rises triumphantly
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0, scaleY: 1.0 } },
                { time: duration * 0.3, transform: { y: -0.04, scaleY: 1.08 } },
                { time: duration * 0.6, transform: { y: -0.03, scaleY: 1.05 } },
                { time: duration, transform: { y: 0, scaleY: 1.0 } }
            ]);
        }

        // Head looks up proudly
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { y: 0, rotation: 0 } },
                { time: duration * 0.3, transform: { y: -0.03, rotation: -0.15 } },
                { time: duration * 0.7, transform: { y: -0.02, rotation: -0.1 } },
                { time: duration, transform: { y: 0, rotation: 0 } }
            ]);
        }

        // Arms raise in victory
        if (parts.includes('armLeft')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.3, transform: { rotation: -0.8, y: -0.05 } },
                { time: duration * 0.7, transform: { rotation: -0.6, y: -0.04 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }
        if (parts.includes('armRight')) {
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.3, transform: { rotation: 0.8, y: -0.05 } },
                { time: duration * 0.7, transform: { rotation: 0.6, y: -0.04 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }

        // Weapon raised high
        if (parts.includes('weapon')) {
            clip.addTrack('weapon', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.3, transform: { rotation: -0.5, y: -0.08 } },
                { time: duration * 0.7, transform: { rotation: -0.4, y: -0.06 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }

        // Aura blazes
        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } },
                { time: duration * 0.2, transform: { scaleX: 1.4, scaleY: 1.4, opacity: 0.8 } },
                { time: duration * 0.5, transform: { scaleX: 1.6, scaleY: 1.6, opacity: 0.9 } },
                { time: duration * 0.8, transform: { scaleX: 1.3, scaleY: 1.3, opacity: 0.6 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } }
            ]);
        }

        // Tail waves
        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.2, transform: { rotation: 0.2 } },
                { time: duration * 0.4, transform: { rotation: -0.2 } },
                { time: duration * 0.6, transform: { rotation: 0.15 } },
                { time: duration * 0.8, transform: { rotation: -0.1 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        return clip;
    }
}
