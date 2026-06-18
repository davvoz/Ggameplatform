import { getCurrentGameRuntime } from './state.js';

/**
 * Version Watcher
 * --------------------------------------------------------------------------
 * Polls /version.json and forces a client reload when the server version
 * changes, so that long-lived tabs don't keep running stale code.
 *
 * To avoid interrupting an active game, the reload is deferred while the user
 * is on the /play/ route and triggered as soon as they leave it.
 */

// How often to poll for a new version while the tab is open (ms)
const POLL_INTERVAL_MS = 3 * 60 * 1000;

// Baseline version key captured at startup (`<version>#<buildNumber>`)
let knownKey = null;

// True once a reload has been decided, to avoid scheduling it twice
let reloadScheduled = false;

// True while we are waiting for the user to leave a game before reloading
let pendingReload = false;

let pollTimer = null;

/**
 * Build a comparable key from the version payload.
 */
function versionKey(data) {
    if (!data) return null;
    return `${data.version ?? '?'}#${data.buildNumber ?? '?'}`;
}

/**
 * Fetch the current server version, bypassing any HTTP cache.
 * @returns {Promise<object|null>}
 */
async function fetchVersionInfo() {
    try {
        const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Whether the user is currently playing a game (reload must be deferred).
 */
function isPlayingGame() {
    const hash = globalThis.location.hash || '';
    return hash.startsWith('#/play/') || Boolean(getCurrentGameRuntime());
}

/**
 * Show a brief toast, then hard-reload the page.
 */
function forceReload() {
    showUpdateToast();
    setTimeout(() => globalThis.location.reload(), 1500);
}

/**
 * Minimal toast (no external deps) shown right before reloading.
 */
function showUpdateToast() {
    const toast = document.createElement('div');
    toast.className = 'version-update-toast';
    toast.textContent = 'New version available — updating…';

    if (!document.querySelector('#version-update-toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'version-update-toast-styles';
        styles.textContent = `
            .version-update-toast {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 0.9rem;
                background: var(--primary-color, #4f46e5);
                color: #fff;
                z-index: 99999;
                opacity: 0;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            }
            .version-update-toast.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
}

/**
 * Decide what to do once a new version is detected.
 */
function onNewVersion() {
    if (reloadScheduled) return;
    reloadScheduled = true;

    // Stop polling, we already know we need to update.
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }

    if (isPlayingGame()) {
        // Defer until the player leaves the game to avoid losing the run.
        pendingReload = true;
        globalThis.addEventListener('hashchange', () => {
            if (pendingReload && !isPlayingGame()) {
                pendingReload = false;
                forceReload();
            }
        });
        return;
    }

    forceReload();
}

/**
 * Compare the latest server version against the baseline.
 */
async function checkVersion() {
    if (reloadScheduled) return;
    const data = await fetchVersionInfo();
    const key = versionKey(data);
    if (!key) return;

    if (knownKey === null) {
        knownKey = key;
        return;
    }

    if (key !== knownKey) {
        onNewVersion();
    }
}

/**
 * Start watching for server version changes.
 */
export function initVersionWatcher() {
    // Capture the baseline version, then poll on an interval.
    checkVersion();
    pollTimer = setInterval(checkVersion, POLL_INTERVAL_MS);

    // Also re-check when the tab regains attention (covers laptops waking from
    // sleep, switching back to the tab, etc.).
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkVersion();
    });
    globalThis.addEventListener('focus', checkVersion);
}

export default { initVersionWatcher };
