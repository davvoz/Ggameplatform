import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARS } from '../js/config/Cars.js';
import { WEATHER } from '../js/config/Weather.js';
import { Controls } from '../js/input/Controls.js';
import { ICONS, INK } from '../js/render/art/Icons.js';
import { FLAME_FRAMES, FLAME_INK } from '../js/render/art/NitroFlame.js';
import { formatTime, ordinal } from '../js/render/hud/RaceHud.js';
import { countUp, ease } from '../js/render/ui/ease.js';
import { Banners } from '../js/render/hud/Banners.js';
import { Menu } from '../js/screens/Menu.js';

/** Buttons in a 2 x 2 grid, the bottom right one disabled. */
function grid() {
    const menu = new Menu();
    menu.set([
        { id: 'a', x: 0, y: 0, w: 10, h: 10 },
        { id: 'b', x: 20, y: 0, w: 10, h: 10 },
        { id: 'c', x: 0, y: 20, w: 10, h: 10 },
        { id: 'd', x: 20, y: 20, w: 10, h: 10, disabled: true },
    ]);
    return menu;
}

test('the focus moves to the nearest button that way, never to a disabled one', () => {
    const menu = grid();
    assert.equal(menu.focus, 'a');
    menu.key('right', 0);
    assert.equal(menu.focus, 'b');
    menu.key('down', 0);
    assert.equal(menu.focus, 'c', 'd is disabled: the nearest one below');
    menu.key('up', 0);
    assert.equal(menu.focus, 'a', 'straight up first');
    menu.key('left', 0);
    assert.equal(menu.focus, 'a', 'nothing that way');
    assert.equal(menu.key('confirm', 0), 'a');
});

test('a tap presses the button under it and takes the focus', () => {
    const menu = grid();
    assert.equal(menu.press(25, 5, 1), 'b');
    assert.equal(menu.focus, 'b');
    assert.ok(menu.isPressed('b', 1.05));
    assert.equal(menu.press(25, 25, 1), null, 'disabled');
    assert.equal(menu.press(50, 50, 1), null, 'nothing there');
});

/** A canvas 200 px wide, as far as the controls can tell. */
function fakeCanvas() {
    const element = new EventTarget();
    element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 });
    return element;
}

function send(target, type, fields) {
    target.dispatchEvent(Object.assign(new Event(type), fields));
}

test('keys drive and tell the screens; nitro fires once per press', () => {
    const window = new EventTarget();
    const actions = [];
    const controls = new Controls(fakeCanvas(), window, { onPress: () => false, onKey: (a) => actions.push(a) });
    send(window, 'keydown', { code: 'ArrowUp' });
    send(window, 'keydown', { code: 'ArrowLeft' });
    send(window, 'keydown', { code: 'Space' });
    assert.deepEqual(controls.read(), { steer: -1, throttle: true, brake: false, nitro: true });
    assert.equal(controls.read().nitro, false);
    assert.deepEqual(actions, ['up', 'left', 'confirm']);
    send(window, 'keydown', { code: 'KeyP', repeat: true });
    assert.equal(actions.length, 3, 'held keys act once, except the arrows');
    send(window, 'blur', {});
    assert.deepEqual(controls.read(), { steer: 0, throttle: false, brake: false, nitro: false });
});

test('a press steers only where the screen says so', () => {
    const canvas = fakeCanvas();
    const controls = new Controls(canvas, new EventTarget(), { onPress: (x) => x < 150, onKey: () => {} });
    send(canvas, 'pointerdown', { pointerId: 1, clientX: 20, button: 0 });
    assert.deepEqual(controls.read(), { steer: -1, throttle: true, brake: false, nitro: false });
    send(canvas, 'pointerdown', { pointerId: 2, clientX: 180, button: 0 });
    assert.equal(controls.read().steer, -1, 'the press on a button did not steer');
    send(canvas, 'pointerup', { pointerId: 1 });
    assert.equal(controls.read().throttle, false);
});

/** Controls in touch mode on a clock the test moves; presses left of x 150 steer, the rest is the brake. */
function touchControls() {
    const canvas = fakeCanvas();
    const clock = { now: 0 };
    const controls = new Controls(canvas, new EventTarget(), { onPress: (x) => (x < 150 ? true : 'brake'), onKey: () => {} }, {
        touch: true,
        now: () => clock.now,
    });
    return { canvas, clock, controls };
}

test('touch mode: a held half steers gently at first and fully after a moment', async () => {
    const { TOUCH } = await import('../js/config/Tuning.js');
    const { canvas, clock, controls } = touchControls();
    send(canvas, 'pointerdown', { pointerId: 1, clientX: 20, button: 0 });
    assert.equal(controls.read().steer, -TOUCH.steerFrom);
    clock.now = TOUCH.steerRamp / 2;
    const half = -controls.read().steer;
    assert.ok(half > TOUCH.steerFrom && half < 1);
    clock.now = TOUCH.steerRamp;
    assert.equal(controls.read().steer, -1);
    // sliding to the other half starts gently again
    send(canvas, 'pointermove', { pointerId: 1, clientX: 120 });
    assert.equal(controls.read().steer, TOUCH.steerFrom);
    send(canvas, 'pointerup', { pointerId: 1 });
    assert.equal(controls.read().steer, 0);
    assert.equal(controls.touch, true);
});

test('touch mode: the throttle stays open while racing, and the BRAKE button brakes while held', () => {
    const { canvas, controls } = touchControls();
    assert.equal(controls.read().throttle, false, 'on the grid, no finger: no throttle (a launch is still yours)');
    assert.equal(controls.read({ cruise: true }).throttle, true, 'racing: no finger, full speed ahead');
    send(canvas, 'pointerdown', { pointerId: 3, clientX: 190, button: 0 });
    assert.deepEqual(controls.read({ cruise: true }), { steer: 0, throttle: true, brake: true, nitro: false });
    send(canvas, 'pointerup', { pointerId: 3 });
    assert.equal(controls.read({ cruise: true }).brake, false);
});

test('without touch mode (desktop) nothing cruises and a press steers fully at once', () => {
    const canvas = fakeCanvas();
    const controls = new Controls(canvas, new EventTarget(), { onPress: () => true, onKey: () => {} });
    assert.equal(controls.read({ cruise: true }).throttle, false);
    send(canvas, 'pointerdown', { pointerId: 1, clientX: 180, button: 0 });
    assert.equal(controls.read().steer, 1);
    assert.equal(controls.touch, false);
});

test('touch mode on the road: a short tap moves the car a little, much less than a full press', async () => {
    const { racingRace, run } = await import('./support/race.js');
    // `press` false: no finger at all, the drift of the bend alone
    const sideways = (touch, press = true) => {
        const race = racingRace();
        Object.assign(race.player.car, { z: 2000, speed: 9000, x: 0 });
        const canvas = fakeCanvas();
        const clock = { now: 0 };
        const controls = new Controls(canvas, new EventTarget(), { onPress: () => true, onKey: () => {} }, { touch, now: () => clock.now });
        if (press) send(canvas, 'pointerdown', { pointerId: 1, clientX: 180, button: 0 });
        for (let t = 0; t < 0.12; t += 1 / 60) {
            clock.now = t;
            run(race, 1 / 60, () => controls.read({ cruise: true }));
        }
        send(canvas, 'pointerup', { pointerId: 1 });
        run(race, 0.5, () => controls.read({ cruise: true }));
        return race.player.car.x;
    };
    const drift = sideways(true, false);
    const tap = sideways(true) - drift;
    const desktop = sideways(false) - drift;
    assert.ok(tap > 0, 'it moves the right way');
    assert.ok(tap < desktop * 0.6, `a tap moves ${tap.toFixed(3)}, a mouse press ${desktop.toFixed(3)}`);
});

test('icons and cars are drawn on rows of one width, with known colours', () => {
    for (const [name, rows] of Object.entries(ICONS)) {
        for (const row of rows) {
            assert.equal(row.length, 9, `${name}: ${row}`);
            for (const letter of row) assert.ok(letter === '.' || letter in INK, `${name}: ${letter}`);
        }
    }
    for (const [name, car] of Object.entries(CARS)) {
        for (const row of car.left) {
            assert.equal(row.length, car.left[0].length, name);
            for (const letter of row) assert.ok(letter === '.' || letter in car.colors, `${name}: ${letter}`);
        }
    }
    for (const weather of Object.values(WEATHER)) assert.ok(weather.icon in ICONS);
    FLAME_FRAMES.forEach((rows, i) => {
        assert.equal(rows.length, FLAME_FRAMES[0].length, `flame ${i}: height`);
        for (const row of rows) {
            assert.equal(row.length, FLAME_FRAMES[0][0].length, `flame ${i}: ${row}`);
            for (const letter of row) assert.ok(letter === '.' || letter in FLAME_INK, `flame ${i}: ${letter}`);
        }
    });
});

test('times, places and counters read right', () => {
    assert.equal(formatTime(83.456), '1:23.46');
    assert.equal(formatTime(null), '-:--.--');
    assert.deepEqual([1, 2, 3, 4, 11].map(ordinal), ['1ST', '2ND', '3RD', '4TH', '11TH']);
    assert.equal(countUp(10, 0, 1, 100, 500), 500);
    assert.equal(countUp(0, 0, 1, 100, 500), 100);
    assert.ok(ease.outBack(0.6) > 1, 'it overshoots');
});

test('a pop up that comes again while it shows starts over instead of stacking on itself', () => {
    const drawn = (bumps) => {
        const banners = new Banners();
        for (let i = 0; i < bumps; i++) {
            banners.handle({ type: 'bump', hurt: true });
            banners.update(0.1);
        }
        let rects = 0;
        const ctx = { fillStyle: '', fillRect: () => rects++, save() {}, restore() {}, translate() {} };
        banners.draw(ctx, { width: 320, height: 180 }, { phase: 'racing', clock: 5 });
        return rects;
    };
    assert.ok(drawn(1) > 0);
    assert.equal(drawn(2), drawn(1));
});
