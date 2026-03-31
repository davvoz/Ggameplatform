/**
 * Platform SDK adapter.
 * Dependency Inversion: abstracts the external PlatformSDK behind a clean interface.
 */
export class PlatformBridge {
    #sdk;
    #userId = null;
    #parentOrigin = null;

    constructor() {
        this.#sdk = window.PlatformSDK;
        this.#parentOrigin = this.#getParentOrigin();
    }

    #getParentOrigin() {
        try {
            if (document.referrer) {
                return new URL(document.referrer).origin;
            }
        } catch (e) {
            // Referrer not available
        }
        return null;
    }

    isAvailable() { return Boolean(this.#sdk); }
    get userId() { return this.#userId; }

    async initialize(callbacks = {}) {
        if (!this.isAvailable()) return;

        this.#sdk.on('config', (config) => {
            if (config?.userId) {
                this.#userId = config.userId;
            }
        });

        // XP banner & level-up via raw postMessage only (not SDK events)
        // to avoid duplicate triggers from the SDK's generic triggerEvent.
        window.addEventListener('message', (event) => {
            if (!event.data || !event.data.type) return;
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

        await this.#sdk.init(callbacks);
        if (!this.#userId) {
            this.#resolveUserId();
        }
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
            // Non-blocking
        }
    }

    async gameOver(score, extraData) {
        if (!this.isAvailable()) return;
        try {
            await this.#sdk.gameOver(score, { extra_data: extraData });
        } catch (e) {
            // Non-blocking
        }
    }

    async resetSession() {
        if (!this.isAvailable()) return;
        try {
            await this.#sdk.resetSession();
        } catch (e) {
            // Non-blocking
        }
    }

    async getUserBalance() {
        try {
            const userId = this.#ensureUserId();
            if (!userId) return null;
            const res = await fetch(`/api/coins/${userId}/balance`, {
                credentials: 'include',
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.balance;
        } catch (e) {
            return null;
        }
    }

    async spendCoins(amount, description = 'Game bet') {
        try {
            const userId = this.#ensureUserId();
            if (!userId) return false;
            const res = await fetch(`/api/coins/${userId}/spend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ amount, description, transaction_type: 'game_bet' }),
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async awardCoins(amount, description = 'Game win') {
        try {
            const userId = this.#ensureUserId();
            if (!userId) return false;
            const res = await fetch(`/api/coins/${userId}/award`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ amount, description, transaction_type: 'game_win' }),
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    #ensureUserId() {
        if (this.#userId) return this.#userId;
        this.#resolveUserId();
        return this.#userId;
    }

    #resolveUserId() {
        try {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('userId') ?? params.get('user_id');
            if (id) {
                this.#userId = id;
                return;
            }
            if (document.referrer) {
                const refParams = new URLSearchParams(new URL(document.referrer).search);
                this.#userId = refParams.get('userId') ?? refParams.get('user_id') ?? null;
            }
        } catch (e) {
            // Non-blocking
        }
    }

    /* ---------- DOM-based notifications ---------- */

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
