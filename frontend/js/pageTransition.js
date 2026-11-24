/**
 * Page change animation.
 *
 * Wraps the DOM update of a route change in the View Transitions API: the browser
 * snapshots the old page, applies the update, then animates old -> new on the
 * GPU (animations defined in css/page-transitions.css). Browsers without the API,
 * or users who prefer reduced motion, get the instant update as before.
 */

// Set on <html> while the new page is applied, so the CSS can give the new page
// a different view-transition-name than the old one
const PHASE_ATTRIBUTE = 'data-page-transition';

// Longest wait for the new page before uncovering it anyway (see runWithNextPageChange)
const MAX_PAGE_WAIT_MS = 1200;

// Work to run once the next page has arrived (see runWithNextPageChange)
let pendingAfterNextPage = null;

function prefersReducedMotion() {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * The next page change happens under something covering the page (the open
 * mobile menu): the page is swapped without animation, hidden by the cover, and
 * `callback` (which removes the cover, with its own animation) runs once the new
 * page has arrived, or after MAX_PAGE_WAIT_MS at most.
 * @param {() => void} callback
 */
export function runWithNextPageChange(callback) {
    pendingAfterNextPage = callback;
}

function takePendingAfterNextPage() {
    const callback = pendingAfterNextPage;
    pendingAfterNextPage = null;
    return callback;
}

/**
 * Resolve when `rendering` settles or after `maxMs`, whichever comes first.
 * A failed render is logged, not rethrown: the cover must still be removed.
 * @param {*} rendering - value returned by the page update (a promise for async pages)
 * @param {number} maxMs
 */
function settleWithin(rendering, maxMs) {
    const settled = Promise.resolve(rendering)
        .catch(error => console.error('Page render failed:', error));
    const timeout = new Promise(resolve => setTimeout(resolve, maxMs));
    return Promise.race([settled, timeout]);
}

/**
 * Run a page update, animated when possible.
 * The animation does not wait for async renderers (network data).
 * @param {() => (void|Promise<void>)} update - swaps the page content
 * @param {{ animate?: boolean }} [options]
 */
export function runPageTransition(update, { animate = true } = {}) {
    const afterPage = takePendingAfterNextPage();
    if (afterPage) {
        settleWithin(update(), MAX_PAGE_WAIT_MS).then(afterPage);
        return;
    }

    const canAnimate = animate
        && typeof document.startViewTransition === 'function'
        && !prefersReducedMotion();

    if (!canAnimate) {
        update();
        return;
    }

    const root = document.documentElement;
    const transition = document.startViewTransition(() => {
        root.setAttribute(PHASE_ATTRIBUTE, 'new');
        update();
    });
    const clearPhase = () => root.removeAttribute(PHASE_ATTRIBUTE);
    transition.finished.then(clearPhase, clearPhase);
}
