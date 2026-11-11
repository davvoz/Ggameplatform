import { play } from './audio.js';

/**
 * The anvil: a little game played on a forge job while it works. A glowing
 * marker swings across the bar; tap (or press Space) when it crosses the
 * gold in the middle. Five strikes, each a bit faster with a narrower gold
 * zone. Perfect in the bright core, good in the wide band, else a miss.
 */

export const STRIKES = 5;

/** How a strike at position `p` (0..1) rates with zone half-widths for strike `n`. */
export function rateStrike(p, n) {
    const { perfect, good } = zones(n);
    const off = Math.abs(p - 0.5);
    if (off <= perfect) return 'perfect';
    if (off <= good) return 'good';
    return 'miss';
}

export function zones(n) {
    return { perfect: 0.065 - 0.007 * n, good: 0.17 - 0.012 * n };
}

/** Where the marker is at `t` seconds into strike `n`: a ping-pong 0..1, faster each strike. */
export function markerAt(t, n) {
    const cycles = t * (0.75 + 0.18 * n);
    const f = cycles % 1;
    return f < 0.5 ? f * 2 : 2 - f * 2;
}

/**
 * Open the anvil over the page. Returns { score, finish }: `score` resolves
 * to { perfect, good } after five strikes (or null if closed early);
 * `finish(line)` shows the outcome for a moment and closes.
 */
export function openAnvil({ title, roundsLeft }) {
    const root = document.createElement('div');
    root.className = 'anvil-game';
    root.innerHTML = `
        <div class="anvil-card" role="dialog" aria-label="The anvil">
            <button class="round small anvil-close" type="button" aria-label="Close"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
            <h2>The Anvil</h2>
            <p class="anvil-job"></p>
            <div class="anvil-art" aria-hidden="true">
                <svg viewBox="0 0 120 70"><path d="M18 22h64c0 10 8 14 22 14v6c-12 0-18 4-22 8H54l8 14H30l8-14H30C22 50 18 40 18 22z" fill="#3a2a1e" stroke="#ffb347" stroke-width="2"/></svg>
                <span class="anvil-hammer"></span>
                <span class="anvil-sparks"></span>
            </div>
            <div class="anvil-bar"><span class="anvil-good"></span><span class="anvil-perfect"></span><span class="anvil-marker"></span></div>
            <p class="anvil-word">Tap when the glow is in the gold!</p>
            <div class="anvil-pips"></div>
            <div class="anvil-strike" role="button" tabindex="0">STRIKE!</div>
        </div>`;
    document.body.append(root);
    const $ = (sel) => root.querySelector(sel);
    $('.anvil-job').textContent = `${title} · ${roundsLeft} round${roundsLeft === 1 ? '' : 's'} left`;
    const pips = $('.anvil-pips');
    for (let i = 0; i < STRIKES; i++) pips.append(Object.assign(document.createElement('span'), { className: 'pip' }));

    let n = 0;
    let start = performance.now();
    let frame = 0;
    let done = false;
    let resolve;
    const results = [];
    const score = new Promise((r) => { resolve = r; });

    const layout = () => {
        const z = zones(Math.min(n, STRIKES - 1));
        $('.anvil-good').style.cssText = `left:${(0.5 - z.good) * 100}%;width:${z.good * 200}%`;
        $('.anvil-perfect').style.cssText = `left:${(0.5 - z.perfect) * 100}%;width:${z.perfect * 200}%`;
    };
    const tick = (now) => {
        if (done) return;
        $('.anvil-marker').style.left = `${markerAt((now - start) / 1000, n) * 100}%`;
        frame = requestAnimationFrame(tick);
    };
    const close = (value) => {
        if (done) return;
        done = true;
        cancelAnimationFrame(frame);
        resolve(value);
    };
    const strike = () => {
        if (done || n >= STRIKES) return;
        const p = markerAt((performance.now() - start) / 1000, n);
        const rating = rateStrike(p, n);
        results.push(rating);
        pips.children[n].className = `pip ${rating}`;
        const word = $('.anvil-word');
        word.textContent = { perfect: 'PERFECT!', good: 'Good', miss: 'Miss' }[rating];
        word.className = `anvil-word ${rating}`;
        play({ perfect: 'forge', good: 'place', miss: 'error' }[rating]);
        const art = $('.anvil-art');
        art.classList.remove('hit', 'perfect');
        void art.offsetWidth;
        art.classList.add('hit');
        if (rating === 'perfect') art.classList.add('perfect');
        n += 1;
        start = performance.now();
        layout();
        if (n === STRIKES) {
            cancelAnimationFrame(frame);
            $('.anvil-strike').textContent = '…';
            setTimeout(() => close({
                perfect: results.filter((r) => r === 'perfect').length,
                good: results.filter((r) => r === 'good').length,
            }), 500);
        }
    };
    root.addEventListener('pointerdown', (event) => {
        if (event.target.closest('.anvil-close')) return;
        event.preventDefault();
        strike();
    });
    const onKey = (event) => {
        if (event.code === 'Space' || event.code === 'Enter') {
            event.preventDefault();
            strike();
        } else if (event.code === 'Escape') {
            finish(null);
        }
    };
    document.addEventListener('keydown', onKey);
    $('.anvil-close').addEventListener('click', () => finish(null));
    layout();
    frame = requestAnimationFrame(tick);

    function finish(line) {
        close(null);
        document.removeEventListener('keydown', onKey);
        if (!line) {
            root.remove();
            return;
        }
        $('.anvil-word').textContent = line;
        $('.anvil-word').className = 'anvil-word anvil-done';
        $('.anvil-strike').textContent = 'Back to the forge';
        setTimeout(() => root.remove(), 1600);
        // on 'click', not 'pointerdown': the tap ends on the anvil and does not land on what is under it
        root.addEventListener('click', () => root.remove(), { once: true });
    }
    return { score, finish };
}
