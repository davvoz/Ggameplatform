import { approach } from '../../core/MathX.js';
import { Ev } from '../Events.js';
import { Boss } from './Boss.js';

/**
 * A helicopter dressed as a donkey pinata. Sweeps the ground with its gun,
 * carpets the arena with candy bombs and drops balloon troopers. When it
 * cracks, every big hit spills sweets worth points: greed against safety.
 */
export class PinataChopper extends Boss {
    phases = [0.5];
    attacks = [['sweep', 'carpet', 'deploy', 'sweep'], ['sweep', 'carpet', 'carpet', 'deploy', 'sweep']];
    parTicks = 80 * 60;
    hoverY = 88;
    targetX = 0;
    shotsLeft = 0;
    spilled = 0;
    passDir = -1;

    intro(world) {
        this.facing = -1;
        this.anim = 'fly';
        this.targetX = this.arenaRight - 90;
        this.#glide(this.targetX, this.hoverY, 1.4);
        if (this.t === 1) this.say(world, 'PARTY TIME!', 80);
        return this.t > 110;
    }

    restTick(world) {
        this.anim = 'fly';
        this.#glide(this.targetX, this.hoverY + (this.age % 120 < 60 ? -4 : 4), 0.9);
        this.facePlayerLoose(world);
    }

    facePlayerLoose(world) {
        this.facing = world.player.body.x < this.x ? -1 : 1;
    }

    /**
     * Bursts of three shots aimed where Nonna is when the gun flashes. Aimed
     * fire from above is dodged by moving: standing still is what gets you hit.
     */
    sweep(world) {
        this.facePlayerLoose(world);
        this.anim = 'gun';
        this.#glide(this.targetX, this.hoverY, 0.8);
        const bursts = this.phase > 0 ? 3 : 2;
        const every = this.phase > 0 ? 38 : 44;
        const k = this.t - 24;
        if (k >= 0 && k % every === 0 && k / every < bursts) {
            world.events.emit(Ev.TELEGRAPH, this.x + this.facing * 30, this.y + 6, 0, 0, 'glow');
        }
        if (k >= 10 && (k - 10) % every < 9 && (k - 10) % 4 === 0 && Math.floor((k - 10) / every) < bursts) {
            const mx = this.x + this.facing * 26;
            const my = this.y + 8;
            const [dx, dy] = this.aimAtPlayer(world, mx, my, 4);
            const spread = (((k - 10) % every) / 4 - 1) * 0.09;
            this.shoot(world, 'eBullet', mx, my, (dx - dy * spread) * 2.2, (dy + dx * spread) * 2.2);
        }
        return k > bursts * every + 10;
    }

    carpet(world) {
        this.anim = 'fly';
        if (this.t === 1) {
            this.passDir = this.x > (this.arenaLeft + this.arenaRight) / 2 ? -1 : 1;
            this.say(world, 'CANDY!', 40);
        }
        const end = this.passDir < 0 ? this.arenaLeft + 50 : this.arenaRight - 50;
        this.facing = this.passDir;
        this.#glide(end, 70, this.phase > 0 ? 2.4 : 2);
        if (this.t > 20 && this.t % (this.phase > 0 ? 11 : 14) === 0) {
            this.shoot(world, 'candyBomb', this.x, this.y + 14, this.vx * 0.3, 0.5);
        }
        if (Math.abs(this.x - end) < 3) {
            this.targetX = end;
            return true;
        }
        return this.t > 260;
    }

    deploy(world) {
        this.anim = 'hatch';
        this.#glide(this.targetX, this.hoverY - 10, 1);
        if (this.t === 30 || (this.t === 70 && this.phase > 0)) {
            if (world.countAlive('balloon') < 2) world.spawnEnemy('balloon', this.x, this.y + 20, { awake: true });
        }
        return this.t > 90;
    }

    takeHit(world, damage, hit) {
        const taken = super.takeHit(world, damage, hit);
        if (this.phase > 0 && taken > 0) {
            this.spilled += taken;
            if (this.spilled >= 22) {
                this.spilled = 0;
                world.dropPickup('candy', this.x + world.rng.int(-20, 20), this.y + 16);
            }
        }
        return taken;
    }

    onPhase(world) {
        this.say(world, 'I AM CRACKING!', 70);
        world.events.emit(Ev.EXPLODE, this.x, this.y, 30, 0, 'confetti');
        for (let i = 0; i < 4; i++) world.dropPickup('candy', this.x - 30 + i * 20, this.y + 10);
    }

    #glide(tx, ty, speed) {
        this.vx = approach(this.vx, Math.max(-speed, Math.min(speed, (tx - this.x) * 0.05)), 0.12);
        this.vy = approach(this.vy, Math.max(-speed, Math.min(speed, (ty - this.y) * 0.05)), 0.12);
    }

    move() {
        this.x += this.vx;
        this.y += this.vy;
    }
}
