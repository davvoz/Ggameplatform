// Plays the real page in real time in headless Chrome and saves screenshots.
// Usage: node tests/visual/run-e2e.js <base-url> <output-dir>
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const [baseUrl = 'http://127.0.0.1:8765', outputDir = 'e2e-output'] = process.argv.slice(2);
const TIMEOUT_MS = 180000;
const POLL_MS = 400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pageSocketUrl() {
    for (let attempt = 0; attempt < 50; attempt++) {
        try {
            const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
            const page = targets.find((target) => target.type === 'page');
            if (page) return page.webSocketDebuggerUrl;
        } catch {
            // Chrome is still starting
        }
        await sleep(200);
    }
    throw new Error('Chrome did not open a debugging port');
}

function connect(url) {
    const socket = new WebSocket(url);
    const pending = new Map();
    let nextId = 1;

    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        pending.get(message.id)?.(message.result);
        pending.delete(message.id);
    });

    const send = (method, params = {}) => new Promise((resolve) => {
        const id = nextId++;
        pending.set(id, resolve);
        socket.send(JSON.stringify({ id, method, params }));
    });

    return new Promise((resolve) => socket.addEventListener('open', () => resolve({ send, socket })));
}

async function main() {
    mkdirSync(outputDir, { recursive: true });
    const profile = mkdtempSync(join(tmpdir(), 'stormrun-e2e-'));
    const chrome = spawn(CHROME, [
        '--headless=new', '--mute-audio', '--hide-scrollbars', '--force-device-scale-factor=2',
        '--window-size=844,520', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
        '--autoplay-policy=no-user-gesture-required',
        `${baseUrl}/tests/visual/e2e.html?stop=again`,
    ], { stdio: 'ignore' });

    try {
        const { send, socket } = await connect(await pageSocketUrl());
        const seen = new Set();
        const started = Date.now();

        while (Date.now() - started < TIMEOUT_MS) {
            const { result } = await send('Runtime.evaluate', {
                expression: "document.getElementById('out').textContent",
            });
            const lines = (result.value ?? '').split('\n');
            for (const line of lines) {
                if (seen.has(line)) continue;
                seen.add(line);
                console.log(line);
                const name = line.split(/[: ]/)[0];
                const { data } = await send('Page.captureScreenshot', { format: 'png' });
                writeFileSync(join(outputDir, `${seen.size}-${name}.png`), Buffer.from(data, 'base64'));
            }
            if (lines.some((line) => line.startsWith('FAILED') || line.startsWith('finished'))) break;
            await sleep(POLL_MS);
        }
        socket.close();
    } finally {
        chrome.kill();
        await sleep(300);
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
