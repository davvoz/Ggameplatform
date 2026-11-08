// Serves the game folder, opens a page in headless Chrome and saves screenshots.
// Usage: node tools/shots.js <page path> <out.png> [--size 1280x720] [--wait 1500] [--scale 1]
//                            [--shots 3 --every 1000]   several screenshots, out-1.png, out-2.png...
//        Pages can print lines starting with "SHOT name" to ask for a named screenshot.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
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

const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname.startsWith('/sdk/') ? join(SDK, url.pathname.slice(5)) : join(ROOT, normalize(decodeURIComponent(url.pathname)));
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

async function target() {
    for (let i = 0; i < 60; i++) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
            const p = list.find((t) => t.type === 'page');
            if (p) return p.webSocketDebuggerUrl;
        } catch { /* starting */ }
        await sleep(200);
    }
    throw new Error('no chrome');
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
    for (let i = 0; i < args.length; i++) {
        if (args[i] !== '--eval') continue;
        const result = await send('Runtime.evaluate', { expression: args[i + 1], awaitPromise: true });
        console.log('[eval]', JSON.stringify(result?.result?.value ?? result?.exceptionDetails?.text ?? null).slice(0, 200));
        await sleep(Number(opt('after', 3000)));
    }
    mkdirSync(dirname(out), { recursive: true });
    const save = async (file) => {
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(file, Buffer.from(data, 'base64'));
        console.log('saved', file);
    };
    if (shots === 1) await save(out);
    else {
        for (let i = 1; i <= shots; i++) {
            await save(out.replace(/\.png$/, `-${i}.png`));
            if (i < shots) await sleep(every);
        }
    }
    // named shots requested by the page
    let done = 0;
    for (let t = 0; t < 600 && args.includes('--follow'); t++) {
        const named = logs.filter((l) => l.startsWith('SHOT '));
        while (done < named.length) {
            const name = named[done++].slice(5).trim();
            await save(out.replace(/\.png$/, `-${name}.png`));
        }
        if (logs.some((l) => l.startsWith('DONE'))) break;
        await sleep(100);
    }
    ws.close();
} finally {
    chrome.kill();
    server.close();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
