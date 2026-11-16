import { blink, ease, progress } from '../render/ui/ease.js';
import { CORNER, textCentered, textRight, UI } from '../render/ui/widgets.js';
import { createRace } from '../sim/setup.js';
import { MenuScreen } from './Screen.js';
import { SoundPanel } from './SoundPanel.js';

/**
 * The title: a race of computer cars runs behind (the player's car driven
 * by the pilot), the logo drops in, START waits. A tap anywhere starts,
 * but on the speaker, which opens the SOUND panel (volumes). Without the
 * server it says OFFLINE: the career is not saved.
 */
const DEMO_SECONDS = 150;

export class TitleScreen extends MenuScreen {
    #demo = null;
    #view = null;
    #seed = 1;
    #sound = new SoundPanel(this.app);

    enter() {
        this.#newDemo();
    }

    #newDemo() {
        const first = this.app.career.tracks()[0].trackId;
        this.#demo = createRace({ trackId: first, playerStats: this.app.career.stats(), seed: this.#seed++ });
        this.#demo.skipStart();
        this.#view = this.app.makeRaceView(this.#demo);
    }

    tick(dt) {
        const race = this.#demo;
        race.step(race.player.brain.read(race.player, race), dt);
        race.drain();
        if (race.over || race.time > DEMO_SECONDS) this.#newDemo();
    }

    layout({ width, height }) {
        return [
            { id: 'start', label: 'START', kind: 'primary', x: Math.round(width / 2 - 40), y: height - 46, w: 80, h: 17 },
            { id: 'sound', icon: this.app.audio.muted ? 'mute' : 'sound', x: width - CORNER - 22, y: 5, w: 19, h: 16 },
        ];
    }

    scene(ctx, size) {
        const { width, height } = size;
        this.#view.draw(ctx, size, this.time);
        // darker at the top and the bottom, so the logo and the button read
        ctx.fillStyle = 'rgba(14, 8, 32, 0.55)';
        ctx.fillRect(0, 0, width, 70);
        ctx.fillRect(0, height - 54, width, 54);

        const logo = this.app.art.logo;
        const drop = ease.outBack(progress(this.time, 0.15, 0.7));
        logo.draw(ctx, width / 2 - logo.width / 2, -logo.height + drop * (logo.height + 10), this.time);
    }

    overlay(ctx, size) {
        this.#hints(ctx, size);
        if (this.#sound.open) this.#sound.draw(ctx, size, this.time);
    }

    #hints(ctx, { width, height }) {
        if (!this.app.sync.online) textRight(ctx, 'OFFLINE: NOT SAVED', width - CORNER - 28, 9, { color: UI.red, outline: UI.ink });
        if (this.time < 1 || !blink(this.time, 1)) return;
        const text = this.app.keyboard ? 'PRESS ENTER' : 'TAP TO START';
        textCentered(ctx, text, width / 2, height - 23, { color: UI.cream, outline: UI.ink });
    }

    press(x, y) {
        if (this.#sound.open) {
            this.#sound.press(x, y, this.time);
            return false;
        }
        // anywhere starts, but the sound button
        const id = this.menu.press(x, y, this.time);
        if (id === 'sound') {
            this.action(id);
            return false;
        }
        if (!id) this.menu.key('confirm', this.time);
        this.action('start');
        return false;
    }

    key(action) {
        if (this.#sound.open) this.#sound.key(action, this.time);
        else super.key(action);
    }

    pressSound(id) {
        return id === 'start' ? null : 'confirm';
    }

    action(id) {
        if (id === 'sound') {
            this.app.audio.play('confirm');
            this.#sound.show(this.time);
        } else if (id === 'start' && this.time > 0.3) {
            this.app.audio.play('start');
            this.app.show('worlds');
        }
    }
}
