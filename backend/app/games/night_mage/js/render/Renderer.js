import { WORLD } from '../config/Tuning.js';
import { drawCurtain } from './CurtainArt.js';
import { jitter } from './jitter.js';
import { Viewport } from './Viewport.js';

const BAR = '#07040e';

/**
 * Puts a frame on the canvas: the arena (world view, effects, weather), the
 * HUD and whatever screen is up. Owns the canvas and the viewport.
 */
export class Renderer {
    #canvas;
    #ctx;
    #parts;
    /** Seconds since start, for what blinks on its own (the curtain's stars). */
    #time = 0;
    viewport = new Viewport();

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {{world: import('./WorldView.js').WorldView, effects: import('./Effects.js').Effects, weather: import('./Weather.js').Weather,
     *          hud: import('./Hud.js').Hud, screens: import('./Screens.js').Screens, demo: import('./TitleDemo.js').TitleDemo,
     *          sight: import('./SightArt.js').SightArt}} parts
     */
    constructor(canvas, parts) {
        this.#canvas = canvas;
        this.#ctx = canvas.getContext('2d');
        this.#parts = parts;
    }

    get effects() {
        return this.#parts.effects;
    }

    get weather() {
        return this.#parts.weather;
    }

    get hud() {
        return this.#parts.hud;
    }

    resize(cssWidth, cssHeight, pixelRatio) {
        this.viewport.fit(cssWidth, cssHeight, pixelRatio);
        this.#canvas.width = this.viewport.width;
        this.#canvas.height = this.viewport.height;
    }

    toWorld(cssX, cssY) {
        return this.viewport.toWorld(cssX, cssY);
    }

    update(dt, sim) {
        const { world, effects, weather, hud, screens } = this.#parts;
        this.#time += dt;
        world.update(dt);
        effects.update(dt);
        weather.update(dt);
        screens.update(dt);
        if (sim) hud.update(dt, sim);
    }

    #begin() {
        const ctx = this.#ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = BAR;
        ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
        const { shake } = this.#parts.effects;
        this.viewport.apply(ctx, jitter(-0.5, 0.5) * shake, jitter(-0.5, 0.5) * shake);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, WORLD.width, WORLD.height);
        ctx.clip();
        return ctx;
    }

    #end(ctx) {
        ctx.restore();
    }

    /** The title: the scene, the idle mage, the rules played by example. */
    drawTitle(mapSpec, mage, model) {
        const { world, weather, screens, demo } = this.#parts;
        return this.#framed((ctx) => {
            world.drawStill(ctx, mapSpec, mage);
            weather.draw(ctx);
            const area = this.viewport.visible;
            const buttons = screens.drawTitle(ctx, { ...model, area });
            demo.draw(ctx, { mage, ground: model.ground }, area.top + 148, model.time);
            return buttons;
        });
    }

    /**
     * The fight, with an optional screen on top.
     * @param {import('../sim/Simulation.js').Simulation} sim
     * @param {object} mapSpec
     * @param {{countdown?: number, paused?: boolean, banner?: {wave: number, age: number, scene?: string},
     *          herald?: {invader: object, age: number}, result?: object}} overlay
     */
    drawPlay(sim, mapSpec, overlay = {}) {
        const { world, effects } = this.#parts;
        return this.#framed((ctx) => {
            const area = this.viewport.visible;
            world.draw(ctx, sim, mapSpec);
            this.#layers(ctx, sim);
            if (effects.hurtFlash > 0) this.#hurtFlash(ctx, effects.hurtFlash);
            return overlay.result
                ? this.#parts.screens.drawResult(ctx, { ...overlay.result, area })
                : this.#fightScreens(ctx, sim, overlay, area);
        });
    }

    /**
     * The effects and the weather over the world; between two scenes the
     * curtain goes over the weather and the effects over the curtain, so the
     * wave's last words and sparks show whole on the dark.
     */
    #layers(ctx, sim) {
        const { effects, weather } = this.#parts;
        if (!sim.journey) {
            effects.draw(ctx);
            weather.draw(ctx);
            return;
        }
        weather.draw(ctx);
        drawCurtain(ctx, sim.journey, sim.mage.chest, this.#time);
        effects.draw(ctx);
    }

    /** Runs a frame's drawing; the canvas state comes back even if the drawing breaks halfway. */
    #framed(draw) {
        const ctx = this.#begin();
        try {
            return draw(ctx);
        } finally {
            this.#end(ctx);
        }
    }

    /** What lies over the fight: HUD, banners, countdown, the powers' cards, the pause. @returns the buttons */
    #fightScreens(ctx, sim, overlay, area) {
        const { hud, screens } = this.#parts;
        // the powers' cards take the whole screen: no HUD under them
        let buttons = sim.offer ? [] : hud.draw(ctx, sim, area);
        if (overlay.banner) {
            screens.drawWaveBanner(ctx, overlay.banner.wave, overlay.banner.age, area);
            if (overlay.banner.scene) screens.drawSceneName(ctx, overlay.banner.scene, overlay.banner.age, area);
        }
        if (overlay.herald) screens.drawInvaderBanner(ctx, overlay.herald, area);
        if (typeof overlay.countdown === 'number') screens.drawCountdown(ctx, overlay.countdown, area);
        if (sim.offer && overlay.offer) buttons = screens.drawOffer(ctx, { choices: sim.offer, boons: sim.boons, show: overlay.offer }, area);
        if (overlay.paused) buttons = screens.drawPause(ctx, area);
        return buttons;
    }

    /** The mouse's sight over the frame just drawn (no shake: it follows the hand, not the arena). */
    drawSight(sight) {
        const ctx = this.#ctx;
        this.viewport.apply(ctx);
        this.#parts.sight.draw(ctx, sight);
    }

    #hurtFlash(ctx, amount) {
        const gradient = ctx.createRadialGradient(480, 270, 200, 480, 270, 560);
        gradient.addColorStop(0, 'rgba(255,0,40,0)');
        gradient.addColorStop(1, `rgba(255,0,40,${0.45 * amount})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
}
