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

function prefersReducedMotion() {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Run a page update, animated when possible.
 * The update must swap the page synchronously: async renderers are started but
 * not awaited, so the animation never waits for network data.
 * @param {() => void} update - swaps the page content
 * @param {{ animate?: boolean }} [options]
 */
export function runPageTransition(update, { animate = true } = {}) {
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
