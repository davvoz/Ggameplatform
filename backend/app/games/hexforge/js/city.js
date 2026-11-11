import {
    Refused, SignInRequired, claimJob, claimLoginReward, claimTaskReward, claimWeeklyChest, collect,
    dismantleBuilding, fetchMyState, fetchDefenseLog, fetchRaidReplay, markDefensesSeen, moveBuilding,
    placeBuilding, revengeRaid, setAim, startForging, testDefense, useBonus, evolveHero, equipItem, unequipItem, sendExplorer, explorerReturn, upgradeBuilding, dismissHero, hammerJob,
    buyOffer, fuse, fusePreview,
    upgradeItem,
} from './api.js';
import { canFuse, fusionCandidates, partName, renderFusionCard, togglePick } from './fusionPanel.js';
import { openBonusPicker, openItemPicker } from './bonusPicker.js';
import { anchorFor, estimatePending, placementError } from './cityRules.js';
import { describeWorst, renderDefenseReport } from './defensePanel.js';
import { play } from './audio.js';
import { countUp, flyMaterial, flyPicture, forgeSlotPop, rewardPop } from './fx.js';
import {
    formatCountdown, itemEffect, itemName, itemThumb, jobName, renderArmoury, renderForgeSlots, renderRecipes,
    renderRoster, renderStorage,
} from './forgePanel.js';
import { fittingItems, giftText, renderHeroCard } from './heroPanel.js';
import { renderUpgradeCard, upgradeBonuses } from './upgradePanel.js';
import { openAnvil } from './anvil.js';
import { offerGives, renderMerchant } from './merchantPanel.js';
import { evolveReady, heroNames, updateTrips } from './heroTiles.js';
import { icon, withIcon } from './icons.js';
import { Compass } from './compass.js';
import { regionAround } from './iso.js';
import {
    AIM_INFO, BONUS_INFO, BUILDING_INFO, CHOICE_ICONS, FORM_INFO, HERO_INFO, ITEM_INFO, MATERIAL_INFO, MISSION_INFO,
    PATH_INFO,
} from './labels.js';
import { LEAGUE_COLORS } from './leagues.js';
import { renderRaidLog, timeAgo } from './raidLog.js';
import {
    formatLong, medal, renderBonuses, renderCalendar, renderChest, renderTasks, rewardChips, usableBonuses,
} from './rewardsPanel.js';
import { closeSheet, isSheetOpen, openSheet, toast } from './sheets.js';
import { buildingThumb, heroPortrait, heroThumb, itemPicture } from './thumbs.js';

/**
 * "My city": the player's saved city, full screen.
 *  - tap a glowing building to collect what it made
 *  - tap a building for its actions: move, aim (towers), dismantle
 *  - Forge (sheet): forge buildings and heroes; claimed buildings go to the
 *    "ready to place" tray, then onto the map
 *  - Defense (sheet): defence test, raids on your city, replay and revenge
 *  - hero card (sheet, from the forge's Heroes tab): XP, stats, its gear
 *    (a weapon and a spell), and the evolution into one of two forms, then
 *    the ascension, at the forge
 *  - Items (forge tab): forge weapons and spells; the armoury upgrades them
 *  - Rewards (sheet): the 7-day calendar, today's tasks, the weekly chest
 *    and the bonus inventory; an hourglass speeds up a forge job
 *  - the big Attack button opens the attack plan
 *  - the player's level (shield) and XP bar; "+XP" after every action that
 *    earns some, and a level-up card with its gifts
 */

const $ = (id) => document.getElementById(id);
const FLOAT_SECONDS = 1.4;
const BUBBLE_FROM = 5;            // units before a building shows it has something to collect
const EMPTY_CITY = { grid: 18, buildings: [] };
const INSETS = { top: 80, right: 0, bottom: 160, left: 0 };
const ROTATION_KEY = 'hexforge.cityRotation';
const MESSAGES = {
    occupied: 'That spot is taken.',
    outside_city: 'Keep it inside the city limits.',
    unknown_building: 'That building is gone. Reloading your city…',
    state_changed_retry: 'Your city changed meanwhile. Try again.',
    forge_busy: 'All forge slots are busy.',
    limit_reached: 'You already own as many of those as allowed.',
    not_enough_materials: 'Not enough materials.',
    not_ready: 'Not ready yet.',
    not_in_storage: 'Nothing like that in storage.',
    cannot_dismantle: 'The core and the vault cannot be dismantled.',
    not_a_tower: 'Only towers take an aim.',
    revenge_unavailable: 'Revenge is not possible now: that raider is shielded or the raid is too old.',
    unknown_raid: 'That raid is gone.',
    arena_locked: 'Clear the first outpost to enter the arena.',
    unknown_aim: 'Unknown aim.',
    already_claimed: 'Already claimed.',
    not_done: 'Not done yet.',
    unknown_task: 'That task is over: a new day has begun.',
    no_bonus: 'You have none of those left.',
    nothing_to_speed_up: 'Nothing to speed up there.',
    wrong_bonus: 'That bonus does not work there.',
    energy_full: 'Your energy is already full.',
    not_enough_xp: 'Not enough XP yet: fight more with this hero.',
    already_evolving: 'That hero is already at the forge.',
    fully_evolved: 'That hero is fully ascended.',
    unknown_form: 'Pick one of the two forms.',
    hero_injured: 'That hero is hurt: wait until it heals.',
    unknown_hero: 'That hero is gone.',
    unknown_item: 'That item is gone.',
    on_mission: 'That Explorer is already away.',
    core_too_low: 'Upgrade the Core first.',
    last_squad: 'Keep at least 4 fighters for a squad.',
    no_rounds_left: 'No more rounds at the anvil for this job.',
    already_ready: 'It is ready already: claim it!',
    sold_out: 'Sold out today.',
    armoury_full: 'The armoury is full.',
    cannot_upgrade: 'That cannot be upgraded.',
    unknown_path: 'Pick a path first.',
    not_an_explorer: 'Only an Explorer goes on missions.',
    cannot_evolve: 'The Explorer does not evolve.',
    wrong_class: 'That weapon is for another class.',
    max_level: 'That item is at its top level.',
    already_upgrading: 'That item is already at the forge.',
    not_max_level: 'Only buildings at level 5 and ascended heroes can fuse.',
    grade_mismatch: 'All three must be of the same fusion grade.',
    cannot_fuse: 'That one cannot fuse.',
    already_fusing: 'That one is already at the forge, fusing.',
    building_fusing: 'It is fusing at the forge: wait until it is done.',
    bad_fusion: 'Pick two others to fuse with it.',
    hero_evolving: 'That hero is at the forge.',
};

export class CityMode {
    constructor(renderer) {
        this.renderer = renderer;
        this.state = null;
        this.name = '';
        this.receivedAt = 0;
        this.selectedId = null;
        this.mode = 'idle';           // idle | move | place
        this.placingType = null;
        this.preview = null;
        this.confirmDismantle = false;
        this.aimOpen = false;
        this.floaters = [];
        this.busy = false;
        this.infoText = '';
        this.second = -1;
        this.forgeKind = 'building';
        this.defense = null;          // last defence test, while the defenses are unchanged
        this.defenseKey = '';
        this.raids = null;
        this.shownMaterials = {};
        this.heldMaterials = new Set();   // materials whose counter waits for flying gems
        this.rot = loadRotation();        // quarter turns of the view, remembered on this device
        this.compass = new Compass($('compass-rose'));
        this.progress = null;             // last level and XP seen, kept across reloads to spot gains
        this.pops = Promise.resolve();    // big cards (forged, level up) wait for each other
        this.heroId = null;               // the hero whose card is open
        this.heroForm = null;             // the form picked on it so far
        this.onWatch = () => {};      // set by the shell: replay a battle
        this.onRevenge = () => {};    // set by the shell: open the attack plan on the scouted raider
        this.onAttack = () => {};     // set by the shell: open the attack plan
        this.onRanking = () => {};    // set by the shell: open the ranking
        this.#wire();
    }

    async enter() {
        $('hud-city').hidden = false;
        this.renderer.setRotation(this.rot);
        this.compass.show(this.rot);
        if (this.state) this.renderer.setCity(this.state.city);
        else await this.#reload();
        this.#focus();
        void this.#loadRaids();
    }

    /** Another mode changed the saved state: reload on the next visit. */
    invalidate() {
        this.state = null;
    }

    leave() {
        this.#setMode('idle');
        this.#select(null);
        closeSheet();
        $('hud-city').hidden = true;
    }

    // ── input ──────────────────────────────────────────────────────────
    onClick(event) {
        if (!this.state || this.busy) return;
        const point = this.renderer.canvasPoint(event);
        if (this.mode !== 'idle') {
            void this.#tryDrop(point);
            return;
        }
        const building = this.renderer.buildingAt(point);
        this.#select(building?.id ?? null);
        if (building?.production && this.#pendingOf(building) > 0) void this.#collect([building.id]);
    }

    onPointerMove(event) {
        if (this.mode === 'idle' || !this.state) return;
        this.preview = this.#previewAt(this.renderer.canvasPoint(event));
    }

    onEscape() {
        if (isSheetOpen()) closeSheet();
        else if (this.mode !== 'idle') this.#setMode('idle');
        else this.#select(null);
    }

    // ── per frame ──────────────────────────────────────────────────────
    frame(time, dt) {
        this.floaters = this.floaters.filter((f) => {
            f.age += dt / FLOAT_SECONDS;
            return f.age < 1;
        });
        const bubbles = new Map();
        for (const b of this.state?.city.buildings ?? []) {
            if (!b.production) continue;
            const amount = this.#pendingOf(b);
            if (amount >= BUBBLE_FROM) {
                bubbles.set(b.id, { amount, material: b.production.material, full: amount >= b.production.capacity });
            }
        }
        this.renderer.draw(null, {
            time,
            selectedId: this.mode === 'place' ? null : this.selectedId,
            ranges: this.mode === 'idle' ? this.selectedId : null,
            preview: this.mode === 'idle' ? null : this.preview,
            bubbles,
            floaters: this.floaters,
            showTraps: true,
        });
        this.#updateInfo();
        this.#tick();
    }

    // ── wiring ─────────────────────────────────────────────────────────
    #wire() {
        $('btn-attack').addEventListener('click', () => this.onAttack());
        $('player-plate').addEventListener('click', () => this.onRanking());
        $('btn-open-forge').addEventListener('click', () => this.#openForge());
        $('btn-open-defense').addEventListener('click', () => this.#openDefense());
        $('btn-open-rewards').addEventListener('click', () => this.#openRewards());
        $('btn-defense-test').addEventListener('click', () => void this.#testDefense());
        $('btn-move').addEventListener('click', () => this.#setMode(this.mode === 'move' ? 'idle' : 'move'));
        $('btn-aim').addEventListener('click', () => {
            this.aimOpen = !this.aimOpen;
            this.#renderSelection();
            this.#reveal();
        });
        $('btn-dismantle').addEventListener('click', () => void this.#dismantle());
        $('btn-deselect').addEventListener('click', () => this.#select(null));
        $('btn-cancel-place').addEventListener('click', () => this.#setMode('idle'));
        $('btn-rotate').addEventListener('click', () => this.#turn());
        $('btn-upgrade').addEventListener('click', () => this.#openUpgrade());
        $('btn-fuse').addEventListener('click', () => {
            if (this.selectedId !== null) this.#openFusion('building', this.selectedId);
        });
        for (const tab of document.querySelectorAll('#forge-tabs [data-kind]')) {
            tab.addEventListener('click', () => {
                this.forgeKind = tab.dataset.kind;
                this.#renderForge();
            });
        }
    }

    #focus() {
        const city = this.state?.city ?? EMPTY_CITY;
        this.renderer.focus(regionAround(city.buildings, city.grid, 1.5, 9), INSETS);
    }

    /** A quarter turn of the view, so buildings hidden behind others come to the front. */
    #turn() {
        this.rot = (this.rot + 1) % 4;
        saveRotation(this.rot);
        this.renderer.setRotation(this.rot);
        this.compass.show(this.rot);
        this.preview = null;
        const view = $('view');
        view.classList.remove('turning');
        void view.offsetWidth;            // restart the fade
        view.classList.add('turning');
        this.#reveal();
    }

    #openForge(silent = false) {
        if (!this.state) return;
        this.#select(null);
        this.#renderForge();
        openSheet('sheet-forge', null, { silent });
    }

    // ── hero card ──────────────────────────────────────────────────────
    #openHero(heroId) {
        if (!this.state) return;
        this.heroId = heroId;
        this.heroForm = null;
        this.dismissing = false;
        openSheet('sheet-hero', () => {
            this.heroId = null;
            this.forgeKind = 'hero';
            // back to the forge's heroes, unless another sheet took over or the city was left
            setTimeout(() => {
                if (!isSheetOpen() && !$('hud-city').hidden) this.#openForge(true);   // the close already sounded
            }, 0);
        });
        this.#renderHero();
    }

    #renderHero() {
        if (this.heroId === null || !isSheetOpen('sheet-hero')) return;
        const hero = this.state.heroes.find((h) => h.id === this.heroId);
        if (!hero) {
            closeSheet();
            return;
        }
        const name = heroNames(this.state.heroes).get(hero.id);
        $('hero-title').textContent = name;
        const job = this.state.forge.jobs.find((j) => (j.recipe === 'evolve' && j.hero === hero.id)
            || (j.recipe === 'fuse' && j.kind === 'hero' && j.base === hero.id)) ?? null;
        const carried = (this.state.items ?? []).filter((i) => i.hero === hero.id);
        const slotOf = (i) => this.state.item_table.items[i.type].slot;
        renderHeroCard($('hero-card'), {
            hero, name, table: this.state.evolution, materials: this.state.materials,
            freeSlots: this.state.forge.slots - this.state.forge.jobs.length, serverNow: this.#serverNow(),
            job, picked: this.heroForm, stats: this.state.hero_stats?.[String(hero.id)] ?? null,
            gear: this.state.item_table ? {
                weapon: carried.find((i) => slotOf(i) === 'weapon') ?? null,
                spell: carried.find((i) => slotOf(i) === 'spell') ?? null,
            } : null,
            itemTable: this.state.item_table,
            missions: this.state.missions ?? null,
            dismiss: this.state.dismiss_gifts ? {
                gift: this.state.dismiss_gifts[hero.cls === 'explorer' ? 'explorer' : String(hero.tier ?? 1)],
                blocker: dismissBlocker(hero, this.state.heroes), confirming: this.dismissing,
            } : null,
        }, {
            onDismiss: () => {
                if (!this.dismissing) {
                    this.dismissing = true;
                    play('click');
                    this.#renderHero();
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
                this.#renderHero();
            },
            onEvolve: (form) => void this.#evolve(hero, name, form),
        });
        if (canFuse('hero', hero, this.state)) {
            const box = document.createElement('div');
            box.className = 'evolve fuse-box';
            const line = document.createElement('small');
            line.className = 'evolve-note';
            line.textContent = 'Fuse it with two more ascended heroes: it keeps its body and gains their powers.';
            const button = withIcon(document.createElement('button'), 'fuse', 'Fuse');
            button.type = 'button';
            button.className = 'button primary';
            button.addEventListener('click', () => this.#openFusion('hero', hero.id));
            box.append(button, line);
            $('hero-card').append(box);
        }
    }

    // ── fusion ─────────────────────────────────────────────────────────
    #openFusion(kind, baseId) {
        if (!this.state?.fusion) return;
        this.fusion = { kind, baseId, picked: [], preview: null, asked: '' };
        openSheet('sheet-fuse', () => {
            this.fusion = null;
        });
        this.#renderFusion();
    }

    #fusionBase() {
        const f = this.fusion;
        if (!f) return null;
        return f.kind === 'building' ? this.#building(f.baseId) : this.state.heroes.find((h) => h.id === f.baseId) ?? null;
    }

    #renderFusion() {
        const f = this.fusion;
        if (!f || !isSheetOpen('sheet-fuse')) return;
        const base = this.#fusionBase();
        if (!base) {
            closeSheet();
            return;
        }
        const candidates = fusionCandidates(f.kind, base, this.state);
        f.picked = f.picked.filter((id) => candidates.some((c) => c.id === id));
        $('fuse-title').textContent = f.kind === 'building' ? 'Fuse buildings' : 'Fuse heroes';
        renderFusionCard($('fuse-card'), {
            kind: f.kind, base, candidates, picked: f.picked, preview: f.picked.length === 2 ? f.preview : null,
            materials: this.state.materials, freeSlots: this.state.forge.slots - this.state.forge.jobs.length,
            fighters: this.state.heroes.filter((h) => h.cls !== 'explorer').length, table: this.state.fusion,
            names: heroNames(this.state.heroes), busy: this.busy,
        }, {
            onToggle: (ids) => {
                f.picked = togglePick(f.picked, ids);
                f.preview = null;
                play('click');
                this.#renderFusion();
                if (f.picked.length === 2) void this.#askPreview();
            },
            onFuse: () => void this.#fuse(),
        });
    }

    async #askPreview() {
        const f = this.fusion;
        const key = `${f.kind}:${f.baseId}:${f.picked.join(',')}`;
        f.asked = key;
        try {
            const preview = await fusePreview(f.kind, f.baseId, f.picked);
            if (this.fusion !== f || f.asked !== key) return;      // the choice moved on meanwhile
            f.preview = preview;
        } catch (error) {
            if (this.fusion !== f || f.asked !== key) return;
            f.picked = f.picked.slice(0, 1);
            play('error');
            toast(error instanceof Refused ? (MESSAGES[error.code] ?? 'That fusion is not possible.') : 'Could not reach the forge.');
        }
        this.#renderFusion();
    }

    async #fuse() {
        const f = this.fusion;
        if (!f || f.picked.length !== 2) return;
        await this.#run(async () => {
            this.#apply(await fuse(f.kind, f.baseId, f.picked));
            play('forge');
            toast(f.kind === 'building' ? 'Fusing at the forge. The base keeps working meanwhile.'
                : 'Fusing at the forge. Your hero will be back stronger than ever.');
            closeSheet();
        });
    }

    /** Choose what goes in a hero's weapon or spell slot. */
    #pickGear(hero, name, slot, current) {
        const names = heroNames(this.state.heroes);
        const table = this.state.item_table;
        // free items first; one carried by another hero says so plainly, since taking it leaves them without
        const options = fittingItems(this.state.items, table, hero.cls, slot)
            .filter((i) => i.id !== current?.id)
            .sort((a, b) => Number(Boolean(a.hero)) - Number(Boolean(b.hero)) || b.level - a.level)
            .map((i) => ({
                id: i.id,
                picture: itemPicture(i.type, 40),
                title: i.hero ? `Take from ${names.get(i.hero)}: ${ITEM_INFO[i.type].name} · Lv ${i.level}`
                    : `${ITEM_INFO[i.type].name} · Lv ${i.level}`,
                line: i.hero ? `${itemEffect(table, i)} · ${names.get(i.hero)} will be left without it`
                    : `${itemEffect(table, i)} · in the armoury`,
                accent: ITEM_INFO[i.type].color,
            }));
        const taken = (id) => {
            const item = this.state.items.find((i) => i.id === id);
            return item?.hero ? `Equipped. Taken from ${names.get(item.hero)}.` : 'Equipped.';
        };
        const what = slot === 'weapon' ? `weapon for a ${HERO_INFO[hero.cls].name}` : 'spell';
        openItemPicker({
            title: `${name}: ${slot}`,
            line: current ? `Now: ${ITEM_INFO[current.type].name} · Lv ${current.level}` : '',
            options,
            empty: `No other ${what} yet: forge one in the forge's Items tab.`,
            onPick: (id) => void this.#gear(() => equipItem(hero.id, id), taken(id)),
            onClear: current ? () => void this.#gear(() => unequipItem(current.id), 'Back in the armoury.') : null,
        });
    }

    async #gear(call, line) {
        await this.#run(async () => {
            this.#apply(await call());
            play('place');
            toast(line);
        });
    }

    async #upgradeItem(itemId) {
        const item = this.state.items.find((i) => i.id === itemId);
        await this.#run(async () => {
            this.#apply(await upgradeItem(itemId));
            play('forge');
            if (item) toast(`${ITEM_INFO[item.type].name} went into the forge to reach level ${item.level + 1}.`);
        });
    }

    async #dismiss(hero, name) {
        let shown = null;
        await this.#run(async () => {
            const result = await dismissHero(hero.id);
            shown = this.#queuePop(() => {
                play('claim');
                return rewardPop({
                    src: heroPortrait(hero, 150), title: `${name} has left`,
                    line: `Slot free · ${giftText(result.gift)}`, color: HERO_INFO[hero.cls].color,
                });
            });
            this.#apply(result);
        });
        if (shown) {
            closeSheet();
            await shown;
        }
    }

    // ── building upgrades ──────────────────────────────────────────────
    #openUpgrade() {
        const b = this.#building(this.selectedId);
        if (!b || !this.state.upgrades) return;
        this.upgradeType = b.type;
        this.upgradeBuildingId = b.id;
        this.upgradePath = null;
        this.#renderUpgrade();
        openSheet('sheet-upgrade');
    }

    #renderUpgrade() {
        const type = this.upgradeType;
        if (!type || !this.state?.upgrades) return;
        $('upgrade-title').textContent = `Upgrade: ${BUILDING_INFO[type].name}`;
        const job = this.state.forge.jobs.find((j) => j.recipe === 'build_up' && j.type === type) ?? null;
        renderUpgradeCard($('upgrade-card'), {
            type, upgrades: this.state.upgrades, materials: this.state.materials,
            freeSlots: this.state.forge.slots - this.state.forge.jobs.length, serverNow: this.#serverNow(),
            job, picked: this.upgradePath, count: this.state.city.buildings.filter((b) => b.type === type).length,
        }, {
            onPick: (path) => {
                this.upgradePath = path;
                play('click');
                this.#renderUpgrade();
            },
            onUpgrade: (path) => void this.#upgradeBuilding(path),
        });
    }

    async #upgradeBuilding(path) {
        const type = this.upgradeType;
        await this.#run(async () => {
            this.#apply(await upgradeBuilding(this.upgradeBuildingId, path));
            play('forge');
            const level = this.state.forge.jobs.find((j) => j.recipe === 'build_up' && j.type === type)?.level;
            toast(`${BUILDING_INFO[type].name} went into the forge to reach level ${level}.`);
            this.#renderUpgrade();
        });
    }

    async #explore(hero, name, kind) {
        await this.#run(async () => {
            this.#apply(await sendExplorer(hero.id, kind));
            play('boost');
            toast(`${name} set off: ${MISSION_INFO[kind].name}.`);
        });
    }

    async #explorerBack(name, hero) {
        let shown = null;
        await this.#run(async () => {
            const result = await explorerReturn(hero.id);
            shown = this.#queuePop(() => {
                play('claim');
                return rewardPop(lootCard(name, result.loot));
            });
            this.#apply(result);
        });
        if (shown) await shown;
    }

    async #evolve(hero, name, form) {
        await this.#run(async () => {
            this.#apply(await evolveHero(hero.id, form));
            play('forge');
            const goal = (hero.tier ?? 1) + 1 === 3 ? 'ascend' : 'become a ' + FORM_INFO[form].name;
            toast(`${name} went into the forge to ${goal}.`);
        });
    }

    #openRewards() {
        if (!this.state) return;
        this.#select(null);
        openSheet('sheet-rewards');
        this.#renderRewards();               // fills the sheet only while it is open
    }

    // ── rewards and bonuses ────────────────────────────────────────────
    #renderRewards() {
        const r = this.state?.rewards;
        if (!r) return;
        const badge = $('rewards-badge');
        badge.hidden = !r.ready;
        badge.textContent = String(r.ready);
        if (!isSheetOpen('sheet-rewards')) return;
        renderCalendar($('calendar'), r.login, () => void this.#claimReward('login'));
        $('login-note').textContent = r.login.claimable ? `Day ${r.login.day} of 7` : 'Come back tomorrow';
        renderTasks($('tasks'), r.tasks, (id) => void this.#claimReward('task', id));
        renderChest($('chest'), r.weekly, this.#serverNow(), () => void this.#claimReward('chest'));
        renderBonuses($('bonus-list'), this.state.bonuses);
        if (this.state.merchant) renderMerchant($('merchant'), this.state.merchant, this.state.materials, (id) => void this.#buyOffer(id));
        this.#tickRewards(this.#serverNow());
    }

    #tickRewards(now) {
        if (!this.state?.rewards || !isSheetOpen('sheet-rewards')) return;
        $('tasks-note').textContent = `new in ${formatLong(this.state.rewards.tasks_reset_at - now)}`;
        if (this.state.merchant) $('merchant-note').textContent = `new offers in ${formatLong(this.state.merchant.next_at - now)}`;
        const reset = document.querySelector('#chest .chest-reset');
        if (reset) reset.textContent = `new in ${formatLong(this.state.rewards.weekly.reset_at - now)}`;
    }

    async #claimReward(kind, taskId = null) {
        const CARDS = {
            login: () => ({ icon: 'gift', title: `Day ${this.state.rewards.login.day} gift` }),
            task: () => ({ icon: 'star', title: 'Task done!' }),
            chest: () => ({ icon: 'chest', title: 'Weekly chest!' }),
        };
        const card = CARDS[kind]();
        let shown = null;
        await this.#run(async () => {
            const call = { login: claimLoginReward, task: () => claimTaskReward(taskId), chest: claimWeeklyChest }[kind];
            const result = await call();
            shown = this.#queuePop(() => {            // before #apply, so a level-up card comes after it
                play('claim');
                return rewardPop({
                    picture: medal(card.icon), title: card.title,
                    extra: rewardChips(result.got, { big: true }), line: 'Added to your city', ms: 2600,
                });
            });
            this.#apply(result);
        });
        await shown;
    }

    /** Offer the bonuses that work on `target` ('job' | 'hero' | 'energy'), then use the one picked. */
    #pickBonus(target, payload, title, line) {
        const options = usableBonuses(target, this.state.bonuses);
        if (!options.length) {
            toast('No bonus for that. Daily tasks and the calendar give some.');
            return;
        }
        openBonusPicker({ title, line, options, owned: this.state.bonuses, onPick: (bonus) => void this.#useBonus(bonus, payload) });
    }

    async #useBonus(bonus, payload) {
        await this.#run(async () => {
            this.#apply(await useBonus(bonus, payload));
            play('boost');
            toast(`${BONUS_INFO[bonus].name}: ${BONUS_INFO[bonus].effect}.`);
        });
    }

    #openDefense() {
        if (!this.state) return;
        this.#select(null);
        openSheet('sheet-defense');
        if (this.raids?.unseen) void this.#markSeen();
    }

    // ── server round trips ─────────────────────────────────────────────
    async #reload() {
        try {
            this.#apply(await fetchMyState());
            $('city-signin').hidden = true;
            this.#showHud(true);
        } catch (error) {
            if (!(error instanceof SignInRequired)) throw error;
            this.state = null;
            this.renderer.setCity(EMPTY_CITY);
            $('city-signin').hidden = false;
            this.#showHud(false);
        }
    }

    #showHud(signedIn) {
        for (const id of ['player-plate', 'resources']) $(id).hidden = !signedIn;
        for (const node of document.querySelectorAll('#hud-city .corner, #hud-city .bottom-ui')) node.hidden = !signedIn;
    }

    #apply(state) {
        if (state.name) this.name = state.name;
        this.state = state;
        this.#noticeProgress(state.progress);
        this.receivedAt = performance.now();
        this.renderer.setCity(state.city);
        if (this.selectedId !== null && !this.#building(this.selectedId)) this.#select(null);
        if (this.mode === 'place' && !state.storage[this.placingType]) this.#setMode('idle');
        if (this.defense && defenseKey(state.city) !== this.defenseKey) this.#showDefense(null);
        this.#renderAll();
    }

    async #collect(ids) {
        if (this.busy || !this.state) return;
        const sources = this.state.city.buildings
            .filter((b) => b.production && (!ids || ids.includes(b.id)))
            .map((b) => ({ b, amount: this.#pendingOf(b) }))
            .filter(({ amount }) => amount > 0);
        if (!sources.length) return;
        await this.#run(async () => {
            const result = await collect(ids);
            const before = { ...this.shownMaterials };
            for (const { b } of sources) this.heldMaterials.add(b.production.material);
            this.#apply(result);
            for (const { b, amount } of sources) this.#flyHome(b, amount, before);
        });
    }

    /** Gems burst out of the building and fly into their counter, which then counts up. */
    #flyHome(b, amount, before) {
        const key = b.production.material;
        const info = MATERIAL_INFO[key];
        const pill = document.querySelector(`#resources [data-material="${key}"]`);
        this.#float(b, `+${amount}`, info.color);
        play('collect');
        flyMaterial(this.renderer.screenOf(b.x + b.size / 2, b.y + b.size / 2, 30), pill, {
            iconName: info.icon,
            color: info.color,
            count: Math.max(4, Math.min(10, Math.round(amount / 12))),
            onGem: () => play('gem'),
            onLand: () => {
                this.heldMaterials.delete(key);
                const to = this.state.materials[key] ?? 0;
                countUp(pill.querySelector('b'), before[key] ?? to, to);
                this.shownMaterials[key] = to;
                bump(pill);
            },
        });
    }

    async #tryDrop(point) {
        const target = this.#previewAt(point);
        this.preview = target;
        if (!target.valid) {
            play('error');
            toast(MESSAGES[target.error]);
            return;
        }
        await this.#run(async () => {
            if (this.mode === 'move') {
                this.#apply(await moveBuilding(this.selectedId, target.x, target.y));
                play('place');
                this.#setMode('idle');
                toast('Moved.');
            } else {
                const type = this.placingType;
                this.#apply(await placeBuilding(type, target.x, target.y));
                play('place');
                toast(`${itemName(type)} placed.`);
                if (!this.state.storage[type]) this.#setMode('idle');
            }
        });
    }

    async #forge(recipeId) {
        const picture = document.querySelector(`#recipes [data-recipe="${recipeId}"] img`);
        await this.#run(async () => {
            this.#apply(await startForging(recipeId));
            play('forge');
            const slot = $('forge-slots').children[this.state.forge.jobs.length - 1];
            if (picture && slot) void flyPicture(picture.src, picture, slot, { size: 72 });
            toast(`The forge is making ${itemName(recipeId)}.`);
        });
    }

    async #claim(jobId) {
        let claimed = null;
        let shown = null;
        await this.#run(async () => {
            const result = await claimJob(jobId);
            claimed = result.claimed;
            if (claimed.kind === 'build_up') {
                // an upgrade is already on the map: no card to close, no building to place, just say so
                play('levelup');
                const path = claimed.path ? ` · ${PATH_INFO[claimed.path].name}` : '';
                toast(`Every ${BUILDING_INFO[claimed.item].name} is now level ${claimed.level}${path}.`);
                this.#apply(result);
                return;
            }
            const card = claimed.kind === 'fusion' ? this.#fusionCard(claimed, result) : claimCard(claimed);
            shown = this.#queuePop(() => {             // before #apply, so a level-up card comes after it
                play(claimed.kind === 'evolution' || claimed.kind === 'fusion' ? 'levelup' : 'claim');
                return rewardPop(card);
            });
            this.#apply(result);
        });
        if (!claimed || claimed.kind === 'build_up') return;
        await shown;
        if (claimed.kind === 'fusion') {
            // already on the map (or in the roster): nothing to place
            this.forgeKind = claimed.hero ? 'hero' : this.forgeKind;
            this.#renderForge();
            return;
        }
        const tab = { hero: 'hero', evolution: 'hero', item: 'item', upgrade: 'item' }[claimed.kind];
        if (tab) {
            this.forgeKind = tab;
            this.#renderForge();
            return;
        }
        closeSheet();
        this.#setMode('place', claimed.item);
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

    async #dismantle() {
        const b = this.#building(this.selectedId);
        if (!b) return;
        if (!this.confirmDismantle) {
            this.confirmDismantle = true;
            this.#renderSelection();
            return;
        }
        await this.#run(async () => {
            const result = await dismantleBuilding(b.id);
            play('dismantle');
            const gained = Object.entries(result.refund).map(([m, n]) => `+${n} ${MATERIAL_INFO[m].name}`).join('  ');
            if (gained) this.#float(b, gained, '#e6e9f5');
            this.#apply(result);
            toast(`${BUILDING_INFO[b.type].name} dismantled.`);
        });
    }

    async #setAim(aim) {
        const b = this.#building(this.selectedId);
        if (!b || b.aim === aim) return;
        await this.#run(async () => {
            this.#apply(await setAim(b.id, aim));
            toast(`${BUILDING_INFO[b.type].name} now aims: ${AIM_INFO[aim].name}.`);
        });
    }

    async #testDefense() {
        if (this.busy || !this.state) return;
        const button = $('btn-defense-test');
        button.disabled = true;
        withIcon(button, 'test', 'Running the raids…');
        await this.#run(async () => {
            const report = await testDefense();
            this.defenseKey = defenseKey(this.state.city);
            this.#showDefense(report);
        });
        button.disabled = false;
        withIcon(button, 'test', this.defense ? 'Test again' : 'Test my defenses');
    }

    #showDefense(report) {
        this.defense = report;
        const box = $('defense-report');
        box.hidden = !report;
        if (report) {
            renderDefenseReport(box, report,
                () => this.onWatch(report.worst, `Worst raid of the test: ${describeWorst(report.worst)}.`));
        } else {
            withIcon($('btn-defense-test'), 'test', 'Test my defenses');
        }
    }

    // ── raids on the city ──────────────────────────────────────────────
    async #loadRaids() {
        if (!this.state) return;
        try {
            this.raids = await fetchDefenseLog();
        } catch (error) {
            if (!(error instanceof SignInRequired)) console.error('[Hexforge] raid log failed', error);
            return;
        }
        this.#renderRaids();
    }

    #renderRaids() {
        if (!this.raids || !this.state) return;
        const unseen = this.raids.unseen;
        const badge = $('defense-badge');
        badge.hidden = !unseen;
        badge.textContent = String(unseen);
        renderRaidLog({ banner: $('raid-banner'), list: $('raid-log') }, this.raids, this.state.pvp, this.#serverNow(), {
            watch: (raid) => void this.#watchRaid(raid),
            revenge: (raid) => void this.#revenge(raid),
            seen: () => this.#openDefense(),
        });
    }

    async #markSeen() {
        this.raids = { ...this.raids, unseen: 0, raids: this.raids.raids.map((r) => ({ ...r, seen: true })) };
        this.#renderRaids();
        try {
            await markDefensesSeen();
        } catch (error) {
            console.error('[Hexforge] could not mark raids as seen', error);
        }
    }

    async #watchRaid(raid) {
        await this.#run(async () => {
            const replay = await fetchRaidReplay(raid.id);
            this.onWatch(replay, `${raid.raider} raided you ${timeAgo(this.#serverNow() - raid.at)}.`);
        });
    }

    async #revenge(raid) {
        await this.#run(async () => {
            await revengeRaid(raid.id);
            this.invalidate();
            this.onRevenge();
        });
    }

    async #run(action) {
        this.busy = true;
        try {
            await action();
        } catch (error) {
            play('error');
            if (error instanceof Refused) {
                toast(MESSAGES[error.code] ?? 'The server refused that.');
                await this.#reload();
            } else if (error instanceof SignInRequired) {
                await this.#reload();
            } else {
                console.error('[Hexforge] city action failed', error);
                toast('The server did not answer. Try again in a moment.');
            }
        } finally {
            this.busy = false;
        }
    }

    // ── helpers ────────────────────────────────────────────────────────
    #building(id) {
        return this.state?.city.buildings.find((b) => b.id === id) ?? null;
    }

    #serverNow() {
        return this.state.server_time + (performance.now() - this.receivedAt) / 1000;
    }

    #pendingOf(b) {
        if (!b.production) return 0;
        return estimatePending(b.production, (performance.now() - this.receivedAt) / 1000);
    }

    #recipe(id) {
        return this.state.recipes.find((r) => r.id === id);
    }

    #float(b, text, color) {
        this.floaters.push({ x: b.x + b.size / 2, y: b.y + b.size / 2, text, color, age: 0 });
    }

    #previewAt(point) {
        const ground = this.renderer.groundAt(point);
        const subject = this.mode === 'move'
            ? this.#building(this.selectedId)
            : { id: null, size: this.#recipe(this.placingType).size };
        const { x, y } = anchorFor(subject.size, ground.x, ground.y);
        const error = placementError(this.state.city, subject, x, y);
        return { x, y, size: subject.size, valid: !error, error };
    }

    #select(id) {
        if (id !== this.selectedId && this.mode === 'move') this.#setMode('idle');
        if (id !== this.selectedId) this.aimOpen = false;
        this.selectedId = id;
        this.confirmDismantle = false;
        this.#renderSelection();
        this.#renderBottom();
        this.#reveal();
    }

    /** Keep the selected building in sight above its action panel. */
    #reveal() {
        const b = this.#building(this.selectedId);
        if (!b) return;
        requestAnimationFrame(() => this.renderer.reveal(b, $('selection').getBoundingClientRect().top - 6));
    }

    #setMode(mode, placingType = null) {
        this.mode = mode === 'move' && this.selectedId === null ? 'idle' : mode;
        this.placingType = this.mode === 'place' ? placingType : null;
        this.preview = null;
        $('btn-move').setAttribute('aria-pressed', String(this.mode === 'move'));
        if (this.mode === 'place') {
            this.selectedId = null;
            this.#renderSelection();
        }
        const what = this.mode === 'move' ? BUILDING_INFO[this.#building(this.selectedId)?.type]?.name : itemName(placingType);
        $('place-hint').textContent = `Tap the map where the ${what} should stand.`;
        if (this.state) renderStorage($('storage'), this.state.storage, this.placingType, (type) => this.#togglePlacing(type));
        this.#renderBottom();
    }

    #togglePlacing(type) {
        if (this.mode === 'place' && this.placingType === type) this.#setMode('idle');
        else this.#setMode('place', type);
    }

    /** One thing at a time above the corner buttons: the building's actions, the placing hint, or the tray. */
    #renderBottom() {
        const placing = this.mode !== 'idle';
        $('place-bar').hidden = !placing;
        $('selection').hidden = placing || this.#building(this.selectedId) === null;
        const stored = this.state && Object.values(this.state.storage).some((n) => n > 0);
        $('storage-tray').hidden = placing || this.selectedId !== null || !stored;
    }

    // ── the interface ──────────────────────────────────────────────────
    #renderAll() {
        this.#renderPlayer();
        this.#renderResources();
        this.#renderSelection();
        renderStorage($('storage'), this.state.storage, this.placingType, (type) => this.#togglePlacing(type));
        this.#renderBottom();
        this.#renderForge();
        this.#renderRewards();
        this.#renderHero();
        this.#renderFusion();
        this.second = -1;
        this.#tick();
    }

    #renderPlayer() {
        const { pvp, progress } = this.state;
        const color = LEAGUE_COLORS[pvp.league] ?? '#c3cbdb';
        $('player-plate').style.setProperty('--league', color);
        $('league-badge').style.setProperty('--league', color);
        $('player-name').textContent = this.name || 'You';
        $('player-trophies').textContent = `${pvp.trophies} trophies · ${pvp.league}`;
        if (!progress) return;
        $('player-level').textContent = String(progress.level);
        $('xp-bar').style.width = `${Math.round((100 * progress.into_level) / progress.for_next)}%`;
        $('xp-text').textContent = `${progress.into_level} / ${progress.for_next} XP`;
        $('player-plate').setAttribute('aria-label',
            `Level ${progress.level}, ${progress.into_level} of ${progress.for_next} XP to the next. Open the ranking`);
    }

    // ── level and XP ───────────────────────────────────────────────────
    /** Compare with the last progress seen: "+XP" for a gain, a card for a new level. */
    #noticeProgress(progress) {
        const before = this.progress;
        if (!progress) return;
        this.progress = progress;
        if (!before) return;
        if (progress.xp > before.xp) this.#xpPop(progress.xp - before.xp);
        if (progress.level > before.level) void this.#queuePop(() => this.#levelPop(progress));
        // every fifth level the forge opens a slot: its own scene, after the level card
        if ((progress.forge_slots ?? 0) > (before.forge_slots ?? progress.forge_slots ?? 0)) {
            const slots = progress.forge_slots;
            void this.#queuePop(() => forgeSlotPop(slots, { onSlam: () => play('slam') }));
        }
    }

    /** Big cards one after the other, never on top of each other. */
    #queuePop(show) {
        const next = this.pops.then(show, show);
        this.pops = next.catch(() => {});
        return next;
    }

    #xpPop(amount) {
        const pop = document.createElement('span');
        pop.className = 'xp-pop';
        pop.textContent = `+${amount} XP`;
        pop.addEventListener('animationend', () => pop.remove());
        $('hud-city').append(pop);
    }

    #levelPop(progress) {
        play('levelup');
        bumpOnce($('league-badge'));
        const shield = document.createElement('div');
        shield.className = 'level-shield';
        shield.append(Object.assign(document.createElement('small'), { textContent: 'LEVEL' }),
            Object.assign(document.createElement('strong'), { textContent: String(progress.level) }));
        const perks = document.createElement('div');
        perks.className = 'level-perks';
        const perk = (iconName, text, color) => {
            const chip = document.createElement('span');
            if (color) chip.style.setProperty('--accent', color);
            chip.append(icon(iconName), text);
            perks.append(chip);
        };
        perk('hero', `+1 hero slot · ${progress.hero_slots}`);
        if (progress.unlocked_forge_slots) perk('anvil', `Forge slot ${progress.unlocked_forge_slots}`);
        for (const [m, amount] of Object.entries(progress.gift ?? {})) {
            perk(MATERIAL_INFO[m].icon, `+${amount}`, MATERIAL_INFO[m].color);
        }
        return rewardPop({ picture: shield, title: 'Level up!', extra: perks, line: 'Gifts added to your city', ms: 3600 });
    }

    #renderForge() {
        if (!this.state) return;
        for (const tab of document.querySelectorAll('#forge-tabs [data-kind]')) {
            tab.setAttribute('aria-pressed', String(tab.dataset.kind === this.forgeKind));
        }
        const freeSlots = this.state.forge.slots - this.state.forge.jobs.length;
        renderRecipes($('recipes'), this.state.recipes, this.state.materials, freeSlots, this.forgeKind, (id) => void this.#forge(id));
        const heroLimit = this.state.recipes.find((r) => r.kind === 'hero')?.limit ?? 0;
        $('roster').hidden = this.forgeKind !== 'hero';
        $('armoury').hidden = this.forgeKind !== 'item';
        if (this.state.item_table) {
            const names = heroNames(this.state.heroes);
            renderArmoury($('armoury'), {
                items: this.state.items, table: this.state.item_table, heroNameOf: (id) => names.get(id) ?? 'a hero',
                materials: this.state.materials, freeSlots, jobs: this.state.forge.jobs,
            }, (id) => void this.#upgradeItem(id));
        }
        const tierXp = this.state.evolution?.tier_xp;
        renderRoster($('roster'), this.state.heroes, heroLimit, this.#serverNow(), tierXp, (id) => this.#openHero(id));
        const evolvable = this.state.heroes.filter((h) => evolveReady(h, tierXp)).length;
        const tab = document.querySelector('#forge-tabs [data-kind="hero"]');
        tab.classList.toggle('alert', evolvable > 0);
    }

    /** Once a second: forge countdowns, the forge badge, energy under the Attack button. */
    #tick() {
        if (!this.state) return;
        const now = this.#serverNow();
        const second = Math.floor(now);
        if (second === this.second) return;
        this.second = second;
        const hourglass = usableBonuses('job', this.state.bonuses).length > 0;
        renderForgeSlots($('forge-slots'), this.state.forge, now, (id) => void this.#claim(id),
            hourglass ? (id) => this.#speedUpJob(id) : null, (id) => void this.#hammer(id), this.state.anvil_rounds ?? 3);
        this.#tickRewards(now);
        this.#tickTrips(now);
        const ready = this.state.forge.jobs.filter((j) => j.ready_at <= now).length;
        const badge = $('forge-badge');
        badge.hidden = ready === 0;
        badge.textContent = String(ready);
        const { charges, max, next_at: nextAt } = this.state.energy;
        const energy = $('city-energy');
        energy.replaceChildren(icon('bolt'), `${charges}/${max}${nextAt && charges < max ? ` · ${formatCountdown(nextAt - now)}` : ''}`);
    }

    /** Explorer bars and countdowns move every second; a return redraws the roster and the card. */
    #tickTrips(now) {
        updateTrips(document, now);
        const back = this.state.heroes.filter((h) => h.mission && h.mission.ready_at <= now).length;
        if (this.tripsBack !== undefined && back !== this.tripsBack) {
            this.#renderForge();
            if (this.heroId !== null) this.#renderHero();
        }
        this.tripsBack = back;
    }

    /** A round at the anvil: the little game, then the time it took off. */
    async #hammer(jobId) {
        const job = this.state.forge.jobs.find((j) => j.id === jobId);
        if (!job || this.busy) return;
        const game = openAnvil({ title: jobName(job), roundsLeft: (this.state.anvil_rounds ?? 3) - (job.hammered ?? 0) });
        const score = await game.score;
        if (!score) return;
        let line = null;
        await this.#run(async () => {
            const result = await hammerJob(jobId, score.perfect, score.good);
            this.#apply(result);
            const { cut, bonus } = result.hammer;
            line = cut > 0 ? `−${formatCountdown(cut)} off ${jobName(job)}!` : 'No time off this round.';
            if (bonus) line += ` And a ${BONUS_INFO[bonus].name}!`;
            play(cut > 0 ? 'boost' : 'error');
        });
        game.finish(line ?? 'The forge did not answer. Try again.');
    }

    async #buyOffer(offerId) {
        const offer = this.state.merchant.offers.find((o) => o.id === offerId);
        await this.#run(async () => {
            this.#apply(await buyOffer(offerId));
            play('claim');
            toast(`Bought: ${offerGives(offer.gives)}.`);
            this.#renderRewards();
        });
    }

    #speedUpJob(jobId) {
        const job = this.state.forge.jobs.find((j) => j.id === jobId);
        if (!job) return;
        this.#pickBonus('job', { job_id: jobId }, `Speed up ${jobName(job)}`,
            `${formatCountdown(job.ready_at - this.#serverNow())} left`);
    }

    #renderResources() {
        const bar = $('resources');
        const fresh = bar.childElementCount === 0;
        if (fresh) {
            for (const [key, info] of Object.entries(MATERIAL_INFO)) {
                const item = document.createElement('span');
                item.className = 'resource';
                item.dataset.material = key;
                item.style.setProperty('--accent', info.color);
                item.title = info.name;
                item.append(icon(info.icon), document.createElement('b'));
                bar.append(item);
            }
        }
        for (const item of bar.children) {
            const key = item.dataset.material;
            const value = this.state.materials[key] ?? 0;
            if (this.heldMaterials.has(key)) continue;   // gems on their way: the counter waits for them
            item.querySelector('b').textContent = String(value);
            if (!fresh && value > (this.shownMaterials[key] ?? value)) bump(item);
            this.shownMaterials[key] = value;
        }
    }

    #renderSelection() {
        const b = this.#building(this.selectedId);
        this.#renderBottom();
        if (!b) return;
        $('sel-name').textContent = BUILDING_INFO[b.type].name;      // the level and path sit on their own line
        $('btn-upgrade').hidden = !this.state.upgrades?.table[b.type] || Boolean(b.fusion);
        $('btn-fuse').hidden = !canFuse('building', b, this.state);
        $('sel-what').textContent = b.fusing ? 'Fusing at the forge: it keeps working meanwhile.' : BUILDING_INFO[b.type].what;
        $('sel-thumb').src = buildingThumb(b.type, 64, b.level ?? 1, b.path ?? null, b.fusion ?? null);
        if (b.fusion) this.#renderFusionLine(b);
        else this.#renderUpgradeLine(b);
        const locked = b.type === 'core' || b.type === 'vault';
        const refund = this.#recipe(b.type)?.refund ?? {};
        const refundText = Object.entries(refund).map(([m, n]) => `+${n} ${MATERIAL_INFO[m].name.toLowerCase()}`).join(' ');
        const button = $('btn-dismantle');
        button.hidden = locked;
        button.classList.toggle('danger', this.confirmDismantle);
        button.querySelector('.action-label').textContent = this.confirmDismantle ? 'Sure?' : 'Dismantle';
        button.title = this.confirmDismantle ? `Tap again to dismantle and get back ${refundText || 'nothing'}` : 'Dismantle';
        if (this.confirmDismantle) toast(`Tap again to dismantle. You get back ${refundText || 'nothing'}.`);
        $('btn-aim').hidden = !b.aim;
        $('btn-aim').setAttribute('aria-pressed', String(this.aimOpen));
        $('aim-picker').hidden = !b.aim || !this.aimOpen;
        if (b.aim) this.#renderAim(b);
        this.infoText = '';
        this.#updateInfo();
    }

    /** A fused building says its grade and what it is made of. */
    #renderFusionLine(b) {
        const line = $('sel-upgrade');
        line.hidden = false;
        line.style.setProperty('--accent', BUILDING_INFO[b.type].glow);
        const tag = document.createElement('b');
        tag.textContent = `◆ Fusion ${'◆'.repeat(b.fusion.grade)}`;
        const parts = document.createElement('span');
        parts.textContent = b.fusion.parts.map(partName).join(' + ');
        line.replaceChildren(tag, parts);
        line.title = 'Every part works at once: it shoots, makes and bites back with all of them.';
    }

    /** An upgraded building says its level, its path and what they add. */
    #renderUpgradeLine(b) {
        const line = $('sel-upgrade');
        const table = this.state.upgrades?.table[b.type];
        line.hidden = !table || !(b.level > 1);
        if (line.hidden) return;
        const path = b.path ? PATH_INFO[b.path] : null;
        line.style.setProperty('--accent', path?.accent ?? '#ffb347');
        const tag = document.createElement('b');
        tag.textContent = `★ Level ${b.level}${path ? ` · ${path.name}` : ''}`;
        const bonuses = document.createElement('span');
        bonuses.textContent = upgradeBonuses(table, b.level, b.path ?? null).join(' · ');
        line.replaceChildren(tag, bonuses);
        if (path) line.title = path.what;
    }

    #renderAim(b) {
        const chips = $('aim-chips');
        chips.replaceChildren();
        for (const [aim, info] of Object.entries(AIM_INFO)) {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.append(icon(CHOICE_ICONS.aim[aim]), info.name);
            chip.setAttribute('aria-pressed', String(aim === b.aim));
            chip.addEventListener('click', () => void this.#setAim(aim));
            chips.append(chip);
        }
        $('aim-hint').textContent = `${AIM_INFO[b.aim].hint} A Guardian close to the tower always draws its fire.`;
        $('btn-aim').querySelector('.action-label').textContent = `Aim: ${AIM_INFO[b.aim].name}`;
    }

    #updateInfo() {
        const b = this.#building(this.selectedId);
        if (!b) return;
        let text = `${b.hp} HP`;
        if (b.production) {
            const material = MATERIAL_INFO[b.production.material].name.toLowerCase();
            text += ` · +${b.production.per_hour} ${material}/h · holds ${this.#pendingOf(b)}/${b.production.capacity}`;
        }
        if (b.range) text += ` · reach ${b.range} cells`;
        const weapons = b.fusion?.stats?.weapons?.length ?? 0;
        if (weapons > 1) text += ` · ${weapons} weapons`;
        if (b.fusion?.stats?.produces?.length > 1) {
            text += ` · makes ${b.fusion.stats.produces.map((p) => MATERIAL_INFO[p.material].name.toLowerCase()).join(' + ')}`;
        }
        if (text !== this.infoText) {
            this.infoText = text;
            $('sel-info').textContent = text;
        }
    }
}

function loadRotation() {
    try {
        const rot = Number(globalThis.localStorage?.getItem(ROTATION_KEY));
        return Number.isInteger(rot) && rot >= 0 && rot < 4 ? rot : 0;
    } catch {
        return 0;
    }
}

function saveRotation(rot) {
    try {
        globalThis.localStorage?.setItem(ROTATION_KEY, String(rot));
    } catch { /* private mode: the turn is simply not remembered */ }
}

/** Why a hero cannot be let go now, or null. */
function dismissBlocker(hero, heroes) {
    if (hero.evolving) return 'It is at the forge: wait until it is done.';
    if (hero.mission) return 'It is on a mission: bring it home first.';
    const fighters = heroes.filter((h) => h.cls !== 'explorer').length;
    if (hero.cls !== 'explorer' && fighters <= 4) return 'You need at least 4 fighters for a squad.';
    return null;
}

/** The card for what an Explorer brought home. */
function lootCard(name, loot) {
    const parts = [];
    const total = Object.values(loot.materials).reduce((a, b) => a + b, 0);
    parts.push(`+${total} materials`);
    for (const [bonus, n] of Object.entries(loot.bonuses)) parts.push(`${BONUS_INFO[bonus].name}${n > 1 ? ` ×${n}` : ''}`);
    if (loot.item) parts.push(`${ITEM_INFO[loot.item].name}!`);
    return {
        src: loot.item ? itemPicture(loot.item, 150) : heroThumb('explorer', 150),
        title: `${name} is back!`, line: parts.join(' · '), color: HERO_INFO.explorer.color,
    };
}

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
        src: itemThumb(item, 150), title: `${itemName(item)}${count > 1 ? ` ×${count}` : ''}`,
        line: hero ? 'joined your heroes!' : 'forged! Now place it on the map',
        color: hero ? HERO_INFO[item].color : (BUILDING_INFO[item]?.glow ?? '#ffb347'),
    };
}

function bumpOnce(el) {
    el.classList.remove('bump');
    void el.offsetWidth;              // restart the animation
    el.classList.add('bump');
    el.addEventListener('animationend', () => el.classList.remove('bump'), { once: true });
}

function bump(item) {
    item.classList.remove('bump');
    void item.offsetWidth;            // restart the animation
    item.classList.add('bump');
}

/** What the defence test depends on: where every building stands and how towers aim. */
function defenseKey(city) {
    return city.buildings.map((b) => `${b.id}:${b.type}:${b.x}:${b.y}:${b.aim ?? ''}`).join('|');
}
