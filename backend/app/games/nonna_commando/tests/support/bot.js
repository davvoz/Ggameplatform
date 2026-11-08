import { DemoPilot } from '../../js/app/DemoPilot.js';

export { DemoPilot as Bot };

/** Play a whole run with a bot; returns the simulation and the recorded buttons. */
export async function playRun(Simulation, seed, { skill = 1, maxTicks = 60 * 60 * 25, startMission = 0 } = {}) {
    const sim = new Simulation(seed, { startMission });
    const bot = new DemoPilot(skill);
    const inputs = [];
    while (!sim.finished && sim.tick < maxTicks) {
        const bits = bot.buttons(sim);
        inputs.push(bits);
        sim.step(bits);
    }
    return { sim, inputs };
}
