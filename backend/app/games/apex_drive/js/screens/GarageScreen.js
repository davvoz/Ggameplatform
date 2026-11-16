import { MODS } from '../config/Mods.js';
import { PARTS } from '../config/Parts.js';
import { drawText } from '../render/PixelFont.js';
import { ease } from '../render/ui/ease.js';
import { arrow, panel, segmentBar, textCentered, textRight, UI } from '../render/ui/widgets.js';
import { ratings } from '../sim/Build.js';
import { trackOf } from '../sim/setup.js';
import { header, HEADER_HEIGHT, menuBackground } from './backdrop.js';
import { MenuScreen } from './Screen.js';

/**
 * The garage: the car on its stand and its ratings on the left; on the
 * right the PARTS tab (upgrades bought tier by tier, Top Gear style) and
 * the MODS tab (the tactical build: slots and energy, each mod with its
 * price on the road). Moving over an item previews what it would change
 * on the bars (green: more, red: less). Buying flashes the row and makes
 * the car rev; not enough credits shakes it. Every change goes through
 * app.sync, which answers at once and keeps the server's career.
 *
 * Opened from a track (params.trackId) or from the weekly challenge
 * (params.challenge), it has a RACE button back to it.
 */
const ROW = { height: 13, gap: 2 };
const MOD_ROW = { height: 13, gap: 1, visible: 5 };
const TOP = HEADER_HEIGHT + 4;
const TABS = { height: 13 };
const CAR_BOX = { height: 58 };
const FEEDBACK = 1.6;
const ANSWERS = {
    credits: { text: 'NOT ENOUGH CREDITS', color: UI.red },
    max: { text: 'ALREADY TOP TIER', color: UI.gold },
    slots: { text: 'NO FREE SLOT', color: UI.red },
    energy: { text: 'NOT ENOUGH ENERGY', color: UI.red },
};
const PART_KEYS = Object.keys(PARTS);
const MOD_KEYS = Object.keys(MODS);

export class GarageScreen extends MenuScreen {
    #tab = 'parts';
    #scroll = 0;
    #credits = 0;
    /** The last answer: {text, color, at}, and the row it was about. */
    #toast = null;
    #flash = { id: null, at: -Infinity };
    #shake = { id: null, at: -Infinity };

    enter() {
        this.#credits = this.app.career.credits;
        this.menu.setFocus(`part:${PART_KEYS[0]}`);
    }

    update(dt) {
        super.update(dt);
        const target = this.app.career.credits;
        this.#credits += (target - this.#credits) * Math.min(1, dt * 6);
        if (Math.abs(target - this.#credits) < 1) this.#credits = target;
    }

    #columns(width) {
        const left = Math.round(width * 0.42) - 8;
        const x = left + 12;
        return { left, x, w: width - x - 6 };
    }

    layout({ width, height }) {
        const { x, w } = this.#columns(width);
        const half = Math.floor(w / 2) - 1;
        const tabs = [
            { id: 'tab:parts', label: 'PARTS', x, y: TOP, w: half, h: TABS.height, kind: this.#tab === 'parts' ? 'primary' : 'normal' },
            { id: 'tab:mods', label: 'MODS', x: x + half + 2, y: TOP, w: half, h: TABS.height, kind: this.#tab === 'mods' ? 'primary' : 'normal' },
        ];
        const listTop = TOP + TABS.height + 4;
        const rows = this.#tab === 'parts' ? this.#partRows(x, w, listTop) : this.#modRows(x, w, listTop + 11);
        const bottom = height - 22;
        const buttons = [...tabs, ...rows, { id: 'back', label: 'BACK', x: 6, y: bottom, w: 50, h: 16 }];
        if (this.params.trackId || this.params.challenge) buttons.push({ id: 'race', label: 'RACE!', kind: 'primary', x: width - 76, y: bottom, w: 70, h: 16 });
        return buttons;
    }

    #partRows(x, w, top) {
        return PART_KEYS.map((key, i) => ({ id: `part:${key}`, custom: true, x, y: top + i * (ROW.height + ROW.gap), w, h: ROW.height }));
    }

    #modRows(x, w, top) {
        return MOD_KEYS.slice(this.#scroll, this.#scroll + MOD_ROW.visible).map((key, i) => ({
            id: `mod:${key}`,
            custom: true,
            x,
            y: top + i * (MOD_ROW.height + MOD_ROW.gap),
            w,
            h: MOD_ROW.height,
        }));
    }

    scene(ctx, size) {
        menuBackground(ctx, size, this.time);
        const track = this.params.trackId ? `  ${trackOf(this.params.trackId).name}` : '';
        header(ctx, size, `GARAGE${track}`, Math.round(this.#credits), this.app.icons);
        const { left } = this.#columns(size.width);
        this.#carStand(ctx, left);
        this.#ratings(ctx, left, size.height);
        for (const row of this.menu.buttons.filter((b) => b.custom)) {
            if (row.id.startsWith('part:')) this.#partRow(ctx, row);
            else this.#modRow(ctx, row);
        }
        if (this.#tab === 'mods') this.#modBay(ctx, this.menu.buttons[0]);
        this.#footer(ctx, size);
    }

    overlay(ctx, { width, height }) {
        if (!this.#toast || this.time - this.#toast.at > FEEDBACK) return;
        const t = this.time - this.#toast.at;
        const y = Math.round(height / 2 - 10 + (1 - ease.outBack(Math.min(1, t * 5))) * 12);
        const w = this.#toast.text.length * 6 + 16;
        panel(ctx, width / 2 - w / 2, y, w, 17, { fill: UI.ink, edge: this.#toast.color });
        textCentered(ctx, this.#toast.text, width / 2, y + 5, { color: this.#toast.color });
    }

    // ---- left column

    #carStand(ctx, width) {
        const x = 6;
        const y = TOP;
        panel(ctx, x, y, width, CAR_BOX.height, { fill: '#1a1236' });
        // the stand: a flat oval of light under the car
        const cx = x + width / 2;
        const floor = y + CAR_BOX.height - 10;
        [[46, '#3a2a6a'], [38, '#5a46a0'], [28, '#7a66c0']].forEach(([half, color], i) => {
            ctx.fillStyle = color;
            ctx.fillRect(Math.round(cx - half), floor + i * 2 - 2, half * 2, 2);
        });
        const revving = this.time - this.#flash.at < 0.8;
        const car = this.app.art.car;
        const still = { z: revving ? this.time * 3000 : 0, braking: Math.floor(this.time * 2) % 4 === 0, speed: 0 };
        const sprite = car.spriteFor(still);
        const bob = Math.sin(this.time * 2) > 0.7 ? -1 : 0;
        const shake = revving ? Math.round(Math.sin(this.time * 60)) : 0;
        ctx.drawImage(sprite, Math.round(cx - sprite.width) + shake, floor - sprite.height * 2 + bob, sprite.width * 2, sprite.height * 2);
        if (revving) this.#sparkles(ctx, cx, floor - 20);
    }

    #sparkles(ctx, cx, cy) {
        const t = this.time - this.#flash.at;
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const reach = 10 + t * 50;
            ctx.fillStyle = i % 2 ? UI.gold : UI.cream;
            ctx.fillRect(Math.round(cx + Math.cos(angle) * reach * 1.6), Math.round(cy + Math.sin(angle) * reach * 0.6), 2, 2);
        }
    }

    #ratings(ctx, width, height) {
        const x = 6;
        const y = TOP + CAR_BOX.height + 4;
        panel(ctx, x, y, width, height - y - 26);
        const now = ratings(this.app.career.stats());
        const then = ratings(this.#previewStats());
        const barWidth = width - 72;
        now.forEach((rating, i) => {
            const row = y + 5 + i * 12;
            drawText(ctx, rating.label, x + 5, row, { color: UI.dim });
            segmentBar(ctx, x + 40, row + 1, barWidth, { fill: rating.fill, preview: then[i].fill, time: this.time });
            const changed = then[i].text !== rating.text;
            textRight(ctx, changed ? then[i].text : rating.text, x + width - 5, row, { color: changed ? UI.green : UI.cream });
        });
    }

    /** What the focused item would make of the car. */
    #previewStats() {
        const career = this.app.career;
        const focus = this.menu.focus ?? '';
        if (focus.startsWith('part:')) return career.statsWithNext(focus.slice(5));
        if (!focus.startsWith('mod:')) return career.stats();
        const id = focus.slice(4);
        if (career.fitted.includes(id)) return career.statsWithMods(career.fitted.filter((m) => m !== id));
        return career.statsWithMods([...career.fitted, id]);
    }

    // ---- right column

    #rowBox(ctx, row) {
        const shaking = this.#shake.id === row.id && this.time - this.#shake.at < 0.4;
        const dx = shaking ? Math.round(Math.sin(this.time * 70) * 2) : 0;
        const flashing = this.#flash.id === row.id && this.time - this.#flash.at < 0.3;
        const focused = this.menu.focus === row.id;
        panel(ctx, row.x + dx, row.y, row.w, row.h, { fill: flashing ? UI.cream : UI.panel, edge: focused ? UI.cream : UI.edge });
        if (focused && Math.floor(this.time * 3) % 2 === 0) arrow(ctx, row.x - 5, row.y + 4, UI.cream);
        return row.x + dx;
    }

    #partRow(ctx, row) {
        const key = row.id.slice(5);
        const career = this.app.career;
        const x = this.#rowBox(ctx, row);
        ctx.drawImage(this.app.icons[key][1], x + 3, row.y + 2);
        drawText(ctx, PARTS[key].name, x + 15, row.y + 3, { color: UI.cream });
        const tiers = PARTS[key].tiers.length;
        for (let t = 1; t < tiers; t++) {
            ctx.fillStyle = t <= career.parts[key] ? UI.gold : '#3a2e5e';
            ctx.fillRect(x + 64 + (t - 1) * 6, row.y + 4, 4, 5);
        }
        const next = career.nextPart(key);
        if (!next) {
            textRight(ctx, 'MAX', x + row.w - 4, row.y + 3, { color: UI.green });
            return;
        }
        this.#price(ctx, next.price, x + row.w - 4, row.y + 3);
    }

    #price(ctx, price, right, y) {
        const text = String(price);
        const affordable = price <= this.app.career.credits;
        textRight(ctx, text, right, y, { color: affordable ? UI.gold : UI.red });
        ctx.drawImage(this.app.icons.coin[1], right - text.length * 6 - 10, y - 1);
    }

    #modRow(ctx, row) {
        const id = row.id.slice(4);
        const mod = MODS[id];
        const career = this.app.career;
        const x = this.#rowBox(ctx, row);
        const fitted = career.fitted.includes(id);
        drawText(ctx, mod.name, x + 4, row.y + 3, { color: fitted ? UI.green : UI.cream });
        for (let e = 0; e < mod.energy; e++) {
            ctx.fillStyle = UI.cyan;
            ctx.fillRect(x + 98 + e * 4, row.y + 4, 2, 5);
        }
        const right = x + row.w - 4;
        if (fitted) textRight(ctx, 'ON', right, row.y + 3, { color: UI.green });
        else if (career.owned.has(id)) textRight(ctx, 'FIT', right, row.y + 3, { color: UI.cream });
        else this.#price(ctx, mod.price, right, row.y + 3);
    }

    /** Slots used and energy drawn, over the mods list. */
    #modBay(ctx, tab) {
        const career = this.app.career;
        const stats = career.stats();
        const y = tab.y + TABS.height + 5;
        drawText(ctx, `SLOTS ${career.fitted.length}/${stats.slots}`, tab.x, y, { color: UI.cream, outline: UI.ink });
        const used = career.energyUsed();
        const left = tab.x + 74;
        drawText(ctx, 'ENERGY', left, y, { color: UI.cyan, outline: UI.ink });
        for (let e = 0; e < stats.energy; e++) {
            ctx.fillStyle = UI.ink;
            ctx.fillRect(left + 38 + e * 5, y - 1, 4, 8);
            ctx.fillStyle = e < used ? UI.cyan : '#2e2448';
            ctx.fillRect(left + 39 + e * 5, y, 2, 6);
        }
    }

    /** Under the list: the next tier's name, or the focused mod's lines. */
    #footer(ctx, { width }) {
        const { x } = this.#columns(width);
        const focus = this.menu.focus ?? '';
        const rows = this.menu.buttons.filter((b) => b.custom);
        const y = (rows.at(-1)?.y ?? TOP) + ROW.height + 4;
        const style = { color: UI.cream, outline: UI.ink };
        if (focus.startsWith('part:')) {
            const next = this.app.career.nextPart(focus.slice(5));
            drawText(ctx, next ? `NEXT: ${next.name}` : 'FULLY UPGRADED', x, y, style);
        } else if (focus.startsWith('mod:')) {
            MODS[focus.slice(4)].lines.slice(0, 2).forEach((line, i) => drawText(ctx, line, x, y + i * 9, style));
        }
    }

    // ---- answers

    key(action) {
        const focus = this.menu.focus ?? '';
        if (this.#tab === 'mods' && focus.startsWith('mod:') && (action === 'up' || action === 'down')) {
            this.#stepMods(MOD_KEYS.indexOf(focus.slice(4)) + (action === 'down' ? 1 : -1), action);
            return;
        }
        super.key(action);
    }

    /** Up and down through the whole mods list, scrolling it. */
    #stepMods(index, action) {
        this.app.audio.play('move');
        if (index < 0 || index >= MOD_KEYS.length) {
            this.menu.move(action === 'down' ? [0, 1] : [0, -1]);
            return;
        }
        if (index < this.#scroll) this.#scroll = index;
        if (index >= this.#scroll + MOD_ROW.visible) this.#scroll = index - MOD_ROW.visible + 1;
        this.menu.setFocus(`mod:${MOD_KEYS[index]}`);
    }

    /** Rows answer with their own sound (bought, fitted, refused). */
    pressSound(id) {
        return id.startsWith('part:') || id.startsWith('mod:') ? null : super.pressSound(id);
    }

    action(id) {
        const [kind, key] = id.split(':');
        if (kind === 'tab') this.#openTab(key);
        else if (kind === 'part') this.#answer(id, this.app.sync.buyPart(key), `INSTALLED ${PARTS[key].tiers[this.app.career.parts[key]].name}`);
        else if (kind === 'mod') this.#mod(id, key);
        else if (id === 'race') this.#race();
        else if (id === 'back') this.back();
    }

    #openTab(tab) {
        this.#tab = tab;
        this.#scroll = 0;
        this.menu.show(this.time - 0.2);
        this.menu.setFocus(tab === 'parts' ? `part:${PART_KEYS[0]}` : `mod:${MOD_KEYS[0]}`);
    }

    #race() {
        if (this.params.challenge) this.app.show('challenge', { go: true });
        else this.app.show('race', this.params);
    }

    /** Buy a mod (it is fitted when it fits), or fit it, or take it off. */
    #mod(rowId, id) {
        const { career, sync } = this.app;
        if (career.fitted.includes(id)) {
            sync.unfit(id);
            this.#answer(rowId, 'ok', `REMOVED ${MODS[id].name}`, false);
        } else if (career.owned.has(id)) {
            this.#answer(rowId, sync.fit(id), `FITTED ${MODS[id].name}`, false);
        } else {
            this.#answer(rowId, sync.buyMod(id), `BOUGHT ${MODS[id].name}`);
        }
    }

    #answer(rowId, answer, success, rev = true) {
        if (answer === 'ok') {
            this.app.audio.play(rev ? 'buy' : 'fit');
            this.#toast = { text: success, color: UI.green, at: this.time };
            this.#flash = { id: rowId, at: rev ? this.time : -Infinity };
            return;
        }
        this.app.audio.play('deny');
        this.#toast = { ...(ANSWERS[answer] ?? { text: 'NOT POSSIBLE', color: UI.red }), at: this.time };
        this.#shake = { id: rowId, at: this.time };
    }

    back() {
        if (this.params.challenge) this.app.show('challenge');
        else if (this.params.trackId) this.app.show('tracks', this.params);
        else this.app.show('worlds');
    }
}
