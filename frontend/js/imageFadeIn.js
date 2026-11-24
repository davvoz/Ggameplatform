/**
 * Image fade-in: images (game thumbnails, avatars, ...) fade in when they finish
 * loading instead of popping in.
 *
 * How it works:
 * - a MutationObserver marks every <img> that is added (or whose src changes)
 *   and is not loaded yet with `img-pending` (hidden by CSS). It runs before the
 *   next paint, so a not-yet-loaded image never flashes;
 * - a capturing load/error listener on the document swaps `img-pending` for
 *   `img-fade-in` (CSS animation) when the image arrives;
 * - images already loaded (e.g. from cache) are left untouched: no flicker.
 * Opt out on a single image with the `data-no-fade` attribute.
 * Styles live in css/ui-animations.css.
 *
 * CSS background images (profile avatar / cover) are not <img>: use
 * `setBackgroundImageWithFade`, which applies the background once it is loaded
 * and adds `bg-fade-in` so the component CSS can animate its appearance.
 */

const PENDING_CLASS = 'img-pending';
const FADE_CLASS = 'img-fade-in';
const BG_FADE_CLASS = 'bg-fade-in';

let initialized = false;

function isImage(node) {
    return node instanceof HTMLImageElement;
}

function isLoaded(img) {
    return img.complete && img.naturalWidth > 0;
}

/**
 * Hide an image until it loads (only if it is not loaded yet).
 * @param {HTMLImageElement} img
 */
function trackImage(img) {
    if (img.hasAttribute('data-no-fade')) return;
    if (img.complete) {
        // Loaded (or nothing to load / already failed): make sure it is visible
        img.classList.remove(PENDING_CLASS);
        return;
    }
    img.classList.add(PENDING_CLASS);
}

function trackTree(node) {
    if (isImage(node)) {
        trackImage(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        node.querySelectorAll('img').forEach(trackImage);
    }
}

function onImageSettled(event) {
    const img = event.target;
    if (!isImage(img) || !img.classList.contains(PENDING_CLASS)) return;

    img.classList.remove(PENDING_CLASS);
    // Broken images are just shown as before, without animation
    if (event.type !== 'load' || !isLoaded(img)) return;

    img.classList.add(FADE_CLASS);
    img.addEventListener('animationend', () => img.classList.remove(FADE_CLASS), { once: true });
}

function onMutations(records) {
    for (const record of records) {
        if (record.type === 'attributes') {
            trackTree(record.target);
        } else {
            record.addedNodes.forEach(trackTree);
        }
    }
}

/**
 * Start the fade-in behaviour for all images under `root` (default: <body>).
 * Safe to call more than once.
 * @param {HTMLElement} [root]
 */
export function initImageFadeIn(root = document.body) {
    if (initialized || !root) return;
    initialized = true;

    // load/error do not bubble: listen in the capture phase
    document.addEventListener('load', onImageSettled, true);
    document.addEventListener('error', onImageSettled, true);

    new MutationObserver(onMutations).observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset']
    });

    trackTree(root);
}

function restartClassAnimation(element, className) {
    element.classList.remove(className);
    // Force a reflow so the CSS animation restarts
    element.getBoundingClientRect();
    element.classList.add(className);

    // animationend bubbles: ignore the ones coming from children
    const onEnd = (event) => {
        if (event.target !== element) return;
        element.classList.remove(className);
        element.removeEventListener('animationend', onEnd);
    };
    element.addEventListener('animationend', onEnd);
}

/**
 * Set a CSS background image, fading it in when it finishes loading.
 * Already cached images are applied immediately without animation; broken
 * images are applied as before (no background shown).
 * @param {HTMLElement} element
 * @param {string} url
 * @param {() => void} [onApply] - called when the background is actually set
 */
export function setBackgroundImageWithFade(element, url, onApply) {
    if (!element || !url) return;

    const apply = (animate) => {
        element.style.backgroundImage = `url("${String(url).replaceAll('"', '%22')}")`;
        if (animate) restartClassAnimation(element, BG_FADE_CLASS);
        onApply?.();
    };

    const probe = new Image();
    probe.src = url;
    if (probe.complete && probe.naturalWidth > 0) {
        apply(false);
        return;
    }
    probe.addEventListener('load', () => apply(element.isConnected), { once: true });
    probe.addEventListener('error', () => apply(false), { once: true });
}
