/**
 * Level Widget - Display user level, progress, and handle level-up notifications
 */

class LevelWidget {
    constructor() {
        this.container = null;
        this.levelData = null;
        this.userId = null;
    }

    /**
     * Initialize widget for a user
     */
    async init(userId) {
        this.userId = userId;
        await this.loadLevelData();
        this.render();
    }

    /**
     * Load level data from API
     */
    async loadLevelData() {
        if (!this.userId) return;

        try {
            const API_URL = window.ENV?.API_URL || window.config?.API_URL || window.location.origin;
            const response = await fetch(`${API_URL}/api/levels/${this.userId}`);
            if (response.ok) {
                this.levelData = await response.json();
            }
        } catch (error) {
            console.error('Failed to load level data:', error);
        }
    }

    /**
     * Render the level widget
     */
    render() {
        if (!this.levelData) return;

        const { current_level, title, badge, progress_percent } = this.levelData;

        // Support both old and new backend field names for per-level XP
        const xp_in_level = this.levelData.xp_in_level ?? (this.levelData.current_xp - this.levelData.xp_current_level || 0);
        const xp_required_for_next_level = this.levelData.xp_required_for_next_level ?? this.levelData.xp_needed_for_next ?? (this.levelData.xp_next_level - this.levelData.xp_current_level);
        const xp_to_next_level = this.levelData.xp_to_next_level ?? Math.max(0, (xp_required_for_next_level || 0) - xp_in_level);

        const html = `
            <div class="level-widget">
                <div class="level-header">
                    <span class="level-badge">${badge}</span>
                    <div class="level-info">
                        <div class="level-number">Livello ${current_level}</div>
                        <div class="level-title">${title}</div>
                    </div>
                </div>
                <div class="level-progress-container">
                    <div class="level-progress-bar">
                        <div class="level-progress-fill" style="width: ${progress_percent}%"></div>
                    </div>
                    <div class="level-progress-text">${Math.round(xp_in_level)} / ${Math.round(xp_required_for_next_level)} XP</div>
                </div>
            </div>
        `;

        if (this.container) {
            this.container.innerHTML = html;
        }

        return html;
    }

    /**
     * Set container element for the widget
     */
    setContainer(container) {
        this.container = container;
        if (this.levelData) {
            this.render();
        }
    }

    /**
     * Update level data (call after XP gain)
     */
    async refresh() {
        await this.loadLevelData();
        this.render();
    }

    /**
     * Show level-up modal/notification
     */
    showLevelUpNotification(levelUpData) {
        const { old_level, new_level, title, badge, coins_awarded, is_milestone } = levelUpData;

        // Check if user is anonymous
        const currentUser = window.AuthManager?.currentUser;
        const isAnonymous = currentUser?.is_anonymous === true;

        const modal = document.createElement('div');
        modal.className = 'level-up-modal';
        modal.innerHTML = `
            <div class="level-up-content ${is_milestone ? 'milestone' : ''}">
                <div class="level-up-animation">
                    <div class="level-up-rays"></div>
                    <div class="level-up-badge-container">
                        <span class="level-up-badge">${badge}</span>
                    </div>
                </div>
                <h2 class="level-up-title">🎉 LEVEL UP! 🎉</h2>
                <div class="level-up-levels">
                    <span class="old-level">${old_level}</span>
                    <span class="level-arrow">→</span>
                    <span class="new-level">${new_level}</span>
                </div>
                <div class="level-up-new-title">${title}</div>
                ${is_milestone ? '<div class="level-up-milestone-badge">✨ MILESTONE ✨</div>' : ''}
                ${!isAnonymous && coins_awarded > 0 ? `
                    <div class="level-up-reward">
                        <span class="reward-icon">🪙</span>
                        <span class="reward-amount">+${coins_awarded} Coins</span>
                    </div>
                ` : ''}
                <button class="level-up-close">Continua</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Trigger animation
        setTimeout(() => modal.classList.add('show'), 10);

        // Close handler
        const closeBtn = modal.querySelector('.level-up-close');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        }, 5000);
    }
}

// Export as global for compatibility
window.LevelWidget = LevelWidget;

export default LevelWidget;
