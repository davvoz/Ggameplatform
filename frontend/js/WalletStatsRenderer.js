/**
 * WalletStatsRenderer
 * Renders beautiful statistics, charts and infographics for the wallet
 * Follows SOLID principles - Single Responsibility: Statistics visualization only
 */

class WalletStatsRenderer {
    constructor() {
        this.animationDuration = 1500;
        this.chartColors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8',
            accent: '#00d9ff'
        };
    }

    /**
     * Render the complete stats dashboard
     * @param {Object} balance - User balance data
     * @param {Array} transactions - Recent transactions
     * @param {Object} detailedStats - Optional detailed stats from API
     * @returns {string} HTML string
     */
    renderStatsDashboard(balance, transactions, detailedStats = null) {
        const stats = this._calculateStats(transactions);
        
        return `
            <div class="wallet-stats-dashboard">
                <!-- Animated Balance Hero -->
                ${this._renderBalanceHero(balance, stats, detailedStats)}
                 

            </div>
        `;
    }

    /**
     * Render animated balance hero section
     * @private
     */
    _renderBalanceHero(balance, stats = {}, detailedStats = null) {
        const balanceValue = balance.balance || 0;
        const totalEarned = balance.total_earned || 0;
        const totalSpent = balance.total_spent || 0;
        const earnedPercent = totalEarned > 0 
            ? Math.round((balanceValue / totalEarned) * 100) 
            : 0;
        
        // Transaction stats
        const totalTx = detailedStats?.total_transactions || stats.totalCount || 0;
        const incomingCount = detailedStats?.incoming_count || 0;
        const outgoingCount = detailedStats?.outgoing_count || 0;
        const avgEarning = stats.avgEarning || 0;
        
        return `
            <div class="balance-hero">
                <div class="hero-glass-overlay"></div>
                
                <div class="balance-hero-content">
                    <div class="hero-left">
                        <span class="hero-label">Available Balance</span>
                        <div class="hero-balance">
                            <span class="balance-amount" data-target="${balanceValue}">${balanceValue.toLocaleString()}</span>
                            <span class="balance-currency">🪙</span>
                        </div>
                        <div class="hero-retention">
                            <div class="retention-bar">
                                <div class="retention-fill" style="width: ${Math.min(earnedPercent, 100)}%"></div>
                            </div>
                            <span class="retention-label">${earnedPercent}% retained</span>
                        </div>
                    </div>
                    
                    <div class="hero-right">
                        <div class="hero-stats-grid">
                            <div class="hero-stat-wt">
                                <span class="hero-stat-icon">↗</span>
                                <div class="hero-stat-info">
                                    <span class="hero-stat-value positive">+${totalEarned.toLocaleString()}</span>
                                    <span class="hero-stat-label">Lifetime earned</span>
                                </div>
                            </div>
                            <div class="hero-stat-wt">
                                <span class="hero-stat-icon">↙</span>
                                <div class="hero-stat-info">
                                    <span class="hero-stat-value negative">-${totalSpent.toLocaleString()}</span>
                                    <span class="hero-stat-label">Lifetime spent</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate floating coin elements
     * @private
     */
    _generateFloatingCoins(count) {
        let coins = '';
        for (let i = 0; i < count; i++) {
            const size = 20 + Math.random() * 30;
            const left = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = 3 + Math.random() * 4;
            
            coins += `
                <div class="floating-coin" style="
                    left: ${left}%;
                    width: ${size}px;
                    height: ${size}px;
                    animation-delay: ${delay}s;
                    animation-duration: ${duration}s;
                ">🪙</div>
            `;
        }
        return coins;
    }

    /**
     * Render quick stats grid
     * @private
     */
    _renderQuickStats(balance, stats, detailedStats = null) {
        // Use detailed stats for accurate counts if available
        const totalTx = detailedStats?.total_transactions || stats.totalCount;
        const incomingCount = detailedStats?.incoming_count || 0;
        const outgoingCount = detailedStats?.outgoing_count || 0;
        
        return `
            <div class="quick-stats-grid">
                <div class="quick-stat-card earned">
                    <div class="stat-icon-container">
                        <span class="stat-icon">📈</span>
                        <div class="stat-icon-bg"></div>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Total Earned</span>
                        <span class="stat-value count-up" data-target="${balance.total_earned}">
                            +${(balance.total_earned || 0).toLocaleString()}
                        </span>
                    </div>
                    <div class="stat-trend positive">
                        <span class="trend-icon">↑</span>
                    </div>
                </div>
                
                <div class="quick-stat-card spent">
                    <div class="stat-icon-container">
                        <span class="stat-icon">💸</span>
                        <div class="stat-icon-bg"></div>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Total Spent</span>
                        <span class="stat-value count-up" data-target="${balance.total_spent}">
                            -${(balance.total_spent || 0).toLocaleString()}
                        </span>
                    </div>
                    <div class="stat-trend negative">
                        <span class="trend-icon">↓</span>
                    </div>
                </div>
                
                <div class="quick-stat-card transactions">
                    <div class="stat-icon-container">
                        <span class="stat-icon">📋</span>
                        <div class="stat-icon-bg"></div>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Transactions (30d)</span>
                        <span class="stat-value count-up" data-target="${totalTx}">
                            ${totalTx}
                        </span>
                    </div>
                    <div class="tx-breakdown">
                        <span class="tx-in">↓ ${incomingCount}</span>
                        <span class="tx-out">↑ ${outgoingCount}</span>
                    </div>
                </div>
                
                <div class="quick-stat-card average">
                    <div class="stat-icon-container">
                        <span class="stat-icon">⚡</span>
                        <div class="stat-icon-bg"></div>
                    </div>
                    <div class="stat-content">
                        <span class="stat-label">Avg Earning</span>
                        <span class="stat-value">
                            ${stats.avgEarning > 0 ? '+' : ''}${stats.avgEarning.toLocaleString()}
                        </span>
                    </div>
                    <div class="stat-badge">per tx</div>
                </div>
            </div>
        `;
    }

    /**
     * Render mini sparkline chart
     * @private
     */
    _renderMiniSparkline(dailyCounts) {
        const maxCount = Math.max(...dailyCounts, 1);
        const bars = dailyCounts.slice(-7).map((count, i) => {
            const height = (count / maxCount) * 100;
            return `<div class="sparkline-bar" style="height: ${Math.max(height, 5)}%"></div>`;
        });
        
        return `<div class="sparkline-chart">${bars.join('')}</div>`;
    }

    /**
     * Calculate statistics from transactions
     * @private
     */
    _calculateStats(transactions) {
        const stats = {
            totalCount: transactions.length,
            totalEarned: 0,
            totalSpent: 0,
            avgEarning: 0,
            byType: {},
            dailyCounts: [0, 0, 0, 0, 0, 0, 0],
            recentTrend: 0,
            activityMatrix: Array(7).fill(null).map(() => Array(4).fill(0))
        };
        
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        let thisWeekTotal = 0;
        let lastWeekTotal = 0;
        let earningCount = 0;
        
        transactions.forEach(tx => {
            const amount = tx.amount || 0;
            const type = tx.transaction_type || 'other';
            const date = new Date(tx.created_at);
            
            // Aggregate by type
            if (!stats.byType[type]) {
                stats.byType[type] = { count: 0, total: 0 };
            }
            stats.byType[type].count++;
            stats.byType[type].total += amount;
            
            // Earned vs spent
            if (amount > 0) {
                stats.totalEarned += amount;
                earningCount++;
            } else {
                stats.totalSpent += Math.abs(amount);
            }
            
            // Daily counts for last 7 days
            const dayDiff = Math.floor((now - date) / (24 * 60 * 60 * 1000));
            if (dayDiff >= 0 && dayDiff < 7) {
                stats.dailyCounts[6 - dayDiff]++;
            }
            
            // Trend calculation
            if (date >= weekAgo) {
                thisWeekTotal += amount;
            } else if (date >= twoWeeksAgo) {
                lastWeekTotal += amount;
            }
            
            // Activity matrix (day of week x time of day)
            const dayOfWeek = date.getDay();
            const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6
            const hour = date.getHours();
            const timeSlot = hour < 6 ? 3 : hour < 12 ? 0 : hour < 18 ? 1 : hour < 22 ? 2 : 3;
            
            if (stats.activityMatrix[adjustedDay]) {
                stats.activityMatrix[adjustedDay][timeSlot]++;
            }
        });
        
        stats.avgEarning = earningCount > 0 ? Math.round(stats.totalEarned / earningCount) : 0;
        stats.recentTrend = thisWeekTotal - lastWeekTotal;
        
        return stats;
    }

    /**
     * Get icon for transaction type
     * @private
     */
    _getTypeIcon(type) {
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
            'referral': '👥'
        };
        return icons[type] || '💰';
    }

    /**
     * Format transaction type label
     * @private
     */
    _formatTypeLabel(type) {
        const labels = {
            'quest_reward': 'Quest Rewards',
            'leaderboard_reward': 'Leaderboard',
            'daily_login': 'Daily Login',
            'high_score': 'High Score',
            'level_up': 'Level Up',
            'streak_bonus': 'Streak Bonus',
            'shop_purchase': 'Shop Purchase',
            'welcome_bonus': 'Welcome Bonus',
            'steem_reward': 'Steem Rewards',
            'referral': 'Referrals'
        };
        return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Initialize animations after rendering
     */
    initAnimations() {
        // Count-up animation for numbers
        this._animateCountUp();
        
        // Animate progress bars
        this._animateProgressBars();
        
        // Trigger fade-in animations
        this._triggerFadeIns();
    }

    /**
     * Animate count-up effect
     * @private
     */
    _animateCountUp() {
        const elements = document.querySelectorAll('.count-up');
        
        elements.forEach(el => {
            const target = parseInt(el.dataset.target) || 0;
            const duration = this.animationDuration;
            const start = performance.now();
            const startValue = 0;
            
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const current = Math.round(startValue + (target - startValue) * easeOutQuart);
                
                el.textContent = current.toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    /**
     * Animate progress bars
     * @private
     */
    _animateProgressBars() {
        const bars = document.querySelectorAll('.comparison-bar, .dist-bar, .retention-fill');
        
        bars.forEach((bar, index) => {
            const targetWidth = bar.style.width;
            bar.style.width = '0';
            
            setTimeout(() => {
                bar.style.transition = `width ${this.animationDuration}ms ease-out`;
                bar.style.width = targetWidth;
            }, index * 100);
        });
    }

    /**
     * Trigger fade-in animations
     * @private
     */
    _triggerFadeIns() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.analytics-card, .type-card, .milestone-card, .highlight-card, .game-stat-card').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Format date string
     * @private
     */
    _formatDate(dateStr) {
        const date = new Date(dateStr);
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletStatsRenderer;
}

// Global export for non-module scripts
if (typeof window !== 'undefined') {
    window.WalletStatsRenderer = WalletStatsRenderer;
    console.log('✅ WalletStatsRenderer loaded and exported to window');
}
