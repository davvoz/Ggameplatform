/**
 * Create reward claim animation
 */
function createRewardAnimation(questCard, xpReward, satsReward) {
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
    
    // Create Sats particles if applicable
    if (satsReward) {
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.className = 'reward-particle sats-particle';
            particle.textContent = `+${Math.floor(satsReward / 5)} Sats`;
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
                ${satsReward ? `<div class="celebration-reward-item">💰 +${satsReward} Sats</div>` : ''}
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
        createRewardAnimation(questCard, result.xp_reward, result.sats_reward);

        // Update user XP in header
        if (window.AuthManager) {
            const user = window.AuthManager.getUser();
            user.total_xp_earned = result.total_xp;
            window.AuthManager.setUser(user);
        }

        // Wait for animation to complete, then reload quests
        setTimeout(() => {
            renderQuests();
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
            const questCards = questsList.querySelectorAll('.quest-card');

            // Remove empty message if exists
            const emptyMessage = questsList.querySelector('.quests-empty-message');
            if (emptyMessage) emptyMessage.remove();

            questCards.forEach(card => {
                card.style.display = 'none';
                card.classList.remove('fade-in');
            });

            // Count visible quests
            let visibleCount = 0;

            // Show filtered quests with animation
            setTimeout(() => {
                questCards.forEach((card, index) => {
                    const status = card.dataset.questStatus;
                    let shouldShow = false;

                    if (filter === 'all') {
                        shouldShow = true;
                    } else if (filter === 'active' && status === 'active') {
                        shouldShow = true;
                    } else if (filter === 'ready' && status === 'ready') {
                        shouldShow = true;
                    } else if (filter === 'claimed' && status === 'claimed') {
                        shouldShow = true;
                    }

                    if (shouldShow) {
                        visibleCount++;
                        setTimeout(() => {
                            card.style.display = 'block';
                            setTimeout(() => {
                                card.classList.add('fade-in');
                            }, 10);
                        }, index * 50);
                    }
                });

                // Show empty message if no quests match filter
                setTimeout(() => {
                    if (visibleCount === 0) {
                        const emptyMsg = document.createElement('div');
                        emptyMsg.className = 'quests-empty-message';

                        const emptyIcon = filter === 'active' ? '📋' :
                            filter === 'ready' ? '🎁' :
                                filter === 'claimed' ? '✅' : '🎮';

                        const emptyText = filter === 'active' ? 'Nessuna quest attiva al momento' :
                            filter === 'ready' ? 'Nessuna ricompensa da claimare' :
                                filter === 'claimed' ? 'Nessuna quest completata ancora' :
                                    'Nessuna quest disponibile';

                        emptyMsg.innerHTML = `
                            <div class="empty-icon">${emptyIcon}</div>
                            <div class="empty-text">${emptyText}</div>
                            <div class="empty-subtext">Continua a giocare per sbloccare nuove quest!</div>
                        `;
                        questsList.appendChild(emptyMsg);
                    }
                }, questCards.length * 50 + 200);
            }, 100);
        });
    });
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
        try {
            const { fetchUserQuests } = await import('./api.js');
            const quests = await fetchUserQuests(this.user.user_id);

            console.log('Quests loaded:', quests);

            await this.waitForDOM();

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
        this.quests = quests;
        this.userId = userId;
        this.questsList = document.getElementById('questsList');
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
        const gameInfo = this.quest.game_id
            ? `<span class="quest-game">Game: ${this.quest.game_id}</span>`
            : '';

        return `
            <div class="quest-info">
                <span class="quest-type">${formatQuestType(this.quest.quest_type)}</span>
                ${gameInfo}
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
        const satsReward = this.quest.sats_reward
            ? `<div class="reward-item">
                <span class="reward-icon">💰</span>
                <span class="reward-value">${this.quest.sats_reward} Sats</span>
            </div>`
            : '';

        return `
            <div class="quest-rewards">
                <div class="reward-item">
                    <span class="reward-icon">⭐</span>
                    <span class="reward-value">${this.quest.xp_reward} XP</span>
                </div>
                ${satsReward}
            </div>
        `;
    }

    renderClaimButton() {
        if (this.state.isClaimed()) {
            const claimedDate = this.state.getClaimedDate();
            if (claimedDate) {
                const dateStr = claimedDate.toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return `<div class="claimed-info">Claimed on ${dateStr}</div>`;
            }
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
