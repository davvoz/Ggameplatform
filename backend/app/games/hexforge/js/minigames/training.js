import { play } from '../fx/audio.js';
import { heroPortrait } from '../render/thumbs.js';

/**
 * The training dummy, in three screens:
 *   intro    the hero, the rule shown with live targets, what is at stake; START.
 *   play     3-2-1, then fifteen seconds to tap the green targets that light up
 *            on a wooden dummy before they fade; a red one (the dummy's club)
 *            costs a hit. Targets come faster as time runs out, and fade
 *            faster for evolved heroes. Hits burst, combos grow, the last
 *            seconds pulse, and "TIME!" ends it.
 *   result   stars, the hits counted up, the hero's XP bar filling, "Ready to
 *            evolve!" when it is; Train again or Done.
 *
 * The server counts a session as ten beats, perfect (whole) or good (half):
 * GOAL hits make the full ten, so two hits are a perfect beat and one a good one.
 */

export const SECONDS = 15;
export const GOAL = 20;            // hits for the full XP
const STAR_HITS = [6, 12, 18];
const COUNTDOWN = 3;
const RED_SHARE = 0.2;
const HURRY = 3;                   // the last seconds pulse

/** Hits as the server's score: two hits a perfect beat, an odd one a good beat, ten beats at most. */
export function hitsToScore(hits) {
    const h = Math.max(0, Math.min(GOAL, hits));
    return { perfect: Math.floor(h / 2), good: h % 2 };
}

/** The XP a number of hits is worth, as the server counts it. */
export function sessionXp(maxXp, hits) {
    const { perfect, good } = hitsToScore(hits);
    return Math.round((maxXp * (perfect + 0.5 * good)) / 10);
}

/** 0 to 3 stars for a session. */
export function starsFor(hits) {
    return STAR_HITS.filter((n) => hits >= n).length;
}

/** Seconds a target stays lit, `t` seconds into the session, for a hero of `tier`. */
export function targetLife(t, tier = 1) {
    return Math.max(0.65, 1.35 - 0.025 * t - 0.12 * (tier - 1));
}

/** Seconds until the next target, `t` seconds into the session. */
export function spawnGap(t) {
    return Math.max(0.38, 0.62 - 0.016 * t);
}

const DUMMY = `
<svg viewBox="0 0 100 130" aria-hidden="true">
  <ellipse cx="50" cy="127" rx="30" ry="4" fill="rgba(0,0,0,0.45)"/>
  <rect x="45" y="70" width="10" height="56" rx="2" fill="#5a3a22"/>
  <rect x="30" y="122" width="40" height="6" rx="3" fill="#3a2414"/>
  <rect x="64" y="40" width="30" height="8" rx="4" fill="#7a5130"/><circle cx="92" cy="44" r="7" fill="#8a5a34"/>
  <rect x="4" y="34" width="22" height="34" rx="6" fill="#5b5f66" stroke="#2a2c30" stroke-width="2"/>
  <rect x="30" y="34" width="40" height="44" rx="12" fill="#a0723f" stroke="#5a3a22" stroke-width="3"/>
  <path d="M36 48h28M36 60h28" stroke="#7a5130" stroke-width="2"/>
  <circle cx="50" cy="20" r="14" fill="#b38149" stroke="#5a3a22" stroke-width="3"/>
  <path d="M40 22h20" stroke="#5a3a22" stroke-width="3" stroke-linecap="round"/>
</svg>`;

/** Remove a node after `ms`. */
function removeLater(node, ms) {
    setTimeout(() => node.remove(), ms);
}

/** Light the first `earned` stars of the row one after the other. */
function lightStars(row, earned) {
    [...row.children].slice(0, earned).forEach((star, i) => {
        setTimeout(() => {
            star.classList.add('on');
            play('gem');
        }, 260 * i);
    });
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/**
 * Open the training over the page. `xp` and `need` are where the hero's bar is
 * now and where it ends (its XP and the next tier's, or the mastery points
 * inside the level and a level's worth); `unit` names what it earns ('XP' or
 * 'mastery'). Returns { score, finish }: `score` resolves to
 * { perfect, good, hits } when the time is up (null if closed); `finish(outcome)`
 * shows the result screen: { xp, ready, sessionsLeft } from the server, or
 * { error } when it did not answer. `onAgain` starts another session.
 */
export function openTraining({ hero, name, left, maxXp, xp, need, unit = 'XP', onAgain = null }) {
    const tier = hero.tier ?? 1;
    const root = el('div', 'anvil-game training-game');
    root.innerHTML = `
        <div class="anvil-card training-card" role="dialog" aria-label="Training">
            <button class="round small anvil-close" type="button" aria-label="Close"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
            <h2>Training</h2>
            <p class="anvil-job"></p>
            <div class="tr-stage"></div>
        </div>`;
    document.body.append(root);
    const card = root.querySelector('.training-card');
    const stage = root.querySelector('.tr-stage');
    root.querySelector('.anvil-job').textContent = `${name} · ${left} session${left === 1 ? '' : 's'} left today`;

    let resolve;
    const score = new Promise((r) => { resolve = r; });
    let closed = false;
    let stopGame = () => {};
    let hits = 0;
    let missed = 0;
    let reds = 0;
    let best = 0;

    const close = () => {
        if (closed) return;
        closed = true;
        stopGame();
        document.removeEventListener('keydown', onKey);
        root.classList.add('leaving');
        setTimeout(() => root.remove(), 220);
        resolve(null);
    };
    const onKey = (event) => {
        if (event.code === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    root.querySelector('.anvil-close').addEventListener('click', close);

    // ── intro ──────────────────────────────────────────────────────────
    function intro() {
        const box = el('div', 'tr-intro');
        const portrait = el('div', 'tr-intro-hero');
        portrait.append(Object.assign(el('img'), { src: heroPortrait(hero, 96), alt: '' }));
        const rules = el('div', 'tr-rules');
        const green = el('div', 'tr-rule-row');
        green.append(el('span', 'tr-demo green'), el('span', '', 'Tap the green targets on the dummy, fast!'));
        const red = el('div', 'tr-rule-row');
        red.append(el('span', 'tr-demo red'), el('span', '', 'Never the red ones: they cost a hit.'));
        const time = el('div', 'tr-rule-row');
        time.append(el('span', 'tr-demo clock', '15'), el('span', '', `15 seconds. ${GOAL} hits give the full +${maxXp} ${unit}.`));
        rules.append(green, red, time);
        const start = el('button', 'tr-start', 'START');
        start.type = 'button';
        start.addEventListener('click', () => {
            play('click');
            game();
        });
        box.append(portrait, rules, start);
        stage.replaceChildren(box);
        start.focus();
    }

    // ── play ───────────────────────────────────────────────────────────
    function game() {
        hits = 0;
        missed = 0;
        reds = 0;
        best = 0;
        let combo = 0;
        stage.innerHTML = `
            <div class="tr-hud">
                <span class="tr-clock">15</span>
                <div class="tr-time"><span></span></div>
                <span class="tr-tally"><b class="tr-hits">0</b> hits</span>
            </div>
            <div class="tr-board">
                <span class="tr-dummy">${DUMMY}</span>
                <span class="tr-hero"></span>
                <span class="tr-combo" hidden></span>
                <span class="tr-banner"></span>
            </div>
            <p class="tr-xpline">+0 ${unit}</p>`;
        const $ = (sel) => stage.querySelector(sel);
        $('.tr-hero').append(Object.assign(el('img'), { src: heroPortrait(hero, 96), alt: '' }));
        const board = $('.tr-board');
        const bar = $('.tr-time > span');
        const clock = $('.tr-clock');
        const banner = $('.tr-banner');
        const comboTag = $('.tr-combo');
        let started = performance.now();
        let counting = true;
        let lastCount = 0;
        let nextSpawn = 0;
        let frame = 0;
        let over = false;
        stopGame = () => {
            over = true;
            cancelAnimationFrame(frame);
        };

        const showBanner = (text, cls) => {
            banner.textContent = text;
            banner.className = 'tr-banner';
            banner.getBoundingClientRect();   // restart the animation for every number
            banner.className = `tr-banner show ${cls}`;
        };
        const tally = () => {
            $('.tr-hits').textContent = String(hits);
            $('.tr-hits').classList.remove('bump');
            $('.tr-hits').getBoundingClientRect();
            $('.tr-hits').classList.add('bump');
            $('.tr-xpline').textContent = `+${sessionXp(maxXp, hits)} ${unit}`;
        };
        const showCombo = () => {
            comboTag.hidden = combo < 3;
            if (combo < 3) return;
            comboTag.textContent = `Combo ×${combo}`;
            comboTag.classList.remove('bump');
            comboTag.getBoundingClientRect();
            comboTag.classList.add('bump');
        };
        const pop = (x, y, text, cls) => {
            const word = el('span', `tr-pop ${cls}`, text);
            word.style.left = `${x}%`;
            word.style.top = `${y}%`;
            board.append(word);
            removeLater(word, 700);
        };
        const burst = (x, y, colour) => {
            for (let i = 0; i < 8; i++) {
                const spark = el('span', 'tr-spark');
                const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
                spark.style.left = `${x}%`;
                spark.style.top = `${y}%`;
                spark.style.setProperty('--dx', `${Math.cos(angle) * 46}px`);
                spark.style.setProperty('--dy', `${Math.sin(angle) * 46}px`);
                spark.style.background = colour;
                board.append(spark);
                removeLater(spark, 520);
            }
            const slash = el('span', 'tr-slash');
            slash.style.left = `${x}%`;
            slash.style.top = `${y}%`;
            slash.style.setProperty('--tilt', `${-35 + Math.random() * 70}deg`);
            board.append(slash);
            removeLater(slash, 320);
        };
        const flash = (cls) => {
            board.classList.remove('struck', 'hurt');
            board.getBoundingClientRect();   // restart the animation
            board.classList.add(cls);
        };
        const spawn = (t) => {
            const red = Math.random() < RED_SHARE;
            const life = targetLife(t, tier);
            const x = 32 + Math.random() * 40;      // on the dummy's body and head
            const y = 12 + Math.random() * 56;
            const dot = el('button', `tr-target ${red ? 'red' : 'green'}`);
            dot.type = 'button';
            dot.style.left = `${x}%`;
            dot.style.top = `${y}%`;
            dot.style.setProperty('--life', `${life}s`);
            dot.setAttribute('aria-label', red ? 'Red target: do not tap' : 'Green target: tap');
            dot.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                if (over || dot.dataset.gone) return;
                dot.dataset.gone = '1';
                dot.remove();
                if (red) {
                    hits = Math.max(0, hits - 1);
                    reds += 1;
                    combo = 0;
                    play('error');
                    flash('hurt');
                    pop(x, y, 'Ouch! −1', 'bad');
                } else {
                    hits += 1;
                    combo += 1;
                    best = Math.max(best, combo);
                    play(combo >= 5 && combo % 5 === 0 ? 'forge' : 'place');
                    flash('struck');
                    burst(x, y, '#9ff0b8');
                    pop(x, y, combo >= 3 ? `+1 ×${combo}` : '+1', 'good');
                }
                tally();
                showCombo();
            });
            board.append(dot);
            setTimeout(() => {
                if (dot.dataset.gone || over) return;
                dot.dataset.gone = '1';
                dot.classList.add('fade');
                if (!red) {
                    missed += 1;
                    combo = 0;
                    showCombo();
                }
                removeLater(dot, 200);
            }, life * 1000);
        };
        const tick = (now) => {
            if (over) return;
            const t = (now - started) / 1000;
            if (counting) {
                const n = Math.ceil(COUNTDOWN - t);
                if (n > 0 && n !== lastCount) {
                    lastCount = n;
                    showBanner(String(n), 'count');
                    play('click');
                } else if (n <= 0) {
                    counting = false;
                    showBanner('GO!', 'go');
                    play('boost');
                    started = now;
                    nextSpawn = 0.25;
                }
            } else if (t >= SECONDS) {
                stopGame();
                for (const dot of board.querySelectorAll('.tr-target')) {
                    dot.dataset.gone = '1';
                    dot.classList.add('fade');
                }
                bar.style.width = '0%';
                clock.textContent = '0';
                card.classList.remove('hurry');
                showBanner('TIME!', 'time');
                play('slam');
                setTimeout(() => {
                    resolve({ ...hitsToScore(hits), hits });
                    results();
                }, 1100);
                return;
            } else {
                const leftS = SECONDS - t;
                bar.style.width = `${(100 * leftS / SECONDS).toFixed(1)}%`;
                clock.textContent = String(Math.ceil(leftS));
                card.classList.toggle('hurry', leftS <= HURRY);
                if (t >= nextSpawn) {
                    spawn(t);
                    nextSpawn = t + spawnGap(t);
                }
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
    }

    // ── result ─────────────────────────────────────────────────────────
    let pending = null;     // the server's answer, if it came before the result screen
    let fill = null;

    function results() {
        if (closed) return;
        const box = el('div', 'tr-result');
        const starRow = el('div', 'tr-stars');
        const earned = starsFor(hits);
        for (let i = 0; i < 3; i++) starRow.append(el('span', 'tr-star', '★'));
        const big = el('div', 'tr-bighits');
        const count = el('b', '', '0');
        big.append(count, el('span', '', ' hits'));
        const redLine = reds ? ` · red touched ${reds}` : '';
        const sub = el('p', 'tr-sub', `Best combo ×${best} · missed ${missed}${redLine}`);
        const xpBox = el('div', 'tr-xpbox');
        xpBox.append(el('small', 'tr-xplabel', 'Saving…'));
        const meter = el('span', 'tr-meter');
        const now = el('span', 'tr-meter-now');
        const gain = el('span', 'tr-meter-gain');
        meter.append(now, gain);
        xpBox.append(meter);
        const actions = el('div', 'tr-actions');
        box.append(starRow, big, sub, xpBox, actions);
        stage.replaceChildren(box);

        // the hits count up, then the stars pop one by one
        const steps = Math.max(1, hits);
        let shown = 0;
        const counter = setInterval(() => {
            shown += 1;
            count.textContent = String(Math.min(shown, hits));
            if (shown >= steps) {
                clearInterval(counter);
                count.textContent = String(hits);
                lightStars(starRow, earned);
            }
        }, Math.min(70, 900 / steps));

        const pct = (v) => `${Math.max(0, Math.min(100, (100 * v) / need)).toFixed(1)}%`;
        now.style.width = pct(xp);
        gain.style.left = pct(xp);
        fill = (outcome) => {
            const label = xpBox.querySelector('.tr-xplabel');
            if (outcome.error) {
                label.textContent = outcome.error;
                label.classList.add('bad');
                actions.replaceChildren(doneButton());
                return;
            }
            const after = xp + outcome.xp;
            root.querySelector('.anvil-job').textContent = `${name} · ${outcome.sessionsLeft} session${outcome.sessionsLeft === 1 ? '' : 's'} left today`;
            label.textContent = outcome.label ?? `+${outcome.xp} XP · ${Math.min(after, need)} / ${need} XP`;
            setTimeout(() => {
                gain.style.width = `calc(${pct(after)} - ${pct(xp)})`;
            }, 100);
            if (outcome.ready) {
                setTimeout(() => {
                    xpBox.append(el('p', 'tr-ready', typeof outcome.ready === 'string' ? outcome.ready : 'Ready to evolve!'));
                    play('levelup');
                }, 900);
            }
            const buttons = [];
            if (onAgain && outcome.sessionsLeft > 0) {
                const again = el('button', 'tr-start small', `Train again (${outcome.sessionsLeft} left)`);
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
    function doneButton() {
        const done = el('button', 'button wide-plain', 'Done');
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
