// How far bots of different skill get, and what they score. Use it to tune.
// Usage: node tests/support/measure.js [seeds]
import { Simulation } from '../../js/sim/Simulation.js';
import { playRun } from './bot.js';

const seeds = Number(process.argv[2] ?? 3);
for (const skill of [1, 0.85, 0.6]) {
    for (let s = 1; s <= seeds; s++) {
        const started = performance.now();
        const { sim } = await playRun(Simulation, s * 7919, { skill });
        const r = sim.result();
        const ms = performance.now() - started;
        console.log(
            `skill ${skill} seed ${s}: mission ${r.reachedMission}${r.victory ? ' WON' : ''}`,
            `score ${r.score} kills ${r.kills} rescues ${r.rescues} teeth ${r.teeth} x${r.bestMultiplier}`,
            `time ${(r.ticks / 60).toFixed(0)}s lives ${sim.player.lives} cam ${sim.world.camera.x.toFixed(0)}/${sim.world.camera.maxX}`,
            `(${ms.toFixed(0)} ms)`,
        );
    }
}
