/**
 * PlatformBridge — SRP: all communication with the parent platform frame.
 * Handles postMessage events, XP banners, and level-up notifications.
 *
 * Security: validates protocolVersion and pins the parent origin
 * after the first trusted message (OWASP A01 — Broken Access Control).
 */
const PROTOCOL_VERSION = '1.0.0';

export class PlatformBridge {
    constructor(game) {
        this.game          = game;
        this._parentOrigin = null;
        this._setup();
    }

    // ── public API ─────────────────────────────────────────────────────────
    showXPBanner(xpAmount) {
        const banner       = document.createElement('div');
        banner.className   = 'game-xp-banner';
        banner.innerHTML   = `
            <div class="game-xp-badge">
                <span class="game-xp-icon">⭐</span>
                <span class="game-xp-amount">+${xpAmount.toFixed(2)} XP</span>
            </div>`;
        document.body.appendChild(banner);
        setTimeout(() => {
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), 500);
        }, 5500);
    }

    showLevelUpNotification(levelUpData) {
        if (typeof window.showLevelUpNotification === 'function') {
            window.showLevelUpNotification(levelUpData);
        }
    }

    // ── private helpers ────────────────────────────────────────────────────
    _setup() {
        if (window.PlatformSDK) {
            window.PlatformSDK.on('showXPBanner', payload => {
                if (payload?.xp_earned !== undefined) {
                    this.showXPBanner(payload.xp_earned, payload);
                }
            });
        }

        window.addEventListener('message', event => this._onMessage(event));
    }

    _onMessage(event) {
        if (!event.data?.type) return;
        if (event.data.protocolVersion !== PROTOCOL_VERSION) return;

        // Origin pinning — reject once a trusted origin is established
        if (this._parentOrigin && event.origin !== this._parentOrigin) {
            console.warn('[MTD] Rejected message from untrusted origin:', event.origin);
            return;
        }
        if (!this._parentOrigin && event.origin) {
            this._parentOrigin = event.origin;
        }

        const { type, payload } = event.data;
        if (type === 'showXPBanner' && payload)     this.showXPBanner(payload.xp_earned, payload);
        if (type === 'showLevelUpModal' && payload) this.showLevelUpNotification(payload);
    }
}
