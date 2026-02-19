/**
 * CampaignCountdown
 * Lightweight countdown manager for campaign game cards.
 * 
 * Uses a single shared setInterval (1 min) to update all active countdowns.
 * SRP: only responsible for rendering time remaining.
 * OCP: new format strategies can be added without modifying existing code.
 */
class CampaignCountdown {
    /** @type {Map<HTMLElement, string>} element -> endDate ISO */
    static _targets = new Map();
    static _intervalId = null;
    static _TICK_MS = 60_000; // 1 minute — lightweight

    /**
     * Register a DOM element to show countdown to endDate.
     * @param {HTMLElement} element - element whose textContent will be updated
     * @param {string} endDate - ISO date string
     */
    static register(element, endDate) {
        this._targets.set(element, endDate);
        this._renderOne(element, endDate); // immediate first render
        this._ensureTicking();
    }

    /**
     * Remove an element from tracking (e.g. card removed from DOM).
     * @param {HTMLElement} element
     */
    static unregister(element) {
        this._targets.delete(element);
        if (this._targets.size === 0) this._stop();
    }

    /** Clear all tracked countdowns. */
    static clear() {
        this._targets.clear();
        this._stop();
    }

    // ---- private ----

    static _ensureTicking() {
        if (this._intervalId) return;
        this._intervalId = setInterval(() => this._tick(), this._TICK_MS);
    }

    static _stop() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    static _tick() {
        // Prune detached DOM nodes automatically
        for (const [el, endDate] of this._targets) {
            if (!el.isConnected) {
                this._targets.delete(el);
                continue;
            }
            this._renderOne(el, endDate);
        }
        if (this._targets.size === 0) this._stop();
    }

    /**
     * Format and render remaining time into element.
     * @param {HTMLElement} el
     * @param {string} endDate
     */
    static _renderOne(el, endDate) {
        const remaining = this._formatRemaining(endDate);
        el.textContent = remaining.text;
        el.title = remaining.exact;
    }

    /**
     * Build a gaming-style compact remaining time string.
     * @param {string} endDate ISO string
     * @returns {{ text: string, exact: string }}
     */
    static _formatRemaining(endDate) {
        const now = Date.now();
        const end = new Date(endDate).getTime();
        const diff = end - now;

        if (diff <= 0) {
            return { text: 'ENDED', exact: 'Campaign has ended' };
        }

        const days = Math.floor(diff / 86_400_000);
        const hours = Math.floor((diff % 86_400_000) / 3_600_000);
        const minutes = Math.floor((diff % 3_600_000) / 60_000);

        let text;
        if (days > 0) {
            text = `${days}d ${hours}h`;
        } else if (hours > 0) {
            text = `${hours}h ${minutes}m`;
        } else {
            text = `${minutes}m`;
        }

        return {
            text,
            exact: `Ends in ${days}d ${hours}h ${minutes}m`
        };
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.CampaignCountdown = CampaignCountdown;
}
