import { Refused, SignInRequired, collect, fetchMyState, moveBuilding } from './api.js';
import { anchorFor, estimatePending, placementError } from './cityRules.js';
import { BUILDING_INFO, MATERIAL_INFO } from './labels.js';

/**
 * "My city": the player's saved city. Tap a glowing production building to
 * collect, select a building and press Move to relocate it.
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
};

export class CityMode {
    constructor(renderer) {
        this.renderer = renderer;
        this.state = null;
        this.receivedAt = 0;
        this.selectedId = null;
        this.moving = false;
        this.preview = null;
        this.floaters = [];
        this.busy = false;
        this.infoText = '';
        $('btn-collect-all').addEventListener('click', () => this.#collect(null));
        $('btn-move').addEventListener('click', () => this.#setMoving(!this.moving));
        $('btn-deselect').addEventListener('click', () => this.#select(null));
    }

    async enter() {
        $('view-city').hidden = false;
        $('resources').hidden = false;
        if (this.state) this.renderer.setCity(this.state.city);
        else await this.#reload();
    }

    leave() {
        this.#setMoving(false);
        $('view-city').hidden = true;
        $('resources').hidden = true;
    }

    // ── input ──────────────────────────────────────────────────────────
    onClick(event) {
        if (!this.state || this.busy) return;
        const point = this.renderer.canvasPoint(event);
        if (this.moving) {
            this.#tryMove(point);
            return;
        }
        const building = this.renderer.buildingAt(point);
        this.#select(building?.id ?? null);
        if (building?.production && this.#pendingOf(building) > 0) this.#collect([building.id]);
    }

    onPointerMove(event) {
        if (!this.moving || !this.state) return;
        this.preview = this.#previewAt(this.renderer.canvasPoint(event));
    }

    onEscape() {
        if (this.moving) this.#setMoving(false);
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
            selectedId: this.selectedId,
            preview: this.moving ? this.preview : null,
            bubbles,
            floaters: this.floaters,
            showTraps: true,
        });
        this.#updateInfo();
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
        this.#renderResources();
        if (this.selectedId !== null && !this.#building(this.selectedId)) this.#select(null);
        this.#renderSelection();
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
                this.floaters.push({ x: b.x + b.size / 2, y: b.y + b.size / 2, text: `+${amount} ${info.name}`, color: info.color, age: 0 });
            }
            this.#apply(result);
            this.#message('');
        });
    }

    async #tryMove(point) {
        const target = this.#previewAt(point);
        this.preview = target;
        if (!target.valid) {
            this.#message(MESSAGES[target.error]);
            return;
        }
        await this.#run(async () => {
            this.#apply(await moveBuilding(this.selectedId, target.x, target.y));
            this.#setMoving(false);
            this.#message('Moved.');
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

    #pendingOf(b) {
        if (!b.production) return 0;
        return estimatePending(b.production, (performance.now() - this.receivedAt) / 1000);
    }

    #previewAt(point) {
        const b = this.#building(this.selectedId);
        const ground = this.renderer.groundAt(point);
        const { x, y } = anchorFor(b.size, ground.x, ground.y);
        const error = placementError(this.state.city, b, x, y);
        return { x, y, size: b.size, valid: !error, error };
    }

    #select(id) {
        if (id !== this.selectedId) this.#setMoving(false);
        this.selectedId = id;
        this.#renderSelection();
    }

    #setMoving(on) {
        this.moving = on && this.selectedId !== null;
        this.preview = null;
        $('btn-move').textContent = this.moving ? 'Cancel move' : 'Move';
        $('city-hint').textContent = this.moving
            ? 'Tap where the building should stand. Green fits, red does not.'
            : 'Tap a glowing building to collect what it made. Select a building to move it.';
    }

    #message(text) {
        $('city-message').textContent = text;
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
