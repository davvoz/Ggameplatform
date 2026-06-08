import { GameConfig } from '../config/GameConfig.js';
import { clamp, signOf } from '../core/MathUtils.js';

/**
 * Stateless arcade physics. It mutates a car's kinematic state from a control
 * input but is completely independent of WHO produced that input (player, AI,
 * network) — so one shared instance serves every car (SRP + reuse).
 */
export class CarPhysics {
    /**
     * Advance a car by one step.
     * @param {import('../entities/Car.js').Car} car
     * @param {{throttle:number, brake:number, steer:number}} control
     * @param {number} dt seconds
     * @param {boolean} onRoad whether the car is on tarmac
     */
    update(car, control, dt, onRoad) {
        const speed = this._longitudinal(car, control, dt, onRoad);
        this._steerAndMove(car, control, speed, dt);
    }

    /**
     * Integrate speed from engine, brakes and resistances.
     * @returns {number} new speed (world u/s)
     */
    _longitudinal(car, control, dt, onRoad) {
        const P = GameConfig.PHYSICS;
        const m = car.model;
        const accelEff = m.acceleration * (P.REF_MASS / m.mass);
        let s = car.speed;

        if (control.throttle > 0) s += accelEff * control.throttle * dt;
        if (control.brake > 0) {
            s -= (s > 0.01 ? P.BRAKE_DECEL : accelEff * 0.5) * control.brake * dt;
        }
        s -= s * P.DRAG * dt;
        if (control.throttle === 0 && control.brake === 0) {
            const r = P.ROLL_RESIST * dt;
            s = Math.abs(s) <= r ? 0 : s - signOf(s) * r;
        }
        if (!onRoad) s *= P.GRASS_DAMP;

        const cap = onRoad ? m.maxSpeed : P.GRASS_MAX_SPEED;
        return clamp(s, -P.MAX_REVERSE, cap);
    }

    /**
     * Apply steering (speed-dependent) and move along the heading.
     */
    _steerAndMove(car, control, speed, dt) {
        const P = GameConfig.PHYSICS;
        const steerRate = P.STEER_RATE * (0.6 + 0.4 * car.model.grip);
        const turnFactor = clamp(Math.abs(speed) / P.TURN_SPEED_REF, 0, 1);
        car.heading += control.steer * steerRate * signOf(speed || 1) * turnFactor * dt;
        car.speed = speed;
        car.x += Math.sin(car.heading) * speed * dt;
        car.z += Math.cos(car.heading) * speed * dt;
    }
}
