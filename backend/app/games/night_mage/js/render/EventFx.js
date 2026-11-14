import { STRINGS } from '../config/Strings.js';
import { MONSTER_COLORS } from './Effects.js';
import { STORM_VIOLET as STORM_COLOR } from './StormArt.js';

const GOLD = '#ffd27a';
const PICKUP_COLORS = Object.freeze({ heart: '#ff6b81', chain: '#6fc3ff', frost: '#bdf2ff', power: '#ff5a3c', nova: '#ffe66b' });

/** One function per simulation event: what the player sees when it happens. */
const HANDLERS = {
    cast(fx, e) {
        fx.zap(e.from, e.to);
    },
    boltHit(fx, e) {
        fx.burst(e.x, e.y, { count: 8, power: 0.6, duration: 0.3 });
        if (!e.killed) fx.kick(2);
    },
    kill(fx, e) {
        fx.corpse(e);
        fx.burst(e.x, e.y, { count: 18, palette: ['#ffffff', MONSTER_COLORS[e.kind], '#3a1a4a'], power: 1.2 });
        fx.text(`+${e.points}`, e.x, e.y - 50, { color: e.invader ? '#ff9ad5' : GOLD, size: e.invader ? 26 : 18 });
        fx.kick(e.invader ? 10 : 4);
    },
    burst(fx, e) {
        fx.burst(e.x, e.y, { count: 12, palette: ['#ffffff', MONSTER_COLORS[e.kind], '#3a1a4a'] });
    },
    fizzle(fx, e) {
        fx.burst(e.x, e.y, { count: 6, power: 0.4, duration: 0.25, palette: ['#ffffff', '#888888'] });
    },
    miss(fx, e) {
        fx.text(STRINGS.miss, e.x, e.y - 20, { color: '#9aa4b8', size: 14, rise: 20, duration: 0.5 });
    },
    shotDown(fx, e) {
        fx.burst(e.x, e.y, { count: 10, power: 0.7, duration: 0.35 });
        fx.text(`+${e.points}`, e.x, e.y - 24, { size: 14 });
    },
    shield(fx, e, sim) {
        fx.ring(sim.mage.chest.x, sim.mage.chest.y, { color: '#7ad7ff', radius: 95 });
    },
    blocked(fx, e) {
        fx.ring(e.x, e.y, { color: '#ffffff', radius: 70, duration: 0.25 });
        fx.text(STRINGS.block, e.x, e.y - 90, { color: '#9be7ff', size: 20 });
        fx.kick(5);
    },
    reflect(fx, e) {
        fx.burst(e.x, e.y, { count: 8, power: 0.5, palette: ['#ffffff', '#9be7ff'] });
    },
    hurt(fx) {
        fx.kick(12);
        fx.hurtFlash = 1;
    },
    death(fx, e, sim) {
        const { x, y } = sim.mage.chest;
        fx.burst(x, y, { count: 28, power: 1.6, duration: 0.9 });
        fx.kick(18);
    },
    spawn(fx, e) {
        fx.portal(e.x, e.y, e.flying, e.invader ? 'rgba(255,90,200,0.9)' : MONSTER_COLORS[e.kind]);
    },
    drop(fx, e) {
        fx.burst(e.x, e.y, { count: 8, power: 0.5, palette: ['#ffffff', '#fff3a0'] });
    },
    pickup(fx, e) {
        fx.ring(e.x, e.y - 22, { color: PICKUP_COLORS[e.kind], radius: 60 });
        fx.text(STRINGS.pickups[e.kind], e.x, e.y - 70, { color: PICKUP_COLORS[e.kind], size: 22 });
    },
    nova(fx, e) {
        fx.ring(e.x, e.y, { color: '#ffe66b', radius: 900, duration: 0.6, width: 18 });
        fx.kick(14);
    },
    boon(fx, e, sim) {
        const { x, y } = sim.mage.chest;
        fx.ring(x, y, { color: GOLD, radius: 120, duration: 0.5, width: 10 });
        fx.text(STRINGS.boons[e.id].name, x, y - 150, { color: GOLD, size: 26, duration: 1.2 });
    },
    vampire(fx, e) {
        fx.ring(e.x, e.y, { color: '#ff6a7a', radius: 70 });
        fx.text('+1', e.x, e.y - 110, { color: '#ff6a7a', size: 22 });
    },
    thorns(fx, e) {
        fx.burst(e.x, e.y, { count: 12, power: 0.8, palette: ['#e8ffd0', '#5fae3a', '#2f6a20'] });
    },
    fury(fx, e) {
        fx.text(STRINGS.fury, 480, 330, { color: '#ff6b6b', size: 30, rise: 10, duration: 2.4 });
        fx.text(`${STRINGS.furyHearts} ${e.hearts} ${STRINGS.hearts}`, 480, 372, { color: '#ffb3b3', size: 18, rise: 10, duration: 2.4 });
        fx.kick(6);
    },
    critical(fx, e) {
        fx.burst(e.x, e.y, { count: 16, power: 1.1, duration: 0.45, palette: ['#ffffff', '#ffe066', '#ff8a3c'] });
        fx.text(STRINGS.critical, e.x, e.y - 60, { color: '#ffe066', size: 24, duration: 0.8 });
        fx.kick(6);
    },
    stormReady(fx, e, sim) {
        const { x, y } = sim.mage.chest;
        fx.text(STRINGS.stormReady, x, y - 150, { color: STORM_COLOR, size: 24, duration: 1.2 });
    },
    storm(fx, e) {
        fx.ring(e.x, e.y, { color: STORM_COLOR, radius: 140, duration: 0.45, width: 10 });
        fx.text(STRINGS.storm, 480, 170, { color: STORM_COLOR, size: 44, rise: 16, duration: 1.1 });
        fx.kick(8);
    },
    lightning(fx, e) {
        fx.lightning(e.x, e.y);
        fx.burst(e.x, e.y, { count: 12, power: 0.9, duration: 0.4, palette: ['#ffffff', '#c9a6ff', STORM_COLOR] });
        fx.kick(4);
    },
    combo(fx, e, sim) {
        const { x, y } = sim.mage.chest;
        fx.text(`X${e.multiplier}!`, x, y - 130, { color: '#ff9ad5', size: 28, duration: 0.8 });
    },
    waveClear(fx, e) {
        fx.text(`${STRINGS.waveClear} +${e.bonus}`, 480, 200, { size: 30, rise: 20, duration: 1.8 });
        if (e.flawless) fx.text(STRINGS.flawless, 480, 245, { color: '#9be7ff', size: 22, rise: 20, duration: 1.8 });
    },
};

/** Turns the events of a tick into effects. */
export function playEvents(effects, events, sim) {
    for (const event of events) HANDLERS[event.type]?.(effects, event, sim);
}
