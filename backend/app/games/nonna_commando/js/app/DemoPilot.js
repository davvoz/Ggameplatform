import { Btn } from '../sim/Buttons.js';

/**
 * A player made of rules: it plays the attract mode behind the title screen,
 * and the tests use it to play whole runs. It reads the simulation (which a
 * human cannot) but presses the same buttons a human would, and it is
 * deterministic, so its runs can be replayed.
 *
 * skill: 0..1, how often it reacts to danger in time.
 */
export class DemoPilot {
    #skill;
    #tick = 0;
    #jumpHold = 0;
    #dropHold = 0;

    constructor(skill = 1) {
        this.#skill = skill;
    }

    /** @param {import('../sim/Simulation.js').Simulation} sim */
    buttons(sim) {
        this.#tick++;
        if (sim.phase !== 'play') return this.#tick % 20 === 0 ? Btn.FIRE : 0;
        const w = sim.world;
        const p = sim.player;
        const b = p.body;
        let bits = 0;

        const target = this.#target(w, b);
        const react = this.#reacts();

        // movement: push right unless there is something to deal with
        let move = 1;
        if (target) {
            const dx = target.x - b.x;
            const want = target.isBoss ? 110 : 70;
            const facingIt = (dx > 0) === (p.facing > 0);
            if (Math.abs(dx) < 28 && target.x > w.camera.x + 60 && !target.isBoss) move = dx > 0 ? -1 : 1;
            else if (Math.abs(dx) < want) move = facingIt ? 0 : (dx > 0 ? 1 : -1);
            else move = dx > 0 ? 1 : -1;
            if (target.isBoss && Math.abs(dx) < 50 + target.w / 2) move = dx > 0 ? -1 : 1;
            if (p.state === 'respawn' && target.isBoss) move = 0;
            const above = (b.y - b.h / 2) - (target.y - target.h / 2);
            const below = target.y - b.y;
            if (b.platform && below > 24 && this.#tick % 40 === 0) this.#dropHold = 2;
            if (!b.onGround && below > 20 && Math.abs(dx) < 40) bits |= Btn.DOWN;
            if (above > 34 && Math.abs(dx) < 70) bits |= Btn.UP;
            else if (!target.flying && b.onGround && move === 0 && (target.h < 22 || target.y - b.y > 6)) bits |= Btn.DOWN;
        }
        for (const h of w.hostages) {
            if (h.tied && h.x > b.x && h.x - b.x < 120) move = 1;
        }
        const dodge = react ? this.#sidestep(w, b) : 0;
        if (dodge) move = dodge;
        if (move > 0) bits |= Btn.RIGHT;
        if (move < 0) bits |= Btn.LEFT;

        bits |= Btn.FIRE;
        if (target?.isBoss && this.#tick % 70 === 0 && p.bombs > 2) bits |= Btn.BOMB;

        // danger
        const danger = this.#danger(w, b);
        if (react && danger === 'low' && b.onGround) this.#jumpHold = 14;
        if (react && danger === 'high') bits |= Btn.DOWN;
        if (this.#dropHold > 0) {
            this.#dropHold--;
            return (bits | Btn.DOWN | Btn.JUMP) & ~Btn.UP;
        }
        if (this.#jumpHold > 0) {
            this.#jumpHold--;
            bits |= Btn.JUMP;
            bits &= ~Btn.DOWN;
        }
        // climb over blocked steps
        if (b.blocked && b.onGround && this.#tick % 30 === 0) this.#jumpHold = 10;
        return bits;
    }

    #reacts() {
        if (this.#skill >= 1) return true;
        // deterministic pseudo random from the tick
        const h = Math.imul(this.#tick ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
        return (h % 1000) / 1000 < this.#skill;
    }

    /** Step out of the way of a shot falling on her. */
    #sidestep(w, b) {
        for (const s of w.enemyShots.items) {
            if (!s.active || s.vy < 0.3) continue;
            const t = (b.y - 14 - s.y) / s.vy;
            if (t < 0 || t > 45) continue;
            const landX = s.x + s.vx * t;
            if (Math.abs(landX - b.x) < 16) {
                const away = b.x >= landX ? 1 : -1;
                const room = away > 0 ? w.camera.right - 20 - b.x : b.x - w.camera.x - 20;
                return room > 10 ? away : -away;
            }
        }
        return 0;
    }

    #target(w, b) {
        let best = null;
        let bestD = Infinity;
        for (const e of w.enemies) {
            if (!e.targetable || e.x < w.camera.x - 10 || e.x > w.camera.right + 10) continue;
            const d = Math.abs(e.x - b.x) + Math.abs(e.y - b.y) * 0.5;
            if (d < bestD) {
                bestD = d;
                best = e;
            }
        }
        return best;
    }

    #danger(w, b) {
        for (const s of w.enemyShots.items) {
            if (!s.active) continue;
            const dx = s.x - b.x;
            const toward = (dx > 0 && s.vx < 0) || (dx < 0 && s.vx > 0) || Math.abs(dx) < 16;
            if (!toward || Math.abs(dx) > 70) continue;
            const height = b.y - s.y;
            if (s.kind === 'wave' || height < 12) return 'low';
            if (height < 30 && Math.abs(s.vy) < 0.8) return 'high';
            if (s.vy > 0.5 && Math.abs(dx) < 30) return 'low';
        }
        for (const e of w.enemies) {
            if (!e.targetable) continue;
            const dx = e.x - b.x;
            if (e.type === 'clown' && Math.abs(dx) < 40) return 'low';
            // a vehicle rushing at her
            if (e.isBoss && !e.flying && Math.abs(e.vx) > 1.8 && Math.sign(e.vx) === -Math.sign(dx) && Math.abs(dx) < 70 + e.w / 2) return 'low';
        }
        return null;
    }
}

