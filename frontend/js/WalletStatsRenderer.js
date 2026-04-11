/**
 * WalletStatsRenderer
 * Renders beautiful statistics, charts and infographics for the wallet
 * Follows SOLID principles - Single Responsibility: Statistics visualization only
 */

class WalletStatsRenderer {
    animationDuration = 1500;
    chartColors = {
        primary: '#667eea',
        secondary: '#764ba2',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8',
        accent: '#00d9ff'
    };


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
            activityMatrix: new Array(7).fill(null).map(() => new Array(4).fill(0))
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
            
            let timeSlot;
            if (hour < 6) {
                timeSlot = 3;
            } else if (hour < 12) {
                timeSlot = 0;
            } else if (hour < 18) {
                timeSlot = 1;
            } else if (hour < 22) {
                timeSlot = 2;
            } else {
                timeSlot = 3;
            }
            
            if (stats.activityMatrix[adjustedDay]) {
                stats.activityMatrix[adjustedDay][timeSlot]++;
            }
        });
        
        stats.avgEarning = earningCount > 0 ? Math.round(stats.totalEarned / earningCount) : 0;
        stats.recentTrend = thisWeekTotal - lastWeekTotal;
        
        return stats;
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
            const target = Number.parseInt(el.dataset.target) || 0;
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


}

export default WalletStatsRenderer;