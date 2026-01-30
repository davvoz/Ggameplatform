/**
 * Coin Balance Widget
 * Displays user's coin balance in the navbar
 */

class CoinBalanceWidget {
    constructor(coinAPI) {
        this.coinAPI = coinAPI;
        this.balance = 0;
        this.updateInterval = null;
    }

    /**
     * Initialize the widget in the navbar
     */
    init(userId) {
        this.userId = userId;
        this.render();
        this.startAutoUpdate();
    }

    /**
     * Render the coin balance in the navbar
     */
    render() {
        // Find or create coin widget container in navbar
        let coinWidget = document.getElementById('coinBalance');
        if (!coinWidget) {
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                coinWidget = document.createElement('span');
                coinWidget.id = 'coinBalance';
                coinWidget.className = 'coin-balance';
                // Insert before logout button
                const logoutBtn = document.getElementById('logoutBtn');
                userInfo.insertBefore(coinWidget, logoutBtn);
            }
        }

        if (coinWidget) {
            coinWidget.innerHTML = `
                <span class="coin-icon">🪙</span>
                <span class="coin-amount" id="coinAmount">${this.balance}</span>
            `;
            coinWidget.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 5px 12px;
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                border-radius: 20px;
                color: #333;
                font-weight: bold;
                margin-right: 10px;
                cursor: pointer;
                transition: transform 0.2s;
            `;
            coinWidget.addEventListener('mouseenter', () => {
                coinWidget.style.transform = 'scale(1.05)';
            });
            coinWidget.addEventListener('mouseleave', () => {
                coinWidget.style.transform = 'scale(1)';
            });
            coinWidget.addEventListener('click', () => {
                window.location.hash = '#/wallet';
            });
        }
    }

    /**
     * Update balance from API
     */
    async updateBalance() {
        if (!this.userId) return;

        try {
            const data = await this.coinAPI.getUserBalance(this.userId);
            const oldBalance = this.balance;
            this.balance = data.balance;

            // Update display
            const amountEl = document.getElementById('coinAmount');
            if (amountEl) {
                amountEl.textContent = this.balance;

                // Animate if balance changed
                if (oldBalance !== this.balance) {
                    this.animateBalanceChange(amountEl, oldBalance < this.balance);
                }
            }
        } catch (error) {
            console.error('Failed to update coin balance:', error);
        }
    }

    /**
     * Animate balance change
     */
    animateBalanceChange(element, isIncrease) {
        element.style.transition = 'transform 0.3s, color 0.3s';
        element.style.transform = 'scale(1.3)';
        element.style.color = isIncrease ? '#28a745' : '#dc3545';

        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '#333';
        }, 300);
    }

    /**
     * Show coin gain notification
     */
    showCoinGainNotification(amount, reason) {
        const notification = document.createElement('div');
        notification.className = 'coin-notification';
        notification.innerHTML = `
            <div class="coin-notification-content">
                <span class="coin-icon-large">🪙</span>
                <span class="coin-amount-large">+${amount}</span>
                <span class="coin-reason">${reason}</span>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5);
            z-index: 10000;
            animation: slideInRight 0.5s, fadeOut 0.5s 2.5s;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * Start auto-update (every 30 seconds)
     */
    startAutoUpdate() {
        this.updateBalance();
        this.updateInterval = setInterval(() => {
            this.updateBalance();
        }, 30000);
    }

    /**
     * Stop auto-update
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Destroy widget
     */
    destroy() {
        this.stopAutoUpdate();
        const widget = document.getElementById('coinBalance');
        if (widget) widget.remove();
    }
}

// Add CSS for animations
if (!document.getElementById('coin-widget-style')) {
    const style = document.createElement('style');
    style.id = 'coin-widget-style';
    style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }

    .coin-notification-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
    }

    .coin-icon-large {
        font-size: 48px;
    }

    .coin-amount-large {
        font-size: 32px;
        font-weight: bold;
        color: #333;
    }

    .coin-reason {
        font-size: 14px;
        color: #555;
        text-align: center;
    }
`;
document.head.appendChild(style);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoinBalanceWidget;
}

// Global export for non-module scripts
if (typeof window !== 'undefined') {
    window.CoinBalanceWidget = CoinBalanceWidget;
}
