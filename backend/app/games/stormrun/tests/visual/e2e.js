// Drives the real page: start, press on descents, wait for the storm, restart.
// Query: ?stop=ready|running|over  (the step to leave on screen)
const stop = new URLSearchParams(location.search).get('stop') ?? 'over';
const frame = document.getElementById('game');
const out = document.getElementById('out');
const log = [];
const note = (text) => {
    log.push(text);
    out.textContent = log.join('\n');
};

// Stands in for the platform shell: answers with the config, records what it gets.
globalThis.addEventListener('message', ({ data, source, origin }) => {
    const { type, payload, protocolVersion } = data ?? {};
    if (type === 'ready') {
        source.postMessage({ type: 'config', payload: { userId: 'user_e2e' }, protocolVersion }, origin);
    }
    if (type === 'gameOver') {
        note(`platform gameOver: score ${payload.score}, ${JSON.stringify(payload.extra_data)}`);
        // the server answers at once here: before the end screen, the hardest case
        source.postMessage({ type: 'showXPBanner', payload: { xp_earned: 12.5 }, protocolVersion }, origin);
        source.postMessage({
            type: 'showLevelUpModal',
            payload: { new_level: 7, title: 'Runner', coins_awarded: 50, user_data: { is_anonymous: false } },
            protocolVersion,
        }, origin);
    }
    if (type === 'resetSession') note(`platform resetSession ${performance.now() | 0}`);
    if (type === 'saveProgress') note(`platform saveProgress: ${JSON.stringify(payload.progress_data)}`);
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(check, label, timeoutMs = 90000) {
    const end = performance.now() + timeoutMs;
    while (performance.now() < end) {
        if (check()) return;
        await wait(50);
    }
    throw new Error(`timed out waiting for ${label}`);
}

function press(type, target, doc) {
    target.dispatchEvent(new doc.defaultView.PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true }));
}

async function run() {
    await new Promise((resolve) => frame.addEventListener('load', resolve));
    const doc = frame.contentDocument;
    const shown = (id) => !doc.getElementById(id).hidden;

    await until(() => shown('screen-ready') && doc.getElementById('loading').hidden, 'ready screen');
    note('ready screen shown');
    if (stop === 'ready') return;

    await wait(500);
    doc.getElementById('btn-play').click();
    await until(() => shown('hud'), 'hud');
    note('run started');

    let frames = 0;
    const countStart = performance.now();
    const count = () => {
        frames++;
        requestAnimationFrame(count);
    };
    requestAnimationFrame(count);

    const canvas = doc.getElementById('game-canvas');
    for (let i = 0; i < 12; i++) {
        press('pointerdown', canvas, doc);
        await wait(700);
        press('pointerup', canvas, doc);
        await wait(700);
    }
    note(`metres after 17 s: ${doc.getElementById('hud-metres').textContent}`);
    note(`fps: ${Math.round((frames * 1000) / (performance.now() - countStart))}`);
    if (stop === 'running') return;

    await until(() => doc.querySelectorAll('.sticker').length === 2, 'reward stickers');
    note(`stickers: ${[...doc.querySelectorAll('.sticker')].map((sticker) => sticker.innerText.replace('\n', ' / ')).join(' | ')}`);

    await until(() => shown('screen-over'), 'game over');
    note(`game over: ${doc.getElementById('over-metres').textContent}, ${doc.getElementById('over-best').textContent}`);
    if (stop === 'over') return;

    await wait(600);
    doc.getElementById('btn-again').click();
    await until(() => shown('hud'), 'second run');
    note('second run started');
}

run().then(() => note('finished')).catch((error) => note(`FAILED: ${error.message}`));
