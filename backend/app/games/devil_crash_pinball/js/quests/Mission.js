/**
 * Single mission descriptor. Sections push events; missions update progress.
 * State machine: IDLE -> ACTIVE -> COMPLETE / FAILED.
 *
 * Concrete missions are constructed via MissionManager.create(...) using the
 * id as type discriminator. We keep them as plain instances of this class to
 * avoid one-class-per-mission inflation (still SRP: one type, many configs).
 */
export class Mission {
    static STATE = Object.freeze({ IDLE: 0, ACTIVE: 1, COMPLETE: 2, FAILED: 3 });

    /**
     * @param {string} id          machine name (e.g. "drop_bank")
     * @param {string} title       display label
     * @param {number} target      progress required
     * @param {string} eventType   event name to listen to
     * @param {number} timeout     seconds; <=0 = no timeout
     * @param {number} reward      score reward on completion
     */
    constructor(id, title, target, eventType, timeout, reward) {
        this.id = id;
        this.title = title;
        this.target = target;
        this.eventType = eventType;
        this.timeout = timeout;
        this.reward = reward;
        this.progress = 0;
        this.timer = 0;
        this.state = Mission.STATE.IDLE;
    }

    activate() {
        this.state = Mission.STATE.ACTIVE;
        this.progress = 0;
        this.timer = this.timeout;
    }

    update(dt) {
        if (this.state !== Mission.STATE.ACTIVE) return;
        if (this.timeout > 0) {
            this.timer = Math.max(0, this.timer - dt);
            if (this.timer === 0) this.state = Mission.STATE.FAILED;
        }
    }

    /**
     * @param {string} eventType
     * @param {number} amount
     * @returns {boolean} true if mission just completed
     */
    onEvent(eventType, amount = 1) {
        if (this.state !== Mission.STATE.ACTIVE) return false;
        if (eventType !== this.eventType) return false;
        this.progress = Math.min(this.target, this.progress + amount);
        if (this.progress >= this.target) {
            this.state = Mission.STATE.COMPLETE;
            return true;
        }
        return false;
    }

    progressRatio() { return this.target > 0 ? this.progress / this.target : 0; }
}
