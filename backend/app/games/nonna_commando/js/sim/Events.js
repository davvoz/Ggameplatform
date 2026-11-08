/**
 * What happened during a tick, for the eyes and ears. The simulation writes
 * events, the renderer and the audio read them, nobody writes back. Event
 * objects are preallocated and reused, so a busy tick allocates nothing.
 */

export const Ev = Object.freeze({
    SHOT: 'shot',                 // s: weapon id, a: dirX, b: dirY
    ENEMY_SHOT: 'enemyShot',      // s: kind
    HIT: 'hit',                   // s: material (flesh|metal|tray|wood), a: dirX
    KILL: 'kill',                 // s: enemy type, a: points, b: multiplier, ref: enemy
    BONUS_TEXT: 'bonusText',      // s: label
    EXPLODE: 'explode',           // a: radius, s: style (fire|confetti|big)
    BOMB_THROW: 'bombThrow',
    JUMP: 'jump',
    LAND: 'land',
    MELEE: 'melee',
    PLAYER_HURT: 'playerHurt',
    PLAYER_DIE: 'playerDie',
    PLAYER_RESPAWN: 'playerRespawn',
    PICKUP: 'pickup',             // s: pickup type, a: points
    WEAPON: 'weapon',             // s: weapon id
    RESCUE: 'rescue',
    CHAIN_UP: 'chainUp',          // a: new multiplier
    CHAIN_LOST: 'chainLost',      // a: multiplier lost
    SWAT: 'swat',
    PROP_BREAK: 'propBreak',      // s: prop type
    TELEGRAPH: 'telegraph',       // s: kind, a/b: extra
    SHAKE: 'shake',               // a: strength, b: ticks
    BANNER: 'banner',             // s: text
    GO: 'go',
    BOSS_INTRO: 'bossIntro',      // s: boss name
    BOSS_PHASE: 'bossPhase',
    BOSS_DEAD: 'bossDead',
    LEVEL_START: 'levelStart',    // a: level index
    LEVEL_CLEAR: 'levelClear',
    GAME_OVER: 'gameOver',
    VICTORY: 'victory',
    EXTRA_LIFE: 'extraLife',
    SPEECH: 'speech',             // s: line, ref: speaker
    SHOCKWAVE: 'shockwave',
    CLANG: 'clang',
    POP: 'pop',
    HONK: 'honk',
    MUSIC: 'music',               // s: track
});

const CAPACITY = 512;

export class EventQueue {
    /** @type {{type: string, x: number, y: number, a: number, b: number, s: string, ref: any}[]} */
    items = Array.from({ length: CAPACITY }, () => ({ type: '', x: 0, y: 0, a: 0, b: 0, s: '', ref: null }));
    count = 0;

    emit(type, x = 0, y = 0, a = 0, b = 0, s = '', ref = null) {
        if (this.count >= CAPACITY) return;
        const e = this.items[this.count++];
        e.type = type;
        e.x = x;
        e.y = y;
        e.a = a;
        e.b = b;
        e.s = s;
        e.ref = ref;
    }

    clear() {
        for (let i = 0; i < this.count; i++) this.items[i].ref = null;
        this.count = 0;
    }
}
