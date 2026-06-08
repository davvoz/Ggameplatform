import { CarController } from './CarController.js';
import { GameConfig } from '../config/GameConfig.js';
import { clamp, wrapAngle } from '../core/MathUtils.js';

/**
 * Simple waypoint-following AI. It aims at a centerline sample ahead of the
 * car's current track position, steers toward it and eases the throttle in
 * corners. It reads `car.segmentIndex` (kept up to date by RaceManager) and
 * never touches physics directly.
 */
export class AICarController extends CarController {
    /**
     * @param {number} skill throttle scaler in ~[0.9, 1.0] for field variety
     */
    constructor(skill) {
        super();
        this._skill = skill;
    }

    /**
     * @param {import('../entities/Car.js').Car} car
     * @param {import('../domain/Track.js').Track} track
     * @returns {{throttle:number, brake:number, steer:number}}
     */
    sample(car, track) {
        const cfg = GameConfig.AI;
        const aimDiff = this._angleTo(car, track, cfg.LOOKAHEAD);
        const farDiff = this._angleTo(car, track, cfg.LOOKAHEAD * 2);
        const sharp = Math.max(Math.abs(aimDiff), Math.abs(farDiff));

        this._control.steer = clamp(aimDiff / cfg.STEER_BAND, -1, 1);
        this._control.throttle = clamp(1 - sharp * cfg.THROTTLE_CUT, cfg.MIN_THROTTLE, 1) * this._skill;
        this._control.brake = sharp > cfg.BRAKE_THRESHOLD ? cfg.BRAKE_AMOUNT : 0;
        return this._control;
    }

    /**
     * Signed heading error toward a waypoint `ahead` samples in front.
     * @param {import('../entities/Car.js').Car} car
     * @param {import('../domain/Track.js').Track} track
     * @param {number} ahead
     * @returns {number} radians
     */
    _angleTo(car, track, ahead) {
        const target = track.pointAt(car.segmentIndex + ahead);
        const desired = Math.atan2(target.x - car.x, target.z - car.z);
        return wrapAngle(desired - car.heading);
    }
}
