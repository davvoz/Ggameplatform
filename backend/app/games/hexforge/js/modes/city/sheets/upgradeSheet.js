import { upgradeBuilding } from '../../../net/api.js';
import { play } from '../../../fx/audio.js';
import { renderUpgradeCard } from '../../../ui/panels/upgradePanel.js';
import { BUILDING_INFO } from '../../../data/labels.js';
import { openSheet, toast } from '../../../ui/sheets.js';
import { $ } from '../shared.js';

/** A building type's next level and path, started at the forge. */
export class UpgradeSheet {
    constructor(city) {
        this.city = city;
    }

    // ── building upgrades ──────────────────────────────────────────────
    openUpgrade() {
        const b = this.city.building(this.city.selection.selectedId);
        if (!b || !this.city.state.upgrades) return;
        this.upgradeType = b.type;
        this.upgradeBuildingId = b.id;
        this.upgradePath = null;
        this.#renderUpgrade();
        openSheet('sheet-upgrade');
    }

    #renderUpgrade() {
        const type = this.upgradeType;
        if (!type || !this.city.state?.upgrades) return;
        $('upgrade-title').textContent = `Upgrade: ${BUILDING_INFO[type].name}`;
        const job = this.city.state.forge.jobs.find((j) => j.recipe === 'build_up' && j.type === type) ?? null;
        renderUpgradeCard($('upgrade-card'), {
            type, upgrades: this.city.state.upgrades, materials: this.city.state.materials,
            freeSlots: this.city.state.forge.slots - this.city.state.forge.jobs.length, serverNow: this.city.serverNow(),
            job, picked: this.upgradePath, count: this.city.state.city.buildings.filter((b) => b.type === type).length,
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
        await this.city.run(async () => {
            this.city.apply(await upgradeBuilding(this.upgradeBuildingId, path));
            play('forge');
            const level = this.city.state.forge.jobs.find((j) => j.recipe === 'build_up' && j.type === type)?.level;
            toast(`${BUILDING_INFO[type].name} went into the forge to reach level ${level}.`);
            this.#renderUpgrade();
        });
    }
}
