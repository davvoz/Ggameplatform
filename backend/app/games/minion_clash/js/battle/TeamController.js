import { Hero } from '../entities/Hero.js';
import { Tower } from '../entities/Tower.js';
import { ManaPool } from './ManaPool.js';
import { Deck } from './Deck.js';
import { Hand } from './Hand.js';
import { CooldownTracker } from './CooldownTracker.js';
import { GameConfig } from '../config/GameConfig.js';
import { SoundEvent } from '../audio/SoundEvent.js';
import { SupportVfxSystem } from '../vfx/SupportVfxSystem.js';

/**
 * Abstract team controller. Owns mana, deck, hand, hero and tower for one team.
 * Subclasses (Player / Enemy / future Remote) drive the play-card decisions.
 *
 * Multiplayer-ready: a future RemoteTeamController would read inputs from the
 * network and call playCard exactly like the local Player does.
 */
export class TeamController {
    constructor({ team, heroDef, deckIds, towerDef, manaRegenMult, world, arena, assets }) {
        this.team = team;
        this.world = world;
        this._assets = assets ?? null;
        this.cooldowns = new CooldownTracker();
        this.deck = new Deck(deckIds);
        this.hand = new Hand(this.deck, this.cooldowns);
        this.hand.fill();
        this.mana = ManaPool.fromConfig(manaRegenMult);

        const a = arena;
        const towerX = team === 'player' ? a.PLAYER_TOWER_X : a.ENEMY_TOWER_X;
        const towerY = team === 'player' ? a.PLAYER_TOWER_Y : a.ENEMY_TOWER_Y;
        const heroX = team === 'player' ? a.PLAYER_HERO_SPAWN_X : a.ENEMY_HERO_SPAWN_X;
        const heroY = team === 'player' ? a.PLAYER_HERO_SPAWN_Y : a.ENEMY_HERO_SPAWN_Y;

        this.tower = new Tower({ team, x: towerX, y: towerY, def: towerDef });
        this.hero  = new Hero({ team, x: heroX, y: heroY, def: heroDef, homeX: heroX, homeY: heroY });
        this._attachSprite(this.tower, towerDef);
        this._attachSprite(this.hero, heroDef);
        world.entityManager.add(this.tower);
        world.entityManager.add(this.hero);

        this._heroDef = heroDef;
        this._heroRespawnTimer = 0;
        this._heroSpawn = { x: heroX, y: heroY };
        this._supportVfxSystem = new SupportVfxSystem();
    }

    update(dt, _world) {
        const timeLeft = this.world?.timeLeft ?? _world?.timeLeft;
        const manaRushMult = (timeLeft != null && timeLeft <= 60)
            ? 1 + 2 * (1 - timeLeft / 60)
            : 1;
        const manaBonus = this._collectManaPumpBonus();
        this.mana.update(dt, manaRushMult, manaBonus);
        this._applyTowerRepair(dt);
        this._supportVfxSystem.update(
            dt,
            this.world.entityManager.list(),
            this.team,
            this.tower,
            this.world?.vfx ?? null,
        );
        this.cooldowns.update(dt);
        this.hand.update();
        this._tickHeroRespawn(dt);
    }

    _applyTowerRepair(dt) {
        if (this.tower.isDead()) return;
        let repair = 0;
        for (const e of this.world.entityManager.list()) {
            if (!e.isDead() && e.team === this.team && e.def?.towerRepairBonus) {
                repair += e.def.towerRepairBonus;
            }
        }
        if (repair > 0) {
            this.tower.hp = Math.min(this.tower.maxHp, this.tower.hp + repair * dt);
        }
    }

    _collectManaPumpBonus() {
        let bonus = 0;
        for (const e of this.world.entityManager.list()) {
            if (!e.isDead() && e.team === this.team && e.def?.manaRegenBonus) {
                bonus += e.def.manaRegenBonus;
            }
        }
        return bonus;
    }

    _tickHeroRespawn(dt) {
        if (!this.hero.isDead()) return;
        if (this._heroRespawnTimer === 0) this._heroRespawnTimer = this._heroDef.respawnDelay;
        this._heroRespawnTimer -= dt;
        if (this._heroRespawnTimer > 0) return;
        this._heroRespawnTimer = 0;
        this.hero = new Hero({
            team: this.team, x: this._heroSpawn.x, y: this._heroSpawn.y,
            def: this._heroDef, homeX: this._heroSpawn.x, homeY: this._heroSpawn.y
        });
        this._attachSprite(this.hero, this._heroDef);
        this.world.entityManager.add(this.hero);
    }

    _attachSprite(entity, def) {
        if (!this._assets || !def?.sprite) return;
        entity.setSprite(this._assets.createAnimator(def.sprite));
    }

    /**
     * Attempt to play a card from `slotIndex` at world position (x,y).
     * Returns true on success, false on failure (insufficient mana, OOB, etc.).
     */
    playCardFromHand(slotIndex, x, y) {
        const cardId = this.hand.cardAt(slotIndex);
        if (!cardId) return false;
        const card = this.world.data.getCard(cardId);
        if (card.kind !== 'spell' && !this._isInOwnHalf(x, y)) return false;
        if (!this.mana.canConsume(card.cost)) return false;
        this.mana.consume(card.cost);
        this.hand.play(slotIndex);
        this.cooldowns.set(cardId, card.cooldown);
        this._executeCard(card, x, y);
        const snd = card.kind === 'spell' ? SoundEvent.CARD_PLAY_SPELL : SoundEvent.CARD_PLAY_SUMMON;
        this.world.sound?.play(snd);
        return true;
    }

    _executeCard(card, x, y) {
        if (card.kind === 'summon') {
            this.world.spawn.enqueueFromCard(card, this.team, x, y);
        } else if (card.kind === 'spell') {
            this.world.spells.cast(card, x, y, this.team, this.world);
        } else {
            throw new Error(`TeamController: unknown card kind "${card.kind}"`);
        }
    }

    _isInOwnHalf(_x, y) {
        const a = GameConfig.ARENA;
        return this.team === 'player' ? y >= a.SUMMON_ZONE_TOP : y <= a.SUMMON_ZONE_TOP;
    }
}
