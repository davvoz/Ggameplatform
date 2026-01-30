/**
 * Daily Login Rewards Banner
 * Shows a 7-day login reward cycle with progressive rewards
 */

class DailyLoginBanner {
    constructor() {
        this.apiUrl = window.ENV?.API_URL || window.location.origin || 'http://localhost:8000';
        this.currentUser = null;
        this.bannerElement = null;
        this.isVisible = false;
        
        // Reward schedule will be loaded from backend
        this.rewards = {};
    }
    
    /**
     * Initialize the banner with user data
     */
    async init(user) {
        if (!user || !user.user_id) {

            return;
        }
        
        // Block anonymous users from daily login rewards
        if (user.is_anonymous) {
            return;
        }
        
        this.currentUser = user;
        await this.createBanner();
        await this.updateStatus();
        
        // Check if should show trigger button (only if can claim)
        await this.updateTriggerButtonVisibility();
        
    }
    
    /**
     * Create the banner HTML element
     */
    async createBanner() {
        // Remove existing banner if present
        const existingBanner = document.getElementById('daily-login-banner');
        if (existingBanner) {
            existingBanner.remove();
        }
        
        // Create banner container
        this.bannerElement = document.createElement('div');
        this.bannerElement.id = 'daily-login-banner';
        this.bannerElement.className = 'daily-login-banner';
        this.bannerElement.style.display = 'none'; // Hidden by default
        
        // Add to body
        document.body.appendChild(this.bannerElement);
    }
    
    /**
     * Fetch and update banner status from server
     */
    async updateStatus() {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch(
                `${this.apiUrl}/users/daily-login-status/${this.currentUser.user_id}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch daily login status');
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Update rewards config from backend
                if (data.rewards && data.rewards.length > 0) {
                    this.rewards = {};
                    data.rewards.forEach(reward => {
                        this.rewards[reward.day] = {
                            coins: reward.coins,
                            emoji: reward.emoji || '🪙'
                        };
                    });
                }
                
                this.renderBanner(data);
            }
        } catch (error) {
        }
    }
    
    /**
     * Render the banner with current status
     */
    renderBanner(status) {
        if (!this.bannerElement) return;
        
        const canClaim = status.can_claim_today;
        const currentDay = status.current_day;
        const totalCycles = status.total_cycles_completed || 0;
        
        let html = `
            <div class="daily-login-content">
                <div class="daily-login-header">
                    <h3>🎁 Daily Login Rewards</h3>
                    <button class="close-banner" onclick="dailyLoginBanner.hide()">✕</button>
                </div>
                
                ${totalCycles > 0 ? `
                    <div class="daily-login-cycles">
                        <span>🏆 Completed ${totalCycles} cycle${totalCycles > 1 ? 's' : ''}!</span>
                    </div>
                ` : ''}
                
                <div class="daily-login-grid">
        `;
        
        // Render each day
        for (let day = 1; day <= 7; day++) {
            const dayStatus = this.getDayStatus(day, currentDay, canClaim);
            const reward = this.rewards[day];
            
            html += `
                <div class="daily-login-day ${dayStatus.className}">
                    <div class="day-number">Day ${day}</div>
                    <div class="day-emoji">${reward.emoji}</div>
                    <div class="day-reward">${reward.coins} coins</div>
                    ${dayStatus.badge ? `<div class="day-badge">${dayStatus.badge}</div>` : ''}
                </div>
            `;
        }
        
        html += `
                </div>
                
                <div class="daily-login-footer">
                    ${canClaim ? `
                        <button class="claim-button" onclick="dailyLoginBanner.claimReward()">
                            🎁 Claim Day ${currentDay} Reward
                        </button>
                        <p class="claim-hint">Come back tomorrow for more rewards!</p>
                    ` : `
                        <div class="already-claimed">
                            <span>✅ Already claimed today!</span>
                            <p>Come back tomorrow for Day ${currentDay} reward</p>
                        </div>
                    `}
                    ${currentDay > 1 ? `
                        <p class="streak-info">🔥 ${currentDay - 1} day streak! Keep it up!</p>
                    ` : ''}
                </div>
            </div>
        `;
        
        this.bannerElement.innerHTML = html;
    }
    
    /**
     * Determine the status class and badge for a day
     */
    getDayStatus(day, currentDay, canClaim) {
        // Se possiamo claimare, currentDay è il giorno disponibile
        // Se NON possiamo claimare, currentDay è il prossimo giorno (già avanzato dopo il claim)
        
        if (canClaim) {
            // User can claim today
            if (day < currentDay) {
                return { className: 'claimed', badge: '✓' };
            } else if (day === currentDay) {
                return { className: 'available pulsing', badge: '!' };
            } else {
                return { className: 'locked', badge: '🔒' };
            }
        } else {
            // User already claimed today, currentDay is already the next day
            if (day < currentDay) {
                return { className: 'claimed', badge: '✓' };
            } else {
                return { className: 'locked', badge: '🔒' };
            }
        }
    }
    
    /**
     * Claim the daily reward
     */
    async claimReward() {
        if (!this.currentUser) return;
        
        try {
            // Disable button to prevent double-clicking
            const claimButton = this.bannerElement.querySelector('.claim-button');
            if (claimButton) {
                claimButton.disabled = true;
                claimButton.textContent = 'Claiming...';
            }
            
            const response = await fetch(
                `${this.apiUrl}/users/daily-login-claim/${this.currentUser.user_id}`,
                { method: 'POST' }
            );
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Trigger celebration animation BEFORE updating
                await this.playClaimAnimation(data);
                
                // Update banner after animation
                await this.updateStatus();
                await this.updateTriggerButtonVisibility();
                
                // Emit event for other components to update
                window.dispatchEvent(new CustomEvent('dailyRewardClaimed', {
                    detail: data
                }));
            } else {
                throw new Error(data.detail || 'Failed to claim reward');
            }
        } catch (error) {
            alert(error.message || 'Failed to claim reward. Please try again.');
            
            // Re-enable button
            const claimButton = this.bannerElement.querySelector('.claim-button');
            if (claimButton) {
                claimButton.disabled = false;
                claimButton.textContent = `🎁 Claim Reward`;
            }
        }
    }
    
    /**
     * Play celebration animation when claiming reward
     */
    async playClaimAnimation(data) {
        return new Promise((resolve) => {
            // Find the available day card
            const availableCard = this.bannerElement.querySelector('.daily-login-day.available');
            if (!availableCard) {
                resolve();
                return;
            }
            
            // Add claiming animation class
            availableCard.classList.add('claiming');
            
            // Create floating coins animation
            this.createFloatingCoins(availableCard, data.coins_earned || 0);
            
            // Create confetti effect
            this.createConfetti();
            
            // Wait for animations to complete
            setTimeout(() => {
                resolve();
            }, 1500);
        });
    }
    
    /**
     * Create floating coins animation
     */
    createFloatingCoins(sourceElement, coinsAmount) {
        const rect = sourceElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Create multiple coin elements
        const numCoins = Math.min(8, Math.max(3, Math.floor(coinsAmount / 10)));
        
        for (let i = 0; i < numCoins; i++) {
            const coin = document.createElement('div');
            coin.className = 'floating-coin';
            coin.textContent = '🪙';
            coin.style.left = centerX + 'px';
            coin.style.top = centerY + 'px';
            
            // Random spread
            const angle = (Math.PI * 2 * i) / numCoins;
            const distance = 80 + Math.random() * 40;
            const offsetX = Math.cos(angle) * distance;
            const offsetY = Math.sin(angle) * distance - 100; // Bias upward
            
            coin.style.setProperty('--offset-x', offsetX + 'px');
            coin.style.setProperty('--offset-y', offsetY + 'px');
            coin.style.animationDelay = (i * 0.05) + 's';
            
            document.body.appendChild(coin);
            
            // Remove after animation
            setTimeout(() => coin.remove(), 1500);
        }
    }
    
    /**
     * Create confetti celebration effect
     */
    createConfetti() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];
        const confettiCount = 30;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.backgroundColor = color;
            
            // Random position across top of screen
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            
            // Random animation delay and duration
            confetti.style.animationDelay = (Math.random() * 0.5) + 's';
            confetti.style.animationDuration = (1 + Math.random() * 1) + 's';
            
            // Random rotation
            confetti.style.setProperty('--rotation', Math.random() * 360 + 'deg');
            
            document.body.appendChild(confetti);
            
            // Remove after animation
            setTimeout(() => confetti.remove(), 2500);
        }
    }
    
    /**
     * Show the banner
     */
    show() {

        if (this.bannerElement) {
            // Show overlay
            const overlay = document.getElementById('daily-login-overlay');
            if (overlay) {
                overlay.style.display = 'block';
                setTimeout(() => overlay.classList.add('visible'), 10);
            }
            
            this.bannerElement.style.display = 'block';
            setTimeout(() => {
                this.bannerElement.classList.add('visible');
            }, 10);
            this.isVisible = true;
            
            // Hide trigger button
            const trigger = document.getElementById('daily-login-trigger');
            if (trigger) {
                trigger.style.display = 'none';
            }
        } else {

        }
    }
    
    /**
     * Hide the banner
     */
    hide() {

        if (this.bannerElement) {
            // Hide overlay
            const overlay = document.getElementById('daily-login-overlay');
            if (overlay) {
                overlay.classList.remove('visible');
                setTimeout(() => overlay.style.display = 'none', 300);
            }
            
            this.bannerElement.classList.remove('visible');
            setTimeout(() => {
                this.bannerElement.style.display = 'none';
            }, 300);
            this.isVisible = false;
            
            // Show trigger button ONLY if user can still claim
            this.updateTriggerButtonVisibility();
        }
    }
    
    /**
     * Toggle banner visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Check if banner should auto-show today
     */
    shouldAutoShow() {
        // Always check if user can claim - don't store closed state
        return true; // Will be controlled by updateTriggerButtonVisibility
    }
    
    /**
     * Quick claim from floating button
     */
    async quickClaim() {
        if (!this.currentUser) return;
        

        
        try {
            const trigger = document.getElementById('daily-login-trigger');
            if (trigger) {
                trigger.disabled = true;
                trigger.style.opacity = '0.6';
            }
            
            const response = await fetch(
                `${this.apiUrl}/users/daily-login-claim/${this.currentUser.user_id}`,
                { method: 'POST' }
            );
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Hide trigger button immediately
                if (trigger) {
                    trigger.style.display = 'none';
                }
                
                // Show success animation
                this.showClaimSuccess(data);
                
                // Update status
                await this.updateStatus();
                
                // Emit event for coin balance update
                window.dispatchEvent(new CustomEvent('dailyRewardClaimed', {
                    detail: data
                }));
                

            } else {
                throw new Error(data.detail || 'Failed to claim reward');
            }
        } catch (error) {
            console.error('Error in quick claim:', error);
            alert(error.message || 'Failed to claim reward. Please try again.');
            
            // Re-enable button
            const trigger = document.getElementById('daily-login-trigger');
            if (trigger) {
                trigger.disabled = false;
                trigger.style.opacity = '1';
            }
        }
    }
    
    /**
     * Update trigger button visibility based on claim status
     */
    async updateTriggerButtonVisibility() {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch(
                `${this.apiUrl}/users/daily-login-status/${this.currentUser.user_id}`
            );
            
            if (response.ok) {
                const data = await response.json();
                const trigger = document.getElementById('daily-login-trigger');
                
                if (trigger && data.success) {
                    // Show button ONLY if user can claim
                    if (data.can_claim_today) {
                        trigger.style.display = 'flex';
                        trigger.classList.add('has-reward');
                    } else {
                        trigger.style.display = 'none';
                        trigger.classList.remove('has-reward');
                    }
                }
            }
        } catch (error) {
        }
    }
    
    /**
     * Update the trigger button appearance based on claim status
     * @deprecated - Use updateTriggerButtonVisibility instead
     */
    async updateTriggerButton() {
        await this.updateTriggerButtonVisibility();
    }
    
    /**
     * Reload profile badge after claiming (if on profile page)
     * @deprecated - No longer needed as we removed the profile badge
     */
    async reloadProfileBadge(userId) {
        // Badge removed, this function is kept for compatibility

    }
}

// Global instance
window.dailyLoginBanner = new DailyLoginBanner();
