/**
 * Wallet widget for profile page - Shows balance and recent transactions
 */
class WalletProfileWidget {
    constructor(container, userId) {
        this.container = container;
        this.userId = userId;
        this.coinAPI = window.coinAPI || new window.CoinAPI();
    }

    /**
     * Render wallet section in profile
     */
    async render() {
        console.log('🎨 WalletProfileWidget.render() called for user:', this.userId);
        try {
            console.log('📡 Fetching balance...');
            const balance = await this.coinAPI.getUserBalance(this.userId);
            console.log('✅ Balance:', balance);
            
            console.log('📡 Fetching transactions...');
            const transactions = await this.coinAPI.getUserTransactions(this.userId, 10);
            console.log('✅ Transactions:', transactions.length);

            this.container.innerHTML = this.generateWalletHTML(balance, transactions);
            console.log('✅ Wallet HTML rendered');
        } catch (error) {
            console.error('❌ Error rendering wallet widget:', error);
            this.container.innerHTML = this.generateErrorHTML();
        }
    }

    /**
     * Generate wallet HTML
     */
    generateWalletHTML(balance, transactions) {
        return `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 18px; width: 100%;">
                    <div style="background: rgba(251,191,36,0.13); border: 1.5px solid #fbbf24; border-radius: 12px; box-shadow: 0 2px 12px #fbbf2433; padding: 18px 0 10px 0; min-width: 120px; width: 80%; max-width: 220px; text-align: center; margin: 0 auto 2px auto;">
                        <span style="font-size: 2.1rem; font-weight: 900; color: #fbbf24; text-shadow: 0 2px 8px #fbbf2433; letter-spacing: 1px;">${balance.balance}</span>
                        <div style="font-size: 1rem; color: #fbbf24; font-weight: 700; margin-top: 2px; letter-spacing: 0.5px;">Coins</div>
                    </div>
                    <div style="display: flex; gap: 18px; width: 100%; justify-content: center;">
                        <div style="background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.18); border-radius: 10px; padding: 10px 18px; min-width: 90px; text-align: center;">
                            <div style="font-size: 1.1rem; font-weight: 700; color: #22c55e;">+${balance.total_earned}</div>
                            <div style="font-size: 0.95rem; color: var(--text-secondary); font-weight: 600;">Earned</div>
                        </div>
                        <div style="background: rgba(239,68,68,0.10); border: 1px solid rgba(239,68,68,0.16); border-radius: 10px; padding: 10px 18px; min-width: 90px; text-align: center;">
                            <div style="font-size: 1.1rem; font-weight: 700; color: #ef4444;">-${balance.total_spent}</div>
                            <div style="font-size: 0.95rem; color: var(--text-secondary); font-weight: 600;">Spent</div>
                        </div>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 22px; width: 100%;">
                    <a href="#/wallet" style="color: var(--primary-color); text-decoration: none; font-weight: 700; font-size: 1.02rem; letter-spacing: 0.2px;">View All Transactions →</a>
                </div>
            </div>
        `;
    }

    /**
     * Generate single transaction HTML
     */
    generateTransactionHTML(tx) {
        const isPositive = tx.amount > 0;
        const icon = this.getTransactionIcon(tx.transaction_type);
        const date = new Date(tx.created_at);
        const dateStr = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

        return `
            <div class="transaction-item-mini ${isPositive ? 'positive' : 'negative'}">
                <div class="tx-icon">${icon}</div>
                <div class="tx-details">
                    <div class="tx-description">${tx.description || 'Transaction'}</div>
                    <div class="tx-date">${dateStr}</div>
                </div>
                <div class="tx-amount ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${tx.amount}
                </div>
            </div>
        `;
    }

    /**
     * Get icon for transaction type
     */
    getTransactionIcon(type) {
        const icons = {
            'quest_reward': '🏆',
            'leaderboard_reward': '🥇',
            'daily_login': '📅',
            'high_score': '🎯',
            'level_up': '⬆️',
            'streak_bonus': '🔥',
            'shop_purchase': '🛒',
            'welcome_bonus': '🎁'
        };
        return icons[type] || '💰';
    }

    /**
     * Generate error HTML
     */
    generateErrorHTML() {
        return `
            <div class="wallet-profile-section">
                <div class="wallet-header">
                    <h3>🪙 Wallet</h3>
                </div>
                <div class="wallet-error">
                    <p>⚠️ Unable to load wallet data. Please try again later.</p>
                </div>
            </div>
        `;
    }
}

// Export to global scope
if (typeof window !== 'undefined') {
    window.WalletProfileWidget = WalletProfileWidget;
    console.log('✅ WalletProfileWidget loaded and exported to window');
}
