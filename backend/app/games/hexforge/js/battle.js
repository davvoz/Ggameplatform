import { Refused, SignInRequired, attackOutpost, attackRival, fetchDemoCity, fetchOutposts, findRival, runBattle } from './api.js';
import { play, playBattleEvent, setMode as setMusic } from './audio.js';
import { formatCountdown } from './forgePanel.js';
import { icon, withIcon } from './icons.js';
import { regionAround } from './iso.js';
import { CHOICE_ICONS, HERO_INFO, MATERIAL_INFO, PRIORITY_INFO, SIDE_INFO, TACTIC_INFO } from './labels.js';
import { LEAGUE_COLORS, signed, stakesText } from './leagues.js';
import { createReplay } from './replay.js';
import { materialChips, rivalBlocker } from './rivalPanel.js';
import { toast } from './sheets.js';
import { SQUAD_SIZE, launchBlocker, settleSquad, toggleHero } from './squad.js';
import { formatHeal, heroNames, heroStatus, heroTile } from './heroTiles.js';
import { heroThumb, thumbImg } from './thumbs.js';

/**
 * "Attack", full screen on the target's city:
 *  - plan: outpost or player, entry side (arrows on the map), squad of 4,
 *    what to hit first, formation, Fight!
 *  - battle: the replay with the squad's health at the bottom
 *  - result: a big verdict, destruction, loot
 * Also replays raids on the player's own city (`watch`), then goes back.
 */

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'hexforge.attack';
const DEFAULT_SETUP = { mode: 'outposts', side: 'south', priority: 'core', tactic: 'compact', outpost: 1, heroIds: [] };
const MODES = ['outposts', 'rivals'];
const SIDES = ['north', 'east', 'south', 'west'];
const EMPTY_CITY = { grid: 18, buildings: [] };
const SPEEDS = [1, 2, 4];
const TAIL_SECONDS = 1.5;   // keep the last frame on screen before the report
const PLAN_INSETS = { top: 150, right: 0, bottom: 300, left: 0 };
const BATTLE_INSETS = { top: 70, right: 0, bottom: 110, left: 0 };
const REFUSALS = {
    no_energy: 'No energy left. A charge comes back every hour.',
    hero_injured: 'One of your heroes is still injured.',
    outpost_locked: 'Beat the previous outpost first.',
    bad_squad: 'Pick 4 different heroes.',
    arena_locked: 'Clear Scrap Hollow to enter the arena.',
    no_rival: 'Find a rival first.',
    rival_unavailable: 'That rival just got a shield. Find another one.',
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
        this.soundTick = 0;           // the last tick whose sounds have been played
        this.speed = 0;
        this.paused = false;
        this.second = -1;
        this.busy = false;
        this.error = '';
        this.onStateChanged = () => {};
        this.onExit = () => {};       // set by the shell: back to the city
        this.returnTo = null;         // set while replaying a raid on the player's city
        this.sideButtons = {};
        this.#wire();
    }

    async enter() {
        this.renderer.setRotation(0);        // other cities are always seen from the same side
        if (this.view === 'setup') await this.#reload();
        else this.renderer.setCity(this.battle.city);
        this.#show(this.view);
    }

    leave() {
        if (this.returnTo) {
            this.returnTo = null;
            this.view = 'setup';
        }
        for (const id of ['hud-attack', 'hud-battle', 'result']) $(id).hidden = true;
    }

    frame(time, dt) {
        if (this.view === 'setup') {
            this.renderer.draw(null, { side: this.data ? this.setup.side : null, time, ranges: 'all' });
            this.#placeSides();
            this.#tickSetup();
            return;
        }
        if (this.view === 'battle' && !this.paused) {
            this.playTick += dt * this.replay.tickRate * SPEEDS[this.speed];
            this.#sounds();
        }
        const state = this.replay.stateAt(this.playTick);
        this.renderer.draw(state, { time });
        this.#updateHud(state);
        if (this.view === 'battle') {
            this.#updateHeroList(state);
            if (this.playTick >= this.replay.duration + TAIL_SECONDS * this.replay.tickRate) this.#showResult();
        }
    }

    onEscape() {
        if (this.view === 'setup') this.onExit();
    }

    /** Replay a raid on the player's own city (defence test or a real raid); Back calls `onBack`. */
    watch(raid, onBack, note = '') {
        this.battle = { ...raid, rewards: null, defense: true, note };
        this.returnTo = onBack;
        this.#startReplay();
    }

    /** Open the plan on the Players side (after a revenge has scouted the raider). */
    showRivals() {
        this.setup.mode = 'rivals';
        saveSetup(this.setup);
        this.returnTo = null;
        this.view = 'setup';
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
        this.soundTick = this.playTick;
        this.paused = true;
        this.#renderPause();
    }

    // ── data ───────────────────────────────────────────────────────────
    async #reload() {
        try {
            this.#apply(await fetchOutposts());
            $('attack-signin').hidden = true;
            this.#showPlan(true);
        } catch (error) {
            if (!(error instanceof SignInRequired)) throw error;
            this.data = null;
            this.renderer.setCity(EMPTY_CITY);
            $('attack-signin').hidden = false;
            this.#showPlan(false);
        }
    }

    #showPlan(signedIn) {
        for (const id of ['attack-tray', 'sides', 'target-mode', 'energy']) $(id).hidden = !signedIn;
        document.querySelector('#hud-attack .target-row').hidden = !signedIn;
    }

    #apply(data) {
        this.data = data;
        this.receivedAt = performance.now();
        if (!data.outposts.some((o) => o.id === this.setup.outpost && o.unlocked)) this.setup.outpost = 1;
        this.setup.heroIds = settleSquad(this.setup.heroIds, data.heroes, this.#serverNow());
        if (!MODES.includes(this.setup.mode)) this.setup.mode = 'outposts';
        this.#setTarget();
        this.#renderSetup();
    }

    #serverNow() {
        return this.data.server_time + (performance.now() - this.receivedAt) / 1000;
    }

    #outpost() {
        return this.data?.outposts.find((o) => o.id === this.setup.outpost) ?? null;
    }

    #rivals() {
        return this.setup.mode === 'rivals';
    }

    #targetCity() {
        if (this.#rivals()) return this.data.rival?.city ?? EMPTY_CITY;
        return this.#outpost().city;
    }

    /** Show the chosen target's city, framed between the plate and the tray. */
    #setTarget() {
        const city = this.#targetCity();
        this.renderer.setCity(city);
        this.renderer.focus(regionAround(city.buildings, city.grid, 2.5, 10), PLAN_INSETS);
    }

    /** What the chosen target says against attacking it, or null. */
    #targetBlocker() {
        if (this.#rivals()) return rivalBlocker(this.data.pvp, this.data.rival);
        const o = this.#outpost();
        if (!o) return 'Choose an outpost';
        return o.unlocked ? null : 'Beat the previous outpost first';
    }

    // ── the plan ───────────────────────────────────────────────────────
    #wire() {
        $('btn-attack-back').addEventListener('click', () => this.onExit());
        for (const button of document.querySelectorAll('#target-mode [data-mode]')) {
            button.addEventListener('click', () => {
                if (this.setup.mode === button.dataset.mode) return;
                this.setup.mode = button.dataset.mode;
                this.#changed(true);
            });
        }
        $('btn-prev-target').addEventListener('click', () => this.#stepOutpost(-1));
        $('btn-next-target').addEventListener('click', () => this.#stepOutpost(1));
        $('btn-priority').addEventListener('click', () => this.#cycle('priority', PRIORITY_INFO));
        $('btn-tactic').addEventListener('click', () => this.#cycle('tactic', TACTIC_INFO));
        $('btn-launch').addEventListener('click', () => void this.#launch());
        for (const side of SIDES) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'side';
            button.dataset.side = side;
            button.setAttribute('aria-label', `Enter from the ${SIDE_INFO[side].toLowerCase()}`);
            button.append(icon('arrow'));
            button.addEventListener('click', () => {
                this.setup.side = side;
                this.#changed(false);
            });
            this.sideButtons[side] = button;
            $('sides').append(button);
        }
        $('btn-pause').addEventListener('click', () => {
            this.paused = !this.paused;
            this.#renderPause();
        });
        $('btn-speed').addEventListener('click', () => {
            this.speed = (this.speed + 1) % SPEEDS.length;
            $('btn-speed').firstElementChild.textContent = `${SPEEDS[this.speed]}×`;
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
        setMusic(view === 'battle' ? 'battle' : 'city');
        $('hud-attack').hidden = view !== 'setup';
        $('hud-battle').hidden = view !== 'battle';
        $('result').hidden = view !== 'result';
    }

    #changed(newTarget) {
        saveSetup(this.setup);
        this.error = '';
        if (newTarget) this.#setTarget();
        this.#renderSetup();
    }

    #stepOutpost(step) {
        const ids = this.data.outposts.map((o) => o.id);
        const at = ids.indexOf(this.setup.outpost) + step;
        if (at < 0 || at >= ids.length) return;
        this.setup.outpost = ids[at];
        this.#changed(true);
    }

    #cycle(key, options) {
        const values = Object.keys(options);
        this.setup[key] = values[(values.indexOf(this.setup[key]) + 1) % values.length];
        toast(`${options[this.setup[key]].name}: ${options[this.setup[key]].hint}.`);
        this.#changed(false);
    }

    #renderSetup() {
        if (!this.data) return;
        for (const button of document.querySelectorAll('#target-mode [data-mode]')) {
            button.setAttribute('aria-pressed', String(button.dataset.mode === this.setup.mode));
        }
        if (this.#rivals()) this.#renderRivalPlate();
        else this.#renderOutpostPlate();
        this.#renderSquad();
        renderOption($('btn-priority'), 'Hit first', PRIORITY_INFO[this.setup.priority].name, CHOICE_ICONS.priority[this.setup.priority]);
        renderOption($('btn-tactic'), 'Formation', TACTIC_INFO[this.setup.tactic].name, CHOICE_ICONS.tactic[this.setup.tactic]);
        for (const [side, button] of Object.entries(this.sideButtons)) {
            const picked = side === this.setup.side;
            button.setAttribute('aria-pressed', String(picked));
            button.querySelector('.side-label')?.remove();
            if (picked) button.append(Object.assign(document.createElement('span'), { className: 'side-label', textContent: 'Enter here' }));
        }
        this.second = -1;
        this.#tickSetup();
    }

    #renderOutpostPlate() {
        const o = this.#outpost();
        const ids = this.data.outposts.map((x) => x.id);
        $('btn-prev-target').hidden = false;
        $('btn-next-target').hidden = false;
        $('btn-prev-target').disabled = o.id === ids[0];
        $('btn-next-target').disabled = o.id === ids.at(-1);
        const plate = $('target-plate');
        plate.replaceChildren();
        const name = paragraph('target-name', o.name);
        const sub = paragraph('target-sub', `Outpost ${o.id} · `);
        sub.append(Object.assign(document.createElement('span'), { className: 'pips', textContent: '◆'.repeat(o.difficulty) + '◇'.repeat(5 - o.difficulty) }));
        if (!o.unlocked) sub.append(' · ', icon('lock'), ' locked');
        else if (o.cleared) sub.append(` · best ${o.best}% · loot halved`);
        else if (o.best) sub.append(` · best ${o.best}%`);
        plate.append(name, sub, lootLine(o.loot_on_win));
    }

    #renderRivalPlate() {
        $('btn-prev-target').hidden = true;
        $('btn-next-target').hidden = true;
        const { pvp, rival } = this.data;
        const plate = $('target-plate');
        plate.replaceChildren();
        if (!pvp.arena) {
            plate.append(paragraph('target-name', 'Arena locked'), paragraph('target-sub', 'Clear the first outpost, Scrap Hollow, to raid players.'));
            return;
        }
        const find = document.createElement('button');
        find.type = 'button';
        find.className = `button small${rival ? '' : ' primary'}`;
        withIcon(find, 'search', rival ? 'Find another' : 'Find a rival');
        find.addEventListener('click', () => void this.#findRival(find));
        if (!rival) {
            plate.append(paragraph('target-name', 'Find a rival'), paragraph('target-sub', 'A player of similar strength. Their vault keeps 400 of each material safe.'), find);
            return;
        }
        const name = paragraph('target-name', rival.name);
        const sub = paragraph('target-sub', `${rival.trophies} trophies · `);
        const league = Object.assign(document.createElement('b'), { textContent: rival.league });
        league.style.color = LEAGUE_COLORS[rival.league];
        sub.append(league, ` · ${stakesText(rival.stakes)}`);
        plate.append(name, sub, lootLine(rival.loot_on_win));
        if (!rival.available) plate.append(paragraph('error', 'Shielded now: find another rival.'));
        plate.append(find);
    }

    async #findRival(button) {
        button.disabled = true;
        this.error = '';
        try {
            const answer = await findRival();
            this.#apply(answer);
            if (!answer.rival) this.#showError('Nobody to raid right now: every rival is shielded. Try again later.');
        } catch (error) {
            this.#showError(error instanceof Refused ? (REFUSALS[error.code] ?? 'The server refused.') : 'The server did not answer. Try again in a moment.');
            button.disabled = false;
        }
    }

    #showError(text) {
        this.error = text;
        this.second = -1;
        this.#tickSetup();
    }

    /** Every hero you own, one tile each: tap a ready one to add it, a picked one to take it out. */
    #renderSquad() {
        const list = $('squad');
        list.replaceChildren();
        const now = this.#serverNow();
        const names = heroNames(this.data.heroes);
        const order = Object.keys(HERO_INFO);
        const heroes = [...this.data.heroes].sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls) || a.id - b.id);
        for (const hero of heroes) {
            const status = heroStatus(hero, this.setup.heroIds.includes(hero.id), now);
            list.append(heroTile(hero, names.get(hero.id), status, () => this.#tapHero(hero, names.get(hero.id))));
        }
        const count = this.setup.heroIds.length;
        $('squad-count').textContent = `${count}/${SQUAD_SIZE}`;
        const pips = $('squad-pips');
        pips.replaceChildren(...Array.from({ length: SQUAD_SIZE }, (_, k) => {
            const pip = document.createElement('span');
            if (k < count) pip.className = 'full';
            return pip;
        }));
    }

    /** Heal countdowns and rings, updated in place so a tap is never lost to a redraw. */
    #tickHealing(now) {
        for (const tile of $('squad').children) {
            const hero = this.data.heroes.find((h) => h.id === Number(tile.dataset.hero));
            if (!hero || !tile.classList.contains('hurt')) continue;
            const status = heroStatus(hero, false, now);
            tile.querySelector('.ht-status').textContent = formatHeal(status.left);
            tile.style.setProperty('--healed', `${Math.round(status.healed * 100)}%`);
        }
    }

    #tapHero(hero, name) {
        const now = this.#serverNow();
        const { state, left } = heroStatus(hero, this.setup.heroIds.includes(hero.id), now);
        if (state === 'hurt') {
            play('error');
            toast(`${name} is healing: ready again in ${formatHeal(left)}.`);
            return;
        }
        if (state === 'ready' && this.setup.heroIds.length >= SQUAD_SIZE) {
            play('error');
            toast(`The squad is full (${SQUAD_SIZE}). Tap a hero in the squad to take it out first.`);
            return;
        }
        if (state === 'ready') toast(`${name} joins the squad. ${HERO_INFO[hero.cls].what}`);
        this.#pick(toggleHero(this.setup.heroIds, hero.id));
    }

    #pick(heroIds) {
        this.setup.heroIds = heroIds;
        saveSetup(this.setup);
        this.#renderSquad();
        this.second = -1;
        this.#tickSetup();
    }

    /** Arrows on the four edges of the map, kept inside the screen. */
    #placeSides() {
        if (!this.data || !this.renderer.camera) return;
        for (const [side, button] of Object.entries(this.sideButtons)) {
            const { x, y, angle } = this.renderer.edgeAnchor(side);
            button.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            button.firstElementChild.style.transform = `rotate(${angle.toFixed(0)}deg)`;
        }
    }

    /** Once a second: energy, healing heroes, the Fight button and its hint. */
    #tickSetup() {
        if (!this.data) return;
        const now = this.#serverNow();
        const second = Math.floor(now);
        if (second === this.second) return;
        const healed = this.data.heroes.some((h) => h.injured_until && h.injured_until > this.second && h.injured_until <= now);
        this.second = second;
        if (healed) this.#renderSquad();
        else this.#tickHealing(now);
        const energy = { ...this.data.energy };
        if (energy.next_at && now >= energy.next_at) {
            void this.#reload();
            return;
        }
        $('energy').replaceChildren(icon('bolt'), (energy.charges > energy.max ? String(energy.charges) : `${energy.charges}/${energy.max}`)
            + (energy.next_at ? ` · +1 in ${formatCountdown(energy.next_at - now)}` : ''));
        const blocker = launchBlocker({ blocked: this.#targetBlocker(), picked: this.setup.heroIds, energy });
        $('btn-launch').disabled = Boolean(blocker) || this.busy;
        $('fight-cost').textContent = `1 energy of ${energy.charges}`;
        const hint = $('launch-hint');
        const ending = this.#rivals() && this.data.pvp.shield_until && !blocker ? 'Attacking a player ends your shield.' : '';
        hint.textContent = this.error || blocker || ending;
        hint.classList.toggle('error', Boolean(this.error));
    }

    // ── battle flow ────────────────────────────────────────────────────
    async #launch() {
        const button = $('btn-launch');
        button.disabled = true;
        this.busy = true;
        button.firstElementChild.textContent = '…';
        this.error = '';
        play('horn');
        try {
            const setup = {
                hero_ids: this.setup.heroIds,
                side: this.setup.side,
                priority: this.setup.priority,
                tactic: this.setup.tactic,
            };
            const answer = this.#rivals() ? await attackRival(setup) : await attackOutpost(this.setup.outpost, setup);
            this.battle = answer.battle;
            const data = { ...answer };
            delete data.battle;
            this.#apply(data);
            this.onStateChanged();
            this.renderer.setCity(this.battle.city);
            this.#startReplay();
        } catch (error) {
            this.error = error instanceof Refused
                ? (REFUSALS[error.code] ?? 'The server refused the attack.')
                : 'The battle server did not answer. Try again in a moment.';
            play('error');
            if (!(error instanceof Refused)) console.error('[Hexforge] attack failed', error);
        } finally {
            this.busy = false;
            button.firstElementChild.textContent = 'Fight!';
            this.second = -1;
        }
    }

    /** Play what happened since the last frame, in the order it happened. */
    #sounds() {
        const from = this.soundTick;
        const to = Math.min(this.playTick, this.replay.duration);
        this.soundTick = to;
        if (to - from > 25) return;   // a jump (skip, or the tab was asleep): stay quiet
        for (const e of this.replay.events) {
            if (e.t > to) break;
            if (e.t <= from) continue;
            playBattleEvent(e, this.replay.squad[e.hero]?.cls);
        }
    }

    #startReplay() {
        toast('');
        this.replay = createReplay(this.battle);
        this.playTick = 0;
        this.soundTick = 0;
        this.paused = false;
        this.#renderPause();
        const city = this.battle.city;
        this.renderer.setCity(city);
        this.renderer.focus(regionAround(city.buildings, city.grid, 2.5, 10), BATTLE_INSETS);
        $('battle-title').textContent = this.battle.defense ? 'Raiders' : 'Your squad';
        this.#buildHeroList();
        this.#show('battle');
    }

    #renderPause() {
        const button = $('btn-pause');
        button.replaceChildren(icon(this.paused ? 'play' : 'pause'));
        button.setAttribute('aria-label', this.paused ? 'Play' : 'Pause');
    }

    #buildHeroList() {
        const list = $('hero-list');
        list.replaceChildren();
        for (const hero of this.battle.squad) list.append(heroChip(hero.cls));
    }

    #updateHeroList(state) {
        const chips = $('hero-list').children;
        state.heroes.forEach((hero, i) => {
            const chip = chips[i];
            if (!chip) return;
            chip.classList.toggle('down', !hero.alive);
            chip.querySelector('.bar div').style.width = `${(100 * hero.hp) / hero.maxHp}%`;
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
        this.playTick = this.replay.duration + TAIL_SECONDS * this.replay.tickRate;
        const s = this.battle.summary;
        const rewards = this.battle.rewards;
        const defense = Boolean(this.battle.defense);
        const won = defense ? !s.victory : s.victory;
        $('result').className = `result ${won ? 'win' : 'loss'}`;
        play(won ? 'victory' : 'defeat');
        $('verdict').textContent = verdictText(defense, won);
        const next = rewards?.unlocked && this.data?.outposts.find((o) => o.id === rewards.unlocked);
        $('result-note').textContent = resultNote(this.battle, next);
        $('result-ring').style.setProperty('--done', `${s.destruction}%`);
        $('result-percent').textContent = `${s.destruction}%`;

        const badges = $('result-badges');
        badges.replaceChildren();
        const badge = (text, kind, iconName) => {
            const span = document.createElement('span');
            span.className = kind;
            if (iconName) span.append(icon(iconName));
            span.append(text);
            badges.append(span);
        };
        badge(s.core_destroyed ? 'Core destroyed' : 'Core standing', s.core_destroyed === !defense ? 'good' : 'bad', s.core_destroyed ? 'flame' : 'shield');
        if (next) badge(`${next.name} unlocked`, 'good', 'lock');
        if (rewards?.trophies !== undefined) badge(`${signed(rewards.trophies)} trophies`, rewards.trophies >= 0 ? 'good' : 'bad', 'trophy');
        if (rewards?.injured.length) badge(`${rewards.injured.length} hurt · back in 15 min`, 'bad', 'hero');

        const loot = $('result-loot');
        loot.replaceChildren();
        let delay = 0;
        for (const [m, amount] of Object.entries(rewards?.loot ?? {})) {
            if (!amount) continue;
            const info = MATERIAL_INFO[m];
            const tile = document.createElement('div');
            tile.className = 'loot-tile';
            tile.style.setProperty('--accent', info.color);
            tile.style.animationDelay = `${0.3 + delay}s`;
            tile.title = info.name;
            tile.append(icon(info.icon), `+${amount}`);
            loot.append(tile);
            delay += 0.12;
        }

        const report = $('report');
        report.replaceChildren();
        for (const hero of s.heroes) {
            const chip = heroChip(hero.cls, `${hero.dealt} dmg`);
            chip.classList.toggle('down', !hero.survived);
            chip.title = `${HERO_INFO[hero.cls].name}: dealt ${hero.dealt}, took ${hero.taken}${hero.survived ? '' : ', down'}`;
            report.append(chip);
        }
        const gotLoot = loot.childElementCount > 0;
        $('btn-new').firstElementChild.textContent = defense ? 'Back to my city' : (gotLoot ? 'Collect' : 'Continue');
        this.#show('result');
    }
}

function resultNote(battle, unlocked) {
    if (battle.defense) return battle.note;
    if (battle.rival) return battle.summary.victory ? `You raided ${battle.rival}!` : `${battle.rival}'s core still stands`;
    if (unlocked) return 'Outpost cleared!';
    return battle.summary.victory ? 'The core has fallen' : 'The core still stands: bring it down to win';
}

function verdictText(defense, won) {
    if (defense) return won ? 'Defense held' : 'Breached';
    return won ? 'Victory' : 'Defeat';
}

function heroChip(cls, caption = null) {
    const info = HERO_INFO[cls];
    const chip = document.createElement('div');
    chip.className = 'hero-chip';
    chip.style.setProperty('--accent', info.color);
    chip.title = info.name;
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('div');
    fill.style.width = '100%';
    bar.append(fill);
    chip.append(thumbImg(heroThumb(cls, 46), '', info.name), bar);
    if (caption) chip.append(caption);
    return chip;
}

function renderOption(button, label, value, iconName) {
    const text = document.createElement('span');
    text.append(Object.assign(document.createElement('small'), { textContent: label }), Object.assign(document.createElement('b'), { textContent: value }));
    button.replaceChildren(icon(iconName), text);
    button.setAttribute('aria-label', `${label}: ${value}. Tap to change`);
}

function paragraph(className, text) {
    return Object.assign(document.createElement('p'), { className, textContent: text });
}

function lootLine(amounts) {
    const line = paragraph('target-loot', 'Loot if the core falls');
    const got = Object.values(amounts).some((n) => n > 0);
    line.append(got ? materialChips(amounts) : ' · nothing above their vault');
    return line;
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
