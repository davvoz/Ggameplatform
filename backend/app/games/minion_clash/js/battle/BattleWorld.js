import { EntityManager } from './EntityManager.js';
import { SpatialIndex } from './SpatialIndex.js';
import { CombatSystem } from './CombatSystem.js';
import { MovementSystem } from './MovementSystem.js';
import { EffectSystem } from './EffectSystem.js';
import { SpawnSystem } from './SpawnSystem.js';
import { SpellResolver } from './SpellResolver.js';
import { WinConditionChecker } from './WinConditionChecker.js';
import { VFXManager } from './VFXManager.js';
import { PlayerTeamController } from './PlayerTeamController.js';
import { EnemyTeamController } from './EnemyTeamController.js';
import { GameConfig } from '../config/GameConfig.js';
import { EntityKind } from '../entities/Entity.js';

/**
 * BattleWorld: the live match. Orchestrates entity update order and exposes
 * subsystems to entities (combat, spawn, effects, spatial, data).
 *
 * Tick order:
 *  1. team controllers (mana/deck/hand/AI)
 *  2. spawn flush
 *  3. spatial rebuild
 *  4. effects (auras / per-frame buffs)
 *  5. entities update
 *  6. movement separation
 *  7. cull dead
 *  8. vfx update
 *  9. win check
 */
export class BattleWorld {
    constructor({ data, level, runContext, assets, sound }) {
        this.data = data;
        this.level = level;
        this.runContext = runContext;
        this.assets = assets ?? null;
        this.sound = sound ?? null;

        this.entityManager = new EntityManager();
        this.spatial = new SpatialIndex();
        this.combat = new CombatSystem(this.entityManager, this.assets);
        this.effects = new EffectSystem(this.spatial);
        this.movement = new MovementSystem(this.spatial);
        this.vfx = new VFXManager();
        this.spawn = new SpawnSystem(this.entityManager, data, {
            enemyUnitHpMult: level.modifiers.enemyUnitHpMult,
            playerUnitHpMult: level.modifiers.playerUnitHpMult ?? 1
        }, this.assets);
        this.spells = new SpellResolver(this.spatial, this.effects, this.vfx, this.sound);
        this.winCheck = new WinConditionChecker();

        const arena = GameConfig.ARENA;
        const towerDef = data.getTowerDef();

        this.player = new PlayerTeamController({
            team: 'player', heroDef: data.getHero(runContext.heroId), deckIds: runContext.deckIds,
            towerDef, manaRegenMult: level.modifiers.playerManaRegenMult ?? 1,
            world: this, arena, assets: this.assets
        });
        this.enemy = this._buildEnemy(level, runContext, towerDef, arena);

        this.matchTime = 0;
        this.timeLeft = GameConfig.BATTLE.MATCH_TIME_LIMIT;
        this.outcome = null;
        this.stats = { unitsKilled: 0, projectiles: 0, durationSec: 0 };

        this.entityManager.flushAdditions();
    }

    update(dt) {
        if (this.outcome) return;
        this.matchTime += dt;
        this.timeLeft = Math.max(0, GameConfig.BATTLE.MATCH_TIME_LIMIT - this.matchTime);

        this.player.update(dt, this);
        this.enemy.update(dt, this);

        this.spawn.flush();
        this.entityManager.flushAdditions();

        this.spatial.rebuild(this.entityManager);
        this.effects.update(this.entityManager, dt);

        const list = this.entityManager.list();
        for (const e of list) e.update(dt, this);

        this.movement.update(this.entityManager, dt);

        const killed = this.entityManager.list().filter(
            e => e.isDead() && e.team === 'enemy' &&
                 (e.kind === EntityKind.UNIT || e.kind === EntityKind.HERO)
        ).length;
        this.entityManager.cullDead();
        if (killed > 0) this.stats.unitsKilled += killed;

        this.vfx.update(dt);

        const winner = this.winCheck.check(this.player, this.enemy);
        if (winner) {
            this.outcome = winner === 'player' ? 'win' : 'lose';
            this.stats.durationSec = this.matchTime;
            return;
        }
        if (this.timeLeft <= 0) {
            const t = this.winCheck.timeoutOutcome(this.player, this.enemy);
            this.outcome = this._mapTimeoutOutcome(t);
            this.stats.durationSec = this.matchTime;
        }
    }

    _mapTimeoutOutcome(t) {
        if (t === 'player') return 'win';
        if (t === 'enemy') return 'lose';
        return 'timeout';
    }

    /**
     * Build the enemy controller for single-player. Multiplayer never reaches
     * here — BattleState instantiates RemoteBattleView instead of BattleWorld
     * (the server runs the simulation).
     */
    _buildEnemy(level, runContext, towerDef, arena) {
        const baseOpts = {
            team: 'enemy',
            heroDef: this.data.getHero(level.enemyHeroId),
            deckIds: level.enemyDeck,
            towerDef,
            manaRegenMult: level.modifiers.enemyManaRegenMult ?? 1,
            world: this, arena, assets: this.assets,
        };
        return new EnemyTeamController({ ...baseOpts, aiProfile: level.aiProfile });
    }
}
