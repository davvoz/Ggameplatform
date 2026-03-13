/**
 * Blackjack v2 — Smooth incremental UI, animations, PlatformSDK
 */

// ─── Config ────────────────────────────────────────────────────────
const API = '/api/blackjack';
const SUIT_SYMBOL = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLOR  = { hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black' };
const BET_CHIPS = [5, 10, 50];
const BET_MIN = 5;
const BET_MAX = 5000;

// ─── State ─────────────────────────────────────────────────────────
let userId = null;
let gameId = null;
let balance = 0;
let bet = 10;
let busy = false;

// Track rendered cards so we only add new ones
let renderedDealerCards = [];
let renderedPlayerCards = [];
let dealerRevealed = false;

// ─── DOM Refs ──────────────────────────────────────────────────────
const $coinAmount     = document.getElementById('coinAmount');
const $dealerCards    = document.getElementById('dealerCards');
const $playerCards    = document.getElementById('playerCards');
const $dealerValue    = document.getElementById('dealerValue');
const $playerValue    = document.getElementById('playerValue');
const $gameStatus     = document.getElementById('gameStatus');
const $betSection     = document.getElementById('betSection');
const $actionsSection = document.getElementById('actionsSection');
const $newHandSection = document.getElementById('newHandSection');
const $betAmount      = document.getElementById('betAmount');
const $splitHands     = document.getElementById('splitHands');
const $dealBtn        = document.getElementById('dealBtn');
const $newHandBtn     = document.getElementById('newHandBtn');
const $betReset       = document.getElementById('betReset');
const $rulesOverlay   = document.getElementById('rulesOverlay');
const $rulesToggle    = document.getElementById('rulesToggle');
const $rulesClose     = document.getElementById('rulesClose');

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
            onPause() {},
            onResume() {},
            onExit() {},
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
    } catch (_) {}
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
        el.innerHTML = `
            <div class="card-corner">${card.rank}<br>${sym}</div>
            <span class="card-rank">${card.rank}</span>
            <span class="card-suit">${sym}</span>
            <div class="card-corner-br">${card.rank}<br>${sym}</div>`;
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
            $dealerCards.innerHTML = '';
            $playerCards.innerHTML = '';
            $splitHands.innerHTML = '';
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
    el.offsetHeight; // force reflow
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
    banner.innerHTML = `<div class="game-xp-badge"><span class="game-xp-icon">⭐</span><span class="game-xp-amount">+${Number(xpAmount).toFixed(2)} XP</span></div>`;
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
    modal.innerHTML = `
        <div class="level-up-content ${is_milestone ? 'milestone' : ''}">
            <div class="level-up-animation"><div class="level-up-rays"></div>
                <div class="level-up-badge-container"><span class="level-up-badge">${badge || '🏅'}</span></div>
            </div>
            <h2 class="level-up-title">🎉 LEVEL UP! 🎉</h2>
            <div class="level-up-levels">
                <span class="old-level">${old_level ?? '-'}</span>
                <span class="level-arrow">→</span>
                <span class="new-level">${new_level ?? '-'}</span>
            </div>
            <div class="level-up-new-title">${title}</div>
            ${is_milestone ? '<div class="level-up-milestone-badge">✨ MILESTONE ✨</div>' : ''}
            ${!isAnonymous && coins_awarded > 0 ? `<div class="level-up-reward"><span class="reward-icon">🪙</span><span class="reward-amount">+${coins_awarded} Coins</span></div>` : ''}
            <button class="level-up-close">Continue</button>
        </div>`;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    modal.querySelector('.level-up-close')?.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
    setTimeout(() => { if (modal.parentElement) { modal.classList.remove('show'); setTimeout(() => modal.remove(), 300); } }, 6000);
}

// ─── Update UI from game state ─────────────────────────────────────
function updateUI(state, isNewDeal = false) {
    const { dealer, hands, status, available_actions, total_payout, initial_bet } = state;
    const resolved = status === 'resolved';
    const isSplit = hands.length > 1;
    const hand = hands[0];

    // ── Update balance
    if (state.balance != null) {
        animateBalance(state.balance);
    }

    // ── Dealer cards (incremental sync)
    const newDealerCards = dealer.cards;
    let dealAnimTime = 0;
    if (isNewDeal) {
        // Stagger: P1(0ms) → D1(150ms) → P2(300ms) → D2(450ms)
        syncCards($dealerCards, [], [newDealerCards[0]], 150);
        if (newDealerCards.length > 1) {
            setTimeout(() => {
                syncCards($dealerCards, [newDealerCards[0]], newDealerCards, 0);
            }, 450);
        }
        renderedDealerCards = [...newDealerCards];
        dealAnimTime = 800; // 450ms delay + 350ms animation
    } else {
        const prevLen = renderedDealerCards.length;
        syncCards($dealerCards, renderedDealerCards, newDealerCards, 0);
        renderedDealerCards = [...newDealerCards];
        dealAnimTime = newDealerCards.length > prevLen ? 400 : 0;
    }

    // ── Dealer value
    $dealerValue.textContent = dealer.value || '';
    $dealerValue.className = 'hand-value';
    if (resolved && dealer.is_blackjack) $dealerValue.classList.add('blackjack');
    else if (dealer.value > 21) $dealerValue.classList.add('bust');

    // ── Player cards (no split)
    if (!isSplit) {
        $splitHands.style.display = 'none';
        const newPlayerCards = hand.cards;
        if (isNewDeal) {
            syncCards($playerCards, [], [newPlayerCards[0]], 0);
            if (newPlayerCards.length > 1) {
                setTimeout(() => {
                    syncCards($playerCards, [newPlayerCards[0]], newPlayerCards, 0);
                }, 300);
            }
            renderedPlayerCards = [...newPlayerCards];
        } else {
            syncCards($playerCards, renderedPlayerCards, newPlayerCards, 0);
            renderedPlayerCards = [...newPlayerCards];
        }

        // Player value
        $playerValue.textContent = hand.value || '';
        $playerValue.className = 'hand-value';
        if (hand.is_blackjack) $playerValue.classList.add('blackjack');
        else if (hand.is_bust) $playerValue.classList.add('bust');
        else if (hand.value === 21) $playerValue.classList.add('twentyone');
    } else {
        // ── Split hands
        $playerCards.innerHTML = '';
        $playerValue.textContent = '';
        renderedPlayerCards = [];
        $splitHands.style.display = 'flex';
        $splitHands.innerHTML = '';

        hands.forEach((h, i) => {
            const handDiv = document.createElement('div');
            handDiv.className = 'split-hand' + (state.active_hand_index === i ? ' active' : '');

            const label = document.createElement('div');
            label.className = 'hand-label';
            let labelText = `Hand ${i + 1}`;
            let valueSpan = `<span class="hand-value">${h.value || ''}</span>`;
            if (h.result) {
                valueSpan += `<span class="hand-result ${h.result}">${h.result.toUpperCase()}</span>`;
            }
            label.innerHTML = `<span>${labelText}</span><span>${valueSpan}</span>`;

            const cardsRow = document.createElement('div');
            cardsRow.className = 'cards-row';
            h.cards.forEach(c => cardsRow.appendChild(buildCardEl(c, false)));

            handDiv.appendChild(label);
            handDiv.appendChild(cardsRow);
            $splitHands.appendChild(handDiv);
        });
    }

    // ── Game status + result (delayed for deal animations)
    const showDelay = isNewDeal && resolved ? dealAnimTime : 0;

    if (resolved) {
        setTimeout(() => {
            const results = hands.map(h => h.result);
            const anyWin = results.some(r => r === 'win' || r === 'blackjack');
            const anyLose = results.some(r => r === 'lose' || r === 'bust');
            const allPush = results.every(r => r === 'push');

            if (results.includes('blackjack')) {
                $gameStatus.textContent = '🎉 BLACKJACK!';
                $gameStatus.className = 'game-status result-text blackjack-text';
                showWinCelebration(total_payout, true);
            } else if (anyWin && !anyLose) {
                $gameStatus.textContent = `✅ You Win! +${total_payout}`;
                $gameStatus.className = 'game-status result-text win-text';
                showWinCelebration(total_payout, false);
            } else if (!anyWin && anyLose) {
                $gameStatus.textContent = '❌ Dealer Wins';
                $gameStatus.className = 'game-status result-text lose-text';
            } else if (allPush) {
                $gameStatus.textContent = '🤝 Push — bet returned';
                $gameStatus.className = 'game-status result-text push-text';
            } else {
                $gameStatus.textContent = total_payout > 0 ? `🎉 +${total_payout} coins` : '❌ You Lose';
                $gameStatus.className = 'game-status result-text ' + (total_payout > 0 ? 'win-text' : 'lose-text');
                if (total_payout > 0) showWinCelebration(total_payout, false);
            }

            // Highlight cards
            if (!isSplit) {
                $playerCards.querySelectorAll('.card').forEach(c => {
                    if (hand.result === 'win' || hand.result === 'blackjack') c.classList.add('winning');
                    else if (hand.result === 'lose' || hand.result === 'bust') c.classList.add('losing');
                });
            }

            // Send gameOver to platform
            if (window.PlatformSDK) {
                try {
                    window.PlatformSDK.gameOver(total_payout, {
                        extra_data: { hands: hands.length, bet: initial_bet, won: total_payout > 0 },
                    });
                } catch (_) {}
            }
        }, showDelay);
    } else {
        $gameStatus.textContent = 'Your turn';
        $gameStatus.className = 'game-status';
    }

    // ── Toggle sections visibility
    const showSectionsDelay = isNewDeal && resolved ? dealAnimTime : 0;
    if (resolved) {
        hideSection($betSection);
        hideSection($actionsSection);
        setTimeout(() => {
            showSection($newHandSection);
        }, showSectionsDelay);
    } else if (status === 'playing') {
        hideSection($betSection);
        showSection($actionsSection, 'flex');
        hideSection($newHandSection);
    } else {
        showSection($betSection, 'flex');
        hideSection($actionsSection);
        hideSection($newHandSection);
    }

    // ── Enable/disable action buttons dynamically
    if (status === 'playing') {
        $actionsSection.querySelectorAll('.action-btn').forEach(btn => {
            const action = btn.dataset.action;
            const avail = available_actions.includes(action);
            btn.disabled = !avail;
            // hit & stand always visible; others shown only when available
            if (action !== 'hit' && action !== 'stand') {
                btn.style.display = avail ? '' : 'none';
            }
            if (avail) btn.classList.add('btn-pop');
        });
    }
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
            window.parent.postMessage({
                type: 'gameStarted',
                payload: {},
                timestamp: Date.now(),
                protocolVersion: '1.0.0'
            }, '*');
        } catch (_) {}

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
    btn.addEventListener('click', () => addToBet(parseInt(btn.dataset.add)));
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
