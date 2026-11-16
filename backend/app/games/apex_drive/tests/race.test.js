import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BODY, PHYSICS, RACE } from '../js/config/Tuning.js';
import { createRace } from '../js/sim/setup.js';
import { DT, GAS, IDLE, pilot, racingRace, run, stockStats } from './support/race.js';

test('grid, three lights, GO: the cars wait until the green', () => {
    const race = createRace({ trackId: 'duskValley', playerStats: stockStats() });
    const before = race.racers.map((r) => r.car.z);
    const events = run(race, RACE.grid + RACE.countdown - 0.05, () => GAS);
    assert.deepEqual(race.racers.map((r) => r.car.z), before, 'nobody moved');
    assert.deepEqual(events.filter((e) => e.type === 'count').map((e) => e.n), [3, 2, 1]);
    run(race, 0.1, () => GAS);
    assert.equal(race.phase, 'racing');
});

test('the player starts last, behind the line', () => {
    const race = createRace({ trackId: 'duskValley', playerStats: stockStats() });
    assert.equal(race.position, race.racers.length);
    assert.ok(race.racers.every((r) => r.car.z < 0 && r.lap === 0));
});

test('the throttle just before GO is a perfect start, held from the first light a wheelspin', () => {
    const launch = (pressAt) => {
        const race = createRace({ trackId: 'duskValley', playerStats: stockStats() });
        const events = run(race, RACE.grid + RACE.countdown + 0.05, (r) => ({ ...IDLE, throttle: r.phase === 'countdown' && r.clock >= pressAt }));
        return { events: events.map((e) => e.type), car: race.player.car };
    };
    const perfect = launch(RACE.countdown - 0.2);
    assert.ok(perfect.events.includes('perfectStart'));
    assert.ok(perfect.car.boosting);
    const early = launch(0);
    assert.ok(early.events.includes('wheelspin'));
    assert.ok(!early.car.boosting);
});

test('laps are counted from the line, the last one ends the race', () => {
    const race = racingRace();
    const car = race.player.car;
    car.z = -10;
    car.speed = 6000;
    const events = run(race, 0.1, () => GAS);
    assert.equal(race.player.lap, 1);
    car.z = race.track.length - 10;
    events.push(...run(race, 0.1, () => GAS));
    assert.ok(events.some((e) => e.type === 'lap' && e.lap === 2));
    car.z = race.track.length * race.track.laps - 10;
    events.push(...run(race, 0.1, () => GAS));
    assert.equal(race.phase, 'finished');
    assert.ok(events.some((e) => e.type === 'finish'));
    assert.equal(race.player.lapTimes.length, 2, 'the laps the test skipped through are counted once each');
});

test('a player who stops is flagged once every rival is home: last, with no time', () => {
    const race = racingRace();
    const { length, laps } = race.track;
    const rivals = race.racers.filter((r) => !r.isPlayer);
    rivals.forEach((rival, i) => {
        rival.car.z = length * laps - 200 - i * 400;
        rival.car.speed = 6000;
    });
    race.player.car.speed = 0;
    const events = [];
    for (let t = 0; t < 20 && race.phase === 'racing'; t += DT) {
        events.push(...run(race, DT, () => IDLE));
        if (race.phase === 'racing') assert.ok(rivals.some((r) => !r.finished), 'still racing with everyone home');
    }
    assert.equal(race.phase, 'finished');
    assert.ok(rivals.every((r) => r.finished));
    assert.deepEqual(events.filter((e) => e.type === 'finish'), [{ type: 'finish', position: race.racers.length }]);
    const result = race.result();
    assert.equal(result.position, race.racers.length);
    assert.equal(result.time, null);
    assert.equal(result.standings.at(-1).isPlayer, true);
    // the pilot drives on, but crossing the line now changes nothing
    race.player.car.z = length * laps - 10;
    race.player.car.speed = 6000;
    const after = run(race, 0.5, () => GAS);
    assert.equal(race.player.finishTime, null);
    assert.ok(!after.some((e) => e.type === 'finish'));
    assert.ok(race.player.car.speed > 0, 'the pilot has the wheel');
    run(race, RACE.finishHold, () => IDLE);
    assert.ok(race.over);
});

test('pickups on the road are taken once a lap and do what they say', () => {
    const race = racingRace();
    const car = race.player.car;
    const item = race.pickups.items.find((i) => i.kind === 'nitro');
    const nitro = car.nitro;
    car.z = item.z - 50;
    car.x = item.x;
    car.speed = 6000;
    const events = run(race, 0.05, () => GAS);
    assert.ok(events.some((e) => e.type === 'pickup' && e.kind === 'nitro'));
    assert.equal(car.nitro, nitro + 1);
    car.z = item.z - 50;
    assert.equal(run(race, 0.05, () => GAS).filter((e) => e.type === 'pickup').length, 0, 'gone for this lap');
    car.z = item.z - 50 + race.track.length;
    assert.equal(run(race, 0.05, () => GAS).filter((e) => e.type === 'pickup').length, 1, 'back the next lap');

    car.nitro = PHYSICS.maxNitro;
    car.z = item.z - 50 + race.track.length * 2;
    const full = run(race, 0.05, () => GAS).find((e) => e.type === 'pickup');
    assert.equal(full.value, 0, 'taken, but the tank is full');
    assert.equal(car.nitro, PHYSICS.maxNitro);
});

test('running into the car in front trades speed and hurts both', () => {
    const race = racingRace();
    const [front] = race.racers.filter((r) => !r.isPlayer);
    const car = race.player.car;
    for (const other of race.racers.filter((r) => !r.isPlayer && r !== front)) other.car.z = -50000;
    front.car.z = 10000;
    front.car.x = 0;
    front.car.speed = 4000;
    car.z = 10000 - BODY.length + 20;
    car.x = 0;
    car.speed = 9000;
    const events = run(race, DT, () => GAS);
    assert.ok(events.some((e) => e.type === 'bump'));
    assert.ok(car.speed < 9000 && front.car.speed > 4000);
    assert.ok(car.health < car.stats.health && front.car.health < front.car.stats.health);
    assert.ok(Math.abs(car.shove) < 0.5, 'straight from behind: no big shove sideways');
});

test('leaving the road into a prop is a crash', () => {
    const race = racingRace();
    const car = race.player.car;
    const prop = race.props.find((p) => p.kind !== 'chevron' && p.z > 20000);
    car.z = prop.z - 30;
    car.x = prop.x;
    car.speed = 8000;
    const events = run(race, DT, () => IDLE);
    assert.ok(events.some((e) => e.type === 'crash'));
    assert.ok(car.speed < 3000);
});

test('the same seed and inputs make the same race', () => {
    const play = () => {
        const race = racingRace({ seed: 5 });
        run(race, 20, pilot);
        return race.racers.map((r) => [r.car.z, r.car.x, r.car.health]);
    };
    assert.deepEqual(play(), play());
});

/** A whole race with the pilot at the wheel: its place and how long it spent on the grass. */
function pilotRace(seed) {
    const race = racingRace({ seed });
    let offRoad = 0;
    let ticks = 0;
    while (!race.over && ticks < 60 * 300) {
        race.step(pilot(race), DT);
        race.drain();
        if (race.player.car.offRoad) offRoad++;
        ticks++;
    }
    return { over: race.over, position: race.result().position, offRoad: offRoad / ticks };
}

test('a good driver in the stock car makes the podium of the first race most times, on the road', () => {
    const races = [1, 2, 3, 4, 5].map(pilotRace);
    assert.ok(races.every((r) => r.over), 'every race finished within five minutes');
    const podiums = races.filter((r) => r.position <= 3).length;
    assert.ok(podiums >= 3, `podiums ${podiums}/5: ${races.map((r) => r.position)}`);
    assert.ok(races.every((r) => r.offRoad < 0.05), `off the road: ${races.map((r) => r.offRoad.toFixed(3))}`);
});
