import AuthManager from './auth.js';
import { checkUnclaimedQuests } from './nav.js';
import { showLevelUpModal } from './level-widget.js';

/**
 * Highlight the "Da Claimare" filter button when there are unclaimed rewards
 */
function highlightReadyFilter(quests) {
    const readyFilterBtn = document.querySelector('.quest-filter-btn[data-filter="ready"]');

    
    if (!readyFilterBtn) {

        return;
    }
    
    // Count quests ready to claim (completed but not claimed)
    const unclaimedCount = quests.filter(quest => {
        const progress = quest.progress || {};
        const isReady = progress.is_completed === true && 
               (progress.is_claimed === false || progress.is_claimed === 0);
        return isReady;
    }).length;
    

    
    if (unclaimedCount > 0) {

        readyFilterBtn.classList.add('has-unclaimed');
    } else {

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



        // Success animation
        btn.classList.remove('claiming');
        btn.classList.add('claimed-success');
        btn.innerHTML = '<span class="checkmark">✓</span><span>Claimed!</span>';

        // Create reward animation
        createRewardAnimation(questCard, result.xp_reward, result.reward_coins);

        // Update user XP in header and AuthManager
        if (AuthManager) {
            const user = AuthManager.getUser();
            user.total_xp_earned = result.total_xp;
            AuthManager.setUser(user);
            
            // Update XP display in navigation by asking AuthManager to re-render
            const levelBadgeElement = document.getElementById('levelBadgeContainer');
            if (typeof AuthManager.updateUI === 'function') {
                // updateUI will fetch level info and re-render the badge properly
                AuthManager.updateUI().catch(() => {
                    if (levelBadgeElement) levelBadgeElement.textContent = `⭐ ${Math.floor(result.total_xp)} XP`;
                });
            } else if (levelBadgeElement) {
                levelBadgeElement.textContent = `⭐ ${Math.floor(result.total_xp)} XP`;
            }
        }

        // Check for level up and show animation
        if (result.level_up && result.level_info) {

            
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
            checkUnclaimedQuests();
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

    highlightReadyFilter(quests);

}

function showCardWithAnimation(card) {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            card.style.display = 'block';
            requestAnimationFrame(() => {
                card.classList.add('fade-in');
                resolve();
            });
        });
    });
}

const EMPTY_FILTER_ICONS = { games: '🎮', platform: '🏆', ready: '🎁', claimed: '✅' };
const EMPTY_FILTER_TEXTS = { games: 'No game quests available', platform: 'No platform quests available', ready: 'No rewards to claim', claimed: 'No claimed quests yet' };

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
    await Promise.all(cardsToShow.map(card => showCardWithAnimation(card)));

    // Show empty message if no quests match filter
    if (cardsToShow.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'quests-empty-message';

        const emptyIcon = EMPTY_FILTER_ICONS[filter] || '🎯';
        const emptyText = EMPTY_FILTER_TEXTS[filter] || 'No quests available';

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
        if (!AuthManager.isLoggedIn()) {
            this.renderLoginRequired();
            return false;
        }

        this.user = AuthManager.getUser();

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



            const statistics = new QuestStatistics(quests);
            statistics.render();

            const questList = new QuestList(quests, this.user.user_id);
            questList.render();


            setupQuestFilters(quests);

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

function animateCount(el, target, duration = 600) {
    if (!el) return null;
    let value = 0;
    el.textContent = String(0);
    const steps = Math.max(6, Math.floor(duration / 30));
    const increment = Math.max(1, Math.ceil(target / steps));
    const iv = setInterval(() => {
        value += increment;
        if (value >= target) {
            el.textContent = String(target);
            clearInterval(iv);
        } else {
            el.textContent = String(value);
        }
    }, 30);
    return iv;
}

function clearAnimations(...intervals) {
    for (const iv of intervals) {
        if (iv) clearInterval(iv);
    }
}

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
        const elements = {
            active: document.getElementById('heroActiveCount'),
            ready: document.getElementById('heroReadyCount'),
            claimed: document.getElementById('heroClaimedCount'),
            totalXP: document.getElementById('heroTotalXP')
        };

        const anims = {
            active: animateCount(elements.active, this.activeCount),
            ready: animateCount(elements.ready, this.readyToClaimCount),
            claimed: animateCount(elements.claimed, this.claimedCount)
        };

        this._computeTotalXPAsync(elements, anims);
    }

    async _computeTotalXPAsync(elements, anims) {
        let animInterval = null;
        try {
            animInterval = this._startXPPlaceholderAnim(elements.totalXP);
            const questXP = await this._fetchQuestXP();

            if (questXP !== null) {
                clearAnimations(animInterval, anims.active, anims.ready, anims.claimed);
                animInterval = null;
                this._setFinalValues(elements, questXP);
                return;
            }
        } catch (e) {
            console.error('Error computing total quest XP from sessions:', e);
        } finally {
            clearAnimations(animInterval, anims.active, anims.ready, anims.claimed);
        }

        // Fallback: previous behaviour (sum of claimed quest xp)
        if (elements.totalXP) {
            elements.totalXP.textContent = Math.floor(Number.parseFloat(this.totalXP.toFixed(2)));
        }
    }

    _startXPPlaceholderAnim(heroTotalXPEl) {
        if (!heroTotalXPEl) return null;
        let display = 0;
        const placeholderTarget = Math.max(0, Math.floor(this.totalXP));
        heroTotalXPEl.textContent = String(display);
        return setInterval(() => {
            display += Math.max(1, Math.ceil(placeholderTarget / 20));
            if (display >= placeholderTarget) display = placeholderTarget;
            heroTotalXPEl.textContent = String(display);
        }, 30);
    }

    async _fetchQuestXP() {
        const user = AuthManager.getUser();
        if (!user?.user_id || user.total_xp_earned === undefined) return null;

        const { getUserSessions } = await import('./api.js');
        const all = await getUserSessions(user.user_id).catch(() => ({ sessions: [] }));
        const sessions = all?.sessions ?? [];
        const totalSessionXP = sessions.reduce((sum, s) => sum + (Number.parseFloat(s.xp_earned) || 0), 0);

        return Math.max(0, (Number.parseFloat(user.total_xp_earned) || 0) - totalSessionXP);
    }

    _setFinalValues(elements, questXP) {
        if (elements.active) elements.active.textContent = String(this.activeCount);
        if (elements.ready) elements.ready.textContent = String(this.readyToClaimCount);
        if (elements.claimed) elements.claimed.textContent = String(this.claimedCount);
        if (elements.totalXP) elements.totalXP.textContent = String(Math.floor(questXP));
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
                const questId = Number.parseInt(btn.dataset.questId);
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
        const gameId = this.quest.config?.game_id ?? '';
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
globalThis.addEventListener('gameSessionEnded', async (event) => {

    
    // Only refresh if we're on the quests page
    const questsList = document.getElementById('questsList');
    if (!questsList) {
        return; // Not on quests page
    }
    
    // Get current user
    const user = AuthManager?.getUser();
    if (!user?.user_id) {
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
        

    } catch (error) {
        console.error('Error refreshing quest progress:', error);
    }
});
