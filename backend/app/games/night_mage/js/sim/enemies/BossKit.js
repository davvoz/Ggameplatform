import { BOSS, INVADER } from '../../config/Tuning.js';

/**
 * What makes a boss more than a tough monster, and where its level shows:
 * a fury below half health, bats called at set shares of its health, bigger
 * volleys. It only keeps count; the monster acts on it in its turn (`take`).
 */
export class BossKit {
    /** The shares of health still to call bats at, highest first. */
    #calls = [...BOSS.callsAt];
    #roar = false;
    #callsDue = 0;
    furious = false;

    constructor(level) {
        this.level = Math.max(1, Math.min(INVADER.maxLevel, level));
    }

    /** Shots it looses in one go: 2 at level 1, 4 from level 4. */
    get volley() {
        return BOSS.volleyBase + Math.floor(this.level / 2);
    }

    /** Bats it calls each time: 2 at level 1, 4 at level 5. */
    get brood() {
        return 1 + Math.ceil(this.level / 2);
    }

    /** A hit left it with `share` (0..1) of its health. */
    wounded(share) {
        if (!this.furious && share <= BOSS.furyAt) {
            this.furious = true;
            this.#roar = true;
        }
        while (this.#calls.length > 0 && share <= this.#calls[0]) {
            this.#calls.shift();
            this.#callsDue += 1;
        }
    }

    /**
     * What the hits since its last turn earned, cleared once taken.
     * @returns {{roar: boolean, bats: number}} `roar` when it just grew furious
     */
    take() {
        const due = { roar: this.#roar, bats: this.#callsDue * this.brood };
        this.#roar = false;
        this.#callsDue = 0;
        return due;
    }
}
