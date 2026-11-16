import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../js/audio/GameAudio.js';
import { gainOf, stepOf } from '../js/audio/levels.js';
import { MusicPlayer } from '../js/audio/MusicPlayer.js';
import { INSTRUMENTS, MUSIC, SONGS } from '../js/config/Music.js';
import { LEVELS } from '../js/config/Sounds.js';
import { SoundPanel } from '../js/screens/SoundPanel.js';

test('volume steps sound even and saved ones are made safe', () => {
    assert.equal(gainOf(0, 10), 0);
    assert.equal(gainOf(10, 10), 1);
    for (let step = 1; step <= 10; step++) assert.ok(gainOf(step, 10) > gainOf(step - 1, 10));
    assert.equal(stepOf(3.6, 7, 10), 4);
    assert.equal(stepOf(15, 7, 10), 10);
    assert.equal(stepOf(-2, 7, 10), 0);
    assert.equal(stepOf('loud', 7, 10), 7);
    assert.equal(stepOf(undefined, 7, 10), 7);
    assert.equal(stepOf(Number.NaN, 7, 10), 7);
});

test('the game starts at the default volumes and keeps the ones it is given, within bounds', () => {
    const audio = new GameAudio();
    assert.deepEqual(audio.volumes, { effects: LEVELS.effects, music: LEVELS.music });
    audio.setVolumes({ music: 3 });
    assert.deepEqual(audio.volumes, { effects: LEVELS.effects, music: 3 });
    audio.setVolumes({ effects: 99, music: 'x' });
    assert.deepEqual(audio.volumes, { effects: LEVELS.steps, music: 3 });
});

test('the music volume scales the music, ducked or not', () => {
    const fades = [];
    const synth = {
        running: true,
        now: 0,
        createBus: () => ({ input: {}, fadeTo: (volume) => fades.push(volume), close() {} }),
        note() {},
        schedule() {},
    };
    const player = new MusicPlayer(synth, { songs: SONGS, instruments: INSTRUMENTS, config: MUSIC });
    player.update();
    player.setLevel(0.5);
    assert.equal(fades.at(-1), MUSIC.volume * 0.5);
    player.duck(true);
    assert.equal(fades.at(-1), MUSIC.volume * 0.5 * MUSIC.duck);
    player.setLevel(0);
    assert.equal(fades.at(-1), 0);
});

/** A canvas that draws nothing. */
const ctx = { fillRect() {}, drawImage() {}, set fillStyle(v) {} };
const SIZE = { width: 320, height: 180 };

function panelWith(volumes) {
    const played = [];
    const app = {
        icons: {},
        audio: {
            muted: false,
            volumes,
            play: (name) => played.push(name),
        },
        setVolume: (kind, step) => {
            app.audio.volumes = { ...app.audio.volumes, [kind]: Math.min(10, Math.max(0, step)) };
        },
        toggleSound: () => {
            app.audio.muted = !app.audio.muted;
        },
    };
    const panel = new SoundPanel(app);
    panel.show(0);
    panel.draw(ctx, SIZE, 1);
    return { panel, app, played };
}

test('the sound panel sets each volume with + and -, and is heard doing it', () => {
    const { panel, app, played } = panelWith({ effects: 5, music: 5 });
    panel.key('confirm', 1);
    assert.equal(app.audio.volumes.effects, 6, 'the focus starts on EFFECTS +');
    panel.key('left', 1);
    panel.key('confirm', 1);
    panel.key('confirm', 1);
    assert.equal(app.audio.volumes.effects, 4);
    panel.key('down', 1);
    panel.key('confirm', 1);
    assert.deepEqual(app.audio.volumes, { effects: 4, music: 4 });
    assert.ok(played.includes('move'));
    panel.key('down', 1);
    panel.key('confirm', 1);
    assert.equal(app.audio.muted, true);
    panel.key('back', 1);
    assert.equal(panel.open, false);
});

test('a tap on a bar sets the volume there; a tap outside closes the panel', () => {
    const { panel, app } = panelWith({ effects: 5, music: 5 });
    const left = SIZE.width / 2 - 80;
    const top = SIZE.height / 2 - 58;
    // the music bar: 10 segments of 6 from 73 in, row 50 down
    panel.press(left + 73 + 6 * 8 + 2, top + 54, 1);
    assert.equal(app.audio.volumes.music, 9);
    panel.press(left + 73 + 1, top + 34, 1);
    assert.equal(app.audio.volumes.effects, 1);
    assert.equal(panel.open, true);
    panel.press(2, 2, 1);
    assert.equal(panel.open, false);
});
