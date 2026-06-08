import { IState } from '../core/IState.js';
import { Hud } from '../ui/Hud.js';
import { RaceEndState } from './RaceEndState.js';

/**
 * Active race. Order per frame is fixed and important: race progress is updated
 * first (so onRoad/segmentIndex are current for AI and physics), then cars
 * integrate, then the camera follows and the throttled HUD refreshes.
 */
export class RaceState extends IState {
    enter() {
        this._hud = new Hud(this.ctx.ui, this.ctx.input);
        this._hudTimer = 0;
        this._lastLap = 0;
    }

    update(dt) {
        const race = this.ctx.session.race;
        const rm = race.raceManager;

        rm.updateProgress(dt);
        if (rm.finished) {
            this.ctx.session.result = rm.result;
            this.ctx.go(new RaceEndState(this.ctx));
            return;
        }

        for (const car of race.cars) car.update(dt, race.track);
        race.chaseCamera.follow(this.ctx.renderer.camera, race.player, dt);
        this._tickHud(dt, rm, race);
        this._maybeSendScore(rm, race.cars.length);
    }

    exit() {
        this._hud.dispose();
        this.ctx.input.reset();
    }

    _tickHud(dt, rm, race) {
        this._hudTimer += dt;
        const interval = 1 / this.ctx.config.DISPLAY.HUD_HZ;
        if (this._hudTimer < interval) return;
        this._hudTimer = 0;
        this._hud.update({
            speed: race.player.speedKmh(),
            lap: rm.playerLap(),
            laps: this.ctx.config.RACE.LAPS,
            position: rm.playerPosition(),
            total: race.cars.length,
            time: rm.raceTime,
        });
    }

    _maybeSendScore(rm, total) {
        const lap = rm.playerLap();
        if (lap === this._lastLap) return;
        this._lastLap = lap;
        const provisional = (total - rm.playerPosition() + 1) * 100 * lap;
        this.ctx.bridge.sendScore(provisional, { lap, position: rm.playerPosition() });
    }
}
