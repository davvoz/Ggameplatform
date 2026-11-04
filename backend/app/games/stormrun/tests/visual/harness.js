// Plays a bot up to a tick and leaves the frame on screen, for screenshots.
// Query: ?tick=900&w=844&h=390&seed=7919&perf=1
import { Simulation } from '../../js/sim/Simulation.js';
import { SceneRenderer } from '../../js/render/SceneRenderer.js';
import { Rng } from '../../js/core/Rng.js';
import { goodBot } from '../support/bots.js';

const query = new URLSearchParams(location.search);
const number = (key, fallback) => Number(query.get(key) ?? fallback);

const width = number('w', 844);
const height = number('h', 390);
const canvas = document.getElementById('c');
canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;

const renderer = new SceneRenderer(canvas);
renderer.resize(width, height);
const sim = new Simulation(number('seed', 7919));
renderer.attach(sim);
renderer.setFlags([
    { label: 'You', metres: 180, color: '#e5483f' },
    { label: 'verdu.green', metres: 420, color: '#3f8fd2' },
]);

const bot = goodBot(new Rng(number('seed', 7919)));
const target = number('tick', 300);
const perf = query.has('perf');
let spent = 0;
let frames = 0;

for (let i = 0; i < target && !sim.finished; i++) {
    sim.step(bot(sim));
    renderer.handle(sim.drainEvents());
    const before = performance.now();
    renderer.render(1 / 60, 1);
    if (i > 60) {
        spent += performance.now() - before;
        frames++;
    }
}

document.getElementById('out').textContent = JSON.stringify({
    metres: sim.metres,
    gap: Math.round(sim.gap),
    bands: sim.tank.bands,
    grounded: sim.runner.grounded,
    finished: sim.finished,
    msPerFrame: perf ? +(spent / Math.max(1, frames)).toFixed(3) : undefined,
});
document.title = 'done';
