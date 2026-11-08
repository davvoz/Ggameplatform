import { TICK_RATE } from './config/Tuning.js';
import { GameLoop } from './core/GameLoop.js';
import { Game } from './app/Game.js';
import { GameAudio } from './audio/GameAudio.js';
import { Controls } from './input/Controls.js';
import { TouchPad } from './input/TouchPad.js';
import { Cur8Platform } from './platform/Cur8Platform.js';
import { Font } from './render/Font.js';
import { Renderer } from './render/Renderer.js';
import { Screens } from './render/Screens.js';
import { SpriteBank } from './render/SpriteBank.js';
import { buildArt } from './render/art/buildArt.js';
import { Chrome } from './ui/Chrome.js';

/** Composition root: the only place that knows the concrete classes. */

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function boot() {
    const canvas = document.getElementById('game-canvas');
    const stage = document.getElementById('stage');
    const chrome = new Chrome(document);

    const platform = new Cur8Platform();
    const connecting = platform.connect();

    // paint every sprite once, letting the loading screen breathe
    await nextFrame();
    const bank = new SpriteBank();
    buildArt(bank);
    const font = new Font();
    await connecting;

    const renderer = new Renderer(canvas, bank, font);
    renderer.prepare(0);
    const screens = new Screens(bank, font);
    const audio = new GameAudio();
    const controls = new Controls(globalThis);
    const touch = new TouchPad(document.getElementById('touch'), controls);
    const game = new Game({ renderer, screens, audio, controls, touch, platform, chrome });

    // the title and the results show the whole picture, the fight is seen close up
    const fit = () => {
        const mode = document.body.dataset.mode;
        const scale = renderer.resize(stage.clientWidth, stage.clientHeight, mode === 'play' || mode === 'paused');
        stage.style.setProperty('--px', `${scale}px`);
    };
    new ResizeObserver(fit).observe(stage);
    chrome.onMode(fit);
    fit();

    const loop = new GameLoop(TICK_RATE, () => game.tick(), () => game.frame());

    let hidden = document.hidden;
    let platformPaused = false;
    let upright = chrome.isUpright;
    const applyPause = () => {
        const stop = hidden || platformPaused || upright;
        if (stop) game.pause();
        loop.setPaused(stop);
        audio.setSuspended(hidden || platformPaused);
    };
    document.addEventListener('visibilitychange', () => {
        hidden = document.hidden;
        applyPause();
    });
    chrome.onUpright((value) => {
        upright = value;
        applyPause();
    });
    platform.onLifecycle({
        onPause: () => {
            platformPaused = true;
            applyPause();
        },
        onResume: () => {
            platformPaused = false;
            applyPause();
        },
    });
    platform.onRewards({
        onXp: (xp) => chrome.showXp(xp),
        onLevelUp: (levelUp) => chrome.showLevelUp(levelUp),
    });

    controls.onActivity(() => audio.unlock());
    chrome.on({
        pause: () => game.togglePause(),
        sound: (muted) => audio.setMuted(muted),
        fullscreen: () => platform.toggleFullscreen(),
        tap: () => {
            audio.unlock();
            controls.tap();
        },
    });

    game.open();
    applyPause();
    loop.start();
    chrome.hideLoading();
    platform.loadBest().then((best) => game.setBest(best));

    // automated checks: ?autoplay&mission=1 lets the demo pilot play a real run
    const query = new URLSearchParams(location.search);
    if (query.has('autoplay')) game.autoplay(Number(query.get('mission') ?? 0), Number(query.get('seed') ?? 0), Number(query.get('skip') ?? 0));
    globalThis.__nonna = { game, controls, renderer };
}

boot().catch((error) => console.error('[Nonna Commando] boot failed', error));
