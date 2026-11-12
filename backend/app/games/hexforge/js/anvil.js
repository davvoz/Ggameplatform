import { play } from './audio.js';
import { formatCountdown } from './forgePanel.js';
import { icon } from './icons.js';

/**
 * The anvil, a little game played on a forge job while it works, in three screens:
 *   intro    the job, the rule shown with a live bar, the rounds left; START.
 *   play     READY… GO!, then five strikes: a glowing marker swings across the
 *            bar; tap (or Space) when it crosses the gold. Each strike a bit
 *            faster with a narrower gold zone. Perfect in the bright core, good
 *            in the wide band, else a miss. The hammer falls, sparks fly, the
 *            hot metal glows brighter with every good blow.
 *   result   stars, the time cut counted up, the job's bar shrinking, the
 *            Hourglass when one drops; Hammer again or Done.
 */

export const STRIKES = 5;
const STAR_POINTS = [3, 6, 9];        // perfect 2 points, good 1

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

/** 0 to 3 stars for a round. */
export function anvilStars(perfect, good) {
    const points = 2 * perfect + good;
    return STAR_POINTS.filter((n) => points >= n).length;
}

const ANVIL = `
<svg viewBox="0 0 160 90" aria-hidden="true">
  <ellipse cx="80" cy="86" rx="56" ry="4" fill="rgba(0,0,0,0.5)"/>
  <path d="M22 26h86c0 12 10 17 30 17v8c-16 0-24 5-30 10H70l10 19H40l10-19H40C30 61 22 48 22 26z" fill="#3a2a1e" stroke="#ffb347" stroke-width="2.5"/>
  <path d="M28 30h76" stroke="#6b4a2b" stroke-width="2"/>
</svg>`;

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function removeLater(node, ms) {
    setTimeout(() => node.remove(), ms);
}

function lightStars(row, earned) {
    [...row.children].slice(0, earned).forEach((star, i) => {
        setTimeout(() => {
            star.classList.add('on');
            play('gem');
        }, 260 * i);
    });
}

/**
 * Open the anvil over the page. `left` and `full` are the job's seconds left
 * and its whole time. Returns { score, finish }: `score` resolves to
 * { perfect, good } after five strikes (null if closed); `finish(outcome)`
 * shows the result: { cut, bonus, roundsLeft, left } from the server, or
 * { error }. `onAgain` starts another round.
 */
export function openAnvil({ title, picture = null, roundsLeft, left = 0, full = 1, onAgain = null }) {
    const root = el('div', 'anvil-game training-game');
    root.innerHTML = `
        <div class="anvil-card training-card" role="dialog" aria-label="The anvil">
            <button class="round small anvil-close" type="button" aria-label="Close"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
            <h2>The Anvil</h2>
            <p class="anvil-job"></p>
            <div class="tr-stage"></div>
        </div>`;
    document.body.append(root);
    const stage = root.querySelector('.tr-stage');
    const jobLine = root.querySelector('.anvil-job');
    const roundsText = (n) => `${title} · ${n} round${n === 1 ? '' : 's'} left`;
    jobLine.textContent = roundsText(roundsLeft);

    let resolve;
    const score = new Promise((r) => { resolve = r; });
    let closed = false;
    let stopGame = () => {};
    const results = [];

    const close = () => {
        if (closed) return;
        closed = true;
        stopGame();
        document.removeEventListener('keydown', onKey);
        root.classList.add('leaving');
        removeLater(root, 220);
        resolve(null);
    };
    let onStrikeKey = null;
    const onKey = (event) => {
        if (event.code === 'Escape') close();
        else if ((event.code === 'Space' || event.code === 'Enter') && onStrikeKey) {
            event.preventDefault();
            onStrikeKey();
        }
    };
    document.addEventListener('keydown', onKey);
    root.querySelector('.anvil-close').addEventListener('click', close);

    // ── intro ──────────────────────────────────────────────────────────
    function intro() {
        const box = el('div', 'tr-intro');
        const art = el('div', 'av-intro-art');
        if (picture) art.append(Object.assign(el('img', 'av-job-pic'), { src: picture, alt: '' }));
        const rules = el('div', 'tr-rules');
        const demo = el('div', 'tr-rule-row');
        const mini = el('span', 'av-demo');
        mini.append(el('span', 'av-demo-gold'), el('span', 'av-demo-marker'));
        demo.append(mini, el('span', '', 'Tap when the white marker crosses the gold!'));
        const strikes = el('div', 'tr-rule-row');
        strikes.append(el('span', 'tr-demo clock', String(STRIKES)), el('span', '', `${STRIKES} strikes, each a bit faster. Perfect blows cut the most time.`));
        const time = el('div', 'tr-rule-row');
        const glass = el('span', 'tr-demo clock');
        glass.append(icon('hourglass'));
        time.append(glass, el('span', '', `Up to ${Math.round(STRIKES * 2)}% of the job's time off a round, and maybe an Hourglass.`));
        rules.append(demo, strikes, time);
        const start = el('button', 'tr-start', 'START');
        start.type = 'button';
        start.addEventListener('click', () => {
            play('click');
            game();
        });
        box.append(art, rules, start);
        stage.replaceChildren(box);
        start.focus();
    }

    // ── play ───────────────────────────────────────────────────────────
    function game() {
        results.length = 0;
        stage.innerHTML = `
            <div class="av-hud">
                <span class="av-count">Strike <b>1</b>/${STRIKES}</span>
                <span class="anvil-pips"></span>
                <span class="av-streak" hidden></span>
            </div>
            <div class="av-play">
                <div class="anvil-art av-art">
                    ${ANVIL}
                    <span class="av-metal"></span>
                    <span class="anvil-hammer"></span>
                    <span class="tr-banner"></span>
                </div>
                <div class="anvil-bar"><span class="anvil-good"></span><span class="anvil-perfect"></span><span class="anvil-marker"></span></div>
                <p class="anvil-word">Tap when the glow is in the gold!</p>
                <button class="anvil-strike" type="button">STRIKE!</button>
            </div>`;
        const $ = (sel) => stage.querySelector(sel);
        const pips = $('.anvil-pips');
        for (let i = 0; i < STRIKES; i++) pips.append(el('span', 'pip'));
        const art = $('.av-art');
        const metal = $('.av-metal');
        const banner = $('.tr-banner');
        const word = $('.anvil-word');
        const streakTag = $('.av-streak');
        let n = 0;
        let streak = 0;
        let heat = 0;
        let start = 0;
        let frame = 0;
        let live = false;
        let over = false;
        stopGame = () => {
            over = true;
            onStrikeKey = null;
            cancelAnimationFrame(frame);
        };

        const showBanner = (text, cls) => {
            banner.textContent = text;
            banner.className = 'tr-banner';
            banner.getBoundingClientRect();   // restart the animation
            banner.className = `tr-banner show ${cls}`;
        };
        const layout = () => {
            const z = zones(Math.min(n, STRIKES - 1));
            $('.anvil-good').style.cssText = `left:${(0.5 - z.good) * 100}%;width:${z.good * 200}%`;
            $('.anvil-perfect').style.cssText = `left:${(0.5 - z.perfect) * 100}%;width:${z.perfect * 200}%`;
        };
        const sparks = (count, colour) => {
            for (let i = 0; i < count; i++) {
                const spark = el('span', 'tr-spark');
                const angle = Math.PI + Math.random() * Math.PI;      // upwards
                const reach = 40 + Math.random() * 50;
                spark.style.left = '50%';
                spark.style.top = '30%';
                spark.style.setProperty('--dx', `${Math.cos(angle) * reach}px`);
                spark.style.setProperty('--dy', `${Math.sin(angle) * reach}px`);
                spark.style.background = colour;
                art.append(spark);
                removeLater(spark, 520);
            }
        };
        const tick = (now) => {
            if (over) return;
            if (live) $('.anvil-marker').style.left = `${markerAt((now - start) / 1000, n) * 100}%`;
            frame = requestAnimationFrame(tick);
        };
        const strike = () => {
            if (over || !live || n >= STRIKES) return;
            const p = markerAt((performance.now() - start) / 1000, n);
            const rating = rateStrike(p, n);
            results.push(rating);
            pips.children[n].className = `pip ${rating}`;
            streak = rating === 'perfect' ? streak + 1 : 0;
            heat += { perfect: 2, good: 1, miss: 0 }[rating];
            metal.style.setProperty('--heat', String(Math.min(1, heat / 10)));
            word.textContent = { perfect: 'PERFECT!', good: 'Good', miss: 'Miss' }[rating];
            word.className = `anvil-word ${rating}`;
            word.classList.add('bump');
            play({ perfect: 'forge', good: 'place', miss: 'error' }[rating]);
            art.classList.remove('hit', 'perfect', 'miss');
            art.getBoundingClientRect();
            art.classList.add('hit', rating);
            if (rating !== 'miss') sparks(rating === 'perfect' ? 16 : 8, rating === 'perfect' ? '#fff1b0' : '#ffb347');
            streakTag.hidden = streak < 2;
            if (streak >= 2) {
                streakTag.textContent = `Perfect ×${streak}`;
                streakTag.classList.remove('bump');
                streakTag.getBoundingClientRect();
                streakTag.classList.add('bump');
            }
            n += 1;
            start = performance.now();
            if (n < STRIKES) {
                $('.av-count b').textContent = String(n + 1);
                layout();
                return;
            }
            live = false;
            onStrikeKey = null;
            $('.anvil-strike').disabled = true;
            setTimeout(() => {
                if (over) return;
                stopGame();
                showBanner('DONE!', 'time');
                play('slam');
                setTimeout(() => {
                    const perfect = results.filter((r) => r === 'perfect').length;
                    const good = results.filter((r) => r === 'good').length;
                    resolve({ perfect, good });
                    result(perfect, good);
                }, 1000);
            }, 350);
        };
        $('.av-play').addEventListener('pointerdown', (event) => {
            event.preventDefault();
            strike();
        });
        layout();
        frame = requestAnimationFrame(tick);
        showBanner('READY…', 'count');
        setTimeout(() => {
            if (over) return;
            showBanner('GO!', 'go');
            play('boost');
            live = true;
            start = performance.now();
            onStrikeKey = strike;
        }, 900);
    }

    // ── result ─────────────────────────────────────────────────────────
    let pending = null;
    let fill = null;

    function result(perfect, good) {
        if (closed) return;
        const box = el('div', 'tr-result');
        const stars = el('div', 'tr-stars');
        for (let i = 0; i < 3; i++) stars.append(el('span', 'tr-star', '★'));
        const big = el('div', 'tr-bighits av-cut');
        const cutText = el('b', '', '…');
        big.append(cutText, el('span', '', ' off'));
        const sub = el('p', 'tr-sub', `${perfect} perfect · ${good} good · ${STRIKES - perfect - good} missed`);
        const jobBox = el('div', 'tr-xpbox av-jobbox');
        const head = el('div', 'av-jobhead');
        if (picture) head.append(Object.assign(el('img', 'av-job-pic small'), { src: picture, alt: '' }));
        const label = el('small', 'tr-xplabel', `${title}: forging…`);
        head.append(label);
        const meter = el('span', 'tr-meter');
        const rest = el('span', 'av-meter-rest');
        const cutPart = el('span', 'av-meter-cut');
        meter.append(rest, cutPart);
        jobBox.append(head, meter);
        const actions = el('div', 'tr-actions');
        box.append(stars, big, sub, jobBox, actions);
        stage.replaceChildren(box);
        setTimeout(() => lightStars(stars, anvilStars(perfect, good)), 200);

        const pct = (s) => `${Math.max(0, Math.min(100, (100 * s) / full)).toFixed(1)}%`;
        rest.style.width = pct(left);
        fill = (outcome) => {
            if (outcome.error) {
                label.textContent = outcome.error;
                label.classList.add('bad');
                cutText.textContent = '—';
                actions.replaceChildren(doneButton());
                return;
            }
            const after = outcome.left;
            jobLine.textContent = roundsText(outcome.roundsLeft);
            countCut(cutText, outcome.cut);
            label.textContent = after > 0 ? `${title}: ready in ${formatCountdown(after)}` : `${title}: ready!`;
            cutPart.style.left = pct(after);
            cutPart.style.width = `calc(${pct(left)} - ${pct(after)})`;
            setTimeout(() => {
                rest.style.width = pct(after);
                cutPart.classList.add('gone');
            }, 500);
            if (outcome.bonus) {
                setTimeout(() => {
                    jobBox.append(el('p', 'tr-ready', `+1 ${outcome.bonus === 'golden_hourglass' ? 'Golden hourglass' : 'Hourglass'}!`));
                    play('levelup');
                }, 1100);
            }
            const buttons = [];
            if (onAgain && outcome.roundsLeft > 0 && after > 0) {
                const again = el('button', 'tr-start small', `Hammer again (${outcome.roundsLeft} left)`);
                again.type = 'button';
                again.addEventListener('click', () => {
                    close();
                    onAgain();
                });
                buttons.push(again);
            }
            buttons.push(doneButton());
            actions.replaceChildren(...buttons);
        };
        if (pending) fill(pending);
    }
    function countCut(node, cut) {
        if (cut <= 0) {
            node.textContent = '0:00';
            return;
        }
        const t0 = performance.now();
        const step = (now) => {
            const k = Math.min(1, (now - t0) / 900);
            node.textContent = `−${formatCountdown(cut * (1 - (1 - k) ** 3))}`;
            if (k < 1 && !closed) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        play('boost');
    }
    function doneButton() {
        const done = el('button', 'button wide-plain', 'Back to the forge');
        done.type = 'button';
        done.addEventListener('click', close);
        return done;
    }

    function finish(outcome) {
        if (closed) return;
        if (fill) fill(outcome);
        else pending = outcome;
    }

    intro();
    return { score, finish };
}
