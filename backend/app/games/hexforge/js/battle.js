import { fetchDemoCity, runBattle } from './api.js';
import { BUILDING_INFO, HERO_INFO, PRIORITY_INFO, SIDE_INFO, TACTIC_INFO } from './labels.js';
import { createReplay } from './replay.js';

/**
 * "Test battle": pick a squad and tactics, attack the test bastion, watch
 * the replay, read the report.
 */

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'hexforge.setup';
const DEFAULT_SETUP = {
    squad: ['guardian', 'neon_blade', 'neon_blade', 'technomancer'],
    side: 'south',
    priority: 'core',
    tactic: 'compact',
};
const SPEEDS = [1, 2, 4];
const TAIL_SECONDS = 1.5;   // keep the last frame on screen before the report

export class BattleMode {
    constructor(renderer) {
        this.renderer = renderer;
        this.view = 'setup';          // setup | battle | result
        this.setup = loadSetup();
        this.city = null;
        this.catalog = null;
        this.battle = null;
        this.replay = null;
        this.playTick = 0;
        this.speed = 0;
        this.paused = false;
        this.#wire();
    }

    async enter() {
        if (!this.city) {
            const { city, catalog } = await fetchDemoCity();
            this.city = city;
            this.catalog = catalog;
            $('btn-launch').disabled = false;
        }
        this.renderer.setCity(this.city);
        this.#renderSetup();
        this.#show(this.view);
    }

    leave() {
        for (const view of ['setup', 'battle', 'result']) $(`view-${view}`).hidden = true;
        $('hud').hidden = true;
    }

    frame(time, dt) {
        if (this.view === 'setup') {
            this.renderer.draw(null, { side: this.setup.side, time });
            return;
        }
        if (this.view === 'battle' && !this.paused) {
            this.playTick += dt * this.replay.tickRate * SPEEDS[this.speed];
        }
        const state = this.replay.stateAt(this.playTick);
        this.renderer.draw(state, { time });
        this.#updateHud(state);
        if (this.view === 'battle') {
            this.#updateHeroList(state);
            if (this.playTick >= this.replay.duration + TAIL_SECONDS * this.replay.tickRate) this.#showResult();
        }
    }

    /**
     * Dev helper for screenshots: `?at=20` launches the saved attack and
     * freezes the replay at second 20; `?at=end` opens the report.
     */
    async devJump(at) {
        await this.#launch();
        if (!this.replay) return;
        if (at === 'end') {
            this.#showResult();
            return;
        }
        this.playTick = Number(at) * this.replay.tickRate;
        this.paused = true;
        $('btn-pause').textContent = 'Play';
    }

    // ── setup panel ────────────────────────────────────────────────────
    #wire() {
        $('btn-launch').addEventListener('click', () => this.#launch());
        $('btn-pause').addEventListener('click', () => {
            this.paused = !this.paused;
            $('btn-pause').textContent = this.paused ? 'Play' : 'Pause';
        });
        $('btn-speed').addEventListener('click', () => {
            this.speed = (this.speed + 1) % SPEEDS.length;
            $('btn-speed').textContent = `Speed ${SPEEDS[this.speed]}×`;
        });
        $('btn-skip').addEventListener('click', () => this.#showResult());
        $('btn-rewatch').addEventListener('click', () => this.#startReplay());
        $('btn-new').addEventListener('click', () => this.#show('setup'));
    }

    #show(view) {
        this.view = view;
        for (const name of ['setup', 'battle', 'result']) $(`view-${name}`).hidden = name !== view;
        $('hud').hidden = view === 'setup';
    }

    #renderSetup() {
        const squad = $('squad');
        squad.replaceChildren();
        this.setup.squad.forEach((cls, slot) => {
            const row = document.createElement('div');
            row.className = 'slot';
            const index = document.createElement('span');
            index.className = 'slot-index';
            index.textContent = String(slot + 1);
            row.append(index);
            for (const [name, info] of Object.entries(HERO_INFO)) {
                row.append(chip(info.name, name === cls, () => {
                    this.setup.squad[slot] = name;
                    this.#changed();
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
            const hp = this.catalog?.heroes[name]?.hp;
            item.append(title, ` · ${info.role}${hp ? ` · ${hp} HP` : ''}`);
            classes.append(item);
        }

        this.#fillChoice('side', SIDE_INFO, (v) => v);
        this.#fillChoice('priority', PRIORITY_INFO, (v) => v.name);
        this.#fillChoice('tactic', TACTIC_INFO, (v) => v.name);
        $('priority-hint').textContent = PRIORITY_INFO[this.setup.priority].hint;
        $('tactic-hint').textContent = TACTIC_INFO[this.setup.tactic].hint;
    }

    #fillChoice(key, options, labelOf) {
        const container = $(key);
        container.replaceChildren();
        for (const [value, info] of Object.entries(options)) {
            container.append(chip(labelOf(info), this.setup[key] === value, () => {
                this.setup[key] = value;
                this.#changed();
            }));
        }
    }

    #changed() {
        saveSetup(this.setup);
        this.#renderSetup();
    }

    // ── battle flow ────────────────────────────────────────────────────
    async #launch() {
        const button = $('btn-launch');
        button.disabled = true;
        button.textContent = 'Simulating…';
        $('error').hidden = true;
        try {
            this.battle = await runBattle(this.setup);
            this.replay = createReplay(this.battle);
            this.#startReplay();
        } catch (error) {
            console.error('[Hexforge] battle failed', error);
            $('error').textContent = 'The battle server did not answer. Try again in a moment.';
            $('error').hidden = false;
        } finally {
            button.disabled = false;
            button.textContent = 'Launch attack';
        }
    }

    #startReplay() {
        this.playTick = 0;
        this.paused = false;
        $('btn-pause').textContent = 'Pause';
        this.#buildHeroList();
        this.#show('battle');
    }

    #buildHeroList() {
        const list = $('hero-list');
        list.replaceChildren();
        for (const hero of this.battle.squad) {
            const info = HERO_INFO[hero.cls];
            const row = document.createElement('div');
            row.className = 'hero-row';
            row.style.setProperty('--accent', info.color);
            const name = document.createElement('span');
            name.className = 'name';
            name.textContent = info.name;
            const hp = document.createElement('span');
            hp.className = 'hp';
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.append(document.createElement('div'));
            row.append(name, hp, bar);
            list.append(row);
        }
    }

    #updateHeroList(state) {
        const rows = $('hero-list').children;
        state.heroes.forEach((hero, i) => {
            const row = rows[i];
            if (!row) return;
            row.classList.toggle('down', !hero.alive);
            row.querySelector('.hp').textContent = hero.alive ? `${hero.hp} / ${hero.maxHp}` : 'Down';
            row.querySelector('.bar div').style.width = `${(100 * hero.hp) / hero.maxHp}%`;
        });
    }

    #updateHud(state) {
        const seconds = Math.floor(state.seconds);
        $('hud-time').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        $('hud-destruction').textContent = `${state.destruction}%`;
        $('hud-bar').style.width = `${state.destruction}%`;
        const core = $('hud-core');
        core.textContent = state.coreDestroyed ? 'Core destroyed' : 'Core standing';
        core.classList.toggle('down', state.coreDestroyed);
    }

    #showResult() {
        this.playTick = this.replay.duration;
        const s = this.battle.summary;
        const verdict = $('verdict');
        verdict.textContent = s.victory ? 'VICTORY' : 'DEFEAT';
        verdict.className = `verdict ${s.victory ? 'win' : 'loss'}`;

        const rows = [
            ['Destruction', `${s.destruction}%`],
            ['Core', s.core_destroyed ? 'Destroyed' : 'Standing'],
            ['Loot', s.loot_percent ? `${s.loot_percent}% of unprotected materials` : 'None'],
            ['Battle time', `${s.seconds} s`],
            ['First defence to fall', s.first_tower_lost ? BUILDING_INFO[s.first_tower_lost].name : '—'],
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
        this.#show('result');
    }
}

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

// The last setup is a convenience only: the game works without storage.
function loadSetup() {
    try {
        const saved = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
        if (saved?.squad?.length === 4) return { ...DEFAULT_SETUP, ...saved };
    } catch {
        // storage blocked or empty
    }
    return structuredClone(DEFAULT_SETUP);
}

function saveSetup(setup) {
    try {
        globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
    } catch {
        // private mode: choices last for this visit
    }
}
