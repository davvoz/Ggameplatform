import { ScoreTuning } from '../config/Tuning.js';
import { Ev } from './Events.js';

const THANKS = ['GRAZIE NONNA!', 'NONNA!!', 'YOU CAME!', 'I WANT PASTA!', 'TI VOGLIO BENE!'];

/**
 * One of Nonna's grandchildren, taped to a party chair with streamers. Shoot
 * the streamers or walk up to free them; they leave a present behind and run
 * home. Every grandkid counts in the end-of-mission bonus.
 *
 * States: tied, freed, thanks, leaving, gone.
 */
export class Hostage {
    x;
    y;
    w = 14;
    h = 18;
    state = 'tied';
    t = 0;
    gift;
    line = '';
    /** variant of clothes, for the art */
    look;

    constructor(x, y, gift, look) {
        this.x = x;
        this.y = y;
        this.gift = gift;
        this.look = look;
    }

    get tied() {
        return this.state === 'tied';
    }

    /** @param {import('./World.js').World} world */
    free(world) {
        if (!this.tied) return;
        this.state = 'freed';
        this.t = 0;
        world.score.rescued();
        world.score.award(ScoreTuning.rescue, this.x, this.y - 26, 'RESCUED!');
        this.line = THANKS[world.rng.int(0, THANKS.length - 1)];
        world.events.emit(Ev.RESCUE, this.x, this.y - 20, 0, 0, this.line, this);
    }

    /** @param {import('./World.js').World} world */
    update(world) {
        this.t++;
        if (this.state === 'tied') {
            const pb = world.player.body;
            if (world.player.alive && Math.abs(pb.x - this.x) < 12 && Math.abs(pb.y - this.y) < 16) this.free(world);
            return;
        }
        if (this.state === 'freed' && this.t >= 24) {
            this.state = 'thanks';
            this.t = 0;
            world.dropPickup(this.gift, this.x + 6, this.y - 10);
        } else if (this.state === 'thanks' && this.t >= 50) {
            this.state = 'leaving';
            this.t = 0;
        } else if (this.state === 'leaving') {
            this.x -= 2.2;
            this.y = world.terrain.surfaceBelow(this.x, this.y - 4);
            if (this.x < world.camera.x - 30) this.state = 'gone';
        }
    }
}
