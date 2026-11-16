import { CARS, PLAYER_CAR } from '../../js/config/Cars.js';
import { DRIVERS } from '../../js/config/Drivers.js';
import { THEMES } from '../../js/config/Themes.js';
import { ROAD, SCREEN } from '../../js/config/Tuning.js';
import { paintIcons } from '../../js/render/art/Icons.js';
import { paintProps } from '../../js/render/art/PropArt.js';
import { Backdrop } from '../../js/render/Backdrop.js';
import { makeCanvas } from '../../js/render/canvas.js';
import { CarArt } from '../../js/render/CarArt.js';
import { RaceView } from '../../js/render/RaceView.js';
import { RoadPalette } from '../../js/render/road/RoadPalette.js';
import { focalLength } from '../../js/render/screen.js';
import { Logo } from '../../js/render/ui/Logo.js';
import { computeStats } from '../../js/sim/Build.js';
import { CATALOG } from '../../js/sim/Career.js';
import { createRace, propKindsOf } from '../../js/sim/setup.js';

/**
 * The game's cover, drawn by the game itself so the two cannot drift apart: a
 * moment of a real race at the game's own resolution (320 x 180), scaled up
 * four times with square pixels. The player's car takes a bend on nitro,
 * the rivals just ahead, the logo over the night sky of NEON AVENUE.
 *
 * Shown as it is by cover.html; with ?save=1 (render-cover.js) it sends
 * thumbnail.png and thumbnail_preview.webp to be written in the game folder.
 */
const FRAME = { width: 320, height: SCREEN.height };
/** The race is drawn a little taller and cropped, so the nitro under the car shows: rows kept from. */
const DRAWN = { height: SCREEN.height + 20, top: 14 };
const SCALE = 4;
const SAVES = [
    { name: 'thumbnail.png', scale: 1, type: 'image/png' },
    { name: 'thumbnail_preview.webp', scale: 0.5, type: 'image/webp', quality: 0.9 },
];

/** The moment: where on the lap, how hard the player steers, the rivals ahead (road units, half widths). */
const SHOT = {
    trackId: 'neonAvenue',
    lap: 0.75,
    turn: -1,
    rivals: [
        { id: 'vex', ahead: 1250, x: 0.45 },
        { id: 'nyx', ahead: 2100, x: -0.35 },
        { id: 'zip', ahead: 3400, x: 0.2 },
        { id: 'brick', ahead: 5200, x: -0.5 },
        { id: 'otto', ahead: 7600, x: 0.4 },
    ],
    /** Frames drawn before the one kept: the lean, the camera and the flames settle. */
    settle: 40,
};

function stage() {
    const stats = computeStats({ parts: { engine: 3, tires: 3, aero: 3, nitro: 3 }, mods: [] }, CATALOG);
    const race = createRace({ trackId: SHOT.trackId, playerStats: stats, seed: 7 });
    race.skipStart();
    const z = race.track.length * SHOT.lap;
    Object.assign(race.player.car, { z, x: 0.1, speed: 14000, turn: SHOT.turn, throttle: true, boostTime: 9 });
    for (const { id, ahead, x } of SHOT.rivals) {
        Object.assign(race.racers.find((r) => r.id === id).car, { z: z + ahead, x, speed: 12000 });
    }
    return race;
}

function viewOf(race) {
    const theme = THEMES[race.world.theme];
    return new RaceView(race, {
        backdrop: new Backdrop(theme, focalLength(SCREEN)),
        palette: new RoadPalette(theme, ROAD, race.weather),
        theme,
        props: paintProps(theme.props, propKindsOf(race.world)),
        icons: paintIcons(),
        player: new CarArt(CARS[PLAYER_CAR]),
        rivals: new Map(DRIVERS.map((driver) => [driver.id, new CarArt(CARS[PLAYER_CAR], driver.colors)])),
        weather: race.weather,
    });
}

/** The race at the game's size, with the logo, then four times bigger. */
function paint() {
    const race = stage();
    const view = viewOf(race);
    const { canvas: drawn, ctx: road } = makeCanvas(FRAME.width, DRAWN.height);
    for (let frame = 0; frame <= SHOT.settle; frame++) view.draw(road, { width: FRAME.width, height: DRAWN.height }, frame / 60);
    const { canvas: small, ctx } = makeCanvas(FRAME.width, FRAME.height);
    ctx.drawImage(drawn, 0, -DRAWN.top);

    // a band of night behind the logo, as on the title
    const fade = ctx.createLinearGradient(0, 0, 0, 74);
    fade.addColorStop(0, 'rgba(14, 8, 32, 0.75)');
    fade.addColorStop(1, 'rgba(14, 8, 32, 0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, FRAME.width, 74);
    const logo = new Logo('APEX', 'DRIVE');
    logo.draw(ctx, Math.round(FRAME.width / 2 - logo.width / 2), 8, 2);

    const big = document.getElementById('cover');
    const out = big.getContext('2d');
    out.imageSmoothingEnabled = false;
    out.drawImage(small, 0, 0, FRAME.width * SCALE, FRAME.height * SCALE);
    return big;
}

function blobOf(picture, { scale, type, quality }) {
    const { canvas, ctx } = makeCanvas(picture.width * scale, picture.height * scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(picture, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function save(picture) {
    for (const target of SAVES) {
        await fetch(`/save/${target.name}`, { method: 'POST', body: await blobOf(picture, target) });
    }
    await fetch('/done');
}

const picture = paint();
if (new URLSearchParams(location.search).has('save')) {
    save(picture).catch((error) => console.error('[cover]', error));
}
