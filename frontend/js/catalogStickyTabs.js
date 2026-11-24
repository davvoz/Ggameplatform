/**
 * Sticky catalog tabs (Ranked / Fun / Steem Games).
 *
 * Keeps the tab bar attached right below the navbar while scrolling and toggles
 * the `is-stuck` class once it is pinned (used by the CSS for the stuck look).
 */

const STUCK_CLASS = 'is-stuck';

let teardownCurrent = null;

function getNavbarHeight(navbar) {
    return navbar ? navbar.getBoundingClientRect().height : 0;
}

/**
 * Watch the sentinel placed right above the bar: once it scrolls above the
 * sticky offset, the bar is stuck.
 */
function createStuckObserver(sentinel, tabs, offset) {
    const observer = new IntersectionObserver(([entry]) => {
        const isStuck = !entry.isIntersecting && entry.boundingClientRect.top < offset;
        tabs.classList.toggle(STUCK_CLASS, isStuck);
    }, { rootMargin: `-${offset}px 0px 0px 0px`, threshold: 0 });

    observer.observe(sentinel);
    return observer;
}

/**
 * Initialise the sticky behaviour for the catalog tabs currently in the DOM.
 * Safe to call on every catalog render: the previous instance is torn down.
 */
export function initStickyCatalogTabs() {
    teardownCurrent?.();
    teardownCurrent = null;

    const tabs = document.querySelector('.game-mode-tabs');
    const sentinel = document.querySelector('.game-mode-tabs-sentinel');
    if (!tabs || !sentinel || typeof IntersectionObserver === 'undefined') return;

    const navbar = document.querySelector('.navbar');
    let stuckObserver = null;

    const applyOffset = () => {
        if (!tabs.isConnected) {
            teardownCurrent?.();
            return;
        }
        // Flush with the navbar: no gap between navbar and tab bar
        const offset = Math.floor(getNavbarHeight(navbar));
        tabs.style.setProperty('--sticky-top', `${offset}px`);
        stuckObserver?.disconnect();
        stuckObserver = createStuckObserver(sentinel, tabs, offset);
    };

    // The navbar height changes with viewport / safe areas: keep the offset in sync
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(applyOffset);
    if (navbar) resizeObserver?.observe(navbar);
    applyOffset();

    teardownCurrent = () => {
        stuckObserver?.disconnect();
        resizeObserver?.disconnect();
        tabs.classList.remove(STUCK_CLASS);
        teardownCurrent = null;
    };
}
