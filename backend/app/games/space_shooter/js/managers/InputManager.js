import Vector2 from '../../../shared/Vector2.js';
import { InputManager as BaseInputManager } from '../../../shared/InputManager.js';

/**
 * Space-Shooter InputManager
 * Extends base joystick+fire with heal and bomb ability buttons.
 */
class InputManager extends BaseInputManager {
    constructor(game) {
        super(game);

        this.touch.heal = false;
        this.touch.bomb = false;

        this.healPressed = false;
        this.bombPressed = false;

        this.healButtonPressed = false;
        this.healButtonTouchId = null;
        this.bombButtonPressed = false;
        this.bombButtonTouchId = null;

        this.healButtonPos = { x: 0, y: 0, size: 55 };
        this.bombButtonPos = { x: 0, y: 0, size: 55 };
    }

    // ── Layout ───────────────────────────────────────────────────

    _updateExtraLayout(_w, _h) {
        const abilitySize = 54;
        const abilityGap = 12;
        const fireCenterX = this.fireButtonPos.x;
        const fireCenterY = this.fireButtonPos.y;

        this.healButtonPos = {
            x: (fireCenterX - abilitySize / 2) + 35,
            y: fireCenterY - this.fireButtonPos.radius - abilityGap - abilitySize,
            size: abilitySize
        };
        this.bombButtonPos = {
            x: (fireCenterX - abilitySize / 2) + 35,
            y: this.healButtonPos.y - abilityGap - abilitySize,
            size: abilitySize
        };
    }

    // ── Touch: allow paused state too ────────────────────────────

    _canProcessTouch() {
        return this.game.state === 'playing' || this.game.state === 'paused';
    }

    // ── Extra button hit tests ───────────────────────────────────

    _isInHealButton(x, y) {
        const b = this.healButtonPos;
        return x >= b.x && x <= b.x + b.size && y >= b.y && y <= b.y + b.size;
    }

    _isInBombButton(x, y) {
        const b = this.bombButtonPos;
        return x >= b.x && x <= b.x + b.size && y >= b.y && y <= b.y + b.size;
    }

    // ── Extra touch handlers ─────────────────────────────────────

    _onExtraTouchStart(e, touch, coords) {
        if (this.healButtonTouchId === null && this._isInHealButton(coords.x, coords.y)) {
            e.preventDefault();
            this.healButtonTouchId = touch.identifier;
            this.healButtonPressed = true;
            this.touch.heal = true;
            return true;
        }
        if (this.bombButtonTouchId === null && this._isInBombButton(coords.x, coords.y)) {
            e.preventDefault();
            this.bombButtonTouchId = touch.identifier;
            this.bombButtonPressed = true;
            this.touch.bomb = true;
            return true;
        }
        return false;
    }

    _onExtraTouchEnd(touch) {
        if (touch.identifier === this.healButtonTouchId) {
            this.healButtonTouchId = null;
            this.healButtonPressed = false;
            this.touch.heal = false;
        }
        if (touch.identifier === this.bombButtonTouchId) {
            this.bombButtonTouchId = null;
            this.bombButtonPressed = false;
            this.touch.bomb = false;
        }
    }

    // ── Movement with deadzone ───────────────────────────────────

    getMovementDirection() {
        if (this.isMobile && this.touch.active) {
            const v = this.touch.joystick;
            const deadzone = 0.25;
            const sensitivity = 0.6;
            if (v.magnitude() > deadzone) {
                return v.normalize().multiply((v.magnitude() - deadzone) / (1 - deadzone) * sensitivity);
            }
            return new Vector2(0, 0);
        }

        let dir = new Vector2(0, 0);
        if (this.isKeyPressed('ArrowLeft') || this.isKeyPressed('KeyA')) dir.x -= 1;
        if (this.isKeyPressed('ArrowRight') || this.isKeyPressed('KeyD')) dir.x += 1;
        if (this.isKeyPressed('ArrowUp') || this.isKeyPressed('KeyW')) dir.y -= 1;
        if (this.isKeyPressed('ArrowDown') || this.isKeyPressed('KeyS')) dir.y += 1;

        const mag = dir.magnitude();
        if (mag > 1) dir = dir.normalize();
        return dir;
    }

    // ── Ability queries ──────────────────────────────────────────

    isHealActivated() {
        const pressed = this.isKeyPressed('KeyQ') || this.touch.heal;
        if (pressed && !this.healPressed) {
            this.healPressed = true;
            return true;
        }
        if (!pressed) this.healPressed = false;
        return false;
    }

    isBombActivated() {
        const pressed = this.isKeyPressed('KeyE') || this.touch.bomb;
        if (pressed && !this.bombPressed) {
            this.bombPressed = true;
            return true;
        }
        if (!pressed) this.bombPressed = false;
        return false;
    }

    // ── Reset ────────────────────────────────────────────────────

    _resetExtra() {
        this.touch.heal = false;
        this.touch.bomb = false;
        this.healPressed = false;
        this.bombPressed = false;
        this.healButtonTouchId = null;
        this.bombButtonTouchId = null;
        this.healButtonPressed = false;
        this.bombButtonPressed = false;
    }

    // ── Rendering ────────────────────────────────────────────────

    renderTouchControls(ctx, player) {
        if (!this.isMobile) return;

        ctx.save();
        this._renderJoystick(ctx);
        this._renderFireButton(ctx);

        if (player) {
            this._renderAbilityButton(ctx, {
                pos: this.healButtonPos,
                icon: '💚',
                key: 'Q',
                cooldown: player.healCooldown,
                maxCooldown: player.healMaxCooldown,
                color: '#00ff88',
                pressed: this.healButtonPressed
            });
            this._renderAbilityButton(ctx, {
                pos: this.bombButtonPos,
                icon: '💥',
                key: 'E',
                cooldown: player.bombCooldown,
                maxCooldown: player.bombMaxCooldown,
                color: '#ff8844',
                pressed: this.bombButtonPressed
            });
        }
        ctx.restore();
    }

    _renderJoystick(ctx) {
        const x = this.joystickPos.x;
        const y = this.joystickPos.y;
        const baseRadius = this.joystickBaseRadius;
        const stickRadius = this.joystickStickRadius;

        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 80, 120, 0.25)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 150, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - baseRadius * 0.7, y);
        ctx.lineTo(x + baseRadius * 0.7, y);
        ctx.moveTo(x, y - baseRadius * 0.7);
        ctx.lineTo(x, y + baseRadius * 0.7);
        ctx.stroke();

        const stickX = this.touch.active ? this.joystickStickPos.x : x;
        const stickY = this.touch.active ? this.joystickStickPos.y : y;

        const gradient = ctx.createRadialGradient(stickX, stickY, 0, stickX, stickY, stickRadius);
        gradient.addColorStop(0, 'rgba(100, 220, 255, 0.9)');
        gradient.addColorStop(0.5, 'rgba(0, 150, 200, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 80, 150, 0.8)');

        ctx.beginPath();
        ctx.arc(stickX, stickY, stickRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(150, 230, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(stickX - stickRadius * 0.3, stickY - stickRadius * 0.3, stickRadius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }

    _renderFireButton(ctx) {
        const x = this.fireButtonPos.x;
        const y = this.fireButtonPos.y;
        const radius = this.fireButtonPos.radius;
        const pressed = this.fireButtonPressed;
        const scale = pressed ? 0.92 : 1;
        const r = radius * scale;

        if (pressed) {
            ctx.beginPath();
            ctx.arc(x, y, r + 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
            ctx.fill();
        }

        const gradient = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
        if (pressed) {
            gradient.addColorStop(0, 'rgba(255, 180, 180, 1)');
            gradient.addColorStop(0.5, 'rgba(255, 100, 100, 0.9)');
            gradient.addColorStop(1, 'rgba(200, 50, 50, 0.9)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 120, 120, 0.9)');
            gradient.addColorStop(0.5, 'rgba(220, 50, 50, 0.8)');
            gradient.addColorStop(1, 'rgba(150, 30, 30, 0.9)');
        }

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 150, 150, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = 'bold 14px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255, 100, 100, 0.8)';
        ctx.shadowBlur = pressed ? 15 : 10;
        ctx.fillText('FIRE', x, y);
        ctx.shadowBlur = 0;
    }

    _renderAbilityButton(ctx, config) {
        const { pos: btnPos, icon, key, cooldown, maxCooldown, color, pressed } = config;
        const x = btnPos.x;
        const y = btnPos.y;
        const size = btnPos.size;
        const cooldownPercent = cooldown / maxCooldown;
        const isReady = cooldown <= 0;
        const scale = pressed && isReady ? 0.9 : 1;
        const s = size * scale;
        const offsetX = (size - s) / 2;
        const offsetY = (size - s) / 2;

        ctx.fillStyle = isReady ? 'rgba(40, 40, 60, 0.8)' : 'rgba(20, 20, 30, 0.8)';
        ctx.strokeStyle = isReady ? color : 'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(x + offsetX, y + offsetY, s, s, 10);
        ctx.fill();
        ctx.stroke();

        if (isReady) {
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, x + size / 2, y + size / 2 - 2);
        } else {

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            const cooldownHeight = s * cooldownPercent;
            ctx.fillRect(x + offsetX + 2, y + offsetY + 2 + (s - 4 - cooldownHeight),
                s - 4, cooldownHeight);

            ctx.font = 'bold 16px Orbitron, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(Math.ceil(cooldown).toString(), x + size / 2, y + size / 2);

        }

        ctx.font = '9px Orbitron, Arial';
        ctx.fillStyle = isReady ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(key, x + size / 2, y + size - 8);

        if (isReady && pressed) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x + offsetX, y + offsetY, s, s, 10);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
}

export default InputManager;