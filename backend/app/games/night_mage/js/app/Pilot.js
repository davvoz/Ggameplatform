import { Rng } from '../core/Rng.js';

const DANGER = 300;
const SWING_SOON = 0.3;
/** A monster this near the mage is shot even when saving energy. */
const CLOSE = 220;
/** The pilot calls the storm once this many monsters are in sight. */
const STORM_CROWD = 3;

/**
 * Plays a night by itself: used by the tests to measure the balance and by
 * `?autoplay` for screenshots. `interval` is the ticks between two taps
 * (lower is faster), `wobble` how far its taps can stray, `focus` how often
 * it catches a monster winding up (critical hits, timely shields), `reaction`
 * how long a wind-up must have lasted before it is noticed (seconds).
 */
export class Pilot {
    #rng;
    #interval;
    #wobble;
    #focus;
    #reaction;
    #wait = 0;

    constructor({ seed = 1, interval = 8, wobble = 10, focus = 0.7, reaction = 0.25 } = {}) {
        this.#reaction = reaction;
        this.#rng = new Rng(seed);
        this.#interval = interval;
        this.#wobble = wobble;
        this.#focus = focus;
    }

    /** @param {import('../sim/Simulation.js').Simulation} sim */
    play(sim) {
        if (sim.offer) {
            sim.choose(this.#rng.pick(sim.offer));
            return;
        }
        this.#wait -= 1;
        if (this.#wait > 0) return;
        if (sim.storm.ready && sim.enemies.filter((e) => e.x > 0 && e.x < 960).length >= STORM_CROWD) {
            sim.callStorm();
            this.#wait = this.#interval;
            return;
        }
        const tap = this.#choose(sim);
        if (!tap) return;
        this.#wait = this.#interval;
        const jitter = () => this.#rng.range(-this.#wobble, this.#wobble);
        sim.tap(tap.x + jitter(), tap.y + jitter());
    }

    /**
     * Like a player: burn the shots coming in, take the gifts, shield a swing
     * about to land (or a shot when out of energy), go for the monsters
     * winding up (critical hits), else the nearest one. Without energy it
     * waits instead of tapping for nothing.
     */
    #choose(sim) {
        const { mage } = sim;
        const chest = mage.chest;
        const armed = mage.energy >= 1;
        const shot = sim.shots.find((s) => !s.reflected && Math.hypot(s.x - chest.x, s.y - chest.y) < DANGER);
        if (shot && armed) return { x: shot.x, y: shot.y };
        const pickup = sim.pickups[0];
        if (pickup) return { x: pickup.x, y: pickup.y - 22 };
        const alert = this.#rng.chance(this.#focus);
        const seen = (e) => e.stateTime >= this.#reaction;
        const swinging = alert && sim.enemies.find((e) => e.state === 'windup' && seen(e) && e.stateTime > e.timing.windup - SWING_SOON);
        if ((swinging || shot) && mage.shieldReady) return { x: mage.x, y: mage.feetY - 60 };
        if (!armed) return null;
        const winding = alert && sim.enemies.find((e) => e.telegraphing && seen(e) && e.x > 0 && e.x < 960);
        if (winding) return winding.center;
        const target = this.#nearest(sim, chest);
        // a focused player keeps a crystal for the shots unless a monster is close
        const saving = this.#focus > 0.5 && mage.energy < 2 && sim.enemies.some((e) => e.kind === 'archer' || e.kind === 'brawler');
        if (saving && target && Math.hypot(target.x - chest.x, target.y - chest.y) > CLOSE) return null;
        return target;
    }

    #nearest(sim, chest) {
        let best = null;
        for (const enemy of sim.enemies) {
            const onScreen = enemy.x > -10 && enemy.x < 970;
            if (!onScreen) continue;
            const c = enemy.center;
            if (!best || Math.hypot(c.x - chest.x, c.y - chest.y) < Math.hypot(best.x - chest.x, best.y - chest.y)) best = c;
        }
        return best;
    }
}
