import { AIBehavior } from './AIBehavior.js';
import { ThreatEvaluator } from './ThreatEvaluator.js';

/**
 * EnemyAI: timer-driven card player for the enemy team.
 *
 * All decision-making is delegated to AIBehavior, which is parameterised by
 * five semantic values (fieldAwareness, manaManagement, towerSensitivity,
 * phaseAdaptation, unitPositioning). The only timing knob here is
 * `reactionTime` — how quickly the AI acts — with a ±30 % jitter applied
 * each tick to feel less robotic.
 *
 * An emergency shortcut (timer → 0.5 s) fires when the profile has enough
 * field or tower awareness and a critical threat is detected.
 */
export class EnemyAI {
    constructor(controller, profile) {
        this._ctl      = controller;
        this._profile  = profile;
        this._behavior = new AIBehavior(profile);
        this._timer    = profile.reactionTime;

        // Urgency shortcut only active when the AI has enough awareness to use it.
        const hasAwareness = (profile.fieldAwareness   ?? 0) > 0.3
                          || (profile.towerSensitivity ?? 0) > 0.3;
        this._urgencyEval = hasAwareness ? new ThreatEvaluator() : null;
    }

    update(dt, world) {
        this._timer -= dt;

        // Emergency shortcut: shorten delay when a critical threat is detected.
        if (this._urgencyEval && this._timer > 0.5) {
            const t = this._urgencyEval.evaluate(world);
            if (t.playerPressure > 2 ||
                (t.enemyTowerHpRatio < 0.3 && t.playerUnitCount > 0) ||
                (t.playerTowerHpRatio < 0.4 && t.enemyPressure >= 1)) {
                this._timer = 0.5;
            }
        }

        if (this._timer > 0) return;
        this._resetTimer();

        const manaRatio = this._ctl.mana.value / this._ctl.mana.max;
        if (manaRatio < this._behavior.getManaThreshold(world)) return;

        const playable = this._buildPlayableList(world);
        const choice   = this._behavior.selectPlay(playable, world);
        if (!choice) return;

        const card = world.data.getCard(choice.cardId);
        const drop = this._behavior.getDropPosition(card, world);
        this._ctl.playCardFromHand(choice.slot, drop.x, drop.y);
    }

    /** Resets the timer with a ±30 % jitter around reactionTime. */
    _resetTimer() {
        const base   = this._profile.reactionTime;
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
}
