/**
 * Wallet Renderer
 * Displays user's coin balance, statistics dashboard, and transaction history
 * Follows SOLID principles - integrates with WalletStatsRenderer and InfiniteScrollManager
 */

class WalletRenderer {
    constructor(coinAPI) {
        this.coinAPI = coinAPI;
        this.statsRenderer = new WalletStatsRenderer();
        this.scrollManager = null;
        this.userId = null;
        this.balance = null;
        this.detailedStats = null;
        this.initialTransactions = [];
        this.pageSize = 20;
    }

    /**
     * Render wallet page
     */
    async render(userId) {
        if (!userId) {
            return '<div class="error">Please log in to view your wallet</div>';
        }

        this.userId = userId;

        try {
            // Fetch initial data (balance, transactions, and detailed stats)
            const [balance, transactions, detailedStats] = await Promise.all([
                this.coinAPI.getUserBalance(userId),
                this.coinAPI.getUserTransactions(userId, this.pageSize),
                this._fetchDetailedStats()
            ]);

            this.balance = balance;
            this.initialTransactions = transactions;
            this.detailedStats = detailedStats;

            return `
                <div class="wallet-container">
                    <header class="wallet-page-header">
                        <div class="header-content">
                            <div class="header-text">
                                <h1>My Wallet</h1>
                                <p class="header-subtitle">Track your earnings and spending</p>
                            </div>
                        </div>
                    </header>
                    
                    <!-- Scroll to top button -->
                    <button class="scroll-to-top" id="scrollToTop" aria-label="Scroll to top">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    </button>
                    
                    <!-- Stats Dashboard -->
                    ${this.statsRenderer.renderStatsDashboard(balance, transactions, detailedStats)}

                    <!-- How to Earn Coins -->
                    <div class="earn-coins-section">
                        <h2 class="section-title">
                            <span class="title-icon">💡</span>
                            How to Earn Coins
                        </h2>
                        <div class="quick-stats-grid">
                            <div class="quick-stat-card">
                            <div class="earn-icon-title">
                                <span class="earn-icon">🎯</span>
                                <h3>Complete Quests</h3>
                                </div>
                                <p>Earn coins by completing daily and weekly quests</p>
                            </div>
                            <div class="quick-stat-card">
                                <div class="earn-icon-title">

                                <span class="earn-icon">🏆</span>
                                <h3>Leaderboard Rankings</h3>
                                    </div>
                                <p>Climb the leaderboard to earn rewards</p>
                            </div>
                            <div class="quick-stat-card">
                                 <div class="earn-icon-title">

                                <span class="earn-icon">📈</span>
                                <h3>Level Up</h3>
                                </div>
                                <p>Gain coins as you level up your profile</p>
                            </div>
                            <div class="quick-stat-card">
                                  <div class="earn-icon-title">
                                <span class="earn-icon">📅</span>
                                <h3>Daily Login</h3>
                                </div>
                                <p>Log in every day for streak bonuses</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Transaction History with Infinite Scroll -->
                    <div class="transaction-section">
                        <h2 class="section-title">
                            <span class="title-icon">📜</span>
                            Transaction History
                        </h2>
                        <div id="transactionListContainer" class="transaction-scroll-container">
                            <div id="transactionList" class="transaction-list">
                                <!-- Initial transactions will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering wallet:', error);
            return `<div class="error">Failed to load wallet data: ${error.message}</div>`;
        }
    }

    /**
     * Fetch detailed statistics from API
     * @private
     */
    async _fetchDetailedStats() {
        try {
            return await this.coinAPI.getDetailedStats(this.userId, 30);
        } catch (error) {
            console.warn('Error fetching detailed stats:', error);
            return null;
        }
    }

    /**
     * Initialize after DOM is ready
     * Call this after the HTML is inserted into the DOM
     */
    initAfterRender() {
        // Initialize stats animations
        this.statsRenderer.initAnimations();

        // Initialize infinite scroll for transactions
        this._initInfiniteScroll();
        
        // Initialize scroll-to-top button
        this._initScrollToTop();
        
        // Initialize sticky hero navbar
        this._initStickyHero();
    }
    
    /**
     * Initialize sticky hero behavior
     * The balance hero collapses into a compact navbar when scrolling
     * @private
     */
    _initStickyHero() {
        const balanceHero = document.querySelector('.balance-hero');
        if (!balanceHero) return;
        
        // Create the compact sticky navbar clone
        const stickyNavbar = document.createElement('div');
        stickyNavbar.className = 'wallet-sticky-navbar';
        stickyNavbar.innerHTML = `
            <div class="sticky-navbar-content">
                <div class="sticky-balance-info">
                    <span class="sticky-label">Balance</span>
                    <span class="sticky-balance">${this.balance?.balance?.toLocaleString() || '0'} 🪙</span>
                </div>
                <div class="sticky-stats">
                    <span class="sticky-stat positive">+${this.balance?.total_earned?.toLocaleString() || '0'}</span>
                    <span class="sticky-stat negative">-${this.balance?.total_spent?.toLocaleString() || '0'}</span>
                </div>
            </div>
        `;
        
        // Insert sticky navbar at the beginning of wallet container
        const walletContainer = document.querySelector('.wallet-container');
        if (walletContainer) {
            walletContainer.insertBefore(stickyNavbar, walletContainer.firstChild);
        }
        
        // Get hero position for scroll calculations
        let heroRect = balanceHero.getBoundingClientRect();
        let heroTop = heroRect.top + window.scrollY;
        let heroHeight = heroRect.height;
        
        // Recalculate on resize
        const recalculatePositions = () => {
            heroRect = balanceHero.getBoundingClientRect();
            heroTop = heroRect.top + window.scrollY;
            heroHeight = heroRect.height;
        };
        
        window.addEventListener('resize', recalculatePositions, { passive: true });
        
        // Handle scroll behavior
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const triggerPoint = heroTop + heroHeight * 0.5; // Start compressing at 50% scroll
            const fullCompressPoint = heroTop + heroHeight; // Fully compressed when hero is out of view
            
            if (scrollY < triggerPoint) {
                // Normal state - hero fully visible
                balanceHero.classList.remove('hero-compressing', 'hero-compressed');
                stickyNavbar.classList.remove('visible');
            } else if (scrollY < fullCompressPoint) {
                // Compressing state
                const progress = (scrollY - triggerPoint) / (fullCompressPoint - triggerPoint);
                balanceHero.classList.add('hero-compressing');
                balanceHero.classList.remove('hero-compressed');
                balanceHero.style.setProperty('--compress-progress', progress);
                stickyNavbar.classList.remove('visible');
            } else {
                // Fully compressed - show sticky navbar
                balanceHero.classList.remove('hero-compressing');
                balanceHero.classList.add('hero-compressed');
                stickyNavbar.classList.add('visible');
            }
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Initial check
        handleScroll();
    }
    
    /**
     * Initialize scroll-to-top button
     * @private
     */
    _initScrollToTop() {
        const scrollBtn = document.getElementById('scrollToTop');
        if (!scrollBtn) return;
        
        const showThreshold = 300;
        
        const toggleVisibility = () => {
            if (window.scrollY > showThreshold) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        };
        
        window.addEventListener('scroll', toggleVisibility, { passive: true });
        
        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // Initial check
        toggleVisibility();
    }

    /**
     * Initialize infinite scroll manager
     * @private
     */
    _initInfiniteScroll() {
        const container = document.getElementById('transactionListContainer');
        const listElement = document.getElementById('transactionList');

        if (!container || !listElement) {
            console.warn('Transaction container not found');
            return;
        }

        // Clean up previous scroll manager if exists
        if (this.scrollManager) {
            this.scrollManager.destroy();
        }

        // Create new scroll manager
        this.scrollManager = new InfiniteScrollManager({
            container: document.documentElement, // Use window scroll
            listElement: listElement,
            loadMore: this._loadMoreTransactions.bind(this),
            renderItem: this._renderTransactionItem.bind(this),
            threshold: 300,
            pageSize: this.pageSize
        });

        // Load initial transactions
        if (this.initialTransactions.length > 0) {
            this.scrollManager.reset(this.initialTransactions);
        } else {
            // Show empty state
            listElement.innerHTML = this._renderEmptyState();
        }
    }

    /**
     * Load more transactions for infinite scroll
     * @private
     */
    async _loadMoreTransactions(offset, limit) {
        try {
            // Fetch transactions with offset
            const transactions = await this.coinAPI.getUserTransactions(
                this.userId,
                limit,
                offset
            );
            return transactions;
        } catch (error) {
            console.error('Error loading more transactions:', error);
            throw error;
        }
    }

    /**
     * Render a single transaction item for infinite scroll
     * @private
     */
    _renderTransactionItem(tx, index) {
        const isPositive = tx.amount > 0;
        const icon = this.getTransactionIcon(tx.transaction_type);
        const typeLabel = this.getTransactionTypeLabel(tx.transaction_type);
        const date = new Date(tx.created_at).toLocaleString();

        const element = document.createElement('div');
        element.className = `transaction-item ${isPositive ? 'positive' : 'negative'}`;
        element.innerHTML = `
            <div class="transaction-icon">${icon}</div>
            <div class="transaction-details">
                <div class="transaction-type">${typeLabel}</div>
                <div class="transaction-description">${tx.description || 'No description'}</div>
                <div class="transaction-date">${date}</div>
            </div>
            <div class="transaction-amount ${isPositive ? 'gain' : 'loss'}">
                ${isPositive ? '+' : ''}${tx.amount.toLocaleString()}
                <span class="coin-icon-small">🪙</span>
            </div>
        `;

        return element;
    }

    /**
     * Render empty state for transactions
     * @private
     */
    _renderEmptyState() {
        return `
            <div class="no-transactions">
                <div class="empty-icon">📭</div>
                <h3>No transactions yet</h3>
                <p>Start playing games and completing quests to earn coins!</p>
            </div>
        `;
    }

    /**
     * Render transaction list
     */
    renderTransactions(transactions) {
        if (!transactions || transactions.length === 0) {
            return '<div class="no-transactions">No transactions yet. Start playing to earn coins!</div>';
        }

        return `
            <div class="transaction-list">
                ${transactions.map(tx => this.renderTransaction(tx)).join('')}
            </div>
        `;
    }

    /**
     * Render single transaction
     */
    renderTransaction(tx) {
        const isPositive = tx.amount > 0;
        const icon = this.getTransactionIcon(tx.transaction_type);
        const typeLabel = this.getTransactionTypeLabel(tx.transaction_type);
        const date = new Date(tx.created_at).toLocaleString();

        return `
            <div class="transaction-item ${isPositive ? 'positive' : 'negative'}">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <div class="transaction-type">${typeLabel}</div>
                    <div class="transaction-description">${tx.description || 'No description'}</div>
                    <div class="transaction-date">${date}</div>
                </div>
                <div class="transaction-amount ${isPositive ? 'gain' : 'loss'}">
                    ${isPositive ? '+' : ''}${tx.amount.toLocaleString()}
                    <span class="coin-icon-small">🪙</span>
                </div>
            </div>
        `;
    }

    /**
     * Get icon for transaction type
     */
    getTransactionIcon(type) {
        const icons = {
            'quest_reward': '🎯',
            'leaderboard_reward': '🏆',
            'daily_login': '📅',
            'high_score': '⭐',
            'level_up': '📈',
            'streak_bonus': '🔥',
            'shop_purchase': '🛒',
            'welcome_bonus': '🎁',
            'steem_reward': '💫',
            'referral': '👥',
            'game_bonus': '🎮',
            'achievement': '🌟'
        };
        return icons[type] || '💰';
    }

    /**
     * Get label for transaction type
     */
    getTransactionTypeLabel(type) {
        const labels = {
            'quest_reward': 'Quest Reward',
            'leaderboard_reward': 'Leaderboard Reward',
            'daily_login': 'Daily Login Bonus',
            'high_score': 'High Score Bonus',
            'level_up': 'Level Up',
            'streak_bonus': 'Streak Bonus',
            'shop_purchase': 'Shop Purchase',
            'welcome_bonus': 'Welcome Bonus',
            'steem_reward': 'Steem Reward',
            'referral': 'Referral Bonus',
            'game_bonus': 'Game Bonus',
            'achievement': 'Achievement'
        };
        return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Clean up resources when navigating away
     */
    destroy() {
        if (this.scrollManager) {
            this.scrollManager.destroy();
            this.scrollManager = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletRenderer;
}

// Global export for non-module scripts
if (typeof window !== 'undefined') {
    window.WalletRenderer = WalletRenderer;
    console.log('✅ WalletRenderer loaded and exported to window');
}
