/**
 * DOM-side notification widgets (XP banner, Level-up modal).
 *
 * SRP: knows ONLY how to render trusted-shape data into the DOM safely.
 * Defense-in-depth against XSS — never uses innerHTML with external data.
 * All dynamic strings flow through textContent / DOM APIs.
 */

const BANNER_LIFE_MS  = 3500;
const BANNER_FADE_MS  = 500;
const MODAL_LIFE_MS   = 6000;
const MODAL_SHOW_MS   = 10;
const MODAL_HIDE_MS   = 300;

export class PlatformNotifications {
    /**
     * Show a transient XP earned banner.
     * @param {number} xpAmount  numeric XP (coerced & formatted, never injected as HTML)
     */
    static showXPBanner(xpAmount) {
        const safeAmount = Number(xpAmount);
        if (!Number.isFinite(safeAmount)) return;

        const banner = document.createElement('div');
        banner.className = 'game-xp-banner';

        const badge = document.createElement('div');
        badge.className = 'game-xp-badge';

        const icon = document.createElement('span');
        icon.className = 'game-xp-icon';
        icon.textContent = '\u2B50';

        const amount = document.createElement('span');
        amount.className = 'game-xp-amount';
        amount.textContent = `+${safeAmount.toFixed(2)} XP`;

        badge.appendChild(icon);
        badge.appendChild(amount);
        banner.appendChild(badge);
        document.body.appendChild(banner);

        setTimeout(() => {
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), BANNER_FADE_MS);
        }, BANNER_LIFE_MS);
    }

    /**
     * Show the level-up modal.
     * @param {{
     *   old_level:number, new_level:number, title:string, badge:string,
     *   coins_awarded:number, is_milestone:boolean,
     *   user_data?:{ is_anonymous?:boolean }
     * }} data
     */
    static showLevelUpNotification(data) {
        if (!data || typeof data !== 'object') return;
        const modal = PlatformNotifications._buildLevelUpModal(data);
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), MODAL_SHOW_MS);

        const closeBtn = modal.querySelector('.level-up-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => PlatformNotifications._dismissModal(modal));
        }

        setTimeout(() => {
            if (modal.parentElement) PlatformNotifications._dismissModal(modal);
        }, MODAL_LIFE_MS);
    }

    /** @private */
    static _dismissModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), MODAL_HIDE_MS);
    }

    /** @private */
    static _buildLevelUpModal(data) {
        const isAnonymous = data.user_data?.is_anonymous === true;
        const showCoins   = !isAnonymous && Number(data.coins_awarded) > 0;

        const modal = document.createElement('div');
        modal.className = 'level-up-modal';

        const content = document.createElement('div');
        content.className = `level-up-content${data.is_milestone ? ' milestone' : ''}`;

        content.appendChild(PlatformNotifications._buildAnimation(data.badge));
        content.appendChild(PlatformNotifications._makeText('h2', 'level-up-title', '\uD83C\uDF89 LEVEL UP! \uD83C\uDF89'));
        content.appendChild(PlatformNotifications._buildLevels(data.old_level, data.new_level));
        content.appendChild(PlatformNotifications._makeText('div', 'level-up-new-title', String(data.title ?? '')));

        if (data.is_milestone) {
            content.appendChild(PlatformNotifications._makeText('div', 'level-up-milestone-badge', '\u2728 MILESTONE \u2728'));
        }
        if (showCoins) {
            content.appendChild(PlatformNotifications._buildReward(data.coins_awarded));
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'level-up-close';
        closeBtn.type = 'button';
        closeBtn.textContent = 'Continue';
        content.appendChild(closeBtn);

        modal.appendChild(content);
        return modal;
    }

    /** @private */
    static _buildAnimation(badgeText) {
        const animation = document.createElement('div');
        animation.className = 'level-up-animation';

        const rays = document.createElement('div');
        rays.className = 'level-up-rays';
        animation.appendChild(rays);

        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'level-up-badge-container';

        const badge = document.createElement('span');
        badge.className = 'level-up-badge';
        badge.textContent = String(badgeText ?? '');

        badgeContainer.appendChild(badge);
        animation.appendChild(badgeContainer);
        return animation;
    }

    /** @private */
    static _buildLevels(oldLevel, newLevel) {
        const wrap = document.createElement('div');
        wrap.className = 'level-up-levels';
        wrap.appendChild(PlatformNotifications._makeText('span', 'old-level',   String(oldLevel ?? '')));
        wrap.appendChild(PlatformNotifications._makeText('span', 'level-arrow', '\u2192'));
        wrap.appendChild(PlatformNotifications._makeText('span', 'new-level',   String(newLevel ?? '')));
        return wrap;
    }

    /** @private */
    static _buildReward(coins) {
        const reward = document.createElement('div');
        reward.className = 'level-up-reward';
        reward.appendChild(PlatformNotifications._makeText('span', 'reward-icon',   '\uD83E\uDE99'));
        reward.appendChild(PlatformNotifications._makeText('span', 'reward-amount', `+${Number(coins)} Coins`));
        return reward;
    }

    /** @private */
    static _makeText(tag, className, text) {
        const el = document.createElement(tag);
        el.className = className;
        el.textContent = text;
        return el;
    }
}
