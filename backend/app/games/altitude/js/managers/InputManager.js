/**
 * InputManager - Unified input handling (keyboard + touch)
 * Single Responsibility: Abstract input sources into a consistent API.
 */

export class InputManager {
    #renderer;
    #keys = new Set();
    #touches = new Map();
    #leftPressed = false;
    #rightPressed = false;
    #upPressed = false;
    #downPressed = false;
    #jumpPressed = false;
    #jumpJustPressed = false;
    #glidePressed = false;
    #pauseJustPressed = false;
    #prevJump = false;
    #prevPause = false;
    #prevLeft = false;
    #prevRight = false;
    #prevUp = false;
    #prevDown = false;
    #leftJustPressed = false;
    #rightJustPressed = false;
    #upJustPressed = false;
    #downJustPressed = false;
    // Double-tap / double-press dash
    #dashLeftPending  = false;
    #dashRightPending = false;
    #dashLeftTimer    = 0;
    #dashRightTimer   = 0;
    static #DASH_WINDOW = 0.25; // seconds between two presses to count as dash
    // Tap position (touch end / mouse click)
    // Pending flags are set by async touch/mouse events and consumed on the next update() tick.
    #tapX = -1;
    #tapY = -1;
    #justTapped = false;
    #pendingTap = false;
    #pendingTapX = -1;
    #pendingTapY = -1;
    // Track whether the current left/right comes from keyboard only
    #keyLeftPressed = false;
    #keyRightPressed = false;

    constructor(renderer) {
        this.#renderer = renderer;
        this.#bindEvents();
    }

    #bindEvents() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.#keys.add(e.code);
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.#keys.delete(e.code);
        });

        // Touch
        const canvas = this.#renderer.canvas;
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                const pos = this.#renderer.pageToCanvas(touch.clientX, touch.clientY);
                this.#touches.set(touch.identifier, {
                    startX: pos.x,
                    startY: pos.y,
                    currentX: pos.x,
                    currentY: pos.y,
                });
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                const data = this.#touches.get(touch.identifier);
                if (data) {
                    const pos = this.#renderer.pageToCanvas(touch.clientX, touch.clientY);
                    data.currentX = pos.x;
                    data.currentY = pos.y;
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                const data = this.#touches.get(touch.identifier);
                if (data) {
                    const dx = data.currentX - data.startX;
                    const dy = data.currentY - data.startY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 20) {
                        this.#pendingTapX = data.currentX;
                        this.#pendingTapY = data.currentY;
                        this.#pendingTap = true;
                    } else if (dist > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                        // Horizontal swipe → dash
                        if (dx < 0) this.#dashLeftPending  = true;
                        else        this.#dashRightPending = true;
                    }
                }
                this.#touches.delete(touch.identifier);
            }
        }, { passive: false });

        canvas.addEventListener('touchcancel', (e) => {
            for (const touch of e.changedTouches) {
                this.#touches.delete(touch.identifier);
            }
        });

        // Mouse (for desktop testing)
        let mouseDown = false;
        canvas.addEventListener('mousedown', (e) => {
            mouseDown = true;
            const pos = this.#renderer.pageToCanvas(e.clientX, e.clientY);
            this.#touches.set(-1, {
                startX: pos.x,
                startY: pos.y,
                currentX: pos.x,
                currentY: pos.y,
            });
        });

        canvas.addEventListener('mousemove', (e) => {
            if (mouseDown) {
                const data = this.#touches.get(-1);
                if (data) {
                    const pos = this.#renderer.pageToCanvas(e.clientX, e.clientY);
                    data.currentX = pos.x;
                    data.currentY = pos.y;
                }
            }
        });

        canvas.addEventListener('mouseup', () => {
            if (mouseDown) {
                const data = this.#touches.get(-1);
                if (data) {
                    const dx = data.currentX - data.startX;
                    const dy = data.currentY - data.startY;
                    if (Math.sqrt(dx * dx + dy * dy) < 20) {
                        this.#pendingTapX = data.currentX;
                        this.#pendingTapY = data.currentY;
                        this.#pendingTap = true;
                    }
                }
            }
            mouseDown = false;
            this.#touches.delete(-1);
        });

        canvas.addEventListener('mouseleave', () => {
            mouseDown = false;
            this.#touches.delete(-1);
        });

        // Prevent context menu
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    update() {
        // Promote pending tap into current-frame tap (set by async touch/mouse events)
        this.#justTapped = this.#pendingTap;
        this.#tapX = this.#pendingTapX;
        this.#tapY = this.#pendingTapY;
        this.#pendingTap = false;

        // Keyboard input
        const keyLeft  = this.#keys.has('ArrowLeft')  || this.#keys.has('KeyA');
        const keyRight = this.#keys.has('ArrowRight') || this.#keys.has('KeyD');
        this.#keyLeftPressed  = keyLeft;
        this.#keyRightPressed = keyRight;
        const keyUp    = this.#keys.has('ArrowUp')    || this.#keys.has('KeyW');
        const keyDown  = this.#keys.has('ArrowDown')  || this.#keys.has('KeyS');
        const keyJump  = this.#keys.has('Space') || keyUp;
        const keyGlide = this.#keys.has('ShiftLeft') || this.#keys.has('ShiftRight');
        const keyPause = this.#keys.has('Escape') || this.#keys.has('KeyP');

        // Touch input
        let touchLeft = false;
        let touchRight = false;
        let touchTap = false;
        let touchGlide = false;

        const screenWidth = this.#renderer.width;
        const screenMidX = screenWidth / 2;

        for (const [, touch] of this.#touches) {
            // Horizontal tilt based on touch position
            const dx = touch.currentX - touch.startX;
            
            // Simple zone-based input
            if (touch.currentX < screenMidX) {
                touchLeft = true;
            } else {
                touchRight = true;
            }

            // Tap detection (new touch)
            if (Math.abs(dx) < 20) {
                touchTap = true;
            }

            // Hold for glide (touch held for a while)
            touchGlide = this.#touches.size > 0;
        }

        // Combine inputs
        this.#leftPressed  = keyLeft  || touchLeft;
        this.#rightPressed = keyRight || touchRight;
        this.#upPressed    = keyUp;
        this.#downPressed  = keyDown;
        
        const currentJump = keyJump || (touchTap && this.#touches.size > 0);
        this.#jumpJustPressed = currentJump && !this.#prevJump;
        this.#jumpPressed = currentJump;
        this.#prevJump = currentJump;

        this.#glidePressed = keyGlide;

        const currentPause = keyPause;
        this.#pauseJustPressed = currentPause && !this.#prevPause;
        this.#prevPause = currentPause;

        this.#leftJustPressed  = this.#leftPressed  && !this.#prevLeft;
        this.#rightJustPressed = this.#rightPressed && !this.#prevRight;
        this.#upJustPressed    = this.#upPressed    && !this.#prevUp;
        this.#downJustPressed  = this.#downPressed  && !this.#prevDown;

        // ── Dash double-tap / double-press detection ────────────────
        const dt = 1 / 60; // approximate frame dt
        if (this.#dashLeftTimer  > 0) this.#dashLeftTimer  -= dt;
        if (this.#dashRightTimer > 0) this.#dashRightTimer -= dt;

        if (this.#leftJustPressed) {
            if (this.#dashLeftTimer > 0) {
                this.#dashLeftPending = true;
                this.#dashLeftTimer = 0;
            } else {
                this.#dashLeftTimer = InputManager.#DASH_WINDOW;
            }
        }
        if (this.#rightJustPressed) {
            if (this.#dashRightTimer > 0) {
                this.#dashRightPending = true;
                this.#dashRightTimer = 0;
            } else {
                this.#dashRightTimer = InputManager.#DASH_WINDOW;
            }
        }

        this.#prevLeft  = this.#leftPressed;
        this.#prevRight = this.#rightPressed;
        this.#prevUp    = this.#upPressed;
        this.#prevDown  = this.#downPressed;
    }

    get left()  { return this.#leftPressed; }
    get right() { return this.#rightPressed; }
    get up()    { return this.#upPressed; }
    get down()  { return this.#downPressed; }
    get leftJustPressed()  { return this.#leftJustPressed; }
    get rightJustPressed() { return this.#rightJustPressed; }
    get upJustPressed()    { return this.#upJustPressed; }
    get downJustPressed()  { return this.#downJustPressed; }
    get dashLeft()  { return this.#dashLeftPending; }
    get dashRight() { return this.#dashRightPending; }
    /** true only when the keyboard left/right key was just pressed (excludes touch) */
    get keyLeftJustPressed()  { return this.#leftJustPressed && this.#keyLeftPressed; }
    get keyRightJustPressed() { return this.#rightJustPressed && this.#keyRightPressed; }
    get justTapped() { return this.#justTapped; }
    get tapX()       { return this.#tapX; }
    get tapY()       { return this.#tapY; }
    get jump() { return this.#jumpPressed; }
    get jumpJustPressed() { return this.#jumpJustPressed; }
    get glide() { return this.#glidePressed; }
    get pauseJustPressed() { return this.#pauseJustPressed; }

    /**
     * Get horizontal input as -1 to 1
     */
    get horizontal() {
        let h = 0;
        if (this.#leftPressed) h -= 1;
        if (this.#rightPressed) h += 1;
        return h;
    }

    /**
     * Check if any touch is active
     */
    get isTouching() {
        return this.#touches.size > 0;
    }

    /**
     * Reset just-pressed states
     */
    consumeJump() {
        this.#jumpJustPressed = false;
    }

    consumePause() {
        this.#pauseJustPressed = false;
    }

    consumeLeft() {
        this.#leftJustPressed = false;
    }

    consumeRight() {
        this.#rightJustPressed = false;
    }

    consumeUp() {
        this.#upJustPressed = false;
    }

    consumeDown() {
        this.#downJustPressed = false;
    }

    consumeTap() {
        this.#justTapped = false;
        this.#tapX = -1;
        this.#tapY = -1;
    }

    consumeDash() {
        this.#dashLeftPending  = false;
        this.#dashRightPending = false;
    }
}
