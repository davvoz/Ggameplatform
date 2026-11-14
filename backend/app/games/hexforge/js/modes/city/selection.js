import { dismantleBuilding, moveBuilding, placeBuilding, setAim } from '../../net/api.js';
import { canFuse, partName } from '../../ui/panels/fusionPanel.js';
import { anchorFor, placementError } from '../../core/cityRules.js';
import { play } from '../../fx/audio.js';
import { itemName, renderStorage } from '../../ui/panels/forgePanel.js';
import { upgradeBonuses } from '../../ui/panels/upgradePanel.js';
import { icon } from '../../ui/icons.js';
import { AIM_INFO, BUILDING_INFO, CHOICE_ICONS, MATERIAL_INFO, PATH_INFO } from '../../data/labels.js';
import { toast } from '../../ui/sheets.js';
import { buildingThumb } from '../../render/thumbs.js';
import { $ } from './shared.js';
import { MESSAGES } from '../../data/messages.js';

/** The selected building and its bar (upgrade, fuse, aim, move, dismantle), and placing or moving one on the map. */
export class CitySelection {
    constructor(city) {
        this.city = city;
        this.selectedId = null;
        this.mode = 'idle';           // idle | move | place
        this.placingType = null;
        this.preview = null;
        this.confirmDismantle = false;
        this.aimOpen = false;
        this.infoText = '';
    }

    async tryDrop(point) {
        const target = this.previewAt(point);
        this.preview = target;
        if (!target.valid) {
            play('error');
            toast(MESSAGES[target.error]);
            return;
        }
        await this.city.run(async () => {
            if (this.mode === 'move') {
                this.city.apply(await moveBuilding(this.selectedId, target.x, target.y));
                play('place');
                this.setMode('idle');
                toast('Moved.');
            } else {
                const type = this.placingType;
                this.city.apply(await placeBuilding(type, target.x, target.y));
                play('place');
                toast(`${itemName(type)} placed.`);
                if (!this.city.state.storage[type]) this.setMode('idle');
            }
        });
    }

    async dismantle() {
        const b = this.city.building(this.selectedId);
        if (!b) return;
        if (!this.confirmDismantle) {
            this.confirmDismantle = true;
            this.renderSelection();
            return;
        }
        await this.city.run(async () => {
            const result = await dismantleBuilding(b.id);
            play('dismantle');
            const gained = Object.entries(result.refund).map(([m, n]) => `+${n} ${MATERIAL_INFO[m].name}`).join('  ');
            if (gained) this.city.float(b, gained, '#e6e9f5');
            this.city.apply(result);
            toast(`${BUILDING_INFO[b.type].name} dismantled.`);
        });
    }

    async #setAim(aim) {
        const b = this.city.building(this.selectedId);
        if (!b || b.aim === aim) return;
        await this.city.run(async () => {
            this.city.apply(await setAim(b.id, aim));
            toast(`${BUILDING_INFO[b.type].name} now aims: ${AIM_INFO[aim].name}.`);
        });
    }

    previewAt(point) {
        const ground = this.city.renderer.groundAt(point);
        const subject = this.mode === 'move'
            ? this.city.building(this.selectedId)
            : { id: null, size: this.city.recipe(this.placingType).size };
        const { x, y } = anchorFor(subject.size, ground.x, ground.y);
        const error = placementError(this.city.state.city, subject, x, y);
        return { x, y, size: subject.size, valid: !error, error };
    }

    select(id) {
        if (id !== this.selectedId && this.mode === 'move') this.setMode('idle');
        if (id !== this.selectedId) this.aimOpen = false;
        this.selectedId = id;
        this.confirmDismantle = false;
        this.renderSelection();
        this.renderBottom();
        this.reveal();
    }

    /** Keep the selected building in sight above its action panel. */
    reveal() {
        const b = this.city.building(this.selectedId);
        if (!b) return;
        requestAnimationFrame(() => this.city.renderer.reveal(b, $('selection').getBoundingClientRect().top - 6));
    }

    setMode(mode, placingType = null) {
        this.mode = mode === 'move' && this.selectedId === null ? 'idle' : mode;
        this.placingType = this.mode === 'place' ? placingType : null;
        this.preview = null;
        $('btn-move').setAttribute('aria-pressed', String(this.mode === 'move'));
        if (this.mode === 'place') {
            this.selectedId = null;
            this.renderSelection();
        }
        const what = this.mode === 'move' ? BUILDING_INFO[this.city.building(this.selectedId)?.type]?.name : itemName(placingType);
        $('place-hint').textContent = `Tap the map where the ${what} should stand.`;
        if (this.city.state) renderStorage($('storage'), this.city.state.storage, this.placingType, (type) => this.togglePlacing(type));
        this.renderBottom();
    }

    togglePlacing(type) {
        if (this.mode === 'place' && this.placingType === type) this.setMode('idle');
        else this.setMode('place', type);
    }

    /** One thing at a time above the corner buttons: the building's actions, the placing hint, or the tray. */
    renderBottom() {
        const placing = this.mode !== 'idle';
        $('place-bar').hidden = !placing;
        $('selection').hidden = placing || this.city.building(this.selectedId) === null;
        const stored = this.city.state && Object.values(this.city.state.storage).some((n) => n > 0);
        $('storage-tray').hidden = placing || this.selectedId !== null || !stored;
    }

    renderSelection() {
        const b = this.city.building(this.selectedId);
        this.renderBottom();
        if (!b) return;
        $('sel-name').textContent = BUILDING_INFO[b.type].name;      // the level and path sit on their own line
        $('btn-upgrade').hidden = !this.city.state.upgrades?.table[b.type] || Boolean(b.fusion);
        $('btn-fuse').hidden = !canFuse('building', b, this.city.state);
        $('sel-what').textContent = b.fusing ? 'Fusing at the forge: it keeps working meanwhile.' : BUILDING_INFO[b.type].what;
        $('sel-thumb').src = buildingThumb(b.type, 64, b.level ?? 1, b.path ?? null, b.fusion ?? null);
        if (b.fusion) this.#renderFusionLine(b);
        else this.#renderUpgradeLine(b);
        const locked = b.type === 'core' || b.type === 'vault';
        const refund = this.city.recipe(b.type)?.refund ?? {};
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
        this.updateInfo();
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
        const table = this.city.state.upgrades?.table[b.type];
        line.hidden = !table || (b.level ?? 1) <= 1;
        if (line.hidden) return;
        const path = b.path ? PATH_INFO[b.path] : null;
        line.style.setProperty('--accent', path?.accent ?? '#ffb347');
        const tag = document.createElement('b');
        const pathName = path ? ` · ${path.name}` : '';
        tag.textContent = `★ Level ${b.level}${pathName}`;
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

    updateInfo() {
        const b = this.city.building(this.selectedId);
        if (!b) return;
        let text = `${b.hp} HP`;
        if (b.production) {
            const material = MATERIAL_INFO[b.production.material].name.toLowerCase();
            text += ` · +${b.production.per_hour} ${material}/h · holds ${this.city.pendingOf(b)}/${b.production.capacity}`;
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
