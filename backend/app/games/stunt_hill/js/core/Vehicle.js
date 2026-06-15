/**
 * Vehicle — vehicle physics + trick evaluation (1:1 port of the prototype).
 *
 * State:
 *   - this.car : physical state (pos, vel, angle, angular velocity, wheels, flip timer)
 *   - this.run : run state (trick score, combo, boost, air tracking)
 *   - this.crashed : true during the "CRASHED" window before respawn
 *
 * No DOM access: tricks surface via the `onTrick(text)` callback.
 */
import { CONFIG } from '../config/GameConfig.js';
import {
  terrainHeight, terrainSlope,
  tunnelList, roofTopAt, roofSlopeAt, roofUnderAt, roofUnderSlopeAt,
  perchList, perchTopAt, perchSlopeAt, perchUnderAt, perchUnderSlopeAt,
  loopList, loopBaseAt, cannonList, cannonBaseY, gravityScale, gripScale, dragScale,
} from './Terrain.js';
import { carStats } from '../config/cars.js';
import { rot } from './utils.js';

export class Vehicle {
  constructor() {
    // Moment of inertia of a rectangle
    this.I0 = (CONFIG.mass * (CONFIG.bodyW * CONFIG.bodyW + CONFIG.bodyH * CONFIG.bodyH) / 12) * CONFIG.inertiaScale;
    // Suspension mounts (local to the chassis, y-up: below = negative)
    this.anchors = [
      { x: -CONFIG.axle, y: -CONFIG.wheelDrop }, // rear
      { x:  CONFIG.axle, y: -CONFIG.wheelDrop }, // front
    ];

    this.onTrick = null;  // (text) => void
    this.onCrash = null;  // () => void  (the match controller decides respawn vs game over)
    this.onCannon = null; // () => void  (fired at the BOOM — FX hook)

    this.car = { x: 0, y: 0, vx: 0, vy: 0, a: 0, w: 0, wheelSpin: [0, 0], flipTimer: 0, stuckTimer: 0 };
    this.run = {
      trickScore: 0, multiplier: 1, comboTimer: 0, boost: 0, bestScore: 0,
      wasGrounded: true, airTime: 0, airRot: 0,
    };
    this.crashed = false;
    this._respawning = false;
    this._loop = null;     // active loop-the-loop ride { l, phi, speed }
    this._loopCd = 0;      // re-entry cooldown after a loop
    this._cannon = null;   // active cannon ride { cn, t }
    this._cannonCd = 0;    // re-entry cooldown after a shot

    this.reset(0, true);
  }

  reset(atX, full = false) {
    const c = this.car;
    c.x = atX;
    c.y = terrainHeight(atX) + 1.4;
    c.vx = c.vy = 0;
    c.a = 0; c.w = 0;
    c.flipTimer = 0;
    c.stuckTimer = 0;
    this.crashed = false;
    this._respawning = false;
    this._loop = null;
    this._loopCd = 0;
    this._cannon = null;
    this._cannonCd = 0;
    // reset air + combo state; the score only clears on a manual reset (R)
    this.run.wasGrounded = true; this.run.airTime = 0; this.run.airRot = 0;
    this.run.multiplier = 1; this.run.comboTimer = 0;
    if (full) { this.run.trickScore = 0; this.run.boost = 0; }
  }

  _applyForce(acc, fx, fy, px, py) {
    acc.fx += fx; acc.fy += fy;
    const rx = px - this.car.x, ry = py - this.car.y;
    acc.tq += rx * fy - ry * fx;
  }

  /**
   * Wheel (circle) vs one surface (ground heightfield or tunnel roof top).
   * `oneWay` surfaces (roofs) only catch the wheel from above: skipped when the
   * wheel center is below the SLAB (underY: the solid belly — hard landings can
   * sink deep into the slab and must still be pushed back up, never through).
   * Applies suspension support + engine/brake traction. Returns true on contact.
   */
  _wheelContact(acc, cx, cy, gy, m, input, speedFwd, oneWay, underY = null) {
    const car = this.car;
    const r = CONFIG.wheelRadius;
    if (oneWay && cy < (underY != null ? underY : gy - 0.05)) return false; // truly underneath → no contact
    const inv = 1 / Math.hypot(m, 1);
    const nx = -m * inv, ny = inv;       // surface normal (pointing up)
    const tnx = inv, tny = m * inv;      // tangent (toward +x / uphill)
    const pen = r - (cy - gy) * ny;      // >0 = the wheel penetrates the surface
    if (pen <= 0) return false;
    // wheel center velocity (v + ω × r)
    const rx = cx - car.x, ry = cy - car.y;
    const vcx = car.vx - car.w * ry, vcy = car.vy + car.w * rx;
    const vn = vcx * nx + vcy * ny;      // <0 = moving into the surface
    if (oneWay && vn > 0.5) return false;          // rising through it → don't catch
    let Fn = CONFIG.suspK * Math.min(2.5, pen) - CONFIG.suspDamp * vn;
    if (Fn < 0) Fn = 0;
    this._applyForce(acc, nx * Fn, ny * Fn, cx, cy); // support along the normal

    // engine: traction along the surface TANGENT → climbs hills / drives decks.
    // gripScale < 1 (ice) weakens drive AND brake; the active CAR scales accel/
    // top-speed/grip too (deterministic sidegrade stats → ranked-safe).
    const grip = gripScale(), cs = carStats();
    const vmax = CONFIG.maxSpeed * cs.maxSpeed;
    if (input > 0) {
      const f = Math.min(1, Math.max(0, 1 - speedFwd / vmax));
      const drive = CONFIG.engineForce * f * grip * cs.accel;
      this._applyForce(acc, tnx * drive, tny * drive, cx, cy);
    } else if (input < 0) {
      const f = Math.min(1, Math.max(0, 1 + speedFwd / (vmax * 0.6)));
      const brake = CONFIG.reverseForce * f * grip * cs.grip;
      this._applyForce(acc, -tnx * brake, -tny * brake, cx, cy);
    }
    return true;
  }

  /**
   * Wheel vs a SOLID UNDERSIDE (platform belly / tunnel ceiling): pushes the
   * wheel back DOWN when it hits the slab from below. No traction.
   */
  _ceilingContact(acc, cx, cy, uy, m) {
    const car = this.car, r = CONFIG.wheelRadius;
    if (cy > uy) return false;                 // not below the slab
    const inv = 1 / Math.hypot(m, 1);
    const nx = m * inv, ny = -inv;             // outward normal (pointing down)
    const pen = r - (uy - cy) * inv;           // wheel overlaps the underside
    if (pen <= 0) return false;
    const rx = cx - car.x, ry = cy - car.y;
    const vcx = car.vx - car.w * ry, vcy = car.vy + car.w * rx;
    const vn = vcx * nx + vcy * ny;            // <0 = moving up into the slab
    let Fn = CONFIG.bodyK * Math.min(0.5, pen) - CONFIG.bodyDamp * vn;
    if (Fn < 0) Fn = 0;
    this._applyForce(acc, nx * Fn, ny * Fn, cx, cy);
    return true;
  }

  /** Chassis corner vs a solid underside (mirror of the one-way floor case). */
  _cornerCeiling(acc, px, py, uy, m) {
    const car = this.car;
    const pen = py - uy;
    if (pen <= 0 || pen > 0.45) return false;  // way past it → came from above
    const inv = 1 / Math.hypot(m, 1);
    const nx = m * inv, ny = -inv;
    const rx = px - car.x, ry = py - car.y;
    const avx = car.vx - car.w * ry, avy = car.vy + car.w * rx;
    const vn = avx * nx + avy * ny;
    let nF = CONFIG.bodyK * Math.min(pen, 0.45) - CONFIG.bodyDamp * vn;
    if (nF < 0) nF = 0;
    this._applyForce(acc, nx * nF, ny * nF, px, py);
    return true;
  }

  /**
   * Chassis corner (point) vs one surface. One-way roofs catch the corner
   * anywhere INSIDE the slab (down to underY) — only below it they let pass.
   */
  _cornerContact(acc, px, py, gy, sl, oneWay, underY = null) {
    const car = this.car;
    const pen = gy - py;
    if (pen <= 0) return false;
    if (oneWay && (underY != null ? py < underY : pen > 0.45)) return false; // below the slab → pass through
    const nlen = Math.hypot(-sl, 1);
    const nx = -sl / nlen, ny = 1 / nlen;          // surface normal
    const rx = px - car.x, ry = py - car.y;
    const avx = car.vx - car.w * ry, avy = car.vy + car.w * rx;
    const vn = avx * nx + avy * ny;
    if (oneWay && vn > 0.5) return false;
    const penC = Math.min(pen, 0.6);               // clamp penetration → no explosive forces
    let nF = CONFIG.bodyK * penC - CONFIG.bodyDamp * vn;
    if (nF < 0) nF = 0;
    this._applyForce(acc, nx * nF, ny * nF, px, py);
    // tangential friction (Coulomb: capped by the normal force; ice → low grip)
    const tx = -ny, ty = nx;
    const vt = avx * tx + avy * ty;
    let fF = -vt * CONFIG.mass;
    const fMax = CONFIG.bodyFriction * nF * gripScale() * carStats().grip;
    if (fF > fMax) fF = fMax;
    if (fF < -fMax) fF = -fMax;
    this._applyForce(acc, tx * fF, ty * fF, px, py);
    return true;
  }

  /**
   * Advance the simulation by dt seconds.
   * @param {number} dt
   * @param {number} input  -1 brake/reverse · 0 · +1 gas
   * @param {boolean} boostingHeld  true while the player holds boost
   */
  step(dt, input, boostingHeld) {
    if (this.crashed) return;
    const car = this.car, run = this.run;

    // ── loop-the-loop: a scripted, deterministic 360° ride ──────────────────
    if (this._loopCd > 0) this._loopCd -= dt;
    if (!this._loop && run.wasGrounded && this._loopCd <= 0) {
      for (const l of loopList()) {
        if (Math.abs(car.x - l.x) < 1.0 && car.vx > l.minSpeed
            && Math.abs(car.y - (loopBaseAt(l) + 1.0)) < 2.0) {
          this._loop = { l, phi: 0, speed: Math.hypot(car.vx, car.vy) };
          break;
        }
      }
    }
    if (this._loop) { this._loopStep(dt); return; }

    // ── cannon: sucked into the barrel, short charge, BOOM ──────────────────
    if (this._cannonCd > 0) this._cannonCd -= dt;
    if (!this._cannon && run.wasGrounded && this._cannonCd <= 0) {
      for (const cn of cannonList()) {
        if (Math.abs(car.x - cn.x) < 1.3 && car.vx > 2
            && Math.abs(car.y - (cannonBaseY(cn) + 1.0)) < 2.2) {
          this._cannon = { cn, t: 0 };
          break;
        }
      }
    }
    if (this._cannon) { this._cannonStep(dt); return; }

    const acc = { fx: 0, fy: 0, tq: 0 };

    // gravity (per-map scale: MOONLIGHT floats)
    acc.fy -= CONFIG.mass * CONFIG.gravity * gravityScale();

    const down = rot(0, -1, car.a);
    const fwd = rot(1, 0, car.a);
    const speedFwd = car.vx * fwd.x + car.vy * fwd.y;

    let anyGrounded = false;   // a wheel touches the ground
    let bodyGrounded = false;  // the chassis body (incl. roof) touches the ground

    for (let i = 0; i < 2; i++) {
      const la = this.anchors[i];
      const aw = rot(la.x, la.y, car.a);
      const ax = car.x + aw.x, ay = car.y + aw.y;

      const L = CONFIG.suspRest;

      // Wheel center hanging along the chassis "down" axis
      const cx = ax + down.x * L;
      const cy = ay + down.y * L;

      // ground (always two-sided) + tunnel roofs: drivable on top (one-way,
      // active through the WHOLE slab thickness so hard landings can't punch
      // through) and SOLID from inside the bore (you bump your head)
      if (this._wheelContact(acc, cx, cy, terrainHeight(cx), terrainSlope(cx), input, speedFwd, false)) anyGrounded = true;
      for (const t of tunnelList()) {
        if (cx < t.a || cx > t.b) continue;
        const u = roofUnderAt(t, cx);
        if (this._wheelContact(acc, cx, cy, roofTopAt(t, cx), roofSlopeAt(t, cx), input, speedFwd, true, u)) anyGrounded = true;
        this._ceilingContact(acc, cx, cy, u, roofUnderSlopeAt(t, cx));
      }
      for (const p of perchList()) {
        if (cx < p.x0 || cx > p.x1) continue;
        const u = perchUnderAt(p, cx);
        if (this._wheelContact(acc, cx, cy, perchTopAt(p, cx), perchSlopeAt(p, cx), input, speedFwd, true, u)) anyGrounded = true;
        this._ceilingContact(acc, cx, cy, u, perchUnderSlopeAt(p, cx));
      }

      // visual wheel spin ~ forward speed
      car.wheelSpin[i] += (speedFwd / CONFIG.wheelRadius) * dt;
    }

    // chassis-corner collision with the surfaces (landings / roll-overs)
    const hw = CONFIG.bodyW / 2, hh = CONFIG.bodyH / 2;
    const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    for (const [lx, ly] of corners) {
      const cw = rot(lx, ly, car.a);
      const px = car.x + cw.x, py = car.y + cw.y;
      if (this._cornerContact(acc, px, py, terrainHeight(px), terrainSlope(px), false)) bodyGrounded = true;
      for (const t of tunnelList()) {
        if (px < t.a || px > t.b) continue;
        const u = roofUnderAt(t, px);
        if (this._cornerContact(acc, px, py, roofTopAt(t, px), roofSlopeAt(t, px), true, u)) bodyGrounded = true;
        this._cornerCeiling(acc, px, py, u, roofUnderSlopeAt(t, px));
      }
      for (const p of perchList()) {
        if (px < p.x0 || px > p.x1) continue;
        const u = perchUnderAt(p, px);
        if (this._cornerContact(acc, px, py, perchTopAt(p, px), perchSlopeAt(p, px), true, u)) bodyGrounded = true;
        this._cornerCeiling(acc, px, py, u, perchUnderSlopeAt(p, px));
      }
    }

    // --- Tricks: track rotation/time in the air and evaluate on landing ---
    if (run.wasGrounded && !anyGrounded) { run.airTime = 0; run.airRot = 0; }
    if (!anyGrounded) { run.airTime += dt; run.airRot += car.w * dt; }
    if (!run.wasGrounded && anyGrounded) {
      // "flip": just need to clear ~half a turn and land not on the roof (rounded, no exact 360°)
      const flips = Math.round(Math.abs(run.airRot) / (Math.PI * 2));
      const upright = Math.cos(car.a) > CONFIG.landUprightCos;
      if (flips >= 1 && upright) {
        const base = flips * CONFIG.trickPerFlip + Math.floor(run.airTime * CONFIG.trickPerAirSec);
        const dir = run.airRot > 0 ? 'BACKFLIP' : 'FRONTFLIP';
        run.boost = Math.min(CONFIG.maxBoost,
          run.boost + flips * CONFIG.boostPerFlip + run.airTime * CONFIG.boostPerAirSec);
        this._scoreTrick(run, `${dir}${flips > 1 ? ' x' + flips : ''}`, base);
      } else if (upright && run.airTime >= CONFIG.bigAirTime) {
        // long air without a flip still counts as a trick
        const base = Math.round(CONFIG.bigAirPoints + run.airTime * CONFIG.trickPerAirSec);
        run.boost = Math.min(CONFIG.maxBoost, run.boost + run.airTime * CONFIG.boostPerAirSec);
        this._scoreTrick(run, 'BIG AIR', base);
      } else if (flips >= 1 && !upright) {
        this._emitTrick('BAD LANDING!');
      } else if (Math.abs(run.airRot) > Math.PI * 0.6) {
        this._emitTrick(`INCOMPLETE FLIP ${Math.round(Math.abs(run.airRot) / Math.PI * 180)}°`);
      }
    }
    run.wasGrounded = anyGrounded;

    // combo window: while ON THE GROUND it counts down; chain another trick to keep
    // it alive, otherwise it resets. Frozen while airborne (you're mid-trick).
    if (anyGrounded && run.comboTimer > 0) {
      run.comboTimer -= dt;
      if (run.comboTimer <= 0) { run.comboTimer = 0; run.multiplier = 1; }
    }

    // air control → back flip (gas) / front flip (brake)
    if (!anyGrounded && input !== 0) {
      acc.tq += input * CONFIG.airControl * this.I0; // *I0 → airControl in rad/s² independent of inertia
    }

    // boost / nitro → extra forward thrust (ignores maxSpeed), drains the bar
    if (boostingHeld && run.boost > 0) {
      run.boost = Math.max(0, run.boost - CONFIG.boostDrain * dt);
      const bf = CONFIG.boostForce * carStats().boost;
      acc.fx += fwd.x * bf;
      acc.fy += fwd.y * bf;
    }

    // resistances (dragScale < 1 = ice glide · > 1 = sand bog)
    const rd = CONFIG.rollDrag * dragScale();
    acc.fx -= rd * car.vx;
    acc.fy -= rd * car.vy * 0.2;
    acc.tq -= CONFIG.angularDamp * car.w * this.I0 * (anyGrounded ? 1 : 0.12); // near-zero in the air → flips spin

    // integration
    car.vx += (acc.fx / CONFIG.mass) * dt;
    car.vy += (acc.fy / CONFIG.mass) * dt;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    car.w += (acc.tq / this.I0) * dt;
    car.w = Math.max(-30, Math.min(30, car.w)); // clamp spin for stability
    car.a += car.w * dt;

    // safety net: if the state diverges (NaN / absurd values) → clean reset
    if (!isFinite(car.x) || !isFinite(car.y) || !isFinite(car.a) || Math.hypot(car.vx, car.vy) > 150) {
      this.reset(Math.max(0, (isFinite(car.x) ? car.x : 0) - 3));
      return;
    }

    // crash when rolled over with the body on the ground (flips are free in the air)…
    if (bodyGrounded && Math.cos(car.a) < CONFIG.flipCosThresh) {
      car.flipTimer += dt;
    } else {
      car.flipTimer = Math.max(0, car.flipTimer - dt * 2);
    }
    // …or when STALLED on the body with the wheels off any surface (nose-stand /
    // side-stand): a stable pose the engine can't escape → treat as a crash.
    if (bodyGrounded && !anyGrounded && Math.hypot(car.vx, car.vy) < 2.5) {
      car.stuckTimer += dt;
    } else {
      car.stuckTimer = Math.max(0, car.stuckTimer - dt * 2);
    }
    if ((car.flipTimer > CONFIG.flipTime || car.stuckTimer > 1.6) && !this._respawning) {
      this.crashed = true;
      this._respawning = true;
      run.multiplier = 1; // crashing resets the combo
      if (this.onCrash) this.onCrash();
    }
  }

  /** Advance the scripted loop ride: car center follows the inner circle. */
  _loopStep(dt) {
    const L = this._loop, car = this.car, run = this.run;
    const rp = L.l.r - 1.0;                      // car-center path radius
    L.phi += (L.speed / rp) * dt;
    const done = L.phi >= Math.PI * 2;
    const phi = done ? Math.PI * 2 : L.phi;
    const cy = loopBaseAt(L.l) + 1.0 + rp;       // circle center of the car path
    car.x = L.l.x + rp * Math.sin(phi);
    car.y = cy - rp * Math.cos(phi);
    car.a = phi;                                  // nose follows the tangent
    car.vx = L.speed * Math.cos(phi);
    car.vy = L.speed * Math.sin(phi);
    car.w = L.speed / rp;
    run.wasGrounded = true;                       // riding a track, not airborne
    if (done) {
      car.a = 0; car.w = 0; car.vy = 0; car.vx = L.speed;
      this._loop = null;
      this._loopCd = 1.5;
      run.boost = Math.min(CONFIG.maxBoost, run.boost + 25);
      this._scoreTrick(run, 'LOOP THE LOOP', 400);
    }
  }

  /** Cannon ride: held in the barrel while charging, then launched ballistic. */
  _cannonStep(dt) {
    const C = this._cannon, car = this.car, cn = C.cn;
    C.t += dt;
    const bx = cn.x, by = cannonBaseY(cn) + 1.3;
    if (C.t < 0.5) {
      // inside the barrel, aligned with it (the renderer hides the car behind the cannon)
      car.x = bx; car.y = by;
      car.a = cn.angle; car.w = 0;
      car.vx = 0; car.vy = 0;
      this.run.wasGrounded = true;
    } else {
      car.x = bx + Math.cos(cn.angle) * 1.6;
      car.y = by + Math.sin(cn.angle) * 1.6;
      car.a = cn.angle; car.w = 0;
      car.vx = cn.power * Math.cos(cn.angle);
      car.vy = cn.power * Math.sin(cn.angle);
      this.run.wasGrounded = true;          // air time starts fresh next step
      this._cannon = null;
      this._cannonCd = 2.0;
      if (this.onCannon) this.onCannon();
    }
  }

  /** Award a landed trick: points × current multiplier, refresh combo, then grow it. */
  _scoreTrick(run, label, base) {
    const gained = Math.round(base * run.multiplier);
    run.trickScore += gained;
    run.comboTimer = CONFIG.comboWindow;
    this._emitTrick(`${label}  +${gained}  (x${run.multiplier})`);
    run.multiplier = Math.min(CONFIG.maxMultiplier, run.multiplier + 1);
  }

  _emitTrick(text) {
    if (typeof this.onTrick === 'function') this.onTrick(text);
  }
}
