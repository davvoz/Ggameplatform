// Draws tools/cover/cover.js in headless Chrome and writes the two cover files
// (thumbnail.png 1280x720, thumbnail_preview.webp 640x360) in the game folder.
// Usage: node tools/cover/render-cover.js
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const TIMEOUT_MS = 30000;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
/** The only files the page may write. */
const OUTPUTS = new Set(['thumbnail.png', 'thumbnail_preview.webp']);

function serveFile(url, response) {
    try {
        // Serve only files inside ROOT: "../" in the URL cannot reach out of it.
        const path = resolve(ROOT, `.${decodeURIComponent(url.pathname)}`);
        if (!path.startsWith(resolve(ROOT) + sep)) {
            response.writeHead(403).end();
            return;
        }
        const content = readFileSync(path);
        response.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
        response.end(content);
    } catch {
        response.writeHead(404).end();
    }
}

function saveUpload(request, response, name) {
    if (!OUTPUTS.has(name)) {
        response.writeHead(403).end();
        return;
    }
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
        const data = Buffer.concat(chunks);
        writeFileSync(join(ROOT, name), data);
        console.log(`${name}: ${Math.round(data.length / 1024)} KB`);
        response.writeHead(204).end();
    });
}

const profile = mkdtempSync(join(tmpdir(), 'apex-drive-cover-'));
let chrome = null;

const finished = new Promise((resolveDone, reject) => {
    const server = createServer((request, response) => {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname === '/done') {
            response.writeHead(204).end();
            server.close();
            resolveDone();
        } else if (url.pathname.startsWith('/save/')) {
            saveUpload(request, response, basename(url.pathname));
        } else {
            serveFile(url, response);
        }
    });

    server.listen(0, '127.0.0.1', () => {
        const page = `http://127.0.0.1:${server.address().port}/tools/cover/cover.html?save=1`;
        chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--user-data-dir=${profile}`, page], { stdio: 'ignore' });
    });
    setTimeout(() => reject(new Error('The cover did not finish in time')), TIMEOUT_MS).unref();
});

try {
    await finished;
} finally {
    chrome?.kill();
    await new Promise((done) => setTimeout(done, 300));
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
