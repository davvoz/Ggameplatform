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
        
        // Add standard animations
        for (const [name, clip] of Object.entries(animations)) {
            sprite.addAnimation(clip);
        }
        
        // Add 18 unique hybrid ability animations
        // ATTACK (6 animations)
        sprite.addAnimation(this.createFulmineArcanoAnimation(partNames));
        sprite.addAnimation(this.createZanneMisticheAnimation(partNames));
        sprite.addAnimation(this.createScaricaEtereaAnimation(partNames));
        sprite.addAnimation(this.createMorsoCiberneticoAnimation(partNames));
        sprite.addAnimation(this.createArtiglioIncantatoAnimation(partNames));
        sprite.addAnimation(this.createAssaltoPotentatoAnimation(partNames));
        
        // DEFENSE (6 animations)
        sprite.addAnimation(this.createCampoRunicoTechAnimation(partNames));
        sprite.addAnimation(this.createBarrieraOrganicaAnimation(partNames));
        sprite.addAnimation(this.createScudoQuanticoAnimation(partNames));
        sprite.addAnimation(this.createCorazzaAdattivaAnimation(partNames));
        sprite.addAnimation(this.createPelleDiManaAnimation(partNames));
        sprite.addAnimation(this.createEsoscheletroBioTechAnimation(partNames));
        
        // SUPPORT (6 animations)
        sprite.addAnimation(this.createSincronizzazioneNexusAnimation(partNames));
        sprite.addAnimation(this.createRisveglioPrimordrialeAnimation(partNames));
        sprite.addAnimation(this.createBoostEtericoAnimation(partNames));
        sprite.addAnimation(this.createStimoloVitaleAnimation(partNames));
        sprite.addAnimation(this.createRinascitaArcanaAnimation(partNames));
        sprite.addAnimation(this.createRegenNanoOrganicoAnimation(partNames));
        
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

    // ========================================================================
    // ABILITY-SPECIFIC ANIMATIONS
    // ========================================================================

    /**
     * ARCANE LIGHTNING - Channels electric arcane energy
     */
    static createLightningCastAnimation(parts, duration = 0.8) {
        const clip = new AnimationClip('castLightning', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0, scaleY: 1.0 } },
                { time: duration * 0.2, transform: { y: -0.04, scaleY: 1.08 } },
                { time: duration * 0.6, transform: { y: -0.03, scaleY: 1.05 } },
                { time: duration, transform: { y: 0, scaleY: 1.0 } }
            ]);
        }

        if (parts.includes('armLeft') && parts.includes('armRight')) {
            // Arms raised high channeling lightning
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.3, transform: { rotation: -0.9, y: -0.08 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.3, transform: { rotation: 0.9, y: -0.08 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } },
                { time: duration * 0.3, transform: { scaleX: 1.8, scaleY: 1.8, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } }
            ]);
        }

        return clip;
    }

    /**
     * TECH BEAM - Aims and fires tech weapon
     */
    static createBeamCastAnimation(parts, duration = 0.7) {
        const clip = new AnimationClip('castBeam', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { x: 0, rotation: 0 } },
                { time: duration * 0.3, transform: { x: -0.02, rotation: -0.05 } },
                { time: duration * 0.7, transform: { x: 0.02, rotation: 0.05 } },
                { time: duration, transform: { x: 0, rotation: 0 } }
            ]);
        }

        if (parts.includes('weapon')) {
            clip.addTrack('weapon', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleX: 1.3, scaleY: 1.3 } },
                { time: duration * 0.6, transform: { scaleX: 1.4, scaleY: 1.4 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0 } }
            ]);
        }

        if (parts.includes('armRight')) {
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0, x: 0 } },
                { time: duration * 0.3, transform: { rotation: -0.3, x: 0.05 } },
                { time: duration, transform: { rotation: 0, x: 0 } }
            ]);
        }

        return clip;
    }

    /**
     * PRIMAL CLAW - Savage claw strike
     */
    static createClawCastAnimation(parts, duration = 0.6) {
        const clip = new AnimationClip('castClaw', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { x: 0, y: 0, rotation: 0 } },
                { time: duration * 0.2, transform: { x: -0.04, y: -0.02, rotation: -0.15 } },
                { time: duration * 0.5, transform: { x: 0.06, y: 0.01, rotation: 0.2 } },
                { time: duration, transform: { x: 0, y: 0, rotation: 0 } }
            ]);
        }

        if (parts.includes('armLeft')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
                { time: duration * 0.4, transform: { rotation: 0.8, scaleX: 1.3 } },
                { time: duration, transform: { rotation: 0, scaleX: 1.0 } }
            ]);
        }

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.3, transform: { rotation: 0.3 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        return clip;
    }

    /**
     * ARCANE SHIELD - Mystical barrier
     */
    static createShieldArcaneCastAnimation(parts, duration = 0.7) {
        const clip = new AnimationClip('castShieldArcane', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleX: 0.95, scaleY: 1.1 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } },
                { time: duration * 0.5, transform: { scaleX: 2.2, scaleY: 2.2, opacity: 0.9 } },
                { time: duration, transform: { scaleX: 1.5, scaleY: 1.5, opacity: 0.6 } }
            ]);
        }

        if (parts.includes('armLeft') && parts.includes('armRight')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0, x: 0 } },
                { time: duration * 0.4, transform: { rotation: 0.4, x: 0.03 } },
                { time: duration, transform: { rotation: 0.2, x: 0.01 } }
            ]);
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0, x: 0 } },
                { time: duration * 0.4, transform: { rotation: -0.4, x: -0.03 } },
                { time: duration, transform: { rotation: -0.2, x: -0.01 } }
            ]);
        }

        return clip;
    }

    /**
     * TECH SHIELD - Energy barrier
     */
    static createShieldTechCastAnimation(parts, duration = 0.6) {
        const clip = new AnimationClip('castShieldTech', duration, false);

        if (parts.includes('shoulderLeft') && parts.includes('shoulderRight')) {
            clip.addTrack('shoulderLeft', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.3, transform: { scaleX: 1.4, scaleY: 1.4 } },
                { time: duration, transform: { scaleX: 1.2, scaleY: 1.2 } }
            ]);
            clip.addTrack('shoulderRight', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.3, transform: { scaleX: 1.4, scaleY: 1.4 } },
                { time: duration, transform: { scaleX: 1.2, scaleY: 1.2 } }
            ]);
        }

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleX: 1.0 } },
                { time: duration * 0.4, transform: { scaleX: 1.1 } },
                { time: duration, transform: { scaleX: 1.0 } }
            ]);
        }

        return clip;
    }

    /**
     * PRIMAL SHIELD - Hardened scales
     */
    static createShieldPrimalCastAnimation(parts, duration = 0.5) {
        const clip = new AnimationClip('castShieldPrimal', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.3, transform: { scaleX: 1.15, scaleY: 0.95 } },
                { time: duration, transform: { scaleX: 1.08, scaleY: 0.98 } }
            ]);
        }

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleY: 1.4 } },
                { time: duration, transform: { scaleY: 1.2 } }
            ]);
        }

        if (parts.includes('crest') || parts.includes('hornLeft')) {
            const hornTrack = [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleY: 1.3 } },
                { time: duration, transform: { scaleY: 1.15 } }
            ];
            if (parts.includes('crest')) clip.addTrack('crest', hornTrack);
            if (parts.includes('hornLeft')) clip.addTrack('hornLeft', hornTrack);
            if (parts.includes('hornRight')) clip.addTrack('hornRight', hornTrack);
        }

        return clip;
    }

    /**
     * ARCANE HEAL - Mystical restoration
     */
    static createHealArcaneCastAnimation(parts, duration = 1.0) {
        const clip = new AnimationClip('castHealArcane', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0 } },
                { time: duration * 0.4, transform: { y: -0.03 } },
                { time: duration * 0.7, transform: { y: -0.02 } },
                { time: duration, transform: { y: 0 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.4 } },
                { time: duration * 0.5, transform: { scaleX: 1.6, scaleY: 1.6, opacity: 0.8 } },
                { time: duration, transform: { scaleX: 1.2, scaleY: 1.2, opacity: 0.5 } }
            ]);
        }

        if (parts.includes('armLeft') && parts.includes('armRight')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.4, transform: { rotation: -0.5, y: -0.05 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.4, transform: { rotation: 0.5, y: -0.05 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }

        return clip;
    }

    /**
     * TECH BOOST - System overclock
     */
    static createBoostTechCastAnimation(parts, duration = 0.7) {
        const clip = new AnimationClip('castBoostTech', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.3, transform: { scaleX: 1.1, scaleY: 1.1 } },
                { time: duration * 0.6, transform: { scaleX: 1.08, scaleY: 1.08 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0 } }
            ]);
        }

        if (parts.includes('weapon')) {
            clip.addTrack('weapon', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.5, transform: { rotation: 0.4 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        return clip;
    }

    /**
     * PRIMAL HEAL - Regeneration
     */
    static createHealPrimalCastAnimation(parts, duration = 0.9) {
        const clip = new AnimationClip('castHealPrimal', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleY: 1.15 } },
                { time: duration * 0.7, transform: { scaleY: 1.1 } },
                { time: duration, transform: { scaleY: 1.0 } }
            ]);
        }

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
                { time: duration * 0.5, transform: { rotation: 0.2, scaleX: 1.2 } },
                { time: duration, transform: { rotation: 0, scaleX: 1.0 } }
            ]);
        }

        return clip;
    }

    // ==================== HYBRID ABILITY ANIMATIONS ====================
    // Each ability has its own unique, spectacular animation

    /**
     * FULMINE ARCANO - Lightning cast: concentrate, then throw lightning bolt with arms
     * Goal: Body stays grounded, only arms/weapon move to cast
     */
    static createFulmineArcanoAnimation(parts, duration = 0.7) {
        const clip = new AnimationClip('animFulmineArcano', duration, false);

        // BODY: completamente fermo, zero movimento
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: {} },
                { time: duration, transform: {} }
            ]);
        }

        // WEAPON: parte basso, sale, punta in avanti per il lancio
        if (parts.includes('weapon')) {
            clip.addTrack('weapon', [
                { time: 0, transform: { y: 0, rotation: 0 } },
                { time: duration * 0.25, transform: { y: 2, rotation: 0.1 } },      // prep
                { time: duration * 0.45, transform: { y: -15, rotation: -0.7 } },   // alza in alto
                { time: duration * 0.65, transform: { y: 0, rotation: 0.4 } },      // lancia avanti
                { time: duration, transform: { y: 0, rotation: 0 } }
            ]);
        }

        // ARMS: seguono il movimento dell'arma in modo fluido
        if (parts.includes('arms')) {
            clip.addTrack('arms', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.45, transform: { rotation: -0.4 } },  // alza
                { time: duration * 0.65, transform: { rotation: 0.3 } },   // lancia
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        // HEAD: leggera rotazione per seguire il cast
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.45, transform: { rotation: -0.15 } },  // guarda l'arma in alto
                { time: duration * 0.65, transform: { rotation: 0.1 } },    // segue il lancio
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        // HORNS: brillano durante il cast
        if (parts.includes('horns')) {
            clip.addTrack('horns', [
                { time: 0, transform: { opacity: 0.7 } },
                { time: duration * 0.5, transform: { opacity: 1.0 } },  // picco luminosità
                { time: duration, transform: { opacity: 0.7 } }
            ]);
        }

        return clip;
    }

    /**
     * ZANNE MISTICHE - Mystical fangs with ethereal bite motion
     */
    static createZanneMisticheAnimation(parts, duration = 0.7) {
        const clip = new AnimationClip('animZanneMistiche', duration, false);

        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.3, transform: { rotation: -0.3, y: -5 } },
                { time: duration * 0.6, transform: { rotation: 0.4, y: 8 } },
                { time: duration, transform: { rotation: 0, y: 0 } }
            ]);
        }

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { x: 0, scaleX: 1.0 } },
                { time: duration * 0.4, transform: { x: 20, scaleX: 1.15 } },
                { time: duration * 0.7, transform: { x: 10, scaleX: 1.1 } },
                { time: duration, transform: { x: 0, scaleX: 1.0 } }
            ]);
        }

        if (parts.includes('horns')) {
            clip.addTrack('horns', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.8 } },
                { time: duration * 0.5, transform: { scaleX: 1.3, scaleY: 1.3, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.8 } }
            ]);
        }

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.3, transform: { rotation: 0.5 } },
                { time: duration * 0.6, transform: { rotation: -0.3 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        return clip;
    }

    /**
     * SCARICA ETEREA - Ethereal discharge with floating motion
     */
    static createScaricaEtereaAnimation(parts, duration = 0.9) {
        const clip = new AnimationClip('animScaricaEterea', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0, opacity: 1.0 } },
                { time: duration * 0.3, transform: { y: -15, opacity: 0.7 } },
                { time: duration * 0.6, transform: { y: -20, opacity: 0.5 } },
                { time: duration * 0.85, transform: { y: -10, opacity: 0.8 } },
                { time: duration, transform: { y: 0, opacity: 1.0 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, rotation: 0 } },
                { time: duration * 0.4, transform: { scaleX: 1.8, scaleY: 1.8, rotation: 0.8 } },
                { time: duration * 0.7, transform: { scaleX: 2.2, scaleY: 2.2, rotation: 1.2 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0, rotation: 0 } }
            ]);
        }

        if (parts.includes('arms')) {
            clip.addTrack('arms', [
                { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
                { time: duration * 0.5, transform: { rotation: 0.6, scaleX: 1.2 } },
                { time: duration, transform: { rotation: 0, scaleX: 1.0 } }
            ]);
        }

        return clip;
    }

    /**
     * MORSO CIBERNETICO - Cybernetic bite with mechanical lunge
     */
    static createMorsoCiberneticoAnimation(parts, duration = 0.6) {
        const clip = new AnimationClip('animMorsoCibernetico', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { x: 0, scaleX: 1.0 } },
                { time: duration * 0.2, transform: { x: -10, scaleX: 0.9 } },
                { time: duration * 0.5, transform: { x: 30, scaleX: 1.2 } },
                { time: duration * 0.8, transform: { x: 15, scaleX: 1.1 } },
                { time: duration, transform: { x: 0, scaleX: 1.0 } }
            ]);
        }

        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { rotation: 0, scaleY: 1.0 } },
                { time: duration * 0.3, transform: { rotation: -0.4, scaleY: 0.95 } },
                { time: duration * 0.6, transform: { rotation: 0.5, scaleY: 1.15 } },
                { time: duration, transform: { rotation: 0, scaleY: 1.0 } }
            ]);
        }

        if (parts.includes('shoulders')) {
            clip.addTrack('shoulders', [
                { time: 0, transform: { scaleX: 1.0, opacity: 0.8 } },
                { time: duration * 0.4, transform: { scaleX: 1.3, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.0, opacity: 0.8 } }
            ]);
        }

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.3, transform: { rotation: -0.7 } },
                { time: duration * 0.6, transform: { rotation: 0.4 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        return clip;
    }

    /**
     * ARTIGLIO INCANTATO - Enchanted claw with sweeping slash
     */
    static createArtiglioIncantatoAnimation(parts, duration = 0.7) {
        const clip = new AnimationClip('animArtiglioIncantato', duration, false);

        if (parts.includes('weapon')) {
            clip.addTrack('weapon', [
                { time: 0, transform: { rotation: 0, x: 0, y: 0 } },
                { time: duration * 0.3, transform: { rotation: -0.8, x: -15, y: -10 } },
                { time: duration * 0.6, transform: { rotation: 0.9, x: 20, y: 15 } },
                { time: duration, transform: { rotation: 0, x: 0, y: 0 } }
            ]);
        }

        if (parts.includes('arms')) {
            clip.addTrack('arms', [
                { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
                { time: duration * 0.4, transform: { rotation: -0.5, scaleX: 1.15 } },
                { time: duration * 0.7, transform: { rotation: 0.3, scaleX: 1.1 } },
                { time: duration, transform: { rotation: 0, scaleX: 1.0 } }
            ]);
        }

        if (parts.includes('horns')) {
            clip.addTrack('horns', [
                { time: 0, transform: { scaleX: 1.0, opacity: 0.8 } },
                { time: duration * 0.5, transform: { scaleX: 1.4, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.0, opacity: 0.8 } }
            ]);
        }

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.4, transform: { rotation: -0.2 } },
                { time: duration * 0.7, transform: { rotation: 0.15 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        return clip;
    }

    /**
     * ASSALTO POTENZIATO - Powered assault with tech-enhanced charge
     */
    static createAssaltoPotentatoAnimation(parts, duration = 0.8) {
        const clip = new AnimationClip('animAssaltoPotenziato', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { x: 0, scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.15, transform: { x: -12, scaleX: 0.85, scaleY: 1.1 } },
                { time: duration * 0.4, transform: { x: 35, scaleX: 1.3, scaleY: 0.95 } },
                { time: duration * 0.7, transform: { x: 25, scaleX: 1.2, scaleY: 1.0 } },
                { time: duration, transform: { x: 0, scaleX: 1.0, scaleY: 1.0 } }
            ]);
        }

        if (parts.includes('shoulders')) {
            clip.addTrack('shoulders', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.3, transform: { scaleX: 1.4, scaleY: 1.2 } },
                { time: duration * 0.6, transform: { scaleX: 1.3, scaleY: 1.15 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.0 } }
            ]);
        }

        if (parts.includes('legs')) {
            clip.addTrack('legs', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.25, transform: { scaleY: 0.85 } },
                { time: duration * 0.5, transform: { scaleY: 1.2 } },
                { time: duration, transform: { scaleY: 1.0 } }
            ]);
        }

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
                { time: duration * 0.4, transform: { rotation: -0.6, scaleX: 1.3 } },
                { time: duration, transform: { rotation: 0, scaleX: 1.0 } }
            ]);
        }

        return clip;
    }

    /**
     * CAMPO RUNICO-TECH - Runic-tech field with hexagonal barriers
     */
    static createCampoRunicoTechAnimation(parts, duration = 0.8) {
        const clip = new AnimationClip('animCampoRunicoTech', duration, false);

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 0.5, scaleY: 0.5, rotation: 0, opacity: 0.3 } },
                { time: duration * 0.3, transform: { scaleX: 1.5, scaleY: 1.5, rotation: 0.5, opacity: 0.9 } },
                { time: duration * 0.6, transform: { scaleX: 2.0, scaleY: 2.0, rotation: 1.0, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.8, scaleY: 1.8, rotation: 0.8, opacity: 0.8 } }
            ]);
        }

        if (parts.includes('shoulders')) {
            clip.addTrack('shoulders', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleX: 1.3, scaleY: 1.2 } },
                { time: duration * 0.7, transform: { scaleX: 1.25, scaleY: 1.15 } },
                { time: duration, transform: { scaleX: 1.2, scaleY: 1.1 } }
            ]);
        }

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.5, transform: { scaleY: 1.05 } },
                { time: duration, transform: { scaleY: 1.0 } }
            ]);
        }

        return clip;
    }

    /**
     * BARRIERA ORGANICA - Organic barrier with growing thorns
     */
    static createBarrieraOrganicaAnimation(parts, duration = 0.9) {
        const clip = new AnimationClip('animBarrieraOrganica', duration, false);

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { rotation: 0, scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.3, transform: { rotation: 0.4, scaleX: 1.3, scaleY: 1.2 } },
                { time: duration * 0.6, transform: { rotation: -0.3, scaleX: 1.4, scaleY: 1.3 } },
                { time: duration, transform: { rotation: 0, scaleX: 1.2, scaleY: 1.15 } }
            ]);
        }

        if (parts.includes('horns')) {
            clip.addTrack('horns', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, y: 0 } },
                { time: duration * 0.4, transform: { scaleX: 1.4, scaleY: 1.5, y: -8 } },
                { time: duration * 0.7, transform: { scaleX: 1.5, scaleY: 1.6, y: -10 } },
                { time: duration, transform: { scaleX: 1.3, scaleY: 1.4, y: -5 } }
            ]);
        }

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.5, transform: { scaleX: 0.95, scaleY: 1.1 } },
                { time: duration, transform: { scaleX: 1.0, scaleY: 1.05 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, opacity: 0.5 } },
                { time: duration * 0.6, transform: { scaleX: 1.6, opacity: 0.9 } },
                { time: duration, transform: { scaleX: 1.4, opacity: 0.7 } }
            ]);
        }

        return clip;
    }

    /**
     * SCUDO QUANTICO - Quantum shield with phase shifting
     */
    static createScudoQuanticoAnimation(parts, duration = 0.7) {
        const clip = new AnimationClip('animScudoQuantico', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { opacity: 1.0, scaleX: 1.0 } },
                { time: duration * 0.25, transform: { opacity: 0.4, scaleX: 0.95 } },
                { time: duration * 0.5, transform: { opacity: 1.0, scaleX: 1.05 } },
                { time: duration * 0.75, transform: { opacity: 0.5, scaleX: 0.98 } },
                { time: duration, transform: { opacity: 1.0, scaleX: 1.0 } }
            ]);
        }

        if (parts.includes('shoulders')) {
            clip.addTrack('shoulders', [
                { time: 0, transform: { scaleX: 1.0, x: 0, opacity: 0.8 } },
                { time: duration * 0.3, transform: { scaleX: 1.4, x: 5, opacity: 1.0 } },
                { time: duration * 0.6, transform: { scaleX: 1.5, x: 8, opacity: 0.6 } },
                { time: duration, transform: { scaleX: 1.3, x: 3, opacity: 0.9 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, rotation: 0 } },
                { time: duration * 0.4, transform: { scaleX: 1.8, scaleY: 1.8, rotation: -0.6 } },
                { time: duration * 0.7, transform: { scaleX: 2.0, scaleY: 2.0, rotation: 0.4 } },
                { time: duration, transform: { scaleX: 1.6, scaleY: 1.6, rotation: 0 } }
            ]);
        }

        return clip;
    }

    /**
     * CORAZZA ADATTIVA - Adaptive armor with plate deployment
     */
    static createCorazzaAdattivaAnimation(parts, duration = 0.8) {
        const clip = new AnimationClip('animCorazzaAdattiva', duration, false);

        if (parts.includes('shoulders')) {
            clip.addTrack('shoulders', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, x: 0, y: 0 } },
                { time: duration * 0.3, transform: { scaleX: 1.5, scaleY: 1.3, x: 8, y: -5 } },
                { time: duration * 0.6, transform: { scaleX: 1.6, scaleY: 1.4, x: 10, y: -6 } },
                { time: duration, transform: { scaleX: 1.4, scaleY: 1.3, x: 5, y: -3 } }
            ]);
        }

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleX: 0.9, scaleY: 1.1 } },
                { time: duration * 0.7, transform: { scaleX: 0.88, scaleY: 1.12 } },
                { time: duration, transform: { scaleX: 0.92, scaleY: 1.08 } }
            ]);
        }

        if (parts.includes('legs')) {
            clip.addTrack('legs', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.5, transform: { scaleX: 1.15, scaleY: 1.1 } },
                { time: duration, transform: { scaleX: 1.1, scaleY: 1.05 } }
            ]);
        }

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { scaleX: 1.0 } },
                { time: duration * 0.4, transform: { scaleX: 1.2 } },
                { time: duration, transform: { scaleX: 1.15 } }
            ]);
        }

        return clip;
    }

    /**
     * PELLE DI MANA - Mana skin with ethereal glow
     */
    static createPelleDiManaAnimation(parts, duration = 1.0) {
        const clip = new AnimationClip('animPelleDiMana', duration, false);

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 0.8, scaleY: 0.8, opacity: 0.4 } },
                { time: duration * 0.3, transform: { scaleX: 1.4, scaleY: 1.4, opacity: 0.8 } },
                { time: duration * 0.6, transform: { scaleX: 1.8, scaleY: 1.8, opacity: 1.0 } },
                { time: duration * 0.85, transform: { scaleX: 1.6, scaleY: 1.6, opacity: 0.9 } },
                { time: duration, transform: { scaleX: 1.3, scaleY: 1.3, opacity: 0.7 } }
            ]);
        }

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleY: 1.0, opacity: 1.0 } },
                { time: duration * 0.4, transform: { scaleY: 1.08, opacity: 0.85 } },
                { time: duration * 0.7, transform: { scaleY: 1.1, opacity: 0.75 } },
                { time: duration, transform: { scaleY: 1.05, opacity: 0.9 } }
            ]);
        }

        if (parts.includes('horns')) {
            clip.addTrack('horns', [
                { time: 0, transform: { opacity: 0.8, scaleX: 1.0 } },
                { time: duration * 0.5, transform: { opacity: 1.0, scaleX: 1.3 } },
                { time: duration, transform: { opacity: 0.9, scaleX: 1.2 } }
            ]);
        }

        return clip;
    }

    /**
     * ESOSCHELETRO BIO-TECH - Bio-tech exoskeleton deployment
     */
    static createEsoscheletroBioTechAnimation(parts, duration = 0.9) {
        const clip = new AnimationClip('animEsoscheletroBioTech', duration, false);

        if (parts.includes('shoulders')) {
            clip.addTrack('shoulders', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, rotation: 0 } },
                { time: duration * 0.25, transform: { scaleX: 1.3, scaleY: 1.2, rotation: 0.2 } },
                { time: duration * 0.5, transform: { scaleX: 1.5, scaleY: 1.4, rotation: -0.15 } },
                { time: duration * 0.75, transform: { scaleX: 1.6, scaleY: 1.5, rotation: 0.1 } },
                { time: duration, transform: { scaleX: 1.4, scaleY: 1.35, rotation: 0 } }
            ]);
        }

        if (parts.includes('arms')) {
            clip.addTrack('arms', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.4, transform: { scaleX: 1.25, scaleY: 1.2 } },
                { time: duration, transform: { scaleX: 1.2, scaleY: 1.15 } }
            ]);
        }

        if (parts.includes('legs')) {
            clip.addTrack('legs', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0 } },
                { time: duration * 0.45, transform: { scaleX: 1.2, scaleY: 1.15 } },
                { time: duration, transform: { scaleX: 1.15, scaleY: 1.1 } }
            ]);
        }

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { scaleX: 1.0, rotation: 0 } },
                { time: duration * 0.5, transform: { scaleX: 1.3, rotation: 0.3 } },
                { time: duration, transform: { scaleX: 1.25, rotation: 0.15 } }
            ]);
        }

        return clip;
    }

    /**
     * SINCRONIZZAZIONE NEXUS - Nexus synchronization with network pulses
     */
    static createSincronizzazioneNexusAnimation(parts, duration = 1.0) {
        const clip = new AnimationClip('animSincronizzazioneNexus', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0, scaleX: 1.0, scaleY: 1.0, opacity: 1.0 } },
                { time: duration * 0.15, transform: { y: -12, scaleX: 1.05, scaleY: 1.05, opacity: 0.85 } },
                { time: duration * 0.3, transform: { y: -20, scaleX: 1.1, scaleY: 1.1, opacity: 0.7 } },
                { time: duration * 0.45, transform: { y: -25, scaleX: 1.08, scaleY: 1.08, opacity: 0.6 } },
                { time: duration * 0.6, transform: { y: -28, scaleX: 1.12, scaleY: 1.12, opacity: 0.5 } },
                { time: duration * 0.75, transform: { y: -25, scaleX: 1.1, scaleY: 1.1, opacity: 0.7 } },
                { time: duration * 0.9, transform: { y: -15, scaleX: 1.05, scaleY: 1.05, opacity: 0.9 } },
                { time: duration, transform: { y: -10, scaleX: 1.03, scaleY: 1.03, opacity: 1.0 } }
            ]);
        }

        if (parts.includes('shoulders')) {
            clip.addTrack('shoulders', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, x: 0, opacity: 0.8 } },
                { time: duration * 0.2, transform: { scaleX: 1.4, scaleY: 1.2, x: 8, opacity: 1.0 } },
                { time: duration * 0.35, transform: { scaleX: 1.2, scaleY: 1.1, x: 4, opacity: 0.9 } },
                { time: duration * 0.5, transform: { scaleX: 1.5, scaleY: 1.3, x: 10, opacity: 1.0 } },
                { time: duration * 0.65, transform: { scaleX: 1.3, scaleY: 1.15, x: 6, opacity: 0.95 } },
                { time: duration * 0.8, transform: { scaleX: 1.6, scaleY: 1.4, x: 12, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.4, scaleY: 1.3, x: 7, opacity: 1.0 } }
            ]);
        }

        if (parts.includes('arms')) {
            clip.addTrack('arms', [
                { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
                { time: duration * 0.25, transform: { rotation: 0.4, scaleX: 1.15 } },
                { time: duration * 0.5, transform: { rotation: -0.3, scaleX: 1.2 } },
                { time: duration * 0.75, transform: { rotation: 0.5, scaleX: 1.25 } },
                { time: duration, transform: { rotation: 0.2, scaleX: 1.15 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.5 } },
                { time: duration * 0.2, transform: { scaleX: 1.8, scaleY: 1.8, opacity: 0.8 } },
                { time: duration * 0.4, transform: { scaleX: 1.5, scaleY: 1.5, opacity: 0.6 } },
                { time: duration * 0.6, transform: { scaleX: 2.2, scaleY: 2.2, opacity: 1.0 } },
                { time: duration * 0.8, transform: { scaleX: 1.9, scaleY: 1.9, opacity: 0.9 } },
                { time: duration, transform: { scaleX: 2.0, scaleY: 2.0, opacity: 0.95 } }
            ]);
        }

        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 1.0 } },
                { time: duration * 0.3, transform: { scaleX: 1.15, scaleY: 1.15, opacity: 0.8 } },
                { time: duration * 0.6, transform: { scaleX: 1.2, scaleY: 1.2, opacity: 0.7 } },
                { time: duration, transform: { scaleX: 1.1, scaleY: 1.1, opacity: 0.9 } }
            ]);
        }

        return clip;
    }

    /**
     * RISVEGLIO PRIMORDIALE - Primal awakening with nature surge
     */
    static createRisveglioPrimordrialeAnimation(parts, duration = 1.1) {
        const clip = new AnimationClip('animRisveglioPrimordiale', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleY: 1.0, y: 0 } },
                { time: duration * 0.3, transform: { scaleY: 1.15, y: -10 } },
                { time: duration * 0.6, transform: { scaleY: 1.25, y: -15 } },
                { time: duration * 0.85, transform: { scaleY: 1.2, y: -12 } },
                { time: duration, transform: { scaleY: 1.1, y: -5 } }
            ]);
        }

        if (parts.includes('horns')) {
            clip.addTrack('horns', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, y: 0 } },
                { time: duration * 0.4, transform: { scaleX: 1.5, scaleY: 1.6, y: -8 } },
                { time: duration * 0.7, transform: { scaleX: 1.7, scaleY: 1.8, y: -12 } },
                { time: duration, transform: { scaleX: 1.4, scaleY: 1.5, y: -6 } }
            ]);
        }

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, rotation: 0 } },
                { time: duration * 0.5, transform: { scaleX: 1.3, scaleY: 1.25, rotation: 0.5 } },
                { time: duration, transform: { scaleX: 1.2, scaleY: 1.15, rotation: 0.2 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 0.8, scaleY: 0.8, opacity: 0.5 } },
                { time: duration * 0.6, transform: { scaleX: 2.0, scaleY: 2.0, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.7, scaleY: 1.7, opacity: 0.9 } }
            ]);
        }

        return clip;
    }

    /**
     * BOOST ETERICO - Ethereal boost with speed trails
     */
    static createBoostEtericoAnimation(parts, duration = 0.7) {
        const clip = new AnimationClip('animBoostEterico', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { x: 0, scaleX: 1.0, opacity: 1.0 } },
                { time: duration * 0.2, transform: { x: -15, scaleX: 0.85, opacity: 0.6 } },
                { time: duration * 0.4, transform: { x: 10, scaleX: 1.15, opacity: 0.8 } },
                { time: duration * 0.6, transform: { x: -8, scaleX: 0.9, opacity: 0.7 } },
                { time: duration * 0.8, transform: { x: 5, scaleX: 1.1, opacity: 0.9 } },
                { time: duration, transform: { x: 0, scaleX: 1.05, opacity: 1.0 } }
            ]);
        }

        if (parts.includes('legs')) {
            clip.addTrack('legs', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.3, transform: { scaleY: 1.2 } },
                { time: duration * 0.6, transform: { scaleY: 0.9 } },
                { time: duration, transform: { scaleY: 1.1 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, rotation: 0 } },
                { time: duration * 0.5, transform: { scaleX: 1.8, scaleY: 1.5, rotation: 0.8 } },
                { time: duration, transform: { scaleX: 1.5, scaleY: 1.3, rotation: 0.4 } }
            ]);
        }

        return clip;
    }

    /**
     * STIMOLO VITALE - Vital stimulus with energy surge through body
     */
    static createStimoloVitaleAnimation(parts, duration = 0.9) {
        const clip = new AnimationClip('animStimoloVitale', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, y: 0 } },
                { time: duration * 0.25, transform: { scaleX: 1.05, scaleY: 1.15, y: -5 } },
                { time: duration * 0.5, transform: { scaleX: 1.1, scaleY: 1.25, y: -10 } },
                { time: duration * 0.75, transform: { scaleX: 1.08, scaleY: 1.2, y: -8 } },
                { time: duration, transform: { scaleX: 1.05, scaleY: 1.1, y: -3 } }
            ]);
        }

        if (parts.includes('shoulders')) {
            clip.addTrack('shoulders', [
                { time: 0, transform: { scaleX: 1.0, opacity: 0.8 } },
                { time: duration * 0.4, transform: { scaleX: 1.3, opacity: 1.0 } },
                { time: duration * 0.7, transform: { scaleX: 1.25, opacity: 0.9 } },
                { time: duration, transform: { scaleX: 1.2, opacity: 1.0 } }
            ]);
        }

        if (parts.includes('legs')) {
            clip.addTrack('legs', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.3, transform: { scaleY: 0.9 } },
                { time: duration * 0.6, transform: { scaleY: 1.15 } },
                { time: duration, transform: { scaleY: 1.05 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.6 } },
                { time: duration * 0.5, transform: { scaleX: 1.6, scaleY: 1.8, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.4, scaleY: 1.5, opacity: 0.8 } }
            ]);
        }

        return clip;
    }

    /**
     * RINASCITA ARCANA - Arcane rebirth with mystical resurrection
     */
    static createRinascitaArcanaAnimation(parts, duration = 1.2) {
        const clip = new AnimationClip('animRinascitaArcana', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleX: 0.8, scaleY: 0.8, y: 0, opacity: 0.3 } },
                { time: duration * 0.3, transform: { scaleX: 1.0, scaleY: 1.0, y: -15, opacity: 0.6 } },
                { time: duration * 0.6, transform: { scaleX: 1.15, scaleY: 1.2, y: -25, opacity: 0.9 } },
                { time: duration * 0.85, transform: { scaleX: 1.1, scaleY: 1.15, y: -15, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.05, scaleY: 1.08, y: -8, opacity: 1.0 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 0.5, scaleY: 0.5, rotation: 0, opacity: 0.2 } },
                { time: duration * 0.4, transform: { scaleX: 2.0, scaleY: 2.0, rotation: 1.0, opacity: 1.0 } },
                { time: duration * 0.7, transform: { scaleX: 2.5, scaleY: 2.5, rotation: 1.8, opacity: 0.9 } },
                { time: duration, transform: { scaleX: 2.0, scaleY: 2.0, rotation: 2.4, opacity: 0.8 } }
            ]);
        }

        if (parts.includes('horns')) {
            clip.addTrack('horns', [
                { time: 0, transform: { scaleX: 0.5, scaleY: 0.5, opacity: 0.3 } },
                { time: duration * 0.5, transform: { scaleX: 1.4, scaleY: 1.5, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.2, scaleY: 1.3, opacity: 0.9 } }
            ]);
        }

        if (parts.includes('arms')) {
            clip.addTrack('arms', [
                { time: 0, transform: { rotation: 0, opacity: 0.4 } },
                { time: duration * 0.6, transform: { rotation: 0.5, opacity: 1.0 } },
                { time: duration, transform: { rotation: 0.2, opacity: 1.0 } }
            ]);
        }

        return clip;
    }

    /**
     * REGEN NANO-ORGANICO - Nano-organic regeneration with cellular reconstruction
     */
    static createRegenNanoOrganicoAnimation(parts, duration = 1.0) {
        const clip = new AnimationClip('animRegenNanoOrganico', duration, false);

        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleY: 1.0, opacity: 1.0 } },
                { time: duration * 0.2, transform: { scaleY: 1.05, opacity: 0.9 } },
                { time: duration * 0.4, transform: { scaleY: 1.12, opacity: 0.85 } },
                { time: duration * 0.6, transform: { scaleY: 1.15, opacity: 0.8 } },
                { time: duration * 0.8, transform: { scaleY: 1.1, opacity: 0.9 } },
                { time: duration, transform: { scaleY: 1.05, opacity: 1.0 } }
            ]);
        }

        if (parts.includes('shoulders')) {
            clip.addTrack('shoulders', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.8 } },
                { time: duration * 0.35, transform: { scaleX: 1.2, scaleY: 1.15, opacity: 1.0 } },
                { time: duration * 0.65, transform: { scaleX: 1.25, scaleY: 1.2, opacity: 0.95 } },
                { time: duration, transform: { scaleX: 1.15, scaleY: 1.1, opacity: 1.0 } }
            ]);
        }

        if (parts.includes('tail')) {
            clip.addTrack('tail', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, rotation: 0 } },
                { time: duration * 0.4, transform: { scaleX: 1.15, scaleY: 1.1, rotation: 0.3 } },
                { time: duration * 0.7, transform: { scaleX: 1.2, scaleY: 1.15, rotation: -0.2 } },
                { time: duration, transform: { scaleX: 1.1, scaleY: 1.08, rotation: 0.1 } }
            ]);
        }

        if (parts.includes('aura')) {
            clip.addTrack('aura', [
                { time: 0, transform: { scaleX: 1.0, scaleY: 1.0, opacity: 0.5 } },
                { time: duration * 0.3, transform: { scaleX: 1.4, scaleY: 1.4, opacity: 0.8 } },
                { time: duration * 0.6, transform: { scaleX: 1.7, scaleY: 1.7, opacity: 1.0 } },
                { time: duration, transform: { scaleX: 1.5, scaleY: 1.5, opacity: 0.9 } }
            ]);
        }

        if (parts.includes('legs')) {
            clip.addTrack('legs', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.5, transform: { scaleY: 1.1 } },
                { time: duration, transform: { scaleY: 1.05 } }
            ]);
        }

        return clip;
    }
}
