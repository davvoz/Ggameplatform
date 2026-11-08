import { PlayerTuning, ScoreTuning, View } from '../config/Tuning.js';
import { Combat } from './Combat.js';
import { Director } from './Director.js';
import { Ev } from './Events.js';
import { Hostage } from './Hostage.js';
import { Pickups } from './Pickups.js';
import { Projectiles } from './Projectiles.js';
import { Prop } from './Prop.js';
import { Style } from './ScoreKeeper.js';
import { ScrollCamera } from './ScrollCamera.js';
import { Terrain } from './Terrain.js';
import { createEnemy } from './enemies/registry.js';

/**
 * One mission in progress: terrain, camera, every living thing and every shot.
 * It also offers the shared actions entities need (explode, damage, drop...),
 * so they never reach into each other.
 */
export class World {
    level;
    terrain;
    camera;
    /** @type {import('./enemies/Enemy.js').Enemy[]} */
    enemies = [];
    /** @type {Prop[]} */
    props = [];
    /** @type {Hostage[]} */
    hostages = [];
    /** solid boxes (barricades) */
    blockers = [];
    pickups = new Pickups();
    playerShots = new Projectiles(160);
    enemyShots = new Projectiles(160);
    combat = new Combat();
    director;
    player;
    score;
    events;
    rng;
    difficulty;
    tick = 0;
    /** set when the last boss of the mission falls */
    cleared = false;
    #nextEnemyId = 1;
    #hit = { kind: '', x: 0, y: 0, dirX: 0, byPlayer: true };

    /**
     * @param {Object} parts
     * @param {any} parts.level level data
     * @param {import('../core/Rng.js').Rng} parts.rng
     * @param {import('./Events.js').EventQueue} parts.events
     * @param {import('./ScoreKeeper.js').ScoreKeeper} parts.score
     * @param {import('./Player.js').Player} parts.player
     * @param {number} parts.difficulty
     */
    constructor({ level, rng, events, score, player, difficulty }) {
        this.level = level;
        this.rng = rng;
        this.events = events;
        this.score = score;
        this.player = player;
        this.difficulty = difficulty;
        this.terrain = new Terrain(level);
        this.camera = new ScrollCamera(level.length);

        for (const p of level.props ?? []) {
            const prop = new Prop(p.type, p.x, p.y ?? this.terrain.groundY(p.x), p.drop);
            this.props.push(prop);
            if (prop.blocker) this.blockers.push(prop.blocker);
        }
        level.hostages?.forEach((h, i) => {
            this.hostages.push(new Hostage(h.x, h.y ?? this.terrain.groundY(h.x), h.gift, i % 3));
        });
        for (const p of level.pickups ?? []) {
            this.pickups.spawn(p.type, p.x, p.y ?? this.terrain.groundY(p.x), false);
        }
        for (const e of level.enemies ?? []) this.spawnEnemy(e.type, e.x, e.y, e.opts ?? {});
        this.director = new Director(level.script ?? [], this);
    }

    /** @param {import('./Buttons.js').ButtonState} input */
    update(input) {
        this.tick++;
        this.player.update(this, input);
        this.director.update();
        for (let i = 0; i < this.enemies.length; i++) this.enemies[i].update(this);
        this.playerShots.update(this);
        this.enemyShots.update(this);
        this.combat.resolve(this);
        this.pickups.update(this);
        for (const h of this.hostages) h.update(this);
        for (const p of this.props) p.update();
        if (this.player.alive) this.camera.follow(this.player.body.x);
        this.#sweep();
    }

    // ---- actions offered to entities ----

    spawnEnemy(type, x, y, opts = {}) {
        const enemy = createEnemy(type, x, y ?? this.terrain.groundY(x), opts);
        enemy.id = this.#nextEnemyId++;
        this.enemies.push(enemy);
        return enemy;
    }

    /**
     * @param {import('./enemies/Enemy.js').Enemy} enemy
     * @param {number} damage
     * @param {import('./enemies/Enemy.js').HitInfo} hit
     */
    damageEnemy(enemy, damage, hit) {
        if (!enemy.targetable) return;
        const taken = enemy.takeHit(this, damage, hit);
        if (taken <= 0) return;
        this.events.emit(Ev.HIT, hit.x, hit.y, hit.dirX, taken, enemy.def.material);
        this.score.keepAlive();
        if (enemy.hp <= 0) this.killEnemy(enemy, hit);
    }

    /**
     * @param {import('./enemies/Enemy.js').Enemy} enemy
     * @param {import('./enemies/Enemy.js').HitInfo} hit
     * @param {{label: string, percent: number, heat: number}[]} [extra]
     */
    killEnemy(enemy, hit, extra = []) {
        if (enemy.dead) return;
        // read the hit now: dying can set off another blast that reuses the object
        const kind = hit.kind;
        const byPlayer = hit.byPlayer;
        const airborne = enemy.juggled || (!enemy.flying && !enemy.onGround && enemy.type !== 'balloon');
        enemy.die(this, hit);
        if (!byPlayer) return;

        if (enemy.isBoss) {
            this.score.kill(enemy.def.points, [], enemy.x, enemy.y - enemy.h, enemy.type, enemy, false);
            const left = Math.max(0, enemy.parTicks - enemy.fightTicks);
            const bonus = Math.floor(left / 60) * 200;
            if (bonus > 0) this.score.award(bonus, enemy.x, enemy.y - enemy.h - 14, 'SPEED BONUS', false);
            return;
        }

        const styles = [...extra];
        const pb = this.player.body;
        const dx = enemy.x - pb.x;
        const dy = (enemy.y - enemy.h / 2) - (pb.y - pb.h / 2);
        if (kind === 'melee') styles.push(Style.MELEE);
        else if (kind === 'chain') styles.push(Style.CHAIN);
        else if (kind !== 'explosion' && kind !== 'crush' && dx * dx + dy * dy < ScoreTuning.pointBlankRange * ScoreTuning.pointBlankRange) styles.push(Style.POINT_BLANK);
        if (airborne && !extra.includes(Style.POP)) styles.push(Style.AIR);
        this.score.kill(enemy.def.points, styles, enemy.x, enemy.y - enemy.h, enemy.type, enemy);

        // the others might lose their nerve
        if (this.rng.chance(0.3)) this.scare(enemy.x, 46);
        // a hot streak shakes coins out of their pockets
        if (this.score.multiplier >= 4 && this.rng.chance(0.3)) this.dropPickup('coin', enemy.x, enemy.y - 10);
    }

    /**
     * @param {'player'|'enemy'|'neutral'} owner who it hurts: player blasts spare Nonna,
     *   enemy blasts spare enemies, neutral ones (barrels, clowns) hurt everyone
     */
    explode(x, y, radius, damage, owner, style) {
        this.events.emit(Ev.EXPLODE, x, y, radius, 0, style);
        this.events.emit(Ev.SHAKE, 0, 0, Math.min(6, radius / 7), 10);
        if (damage <= 0) return;

        if (owner !== 'enemy') {
            const hit = this.#hit;
            for (let i = 0; i < this.enemies.length; i++) {
                const e = this.enemies[i];
                if (!e.targetable || !this.#inBlast(x, y, radius, e.left, e.top, e.w, e.h)) continue;
                hit.kind = owner === 'neutral' ? 'chain' : 'explosion';
                hit.x = x;
                hit.y = y;
                hit.dirX = e.x < x ? -1 : 1;
                hit.byPlayer = true;
                this.damageEnemy(e, damage, hit);
                if (e.alive && !e.isBoss && !e.flying && e.hp > 0) {
                    // a blast throws survivors in the air: finish them for AIRBORNE
                    e.vy = -2.6;
                    e.onGround = false;
                    e.platform = null;
                    e.juggled = true;
                }
            }
            for (const p of this.props) {
                if (p.active && this.#inBlast(x, y, radius, p.left, p.top, p.w, p.h)) p.damage(this, damage, 'explosion');
            }
            for (const h of this.hostages) {
                if (h.tied && this.#inBlast(x, y, radius, h.x - h.w / 2, h.y - h.h, h.w, h.h)) h.free(this);
            }
            if (owner === 'player') this.scare(x, radius * 2.2);
        }
        if (owner !== 'player' && this.player.vulnerable) {
            const b = this.player.body;
            if (this.#inBlast(x, y, radius * 0.8, b.left, b.top, b.w, b.h)) this.player.hurt(this, 'explosion');
        }
    }

    scare(x, radius) {
        for (const e of this.enemies) {
            if (e.scare && e.targetable && Math.abs(e.x - x) < radius) e.scare(this, x);
        }
    }

    /** The enemy the slipper would hit right now. */
    meleeTarget(player) {
        const b = player.body;
        for (const e of this.enemies) {
            if (!e.meleeable) continue;
            const ahead = (e.x - b.x) * player.facing;
            if (ahead < -4 || ahead > PlayerTuning.meleeRange + e.w / 2) continue;
            if (e.y - e.h > b.y || e.y < b.y - b.h) continue;
            return e;
        }
        return null;
    }

    /** The slipper connects with everything in reach. */
    meleeStrike(player) {
        const b = player.body;
        const hit = this.#hit;
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (!e.meleeable) continue;
            const ahead = (e.x - b.x) * player.facing;
            if (ahead < -6 || ahead > PlayerTuning.meleeRange + e.w / 2 + 4) continue;
            if (e.y - e.h > b.y + 2 || e.y < b.y - b.h - 2) continue;
            hit.kind = 'melee';
            hit.x = e.x;
            hit.y = e.y - e.h / 2;
            hit.dirX = player.facing;
            hit.byPlayer = true;
            this.damageEnemy(e, PlayerTuning.meleeDamage, hit);
        }
        for (const p of this.props) {
            if (!p.active) continue;
            const ahead = (p.x - b.x) * player.facing;
            if (ahead > -4 && ahead < PlayerTuning.meleeRange + p.w / 2) p.damage(this, PlayerTuning.meleeDamage, 'melee');
        }
    }

    dropPickup(type, x, y) {
        return this.pickups.spawn(type, x, y, true);
    }

    /** The enemy closest ahead of a rocket, for homing. */
    nearestEnemy(x, y, vx) {
        let best = null;
        let bestD = 200 * 200;
        for (const e of this.enemies) {
            if (!e.targetable) continue;
            const dx = e.x - x;
            if (vx > 0 ? dx < -10 : vx < 0 ? dx > 10 : false) continue;
            const dy = (e.y - e.h / 2) - y;
            const d = dx * dx + dy * dy;
            if (d < bestD) {
                bestD = d;
                best = e;
            }
        }
        return best;
    }

    countAlive(type) {
        let n = 0;
        for (const e of this.enemies) if (e.alive && e.type === type) n++;
        return n;
    }

    countTagged(tag) {
        let n = 0;
        for (const e of this.enemies) if (e.alive && e.tag === tag) n++;
        return n;
    }

    get boss() {
        for (const e of this.enemies) if (e.isBoss && !e.remove) return e;
        return null;
    }

    clearEnemyShots() {
        this.enemyShots.clear();
    }

    bossDefeated(boss) {
        this.director.bossDefeated(boss);
    }

    isVisible(x, margin = 0) {
        return x > this.camera.x - margin && x < this.camera.x + View.width + margin;
    }

    #inBlast(x, y, r, left, top, w, h) {
        const cx = x < left ? left : x > left + w ? left + w : x;
        const cy = y < top ? top : y > top + h ? top + h : y;
        const dx = x - cx;
        const dy = y - cy;
        return dx * dx + dy * dy <= r * r;
    }

    #sweep() {
        let j = 0;
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (!e.remove) this.enemies[j++] = e;
        }
        this.enemies.length = j;
    }
}
