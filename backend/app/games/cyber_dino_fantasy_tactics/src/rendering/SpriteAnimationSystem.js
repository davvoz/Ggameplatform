/**
 * Advanced Multi-Part Sprite Animation System
 * Professional skeletal/hierarchical animation with independent part movement
 * Inspired by merge-tower-defense architecture, adapted for tactical RPG
 */

// ============================================================================
// TRANSFORM SYSTEM - Hierarchical transforms for sprite parts
// ============================================================================

export class Transform {
    constructor(x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1) {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        this.parent = null;
        this.children = [];
    }

    /**
     * Get world transform (including parent transforms)
     */
    getWorldTransform() {
        if (!this.parent) {
            return {
                x: this.x,
                y: this.y,
                rotation: this.rotation,
                scaleX: this.scaleX,
                scaleY: this.scaleY
            };
        }

        const parentWorld = this.parent.getWorldTransform();
        
        // Apply parent rotation to local position
        const cos = Math.cos(parentWorld.rotation);
        const sin = Math.sin(parentWorld.rotation);
        const localX = this.x * parentWorld.scaleX;
        const localY = this.y * parentWorld.scaleY;
        
        return {
            x: parentWorld.x + (localX * cos - localY * sin),
            y: parentWorld.y + (localX * sin + localY * cos),
            rotation: parentWorld.rotation + this.rotation,
            scaleX: parentWorld.scaleX * this.scaleX,
            scaleY: parentWorld.scaleY * this.scaleY
        };
    }

    addChild(child) {
        child.parent = this;
        this.children.push(child);
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
    }
}

// ============================================================================
// SPRITE PART - Individual animated component
// ============================================================================

export class SpritePart {
    constructor(name, geometry, pivotX = 0.5, pivotY = 0.5, zOrder = 0) {
        this.name = name;
        this.geometry = geometry; // The visual definition (array or single object)
        this.transform = new Transform();
        this.pivotX = pivotX;
        this.pivotY = pivotY;
        this.visible = true;
        this.opacity = 1.0;
        this.tint = null;
        this.zOrder = zOrder;
        this.glowColor = null;
        this.glowIntensity = 0;
        
        // Animation state
        this.baseTransform = {
            x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1
        };
    }

    /**
     * Set base transform (rest pose)
     */
    setBaseTransform(x, y, rotation = 0, scaleX = 1, scaleY = 1) {
        this.baseTransform = { x, y, rotation, scaleX, scaleY };
        this.transform.x = x;
        this.transform.y = y;
        this.transform.rotation = rotation;
        this.transform.scaleX = scaleX;
        this.transform.scaleY = scaleY;
    }

    /**
     * Apply animation transform (additive to base)
     */
    applyAnimation(animTransform) {
        this.transform.x = this.baseTransform.x + (animTransform.x || 0);
        this.transform.y = this.baseTransform.y + (animTransform.y || 0);
        this.transform.rotation = this.baseTransform.rotation + (animTransform.rotation || 0);
        this.transform.scaleX = this.baseTransform.scaleX * (animTransform.scaleX || 1);
        this.transform.scaleY = this.baseTransform.scaleY * (animTransform.scaleY || 1);
        
        // Apply opacity and glow if provided
        if (animTransform.opacity !== undefined) {
            this.opacity = animTransform.opacity;
        }
        if (animTransform.glowIntensity !== undefined) {
            this.glowIntensity = animTransform.glowIntensity;
        }
    }

    /**
     * Reset to base pose
     */
    resetToBase() {
        this.transform.x = this.baseTransform.x;
        this.transform.y = this.baseTransform.y;
        this.transform.rotation = this.baseTransform.rotation;
        this.transform.scaleX = this.baseTransform.scaleX;
        this.transform.scaleY = this.baseTransform.scaleY;
        this.opacity = 1.0;
        this.glowIntensity = 0;
    }
}

// ============================================================================
// ANIMATION CLIP - Keyframe-based animation data
// ============================================================================

export class AnimationClip {
    constructor(name, duration, loop = true) {
        this.name = name;
        this.duration = duration; // in seconds
        this.loop = loop;
        this.tracks = {}; // partName -> keyframes array
        this.onComplete = null;
    }

    /**
     * Add keyframes for a part
     * @param {string} partName - Name of the part to animate
     * @param {Array} keyframes - Array of {time, transform} objects
     */
    addTrack(partName, keyframes) {
        // Sort keyframes by time
        keyframes.sort((a, b) => a.time - b.time);
        this.tracks[partName] = keyframes;
    }

    /**
     * Sample animation at specific time
     * @param {number} time - Current time in animation
     * @returns {Object} - Map of partName -> transform
     */
    sample(time) {
        const result = {};

        // Handle looping
        let sampleTime = time;
        if (this.loop && time >= this.duration) {
            sampleTime = time % this.duration;
        } else if (!this.loop && time >= this.duration) {
            sampleTime = this.duration;
        }

        // Sample each track
        for (const [partName, keyframes] of Object.entries(this.tracks)) {
            result[partName] = this.sampleTrack(keyframes, sampleTime);
        }

        return result;
    }

    /**
     * Sample a single track with interpolation
     */
    sampleTrack(keyframes, time) {
        if (keyframes.length === 0) return {};
        if (keyframes.length === 1 || time <= keyframes[0].time) {
            return { ...keyframes[0].transform };
        }

        // Find surrounding keyframes
        let prevFrame = keyframes[0];
        let nextFrame = keyframes[keyframes.length - 1];

        for (let i = 0; i < keyframes.length - 1; i++) {
            if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
                prevFrame = keyframes[i];
                nextFrame = keyframes[i + 1];
                break;
            }
        }

        // Interpolation factor
        const duration = nextFrame.time - prevFrame.time;
        const t = duration > 0 ? (time - prevFrame.time) / duration : 0;
        
        // Smooth interpolation (ease in-out)
        const smoothT = this.smoothstep(t);

        // Interpolate transform
        return {
            x: this.lerp(prevFrame.transform.x || 0, nextFrame.transform.x || 0, smoothT),
            y: this.lerp(prevFrame.transform.y || 0, nextFrame.transform.y || 0, smoothT),
            rotation: this.lerp(prevFrame.transform.rotation || 0, nextFrame.transform.rotation || 0, smoothT),
            scaleX: this.lerp(prevFrame.transform.scaleX ?? 1, nextFrame.transform.scaleX ?? 1, smoothT),
            scaleY: this.lerp(prevFrame.transform.scaleY ?? 1, nextFrame.transform.scaleY ?? 1, smoothT),
            opacity: this.lerp(prevFrame.transform.opacity ?? 1, nextFrame.transform.opacity ?? 1, smoothT),
            glowIntensity: this.lerp(prevFrame.transform.glowIntensity ?? 0, nextFrame.transform.glowIntensity ?? 0, smoothT)
        };
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    smoothstep(t) {
        return t * t * (3 - 2 * t);
    }

    /**
     * Clone this animation clip
     */
    clone() {
        const clip = new AnimationClip(this.name, this.duration, this.loop);
        for (const [partName, keyframes] of Object.entries(this.tracks)) {
            clip.tracks[partName] = keyframes.map(kf => ({
                time: kf.time,
                transform: { ...kf.transform }
            }));
        }
        return clip;
    }
}

// ============================================================================
// MULTI-PART SPRITE - Container for animated parts
// ============================================================================

export class MultiPartSprite {
    constructor(name) {
        this.name = name;
        this.parts = new Map(); // partName -> SpritePart
        this.animations = new Map(); // animName -> AnimationClip
        this.currentAnimation = null;
        this.animationTime = 0;
        this.playbackSpeed = 1.0;
        this.playing = false;
        this.flipX = false;
        
        // Root transform for entire sprite
        this.rootTransform = new Transform();
        
        // Callbacks
        this.onAnimationComplete = null;
        
        // Color modifiers
        this.baseTint = null;
        this.flashColor = null;
        this.flashIntensity = 0;
    }

    /**
     * Add a sprite part
     */
    addPart(name, geometry, pivotX = 0.5, pivotY = 0.5, zOrder = 0) {
        const part = new SpritePart(name, geometry, pivotX, pivotY, zOrder);
        this.parts.set(name, part);
        return part;
    }

    /**
     * Set up parent-child hierarchy
     */
    setParent(childName, parentName) {
        const child = this.parts.get(childName);
        const parent = this.parts.get(parentName);
        
        if (child && parent) {
            parent.transform.addChild(child.transform);
        }
    }

    /**
     * Add animation clip
     */
    addAnimation(clip) {
        this.animations.set(clip.name, clip);
    }

    /**
     * Play animation
     */
    play(animationName, restart = false) {
        const anim = this.animations.get(animationName);
        if (!anim) {
            console.warn(`Animation '${animationName}' not found on sprite '${this.name}'`);
            return;
        }

        if (this.currentAnimation !== animationName || restart) {
            this.currentAnimation = animationName;
            this.animationTime = 0;
        }
        
        this.playing = true;
    }

    /**
     * Stop animation
     */
    stop() {
        this.playing = false;
    }

    /**
     * Check if animation is playing
     */
    isPlaying(animationName = null) {
        if (animationName) {
            return this.playing && this.currentAnimation === animationName;
        }
        return this.playing;
    }

    /**
     * Update animation
     */
    update(dt) {
        // Update flash effect
        if (this.flashIntensity > 0) {
            this.flashIntensity = Math.max(0, this.flashIntensity - dt * 4);
        }

        if (!this.playing || !this.currentAnimation) return;

        const anim = this.animations.get(this.currentAnimation);
        if (!anim) return;

        this.animationTime += dt * this.playbackSpeed;

        // Sample animation
        const transforms = anim.sample(this.animationTime);

        // Apply to parts
        for (const [partName, transform] of Object.entries(transforms)) {
            const part = this.parts.get(partName);
            if (part) {
                part.applyAnimation(transform);
            }
        }

        // Check if animation finished
        if (!anim.loop && this.animationTime >= anim.duration) {
            this.playing = false;
            if (this.onAnimationComplete) {
                this.onAnimationComplete(this.currentAnimation);
            }
        }
    }

    /**
     * Reset all parts to base pose
     */
    resetPose() {
        for (const part of this.parts.values()) {
            part.resetToBase();
        }
    }

    /**
     * Flash the sprite (hit effect)
     */
    flash(color = '#ffffff', intensity = 1.0) {
        this.flashColor = color;
        this.flashIntensity = intensity;
    }

    /**
     * Get sorted parts array for rendering
     */
    getSortedParts() {
        return Array.from(this.parts.values())
            .filter(p => p.visible)
            .sort((a, b) => a.zOrder - b.zOrder);
    }

    /**
     * Get part by name
     */
    getPart(name) {
        return this.parts.get(name);
    }

    /**
     * Set playback speed
     */
    setSpeed(speed) {
        this.playbackSpeed = speed;
    }

    /**
     * Set tint for all parts
     */
    setTint(color) {
        this.baseTint = color;
    }

    /**
     * Get all part names
     */
    getPartNames() {
        return Array.from(this.parts.keys());
    }
}

// ============================================================================
// EASING FUNCTIONS - For smooth animations
// ============================================================================

export const Easing = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeInElastic: t => {
        if (t === 0 || t === 1) return t;
        return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    },
    easeOutElastic: t => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
    },
    easeOutBounce: t => {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        }
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
};
