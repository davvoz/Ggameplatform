import { claimLoginReward, claimTaskReward, claimWeeklyChest, useBonus, buyOffer } from '../../../net/api.js';
import { openBonusPicker } from '../../../ui/bonusPicker.js';
import { play } from '../../../fx/audio.js';
import { rewardPop } from '../../../fx/fx.js';
import { offerGives, renderMerchant } from '../../../ui/panels/merchantPanel.js';
import { BONUS_INFO } from '../../../data/labels.js';
import {
    formatLong, medal, renderBonuses, renderCalendar, renderChest, renderTasks, rewardChips, usableBonuses,
} from '../../../ui/panels/rewardsPanel.js';
import { isSheetOpen, openSheet, toast } from '../../../ui/sheets.js';
import { $ } from '../shared.js';

/** The rewards sheet: daily gift, tasks, weekly chest, bonuses and the merchant. */
export class RewardsSheet {
    constructor(city) {
        this.city = city;
    }

    openRewards() {
        if (!this.city.state) return;
        this.city.selection.select(null);
        openSheet('sheet-rewards');
        this.renderRewards();               // fills the sheet only while it is open
    }

    // ── rewards and bonuses ────────────────────────────────────────────
    renderRewards() {
        const r = this.city.state?.rewards;
        if (!r) return;
        const badge = $('rewards-badge');
        badge.hidden = !r.ready;
        badge.textContent = String(r.ready);
        if (!isSheetOpen('sheet-rewards')) return;
        renderCalendar($('calendar'), r.login, () => void this.#claimReward('login'));
        $('login-note').textContent = r.login.claimable ? `Day ${r.login.day} of 7` : 'Come back tomorrow';
        renderTasks($('tasks'), r.tasks, (id) => void this.#claimReward('task', id));
        renderChest($('chest'), r.weekly, this.city.serverNow(), () => void this.#claimReward('chest'));
        renderBonuses($('bonus-list'), this.city.state.bonuses);
        if (this.city.state.merchant) renderMerchant($('merchant'), this.city.state.merchant, this.city.state.materials, (id) => void this.#buyOffer(id));
        this.tickRewards(this.city.serverNow());
    }

    tickRewards(now) {
        if (!this.city.state?.rewards || !isSheetOpen('sheet-rewards')) return;
        $('tasks-note').textContent = `new in ${formatLong(this.city.state.rewards.tasks_reset_at - now)}`;
        if (this.city.state.merchant) $('merchant-note').textContent = `new offers in ${formatLong(this.city.state.merchant.next_at - now)}`;
        const reset = document.querySelector('#chest .chest-reset');
        if (reset) reset.textContent = `new in ${formatLong(this.city.state.rewards.weekly.reset_at - now)}`;
    }

    async #claimReward(kind, taskId = null) {
        const CARDS = {
            login: () => ({ icon: 'gift', title: `Day ${this.city.state.rewards.login.day} gift` }),
            task: () => ({ icon: 'star', title: 'Task done!' }),
            chest: () => ({ icon: 'chest', title: 'Weekly chest!' }),
        };
        const card = CARDS[kind]();
        const done = await this.city.run(async () => {
            const call = { login: claimLoginReward, task: () => claimTaskReward(taskId), chest: claimWeeklyChest }[kind];
            const result = await call();
            const shown = this.city.hud.queuePop(() => {      // before #apply, so a level-up card comes after it
                play('claim');
                return rewardPop({
                    picture: medal(card.icon), title: card.title,
                    extra: rewardChips(result.got, { big: true }), line: 'Added to your city', ms: 2600,
                });
            });
            this.city.apply(result);
            return { shown };
        });
        await done?.shown;
    }

    /** Offer the bonuses that work on `target` ('job' | 'hero' | 'energy'), then use the one picked. */
    pickBonus(target, payload, title, line) {
        const options = usableBonuses(target, this.city.state.bonuses);
        if (!options.length) {
            toast('No bonus for that. Daily tasks and the calendar give some.');
            return;
        }
        openBonusPicker({ title, line, options, owned: this.city.state.bonuses, onPick: (bonus) => void this.#useBonus(bonus, payload) });
    }

    async #useBonus(bonus, payload) {
        await this.city.run(async () => {
            this.city.apply(await useBonus(bonus, payload));
            play('boost');
            toast(`${BONUS_INFO[bonus].name}: ${BONUS_INFO[bonus].effect}.`);
        });
    }

    async #buyOffer(offerId) {
        const offer = this.city.state.merchant.offers.find((o) => o.id === offerId);
        await this.city.run(async () => {
            this.city.apply(await buyOffer(offerId));
            play('claim');
            toast(`Bought: ${offerGives(offer.gives)}.`);
            this.renderRewards();
        });
    }
}
