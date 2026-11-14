import { Refused, fuse, fusePreview } from '../../../net/api.js';
import { fusionCandidates, renderFusionCard, togglePick } from '../../../ui/panels/fusionPanel.js';
import { play } from '../../../fx/audio.js';
import { heroNames } from '../../../ui/heroTiles.js';
import { closeSheet, isSheetOpen, openSheet, toast } from '../../../ui/sheets.js';
import { $ } from '../shared.js';
import { MESSAGES } from '../../../data/messages.js';

/** The fusion sheet: pick two to fuse into a base, see the preview, start it at the forge. */
export class FusionSheet {
    constructor(city) {
        this.city = city;
    }

    // ── fusion ─────────────────────────────────────────────────────────
    openFusion(kind, baseId) {
        if (!this.city.state?.fusion) return;
        this.fusion = { kind, baseId, picked: [], preview: null, asked: '' };
        openSheet('sheet-fuse', () => {
            this.fusion = null;
        });
        this.renderFusion();
    }

    #fusionBase() {
        const f = this.fusion;
        if (!f) return null;
        return f.kind === 'building' ? this.city.building(f.baseId) : this.city.state.heroes.find((h) => h.id === f.baseId) ?? null;
    }

    renderFusion() {
        const f = this.fusion;
        if (!f || !isSheetOpen('sheet-fuse')) return;
        const base = this.#fusionBase();
        if (!base) {
            closeSheet();
            return;
        }
        const candidates = fusionCandidates(f.kind, base, this.city.state);
        f.picked = f.picked.filter((id) => candidates.some((c) => c.id === id));
        $('fuse-title').textContent = f.kind === 'building' ? 'Fuse buildings' : 'Fuse heroes';
        renderFusionCard($('fuse-card'), {
            kind: f.kind, base, candidates, picked: f.picked, preview: f.picked.length === 2 ? f.preview : null,
            materials: this.city.state.materials, freeSlots: this.city.state.forge.slots - this.city.state.forge.jobs.length,
            fighters: this.city.state.heroes.filter((h) => h.cls !== 'explorer').length, table: this.city.state.fusion,
            names: heroNames(this.city.state.heroes), busy: this.city.busy,
        }, {
            onToggle: (ids) => {
                f.picked = togglePick(f.picked, ids);
                f.preview = null;
                play('click');
                this.renderFusion();
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
        this.renderFusion();
    }

    async #fuse() {
        const f = this.fusion;
        if (f?.picked.length !== 2) return;
        await this.city.run(async () => {
            this.city.apply(await fuse(f.kind, f.baseId, f.picked));
            play('forge');
            toast(f.kind === 'building' ? 'Fusing at the forge. The base keeps working meanwhile.'
                : 'Fusing at the forge. Your hero will be back stronger than ever.');
            closeSheet();
        });
    }
}
