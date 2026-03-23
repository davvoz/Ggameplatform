import { formatTime } from './utils.js';
import { MathUtils } from './utils.js';
import { CONFIG, WORLDS } from './config.js';
/**
 * Survivor Arena - UI Manager
 * @fileoverview Handles all UI updates and interactions
 */



class UIManager {
    constructor() {
        // Cache DOM elements
        this.elements = {
            // Screens
            loadingScreen: document.getElementById('loadingScreen'),
            loadingProgress: document.getElementById('loadingProgress'),
            startScreen: document.getElementById('startScreen'),
            startButton: document.getElementById('startButton'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            restartButton: document.getElementById('restartButton'),
            
            // Game UI
            gameUI: document.getElementById('gameUI'),
            gameTimer: document.getElementById('gameTimer'),
            killCount: document.getElementById('killCount'),
            scoreDisplay: document.getElementById('scoreDisplay'),
            pauseButton: document.getElementById('pauseButton'),
            
            // XP & Level
            xpProgress: document.getElementById('xpProgress'),
            levelDisplay: document.getElementById('levelDisplay'),
            
            // Health
            healthProgress: document.getElementById('healthProgress'),
            healthText: document.getElementById('healthText'),
            
            // Weapon slots
            weaponSlots: [
                document.getElementById('weaponSlot1'),
                document.getElementById('weaponSlot2'),
                document.getElementById('weaponSlot3'),
                document.getElementById('weaponSlot4')
            ],
            
            // Modals
            upgradeModal: document.getElementById('upgradeModal'),
            newLevelText: document.getElementById('newLevelText'),
            upgradeOptions: document.getElementById('upgradeOptions'),
            pauseModal: document.getElementById('pauseModal'),
            resumeButton: document.getElementById('resumeButton'),
            quitButton: document.getElementById('quitButton'),
            
            // Boss warning
            bossWarning: document.getElementById('bossWarning'),
            
            // Final stats
            finalScore: document.getElementById('finalScore'),
            finalTime: document.getElementById('finalTime'),
            finalKills: document.getElementById('finalKills'),
            finalLevel: document.getElementById('finalLevel'),
            
            // Joystick
            joystickContainer: document.getElementById('joystickContainer'),
            joystickBase: document.getElementById('joystickBase'),
            joystickThumb: document.getElementById('joystickThumb')
        };
        
        // Floating damage numbers
        this.floatingNumbers = [];
        
        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
    }

    /**
     * Update loading progress
     * @param {number} percent 
     */
    setLoadingProgress(percent) {
        if (this.elements.loadingProgress) {
            this.elements.loadingProgress.style.width = `${percent}%`;
        }
    }

    /**
     * Show a screen
     * @param {string} screenName 
     */
    showScreen(screenName) {
        // Hide all screens
        this.elements.loadingScreen?.classList.add('hidden');
        this.elements.startScreen?.classList.add('hidden');
        this.elements.gameOverScreen?.classList.add('hidden');
        this.elements.gameUI?.classList.add('hidden');
        
        // Show requested screen
        switch (screenName) {
            case 'loading':
                this.elements.loadingScreen?.classList.remove('hidden');
                break;
            case 'start':
                this.elements.startScreen?.classList.remove('hidden');
                break;
            case 'game':
                this.elements.gameUI?.classList.remove('hidden');
                break;
            case 'gameOver':
                this.elements.gameOverScreen?.classList.remove('hidden');
                break;
        }
    }

    /**
     * Update game timer display
     * @param {number} seconds 
     */
    updateTimer(seconds) {
        if (this.elements.gameTimer) {
            this.elements.gameTimer.textContent = formatTime(seconds);
        }
    }

    /**
     * Update kill count
     * @param {number} kills 
     */
    updateKills(kills) {
        if (this.elements.killCount) {
            this.elements.killCount.textContent = kills;
        }
    }

    /**
     * Update score display
     * @param {number} score 
     */
    updateScore(score) {
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.textContent = score;
        }
    }

    /**
     * Update XP bar
     * @param {number} current 
     * @param {number} max 
     * @param {number} level 
     */
    updateXP(current, max, level) {
        if (this.elements.xpProgress) {
            const percent = (current / max) * 100;
            this.elements.xpProgress.style.width = `${percent}%`;
        }
        if (this.elements.levelDisplay) {
            this.elements.levelDisplay.textContent = `Lv.${level}`;
        }
    }

    /**
     * Update health bar
     * @param {number} current 
     * @param {number} max 
     */
    updateHealth(current, max) {
        if (this.elements.healthProgress) {
            const percent = (current / max) * 100;
            this.elements.healthProgress.style.width = `${percent}%`;
            
            // Color based on health
            if (percent <= 25) {
                this.elements.healthProgress.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
            } else if (percent <= 50) {
                this.elements.healthProgress.style.background = 'linear-gradient(90deg, #ff6600, #ff9900)';
            } else {
                this.elements.healthProgress.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
            }
        }
        if (this.elements.healthText) {
            this.elements.healthText.textContent = `${Math.ceil(current)}/${max}`;
        }
    }

    /**
     * Update weapon slots display
     * @param {Array} weapons 
     */
    updateWeapons(weapons) {
        for (let i = 0; i < 4; i++) {
            const slot = this.elements.weaponSlots[i];
            if (!slot) continue;
            
            const weapon = weapons[i];
            const iconEl = slot.querySelector('.weapon-icon');
            const levelEl = slot.querySelector('.weapon-level');
            const cooldownEl = slot.querySelector('.weapon-cooldown');
            
            if (weapon) {
                slot.classList.add('active');
                if (iconEl) iconEl.textContent = weapon.icon;
                if (levelEl) {
                    levelEl.textContent = weapon.level;
                    levelEl.style.display = 'flex';
                }
                
                // Update cooldown indicator
                if (cooldownEl) {
                    const cooldownPercent = Math.max(0, weapon.cooldown / weapon.fireRate);
                    if (cooldownPercent > 0) {
                        slot.classList.remove('ready');
                        cooldownEl.style.height = `${cooldownPercent * 100}%`;
                    } else {
                        slot.classList.add('ready');
                        cooldownEl.style.height = '0%';
                    }
                }
            } else {
                slot.classList.remove('active');
                slot.classList.remove('ready');
                if (iconEl) iconEl.textContent = '➕';
                if (levelEl) levelEl.style.display = 'none';
                if (cooldownEl) cooldownEl.style.height = '0%';
            }
        }
    }

    /**
     * Show upgrade selection modal (when player levels up in-game)
     * @param {number} newLevel 
     * @param {Array} options - Array of upgrade options
     * @param {Function} onSelect - Callback when option selected
     */
    showUpgradeModal(newLevel, options, onSelect) {
        if (this.elements.newLevelText) {
            this.elements.newLevelText.textContent = `Level ${newLevel}`;
        }
        
        if (this.elements.upgradeOptions) {
            this.elements.upgradeOptions.innerHTML = '';
            
            for (const option of options) {
                const optionEl = document.createElement('div');
                optionEl.className = 'upgrade-option';
                optionEl.innerHTML = `
                    <div class="upgrade-icon">${option.icon}</div>
                    <div class="upgrade-info">
                        <div class="upgrade-name">${option.name}</div>
                        <div class="upgrade-desc">${option.description}</div>
                    </div>
                    <span class="upgrade-rarity ${option.rarity}">${option.rarity}</span>
                `;
                
                optionEl.addEventListener('click', () => {
                    onSelect(option);
                    this.hideUpgradeModal();
                });
                
                this.elements.upgradeOptions.appendChild(optionEl);
            }
        }
        
        this.elements.upgradeModal?.classList.remove('hidden');
    }

    /**
     * Hide upgrade selection modal
     */
    hideUpgradeModal() {
        this.elements.upgradeModal?.classList.add('hidden');
    }

    /**
     * Show pause modal
     * @param {Function} onResume 
     * @param {Function} onQuit 
     */
    showPauseModal(onResume, onQuit) {
        this.elements.pauseModal?.classList.remove('hidden');
        
        // Remove old listeners
        const resumeBtn = this.elements.resumeButton;
        const quitBtn = this.elements.quitButton;
        
        if (resumeBtn) {
            const newResumeBtn = resumeBtn.cloneNode(true);
            resumeBtn.parentNode?.replaceChild(newResumeBtn, resumeBtn);
            this.elements.resumeButton = newResumeBtn;
            newResumeBtn.addEventListener('click', () => {
                this.hidePauseModal();
                onResume();
            });
        }
        
        if (quitBtn) {
            const newQuitBtn = quitBtn.cloneNode(true);
            quitBtn.parentNode?.replaceChild(newQuitBtn, quitBtn);
            this.elements.quitButton = newQuitBtn;
            newQuitBtn.addEventListener('click', () => {
                this.hidePauseModal();
                onQuit();
            });
        }
    }

    /**
     * Hide pause modal
     */
    hidePauseModal() {
        this.elements.pauseModal?.classList.add('hidden');
    }

    /**
     * Show boss warning
     */
    showBossWarning() {
        this.elements.bossWarning?.classList.remove('hidden');
    }

    /**
     * Hide boss warning
     */
    hideBossWarning() {
        this.elements.bossWarning?.classList.add('hidden');
    }
    
    /**
     * Show wave announcement
     * @param {string} title 
     * @param {number} count 
     */
    showWaveAnnouncement(title, count) {
        // Create wave announcement element if it doesn't exist
        let announcement = document.getElementById('wave-announcement');
        if (!announcement) {
            announcement = document.createElement('div');
            announcement.id = 'wave-announcement';
            announcement.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                font-size: 32px;
                font-weight: bold;
                color: #ff5722;
                text-shadow: 0 0 20px rgba(255, 87, 34, 0.8), 2px 2px 0 #000;
                z-index: 1000001;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s;
                text-align: center;
            `;
            // Append to game-container for fullscreen compatibility
            const container = document.getElementById('game-container') || document.body;
            container.appendChild(announcement);
        }
        
        announcement.innerHTML = `
            <div style="animation: pulse 0.5s infinite">${title}</div>
            <div style="font-size: 18px; color: #fff; margin-top: 5px;">x${count} enemies incoming!</div>
        `;
        announcement.style.opacity = '1';
        
        // Trigger screen shake
        this.triggerScreenShake(8, 300);
        
        // Hide after 2 seconds
        setTimeout(() => {
            announcement.style.opacity = '0';
        }, 2000);
    }

    /**
     * Update final stats on game over
     * @param {Object} stats 
     */
    updateFinalStats(stats) {
        if (this.elements.finalScore) {
            this.elements.finalScore.textContent = stats.score;
        }
        if (this.elements.finalTime) {
            this.elements.finalTime.textContent = formatTime(stats.time);
        }
        if (this.elements.finalKills) {
            this.elements.finalKills.textContent = stats.kills;
        }
        if (this.elements.finalLevel) {
            this.elements.finalLevel.textContent = stats.level;
        }
    }

    /**
     * Create floating damage number
     * @param {number} x - Screen X
     * @param {number} y - Screen Y
     * @param {number} damage 
     * @param {boolean} isCrit 
     * @param {boolean} isHeal 
     */
    createFloatingNumber(x, y, damage, isCrit = false, isHeal = false) {
        const el = document.createElement('div');
        el.className = 'floating-damage';
        if (isCrit) el.classList.add('crit');
        if (isHeal) el.classList.add('heal');
        
        el.textContent = isHeal ? `+${Math.round(damage)}` : `-${Math.round(damage)}`;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.zIndex = '1000001';
        
        // Append to game-container for fullscreen compatibility
        const container = document.getElementById('game-container') || document.body;
        container.appendChild(el);
        
        // Remove after animation
        setTimeout(() => el.remove(), 1000);
    }

    /**
     * Create damage flash effect (throttled to prevent stacking)
     */
    createDamageFlash() {
        // Prevent stacking — only one flash at a time
        if (this._damageFlashActive) return;
        this._damageFlashActive = true;

        const flash = document.createElement('div');
        flash.className = 'damage-flash';
        flash.style.zIndex = '1000001';
        
        // Append to game-container for fullscreen compatibility
        const container = document.getElementById('game-container') || document.body;
        container.appendChild(flash);
        
        setTimeout(() => {
            flash.remove();
            this._damageFlashActive = false;
        }, 200);
    }

    /**
     * Trigger screen shake
     * @param {number} intensity 
     * @param {number} duration - ms
     */
    triggerScreenShake(intensity = 5, duration = 200) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    /**
     * Update screen shake (call in game loop)
     * @param {number} deltaTime 
     * @returns {{x: number, y: number}} Shake offset
     */
    updateScreenShake(deltaTime) {
        if (this.shakeDuration <= 0) {
            return { x: 0, y: 0 };
        }
        
        this.shakeDuration -= deltaTime * 1000;
        
        const progress = this.shakeDuration / CONFIG.EFFECTS.SCREEN_SHAKE_DURATION;
        const currentIntensity = this.shakeIntensity * progress;
        
        return {
            x: MathUtils.randomRange(-currentIntensity, currentIntensity),
            y: MathUtils.randomRange(-currentIntensity, currentIntensity)
        };
    }

    /**
     * Update joystick visual
     * @param {number} dx - Normalized X (-1 to 1)
     * @param {number} dy - Normalized Y (-1 to 1)
     */
    updateJoystick(dx, dy) {
        if (!this.elements.joystickThumb) return;
        
        const maxOffset = 35; // Half of base size minus half of thumb size
        const offsetX = dx * maxOffset;
        const offsetY = dy * maxOffset;
        
        this.elements.joystickThumb.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }

    /**
     * Reset joystick to center
     */
    resetJoystick() {
        if (this.elements.joystickThumb) {
            this.elements.joystickThumb.style.transform = 'translate(0, 0)';
        }
    }

    /**
     * Show joystick at specific position (floating joystick)
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    showJoystickAt(x, y) {
        if (!this.elements.joystickContainer) return;
        
        // Position joystick centered on touch point
        this.elements.joystickContainer.style.left = `${x - 70}px`;
        this.elements.joystickContainer.style.top = `${y - 70}px`;
        this.elements.joystickContainer.classList.add('active');
    }

    /**
     * Hide floating joystick
     */
    hideJoystick() {
        if (this.elements.joystickContainer) {
            this.elements.joystickContainer.classList.remove('active');
            // Move off-screen to prevent any touch blocking
            this.elements.joystickContainer.style.left = '-200px';
            this.elements.joystickContainer.style.top = '-200px';
        }
    }

    /**
     * Show XP banner (platform integration)
     * @param {number} xpAmount 
     */
    showXPBanner(xpAmount) {
        const banner = document.createElement('div');
        banner.className = 'game-xp-banner';
        banner.innerHTML = `
            <div class="game-xp-badge">
                <span class="game-xp-icon">⭐</span>
                <span class="game-xp-amount">+${xpAmount.toFixed(2)} XP</span>
            </div>
        `;
        banner.style.zIndex = '1000001';
        
        // Append to game-container for fullscreen compatibility
        const container = document.getElementById('game-container') || document.body;
        container.appendChild(banner);
        
        setTimeout(() => {
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), 500);
        }, 3500);
    }

    // ==========================================
    // World / Portal UI methods
    // ==========================================

    /**
     * Show portal notification
     */
    showPortalNotification() {
        let notification = document.getElementById('portal-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'portal-notification';
            notification.style.cssText = `
                position: fixed;
                top: 12%;
                left: 50%;
                transform: translateX(-50%);
                font-size: 22px;
                font-weight: bold;
                color: #cc88ff;
                text-shadow: 0 0 20px rgba(150, 50, 255, 0.8), 2px 2px 0 #000;
                z-index: 1000001;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.5s;
                text-align: center;
            `;
            const container = document.getElementById('game-container') || document.body;
            container.appendChild(notification);
        }

        notification.innerHTML = `
            <div style="animation: pulse 1s infinite;">PORTAL APPEARED!</div>
            <div style="font-size: 14px; color: #ddd; margin-top: 4px;">Walk into it to teleport</div>
        `;
        notification.style.opacity = '1';

        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
    }

    /**
     * Hide portal notification
     */
    hidePortalNotification() {
        const notification = document.getElementById('portal-notification');
        if (notification) notification.style.opacity = '0';
    }

    /**
     * Show temporary boss weapon HUD indicator
     */
    showTempWeaponHUD(config) {
        let hud = document.getElementById('temp-weapon-hud');
        if (hud) hud.remove();

        // Inject keyframes if not present
        if (!document.getElementById('temp-weapon-keyframes')) {
            const style = document.createElement('style');
            style.id = 'temp-weapon-keyframes';
            style.textContent = `
                @keyframes tempWeaponAppear {
                    from { transform: translateX(-50%) translateY(20px) scale(0.8); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
                }
                @keyframes tempWeaponPulse {
                    0%, 100% { box-shadow: 0 0 15px var(--tw-glow); }
                    50% { box-shadow: 0 0 30px var(--tw-glow), 0 0 50px var(--tw-glow); }
                }
                @keyframes tempWeaponExpire {
                    0%, 20%, 40%, 60%, 80%, 100% { opacity: 1; }
                    10%, 30%, 50%, 70%, 90% { opacity: 0.3; }
                }
            `;
            document.head.appendChild(style);
        }

        hud = document.createElement('div');
        hud.id = 'temp-weapon-hud';
        hud.style.cssText = `
            --tw-glow: ${config.glowColor};
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid ${config.color};
            border-radius: 12px;
            padding: 8px 18px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 100;
            font-family: 'Orbitron', sans-serif;
            animation: tempWeaponAppear 0.4s ease-out, tempWeaponPulse 2s ease-in-out infinite;
            box-shadow: 0 0 15px ${config.glowColor};
            pointer-events: none;
        `;

        hud.innerHTML = `
            <span style="font-size: 22px;">${config.icon}</span>
            <div>
                <div style="color: ${config.color}; font-size: 12px; font-weight: bold; letter-spacing: 1px;">${config.name}</div>
                <div style="margin-top: 3px; width: 120px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                    <div id="temp-weapon-bar" style="width: 100%; height: 100%; background: ${config.color}; border-radius: 3px; transition: width 0.1s linear;"></div>
                </div>
                <div id="temp-weapon-time" style="color: rgba(255,255,255,0.7); font-size: 9px; margin-top: 2px; text-align: center;">30s</div>
            </div>
        `;

        const container = document.getElementById('game-container') || document.body;
        container.appendChild(hud);
    }

    /**
     * Update temp weapon HUD timer bar
     */
    updateTempWeaponTimer(remaining, total) {
        const bar = document.getElementById('temp-weapon-bar');
        const time = document.getElementById('temp-weapon-time');
        const hud = document.getElementById('temp-weapon-hud');
        if (!bar || !time) return;

        const pct = (remaining / total) * 100;
        bar.style.width = pct + '%';
        time.textContent = Math.ceil(remaining / 1000) + 's';

        // Flash when about to expire (last 5 seconds)
        if (remaining < 5000 && hud) {
            hud.style.animation = 'tempWeaponExpire 1s step-end infinite';
        }
    }

    /**
     * Hide temp weapon HUD
     */
    hideTempWeaponHUD() {
        const hud = document.getElementById('temp-weapon-hud');
        if (hud) {
            hud.style.transition = 'opacity 0.5s';
            hud.style.opacity = '0';
            setTimeout(() => hud.remove(), 500);
        }
    }

    /**
     * Show the portal choice modal (random world, only sacrifice choice)
     * @param {string} worldId - Destination world ID
     * @param {Object} destWorld - World config object
     * @param {Array} playerWeapons - Current weapon info
     * @param {Function} onChoice - Callback with {action, sacrificeIndex}
     */
    showPortalChoiceModal(worldId, destWorld, playerWeapons, onChoice) {
        let modal = document.getElementById('portal-choice-modal');
        if (modal) modal.remove();

        // Inject keyframes if not present
        if (!document.getElementById('portal-keyframes')) {
            const style = document.createElement('style');
            style.id = 'portal-keyframes';
            style.textContent = `
                @keyframes portalSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes portalPulse { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 1; } }
                @keyframes portalGlow { 0%,100% { box-shadow: 0 0 30px rgba(150,50,255,0.4); } 50% { box-shadow: 0 0 60px rgba(150,50,255,0.8); } }
                @keyframes fadeSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                .portal-btn:hover { transform: scale(1.05); filter: brightness(1.2); }
                .portal-btn:active { transform: scale(0.97); }
                .sacrifice-btn.selected { border-color: #ff2222 !important; background: rgba(255,50,50,0.4) !important; box-shadow: 0 0 15px rgba(255,0,0,0.5) !important; }
            `;
            document.head.appendChild(style);
        }

        const accentColor = destWorld?.background?.accentColor || '#7b2ff7';

        modal = document.createElement('div');
        modal.id = 'portal-choice-modal';
        modal.style.cssText = `
            position: fixed; top:0; left:0; right:0; bottom:0;
            background: radial-gradient(ellipse at center, rgba(30,10,60,0.95) 0%, rgba(0,0,0,0.97) 70%);
            z-index: 1000002;
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-family: 'Orbitron', sans-serif;
            opacity: 0; transition: opacity 0.3s;
        `;

        // Portal vortex visual
        let html = `
        <div style="text-align:center; max-width:420px; padding:20px; animation: fadeSlideUp 0.4s ease-out;">
            <!-- Vortex -->
            <div style="position:relative; width:120px; height:120px; margin:0 auto 16px;">
                <div style="position:absolute; inset:0; border-radius:50%; border:3px solid ${accentColor}; opacity:0.5; animation: portalSpin 3s linear infinite;"></div>
                <div style="position:absolute; inset:10px; border-radius:50%; border:2px dashed rgba(200,150,255,0.5); animation: portalSpin 2s linear infinite reverse;"></div>
                <div style="position:absolute; inset:20px; border-radius:50%; background: radial-gradient(circle, ${accentColor}44 0%, transparent 70%); animation: portalPulse 2s ease-in-out infinite;"></div>
                <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:40px;">
                    ${destWorld?.icon || '🌀'}
                </div>
            </div>

            <!-- Title -->
            <div style="font-size:13px; color:#aaa; text-transform:uppercase; letter-spacing:2px; margin-bottom:4px;">Dimensional Rift to</div>
            <div style="font-size:24px; color:${accentColor}; text-shadow: 0 0 20px ${accentColor}88; margin-bottom:6px; font-weight:bold;">
                ${destWorld?.name || 'Unknown'}
            </div>
            <div style="font-size:12px; color:#888; margin-bottom:20px;">${destWorld?.description || ''}</div>
        `;

        // Weapon sacrifice section (only if slots full)
        if (playerWeapons.length >= 4) {
            html += `
            <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,150,0,0.3); border-radius:10px; padding:12px; margin-bottom:16px;">
                <div style="font-size:11px; color:#ff9900; margin-bottom:8px; text-transform:uppercase; letter-spacing:1px;">
                    ⚠ Slots full — sacrifice a weapon?
                </div>
                <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
            `;
            for (const w of playerWeapons) {
                html += `
                    <button class="sacrifice-btn" data-index="${w.index}" style="
                        background: rgba(60,20,20,0.5);
                        border: 2px solid #663333;
                        color: #fff;
                        padding: 6px 10px;
                        border-radius: 8px;
                        font-size: 13px;
                        cursor: pointer;
                        font-family: 'Orbitron', sans-serif;
                        transition: all 0.15s;
                        display: flex; align-items: center; gap: 4px;
                    "><span style="font-size:16px;">${w.icon}</span> Lv.${w.level}</button>
                `;
            }
            html += `</div>
                <div style="font-size:10px; color:#666; margin-top:6px;">Tap to select, enter to sacrifice</div>
            </div>`;
        }

        // Action buttons
        html += `
            <div style="display:flex; gap:10px; justify-content:center; margin-top:4px;">
                <button id="portal-enter" class="portal-btn" style="
                    background: linear-gradient(135deg, ${accentColor}cc, ${accentColor}66);
                    border: 2px solid ${accentColor};
                    color: #fff;
                    padding: 11px 28px;
                    border-radius: 10px;
                    font-size: 14px;
                    cursor: pointer;
                    font-family: 'Orbitron', sans-serif;
                    transition: all 0.15s;
                    animation: portalGlow 2s infinite;
                ">🌀 ENTER</button>
                <button id="portal-ignore" class="portal-btn" style="
                    background: rgba(80,80,80,0.3);
                    border: 2px solid #555;
                    color: #999;
                    padding: 11px 28px;
                    border-radius: 10px;
                    font-size: 14px;
                    cursor: pointer;
                    font-family: 'Orbitron', sans-serif;
                    transition: all 0.15s;
                ">Stay</button>
            </div>
        </div>`;

        modal.innerHTML = html;
        const container = document.getElementById('game-container') || document.body;
        container.appendChild(modal);

        // Fade in
        requestAnimationFrame(() => { modal.style.opacity = '1'; });

        // State
        let selectedSacrifice = null;

        // Sacrifice buttons
        const sacrificeBtns = modal.querySelectorAll('.sacrifice-btn');
        sacrificeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                if (selectedSacrifice === idx) {
                    selectedSacrifice = null;
                    btn.classList.remove('selected');
                } else {
                    selectedSacrifice = idx;
                    sacrificeBtns.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                }
            });
        });

        // Enter button
        modal.querySelector('#portal-enter')?.addEventListener('click', () => {
            modal.style.opacity = '0';
            setTimeout(() => { modal.remove(); }, 200);
            onChoice({ action: 'enter', sacrificeIndex: selectedSacrifice });
        });

        // Stay button
        modal.querySelector('#portal-ignore')?.addEventListener('click', () => {
            modal.style.opacity = '0';
            setTimeout(() => { modal.remove(); }, 200);
            onChoice({ action: 'ignore' });
        });
    }

    /**
     * Show full-screen teleport animation with callbacks
     * @param {Object} world - Destination world config
     * @param {Function} onMidpoint - Called when screen is fully covered (do world swap here)
     * @param {Function} onComplete - Called when animation finishes
     */
    showTeleportAnimation(world, onMidpoint, onComplete) {
        let overlay = document.getElementById('teleport-overlay');
        if (overlay) overlay.remove();

        const accentColor = world.background?.accentColor || '#7b2ff7';

        // Inject teleport keyframes
        if (!document.getElementById('teleport-keyframes')) {
            const style = document.createElement('style');
            style.id = 'teleport-keyframes';
            style.textContent = `
                @keyframes warpLines {
                    0% { transform: scaleY(0); opacity: 0; }
                    30% { transform: scaleY(1); opacity: 1; }
                    100% { transform: scaleY(3) scaleX(0.3); opacity: 0; }
                }
                @keyframes vortexSpin {
                    from { transform: translate(-50%,-50%) rotate(0deg) scale(0.3); opacity:0; }
                    50% { transform: translate(-50%,-50%) rotate(360deg) scale(1.5); opacity:1; }
                    to { transform: translate(-50%,-50%) rotate(720deg) scale(3); opacity:0; }
                }
                @keyframes darkCover {
                    0% { opacity: 0; }
                    70% { opacity: 1; }
                    100% { opacity: 1; }
                }
                @keyframes arrivalPulse {
                    0% { transform: translate(-50%,-50%) scale(3); opacity: 0.8; }
                    100% { transform: translate(-50%,-50%) scale(0); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        overlay = document.createElement('div');
        overlay.id = 'teleport-overlay';
        overlay.style.cssText = `
            position: fixed; top:0; left:0; right:0; bottom:0;
            z-index: 1000003; pointer-events: none; overflow: hidden;
        `;

        // Warp speed lines
        let lines = '';
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 100;
            const delay = Math.random() * 0.4;
            const hue = 250 + Math.random() * 40;
            lines += `<div style="
                position: absolute;
                left: ${x}%;
                top: 0; bottom: 0;
                width: 2px;
                background: linear-gradient(to bottom, transparent, hsla(${hue},80%,70%,0.8), transparent);
                animation: warpLines 1s ${delay}s ease-in forwards;
                transform-origin: center;
            "></div>`;
        }

        // Vortex circle
        const vortex = `<div style="
            position: absolute;
            top: 50%; left: 50%;
            width: 200px; height: 200px;
            border-radius: 50%;
            border: 4px solid ${accentColor};
            box-shadow: 0 0 60px ${accentColor}, inset 0 0 40px ${accentColor}44;
            animation: vortexSpin 1.2s ease-in-out forwards;
        "></div>`;

        // Dark overlay that covers screen before world swap
        const darkOverlay = `<div id="teleport-dark" style="
            position: absolute; inset: 0;
            background: radial-gradient(ellipse at center, #1a0033 0%, #000000 70%);
            animation: darkCover 0.7s ease-in forwards;
        "></div>`;

        overlay.innerHTML = lines + vortex + darkOverlay;

        const container = document.getElementById('game-container') || document.body;
        container.appendChild(overlay);

        // Midpoint callback (screen is fully covered at ~700ms)
        setTimeout(() => {
            if (onMidpoint) onMidpoint();
        }, 700);

        // After flash, show arrival in new world
        setTimeout(() => {
            overlay.innerHTML = `
                <div style="
                    position: absolute; inset: 0;
                    background: ${world.background?.color || '#1a0a2e'};
                    opacity: 0.9;
                    transition: opacity 0.8s;
                "></div>
                <div style="
                    position: absolute; top: 50%; left: 50%;
                    width: 300px; height: 300px;
                    border-radius: 50%;
                    background: radial-gradient(circle, ${accentColor}66, transparent 70%);
                    animation: arrivalPulse 0.8s ease-out forwards;
                "></div>
                <div style="
                    position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    font-family: 'Orbitron', sans-serif;
                    opacity: 0;
                    animation: fadeSlideUp 0.5s 0.1s ease-out forwards;
                ">
                    <div style="font-size: 28px; color: ${accentColor}; text-shadow: 0 0 30px ${accentColor}88; font-weight: bold; letter-spacing: 3px;">
                        ${world.name}
                    </div>
                </div>
            `;

            // Fade out the background overlay
            const bgOverlay = overlay.querySelector('div');
            if (bgOverlay) {
                setTimeout(() => { bgOverlay.style.opacity = '0'; }, 800);
            }
        }, 900);

        // Complete: remove overlay, resume game
        setTimeout(() => {
            overlay.style.transition = 'opacity 0.4s';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                if (onComplete) onComplete();
            }, 400);
        }, 2200);
    }

    /**
     * Show world transition animation (legacy, kept for compat)
     */
    showWorldTransition(worldName, worldIcon) {
        // Now handled by showTeleportAnimation
    }

    /**
     * Update world indicator in HUD
     */
    updateWorldIndicator(worldName) {
        let indicator = document.getElementById('world-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'world-indicator';
            indicator.style.cssText = `
                position: absolute;
                top: 8px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 14px;
                color: #cc88ff;
                font-family: 'Orbitron', sans-serif;
                text-shadow: 0 0 10px rgba(150, 50, 255, 0.6);
                pointer-events: none;
                z-index: 100;
                letter-spacing: 2px;
            `;
            const gameUI = document.getElementById('gameUI');
            if (gameUI) {
                gameUI.appendChild(indicator);
            }
        }

        indicator.textContent = worldName;
        indicator.style.display = 'block';
    }

    /**
     * Show world entry animation (for game start, no teleport effect)
     * @param {Object} world - World config
     * @param {Function} onComplete - Called when animation finishes
     */
    showWorldEntryAnimation(world, onComplete) {
        const accentColor = world.background?.accentColor || '#7b2ff7';

        // Inject entry keyframe
        if (!document.getElementById('world-entry-keyframes')) {
            const style = document.createElement('style');
            style.id = 'world-entry-keyframes';
            style.textContent = `
                @keyframes worldEntryFade {
                    0% { opacity: 0; transform: translate(-50%, -40%); }
                    100% { opacity: 1; transform: translate(-50%, -50%); }
                }
            `;
            document.head.appendChild(style);
        }

        let overlay = document.getElementById('world-entry-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'world-entry-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            z-index: 1000003; pointer-events: none; overflow: hidden;
            background: ${world.background?.color || '#0d0518'};
            opacity: 1;
            transition: opacity 0.6s;
        `;
        overlay.innerHTML = `
            <div style="
                position: absolute; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                font-family: 'Orbitron', sans-serif;
                opacity: 0;
                animation: worldEntryFade 0.6s 0.2s ease-out forwards;
            ">
                <div style="font-size: 30px; color: ${accentColor}; text-shadow: 0 0 30px ${accentColor}88; font-weight: bold; letter-spacing: 4px;">
                    ${world.name}
                </div>
                <div style="font-size: 14px; color: rgba(255,255,255,0.5); margin-top: 10px; letter-spacing: 2px;">
                    ${world.description || ''}
                </div>
            </div>
        `;

        const container = document.getElementById('game-container') || document.body;
        container.appendChild(overlay);

        // Fade out after showing
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                if (onComplete) onComplete();
            }, 600);
        }, 1800);
    }
}

export { UIManager };