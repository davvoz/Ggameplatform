/**
 * Thin wrapper over the global PlatformSDK loaded by index.html.
 * Falls back to no-op when SDK is not present (local dev / standalone).
 */
export class PlatformBridge {
    #sdk;
    #parentOrigin = null;

    constructor() {
        this.#sdk = (typeof globalThis !== 'undefined' && globalThis.PlatformSDK) ? globalThis.PlatformSDK : null;
        this.ready = false;
        this.#parentOrigin = this.#getParentOrigin();
    }

    #getParentOrigin() {
        try {
            if (document.referrer) return new URL(document.referrer).origin;
        } catch (_) { /* ignore */ }
        return null;
    }

    isAvailable() { return Boolean(this.#sdk); }

    async initialize() {
        if (!this.#sdk || typeof this.#sdk.init !== 'function') return;

        // Listen for XP banner and level-up events sent via postMessage from the platform.
        window.addEventListener('message', (event) => {
            if (!event.data?.type) return;
            if (event.data.protocolVersion !== '1.0.0') return;
            if (this.#parentOrigin && event.origin !== this.#parentOrigin) return;
            if (!this.#parentOrigin && event.origin) this.#parentOrigin = event.origin;

            if (event.data.type === 'showXPBanner' && event.data.payload) {
                PlatformBridge.showXPBanner(event.data.payload.xp_earned);
            }
            if (event.data.type === 'showLevelUpModal' && event.data.payload) {
                PlatformBridge.showLevelUpNotification(event.data.payload);
            }
        });

        try {
            await this.#sdk.init({ timeout: 5000 });
            this.ready = true;
        } catch (err) {
            console.warn('[PlatformBridge] SDK init failed:', err);
        }
    }

    on(evt, cb) {
        if (this.#sdk && typeof this.#sdk.on === 'function') this.#sdk.on(evt, cb);
    }

    sendGameStarted() {
        if (!this.#parentOrigin) return;
        try {
            window.parent.postMessage({
                type: 'gameStarted',
                payload: {},
                timestamp: Date.now(),
                protocolVersion: '1.0.0',
            }, this.#parentOrigin);
        } catch (e) {
            console.warn('[PlatformBridge] Failed to post gameStarted:', e);
        }
    }

    sendScore(score, meta = {}) {
        if (!this.ready) return;
        try { this.#sdk.sendScore(score, meta); } catch (e) { console.warn(e); }
    }

    gameOver(score, meta = {}) {
        if (!this.ready) return;
        try { this.#sdk.gameOver(score, meta); } catch (e) { console.warn(e); }
    }

    /* ── DOM notifications ────────────────────────────────────────── */

    static showXPBanner(xpAmount) {
        const banner = document.createElement('div');
        banner.className = 'game-xp-banner';
        banner.innerHTML = `
            <div class="game-xp-badge">
                <span class="game-xp-icon">⭐</span>
                <span class="game-xp-amount">+${Number(xpAmount).toFixed(2)} XP</span>
            </div>
        `;
        document.body.appendChild(banner);
        setTimeout(() => {
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), 500);
        }, 3500);
    }

    static showLevelUpNotification(levelUpData) {
        const { old_level, new_level, title, badge, coins_awarded, is_milestone, user_data } = levelUpData;
        const isAnonymous = user_data?.is_anonymous === true;

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
                <button class="level-up-close">Continue</button>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        const closeBtn = modal.querySelector('.level-up-close');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });

        setTimeout(() => {
            if (modal.parentElement) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        }, 6000);
    }
}
