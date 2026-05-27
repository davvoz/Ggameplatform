import { GameConfig } from '../config/GameConfig.js';
import { ThreatEvaluator } from './ThreatEvaluator.js';

// ── Scoring rule tables ─────────────────────────────────────────────────────────
// To add a new counter-play rule: append one entry here — no class edits needed.
// ctx = { ai, play, threat, card, world, hasTank, hasPlayerManaPump, isStalemate }
const COUNTER_RULES = [
    { test: c => c.threat.hasPlayerAir && c.ai._isAntiAir(c.card, c.world),                                    w: c => c.ai._fa * 13 },
    { test: c => c.threat.hasPlayerMass && c.card.spell?.type?.startsWith('aoe'),                               w: c => c.ai._fa * 12 },
    { test: c => c.hasTank && (c.ai._hasTag(c.card, c.world, 'pierce') || c.ai._isFastUnit(c.play.cardId)),    w: c => c.ai._fa * 12 },
    { test: c => c.isStalemate && c.ai._hasTag(c.card, c.world, 'siege'),                                      w: c => c.ai._fa * 10 },
    { test: c => c.isStalemate && c.card.kind === 'summon',                                                    w: c => c.ai._fa * 3  },
    { test: c => c.threat.hasPlayerMass && c.play.cost <= 2 && c.card.kind === 'summon',                       w: c => -c.ai._fa * 5 },
    // Destroy the player's mana engine: AoE damage on a mana_pump is top priority.
    { test: c => c.hasPlayerManaPump && c.card.spell?.type?.startsWith('aoe_damage'),                          w: c => c.ai._fa * 15 },
];

// Accumulated score bonuses as player-tower HP drops (pr = playerTowerHpRatio).
const KILL_SUMMON_THRESHOLDS = [[0.6, 5], [0.5, 7], [0.35, 14], [0.2, 20]];
// Accumulated fast-unit bonuses (same shape).
const KILL_FAST_THRESHOLDS   = [[0.5, 5], [0.35, 9]];

/**
 * AIBehavior — single parameterised decision-making class.
 *
 * Difficulty is expressed through five 0-to-1 parameters, each mapping
 * to a distinct dimension of game intelligence:
 *
 *  fieldAwareness   — how strongly the AI reacts to units on the field
 *                     (0 = ignores threats entirely, 1 = counters them precisely)
 *  manaManagement   — quality of mana economy
 *                     (0 = dumps anything affordable, 1 = saves for high-value plays)
 *  towerSensitivity — responsiveness to tower HP
 *                     (0 = plays the same regardless, 1 = deploys wall/repair at the right moment)
 *  phaseAdaptation  — strategy shift across early / mid / late game
 *                     (0 = same strategy all match, 1 = economy → pressure → finisher)
 *  unitPositioning  — placement precision per unit type
 *                     (0 = random drops anywhere, 1 = tanks front / support back / siege rear)
 */
export class AIBehavior {
    constructor(profile) {
        this._fa = profile.fieldAwareness   ?? 0;
        this._mm = profile.manaManagement   ?? 0;
        this._ts = profile.towerSensitivity ?? 0;
        this._pa = profile.phaseAdaptation  ?? 0;
        this._up = profile.unitPositioning  ?? 0;
        this._evaluator = new ThreatEvaluator();
    }

    /**
     * Derive the minimum mana ratio the AI will wait for before playing.
     * Context-aware: reacts to active threats and kill opportunities.
     *
     * @param {object} [world]  optional — if provided, enables threat-based override
     */
    getManaThreshold(world) {
        if (world) {
            const threat = this._evaluator.evaluate(world);
            // Player attacking hard — spend immediately to defend.
            if (threat.playerPressure >= 2) return 0.22;
            // Kill opportunity — commit now, don't hoard.
            if (this._ts > 0.45 && threat.playerTowerHpRatio < 0.4) return 0.25;
        }
        return 0.2 + this._mm * 0.35;
    }

    /**
     * Select best play from affordable cards.
     *
     * @param {Array<{slot, cardId, cost}>} playable  sorted cost-desc
     * @param {object} world
     * @returns {{slot, cardId}|null}
     */
    selectPlay(playable, world) {
        if (playable.length === 0) return null;

        // Fully dumb path: no awareness of field, tower or phase.
        // Just play the costliest affordable card — no analysis needed.
        if (this._fa < 0.15 && this._ts < 0.15 && this._pa < 0.15) {
            return playable[0];
        }

        const threat = this._evaluator.evaluate(world);

        // High tower-sensitivity panic: own tower critical → deploy heaviest summon.
        if (this._ts > 0.6 && threat.enemyTowerHpRatio < 0.3) {
            const tanks = playable
                .filter(p => world.data.getCard(p.cardId).kind === 'summon')
                .sort((a, b) => b.cost - a.cost);
            if (tanks.length > 0) return tanks[0];
        }

        // Kill-shot commitment: player tower significantly damaged → send the finisher wave.
        // Threshold raised from 0.12 to 0.30 — seize the initiative earlier.
        if (this._fa > 0.55 && threat.playerTowerHpRatio < 0.3) {
            const finishers = playable
                .filter(p => {
                    const c = world.data.getCard(p.cardId);
                    return c.kind === 'summon' || this._isFastUnit(p.cardId);
                })
                .sort((a, b) => b.score - a.score || b.cost - a.cost);
            if (finishers.length > 0) return finishers[0];
        }

        const scored = playable.map(p => ({
            ...p, score: this._scoreCard(p, threat, world),
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored[0];
    }

    /**
     * Compute where to drop the card.
     * Low unitPositioning → sloppy random drops.
     * High unitPositioning → precise placement per unit type and game state.
     *
     * @param {object} card
     * @param {object} world
     * @returns {{x, y}}
     */
    getDropPosition(card, world) {
        const a       = GameConfig.ARENA;
        const yTop    = a.TOP + 30;
        const yBottom = a.SUMMON_ZONE_TOP - 20;
        const threat  = this._evaluator.evaluate(world);
        const aggro   = Math.max(0, Math.min(1, this._computeAggression(card, world, threat)));
        const baseY   = yTop + aggro * (yBottom - yTop);

        // Low unitPositioning → large random spread (sloppy drops anywhere).
        const spread = (1 - this._up) * 70;
        const y      = Math.max(yTop, Math.min(yBottom, baseY + (Math.random() - 0.5) * spread));

        if (card.kind === 'spell' && this._fa >= 0.3) {
            return this._aimSpell(card, world);
        }
        const isFlying = this._hasTag(card, world, 'flying');
        const bridgeCx = (a.BRIDGE_LEFT_X + a.BRIDGE_RIGHT_X) / 2;
        const xSpread  = 40 + (1 - this._up) * 40;
        const baseX    = (isFlying || card.kind === 'spell')
            ? a.BRIDGE_LEFT_X + Math.random() * (a.BRIDGE_RIGHT_X - a.BRIDGE_LEFT_X)
            : bridgeCx + (Math.random() - 0.5) * xSpread;

        return { x: baseX, y };
    }

    // ── Private scoring ───────────────────────────────────────────────────────

    _scoreCard(play, threat, world) {
        const card = world.data.getCard(play.cardId);
        return play.cost
            + this._scoreFieldAwareness(play, threat, card, world)
            + this._scoreTowerSensitivity(play, threat, card, world)
            + this._scorePhaseAdaptation(play, card, world)
            + this._scoreManaManagement(play, world, threat)
            + this._scoreCounterPlay(play, threat, card, world);
    }

    /** fieldAwareness: react to what the player has on the field. */
    _scoreFieldAwareness(play, threat, card, world) {
        if (this._fa < 0.05) return 0;
        let s = 0;
        // Anti-air is critical — reward it heavily when player has flyers.
        if (threat.hasPlayerAir  && this._isAntiAir(card, world))  s += this._fa * 15;
        if (card.kind === 'spell') s += this._scoreSpellAwareness(play, threat, card);
        if (threat.hasPlayerMass && card.kind === 'summon')          s += this._fa * 5;
        if (threat.playerPressure > 1 && card.kind === 'summon')     s += this._fa * 6;
        if (threat.enemyPressure  === 0 && card.kind === 'summon')   s += this._fa * 3;
        // Compound an active push: already pushing → reinforce the wave hard.
        if (threat.enemyPressure >= 2 && card.kind === 'summon')     s += this._fa * 8;
        return Math.round(s);
    }

    /** Spell-specific field-awareness score (split out to contain complexity). */
    _scoreSpellAwareness(play, threat, card) {
        let s = this._scoreSpell(card, threat) * this._fa;
        const isAoe = card.spell?.type?.startsWith('aoe');
        // Bonus for AoE when player already has 2+ units — prime target.
        if (isAoe && threat.playerUnitCount >= 2) s += this._fa * 10;
        // Penalize AoE when there are 0-1 targets — not worth spending mana.
        if (isAoe && this._mm > 0.5 && threat.playerUnitCount < 2) s -= this._mm * 10;
        return s;
    }

    /** towerSensitivity: react to tower HP — wall at the right moment. */
    _scoreTowerSensitivity(play, threat, card, world) {
        if (this._ts < 0.05) return 0;
        return Math.round(
            this._scoreTowerDefence(play, card, threat) +
            this._scoreKillShot(play, card, threat)
        );
    }

    _scoreTowerDefence(play, card, threat) {
        let s = 0;
        const ownRatio = threat.enemyTowerHpRatio;
        if (ownRatio < 0.6 && card.kind === 'summon')          s += this._ts * (1 - ownRatio) * 10;
        // Panic tiers: escalate defence score as tower HP drops.
        if (ownRatio < 0.4 && card.kind === 'summon')          s += this._ts * 8;
        if (ownRatio < 0.25 && card.kind === 'summon')         s += this._ts * 14;
        if (play.cardId === 'tower_repair' && ownRatio < 0.85) s += this._ts * (1 - ownRatio) * 16;
        if (play.cardId === 'tower_repair' && ownRatio >= 0.9) s -= this._ts * 10;
        return s + this._scoreSupportCards(play, threat);
    }

    /** Healer and war_banner are only useful when allies are present. */
    _scoreSupportCards(play, threat) {
        let s = 0;
        const ownRatio = threat.enemyTowerHpRatio;
        const bc = threat.enemyUnitCount;
        if (play.cardId === 'healer' && ownRatio < 0.65) s += this._ts * 6;
        if (play.cardId === 'healer' && bc === 0)         s -= this._ts * 12;
        if (play.cardId === 'war_banner' && bc >= 2)      s += this._ts * 4;
        if (play.cardId === 'war_banner' && bc === 1)     s -= this._ts * 2;
        if (play.cardId === 'war_banner' && bc === 0)     s -= this._ts * 12;
        return s;
    }

    _scoreKillShot(play, card, threat) {
        const pr = threat.playerTowerHpRatio;
        // Split into two helpers to stay within cognitive complexity budget.
        return this._killShotSummon(play, card, pr) + this._killShotSupport(play, card, pr);
    }

    _killShotSummon(play, card, pr) {
        if (card.kind !== 'summon') return 0;
        return KILL_SUMMON_THRESHOLDS.reduce((s, [t, w]) => pr < t ? s + this._ts * w : s, 0);
    }

    _killShotSupport(play, card, pr) {
        const fastBonus   = KILL_FAST_THRESHOLDS.reduce(
            (s, [t, w]) => this._isFastUnit(play.cardId) && pr < t ? s + this._ts * w : s, 0
        );
        const cannonBonus = pr < 0.35 && play.cardId === 'cannon' ? this._ts * 12 : 0;
        const spellBonus  = pr < 0.2  && card.kind === 'spell'    ? this._ts * 14 : 0;
        return fastBonus + cannonBonus + spellBonus;
    }

    /** phaseAdaptation: economy early, field pressure mid, all-in late. */
    _scorePhaseAdaptation(play, card, world) {
        if (this._pa < 0.05) return 0;
        const t = world.matchTime ?? 0;
        if (t < 60)  return Math.round(this._phaseEarly(play));
        if (t < 160) return Math.round(this._phaseMid(card, world));
        return Math.round(this._phaseLate(card, world));
    }

    _phaseEarly(play) {
        if (play.cardId === 'mana_pump')  return this._pa * 14;
        if (play.cardId === 'war_banner') return this._pa * 3;
        return 0;
    }

    _phaseMid(card, world) {
        let s = card.kind === 'summon' ? this._pa * 4 : 0;
        if (card.kind === 'spell') s += this._pa * 2;
        return this._hasTag(card, world, 'siege') ? s + this._pa * 6 : s;
    }

    _phaseLate(card, world) {
        if (card.kind === 'spell') return this._pa * 6;   // all spells welcome in final push
        const s = card.kind === 'summon' ? this._pa * 7 : 0;
        return this._hasTag(card, world, 'siege') ? s + this._pa * 9 : s;
    }

    /** manaManagement: avoid wasting big plays when unnecessary. */
    _scoreManaManagement(play, world, threat = null) {
        if (this._mm < 0.05) return 0;
        let s = 0;
        if (play.cardId === 'mana_pump' && (world.matchTime ?? 0) < 60) s += this._mm * 5;
        // Penalize mana_pump when the player is actively attacking — defence first
        if (play.cardId === 'mana_pump' && (threat?.playerPressure ?? 0) >= 2) s -= this._mm * 8;
        if (play.cost >= 5) s += this._mm * 2;
        return Math.round(s);
    }

    // ── Aggression / positioning ──────────────────────────────────────────────

    _computeAggression(card, world, threat) {
        // Dumb AI: truly random drops all over the enemy half.
        if (this._up < 0.15) return 0.1 + Math.random() * 0.7;

        const tags = this._tags(card, world);

        // Unit-type-aware base positioning.
        if (tags.includes('static') ||
            (tags.includes('support') && !tags.includes('ranged'))) return 0.05;
        if (tags.includes('siege')) return 0.1;

        // Base aggression scales from 0.35 (cautious) to 0.75 (very aggressive).
        let base = 0.35 + this._up * 0.4;
        if (tags.includes('flying'))                           base += 0.1;
        if (tags.includes('tank') || tags.includes('heavy'))  base += 0.1;

        // Pull back defenders when own tower is in danger.
        if (this._ts > 0.5 && threat.enemyTowerHpRatio < 0.35)  base -= 0.25;
        // Push harder when player tower is near death.
        if (this._fa > 0.5 && threat.playerTowerHpRatio < 0.4)  base += 0.2;
        // Kill-shot mode: maximum aggression when finishing off a weakened tower.
        if (this._fa > 0.5 && threat.playerTowerHpRatio < 0.25) return 0.95;

        return base;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    _tags(card, world) {
        if (card.kind !== 'summon' || !card.unitId) return [];
        try { return world.data.getUnit(card.unitId).tags ?? []; }
        catch { return []; }
    }

    _hasTag(card, world, tag) { return this._tags(card, world).includes(tag); }

    /** Fast/aggressive units that should be preferred for kill-shot finishes. */
    _isFastUnit(cardId) {
        return ['assassin','wolf_pair','goblin_pack','berserker','bat_swarm','phoenix'].includes(cardId);
    }

    _isAntiAir(card, world) {
        return this._hasTag(card, world, 'anti_air') ||
               this._hasTag(card, world, 'ranged');
    }

    /**
     * Score a spell card based on its type and battlefield conditions.
     * Returns a raw value that will be multiplied by this._fa.
     */
    _scoreSpell(card, threat) {
        const sp = card.spell;
        if (!sp) return 0;
        switch (sp.type) {
            case 'aoe_damage':
            case 'aoe_damage_slow': return this._scoreAoeDamage(threat);
            case 'single_damage':   return threat.playerUnitCount >= 1 ? 6 : -8;
            case 'aoe_heal':        return this._scoreHeal(threat);
            default:                return threat.hasPlayerMass ? 9 : 0;
        }
    }

    _scoreAoeDamage(threat) {
        if (threat.playerUnitCount === 0) return -8;
        if (threat.playerUnitCount >= 3) return 12;
        if (threat.playerUnitCount >= 2) return 7;
        if (threat.playerPressure  >= 1) return 3;
        return 0;
    }

    _scoreHeal(threat) {
        if (threat.enemyUnitCount === 0) return -15;
        if (threat.enemyUnitCount >= 3) return 12;
        if (threat.enemyUnitCount >= 2) return 7;
        return 2;
    }

    /**
     * Counter-play scoring: driven by COUNTER_RULES table (module level).
     * To extend AI behaviour, append entries to COUNTER_RULES — no edits here.
     */
    _scoreCounterPlay(play, threat, card, world) {
        if (this._fa < 0.1) return 0;
        const allUnits = world.entityManager?.list?.() ?? [];
        const ctx = {
            ai: this, play, threat, card, world,
            hasTank:           this._hasPlayerTank(allUnits),
            hasPlayerManaPump: this._hasPlayerManaPump(allUnits),
            isStalemate:       threat.playerUnitCount === 0 && threat.enemyUnitCount === 0,
        };
        return Math.round(COUNTER_RULES.reduce((s, rule) => rule.test(ctx) ? s + rule.w(ctx) : s, 0));
    }

    _hasPlayerTank(units) {
        return units.some(e =>
            !e.isDead() && e.team === 'player' &&
            (e.def?.tags?.includes('tank') || e.def?.tags?.includes('heavy'))
        );
    }

    _hasPlayerManaPump(units) {
        return units.some(e => !e.isDead() && e.team === 'player' && e.def?.id === 'mana_pump');
    }

    /**
     * Compute an aimed drop position for a spell.
     * - AoE damage: destroys player mana_pump first, then targets the densest cluster.
     * - AoE heal:   targets the densest allied cluster.
     * - Single:     most advanced enemy / most wounded ally.
     */
    _aimSpell(card, world) {
        const a      = GameConfig.ARENA;
        const isHeal = card.spell?.type === 'aoe_heal';
        const team   = isHeal ? 'enemy' : 'player';
        const targets = world.entityManager.list().filter(e => !e.isDead() && e.team === team);
        if (targets.length === 0) {
            return {
                x: (a.BRIDGE_LEFT_X + a.BRIDGE_RIGHT_X) / 2,
                y: isHeal ? a.BRIDGE_Y_CENTER + 60 : a.BRIDGE_Y_CENTER - 60,
            };
        }
        if (!isHeal && card.spell?.type?.startsWith('aoe_damage')) {
            const pump = targets.find(e => e.def?.id === 'mana_pump');
            if (pump) return this._aimAtUnit(pump, a, 10);
        }
        const isAoe = card.spell?.type !== 'single_damage';
        const aim   = isAoe && targets.length > 1
            ? this._bestAoePosition(targets, card.spell?.radius ?? 60)
            : this._bestSingleTarget(targets, isHeal);
        return this._aimAtUnit(aim, a, 25);
    }

    /** Clamp and jitter a target position. jitterBase is scaled by (1 − fieldAwareness). */
    _aimAtUnit(target, a, jitterBase) {
        const j = (1 - this._fa) * jitterBase;
        return {
            x: Math.max(a.BRIDGE_LEFT_X, Math.min(a.BRIDGE_RIGHT_X, target.x + (Math.random() - 0.5) * j)),
            y: Math.max(a.TOP + 30, Math.min(a.BOTTOM - 30, target.y + (Math.random() - 0.5) * j)),
        };
    }

    /**
     * Returns the position (centroid of best cluster) that maximises
     * the number of units within `radius` pixels — O(n²), n < 10.
     */
    _bestAoePosition(units, radius) {
        let bestPos   = { x: units[0].x, y: units[0].y };
        let bestCount = 0;
        const r2 = radius * radius;
        for (const anchor of units) {
            const inRange = units.filter(u => {
                const dx = u.x - anchor.x;
                const dy = u.y - anchor.y;
                return dx * dx + dy * dy <= r2;
            });
            if (inRange.length > bestCount) {
                bestCount = inRange.length;
                bestPos = {
                    x: inRange.reduce((s, u) => s + u.x, 0) / inRange.length,
                    y: inRange.reduce((s, u) => s + u.y, 0) / inRange.length,
                };
            }
        }
        return bestPos;
    }

    /**
     * For single-target spells:
     * - Damage → most advanced player unit (highest y = deepest into AI territory).
     * - Heal   → most wounded allied unit (lowest hp/maxHp ratio).
     */
    _bestSingleTarget(units, isHeal) {
        if (isHeal) {
            return units.reduce((best, u) => {
                const ratio     = (u.hp ?? u.maxHp ?? 1) / (u.maxHp ?? 1);
                const bestRatio = (best.hp ?? best.maxHp ?? 1) / (best.maxHp ?? 1);
                return ratio < bestRatio ? u : best;
            });
        }
        return units.reduce((best, u) => u.y > best.y ? u : best);
    }
}

