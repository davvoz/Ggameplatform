import {
    Refused, SignInRequired, claimJob, collect, dismantleBuilding, fetchMyState,
    moveBuilding, placeBuilding, startForging,
} from './api.js';
import { anchorFor, estimatePending, placementError } from './cityRules.js';
import { itemName, renderForgeSlots, renderRecipes, renderRoster, renderStorage } from './forgePanel.js';
import { BUILDING_INFO, MATERIAL_INFO } from './labels.js';

/**
 * "My city": the player's saved city.
 *  - tap a glowing production building to collect, or Collect all
 *  - select a building to move or dismantle it
 *  - forge buildings and heroes; place forged buildings from storage
 */

const $ = (id) => document.getElementById(id);
const FLOAT_SECONDS = 1.4;
const BUBBLE_FROM = 5;            // units before a building shows it has something to collect
const EMPTY_CITY = { grid: 18, buildings: [] };
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
};
const HINTS = {
    idle: 'Tap a glowing building to collect what it made. Select a building to move or dismantle it.',
    move: 'Tap where the building should stand. Green fits, red does not. Esc cancels.',
    place: 'Tap where the new building should stand. Green fits, red does not. Esc cancels.',
};

export class CityMode {
    constructor(renderer) {
        this.renderer = renderer;
        this.state = null;
        this.receivedAt = 0;
        this.selectedId = null;
        this.mode = 'idle';           // idle | move | place
        this.placingType = null;
        this.preview = null;
        this.confirmDismantle = false;
        this.floaters = [];
        this.busy = false;
        this.infoText = '';
        this.forgeSecond = -1;
        $('btn-collect-all').addEventListener('click', () => void this.#collect(null));
        $('btn-move').addEventListener('click', () => this.#setMode(this.mode === 'move' ? 'idle' : 'move'));
        $('btn-dismantle').addEventListener('click', () => void this.#dismantle());
        $('btn-deselect').addEventListener('click', () => this.#select(null));
        $('btn-recipes').addEventListener('click', () => {
            const list = $('recipes');
            list.hidden = !list.hidden;
            $('btn-recipes').textContent = list.hidden ? 'Forge something' : 'Hide recipes';
        });
    }

    async enter() {
        $('view-city').hidden = false;
        $('resources').hidden = false;
        if (this.state) this.renderer.setCity(this.state.city);
        else await this.#reload();
    }

    leave() {
        this.#setMode('idle');
        $('view-city').hidden = true;
        $('resources').hidden = true;
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
        if (this.mode === 'idle') this.#select(null);
        else this.#setMode('idle');
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
            preview: this.mode === 'idle' ? null : this.preview,
            bubbles,
            floaters: this.floaters,
            showTraps: true,
        });
        this.#updateInfo();
        this.#tickForge();
    }

    // ── server round trips ─────────────────────────────────────────────
    async #reload() {
        try {
            this.#apply(await fetchMyState());
            $('city-signin').hidden = true;
            $('city-body').hidden = false;
        } catch (error) {
            if (!(error instanceof SignInRequired)) throw error;
            this.renderer.setCity(EMPTY_CITY);
            $('city-signin').hidden = false;
            $('city-body').hidden = true;
            $('resources').hidden = true;
        }
    }

    #apply(state) {
        this.state = state;
        this.receivedAt = performance.now();
        this.renderer.setCity(state.city);
        if (this.selectedId !== null && !this.#building(this.selectedId)) this.#select(null);
        if (this.mode === 'place' && !state.storage[this.placingType]) this.#setMode('idle');
        this.#renderAll();
    }

    async #collect(ids) {
        if (this.busy || !this.state) return;
        const sources = this.state.city.buildings
            .filter((b) => b.production && (!ids || ids.includes(b.id)))
            .map((b) => ({ b, amount: this.#pendingOf(b) }))
            .filter(({ amount }) => amount > 0);
        if (!sources.length) {
            this.#message('Nothing to collect yet.');
            return;
        }
        await this.#run(async () => {
            const result = await collect(ids);
            for (const { b, amount } of sources) {
                const info = MATERIAL_INFO[b.production.material];
                this.#float(b, `+${amount} ${info.name}`, info.color);
            }
            this.#apply(result);
            this.#message('');
        });
    }

    async #tryDrop(point) {
        const target = this.#previewAt(point);
        this.preview = target;
        if (!target.valid) {
            this.#message(MESSAGES[target.error]);
            return;
        }
        await this.#run(async () => {
            if (this.mode === 'move') {
                this.#apply(await moveBuilding(this.selectedId, target.x, target.y));
                this.#setMode('idle');
                this.#message('Moved.');
            } else {
                const type = this.placingType;
                this.#apply(await placeBuilding(type, target.x, target.y));
                this.#message(`${itemName(type)} placed.`);
                if (!this.state.storage[type]) this.#setMode('idle');
            }
        });
    }

    async #forge(recipeId) {
        await this.#run(async () => {
            this.#apply(await startForging(recipeId));
            this.#message(`Forging ${itemName(recipeId)}.`);
        });
    }

    async #claim(jobId) {
        await this.#run(async () => {
            const result = await claimJob(jobId);
            this.#apply(result);
            const { item, kind, count } = result.claimed;
            this.#message(kind === 'hero'
                ? `${itemName(item)} joined your heroes.`
                : `${itemName(item)}${count > 1 ? ` ×${count}` : ''} ready in storage. Tap it below to place it.`);
        });
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
            this.#message(`${BUILDING_INFO[b.type].name} dismantled.`);
        });
    }

    async #run(action) {
        this.busy = true;
        try {
            await action();
        } catch (error) {
            if (error instanceof Refused) {
                this.#message(MESSAGES[error.code] ?? 'The server refused that.');
                await this.#reload();
            } else if (error instanceof SignInRequired) {
                await this.#reload();
            } else {
                console.error('[Hexforge] city action failed', error);
                this.#message('The server did not answer. Try again in a moment.');
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
        this.selectedId = id;
        this.confirmDismantle = false;
        this.#renderSelection();
    }

    #setMode(mode, placingType = null) {
        this.mode = mode === 'move' && this.selectedId === null ? 'idle' : mode;
        this.placingType = this.mode === 'place' ? placingType : null;
        this.preview = null;
        $('btn-move').textContent = this.mode === 'move' ? 'Cancel move' : 'Move';
        $('city-hint').textContent = HINTS[this.mode];
        if (this.state) renderStorage($('storage'), this.state.storage, this.placingType, (type) => this.#togglePlacing(type));
    }

    #togglePlacing(type) {
        if (this.mode === 'place' && this.placingType === type) this.#setMode('idle');
        else this.#setMode('place', type);
    }

    #message(text) {
        $('city-message').textContent = text;
    }

    // ── panel ──────────────────────────────────────────────────────────
    #renderAll() {
        this.#renderResources();
        this.#renderSelection();
        this.forgeSecond = -1;
        this.#tickForge();
        const freeSlots = this.state.forge.slots - this.state.forge.jobs.length;
        renderRecipes($('recipes'), this.state.recipes, this.state.materials, freeSlots, (id) => void this.#forge(id));
        renderStorage($('storage'), this.state.storage, this.placingType, (type) => this.#togglePlacing(type));
        const heroLimit = this.state.recipes.find((r) => r.kind === 'hero')?.limit ?? 0;
        renderRoster($('roster'), this.state.heroes, heroLimit);
    }

    #tickForge() {
        if (!this.state) return;
        const second = Math.floor(this.#serverNow());
        if (second === this.forgeSecond) return;
        this.forgeSecond = second;
        renderForgeSlots($('forge-slots'), this.state.forge, this.#serverNow(), (id) => void this.#claim(id));
    }

    #renderResources() {
        const bar = $('resources');
        bar.replaceChildren();
        for (const [key, info] of Object.entries(MATERIAL_INFO)) {
            const item = document.createElement('span');
            item.className = 'resource';
            item.style.setProperty('--accent', info.color);
            item.title = info.name;
            const name = document.createElement('span');
            name.className = 'resource-name';
            name.textContent = info.name;
            const value = document.createElement('b');
            value.textContent = String(this.state.materials[key] ?? 0);
            item.append(name, value);
            bar.append(item);
        }
    }

    #renderSelection() {
        const b = this.#building(this.selectedId);
        $('selected').hidden = !b;
        if (!b) return;
        $('sel-name').textContent = BUILDING_INFO[b.type].name;
        const locked = b.type === 'core' || b.type === 'vault';
        const refund = this.#recipe(b.type)?.refund ?? {};
        const refundText = Object.entries(refund).map(([m, n]) => `${n} ${MATERIAL_INFO[m].name.toLowerCase()}`).join(', ');
        const button = $('btn-dismantle');
        button.hidden = locked;
        button.textContent = this.confirmDismantle ? `Confirm: get back ${refundText || 'nothing'}` : 'Dismantle';
        button.classList.toggle('danger', this.confirmDismantle);
        this.infoText = '';
        this.#updateInfo();
    }

    #updateInfo() {
        const b = this.#building(this.selectedId);
        if (!b) return;
        let text = `${b.hp} HP · ${b.size}×${b.size}`;
        if (b.production) {
            const material = MATERIAL_INFO[b.production.material].name.toLowerCase();
            text += ` · makes ${b.production.per_hour} ${material} per hour`
                + ` · holds ${this.#pendingOf(b)} / ${b.production.capacity}`;
        }
        if (text !== this.infoText) {
            this.infoText = text;
            $('sel-info').textContent = text;
        }
    }
}
