import { PlayerTuning as P, View } from '../config/Tuning.js';
import { approach } from '../core/MathX.js';
import { Arsenal } from './Arsenal.js';
import { Body, moveBody } from './Body.js';
import { Btn } from './Buttons.js';
import { Ev } from './Events.js';

/**
 * Nonna. Runs, jumps, crouches, shoots in three directions (eight with the
 * heavy machinegun sweep), smacks with her slipper when someone gets too close
 * and throws explosive meatballs.
 *
 * States: alive, dying, respawn (floating down under her umbrella), out.
 */
export class Player {
    body = new Body();
    facing = 1;
    state = 'alive';
    stateTicks = 0;
    hearts = P.maxHearts;
    lives = P.startLives;
    bombs = P.startBombs;
    crouching = false;
    /** -4 up, 0 forward, 4 down (see Arsenal) */
    aimStep = 0;
    invuln = 0;
    coyote = 0;
    jumpBuffer = 0;
    jumping = false;
    meleeTicks = 0;
    throwTicks = 0;
    recoilTicks = 0;
    bombCooldown = 0;
    /** distance run, for the animation */
    stride = 0;
    /** ticks since landing, for the squash */
    landTicks = 99;
    /** ticks alive in the current state, for animations */
    age = 0;
    arsenal;

    /** @param {import('../core/Rng.js').Rng} rng */
    constructor(rng) {
        this.arsenal = new Arsenal(rng);
        this.body.w = P.width;
        this.body.h = P.height;
    }

    get alive() {
        return this.state === 'alive' || this.state === 'respawn';
    }

    /** Floating down under the umbrella she cannot be hurt. */
    get vulnerable() {
        return this.state === 'alive' && this.invuln === 0;
    }

    /** Muzzle position for the current pose and aim. */
    muzzle() {
        const b = this.body;
        const f = this.facing;
        const step = this.arsenal.weapon.sweeps ? this.arsenal.step : this.aimStep;
        if (this.crouching) return [b.x + f * 15, b.y - P.gunYCrouch];
        if (step <= -3) return [b.x + f * 6, b.y - P.gunY - 15];
        if (step >= 3) return [b.x + f * 2, b.y - 4];
        if (step < 0) return [b.x + f * 12, b.y - P.gunY - 10];
        if (step > 0) return [b.x + f * 11, b.y - 8];
        return [b.x + f * 15, b.y - P.gunY];
    }

    /** Place her at the start of a mission. */
    placeAt(x, y) {
        const b = this.body;
        b.x = x;
        b.y = y;
        b.vx = 0;
        b.vy = 0;
        b.onGround = false;
        b.platform = null;
        this.state = 'respawn';
        this.stateTicks = 0;
        this.invuln = 60;
    }

    /**
     * @param {import('./World.js').World} world
     * @param {import('./Buttons.js').ButtonState} input
     */
    update(world, input) {
        this.age++;
        this.stateTicks++;
        if (this.invuln > 0) this.invuln--;
        if (this.recoilTicks > 0) this.recoilTicks--;
        if (this.throwTicks > 0) this.throwTicks--;
        if (this.bombCooldown > 0) this.bombCooldown--;
        if (this.landTicks < 99) this.landTicks++;
        this.arsenal.tick();

        switch (this.state) {
            case 'alive': this.#act(world, input); break;
            case 'respawn': this.#floatDown(world, input); break;
            case 'dying': this.#die(world); break;
            default: break;
        }
    }

    /** One hit from anything. */
    hurt(world, source = 'shot') {
        if (!this.vulnerable) return false;
        this.hearts--;
        world.score.hurt();
        const b = this.body;
        if (this.hearts <= 0) {
            this.state = 'dying';
            this.stateTicks = 0;
            this.crouching = false;
            b.vx = -this.facing * 1.2;
            b.vy = -3.5;
            b.onGround = false;
            b.platform = null;
            world.events.emit(Ev.PLAYER_DIE, b.x, b.cy, 0, 0, source);
            return true;
        }
        this.invuln = P.hurtInvulnTicks;
        world.events.emit(Ev.PLAYER_HURT, b.x, b.cy, this.hearts, 0, source);
        return true;
    }

    heal(amount) {
        this.hearts = Math.min(P.maxHearts, this.hearts + amount);
    }

    #act(world, input) {
        const b = this.body;
        const axis = input.axisX;
        const down = input.held(Btn.DOWN);
        const up = input.held(Btn.UP);

        this.crouching = down && b.onGround && this.meleeTicks === 0;
        b.h = this.crouching ? P.crouchHeight : P.height;
        if (axis !== 0 && this.meleeTicks === 0) this.facing = axis;

        const top = this.crouching ? P.crouchSpeed : P.runSpeed;
        const accel = b.onGround ? P.accel : P.airAccel;
        b.vx = approach(b.vx, this.meleeTicks > 0 ? 0 : axis * top, accel);

        this.#jump(world, input, down);

        // aim: up beats everything, down only in the air
        this.aimStep = up ? -4 : (down && !b.onGround ? 4 : 0);

        const wasGround = b.onGround;
        const landed = moveBody(b, world.terrain, world.blockers, P.gravity, P.maxFall);
        this.#keepOnScreen(world);
        if (landed && !wasGround) {
            this.landTicks = 0;
            this.jumping = false;
            world.events.emit(Ev.LAND, b.x, b.y);
        }
        if (b.onGround) this.coyote = P.coyoteTicks;
        else if (this.coyote > 0) this.coyote--;
        if (b.onGround) this.stride += Math.abs(b.vx);

        this.#attack(world, input);
        this.#throwBomb(world, input);
    }

    #jump(world, input, down) {
        const b = this.body;
        if (input.pressed(Btn.JUMP)) this.jumpBuffer = P.jumpBufferTicks;
        else if (this.jumpBuffer > 0) this.jumpBuffer--;

        if (this.jumpBuffer > 0 && down && b.onGround && b.platform) {
            // drop through the platform
            this.jumpBuffer = 0;
            b.onGround = false;
            b.platform = null;
            b.dropTicks = 14;
            b.vy = 0.5;
            return;
        }
        if (this.jumpBuffer > 0 && this.coyote > 0) {
            this.jumpBuffer = 0;
            this.coyote = 0;
            b.vy = -P.jumpSpeed;
            b.onGround = false;
            b.platform = null;
            this.jumping = true;
            this.crouching = false;
            b.h = P.height;
            world.events.emit(Ev.JUMP, b.x, b.y);
        }
        if (this.jumping && !input.held(Btn.JUMP) && b.vy < -P.jumpCut) b.vy = -P.jumpCut;
    }

    #attack(world, input) {
        const b = this.body;
        if (this.meleeTicks > 0) {
            this.meleeTicks--;
            if (this.meleeTicks === P.meleeTicks - 5) world.meleeStrike(this);
            return;
        }
        if (!input.held(Btn.FIRE)) return;

        const target = world.meleeTarget(this);
        if (target && (input.pressed(Btn.FIRE) || this.arsenal.ready)) {
            this.meleeTicks = P.meleeTicks;
            this.arsenal.cooldown = Math.max(this.arsenal.cooldown, 8);
            world.events.emit(Ev.MELEE, b.x + this.facing * 12, b.y - 16, this.facing);
            return;
        }
        const [mx, my] = this.muzzle();
        if (this.arsenal.fire(world, mx, my, this.facing, this.aimStep, b.vx)) {
            this.recoilTicks = this.arsenal.weapon.recoil > 0 ? 5 : 0;
        }
    }

    #throwBomb(world, input) {
        if (!input.pressed(Btn.BOMB) || this.bombs <= 0 || this.bombCooldown > 0 || this.meleeTicks > 0) return;
        const b = this.body;
        const up = this.aimStep < 0;
        const vx = this.facing * (up ? 1.4 : 2.7) + b.vx * 0.5;
        const vy = up ? -5.0 : -3.6;
        const p = world.playerShots.spawn('meatball', 'player', b.x + this.facing * 6, b.y - 22, vx, vy, 10);
        if (!p) return;
        this.bombs--;
        this.bombCooldown = P.bombCooldown;
        this.throwTicks = 14;
        world.events.emit(Ev.BOMB_THROW, b.x, b.y - 22);
    }

    #floatDown(world, input) {
        const b = this.body;
        const axis = input.axisX;
        if (axis !== 0) this.facing = axis;
        b.vx = approach(b.vx, axis * P.runSpeed, P.airAccel);
        b.h = P.height;
        const landed = moveBody(b, world.terrain, world.blockers, 0.05, 1.3);
        this.#keepOnScreen(world);
        this.#attack(world, input);
        if (landed || b.onGround) {
            this.state = 'alive';
            this.stateTicks = 0;
            this.landTicks = 0;
            this.invuln = Math.max(this.invuln, P.respawnInvulnTicks);
            world.events.emit(Ev.LAND, b.x, b.y);
        }
    }

    #die(world) {
        const b = this.body;
        b.vx *= 0.97;
        moveBody(b, world.terrain, world.blockers, P.gravity, P.maxFall);
        if (b.onGround) b.vx = 0;
        if (this.stateTicks < P.deathTicks) return;

        this.lives--;
        if (this.lives <= 0) {
            this.state = 'out';
            return;
        }
        this.#respawn(world);
    }

    #respawn(world) {
        this.hearts = P.maxHearts;
        this.bombs = Math.max(this.bombs, P.startBombs);
        this.arsenal.reset();
        this.crouching = false;
        // bosses hold the right of the arena: drop back in on the left
        this.placeAt(world.camera.x + View.width * 0.18, 30);
        this.invuln = P.respawnInvulnTicks;
        world.clearEnemyShots();
        world.events.emit(Ev.PLAYER_RESPAWN, this.body.x, 0);
    }

    #keepOnScreen(world) {
        const b = this.body;
        const min = world.camera.x + 8;
        const max = world.camera.right - 8;
        if (b.x < min) {
            b.x = min;
            if (b.vx < 0) b.vx = 0;
        } else if (b.x > max) {
            b.x = max;
            if (b.vx > 0) b.vx = 0;
        }
    }
}
