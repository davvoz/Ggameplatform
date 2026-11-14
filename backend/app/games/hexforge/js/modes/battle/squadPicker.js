import { Refused, equipItem, unequipItem, useBonus } from '../../net/api.js';
import { openBonusPicker, openItemPicker } from '../../ui/bonusPicker.js';
import { play } from '../../fx/audio.js';
import { withIcon } from '../../ui/icons.js';
import { BONUS_INFO, HERO_INFO } from '../../data/labels.js';
import { usableBonuses } from '../../core/forge.js';
import { closeSheet, isSheetOpen, openSheet, toast } from '../../ui/sheets.js';
import { SQUAD_SIZE, toggleHero } from '../../core/squad.js';
import { formatHeal, heroNames, heroTile } from '../../ui/heroTiles.js';
import { heroStatus } from '../../core/heroes.js';
import { gearChoices, renderSquadCard } from '../../ui/panels/heroPanel.js';
import { $, saveSetup } from './shared.js';
import { REFUSALS } from '../../data/messages.js';

/** Picking the squad: hero tiles, a hero's card with its gear, and the bonuses that heal a hero or refill energy. */
export class SquadPicker {
    constructor(mode) {
        this.mode = mode;
    }

    /** Every hero you own, one tile each: tap a ready one to add it, a picked one to take it out. */
    renderSquad() {
        const list = $('squad');
        list.replaceChildren();
        const now = this.mode.serverNow();
        const names = heroNames(this.mode.data.heroes);
        const order = Object.keys(HERO_INFO);
        const heroes = this.mode.data.heroes.filter((h) => h.cls !== 'explorer').sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls) || a.id - b.id);
        for (const hero of heroes) {
            const status = heroStatus(hero, this.mode.plan.setup.heroIds.includes(hero.id), now);
            list.append(heroTile(hero, names.get(hero.id), status, () => this.#openHero(hero.id)));
        }
        const count = this.mode.plan.setup.heroIds.length;
        $('squad-count').textContent = `${count}/${SQUAD_SIZE}`;
        const pips = $('squad-pips');
        pips.replaceChildren(...Array.from({ length: SQUAD_SIZE }, (_, k) => {
            const pip = document.createElement('span');
            if (k < count) pip.className = 'full';
            return pip;
        }));
    }

    /** Heal countdowns and rings, updated in place so a tap is never lost to a redraw. */
    tickHealing(now) {
        for (const tile of $('squad').children) {
            const hero = this.mode.data.heroes.find((h) => h.id === Number(tile.dataset.hero));
            if (!hero || !tile.classList.contains('hurt')) continue;
            const status = heroStatus(hero, false, now);
            tile.querySelector('.ht-status').textContent = formatHeal(status.left);
            tile.style.setProperty('--healed', `${Math.round(status.healed * 100)}%`);
        }
    }

    /** A tap on a hero opens its card: fusion, mastery, stats, items, and the squad button. */
    #openHero(heroId) {
        play('click');
        this.heroId = heroId;
        openSheet('sheet-squad-hero', () => { this.heroId = null; }, { silent: true });
        this.#renderHeroCard();
    }

    #renderHeroCard() {
        if (this.heroId == null || !isSheetOpen('sheet-squad-hero')) return;
        const hero = this.mode.data.heroes.find((h) => h.id === this.heroId);
        if (!hero) {
            closeSheet();
            return;
        }
        const name = heroNames(this.mode.data.heroes).get(hero.id);
        const items = this.mode.data.items ?? [];
        const table = this.mode.data.item_table;
        const carried = items.filter((i) => i.hero === hero.id);
        const slotOf = (i) => table?.items[i.type]?.slot;
        const t = this.mode.data.training;
        const container = $('squad-hero-card');
        renderSquadCard(container, {
            hero, name, table: this.mode.data.evolution, stats: this.mode.data.hero_stats?.[String(hero.id)] ?? null,
            gear: table ? {
                weapon: carried.find((i) => slotOf(i) === 'weapon') ?? null,
                spell: carried.find((i) => slotOf(i) === 'spell') ?? null,
            } : null,
            itemTable: table,
            training: t ? { perLevel: t.mastery_per_level ?? 100, levels: t.mastery_levels ?? 10, bonus: t.mastery_bonus ?? 0.01 } : null,
        }, {
            onGear: hero.evolving ? null : (slot) => this.#pickGear(hero, name, slot, carried.find((i) => slotOf(i) === slot) ?? null),
        });
        container.append(this.#squadAction(hero, name));
    }

    /** The big button under the card: in, out, heal, or why not. */
    #squadAction(hero, name) {
        const now = this.mode.serverNow();
        const { state, left } = heroStatus(hero, this.mode.plan.setup.heroIds.includes(hero.id), now);
        const box = document.createElement('div');
        box.className = 'squad-action';
        const button = document.createElement('button');
        button.type = 'button';
        const note = document.createElement('small');
        note.className = 'evolve-note';
        if (state === 'picked') {
            button.className = 'button wide';
            withIcon(button, 'close', 'Take out of the squad');
            button.addEventListener('click', () => this.#cardPick(hero, name));
        } else if (state === 'ready') {
            const full = this.mode.plan.setup.heroIds.length >= SQUAD_SIZE;
            button.className = 'button primary wide';
            withIcon(button, 'check', 'Add to the squad');
            button.disabled = full;
            note.textContent = full ? `The squad is full (${SQUAD_SIZE}): take a hero out first.` : `${this.mode.plan.setup.heroIds.length}/${SQUAD_SIZE} in the squad.`;
            button.addEventListener('click', () => this.#cardPick(hero, name));
        } else if (state === 'hurt') {
            const salve = usableBonuses('hero', this.mode.data.bonuses).length > 0;
            button.className = 'button primary wide';
            withIcon(button, 'plus', salve ? 'Heal now' : `Healing: ${formatHeal(left)}`);
            button.disabled = !salve;
            note.textContent = salve ? `Ready again in ${formatHeal(left)} by itself, or now with a bonus.` : 'Salves from the daily rewards heal at once.';
            button.addEventListener('click', () => {
                closeSheet({ silent: true });
                this.#tapHero(hero, name);
            });
        } else {
            button.className = 'button wide';
            withIcon(button, 'anvil', hero.fusing ? 'Fusing at the forge' : 'Evolving at the forge');
            button.disabled = true;
        }
        box.append(button, note);
        return box;
    }

    /** The same item picker as the Forge's hero card. */
    #pickGear(hero, name, slot, current) {
        openItemPicker({
            ...gearChoices({
                items: this.mode.data.items ?? [], table: this.mode.data.item_table, names: heroNames(this.mode.data.heroes),
                hero, name, slot, current,
            }),
            onPick: (id) => void this.#gear(() => equipItem(hero.id, id), 'Equipped.'),
            onClear: current ? () => void this.#gear(() => unequipItem(current.id), 'Back in the armoury.') : null,
        });
    }

    async #gear(call, line) {
        if (this.mode.busy) return;
        this.mode.busy = true;
        try {
            this.mode.data = { ...this.mode.data, ...(await call()) };      // keeps the outposts and the rival
            this.mode.receivedAt = performance.now();
            play('place');
            toast(line);
            this.mode.onStateChanged();
            this.renderSquad();
            this.#renderHeroCard();
        } catch (error) {
            if (!(error instanceof Refused)) throw error;
            play('error');
            toast(REFUSALS[error.code] ?? 'That did not work.');
        } finally {
            this.mode.busy = false;
        }
    }

    #cardPick(hero, name) {
        this.#tapHero(hero, name);
        closeSheet();
    }

    #tapHero(hero, name) {
        const now = this.mode.serverNow();
        const { state, left } = heroStatus(hero, this.mode.plan.setup.heroIds.includes(hero.id), now);
        if (state === 'forge') {
            play('error');
            toast(`${name} is evolving at the forge.`);
            return;
        }
        if (state === 'hurt') {
            if (usableBonuses('hero', this.mode.data.bonuses).length) {
                this.#pickBonus('hero', { hero_id: hero.id }, `Heal ${name}`, `ready again in ${formatHeal(left)}`);
                return;
            }
            play('error');
            toast(`${name} is healing: ready again in ${formatHeal(left)}.`);
            return;
        }
        if (state === 'ready' && this.mode.plan.setup.heroIds.length >= SQUAD_SIZE) {
            play('error');
            toast(`The squad is full (${SQUAD_SIZE}). Tap a hero in the squad to take it out first.`);
            return;
        }
        if (state === 'ready') toast(`${name} joins the squad. ${HERO_INFO[hero.cls].what}`);
        this.#pick(toggleHero(this.mode.plan.setup.heroIds, hero.id));
    }

    /** The energy pill: a flask or an hourglass brings a charge sooner. */
    tapEnergy() {
        const energy = this.mode.data?.energy;
        if (!energy) return;
        if (energy.charges >= energy.max) {
            toast('Your energy is full. Each attack costs 1, and a charge comes back every hour.');
            return;
        }
        if (!usableBonuses('energy', this.mode.data.bonuses).length) {
            toast('A charge comes back every hour. Energy flasks from the daily rewards give one at once.');
            return;
        }
        this.#pickBonus('energy', { energy: true }, 'More energy', `${energy.charges}/${energy.max} charges`);
    }

    #pickBonus(target, payload, title, line) {
        openBonusPicker({
            title, line, options: usableBonuses(target, this.mode.data.bonuses), owned: this.mode.data.bonuses,
            onPick: (bonus) => void this.#useBonus(bonus, payload),
        });
    }

    async #useBonus(bonus, payload) {
        if (this.mode.busy) return;
        this.mode.busy = true;
        try {
            const state = await useBonus(bonus, payload);
            this.mode.data = { ...this.mode.data, ...state };      // keeps the outposts and the rival
            this.mode.receivedAt = performance.now();
            play('boost');
            toast(`${BONUS_INFO[bonus].name}: ${BONUS_INFO[bonus].effect}.`);
            this.mode.onStateChanged();
            this.renderSquad();
            this.mode.second = -1;
            this.mode.plan.tickSetup();
        } catch (error) {
            if (!(error instanceof Refused)) throw error;
            play('error');
            toast(REFUSALS[error.code] ?? 'That did not work.');
        } finally {
            this.mode.busy = false;
        }
    }

    #pick(heroIds) {
        this.mode.plan.setup.heroIds = heroIds;
        saveSetup(this.mode.plan.setup);
        this.renderSquad();
        this.mode.second = -1;
        this.mode.plan.tickSetup();
    }
}
