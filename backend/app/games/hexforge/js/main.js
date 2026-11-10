import { fetchDemoCity, runBattle } from './api.js';
import { HERO_INFO, PRIORITY_INFO, SIDE_INFO, TACTIC_INFO } from './labels.js';
import { Renderer } from './render.js';
import { createReplay } from './replay.js';

const STORAGE_KEY = 'hexforge.setup';
const DEFAULT_SETUP = {
    squad: ['guardian', 'neon_blade', 'neon_blade', 'technomancer'],
    side: 'south',
    priority: 'core',
    tactic: 'compact',
};
const SPEEDS = [1, 2, 4];
const TAIL_SECONDS = 1.5;   // keep the last frame on screen before the report

const $ = (id) => document.getElementById(id);

const app = {
    mode: 'loading',          // loading | setup | battle | result
    setup: loadSetup(),
    catalog: null,
    battle: null,
    replay: null,
    playTick: 0,
    speed: 0,
    paused: false,
    time: 0,
};

const renderer = new Renderer($('view'));

// ── setup persistence (a convenience only: the game works without it) ──
function loadSetup() {
    try {
        const saved = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
        if (saved?.squad?.length === 4) return { ...DEFAULT_SETUP, ...saved };
    } catch {
        // storage blocked or empty
    }
    return structuredClone(DEFAULT_SETUP);
}

function saveSetup() {
    try {
        globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(app.setup));
    } catch {
        // private mode: choices last for this visit
    }
}

// ── panel building ─────────────────────────────────────────────────────
function chip(label, pressed, onClick, accent) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(pressed));
    if (accent) button.style.setProperty('--accent', accent);
    button.addEventListener('click', onClick);
    return button;
}

function renderSetup() {
    const squad = $('squad');
    squad.replaceChildren();
    app.setup.squad.forEach((cls, slot) => {
        const row = document.createElement('div');
        row.className = 'slot';
        const index = document.createElement('span');
        index.className = 'slot-index';
        index.textContent = String(slot + 1);
        row.append(index);
        for (const [name, info] of Object.entries(HERO_INFO)) {
            row.append(chip(info.name, name === cls, () => {
                app.setup.squad[slot] = name;
                changed();
            }, info.color));
        }
        squad.append(row);
    });

    const classes = $('classes');
    classes.replaceChildren();
    for (const [name, info] of Object.entries(HERO_INFO)) {
        const item = document.createElement('li');
        item.style.setProperty('--accent', info.color);
        const title = document.createElement('b');
        title.textContent = info.name;
        const hp = app.catalog?.heroes[name]?.hp;
        item.append(title, ` · ${info.role}${hp ? ` · ${hp} HP` : ''}`);
        classes.append(item);
    }

    fillChoice('side', SIDE_INFO, (v) => v, 'side');
    fillChoice('priority', PRIORITY_INFO, (v) => v.name, 'priority');
    fillChoice('tactic', TACTIC_INFO, (v) => v.name, 'tactic');
    $('priority-hint').textContent = PRIORITY_INFO[app.setup.priority].hint;
    $('tactic-hint').textContent = TACTIC_INFO[app.setup.tactic].hint;
}

function fillChoice(containerId, options, labelOf, key) {
    const container = $(containerId);
    container.replaceChildren();
    for (const [value, info] of Object.entries(options)) {
        container.append(chip(labelOf(info), app.setup[key] === value, () => {
            app.setup[key] = value;
            changed();
        }));
    }
}

function changed() {
    saveSetup();
    renderSetup();
}

function showView(name) {
    for (const view of ['setup', 'battle', 'result']) $(`view-${view}`).hidden = view !== name;
    $('hud').hidden = name === 'setup';
}

// ── battle flow ────────────────────────────────────────────────────────
async function launch() {
    const button = $('btn-launch');
    button.disabled = true;
    button.textContent = 'Simulating…';
    $('error').hidden = true;
    try {
        app.battle = await runBattle(app.setup);
        app.replay = createReplay(app.battle);
        startReplay();
    } catch (error) {
        console.error('[Hexforge] battle failed', error);
        $('error').textContent = 'The battle server did not answer. Try again in a moment.';
        $('error').hidden = false;
    } finally {
        button.disabled = false;
        button.textContent = 'Launch attack';
    }
}

function startReplay() {
    app.mode = 'battle';
    app.playTick = 0;
    app.paused = false;
    $('btn-pause').textContent = 'Pause';
    buildHeroList();
    showView('battle');
}

function buildHeroList() {
    const list = $('hero-list');
    list.replaceChildren();
    for (const hero of app.battle.squad) {
        const info = HERO_INFO[hero.cls];
        const row = document.createElement('div');
        row.className = 'hero-row';
        row.style.setProperty('--accent', info.color);
        row.innerHTML = '<span class="name"></span><span class="hp"></span><div class="bar"><div></div></div>';
        row.querySelector('.name').textContent = info.name;
        list.append(row);
    }
}

function updateBattlePanel(state) {
    const rows = $('hero-list').children;
    state.heroes.forEach((hero, i) => {
        const row = rows[i];
        if (!row) return;
        row.classList.toggle('down', !hero.alive);
        row.querySelector('.hp').textContent = hero.alive ? `${hero.hp} / ${hero.maxHp}` : 'Down';
        row.querySelector('.bar div').style.width = `${(100 * hero.hp) / hero.maxHp}%`;
    });
}

function updateHud(state) {
    const seconds = Math.floor(state.seconds);
    $('hud-time').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    $('hud-destruction').textContent = `${state.destruction}%`;
    $('hud-bar').style.width = `${state.destruction}%`;
    const core = $('hud-core');
    core.textContent = state.coreDestroyed ? 'Core destroyed' : 'Core standing';
    core.classList.toggle('down', state.coreDestroyed);
}

function showResult() {
    app.mode = 'result';
    app.playTick = app.replay.duration;
    const s = app.battle.summary;
    const verdict = $('verdict');
    verdict.textContent = s.victory ? 'VICTORY' : 'DEFEAT';
    verdict.className = `verdict ${s.victory ? 'win' : 'loss'}`;

    const rows = [
        ['Destruction', `${s.destruction}%`],
        ['Core', s.core_destroyed ? 'Destroyed' : 'Standing'],
        ['Loot', s.loot_percent ? `${s.loot_percent}% of unprotected materials` : 'None'],
        ['Battle time', `${s.seconds} s`],
        ['First defence to fall', s.first_tower_lost ? labelOfBuilding(s.first_tower_lost) : '—'],
    ];
    const stats = $('stats');
    stats.replaceChildren();
    for (const [label, value] of rows) {
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        stats.append(dt, dd);
    }

    const report = $('report');
    report.replaceChildren();
    for (const hero of s.heroes) {
        const info = HERO_INFO[hero.cls];
        const tr = document.createElement('tr');
        tr.style.setProperty('--accent', info.color);
        for (const [text, cls] of [[info.name, 'name'], [hero.dealt], [hero.taken], [hero.survived ? 'Alive' : 'Down']]) {
            const td = document.createElement('td');
            td.textContent = String(text);
            if (cls) td.className = cls;
            tr.append(td);
        }
        report.append(tr);
    }
    showView('result');
}

function labelOfBuilding(type) {
    return type.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// ── main loop ──────────────────────────────────────────────────────────
let last = performance.now();

function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    app.time += dt;

    if (app.mode === 'setup') {
        renderer.draw(null, { side: app.setup.side, time: app.time });
    } else if (app.mode === 'battle' || app.mode === 'result') {
        if (app.mode === 'battle' && !app.paused) {
            app.playTick += dt * app.replay.tickRate * SPEEDS[app.speed];
        }
        const state = app.replay.stateAt(app.playTick);
        renderer.draw(state, { time: app.time });
        updateHud(state);
        if (app.mode === 'battle') {
            updateBattlePanel(state);
            if (app.playTick >= app.replay.duration + TAIL_SECONDS * app.replay.tickRate) showResult();
        }
    }
    requestAnimationFrame(frame);
}

function wireControls() {
    $('btn-launch').addEventListener('click', launch);
    $('btn-pause').addEventListener('click', () => {
        app.paused = !app.paused;
        $('btn-pause').textContent = app.paused ? 'Play' : 'Pause';
    });
    $('btn-speed').addEventListener('click', () => {
        app.speed = (app.speed + 1) % SPEEDS.length;
        $('btn-speed').textContent = `Speed ${SPEEDS[app.speed]}×`;
    });
    $('btn-skip').addEventListener('click', showResult);
    $('btn-rewatch').addEventListener('click', startReplay);
    $('btn-new').addEventListener('click', () => {
        app.mode = 'setup';
        showView('setup');
    });
    new ResizeObserver(() => renderer.resize()).observe($('stage'));
}

/**
 * Dev helper for screenshots: `?at=20` launches the saved attack and freezes
 * the replay at second 20; `?at=end` opens the report.
 */
async function devJump() {
    const at = new URLSearchParams(globalThis.location.search).get('at');
    if (at === null) return;
    await launch();
    if (!app.replay) return;
    if (at === 'end') {
        showResult();
        return;
    }
    app.playTick = Number(at) * app.replay.tickRate;
    app.paused = true;
    $('btn-pause').textContent = 'Play';
}

async function boot() {
    wireControls();
    renderSetup();
    requestAnimationFrame(frame);
    try {
        const { city, catalog } = await fetchDemoCity();
        app.catalog = catalog;
        renderer.setCity(city);
        app.mode = 'setup';
        $('loading').hidden = true;
        $('btn-launch').disabled = false;
        renderSetup();
        await devJump();
    } catch (error) {
        console.error('[Hexforge] could not load the city', error);
        $('loading').textContent = 'The Hexforge server is not reachable.';
    }
}

boot();
