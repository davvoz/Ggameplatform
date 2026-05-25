import { GameConfig } from '../config/GameConfig.js';
import { AIBehaviorFactory } from './AIBehavior.js';
import { ThreatEvaluator } from './ThreatEvaluator.js';

/**
 * EnemyAI: timer-driven card player for the enemy team.
 *
 * Card selection is delegated to an AIBehavior strategy whose type is
 * determined by `profile.behavior` ('standard' | 'reactive' | 'strategic').
 * Drop-position logic and timer management live here as they are independent
 * of the selection strategy.
 *
 * A small random jitter is applied to the play interval so the AI feels
 * less mechanical and harder to read.
 */
export class EnemyAI {
    constructor(controller, profile) {
        this._ctl         = controller;
        this._profile     = profile;
        this._behavior    = AIBehaviorFactory.create(profile);
        this._timer       = profile.playInterval;
        // Emergency evaluator for critical-push timer shortcut (standard AI skips this).
        this._urgencyEval = profile.behavior === 'standard'
            ? null : new ThreatEvaluator();
    }

    update(dt, world) {
        this._timer -= dt;

        // Emergency shortcut: shorten delay when player is pushing critically hard.
        // Checked only for reactive/strategic AI to avoid making easy feel unfair.
        if (this._urgencyEval && this._timer > 0.5) {
            const t = this._urgencyEval.evaluate(world);
            if (t.playerPressure > 2 ||
                (t.enemyTowerHpRatio < 0.3 && t.playerUnitCount > 0)) {
                this._timer = 0.5;
            }
        }

        if (this._timer > 0) return;
        this._resetTimer();

        const manaRatio = this._ctl.mana.value / this._ctl.mana.max;
        if (manaRatio < this._profile.manaThreshold) return;

        const playable = this._buildPlayableList(world);
        const choice   = this._behavior.selectPlay(playable, world, this._ctl);
        if (!choice) return;

        const card = world.data.getCard(choice.cardId);
        const drop = this._dropPosition(card, world);
        this._ctl.playCardFromHand(choice.slot, drop.x, drop.y);
    }

    /** Resets the timer with a ±30 % jitter around playInterval. */
    _resetTimer() {
        const base   = this._profile.playInterval;
        const jitter = (Math.random() - 0.5) * 0.6 * base;
        this._timer  = Math.max(0.5, base + jitter);
    }

    _buildPlayableList(world) {
        const out   = [];
        const slots = this._ctl.hand.slots;
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

    _dropPosition(card, world) {
        const a       = GameConfig.ARENA;
        const yTop    = a.TOP + 30;              // near own tower — defensive
        const yBottom = a.SUMMON_ZONE_TOP - 20;  // near bridge — aggressive

        // Support and siege units override profile aggression:
        // static support deploys near own base; siege stays back (long attack range).
        let effectiveAggro = this._profile.aggression;
        if (card.kind === 'summon' && card.unitId) {
            const tags = (() => {
                try { return world.data.getUnit(card.unitId).tags ?? []; }
                catch { return []; }
            })();
            if (tags.includes('static') ||
                (tags.includes('support') && !tags.includes('ranged'))) {
                effectiveAggro = 0.05; // static support near own base
            } else if (tags.includes('siege')) {
                effectiveAggro = 0.1;  // siege stays back — long attack range
            }
        }

        // Higher aggression → closer to bridge (units engage sooner, more pressure).
        const aggro  = Math.max(0, Math.min(1, effectiveAggro));
        const baseY  = yTop + aggro * (yBottom - yTop);
        const spread = (Math.random() - 0.5) * 40;
        const y      = Math.max(yTop, Math.min(yBottom, baseY + spread));

        const isFlying = this._cardHasTag(card, world, 'flying');
        const bridgeCx = (a.BRIDGE_LEFT_X + a.BRIDGE_RIGHT_X) / 2;
        const baseX    = (isFlying || card.kind === 'spell')
            ? a.BRIDGE_LEFT_X + Math.random() * (a.BRIDGE_RIGHT_X - a.BRIDGE_LEFT_X)
            : bridgeCx + (Math.random() - 0.5) * 60;

        return { x: baseX, y };
    }

    _cardHasTag(card, world, tag) {
        if (card.kind !== 'summon' || !card.unitId) return false;
        try {
            return world.data.getUnit(card.unitId).tags?.includes(tag) ?? false;
        } catch { return false; }
    }
}
