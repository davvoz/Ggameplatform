/**
 * Show level up modal
 */
function showLevelUpModal(levelUpData) {
    const { old_level, new_level, title, badge, coins_awarded, is_milestone } = levelUpData;

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
            ${coins_awarded > 0 ? `
                <div class="level-up-reward">
                    <span class="reward-icon">🪙</span>
                    <span class="reward-amount">+${coins_awarded} Coins</span>
                </div>
            ` : ''}
            <button class="level-up-close">Continue</button>
        </div>
    `;

    // Load level-up styles if not already loaded
    if (!document.querySelector('#level-up-styles')) {
        const link = document.createElement('link');
        link.id = 'level-up-styles';
        link.rel = 'stylesheet';
        link.href = '/css/level-widget.css';
        document.head.appendChild(link);
    }

    document.body.appendChild(modal);

    // Trigger animation
    setTimeout(() => modal.classList.add('show'), 10);

    // Close handler
    const closeBtn = modal.querySelector('.level-up-close');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
}

/**
 * Highlight the "Da Claimare" filter button when there are unclaimed rewards
 */
function highlightReadyFilter(quests) {
    const readyFilterBtn = document.querySelector('.quest-filter-btn[data-filter="ready"]');
    console.log('🎁 highlightReadyFilter called - Button found:', !!readyFilterBtn);
    
    if (!readyFilterBtn) {
        console.warn('Ready filter button not found!');
        return;
    }
    
    // Count quests ready to claim (completed but not claimed)
    const unclaimedCount = quests.filter(quest => {
        const progress = quest.progress || {};
        const isReady = progress.is_completed === true && 
               (progress.is_claimed === false || progress.is_claimed === 0);
        if (isReady) {
            console.log('🎯 Quest ready to claim:', quest.title);
        }
        return isReady;
    }).length;
    
    console.log('🎁 Unclaimed quests count:', unclaimedCount);
    
    if (unclaimedCount > 0) {
        console.log('✅ Adding has-unclaimed class');
        readyFilterBtn.classList.add('has-unclaimed');
    } else {
        console.log('❌ Removing has-unclaimed class');
        readyFilterBtn.classList.remove('has-unclaimed');
    }
}

/**
 * Create reward claim animation
 */
function createRewardAnimation(questCard, xpReward, coinsReward) {
    const rewards = [];
    
    // Create XP particles
    for (let i = 0; i < 10; i++) {
        const particle = document.createElement('div');
        particle.className = 'reward-particle xp-particle';
        particle.textContent = `+${Math.floor(xpReward / 10)} XP`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${i * 0.1}s`;
        questCard.appendChild(particle);
        rewards.push(particle);
    }
    
    // Create Coins particles if applicable
    if (coinsReward) {
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.className = 'reward-particle coins-particle';
            particle.textContent = `+${Math.floor(coinsReward / 5)} Coins`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${i * 0.15}s`;
            questCard.appendChild(particle);
            rewards.push(particle);
        }
    }
    
    // Add celebration effect
    const celebration = document.createElement('div');
    celebration.className = 'celebration-overlay';
    celebration.innerHTML = `
        <div class="celebration-content">
            <div class="celebration-icon">🎉</div>
            <div class="celebration-text">Quest Completed!</div>
            <div class="celebration-rewards">
                <div class="celebration-reward-item">⭐ +${xpReward} XP</div>
                ${coinsReward ? `<div class="celebration-reward-item">🪙 +${coinsReward} Coins</div>` : ''}
            </div>
        </div>
    `;
    questCard.appendChild(celebration);
    
    // Remove particles after animation
    setTimeout(() => {
        rewards.forEach(p => p.remove());
        celebration.remove();
    }, 2000);
}
/**
 * Format quest type for display
 */
export function formatQuestType(type) {
    const typeMap = {
        'play_games': '🎮 Play Games',
        'score': '🎯 Score',
        'total_xp': '⭐ Total XP',
        'daily': '📅 Daily',
        'streak': '🔥 Streak',
        'play_time': '⏱️ Play Time'
    };
    return typeMap[type] || type;
}

/**
 * Handle quest reward claim with animation
 */
async function handleClaimReward(questId, userId) {
    const btn = document.querySelector(`[data-quest-id="${questId}"]`);
    const questCard = btn.closest('.quest-card');

    try {
        // Disable button
        btn.disabled = true;
        btn.classList.add('claiming');
        btn.innerHTML = '<span class="spinner"></span><span>Claiming...</span>';

        // Import claimQuestReward from api.js
        const { claimQuestReward } = await import('./api.js');
        const result = await claimQuestReward(questId, userId);

        console.log('[Quest Claim] Backend response:', result);

        // Success animation
        btn.classList.remove('claiming');
        btn.classList.add('claimed-success');
        btn.innerHTML = '<span class="checkmark">✓</span><span>Claimed!</span>';

        // Create reward animation
        createRewardAnimation(questCard, result.xp_reward, result.reward_coins);

        // Update user XP in header and AuthManager
        if (window.AuthManager) {
            const user = window.AuthManager.getUser();
            user.total_xp_earned = result.total_xp;
            window.AuthManager.setUser(user);
            
            // Update XP display in navigation by asking AuthManager to re-render
            const levelBadgeElement = document.getElementById('levelBadgeContainer');
            if (window.AuthManager && typeof window.AuthManager.updateUI === 'function') {
                // updateUI will fetch level info and re-render the badge properly
                window.AuthManager.updateUI().catch(() => {
                    if (levelBadgeElement) levelBadgeElement.textContent = `⭐ ${Math.floor(result.total_xp)} XP`;
                });
            } else if (levelBadgeElement) {
                levelBadgeElement.textContent = `⭐ ${Math.floor(result.total_xp)} XP`;
            }
        }

        // Check for level up and show animation
        if (result.level_up && result.level_info) {
            console.log('🎉 Level up detected!', result);
            
            // Prepare level up data
            const levelUpData = {
                old_level: result.old_level,
                new_level: result.new_level,
                title: result.level_info.title,
                badge: result.level_info.badge,
                coins_awarded: result.level_up_coins || 0,
                is_milestone: result.level_info.is_milestone || false
            };
            
            // Show level up modal directly (compatible with how games show it)
            showLevelUpModal(levelUpData);
        }

        // Wait for animation to complete, then reload quests
        setTimeout(async () => {
            await reloadQuests(userId);
            // Update quest badge in navigation
            if (window.refreshQuestBadge) {
                window.refreshQuestBadge();
            }
        }, 2000);

    } catch (error) {
        console.error('Error claiming reward:', error);
        btn.disabled = false;
        btn.classList.remove('claiming');
        btn.innerHTML = '<span class="claim-btn-icon">❌</span><span class="claim-btn-text">Failed - Try Again</span>';

        // Show error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = error.message || 'Failed to claim reward';
        questCard.appendChild(errorMsg);

        setTimeout(() => {
            errorMsg.remove();
            btn.innerHTML = '<span class="claim-btn-icon">🎁</span><span class="claim-btn-text">CLAIM REWARD</span>';
        }, 3000);
    }
}

/**
 * Reload quests after claim
 */
async function reloadQuests(userId) {
    try {
        const { fetchUserQuests } = await import('./api.js');
        const quests = await fetchUserQuests(userId);

        console.log('Quests reloaded after claim:', quests);

        // Update statistics
        const statistics = new QuestStatistics(quests);
        statistics.render();

        // Update ONLY questsList, not the whole quests container
        const questList = new QuestList(quests, userId);
        questList.render();

        // Reapply current filter
        const activeFilterBtn = document.querySelector('.quest-filter-btn.active');
        const currentFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
        const questsList = document.getElementById('questsList');
        if (questsList) {
            applyFilter(currentFilter, questsList);
        }
        
        // Update highlight on ready filter
        highlightReadyFilter(quests);
    } catch (error) {
        console.error('Error reloading quests:', error);
    }
}

function setupQuestFilters(quests) {
    const filterButtons = document.querySelectorAll('.quest-filter-btn');
    const questsList = document.getElementById('questsList');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            applyFilter(filter, questsList);
        });
    });

    // Automatically show platform quests on initial load
    applyFilter('platform', questsList);
    
    // Highlight "Da Claimare" filter if there are unclaimed rewards
    console.log('🔥 CALLING highlightReadyFilter with quests:', quests);
    highlightReadyFilter(quests);
    console.log('🔥 CALLED highlightReadyFilter');
}

async function applyFilter(filter, questsList) {
    const questCards = questsList.querySelectorAll('.quest-card');

    // Remove empty message if exists
    const emptyMessage = questsList.querySelector('.quests-empty-message');
    if (emptyMessage) emptyMessage.remove();

    // Hide all cards immediately
    questCards.forEach(card => {
        card.style.display = 'none';
        card.classList.remove('fade-in');
    });

    // Filter and show cards
    const cardsToShow = Array.from(questCards).filter(card => {
        const status = card.dataset.questStatus;
        const gameId = card.dataset.gameId;
        
        // Claimed quests appear ONLY in claimed filter
        if (status === 'claimed') {
            return filter === 'claimed';
        }
        
        // Other filters
        if (filter === 'games') return gameId && gameId !== 'null' && gameId !== '' && gameId !== 'undefined';
        if (filter === 'platform') return !gameId || gameId === 'null' || gameId === '' || gameId === 'undefined';
        if (filter === 'ready') return status === 'ready';
        if (filter === 'claimed') return status === 'claimed';
        
        return false;
    });

    // Show cards with staggered animation
    await Promise.all(
        cardsToShow.map((card, index) => 
            new Promise(resolve => {
                requestAnimationFrame(() => {
                    card.style.display = 'block';
                    requestAnimationFrame(() => {
                        card.classList.add('fade-in');
                        resolve();
                    });
                });
            })
        )
    );

    // Show empty message if no quests match filter
    if (cardsToShow.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'quests-empty-message';

        const emptyIcon = filter === 'games' ? '🎮' :
            filter === 'platform' ? '🏆' :
            filter === 'ready' ? '🎁' :
            filter === 'claimed' ? '✅' : '🎯';

        const emptyText = filter === 'games' ? 'No game quests available' :
            filter === 'platform' ? 'No platform quests available' :
            filter === 'ready' ? 'No rewards to claim' :
            filter === 'claimed' ? 'No claimed quests yet' :
            'No quests available';

        emptyMsg.innerHTML = `
            <div class="empty-icon">${emptyIcon}</div>
            <div class="empty-text">${emptyText}</div>
            <div class="empty-subtext">Continua a giocare per sbloccare nuove quest!</div>
        `;
        questsList.appendChild(emptyMsg);
    }
}

/**
 * Quest Renderer - Handles quest page rendering
 */
export class QuestRenderer {
    constructor() {
        this.appContainer = document.getElementById('app');
        this.user = null;
    }

    async render() {
        if (!this.validateAuthentication()) {
            return;
        }

        this.renderTemplate();
        await this.loadAndDisplayQuests();
        this.initScrollToTop();
    }

    validateAuthentication() {
        if (!window.AuthManager || !window.AuthManager.isLoggedIn()) {
            this.renderLoginRequired();
            return false;
        }

        this.user = window.AuthManager.getUser();

        if (this.user.is_anonymous) {
            this.renderAnonymousWarning();
            return false;
        }

        return true;
    }

    renderLoginRequired() {
        this.appContainer.innerHTML = `
            <div class="about text-center">
                <h2>🔒 Login Required</h2>
                <p>You need to be logged in to view quests.</p>
                <button class="play-game-btn" onclick="window.location.hash = '/'">Go to Games</button>
            </div>
        `;
    }

    renderAnonymousWarning() {
        this.appContainer.innerHTML = `
            <div class="about text-center">
                <h2>⚠️ Quests Not Available</h2>
                <p>Quests are only available for registered users, not for anonymous players.</p>
                <p>Please login with Steem Keychain to access quests and earn rewards!</p>
                <button class="play-game-btn" onclick="window.location.href = '/auth.html'">Login with Keychain</button>
            </div>
        `;
    }

    renderTemplate() {
        const template = document.getElementById('quests-template');
        const questsContent = template.content.cloneNode(true);

        this.appContainer.innerHTML = '';
        this.appContainer.appendChild(questsContent);
    }

    async loadAndDisplayQuests() {
        // Wait for DOM to be fully ready
        await this.waitForDOM();

        const questsList = document.getElementById('questsList');
        if (!questsList) {
            console.error('questsList element not found in DOM');
            return;
        }

        questsList.innerHTML = '<div class="loading">Loading quests...</div>';

        try {
            const { fetchUserQuests } = await import('./api.js');
            const quests = await fetchUserQuests(this.user.user_id);

            console.log('Quests loaded:', quests);

            const statistics = new QuestStatistics(quests);
            statistics.render();

            const questList = new QuestList(quests, this.user.user_id);
            questList.render();

            console.log('🚀 ABOUT TO CALL setupQuestFilters');
            setupQuestFilters(quests);
            console.log('🚀 FINISHED setupQuestFilters');
        } catch (error) {
            this.handleError(error);
        }
    }

    async waitForDOM() {
        // Wait multiple frames to ensure DOM is stable
        await new Promise(resolve => setTimeout(resolve, 0));
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
    }

    handleError(error) {
        console.error('Error loading quests:', error);
        console.error('Error stack:', error.stack);

        const questsList = document.getElementById('questsList');
        const errorMessage = '<div class="error-message">Failed to load quests. Please try again later.</div>';

        if (questsList) {
            questsList.innerHTML = errorMessage;
        } else {
            this.appContainer.innerHTML = errorMessage;
        }
    }

    /**
     * Initialize scroll-to-top button
     */
    initScrollToTop() {
        const scrollBtn = document.getElementById('scrollToTopQuests');
        if (!scrollBtn) {
            console.warn('Scroll to top button not found');
            return;
        }
        
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
}
/**
 * Quest Statistics - Calculates and displays quest statistics
 */
class QuestStatistics {
    constructor(quests) {
        this.quests = quests;
        this.activeCount = 0;
        this.readyToClaimCount = 0;
        this.claimedCount = 0;
        this.totalXP = 0;

        this.calculate();
    }

    calculate() {
        this.quests.forEach(quest => {
            const questState = new QuestState(quest);

            if (questState.isClaimed()) {
                this.claimedCount++;
                this.totalXP += quest.xp_reward || 0;
            } else if (questState.isCompleted()) {
                this.readyToClaimCount++;
            } else {
                this.activeCount++;
            }
        });
    }

    render() {
        // Only use hero stats now
        const heroActiveEl = document.getElementById('heroActiveCount');
        const heroReadyEl = document.getElementById('heroReadyCount');
        const heroClaimedEl = document.getElementById('heroClaimedCount');
        const heroTotalXPEl = document.getElementById('heroTotalXP');
        
        if (heroActiveEl) heroActiveEl.textContent = String(this.activeCount);
        if (heroReadyEl) heroReadyEl.textContent = String(this.readyToClaimCount);
        if (heroClaimedEl) heroClaimedEl.textContent = String(this.claimedCount);
        if (heroTotalXPEl) heroTotalXPEl.textContent = Math.floor(this.totalXP.toFixed(2));
    }
}
/**
 * Quest State - Encapsulates quest state logic
 */
class QuestState {
    constructor(quest) {
        this.quest = quest;
        this.progress = quest.progress || {};
    }

    isCompleted() {
        return this.progress.is_completed === true;
    }

    isClaimed() {
        return this.progress.is_claimed === true || this.progress.is_claimed === 1;
    }

    getCurrentProgress() {
        return this.progress.current_progress || 0;
    }

    getProgressPercent() {
        const current = this.getCurrentProgress();
        const target = this.quest.target_value;
        return Math.min((current / target) * 100, 100);
    }

    getClaimedDate() {
        return this.progress.claimed_at ? new Date(this.progress.claimed_at) : null;
    }
}
/**
 * Quest List - Renders list of quests
 */
class QuestList {
    constructor(quests, userId) {
        this.quests = this.sortQuests(quests);
        this.userId = userId;
        this.questsList = document.getElementById('questsList');
    }

    sortQuests(quests) {
        // Sort by game_id (if exists), then quest_type, then target_value
        return quests.sort((a, b) => {
            const gameIdA = a.config?.game_id || '';
            const gameIdB = b.config?.game_id || '';
            
            // Compare game_id first (game quests grouped together)
            if (gameIdA !== gameIdB) {
                // Platform quests (no game_id) come after game quests
                if (!gameIdA) return 1;
                if (!gameIdB) return -1;
                return gameIdA.localeCompare(gameIdB);
            }
            
            // If same game_id (or both platform), compare quest types
            if (a.quest_type !== b.quest_type) {
                return a.quest_type.localeCompare(b.quest_type);
            }
            
            // If same type, sort by target_value (ascending)
            return a.target_value - b.target_value;
        });
    }

    render() {
        if (!this.questsList) {
            console.error('questsList element not found');
            return;
        }

        this.questsList.innerHTML = '';

        if (this.quests.length === 0) {
            this.renderEmpty();
            return;
        }

        this.quests.forEach(quest => {
            const questCard = new QuestCard(quest, this.userId);
            this.questsList.appendChild(questCard.render());
        });

        this.attachClaimHandlers();
    }

    renderEmpty() {
        this.questsList.innerHTML = '<p class="text-center">No quests available at the moment.</p>';
    }

    attachClaimHandlers() {
        document.querySelectorAll('.claim-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const questId = parseInt(btn.dataset.questId);
                await handleClaimReward(questId, this.userId);
            });
        });
    }
}
/**
 * Quest Card - Represents a single quest card
 */
class QuestCard {
    constructor(quest, userId) {
        this.quest = quest;
        this.userId = userId;
        this.state = new QuestState(quest);
    }

    render() {
        const questCard = document.createElement('div');
        questCard.className = 'quest-card';
        // Get game_id from config if it exists
        const gameId = this.quest.config && this.quest.config.game_id ? this.quest.config.game_id : '';
        questCard.dataset.gameId = gameId;
        questCard.innerHTML = this.buildHTML();

        this.applyStatusClass(questCard);

        return questCard;
    }

    buildHTML() {
        return `
            <div class="quest-header">
                <div class="quest-title-row">
                    <h3 class="quest-title">${this.quest.title}</h3>
                    ${this.renderStatusBadge()}
                </div>
                <p class="quest-description">${this.quest.description}</p>
            </div>
            <div class="quest-body">
                ${this.renderQuestInfo()}
                ${this.renderProgress()}
                ${this.renderRewards()}
                ${this.renderClaimButton()}
            </div>
        `;
    }

    renderStatusBadge() {
        if (this.state.isClaimed()) {
            return '<span class="quest-claimed-badge">✓ Claimed</span>';
        }
        if (this.state.isCompleted()) {
            return '<span class="quest-ready-badge">🎁 Ready to Claim!</span>';
        }
        return '';
    }

    renderQuestInfo() {
        const config = this.quest.config || {};

        // Check if quest has daily reset configured
        const dailyBadge = (config.reset_period === 'daily' || config.reset_on_complete)
            ? '<span class="quest-daily-badge">🔄 Daily</span>'
            : '';

        return `
            <div class="quest-info">
                <span class="quest-type">${formatQuestType(this.quest.quest_type)}</span>
                ${dailyBadge}
            </div>
        `;
    }

    renderProgress() {
        const current = this.state.getCurrentProgress();
        const target = this.quest.target_value;
        const percent = this.state.getProgressPercent();

        return `
            <div class="quest-progress">
                <div class="progress-info">
                    <span>Progress: ${current} / ${target}</span>
                    <span>${percent.toFixed(0)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }

    renderRewards() {
        const coinsReward = this.quest.reward_coins && this.quest.reward_coins > 0
            ? `<div class="reward-item">
                <span class="reward-icon">🪙</span>
                <span class="reward-value">${this.quest.reward_coins} Coins</span>
            </div>`
            : '';

        return `
            <div class="quest-rewards">
                <div class="reward-item">
                    <span class="reward-icon">⭐</span>
                    <span class="reward-value">${this.quest.xp_reward} XP</span>
                </div>
                ${coinsReward}
            </div>
        `;
    }

    renderClaimButton() {
        if (this.state.isClaimed()) {
            return '';
        }

        if (this.state.isCompleted()) {
            return `
                <button class="claim-btn" data-quest-id="${this.quest.quest_id}">
                    <span class="claim-btn-icon">🎁</span>
                    <span class="claim-btn-text">CLAIM REWARD</span>
                </button>
            `;
        }

        return '';
    }

    applyStatusClass(questCard) {
        if (this.state.isClaimed()) {
            questCard.classList.add('claimed');
            questCard.dataset.questStatus = 'claimed';
        } else if (this.state.isCompleted()) {
            questCard.classList.add('ready-to-claim');
            questCard.dataset.questStatus = 'ready';
        } else {
            questCard.dataset.questStatus = 'active';
        }
    }
}

// Listen for game session end events to refresh quest progress
window.addEventListener('gameSessionEnded', async (event) => {
    console.log('🎮 Game session ended, refreshing quest progress...', event.detail);
    
    // Only refresh if we're on the quests page
    const questsList = document.getElementById('questsList');
    if (!questsList) {
        return; // Not on quests page
    }
    
    // Get current user
    const user = window.AuthManager?.getUser();
    if (!user || !user.user_id) {
        return;
    }
    
    try {
        // Reload quests
        const { fetchUserQuests } = await import('./api.js');
        const quests = await fetchUserQuests(user.user_id);
        
        // Update statistics
        const statistics = new QuestStatistics(quests);
        statistics.render();
        
        // Update quest list
        const questList = new QuestList(quests, user.user_id);
        questList.render();
        
        // Reapply current filter
        const activeFilterBtn = document.querySelector('.quest-filter-btn.active');
        const currentFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
        applyFilter(currentFilter, questsList);
        
        // Update highlight on ready filter
        highlightReadyFilter(quests);
        
        console.log('✅ Quest progress refreshed after game session');
    } catch (error) {
        console.error('Error refreshing quest progress:', error);
    }
});
