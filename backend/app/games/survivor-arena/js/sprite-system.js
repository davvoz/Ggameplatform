/**
 * Survivor Arena - Professional Sprite Animation System
 * Multi-part skeletal animation with smooth interpolation
 * Unique cyberpunk/neon aesthetic
 */



// ============================================================================
// TRANSFORM - Hierarchical transform system
// ============================================================================

class Transform2D {
    constructor(x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1) {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        this.parent = null;
        this.children = [];
    }

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

        const pw = this.parent.getWorldTransform();
        const cos = Math.cos(pw.rotation);
        const sin = Math.sin(pw.rotation);
        const lx = this.x * pw.scaleX;
        const ly = this.y * pw.scaleY;

        return {
            x: pw.x + (lx * cos - ly * sin),
            y: pw.y + (lx * sin + ly * cos),
            rotation: pw.rotation + this.rotation,
            scaleX: pw.scaleX * this.scaleX,
            scaleY: pw.scaleY * this.scaleY
        };
    }

    addChild(child) {
        child.parent = this;
        this.children.push(child);
    }
}

// ============================================================================
// SPRITE PART - Individual animated component
// ============================================================================

class SpritePart {
    constructor(name, geometry, pivotX = 0.5, pivotY = 0.5, zOrder = 0) {
        this.name = name;
        this.geometry = geometry;
        this.transform = new Transform2D();
        this.pivotX = pivotX;
        this.pivotY = pivotY;
        this.visible = true;
        this.opacity = 1.0;
        this.tint = null;
        this.zOrder = zOrder;
        this.baseTransform = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    }

    setBaseTransform(x, y, rotation = 0, scaleX = 1, scaleY = 1) {
        this.baseTransform = { x, y, rotation, scaleX, scaleY };
        Object.assign(this.transform, this.baseTransform);
    }

    applyAnimation(anim) {
        this.transform.x = this.baseTransform.x + (anim.x || 0);
        this.transform.y = this.baseTransform.y + (anim.y || 0);
        this.transform.rotation = this.baseTransform.rotation + (anim.rotation || 0);
        this.transform.scaleX = this.baseTransform.scaleX * (anim.scaleX || 1);
        this.transform.scaleY = this.baseTransform.scaleY * (anim.scaleY || 1);
    }

    resetToBase() {
        Object.assign(this.transform, this.baseTransform);
    }
}

// ============================================================================
// ANIMATION CLIP - Keyframe animation data
// ============================================================================

class AnimationClip {
    constructor(name, duration, loop = true) {
        this.name = name;
        this.duration = duration;
        this.loop = loop;
        this.tracks = {};
    }

    addTrack(partName, keyframes) {
        keyframes.sort((a, b) => a.time - b.time);
        this.tracks[partName] = keyframes;
    }

    sample(time) {
        const result = {};
        let sampleTime = time;

        if (this.loop && time >= this.duration) {
            sampleTime = time % this.duration;
        } else if (!this.loop && time >= this.duration) {
            sampleTime = this.duration;
        }

        for (const [partName, keyframes] of Object.entries(this.tracks)) {
            result[partName] = this.sampleTrack(keyframes, sampleTime);
        }

        return result;
    }

    sampleTrack(keyframes, time) {
        if (keyframes.length === 0) return {};
        if (keyframes.length === 1 || time <= keyframes[0].time) {
            return keyframes[0].transform;
        }

        let prev = keyframes[0];
        let next = keyframes[keyframes.length - 1];

        for (let i = 0; i < keyframes.length - 1; i++) {
            if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
                prev = keyframes[i];
                next = keyframes[i + 1];
                break;
            }
        }

        const duration = next.time - prev.time;
        const t = duration > 0 ? (time - prev.time) / duration : 0;
        const smoothT = t * t * (3 - 2 * t); // smoothstep

        return {
            x: this.lerp(prev.transform.x || 0, next.transform.x || 0, smoothT),
            y: this.lerp(prev.transform.y || 0, next.transform.y || 0, smoothT),
            rotation: this.lerp(prev.transform.rotation || 0, next.transform.rotation || 0, smoothT),
            scaleX: this.lerp(prev.transform.scaleX || 1, next.transform.scaleX || 1, smoothT),
            scaleY: this.lerp(prev.transform.scaleY || 1, next.transform.scaleY || 1, smoothT)
        };
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }
}

// ============================================================================
// MULTI-PART SPRITE - Animated sprite container
// ============================================================================

class MultiPartSprite {
    constructor(name) {
        this.name = name;
        this.parts = new Map();
        this.animations = new Map();
        this.currentAnimation = null;
        this.animationTime = 0;
        this.playbackSpeed = 1.0;
        this.playing = false;
        this.rootTransform = new Transform2D();
        this.onAnimationComplete = null;
    }

    addPart(name, geometry, pivotX = 0.5, pivotY = 0.5, zOrder = 0) {
        const part = new SpritePart(name, geometry, pivotX, pivotY, zOrder);
        this.parts.set(name, part);
        return part;
    }

    setParent(childName, parentName) {
        const child = this.parts.get(childName);
        const parent = this.parts.get(parentName);
        if (child && parent) {
            parent.transform.addChild(child.transform);
        }
    }

    addAnimation(clip) {
        this.animations.set(clip.name, clip);
    }

    play(animName, restart = false) {
        const anim = this.animations.get(animName);
        if (!anim) return;

        if (this.currentAnimation !== animName || restart) {
            this.currentAnimation = animName;
            this.animationTime = 0;
        }
        this.playing = true;
    }

    stop() {
        this.playing = false;
    }

    update(dt) {
        if (!this.playing || !this.currentAnimation) return;

        const anim = this.animations.get(this.currentAnimation);
        if (!anim) return;

        this.animationTime += dt * this.playbackSpeed;

        const transforms = anim.sample(this.animationTime);
        for (const [partName, transform] of Object.entries(transforms)) {
            const part = this.parts.get(partName);
            if (part) {
                part.applyAnimation(transform);
            }
        }

        if (!anim.loop && this.animationTime >= anim.duration) {
            this.playing = false;
            if (this.onAnimationComplete) {
                this.onAnimationComplete(this.currentAnimation);
            }
        }
    }

    render(ctx, x, y, size, options = {}) {
        ctx.save();
        ctx.translate(x, y);

        const root = this.rootTransform.getWorldTransform();
        ctx.translate(root.x * size, root.y * size);
        ctx.rotate(root.rotation);
        ctx.scale(root.scaleX, root.scaleY);

        const partsArray = Array.from(this.parts.values())
            .sort((a, b) => a.zOrder - b.zOrder);

        for (const part of partsArray) {
            if (!part.visible) continue;
            this.renderPart(ctx, part, size, options);
        }

        ctx.restore();
    }

    renderPart(ctx, part, size, options) {
        const world = part.transform.getWorldTransform();

        ctx.save();
        ctx.translate(world.x * size, world.y * size);
        ctx.rotate(world.rotation);
        ctx.scale(world.scaleX, world.scaleY);
        ctx.globalAlpha = part.opacity * (options.opacity || 1.0);

        const geometries = Array.isArray(part.geometry) ? part.geometry : [part.geometry];
        const tint = part.tint || options.tint;

        for (const geom of geometries) {
            SpriteRenderer.drawGeometry(ctx, geom, size, tint);
        }

        ctx.restore();
    }
}

// ============================================================================
// SPRITE RENDERER - Core rendering engine
// ============================================================================

const SpriteRenderer = {
    drawGeometry(ctx, geom, size, tint) {
        if (!geom) return;
        
        const color = tint || geom.color || '#ffffff';
        const { type } = geom;

        ctx.save();
        
        // Offset position if specified
        if (geom.x !== undefined || geom.y !== undefined) {
            ctx.translate((geom.x || 0) * size, (geom.y || 0) * size);
        }

        switch (type) {
            case 'circle':
                this.drawCircle(ctx, geom, size, color);
                break;
            case 'rect':
                this.drawRect(ctx, geom, size, color);
                break;
            case 'polygon':
                this.drawPolygon(ctx, geom, size, color);
                break;
            case 'path':
                this.drawPath(ctx, geom, size, color);
                break;
            case 'ellipse':
                this.drawEllipse(ctx, geom, size, color);
                break;
            case 'arc':
                this.drawArc(ctx, geom, size, color);
                break;
            case 'line':
                this.drawLine(ctx, geom, size, color);
                break;
            case 'gradient-circle':
                this.drawGradientCircle(ctx, geom, size);
                break;
        }

        ctx.restore();
    },

    drawCircle(ctx, geom, size, color) {
        ctx.beginPath();
        ctx.arc(0, 0, (geom.radius || 0.5) * size, 0, Math.PI * 2);
        if (geom.fill !== false) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (geom.stroke) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 0.05) * size;
            ctx.stroke();
        }
    },

    drawRect(ctx, geom, size, color) {
        const w = (geom.width || 0.5) * size;
        const h = (geom.height || 0.5) * size;
        if (geom.fill !== false) {
            ctx.fillStyle = color;
            ctx.fillRect(-w/2, -h/2, w, h);
        }
        if (geom.stroke) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 0.05) * size;
            ctx.strokeRect(-w/2, -h/2, w, h);
        }
    },

    drawPolygon(ctx, geom, size, color) {
        const points = geom.points;
        if (!points || points.length < 3) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x * size, points[0].y * size);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x * size, points[i].y * size);
        }
        ctx.closePath();

        if (geom.fill !== false) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (geom.stroke) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 0.05) * size;
            ctx.stroke();
        }
    },

    drawPath(ctx, geom, size, color) {
        const points = geom.points;
        if (!points || points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x * size, points[0].y * size);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x * size, points[i].y * size);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = (geom.strokeWidth || 0.05) * size;
        ctx.lineCap = geom.lineCap || 'round';
        ctx.stroke();
    },

    drawEllipse(ctx, geom, size, color) {
        const w = (geom.width || 0.5) * size;
        const h = (geom.height || 0.3) * size;
        ctx.beginPath();
        ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2);
        if (geom.fill !== false) {
            ctx.fillStyle = color;
            ctx.fill();
        }
        if (geom.stroke) {
            ctx.strokeStyle = geom.strokeColor || color;
            ctx.lineWidth = (geom.strokeWidth || 0.05) * size;
            ctx.stroke();
        }
    },

    drawArc(ctx, geom, size, color) {
        ctx.beginPath();
        ctx.arc(0, 0, (geom.radius || 0.3) * size, geom.startAngle || 0, geom.endAngle || Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = (geom.strokeWidth || 0.1) * size;
        ctx.lineCap = 'round';
        ctx.stroke();
    },

    drawLine(ctx, geom, size, color) {
        ctx.beginPath();
        ctx.moveTo((geom.x1 || 0) * size, (geom.y1 || 0) * size);
        ctx.lineTo((geom.x2 || 0) * size, (geom.y2 || 0) * size);
        ctx.strokeStyle = color;
        ctx.lineWidth = (geom.strokeWidth || 0.05) * size;
        ctx.lineCap = 'round';
        ctx.stroke();
    },

    drawGradientCircle(ctx, geom, size) {
        const r = (geom.radius || 0.5) * size;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        gradient.addColorStop(0, geom.innerColor || '#ffffff');
        gradient.addColorStop(1, geom.outerColor || '#000000');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
};

// ============================================================================
// SPRITE FACTORY - Creates pre-configured sprites
// ============================================================================

const SpriteFactory = {
    // ========== PLAYER SPRITES ==========
    createPlayer() {
        const sprite = new MultiPartSprite('player');

        // Body (main torso) - cyberpunk style
        sprite.addPart('body', [
            // Core body
            { type: 'ellipse', width: 0.5, height: 0.6, color: '#1a237e', x: 0, y: 0 },
            // Armor plates
            { type: 'polygon', points: [
                {x: -0.2, y: -0.15}, {x: 0.2, y: -0.15},
                {x: 0.15, y: 0.15}, {x: -0.15, y: 0.15}
            ], color: '#3949ab' },
            // Energy core
            { type: 'circle', radius: 0.08, color: '#00e5ff', x: 0, y: 0 },
            { type: 'circle', radius: 0.05, color: '#ffffff', x: 0, y: 0 }
        ], 0.5, 0.5, 1);

        // Head with visor
        const head = sprite.addPart('head', [
            // Head base
            { type: 'circle', radius: 0.15, color: '#283593', x: 0, y: 0 },
            // Visor
            { type: 'arc', radius: 0.12, startAngle: -0.7, endAngle: 0.7, color: '#00e5ff', strokeWidth: 0.06 },
            // Antenna
            { type: 'line', x1: 0.08, y1: -0.1, x2: 0.12, y2: -0.2, color: '#00e5ff', strokeWidth: 0.02 },
            { type: 'circle', radius: 0.02, color: '#00e5ff', x: 0.12, y: -0.2 }
        ], 0.5, 0.5, 2);
        head.setBaseTransform(0, -0.32);

        // Left arm
        const leftArm = sprite.addPart('leftArm', [
            { type: 'ellipse', width: 0.12, height: 0.25, color: '#3949ab' },
            { type: 'circle', radius: 0.04, color: '#00e5ff', x: 0, y: 0.08 }
        ], 0.5, 0, 0);
        leftArm.setBaseTransform(-0.22, -0.05);

        // Right arm
        const rightArm = sprite.addPart('rightArm', [
            { type: 'ellipse', width: 0.12, height: 0.25, color: '#3949ab' },
            { type: 'circle', radius: 0.04, color: '#00e5ff', x: 0, y: 0.08 }
        ], 0.5, 0, 0);
        rightArm.setBaseTransform(0.22, -0.05);

        // Legs
        const leftLeg = sprite.addPart('leftLeg', [
            { type: 'ellipse', width: 0.1, height: 0.22, color: '#1a237e' },
            { type: 'rect', width: 0.08, height: 0.06, color: '#00e5ff', x: 0, y: 0.1 }
        ], 0.5, 0, 0);
        leftLeg.setBaseTransform(-0.1, 0.28);

        const rightLeg = sprite.addPart('rightLeg', [
            { type: 'ellipse', width: 0.1, height: 0.22, color: '#1a237e' },
            { type: 'rect', width: 0.08, height: 0.06, color: '#00e5ff', x: 0, y: 0.1 }
        ], 0.5, 0, 0);
        rightLeg.setBaseTransform(0.1, 0.28);

        // Shield effect (hidden by default)
        const shield = sprite.addPart('shield', [
            { type: 'circle', radius: 0.55, color: '#00e5ff', fill: false, stroke: true, strokeWidth: 0.03 }
        ], 0.5, 0.5, 3);
        shield.visible = false;

        // Add animations
        this.addPlayerAnimations(sprite);

        return sprite;
    },

    addPlayerAnimations(sprite) {
        // Idle animation - breathing effect
        const idle = new AnimationClip('idle', 1.5, true);
        idle.addTrack('body', [
            { time: 0, transform: { scaleY: 1 } },
            { time: 0.75, transform: { scaleY: 1.03 } },
            { time: 1.5, transform: { scaleY: 1 } }
        ]);
        idle.addTrack('head', [
            { time: 0, transform: { y: 0 } },
            { time: 0.75, transform: { y: -0.01 } },
            { time: 1.5, transform: { y: 0 } }
        ]);
        sprite.addAnimation(idle);

        // Walk animation
        const walk = new AnimationClip('walk', 0.5, true);
        walk.addTrack('leftArm', [
            { time: 0, transform: { rotation: 0.3 } },
            { time: 0.25, transform: { rotation: -0.3 } },
            { time: 0.5, transform: { rotation: 0.3 } }
        ]);
        walk.addTrack('rightArm', [
            { time: 0, transform: { rotation: -0.3 } },
            { time: 0.25, transform: { rotation: 0.3 } },
            { time: 0.5, transform: { rotation: -0.3 } }
        ]);
        walk.addTrack('leftLeg', [
            { time: 0, transform: { rotation: -0.4 } },
            { time: 0.25, transform: { rotation: 0.4 } },
            { time: 0.5, transform: { rotation: -0.4 } }
        ]);
        walk.addTrack('rightLeg', [
            { time: 0, transform: { rotation: 0.4 } },
            { time: 0.25, transform: { rotation: -0.4 } },
            { time: 0.5, transform: { rotation: 0.4 } }
        ]);
        walk.addTrack('body', [
            { time: 0, transform: { y: 0 } },
            { time: 0.125, transform: { y: -0.02 } },
            { time: 0.25, transform: { y: 0 } },
            { time: 0.375, transform: { y: -0.02 } },
            { time: 0.5, transform: { y: 0 } }
        ]);
        sprite.addAnimation(walk);

        // Damage animation
        const damage = new AnimationClip('damage', 0.3, false);
        damage.addTrack('body', [
            { time: 0, transform: { scaleX: 1, scaleY: 1 } },
            { time: 0.1, transform: { scaleX: 1.1, scaleY: 0.9 } },
            { time: 0.3, transform: { scaleX: 1, scaleY: 1 } }
        ]);
        sprite.addAnimation(damage);

        // Attack animation
        const attack = new AnimationClip('attack', 0.2, false);
        attack.addTrack('rightArm', [
            { time: 0, transform: { rotation: 0, x: 0 } },
            { time: 0.1, transform: { rotation: -1, x: 0.1 } },
            { time: 0.2, transform: { rotation: 0, x: 0 } }
        ]);
        sprite.addAnimation(attack);
    },

    // ========== ENEMY SPRITES ==========
    
    // Basic Zombie
    createZombie() {
        const sprite = new MultiPartSprite('zombie');

        // Body - rotting green
        sprite.addPart('body', [
            { type: 'ellipse', width: 0.45, height: 0.55, color: '#2e7d32' },
            // Torn clothes
            { type: 'polygon', points: [
                {x: -0.15, y: -0.1}, {x: 0.12, y: -0.08},
                {x: 0.18, y: 0.15}, {x: -0.1, y: 0.18}
            ], color: '#5d4037' },
            // Exposed ribs
            { type: 'line', x1: -0.08, y1: 0, x2: 0.08, y2: 0.02, color: '#e8f5e9', strokeWidth: 0.02 },
            { type: 'line', x1: -0.07, y1: 0.06, x2: 0.07, y2: 0.07, color: '#e8f5e9', strokeWidth: 0.02 }
        ], 0.5, 0.5, 1);

        // Head with glowing eyes
        const head = sprite.addPart('head', [
            { type: 'circle', radius: 0.14, color: '#388e3c' },
            // Bite marks
            { type: 'arc', radius: 0.1, startAngle: 0.5, endAngle: 1.2, color: '#1b5e20', strokeWidth: 0.03 },
            // Eyes
            { type: 'circle', radius: 0.03, color: '#ff1744', x: -0.05, y: -0.02 },
            { type: 'circle', radius: 0.03, color: '#ff1744', x: 0.05, y: -0.02 },
            // Glowing pupils
            { type: 'circle', radius: 0.015, color: '#ffffff', x: -0.05, y: -0.02 },
            { type: 'circle', radius: 0.015, color: '#ffffff', x: 0.05, y: -0.02 }
        ], 0.5, 0.5, 2);
        head.setBaseTransform(0, -0.28);

        // Arms - reaching forward
        const leftArm = sprite.addPart('leftArm', [
            { type: 'ellipse', width: 0.1, height: 0.28, color: '#2e7d32' },
            { type: 'circle', radius: 0.04, color: '#1b5e20', x: 0, y: 0.12 } // Hand
        ], 0.5, 0, 0);
        leftArm.setBaseTransform(-0.2, -0.05);

        const rightArm = sprite.addPart('rightArm', [
            { type: 'ellipse', width: 0.1, height: 0.28, color: '#2e7d32' },
            { type: 'circle', radius: 0.04, color: '#1b5e20', x: 0, y: 0.12 }
        ], 0.5, 0, 0);
        rightArm.setBaseTransform(0.2, -0.05);

        // Legs - shambling
        const leftLeg = sprite.addPart('leftLeg', [
            { type: 'ellipse', width: 0.09, height: 0.2, color: '#2e7d32' }
        ], 0.5, 0, 0);
        leftLeg.setBaseTransform(-0.08, 0.26);

        const rightLeg = sprite.addPart('rightLeg', [
            { type: 'ellipse', width: 0.09, height: 0.2, color: '#2e7d32' }
        ], 0.5, 0, 0);
        rightLeg.setBaseTransform(0.08, 0.26);

        this.addZombieAnimations(sprite);
        return sprite;
    },

    addZombieAnimations(sprite) {
        // Shamble walk
        const walk = new AnimationClip('walk', 0.8, true);
        walk.addTrack('body', [
            { time: 0, transform: { rotation: -0.05 } },
            { time: 0.4, transform: { rotation: 0.05 } },
            { time: 0.8, transform: { rotation: -0.05 } }
        ]);
        walk.addTrack('head', [
            { time: 0, transform: { rotation: 0.1 } },
            { time: 0.4, transform: { rotation: -0.1 } },
            { time: 0.8, transform: { rotation: 0.1 } }
        ]);
        walk.addTrack('leftArm', [
            { time: 0, transform: { rotation: 0.5, y: 0.05 } },
            { time: 0.4, transform: { rotation: 0.3, y: -0.05 } },
            { time: 0.8, transform: { rotation: 0.5, y: 0.05 } }
        ]);
        walk.addTrack('rightArm', [
            { time: 0, transform: { rotation: 0.3, y: -0.05 } },
            { time: 0.4, transform: { rotation: 0.5, y: 0.05 } },
            { time: 0.8, transform: { rotation: 0.3, y: -0.05 } }
        ]);
        walk.addTrack('leftLeg', [
            { time: 0, transform: { rotation: -0.3 } },
            { time: 0.4, transform: { rotation: 0.2 } },
            { time: 0.8, transform: { rotation: -0.3 } }
        ]);
        walk.addTrack('rightLeg', [
            { time: 0, transform: { rotation: 0.2 } },
            { time: 0.4, transform: { rotation: -0.3 } },
            { time: 0.8, transform: { rotation: 0.2 } }
        ]);
        sprite.addAnimation(walk);

        // Attack
        const attack = new AnimationClip('attack', 0.4, false);
        attack.addTrack('leftArm', [
            { time: 0, transform: { rotation: 0.5 } },
            { time: 0.2, transform: { rotation: -0.8 } },
            { time: 0.4, transform: { rotation: 0.5 } }
        ]);
        attack.addTrack('rightArm', [
            { time: 0, transform: { rotation: 0.3 } },
            { time: 0.2, transform: { rotation: -0.8 } },
            { time: 0.4, transform: { rotation: 0.3 } }
        ]);
        sprite.addAnimation(attack);
    },

    // Fast Runner
    createRunner() {
        const sprite = new MultiPartSprite('runner');

        // Sleek body
        sprite.addPart('body', [
            { type: 'ellipse', width: 0.35, height: 0.5, color: '#7b1fa2' },
            { type: 'polygon', points: [
                {x: -0.1, y: -0.15}, {x: 0.1, y: -0.15},
                {x: 0.15, y: 0.1}, {x: -0.15, y: 0.1}
            ], color: '#9c27b0' },
            // Speed lines
            { type: 'line', x1: -0.18, y1: 0, x2: -0.25, y2: 0, color: '#e1bee7', strokeWidth: 0.02 },
            { type: 'line', x1: -0.18, y1: 0.05, x2: -0.22, y2: 0.05, color: '#e1bee7', strokeWidth: 0.015 }
        ], 0.5, 0.5, 1);

        // Angular head
        const head = sprite.addPart('head', [
            { type: 'polygon', points: [
                {x: 0, y: -0.12}, {x: 0.1, y: -0.02},
                {x: 0.08, y: 0.08}, {x: -0.08, y: 0.08}, {x: -0.1, y: -0.02}
            ], color: '#8e24aa' },
            // Glowing eyes
            { type: 'ellipse', width: 0.08, height: 0.03, color: '#ffeb3b', x: 0, y: 0 }
        ], 0.5, 0.5, 2);
        head.setBaseTransform(0.05, -0.28);

        // Long arms
        const leftArm = sprite.addPart('leftArm', [
            { type: 'ellipse', width: 0.08, height: 0.3, color: '#7b1fa2' },
            { type: 'polygon', points: [
                {x: -0.03, y: 0.12}, {x: 0.03, y: 0.12}, {x: 0, y: 0.2}
            ], color: '#4a148c' } // Claw
        ], 0.5, 0, 0);
        leftArm.setBaseTransform(-0.18, -0.08);

        const rightArm = sprite.addPart('rightArm', [
            { type: 'ellipse', width: 0.08, height: 0.3, color: '#7b1fa2' },
            { type: 'polygon', points: [
                {x: -0.03, y: 0.12}, {x: 0.03, y: 0.12}, {x: 0, y: 0.2}
            ], color: '#4a148c' }
        ], 0.5, 0, 0);
        rightArm.setBaseTransform(0.18, -0.08);

        // Athletic legs
        const leftLeg = sprite.addPart('leftLeg', [
            { type: 'ellipse', width: 0.08, height: 0.22, color: '#7b1fa2' }
        ], 0.5, 0, 0);
        leftLeg.setBaseTransform(-0.07, 0.24);

        const rightLeg = sprite.addPart('rightLeg', [
            { type: 'ellipse', width: 0.08, height: 0.22, color: '#7b1fa2' }
        ], 0.5, 0, 0);
        rightLeg.setBaseTransform(0.07, 0.24);

        this.addRunnerAnimations(sprite);
        return sprite;
    },

    addRunnerAnimations(sprite) {
        // Fast run
        const walk = new AnimationClip('walk', 0.25, true);
        walk.addTrack('body', [
            { time: 0, transform: { rotation: 0.2, y: 0 } },
            { time: 0.125, transform: { rotation: 0.15, y: -0.03 } },
            { time: 0.25, transform: { rotation: 0.2, y: 0 } }
        ]);
        walk.addTrack('leftArm', [
            { time: 0, transform: { rotation: -0.8 } },
            { time: 0.125, transform: { rotation: 0.6 } },
            { time: 0.25, transform: { rotation: -0.8 } }
        ]);
        walk.addTrack('rightArm', [
            { time: 0, transform: { rotation: 0.6 } },
            { time: 0.125, transform: { rotation: -0.8 } },
            { time: 0.25, transform: { rotation: 0.6 } }
        ]);
        walk.addTrack('leftLeg', [
            { time: 0, transform: { rotation: -0.7 } },
            { time: 0.125, transform: { rotation: 0.7 } },
            { time: 0.25, transform: { rotation: -0.7 } }
        ]);
        walk.addTrack('rightLeg', [
            { time: 0, transform: { rotation: 0.7 } },
            { time: 0.125, transform: { rotation: -0.7 } },
            { time: 0.25, transform: { rotation: 0.7 } }
        ]);
        sprite.addAnimation(walk);
    },

    // Tank enemy - big and slow
    createTank() {
        const sprite = new MultiPartSprite('tank');

        // Massive body
        sprite.addPart('body', [
            { type: 'ellipse', width: 0.7, height: 0.75, color: '#37474f' },
            // Armor plating
            { type: 'rect', width: 0.5, height: 0.4, color: '#455a64', x: 0, y: -0.05 },
            { type: 'rect', width: 0.45, height: 0.35, color: '#546e7a', x: 0, y: -0.05 },
            // Rivets
            { type: 'circle', radius: 0.025, color: '#263238', x: -0.15, y: -0.15 },
            { type: 'circle', radius: 0.025, color: '#263238', x: 0.15, y: -0.15 },
            { type: 'circle', radius: 0.025, color: '#263238', x: -0.15, y: 0.08 },
            { type: 'circle', radius: 0.025, color: '#263238', x: 0.15, y: 0.08 }
        ], 0.5, 0.5, 1);

        // Small head
        const head = sprite.addPart('head', [
            { type: 'circle', radius: 0.1, color: '#455a64' },
            // Angry eyes
            { type: 'rect', width: 0.08, height: 0.025, color: '#ff5722', x: -0.03, y: -0.02 },
            { type: 'rect', width: 0.08, height: 0.025, color: '#ff5722', x: 0.03, y: -0.02 }
        ], 0.5, 0.5, 2);
        head.setBaseTransform(0, -0.35);

        // Huge arms
        const leftArm = sprite.addPart('leftArm', [
            { type: 'ellipse', width: 0.18, height: 0.35, color: '#455a64' },
            { type: 'circle', radius: 0.08, color: '#37474f', x: 0, y: 0.15 } // Fist
        ], 0.5, 0, 0);
        leftArm.setBaseTransform(-0.32, -0.05);

        const rightArm = sprite.addPart('rightArm', [
            { type: 'ellipse', width: 0.18, height: 0.35, color: '#455a64' },
            { type: 'circle', radius: 0.08, color: '#37474f', x: 0, y: 0.15 }
        ], 0.5, 0, 0);
        rightArm.setBaseTransform(0.32, -0.05);

        // Thick legs
        const leftLeg = sprite.addPart('leftLeg', [
            { type: 'ellipse', width: 0.14, height: 0.22, color: '#37474f' }
        ], 0.5, 0, 0);
        leftLeg.setBaseTransform(-0.12, 0.32);

        const rightLeg = sprite.addPart('rightLeg', [
            { type: 'ellipse', width: 0.14, height: 0.22, color: '#37474f' }
        ], 0.5, 0, 0);
        rightLeg.setBaseTransform(0.12, 0.32);

        this.addTankAnimations(sprite);
        return sprite;
    },

    addTankAnimations(sprite) {
        // Heavy stomp walk
        const walk = new AnimationClip('walk', 1.0, true);
        walk.addTrack('body', [
            { time: 0, transform: { y: 0 } },
            { time: 0.25, transform: { y: -0.02 } },
            { time: 0.5, transform: { y: 0.02 } },
            { time: 0.75, transform: { y: -0.02 } },
            { time: 1.0, transform: { y: 0 } }
        ]);
        walk.addTrack('leftArm', [
            { time: 0, transform: { rotation: 0.15 } },
            { time: 0.5, transform: { rotation: -0.15 } },
            { time: 1.0, transform: { rotation: 0.15 } }
        ]);
        walk.addTrack('rightArm', [
            { time: 0, transform: { rotation: -0.15 } },
            { time: 0.5, transform: { rotation: 0.15 } },
            { time: 1.0, transform: { rotation: -0.15 } }
        ]);
        walk.addTrack('leftLeg', [
            { time: 0, transform: { rotation: -0.2 } },
            { time: 0.5, transform: { rotation: 0.2 } },
            { time: 1.0, transform: { rotation: -0.2 } }
        ]);
        walk.addTrack('rightLeg', [
            { time: 0, transform: { rotation: 0.2 } },
            { time: 0.5, transform: { rotation: -0.2 } },
            { time: 1.0, transform: { rotation: 0.2 } }
        ]);
        sprite.addAnimation(walk);

        // Ground pound attack
        const attack = new AnimationClip('attack', 0.6, false);
        attack.addTrack('leftArm', [
            { time: 0, transform: { rotation: 0, y: 0 } },
            { time: 0.2, transform: { rotation: -1.2, y: -0.1 } },
            { time: 0.4, transform: { rotation: 0.5, y: 0.15 } },
            { time: 0.6, transform: { rotation: 0, y: 0 } }
        ]);
        attack.addTrack('rightArm', [
            { time: 0, transform: { rotation: 0, y: 0 } },
            { time: 0.2, transform: { rotation: 1.2, y: -0.1 } },
            { time: 0.4, transform: { rotation: -0.5, y: 0.15 } },
            { time: 0.6, transform: { rotation: 0, y: 0 } }
        ]);
        attack.addTrack('body', [
            { time: 0, transform: { y: 0 } },
            { time: 0.2, transform: { y: -0.05 } },
            { time: 0.4, transform: { y: 0.08 } },
            { time: 0.6, transform: { y: 0 } }
        ]);
        sprite.addAnimation(attack);
    },

    // Shooter enemy - ranged
    createShooter() {
        const sprite = new MultiPartSprite('shooter');

        // Slim body
        sprite.addPart('body', [
            { type: 'ellipse', width: 0.35, height: 0.45, color: '#c62828' },
            { type: 'rect', width: 0.25, height: 0.2, color: '#d32f2f', x: 0, y: 0 }
        ], 0.5, 0.5, 1);

        // Head with targeting eye
        const head = sprite.addPart('head', [
            { type: 'circle', radius: 0.12, color: '#b71c1c' },
            // Single targeting eye
            { type: 'circle', radius: 0.06, color: '#000000', x: 0, y: 0 },
            { type: 'circle', radius: 0.04, color: '#ffeb3b', x: 0, y: 0 },
            { type: 'circle', radius: 0.015, color: '#000000', x: 0, y: 0 }
        ], 0.5, 0.5, 2);
        head.setBaseTransform(0, -0.26);

        // Gun arm
        const gunArm = sprite.addPart('gunArm', [
            { type: 'ellipse', width: 0.1, height: 0.2, color: '#c62828' },
            // Gun barrel
            { type: 'rect', width: 0.06, height: 0.2, color: '#424242', x: 0, y: 0.15 },
            { type: 'rect', width: 0.08, height: 0.06, color: '#616161', x: 0, y: 0.08 }
        ], 0.5, 0, 0);
        gunArm.setBaseTransform(0.18, -0.05);

        const leftArm = sprite.addPart('leftArm', [
            { type: 'ellipse', width: 0.08, height: 0.18, color: '#c62828' }
        ], 0.5, 0, 0);
        leftArm.setBaseTransform(-0.16, -0.05);

        // Legs
        const leftLeg = sprite.addPart('leftLeg', [
            { type: 'ellipse', width: 0.08, height: 0.18, color: '#b71c1c' }
        ], 0.5, 0, 0);
        leftLeg.setBaseTransform(-0.06, 0.22);

        const rightLeg = sprite.addPart('rightLeg', [
            { type: 'ellipse', width: 0.08, height: 0.18, color: '#b71c1c' }
        ], 0.5, 0, 0);
        rightLeg.setBaseTransform(0.06, 0.22);

        this.addShooterAnimations(sprite);
        return sprite;
    },

    addShooterAnimations(sprite) {
        const walk = new AnimationClip('walk', 0.6, true);
        walk.addTrack('leftLeg', [
            { time: 0, transform: { rotation: -0.3 } },
            { time: 0.3, transform: { rotation: 0.3 } },
            { time: 0.6, transform: { rotation: -0.3 } }
        ]);
        walk.addTrack('rightLeg', [
            { time: 0, transform: { rotation: 0.3 } },
            { time: 0.3, transform: { rotation: -0.3 } },
            { time: 0.6, transform: { rotation: 0.3 } }
        ]);
        sprite.addAnimation(walk);

        // Shoot animation
        const attack = new AnimationClip('attack', 0.3, false);
        attack.addTrack('gunArm', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.1, transform: { rotation: -0.15, x: 0.02 } },
            { time: 0.3, transform: { rotation: 0 } }
        ]);
        sprite.addAnimation(attack);
    },

    // Exploder enemy
    createExploder() {
        const sprite = new MultiPartSprite('exploder');

        // Bloated body
        sprite.addPart('body', [
            { type: 'circle', radius: 0.35, color: '#ff6f00' },
            // Pulsing core
            { type: 'circle', radius: 0.2, color: '#ffab00' },
            { type: 'circle', radius: 0.1, color: '#fff8e1' },
            // Warning symbols
            { type: 'polygon', points: [
                {x: 0, y: -0.15}, {x: 0.12, y: 0.08}, {x: -0.12, y: 0.08}
            ], color: '#000000' },
            { type: 'rect', width: 0.03, height: 0.1, color: '#000000', x: 0, y: -0.05 },
            { type: 'circle', radius: 0.02, color: '#000000', x: 0, y: 0.02 }
        ], 0.5, 0.5, 1);

        // Tiny head
        const head = sprite.addPart('head', [
            { type: 'circle', radius: 0.08, color: '#e65100' },
            { type: 'circle', radius: 0.025, color: '#ff0000', x: -0.025, y: -0.01 },
            { type: 'circle', radius: 0.025, color: '#ff0000', x: 0.025, y: -0.01 }
        ], 0.5, 0.5, 2);
        head.setBaseTransform(0, -0.32);

        // Stubby limbs
        sprite.addPart('leftArm', [
            { type: 'ellipse', width: 0.08, height: 0.15, color: '#e65100' }
        ], 0.5, 0, 0).setBaseTransform(-0.28, 0);

        sprite.addPart('rightArm', [
            { type: 'ellipse', width: 0.08, height: 0.15, color: '#e65100' }
        ], 0.5, 0, 0).setBaseTransform(0.28, 0);

        sprite.addPart('leftLeg', [
            { type: 'ellipse', width: 0.08, height: 0.12, color: '#e65100' }
        ], 0.5, 0, 0).setBaseTransform(-0.1, 0.28);

        sprite.addPart('rightLeg', [
            { type: 'ellipse', width: 0.08, height: 0.12, color: '#e65100' }
        ], 0.5, 0, 0).setBaseTransform(0.1, 0.28);

        this.addExploderAnimations(sprite);
        return sprite;
    },

    addExploderAnimations(sprite) {
        // Waddling walk with pulsing
        const walk = new AnimationClip('walk', 0.5, true);
        walk.addTrack('body', [
            { time: 0, transform: { scaleX: 1, scaleY: 1, rotation: -0.05 } },
            { time: 0.25, transform: { scaleX: 1.05, scaleY: 0.95, rotation: 0.05 } },
            { time: 0.5, transform: { scaleX: 1, scaleY: 1, rotation: -0.05 } }
        ]);
        walk.addTrack('leftLeg', [
            { time: 0, transform: { rotation: -0.3 } },
            { time: 0.25, transform: { rotation: 0.3 } },
            { time: 0.5, transform: { rotation: -0.3 } }
        ]);
        walk.addTrack('rightLeg', [
            { time: 0, transform: { rotation: 0.3 } },
            { time: 0.25, transform: { rotation: -0.3 } },
            { time: 0.5, transform: { rotation: 0.3 } }
        ]);
        sprite.addAnimation(walk);

        // About to explode
        const attack = new AnimationClip('attack', 0.8, false);
        attack.addTrack('body', [
            { time: 0, transform: { scaleX: 1, scaleY: 1 } },
            { time: 0.2, transform: { scaleX: 1.1, scaleY: 1.1 } },
            { time: 0.4, transform: { scaleX: 1.15, scaleY: 1.15 } },
            { time: 0.6, transform: { scaleX: 1.25, scaleY: 1.25 } },
            { time: 0.8, transform: { scaleX: 1.5, scaleY: 1.5 } }
        ]);
        sprite.addAnimation(attack);
    },

    // Ghost/Phaser enemy - can go through obstacles
    createGhost() {
        const sprite = new MultiPartSprite('ghost');

        // Ethereal body
        sprite.addPart('body', [
            { type: 'gradient-circle', radius: 0.35, innerColor: 'rgba(156, 39, 176, 0.8)', outerColor: 'rgba(156, 39, 176, 0)' },
            { type: 'ellipse', width: 0.4, height: 0.5, color: 'rgba(186, 104, 200, 0.6)' }
        ], 0.5, 0.5, 1);

        // Ghostly face
        const head = sprite.addPart('head', [
            { type: 'ellipse', width: 0.3, height: 0.25, color: 'rgba(206, 147, 216, 0.7)' },
            // Hollow eyes
            { type: 'ellipse', width: 0.08, height: 0.12, color: '#000000', x: -0.06, y: 0 },
            { type: 'ellipse', width: 0.08, height: 0.12, color: '#000000', x: 0.06, y: 0 },
            // Eye glow
            { type: 'circle', radius: 0.02, color: '#e1bee7', x: -0.06, y: 0 },
            { type: 'circle', radius: 0.02, color: '#e1bee7', x: 0.06, y: 0 }
        ], 0.5, 0.5, 2);
        head.setBaseTransform(0, -0.15);

        // Wispy tail
        sprite.addPart('tail', [
            { type: 'polygon', points: [
                {x: -0.15, y: 0}, {x: 0.15, y: 0},
                {x: 0.1, y: 0.15}, {x: 0, y: 0.25}, {x: -0.1, y: 0.15}
            ], color: 'rgba(156, 39, 176, 0.4)' }
        ], 0.5, 0, 0).setBaseTransform(0, 0.2);

        this.addGhostAnimations(sprite);
        return sprite;
    },

    addGhostAnimations(sprite) {
        // Floating idle
        const walk = new AnimationClip('walk', 1.2, true);
        walk.addTrack('body', [
            { time: 0, transform: { y: 0, scaleX: 1, scaleY: 1 } },
            { time: 0.3, transform: { y: -0.05, scaleX: 1.02, scaleY: 0.98 } },
            { time: 0.6, transform: { y: 0, scaleX: 1, scaleY: 1 } },
            { time: 0.9, transform: { y: 0.03, scaleX: 0.98, scaleY: 1.02 } },
            { time: 1.2, transform: { y: 0, scaleX: 1, scaleY: 1 } }
        ]);
        walk.addTrack('tail', [
            { time: 0, transform: { rotation: 0.1 } },
            { time: 0.4, transform: { rotation: -0.1 } },
            { time: 0.8, transform: { rotation: 0.1 } },
            { time: 1.2, transform: { rotation: 0.1 } }
        ]);
        sprite.addAnimation(walk);
    },

    // ========== MINI-BOSS SPRITES ==========
    
    createMiniBoss() {
        const sprite = new MultiPartSprite('miniboss');

        // Large armored body
        sprite.addPart('body', [
            { type: 'ellipse', width: 0.8, height: 0.85, color: '#880e4f' },
            // Armor
            { type: 'polygon', points: [
                {x: -0.3, y: -0.25}, {x: 0.3, y: -0.25},
                {x: 0.35, y: 0.2}, {x: -0.35, y: 0.2}
            ], color: '#ad1457' },
            { type: 'polygon', points: [
                {x: -0.25, y: -0.2}, {x: 0.25, y: -0.2},
                {x: 0.28, y: 0.15}, {x: -0.28, y: 0.15}
            ], color: '#c2185b' },
            // Core
            { type: 'circle', radius: 0.1, color: '#ff4081' },
            { type: 'circle', radius: 0.06, color: '#ff80ab' }
        ], 0.5, 0.5, 1);

        // Horned head
        const head = sprite.addPart('head', [
            { type: 'circle', radius: 0.18, color: '#880e4f' },
            // Horns
            { type: 'polygon', points: [
                {x: -0.12, y: -0.08}, {x: -0.08, y: -0.08}, {x: -0.2, y: -0.25}
            ], color: '#4a0025' },
            { type: 'polygon', points: [
                {x: 0.12, y: -0.08}, {x: 0.08, y: -0.08}, {x: 0.2, y: -0.25}
            ], color: '#4a0025' },
            // Glowing eyes
            { type: 'ellipse', width: 0.1, height: 0.04, color: '#ffeb3b', x: 0, y: 0 }
        ], 0.5, 0.5, 2);
        head.setBaseTransform(0, -0.4);

        // Massive arms
        const leftArm = sprite.addPart('leftArm', [
            { type: 'ellipse', width: 0.2, height: 0.4, color: '#ad1457' },
            { type: 'circle', radius: 0.1, color: '#880e4f', x: 0, y: 0.18 }
        ], 0.5, 0, 0);
        leftArm.setBaseTransform(-0.38, -0.08);

        const rightArm = sprite.addPart('rightArm', [
            { type: 'ellipse', width: 0.2, height: 0.4, color: '#ad1457' },
            { type: 'circle', radius: 0.1, color: '#880e4f', x: 0, y: 0.18 }
        ], 0.5, 0, 0);
        rightArm.setBaseTransform(0.38, -0.08);

        // Heavy legs
        const leftLeg = sprite.addPart('leftLeg', [
            { type: 'ellipse', width: 0.15, height: 0.25, color: '#880e4f' }
        ], 0.5, 0, 0);
        leftLeg.setBaseTransform(-0.15, 0.38);

        const rightLeg = sprite.addPart('rightLeg', [
            { type: 'ellipse', width: 0.15, height: 0.25, color: '#880e4f' }
        ], 0.5, 0, 0);
        rightLeg.setBaseTransform(0.15, 0.38);

        this.addMiniBossAnimations(sprite);
        return sprite;
    },

    addMiniBossAnimations(sprite) {
        // Powerful walk
        const walk = new AnimationClip('walk', 0.8, true);
        walk.addTrack('body', [
            { time: 0, transform: { y: 0 } },
            { time: 0.2, transform: { y: -0.02 } },
            { time: 0.4, transform: { y: 0.02 } },
            { time: 0.6, transform: { y: -0.02 } },
            { time: 0.8, transform: { y: 0 } }
        ]);
        walk.addTrack('leftArm', [
            { time: 0, transform: { rotation: 0.2 } },
            { time: 0.4, transform: { rotation: -0.2 } },
            { time: 0.8, transform: { rotation: 0.2 } }
        ]);
        walk.addTrack('rightArm', [
            { time: 0, transform: { rotation: -0.2 } },
            { time: 0.4, transform: { rotation: 0.2 } },
            { time: 0.8, transform: { rotation: -0.2 } }
        ]);
        walk.addTrack('leftLeg', [
            { time: 0, transform: { rotation: -0.25 } },
            { time: 0.4, transform: { rotation: 0.25 } },
            { time: 0.8, transform: { rotation: -0.25 } }
        ]);
        walk.addTrack('rightLeg', [
            { time: 0, transform: { rotation: 0.25 } },
            { time: 0.4, transform: { rotation: -0.25 } },
            { time: 0.8, transform: { rotation: 0.25 } }
        ]);
        sprite.addAnimation(walk);

        // Devastating attack
        const attack = new AnimationClip('attack', 0.5, false);
        attack.addTrack('leftArm', [
            { time: 0, transform: { rotation: 0, y: 0 } },
            { time: 0.15, transform: { rotation: -1.5, y: -0.1 } },
            { time: 0.35, transform: { rotation: 0.3, y: 0.1 } },
            { time: 0.5, transform: { rotation: 0, y: 0 } }
        ]);
        attack.addTrack('rightArm', [
            { time: 0, transform: { rotation: 0, y: 0 } },
            { time: 0.15, transform: { rotation: 1.5, y: -0.1 } },
            { time: 0.35, transform: { rotation: -0.3, y: 0.1 } },
            { time: 0.5, transform: { rotation: 0, y: 0 } }
        ]);
        sprite.addAnimation(attack);
    },

    // ========== BOSS SPRITE ==========
    
    createBoss() {
        const sprite = new MultiPartSprite('boss');

        // Massive core body
        sprite.addPart('body', [
            { type: 'ellipse', width: 1.0, height: 1.1, color: '#1a1a2e' },
            // Outer shell
            { type: 'circle', radius: 0.45, color: '#16213e', fill: false, stroke: true, strokeWidth: 0.08 },
            // Inner armor
            { type: 'polygon', points: [
                {x: -0.35, y: -0.3}, {x: 0.35, y: -0.3},
                {x: 0.4, y: 0.25}, {x: -0.4, y: 0.25}
            ], color: '#0f3460' },
            // Power core
            { type: 'circle', radius: 0.15, color: '#e94560' },
            { type: 'circle', radius: 0.1, color: '#ff6b6b' },
            { type: 'circle', radius: 0.05, color: '#ffffff' }
        ], 0.5, 0.5, 1);

        // Crown/Head
        const head = sprite.addPart('head', [
            { type: 'polygon', points: [
                {x: -0.2, y: 0.05}, {x: -0.15, y: -0.15}, {x: 0, y: -0.25},
                {x: 0.15, y: -0.15}, {x: 0.2, y: 0.05}
            ], color: '#e94560' },
            // Crown spikes
            { type: 'polygon', points: [{x: -0.15, y: -0.15}, {x: -0.12, y: -0.1}, {x: -0.2, y: -0.3}], color: '#ff6b6b' },
            { type: 'polygon', points: [{x: 0, y: -0.25}, {x: 0.03, y: -0.18}, {x: 0, y: -0.4}], color: '#ff6b6b' },
            { type: 'polygon', points: [{x: 0.15, y: -0.15}, {x: 0.12, y: -0.1}, {x: 0.2, y: -0.3}], color: '#ff6b6b' },
            // Menacing eyes
            { type: 'ellipse', width: 0.15, height: 0.05, color: '#ffffff', x: 0, y: 0 },
            { type: 'ellipse', width: 0.08, height: 0.04, color: '#e94560', x: 0, y: 0 }
        ], 0.5, 0.5, 3);
        head.setBaseTransform(0, -0.48);

        // Massive blade arms
        const leftArm = sprite.addPart('leftArm', [
            { type: 'ellipse', width: 0.22, height: 0.5, color: '#16213e' },
            // Blade
            { type: 'polygon', points: [
                {x: -0.05, y: 0.2}, {x: 0.05, y: 0.2},
                {x: 0.02, y: 0.45}, {x: -0.02, y: 0.45}
            ], color: '#e94560' }
        ], 0.5, 0, 0);
        leftArm.setBaseTransform(-0.48, -0.1);

        const rightArm = sprite.addPart('rightArm', [
            { type: 'ellipse', width: 0.22, height: 0.5, color: '#16213e' },
            { type: 'polygon', points: [
                {x: -0.05, y: 0.2}, {x: 0.05, y: 0.2},
                {x: 0.02, y: 0.45}, {x: -0.02, y: 0.45}
            ], color: '#e94560' }
        ], 0.5, 0, 0);
        rightArm.setBaseTransform(0.48, -0.1);

        // Powerful legs
        const leftLeg = sprite.addPart('leftLeg', [
            { type: 'ellipse', width: 0.18, height: 0.3, color: '#1a1a2e' },
            { type: 'rect', width: 0.15, height: 0.08, color: '#e94560', x: 0, y: 0.12 }
        ], 0.5, 0, 0);
        leftLeg.setBaseTransform(-0.18, 0.48);

        const rightLeg = sprite.addPart('rightLeg', [
            { type: 'ellipse', width: 0.18, height: 0.3, color: '#1a1a2e' },
            { type: 'rect', width: 0.15, height: 0.08, color: '#e94560', x: 0, y: 0.12 }
        ], 0.5, 0, 0);
        rightLeg.setBaseTransform(0.18, 0.48);

        // Wings/Spikes
        sprite.addPart('leftWing', [
            { type: 'polygon', points: [
                {x: 0, y: 0}, {x: -0.15, y: -0.2}, {x: -0.25, y: 0}, {x: -0.15, y: 0.15}
            ], color: '#e94560' }
        ], 1, 0.5, 0).setBaseTransform(-0.4, -0.2);

        sprite.addPart('rightWing', [
            { type: 'polygon', points: [
                {x: 0, y: 0}, {x: 0.15, y: -0.2}, {x: 0.25, y: 0}, {x: 0.15, y: 0.15}
            ], color: '#e94560' }
        ], 0, 0.5, 0).setBaseTransform(0.4, -0.2);

        this.addBossAnimations(sprite);
        return sprite;
    },

    addBossAnimations(sprite) {
        // Menacing idle
        const idle = new AnimationClip('idle', 2.0, true);
        idle.addTrack('body', [
            { time: 0, transform: { scaleX: 1, scaleY: 1 } },
            { time: 1.0, transform: { scaleX: 1.02, scaleY: 1.02 } },
            { time: 2.0, transform: { scaleX: 1, scaleY: 1 } }
        ]);
        idle.addTrack('leftWing', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.5, transform: { rotation: -0.1 } },
            { time: 1.0, transform: { rotation: 0 } },
            { time: 1.5, transform: { rotation: 0.1 } },
            { time: 2.0, transform: { rotation: 0 } }
        ]);
        idle.addTrack('rightWing', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.5, transform: { rotation: 0.1 } },
            { time: 1.0, transform: { rotation: 0 } },
            { time: 1.5, transform: { rotation: -0.1 } },
            { time: 2.0, transform: { rotation: 0 } }
        ]);
        sprite.addAnimation(idle);

        // Walk
        const walk = new AnimationClip('walk', 1.0, true);
        walk.addTrack('body', [
            { time: 0, transform: { y: 0 } },
            { time: 0.25, transform: { y: -0.02 } },
            { time: 0.5, transform: { y: 0 } },
            { time: 0.75, transform: { y: -0.02 } },
            { time: 1.0, transform: { y: 0 } }
        ]);
        walk.addTrack('leftArm', [
            { time: 0, transform: { rotation: 0.15 } },
            { time: 0.5, transform: { rotation: -0.15 } },
            { time: 1.0, transform: { rotation: 0.15 } }
        ]);
        walk.addTrack('rightArm', [
            { time: 0, transform: { rotation: -0.15 } },
            { time: 0.5, transform: { rotation: 0.15 } },
            { time: 1.0, transform: { rotation: -0.15 } }
        ]);
        walk.addTrack('leftLeg', [
            { time: 0, transform: { rotation: -0.2 } },
            { time: 0.5, transform: { rotation: 0.2 } },
            { time: 1.0, transform: { rotation: -0.2 } }
        ]);
        walk.addTrack('rightLeg', [
            { time: 0, transform: { rotation: 0.2 } },
            { time: 0.5, transform: { rotation: -0.2 } },
            { time: 1.0, transform: { rotation: 0.2 } }
        ]);
        sprite.addAnimation(walk);

        // Devastating slash
        const attack = new AnimationClip('attack', 0.6, false);
        attack.addTrack('leftArm', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.2, transform: { rotation: -2.0 } },
            { time: 0.4, transform: { rotation: 1.0 } },
            { time: 0.6, transform: { rotation: 0 } }
        ]);
        attack.addTrack('rightArm', [
            { time: 0, transform: { rotation: 0 } },
            { time: 0.2, transform: { rotation: 2.0 } },
            { time: 0.4, transform: { rotation: -1.0 } },
            { time: 0.6, transform: { rotation: 0 } }
        ]);
        attack.addTrack('body', [
            { time: 0, transform: { scaleX: 1 } },
            { time: 0.3, transform: { scaleX: 1.1 } },
            { time: 0.6, transform: { scaleX: 1 } }
        ]);
        sprite.addAnimation(attack);
    }
};

// ============================================================================
// SPRITE MANAGER - Caches and manages sprite instances
// ============================================================================

class SpriteManager {
    constructor() {
        this.spriteCache = new Map();
        this.templates = new Map();
        
        // Pre-register all templates
        this.registerTemplate('player', () => SpriteFactory.createPlayer());
        this.registerTemplate('zombie', () => SpriteFactory.createZombie());
        this.registerTemplate('runner', () => SpriteFactory.createRunner());
        this.registerTemplate('tank', () => SpriteFactory.createTank());
        this.registerTemplate('shooter', () => SpriteFactory.createShooter());
        this.registerTemplate('exploder', () => SpriteFactory.createExploder());
        this.registerTemplate('ghost', () => SpriteFactory.createGhost());
        this.registerTemplate('miniboss', () => SpriteFactory.createMiniBoss());
        this.registerTemplate('boss', () => SpriteFactory.createBoss());
    }

    registerTemplate(name, factory) {
        this.templates.set(name, factory);
    }

    createSprite(type) {
        const factory = this.templates.get(type);
        if (!factory) {
            console.warn(`Unknown sprite type: ${type}`);
            return null;
        }
        return factory();
    }

    getOrCreate(id, type) {
        if (!this.spriteCache.has(id)) {
            const sprite = this.createSprite(type);
            if (sprite) {
                this.spriteCache.set(id, sprite);
            }
        }
        return this.spriteCache.get(id);
    }

    remove(id) {
        this.spriteCache.delete(id);
    }

    clear() {
        this.spriteCache.clear();
    }
}

// Global instance
const spriteManager = new SpriteManager();

export { spriteManager, SpriteFactory, MultiPartSprite, AnimationClip };