/**
 * Survivor Arena - UI Manager
 * @fileoverview Handles all UI updates and interactions
 */

'use strict';

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
                z-index: 1000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s;
                text-align: center;
            `;
            document.body.appendChild(announcement);
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
        
        document.body.appendChild(el);
        
        // Remove after animation
        setTimeout(() => el.remove(), 1000);
    }

    /**
     * Create damage flash effect
     */
    createDamageFlash() {
        const flash = document.createElement('div');
        flash.className = 'damage-flash';
        document.body.appendChild(flash);
        
        setTimeout(() => flash.remove(), 200);
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
        
        document.body.appendChild(banner);
        
        setTimeout(() => {
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), 500);
        }, 3500);
    }
}

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
