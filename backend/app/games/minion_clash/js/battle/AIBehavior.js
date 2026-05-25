import { ThreatEvaluator } from './ThreatEvaluator.js';

// ─── Abstract base ────────────────────────────────────────────────────────────

/**
 * AIBehavior: strategy interface for enemy card selection.
 *
 * Concrete implementations encapsulate different levels of AI sophistication.
 * EnemyAI owns one behavior instance and delegates card selection to it each
 * evaluation tick.
 *
 * @abstract
 */
export class AIBehavior {
    /**
     * Select the best play from the list of affordable cards.
     *
     * @param {Array<{slot:number, cardId:string, cost:number}>} playable
     *   Cards the AI can currently afford, sorted by cost descending.
     * @param {object} world - BattleWorld instance (read-only access)
     * @param {object} ctl   - EnemyTeamController
     * @returns {{slot:number, cardId:string}|null}
     */
    // eslint-disable-next-line no-unused-vars
    selectPlay(playable, world, ctl) {
        throw new Error('AIBehavior.selectPlay is abstract');
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    _cardHasTag(card, world, tag) {
        if (card.kind !== 'summon' || !card.unitId) return false;
        try {
            return world.data.getUnit(card.unitId).tags?.includes(tag) ?? false;
        } catch { return false; }
    }

    _isAntiAir(card, world) {
        return this._cardHasTag(card, world, 'anti_air') ||
               this._cardHasTag(card, world, 'ranged');
    }
}

// ─── Standard: play the highest-cost affordable card ─────────────────────────

/**
 * Used for easy difficulty.
 * Mirrors the original EnemyAI logic: always plays the most expensive card
 * that fits within the current mana budget.
 */
export class StandardAIBehavior extends AIBehavior {
    /** @override */
    selectPlay(playable) {
        if (playable.length === 0) return null;
        return playable[0]; // already sorted highest cost first
    }
}

// ─── Reactive: counter the player's current field threats ────────────────────

/**
 * Used for medium difficulty.
 * Scores cards based on the current battlefield state: air threats, unit mass,
 * forward pressure, tower HP, and basic support card timing.
 */
export class ReactiveAIBehavior extends AIBehavior {
    constructor() {
        super();
        this._evaluator = new ThreatEvaluator();
    }

    /** @override */
    selectPlay(playable, world) {
        if (playable.length === 0) return null;
        const threat = this._evaluator.evaluate(world);
        const scored = playable.map(p => ({
            ...p, score: this._score(p, threat, world),
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored[0];
    }

    _score(play, threat, world) {
        let score = play.cost; // base: impactful cards preferred
        const card = world.data.getCard(play.cardId);

        // Counter air threats with ranged/anti-air units
        if (threat.hasPlayerAir && this._isAntiAir(card, world)) score += 6;
        // Counter mass of ground units with AOE spells
        if (threat.hasPlayerMass && card.kind === 'spell') score += 7;
        // Player pushing forward → drop blockers
        if (threat.playerPressure > 1 && card.kind === 'summon') score += 3;
        // Own tower under severe pressure: quick deployment
        if (threat.enemyTowerHpRatio < 0.4) score += play.cost * 0.6;
        // Spell bonuses: frost_nova stops a push, lightning_bolt removes a unit
        if (play.cardId === 'frost_nova'     && threat.playerPressure >= 2) score += 6;
        if (play.cardId === 'lightning_bolt' && threat.playerUnitCount  > 0) score += 5;

        return score + this._scoreSupport(play, threat);
    }

    _scoreSupport(play, threat) {
        if (play.cardId === 'war_banner')   return threat.enemyUnitCount >= 2 ? 4 : -3;
        if (play.cardId === 'tower_repair') return threat.enemyTowerHpRatio < 0.75 ? 5 : -2;
        if (play.cardId === 'mana_pump')    return 6;
        if (play.cardId === 'healer')       return threat.enemyTowerHpRatio < 0.6 ? 4 : 1;
        return 0;
    }
}

// ─── Strategic: full state-aware decision-making ─────────────────────────────

/**
 * Used for hard difficulty.
 * Covers economy cards, siege timing, support card placement windows,
 * spell finishers, match-time acceleration, and a critical-HP panic mode.
 *
 * Scoring is split across focused helper methods to keep each method's
 * Cognitive Complexity within the allowed budget.
 */
export class StrategicAIBehavior extends AIBehavior {
    constructor() {
        super();
        this._evaluator = new ThreatEvaluator();
    }

    /** @override */
    selectPlay(playable, world) {
        if (playable.length === 0) return null;
        const threat = this._evaluator.evaluate(world);

        // Panic mode: own tower critical — deploy heaviest frontline summon available
        if (threat.enemyTowerHpRatio < 0.2) return this._panicPlay(playable, world);

        const scored = playable.map(p => ({
            ...p, score: this._score(p, threat, world),
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored[0];
    }

    _panicPlay(playable, world) {
        const tanks = playable
            .filter(p => world.data.getCard(p.cardId).kind === 'summon')
            .sort((a, b) => b.cost - a.cost);
        return tanks.length > 0 ? tanks[0] : playable[0];
    }

    _score(play, threat, world) {
        const card      = world.data.getCard(play.cardId);
        const matchTime = world.matchTime ?? 0;
        const isLate    = matchTime > 160;
        const defScore  = this._scoreFieldDefense(threat, card, world)
                        + this._scoreSpells(play, threat);
        // When own tower is critical, defence actions become paramount.
        const urgencyMult = threat.enemyTowerHpRatio < 0.35 ? 2 : 1;
        return play.cost
            + this._scoreEconomy(play, threat, matchTime)
            + this._scoreFieldOffense(play, threat, card, world, isLate)
            + Math.round(defScore * urgencyMult)
            + this._scoreSupport(play, threat);
    }

    _scoreEconomy(play, threat, matchTime) {
        if (play.cardId === 'mana_pump') return this._manaPumpBonus(matchTime);
        if (play.cardId === 'tower_repair') {
            const ratio = threat.enemyTowerHpRatio;
            return ratio < 0.8 ? Math.round((1 - ratio) * 14) : -4;
        }
        return 0;
    }

    _manaPumpBonus(matchTime) {
        if (matchTime < 60)  return 13;
        if (matchTime < 120) return 7;
        return 3;
    }

    _scoreFieldOffense(play, threat, card, world, isLate) {
        let score = 0;
        if (this._cardHasTag(card, world, 'siege')) score += threat.playerUnitCount < 3 ? 10 : 5;
        // Kill-shot priority: player tower is nearly dead — send everything forward.
        if (threat.playerTowerHpRatio < 0.3 && card.kind === 'summon') score += 10;
        else if (threat.playerTowerHpRatio < 0.7 && card.kind === 'summon') score += 3;
        if (threat.enemyPressure === 0 && card.kind === 'summon') score += 3;
        if (isLate) score += this._scoreLate(card, world);
        return score;
    }

    _scoreLate(card, world) {
        let score = card.kind === 'summon' ? 2 : 0;
        if (this._cardHasTag(card, world, 'siege')) score += 4;
        return score;
    }

    _scoreFieldDefense(threat, card, world) {
        let score = 0;
        if (threat.hasPlayerAir && this._isAntiAir(card, world)) score += 7;
        if (threat.hasPlayerMass && card.kind === 'spell')  score += 9;
        if (threat.hasPlayerMass && card.kind === 'summon') score += 3;
        const ratio = threat.enemyTowerHpRatio;
        if (ratio < 0.5) score += Math.round((1 - ratio) * 10);
        if (threat.playerPressure > 2 && card.kind === 'spell')  score += 8;
        if (threat.playerPressure > 1 && card.kind === 'summon') score += 3;
        return score;
    }

    _scoreSupport(play, threat) {
        switch (play.cardId) {
            case 'war_banner':    return threat.enemyUnitCount >= 2 ? 8 : -5;
            case 'healer':        return threat.enemyTowerHpRatio < 0.65 ? 6 : 2;
            case 'time_witch':    return threat.playerPressure >= 2 ? 8 : 2;
            case 'plague_doctor': return threat.playerUnitCount >= 2 ? 5 : 1;
            case 'necromancer':   return threat.playerUnitCount >= 2 ? 4 : 2;
            default:              return 0;
        }
    }

    _scoreSpells(play, threat) {
        switch (play.cardId) {
            case 'lightning_bolt': return threat.playerUnitCount > 0 ? 9 : 0;
            case 'frost_nova':     return threat.playerPressure >= 2 ? 11 : 0;
            case 'fireball':
                if (threat.hasPlayerMass) return 10;
                return threat.playerUnitCount > 0 ? 4 : 0;
            case 'earthquake':     return threat.playerUnitCount >= 2 ? 8 : 0;
            case 'heal_wave':      return threat.enemyTowerHpRatio < 0.7 ? 5 : 0;
            default:               return 0;
        }
    }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Maps the `behavior` field in an aiProfile to the correct AIBehavior instance.
 * Defaults to StandardAIBehavior for any unknown / missing behavior string.
 */
export class AIBehaviorFactory {
    /**
     * @param {{ behavior?: string }} profile
     * @returns {AIBehavior}
     */
    static create(profile) {
        switch (profile.behavior) {
            case 'reactive':  return new ReactiveAIBehavior();
            case 'strategic': return new StrategicAIBehavior();
            default:          return new StandardAIBehavior();
        }
    }
}

