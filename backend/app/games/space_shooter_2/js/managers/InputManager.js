import { InputManager as BaseInputManager } from '../../../shared/InputManager.js';
import { ui } from '../FontConfig.js';

/**
 * Space-Shooter 2 InputManager
 * Extends base joystick+fire with ultimate ability button.
 */
class InputManager extends BaseInputManager {
    constructor(game) {
        super(game);

        this.touch.ultimate = false;

        this.ultimateButtonPressed = false;
        this.ultimateButtonTouchId = null;
        this.ultimateButtonPos = { x: 0, y: 0, size: 55 };

        this.ultimateJustPressed = false;
        this._ultimatePrevState = false;
    }

    // ── Layout ───────────────────────────────────────────────────

    _updateExtraLayout(_w, _h) {
        const abilitySize = 54;
        const abilityGap = 12;

        this.ultimateButtonPos = {
            x: this.fireButtonPos.x - abilitySize / 2 + 35,
            y: this.fireButtonPos.y - this.fireButtonPos.radius - abilityGap - abilitySize,
            size: abilitySize
        };
    }

    // ── Extra button hit test ────────────────────────────────────

    _isInUltimateButton(x, y) {
        const b = this.ultimateButtonPos;
        return x >= b.x && x <= b.x + b.size && y >= b.y && y <= b.y + b.size;
    }

    // ── Extra touch handlers ─────────────────────────────────────

    _onExtraTouchStart(e, touch, coords) {
        if (this.ultimateButtonTouchId === null && this._isInUltimateButton(coords.x, coords.y)) {
            e.preventDefault();
            this.ultimateButtonTouchId = touch.identifier;
            this.ultimateButtonPressed = true;
            this.touch.ultimate = true;
            return true;
        }
        return false;
    }

    _onExtraTouchEnd(touch) {
        if (touch.identifier === this.ultimateButtonTouchId) {
            this.ultimateButtonTouchId = null;
            this.ultimateButtonPressed = false;
            this.touch.ultimate = false;
        }
    }

    // ── Ability / pause queries ──────────────────────────────────

    isUltimatePressed() {
        const current = this.touch.ultimate || this.ultimateButtonPressed ||
                        this.isKeyPressed('KeyQ') || this.isKeyPressed('KeyE');
        const justPressed = current && !this._ultimatePrevState;
        this._ultimatePrevState = current;
        return justPressed;
    }

    isPausePressed() {
        return this.isKeyPressed('Escape');
    }

    clearPauseKey() {
        this.keys.set('Escape', false);
    }

    // ── Rendering ────────────────────────────────────────────────

    renderTouchControls(ctx) {
        if (!this.isMobile) return;

        ctx.save();

        // Joystick base
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.joystickPos.x, this.joystickPos.y, this.joystickBaseRadius, 0, Math.PI * 2);
        ctx.fill();

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
        ctx.font = ui(18, 'bold');
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

        if (ultCharge > 0 && ultCharge < 100) {
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(ultCx, ultCy, ultR, -Math.PI / 2, -Math.PI / 2 + (ultCharge / 100) * Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalAlpha = ultReady ? 0.9 : 0.5;
        ctx.font = ui(11, 'bold');
        ctx.fillStyle = '#fff';
        ctx.fillText('ULT', ultCx, ultCy);

        ctx.restore();
    }
}

export default InputManager;
