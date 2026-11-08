import { Weapons } from '../config/Weapons.js';
import { Ev } from '../sim/Events.js';
import { AudioEngine } from './AudioEngine.js';
import { Music } from './Music.js';
import { Sfx } from './Sfx.js';

/**
 * The game's ears: turns simulation events into sounds and picks the music.
 * Only reacts, never changes the run.
 */
export class GameAudio {
    engine = new AudioEngine();
    sfx = new Sfx(this.engine);
    music = new Music(this.engine);
    #levelTrack = 'town';

    unlock() {
        this.engine.unlock();
    }

    setMuted(muted) {
        this.engine.setMuted(muted);
    }

    get muted() {
        return this.engine.muted;
    }

    setSuspended(suspended) {
        this.engine.setSuspended(suspended);
    }

    playMusic(name) {
        this.music.play(name);
    }

    stopMusic() {
        this.music.stop();
    }

    /** @param {import('../sim/Events.js').EventQueue} events */
    handle(events) {
        const s = this.sfx;
        for (let i = 0; i < events.count; i++) {
            const e = events.items[i];
            switch (e.type) {
                case Ev.SHOT: s.play(Weapons[e.s]?.sound ?? 'pistol'); break;
                case Ev.ENEMY_SHOT: s.play('enemyShot'); break;
                case Ev.HIT: s.play('hit'); break;
                case Ev.CLANG: s.play('clang'); break;
                case Ev.KILL: s.play('kill', e.b); break;
                case Ev.EXPLODE: if (e.a >= 16 || e.s === 'big') s.play('explosion', e.s === 'big'); else s.play('pop'); break;
                case Ev.BOMB_THROW: s.play('bombThrow'); break;
                case Ev.JUMP: s.play('jump'); break;
                case Ev.LAND: s.play('land'); break;
                case Ev.MELEE: s.play('melee'); break;
                case Ev.PLAYER_HURT: s.play('hurt'); break;
                case Ev.PLAYER_DIE: s.play('die'); break;
                case Ev.PICKUP: s.play(e.s === 'tooth' ? 'tooth' : 'pickup'); break;
                case Ev.WEAPON: if (e.s !== 'pistol') s.play('weapon'); break;
                case Ev.RESCUE: s.play('rescue'); break;
                case Ev.CHAIN_UP: s.play('chainUp', e.a); break;
                case Ev.CHAIN_LOST: s.play('chainLost'); break;
                case Ev.SWAT: s.play('swat'); break;
                case Ev.POP: s.play('pop'); break;
                case Ev.HONK: s.play('honk'); break;
                case Ev.SHOCKWAVE: s.play('shockwave'); break;
                case Ev.EXTRA_LIFE: s.play('extraLife'); break;
                case Ev.PROP_BREAK: if (e.s !== 'barrel') s.play('pop'); break;
                case Ev.SPEECH: s.play('speech'); break;
                case Ev.TELEGRAPH: if (e.s === 'laser') s.play('laser'); break;
                case Ev.BOSS_INTRO: s.play('warning'); break;
                case Ev.LEVEL_START: break;
                case Ev.LEVEL_CLEAR:
                    this.music.stop();
                    s.play('clear');
                    break;
                case Ev.VICTORY:
                    this.music.stop();
                    s.play('victory');
                    break;
                case Ev.GAME_OVER:
                    this.music.stop();
                    s.play('gameOver');
                    break;
                case Ev.BOSS_DEAD:
                    if (e.s !== 'final') this.music.play(this.#levelTrack);
                    break;
                case Ev.MUSIC:
                    if (['town', 'harbor', 'palace'].includes(e.s)) this.#levelTrack = e.s;
                    this.music.play(e.s);
                    break;
                default: break;
            }
        }
    }
}
