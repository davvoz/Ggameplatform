// Serves the game folder, opens a page in headless Chrome and saves screenshots.
// Usage: node tools/shots.js <page path> <out.png> [--size 1280x720] [--wait 1500] [--scale 1]
//                            [--shots 3 --every 1000]   several screenshots, out-1.png, out-2.png...
//        Pages can print lines starting with "SHOT name" to ask for a named screenshot.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SDK = fileURLToPath(new URL('../../../../sdk/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

const args = process.argv.slice(2);
const page = args[0];
const out = args[1];
const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : fallback;
};
const [width, height] = opt('size', '1280x720').split('x').map(Number);
const wait = Number(opt('wait', 1500));
const scale = Number(opt('scale', 1));
const shots = Number(opt('shots', 1));
const every = Number(opt('every', 1000));
const touch = args.includes('--touch');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resolves a URL path inside base; null when "../" would leave it.
function within(base, urlPath) {
    const root = resolve(base);
    const path = resolve(root, `.${sep}${decodeURIComponent(urlPath)}`);
    return path.startsWith(root + sep) ? path : null;
}

const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname.startsWith('/sdk/') ? within(SDK, url.pathname.slice(5)) : within(ROOT, url.pathname);
    if (!path) {
        res.writeHead(403).end();
        return;
    }
    try {
        const body = readFileSync(path);
        res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(body);
    } catch {
        res.writeHead(404).end();
    }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'nonna-shot-'));
const chrome = spawn(CHROME, [
    '--headless=new', '--mute-audio', '--hide-scrollbars', `--force-device-scale-factor=${scale}`,
    `--window-size=${width},${height}`, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { stdio: 'ignore' });

// Runs fn(item, index) for each item, one after the other: these steps are
// timed (screenshots spaced apart, page scripts in order), not independent.
const inSequence = (items, fn) => items.reduce((prev, item, i) => prev.then(() => fn(item, i)), Promise.resolve());

// Polls Chrome until its page target is up (about 12 s at most).
async function target(triesLeft = 60) {
    const url = await fetch(`http://127.0.0.1:${port}/json`)
        .then((r) => r.json())
        .then((list) => list.find((t) => t.type === 'page')?.webSocketDebuggerUrl)
        .catch(() => null); // still starting
    if (url) return url;
    if (triesLeft <= 1) throw new Error('no chrome');
    await sleep(200);
    return target(triesLeft - 1);
}

try {
    const ws = new WebSocket(await target());
    await new Promise((r) => ws.addEventListener('open', r));
    let id = 0;
    const pending = new Map();
    const logs = [];
    ws.addEventListener('message', (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pending.has(m.id)) {
            pending.get(m.id)(m.result ?? m.error);
            pending.delete(m.id);
        }
        if (m.method === 'Runtime.consoleAPICalled') {
            const text = m.params.args.map((a) => a.value ?? a.description).join(' ');
            logs.push(text);
            console.log('[page]', text);
        }
        if (m.method === 'Runtime.exceptionThrown') console.log('[page error]', JSON.stringify(m.params.exceptionDetails).slice(0, 600));
    });
    const send = (method, params = {}) => new Promise((r) => {
        const n = ++id;
        pending.set(n, r);
        ws.send(JSON.stringify({ id: n, method, params }));
    });
    await send('Runtime.enable');
    // exact viewport, whatever the headless window decides
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: touch });
    if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    if (touch) await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    // a full URL opens that page (the platform itself); a path opens a file of the game
    const url = page.startsWith('http') ? page : `http://127.0.0.1:${server.address().port}/${page}`;
    await send('Page.navigate', { url });
    await sleep(wait);
    // --eval "js" runs in the page (repeatable), each followed by --after ms
    const evals = args.flatMap((a, i) => (a === '--eval' ? [args[i + 1]] : []));
    await inSequence(evals, async (expression) => {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true });
        console.log('[eval]', JSON.stringify(result?.result?.value ?? result?.exceptionDetails?.text ?? null).slice(0, 200));
        await sleep(Number(opt('after', 3000)));
    });
    mkdirSync(dirname(out), { recursive: true });
    const save = async (file) => {
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(file, Buffer.from(data, 'base64'));
        console.log('saved', file);
    };
    if (shots === 1) await save(out);
    else {
        await inSequence(Array.from({ length: shots }, (_, i) => i + 1), async (n) => {
            await save(out.replace(/\.png$/, `-${n}.png`));
            if (n < shots) await sleep(every);
        });
    }
    // named shots requested by the page ("SHOT name"), until it prints DONE (60 s at most)
    const follow = async (ticksLeft, done) => {
        const named = logs.filter((l) => l.startsWith('SHOT '));
        await inSequence(named.slice(done), (line) => save(out.replace(/\.png$/, `-${line.slice(5).trim()}.png`)));
        if (ticksLeft <= 1 || logs.some((l) => l.startsWith('DONE'))) return;
        await sleep(100);
        await follow(ticksLeft - 1, named.length);
    };
    if (args.includes('--follow')) await follow(600, 0);
    ws.close();
} finally {
    chrome.kill();
    server.close();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
