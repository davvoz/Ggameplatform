import { MAPS, SCENES } from './config/Scenes.js';
import { TICK_RATE, WORLD } from './config/Tuning.js';
import { Game } from './app/Game.js';
import { GameAudio } from './audio/GameAudio.js';
import { GameLoop } from './core/GameLoop.js';
import { Pointer } from './input/Pointer.js';
import { Cur8Platform } from './platform/Cur8Platform.js';
import { Effects } from './render/Effects.js';
import { Font } from './render/Font.js';
import { Hud } from './render/Hud.js';
import { paintBoons } from './render/BoonArt.js';
import { paintPickups } from './render/PickupArt.js';
import { paintShots } from './render/ShotArt.js';
import { Renderer } from './render/Renderer.js';
import { SceneArt } from './render/SceneArt.js';
import { Screens } from './render/Screens.js';
import { SpriteBank } from './render/SpriteBank.js';
import { TitleDemo } from './render/TitleDemo.js';
import { Weather } from './render/Weather.js';
import { WorldView } from './render/WorldView.js';
import { buildMaps } from './sim/Maps.js';
import { Chrome } from './ui/Chrome.js';

/** Composition root: the only place that knows the concrete classes. */

/** Backgrounds are baked a little sharper than the arena, for big screens. */
const BACKDROP_SCALE = 1.5;

async function loadSurfaces() {
    const entries = await Promise.all(Object.entries(SCENES).map(async ([key, scene]) => {
        const response = await fetch(scene.surfaces);
        if (!response.ok) throw new Error(`Cannot load ${scene.surfaces}`);
        return [key, await response.json()];
    }));
    return Object.fromEntries(entries);
}

async function boot() {
    const canvas = document.getElementById('game-canvas');
    const stage = document.getElementById('stage');
    const chrome = new Chrome(document);
    const platform = new Cur8Platform();
    const connecting = platform.connect();

    const bank = new SpriteBank();
    const font = new Font();
    const scenes = new SceneArt(WORLD.width * BACKDROP_SCALE, WORLD.height * BACKDROP_SCALE);
    const [surfaces] = await Promise.all([
        loadSurfaces(),
        bank.load((done, total) => chrome.setLoading(done / total)),
        font.load(),
        scenes.load(),
        connecting,
    ]);
    const maps = buildMaps(MAPS, surfaces);

    const icons = paintPickups();
    const shotArt = paintShots();
    // a mouse (and so, most likely, a keyboard): the screens name the keys too
    const keyboard = globalThis.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
    const renderer = new Renderer(canvas, {
        world: new WorldView({ bank, scenes, icons, shots: shotArt }),
        effects: new Effects(bank, font),
        weather: new Weather(),
        hud: new Hud(font, icons, keyboard, paintBoons(icons)),
        screens: new Screens(font, bank, keyboard, paintBoons(icons)),
        demo: new TitleDemo({ bank, font, shots: shotArt, keyboard }),
    });
    const audio = new GameAudio();
    const game = new Game({ renderer, audio, platform, chrome, scenes, maps });

    const fit = () => renderer.resize(stage.clientWidth, stage.clientHeight, globalThis.devicePixelRatio);
    new ResizeObserver(fit).observe(stage);
    fit();

    const pointer = new Pointer(canvas);
    pointer.onTap((x, y) => game.tap(x, y));
    const keys = {
        confirm: () => game.confirm(),
        storm: () => game.callStorm(),
        choose: (index) => game.chooseBoon(index),
        pause: () => game.togglePause(),
    };
    pointer.onKey((action, index) => keys[action](index));

    const loop = new GameLoop(TICK_RATE, () => game.tick(), (dt) => game.frame(dt));
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
    chrome.on({
        pause: () => game.togglePause(),
        sound: (muted) => audio.setMuted(muted),
        fullscreen: () => platform.toggleFullscreen(),
    });

    game.open();
    applyPause();
    loop.start();
    chrome.hideLoading();
    platform.loadBest().then((best) => game.setBest(best), () => {});

    // automated checks: ?autoplay&skip=1800 lets the pilot play a real night
    const query = new URLSearchParams(location.search);
    if (query.has('autoplay')) game.autoplay(Number(query.get('skip') ?? 0));
    globalThis.__nightMage = { game, renderer };
}

boot().catch((error) => console.error('[Night Mage] boot failed', error));
