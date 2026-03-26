/**
 * Up or Down — BTC Prediction Game v4
 * Binance WebSocket price, scrolling chart (~45s window),
 * smooth lerp dot animation, fixed win/loss detection
 */

const API_BASE = '/api/prediction-market';
const ROUND_DURATION = 300;
const BETTING_DURATION = 240;

// --- State ---
const state = {
    userId: null,
    balance: null,
    selectedDirection: 'up',
    betAmount: 10,
    currentRound: null,
    myBet: null,
    priceHistory: [],       // current round only
    displayedPrice: null,
    animFrame: null,
    isPlacingBet: false,
    roundStarted: false,
    frozenOdds: null,
    lastRoundId: null,
    // Chart animation
    chartTarget: [],        // target points for animation
    chartCurrent: [],       // currently rendered points
    chartAnimFrame: null,
    parentOrigin: null,     // validated parent origin for postMessage
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const els = {};

function cacheDom() {
    els.coinAmount = $('#coinAmount');
    els.currentPrice = $('#currentPrice');
    els.priceChange = $('.price-change');
    els.changeArrow = $('#changeArrow');
    els.changePercent = $('#changePercent');
    els.roundPhase = $('#roundPhase');
    els.roundTimer = $('#roundTimer');
    els.progressBar = $('#progressBar');
    els.lockLabel = $('#lockLabel');
    els.oddsUpValue = $('#oddsUpValue');
    els.oddsDownValue = $('#oddsDownValue');
    els.probUp = $('#probUp');
    els.probDown = $('#probDown');
    els.oddsUp = $('#oddsUp');
    els.oddsDown = $('#oddsDown');
    els.betAmount = $('#betAmount');
    els.betOdds = $('#betOdds');
    els.betPotentialWin = $('#betPotentialWin');
    els.placeBetBtn = $('#placeBetBtn');
    els.betSection = $('#betSection');
    els.activeBetSection = $('#activeBetSection');
    els.activeBetDir = $('#activeBetDir');
    els.activeBetAmount = $('#activeBetAmount');
    els.activeBetOdds = $('#activeBetOdds');
    els.activeBetWin = $('#activeBetWin');
    els.activeBetCard = $('#activeBetCard');
    els.resultBanner = $('#resultBanner');
    els.resultText = $('#resultText');
    els.lastRound = $('#lastRound');
    els.priceChart = $('#priceChart');
}

// --- Platform SDK ---
function sendGameStarted() {
    try {
        const targetOrigin = state.parentOrigin || (document.referrer ? new URL(document.referrer).origin : window.location.origin);
        window.parent.postMessage({
            type: 'gameStarted',
            payload: {},
            timestamp: Date.now(),
            protocolVersion: '1.0.0'
        }, targetOrigin);
    } catch (e) { console.error('[UoD] gameStarted fail', e); }
}

function sendGameOver(score, extraData) {
    if (!window.PlatformSDK) return;
    try {
        window.PlatformSDK.gameOver(score, { extra_data: extraData });
    } catch (e) { console.error('[UoD] gameOver fail', e); }
}

async function initPlatform() {
    if (!window.PlatformSDK) return;
    try {
        window.PlatformSDK.on('config', c => { if (c?.userId) state.userId = c.userId; });
        await window.PlatformSDK.init({ onPause(){}, onResume(){}, onExit(){} });
        if (!state.userId)
            state.userId = window.platformConfig?.userId || localStorage.getItem('platformUserId') || null;
    } catch (e) { console.error('[UoD] SDK fail', e); }

    // Listen for XP banner and level-up notifications from platform/RuntimeShell
    window.addEventListener('message', (event) => {
        try {
            const msg = event.data;
            if (!msg || !msg.type) return;
            // Validate protocol version
            if (msg.protocolVersion !== '1.0.0') return;
            // Validate and store origin from first valid message
            if (!state.parentOrigin) {
                state.parentOrigin = event.origin;
            } else if (event.origin !== state.parentOrigin) {
                console.warn('[UoD] Rejected message from unexpected origin:', event.origin);
                return;
            }
            if (msg.type === 'showXPBanner' && msg.payload) {
                showXPBanner(msg.payload.xp_earned, msg.payload);
            }
            if (msg.type === 'showLevelUpModal' && msg.payload) {
                showLevelUpModal(msg.payload);
            }
        } catch (e) { console.error('[UoD] platform msg error', e); }
    });
}

async function loadBalance() {
    if (!state.userId) return;
    try {
        const r = await fetch('/api/coins/'+state.userId+'/balance',{credentials:'include'});
        if (r.ok) { const d = await r.json(); state.balance = d.balance; updateBalanceUI(d.balance); }
    } catch {}
}
function updateBalanceUI(v) {
    if (!els.coinAmount) return;
    const prev = Number.parseInt(els.coinAmount.textContent.replace(/[^0-9-]/g, '')) || 0;
    const target = Math.round(v);
    if (prev === target) return;

    // Animate counting
    const diff = target - prev;
    const steps = Math.min(Math.abs(diff), 20);
    const duration = 400;
    const stepTime = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        const current = Math.round(prev + diff * progress);
        els.coinAmount.textContent = fmtNum(current);
        if (step >= steps) {
            clearInterval(timer);
            els.coinAmount.textContent = fmtNum(target);
        }
    }, stepTime);

    els.coinAmount.parentElement.classList.add('coin-flash');
    setTimeout(() => els.coinAmount.parentElement.classList.remove('coin-flash'), 800);
}

// --- API ---
async function fetchMyBets() {
    if (!state.userId) return null;
    try { const r = await fetch(API_BASE+'/my-bets?user_id='+state.userId,{credentials:'include'}); return r.ok ? await r.json() : null; } catch { return null; }
}
async function fetchHistory() {
    try { const r = await fetch(API_BASE+'/history?limit=1',{credentials:'include'}); return r.ok ? await r.json() : []; } catch { return []; }
}
async function fetchPriceHistory() {
    try {
        const r = await fetch(API_BASE+'/price-history?limit=300',{credentials:'include'});
        if (!r.ok) return [];
        return (await r.json()).prices || [];
    } catch { return []; }
}
async function placeBetAPI(dir, amt) {
    const r = await fetch(API_BASE+'/bet',{
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({direction:dir, amount:amt, user_id:state.userId})
    });
    if (!r.ok) { const d = await r.json().catch(()=>({})); throw new Error(d.detail||'Bet failed'); }
    return await r.json();
}
async function startRound() {
    try { await fetch(API_BASE+'/start-round',{method:'POST',credentials:'include'}); } catch {}
}

// --- Animated Price Counter ---
function animatePrice(target) {
    if (state.displayedPrice === null) {
        state.displayedPrice = target;
        els.currentPrice.textContent = '$'+fmtPrice(target);
        return;
    }
    const start = state.displayedPrice, diff = target - start;
    if (Math.abs(diff) < 0.01) return;
    const dur = 700, t0 = performance.now();
    function step(now) {
        const p = Math.min((now-t0)/dur,1), e = 1-Math.pow(1-p,3);
        state.displayedPrice = start + diff*e;
        els.currentPrice.textContent = '$'+fmtPrice(state.displayedPrice);
        if (p < 1) state.animFrame = requestAnimationFrame(step);
        else { state.displayedPrice = target; els.currentPrice.textContent = '$'+fmtPrice(target); }
    }
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    state.animFrame = requestAnimationFrame(step);
}

// --- Round UI ---
function updateRoundUI(round) {
    if (!round || !round.round_id) {
        els.roundPhase.textContent = 'WAITING';
        els.roundPhase.className = 'round-phase waiting';
        els.roundTimer.textContent = '--:--';
        els.progressBar.style.width = '0%';
        els.placeBetBtn.disabled = true;
        if (!state.roundStarted) { state.roundStarted = true; startRound(); }
        return;
    }
    state.roundStarted = true;
    const prevStatus = state.currentRound?.status;
    const prevRoundId = state.currentRound?.round_id;

    // New round? Reset chart + bet state
    if (round.round_id !== prevRoundId && prevRoundId) {
        resetForNewRound();
        state.priceHistory = [];   // <-- chart reset
    }
    state.currentRound = round;
    state.lastRoundId = round.round_id;

    // Phase badge
    els.roundPhase.textContent = round.status.toUpperCase();
    els.roundPhase.className = 'round-phase ' + round.status;

    // Timer — use Math.round for smoother display
    const secs = Math.max(0, Math.round(round.seconds_remaining || 0));
    els.roundTimer.textContent = Math.floor(secs/60)+':'+(secs%60).toString().padStart(2,'0');
    els.roundTimer.classList.toggle('urgent', secs<=30 && round.status==='locked');

    // Progress bar
    const elapsed = ROUND_DURATION - secs;
    els.progressBar.style.width = Math.min(100, elapsed/ROUND_DURATION*100)+'%';
    els.progressBar.classList.toggle('locked', round.status==='locked');

    // Price
    if (round.current_price) {
        animatePrice(round.current_price);
        state.priceHistory.push({time:Date.now(), price:round.current_price});
        if (state.priceHistory.length > 300) state.priceHistory.shift();
        requestChartDraw();
    }

    // Lock price label + change
    if (round.lock_price) {
        els.lockLabel.textContent = 'Opening: $'+fmtPrice(round.lock_price);
        if (round.current_price) {
            const ch = ((round.current_price-round.lock_price)/round.lock_price)*100;
            const up = ch >= 0;
            els.priceChange.className = 'price-change '+(up?'up':'down');
            els.changeArrow.textContent = up ? '\u25B2' : '\u25BC';
            els.changePercent.textContent = (up?'+':'')+ch.toFixed(3)+'%';
        }
    }

    // Odds (freeze when locked)
    if (round.status === 'betting' && round.odds) {
        state.frozenOdds = null;
        updateOddsUI(round.odds);
    } else if (round.status === 'locked') {
        if (!state.frozenOdds && round.odds) state.frozenOdds = round.odds;
        if (state.frozenOdds) updateOddsUI(state.frozenOdds);
    }

    // Odds card selection highlight
    updateOddsSelection();

    // Bet section
    if (round.status === 'betting' && !state.myBet) {
        els.betSection.style.display = 'block';
        els.placeBetBtn.disabled = false;
        syncBetBtnText();
    } else if (state.myBet) {
        els.betSection.style.display = 'none';
    } else if (round.status === 'locked') {
        els.betSection.style.display = 'block';
        els.placeBetBtn.disabled = true;
        els.placeBetBtn.querySelector('.btn-text').textContent = '\uD83D\uDD12 Betting Locked';
    } else {
        els.placeBetBtn.disabled = true;
    }

    // Round resolved
    if (round.status === 'resolved' && prevStatus !== 'resolved') handleResolved(round);
}

function updateOddsUI(odds) {
    els.oddsUpValue.textContent = odds.up+'x';
    els.oddsDownValue.textContent = odds.down+'x';
    els.probUp.textContent = odds.prob_up+'%';
    els.probDown.textContent = odds.prob_down+'%';
    updateBetSummary();
}

function updateOddsSelection() {
    els.oddsUp.classList.toggle('selected', state.selectedDirection === 'up');
    els.oddsDown.classList.toggle('selected', state.selectedDirection === 'down');
}

function handleResolved(round) {
    const closePrice = round.close_price != null ? round.close_price : round.current_price;
    const result = closePrice >= round.lock_price ? 'up' : 'down';
    if (state.myBet) {
        const won = state.myBet.direction === result;
        const winnings = won ? state.myBet.potential_win : 0;
        showCelebration(won, winnings, state.myBet.amount);

        // End session → triggers XP calculation in RuntimeShell
        sendGameOver(winnings, {
            bet_type: state.myBet.direction,
            bet_amount: state.myBet.amount,
            locked_odds: state.myBet.locked_odds,
            winnings: winnings,
            won: won,
            round_id: round.round_id,
            lock_price: round.lock_price,
            close_price: closePrice
        });
    }
    loadBalance();
    fetchHistory().then(renderLastRound);
}

function showCelebration(won, winnings, betAmount) {
    const chart = document.querySelector('.chart-section');
    const cls = won ? 'win-celebration' : 'lose-celebration';
    chart.classList.add(cls);
    setTimeout(() => chart.classList.remove(cls), 2500);

    if (won) {
        // Confetti
        const colors = ['#00d26a', '#00ff88', '#00b85c', '#80ffc0', '#f5a623'];
        for (let i = 0; i < 20; i++) {
            const c = document.createElement('div');
            c.className = 'confetti';
            c.style.background = colors[Math.floor(Math.random() * colors.length)];
            c.style.left = `${10 + Math.random() * 80}%`;
            c.style.top = `${20 + Math.random() * 40}%`;
            c.style.setProperty('--fall-x', `${(Math.random() - 0.5) * 120}px`);
            c.style.setProperty('--fall-y', `${60 + Math.random() * 80}px`);
            c.style.setProperty('--fall-rot', `${Math.random() * 720 - 360}deg`);
            c.style.setProperty('--fall-duration', `${0.8 + Math.random() * 0.8}s`);
            c.style.animationDelay = `${Math.random() * 0.3}s`;
            c.style.width = `${5 + Math.random() * 6}px`;
            c.style.height = `${5 + Math.random() * 6}px`;
            chart.appendChild(c);
            setTimeout(() => c.remove(), 2000);
        }

        // Payout popup
        const popup = document.createElement('div');
        popup.className = 'payout-popup';
        popup.textContent = `+${winnings} \uD83E\uDE99`;
        chart.appendChild(popup);
        setTimeout(() => popup.remove(), 1500);
    } else {
        // Lose popup
        const popup = document.createElement('div');
        popup.className = 'payout-popup lose';
        popup.textContent = 'Bet Lost!';
        chart.appendChild(popup);
        setTimeout(() => popup.remove(), 1500);
    }
}

function resetForNewRound() {
    state.myBet = null;
    state.frozenOdds = null;
    state.displayedPrice = null;
    animatedPrice = null;
    _myBetsChecked = false;
    stopDotAnim();
    els.activeBetSection.style.display = 'none';
    els.betSection.style.display = 'block';
    els.placeBetBtn.disabled = false;
    syncBetBtnText();
    els.resultBanner.classList.remove('show');
    els.lockLabel.textContent = 'Opening: --';
    els.priceChange.className = 'price-change';
    els.changeArrow.textContent = '--';
    els.changePercent.textContent = '';
}

function syncBetBtnText() {
    if (!state.isPlacingBet && state.currentRound?.status === 'betting' && !state.myBet)
        els.placeBetBtn.querySelector('.btn-text').textContent = 'Bet '+state.betAmount+' on '+state.selectedDirection.toUpperCase();
}

function updateBetSummary() {
    const odds = state.frozenOdds || state.currentRound?.odds;
    if (!odds) return;
    const sel = state.selectedDirection === 'up' ? odds.up : odds.down;
    const pot = Math.floor(state.betAmount * sel);
    els.betOdds.textContent = sel+'x';
    els.betPotentialWin.textContent = pot;
    els.placeBetBtn.classList.toggle('down-selected', state.selectedDirection==='down');
    syncBetBtnText();
}

function showActiveBet(bet) {
    state.myBet = bet;
    els.activeBetDir.textContent = bet.direction.toUpperCase();
    els.activeBetDir.style.color = bet.direction==='up' ? 'var(--green)' : 'var(--red)';
    els.activeBetAmount.textContent = bet.amount+' \uD83E\uDE99';
    els.activeBetOdds.textContent = bet.locked_odds+'x';
    els.activeBetWin.textContent = bet.potential_win+' \uD83E\uDE99';
    els.activeBetCard.classList.toggle('down-bet', bet.direction==='down');
    els.activeBetSection.style.display = 'block';
    els.betSection.style.display = 'none';
}

function renderLastRound(history) {
    if (!history || !history.length) { els.lastRound.style.display = 'none'; return; }
    const r = history[0];
    const ch = ((r.close_price - r.lock_price) / r.lock_price) * 100;
    const up = ch >= 0;
    els.lastRound.style.display = 'flex';
    els.lastRound.innerHTML =
        '<span class="lr-label">Last:</span>'
        + '<span class="lr-badge '+ r.result +'">'+ r.result.toUpperCase() +'</span>'
        + '<span class="lr-change '+ (up?'up':'down') +'">'+ (up?'+':'') + ch.toFixed(2) +'%</span>';
}

// --- Chart (scrolling window + continuous dot animation) ---
const CHART_WINDOW_SEC = 45; // show last ~45 seconds of data
let animatedPrice = null;    // lerped Y price for smooth vertical movement
let dotAnimRAF = null;
let lastDataTime = 0;        // timestamp of last data point (ms)

function requestChartDraw() {
    // Kick off continuous animation loop if not already running
    if (!dotAnimRAF) dotAnimLoop();
}

function stopDotAnim() {
    if (dotAnimRAF) { cancelAnimationFrame(dotAnimRAF); dotAnimRAF = null; }
}

function dotAnimLoop() {
    const data = state.priceHistory;
    if (data.length < 2) { dotAnimRAF = null; return; }

    const targetPrice = data[data.length - 1].price;
    if (animatedPrice === null) animatedPrice = targetPrice;
    // Smooth vertical lerp
    animatedPrice += (targetPrice - animatedPrice) * 0.12;
    if (Math.abs(targetPrice - animatedPrice) < 0.005) animatedPrice = targetPrice;

    lastDataTime = data[data.length - 1].time;
    drawChart();

    // Always keep looping while round is active (dot moves with time)
    const status = state.currentRound?.status;
    if (status === 'betting' || status === 'locked') {
        dotAnimRAF = requestAnimationFrame(dotAnimLoop);
    } else {
        dotAnimRAF = null;
    }
}

function drawChart() {
    const canvas = els.priceChart;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = rect.width, H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0,0,W,H);

    const allData = state.priceHistory;
    if (allData.length < 2) return;

    // Time-based window: show last CHART_WINDOW_SEC seconds
    const now = Date.now();
    const windowStart = now - CHART_WINDOW_SEC * 1000;
    // Filter data within window (keep at least 2 points)
    let data = allData.filter(d => d.time >= windowStart);
    if (data.length < 2) data = allData.slice(-2);

    const prices = data.map(d => d.price);
    const times  = data.map(d => d.time);
    const lockPrice = state.currentRound?.lock_price;

    // The dot's current animated price
    const dotPrice = animatedPrice ?? prices[prices.length - 1];

    // Y range (include lock + dot)
    let minP = Math.min(...prices, dotPrice), maxP = Math.max(...prices, dotPrice);
    if (lockPrice) { minP = Math.min(minP,lockPrice); maxP = Math.max(maxP,lockPrice); }
    const range = maxP - minP || 1;
    minP -= range * 0.12; maxP += range * 0.12;

    // X range: windowStart → now (dot reaches right edge at "now")
    const tMin = windowStart;
    const tMax = now;
    const tRange = tMax - tMin || 1;

    const pad = {top:6, bottom:6, left:0, right:2};
    const cW = W - pad.left - pad.right, cH = H - pad.top - pad.bottom;
    const toX = t => pad.left + ((t - tMin) / tRange) * cW;
    const toY = p => pad.top + (1 - (p - minP) / (maxP - minP)) * cH;

    // Lock dashed line
    if (lockPrice) {
        const ly = toY(lockPrice);
        ctx.strokeStyle = 'rgba(136,136,160,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.moveTo(0,ly); ctx.lineTo(W,ly); ctx.stroke();
        ctx.setLineDash([]);
        const ll = document.getElementById('lockLine');
        if (ll) ll.style.top = (ly+12)+'px';
    }

    const last = prices[prices.length - 1];
    const isUp = !lockPrice || last >= lockPrice;
    const col = isUp ? '#00d26a' : '#ff4757';

    // Build point array: all data except last raw point, then extend to animated dot
    // This prevents the line from jumping ahead of the smooth dot
    const basePts = data.length > 2
        ? data.slice(0, -1).map(d => ({x: toX(d.time), y: toY(d.price)}))
        : data.map(d => ({x: toX(d.time), y: toY(d.price)}));
    // Dot position: X = now (right edge), Y = animated price
    const dotX = toX(now);
    const dotY = toY(dotPrice);
    const ptsWithDot = [...basePts, {x: dotX, y: dotY}];

    // Gradient fill
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, isUp ? 'rgba(0,210,106,0.15)' : 'rgba(255,71,87,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    drawSmooth(ctx, ptsWithDot);
    ctx.lineTo(ptsWithDot[ptsWithDot.length-1].x, H);
    ctx.lineTo(ptsWithDot[0].x, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    drawSmooth(ctx, ptsWithDot);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow
    ctx.beginPath(); ctx.arc(dotX, dotY, 6, 0, Math.PI*2);
    ctx.fillStyle = isUp ? 'rgba(0,210,106,0.2)' : 'rgba(255,71,87,0.2)';
    ctx.fill();
    // Dot
    ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI*2);
    ctx.fillStyle = col; ctx.fill();
}

function drawSmooth(ctx, pts) {
    if (pts.length < 2) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2) { ctx.lineTo(pts[1].x, pts[1].y); return; }
    for (let i = 0; i < pts.length-1; i++) {
        const p0 = pts[Math.max(i-1,0)];
        const p1 = pts[i];
        const p2 = pts[i+1];
        const p3 = pts[Math.min(i+2, pts.length-1)];
        ctx.bezierCurveTo(
            p1.x+(p2.x-p0.x)/6, p1.y+(p2.y-p0.y)/6,
            p2.x-(p3.x-p1.x)/6, p2.y-(p3.y-p1.y)/6,
            p2.x, p2.y
        );
    }
}

// --- Helpers ---
function fmtPrice(p) { return p ? p.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '--'; }
function fmtNum(n) { return (n===null||n===undefined) ? '--' : n.toLocaleString('en-US'); }
function showToast(msg, type) {
    const ex = document.querySelector('.toast');
    if (ex) ex.remove();
    const t = document.createElement('div');
    t.className = 'toast '+(type||'');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(),300); }, 3000);
}

// --- Events ---
function selectDirection(dir) {
    state.selectedDirection = dir;
    updateOddsSelection();
    updateBetSummary();
}

function setupEvents() {
    // Rules overlay
    $('#rulesToggle').addEventListener('click', () => $('#rulesOverlay').classList.add('open'));
    $('#rulesClose').addEventListener('click', () => $('#rulesOverlay').classList.remove('open'));
    $('#rulesOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
    });

    // Clickable odds cards for direction
    els.oddsUp.addEventListener('click', () => selectDirection('up'));
    els.oddsDown.addEventListener('click', () => selectDirection('down'));

    // Bet amount
    $('#betDecrease').addEventListener('click', () => {
        state.betAmount = Math.max(1, state.betAmount<=10 ? state.betAmount-1 : state.betAmount-5);
        els.betAmount.value = state.betAmount; updateBetSummary();
    });
    $('#betIncrease').addEventListener('click', () => {
        state.betAmount = Math.min(500, state.betAmount<10 ? state.betAmount+1 : state.betAmount+5);
        els.betAmount.value = state.betAmount; updateBetSummary();
    });
    $$('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.betAmount = Math.min(500, Math.max(1, Number.parseInt(btn.dataset.amount)));
            els.betAmount.value = state.betAmount; updateBetSummary();
        });
    });

    // Place bet
    els.placeBetBtn.addEventListener('click', async () => {
        if (state.isPlacingBet) return;
        if (!state.userId) return showToast('Please log in','error');
        if (state.balance!==null && state.betAmount>state.balance) return showToast('Insufficient balance','error');
        state.isPlacingBet = true;
        els.placeBetBtn.disabled = true;
        els.placeBetBtn.querySelector('.btn-text').textContent = 'Placing...';
        try {
            const res = await placeBetAPI(state.selectedDirection, state.betAmount);
            showActiveBet(res);
            showToast('Bet placed! '+res.direction.toUpperCase()+' at '+res.locked_odds+'x','success');
            // Start new session for this bet → RuntimeShell tracks for XP
            sendGameStarted();
            loadBalance();
        } catch(e) {
            showToast(e.message,'error');
            els.placeBetBtn.disabled = false;
        } finally {
            state.isPlacingBet = false;
            updateBetSummary();
        }
    });
}

// --- SSE (replaces polling) ---
let _myBetsChecked = false;
let _evtSource = null;

function connectSSE() {
    if (_evtSource) _evtSource.close();
    _evtSource = new EventSource(API_BASE + '/stream');

    _evtSource.onmessage = async (ev) => {
        try {
            const round = JSON.parse(ev.data);
            if (round.error) return;  // skip error frames

            // Reset my-bets flag on new round
            if (round.round_id !== state.lastRoundId) _myBetsChecked = false;

            updateRoundUI(round);

            // Check /my-bets once per round (recover after page reload)
            if (!state.myBet && !_myBetsChecked && round.status !== 'waiting') {
                _myBetsChecked = true;
                const bd = await fetchMyBets();
                if (bd?.bets?.length > 0) showActiveBet(bd.bets[0]);
            }
        } catch (e) { console.error('[SSE] parse error', e); }
    };

    _evtSource.onerror = () => {
        // EventSource auto-reconnects; just log
        console.warn('[SSE] connection lost, reconnecting...');
    };
}

// --- Init ---
async function init() {
    cacheDom();
    setupEvents();
    await initPlatform();
    await loadBalance();

    // Pre-fill chart for current round only (backend keeps history)
    const ph = await fetchPriceHistory();
    if (ph.length) {
        state.priceHistory = ph.map(h => ({time:h.timestamp*1000, price:h.price}));
        animatedPrice = state.priceHistory[state.priceHistory.length - 1].price;
        requestChartDraw();
    }

    connectSSE();
    fetchHistory().then(renderLastRound);
}

document.addEventListener('DOMContentLoaded', init);

// --- XP Banner & Level-Up UI ---
function showXPBanner(xpAmount, payload) {
    // Inject styles once
    if (!document.querySelector('#updown-xp-styles')) {
        const s = document.createElement('style');
        s.id = 'updown-xp-styles';
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

    // Inject level-up stylesheet once
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
