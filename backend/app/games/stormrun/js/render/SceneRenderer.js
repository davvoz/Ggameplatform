import { RAINBOW } from '../config/Palette.js';
import { Strings } from '../config/Strings.js';
import { BiomeTrack } from './BiomeTrack.js';
import { Camera } from './Camera.js';
import { BlobArt } from './art/BlobArt.js';
import { bakeDecor, bakeGrain, bakeTag } from './art/DecorArt.js';
import { bakeObstacles } from './art/ObstacleArt.js';
import { bakeDrops } from './art/PickupArt.js';
import { bakeClouds, bakeStormHead, bakeSun, bakeVillage } from './art/SceneryArt.js';
import { HillsLayer, PaperGrainLayer, SkyLayer, SpriteBandLayer } from './layers/BackdropLayers.js';
import { DropLayer, FlagLayer, ObstacleLayer, TrailLayer } from './layers/CourseLayers.js';
import { ConfettiLayer, LabelLayer, RainbowBurstLayer } from './layers/EffectLayers.js';
import { DecorLayer, TerrainLayer } from './layers/GroundLayers.js';
import { HintLayer } from './layers/HintLayer.js';
import { RunnerLayer } from './layers/RunnerLayer.js';
import { StormLayer } from './layers/StormLayer.js';

/**
 * Draws a Simulation and never changes it. The picture is a list of layers, so
 * adding something to the screen means adding a layer, not editing this class.
 */

const MAX_PIXEL_RATIO = 2;

export class SceneRenderer {
    #canvas;
    #ctx;
    #camera = new Camera();
    #biomes = new BiomeTrack();
    #layers;
    #flagLayer = new FlagLayer();
    #hintLayer;
    #time = 0;
    #sim = null;
    #cameraPlaced = false;

    /** @param {HTMLCanvasElement} canvas */
    constructor(canvas) {
        this.#canvas = canvas;
        this.#ctx = canvas.getContext('2d', { alpha: false });
        this.#hintLayer = new HintLayer(bakeTag(Strings.tap), bakeTag(Strings.tapAgain));

        const farHills = new HillsLayer(0.14, 'far', 0.6, 0.07, [3, 7]);
        const nearHills = new HillsLayer(0.3, 'near', 0.73, 0.06, [4, 9]);
        const village = bakeVillage();
        const [bigCloud, smallCloud] = bakeClouds();

        this.#layers = [
            new SkyLayer(bakeSun()),
            new SpriteBandLayer(0.06, [
                { sprite: bigCloud, x: 130 },
                { sprite: smallCloud, x: 520 },
                { sprite: bigCloud, x: 930 },
                { sprite: smallCloud, x: 1330 },
            ], 0.0034, (x, height) => height * (0.14 + (x % 300) / 3000)),
            farHills,
            new SpriteBandLayer(0.14, [
                { sprite: village.cypress, x: 90 },
                { sprite: village.church, x: 240 },
                { sprite: village.tree, x: 410 },
                { sprite: village.windmill, x: 700 },
                { sprite: village.cypress, x: 980 },
                { sprite: village.house, x: 1150 },
                { sprite: village.orangeTree, x: 1400 },
            ], 0.0013, farHills.surfaceAt),
            nearHills,
            new SpriteBandLayer(0.3, [
                { sprite: village.house, x: 120 },
                { sprite: village.tree, x: 210 },
                { sprite: village.sheep, x: 330 },
                { sprite: village.blueHouse, x: 520 },
                { sprite: village.orangeTree, x: 620 },
                { sprite: village.sheep, x: 780 },
                { sprite: village.yellowHouse, x: 930 },
                { sprite: village.cypress, x: 1040 },
                { sprite: village.tree, x: 1200 },
                { sprite: village.sheep, x: 1290 },
                { sprite: village.house, x: 1480 },
            ], 0.0024, nearHills.surfaceAt),
            new TerrainLayer(),
            new DecorLayer(bakeDecor()),
            this.#flagLayer,
            new ObstacleLayer(bakeObstacles()),
            new TrailLayer(RAINBOW),
            new DropLayer(bakeDrops()),
            new RainbowBurstLayer(),
            new RunnerLayer(new BlobArt()),
            new ConfettiLayer(),
            new LabelLayer(bakeTag(Strings.perfect)),
            new StormLayer(bakeStormHead()),
            this.#hintLayer,
            new PaperGrainLayer(bakeGrain()),
        ];
    }

    /** Fit the canvas to its box. */
    resize(width, height) {
        const ratio = Math.min(globalThis.devicePixelRatio || 1, MAX_PIXEL_RATIO);
        this.#canvas.width = Math.round(width * ratio);
        this.#canvas.height = Math.round(height * ratio);
        this.#ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.#camera.resize(width, height);
        for (const layer of this.#layers) layer.resize?.(width, height);
        this.#cameraPlaced = false;
    }

    /** Show a new run. */
    attach(sim) {
        this.#sim = sim;
        this.#cameraPlaced = false;
        for (const layer of this.#layers) layer.reset?.();
    }

    /** @param {{type: string, value: number, x: number, y: number}[]} events */
    handle(events) {
        for (const event of events) {
            for (const layer of this.#layers) layer.onEvent?.(event);
        }
    }

    /** @param {{label: string, metres: number, color: string}[]} flags */
    setFlags(flags) {
        this.#flagLayer.setFlags(flags);
    }

    /** @param {boolean} enabled */
    setHints(enabled) {
        this.#hintLayer.enabled = enabled;
    }

    /**
     * @param {number} dt seconds since the last frame
     * @param {number} alpha progress between the last two ticks, 0..1
     */
    render(dt, alpha) {
        const sim = this.#sim;
        if (!sim) return;
        this.#time += dt;

        const { runner } = sim;
        const runnerX = runner.prevX + (runner.x - runner.prevX) * alpha;
        const runnerY = runner.prevY + (runner.y - runner.prevY) * alpha;
        const { terrain } = sim.course;

        if (this.#cameraPlaced) {
            this.#camera.follow(terrain, runnerX, runnerY, sim.gap, dt);
        } else {
            this.#camera.jump(terrain, runnerX, runnerY, sim.gap);
            this.#cameraPlaced = true;
        }

        const scene = {
            sim,
            camera: this.#camera,
            colors: this.#biomes.at(Math.max(0, sim.metres)),
            time: this.#time,
            dt,
            runnerX,
            runnerY,
        };

        for (const layer of this.#layers) layer.update?.(scene);
        for (const layer of this.#layers) layer.draw(this.#ctx, scene);
    }
}
