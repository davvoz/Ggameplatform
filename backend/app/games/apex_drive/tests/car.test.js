import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS } from '../js/config/Tuning.js';
import { topSpeed } from '../js/sim/Build.js';
import { Car } from '../js/sim/Car.js';
import { DT, GAS, IDLE, stockStats } from './support/race.js';

const STRAIGHT = { curve: 0, grip: 1 };

function drive(car, input, seconds, road = STRAIGHT) {
    for (let i = 0; i < Math.round(seconds / DT); i++) car.step(input, road, DT);
}

test('on the throttle the car settles at its top speed, where engine and drag meet', () => {
    const car = new Car(stockStats());
    drive(car, GAS, 3);
    const early = car.speed;
    drive(car, GAS, 60);
    const top = topSpeed(car.stats);
    assert.ok(early > 0.4 * top, 'quick off the line');
    assert.ok(Math.abs(car.speed - top) / top < 0.03, `${car.speed} vs ${top}`);
});

test('a better engine is faster, a heavier car slower to get going', () => {
    const stock = new Car(stockStats());
    const engine = new Car(stockStats({ parts: { engine: 3 } }));
    const heavy = new Car({ ...stockStats(), mass: 1.5 });
    for (const car of [stock, engine, heavy]) drive(car, GAS, 4);
    assert.ok(engine.speed > stock.speed && heavy.speed < stock.speed);
});

test('the brake stops the car sooner than letting go', () => {
    const coasting = new Car(stockStats());
    const braking = new Car(stockStats());
    coasting.speed = braking.speed = 10000;
    drive(coasting, IDLE, 1);
    drive(braking, { ...IDLE, brake: true }, 1);
    assert.ok(braking.speed < coasting.speed - 5000);
});

test('the grass holds the car to its off road limit', () => {
    const car = new Car(stockStats());
    car.speed = 10000;
    car.x = 1.5;
    drive(car, GAS, 3);
    assert.equal(car.speed, car.stats.offRoadLimit);
});

test('steering moves the car only while it moves', () => {
    const parked = new Car(stockStats());
    drive(parked, { ...IDLE, steer: 1 }, 1);
    assert.equal(parked.x, 0);
    const moving = new Car(stockStats());
    moving.speed = 10000;
    drive(moving, { ...GAS, steer: -1 }, 0.3);
    assert.ok(moving.x < -0.2);
});

test('a bend pushes outward with the square of the speed; too fast, the car slides and scrubs speed', () => {
    const bend = { curve: 6, grip: 1 };
    const slow = new Car(stockStats());
    const fast = new Car(stockStats());
    slow.speed = 5000;
    fast.speed = 10000;
    drive(slow, IDLE, 0.2, bend);
    drive(fast, IDLE, 0.2, bend);
    assert.ok(fast.x < slow.x * 3, 'twice as fast, much more than twice as far');
    assert.ok(!slow.sliding);

    const hairpin = { curve: 12, grip: 1 };
    const over = new Car(stockStats());
    over.speed = 10000;
    over.step(GAS, hairpin, DT);
    assert.ok(over.sliding);
    assert.ok(over.speed < 10000);
});

test('better tyres and the weather change where the car starts to slide', () => {
    const limit = (stats, grip) => {
        const car = new Car(stats);
        car.speed = 9000;
        car.step(IDLE, { curve: 9, grip }, DT);
        return car.sliding;
    };
    assert.equal(limit(stockStats(), 1), true);
    assert.equal(limit(stockStats({ parts: { tires: 3 } }), 1), false);
    assert.equal(limit(stockStats({ parts: { tires: 3 } }), 0.6), true);
});

test('on a wet road the car pulls away slower and brakes later, top speed untouched', () => {
    const wet = { curve: 0, grip: 0.75 };
    const [dryStart, wetStart] = [new Car(stockStats()), new Car(stockStats())];
    drive(dryStart, GAS, 1.5);
    drive(wetStart, GAS, 1.5, wet);
    assert.ok(wetStart.speed < dryStart.speed * 0.9, `${wetStart.speed} vs ${dryStart.speed}`);

    const [dryStop, wetStop] = [new Car(stockStats()), new Car(stockStats())];
    dryStop.speed = wetStop.speed = 10000;
    drive(dryStop, { ...IDLE, brake: true }, 0.5);
    drive(wetStop, { ...IDLE, brake: true }, 0.5, wet);
    assert.ok(wetStop.speed > dryStop.speed + 1000);

    const [dryTop, wetTop] = [new Car(stockStats()), new Car(stockStats())];
    drive(dryTop, GAS, 60);
    drive(wetTop, GAS, 60, wet);
    assert.ok(Math.abs(wetTop.speed - dryTop.speed) < dryTop.speed * 0.01);
});

test('in the drizzle sport tyres hold less than on a dry road: rain is not cancelled by a tyre upgrade', () => {
    const limit = (stats, grip) => {
        const car = new Car(stats);
        car.speed = 9000;
        car.step(IDLE, { curve: 8.3, grip }, DT);
        return car.sliding;
    };
    const sport = stockStats({ parts: { tires: 1 } });
    assert.equal(limit(sport, 1), false);
    assert.equal(limit(sport, 0.75), true);
});

test('nitro burns a charge for a burst of speed beyond the top', () => {
    const car = new Car(stockStats());
    car.speed = topSpeed(car.stats);
    car.step({ ...GAS, nitro: true }, STRAIGHT, DT);
    assert.equal(car.nitro, car.stats.nitroCharges - 1);
    assert.ok(car.boosting);
    assert.equal(car.lightNitro(), false, 'one at a time');
    drive(car, GAS, 2);
    assert.ok(car.speed > topSpeed(car.stats) * 1.05);
});

test('the shield takes the damage; damage takes power', () => {
    const car = new Car(stockStats());
    car.shield(1);
    assert.equal(car.hurt(30), 0);
    drive(car, IDLE, 1.1);
    assert.equal(car.hurt(30), 30);

    const whole = new Car(stockStats());
    const broken = new Car(stockStats());
    broken.health = 0;
    whole.speed = broken.speed = 6000;
    drive(whole, GAS, 2);
    drive(broken, GAS, 2);
    assert.ok(broken.speed < whole.speed);
});

test('the drift charger turns sliding into nitro', () => {
    const car = new Car(stockStats({ mods: ['driftCharger'] }));
    const start = car.nitro;
    for (let i = 0; i < 60 * 4; i++) {
        car.speed = 11000;
        car.x = 0;
        car.step(IDLE, { curve: 12, grip: 1 }, DT);
    }
    assert.ok(car.nitro > start);
});

test('the car cannot wander off past its limit', () => {
    const car = new Car(stockStats());
    car.speed = 10000;
    drive(car, { ...GAS, steer: 1 }, 10);
    assert.equal(car.x, PHYSICS.maxOffset);
});

test('pickups and drifts never fill the car past the nitro limit', () => {
    const car = new Car(stockStats({ mods: ['driftCharger'] }));
    const room = PHYSICS.maxNitro - car.nitro;
    assert.equal(car.addNitro(10), room);
    assert.equal(car.nitro, PHYSICS.maxNitro);
    assert.equal(car.addNitro(1), 0);
    for (let i = 0; i < 60 * 4; i++) {
        car.speed = 11000;
        car.x = 0;
        car.step(IDLE, { curve: 12, grip: 1 }, DT);
    }
    assert.equal(car.nitro, PHYSICS.maxNitro, 'the drift charger waits');
    assert.equal(car.nitroGauge, 1);
    car.lightNitro();
    car.speed = 11000;
    car.step(IDLE, { curve: 12, grip: 1 }, DT);
    assert.equal(car.nitro, PHYSICS.maxNitro, 'a burnt charge is refilled by the full gauge');
});
