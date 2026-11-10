import { Refused, SignInRequired, attackOutpost, fetchDemoCity, fetchOutposts, runBattle } from './api.js';
import { describeWorst } from './defensePanel.js';
import { formatCountdown } from './forgePanel.js';
import { BUILDING_INFO, HERO_INFO, MATERIAL_INFO, PRIORITY_INFO, SIDE_INFO, TACTIC_INFO } from './labels.js';
import { createReplay } from './replay.js';
import { SQUAD_SIZE, isAvailable, launchBlocker, settleSquad, toggleHero } from './squad.js';

/**
 * "Attack": pick an outpost and 4 of your heroes, choose side, priority and
 * tactic, watch the replay, read the report with the loot.
 * Also replays the worst raid of a defence test (`watch`), then goes back.
 */

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'hexforge.attack';
const DEFAULT_SETUP = { side: 'south', priority: 'core', tactic: 'compact', outpost: 1, heroIds: [] };
const SPEEDS = [1, 2, 4];
const TAIL_SECONDS = 1.5;   // keep the last frame on screen before the report
const REFUSALS = {
    no_energy: 'No energy left. A charge comes back every hour.',
    hero_injured: 'One of your heroes is still injured.',
    outpost_locked: 'Beat the previous outpost first.',
    bad_squad: 'Pick 4 different heroes.',
    state_changed_retry: 'Your city changed meanwhile. Try again.',
};

export class BattleMode {
    constructor(renderer) {
        this.renderer = renderer;
        this.view = 'setup';          // setup | battle | result
        this.setup = loadSetup();
        this.data = null;             // /me/outposts answer
        this.receivedAt = 0;
        this.battle = null;
        this.replay = null;
        this.playTick = 0;
        this.speed = 0;
        this.paused = false;
        this.second = -1;
        this.onStateChanged = () => {};
        this.returnTo = null;         // set while replaying a defence test
        this.#wire();
    }

    async enter() {
        if (this.view === 'setup') await this.#reload();
        else this.renderer.setCity(this.battle.city);
        this.#show(this.view);
    }

    leave() {
        if (this.returnTo) {
            this.returnTo = null;
            this.view = 'setup';
        }
        for (const view of ['setup', 'battle', 'result']) $(`view-${view}`).hidden = true;
        $('hud').hidden = true;
    }

    frame(time, dt) {
        if (this.view === 'setup') {
            this.renderer.draw(null, { side: this.data ? this.setup.side : null, time });
            this.#tickSetup();
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

    /** Replay a raid on the player's own city (defence test); Back calls `onBack`. */
    watch(raid, onBack) {
        this.battle = { ...raid, rewards: null, defense: true };
        this.returnTo = onBack;
        this.#startReplay();
    }

    /**
     * Dev helper for screenshots: `?at=20` replays a test battle frozen at
     * second 20; `?at=end` opens its report. Uses the test city, so it
     * spends no energy and needs no sign-in.
     */
    async devJump(at) {
        const { city } = await fetchDemoCity();
        this.renderer.setCity(city);
        const squad = ['guardian', 'neon_blade', 'neon_blade', 'technomancer'];
        this.battle = { ...(await runBattle({ squad, side: this.setup.side, priority: this.setup.priority, tactic: this.setup.tactic })) };
        this.battle.rewards = null;
        this.#startReplay();
        if (at === 'end') {
            this.#showResult();
            return;
        }
        this.playTick = Number(at) * this.replay.tickRate;
        this.paused = true;
        $('btn-pause').textContent = 'Play';
    }

    // ── data ───────────────────────────────────────────────────────────
    async #reload() {
        try {
            this.#apply(await fetchOutposts());
            $('attack-signin').hidden = true;
            $('attack-body').hidden = false;
        } catch (error) {
            if (!(error instanceof SignInRequired)) throw error;
            this.data = null;
            this.renderer.setCity({ grid: 18, buildings: [] });
            $('attack-signin').hidden = false;
            $('attack-body').hidden = true;
        }
    }

    #apply(data) {
        this.data = data;
        this.receivedAt = performance.now();
        if (!data.outposts.some((o) => o.id === this.setup.outpost && o.unlocked)) this.setup.outpost = 1;
        this.setup.heroIds = settleSquad(this.setup.heroIds, data.heroes, this.#serverNow());
        this.renderer.setCity(this.#outpost().city);
        this.#renderSetup();
    }

    #serverNow() {
        return this.data.server_time + (performance.now() - this.receivedAt) / 1000;
    }

    #outpost() {
        return this.data?.outposts.find((o) => o.id === this.setup.outpost) ?? null;
    }

    // ── setup panel ────────────────────────────────────────────────────
    #wire() {
        $('btn-launch').addEventListener('click', () => void this.#launch());
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
        $('btn-new').addEventListener('click', () => {
            if (this.returnTo) {
                this.returnTo();
                return;
            }
            this.#show('setup');
            void this.#reload();
        });
    }

    #show(view) {
        this.view = view;
        for (const name of ['setup', 'battle', 'result']) $(`view-${name}`).hidden = name !== view;
        $('hud').hidden = view === 'setup';
    }

    #changed() {
        saveSetup(this.setup);
        this.renderer.setCity(this.#outpost().city);
        this.#renderSetup();
    }

    #renderSetup() {
        if (!this.data) return;
        this.#renderOutposts();
        this.#renderSquad();
        renderClassLegend();
        fillChoice('side', SIDE_INFO, (v) => v, this.setup, () => this.#changed());
        fillChoice('priority', PRIORITY_INFO, (v) => v.name, this.setup, () => this.#changed());
        fillChoice('tactic', TACTIC_INFO, (v) => v.name, this.setup, () => this.#changed());
        $('priority-hint').textContent = PRIORITY_INFO[this.setup.priority].hint;
        $('tactic-hint').textContent = TACTIC_INFO[this.setup.tactic].hint;
        this.second = -1;
        this.#tickSetup();
    }

    #renderOutposts() {
        const list = $('outposts');
        list.replaceChildren();
        for (const o of this.data.outposts) {
            const label = `${o.id}. ${o.name}${o.cleared ? ' ✓' : ''}`;
            const button = chip(label, o.id === this.setup.outpost, () => {
                this.setup.outpost = o.id;
                this.#changed();
            });
            button.disabled = !o.unlocked;
            if (!o.unlocked) button.title = 'Beat the previous outpost first';
            list.append(button);
        }
        const o = this.#outpost();
        const info = $('outpost-info');
        info.replaceChildren();
        const line = document.createElement('p');
        line.className = 'hint';
        line.textContent = `Difficulty ${'◆'.repeat(o.difficulty)}${'◇'.repeat(5 - o.difficulty)}`
            + ` · best ${o.best}%${o.cleared ? ' · cleared, loot halved' : ''}`;
        const lootRow = (label, amounts) => {
            const row = document.createElement('p');
            row.className = 'loot-line';
            const name = document.createElement('span');
            name.textContent = label;
            row.append(name, materialChips(amounts));
            return row;
        };
        info.append(line, lootRow('Loot if you win', o.loot_on_win), lootRow('If the core falls', o.loot_on_core));
    }

    #renderSquad() {
        const list = $('squad');
        list.replaceChildren();
        const now = this.#serverNow();
        const counts = {};
        for (const hero of this.data.heroes) {
            counts[hero.cls] = (counts[hero.cls] ?? 0) + 1;
            const info = HERO_INFO[hero.cls];
            const picked = this.setup.heroIds.includes(hero.id);
            const fit = isAvailable(hero, now);
            const label = fit ? `${info.name} #${counts[hero.cls]}` : `${info.name} #${counts[hero.cls]} · ${formatCountdown(hero.injured_until - now)}`;
            const button = chip(label, picked, () => {
                this.setup.heroIds = toggleHero(this.setup.heroIds, hero.id);
                saveSetup(this.setup);
                this.#renderSquad();
                this.second = -1;
                this.#tickSetup();
            }, info.color);
            button.disabled = !fit;
            if (!fit) button.title = 'Injured: back soon';
            list.append(button);
        }
        $('squad-count').textContent = `${this.setup.heroIds.length}/${SQUAD_SIZE}`;
    }

    /** Once a second: energy countdown, healing heroes, the launch button. */
    #tickSetup() {
        if (!this.data) return;
        const now = this.#serverNow();
        const second = Math.floor(now);
        if (second === this.second) return;
        const healed = this.data.heroes.some((h) => h.injured_until && h.injured_until > this.second && h.injured_until <= now);
        this.second = second;
        if (healed) this.#renderSquad();
        const energy = { ...this.data.energy };
        if (energy.next_at && now >= energy.next_at) {
            void this.#reload();
            return;
        }
        $('energy').textContent = `Energy ${energy.charges}/${energy.max}`
            + (energy.next_at ? ` · next in ${formatCountdown(energy.next_at - now)}` : ' · full');
        const blocker = launchBlocker({ outpost: this.#outpost(), picked: this.setup.heroIds, energy });
        $('btn-launch').disabled = Boolean(blocker);
        $('launch-hint').textContent = blocker ?? 'Costs 1 energy.';
    }

    // ── battle flow ────────────────────────────────────────────────────
    async #launch() {
        const button = $('btn-launch');
        button.disabled = true;
        button.textContent = 'Simulating…';
        $('error').hidden = true;
        try {
            const answer = await attackOutpost(this.setup.outpost, {
                hero_ids: this.setup.heroIds,
                side: this.setup.side,
                priority: this.setup.priority,
                tactic: this.setup.tactic,
            });
            this.battle = answer.battle;
            const data = { ...answer };
            delete data.battle;
            this.#apply(data);
            this.onStateChanged();
            this.renderer.setCity(this.battle.city);
            this.#startReplay();
        } catch (error) {
            $('error').textContent = error instanceof Refused
                ? (REFUSALS[error.code] ?? 'The server refused the attack.')
                : 'The battle server did not answer. Try again in a moment.';
            $('error').hidden = false;
            if (!(error instanceof Refused)) console.error('[Hexforge] attack failed', error);
        } finally {
            button.textContent = 'Launch attack';
            this.second = -1;
        }
    }

    #startReplay() {
        this.replay = createReplay(this.battle);
        this.playTick = 0;
        this.paused = false;
        $('btn-pause').textContent = 'Pause';
        $('battle-title').textContent = this.battle.defense ? 'Raiders' : 'Squad';
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
        const rewards = this.battle.rewards;
        const defense = Boolean(this.battle.defense);
        const won = defense ? !s.victory : s.victory;
        const verdict = $('verdict');
        verdict.textContent = verdictText(defense, won);
        verdict.className = `verdict ${won ? 'win' : 'loss'}`;

        const stats = $('stats');
        stats.replaceChildren();
        const row = (label, value) => {
            const dt = document.createElement('dt');
            dt.textContent = label;
            const dd = document.createElement('dd');
            dd.append(value);
            stats.append(dt, dd);
        };
        row('Destruction', `${s.destruction}%`);
        row('Core', s.core_destroyed ? 'Destroyed' : 'Standing');
        if (rewards) {
            const got = Object.values(rewards.loot).some((n) => n > 0);
            row('Loot', got ? materialChips(rewards.loot) : 'None');
            row('Injured', rewards.injured.length ? `${rewards.injured.length} hero${rewards.injured.length > 1 ? 'es' : ''}, back in 15 min` : 'Nobody');
        }
        row('Battle time', `${s.seconds} s`);
        row('First defence to fall', s.first_tower_lost ? BUILDING_INFO[s.first_tower_lost].name : '—');

        const note = $('result-note');
        const next = rewards?.unlocked && this.data?.outposts.find((o) => o.id === rewards.unlocked);
        if (defense) note.textContent = `Worst raid of the test: ${describeWorst(this.battle)}.`;
        else note.textContent = next ? `Outpost cleared! ${next.name} is now open.` : '';
        note.classList.toggle('plain', defense);
        note.hidden = !defense && !next;
        $('report-title').textContent = defense ? 'Raiders' : 'Squad report';
        $('btn-new').textContent = defense ? 'Back to my city' : 'Back';

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

function verdictText(defense, won) {
    if (defense) return won ? 'DEFENSE HELD' : 'DEFENSE BREACHED';
    return won ? 'VICTORY' : 'DEFEAT';
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

function renderClassLegend() {
    const classes = $('classes');
    if (classes.childElementCount) return;
    for (const info of Object.values(HERO_INFO)) {
        const item = document.createElement('li');
        item.style.setProperty('--accent', info.color);
        const title = document.createElement('b');
        title.textContent = info.name;
        item.append(title, ` · ${info.role}`);
        classes.append(item);
    }
}

function fillChoice(key, options, labelOf, setup, onChange) {
    const container = $(key);
    container.replaceChildren();
    for (const [value, info] of Object.entries(options)) {
        container.append(chip(labelOf(info), setup[key] === value, () => {
            setup[key] = value;
            onChange();
        }));
    }
}

function materialChips(amounts) {
    const wrap = document.createElement('span');
    wrap.className = 'costs';
    for (const [m, amount] of Object.entries(amounts)) {
        if (!amount) continue;
        const item = document.createElement('span');
        item.className = 'cost';
        item.style.setProperty('--accent', MATERIAL_INFO[m].color);
        item.title = MATERIAL_INFO[m].name;
        item.textContent = String(amount);
        wrap.append(item);
    }
    return wrap;
}

// The last setup is a convenience only: the game works without storage.
function loadSetup() {
    try {
        const saved = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
        if (saved && typeof saved === 'object') return { ...DEFAULT_SETUP, ...saved };
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
