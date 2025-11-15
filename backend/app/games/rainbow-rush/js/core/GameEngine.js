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
        this.deltaTime = 0;
        this.fps = 60;
        this.frameInterval = 1000 / this.fps;
        this.systems = [];
        this.entities = [];
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    initWebGL() {
        const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        
        gl.clearColor(0.53, 0.81, 0.92, 1.0); // Sky blue
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        return gl;
    }

    resizeCanvas() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            
            if (this.gl) {
                this.gl.viewport(0, 0, displayWidth, displayHeight);
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
        const elapsed = currentTime - this.lastTime;

        if (elapsed >= this.frameInterval) {
            this.deltaTime = elapsed / 1000;
            this.lastTime = currentTime - (elapsed % this.frameInterval);

            this.update(this.deltaTime);
            this.render();
        }

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
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (const system of this.systems) {
            if (system.render) {
                system.render(gl, this.entities);
            }
        }
    }

    getCanvasDimensions() {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }
}
