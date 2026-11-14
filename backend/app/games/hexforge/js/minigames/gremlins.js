import { play } from '../fx/audio.js';
import { icon } from '../ui/icons.js';
import { MATERIAL_INFO } from '../data/labels.js';

/**
 * The gremlins, played on the city map itself, in three screens:
 *   intro    a gremlin, the rule, what is at stake; START.
 *   play     the card goes away and the map stays: READY… GO!, then a gang of
 *            mechanical gremlins runs from the edge of the field at the
 *            buildings, one after another and faster and faster. Tap one
 *            before it gets there and it is caught; one that gets there
 *            dives in and is gone. When the whole gang is caught or gone:
 *            ALL CAUGHT! or DONE!
 *   result   stars, how many were caught, the loot counted up, the Hourglass
 *            for the whole gang; Back to the city.
 *
 * The map is drawn by the city as usual; the gremlins are page elements put
 * where `renderer.screenOf` says each world point is, every frame.
 */

const STAR_SHARE = [5 / 12, 9 / 12, 1];
const SKIP_TYPES = new Set(['wall', 'rune_trap']);

/** When each gremlin of a gang of `total` sets off (seconds after GO), faster and faster. */
export function gangSchedule(total, rng = Math.random) {
    const times = [];
    let t = 0.4;
    for (let i = 0; i < total; i++) {
        times.push(Number(t.toFixed(2)));
        const pair = i > 2 && rng() < 0.25;          // now and then two at once
        t += pair ? 0.2 : Math.max(0.75, 1.5 - 0.07 * i) + rng() * 0.3;
    }
    return times;
}

/** Cells per second for a gremlin setting off `t` seconds in. */
export function gremlinSpeed(t) {
    return Math.min(2.8, 1.5 + 0.11 * t);
}

/** 0 to 3 stars for `caught` of `total`. */
export function gremlinStars(caught, total) {
    return STAR_SHARE.filter((share) => caught >= Math.ceil(total * share)).length;
}

/** A start on the edge of the field: one of the four sides, anywhere along it. */
export function edgePoint(grid, rng = Math.random) {
    const along = 1 + rng() * (grid - 2);
    const side = Math.floor(rng() * 4);
    if (side === 0) return { x: along, y: 0.2 };
    if (side === 1) return { x: grid - 0.2, y: along };
    if (side === 2) return { x: along, y: grid - 0.2 };
    return { x: 0.2, y: along };
}

const GREMLIN = `
<svg viewBox="0 0 48 52" aria-hidden="true">
  <g class="gr-legs"><rect class="gr-leg a" x="15" y="38" width="6" height="12" rx="3"/><rect class="gr-leg b" x="27" y="38" width="6" height="12" rx="3"/></g>
  <path d="M6 10 L16 18 L12 24 Z M42 10 L32 18 L36 24 Z" fill="#4a6b3a" stroke="#1c2a14" stroke-width="2" stroke-linejoin="round"/>
  <ellipse cx="24" cy="30" rx="15" ry="13" fill="#6f9a4f" stroke="#1c2a14" stroke-width="2.5"/>
  <rect x="13" y="20" width="22" height="7" rx="3.5" fill="#3a3f45" stroke="#1c2a14" stroke-width="2"/>
  <circle cx="19" cy="23.5" r="3.2" fill="#ffdd55"/><circle cx="29" cy="23.5" r="3.2" fill="#ffdd55"/>
  <circle cx="19" cy="23.5" r="1.3" fill="#ff3d1a"/><circle cx="29" cy="23.5" r="1.3" fill="#ff3d1a"/>
  <path d="M17 34 Q24 39 31 34" fill="none" stroke="#1c2a14" stroke-width="2" stroke-linecap="round"/>
  <path d="M20 35 L21.5 37.5 L23 35.6 M25 35.6 L26.5 37.5 L28 35" fill="#fff" stroke="none"/>
  <path d="M36 32 L44 26 L45 30 Z" fill="#c9a36b" stroke="#1c2a14" stroke-width="1.5"/>
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
 * Start the gremlins over the city. `renderer` gives `screenOf(x, y, z)`;
 * `buildings` and `grid` are the city's. Returns { score, finish }: `score`
 * resolves to the number caught (null if closed before the end);
 * `finish(outcome)` shows the result: { loot, bonus, readyAt } or { error }.
 */
export function openGremlins({ renderer, buildings, grid, total, lootEach, hours }) {
    const root = el('div', 'anvil-game training-game');
    root.innerHTML = `
        <div class="anvil-card training-card" role="dialog" aria-label="Gremlins">
            <button class="round small anvil-close" type="button" aria-label="Close"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
            <h2>Gremlins!</h2>
            <p class="anvil-job">A gang of ${total} is coming for your city</p>
            <div class="tr-stage"></div>
        </div>`;
    document.body.append(root);
    const stage = root.querySelector('.tr-stage');
    const targets = buildings.filter((b) => !SKIP_TYPES.has(b.type));

    let resolve;
    const score = new Promise((r) => { resolve = r; });
    let closed = false;
    let stopGame = () => {};
    let caught = 0;
    let escaped = 0;
    let fastest = 0;     // the most caught in a row
    let layer = null;

    const close = () => {
        if (closed) return;
        closed = true;
        stopGame();
        document.removeEventListener('keydown', onKey);
        layer?.remove();
        root.classList.add('leaving');
        removeLater(root, 220);
        resolve(null);
    };
    const onKey = (event) => {
        if (event.code === 'Escape' && !layer) close();
    };
    document.addEventListener('keydown', onKey);
    root.querySelector('.anvil-close').addEventListener('click', close);

    // ── intro ──────────────────────────────────────────────────────────
    function intro() {
        const box = el('div', 'tr-intro');
        const art = el('div', 'gr-intro-art');
        art.innerHTML = GREMLIN;
        const rules = el('div', 'tr-rules');
        const tap = el('div', 'tr-rule-row');
        const mini = el('span', 'gr-mini');
        mini.innerHTML = GREMLIN;
        tap.append(mini, el('span', '', 'They run at your buildings: TAP them before they get there!'));
        const loot = el('div', 'tr-rule-row');
        const gem = el('span', 'tr-demo clock');
        gem.append(icon('gem'));
        loot.append(gem, el('span', '', `Every gremlin you catch drops ${lootEach} materials.`));
        const all = el('div', 'tr-rule-row');
        const glass = el('span', 'tr-demo clock');
        glass.append(icon('hourglass'));
        all.append(glass, el('span', '', `Catch all ${total} and they leave an Hourglass too.`));
        rules.append(tap, loot, all);
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

    // ── play: on the map ───────────────────────────────────────────────
    function game() {
        root.classList.add('gr-hidden');
        layer = el('div', 'gr-layer');
        layer.innerHTML = `
            <div class="gr-hud">
                <span class="gr-count"><b class="gr-caught">0</b> caught</span>
                <span class="gr-pips"></span>
                <span class="gr-left"><b class="gr-remaining">${total}</b> left</span>
            </div>
            <span class="tr-banner"></span>`;
        document.body.append(layer);
        const $ = (sel) => layer.querySelector(sel);
        const pips = $('.gr-pips');
        for (let i = 0; i < total; i++) pips.append(el('span', 'pip'));
        const banner = $('.tr-banner');
        const schedule = gangSchedule(total);
        const runners = [];
        let spawned = 0;
        let resolved = 0;
        let streak = 0;
        let started = performance.now();
        let last = started;
        let phase = 'ready';
        let frame = 0;
        let stopped = false;
        stopGame = () => {
            stopped = true;
            cancelAnimationFrame(frame);
        };

        const showBanner = (text, cls) => {
            banner.textContent = text;
            banner.className = 'tr-banner';
            banner.getBoundingClientRect();   // restart the animation
            banner.className = `tr-banner show ${cls}`;
        };
        const pop = (x, y, text, cls) => {
            const word = el('span', `tr-pop ${cls}`, text);
            word.style.left = `${x}px`;
            word.style.top = `${y}px`;
            layer.append(word);
            removeLater(word, 700);
        };
        const sparks = (x, y, colour) => {
            for (let i = 0; i < 10; i++) {
                const spark = el('span', 'tr-spark');
                const a = Math.random() * Math.PI * 2;
                spark.style.left = `${x}px`;
                spark.style.top = `${y}px`;
                spark.style.setProperty('--dx', `${Math.cos(a) * 50}px`);
                spark.style.setProperty('--dy', `${Math.sin(a) * 50}px`);
                spark.style.background = colour;
                layer.append(spark);
                removeLater(spark, 520);
            }
        };
        const tally = () => {
            $('.gr-caught').textContent = String(caught);
            $('.gr-remaining').textContent = String(total - resolved);
            $('.gr-caught').classList.remove('bump');
            $('.gr-caught').getBoundingClientRect();
            $('.gr-caught').classList.add('bump');
        };
        const settle = (runner, how) => {
            runner.done = true;
            pips.children[resolved].className = `pip ${how === 'caught' ? 'perfect' : 'miss'}`;
            resolved += 1;
            tally();
            if (resolved === total) end();
        };
        const spawn = (t) => {
            const target = targets[Math.floor(Math.random() * targets.length)];
            const from = edgePoint(grid);
            const node = el('button', 'gr-gremlin');
            node.type = 'button';
            node.setAttribute('aria-label', 'Gremlin: tap to catch');
            node.innerHTML = GREMLIN;
            const runner = {
                node, x: from.x, y: from.y, done: false, speed: gremlinSpeed(t),
                tx: target.x + target.size / 2, ty: target.y + target.size / 2, reach: Math.max(0.35, target.size * 0.3),
            };
            node.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (runner.done || phase !== 'play') return;
                caught += 1;
                streak += 1;
                fastest = Math.max(fastest, streak);
                const p = renderer.screenOf(runner.x, runner.y, 10);
                node.classList.add('caught');
                removeLater(node, 450);
                sparks(p.x, p.y - 10, '#ffd36b');
                pop(p.x, p.y - 30, streak >= 3 ? `Caught! ×${streak}` : 'Caught!', 'good');
                play(streak >= 3 ? 'forge' : 'place');
                settle(runner, 'caught');
            });
            layer.append(node);
            runners.push(runner);
            play('click');
        };
        const steal = (runner) => {
            const p = renderer.screenOf(runner.x, runner.y, 10);
            runner.node.classList.add('escaped');
            removeLater(runner.node, 400);
            streak = 0;
            pop(p.x, p.y - 30, 'Stolen!', 'bad');
            play('error');
            layer.classList.remove('hurt');
            layer.getBoundingClientRect();
            layer.classList.add('hurt');
            escaped += 1;
            settle(runner, 'escaped');
        };
        const place = (runner) => {
            const p = renderer.screenOf(runner.x, runner.y, 0);
            const ahead = renderer.screenOf(runner.tx, runner.ty, 0);
            runner.node.style.transform = `translate(${p.x - 26}px, ${p.y - 50}px)`;
            runner.node.classList.toggle('left', ahead.x < p.x);
        };
        const end = () => {
            phase = 'over';
            showBanner(caught === total ? 'ALL CAUGHT!' : 'DONE!', 'time');
            play('slam');
            setTimeout(() => {
                if (closed) return;
                stopGame();
                layer.remove();
                layer = null;
                root.classList.remove('gr-hidden');
                resolve(caught);
                result();
            }, 1300);
        };
        const tick = (now) => {
            if (stopped) return;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const t = (now - started) / 1000;
            if (phase === 'ready' && t >= 0.9) {
                phase = 'play';
                started = now;
                showBanner('GO!', 'go');
                play('boost');
            } else if (phase === 'play') {
                while (spawned < total && t >= schedule[spawned]) {
                    spawn(t);
                    spawned += 1;
                }
            }
            for (const runner of runners) {
                if (runner.done) continue;
                if (phase === 'play') {
                    const dx = runner.tx - runner.x;
                    const dy = runner.ty - runner.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist <= runner.reach) {
                        steal(runner);
                        continue;
                    }
                    const stepLen = Math.min(dist, runner.speed * dt);
                    runner.x += (dx / dist) * stepLen;
                    runner.y += (dy / dist) * stepLen;
                }
                place(runner);
            }
            frame = requestAnimationFrame(tick);
        };
        showBanner('READY…', 'count');
        frame = requestAnimationFrame(tick);
    }

    // ── result ─────────────────────────────────────────────────────────
    let pending = null;
    let fill = null;

    function result() {
        if (closed) return;
        const box = el('div', 'tr-result');
        const stars = el('div', 'tr-stars');
        for (let i = 0; i < 3; i++) stars.append(el('span', 'tr-star', '★'));
        const big = el('div', 'tr-bighits');
        big.append(el('b', '', `${caught}`), el('span', '', ` / ${total} caught`));
        const streak = fastest >= 3 ? ` · best streak ×${fastest}` : '';
        const sub = el('p', 'tr-sub', `${escaped} got away${streak}`);
        const lootBox = el('div', 'tr-xpbox gr-lootbox');
        const label = el('small', 'tr-xplabel', caught ? 'Counting the loot…' : 'They all got away: nothing dropped.');
        const list = el('div', 'gr-loot');
        lootBox.append(label, list);
        const actions = el('div', 'tr-actions');
        box.append(stars, big, sub, lootBox, actions);
        stage.replaceChildren(box);
        root.querySelector('.anvil-job').textContent = caught === total ? 'The whole gang, caught!' : 'The gang is gone';
        setTimeout(() => lightStars(stars, gremlinStars(caught, total)), 200);

        fill = (outcome) => {
            if (outcome.error) {
                label.textContent = outcome.error;
                label.classList.add('bad');
                actions.replaceChildren(doneButton());
                return;
            }
            if (caught) label.textContent = 'They dropped:';
            for (const [material, amount] of Object.entries(outcome.loot)) {
                const info = MATERIAL_INFO[material];
                const row = el('span', 'gr-loot-row');
                row.style.setProperty('--accent', info.color);
                const count = el('b', '', '+0');
                row.append(icon(info.icon), count, el('span', '', info.name));
                list.append(row);
                countUp(count, amount);
            }
            if (outcome.bonus) {
                setTimeout(() => {
                    lootBox.append(el('p', 'tr-ready', '+1 Hourglass!'));
                    play('levelup');
                }, 900);
            }
            lootBox.append(el('small', 'vn-rest gr-next', `The next gang comes in ${hours} hours.`));
            if (caught) play('collect');
            actions.replaceChildren(doneButton());
        };
        if (pending) fill(pending);
    }
    function countUp(node, to) {
        const t0 = performance.now();
        const step = (now) => {
            const k = Math.min(1, (now - t0) / 900);
            node.textContent = `+${Math.round(to * (1 - (1 - k) ** 3))}`;
            if (k < 1 && !closed) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
    function doneButton() {
        const done = el('button', 'button wide-plain', 'Back to the city');
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
