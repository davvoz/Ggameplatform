import {
    SignInRequired, fetchDefenseLog, fetchRaidReplay, markDefensesSeen, revengeRaid, testDefense,
} from '../../../net/api.js';
import { describeWorst, renderDefenseReport } from '../../../ui/panels/defensePanel.js';
import { withIcon } from '../../../ui/icons.js';
import { renderRaidLog, timeAgo } from '../../../ui/raidLog.js';
import { openSheet, toast } from '../../../ui/sheets.js';
import { $ } from '../shared.js';
import { defenseKey } from '../../../core/cityRules.js';

/** The defense sheet: the defense test and its report, the raid log, replays and revenge. */
export class DefenseSheet {
    constructor(city) {
        this.city = city;
        this.defense = null;          // last defence test, while the defenses are unchanged
        this.defenseKey = '';
        this.raids = null;
    }

    openDefense() {
        if (!this.city.state) return;
        this.city.selection.select(null);
        openSheet('sheet-defense');
        if (this.raids?.unseen) void this.#markSeen();
    }

    /** `stage`: a stage to re-run; null tests the highest unlocked. */
    async testDefense(stage = null) {
        if (this.city.busy || !this.city.state) return;
        const button = $('btn-defense-test');
        button.disabled = true;
        withIcon(button, 'test', 'Running the raids…');
        await this.city.run(async () => {
            const report = await testDefense(stage);
            this.city.state.defense_stage = report.unlocked;
            this.defenseKey = defenseKey(this.city.state.city);
            this.showDefense(report);
            if (report.advanced) toast(`Every raid held! Stage ${report.unlocked} unlocked: ${report.next.name}.`);
        });
        button.disabled = false;
        this.defenseLabel();
    }

    /** The test button always runs the highest stage unlocked. */
    defenseLabel() {
        const button = $('btn-defense-test');
        if (button.disabled) return;
        const top = this.city.state?.defense_stage ?? 1;
        let label = 'Test my defenses';
        if (top > 1) label = `Test stage ${top}`;
        else if (this.defense) label = 'Test again';
        withIcon(button, 'test', label);
    }

    showDefense(report) {
        this.defense = report;
        const box = $('defense-report');
        box.hidden = !report;
        if (report) {
            renderDefenseReport(box, report,
                () => this.city.onWatch(report.worst, `Worst raid of the test: ${describeWorst(report.worst)}.`),
                (stage) => void this.testDefense(stage));
        }
        this.defenseLabel();
    }

    // ── raids on the city ──────────────────────────────────────────────
    async loadRaids() {
        if (!this.city.state) return;
        try {
            this.raids = await fetchDefenseLog();
        } catch (error) {
            if (!(error instanceof SignInRequired)) console.error('[Hexforge] raid log failed', error);
            return;
        }
        this.#renderRaids();
    }

    #renderRaids() {
        if (!this.raids || !this.city.state) return;
        const unseen = this.raids.unseen;
        const badge = $('defense-badge');
        badge.hidden = !unseen;
        badge.textContent = String(unseen);
        renderRaidLog({ banner: $('raid-banner'), list: $('raid-log') }, this.raids, this.city.state.pvp, this.city.serverNow(), {
            watch: (raid) => void this.#watchRaid(raid),
            revenge: (raid) => void this.#revenge(raid),
            seen: () => this.openDefense(),
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
        await this.city.run(async () => {
            const replay = await fetchRaidReplay(raid.id);
            this.city.onWatch(replay, `${raid.raider} raided you ${timeAgo(this.city.serverNow() - raid.at)}.`);
        });
    }

    async #revenge(raid) {
        await this.city.run(async () => {
            await revengeRaid(raid.id);
            this.city.invalidate();
            this.city.onRevenge();
        });
    }
}
