/**
 * GameEngine - Core game engine with WebGL rendering and game loop
 * Follows Single Responsibility Principle
 */
export class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = this.initWebGL();
        this.running = false;
        this.lastTime = 0;
        this.systems = [];
        this.entities = [];
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    initWebGL() {
        const gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true }) || 
                   this.canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        
        gl.clearColor(0.53, 0.81, 0.92, 1.0); // Sky blue
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Handle WebGL context loss/restore
        this.canvas.addEventListener('webglcontextlost', (e) => {
            console.warn('WebGL context lost');
            e.preventDefault();
            this.stop();
        }, false);
        
        this.canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
            this.gl = this.initWebGL();
            if (this.running) {
                this.start();
            }
        }, false);
        
        return gl;
    }

    resizeCanvas() {
        // Mobile-like aspect ratio on desktop, full screen on mobile
        const isMobile = window.innerWidth <= 768;
        
        let targetWidth, targetHeight;
        
        if (isMobile) {
            // Full screen on mobile
            targetWidth = window.innerWidth;
            targetHeight = window.innerHeight;
        } else {
            // Fixed mobile-like dimensions on desktop
            targetWidth = Math.min(450, window.innerWidth);
            targetHeight = Math.min(800, window.innerHeight);
        }
        
        // DON'T use DPR for canvas dimensions - use logical pixels only
        // WebGL will handle high-DPI rendering internally
        const canvasWidth = Math.floor(targetWidth);
        const canvasHeight = Math.floor(targetHeight);
        
        if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
            // Set canvas size to logical dimensions (no DPR multiplication)
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;
            
            // Set CSS size to match exactly
            this.canvas.style.width = canvasWidth + 'px';
            this.canvas.style.height = canvasHeight + 'px';
            
            console.log(`🖼️ Canvas resized: ${canvasWidth}x${canvasHeight}px | Mobile: ${isMobile}`);
            
            // Sync textCanvas dimensions
            const textCanvas = document.getElementById('textCanvas');
            if (textCanvas) {
                textCanvas.width = canvasWidth;
                textCanvas.height = canvasHeight;
                textCanvas.style.width = canvasWidth + 'px';
                textCanvas.style.height = canvasHeight + 'px';
            }
            
            if (this.gl) {
                this.gl.viewport(0, 0, canvasWidth, canvasHeight);
            }
            
            // Notify systems of resize (now using logical dimensions)
            for (const system of this.systems) {
                if (system.resize) {
                    system.resize(canvasWidth, canvasHeight);
                }
            }
        }
    }

    registerSystem(system) {
        this.systems.push(system);
    }

    addEntity(entity) {
        this.entities.push(entity);
    }

    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    stop() {
        this.running = false;
    }

    gameLoop() {
        if (!this.running) return;

        const currentTime = performance.now();
        let elapsed = currentTime - this.lastTime;
        
        // Se elapsed è 0, usa un valore minimo (1ms) invece di skippare
        if (elapsed <= 0) {
            elapsed = 1; // Minimo 1ms per evitare deltaTime = 0
        }
        
        // Se elapsed è troppo grande (es. tab inattivo o pause), usa un piccolo valore
        if (elapsed > 1000) { // Più di 1 secondo
            console.warn('⏰ Large time gap detected:', elapsed.toFixed(0), 'ms - using 16ms');
            elapsed = 16; // Simula 60 FPS
        }
        
        this.lastTime = currentTime;

        // Cap delta time to prevent spiral of death (max 100ms = 10 FPS minimum)
        const deltaTime = Math.min(elapsed / 1000, 0.1);
        
        this.update(deltaTime);
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        for (const system of this.systems) {
            if (system.update) {
                system.update(deltaTime, this.entities);
            }
        }
    }

    render() {
        const gl = this.gl;
        
        // Verify WebGL context is still valid
        if (!gl || gl.isContextLost()) {
            console.warn('WebGL context lost, skipping render');
            return;
        }
        
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (const system of this.systems) {
            if (system.render) {
                system.render(gl, this.entities);
            }
        }
    }

    getCanvasDimensions() {
        // Return canvas dimensions (now already in logical pixels)
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }
}
