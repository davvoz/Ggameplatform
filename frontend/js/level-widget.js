import AuthManager from './auth.js';

/**
 * Calculate XP data from level info, handling old/new backend field names.
 */
export function calculateXpData(levelInfo) {
    const xpInLevel = levelInfo?.xp_in_level ?? (levelInfo?.current_xp - levelInfo?.xp_current_level || 0);
    const xpRequiredForNext = levelInfo?.xp_required_for_next_level ?? levelInfo?.xp_needed_for_next ?? (levelInfo?.xp_next_level - levelInfo?.xp_current_level);
    const xpToNext = levelInfo?.xp_to_next_level ?? Math.max(0, (xpRequiredForNext || 0) - xpInLevel);
    return { xpInLevel, xpRequiredForNext, xpToNext };
}

/**
 * Helper: create an element with optional className, textContent and children.
 */
function el(tag, className, textOrChildren) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof textOrChildren === 'string') {
        node.textContent = textOrChildren;
    } else if (Array.isArray(textOrChildren)) {
        for (const child of textOrChildren) {
            if (child) node.appendChild(child);
        }
    }
    return node;
}

/**
 * Build the level card as a DOM element used by profile pages.
 * Shared between ProfileRenderer and UserProfileRenderer.
 * @returns {HTMLElement}
 */
export function buildLevelCardElement(levelInfo, totalXP) {
    const color = levelInfo.color || '#6366f1';
    const { xpToNext } = calculateXpData(levelInfo);
    const progressPercent = levelInfo.progress_percent || 0;

    // Card wrapper — set CSS custom property for dynamic color
    const card = el('div', 'level-card');
    card.style.setProperty('--lc-color', color);

    // Header row (badge + level info)
    const headerRow = el('div', 'level-card__header');
    const badgeCircle = el('div', 'level-card__badge-circle', [
        el('span', 'level-card__badge-icon', String(levelInfo.badge))
    ]);
    headerRow.appendChild(badgeCircle);

    const infoCol = el('div', 'level-card__info', [
        el('div', 'level-card__level-number', `Level ${levelInfo.current_level}`),
        el('div', 'level-card__title', String(levelInfo.title))
    ]);
    headerRow.appendChild(infoCol);
    card.appendChild(headerRow);

    // Progress section
    const progressSection = el('div', 'level-card__progress');
    const progressHeader = el('div', 'level-card__progress-header', [
        el('span', 'level-card__progress-label', 'Progress'),
        el('span', 'level-card__progress-percent', `${progressPercent.toFixed(1)}%`)
    ]);
    progressSection.appendChild(progressHeader);

    const progressTrack = el('div', 'level-card__progress-track');
    const progressFill = el('div', 'level-card__progress-fill');
    progressFill.style.width = `${progressPercent}%`;
    progressTrack.appendChild(progressFill);
    progressSection.appendChild(progressTrack);
    card.appendChild(progressSection);

    // Stats grid
    const statsGrid = el('div', 'level-card__stats');

    statsGrid.appendChild(el('div', 'level-card__stat', [
        el('span', 'level-card__stat-label', '💰 Total XP'),
        el('span', 'level-card__stat-value', totalXP.toFixed(0))
    ]));

    if (xpToNext > 0) {
        statsGrid.appendChild(el('div', 'level-card__stat', [
            el('span', 'level-card__stat-label', '🎯 Next lvl'),
            el('span', 'level-card__stat-value--accent', xpToNext.toFixed(0))
        ]));
    } else {
        statsGrid.appendChild(el('div', 'level-card__max-level', [
            el('span', 'level-card__max-level-text', '🏆 MAX LEVEL')
        ]));
    }

    card.appendChild(statsGrid);
    return card;
}

/**
 * Show a level-up modal/notification.
 */
export function showLevelUpModal(levelUpData) {
    const { old_level, new_level, title, badge, coins_awarded, is_milestone } = levelUpData;

    const currentUser = AuthManager?.currentUser;
    const isAnonymous = currentUser?.is_anonymous === true;

    const modal = el('div', 'level-up-modal');

    const content = el('div', `level-up-content ${is_milestone ? 'milestone' : ''}`.trim());

    // Animation
    const animation = el('div', 'level-up-animation');
    animation.appendChild(el('div', 'level-up-rays'));
    const badgeContainer = el('div', 'level-up-badge-container');
    badgeContainer.appendChild(el('span', 'level-up-badge', String(badge)));
    animation.appendChild(badgeContainer);
    content.appendChild(animation);

    // Title
    content.appendChild(el('h2', 'level-up-title', '🎉 LEVEL UP! 🎉'));

    // Levels
    const levels = el('div', 'level-up-levels', [
        el('span', 'old-level', String(old_level)),
        el('span', 'level-arrow', '→'),
        el('span', 'new-level', String(new_level))
    ]);
    content.appendChild(levels);

    // New title
    content.appendChild(el('div', 'level-up-new-title', String(title)));

    // Milestone badge
    if (is_milestone) {
        content.appendChild(el('div', 'level-up-milestone-badge', '✨ MILESTONE ✨'));
    }

    // Reward
    if (!isAnonymous && coins_awarded > 0) {
        const reward = el('div', 'level-up-reward', [
            el('span', 'reward-icon', '🪙'),
            el('span', 'reward-amount', `+${coins_awarded} Coins`)
        ]);
        content.appendChild(reward);
    }

    // Close button
    const closeBtn = el('button', 'level-up-close', 'Continue');
    content.appendChild(closeBtn);

    modal.appendChild(content);

    if (!document.querySelector('#level-up-styles')) {
        const link = document.createElement('link');
        link.id = 'level-up-styles';
        link.rel = 'stylesheet';
        link.href = '/css/level-widget.css';
        document.head.appendChild(link);
    }

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });

    setTimeout(() => {
        if (modal.parentElement) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }, 5000);
}

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
        const { xpInLevel, xpRequiredForNext } = calculateXpData(this.levelData);

        const widget = el('div', 'level-widget');

        // Header
        const header = el('div', 'level-header', [
            el('span', 'level-badge', String(badge)),
            el('div', 'level-info', [
                el('div', 'level-number', `Livello ${current_level}`),
                el('div', 'level-title', String(title))
            ])
        ]);
        widget.appendChild(header);

        // Progress
        const progressContainer = el('div', 'level-progress-container');
        const progressBar = el('div', 'level-progress-bar');
        const progressFill = el('div', 'level-progress-fill');
        progressFill.style.width = `${progress_percent}%`;
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(
            el('div', 'level-progress-text', `${Math.round(xpInLevel)} / ${Math.round(xpRequiredForNext)} XP`)
        );
        widget.appendChild(progressContainer);

        if (this.container) {
            this.container.textContent = '';
            this.container.appendChild(widget);
        }

        return widget;
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
        showLevelUpModal(levelUpData);
    }
}

export default LevelWidget;
