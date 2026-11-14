import { Refused, attackOutpost, attackRival, findRival } from '../../net/api.js';
import { attackStarted } from '../../net/platform.js';
import { play } from '../../fx/audio.js';
import { formatCountdown } from '../../ui/panels/forgePanel.js';
import { icon, withIcon } from '../../ui/icons.js';
import { regionAround } from '../../core/iso.js';
import { CHOICE_ICONS, PRIORITY_INFO, TACTIC_INFO } from '../../data/labels.js';
import { LEAGUE_COLORS, rivalBlocker, stakesText } from '../../core/leagues.js';
import { usableBonuses } from '../../core/forge.js';
import { materialChips } from '../../ui/panels/rivalPanel.js';
import { toast } from '../../ui/sheets.js';
import { launchBlocker } from '../../core/squad.js';
import { $, EMPTY_CITY, saveSetup, loadSetup } from './shared.js';
import { REFUSALS } from '../../data/messages.js';

const PLAN_INSETS = { top: 150, right: 0, bottom: 300, left: 0 };

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

/** The attack plan: the target (an outpost or a player), the entry side, priority and formation, and Fight! */
export class AttackPlan {
    constructor(mode) {
        this.mode = mode;
        this.setup = loadSetup();
        this.error = '';
        this.sideButtons = {};
    }

    #outpost() {
        return this.mode.data?.outposts.find((o) => o.id === this.setup.outpost) ?? null;
    }

    #rivals() {
        return this.setup.mode === 'rivals';
    }

    #targetCity() {
        if (this.#rivals()) return this.mode.data.rival?.city ?? EMPTY_CITY;
        return this.#outpost().city;
    }

    /** Show the chosen target's city, framed between the plate and the tray. */
    setTarget() {
        const city = this.#targetCity();
        this.mode.renderer.setCity(city);
        this.mode.renderer.focus(regionAround(city.buildings, city.grid, 2.5, 10), PLAN_INSETS);
    }

    /** What the chosen target says against attacking it, or null. */
    #targetBlocker() {
        if (this.#rivals()) return rivalBlocker(this.mode.data.pvp, this.mode.data.rival);
        const o = this.#outpost();
        if (!o) return 'Choose an outpost';
        if (this.mode.data.world?.complete) return 'Every world is conquered!';
        if (o.cleared) return 'Already taken: an outpost falls only once';
        return o.unlocked ? null : 'Beat the previous outpost first';
    }

    changed(newTarget) {
        saveSetup(this.setup);
        this.error = '';
        if (newTarget) this.setTarget();
        this.renderSetup();
    }

    stepOutpost(step) {
        const ids = this.mode.data.outposts.map((o) => o.id);
        const at = ids.indexOf(this.setup.outpost) + step;
        if (at < 0 || at >= ids.length) return;
        this.setup.outpost = ids[at];
        this.changed(true);
    }

    cycle(key, options) {
        const values = Object.keys(options);
        this.setup[key] = values[(values.indexOf(this.setup[key]) + 1) % values.length];
        toast(`${options[this.setup[key]].name}: ${options[this.setup[key]].hint}.`);
        this.changed(false);
    }

    renderSetup() {
        if (!this.mode.data) return;
        for (const button of document.querySelectorAll('#target-mode [data-mode]')) {
            button.setAttribute('aria-pressed', String(button.dataset.mode === this.setup.mode));
        }
        if (this.#rivals()) this.#renderRivalPlate();
        else this.#renderOutpostPlate();
        this.mode.squadPicker.renderSquad();
        renderOption($('btn-priority'), 'Hit first', PRIORITY_INFO[this.setup.priority].name, CHOICE_ICONS.priority[this.setup.priority]);
        renderOption($('btn-tactic'), 'Formation', TACTIC_INFO[this.setup.tactic].name, CHOICE_ICONS.tactic[this.setup.tactic]);
        for (const [side, button] of Object.entries(this.sideButtons)) {
            const picked = side === this.setup.side;
            button.setAttribute('aria-pressed', String(picked));
            button.querySelector('.side-label')?.remove();
            if (picked) button.append(Object.assign(document.createElement('span'), { className: 'side-label', textContent: 'Enter here' }));
        }
        this.mode.second = -1;
        this.tickSetup();
    }

    #renderOutpostPlate() {
        const o = this.#outpost();
        const ids = this.mode.data.outposts.map((x) => x.id);
        $('btn-prev-target').hidden = false;
        $('btn-next-target').hidden = false;
        $('btn-prev-target').disabled = o.id === ids[0];
        $('btn-next-target').disabled = o.id === ids.at(-1);
        const plate = $('target-plate');
        plate.replaceChildren();
        const world = this.mode.data.world;
        const name = paragraph('target-name', o.name);
        const worlds = world ? `/${world.total}` : '';
        const sub = paragraph('target-sub', `World ${o.world}${worlds} · `);
        sub.append(Object.assign(document.createElement('span'), { className: 'pips', textContent: '◆'.repeat(o.stage) + '◇'.repeat(5 - o.stage) }));
        if (!o.unlocked) sub.append(' · ', icon('lock'), ' locked');
        else if (o.cleared) sub.append(' · ', icon('check'), ' taken');
        else if (o.best) sub.append(` · best ${o.best}%`);
        plate.append(name, sub);
        if (!o.cleared) plate.append(lootLine(o.loot_on_win));
    }

    #renderRivalPlate() {
        $('btn-prev-target').hidden = true;
        $('btn-next-target').hidden = true;
        const { pvp, rival } = this.mode.data;
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
            this.mode.apply(answer);
            if (!answer.rival) this.#showError('Nobody to raid right now: every rival is shielded. Try again later.');
        } catch (error) {
            this.#showError(error instanceof Refused ? (REFUSALS[error.code] ?? 'The server refused.') : 'The server did not answer. Try again in a moment.');
            button.disabled = false;
        }
    }

    #showError(text) {
        this.error = text;
        this.mode.second = -1;
        this.tickSetup();
    }

    /** Arrows on the four edges of the map, kept inside the screen. */
    placeSides() {
        if (!this.mode.data || !this.mode.renderer.camera) return;
        for (const [side, button] of Object.entries(this.sideButtons)) {
            const { x, y, angle } = this.mode.renderer.edgeAnchor(side);
            button.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            button.firstElementChild.style.transform = `rotate(${angle.toFixed(0)}deg)`;
        }
    }

    /** Once a second: energy, healing heroes, the Fight button and its hint. */
    tickSetup() {
        if (!this.mode.data) return;
        const now = this.mode.serverNow();
        const second = Math.floor(now);
        if (second === this.mode.second) return;
        const healed = this.mode.data.heroes.some((h) => h.injured_until && h.injured_until > this.mode.second && h.injured_until <= now);
        this.mode.second = second;
        if (healed) this.mode.squadPicker.renderSquad();
        else this.mode.squadPicker.tickHealing(now);
        const energy = { ...this.mode.data.energy };
        if (energy.next_at && now >= energy.next_at) {
            void this.mode.reload();
            return;
        }
        $('energy').replaceChildren(icon('bolt'), (energy.charges > energy.max ? String(energy.charges) : `${energy.charges}/${energy.max}`)
            + (energy.next_at ? ` · +1 in ${formatCountdown(energy.next_at - now)}` : ''));
        $('energy').classList.toggle('boostable', energy.charges < energy.max && usableBonuses('energy', this.mode.data.bonuses).length > 0);
        const blocker = launchBlocker({ blocked: this.#targetBlocker(), picked: this.setup.heroIds, energy });
        $('btn-launch').disabled = Boolean(blocker) || this.mode.busy;
        $('fight-cost').textContent = `1 energy of ${energy.charges}`;
        const hint = $('launch-hint');
        const ending = this.#rivals() && this.mode.data.pvp.shield_until && !blocker ? 'Attacking a player ends your shield.' : '';
        hint.textContent = this.error || blocker || ending;
        hint.classList.toggle('error', Boolean(this.error));
    }

    // ── battle flow ────────────────────────────────────────────────────
    async launch() {
        const button = $('btn-launch');
        button.disabled = true;
        this.mode.busy = true;
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
            attackStarted();
            const pvp = this.#rivals();
            const target = pvp ? null : this.#outpost()?.name;
            const answer = pvp ? await attackRival(setup) : await attackOutpost(this.setup.outpost, setup);
            this.mode.battle = answer.battle;
            // the platform hears of it when the replay is over (the "Post on Pings" button comes then)
            this.mode.replayView.ending = { pvp, opponent: answer.battle.rival ?? target ?? 'an outpost' };
            const data = { ...answer };
            delete data.battle;
            this.mode.apply(data);
            this.mode.onStateChanged();
            this.mode.renderer.setCity(this.mode.battle.city);
            this.mode.replayView.startReplay();
        } catch (error) {
            this.error = error instanceof Refused
                ? (REFUSALS[error.code] ?? 'The server refused the attack.')
                : 'The battle server did not answer. Try again in a moment.';
            play('error');
            if (!(error instanceof Refused)) console.error('[Hexforge] attack failed', error);
        } finally {
            this.mode.busy = false;
            button.firstElementChild.textContent = 'Fight!';
            this.mode.second = -1;
        }
    }
}
