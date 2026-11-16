import { drawText, LINE, textWidth } from '../PixelFont.js';
import { panel, UI } from '../ui/widgets.js';
import { MiniMap } from './MiniMap.js';

/**
 * Everything over the road during a race: the place and the laps top left,
 * the minimap top right, the speed and the car's health bottom left, the
 * nitro button bottom right (a touch button, and the charges left), the
 * pause button top middle. On a touch screen a BRAKE button (held) sits
 * bottom left, opposite the nitro, with the speed above it.
 * `buttons(size)` says where the touch buttons are: those touches never steer.
 */
const MARGIN = 5;
const GAP = 3;
const NITRO = { size: 30 };
const BRAKE = { width: 34, height: 30 };
const PAUSE = { size: 14 };
const HEALTH = { width: 44, height: 4 };

/** 83.456 s as 1:23.45 */
export function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '-:--.--';
    const whole = Math.max(0, seconds);
    const minutes = Math.floor(whole / 60);
    const rest = whole - minutes * 60;
    return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
}

export function ordinal(place) {
    const suffix = { 1: 'ST', 2: 'ND', 3: 'RD' }[place] ?? 'TH';
    return `${place}${suffix}`;
}

function healthColor(share) {
    if (share > 0.6) return UI.green;
    if (share > 0.3) return UI.gold;
    return UI.red;
}

export class RaceHud {
    #minimap;
    #icons;
    #keyboard;
    #brake;
    #pressed = { id: null, at: -1 };

    /**
     * @param {import('../../sim/Race.js').Race} race
     * @param {object} icons from render/art/Icons.js
     * @param {{keyboard: boolean, brake: boolean}} options keyboard: name the keys too; brake: show the BRAKE button
     */
    constructor(race, icons, { keyboard, brake = false }) {
        this.#minimap = new MiniMap(race.track);
        this.#icons = icons;
        this.#keyboard = keyboard;
        this.#brake = brake;
    }

    /** The touch buttons, in frame pixels. */
    buttons({ width, height }) {
        const buttons = [
            { id: 'nitro', x: width - NITRO.size - MARGIN, y: height - NITRO.size - MARGIN - (this.#keyboard ? 8 : 0), w: NITRO.size, h: NITRO.size },
            { id: 'pause', x: Math.round(width / 2 - PAUSE.size / 2), y: MARGIN, w: PAUSE.size, h: PAUSE.size },
        ];
        if (this.#brake) buttons.push({ id: 'brake', x: MARGIN, y: height - BRAKE.height - MARGIN, w: BRAKE.width, h: BRAKE.height });
        return buttons;
    }

    /** A touch button was pressed: it sinks for a moment. */
    press(id, clock) {
        this.#pressed = { id, at: clock };
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{width: number, height: number}} size
     * @param {import('../../sim/Race.js').Race} race
     * @param {number} clock
     */
    draw(ctx, size, race, clock) {
        const car = race.player.car;
        this.#standing(ctx, race);
        this.#minimap.draw(ctx, size.width, race.racers.filter((r) => !r.isPlayer).map((r) => ({
            at: race.track.planAt(r.car.z),
            color: r.colors?.r ?? UI.cream,
        })), race.track.planAt(car.z), clock);
        // with a BRAKE button, the speed sits above it
        this.#speed(ctx, this.#brake ? size.height - BRAKE.height - GAP : size.height, car);
        const [nitro, pause, brake] = this.buttons(size);
        this.#nitroButton(ctx, nitro, car, clock);
        this.#pauseButton(ctx, pause, clock);
        if (brake) this.#brakeButton(ctx, brake, car);
    }

    #isPressed(id, clock) {
        return this.#pressed.id === id && clock - this.#pressed.at < 0.15;
    }

    #standing(ctx, race) {
        const style = { color: UI.cream, outline: UI.ink };
        const place = String(race.position);
        drawText(ctx, place, MARGIN, MARGIN, { ...style, scale: 3 });
        const right = MARGIN + textWidth(place, 3) + 3;
        drawText(ctx, `/${race.racers.length}`, right, MARGIN + LINE * 2, { ...style, color: UI.dim });
        drawText(ctx, 'POS', right, MARGIN, { ...style, color: UI.gold });
        const lap = Math.max(1, Math.min(race.player.lap, race.track.laps));
        const below = MARGIN + LINE * 3 + GAP + 1;
        drawText(ctx, `LAP ${lap}/${race.track.laps}`, MARGIN, below, style);
        drawText(ctx, formatTime(race.lapTime), MARGIN, below + LINE + GAP, style);
        if (race.player.car.draft > 0.25) {
            const blinkOn = Math.floor(race.time * 6) % 2 === 0;
            drawText(ctx, 'SLIPSTREAM', MARGIN, below + (LINE + GAP) * 2, { ...style, color: blinkOn ? UI.cyan : UI.cream });
        }
    }

    /** @param {number} height the bottom the speed and the health bar stand on */
    #speed(ctx, height, car) {
        const style = { color: car.offRoad ? UI.gold : UI.cream, outline: UI.ink };
        const speed = String(car.kmh).padStart(3, ' ');
        const top = height - MARGIN - LINE * 2 - HEALTH.height - 4;
        drawText(ctx, speed, MARGIN, top, { ...style, scale: 2 });
        drawText(ctx, 'KM/H', MARGIN + textWidth(speed, 2) + GAP, top + LINE, { color: UI.dim, outline: UI.ink });
        // the car's health
        const share = car.health / car.stats.health;
        const y = height - MARGIN - HEALTH.height;
        ctx.fillStyle = UI.ink;
        ctx.fillRect(MARGIN - 1, y - 1, HEALTH.width + 2, HEALTH.height + 2);
        ctx.fillStyle = '#3a2a4e';
        ctx.fillRect(MARGIN, y, HEALTH.width, HEALTH.height);
        ctx.fillStyle = healthColor(share);
        ctx.fillRect(MARGIN, y, Math.round(HEALTH.width * share), HEALTH.height);
    }

    #nitroButton(ctx, button, car, clock) {
        const ready = car.nitro > 0 && !car.boosting;
        const sink = this.#isPressed('nitro', clock) ? 1 : 0;
        let fill = ready ? '#8a1c3a' : '#2a2440';
        if (car.boosting) fill = Math.floor(clock * 12) % 2 ? '#ff7a2a' : '#e8303c';
        panel(ctx, button.x, button.y + sink, button.w, button.h, { fill, edge: ready ? UI.gold : UI.edge });
        ctx.drawImage(this.#icons.nitro[2], button.x + 6, button.y + 2 + sink);
        // one pip per charge
        for (let i = 0; i < car.nitro; i++) {
            ctx.fillStyle = UI.ink;
            ctx.fillRect(button.x + 3 + i * 5, button.y + button.h - 6 + sink, 4, 4);
            ctx.fillStyle = UI.gold;
            ctx.fillRect(button.x + 4 + i * 5, button.y + button.h - 5 + sink, 2, 2);
        }
        if (this.#keyboard) {
            const label = 'SPACE';
            drawText(ctx, label, button.x + Math.round((button.w - textWidth(label)) / 2), button.y + button.h + 2, { color: UI.dim, outline: UI.ink });
        }
    }

    /** Held, it sinks and lights up with the car's brake lights. */
    #brakeButton(ctx, button, car) {
        const held = car.braking;
        const sink = held ? 1 : 0;
        panel(ctx, button.x, button.y + sink, button.w, button.h, { fill: held ? '#8a1c3a' : '#2a2440', edge: held ? UI.red : UI.edge });
        const label = 'BRAKE';
        drawText(ctx, label, button.x + Math.round((button.w - textWidth(label)) / 2), button.y + Math.round(button.h / 2) - 3 + sink, {
            color: held ? UI.cream : UI.dim,
            outline: UI.ink,
        });
    }

    #pauseButton(ctx, button, clock) {
        const sink = this.#isPressed('pause', clock) ? 1 : 0;
        panel(ctx, button.x, button.y + sink, button.w, button.h, { fill: UI.panelLight });
        ctx.fillStyle = UI.cream;
        ctx.fillRect(button.x + 4, button.y + 4 + sink, 2, 6);
        ctx.fillRect(button.x + 8, button.y + 4 + sink, 2, 6);
    }
}
