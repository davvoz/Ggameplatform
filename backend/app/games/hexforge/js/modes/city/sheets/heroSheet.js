import {
    trainHero, evolveHero, equipItem, unequipItem, sendExplorer, explorerReturn, dismissHero, upgradeItem,
} from '../../../net/api.js';
import { canFuse } from '../../../core/fusion.js';
import { openItemPicker } from '../../../ui/bonusPicker.js';
import { play } from '../../../fx/audio.js';
import { rewardPop } from '../../../fx/fx.js';
import { gearChoices, giftText, renderHeroCard } from '../../../ui/panels/heroPanel.js';
import { openTraining } from '../../../minigames/training.js';
import { heroNames } from '../../../ui/heroTiles.js';
import { withIcon } from '../../../ui/icons.js';
import { BONUS_INFO, FORM_INFO, HERO_INFO, ITEM_INFO, MISSION_INFO, times } from '../../../data/labels.js';
import { closeSheet, isSheetOpen, openSheet, toast } from '../../../ui/sheets.js';
import { heroPortrait, heroThumb, itemPicture } from '../../../render/thumbs.js';
import { $ } from '../shared.js';
import { dismissBlocker } from '../../../core/cityRules.js';

/** The card for what an Explorer brought home. */
function lootCard(name, loot) {
    const parts = [];
    const total = Object.values(loot.materials).reduce((a, b) => a + b, 0);
    parts.push(`+${total} materials`);
    for (const [bonus, n] of Object.entries(loot.bonuses)) parts.push(BONUS_INFO[bonus].name + times(n));
    if (loot.item) parts.push(`${ITEM_INFO[loot.item].name}!`);
    return {
        src: loot.item ? itemPicture(loot.item, 150) : heroThumb('explorer', 150),
        title: `${name} is back!`, line: parts.join(' · '), color: HERO_INFO.explorer.color,
    };
}

/** A hero's card: evolve, gear, training, missions, dismissal. */
export class HeroSheet {
    constructor(city) {
        this.city = city;
        this.heroId = null;               // the hero whose card is open
        this.heroForm = null;             // the form picked on it so far
    }

    // ── hero card ──────────────────────────────────────────────────────
    openHero(heroId) {
        if (!this.city.state) return;
        this.heroId = heroId;
        this.heroForm = null;
        this.dismissing = false;
        openSheet('sheet-hero', () => {
            this.heroId = null;
            this.city.forgeSheet.forgeKind = 'hero';
            // back to the forge's heroes, unless another sheet took over or the city was left
            setTimeout(() => {
                if (!isSheetOpen() && !$('hud-city').hidden) this.city.forgeSheet.openForge(true);   // the close already sounded
            }, 0);
        });
        this.renderHero();
    }

    renderHero() {
        if (this.heroId === null || !isSheetOpen('sheet-hero')) return;
        const hero = this.city.state.heroes.find((h) => h.id === this.heroId);
        if (!hero) {
            closeSheet();
            return;
        }
        const name = heroNames(this.city.state.heroes).get(hero.id);
        const job = this.city.state.forge.jobs.find((j) => (j.recipe === 'evolve' && j.hero === hero.id)
            || (j.recipe === 'fuse' && j.kind === 'hero' && j.base === hero.id)) ?? null;
        const carried = (this.city.state.items ?? []).filter((i) => i.hero === hero.id);
        const slotOf = (i) => this.city.state.item_table.items[i.type].slot;
        renderHeroCard($('hero-card'), {
            hero, name, table: this.city.state.evolution, materials: this.city.state.materials,
            freeSlots: this.city.state.forge.slots - this.city.state.forge.jobs.length, serverNow: this.city.serverNow(),
            job, picked: this.heroForm, stats: this.city.state.hero_stats?.[String(hero.id)] ?? null,
            gear: this.city.state.item_table ? {
                weapon: carried.find((i) => slotOf(i) === 'weapon') ?? null,
                spell: carried.find((i) => slotOf(i) === 'spell') ?? null,
            } : null,
            itemTable: this.city.state.item_table,
            missions: this.city.state.missions ?? null,
            training: this.city.state.training ? {
                sessions: this.city.state.training.sessions,
                left: this.city.state.training.left[String(hero.id)] ?? 0,
                maxXp: this.city.state.training.max_xp[String(hero.id)] ?? 0,
                maxMastery: this.city.state.training.max_mastery?.[String(hero.id)] ?? 0,
                perLevel: this.city.state.training.mastery_per_level ?? 100,
                levels: this.city.state.training.mastery_levels ?? 10,
                bonus: this.city.state.training.mastery_bonus ?? 0.01,
            } : null,
            dismiss: this.city.state.dismiss_gifts ? {
                gift: this.city.state.dismiss_gifts[hero.cls === 'explorer' ? 'explorer' : String(hero.tier ?? 1)],
                blocker: dismissBlocker(hero, this.city.state.heroes), confirming: this.dismissing,
            } : null,
        }, {
            onDismiss: () => {
                if (!this.dismissing) {
                    this.dismissing = true;
                    play('click');
                    this.renderHero();
                    return;
                }
                void this.#dismiss(hero, name);
            },
            onExplore: (kind) => void this.#explore(hero, name, kind),
            onReturn: () => void this.#explorerBack(name, hero),
            onGear: (slot) => this.#pickGear(hero, name, slot, carried.find((i) => slotOf(i) === slot) ?? null),
            onPick: (form) => {
                this.heroForm = form;
                play('click');
                this.renderHero();
            },
            onEvolve: (form) => void this.#evolve(hero, name, form),
            onTrain: () => void this.#train(hero.id, name),
        });
        if (canFuse('hero', hero, this.city.state)) {
            const box = document.createElement('div');
            box.className = 'evolve fuse-box';
            const line = document.createElement('small');
            line.className = 'evolve-note';
            line.textContent = 'Fuse it with two more ascended heroes: it keeps its body and gains their powers.';
            const button = withIcon(document.createElement('button'), 'fuse', 'Fuse');
            button.type = 'button';
            button.className = 'button primary';
            button.addEventListener('click', () => this.city.fusionSheet.openFusion('hero', hero.id));
            box.append(button, line);
            $('hero-card').append(box);
        }
    }

    /** Choose what goes in a hero's weapon or spell slot. */
    #pickGear(hero, name, slot, current) {
        openItemPicker({
            ...gearChoices({
                items: this.city.state.items, table: this.city.state.item_table, names: heroNames(this.city.state.heroes),
                hero, name, slot, current,
            }),
            onPick: (id) => void this.#gear(() => equipItem(hero.id, id), 'Equipped.'),
            onClear: current ? () => void this.#gear(() => unequipItem(current.id), 'Back in the armoury.') : null,
        });
    }

    async #gear(call, line) {
        await this.city.run(async () => {
            this.city.apply(await call());
            play('place');
            toast(line);
        });
    }

    async upgradeItem(itemId) {
        const item = this.city.state.items.find((i) => i.id === itemId);
        await this.city.run(async () => {
            this.city.apply(await upgradeItem(itemId));
            play('forge');
            if (item) toast(`${ITEM_INFO[item.type].name} went into the forge to reach level ${item.level + 1}.`);
        });
    }

    async #dismiss(hero, name) {
        const done = await this.city.run(async () => {
            const result = await dismissHero(hero.id);
            const shown = this.city.hud.queuePop(() => {
                play('claim');
                return rewardPop({
                    src: heroPortrait(hero, 150), title: `${name} has left`,
                    line: `Slot free · ${giftText(result.gift)}`, color: HERO_INFO[hero.cls].color,
                });
            });
            this.city.apply(result);
            return { shown };
        });
        if (done) {
            closeSheet();
            await done.shown;
        }
    }

    async #explore(hero, name, kind) {
        await this.city.run(async () => {
            this.city.apply(await sendExplorer(hero.id, kind));
            play('boost');
            toast(`${name} set off: ${MISSION_INFO[kind].name}.`);
        });
    }

    async #explorerBack(name, hero) {
        const done = await this.city.run(async () => {
            const result = await explorerReturn(hero.id);
            const shown = this.city.hud.queuePop(() => {
                play('claim');
                return rewardPop(lootCard(name, result.loot));
            });
            this.city.apply(result);
            return { shown };
        });
        if (done) await done.shown;
    }

    async #evolve(hero, name, form) {
        await this.city.run(async () => {
            this.city.apply(await evolveHero(hero.id, form));
            play('forge');
            const goal = (hero.tier ?? 1) + 1 === 3 ? 'ascend' : 'become a ' + FORM_INFO[form].name;
            toast(`${name} went into the forge to ${goal}.`);
        });
    }

    /** A session with the training dummy: the little game, then the XP it gave on its result screen. */
    async #train(heroId, name) {
        const hero = this.city.state.heroes.find((h) => h.id === heroId);
        if (!hero || this.city.busy || !this.city.state.training) return;
        const tier = hero.tier ?? 1;
        const t = this.city.state.training;
        const master = tier >= 3;
        const points = hero.mastery ?? 0;
        const level = Math.min(t.mastery_levels, Math.floor(points / t.mastery_per_level));
        const game = openTraining({
            hero, name,
            left: t.left[String(heroId)] ?? 0,
            maxXp: (master ? t.max_mastery : t.max_xp)[String(heroId)] ?? 0,
            xp: master ? points - level * t.mastery_per_level : hero.xp ?? 0,
            need: master ? t.mastery_per_level : this.city.state.evolution?.tier_xp?.[String(tier + 1)] ?? 1,
            unit: master ? 'mastery' : 'XP',
            onAgain: () => void this.#train(heroId, name),
        });
        const score = await game.score;
        if (!score) return;
        let outcome = null;
        await this.city.run(async () => {
            const result = await trainHero(heroId, score.perfect, score.good);
            this.city.apply(result);
            const r = result.training_result;
            outcome = { xp: r.xp, ready: r.ready, sessionsLeft: r.sessions_left };
            if (master) {
                const per = t.mastery_per_level;
                const pct = Math.round(t.mastery_bonus * 100 * r.mastery_level);
                const maxed = r.mastery_level >= t.mastery_levels;
                outcome.xp = r.mastery;
                outcome.label = maxed
                    ? `+${r.mastery} mastery · Mastery ${r.mastery_level}: the top`
                    : `+${r.mastery} mastery · Mastery ${r.mastery_level}: ${r.mastery_points - r.mastery_level * per} / ${per}`;
                outcome.ready = r.level_up ? `Mastery ${r.mastery_level}! +${pct}% health and damage` : false;
            }
        });
        game.finish(outcome ?? { error: 'The training ground did not answer. Try again.' });
    }
}
