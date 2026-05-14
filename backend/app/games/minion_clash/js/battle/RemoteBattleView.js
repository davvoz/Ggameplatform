import { GameConfig } from '../config/GameConfig.js';
import { EntityKind } from '../entities/Entity.js';
import { SoundEvent } from '../audio/SoundEvent.js';

/**
 * RemoteBattleView — the MULTIPLAYER replacement for `BattleWorld`.
 *
 * It does NOT simulate anything. It mirrors the API surface BattleRenderer
 * relies on (entityManager.list(), player/enemy facades, vfx.list(), etc.)
 * but its internal state is fed exclusively by the server via:
 *   - applySnapshot(state)   — periodic ~10 Hz authoritative state
 *   - applyEvent(event)      — per-tick fire-and-forget VFX/intent hints
 *   - applyOutcome(outcome)  — match termination
 *
 * The local player can speculatively block illegal drags (mana / cooldown)
 * by reading the latest team snapshot, but the server is canonical.
 */
export class RemoteBattleView {
    constructor({ data, level, runContext, assets, sound, mpRoom }) {
        this.data = data;
        this.level = level;
        this.runContext = runContext;
        this.assets = assets ?? null;
        this.sound = sound ?? null;
        this._mpRoom = mpRoom;

        this.matchTime = 0;
        this.timeLeft = GameConfig.BATTLE.MATCH_TIME_LIMIT;
        this.outcome = null;
        this.stats = { unitsKilled: 0, projectiles: 0, durationSec: 0 };

        this._entitiesById = new Map();
        this.entityManager = { list: () => Array.from(this._entitiesById.values()) };

        // VFX ledger (spell flashes, etc.) drained by BattleRenderer
        this._vfxList = [];
        this.vfx = { list: () => this._vfxList };

        // Initial empty facades — populated by the first snapshot
        this.player = this._buildEmptyTeamFacade('player', runContext.heroId);
        this.enemy = this._buildEmptyTeamFacade('enemy', mpRoom.opponentHeroId);
    }

    // ─── Facade helpers ─────────────────────────────────────────
    _buildEmptyTeamFacade(team, heroId) {
        const towerDef = this.data.getTowerDef();
        const heroDef = this.data.getHero(heroId);
        return {
            team,
            tower: { hp: towerDef.hp, maxHp: towerDef.hp, x: 0, y: 0, radius: towerDef.radius },
            hero:  { hp: heroDef.hp,  maxHp: heroDef.hp,  alive: true, respawnIn: 0, def: heroDef },
            mana:  { value: 0, max: GameConfig.BATTLE.MAX_MANA,
                     canConsume: (c) => 0 + 0.001 >= c },
            hand:  { cardAt: () => null, slots: [null, null, null, null] },
            cooldowns: { isOnCooldown: () => false, snapshot: () => ({}) },
        };
    }

    // ─── Snapshot ingestion ────────────────────────────────────
    applySnapshot(state) {
        if (state?.type !== 'state') return;
        this.matchTime = state.t;
        this.timeLeft = state.timeLeft;
        this._updateTeams(state.teams);
        this._updateEntities(state.entities ?? []);
    }

    _updateTeams(teams) {
        if (!teams) return;
        this._refreshTeamFacade(this.player, teams.player);
        this._refreshTeamFacade(this.enemy, teams.enemy);
    }

    _refreshTeamFacade(facade, block) {
        if (!block) return;
        facade.tower.hp = block.tower.hp;
        facade.tower.maxHp = block.tower.maxHp;
        facade.hero.hp = block.hero.hp;
        facade.hero.maxHp = block.hero.maxHp;
        facade.hero.alive = block.hero.alive;
        facade.hero.respawnIn = block.hero.respawnIn;
        facade.mana.value = block.mana.cur;
        facade.mana.max = block.mana.max;
        facade.mana.canConsume = (c) => block.mana.cur + 0.001 >= c;
        facade.hand.slots = block.hand;
        facade.hand.cardAt = (i) => (i >= 0 && i < block.hand.length ? block.hand[i] : null);
        facade.cooldowns.snapshot = () => (block.cooldowns ? { ...block.cooldowns } : {});
        facade.cooldowns.isOnCooldown = (cardId) =>
            !!block.cooldowns && block.cooldowns[cardId] > 0;
    }

    _updateEntities(entityList) {
        const seen = new Set();
        for (const snap of entityList) {
            seen.add(snap.id);
            const existing = this._entitiesById.get(snap.id);
            if (existing) {
                this._patchEntity(existing, snap);
            } else {
                this._entitiesById.set(snap.id, this._createEntity(snap));
            }
        }
        // Cull entities not present in this snapshot
        for (const id of Array.from(this._entitiesById.keys())) {
            if (!seen.has(id)) {
                this._entitiesById.delete(id);
                this.stats.unitsKilled += 1;
            }
        }
    }

    _patchEntity(e, snap) {
        e.x = snap.x;
        e.y = snap.y;
        e.hp = snap.hp;
        e.facingX = snap.facing;
    }

    _createEntity(snap) {
        const def = this._lookupDef(snap);
        const radius = def?.radius ?? this._defaultRadius(snap.kind);
        const entity = {
            id: snap.id,
            kind: snap.kind,
            team: snap.team,
            x: snap.x,
            y: snap.y,
            hp: snap.hp,
            maxHp: snap.maxHp,
            radius,
            facingX: snap.facing,
            def: def ?? { color: snap.team === 'player' ? '#5fc8ff' : '#ff7755' },
            sprite: this._buildSprite(snap, def),
            isDead: () => false,
        };
        return entity;
    }

    _lookupDef(snap) {
        try {
            if (snap.kind === EntityKind.UNIT) return this.data.getUnit(snap.defId);
            if (snap.kind === EntityKind.HERO) return this.data.getHero(snap.defId);
            if (snap.kind === EntityKind.TOWER) return this.data.getTowerDef();
        } catch (err) {
            console.warn('[remote-view] unknown defId', snap.defId, err);
        }
        return null;
    }

    _defaultRadius(kind) {
        if (kind === EntityKind.TOWER) return 28;
        if (kind === EntityKind.HERO) return 14;
        if (kind === EntityKind.PROJECTILE) return 4;
        return 10;
    }

    _buildSprite(snap, def) {
        if (!this.assets) return null;
        const spriteRef = def?.sprite ?? this._fallbackSpriteRef(snap);
        if (!spriteRef) return null;
        try {
            return this.assets.createAnimator(spriteRef);
        } catch (err) {
            console.debug('[remote-view] no animator for', spriteRef, err);
            return null;
        }
    }

    /**
     * Mirror the SP fallback used by `SpawnSystem`/`TeamController`: when the
     * raw def carries no `sprite` block (e.g. units.json), synthesize one from
     * the kind+defId convention so the AssetManager can resolve `unit_<id>_idle`.
     */
    _fallbackSpriteRef(snap) {
        if (!snap?.defId) return null;
        if (snap.kind === EntityKind.UNIT)  return { prefix: `unit_${snap.defId}`,  scale: 1 };
        if (snap.kind === EntityKind.HERO)  return { prefix: `hero_${snap.defId}`,  scale: 1 };
        if (snap.kind === EntityKind.TOWER) return { prefix: 'tower',                scale: 1 };
        return null;
    }

    // ─── Event ingestion ──────────────────────────────────────
    applyEvent(event) {
        if (!event) return;
        switch (event.type) {
            case 'spellCast':
                this._vfxList.push({
                    type: 'spell', x: event.x, y: event.y, radius: event.radius,
                    color: event.color, life: 0, maxLife: 0.6,
                });
                this.sound?.play(SoundEvent.SPELL_AOE);
                break;
            case 'cardPlayed':
                this.sound?.play(SoundEvent.CARD_PLAY_SUMMON);
                break;
            case 'projectile':
                // Server emits 'projectile' only for ranged attacks; the
                // firing-side SFX maps to UNIT_ATTACK_RANGED. Impact SFX
                // is folded into entityDied / towerHit.
                this.sound?.play(SoundEvent.UNIT_ATTACK_RANGED);
                break;
            case 'meleeHit':
                this.sound?.play(SoundEvent.UNIT_ATTACK_MELEE);
                break;
            case 'towerHit':
                this.sound?.play(SoundEvent.TOWER_HIT);
                break;
            case 'entityDied':
                this._playDeathSound(event.kind);
                break;
            case 'unitSpawn':
            default:
                // No client-side action needed: the next snapshot reflects state.
                break;
        }
    }

    _playDeathSound(kind) {
        if (!this.sound) return;
        if (kind === EntityKind.TOWER) this.sound.play(SoundEvent.TOWER_DESTROY);
        else if (kind === EntityKind.HERO) this.sound.play(SoundEvent.HERO_DEATH);
        else if (kind === EntityKind.UNIT) this.sound.play(SoundEvent.UNIT_DEATH);
    }

    applyOutcome(out) {
        if (!out) return;
        if (out.result === 'win') this.outcome = 'win';
        else if (out.result === 'lose') this.outcome = 'lose';
        else this.outcome = 'timeout';
        this.stats.durationSec = this.matchTime;
    }

    // ─── Per-frame tick ───────────────────────────────────────
    update(dt) {
        if (this.outcome) return;
        // Advance sprite animations and VFX timers — interpolation is delegated
        // to the next snapshot for A2.1 (no client-side dead reckoning yet).
        for (const e of this._entitiesById.values()) e.sprite?.update?.(dt);
        for (let i = this._vfxList.length - 1; i >= 0; i--) {
            const v = this._vfxList[i];
            v.life += dt;
            if (v.life >= v.maxLife) this._vfxList.splice(i, 1);
        }
    }
}
