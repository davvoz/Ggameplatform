/**
 * InputManager - Gestisce input da tastiera e touch (Canvas-based)
 */
class InputManager {
    constructor(game) {
        this.game = game;
        this.keys = new Map();
        this.touch = {
            active: false,
            joystick: new Vector2(0, 0),
            fire: false,
            heal: false,
            bomb: false
        };
        
        // Per evitare attivazioni multiple
        this.healPressed = false;
        this.bombPressed = false;
        
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
        this.healButtonPressed = false;
        this.healButtonTouchId = null;
        this.bombButtonPressed = false;
        this.bombButtonTouchId = null;
        
        // Button positions (will be set in updateLayout)
        this.joystickPos = { x: 0, y: 0 };
        this.fireButtonPos = { x: 0, y: 0, radius: 45 };
        this.healButtonPos = { x: 0, y: 0, size: 55 };
        this.bombButtonPos = { x: 0, y: 0, size: 55 };
        
        this.isMobile = this.detectMobile();
        
        this.init();
    }

    detectMobile() {
        return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
    }

    init() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Canvas-based touch controls
        if (this.isMobile) {
            this.initCanvasTouchControls();
        }

        // Prevent context menu on long press
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Aggiorna il layout dei controlli touch basato sulle dimensioni canvas
     */
    updateLayout(canvasWidth, canvasHeight) {
        const padding = 25;
        const bottomMargin = 30;
        
        // Joystick in basso a sinistra
        this.joystickPos = {
            x: padding + this.joystickBaseRadius,
            y: canvasHeight - bottomMargin - this.joystickBaseRadius
        };
        this.joystickCenter.set(this.joystickPos.x, this.joystickPos.y);
        
        // Fire button in basso a destra
        this.fireButtonPos = {
            x: canvasWidth - padding - this.fireButtonPos.radius,
            y: canvasHeight - bottomMargin - this.fireButtonPos.radius,
            radius: 45
        };
        
        // Ability buttons a sinistra del fire button
        const abilitySize = 50;
        const abilityGap = 12;
        this.healButtonPos = {
            x: this.fireButtonPos.x - this.fireButtonPos.radius - abilityGap - abilitySize,
            y: canvasHeight - bottomMargin - abilitySize - 20,
            size: abilitySize
        };
        this.bombButtonPos = {
            x: this.healButtonPos.x - abilitySize - abilityGap,
            y: this.healButtonPos.y,
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

    /**
     * Converte coordinate touch in coordinate canvas
     */
    getTouchCanvasCoords(touch) {
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) * (canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    /**
     * Verifica se un punto è dentro il joystick
     */
    isInJoystickZone(x, y) {
        const dx = x - this.joystickPos.x;
        const dy = y - this.joystickPos.y;
        // Zona di touch più ampia del joystick visibile
        return Math.sqrt(dx * dx + dy * dy) < this.joystickBaseRadius * 1.5;
    }

    /**
     * Verifica se un punto è dentro il fire button
     */
    isInFireButton(x, y) {
        const dx = x - this.fireButtonPos.x;
        const dy = y - this.fireButtonPos.y;
        return Math.sqrt(dx * dx + dy * dy) < this.fireButtonPos.radius * 1.3;
    }

    /**
     * Verifica se un punto è dentro il heal button
     */
    isInHealButton(x, y) {
        const btn = this.healButtonPos;
        return x >= btn.x && x <= btn.x + btn.size &&
               y >= btn.y && y <= btn.y + btn.size;
    }

    /**
     * Verifica se un punto è dentro il bomb button
     */
    isInBombButton(x, y) {
        const btn = this.bombButtonPos;
        return x >= btn.x && x <= btn.x + btn.size &&
               y >= btn.y && y <= btn.y + btn.size;
    }

    onCanvasTouchStart(e) {
        // Non processiamo i touch durante menu/gameover
        if (this.game.state !== 'playing' && this.game.state !== 'paused') return;
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const coords = this.getTouchCanvasCoords(touch);
            
            // Check joystick
            if (this.joystickTouchId === null && this.isInJoystickZone(coords.x, coords.y)) {
                e.preventDefault();
                this.joystickTouchId = touch.identifier;
                this.touch.active = true;
                this.updateJoystickPosition(coords.x, coords.y);
                continue;
            }
            
            // Check fire button
            if (this.fireButtonTouchId === null && this.isInFireButton(coords.x, coords.y)) {
                e.preventDefault();
                this.fireButtonTouchId = touch.identifier;
                this.fireButtonPressed = true;
                this.touch.fire = true;
                continue;
            }
            
            // Check heal button
            if (this.healButtonTouchId === null && this.isInHealButton(coords.x, coords.y)) {
                e.preventDefault();
                this.healButtonTouchId = touch.identifier;
                this.healButtonPressed = true;
                this.touch.heal = true;
                continue;
            }
            
            // Check bomb button
            if (this.bombButtonTouchId === null && this.isInBombButton(coords.x, coords.y)) {
                e.preventDefault();
                this.bombButtonTouchId = touch.identifier;
                this.bombButtonPressed = true;
                this.touch.bomb = true;
                continue;
            }
        }
    }

    onCanvasTouchMove(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            // Update joystick
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
            
            // Release joystick
            if (touch.identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.touch.active = false;
                this.touch.joystick.set(0, 0);
                this.joystickStickPos.set(0, 0);
            }
            
            // Release fire button
            if (touch.identifier === this.fireButtonTouchId) {
                this.fireButtonTouchId = null;
                this.fireButtonPressed = false;
                this.touch.fire = false;
            }
            
            // Release heal button
            if (touch.identifier === this.healButtonTouchId) {
                this.healButtonTouchId = null;
                this.healButtonPressed = false;
                this.touch.heal = false;
            }
            
            // Release bomb button
            if (touch.identifier === this.bombButtonTouchId) {
                this.bombButtonTouchId = null;
                this.bombButtonPressed = false;
                this.touch.bomb = false;
            }
        }
    }

    updateJoystickPosition(x, y) {
        const dx = x - this.joystickPos.x;
        const dy = y - this.joystickPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let normX = dx;
        let normY = dy;
        
        if (distance > this.joystickMaxDistance) {
            normX = (dx / distance) * this.joystickMaxDistance;
            normY = (dy / distance) * this.joystickMaxDistance;
        }
        
        // Posizione dello stick per il rendering
        this.joystickStickPos.set(normX, normY);
        
        // Normalizza per ottenere valori tra -1 e 1
        this.touch.joystick.set(
            normX / this.joystickMaxDistance,
            normY / this.joystickMaxDistance
        );
    }

    onKeyDown(e) {
        this.keys.set(e.code, true);
        
        // Previeni scroll con le frecce
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
    }

    onKeyUp(e) {
        this.keys.set(e.code, false);
    }

    isKeyPressed(code) {
        return this.keys.get(code) || false;
    }

    /**
     * Ottiene la direzione del movimento normalizzata
     */
    getMovementDirection() {
        // Touch input (override se attivo)
        if (this.isMobile && this.touch.active) {
            // Deadzone e sensibilità ridotta
            const v = this.touch.joystick;
            const deadzone = 0.25;
            const sensitivity = 0.6;
            if (v.magnitude() > deadzone) {
                return v.normalize().multiply((v.magnitude() - deadzone) / (1 - deadzone) * sensitivity);
            } else {
                return new Vector2(0, 0);
            }
        }
        // Keyboard input
        let dir = new Vector2(0, 0);
        if (this.isKeyPressed('ArrowLeft') || this.isKeyPressed('KeyA')) {
            dir.x -= 1;
        }
        if (this.isKeyPressed('ArrowRight') || this.isKeyPressed('KeyD')) {
            dir.x += 1;
        }
        if (this.isKeyPressed('ArrowUp') || this.isKeyPressed('KeyW')) {
            dir.y -= 1;
        }
        if (this.isKeyPressed('ArrowDown') || this.isKeyPressed('KeyS')) {
            dir.y += 1;
        }
        // Normalizza se la magnitudine è > 1
        const mag = dir.magnitude();
        if (mag > 1) {
            dir = dir.normalize();
        }
        return dir;
    }

    /**
     * Verifica se il fuoco è attivo
     */
    isFiring() {
        return this.isKeyPressed('Space') || this.touch.fire;
    }
    
    /**
     * Verifica se l'abilità heal è attivata (singola pressione)
     */
    isHealActivated() {
        const pressed = this.isKeyPressed('KeyQ') || this.touch.heal;
        if (pressed && !this.healPressed) {
            this.healPressed = true;
            return true;
        }
        if (!pressed) {
            this.healPressed = false;
        }
        return false;
    }
    
    /**
     * Verifica se l'abilità bomb è attivata (singola pressione)
     */
    isBombActivated() {
        const pressed = this.isKeyPressed('KeyE') || this.touch.bomb;
        if (pressed && !this.bombPressed) {
            this.bombPressed = true;
            return true;
        }
        if (!pressed) {
            this.bombPressed = false;
        }
        return false;
    }

    /**
     * Reset dell'input
     */
    reset() {
        this.keys.clear();
        this.touch.active = false;
        this.touch.joystick.set(0, 0);
        this.touch.fire = false;
        this.touch.heal = false;
        this.touch.bomb = false;
        this.healPressed = false;
        this.bombPressed = false;
        this.joystickTouchId = null;
        this.fireButtonTouchId = null;
        this.healButtonTouchId = null;
        this.bombButtonTouchId = null;
        this.fireButtonPressed = false;
        this.healButtonPressed = false;
        this.bombButtonPressed = false;
        this.joystickStickPos.set(0, 0);
    }

    /**
     * Renderizza i controlli touch su canvas
     */
    renderTouchControls(ctx, player) {
        if (!this.isMobile) return;
        
        ctx.save();
        
        // Joystick
        this.renderJoystick(ctx);
        
        // Fire button
        this.renderFireButton(ctx);
        
        // Ability buttons
        if (player) {
            this.renderAbilityButton(ctx, this.healButtonPos, '💚', 'Q',
                player.healCooldown, player.healMaxCooldown,
                '#00ff88', this.healButtonPressed);
            this.renderAbilityButton(ctx, this.bombButtonPos, '💥', 'E',
                player.bombCooldown, player.bombMaxCooldown,
                '#ff8844', this.bombButtonPressed);
        }
        
        ctx.restore();
    }

    renderJoystick(ctx) {
        const x = this.joystickPos.x;
        const y = this.joystickPos.y;
        const baseRadius = this.joystickBaseRadius;
        const stickRadius = this.joystickStickRadius;
        
        // Base del joystick
        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 80, 120, 0.25)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Linee direzionali
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - baseRadius * 0.7, y);
        ctx.lineTo(x + baseRadius * 0.7, y);
        ctx.moveTo(x, y - baseRadius * 0.7);
        ctx.lineTo(x, y + baseRadius * 0.7);
        ctx.stroke();
        
        // Stick
        const stickX = x + this.joystickStickPos.x;
        const stickY = y + this.joystickStickPos.y;
        
        // Glow dello stick
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
        
        // Highlight sullo stick
        ctx.beginPath();
        ctx.arc(stickX - stickRadius * 0.3, stickY - stickRadius * 0.3, stickRadius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }

    renderFireButton(ctx) {
        const x = this.fireButtonPos.x;
        const y = this.fireButtonPos.y;
        const radius = this.fireButtonPos.radius;
        const pressed = this.fireButtonPressed;
        
        // Scala del pulsante quando premuto
        const scale = pressed ? 0.92 : 1;
        const r = radius * scale;
        
        // Glow esterno quando premuto
        if (pressed) {
            ctx.beginPath();
            ctx.arc(x, y, r + 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
            ctx.fill();
        }
        
        // Gradiente del pulsante
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
        
        // Testo
        ctx.font = 'bold 14px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255, 100, 100, 0.8)';
        ctx.shadowBlur = pressed ? 15 : 10;
        ctx.fillText('FIRE', x, y);
        ctx.shadowBlur = 0;
    }

    renderAbilityButton(ctx, btnPos, icon, key, cooldown, maxCooldown, color, pressed) {
        const x = btnPos.x;
        const y = btnPos.y;
        const size = btnPos.size;
        const cooldownPercent = cooldown / maxCooldown;
        const isReady = cooldown <= 0;
        const scale = pressed && isReady ? 0.9 : 1;
        const s = size * scale;
        const offsetX = (size - s) / 2;
        const offsetY = (size - s) / 2;
        
        // Background
        ctx.fillStyle = isReady ? 'rgba(40, 40, 60, 0.8)' : 'rgba(20, 20, 30, 0.8)';
        ctx.strokeStyle = isReady ? color : 'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        
        // Rounded rect
        ctx.beginPath();
        ctx.roundRect(x + offsetX, y + offsetY, s, s, 10);
        ctx.fill();
        ctx.stroke();
        
        // Cooldown overlay (si riempie dal basso)
        if (!isReady) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            const cooldownHeight = s * cooldownPercent;
            ctx.fillRect(x + offsetX + 2, y + offsetY + 2 + (s - 4 - cooldownHeight),
                s - 4, cooldownHeight);
            
            // Tempo rimanente
            ctx.font = 'bold 16px Orbitron, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(Math.ceil(cooldown).toString(), x + size / 2, y + size / 2);
        } else {
            // Icona
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, x + size / 2, y + size / 2 - 2);
        }
        
        // Key hint
        ctx.font = '9px Orbitron, Arial';
        ctx.fillStyle = isReady ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(key, x + size / 2, y + size - 8);
        
        // Glow when ready and pressed
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
