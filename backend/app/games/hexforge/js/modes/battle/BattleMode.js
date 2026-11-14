import { SignInRequired, fetchDemoCity, fetchOutposts, runBattle } from '../../net/api.js';
import { setMode as setMusic } from '../../fx/audio.js';
import { icon } from '../../ui/icons.js';
import { PRIORITY_INFO, SIDE_INFO, TACTIC_INFO } from '../../data/labels.js';
import { frontierOf, settleSquad } from '../../core/squad.js';
import { $, EMPTY_CITY, TAIL_SECONDS, saveSetup } from './shared.js';
import { AttackPlan } from './plan.js';
import { SquadPicker } from './squadPicker.js';
import { ReplayView } from './replayView.js';

const MODES = new Set(['outposts', 'rivals']);

const SIDES = ['north', 'east', 'south', 'west'];

const SPEEDS = [1, 2, 4];

/**
 * "Attack", full screen on the target's city. This class runs the mode: the
 * attack data, switching between its three views, the frame, the buttons.
 * Each view lives beside it:
 *  - plan.js: outpost or player, entry side (arrows on the map), what to hit
 *    first, formation, Fight!
 *  - squadPicker.js: the squad of 4, a hero's card, and the speed-up bonuses
 *    a hurt hero or the energy take when tapped
 *  - replayView.js: the replay with the squad's health at the bottom, then
 *    the result: a big verdict, destruction, loot
 * Also replays raids on the player's own city (`watch`), then goes back.
 */
export class BattleMode {
    constructor(renderer) {
        this.renderer = renderer;
        this.view = 'setup';          // setup | battle | result
        this.data = null;             // /me/outposts answer
        this.receivedAt = 0;
        this.battle = null;
        this.second = -1;
        this.busy = false;
        this.onStateChanged = () => {};
        this.onExit = () => {};       // set by the shell: back to the city
        this.returnTo = null;         // set while replaying a raid on the player's city
        this.plan = new AttackPlan(this);
        this.squadPicker = new SquadPicker(this);
        this.replayView = new ReplayView(this);
        this.#wire();
    }

    async enter() {
        this.renderer.setRotation(0);        // other cities are always seen from the same side
        if (this.view === 'setup') await this.reload();
        else this.renderer.setCity(this.battle.city);
        this.show(this.view);
    }

    leave() {
        if (this.replayView.ending) void this.replayView.reportToPlatform();      // left before the report: still one finished attack
        if (this.returnTo) {
            this.returnTo = null;
            this.view = 'setup';
        }
        for (const id of ['hud-attack', 'hud-battle', 'result']) $(id).hidden = true;
    }

    frame(time, dt) {
        if (this.view === 'setup') {
            this.renderer.draw(null, { side: this.data ? this.plan.setup.side : null, time, ranges: 'all' });
            this.plan.placeSides();
            this.plan.tickSetup();
            return;
        }
        if (this.view === 'battle' && !this.replayView.paused) {
            this.replayView.playTick += dt * this.replayView.replay.tickRate * SPEEDS[this.replayView.speed];
            this.replayView.sounds();
        }
        const state = this.replayView.replay.stateAt(this.replayView.playTick);
        this.renderer.draw(state, { time });
        this.replayView.updateHud(state);
        if (this.view === 'battle') {
            this.replayView.updateHeroList(state);
            if (this.replayView.playTick >= this.replayView.replay.duration + TAIL_SECONDS * this.replayView.replay.tickRate) this.replayView.showResult();
        }
    }

    onEscape() {
        if (this.view === 'setup') this.onExit();
    }

    /** Replay a raid on the player's own city (defence test or a real raid); Back calls `onBack`. */
    watch(raid, onBack, note = '') {
        this.battle = { ...raid, rewards: null, defense: true, note };
        this.returnTo = onBack;
        this.replayView.startReplay();
    }

    /** Open the plan on the Players side (after a revenge has scouted the raider). */
    showRivals() {
        this.plan.setup.mode = 'rivals';
        saveSetup(this.plan.setup);
        this.returnTo = null;
        this.view = 'setup';
    }

    /**
     * Dev helper for screenshots: `?at=20` replays a test battle frozen at
     * second 20; `?at=end` opens its report. Uses the test city, so it
     * spends no energy and needs no sign-in.
     */
    async devJump(at) {
        const { city } = await fetchDemoCity();
        this.renderer.setCity(city);
        const squad = ['guardian', 'neon_blade', 'neon_blade', 'technomancer'];
        this.battle = { ...(await runBattle({ squad, side: this.plan.setup.side, priority: this.plan.setup.priority, tactic: this.plan.setup.tactic })) };
        this.battle.rewards = null;
        this.replayView.startReplay();
        if (at === 'end') {
            this.replayView.showResult();
            return;
        }
        this.replayView.playTick = Number(at) * this.replayView.replay.tickRate;
        this.replayView.soundTick = this.replayView.playTick;
        this.replayView.paused = true;
        this.replayView.renderPause();
    }

    // ── data ───────────────────────────────────────────────────────────
    async reload() {
        try {
            this.apply(await fetchOutposts());
            $('attack-signin').hidden = true;
            this.#showPlan(true);
        } catch (error) {
            if (!(error instanceof SignInRequired)) throw error;
            this.data = null;
            this.renderer.setCity(EMPTY_CITY);
            $('attack-signin').hidden = false;
            this.#showPlan(false);
        }
    }

    #showPlan(signedIn) {
        for (const id of ['attack-tray', 'sides', 'target-mode', 'energy']) $(id).hidden = !signedIn;
        document.querySelector('#hud-attack .target-row').hidden = !signedIn;
    }

    apply(data) {
        this.data = data;
        this.receivedAt = performance.now();
        const chosen = data.outposts.find((o) => o.id === this.plan.setup.outpost);
        if (!chosen || chosen.cleared || !chosen.unlocked) this.plan.setup.outpost = frontierOf(data.outposts);
        this.plan.setup.heroIds = settleSquad(this.plan.setup.heroIds, data.heroes, this.serverNow());
        if (!MODES.has(this.plan.setup.mode)) this.plan.setup.mode = 'outposts';
        this.plan.setTarget();
        this.plan.renderSetup();
    }

    serverNow() {
        return this.data.server_time + (performance.now() - this.receivedAt) / 1000;
    }

    // ── the plan ───────────────────────────────────────────────────────
    #wire() {
        $('btn-attack-back').addEventListener('click', () => this.onExit());
        $('energy').addEventListener('click', () => this.squadPicker.tapEnergy());
        for (const button of document.querySelectorAll('#target-mode [data-mode]')) {
            button.addEventListener('click', () => {
                if (this.plan.setup.mode === button.dataset.mode) return;
                this.plan.setup.mode = button.dataset.mode;
                this.plan.changed(true);
            });
        }
        $('btn-prev-target').addEventListener('click', () => this.plan.stepOutpost(-1));
        $('btn-next-target').addEventListener('click', () => this.plan.stepOutpost(1));
        $('btn-priority').addEventListener('click', () => this.plan.cycle('priority', PRIORITY_INFO));
        $('btn-tactic').addEventListener('click', () => this.plan.cycle('tactic', TACTIC_INFO));
        $('btn-launch').addEventListener('click', () => void this.plan.launch());
        for (const side of SIDES) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'side';
            button.dataset.side = side;
            button.setAttribute('aria-label', `Enter from the ${SIDE_INFO[side].toLowerCase()}`);
            button.append(icon('arrow'));
            button.addEventListener('click', () => {
                this.plan.setup.side = side;
                this.plan.changed(false);
            });
            this.plan.sideButtons[side] = button;
            $('sides').append(button);
        }
        $('btn-pause').addEventListener('click', () => {
            this.replayView.paused = !this.replayView.paused;
            this.replayView.renderPause();
        });
        $('btn-speed').addEventListener('click', () => {
            this.replayView.speed = (this.replayView.speed + 1) % SPEEDS.length;
            $('btn-speed').firstElementChild.textContent = `${SPEEDS[this.replayView.speed]}×`;
        });
        $('btn-skip').addEventListener('click', () => this.replayView.showResult());
        $('btn-rewatch').addEventListener('click', () => this.replayView.startReplay());
        $('btn-new').addEventListener('click', () => {
            if (this.returnTo) {
                this.returnTo();
                return;
            }
            this.show('setup');
            void this.reload();
        });
    }

    show(view) {
        this.view = view;
        setMusic(view === 'battle' ? 'battle' : 'city');
        $('hud-attack').hidden = view !== 'setup';
        $('hud-battle').hidden = view !== 'battle';
        $('result').hidden = view !== 'result';
    }
}
