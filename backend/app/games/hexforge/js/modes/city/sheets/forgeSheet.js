import { claimJob, startForging, hammerJob } from '../../../net/api.js';
import { partName } from '../../../ui/panels/fusionPanel.js';
import { play } from '../../../fx/audio.js';
import { flyPicture, rewardPop } from '../../../fx/fx.js';
import {
    formatCountdown, itemName, itemThumb, jobName, jobThumb, renderArmoury, renderRecipes, renderRoster,
} from '../../../ui/panels/forgePanel.js';
import { openAnvil } from '../../../minigames/anvil.js';
import { heroNames } from '../../../ui/heroTiles.js';
import { evolveReady } from '../../../core/heroes.js';
import { BUILDING_INFO, FORM_INFO, HERO_INFO, ITEM_INFO, PATH_INFO, times } from '../../../data/labels.js';
import { closeSheet, openSheet, toast } from '../../../ui/sheets.js';
import { buildingThumb, heroPortrait, heroThumb, itemPicture } from '../../../render/thumbs.js';
import { $ } from '../shared.js';

/** The "you got" card for a claimed forge job. */
function claimCard(claimed) {
    const { item, kind, count } = claimed;
    if (kind === 'evolution') {
        const form = FORM_INFO[claimed.form];
        return {
            src: heroThumb(item, 150, claimed.form, claimed.tier), title: `${form.name} ${'★'.repeat(claimed.tier)}`,
            line: claimed.tier === 3 ? 'ascended! Stronger than ever' : 'evolved! A new form', color: form.accent,
        };
    }
    if (kind === 'item' || kind === 'upgrade') {
        const info = ITEM_INFO[item];
        return {
            src: itemPicture(item, 150), title: kind === 'upgrade' ? `${info.name} Lv ${claimed.level}` : info.name,
            line: kind === 'upgrade' ? 'upgraded! Stronger in every fight' : 'forged! Give it to a hero from their card',
            color: info.color,
        };
    }
    const hero = kind === 'hero';
    return {
        src: itemThumb(item, 150), title: itemName(item) + times(count),
        line: hero ? 'joined your heroes!' : 'forged! Now place it on the map',
        color: hero ? HERO_INFO[item].color : (BUILDING_INFO[item]?.glow ?? '#ffb347'),
    };
}

/** The forge sheet: recipes, slots, claiming what is ready, the anvil and the hourglass on a job. */
export class ForgeSheet {
    constructor(city) {
        this.city = city;
        this.forgeKind = 'building';
    }

    openForge(silent = false) {
        if (!this.city.state) return;
        this.city.selection.select(null);
        this.renderForge();
        openSheet('sheet-forge', null, { silent });
    }

    async #forge(recipeId) {
        const picture = document.querySelector(`#recipes [data-recipe="${recipeId}"] img`);
        await this.city.run(async () => {
            this.city.apply(await startForging(recipeId));
            play('forge');
            const slot = $('forge-slots').children[this.city.state.forge.jobs.length - 1];
            if (picture && slot) void flyPicture(picture.src, picture, slot, { size: 72 });
            toast(`The forge is making ${itemName(recipeId)}.`);
        });
    }

    async claim(jobId) {
        const done = await this.city.run(async () => {
            const result = await claimJob(jobId);
            const { claimed } = result;
            if (claimed.kind === 'build_up') {
                // an upgrade is already on the map: no card to close, no building to place, just say so
                play('levelup');
                const path = claimed.path ? ` · ${PATH_INFO[claimed.path].name}` : '';
                toast(`Every ${BUILDING_INFO[claimed.item].name} is now level ${claimed.level}${path}.`);
                this.city.apply(result);
                return null;
            }
            const card = claimed.kind === 'fusion' ? this.#fusionCard(claimed, result) : claimCard(claimed);
            const shown = this.city.hud.queuePop(() => {       // before #apply, so a level-up card comes after it
                play(claimed.kind === 'evolution' || claimed.kind === 'fusion' ? 'levelup' : 'claim');
                return rewardPop(card);
            });
            this.city.apply(result);
            return { claimed, shown };
        });
        if (!done) return;
        const { claimed } = done;
        await done.shown;
        if (claimed.kind === 'fusion') {
            // already on the map (or in the roster): nothing to place
            this.forgeKind = claimed.hero ? 'hero' : this.forgeKind;
            this.renderForge();
            return;
        }
        const tab = { hero: 'hero', evolution: 'hero', item: 'item', upgrade: 'item' }[claimed.kind];
        if (tab) {
            this.forgeKind = tab;
            this.renderForge();
            return;
        }
        closeSheet();
        this.city.selection.setMode('place', claimed.item);
    }

    /** The "you got" card for a finished fusion, drawn from the fused element in the new state. */
    #fusionCard(claimed, state) {
        const grade = '◆'.repeat(claimed.grade);
        if (claimed.hero) {
            const hero = state.heroes.find((h) => h.id === claimed.hero);
            if (hero) {
                return {
                    src: heroPortrait(hero, 150), title: `Fusion ${grade}`,
                    line: `${hero.fusion.parts.map(partName).join(' + ')}: one hero, every power`,
                    color: HERO_INFO[hero.cls].color,
                };
            }
        }
        const b = state.city.buildings.find((x) => x.id === claimed.building);
        if (b) {
            return {
                src: buildingThumb(b.type, 150, b.level ?? 1, b.path ?? null, b.fusion), title: `Fusion ${grade}`,
                line: `${b.fusion.parts.map(partName).join(' + ')}: all at once`, color: BUILDING_INFO[b.type].glow,
            };
        }
        return { src: itemThumb(claimed.item, 150), title: 'Fusion', line: 'The base was gone: nothing came out.', color: '#ffb347' };
    }

    renderForge() {
        if (!this.city.state) return;
        for (const tab of document.querySelectorAll('#forge-tabs [data-kind]')) {
            tab.setAttribute('aria-pressed', String(tab.dataset.kind === this.forgeKind));
        }
        const freeSlots = this.city.state.forge.slots - this.city.state.forge.jobs.length;
        renderRecipes($('recipes'), this.city.state.recipes, this.city.state.materials, freeSlots, this.forgeKind, (id) => void this.#forge(id));
        const heroLimit = this.city.state.recipes.find((r) => r.kind === 'hero')?.limit ?? 0;
        $('roster').hidden = this.forgeKind !== 'hero';
        $('armoury').hidden = this.forgeKind !== 'item';
        if (this.city.state.item_table) {
            const names = heroNames(this.city.state.heroes);
            renderArmoury($('armoury'), {
                items: this.city.state.items, table: this.city.state.item_table, heroNameOf: (id) => names.get(id) ?? 'a hero',
                materials: this.city.state.materials, freeSlots, jobs: this.city.state.forge.jobs,
            }, (id) => void this.city.heroSheet.upgradeItem(id));
        }
        const tierXp = this.city.state.evolution?.tier_xp;
        renderRoster($('roster'), this.city.state.heroes, heroLimit, this.city.serverNow(), tierXp, (id) => this.city.heroSheet.openHero(id),
            this.city.state.forge.jobs);
        const evolvable = this.city.state.heroes.filter((h) => evolveReady(h, tierXp)).length;
        const tab = document.querySelector('#forge-tabs [data-kind="hero"]');
        tab.classList.toggle('alert', evolvable > 0);
    }

    /** A round at the anvil: the little game, then the time it took off. */
    async hammer(jobId) {
        const job = this.city.state.forge.jobs.find((j) => j.id === jobId);
        if (!job || this.city.busy) return;
        const now = this.city.serverNow();
        const game = openAnvil({
            title: jobName(job), picture: jobThumb(job, 96),
            roundsLeft: (this.city.state.anvil_rounds ?? 3) - (job.hammered ?? 0),
            left: Math.max(0, job.ready_at - now),
            full: job.full ?? Math.max(1, job.ready_at - job.started_at),
            onAgain: () => void this.hammer(jobId),
        });
        const score = await game.score;
        if (!score) return;
        let outcome = null;
        await this.city.run(async () => {
            const result = await hammerJob(jobId, score.perfect, score.good);
            this.city.apply(result);
            const { cut, bonus, rounds_left: roundsLeft } = result.hammer;
            const after = this.city.state.forge.jobs.find((j) => j.id === jobId);
            outcome = { cut, bonus, roundsLeft, left: after ? Math.max(0, after.ready_at - this.city.serverNow()) : 0 };
        });
        game.finish(outcome ?? { error: 'The forge did not answer. Try again.' });
    }

    speedUpJob(jobId) {
        const job = this.city.state.forge.jobs.find((j) => j.id === jobId);
        if (!job) return;
        this.city.rewardsSheet.pickBonus('job', { job_id: jobId }, `Speed up ${jobName(job)}`,
            `${formatCountdown(job.ready_at - this.city.serverNow())} left`);
    }
}
