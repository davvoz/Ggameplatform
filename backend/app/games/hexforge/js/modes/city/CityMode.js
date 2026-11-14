import { Refused, SignInRequired, collect, fetchMyState, catchGremlins } from '../../net/api.js';
import { estimatePending, defenseKey } from '../../core/cityRules.js';
import { play } from '../../fx/audio.js';
import { countUp, flyMaterial } from '../../fx/fx.js';
import { formatCountdown, renderForgeSlots, renderStorage } from '../../ui/panels/forgePanel.js';
import { openGremlins } from '../../minigames/gremlins.js';
import { updateTrips } from '../../ui/heroTiles.js';
import { icon } from '../../ui/icons.js';
import { Compass } from '../../ui/compass.js';
import { regionAround } from '../../core/iso.js';
import { MATERIAL_INFO } from '../../data/labels.js';
import { usableBonuses } from '../../ui/panels/rewardsPanel.js';
import { closeSheet, isSheetOpen, toast } from '../../ui/sheets.js';
import { $, bump } from './shared.js';
import { MESSAGES } from '../../data/messages.js';
import { CitySelection } from './selection.js';
import { CityHud } from './hud.js';
import { ForgeSheet } from './sheets/forgeSheet.js';
import { HeroSheet } from './sheets/heroSheet.js';
import { FusionSheet } from './sheets/fusionSheet.js';
import { UpgradeSheet } from './sheets/upgradeSheet.js';
import { RewardsSheet } from './sheets/rewardsSheet.js';
import { DefenseSheet } from './sheets/defenseSheet.js';

const FLOAT_SECONDS = 1.4;
const BUBBLE_FROM = 5;            // units before a building shows it has something to collect
const EMPTY_CITY = { grid: 18, buildings: [] };
const INSETS = { top: 80, right: 0, bottom: 160, left: 0 };
const ROTATION_KEY = 'hexforge.cityRotation';

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

/**
 * "My city": the player's saved city, full screen. This class runs the mode:
 * loading and saving the state, input on the map, the frame, the HUD timers.
 * What each part shows and does lives beside it:
 *  - selection.js: tap a building for its actions (move, aim, upgrade, fuse,
 *    dismantle), placing a claimed building from the tray
 *  - hud.js: the player's level, XP and materials, level-up and other big cards
 *  - sheets/: the forge, a hero's card, fusion, upgrades, rewards, defense
 * Tapping a glowing building collects what it made; the big Attack button
 * opens the attack plan.
 */
export class CityMode {
    constructor(renderer) {
        this.renderer = renderer;
        this.state = null;
        this.name = '';
        this.receivedAt = 0;
        this.floaters = [];
        this.busy = false;
        this.second = -1;
        this.shownMaterials = {};
        this.heldMaterials = new Set();   // materials whose counter waits for flying gems
        this.rot = loadRotation();        // quarter turns of the view, remembered on this device
        this.compass = new Compass($('compass-rose'));
        this.onWatch = () => {};      // set by the shell: replay a battle
        this.onRevenge = () => {};    // set by the shell: open the attack plan on the scouted raider
        this.onAttack = () => {};     // set by the shell: open the attack plan
        this.onRanking = () => {};    // set by the shell: open the ranking
        this.selection = new CitySelection(this);
        this.hud = new CityHud(this);
        this.forgeSheet = new ForgeSheet(this);
        this.heroSheet = new HeroSheet(this);
        this.fusionSheet = new FusionSheet(this);
        this.upgradeSheet = new UpgradeSheet(this);
        this.rewardsSheet = new RewardsSheet(this);
        this.defenseSheet = new DefenseSheet(this);
        this.#wire();
    }

    async enter() {
        $('hud-city').hidden = false;
        this.renderer.setRotation(this.rot);
        this.compass.show(this.rot);
        if (this.state) this.renderer.setCity(this.state.city);
        else await this.#reload();
        this.#focus();
        void this.defenseSheet.loadRaids();
    }

    /** Another mode changed the saved state: reload on the next visit. */
    invalidate() {
        this.state = null;
    }

    leave() {
        this.selection.setMode('idle');
        this.selection.select(null);
        closeSheet();
        $('hud-city').hidden = true;
    }

    // ── input ──────────────────────────────────────────────────────────
    onClick(event) {
        if (!this.state || this.busy) return;
        const point = this.renderer.canvasPoint(event);
        if (this.selection.mode !== 'idle') {
            void this.selection.tryDrop(point);
            return;
        }
        const building = this.renderer.buildingAt(point);
        this.selection.select(building?.id ?? null);
        if (building?.production && this.pendingOf(building) > 0) void this.#collect([building.id]);
    }

    onPointerMove(event) {
        if (this.selection.mode === 'idle' || !this.state) return;
        this.selection.preview = this.selection.previewAt(this.renderer.canvasPoint(event));
    }

    onEscape() {
        if (isSheetOpen()) closeSheet();
        else if (this.selection.mode !== 'idle') this.selection.setMode('idle');
        else this.selection.select(null);
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
            const amount = this.pendingOf(b);
            if (amount >= BUBBLE_FROM) {
                bubbles.set(b.id, { amount, material: b.production.material, full: amount >= b.production.capacity });
            }
        }
        this.renderer.draw(null, {
            time,
            selectedId: this.selection.mode === 'place' ? null : this.selection.selectedId,
            ranges: this.selection.mode === 'idle' ? this.selection.selectedId : null,
            preview: this.selection.mode === 'idle' ? null : this.selection.preview,
            bubbles,
            floaters: this.floaters,
            showTraps: true,
        });
        this.selection.updateInfo();
        this.#tick();
    }

    // ── wiring ─────────────────────────────────────────────────────────
    #wire() {
        $('btn-attack').addEventListener('click', () => this.onAttack());
        $('player-plate').addEventListener('click', () => this.onRanking());
        $('btn-open-forge').addEventListener('click', () => this.forgeSheet.openForge());
        $('btn-open-defense').addEventListener('click', () => this.defenseSheet.openDefense());
        $('btn-open-rewards').addEventListener('click', () => this.rewardsSheet.openRewards());
        $('btn-gremlins').addEventListener('click', () => void this.#gremlins());
        $('btn-collect-all').addEventListener('click', () => void this.#collect(null));
        $('btn-defense-test').addEventListener('click', () => void this.defenseSheet.testDefense());
        $('btn-move').addEventListener('click', () => this.selection.setMode(this.selection.mode === 'move' ? 'idle' : 'move'));
        $('btn-aim').addEventListener('click', () => {
            this.selection.aimOpen = !this.selection.aimOpen;
            this.selection.renderSelection();
            this.selection.reveal();
        });
        $('btn-dismantle').addEventListener('click', () => void this.selection.dismantle());
        $('btn-deselect').addEventListener('click', () => this.selection.select(null));
        $('btn-cancel-place').addEventListener('click', () => this.selection.setMode('idle'));
        $('btn-rotate').addEventListener('click', () => this.#turn());
        $('btn-upgrade').addEventListener('click', () => this.upgradeSheet.openUpgrade());
        $('btn-fuse').addEventListener('click', () => {
            if (this.selection.selectedId !== null) this.fusionSheet.openFusion('building', this.selection.selectedId);
        });
        for (const tab of document.querySelectorAll('#forge-tabs [data-kind]')) {
            tab.addEventListener('click', () => {
                this.forgeSheet.forgeKind = tab.dataset.kind;
                this.forgeSheet.renderForge();
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
        this.selection.preview = null;
        const view = $('view');
        view.classList.remove('turning');
        view.getBoundingClientRect();     // force a layout: restarts the fade
        view.classList.add('turning');
        this.selection.reveal();
    }

    // ── server round trips ─────────────────────────────────────────────
    async #reload() {
        try {
            this.apply(await fetchMyState());
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

    apply(state) {
        if (state.name) this.name = state.name;
        this.state = state;
        this.hud.noticeProgress(state.progress);
        this.receivedAt = performance.now();
        this.renderer.setCity(state.city);
        if (this.selection.selectedId !== null && !this.building(this.selection.selectedId)) this.selection.select(null);
        if (this.selection.mode === 'place' && !state.storage[this.selection.placingType]) this.selection.setMode('idle');
        if (this.defenseSheet.defense && defenseKey(state.city) !== this.defenseSheet.defenseKey) this.defenseSheet.showDefense(null);
        this.defenseSheet.defenseLabel();
        this.#renderAll();
    }

    async #collect(ids) {
        if (this.busy || !this.state) return;
        const sources = this.state.city.buildings
            .filter((b) => b.production && (!ids || ids.includes(b.id)))
            .map((b) => ({ b, amount: this.pendingOf(b) }))
            .filter(({ amount }) => amount > 0);
        if (!sources.length) return;
        await this.run(async () => {
            const result = await collect(ids);
            const before = { ...this.shownMaterials };
            for (const { b } of sources) this.heldMaterials.add(b.production.material);
            this.apply(result);
            for (const { b, amount } of sources) this.#flyHome(b, amount, before);
        });
    }

    /** Gems burst out of the building and fly into their counter, which then counts up. */
    #flyHome(b, amount, before) {
        const key = b.production.material;
        const info = MATERIAL_INFO[key];
        const pill = document.querySelector(`#resources [data-material="${key}"]`);
        this.float(b, `+${amount}`, info.color);
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

    /**
     * Runs a server action with the city marked busy. Returns what `action`
     * returned, or undefined if it failed (the player has been told why).
     * Wrap a promise you want back (a card still showing) in an object, or
     * it would be waited for here, keeping the city busy.
     */
    async run(action) {
        this.busy = true;
        try {
            return await action();
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
    building(id) {
        return this.state?.city.buildings.find((b) => b.id === id) ?? null;
    }

    serverNow() {
        return this.state.server_time + (performance.now() - this.receivedAt) / 1000;
    }

    pendingOf(b) {
        if (!b.production) return 0;
        return estimatePending(b.production, (performance.now() - this.receivedAt) / 1000);
    }

    recipe(id) {
        return this.state.recipes.find((r) => r.id === id);
    }

    float(b, text, color) {
        this.floaters.push({ x: b.x + b.size / 2, y: b.y + b.size / 2, text, color, age: 0 });
    }

    // ── the interface ──────────────────────────────────────────────────
    #renderAll() {
        this.hud.renderPlayer();
        this.hud.renderResources();
        this.selection.renderSelection();
        renderStorage($('storage'), this.state.storage, this.selection.placingType, (type) => this.selection.togglePlacing(type));
        this.selection.renderBottom();
        this.forgeSheet.renderForge();
        this.rewardsSheet.renderRewards();
        this.heroSheet.renderHero();
        this.fusionSheet.renderFusion();
        this.second = -1;
        this.#tick();
    }

    /** Once a second: forge countdowns, the forge badge, energy under the Attack button. */
    #tick() {
        if (!this.state) return;
        const now = this.serverNow();
        const second = Math.floor(now);
        if (second === this.second) return;
        this.second = second;
        const hourglass = usableBonuses('job', this.state.bonuses).length > 0;
        renderForgeSlots($('forge-slots'), this.state.forge, now, (id) => void this.forgeSheet.claim(id),
            hourglass ? (id) => this.forgeSheet.speedUpJob(id) : null, (id) => void this.forgeSheet.hammer(id), this.state.anvil_rounds ?? 3);
        this.rewardsSheet.tickRewards(now);
        this.#tickTrips(now);
        $('btn-gremlins').hidden = this.gremlinsOn || !this.state.gremlins || this.state.gremlins.ready_at > now;
        const full = this.state.city.buildings.filter((b) => this.pendingOf(b) >= BUBBLE_FROM).length;
        $('btn-collect-all').hidden = this.gremlinsOn || full === 0;
        $('collect-badge').textContent = String(full);
        const ready = this.state.forge.jobs.filter((j) => j.ready_at <= now).length;
        const badge = $('forge-badge');
        badge.hidden = ready === 0;
        badge.textContent = String(ready);
        const { charges, max, next_at: nextAt } = this.state.energy;
        const energy = $('city-energy');
        const refill = nextAt && charges < max ? ` · ${formatCountdown(nextAt - now)}` : '';
        energy.replaceChildren(icon('bolt'), `${charges}/${max}${refill}`);
    }

    /** Explorer bars and countdowns move every second; a return redraws the roster and the card. */
    #tickTrips(now) {
        updateTrips(document, now);
        const back = this.state.heroes.filter((h) => h.mission && h.mission.ready_at <= now).length;
        if (this.tripsBack !== undefined && back !== this.tripsBack) {
            this.forgeSheet.renderForge();
            if (this.heroSheet.heroId !== null) this.heroSheet.renderHero();
        }
        this.tripsBack = back;
    }

    /** The gremlins' raid on the map: the little game, then what the caught ones dropped. */
    async #gremlins() {
        if (this.busy || !this.state?.gremlins || this.gremlinsOn) return;
        if (isSheetOpen()) closeSheet();
        this.selection.select(null);
        this.gremlinsOn = true;
        $('btn-gremlins').hidden = true;
        const { total, loot_each: lootEach, hours } = this.state.gremlins;
        const game = openGremlins({
            renderer: this.renderer, buildings: this.state.city.buildings, grid: this.state.city.grid,
            total, lootEach, hours,
        });
        const caught = await game.score;
        this.gremlinsOn = false;
        if (caught === null) return;
        let outcome = null;
        await this.run(async () => {
            const result = await catchGremlins(caught);
            this.apply(result);
            const { loot, bonus, ready_at: readyAt } = result.gremlins_result;
            outcome = { loot, bonus, readyAt };
        });
        game.finish(outcome ?? { error: 'The gremlins got away with the loot: try again later.' });
    }
}
