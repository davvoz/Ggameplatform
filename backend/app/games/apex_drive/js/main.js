import { CARS, PLAYER_CAR } from './config/Cars.js';
import { DRIVERS } from './config/Drivers.js';
import { CHALLENGE_ADS } from './config/Props.js';
import { THEMES } from './config/Themes.js';
import { ROAD, SCREEN, TICK_RATE } from './config/Tuning.js';
import { CareerSync } from './app/CareerSync.js';
import { Game } from './app/Game.js';
import { GameAudio } from './audio/GameAudio.js';
import { GameLoop } from './core/GameLoop.js';
import { Controls } from './input/Controls.js';
import { ApexServer } from './platform/ApexServer.js';
import { LocalSave } from './platform/LocalSave.js';
import { PlatformSessions } from './platform/PlatformSessions.js';
import { paintAds } from './render/art/AdArt.js';
import { paintIcons } from './render/art/Icons.js';
import { paintProps } from './render/art/PropArt.js';
import { Backdrop } from './render/Backdrop.js';
import { CarArt } from './render/CarArt.js';
import { Frame } from './render/Frame.js';
import { RaceView } from './render/RaceView.js';
import { RoadPalette } from './render/road/RoadPalette.js';
import { focalLength } from './render/screen.js';
import { Logo } from './render/ui/Logo.js';
import { levelUpBanner, RewardBanners, xpBanner } from './render/ui/RewardBanners.js';
import { GarageScreen } from './screens/GarageScreen.js';
import { RaceScreen } from './screens/RaceScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';
import { ChallengeScreen } from './screens/ChallengeScreen.js';
import { TitleScreen } from './screens/TitleScreen.js';
import { TrackScreen } from './screens/TrackScreen.js';
import { WorldScreen } from './screens/WorldScreen.js';
import { propKindsOf } from './sim/setup.js';
import { Avatars } from './render/ui/Avatars.js';
import { Chrome } from './ui/Chrome.js';

/** Composition root: the only place that knows the concrete classes. */

const SCREENS = {
    title: TitleScreen,
    worlds: WorldScreen,
    tracks: TrackScreen,
    garage: GarageScreen,
    race: RaceScreen,
    results: ResultsScreen,
    challenge: ChallengeScreen,
};

/** Art painted once and shared by every race: per theme, per world, per car. */
function raceArt() {
    const backdrops = new Map();
    const props = new Map();
    const rivals = new Map(DRIVERS.map((driver) => [driver.id, new CarArt(CARS[PLAYER_CAR], driver.colors)]));
    const ads = paintAds(CHALLENGE_ADS);
    const once = (cache, key, make) => {
        if (!cache.has(key)) cache.set(key, make());
        return cache.get(key);
    };
    return {
        backdrop: (theme) => once(backdrops, theme, () => new Backdrop(THEMES[theme], focalLength(SCREEN))),
        // the challenge's boards can stand in any world: every world has them
        props: (world) => once(props, world.id, () => ({ ...paintProps(THEMES[world.theme].props, propKindsOf(world)), ...ads })),
        rivals,
    };
}

async function boot() {
    const canvas = document.getElementById('game-canvas');
    const stage = document.getElementById('stage');
    const query = new URLSearchParams(location.search);
    const frame = new Frame(canvas);
    // the career lives on the server (app/CareerSync.js); careers once kept in the browser are dropped
    new LocalSave('apex_drive.career.v1').clear();
    // the browser keeps only this device's settings
    const settingsStore = new LocalSave('apex_drive.settings.v1');
    const settings = { muted: false, ...settingsStore.load() };
    const sync = new CareerSync(new ApexServer());
    const sessions = new PlatformSessions();
    const audio = new GameAudio();
    audio.setMuted(settings.muted === true);
    audio.setVolumes(settings);
    const icons = paintIcons();
    const playerCar = new CarArt(CARS[PLAYER_CAR]);
    const shared = raceArt();

    const app = {
        career: sync.career,
        sync,
        sessions,
        audio,
        toggleSound: () => {
            settings.muted = !audio.muted;
            audio.setMuted(settings.muted);
            settingsStore.save(settings);
        },
        /** @param {'effects'|'music'} kind @param {number} step */
        setVolume: (kind, step) => {
            audio.setVolumes({ [kind]: step });
            Object.assign(settings, audio.volumes);
            settingsStore.save(settings);
        },
        icons,
        /** Who is playing (their Steem name and avatar); offline, a nameless "YOU". */
        player: { name: 'YOU', steem: null, ranked: false },
        avatars: new Avatars(),
        // a mouse (and so, most likely, a keyboard): the screens name the keys
        keyboard: globalThis.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false,
        autopilot: query.has('autoplay'),
        art: { logo: new Logo('APEX', 'DRIVE'), car: playerCar },
        makeRaceView: (race) => new RaceView(race, {
            backdrop: shared.backdrop(race.world.theme),
            palette: new RoadPalette(THEMES[race.world.theme], ROAD, race.weather),
            theme: THEMES[race.world.theme],
            props: shared.props(race.world),
            icons,
            player: playerCar,
            rivals: shared.rivals,
            weather: race.weather,
            avatars: app.avatars,
        }),
    };
    const factories = Object.fromEntries(Object.entries(SCREENS).map(([name, Kind]) => [name, (a, params) => new Kind(a, params)]));
    const game = new Game({ frame, factories, app });

    // every touch and key may be the one the browser waits for to allow sound
    app.controls = new Controls(canvas, globalThis, {
        onPress: (x, y) => {
            audio.unlock();
            return game.press(x, y);
        },
        onKey: (action) => {
            audio.unlock();
            game.key(action);
        },
    }, { touch: !app.keyboard });

    const chrome = new Chrome(document);
    chrome.onFullscreen(() => sessions.toggleFullscreen());
    const fit = () => {
        frame.resize(stage.clientWidth, stage.clientHeight);
        chrome.setPixelSize(canvas.clientWidth / frame.size.width);
    };
    new ResizeObserver(fit).observe(stage);
    fit();

    // the XP and the level ups the platform hands over, drawn over every screen
    const rewards = new RewardBanners();
    sessions.onRewards({
        onXp: (xp) => {
            if (xp <= 0) return;
            rewards.add(xpBanner(xp));
            audio.play('buy');
        },
        onLevelUp: (levelUp) => {
            rewards.add(levelUpBanner(levelUp));
            audio.play('perfectStart');
        },
    });

    const loop = new GameLoop(TICK_RATE, () => game.tick(1 / TICK_RATE), (dt) => {
        game.frame(dt);
        rewards.update(dt);
        rewards.draw(frame.ctx, frame.size, icons);
        audio.update();
    }, (error) => chrome.showFrameError(error));
    let hidden = document.hidden;
    let upright = chrome.isUpright;
    let platformPaused = false;
    const applyPause = () => {
        const stop = hidden || upright || platformPaused;
        if (stop) {
            game.suspend();
            app.controls.release();
        }
        loop.setPaused(stop);
        audio.setSuspended(hidden);
    };
    document.addEventListener('visibilitychange', () => {
        hidden = document.hidden;
        applyPause();
    });
    chrome.onUpright((value) => {
        upright = value;
        applyPause();
    });

    // the platform is not waited for: alone, the game starts all the same
    sessions.connect({
        onPause: () => {
            platformPaused = true;
            applyPause();
        },
        onResume: () => {
            platformPaused = false;
            applyPause();
        },
    }).catch((error) => console.error('[Apex Drive] platform', error));
    const [, player] = await Promise.all([sync.load(), sync.profile()]);
    if (player) app.player = player;

    // automated checks: ?screen=garage&track=duskValley opens a screen straight away
    game.start(query.get('screen') ?? 'title', { trackId: query.get('track') ?? undefined, worldIndex: 0 });
    applyPause();
    loop.start();
    globalThis.__apexDrive = { game, app, rewards };
}

try {
    await boot();
} catch (error) {
    console.error('[Apex Drive] boot failed', error);
}
