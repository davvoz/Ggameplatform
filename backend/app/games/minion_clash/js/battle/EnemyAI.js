import { GameConfig } from '../config/GameConfig.js';

/**
 * Enemy AI: timer-driven hand-player.
 *  - Every `playInterval` seconds, evaluates the hand.
 *  - Plays the highest-cost affordable card whose cost ≤ mana, if mana is
 *    above `manaThreshold * MAX_MANA`.
 *  - Aggression biases drop position toward the bridge (closer to player).
 *
 * Deterministic on the inputs given (no hidden global state); easy to swap
 * for a network-driven controller later.
 */
export class EnemyAI {
    constructor(controller, profile) {
        this._ctl = controller;
        this._profile = profile;
        this._timer = profile.playInterval;
    }

    update(dt, world) {
        this._timer -= dt;
        if (this._timer > 0) return;
        this._timer = this._profile.playInterval;

        const manaRatio = this._ctl.mana.value / this._ctl.mana.max;
        if (manaRatio < this._profile.manaThreshold) return;

        const slots = this._ctl.hand.slots;
        const ranked = this._rankPlayable(slots, world);
        if (ranked.length === 0) return;

        const choice = ranked[0];
        const drop = this._dropPosition(world.data.getCard(choice.cardId), world);
        this._ctl.playCardFromHand(choice.slot, drop.x, drop.y);
    }

    _rankPlayable(slots, world) {
        const out = [];
        for (let i = 0; i < slots.length; i++) {
            const cardId = slots[i];
            if (!cardId) continue;
            const card = world.data.getCard(cardId);
            if (!this._ctl.mana.canConsume(card.cost)) continue;
            out.push({ slot: i, cardId, cost: card.cost });
        }
        out.sort((a, b) => b.cost - a.cost);
        return out;
    }

    _dropPosition(card, _world) {
        const a = GameConfig.ARENA;
        // Enemy half is y in [a.TOP, SUMMON_ZONE_TOP - small]
        const yTop = a.TOP + 30;
        const yBottom = a.SUMMON_ZONE_TOP - 20;
        const aggro = Math.max(0, Math.min(1, this._profile.aggression));
        const y = yBottom - aggro * (yBottom - yTop) * 0.55;
        // Spread horizontally with a bias around the bridge for ground units,
        // anywhere for spells/flying.
        const isFlying = card.kind === 'summon'
            ? (this._unitTags(card)?.includes('flying') ?? false)
            : false;
        const bridgeCx = (a.BRIDGE_LEFT_X + a.BRIDGE_RIGHT_X) / 2;
        const baseX = isFlying || card.kind === 'spell'
            ? a.BRIDGE_LEFT_X + Math.random() * (a.BRIDGE_RIGHT_X - a.BRIDGE_LEFT_X)
            : bridgeCx + (Math.random() - 0.5) * 60;
        return { x: baseX, y };
    }

    _unitTags(card) {
        try {
            return this._ctl.world.data.getUnit(card.unitId).tags;
        } catch { return null; }
    }
}
