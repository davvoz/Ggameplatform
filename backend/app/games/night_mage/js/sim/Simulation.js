import { CRITICAL, DT, INVADER, MAGE, PICKUPS, SCENE_CHANGE, SCORE, STORM, WORLD } from '../config/Tuning.js';
import { BOON_EVERY, BOONS } from '../config/Boons.js';
import { Rng } from '../core/Rng.js';
import { Boons, applyBoon } from './Boons.js';
import { Director, powerFor } from './Director.js';
import { createEnemy } from './enemies/registry.js';
import { Mage } from './Mage.js';
import { Pickup, pickupWeights } from './Pickups.js';
import { Bolt, Shot } from './Projectiles.js';
import { ScoreKeeper } from './ScoreKeeper.js';
import { placeMonster } from './Spawner.js';
import { Storm } from './Storm.js';
import { resolveTap } from './TapResolver.js';
import { Terrain } from './Terrain.js';

const SHIELD_SHOVE = 44;
/** The parts of a trip to the next scene, in order (`SCENE_CHANGE`): it changes as `open` begins. */
const TRIP = Object.freeze(['close', 'cheer', 'open']);
/** What a boss calls to its side. */
const BROOD = 'bat';
const PICKUP_INSET = 30;

/**
 * The scenes in the order this night visits them: a shuffle decided by the
 * seed, so everybody walks the same forests in the same week.
 */
export function sceneOrder(maps, seed) {
    const rng = Rng.fork(seed, 'scenes');
    const order = [...maps];
    for (let i = order.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}

/**
 * A boss's health and speed: the wave's own `power`, with the health
 * multiplied by the level its owner earned and by the laps of the roster
 * it has already run (it comes back stronger).
 */
export function invaderPower(level, power = { hp: 1, speed: 1 }, lap = 0) {
    const clamped = Math.max(1, Math.min(INVADER.maxLevel, level));
    const comeback = 1 + INVADER.hpPerLap * Math.min(INVADER.maxLaps, Math.max(0, lap));
    return { hp: power.hp * (INVADER.hpBase + INVADER.hpPerLevel * clamped) * comeback, speed: power.speed };
}

/**
 * One night in the forest. Pure and deterministic: the same seed, maps,
 * invaders and taps (at the same ticks) always give the same night. It knows
 * nothing about drawing, sound, time or the browser.
 *
 * Feed it taps with `tap(x, y)` (world coordinates) and the keyboard's
 * `shield()` and `storm()`, call `step()` sixty times a second, read its state
 * and take its events with `drainEvents()`.
 */
export class Simulation {
    #maps;
    #mapIndex = 0;
    #rngSpawn;
    #rngDrops;
    #rngBoons;
    /** Kills since the vampire last healed. */
    #feast = 0;
    /** Casts at monsters, for the twin bolt. */
    #casts = 0;
    /** Taps and commands waiting for the next step, in the order they came. */
    #inputs = [];
    #events = [];
    #nextId = 1;
    #outcomes = new Map();
    /** The trip to the next scene, `{phase, age, elapsed}` (seconds in the part, since the start), or null. */
    #trip = null;

    /**
     * @param {{seed: number, maps: {id: string, terrain: object}[], invaders?: object[]}} setup
     */
    constructor({ seed, maps, invaders = [] }) {
        if (maps.length === 0) throw new Error('A night needs at least one scene');
        this.seed = seed;
        this.#maps = sceneOrder(maps, seed);
        this.#rngSpawn = Rng.fork(seed, 'spawn');
        this.#rngDrops = Rng.fork(seed, 'drops');
        this.#rngBoons = Rng.fork(seed, 'boons');
        this.mage = new Mage();
        this.director = new Director(seed, invaders);
        this.score = new ScoreKeeper();
        this.storm = new Storm();
        this.boons = new Boons();
        /** The powers to choose from after a wave; the night waits while it is set. */
        this.offer = null;
        this.enemies = [];
        this.shots = [];
        this.bolts = [];
        this.pickups = [];
        this.ticks = 0;
        this.over = false;
        this.#enterScene(0);
    }

    get map() {
        return this.#maps[this.#mapIndex % this.#maps.length];
    }

    get wave() {
        return this.director.wave;
    }

    /**
     * The trip to the next scene while it lasts: `progress` from 0 to 1 of
     * its `phase` (closing on the old scene, the mage's dance, opening on the
     * new one), `elapsed` seconds since it began.
     * @returns {{phase: 'close'|'cheer'|'open', progress: number, elapsed: number}|null}
     */
    get journey() {
        if (!this.#trip) return null;
        const { phase, age, elapsed } = this.#trip;
        return { phase, progress: Math.min(1, age / SCENE_CHANGE[phase]), elapsed };
    }

    /** The scene after this one, so it can be prepared ahead. */
    get nextMap() {
        return this.#maps[(this.#mapIndex + 1) % this.#maps.length];
    }

    tap(x, y) {
        this.#inputs.push({ x, y });
    }

    /**
     * What a tap at (x, y) would hit right now, without tapping (the mouse's sight).
     * @returns {'pickup'|'shot'|'enemy'|'shield'|'miss'}
     */
    aimAt(x, y) {
        return resolveTap(x, y, this).type;
    }

    /** The shield without a tap (the keyboard). */
    shield() {
        this.#inputs.push({ command: 'shield' });
    }

    /** Takes one of the powers offered after a wave. */
    choose(id) {
        this.#inputs.push({ command: 'choose', id });
    }

    /** Calls the storm, if it is full. */
    callStorm() {
        this.#inputs.push({ command: 'storm' });
    }

    drainEvents() {
        const events = this.#events;
        this.#events = [];
        return events;
    }

    step() {
        if (this.over) return;
        if (this.offer) {
            this.#waitForChoice();
            return;
        }
        if (this.#trip) {
            this.#travel();
            return;
        }
        this.ticks += 1;
        for (const input of this.#inputs.splice(0)) this.#handleInput(input);
        this.mage.update(DT);
        this.#runDirector();
        const world = this.#world();
        for (const enemy of this.enemies) enemy.update(world, DT);
        this.#moveBolts();
        this.#moveShots(world.slow);
        this.#runStorm();
        for (const pickup of this.pickups) pickup.update(DT, this.terrain);
        this.#sweep();
        if (this.score.update(DT)) this.#emit('comboLost');
    }

    /** What the run did, for the platform and the invasion reports. */
    report() {
        return {
            score: this.score.score,
            wave: this.director.wave,
            wavesCleared: Math.max(0, this.director.wave - (this.director.phase === 'fight' ? 1 : 0)),
            kills: this.score.kills,
            bestCombo: this.score.bestCombo,
            shotsDown: this.score.shotsDown,
            invadersSlain: this.score.invadersSlain,
            storms: this.storm.calls,
            criticals: this.score.criticals,
            boons: { ...this.boons.levels },
            ticks: this.ticks,
            seed: this.seed,
            invaders: [...this.#outcomes.values()],
        };
    }

    // ── scenes and waves ───────────────────────────────────────────────

    #enterScene(index) {
        this.#mapIndex = index;
        const { terrain, mageX } = this.map;
        this.terrain = new Terrain(terrain);
        this.mage.x = mageX ?? MAGE.x;
        this.mage.placeOn(this.terrain.floorAt(this.mage.x));
        this.shots = [];
        this.pickups = [];
    }

    #runDirector() {
        const { spawns, started, cleared, herald } = this.director.update(DT, this.enemies.length);
        if (started) this.#waveStarts();
        if (cleared) this.#clearWave();
        if (herald) this.#emit('invaderComing', { invader: herald });
        for (const order of spawns) this.#spawn(order);
    }

    #waveStarts() {
        this.#emit('wave', { wave: this.director.wave });
    }

    #clearWave() {
        const { wave, flawless } = this.director;
        const bonus = this.score.bonus(SCORE.waveClear * wave + (flawless ? SCORE.flawlessWave * wave : 0));
        this.#emit('waveClear', { wave, bonus, flawless });
        if (!this.director.sceneChangeDue) {
            this.#offerBoons();
            return;
        }
        this.#trip = { phase: TRIP[0], age: 0, elapsed: 0 };
        this.#emit('sceneLeaving', { mapId: this.nextMap.id });
    }

    /**
     * One tick of the trip: the night holds still (taps are dropped), the
     * scene changes once the curtain is closed, the powers come once it is open.
     */
    #travel() {
        this.#inputs.length = 0;
        this.mage.update(DT);
        const trip = this.#trip;
        trip.age += DT;
        trip.elapsed += DT;
        if (trip.age < SCENE_CHANGE[trip.phase]) return;
        const next = TRIP[TRIP.indexOf(trip.phase) + 1];
        if (!next) {
            this.#trip = null;
            this.#offerBoons();
            return;
        }
        this.#trip = { phase: next, age: 0, elapsed: trip.elapsed };
        if (next !== 'open') return;
        this.#enterScene(this.#mapIndex + 1);
        this.#emit('scene', { mapId: this.map.id });
    }

    // ── powers between the waves ───────────────────────────────────────

    /** The powers, after one wave in `BOON_EVERY` (after each boss). */
    #offerBoons() {
        if (this.director.wave % BOON_EVERY !== 0) return;
        const choices = this.boons.offer(this.#rngBoons);
        if (choices.length === 0) return;
        this.offer = choices;
        this.#emit('offer', { choices });
    }

    /** Time stands still until a power is chosen; other taps are dropped. */
    #waitForChoice() {
        for (const { command, id } of this.#inputs.splice(0)) {
            if (command === 'choose' && this.offer?.includes(id)) this.#takeBoon(id);
        }
    }

    #takeBoon(id) {
        this.boons.take(id);
        applyBoon(id, this);
        this.offer = null;
        this.#emit('boon', { id, level: this.boons.level(id) });
    }

    #spawn({ kind, invader }) {
        const base = powerFor(kind, this.director.shape.power);
        const power = invader ? invaderPower(invader.level, base, invader.lap) : base;
        const spot = placeMonster(kind, kind === 'bat', { terrain: this.terrain, mage: this.mage, rng: this.#rngSpawn });
        const enemy = createEnemy(kind, { id: this.#nextId++, ...spot, power, invader: invader ?? null });
        this.enemies.push(enemy);
        // an invader that comes back adds to what it did on its earlier laps; the forest's own bosses are not reported
        if (invader?.id && !this.#outcomes.has(invader.id)) {
            this.#outcomes.set(invader.id, { id: invader.id, damage: 0, slain: false, killedMage: false });
        }
        this.#emit('spawn', { id: enemy.id, kind, x: enemy.x, y: enemy.y, flying: enemy.flying, invader: invader ?? null });
    }

    // ── taps ───────────────────────────────────────────────────────────

    #handleInput({ command, x, y }) {
        if (!this.mage.alive) return;
        if (command === 'shield') this.#raiseShield();
        else if (command === 'storm') this.#callStorm();
        else this.#handleTap(x, y);
    }

    /** Gifts and the shield are free; a bolt (at a monster, a shot or nothing) costs a charge. */
    #handleTap(x, y) {
        const { type, target } = resolveTap(x, y, this);
        if (type === 'pickup') this.#collect(target);
        else if (type === 'shield') this.#raiseShield();
        else if (!this.mage.spend()) this.#emit('noEnergy');
        else if (type === 'shot') this.#burnShot(target);
        else if (type === 'enemy') this.#castAt(target);
        else this.#miss(x, y);
    }

    #raiseShield() {
        this.#emit(this.mage.raiseShield() ? 'shield' : 'shieldBusy');
    }

    // ── the storm ──────────────────────────────────────────────────────

    #callStorm() {
        if (!this.storm.call(this.enemies, this.mage.x)) return;
        this.mage.cast(this.mage.x + this.mage.facing);
        for (const shot of this.shots) shot.alive = false;
        this.#emit('storm', { x: this.mage.staff.x, y: this.mage.staff.y });
    }

    #runStorm() {
        for (const { targetId } of this.storm.update(DT)) {
            const enemy = this.enemies.find((e) => e.id === targetId && e.alive);
            if (enemy) this.#lightning(enemy);
        }
    }

    /** A lightning keeps the combo going but does not fill the next storm. */
    #lightning(enemy) {
        if (this.score.hit()) this.#emit('combo', { multiplier: this.score.multiplier });
        const killed = enemy.hurt(STORM.damage, this.mage.x);
        const { x, y } = enemy.center;
        this.#emit('lightning', { id: enemy.id, kind: enemy.kind, x, y, killed });
        if (killed) this.#killed(enemy);
    }

    /** One bolt at the monster tapped, plus one at the next nearest with the chain gift and on twin-bolt casts. */
    #castAt(enemy) {
        const damage = this.mage.hasBuff('power') ? 2 : 1;
        this.#launchBolt(enemy, damage);
        this.#casts += 1;
        const extra = (this.#twinCast() ? 1 : 0) + (this.mage.hasBuff('chain') ? 1 : 0);
        const aimed = new Set([enemy]);
        for (let i = 0; i < extra; i++) {
            const other = this.#nearestOther(enemy, aimed);
            if (!other) break;
            aimed.add(other);
            this.#launchBolt(other, damage);
        }
    }

    #launchBolt(enemy, damage) {
        this.mage.cast(enemy.x);
        const bolt = new Bolt({ id: this.#nextId++, from: this.mage.staff, targetId: enemy.id, point: enemy.center, damage });
        this.bolts.push(bolt);
        this.#emit('cast', { from: this.mage.staff, to: enemy.center });
    }

    #twinCast() {
        const level = this.boons.level('twin');
        return level > 0 && this.#casts % BOONS.twin.every[level - 1] === 0;
    }

    #nearestOther(enemy, skip) {
        let best = null;
        for (const e of this.enemies) {
            if (skip.has(e) || !e.alive) continue;
            if (!best || Math.hypot(e.x - enemy.x, e.y - enemy.y) < Math.hypot(best.x - enemy.x, best.y - enemy.y)) best = e;
        }
        return best;
    }

    #burnShot(shot) {
        shot.alive = false;
        this.mage.cast(shot.x);
        this.score.shotsDown += 1;
        this.#hitForCombo();
        const points = this.score.award(SCORE.shotDown);
        this.#emit('cast', { from: this.mage.staff, to: { x: shot.x, y: shot.y } });
        this.#emit('shotDown', { kind: shot.kind, x: shot.x, y: shot.y, points });
    }

    #miss(x, y) {
        this.mage.cast(x);
        this.bolts.push(new Bolt({ id: this.#nextId++, from: this.mage.staff, point: { x, y } }));
        this.#emit('cast', { from: this.mage.staff, to: { x, y } });
        if (this.score.miss()) this.#emit('comboLost');
        this.#emit('miss', { x, y });
    }

    #collect(pickup) {
        pickup.alive = false;
        const { kind } = pickup;
        if (kind === 'heart') this.mage.heal(1);
        else if (kind === 'nova') this.#nova();
        else this.mage.addBuff(kind, PICKUPS[`${kind}Time`]);
        this.#emit('pickup', { kind, x: pickup.x, y: pickup.y });
    }

    #nova() {
        for (const shot of this.shots) shot.alive = false;
        for (const enemy of this.enemies) {
            if (enemy.alive && enemy.hurt(1, this.mage.x)) this.#killed(enemy);
        }
        this.#emit('nova', { x: this.mage.chest.x, y: this.mage.chest.y });
    }

    #hitForCombo() {
        if (this.score.hit()) this.#emit('combo', { multiplier: this.score.multiplier });
        if (this.storm.addHit()) this.#emit('stormReady');
    }

    // ── bolts, shots and blows ─────────────────────────────────────────

    #moveBolts() {
        for (const bolt of this.bolts) {
            const target = bolt.targetId ? this.enemies.find((e) => e.id === bolt.targetId) : null;
            if (!bolt.update(DT, target)) continue;
            if (target?.alive) this.#boltHits(bolt, target);
            else this.#emit('fizzle', { x: bolt.x, y: bolt.y });
        }
    }

    #boltHits(bolt, enemy) {
        this.#hitForCombo();
        const critical = enemy.telegraphing;
        const sharp = this.boons.level('sharpEye') > 0;
        const multiplier = sharp ? BOONS.sharpEye.multiplier : CRITICAL.damageMultiplier;
        const damage = critical ? bolt.damage * multiplier : bolt.damage;
        const killed = enemy.hurt(damage, this.mage.x, critical);
        if (critical) this.#critical(enemy, bolt);
        this.#emit('boltHit', { id: enemy.id, kind: enemy.kind, x: bolt.x, y: bolt.y, killed });
        if (killed) this.#killed(enemy);
    }

    /** Hit while winding up: double damage, the blow is stopped, a charge comes back. */
    #critical(enemy, bolt) {
        this.score.criticals += 1;
        this.mage.refund(CRITICAL.refund + (this.boons.level('sharpEye') > 0 ? BOONS.sharpEye.refund : 0));
        const points = this.score.award(CRITICAL.points);
        this.#emit('critical', { id: enemy.id, x: bolt.x, y: bolt.y, points });
    }

    #killed(enemy) {
        const base = enemy.stats.score * (enemy.invader ? SCORE.invaderMultiplier : 1);
        const points = this.score.award(base);
        this.score.kills += 1;
        if (enemy.invader) this.director.bossFallen();
        const outcome = enemy.invader ? this.#outcomes.get(enemy.invader.id) : null;
        if (outcome) {
            this.score.invadersSlain += 1;
            outcome.slain = true;
        }
        const { x, y } = enemy.center;
        this.#emit('kill', { id: enemy.id, kind: enemy.kind, x, y, feetY: enemy.y, facing: enemy.facing, points, invader: enemy.invader });
        this.#maybeDrop(enemy, x, y);
        this.#vampire();
    }

    /** With the vampire, every few kills give back a heart. */
    #vampire() {
        if (this.boons.level('vampire') === 0) return;
        this.#feast += 1;
        if (this.#feast < BOONS.vampire.kills || this.mage.hp >= this.mage.maxHp) return;
        this.#feast = 0;
        this.mage.heal(1);
        this.#emit('vampire', { x: this.mage.chest.x, y: this.mage.chest.y });
    }

    #maybeDrop(enemy, x, y) {
        const luck = this.boons.level('lucky') > 0 ? BOONS.lucky.factor : 1;
        if (!enemy.invader && !this.#rngDrops.chance(PICKUPS.dropChance * luck)) return;
        const kind = this.#rngDrops.weighted(pickupWeights(this.mage));
        const inside = Math.max(PICKUP_INSET, Math.min(WORLD.width - PICKUP_INSET, x));
        this.pickups.push(new Pickup({ id: this.#nextId++, kind, x: inside, y }));
        this.#emit('drop', { kind, x, y });
    }

    #moveShots(slow) {
        for (const shot of this.shots) {
            shot.update(DT, slow);
            if (!shot.alive) continue;
            if (shot.reflected) this.#reflectedShotHits(shot);
            else if (this.mage.covers(shot.x, shot.y, MAGE.bodyHalfWidth + shot.radius, MAGE.bodyHeight + shot.radius)) this.#shotReachesMage(shot);
        }
    }

    #shotReachesMage(shot) {
        const owner = this.enemies.find((e) => e.id === shot.ownerId);
        const result = this.#hitMage(owner, shot.damage);
        if (result !== 'blocked') {
            shot.alive = result === 'ignored';
            return;
        }
        shot.reflect(owner?.alive ? owner.center : { x: shot.x - shot.vx, y: shot.y - shot.vy });
        this.#emit('reflect', { x: shot.x, y: shot.y });
    }

    #reflectedShotHits(shot) {
        const enemy = this.enemies.find((e) => e.alive && e.touches(shot.x, shot.y, shot.radius));
        if (!enemy) return;
        shot.alive = false;
        this.#hitForCombo();
        const killed = enemy.hurt(shot.damage * 2, this.mage.x);
        this.#emit('boltHit', { id: enemy.id, kind: enemy.kind, x: shot.x, y: shot.y, killed });
        if (killed) this.#killed(enemy);
    }

    /**
     * A blow or a shot from `enemy` reaches the mage.
     * @returns {'blocked'|'ignored'|'hurt'|'dead'} what the mage made of it
     */
    #hitMage(enemy, damage) {
        const result = this.mage.takeHit(damage);
        if (result === 'blocked') this.#blocked(enemy);
        else if (result !== 'ignored') this.#wounded(enemy, damage, result === 'dead');
        return result;
    }

    #blocked(enemy) {
        const { x, y } = this.mage.chest;
        this.#emit('blocked', { x, y });
        if (!enemy || enemy.flying || !enemy.alive) return;
        if (this.boons.level('thorns') > 0 && this.#thorns(enemy)) return;
        enemy.shove(this.mage.x, SHIELD_SHOVE);
    }

    /** The thorn shield hurts whoever hits it. @returns {boolean} true when that killed it */
    #thorns(enemy) {
        const killed = enemy.hurt(BOONS.thorns.damage, this.mage.x, true);
        const { x, y } = enemy.center;
        this.#emit('thorns', { id: enemy.id, x, y });
        if (killed) this.#killed(enemy);
        return killed;
    }

    #wounded(enemy, damage, fatal) {
        const { x, y } = this.mage.chest;
        this.director.flawless = false;
        if (this.score.breakCombo()) this.#emit('comboLost');
        const outcome = enemy?.invader ? this.#outcomes.get(enemy.invader.id) : null;
        if (outcome) {
            outcome.damage += damage;
            outcome.killedMage ||= fatal;
        }
        this.#emit('hurt', { x, y, hp: this.mage.hp, by: enemy?.kind ?? null, invader: enemy?.invader ?? null });
        if (fatal) this.#endNight(enemy);
        else this.#feedStorm(damage);
    }

    /** A lost heart fills the storm a little; `fill` is the part of the dial it adds. */
    #feedStorm(hearts) {
        const gained = this.storm.feed(STORM.hurtCharge * hearts);
        if (gained <= 0) return;
        const { x, y } = this.mage.chest;
        this.#emit('stormFed', { x, y, fill: gained / this.storm.needed });
        if (this.storm.ready) this.#emit('stormReady');
    }

    #endNight(enemy) {
        this.over = true;
        this.#emit('death', { by: enemy?.kind ?? null, invader: enemy?.invader ?? null });
    }

    #world() {
        return {
            mage: this.mage,
            terrain: this.terrain,
            slow: this.mage.hasBuff('frost') ? PICKUPS.frostSlow : 1,
            fire: (enemy, kind) => this.#fire(enemy, kind),
            strike: (enemy, damage) => this.#hitMage(enemy, damage),
            summon: (enemy, count) => this.#summon(enemy, count),
            roar: (enemy) => this.#emit('fury', { id: enemy.id, ...enemy.center }),
        };
    }

    /** A boss calls bats to its side: they come in like the wave's own. */
    #summon(enemy, count) {
        const { x, y } = enemy.center;
        this.#emit('summon', { id: enemy.id, x, y, count });
        for (let i = 0; i < count; i++) this.#spawn({ kind: BROOD });
    }

    #fire(enemy, kind) {
        const from = enemy.muzzle;
        const shot = new Shot({ id: this.#nextId++, kind, ...from, target: this.mage.chest, ownerId: enemy.id });
        this.shots.push(shot);
        this.#emit('fire', { kind, ...from });
    }

    #sweep() {
        for (const enemy of this.enemies) {
            if (enemy.expended) this.#emit('burst', { id: enemy.id, kind: enemy.kind, x: enemy.x, y: enemy.y, invader: enemy.invader });
        }
        this.enemies = this.enemies.filter((e) => e.alive);
        this.bolts = this.bolts.filter((b) => b.alive);
        this.shots = this.shots.filter((s) => s.alive);
        this.pickups = this.pickups.filter((p) => p.alive);
    }

    #emit(type, data = {}) {
        this.#events.push({ type, ...data });
    }
}
