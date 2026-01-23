/**
 * Utility Functions
 * Helper functions for common operations
 */

export const Utils = {
    /**
     * Calculate distance between two points
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Calculate Manhattan distance
     */
    manhattanDistance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    },

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Map value from one range to another
     */
    map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    },

    /**
     * Random integer between min (inclusive) and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Random float between min and max
     */
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Random choice from array
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * Weighted random choice
     */
    weightedRandom(options) {
        const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const option of options) {
            random -= option.weight;
            if (random <= 0) {
                return option.value;
            }
        }
        
        return options[options.length - 1].value;
    },

    /**
     * Format number with commas
     */
    formatNumber(num) {
        return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Format time as MM:SS
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Easing functions
     */
    easing: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeOutElastic: t => {
            const p = 0.3;
            return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        },
        easeOutBounce: t => {
            if (t < 1 / 2.75) {
                return 7.5625 * t * t;
            } else if (t < 2 / 2.75) {
                return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
            } else if (t < 2.5 / 2.75) {
                return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
            } else {
                return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
            }
        }
    },

    /**
     * Check if point is in rectangle
     */
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    /**
     * Check if point is in rectangle with padding (larger hit area for touch)
     */
    pointInRectWithPadding(px, py, rx, ry, rw, rh, padding = 5) {
        return px >= (rx - padding) && px <= (rx + rw + padding) && 
               py >= (ry - padding) && py <= (ry + rh + padding);
    },

    /**
     * Check if two circles overlap
     */
    circlesOverlap(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const radiiSq = (r1 + r2) * (r1 + r2);
        return distSq < radiiSq;
    },

    /**
     * Convert grid position to pixel position
     */
    gridToPixel(col, row, cellSize) {
        return {
            x: col * cellSize + cellSize / 2,
            y: row * cellSize + cellSize / 2
        };
    },

    /**
     * Convert pixel position to grid position
     */
    pixelToGrid(x, y, cellSize) {
        return {
            col: Math.floor(x / cellSize),
            row: Math.floor(y / cellSize)
        };
    },

    /**
     * Get color with alpha
     */
    colorWithAlpha(color, alpha) {
        // Convert hex to rgba
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    },

    /**
     * Draw rounded rectangle
     */
    drawRoundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    },

    /**
     * Object pooling helper
     */
    createPool(factoryFn, resetFn, initialSize = 50) {
        const pool = {
            objects: [],
            active: [],
            
            init() {
                for (let i = 0; i < initialSize; i++) {
                    this.objects.push(factoryFn());
                }
            },
            
            get() {
                let obj;
                if (this.objects.length > 0) {
                    obj = this.objects.pop();
                } else {
                    obj = factoryFn();
                }
                this.active.push(obj);
                return obj;
            },
            
            release(obj) {
                const index = this.active.indexOf(obj);
                if (index !== -1) {
                    this.active.splice(index, 1);
                    resetFn(obj);
                    this.objects.push(obj);
                }
            },
            
            releaseAll() {
                while (this.active.length > 0) {
                    this.release(this.active[0]);
                }
            }
        };
        
        pool.init();
        return pool;
    },

    /**
     * Performance monitor
     */
    createPerformanceMonitor() {
        return {
            frameCount: 0,
            fps: 60,
            lastTime: performance.now(),
            
            update() {
                this.frameCount++;
                const currentTime = performance.now();
                
                if (currentTime - this.lastTime >= 1000) {
                    this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
                    this.frameCount = 0;
                    this.lastTime = currentTime;
                }
            },
            
            getFPS() {
                return this.fps;
            }
        };
    },

    /**
     * Shuffle array in place
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
