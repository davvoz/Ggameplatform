import { SimConfig } from './config/SimConfig.js';
import { FONT_FACES } from './config/Typography.js';
import { GameLoop } from './core/GameLoop.js';
import { loadFonts } from './core/loadFonts.js';
import { Game } from './app/Game.js';
import { GameAudio } from './audio/GameAudio.js';
import { PressInput } from './input/PressInput.js';
import { Cur8Platform } from './platform/Cur8Platform.js';
import { SceneRenderer } from './render/SceneRenderer.js';
import { bakeTitle } from './render/art/TitleArt.js';
import { OrientationGuard } from './ui/OrientationGuard.js';
import { Screens } from './ui/Screens.js';

/** Composition root: the only place that knows the concrete classes. */

async function boot() {
    const canvas = document.getElementById('game-canvas');
    const stage = document.getElementById('stage');

    const fonts = loadFonts(FONT_FACES);
    const platform = new Cur8Platform();
    await platform.connect();
    const week = await platform.loadWeek();
    await fonts;

    const screens = new Screens(document);
    screens.setTitle(bakeTitle().canvas);
    const audio = new GameAudio();
    const input = new PressInput(canvas);
    const renderer = new SceneRenderer(canvas);
    const game = new Game({ input, renderer, audio, screens, platform, week });
    const guard = new OrientationGuard(document.documentElement);

    const fit = () => renderer.resize(stage.clientWidth, stage.clientHeight);
    new ResizeObserver(fit).observe(stage);
    fit();

    const loop = new GameLoop(
        SimConfig.tickRate,
        () => game.tick(),
        (dt, alpha) => game.frame(dt, alpha)
    );

    let hidden = document.hidden;
    let platformPaused = false;
    const applyPause = () => {
        const paused = hidden || platformPaused || guard.isUpright;
        if (paused) input.release();
        loop.setPaused(paused);
        audio.setSuspended(paused);
    };

    document.addEventListener('visibilitychange', () => {
        hidden = document.hidden;
        applyPause();
    });
    guard.onChange(applyPause);
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
        onXp: (xp) => screens.showXp(xp),
        onLevelUp: (levelUp) => screens.showLevelUp(levelUp),
    });
    screens.onPlay(() => game.play());
    screens.onSoundToggle((muted) => audio.setMuted(muted));
    screens.onFullscreen(() => platform.toggleFullscreen());

    game.open();
    applyPause();
    loop.start();
    screens.hideLoading();

    platform.loadBest().then((best) => game.setBest(best));
}

boot().catch((error) => console.error('[Stormrun] boot failed', error));
