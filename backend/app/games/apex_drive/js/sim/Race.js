import { POTHOLES } from '../config/Hazards.js';
import { BODY, CONTACT, DRAFT, RACE } from '../config/Tuning.js';
import { PotholeField } from './Potholes.js';

/**
 * One race: the player and the rivals on a track, from the grid to the flag.
 * It knows nothing of screens or keys: it is stepped with the player's
 * DriveInput and read. What happens worth showing (the lights, a lap, a
 * pickup, a bump...) is queued in `events`, drained by whoever draws it.
 *
 * Phases: grid (the cars wait) -> countdown (3, 2, 1: the throttle pressed
 * just before GO is a perfect start, too early spins the wheels) -> racing
 * -> finished (the player has crossed the line for the last time, or every
 * rival has and the player is left last, with no time; a pilot drives on
 * while the results come).
 *
 * @typedef {object} RaceEvent
 * @property {string} type count, go, perfectStart, wheelspin, lap, finalLap, finish, pickup,
 *   nitro, bump, crash, pothole, position, overtake
 * @property {number} [n] count: the number shown
 * @property {number} [lap] lap, finalLap
 * @property {number} [position] finish
 * @property {string} [kind] pickup: its kind; crash: the prop's
 * @property {number} [value] pickup: what it gave
 * @property {boolean} [hurt] bump: whether it did damage
 * @property {number} [from] position: the place before
 * @property {number} [to] position: the place now
 * @property {string} [name] overtake: the rival passed on the road
 * @property {boolean} [lapped] overtake: it is a lap (or more) down
 */

export class Racer {
    id;
    name;
    car;
    /** Computer driver ({read(self, race)}); the player's is used once the race is over. */
    brain;
    isPlayer;
    colors;
    /** @type {number[]} */
    lapTimes = [];
    lapStart = 0;
    /** Race time at the flag, or null. */
    finishTime = null;
    crashCooldown = 0;
    holeCooldown = 0;
    #lapLength;

    constructor({ id, name, car, brain, isPlayer = false, colors = null, lapLength }) {
        Object.assign(this, { id, name, car, brain, isPlayer, colors });
        this.#lapLength = lapLength;
    }

    /** The lap being driven: 0 on the grid, 1 after the start line... */
    get lap() {
        return Math.floor(this.car.z / this.#lapLength) + 1;
    }

    get finished() {
        return this.finishTime !== null;
    }
}

export class Race {
    phase = 'grid';
    /** Seconds in the current phase. */
    clock = 0;
    /** Seconds since GO. */
    time = 0;
    /** Cash picked up on the road. */
    cash = 0;
    /** @type {RaceEvent[]} */
    events = [];
    track;
    world;
    weather;
    /** @type {Racer[]} the grid's order: the player starts last */
    racers;
    player;
    pickups;
    props;
    /** The broken road's potholes and cracks (none on most tracks). */
    potholes;
    /** Grip of the road today (weather), before each car's own. */
    grip;
    #propsAt;
    #pickupKinds;
    #reach;
    #launchAt = null;
    #rng;
    #position;
    /** Race time of the last bump that hurt, per pair of racers. */
    #touched = new Map();
    /** Rival id -> whether it was ahead of the player on the road, while near. */
    #ahead = new Map();

    /**
     * @param {{track: import('./Track.js').Track, world: object, weather: object, racers: Racer[],
     *   pickups: import('./Pickups.js').PickupField, pickupKinds: object, reach: number,
     *   props: import('./Scenery.js').Prop[], propsAt: Map<number, import('./Scenery.js').Prop[]>,
     *   potholes?: PotholeField, rng: import('../core/Rng.js').Rng}} parts
     */
    constructor(parts) {
        this.track = parts.track;
        this.world = parts.world;
        this.weather = parts.weather;
        this.racers = parts.racers;
        this.player = parts.racers.find((r) => r.isPlayer);
        this.pickups = parts.pickups;
        this.props = parts.props;
        this.potholes = parts.potholes ?? PotholeField.none();
        this.#propsAt = parts.propsAt;
        this.#pickupKinds = parts.pickupKinds;
        this.#reach = parts.reach;
        this.#rng = parts.rng;
        this.grip = this.weather.grip;
        this.#position = this.position;
    }

    /** Racers in race order: the finished first by their time, then by distance. */
    get standings() {
        return [...this.racers].sort((a, b) => {
            if (a.finished || b.finished) return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
            return b.car.z - a.car.z;
        });
    }

    /** The player's place, 1 = leading. */
    get position() {
        return this.standings.indexOf(this.player) + 1;
    }

    get lapTime() {
        return this.phase === 'racing' ? this.time - this.player.lapStart : 0;
    }

    get bestLap() {
        return this.player.lapTimes.length > 0 ? Math.min(...this.player.lapTimes) : null;
    }

    /** True once the results can be shown. */
    get over() {
        return this.phase === 'finished' && this.clock >= RACE.finishHold;
    }

    /** The events since the last call. */
    drain() {
        const events = this.events;
        this.events = [];
        return events;
    }

    /** Straight to green, no grid and no lights (the title's demo race). */
    skipStart() {
        this.phase = 'racing';
        this.clock = 0;
    }

    /** @param {import('./Car.js').DriveInput} input the player's @param {number} dt seconds */
    step(input, dt) {
        const before = this.clock;
        this.clock += dt;
        if (this.phase === 'grid') this.#grid();
        else if (this.phase === 'countdown') this.#countdown(input, before);
        else this.#drive(input, dt);
    }

    #emit(type, data = {}) {
        this.events.push({ type, ...data });
    }

    #grid() {
        if (this.clock < RACE.grid) return;
        this.phase = 'countdown';
        this.clock = 0;
        this.#emit('count', { n: RACE.countdown });
    }

    #countdown(input, before) {
        // the throttle's last press counts: held since too early is a wheelspin
        if (!input.throttle) this.#launchAt = null;
        else this.#launchAt ??= this.clock;
        const shown = RACE.countdown - Math.floor(this.clock);
        if (shown !== RACE.countdown - Math.floor(before) && shown > 0) this.#emit('count', { n: shown });
        if (this.clock < RACE.countdown) return;
        this.phase = 'racing';
        this.clock = 0;
        this.#emit('go');
        this.#launch();
    }

    #launch() {
        const car = this.player.car;
        if (this.#launchAt !== null) {
            const early = RACE.countdown - this.#launchAt;
            const perfect = early <= RACE.launchWindow * car.stats.launchWindow;
            if (perfect) car.boost(RACE.launchBoost * car.stats.launchBoost);
            this.#emit(perfect ? 'perfectStart' : 'wheelspin');
            if (!perfect) car.speed = 0;
        }
        for (const rival of this.racers) {
            if (!rival.isPlayer) rival.car.boost(this.#rng.range(0, RACE.launchBoost));
        }
    }

    #drive(input, dt) {
        this.time += dt;
        const inputs = this.racers.map((racer) => this.#inputOf(racer, input));
        this.#drafts();
        this.racers.forEach((racer, i) => this.#move(racer, inputs[i], dt));
        this.#contacts();
        this.#watchPosition();
        this.#watchPasses();
        if (this.phase === 'racing' && this.racers.every((racer) => racer.isPlayer || racer.finished)) this.#finish();
    }

    #inputOf(racer, input) {
        if (racer.isPlayer && this.phase === 'racing') return input;
        return racer.brain.read(racer, this);
    }

    /** Rivals far behind the player push a little harder, far ahead a little less. */
    #band(racer) {
        if (racer.isPlayer) return 1;
        const { span, boost } = RACE.rubberBand;
        const gap = (this.player.car.z - racer.car.z) / span;
        return 1 + Math.max(-1, Math.min(1, gap)) * boost;
    }

    #move(racer, input, dt) {
        const car = racer.car;
        const fromZ = car.z;
        const lap = racer.lap;
        const charges = car.nitro;
        const grip = 1 - (1 - this.grip) * (1 - car.stats.weatherGrip);
        car.step(input, { curve: this.track.segmentAt(car.z).curve, grip }, dt, this.#band(racer));
        racer.crashCooldown = Math.max(0, racer.crashCooldown - dt);
        racer.holeCooldown = Math.max(0, racer.holeCooldown - dt);
        if (racer.isPlayer && car.nitro < charges) this.#emit('nitro');
        if (car.offRoad || this.track.segmentAt(car.z).closed) this.#crashes(racer);
        this.#potholes(racer, fromZ);
        if (racer.isPlayer) this.#collect(fromZ, car);
        if (racer.lap > lap) this.#newLap(racer);
    }

    #drafts() {
        for (const racer of this.racers) {
            let draft = 0;
            for (const other of this.racers) {
                const gap = this.track.gap(racer.car.z, other.car.z);
                const behind = other !== racer && gap > 0 && gap < DRAFT.range;
                if (behind && Math.abs(other.car.x - racer.car.x) < DRAFT.width) draft = Math.max(draft, 1 - gap / DRAFT.range);
            }
            racer.car.draft = draft;
        }
    }

    #newLap(racer) {
        // the race is over for the player: the pilot's laps while the results come do not count
        if (racer.isPlayer && this.phase === 'finished') return;
        const lap = racer.lap;
        // the grid is behind the line: the first lap's clock starts on it
        if (lap >= 2) racer.lapTimes.push(this.time - racer.lapStart);
        racer.lapStart = this.time;
        if (lap > this.track.laps) {
            racer.finishTime ??= this.time;
            if (racer.isPlayer) this.#finish();
            return;
        }
        if (racer.car.stats.lapShield > 0 && lap >= 2) racer.car.shield(racer.car.stats.lapShield);
        if (racer.isPlayer && lap >= 2) this.#emit(lap === this.track.laps ? 'finalLap' : 'lap', { lap });
    }

    #finish() {
        this.phase = 'finished';
        this.clock = 0;
        this.#emit('finish', { position: this.position });
    }

    #collect(fromZ, car) {
        const found = this.pickups.collect(fromZ, car.z, car.x, this.#reach + car.stats.magnet);
        for (const item of found) {
            const spec = this.#pickupKinds[item.kind];
            const value = this.#apply(item.kind, spec, car);
            this.#emit('pickup', { kind: item.kind, value });
        }
    }

    /** What a pickup does. @returns {number} its value, for the pop up */
    #apply(kind, spec, car) {
        switch (kind) {
            case 'cash': {
                const value = Math.round(spec.value * car.stats.cashBonus);
                this.cash += value;
                return value;
            }
            case 'nitro':
                return car.addNitro(1);
            case 'repair':
                car.repair(spec.value);
                return spec.value;
            case 'shield':
                car.shield(spec.seconds);
                return spec.seconds;
            case 'boost':
                car.boost(spec.seconds);
                return spec.seconds;
            default:
                return 0;
        }
    }

    #crashes(racer) {
        if (racer.crashCooldown > 0) return;
        const car = racer.car;
        const segment = this.track.segmentAt(car.z).index;
        const count = this.track.segments.length;
        for (const offset of [-1, 0, 1]) {
            const props = this.#propsAt.get((segment + offset + count) % count) ?? [];
            const hit = props.find((prop) => Math.abs(prop.x - car.x) < (prop.width + BODY.width) / 2);
            if (hit) {
                this.#crash(racer, hit);
                return;
            }
        }
    }

    #crash(racer, prop) {
        const car = racer.car;
        racer.crashCooldown = CONTACT.crashCooldown;
        if (car.shielded) {
            car.speed *= 0.85;
        } else {
            car.speed *= prop.soft?.keep ?? CONTACT.crashKeep;
            car.hurt(prop.soft?.damage ?? CONTACT.crashDamage);
        }
        car.shove = -Math.sign(car.x) * 2.5;
        if (racer.isPlayer) this.#emit('crash', { kind: prop.kind });
    }

    /**
     * A wheel in a pothole on a segment driven over this tick (at speed a car
     * crosses more than one): the car loses speed, takes a knock and is
     * jolted away from the hole.
     */
    #potholes(racer, fromZ) {
        const car = racer.car;
        if (racer.holeCooldown > 0 || !this.potholes.holes.length) return;
        const hole = this.potholes.crossed(this.track, fromZ, car.z, car.x, POTHOLES.reach);
        if (!hole) return;
        racer.holeCooldown = POTHOLES.cooldown;
        car.speed *= car.shielded ? POTHOLES.shieldKeep : POTHOLES.keep;
        car.hurt(POTHOLES.damage);
        car.shove += Math.sign(car.x - hole.x || 1) * POTHOLES.jolt;
        car.jolt = POTHOLES.joltTime;
        if (racer.isPlayer) this.#emit('pothole');
    }

    /** Cars touching on the road, a lapped one too (it is a lap behind in z, not on the road). */
    #contacts() {
        const racers = this.racers;
        for (let i = 0; i < racers.length; i++) {
            for (let j = i + 1; j < racers.length; j++) {
                const gap = this.track.gap(racers[i].car.z, racers[j].car.z);
                const [rear, front] = gap >= 0 ? [racers[i], racers[j]] : [racers[j], racers[i]];
                if (Math.abs(gap) < BODY.length && Math.abs(front.car.x - rear.car.x) < BODY.width) {
                    this.#bump(rear, front, Math.abs(gap));
                }
            }
        }
    }

    /** The car behind runs into the one in front: speeds and places are shared out, both are shoved apart. */
    #bump(rear, front, gap) {
        const [a, b] = [rear.car, front.car];
        if (a.speed > b.speed) {
            const difference = a.speed - b.speed;
            a.speed = b.speed + difference * CONTACT.rearKeep;
            b.speed += difference * (1 - CONTACT.rearKeep) * 0.5;
        }
        const overlap = BODY.length - gap;
        a.z -= overlap / 2;
        b.z += overlap / 2;
        // a hit from straight behind trades speed; side by side, the cars push apart
        const side = (b.x - a.x) / BODY.width;
        a.shove -= side * CONTACT.shove * b.stats.ram * a.stats.bumpTaken;
        b.shove += side * CONTACT.shove * a.stats.ram * b.stats.bumpTaken;

        // cars rubbing side by side hurt each other once, not every tick
        const pair = `${rear.id}:${front.id}`;
        if (this.time - (this.#touched.get(pair) ?? -Infinity) < CONTACT.cooldown) return;
        this.#touched.set(pair, this.time);
        const hurt = a.hurt(CONTACT.damage * b.stats.ram) + b.hurt(CONTACT.damage * a.stats.ram);
        if (rear.isPlayer || front.isPlayer) {
            const other = rear.isPlayer ? front : rear;
            this.#emit('bump', { with: other.name, hurt: hurt > 0 && !this.player.car.shielded });
        }
    }

    #watchPosition() {
        if (this.phase !== 'racing') return;
        const now = this.position;
        if (now !== this.#position) this.#emit('position', { from: this.#position, to: now });
        this.#position = now;
    }

    /** The player going by a rival on the road: one that was just ahead is now behind. */
    #watchPasses() {
        if (this.phase !== 'racing') return;
        const me = this.player.car;
        for (const rival of this.racers) {
            if (rival.isPlayer) continue;
            const gap = this.track.gap(me.z, rival.car.z);
            if (Math.abs(gap) > RACE.passRange) {
                this.#ahead.delete(rival.id);
                continue;
            }
            if (this.#ahead.get(rival.id) && gap <= 0) {
                this.#emit('overtake', { name: rival.name, lapped: me.z - rival.car.z > this.track.length / 2 });
            }
            this.#ahead.set(rival.id, gap > 0);
        }
    }

    /** The race as the results screen tells it. */
    result() {
        return {
            position: this.position,
            bestLap: this.bestLap,
            time: this.player.finishTime,
            cash: this.cash,
            standings: this.standings.map((racer) => ({ name: racer.name, isPlayer: racer.isPlayer, time: racer.finishTime })),
        };
    }
}
