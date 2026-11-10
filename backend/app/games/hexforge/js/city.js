import {
    Refused, SignInRequired, claimJob, collect, dismantleBuilding, fetchMyState,
    fetchDefenseLog, fetchRaidReplay, markDefensesSeen, moveBuilding, placeBuilding, revengeRaid,
    setAim, startForging, testDefense,
} from './api.js';
import { anchorFor, estimatePending, placementError } from './cityRules.js';
import { describeWorst, renderDefenseReport } from './defensePanel.js';
import { countUp, flyMaterial, flyPicture, rewardPop } from './fx.js';
import { formatCountdown, itemName, itemThumb, renderForgeSlots, renderRecipes, renderRoster, renderStorage } from './forgePanel.js';
import { icon, withIcon } from './icons.js';
import { regionAround } from './iso.js';
import { AIM_INFO, BUILDING_INFO, CHOICE_ICONS, HERO_INFO, MATERIAL_INFO } from './labels.js';
import { LEAGUE_COLORS, leagueProgress } from './leagues.js';
import { renderRaidLog, timeAgo } from './raidLog.js';
import { closeSheet, isSheetOpen, openSheet, toast } from './sheets.js';
import { buildingThumb } from './thumbs.js';

/**
 * "My city": the player's saved city, full screen.
 *  - tap a glowing building to collect what it made
 *  - tap a building for its actions: move, aim (towers), dismantle
 *  - Forge (sheet): forge buildings and heroes; claimed buildings go to the
 *    "ready to place" tray, then onto the map
 *  - Defense (sheet): defence test, raids on your city, replay and revenge
 *  - the big Attack button opens the attack plan
 */

const $ = (id) => document.getElementById(id);
const FLOAT_SECONDS = 1.4;
const BUBBLE_FROM = 5;            // units before a building shows it has something to collect
const EMPTY_CITY = { grid: 18, buildings: [] };
const INSETS = { top: 80, right: 0, bottom: 160, left: 0 };
const MESSAGES = {
    occupied: 'That spot is taken.',
    outside_city: 'Keep it inside the city limits.',
    unknown_building: 'That building is gone. Reloading your city…',
    state_changed_retry: 'Your city changed meanwhile. Try again.',
    forge_busy: 'Both forge slots are busy.',
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
        this.onWatch = () => {};      // set by the shell: replay a battle
        this.onRevenge = () => {};    // set by the shell: open the attack plan on the scouted raider
        this.onAttack = () => {};     // set by the shell: open the attack plan
        this.onRanking = () => {};    // set by the shell: open the ranking
        this.#wire();
    }

    async enter() {
        $('hud-city').hidden = false;
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

    #openForge() {
        if (!this.state) return;
        this.#select(null);
        this.#renderForge();
        openSheet('sheet-forge');
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
        flyMaterial(this.renderer.screenOf(b.x + b.size / 2, b.y + b.size / 2, 30), pill, {
            iconName: info.icon,
            color: info.color,
            count: Math.max(4, Math.min(10, Math.round(amount / 12))),
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
            toast(MESSAGES[target.error]);
            return;
        }
        await this.#run(async () => {
            if (this.mode === 'move') {
                this.#apply(await moveBuilding(this.selectedId, target.x, target.y));
                this.#setMode('idle');
                toast('Moved.');
            } else {
                const type = this.placingType;
                this.#apply(await placeBuilding(type, target.x, target.y));
                toast(`${itemName(type)} placed.`);
                if (!this.state.storage[type]) this.#setMode('idle');
            }
        });
    }

    async #forge(recipeId) {
        const picture = document.querySelector(`#recipes [data-recipe="${recipeId}"] img`);
        await this.#run(async () => {
            this.#apply(await startForging(recipeId));
            const slot = $('forge-slots').children[this.state.forge.jobs.length - 1];
            if (picture && slot) void flyPicture(picture.src, picture, slot, { size: 72 });
            toast(`The forge is making ${itemName(recipeId)}.`);
        });
    }

    async #claim(jobId) {
        let claimed = null;
        await this.#run(async () => {
            const result = await claimJob(jobId);
            this.#apply(result);
            claimed = result.claimed;
        });
        if (!claimed) return;
        const { item, kind, count } = claimed;
        const hero = kind === 'hero';
        await rewardPop({
            src: itemThumb(item, 150),
            title: `${itemName(item)}${count > 1 ? ` ×${count}` : ''}`,
            line: hero ? 'joined your heroes!' : 'forged! Now place it on the map',
            color: hero ? HERO_INFO[item].color : (BUILDING_INFO[item]?.glow ?? '#ffb347'),
        });
        if (hero) {
            this.forgeKind = 'hero';
            this.#renderForge();
            return;
        }
        closeSheet();
        this.#setMode('place', item);
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
        this.second = -1;
        this.#tick();
    }

    #renderPlayer() {
        const { pvp } = this.state;
        const color = LEAGUE_COLORS[pvp.league] ?? '#c3cbdb';
        $('player-plate').style.setProperty('--league', color);
        $('league-badge').style.setProperty('--league', color);
        $('player-name').textContent = this.name || 'You';
        $('player-trophies').textContent = `${pvp.trophies} trophies · ${pvp.league}`;
        $('league-bar').style.width = `${Math.round(100 * leagueProgress(pvp.trophies, pvp.league, pvp.next_league))}%`;
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
        renderRoster($('roster'), this.state.heroes, heroLimit, this.#serverNow());
    }

    /** Once a second: forge countdowns, the forge badge, energy under the Attack button. */
    #tick() {
        if (!this.state) return;
        const now = this.#serverNow();
        const second = Math.floor(now);
        if (second === this.second) return;
        this.second = second;
        renderForgeSlots($('forge-slots'), this.state.forge, now, (id) => void this.#claim(id));
        const ready = this.state.forge.jobs.filter((j) => j.ready_at <= now).length;
        const badge = $('forge-badge');
        badge.hidden = ready === 0;
        badge.textContent = String(ready);
        const { charges, max, next_at: nextAt } = this.state.energy;
        const energy = $('city-energy');
        energy.replaceChildren(icon('bolt'), `${charges}/${max}${nextAt && charges < max ? ` · ${formatCountdown(nextAt - now)}` : ''}`);
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
        $('sel-name').textContent = BUILDING_INFO[b.type].name;
        $('sel-thumb').src = buildingThumb(b.type, 64);
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
        if (text !== this.infoText) {
            this.infoText = text;
            $('sel-info').textContent = text;
        }
    }
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
