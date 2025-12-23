/**
 * Advanced Multi-Part Sprite Animation System
 * Professional skeletal/hierarchical animation with independent part movement
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
}

// ============================================================================
// SPRITE PART - Individual animated component
// ============================================================================

export class SpritePart {
    constructor(name, geometry, pivotX = 0.5, pivotY = 0.5, zOrder = 0) {
        this.name = name;
        this.geometry = geometry; // The visual definition
        this.transform = new Transform();
        this.pivotX = pivotX; // Rotation pivot point (0-1)
        this.pivotY = pivotY;
        this.visible = true;
        this.opacity = 1.0;
        this.tint = null;
        this.zOrder = zOrder; // Lower = rendered first (behind)
        
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
            return keyframes[0].transform;
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
            scaleX: this.lerp(prevFrame.transform.scaleX || 1, nextFrame.transform.scaleX || 1, smoothT),
            scaleY: this.lerp(prevFrame.transform.scaleY || 1, nextFrame.transform.scaleY || 1, smoothT)
        };
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    smoothstep(t) {
        return t * t * (3 - 2 * t);
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
        
        // Root transform
        this.rootTransform = new Transform();
    }

    /**
     * Add a sprite part
     * @param {string} name - Part name
     * @param {Object} geometry - Visual definition
     * @param {number} pivotX - X pivot (0-1)
     * @param {number} pivotY - Y pivot (0-1)
     * @param {number} zOrder - Z-order (lower = behind, higher = front)
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
            console.warn(`Animation '${animationName}' not found`);
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
     * Update animation
     */
    update(dt) {
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
     * Render all parts
     */
    render(ctx, x, y, size, options = {}) {
        ctx.save();
        
        // Position sprite - x,y is the CENTER, coordinates are 0-1 relative to top-left
        // So we offset by -size/2 to make 0.5,0.5 the center
        ctx.translate(x - size/2, y - size/2);

        // Apply root transform
        const rootWorld = this.rootTransform.getWorldTransform();
        ctx.translate(rootWorld.x * size, rootWorld.y * size);
        ctx.rotate(rootWorld.rotation);
        ctx.scale(rootWorld.scaleX, rootWorld.scaleY);

        // Render parts in z-order (lower zOrder = rendered first = behind)
        const partsArray = Array.from(this.parts.values())
            .sort((a, b) => a.zOrder - b.zOrder);
        
        for (const part of partsArray) {
            if (!part.visible) continue;
            
            this.renderPart(ctx, part, size, options);
        }

        ctx.restore();
    }

    /**
     * Render individual part
     */
    renderPart(ctx, part, size, options) {
        const world = part.transform.getWorldTransform();

        ctx.save();

        // Apply part transform - world gives us position in sprite space (0-1)
        ctx.translate(world.x * size, world.y * size);
        ctx.rotate(world.rotation);
        ctx.scale(world.scaleX, world.scaleY);

        // Apply effects
        ctx.globalAlpha = part.opacity * (options.opacity || 1.0);

        // Render geometry - handle array or single geometry
        const geometries = Array.isArray(part.geometry) ? part.geometry : [part.geometry];
        const tint = part.tint || options.tint;
        
        for (const geom of geometries) {
            this.drawGeometry(ctx, geom, size, tint);
        }

        ctx.restore();
    }

    /**
     * Draw geometry - geometry coordinates are RELATIVE to the part's transform (already applied)
     * Geometries should be defined with coordinates around (0,0) to be centered on the part
     */
    drawGeometry(ctx, geom, size, tint) {
        ctx.save();

        const color = tint || geom.color || '#ffffff';

        // Apply per-geometry local offset (many sprite definitions rely on this)
        // Coordinates are in sprite-relative units (0-1-ish), so scale by size.
        if (geom.x || geom.y) {
            ctx.translate((geom.x || 0) * size, (geom.y || 0) * size);
        }
        
        if (geom.glow) {
            ctx.shadowColor = geom.glow.color || color;
            ctx.shadowBlur = (geom.glow.blur || 10) * (size / 100);
        }

        switch (geom.type) {
            case 'circle':
                // Circle centered at (0,0) - no offset needed
                ctx.beginPath();
                ctx.arc(0, 0, geom.radius * size, 0, Math.PI * 2);
                if (geom.fill) {
                    ctx.fillStyle = color;
                    ctx.fill();
                }
                if (geom.stroke) {
                    ctx.strokeStyle = geom.strokeColor || color;
                    ctx.lineWidth = (geom.strokeWidth || 1) * (size / 100);
                    ctx.stroke();
                }
                break;

            case 'rect':
                // Rectangle centered at (0,0)
                const rw = geom.width * size;
                const rh = geom.height * size;
                if (geom.fill) {
                    ctx.fillStyle = color;
                    ctx.fillRect(-rw/2, -rh/2, rw, rh);
                }
                if (geom.stroke) {
                    ctx.strokeStyle = geom.strokeColor || color;
                    ctx.lineWidth = (geom.strokeWidth || 1) * (size / 100);
                    ctx.strokeRect(-rw/2, -rh/2, rw, rh);
                }
                break;

            case 'ellipse':
                // Ellipse centered at (0,0)
                ctx.beginPath();
                ctx.ellipse(0, 0, (geom.width / 2) * size, (geom.height / 2) * size, 0, 0, Math.PI * 2);
                if (geom.fill) {
                    ctx.fillStyle = color;
                    ctx.fill();
                }
                if (geom.stroke) {
                    ctx.strokeStyle = geom.strokeColor || color;
                    ctx.lineWidth = (geom.strokeWidth || 1) * (size / 100);
                    ctx.stroke();
                }
                break;

            case 'polygon':
                // Polygon points should be defined relative to (0,0) center
                if (geom.points && geom.points.length > 0) {
                    ctx.beginPath();
                    ctx.moveTo(geom.points[0].x * size, geom.points[0].y * size);
                    for (let i = 1; i < geom.points.length; i++) {
                        ctx.lineTo(geom.points[i].x * size, geom.points[i].y * size);
                    }
                    ctx.closePath();
                    
                    if (geom.fill) {
                        ctx.fillStyle = color;
                        ctx.fill();
                    }
                    if (geom.stroke) {
                        ctx.strokeStyle = geom.strokeColor || color;
                        ctx.lineWidth = (geom.strokeWidth || 1) * (size / 100);
                        ctx.stroke();
                    }
                }
                break;

            case 'path':
                if (geom.path) {
                    const p = new Path2D(geom.path);
                    if (geom.fill) {
                        ctx.fillStyle = color;
                        ctx.fill(p);
                    }
                    if (geom.stroke) {
                        ctx.strokeStyle = geom.strokeColor || color;
                        ctx.lineWidth = (geom.strokeWidth || 1) * (size / 100);
                        ctx.stroke(p);
                    }
                }
                break;
        }

        ctx.restore();
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
}

// ============================================================================
// ANIMATION BUILDER - Helper to create animations easily
// ============================================================================

export class AnimationBuilder {
    /**
     * Create idle animation - subtle breathing/bobbing
     */
    static createIdleAnimation(parts, duration = 2.0) {
        const clip = new AnimationClip('idle', duration, true);

        // Head bobbing
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { y: 0 } },
                { time: duration * 0.5, transform: { y: -0.02 } },
                { time: duration, transform: { y: 0 } }
            ]);
        }

        // Body breathing
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { scaleY: 1.0 } },
                { time: duration * 0.5, transform: { scaleY: 1.03 } },
                { time: duration, transform: { scaleY: 1.0 } }
            ]);
        }

        return clip;
    }

    /**
     * Create walk animation - legs and body movement
     * VERY VISIBLE motion for clear walking effect
     */
    static createWalkAnimation(parts, duration = 0.8) {
        const clip = new AnimationClip('walk', duration, true);

        // Body bounce and sway - VERY pronounced
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0, rotation: 0.05, scaleY: 1.0 } },
                { time: duration * 0.25, transform: { y: -0.08, rotation: -0.08, scaleY: 0.95 } },
                { time: duration * 0.5, transform: { y: 0, rotation: -0.05, scaleY: 1.0 } },
                { time: duration * 0.75, transform: { y: -0.08, rotation: 0.08, scaleY: 0.95 } },
                { time: duration, transform: { y: 0, rotation: 0.05, scaleY: 1.0 } }
            ]);
        }

        // Head bobbing with tilt - more visible
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { y: 0, rotation: 0.08, x: 0 } },
                { time: duration * 0.25, transform: { y: -0.05, rotation: -0.12, x: -0.03 } },
                { time: duration * 0.5, transform: { y: 0.03, rotation: 0, x: 0 } },
                { time: duration * 0.75, transform: { y: -0.05, rotation: 0.12, x: 0.03 } },
                { time: duration, transform: { y: 0, rotation: 0.08, x: 0 } }
            ]);
        }

        // Shoulders sway opposite to body
        if (parts.includes('shoulders')) {
            clip.addTrack('shoulders', [
                { time: 0, transform: { rotation: -0.06 } },
                { time: duration * 0.25, transform: { rotation: 0.1 } },
                { time: duration * 0.5, transform: { rotation: 0.06 } },
                { time: duration * 0.75, transform: { rotation: -0.1 } },
                { time: duration, transform: { rotation: -0.06 } }
            ]);
        }

        // Left leg - LARGE swing for visibility
        if (parts.includes('legLeft')) {
            clip.addTrack('legLeft', [
                { time: 0, transform: { rotation: 0.6, y: -0.03 } },
                { time: duration * 0.25, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.5, transform: { rotation: -0.6, y: -0.03 } },
                { time: duration * 0.75, transform: { rotation: 0, y: 0 } },
                { time: duration, transform: { rotation: 0.6, y: -0.03 } }
            ]);
        }

        // Right leg (opposite phase) - LARGE swing
        if (parts.includes('legRight')) {
            clip.addTrack('legRight', [
                { time: 0, transform: { rotation: -0.6, y: -0.03 } },
                { time: duration * 0.25, transform: { rotation: 0, y: 0 } },
                { time: duration * 0.5, transform: { rotation: 0.6, y: -0.03 } },
                { time: duration * 0.75, transform: { rotation: 0, y: 0 } },
                { time: duration, transform: { rotation: -0.6, y: -0.03 } }
            ]);
        }

        // Arms swing
        if (parts.includes('armLeft')) {
            clip.addTrack('armLeft', [
                { time: 0, transform: { rotation: -0.4 } },
                { time: duration * 0.5, transform: { rotation: 0.4 } },
                { time: duration, transform: { rotation: -0.4 } }
            ]);
        }

        if (parts.includes('armRight')) {
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0.4 } },
                { time: duration * 0.5, transform: { rotation: -0.4 } },
                { time: duration, transform: { rotation: 0.4 } }
            ]);
        }

        // Horns bob with head movement
        if (parts.includes('hornLeft')) {
            clip.addTrack('hornLeft', [
                { time: 0, transform: { rotation: 0.15 } },
                { time: duration * 0.25, transform: { rotation: -0.2 } },
                { time: duration * 0.5, transform: { rotation: 0 } },
                { time: duration * 0.75, transform: { rotation: 0.2 } },
                { time: duration, transform: { rotation: 0.15 } }
            ]);
        }

        if (parts.includes('hornRight')) {
            clip.addTrack('hornRight', [
                { time: 0, transform: { rotation: -0.1 } },
                { time: duration * 0.25, transform: { rotation: 0.15 } },
                { time: duration * 0.5, transform: { rotation: 0 } },
                { time: duration * 0.75, transform: { rotation: -0.15 } },
                { time: duration, transform: { rotation: -0.1 } }
            ]);
        }

        // Shoulder pauldrons sway
        if (parts.includes('shoulderLeft')) {
            clip.addTrack('shoulderLeft', [
                { time: 0, transform: { y: 0, rotation: 0.05 } },
                { time: duration * 0.25, transform: { y: -0.02, rotation: -0.03 } },
                { time: duration * 0.5, transform: { y: 0, rotation: -0.05 } },
                { time: duration * 0.75, transform: { y: -0.02, rotation: 0.03 } },
                { time: duration, transform: { y: 0, rotation: 0.05 } }
            ]);
        }

        if (parts.includes('shoulderRight')) {
            clip.addTrack('shoulderRight', [
                { time: 0, transform: { y: 0, rotation: -0.05 } },
                { time: duration * 0.25, transform: { y: -0.02, rotation: 0.03 } },
                { time: duration * 0.5, transform: { y: 0, rotation: 0.05 } },
                { time: duration * 0.75, transform: { y: -0.02, rotation: -0.03 } },
                { time: duration, transform: { y: 0, rotation: -0.05 } }
            ]);
        }

        return clip;
    }

    /**
     * Create attack animation - wind up and strike
     */
    static createAttackAnimation(parts, duration = 0.5) {
        const clip = new AnimationClip('attack', duration, false);

        // Body wind-up and strike
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { rotation: 0, scaleX: 1.0 } },
                { time: duration * 0.3, transform: { rotation: -0.15, scaleX: 0.95 } },
                { time: duration * 0.5, transform: { rotation: 0.2, scaleX: 1.1 } },
                { time: duration, transform: { rotation: 0, scaleX: 1.0 } }
            ]);
        }

        // Head follows body
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.3, transform: { rotation: -0.1 } },
                { time: duration * 0.5, transform: { rotation: 0.15 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        // Attacking arm
        if (parts.includes('armRight')) {
            clip.addTrack('armRight', [
                { time: 0, transform: { rotation: 0 } },
                { time: duration * 0.3, transform: { rotation: -0.8 } },
                { time: duration * 0.5, transform: { rotation: 0.6 } },
                { time: duration, transform: { rotation: 0 } }
            ]);
        }

        return clip;
    }

    /**
     * Create hit reaction animation
     */
    static createHitAnimation(parts, duration = 0.3) {
        const clip = new AnimationClip('hit', duration, false);

        // Full body recoil
        for (const partName of parts) {
            clip.addTrack(partName, [
                { time: 0, transform: { x: 0, scaleX: 1.0 } },
                { time: duration * 0.3, transform: { x: -0.05, scaleX: 0.9 } },
                { time: duration, transform: { x: 0, scaleX: 1.0 } }
            ]);
        }

        return clip;
    }

    /**
     * Create death animation - collapse
     */
    static createDeathAnimation(parts, duration = 1.0) {
        const clip = new AnimationClip('death', duration, false);

        // Body collapse
        if (parts.includes('body')) {
            clip.addTrack('body', [
                { time: 0, transform: { y: 0, rotation: 0, scaleY: 1.0 } },
                { time: duration * 0.3, transform: { y: -0.02, rotation: 0, scaleY: 1.1 } },
                { time: duration * 0.6, transform: { y: 0.1, rotation: -0.3, scaleY: 0.8 } },
                { time: duration, transform: { y: 0.2, rotation: -1.57, scaleY: 0.6 } }
            ]);
        }

        // Head falls
        if (parts.includes('head')) {
            clip.addTrack('head', [
                { time: 0, transform: { y: 0, rotation: 0 } },
                { time: duration * 0.4, transform: { y: -0.01, rotation: 0.2 } },
                { time: duration, transform: { y: 0.15, rotation: 0.8 } }
            ]);
        }

        // Limbs collapse
        const limbs = ['armLeft', 'armRight', 'legLeft', 'legRight'];
        for (const limb of limbs) {
            if (parts.includes(limb)) {
                clip.addTrack(limb, [
                    { time: 0, transform: { rotation: 0 } },
                    { time: duration * 0.5, transform: { rotation: Math.random() * 0.5 - 0.25 } },
                    { time: duration, transform: { rotation: Math.random() * 1.0 - 0.5 } }
                ]);
            }
        }

        return clip;
    }
}


