// Utility Functions
class Utils {
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    static randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    static weightedRandom(items) {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let item of items) {
            if (random < item.weight) {
                return item;
            }
            random -= item.weight;
        }
        
        return items[items.length - 1];
    }

    static lerp(start, end, t) {
        return start + (end - start) * t;
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static getScreenDimensions() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.toString(16));
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    static playSound(scene, key, volume = 1) {
        if (GAME_CONFIG.AUDIO_ENABLED && scene.sound) {
            scene.sound.play(key, { volume: volume * GAME_CONFIG.SFX_VOLUME });
        }
    }

    static vibrate(pattern = [100]) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
}

// Pooling system for better performance
class ObjectPool {
    constructor(createFunc, resetFunc, initialSize = 10) {
        this.createFunc = createFunc;
        this.resetFunc = resetFunc;
        this.available = [];
        this.inUse = new Set();
        
        // Pre-create objects
        for (let i = 0; i < initialSize; i++) {
            this.available.push(this.createFunc());
        }
    }

    get() {
        let obj;
        if (this.available.length > 0) {
            obj = this.available.pop();
        } else {
            obj = this.createFunc();
        }
        this.inUse.add(obj);
        return obj;
    }

    release(obj) {
        if (this.inUse.has(obj)) {
            this.inUse.delete(obj);
            this.resetFunc(obj);
            this.available.push(obj);
        }
    }

    releaseAll() {
        this.inUse.forEach(obj => {
            this.resetFunc(obj);
            this.available.push(obj);
        });
        this.inUse.clear();
    }

    destroy() {
        this.available = [];
        this.inUse.clear();
    }
}
