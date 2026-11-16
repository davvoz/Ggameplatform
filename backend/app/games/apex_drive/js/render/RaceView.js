import { POTHOLES } from '../config/Hazards.js';
import { CAMERA, LEAN, ROAD, SCREEN } from '../config/Tuning.js';
import { AVATAR } from './art/AdArt.js';
import { Lean } from './art/lean.js';
import { bySegment } from '../sim/Scenery.js';
import { makeCanvas } from './canvas.js';
import { precipitationOf } from './Precipitation.js';
import { drawStanding, placeOnRoad, widthAt } from './road/place.js';
import { paintPotholes } from './road/potholes.js';
import { paintRoad } from './road/raster.js';
import { paintTunnels } from './road/tunnel.js';
import { projectRoad } from './road/project.js';
import { focalLength } from './screen.js';

/** The avatars on the challenge's boards are loaded this big, then blown up with square pixels. */
const AVATAR_PIXELS = 40;

/**
 * Draws a race seen from behind the player's car: the backdrop (veiled by
 * thick weather), the road painted row by row with its potholes, then
 * everything standing on it (props, pickups, rivals and the player's car)
 * from the farthest to the nearest, each cut where a nearer crest hides it,
 * then the weather over it all (its tint and what falls). It reads the race
 * and never changes it.
 *
 * The camera rides behind the car at a fixed height above the road under
 * it and tilts a little with the slope; on a crest the backdrop comes down
 * to sit on the last row of road, as in the 16-bit racers.
 */

/** Icons standing for each pickup kind on the road. */
const PICKUP_ICON = { cash: 'coin', nitro: 'nitro', repair: 'repair', shield: 'shield', boost: 'bolt' };
/** Pickups float this high (art pixels) and bob this much. */
const FLOAT = { lift: 7, bob: 2, rate: 4 };
const SHADOW = 'rgba(10, 6, 20, 0.4)';
/** Rivals shown smaller than this share of their art keep their treads still and do not lean. */
const NEAR_SIZE = 0.7;

export class RaceView {
    #race;
    #parts;
    #focal = focalLength(SCREEN);
    /** The road's half width (pixels) at the player's car: sprites are drawn to this size there. */
    #reference;
    #propsAt;
    #width = 0;
    #road = null;
    #image = null;
    #pixels = null;
    #pitch = 0;
    #drop = 0;
    /** The width each rival was last drawn at: it only changes by more than a pixel. */
    #rivalWidths = new Map();
    /** Each car's drawn lean, by racer id. */
    #leans = new Map();
    /** Seconds since the last frame (the clock stands still in the pause). */
    #dt = 0;
    #clock = null;
    /** Rain (or later snow) falling, or null. */
    #falling;
    /** The middle of the top of the player's car, as last drawn (speech bubbles point there). */
    playerTop = { x: 0, y: 0 };

    /**
     * @param {import('../sim/Race.js').Race} race
     * @param {{backdrop: import('./Backdrop.js').Backdrop, palette: import('./road/RoadPalette.js').RoadPalette,
     *   props: Record<string, HTMLCanvasElement>, icons: Record<string, Record<number, HTMLCanvasElement>>,
     *   player: import('./CarArt.js').CarArt, rivals: Map<string, import('./CarArt.js').CarArt>,
     *   weather: {tint: string|null, veil?: string, particles: object|null},
     *   avatars?: import('./ui/Avatars.js').Avatars}} parts avatars: Steem avatars, for the challenge's avatar boards
     */
    constructor(race, parts) {
        this.#race = race;
        this.#parts = parts;
        this.#reference = (this.#focal * ROAD.halfWidth) / CAMERA.behind;
        this.#propsAt = bySegment(race.props);
        // the boards' avatars start loading now, so they are there when the boards come
        for (const prop of race.props) if (prop.steem) parts.avatars?.portrait(prop.steem, AVATAR_PIXELS);
        this.#falling = precipitationOf(parts.weather.particles);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{width: number, height: number}} size
     * @param {number} clock seconds, for animations
     */
    draw(ctx, size, clock) {
        this.#fit(size);
        this.#dt = this.#clock === null ? 0 : Math.max(0, Math.min(0.1, clock - this.#clock));
        this.#clock = clock;
        const { track, player } = this.#race;
        const car = player.car;
        const horizon = this.#horizon(track.slopeAt(car.z), size.height);
        const camera = { x: car.x * ROAD.halfWidth, y: CAMERA.height + track.elevationAt(car.z), z: car.z - CAMERA.behind };
        const view = { width: size.width, height: size.height, horizon, focal: this.#focal };
        const strips = projectRoad(track, camera, view, ROAD);
        const colorsOf = (strip) => this.#parts.palette.colorsOf(strip);
        const roadTop = paintRoad(this.#pixels, size.width, size.height, strips, colorsOf, ROAD.lanes);
        paintPotholes(this.#pixels, size.width, strips, this.#race.potholes, colorsOf);
        this.#road.ctx.putImageData(this.#image, 0, 0);

        this.#parts.backdrop.draw(ctx, size, this.#backdropLine(horizon, roadTop), track.headingAt(car.z), clock);
        this.#veil(ctx, size);
        ctx.drawImage(this.#road.canvas, 0, 0);
        if (track.hasTunnels) paintTunnels(ctx, strips, size, this.#parts.theme.tunnel, ROAD.bandSegments);

        // everything standing on the road, far to near; the player's car at its own depth
        const stripOf = new Map(strips.map((strip) => [strip.index, strip]));
        const standing = [...this.#props(strips), ...this.#pickups(camera.z, clock), ...this.#rivals()];
        const sprites = standing.flatMap((sprite) => {
            const place = sprite.where(stripOf);
            return place ? [{ depth: place.depth, draw: () => sprite.draw(ctx, place) }] : [];
        });
        sprites.push({ depth: CAMERA.behind, draw: () => this.#drawPlayer(ctx, size, horizon, clock) });
        for (const sprite of sprites.toSorted((a, b) => b.depth - a.depth)) sprite.draw();
        this.#weather(ctx, size, horizon, clock);
    }

    /** Thick weather hides the far world: its veil over the sky and the scenery, under the road. */
    #veil(ctx, size) {
        const { veil } = this.#parts.weather;
        if (!veil) return;
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, size.width, size.height);
    }

    /** The weather's tint over the whole scene, then what falls. */
    #weather(ctx, size, horizon, clock) {
        const { tint } = this.#parts.weather;
        if (tint) {
            ctx.fillStyle = tint;
            ctx.fillRect(0, 0, size.width, size.height);
        }
        if (!this.#falling) return;
        const speed = Math.min(1, this.#race.player.car.speedRatio);
        this.#falling.draw(ctx, size, clock, { speed, horizon });
    }

    #fit(size) {
        if (size.width === this.#width && this.#road) return;
        this.#width = size.width;
        this.#road = makeCanvas(size.width, size.height);
        this.#image = this.#road.ctx.createImageData(size.width, size.height);
        this.#pixels = new Uint32Array(this.#image.data.buffer);
        this.#parts.backdrop.resize(size.width, Math.round(size.height * SCREEN.horizon) + CAMERA.maxPitch + 4);
    }

    /** The horizon row, eased towards the tilt the slope under the car asks for. */
    #horizon(slope, height) {
        const target = Math.max(-CAMERA.maxPitch, Math.min(CAMERA.maxPitch, slope * this.#focal * CAMERA.pitch));
        this.#pitch += (target - this.#pitch) * CAMERA.pitchEase;
        return Math.round(height * SCREEN.horizon + this.#pitch);
    }

    #backdropLine(horizon, roadTop) {
        const target = Math.max(0, Math.min(CAMERA.maxDrop, roadTop - horizon));
        this.#drop += (target - this.#drop) * CAMERA.dropEase;
        return Math.round(horizon + this.#drop);
    }

    #where(segment, t, x) {
        const { segmentLength } = this.#race.track;
        return (stripOf) => placeOnRoad(stripOf, segment, t, x, this.#reference, segmentLength);
    }

    #props(strips) {
        const art = this.#parts.props;
        return strips.flatMap((strip) => (this.#propsAt.get(strip.index) ?? []).map((prop) => {
            const look = prop.kind === 'chevron' && prop.x > 0 ? 'chevronLeft' : prop.look ?? prop.kind;
            const draw = (ctx, place) => {
                drawStanding(ctx, art[look], place);
                if (prop.steem) this.#avatarOn(ctx, art[look], place, prop.steem);
            };
            return { where: this.#where(prop.segment, 0.5, prop.x), draw };
        }));
    }

    /**
     * A Steem user's avatar in their board's frame (AdArt AVATAR), as the board
     * stands at `place`; nothing until it has loaded. It is drawn here, not
     * painted into the board: an image from Steem cannot be read back, and the
     * boards are shrunk by reading their pixels.
     */
    #avatarOn(ctx, board, place, steem) {
        const portrait = this.#parts.avatars?.portrait(steem, AVATAR_PIXELS);
        if (!portrait) return;
        const width = widthAt(board, place);
        const scale = width / board.width;
        const height = Math.round(board.height * scale);
        const top = Math.round(place.y - height);
        const size = Math.round(AVATAR.size * scale);
        if (size < 1) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, ctx.canvas.width, Math.round(place.clip));
        ctx.clip();
        ctx.drawImage(portrait, Math.round(place.x - width / 2 + AVATAR.x * scale), Math.round(top + AVATAR.y * scale), size, size);
        ctx.restore();
    }

    #pickups(cameraZ, clock) {
        const { pickups, track } = this.#race;
        const reach = ROAD.drawDistance * track.segmentLength;
        const sprites = [];
        for (const item of pickups.items) {
            const lap = Math.ceil((cameraZ - item.z) / track.length);
            const ahead = item.z + lap * track.length - cameraZ;
            if (ahead > reach || !pickups.isThere(item, lap)) continue;
            const icon = this.#parts.icons[PICKUP_ICON[item.kind]][2];
            const lift = FLOAT.lift + Math.sin(clock * FLOAT.rate + item.id) * FLOAT.bob;
            sprites.push({
                where: this.#where(Math.floor(item.z / track.segmentLength), 0.5, item.x),
                draw: (ctx, place) => {
                    shadow(ctx, place, icon.width * 0.8);
                    drawStanding(ctx, icon, place, { lift });
                },
            });
        }
        return sprites;
    }

    #rivals() {
        const { track } = this.#race;
        return this.#race.racers.filter((racer) => !racer.isPlayer).map((racer) => {
            const { car } = racer;
            const art = this.#parts.rivals.get(racer.id);
            const pose = this.#poseOf(racer, art);
            return {
                where: this.#where(track.segmentAt(car.z).index, track.progressIn(car.z), car.x),
                draw: (ctx, place) => {
                    const width = this.#steadyWidth(racer.id, widthAt(art.spriteFor(car), place));
                    shadow(ctx, place, art.width - 4);
                    drawStanding(ctx, art.spriteFor(car, { pose, near: width >= art.width * NEAR_SIZE }), place, { width });
                },
            };
        });
    }

    /** The pose a racer's car is drawn in this frame, its lean following its steering. */
    #poseOf(racer, art) {
        let lean = this.#leans.get(racer.id);
        if (!lean) {
            lean = new Lean(art.steps, LEAN);
            this.#leans.set(racer.id, lean);
        }
        return lean.follow(racer.car.turn, this.#dt);
    }

    /**
     * A size that does not hop between two widths while a rival hovers at the
     * same distance: it follows only a change of more than one pixel.
     */
    #steadyWidth(id, width) {
        const last = this.#rivalWidths.get(id);
        const steady = last !== undefined && Math.abs(width - last) <= 1 ? last : width;
        this.#rivalWidths.set(id, steady);
        return steady;
    }

    #drawPlayer(ctx, size, horizon, clock) {
        const car = this.#race.player.car;
        const ground = horizon + (this.#focal * CAMERA.height) / CAMERA.behind;
        const bump = car.jolt > 0 ? Math.ceil((car.jolt / POTHOLES.joltTime) * 3) : offRoadShake(car, clock);
        const bottom = Math.round(ground) + 4 - bump;
        const { player } = this.#parts;
        player.draw(ctx, size.width / 2, bottom, car, clock, this.#poseOf(this.#race.player, player));
        this.playerTop = { x: size.width / 2, y: bottom - player.height };
    }
}

/** On the grass the car shakes a pixel up and down. */
function offRoadShake(car, clock) {
    return car.offRoad && car.speed > 0 ? Math.floor(clock * 20) % 2 : 0;
}

/** A flat dark band on the road under something standing there. */
function shadow(ctx, place, width) {
    const w = width * place.scale;
    const h = Math.max(1, Math.round(3 * place.scale));
    if (place.y - h >= place.clip) return;
    ctx.fillStyle = SHADOW;
    ctx.fillRect(Math.round(place.x - w / 2), Math.round(place.y - h + 1), Math.round(w), h);
}
