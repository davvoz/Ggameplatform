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
            <div class="wallet-profile-section">
                <div class="wallet-balance-card">
                    <div class="balance-main">
                        <div class="balance-amount">${balance.balance}</div>
                        <div class="balance-label">Coins</div>
                    </div>
                    <div class="balance-stats-mini">
                        <div class="balance-stat">
                            <span class="stat-icon">📥</span>
                            <span class="stat-number">+${balance.total_earned}</span>
                            <span class="stat-label">Earned</span>
                        </div>
                        <div class="balance-stat">
                            <span class="stat-icon">📤</span>
                            <span class="stat-number">-${balance.total_spent}</span>
                            <span class="stat-label">Spent</span>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <a href="#/wallet" style="color: var(--primary-color); text-decoration: none; font-weight: 600; font-size: 16px;">View Transactions →</a>
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
