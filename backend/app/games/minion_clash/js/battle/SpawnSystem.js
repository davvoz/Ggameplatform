import { Unit } from '../entities/Unit.js';
import { GameConfig } from '../config/GameConfig.js';

/**
 * SpawnSystem: enqueues unit spawns from played cards and resolves them on
 * next tick (so spawn happens after the current update pass).
 */
export class SpawnSystem {
    constructor(entityManager, dataRegistry, modifiers, assets) {
        this._em = entityManager;
        this._data = dataRegistry;
        this._modifiers = modifiers ?? { enemyUnitHpMult: 1, playerUnitHpMult: 1 };
        this._assets = assets ?? null;
        this._queue = [];
    }

    /**
     * Enqueue summon from a card definition.
     * @param {object} cardDef
     * @param {'player'|'enemy'} team
     * @param {number} x @param {number} y
     */
    enqueueFromCard(cardDef, team, x, y) {
        if (cardDef.kind !== 'summon') {
            throw new Error(`SpawnSystem: card "${cardDef.id}" is not a summon`);
        }
        this._queue.push({ team, unitId: cardDef.unitId, count: cardDef.count, spread: cardDef.spread, x, y });
    }

    /** Direct spawn used by onDeath triggers (e.g. Necromancer). */
    spawnUnitsAt(team, unitId, count, x, y, spread = 18) {
        this._queue.push({ team, unitId, count, spread, x, y });
    }

    flush() {
        if (this._queue.length === 0) return;
        for (const job of this._queue) this._spawnJob(job);
        this._queue.length = 0;
    }

    _spawnJob(job) {
        const def = this._data.getUnit(job.unitId);
        const scaled = this._scaleDefinition(def, job.team);
        const positions = this._cluster(job.x, job.y, job.count, job.spread);
        const spriteRef = scaled.sprite ?? { prefix: `unit_${job.unitId}`, scale: 1 };
        for (const p of positions) {
            const unit = new Unit({ team: job.team, x: p.x, y: p.y, def: scaled });
            if (this._assets) {
                unit.setSprite(this._assets.createAnimator(spriteRef));
            }
            this._em.add(unit);
        }
    }

    _scaleDefinition(def, team) {
        const mult = team === 'enemy' ? this._modifiers.enemyUnitHpMult : this._modifiers.playerUnitHpMult;
        if (!mult || mult === 1) return def;
        return Object.freeze({ ...def, hp: Math.round(def.hp * mult) });
    }

    _cluster(x, y, count, spread) {
        if (count <= 1) return [this._clamp(x, y)];
        const out = [];
        const step = (Math.PI * 2) / count;
        for (let i = 0; i < count; i++) {
            const a = step * i;
            out.push(this._clamp(x + Math.cos(a) * spread, y + Math.sin(a) * spread));
        }
        return out;
    }

    _clamp(x, y) {
        const a = GameConfig.ARENA;
        return {
            x: Math.max(20, Math.min(GameConfig.VIEW_WIDTH - 20, x)),
            y: Math.max(a.TOP + 10, Math.min(a.BOTTOM - 10, y))
        };
    }
}
