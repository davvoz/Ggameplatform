/**
 * Survivor Arena - Utility Functions
 * @fileoverview Common utility functions used throughout the game
 */

'use strict';

/**
 * Vector2D class for 2D math operations
 */
class Vector2 {
    /**
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * Create a copy of this vector
     * @returns {Vector2}
     */
    clone() {
        return new Vector2(this.x, this.y);
    }

    /**
     * Set vector components
     * @param {number} x 
     * @param {number} y 
     * @returns {Vector2}
     */
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    /**
     * Add another vector
     * @param {Vector2} v 
     * @returns {Vector2}
     */
    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    /**
     * Subtract another vector
     * @param {Vector2} v 
     * @returns {Vector2}
     */
    subtract(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    /**
     * Multiply by scalar
     * @param {number} scalar 
     * @returns {Vector2}
     */
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    /**
     * Get vector magnitude (length)
     * @returns {number}
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Get squared magnitude (faster, no sqrt)
     * @returns {number}
     */
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }

    /**
     * Normalize vector to unit length
     * @returns {Vector2}
     */
    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.x /= mag;
            this.y /= mag;
        }
        return this;
    }

    /**
     * Get distance to another vector
     * @param {Vector2} v 
     * @returns {number}
     */
    distanceTo(v) {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get squared distance (faster)
     * @param {Vector2} v 
     * @returns {number}
     */
    distanceToSquared(v) {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return dx * dx + dy * dy;
    }

    /**
     * Get angle to another vector in radians
     * @param {Vector2} v 
     * @returns {number}
     */
    angleTo(v) {
        return Math.atan2(v.y - this.y, v.x - this.x);
    }

    /**
     * Get direction vector towards target
     * @param {Vector2} target 
     * @returns {Vector2}
     */
    directionTo(target) {
        return new Vector2(target.x - this.x, target.y - this.y).normalize();
    }

    /**
     * Rotate vector by angle
     * @param {number} angle - Angle in radians
     * @returns {Vector2}
     */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const newX = this.x * cos - this.y * sin;
        const newY = this.x * sin + this.y * cos;
        this.x = newX;
        this.y = newY;
        return this;
    }

    /**
     * Linear interpolation towards target
     * @param {Vector2} target 
     * @param {number} t - Interpolation factor (0-1)
     * @returns {Vector2}
     */
    lerp(target, t) {
        this.x += (target.x - this.x) * t;
        this.y += (target.y - this.y) * t;
        return this;
    }

    /**
     * Limit vector magnitude
     * @param {number} max 
     * @returns {Vector2}
     */
    limit(max) {
        const magSq = this.magnitudeSquared();
        if (magSq > max * max) {
            this.normalize().multiply(max);
        }
        return this;
    }

    /**
     * Create vector from angle
     * @param {number} angle - Angle in radians
     * @param {number} magnitude 
     * @returns {Vector2}
     */
    static fromAngle(angle, magnitude = 1) {
        return new Vector2(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        );
    }

    /**
     * Get zero vector
     * @returns {Vector2}
     */
    static zero() {
        return new Vector2(0, 0);
    }
}

/**
 * Math utility functions
 */
const MathUtils = {
    /**
     * Calculate distance between two points
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {number}
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Clamp value between min and max
     * @param {number} value 
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Linear interpolation
     * @param {number} start 
     * @param {number} end 
     * @param {number} t 
     * @returns {number}
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * Random float between min and max
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Random integer between min and max (inclusive)
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Convert degrees to radians
     * @param {number} degrees 
     * @returns {number}
     */
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    },

    /**
     * Convert radians to degrees
     * @param {number} radians 
     * @returns {number}
     */
    radToDeg(radians) {
        return radians * (180 / Math.PI);
    },

    /**
     * Check if two circles overlap
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} r1 
     * @param {number} x2 
     * @param {number} y2 
     * @param {number} r2 
     * @returns {boolean}
     */
    circleCollision(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const radiusSum = r1 + r2;
        return distSq < radiusSum * radiusSum;
    },

    /**
     * Check if point is inside circle
     * @param {number} px 
     * @param {number} py 
     * @param {number} cx 
     * @param {number} cy 
     * @param {number} radius 
     * @returns {boolean}
     */
    pointInCircle(px, py, cx, cy, radius) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy < radius * radius;
    },

    /**
     * Smooth step interpolation
     * @param {number} edge0 
     * @param {number} edge1 
     * @param {number} x 
     * @returns {number}
     */
    smoothStep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    },

    /**
     * Weighted random selection
     * @param {Array<{weight: number}>} items 
     * @returns {*}
     */
    weightedRandom(items) {
        const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
        let random = Math.random() * totalWeight;
        
        for (const item of items) {
            random -= item.weight || 1;
            if (random <= 0) {
                return item;
            }
        }
        return items[items.length - 1];
    }
};

/**
 * Object pool for efficient object reuse
 */
class ObjectPool {
    /**
     * @param {Function} createFn - Function to create new objects
     * @param {number} initialSize - Initial pool size
     */
    constructor(createFn, initialSize = 10) {
        this.createFn = createFn;
        this.pool = [];
        this.active = new Set();
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }

    /**
     * Get an object from the pool
     * @returns {*}
     */
    get() {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.createFn();
        }
        this.active.add(obj);
        return obj;
    }

    /**
     * Return an object to the pool
     * @param {*} obj 
     */
    release(obj) {
        if (this.active.has(obj)) {
            this.active.delete(obj);
            this.pool.push(obj);
        }
    }

    /**
     * Release all active objects
     */
    releaseAll() {
        for (const obj of this.active) {
            this.pool.push(obj);
        }
        this.active.clear();
    }

    /**
     * Get count of active objects
     * @returns {number}
     */
    getActiveCount() {
        return this.active.size;
    }
}

/**
 * Simple event emitter
 */
class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event 
     * @param {Function} callback 
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event 
     * @param {Function} callback 
     */
    off(event, callback) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit an event
     * @param {string} event 
     * @param  {...any} args 
     */
    emit(event, ...args) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            for (const callback of callbacks) {
                callback(...args);
            }
        }
    }

    /**
     * Clear all events
     */
    clear() {
        this.events.clear();
    }
}

/**
 * Spatial hash grid for efficient collision detection
 */
class SpatialHash {
    /**
     * @param {number} cellSize 
     */
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    /**
     * Get cell key for position
     * @param {number} x 
     * @param {number} y 
     * @returns {string}
     */
    getKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    /**
     * Insert object into grid
     * @param {*} obj - Object with x, y properties
     */
    insert(obj) {
        const key = this.getKey(obj.x, obj.y);
        if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
        }
        this.grid.get(key).add(obj);
    }

    /**
     * Remove object from grid
     * @param {*} obj 
     */
    remove(obj) {
        const key = this.getKey(obj.x, obj.y);
        const cell = this.grid.get(key);
        if (cell) {
            cell.delete(obj);
            if (cell.size === 0) {
                this.grid.delete(key);
            }
        }
    }

    /**
     * Update object position in grid
     * @param {*} obj 
     * @param {number} oldX 
     * @param {number} oldY 
     */
    update(obj, oldX, oldY) {
        const oldKey = this.getKey(oldX, oldY);
        const newKey = this.getKey(obj.x, obj.y);
        
        if (oldKey !== newKey) {
            this.remove({ x: oldX, y: oldY, ...obj });
            this.insert(obj);
        }
    }

    /**
     * Get nearby objects
     * @param {number} x 
     * @param {number} y 
     * @param {number} radius 
     * @returns {Array}
     */
    getNearby(x, y, radius = 1) {
        const results = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellY = Math.floor(y / this.cellSize);

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const key = `${centerCellX + dx},${centerCellY + dy}`;
                const cell = this.grid.get(key);
                if (cell) {
                    for (const obj of cell) {
                        results.push(obj);
                    }
                }
            }
        }
        return results;
    }

    /**
     * Clear the grid
     */
    clear() {
        this.grid.clear();
    }
}

/**
 * Format time in MM:SS
 * @param {number} seconds 
 * @returns {string}
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if device is mobile
 * @returns {boolean}
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
}

/**
 * Debounce function
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 * @param {Function} func 
 * @param {number} limit 
 * @returns {Function}
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => { inThrottle = false; }, limit);
        }
    };
}

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Vector2,
        MathUtils,
        ObjectPool,
        EventEmitter,
        SpatialHash,
        formatTime,
        isMobile,
        debounce,
        throttle
    };
}
