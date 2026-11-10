/**
 * Hexforge sound, all synthesised with Web Audio (no files to download):
 * interface clicks, the forge's anvil, collect chimes, the clash of heroes
 * and towers, a low forge drone and war drums. Browsers only allow sound
 * after a tap, so the engine wakes on the first one. The speaker button
 * mutes everything and remembers the choice.
 */

const KEY = 'hexforge.sound';
let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noiseBuffer = null;
let muted = loadMuted();
let mode = 'off';              // off | city | battle
let drone = null;
let beatTimer = 0;
let nextBeat = 0;
let beatCount = 0;
const lastPlayed = {};
let level = 1;                 // makeup gain of the sound being built (see LEVEL)

function loadMuted() {
    try {
        return globalThis.localStorage.getItem(KEY) === 'off';
    } catch {
        return false;
    }
}

function saveMuted() {
    try {
        globalThis.localStorage.setItem(KEY, muted ? 'off' : 'on');
    } catch {
        // private mode: the choice lasts for this visit
    }
}

/** Call on any tap or key: creates (or resumes) the audio engine. */
export function unlock() {
    if (!ctx) {
        const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!Ctor) return;
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.9;
        const squash = ctx.createDynamicsCompressor();
        master.connect(squash).connect(ctx.destination);
        sfxBus = ctx.createGain();
        sfxBus.gain.value = 0.8;
        sfxBus.connect(master);
        musicBus = ctx.createGain();
        musicBus.gain.value = 0.5;
        musicBus.connect(master);
        noiseBuffer = makeNoise();
        applyMode();
        // a hidden tab stays silent (and the drone stops costing battery)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) void ctx.suspend();
            else void ctx.resume();
        });
    }
    if (ctx.state === 'suspended') void ctx.resume();
}

export function isMuted() {
    return muted;
}

export function setMuted(value) {
    muted = value;
    saveMuted();
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
}

/** 'city' (forge drone), 'battle' (drone and war drums) or 'off'. */
export function setMode(next) {
    if (next === mode) return;
    mode = next;
    applyMode();
}

function makeNoise() {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
}

// ── building blocks ────────────────────────────────────────────────────
/** A tone: `slide` is the frequency it ends on, `at` seconds from now. */
function tone(freq, dur, { type = 'sine', vol = 0.3, slide = null, at = 0, attack = 0.005, bus = sfxBus } = {}) {
    vol *= level;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
}

/** Filtered noise: a hiss, a rumble or a crack depending on the filter. */
function noise(dur, { vol = 0.3, from = 2000, to = null, type = 'lowpass', q = 0.7, at = 0, attack = 0.003, bus = sfxBus } = {}) {
    vol *= level;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(bus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
}

/** Struck metal: inharmonic partials that ring and fade. */
function clang(base, dur, vol = 0.25, at = 0) {
    for (const [ratio, weight] of [[1, 1], [2.76, 0.6], [5.4, 0.4], [8.93, 0.25]]) {
        tone(base * ratio, dur / (0.6 + ratio * 0.25), { vol: vol * weight, at, attack: 0.002 });
    }
    noise(0.05, { vol: vol * 0.8, from: 5000, type: 'highpass', at });
}

// ── the sounds ─────────────────────────────────────────────────────────
const SOUNDS = {
    click: () => tone(520, 0.07, { type: 'triangle', vol: 0.12, slide: 360 }),
    open: () => {
        tone(300, 0.16, { type: 'triangle', vol: 0.14, slide: 520 });
        noise(0.14, { vol: 0.05, from: 600, to: 2400, type: 'bandpass' });
    },
    close: () => tone(420, 0.14, { type: 'triangle', vol: 0.12, slide: 220 }),
    error: () => {
        tone(150, 0.16, { type: 'sawtooth', vol: 0.13, slide: 110 });
        tone(140, 0.16, { type: 'square', vol: 0.06, at: 0.1, slide: 100 });
    },
    // economy
    gem: () => {
        const f = 880 * 2 ** (Math.floor(Math.random() * 5) / 12 * 2);
        tone(f, 0.22, { type: 'sine', vol: 0.12 });
        tone(f * 2, 0.16, { type: 'sine', vol: 0.05, at: 0.02 });
    },
    collect: () => {
        noise(0.35, { vol: 0.08, from: 400, to: 3000, type: 'bandpass', q: 1.2 });
        [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, { type: 'triangle', vol: 0.09, at: i * 0.06 }));
    },
    forge: () => {
        clang(420, 0.9, 0.28);
        clang(560, 0.7, 0.16, 0.14);
        noise(0.25, { vol: 0.12, from: 3000, to: 800, type: 'bandpass', at: 0.02 });
    },
    claim: () => {
        [392, 494, 587, 784, 988].forEach((f, i) => {
            tone(f, 0.5, { type: 'triangle', vol: 0.13, at: i * 0.09 });
            tone(f * 2, 0.35, { type: 'sine', vol: 0.05, at: i * 0.09 });
        });
        clang(700, 1.1, 0.14, 0.3);
    },
    place: () => {
        tone(120, 0.22, { type: 'sine', vol: 0.4, slide: 55 });
        noise(0.16, { vol: 0.25, from: 900, to: 150 });
    },
    dismantle: () => {
        noise(0.3, { vol: 0.25, from: 1800, to: 200 });
        clang(300, 0.4, 0.1, 0.05);
    },
    // battle
    horn: () => {
        tone(110, 1.1, { type: 'sawtooth', vol: 0.12, attack: 0.15, slide: 120 });
        tone(165, 1.1, { type: 'sawtooth', vol: 0.09, attack: 0.2, slide: 175 });
        tone(220, 1.0, { type: 'square', vol: 0.04, attack: 0.25 });
    },
    strike_guardian: () => {
        tone(95, 0.3, { type: 'sine', vol: 0.5, slide: 45 });
        noise(0.14, { vol: 0.3, from: 1500, to: 200 });
        clang(240, 0.35, 0.1, 0.01);
    },
    strike_blade: () => {
        noise(0.12, { vol: 0.16, from: 6000, to: 2500, type: 'bandpass', q: 2 });
        tone(1800, 0.1, { type: 'triangle', vol: 0.07, slide: 900 });
        clang(1500, 0.25, 0.05, 0.02);
    },
    strike_technomancer: () => {
        tone(660, 0.3, { type: 'sine', vol: 0.18, slide: 220 });
        tone(990, 0.22, { type: 'triangle', vol: 0.07, slide: 330 });
        noise(0.18, { vol: 0.08, from: 4000, to: 1000, type: 'bandpass' });
    },
    nova: () => {
        tone(220, 0.7, { type: 'sine', vol: 0.4, slide: 55 });
        noise(0.6, { vol: 0.2, from: 4000, to: 150 });
        tone(880, 0.5, { type: 'triangle', vol: 0.08, slide: 330 });
    },
    leap: () => {
        noise(0.45, { vol: 0.12, from: 500, to: 3000, type: 'bandpass', q: 1.5 });
        tone(300, 0.4, { type: 'triangle', vol: 0.05, slide: 700 });
    },
    shot: () => {
        noise(0.3, { vol: 0.2, from: 2500, to: 300 });
        tone(190, 0.22, { type: 'sawtooth', vol: 0.1, slide: 70 });
    },
    bolt: () => {
        noise(0.22, { vol: 0.25, from: 8000, type: 'highpass' });
        tone(1200, 0.2, { type: 'sawtooth', vol: 0.08, slide: 200 });
        tone(80, 0.3, { type: 'sine', vol: 0.2, slide: 50 });
    },
    frost: () => {
        [1568, 2093, 2637].forEach((f, i) => tone(f, 0.5, { type: 'sine', vol: 0.08, at: i * 0.04 }));
        noise(0.25, { vol: 0.1, from: 6000, type: 'highpass' });
    },
    trap: () => {
        tone(80, 0.6, { type: 'sine', vol: 0.55, slide: 30 });
        noise(0.5, { vol: 0.35, from: 2500, to: 120 });
    },
    destroyed: () => {
        tone(70, 0.9, { type: 'sine', vol: 0.5, slide: 28 });
        noise(0.9, { vol: 0.35, from: 1800, to: 90 });
        noise(0.4, { vol: 0.12, from: 5000, type: 'highpass', at: 0.1 });
    },
    hero_down: () => {
        tone(330, 0.6, { type: 'triangle', vol: 0.14, slide: 110 });
        tone(247, 0.7, { type: 'sine', vol: 0.1, slide: 82, at: 0.05 });
    },
    victory: () => {
        [262, 330, 392, 523].forEach((f, i) => {
            tone(f, 0.8, { type: 'sawtooth', vol: 0.07, at: i * 0.14, attack: 0.03 });
            tone(f * 2, 0.8, { type: 'triangle', vol: 0.06, at: i * 0.14 });
        });
        [523, 659, 784, 1046].forEach((f) => tone(f, 1.6, { type: 'triangle', vol: 0.09, at: 0.6 }));
        clang(880, 1.4, 0.12, 0.6);
    },
    defeat: () => {
        [392, 349, 311, 262].forEach((f, i) => tone(f, 0.7, { type: 'sawtooth', vol: 0.07, at: i * 0.28, slide: f * 0.97 }));
        tone(65, 1.6, { type: 'sine', vol: 0.3, at: 0.8, slide: 40 });
    },
};

/** Makeup gain per sound, so everything lands at a similar loudness (measured by rendering each one). */
const LEVEL = {
    click: 6, open: 6, close: 6, error: 4, gem: 5, collect: 2.5, forge: 0.75, claim: 0.8, place: 3, dismantle: 2.5,
    horn: 2, strike_guardian: 1.5, strike_blade: 5, strike_technomancer: 4, nova: 2, leap: 10, shot: 6, bolt: 2.5,
    frost: 2.5, trap: 1.5, destroyed: 1.2, hero_down: 2.5, victory: 0.9, defeat: 1,
};

/** Minimum gap between two plays of the same sound (ms): keeps a crowded fight from turning to mush. */
const GAP = {
    gem: 55, click: 30, strike_guardian: 90, strike_blade: 70, strike_technomancer: 90, shot: 110, bolt: 130, frost: 150,
    hero_down: 200, destroyed: 120, trap: 200, leap: 120, nova: 200,
};

export function play(name) {
    if (!ctx || muted || ctx.state !== 'running') return;
    const sound = SOUNDS[name];
    if (!sound) return;
    const now = performance.now();
    if (now - (lastPlayed[name] ?? -1e9) < (GAP[name] ?? 0)) return;
    lastPlayed[name] = now;
    level = LEVEL[name] ?? 1;
    try {
        sound();
    } finally {
        level = 1;
    }
}

/** The sound of one line of a battle log (`cls` = the class of the hero it concerns). */
export function playBattleEvent(event, cls) {
    switch (event.type) {
        case 'strike':
            play(`strike_${cls}`);
            break;
        case 'nova':
            play('nova');
            break;
        case 'leap':
        case 'shot':
        case 'bolt':
        case 'frost':
        case 'trap':
        case 'destroyed':
        case 'hero_down':
            play(event.type);
            break;
        default:
            break;
    }
}

// ── the forge drone and the war drums ──────────────────────────────────
function applyMode() {
    if (!ctx) return;
    const wantDrone = mode !== 'off';
    if (wantDrone && !drone) startDrone();
    if (!wantDrone && drone) stopDrone();
    clearInterval(beatTimer);
    beatTimer = 0;
    if (mode === 'battle') {
        nextBeat = ctx.currentTime + 0.2;
        beatCount = 0;
        beatTimer = setInterval(scheduleBeats, 120);
    }
    if (drone) drone.gain.gain.setTargetAtTime(mode === 'battle' ? 0.5 : 1, ctx.currentTime, 0.5);
}

function startDrone() {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 70;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    const oscs = [55, 55.4, 82.4].map((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 2 ? 'triangle' : 'sawtooth';
        osc.frequency.value = f;
        const mix = ctx.createGain();
        mix.gain.value = i === 2 ? 0.05 : 0.04;
        osc.connect(mix).connect(filter);
        osc.start();
        return osc;
    });
    // the forge's breath: a slow hiss
    const hiss = ctx.createBufferSource();
    hiss.buffer = noiseBuffer;
    hiss.loop = true;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 900;
    hissFilter.Q.value = 0.5;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.012;
    hiss.connect(hissFilter).connect(hissGain).connect(gain);
    hiss.start();
    filter.connect(gain).connect(musicBus);
    drone = { gain, stop: () => [...oscs, lfo, hiss].forEach((n) => n.stop()) };
}

function stopDrone() {
    const old = drone;
    drone = null;
    old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    setTimeout(() => old.stop(), 1500);
}

/** War drums: a heavy beat on one, three lighter ones, a short skip before the next bar. */
function scheduleBeats() {
    if (nextBeat < ctx.currentTime) nextBeat = ctx.currentTime + 0.05;   // after a pause: pick up, never catch up
    while (nextBeat < ctx.currentTime + 0.4) {
        const strong = beatCount % 4 === 0;
        const at = nextBeat - ctx.currentTime;
        tone(strong ? 78 : 96, 0.28, { type: 'sine', vol: strong ? 0.34 : 0.2, slide: strong ? 38 : 50, at, bus: musicBus });
        noise(0.08, { vol: strong ? 0.1 : 0.05, from: 500, to: 120, at, bus: musicBus });
        beatCount += 1;
        nextBeat += beatCount % 4 === 3 ? 0.3 : 0.45;
    }
}

/** Names of every synthesised sound (for tests and tools). */
export const SOUND_NAMES = Object.keys(SOUNDS);
