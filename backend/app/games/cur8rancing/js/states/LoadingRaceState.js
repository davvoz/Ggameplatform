import { IState } from '../core/IState.js';
import { Track } from '../domain/Track.js';
import { TrackMeshBuilder } from '../rendering/TrackMeshBuilder.js';
import { CarViewFactory } from '../rendering/CarViewFactory.js';
import { Car } from '../entities/Car.js';
import { PlayerCarController } from '../controllers/PlayerCarController.js';
import { AICarController } from '../controllers/AICarController.js';
import { RaceManager } from '../race/RaceManager.js';
import { RaceScene } from '../race/RaceScene.js';
import { el } from '../ui/Dom.js';
import { CountdownState } from './CountdownState.js';

/**
 * Assembles a race: builds the track mesh, loads every car model, instantiates
 * cars with their controllers and places them on the grid. All async work is
 * isolated here so racing states can assume a ready {@link RaceScene}.
 */
export class LoadingRaceState extends IState {
    enter() {
        this._overlay = el('div', 'loading', 'LOADING…');
        this.ctx.ui.appendChild(this._overlay);
        this._disposePreviousRace();
        this._build();
    }

    exit() {
        if (this._overlay) this._overlay.remove();
    }

    _disposePreviousRace() {
        const prev = this.ctx.session.race;
        if (prev) prev.dispose();
        this.ctx.session.race = null;
    }

    async _build() {
        const { config, renderer } = this.ctx;
        const scene = new RaceScene(renderer);
        scene.track = new Track(config);
        scene.addView(TrackMeshBuilder.build(scene.track, config));

        const grid = scene.track.startGrid(1 + config.RACE.OPPONENTS, config.RACE.GRID_SPACING);
        const lineup = this._lineup();
        const cars = await Promise.all(lineup.map((m, i) => this._makeCar(scene, m, i === 0)));

        cars.forEach((car, i) => car.placeAt(grid[i].x, grid[i].z, grid[i].heading));
        scene.cars = cars;
        scene.player = cars[0];
        scene.raceManager = new RaceManager(scene.track, config.RACE.LAPS);
        scene.raceManager.init(cars);

        this.ctx.session.race = scene;
        this.ctx.bridge.resetGameOver();
        this.ctx.go(new CountdownState(this.ctx));
    }

    /** Player car first, then opponents cycling through the rest of the catalog. */
    _lineup() {
        const all = this.ctx.catalog.all();
        const selected = this.ctx.catalog.byId(this.ctx.session.selectedCarId);
        const others = all.filter((c) => c.id !== selected.id);
        const lineup = [selected];
        for (let i = 0; i < this.ctx.config.RACE.OPPONENTS; i++) {
            lineup.push(others[i % others.length]);
        }
        return lineup;
    }

    async _makeCar(scene, model, isPlayer) {
        const instance = await this.ctx.models.load(model.modelUrl);
        const view = CarViewFactory.assemble(instance, model);
        scene.addView(view);
        const controller = isPlayer
            ? new PlayerCarController(this.ctx.input)
            : new AICarController(1 - Math.random() * this.ctx.config.AI.SKILL_SPREAD);
        return new Car(model, view, controller, this.ctx.physics, isPlayer);
    }
}
