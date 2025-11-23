/**
 * InputManager - Handles keyboard, mouse, and touch input
 * Implements Observer Pattern
 */
export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = new Set();
        this.touchActive = false;
        this.mouseDown = false;
        this.jumpPressed = false;
        this.jumpPressTime = 0;
        this.listeners = {
            jump: [],
            jumpRelease: [],
            click: [],
            turbo: [],
            flight: [],
            flightUp: [],
            flightDown: []
        };

        // Assicura che il canvas possa ricevere il focus della tastiera
        if (this.canvas) {
            this.canvas.setAttribute('tabindex', '1');
            this.canvas.style.outline = 'none';
        }
        
        // Riferimento al textCanvas per gestire i click sulle UI
        this.textCanvas = document.getElementById('textCanvas');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse events su entrambi i canvas
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        if (this.textCanvas) {
            this.textCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            this.textCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            this.textCanvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
            this.textCanvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            this.textCanvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        }

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Prevent default touch behaviors
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        
        if (!this.keys.has(key)) {
            this.keys.add(key);
            
            // Turbo activation with 'A' key
            if (key === 'd') {
                event.preventDefault();
                this.notifyListeners('turbo');
            }
            
            // Flight activation with 'D' key
            if (key === 'a') {
                event.preventDefault();
                this.notifyListeners('flight');
            }
            
            // Flight up with 'W' or Arrow Up
            if (key === 'w' || key === 'arrowup') {
                event.preventDefault();
                this.notifyListeners('flightUp');
                
                // Also trigger jump if not in flight mode
                if (!this.jumpPressed) {
                    this.jumpPressed = true;
                    this.jumpPressTime = performance.now();
                    this.triggerJump();
                }
            }
            
            // Flight down with 'S' or Arrow Down
            if (key === 's' || key === 'arrowdown') {
                event.preventDefault();
                this.notifyListeners('flightDown');
            }
            
            // Jump with Space
            if (key === ' ') {
                event.preventDefault();
                if (!this.jumpPressed) {
                    this.jumpPressed = true;
                    this.jumpPressTime = performance.now();
                    this.triggerJump();
                }
            }
        }
    }

    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        this.keys.delete(key);
        
        if (key === ' ' || key === 'arrowup' || key === 'w') {
            if (this.jumpPressed) {
                const pressDuration = performance.now() - this.jumpPressTime;
                this.jumpPressed = false;
                this.triggerJumpRelease(pressDuration);
            }
        }
    }

    handleMouseDown(event) {
        event.preventDefault();
        
        // Get click position - usa event.target per gestire sia gameCanvas che textCanvas
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Notify click listeners
        this.notifyListeners('click', { x, y });
        
        if (!this.mouseDown) {
            this.mouseDown = true;
            this.jumpPressed = true;
            this.jumpPressTime = performance.now();
            this.triggerJump();
        }
    }

    handleMouseUp(event) {
        if (this.mouseDown) {
            const pressDuration = performance.now() - this.jumpPressTime;
            this.mouseDown = false;
            this.jumpPressed = false;
            this.triggerJumpRelease(pressDuration);
        }
    }

    handleTouchStart(event) {
        event.preventDefault();
        
        // Get touch position
        if (event.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.touches[0].clientX - rect.left;
            const y = event.touches[0].clientY - rect.top;
            
            // Notify click listeners
            this.notifyListeners('click', { x, y });
        }
        
        if (!this.touchActive) {
            this.touchActive = true;
            this.jumpPressed = true;
            this.jumpPressTime = performance.now();
            this.triggerJump();
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        if (this.touchActive) {
            const pressDuration = performance.now() - this.jumpPressTime;
            this.touchActive = false;
            this.jumpPressed = false;
            this.triggerJumpRelease(pressDuration);
        }
    }

    triggerJump() {
        this.notifyListeners('jump');
    }

    triggerJumpRelease(duration) {
        this.notifyListeners('jumpRelease', duration);
    }

    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    isKeyPressed(key) {
        return this.keys.has(key.toLowerCase());
    }

    isJumpPressed() {
        return this.keys.has(' ') || 
               this.keys.has('arrowup') || 
               this.keys.has('w') ||
               this.mouseDown ||
               this.touchActive;
    }

    cleanup() {
        this.keys.clear();
        this.touchActive = false;
        this.mouseDown = false;
    }
}
