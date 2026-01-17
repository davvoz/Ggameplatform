/**
 * InputManager - Gestisce input da tastiera e touch
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
        
        this.joystickBase = null;
        this.joystickStick = null;
        this.joystickCenter = new Vector2(0, 0);
        this.joystickRadius = 35;
        this.touchId = null;
        
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

        // Touch controls
        if (this.isMobile) {
            this.initTouchControls();
        }

        // Prevent context menu on long press
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    initTouchControls() {
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickStick = document.getElementById('joystick-stick');
        const fireButton = document.getElementById('fire-button');
        const joystickZone = document.getElementById('joystick-zone');
        const healButton = document.getElementById('heal-button');
        const bombButton = document.getElementById('bomb-button');

        if (joystickZone) {
            joystickZone.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
            joystickZone.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false });
            joystickZone.addEventListener('touchend', (e) => this.onJoystickEnd(e), { passive: false });
            joystickZone.addEventListener('touchcancel', (e) => this.onJoystickEnd(e), { passive: false });
        }

        if (fireButton) {
            fireButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touch.fire = true;
            }, { passive: false });
            
            fireButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touch.fire = false;
            }, { passive: false });
            
            fireButton.addEventListener('touchcancel', () => {
                this.touch.fire = false;
            });
        }
        
        // Heal ability button
        if (healButton) {
            healButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touch.heal = true;
            }, { passive: false });
            
            healButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touch.heal = false;
            }, { passive: false });
            
            healButton.addEventListener('touchcancel', () => {
                this.touch.heal = false;
            });
        }
        
        // Bomb ability button
        if (bombButton) {
            bombButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touch.bomb = true;
            }, { passive: false });
            
            bombButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touch.bomb = false;
            }, { passive: false });
            
            bombButton.addEventListener('touchcancel', () => {
                this.touch.bomb = false;
            });
        }
    }

    onJoystickStart(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.touchId = touch.identifier;
        this.touch.active = true;
        
        const rect = this.joystickBase.getBoundingClientRect();
        this.joystickCenter.set(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );
        
        this.updateJoystick(touch.clientX, touch.clientY);
    }

    onJoystickMove(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.touchId) {
                this.updateJoystick(touch.clientX, touch.clientY);
                break;
            }
        }
    }

    onJoystickEnd(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.touchId) {
                this.touchId = null;
                this.touch.active = false;
                this.touch.joystick.set(0, 0);
                
                if (this.joystickStick) {
                    this.joystickStick.style.transform = 'translate(0px, 0px)';
                }
                break;
            }
        }
    }

    updateJoystick(x, y) {
        const dx = x - this.joystickCenter.x;
        const dy = y - this.joystickCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let normX = dx;
        let normY = dy;
        
        if (distance > this.joystickRadius) {
            normX = (dx / distance) * this.joystickRadius;
            normY = (dy / distance) * this.joystickRadius;
        }
        
        // Normalizza per ottenere valori tra -1 e 1
        this.touch.joystick.set(
            normX / this.joystickRadius,
            normY / this.joystickRadius
        );
        
        // Aggiorna visivamente il joystick
        if (this.joystickStick) {
            this.joystickStick.style.transform = `translate(${normX}px, ${normY}px)`;
        }
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
    }
}
