import Vector2 from '../utils/Vector2.js';

/**
 * InputManager - Keyboard + Canvas-based touch input
 */
class InputManager {
    constructor(game) {
        this.game = game;
        this.keys = new Map();
        this.touch = {
            active: false,
            joystick: new Vector2(0, 0),
            fire: false,
            ultimate: false
        };

        // Canvas-based joystick
        this.joystickCenter = new Vector2(0, 0);
        this.joystickStickPos = new Vector2(0, 0);
        this.joystickBaseRadius = 55;
        this.joystickStickRadius = 25;
        this.joystickMaxDistance = 35;
        this.joystickTouchId = null;

        // Canvas-based buttons
        this.fireButtonPressed = false;
        this.fireButtonTouchId = null;
        this.ultimateButtonPressed = false;
        this.ultimateButtonTouchId = null;

        // Button positions (set in updateLayout)
        this.joystickPos = { x: 0, y: 0 };
        this.fireButtonPos = { x: 0, y: 0, radius: 45 };
        this.ultimateButtonPos = { x: 0, y: 0, size: 55 };

        this.isMobile = this.detectMobile();
        this.ultimateJustPressed = false;
        this._ultimatePrevState = false;

        this.init();
    }

    detectMobile() {
        return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
    }

    init() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        if (this.isMobile) {
            this.initCanvasTouchControls();
        }

        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    updateLayout(canvasWidth, canvasHeight) {
        const padding = 25;
        const bottomMargin = 30;

        this.joystickPos = {
            x: padding + this.joystickBaseRadius,
            y: canvasHeight - bottomMargin - this.joystickBaseRadius
        };
        this.joystickCenter.set(this.joystickPos.x, this.joystickPos.y);

        this.fireButtonPos = {
            x: canvasWidth - padding - 45,
            y: canvasHeight - bottomMargin - 45,
            radius: 45
        };

        const abilitySize = 54;
        const abilityGap = 12;

        this.ultimateButtonPos = {
            x: this.fireButtonPos.x - abilitySize / 2 + 35,
            y: this.fireButtonPos.y - this.fireButtonPos.radius - abilityGap - abilitySize,
            size: abilitySize
        };
    }

    initCanvasTouchControls() {
        const canvas = this.game.canvas;
        canvas.addEventListener('touchstart', (e) => this.onCanvasTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onCanvasTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onCanvasTouchEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this.onCanvasTouchEnd(e), { passive: false });
    }

    getTouchCanvasCoords(touch) {
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) * (canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    isInJoystickZone(x, y) {
        const dx = x - this.joystickPos.x;
        const dy = y - this.joystickPos.y;
        return Math.sqrt(dx * dx + dy * dy) < this.joystickBaseRadius * 1.5;
    }

    isInFireButton(x, y) {
        const dx = x - this.fireButtonPos.x;
        const dy = y - this.fireButtonPos.y;
        return Math.sqrt(dx * dx + dy * dy) < this.fireButtonPos.radius * 1.3;
    }

    isInUltimateButton(x, y) {
        const btn = this.ultimateButtonPos;
        return x >= btn.x && x <= btn.x + btn.size &&
               y >= btn.y && y <= btn.y + btn.size;
    }

    onCanvasTouchStart(e) {
        if (this.game.state !== 'playing') return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const coords = this.getTouchCanvasCoords(touch);

            if (this.joystickTouchId === null && this.isInJoystickZone(coords.x, coords.y)) {
                e.preventDefault();
                this.joystickTouchId = touch.identifier;
                this.touch.active = true;
                this.updateJoystickPosition(coords.x, coords.y);
                continue;
            }

            if (this.fireButtonTouchId === null && this.isInFireButton(coords.x, coords.y)) {
                e.preventDefault();
                this.fireButtonTouchId = touch.identifier;
                this.fireButtonPressed = true;
                this.touch.fire = true;
                continue;
            }

            if (this.ultimateButtonTouchId === null && this.isInUltimateButton(coords.x, coords.y)) {
                e.preventDefault();
                this.ultimateButtonTouchId = touch.identifier;
                this.ultimateButtonPressed = true;
                this.touch.ultimate = true;
                continue;
            }
        }
    }

    onCanvasTouchMove(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (touch.identifier === this.joystickTouchId) {
                e.preventDefault();
                const coords = this.getTouchCanvasCoords(touch);
                this.updateJoystickPosition(coords.x, coords.y);
            }
        }
    }

    onCanvasTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (touch.identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.touch.active = false;
                this.touch.joystick.set(0, 0);
                this.joystickStickPos.set(this.joystickPos.x, this.joystickPos.y);
            }

            if (touch.identifier === this.fireButtonTouchId) {
                this.fireButtonTouchId = null;
                this.fireButtonPressed = false;
                this.touch.fire = false;
            }

            if (touch.identifier === this.ultimateButtonTouchId) {
                this.ultimateButtonTouchId = null;
                this.ultimateButtonPressed = false;
                this.touch.ultimate = false;
            }
        }
    }

    updateJoystickPosition(touchX, touchY) {
        const dx = touchX - this.joystickPos.x;
        const dy = touchY - this.joystickPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.joystickMaxDistance) {
            const angle = Math.atan2(dy, dx);
            this.joystickStickPos.set(
                this.joystickPos.x + Math.cos(angle) * this.joystickMaxDistance,
                this.joystickPos.y + Math.sin(angle) * this.joystickMaxDistance
            );
            this.touch.joystick.set(Math.cos(angle), Math.sin(angle));
        } else {
            this.joystickStickPos.set(touchX, touchY);
            if (dist > 5) {
                this.touch.joystick.set(dx / this.joystickMaxDistance, dy / this.joystickMaxDistance);
            } else {
                this.touch.joystick.set(0, 0);
            }
        }
    }

    onKeyDown(e) {
        this.keys.set(e.code, true);
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
    }

    onKeyUp(e) {
        this.keys.set(e.code, false);
    }

    getMovementDirection() {
        // Touch input
        if (this.touch.active) {
            return this.touch.joystick.copy();
        }

        // Keyboard
        let x = 0, y = 0;
        if (this.keys.get('ArrowLeft') || this.keys.get('KeyA')) x -= 1;
        if (this.keys.get('ArrowRight') || this.keys.get('KeyD')) x += 1;
        if (this.keys.get('ArrowUp') || this.keys.get('KeyW')) y -= 1;
        if (this.keys.get('ArrowDown') || this.keys.get('KeyS')) y += 1;

        const dir = new Vector2(x, y);
        return dir.magnitude() > 0 ? dir.normalize() : dir;
    }

    isFiring() {
        return this.touch.fire || this.fireButtonPressed ||
               this.keys.get('Space') || false;
    }

    isUltimatePressed() {
        const current = this.touch.ultimate || this.ultimateButtonPressed ||
                        this.keys.get('KeyQ') || this.keys.get('KeyE') || false;
        const justPressed = current && !this._ultimatePrevState;
        this._ultimatePrevState = current;
        return justPressed;
    }

    isPausePressed() {
        return this.keys.get('Escape') || false;
    }

    clearPauseKey() {
        this.keys.set('Escape', false);
    }

    renderTouchControls(ctx) {
        if (!this.isMobile) return;

        ctx.save();

        // Joystick base
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.joystickPos.x, this.joystickPos.y, this.joystickBaseRadius, 0, Math.PI * 2);
        ctx.fill();

        // Joystick border
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.joystickPos.x, this.joystickPos.y, this.joystickBaseRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Joystick stick
        const stickX = this.touch.active ? this.joystickStickPos.x : this.joystickPos.x;
        const stickY = this.touch.active ? this.joystickStickPos.y : this.joystickPos.y;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#88ccff';
        ctx.beginPath();
        ctx.arc(stickX, stickY, this.joystickStickRadius, 0, Math.PI * 2);
        ctx.fill();

        // Fire button
        ctx.globalAlpha = this.fireButtonPressed ? 0.6 : 0.3;
        const fireGrad = ctx.createRadialGradient(
            this.fireButtonPos.x, this.fireButtonPos.y, 0,
            this.fireButtonPos.x, this.fireButtonPos.y, this.fireButtonPos.radius
        );
        fireGrad.addColorStop(0, 'rgba(255,80,80,0.8)');
        fireGrad.addColorStop(1, 'rgba(255,40,40,0.2)');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(this.fireButtonPos.x, this.fireButtonPos.y, this.fireButtonPos.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.fireButtonPos.x, this.fireButtonPos.y, this.fireButtonPos.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.8;
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText('FIRE', this.fireButtonPos.x, this.fireButtonPos.y);

        // Ultimate button
        const ultBtn = this.ultimateButtonPos;
        const ultCharge = this.game?.player?.ultimateCharge || 0;
        const ultReady = ultCharge >= 100;

        ctx.globalAlpha = this.ultimateButtonPressed ? 0.7 : 0.3;
        const ultColor = ultReady ? 'rgba(255,215,0,' : 'rgba(100,100,120,';
        ctx.fillStyle = ultColor + '0.6)';

        const ultCx = ultBtn.x + ultBtn.size / 2;
        const ultCy = ultBtn.y + ultBtn.size / 2;
        const ultR = ultBtn.size / 2;

        ctx.beginPath();
        ctx.arc(ultCx, ultCy, ultR, 0, Math.PI * 2);
        ctx.fill();

        // Charge arc
        if (ultCharge > 0 && ultCharge < 100) {
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(ultCx, ultCy, ultR, -Math.PI / 2, -Math.PI / 2 + (ultCharge / 100) * Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalAlpha = ultReady ? 0.9 : 0.5;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('ULT', ultCx, ultCy);

        ctx.restore();
    }
}

export default InputManager;
