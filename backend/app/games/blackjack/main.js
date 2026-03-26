/**
 * Blackjack v2 — Smooth incremental UI, animations, PlatformSDK
 */

// ─── Config ────────────────────────────────────────────────────────
const API = '/api/blackjack';
const SUIT_SYMBOL = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLOR = { hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black' };
const BET_CHIPS = [5, 10, 50];
const BET_MIN = 5;
const BET_MAX = 5000;

// ─── State ─────────────────────────────────────────────────────────
let userId = null;
let gameId = null;
let balance = 0;
let bet = 10;
let busy = false;
let parentOrigin = null; // Validated parent origin for secure postMessage

// Track rendered cards so we only add new ones
let renderedDealerCards = [];
let renderedPlayerCards = [];
let dealerRevealed = false;

// ─── DOM Refs ──────────────────────────────────────────────────────
const $coinAmount = document.getElementById('coinAmount');
const $dealerCards = document.getElementById('dealerCards');
const $playerCards = document.getElementById('playerCards');
const $dealerValue = document.getElementById('dealerValue');
const $playerValue = document.getElementById('playerValue');
const $gameStatus = document.getElementById('gameStatus');
const $betSection = document.getElementById('betSection');
const $actionsSection = document.getElementById('actionsSection');
const $newHandSection = document.getElementById('newHandSection');
const $betAmount = document.getElementById('betAmount');
const $splitHands = document.getElementById('splitHands');
const $dealBtn = document.getElementById('dealBtn');
const $newHandBtn = document.getElementById('newHandBtn');
const $betReset = document.getElementById('betReset');
const $rulesOverlay = document.getElementById('rulesOverlay');
const $rulesToggle = document.getElementById('rulesToggle');
const $rulesClose = document.getElementById('rulesClose');

// ─── Platform SDK ──────────────────────────────────────────────────
async function initSDK() {
    if (!window.PlatformSDK) {
        console.warn('PlatformSDK not found');
        userId = 'test_user';
        fetchBalance();
        return;
    }
    try {
        // userId comes from the 'config' event, NOT from init callbacks
        window.PlatformSDK.on('config', (cfg) => {
            if (cfg?.userId) userId = cfg.userId;
        });
        await window.PlatformSDK.init({
            onPause() { },
            onResume() { },
            onExit() { },
        });
        // Fallback: check platformConfig or localStorage
        if (!userId) {
            userId = window.platformConfig?.userId
                || localStorage.getItem('platformUserId')
                || null;
        }
        if (userId) fetchBalance();
        else console.warn('No userId resolved from SDK');
    } catch (err) {
        console.error('SDK init error:', err);
        userId = userId || 'test_user';
        fetchBalance();
    }

    // Listen for XP banner and level-up notifications from platform/RuntimeShell
    window.addEventListener('message', (event) => {
        try {
            const msg = event.data;
            if (!msg || !msg.type) return;
            
            // Validate protocol version to ensure it's a valid platform message
            if (msg.protocolVersion !== '1.0.0') return;
            
            // Verify origin: once parent origin is established, reject messages from other origins
            if (parentOrigin && event.origin !== parentOrigin) {
                console.warn('[BJ] Rejected message from untrusted origin:', event.origin);
                return;
            }
            
            // Store parent origin from first valid message
            if (!parentOrigin && event.origin) {
                parentOrigin = event.origin;
            }
            
            if (msg.type === 'showXPBanner' && msg.payload) {
                showXPBanner(msg.payload.xp_earned, msg.payload);
            }
            if (msg.type === 'showLevelUpModal' && msg.payload) {
                showLevelUpModal(msg.payload);
            }
        } catch (e) { console.error('[BJ] platform msg error', e); }
    });
}

async function fetchBalance() {
    try {
        const r = await fetch(`/api/coins/${encodeURIComponent(userId)}/balance`);
        if (r.ok) {
            const d = await r.json();
            animateBalance(d.balance);
        }
    } catch (_) { }
}

// ─── Balance animation ─────────────────────────────────────────────
function setBalance(val) {
    balance = val;
    $coinAmount.textContent = val.toLocaleString();
}

function animateBalance(target) {
    const start = balance;
    const diff = target - start;
    if (diff === 0) { setBalance(target); return; }
    const duration = Math.min(600, Math.abs(diff) * 10);
    const t0 = performance.now();
    const $coin = $coinAmount.closest('.coin-balance');
    $coin.classList.add('coin-flash');

    function tick(now) {
        const p = Math.min((now - t0) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
        const cur = Math.round(start + diff * ease);
        $coinAmount.textContent = cur.toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
        else {
            setBalance(target);
            setTimeout(() => $coin.classList.remove('coin-flash'), 200);
        }
    }
    requestAnimationFrame(tick);
}

// ─── Card HTML Builders ────────────────────────────────────────────
function cardKey(c) {
    return c.rank === 'hidden' ? 'hidden' : `${c.rank}_${c.suit}`;
}

function buildCardEl(card, animate = true) {
    const el = document.createElement('div');
    el.classList.add('card');
    if (card.rank === 'hidden') {
        el.classList.add('card-back');
        el.dataset.key = 'hidden';
    } else {
        const color = SUIT_COLOR[card.suit] || 'black';
        const sym = SUIT_SYMBOL[card.suit] || card.suit;
        el.classList.add('card-face', color);
        el.dataset.key = cardKey(card);
        
        // Create corner elements safely without innerHTML
        const cornerTop = document.createElement('div');
        cornerTop.className = 'card-corner';
        cornerTop.textContent = card.rank;
        cornerTop.appendChild(document.createElement('br'));
        cornerTop.appendChild(document.createTextNode(sym));
        
        const rankSpan = document.createElement('span');
        rankSpan.className = 'card-rank';
        rankSpan.textContent = card.rank;
        
        const suitSpan = document.createElement('span');
        suitSpan.className = 'card-suit';
        suitSpan.textContent = sym;
        
        const cornerBr = document.createElement('div');
        cornerBr.className = 'card-corner-br';
        cornerBr.textContent = card.rank;
        cornerBr.appendChild(document.createElement('br'));
        cornerBr.appendChild(document.createTextNode(sym));
        
        el.appendChild(cornerTop);
        el.appendChild(rankSpan);
        el.appendChild(suitSpan);
        el.appendChild(cornerBr);
    }
    if (animate) {
        el.classList.add('card-deal-in');
        el.addEventListener('animationend', () => {
            el.classList.remove('card-deal-in');
        }, { once: true });
    }
    return el;
}

// ─── Incremental card sync ─────────────────────────────────────────
// Compares previous vs new card arrays and only adds/flips/removes changed cards
function syncCards(container, prevCards, newCards, staggerBase = 0) {
    const addedKeys = [];
    let delay = staggerBase;

    // 1. If hidden card is now revealed → flip it in place
    const hadHidden = prevCards.some(c => c.rank === 'hidden');
    const hasHidden = newCards.some(c => c.rank === 'hidden');
    if (hadHidden && !hasHidden) {
        // Find the hidden element and replace with revealed card
        const hiddenEl = container.querySelector('.card-back');
        if (hiddenEl) {
            const revealedCard = newCards.find(c => !prevCards.slice(0, -1).some(
                p => p.rank !== 'hidden' && cardKey(p) === cardKey(c)
            ));
            // Actually the hidden card is the 2nd dealer card usually
            // Replace hidden → revealed with flip
            const idx = Array.from(container.children).indexOf(hiddenEl);
            const newEl = buildCardEl(newCards[idx] || newCards[1], false);
            newEl.classList.add('card-flip');
            hiddenEl.replaceWith(newEl);
        }
    }

    // 2. Add new cards that weren't in prevCards
    for (let i = prevCards.length; i < newCards.length; i++) {
        // skip if this is hidden and had hidden
        if (newCards[i].rank === 'hidden' && hadHidden) continue;

        const el = buildCardEl(newCards[i], true);
        el.style.animationDelay = `${delay}ms`;
        container.appendChild(el);
        addedKeys.push(cardKey(newCards[i]));
        delay += 120;
    }

    return delay;
}

// ─── Clear table with animation ────────────────────────────────────
function clearTable() {
    return new Promise(resolve => {
        const cards = document.querySelectorAll('.card');
        if (cards.length === 0) { resolve(); return; }
        cards.forEach(c => c.classList.add('card-deal-out'));
        setTimeout(() => {
            // Clear elements safely without innerHTML
            while ($dealerCards.firstChild) $dealerCards.removeChild($dealerCards.firstChild);
            while ($playerCards.firstChild) $playerCards.removeChild($playerCards.firstChild);
            while ($splitHands.firstChild) $splitHands.removeChild($splitHands.firstChild);
            $splitHands.style.display = 'none';
            renderedDealerCards = [];
            renderedPlayerCards = [];
            dealerRevealed = false;
            resolve();
        }, 220);
    });
}

// ─── Smooth section show/hide ──────────────────────────────────────
function showSection(el, displayVal = '') {
    if (el.style.display !== 'none' && el.style.display !== '') return;
    el.style.display = displayVal;
    el.style.animation = 'none';
    el.style.animation = '';
}
function hideSection(el) {
    el.style.display = 'none';
}

// ─── Chip fly animation ────────────────────────────────────────────
function showChipAnimation(amount) {
    const table = document.querySelector('.table-area');
    const chip = document.createElement('div');
    chip.className = 'chip-anim';
    chip.textContent = `${amount} 🪙`;
    table.appendChild(chip);
    setTimeout(() => chip.remove(), 750);
}

// ─── Result display (shown in game-status area) ─────────────────
function showError(text) {
    $gameStatus.textContent = text;
    $gameStatus.className = 'game-status result-text lose-text';
    setTimeout(() => {
        $gameStatus.textContent = 'Place your bet';
        $gameStatus.className = 'game-status';
    }, 2500);
}

// ─── Win Celebration ─────────────────────────────────────────────────────
function showWinCelebration(payout, isBlackjack) {
    const table = document.querySelector('.table-area');
    const cls = isBlackjack ? 'blackjack-celebration' : 'win-celebration';
    table.classList.add(cls);
    setTimeout(() => table.classList.remove(cls), 2000);

    // Confetti burst
    const colors = isBlackjack
        ? ['#f5a623', '#ffd700', '#ff8c00', '#fff4cc', '#e6960a']
        : ['#00d26a', '#00ff88', '#00b85c', '#80ffc0', '#f5a623'];
    const count = isBlackjack ? 30 : 18;
    for (let i = 0; i < count; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.left = `${20 + Math.random() * 60}%`;
        c.style.top = `${30 + Math.random() * 30}%`;
        c.style.setProperty('--fall-x', `${(Math.random() - 0.5) * 120}px`);
        c.style.setProperty('--fall-y', `${60 + Math.random() * 80}px`);
        c.style.setProperty('--fall-rot', `${Math.random() * 720 - 360}deg`);
        c.style.setProperty('--fall-duration', `${0.8 + Math.random() * 0.8}s`);
        c.style.animationDelay = `${Math.random() * 0.3}s`;
        c.style.width = `${5 + Math.random() * 6}px`;
        c.style.height = `${5 + Math.random() * 6}px`;
        table.appendChild(c);
        setTimeout(() => c.remove(), 2000);
    }

    // Payout popup
    if (payout > 0) {
        const popup = document.createElement('div');
        popup.className = `payout-popup ${isBlackjack ? 'blackjack' : 'win'}`;
        popup.textContent = `+${payout} 🪙`;
        table.appendChild(popup);
        setTimeout(() => popup.remove(), 1500);
    }
}

// ─── XP Banner & Level-Up UI ───────────────────────────────────────
function showXPBanner(xpAmount, payload) {
    if (!document.querySelector('#bj-xp-styles')) {
        const s = document.createElement('style');
        s.id = 'bj-xp-styles';
        s.textContent = `
            .game-xp-banner {
                position: fixed; top: 60px; right: 16px; z-index: 10000;
                animation: xpSlideIn 0.5s ease; pointer-events: none;
            }
            .game-xp-banner.hiding { animation: xpSlideOut 0.5s ease forwards; }
            .game-xp-badge {
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                padding: 14px 22px; border-radius: 12px;
                box-shadow: 0 4px 20px rgba(255,215,0,0.4);
                display: flex; align-items: center; gap: 10px;
            }
            .game-xp-icon { font-size: 1.4em; }
            .game-xp-amount { font-size: 1.1em; font-weight: 700; color: #1a1a1a; }
            @keyframes xpSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes xpSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
        `;
        document.head.appendChild(s);
    }
    const banner = document.createElement('div');
    banner.className = 'game-xp-banner';
    
    const badge = document.createElement('div');
    badge.className = 'game-xp-badge';
    
    const icon = document.createElement('span');
    icon.className = 'game-xp-icon';
    icon.textContent = '⭐';
    
    const amount = document.createElement('span');
    amount.className = 'game-xp-amount';
    amount.textContent = `+${Number(xpAmount).toFixed(2)} XP`;
    
    badge.appendChild(icon);
    badge.appendChild(amount);
    banner.appendChild(badge);
    document.body.appendChild(banner);
    
    setTimeout(() => { banner.classList.add('hiding'); setTimeout(() => banner.remove(), 500); }, 2500);
}

function showLevelUpModal(data) {
    const { old_level, new_level, title = '', badge = '', coins_awarded = 0, is_milestone = false, user_data = {} } = data;
    const isAnonymous = user_data?.is_anonymous === true;

    if (!document.querySelector('#level-up-styles')) {
        const link = document.createElement('link');
        link.id = 'level-up-styles';
        link.rel = 'stylesheet';
        link.href = '/css/level-widget.css';
        document.head.appendChild(link);
    }

    const modal = document.createElement('div');
    modal.className = 'level-up-modal';

    const content = document.createElement('div');
    content.className = `level-up-content ${is_milestone ? 'milestone' : ''}`;

    const animation = document.createElement('div');
    animation.className = 'level-up-animation';
    const rays = document.createElement('div');
    rays.className = 'level-up-rays';
    const badgeContainer = document.createElement('div');
    badgeContainer.className = 'level-up-badge-container';
    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'level-up-badge';
    badgeSpan.textContent = badge || '🏅';
    badgeContainer.appendChild(badgeSpan);
    animation.appendChild(rays);
    animation.appendChild(badgeContainer);
    content.appendChild(animation);

    const title2 = document.createElement('h2');
    title2.className = 'level-up-title';
    title2.textContent = '🎉 LEVEL UP! 🎉';
    content.appendChild(title2);

    const levels = document.createElement('div');
    levels.className = 'level-up-levels';
    const oldLevel = document.createElement('span');
    oldLevel.className = 'old-level';
    oldLevel.textContent = old_level ?? '-';
    const arrow = document.createElement('span');
    arrow.className = 'level-arrow';
    arrow.textContent = '→';
    const newLevel = document.createElement('span');
    newLevel.className = 'new-level';
    newLevel.textContent = new_level ?? '-';
    levels.appendChild(oldLevel);
    levels.appendChild(arrow);
    levels.appendChild(newLevel);
    content.appendChild(levels);

    const newTitle = document.createElement('div');
    newTitle.className = 'level-up-new-title';
    newTitle.textContent = title;
    content.appendChild(newTitle);

    if (is_milestone) {
        const milestone = document.createElement('div');
        milestone.className = 'level-up-milestone-badge';
        milestone.textContent = '✨ MILESTONE ✨';
        content.appendChild(milestone);
    }

    if (!isAnonymous && coins_awarded > 0) {
        const reward = document.createElement('div');
        reward.className = 'level-up-reward';
        const icon = document.createElement('span');
        icon.className = 'reward-icon';
        icon.textContent = '🪙';
        const amount = document.createElement('span');
        amount.className = 'reward-amount';
        amount.textContent = `+${coins_awarded} Coins`;
        reward.appendChild(icon);
        reward.appendChild(amount);
        content.appendChild(reward);
    }

    const btn = document.createElement('button');
    btn.className = 'level-up-close';
    btn.textContent = 'Continue';
    content.appendChild(btn);

    modal.appendChild(content);
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    btn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
    setTimeout(() => { if (modal.parentElement) { modal.classList.remove('show'); setTimeout(() => modal.remove(), 300); } }, 6000);
}

// ─── Update UI from game state ─────────────────────────────────────
// ─── Game State Manager (Single Responsibility) ─────────────────
class GameState {
    constructor() {
        this.dealer = null;
        this.hands = [];
        this.status = null;
        this.availableActions = [];
        this.totalPayout = 0;
        this.initialBet = 0;
        this.balance = 0;
        this.isSplit = false;
    }

    update(state) {
        this.dealer = state.dealer;
        this.hands = state.hands;
        this.status = state.status;
        this.availableActions = state.available_actions || [];
        this.totalPayout = state.total_payout || 0;
        this.initialBet = state.initial_bet || 0;
        if (state.balance != null) this.balance = state.balance;
        this.isSplit = this.hands.length > 1;
    }

    isResolved() {
        return this.status === 'resolved';
    }

    getPrimaryHand() {
        return this.hands[0];
    }

    getResults() {
        return this.hands.map(h => h.result);
    }
}

// ─── Card Renderer (Single Responsibility) ──────────────────────
class CardRenderer {
    constructor(dealerContainer, playerContainer, splitContainer) {
        this.$dealerCards = dealerContainer;
        this.$playerCards = playerContainer;
        this.$splitHands = splitContainer;
        this.renderedDealerCards = [];
        this.renderedPlayerCards = [];
    }

    buildCardElement(card, animate = true) {
        const el = document.createElement('div');
        el.classList.add('card');

        if (card.rank === 'hidden') {
            el.classList.add('card-back');
            el.dataset.key = 'hidden';
        } else {
            this._buildCardFace(el, card);
        }

        if (animate) {
            el.classList.add('card-deal-in');
            el.addEventListener('animationend', () => {
                el.classList.remove('card-deal-in');
            }, { once: true });
        }

        return el;
    }

    _buildCardFace(el, card) {
        const color = SUIT_COLOR[card.suit] || 'black';
        const sym = SUIT_SYMBOL[card.suit] || card.suit;
        el.classList.add('card-face', color);
        el.dataset.key = `${card.rank}_${card.suit}`;

        const cornerTop = document.createElement('div');
        cornerTop.className = 'card-corner';
        cornerTop.textContent = card.rank;
        cornerTop.appendChild(document.createElement('br'));
        cornerTop.appendChild(document.createTextNode(sym));

        const rankSpan = document.createElement('span');
        rankSpan.className = 'card-rank';
        rankSpan.textContent = card.rank;

        const suitSpan = document.createElement('span');
        suitSpan.className = 'card-suit';
        suitSpan.textContent = sym;

        const cornerBr = document.createElement('div');
        cornerBr.className = 'card-corner-br';
        cornerBr.textContent = card.rank;
        cornerBr.appendChild(document.createElement('br'));
        cornerBr.appendChild(document.createTextNode(sym));

        el.appendChild(cornerTop);
        el.appendChild(rankSpan);
        el.appendChild(suitSpan);
        el.appendChild(cornerBr);
    }

    syncCards(container, prevCards, newCards, staggerBase = 0) {
        let delay = staggerBase;

        const hadHidden = prevCards.some(c => c.rank === 'hidden');
        const hasHidden = newCards.some(c => c.rank === 'hidden');

        if (hadHidden && !hasHidden) {
            this._flipHiddenCard(container, newCards);
        }

        for (let i = prevCards.length; i < newCards.length; i++) {
            if (newCards[i].rank === 'hidden' && hadHidden) continue;

            const el = this.buildCardElement(newCards[i], true);
            el.style.animationDelay = `${delay}ms`;
            container.appendChild(el);
            delay += 120;
        }

        return delay;
    }

    _flipHiddenCard(container, newCards) {
        const hiddenEl = container.querySelector('.card-back');
        if (!hiddenEl) return;

        const idx = Array.from(container.children).indexOf(hiddenEl);
        const newEl = this.buildCardElement(newCards[idx] || newCards[1], false);
        newEl.classList.add('card-flip');
        hiddenEl.replaceWith(newEl);
    }

    renderPlayerCards(gameState, isNewDeal) {
        const hand = gameState.getPrimaryHand();
        const newPlayerCards = hand.cards;

        if (!gameState.isSplit) {
            this.$splitHands.style.display = 'none';

            if (isNewDeal) {
                this.syncCards(this.$playerCards, [], [newPlayerCards[0]], 0);
                if (newPlayerCards.length > 1) {
                    setTimeout(() => {
                        this.syncCards(this.$playerCards, [newPlayerCards[0]], newPlayerCards, 0);
                    }, 300);
                }
            } else {
                this.syncCards(this.$playerCards, this.renderedPlayerCards, newPlayerCards, 0);
            }
            this.renderedPlayerCards = [...newPlayerCards];
        } else {
            this._renderSplitHands(gameState);
        }
    }

    _renderSplitHands(gameState) {
        this._clearContainer(this.$playerCards);
        this.$playerCards.textContent = '';
        this.renderedPlayerCards = [];
        this.$splitHands.style.display = 'flex';
        this._clearContainer(this.$splitHands);

        gameState.hands.forEach((h, i) => {
            const handDiv = this._createSplitHandElement(h, i, gameState);
            this.$splitHands.appendChild(handDiv);
        });
    }

    _createSplitHandElement(hand, index, gameState) {
        const handDiv = document.createElement('div');
        handDiv.className = 'split-hand' + (gameState.status === 'playing' && gameState.availableActions.length > 0 ? ' active' : '');

        const label = document.createElement('div');
        label.className = 'hand-label';

        const handSpan = document.createElement('span');
        handSpan.textContent = `Hand ${index + 1}`;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'hand-value';
        valueSpan.textContent = hand.value || '';

        label.appendChild(handSpan);
        label.appendChild(valueSpan);

        if (hand.result) {
            const resultSpan = document.createElement('span');
            resultSpan.className = `hand-result ${hand.result}`;
            resultSpan.textContent = hand.result.toUpperCase();
            label.appendChild(resultSpan);
        }

        const cardsRow = document.createElement('div');
        cardsRow.className = 'cards-row';
        hand.cards.forEach(c => cardsRow.appendChild(this.buildCardElement(c, false)));

        handDiv.appendChild(label);
        handDiv.appendChild(cardsRow);
        return handDiv;
    }

    renderDealerCards(gameState, isNewDeal) {
        const newDealerCards = gameState.dealer.cards;

        if (isNewDeal) {
            this.syncCards(this.$dealerCards, [], [newDealerCards[0]], 150);
            if (newDealerCards.length > 1) {
                setTimeout(() => {
                    this.syncCards(this.$dealerCards, [newDealerCards[0]], newDealerCards, 0);
                }, 450);
            }
        } else {
            this.syncCards(this.$dealerCards, this.renderedDealerCards, newDealerCards, 0);
        }

        this.renderedDealerCards = [...newDealerCards];
    }

    clearTable() {
        return new Promise(resolve => {
            const cards = document.querySelectorAll('.card');
            if (cards.length === 0) { resolve(); return; }
            cards.forEach(c => c.classList.add('card-deal-out'));
            setTimeout(() => {
                this._clearContainer(this.$dealerCards);
                this._clearContainer(this.$playerCards);
                this._clearContainer(this.$splitHands);
                this.$splitHands.style.display = 'none';
                this.renderedDealerCards = [];
                this.renderedPlayerCards = [];
                resolve();
            }, 220);
        });
    }

    _clearContainer(container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }
}

// ─── Value Display Manager (Single Responsibility) ──────────────
class ValueDisplayManager {
    constructor($dealerValue, $playerValue) {
        this.$dealerValue = $dealerValue;
        this.$playerValue = $playerValue;
    }

    updateDealerValue(dealer, isResolved) {
        this.$dealerValue.textContent = dealer.value || '';
        this.$dealerValue.className = 'hand-value';
        if (isResolved && dealer.is_blackjack) {
            this.$dealerValue.classList.add('blackjack');
        } else if (dealer.value > 21) {
            this.$dealerValue.classList.add('bust');
        }
    }

    updatePlayerValue(hand) {
        this.$playerValue.textContent = hand.value || '';
        this.$playerValue.className = 'hand-value';
        if (hand.is_blackjack) {
            this.$playerValue.classList.add('blackjack');
        } else if (hand.is_bust) {
            this.$playerValue.classList.add('bust');
        } else if (hand.value === 21) {
            this.$playerValue.classList.add('twentyone');
        }
    }

    clear() {
        this.$dealerValue.textContent = '';
        this.$playerValue.textContent = '';
    }
}

// ─── Result Handler (Cohesion & Responsibility) ────────────────
class ResultHandler {
    constructor($gameStatus, $playerCards) {
        this.$gameStatus = $gameStatus;
        this.$playerCards = $playerCards;
    }

    handle(gameState) {
        const results = gameState.getResults();
        const anyWin = results.some(r => r === 'win' || r === 'blackjack');
        const anyLose = results.some(r => r === 'lose' || r === 'bust');
        const allPush = results.every(r => r === 'push');

        const statusConfig = this._getStatusConfig(results, anyWin, anyLose, allPush, gameState.totalPayout);
        
        this.$gameStatus.textContent = statusConfig.text;
        this.$gameStatus.className = statusConfig.className;

        if (statusConfig.showCelebration) {
            showWinCelebration(gameState.totalPayout, statusConfig.isBlackjack);
        }

        this._highlightCards(gameState);
    }

    _getStatusConfig(results, anyWin, anyLose, allPush, payout) {
        if (results.includes('blackjack')) {
            return {
                text: '🎉 BLACKJACK!',
                className: 'game-status result-text blackjack-text',
                showCelebration: true,
                isBlackjack: true,
            };
        }
        if (anyWin && !anyLose) {
            return {
                text: `✅ You Win! +${payout}`,
                className: 'game-status result-text win-text',
                showCelebration: true,
                isBlackjack: false,
            };
        }
        if (!anyWin && anyLose) {
            return {
                text: '❌ Dealer Wins',
                className: 'game-status result-text lose-text',
                showCelebration: false,
            };
        }
        if (allPush) {
            return {
                text: '🤝 Push — bet returned',
                className: 'game-status result-text push-text',
                showCelebration: false,
            };
        }
        return {
            text: payout > 0 ? `🎉 +${payout} coins` : '❌ You Lose',
            className: `game-status result-text ${payout > 0 ? 'win-text' : 'lose-text'}`,
            showCelebration: payout > 0,
            isBlackjack: false,
        };
    }

    _highlightCards(gameState) {
        if (gameState.isSplit) return;

        const hand = gameState.getPrimaryHand();
        this.$playerCards.querySelectorAll('.card').forEach(c => {
            if (hand.result === 'win' || hand.result === 'blackjack') {
                c.classList.add('winning');
            } else if (hand.result === 'lose' || hand.result === 'bust') {
                c.classList.add('losing');
            }
        });
    }
}

// ─── UI Coordinator (Facade pattern) ─────────────────────────────
class UICoordinator {
    constructor(deps) {
        this.gameState = new GameState();
        this.cardRenderer = deps.cardRenderer;
        this.valueDisplay = deps.valueDisplay;
        this.resultHandler = deps.resultHandler;
        this.$betSection = deps.$betSection;
        this.$actionsSection = deps.$actionsSection;
        this.$newHandSection = deps.$newHandSection;
        this.$gameStatus = deps.$gameStatus;
    }

    async updateUI(state, isNewDeal = false) {
        this.gameState.update(state);

        if (this.gameState.balance > 0) {
            animateBalance(this.gameState.balance);
        }

        this.cardRenderer.renderDealerCards(this.gameState, isNewDeal);
        this.valueDisplay.updateDealerValue(this.gameState.dealer, this.gameState.isResolved());

        this.cardRenderer.renderPlayerCards(this.gameState, isNewDeal);
        if (!this.gameState.isSplit) {
            this.valueDisplay.updatePlayerValue(this.gameState.getPrimaryHand());
        }

        const dealAnimTime = this._calculateAnimationDelay(isNewDeal);
        this._handleGameResult(dealAnimTime);
        this._updateSectionVisibility(dealAnimTime);
        this._updateActionButtons();
    }

    _calculateAnimationDelay(isNewDeal) {
        return isNewDeal && this.gameState.isResolved() ? 800 : 0;
    }

    _handleGameResult(showDelay) {
        if (!this.gameState.isResolved()) {
            this.$gameStatus.textContent = 'Your turn';
            this.$gameStatus.className = 'game-status';
            return;
        }

        setTimeout(() => {
            this.resultHandler.handle(this.gameState);
            this._notifyPlatform();
        }, showDelay);
    }

    _notifyPlatform() {
        if (window.PlatformSDK) {
            try {
                window.PlatformSDK.gameOver(this.gameState.totalPayout, {
                    extra_data: {
                        hands: this.gameState.hands.length,
                        bet: this.gameState.initialBet,
                        won: this.gameState.totalPayout > 0,
                    },
                });
            } catch (_) { }
        }
    }

    _updateSectionVisibility(showDelay) {
        const updateVisibility = () => {
            if (this.gameState.isResolved()) {
                hideSection(this.$betSection);
                hideSection(this.$actionsSection);
                showSection(this.$newHandSection);
            } else if (this.gameState.status === 'playing') {
                hideSection(this.$betSection);
                showSection(this.$actionsSection, 'flex');
                hideSection(this.$newHandSection);
            } else {
                showSection(this.$betSection, 'flex');
                hideSection(this.$actionsSection);
                hideSection(this.$newHandSection);
            }
        };

        if (showDelay > 0) {
            setTimeout(updateVisibility, showDelay);
        } else {
            updateVisibility();
        }
    }

    _updateActionButtons() {
        if (this.gameState.status !== 'playing') return;

        this.$actionsSection.querySelectorAll('.action-btn').forEach(btn => {
            const action = btn.dataset.action;
            const isAvailable = this.gameState.availableActions.includes(action);
            btn.disabled = !isAvailable;

            if (action !== 'hit' && action !== 'stand') {
                btn.style.display = isAvailable ? '' : 'none';
            }

            if (isAvailable) {
                btn.classList.add('btn-pop');
            }
        });
    }
}

// ─── Integration function (to replace updateUI call) ────────────
let uiCoordinator;

function initializeUICoordinator() {
    const cardRenderer = new CardRenderer($dealerCards, $playerCards, $splitHands);
    const valueDisplay = new ValueDisplayManager($dealerValue, $playerValue);
    const resultHandler = new ResultHandler($gameStatus, $playerCards);

    uiCoordinator = new UICoordinator({
        cardRenderer,
        valueDisplay,
        resultHandler,
        $betSection,
        $actionsSection,
        $newHandSection,
        $gameStatus,
    });
}

function updateUI(state, isNewDeal = false) {
    if (!uiCoordinator) initializeUICoordinator();
    uiCoordinator.updateUI(state, isNewDeal);
}

// ─── API calls ─────────────────────────────────────────────────────
async function apiDeal() {
    if (busy) return;
    busy = true;
    $dealBtn.disabled = true;

    if (!userId) {
        showError('Loading... try again');
        busy = false;
        $dealBtn.disabled = false;
        return;
    }

    try {
        await clearTable();
        showChipAnimation(bet);

        const r = await fetch(`${API}/deal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, bet }),
        });

        if (!r.ok) {
            const err = await r.json().catch(() => ({ detail: 'Network error' }));
            showError(err.detail || 'Error');
            busy = false;
            $dealBtn.disabled = false;
            return;
        }

        const state = await r.json();
        if (!state) { busy = false; $dealBtn.disabled = false; return; }

        gameId = state.game_id;

        // Notify platform
        try {
            const targetOrigin = parentOrigin || (document.referrer ? new URL(document.referrer).origin : null);
            if (targetOrigin && window.parent && window.parent !== window.self) {
                window.parent.postMessage({
                    type: 'gameStarted',
                    payload: {},
                    timestamp: Date.now(),
                    protocolVersion: '1.0.0'
                }, targetOrigin);
            }
        } catch (_) { }

        updateUI(state, true);
    } catch (e) {
        console.error('Deal error:', e);
        showError('Connection error');
    } finally {
        busy = false;
        $dealBtn.disabled = false;
    }
}

async function apiAction(action) {
    if (busy || !gameId) return;
    busy = true;

    // Press animation
    const btn = $actionsSection.querySelector(`[data-action="${action}"]`);
    if (btn) {
        btn.classList.add('btn-pressed');
        setTimeout(() => btn.classList.remove('btn-pressed'), 150);
    }

    try {
        const r = await fetch(`${API}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, game_id: gameId, action }),
        });

        if (!r.ok) {
            const err = await r.json().catch(() => ({ detail: 'Action failed' }));
            showError(err.detail || 'Error');
            busy = false;
            return;
        }

        const state = await r.json();
        updateUI(state, false);

        if (state.status === 'resolved') {
            gameId = null;
        }
    } catch (e) {
        console.error('Action error:', e);
        showError('Connection error');
    } finally {
        busy = false;
    }
}

// ─── Bet Controls ──────────────────────────────────────────────────
function clampBet(v) {
    return Math.max(BET_MIN, Math.min(BET_MAX, v));
}

function addToBet(amount) {
    bet = clampBet(bet + amount);
    $betAmount.value = bet;
}

function resetBet() {
    bet = BET_MIN;
    $betAmount.value = bet;
}

// ─── Rules Toggle ──────────────────────────────────────────────────
function openRules() { $rulesOverlay.classList.add('open'); }
function closeRules() { $rulesOverlay.classList.remove('open'); }

// ─── Event Listeners ───────────────────────────────────────────────
$dealBtn.addEventListener('click', apiDeal);
$newHandBtn.addEventListener('click', () => {
    showSection($betSection, 'flex');
    hideSection($newHandSection);
    hideSection($actionsSection);
    $gameStatus.textContent = 'Place your bet';
    $gameStatus.className = 'game-status';
    $dealerValue.textContent = '';
    $playerValue.textContent = '';
});

$betReset.addEventListener('click', resetBet);

document.querySelectorAll('.bet-chip').forEach(btn => {
    btn.addEventListener('click', () => addToBet(Number.parseInt(btn.dataset.add)));
});

$actionsSection.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => apiAction(btn.dataset.action));
});

$rulesToggle.addEventListener('click', openRules);
$rulesClose.addEventListener('click', closeRules);
$rulesOverlay.addEventListener('click', (e) => {
    if (e.target === $rulesOverlay) closeRules();
});

// Keyboard shortcut for closing rules
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRules();
});

// ─── Init ──────────────────────────────────────────────────────────

initSDK();
