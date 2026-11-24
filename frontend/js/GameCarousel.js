/**
 * Game carousel: a slim, horizontally scrollable strip of games used to pick
 * the game of the leaderboard (replaces the big grid of game cards).
 *
 * - Touch / trackpad: native horizontal scroll with scroll-snap.
 * - Mouse: drag the strip to scroll it, or use the arrow buttons (shown only on
 *   devices with hover, hidden at the ends).
 * - The selected game is kept centered in the strip.
 *
 * Selection itself is handled by the page through `data-action="select-game"`
 * (event delegation), this module only renders and drives the strip.
 */

const ITEM_SELECTOR = '.game-carousel-item';
// Fraction of the visible width scrolled by one arrow click
const ARROW_SCROLL_RATIO = 0.8;
// Tolerance (px) when checking if the strip is at one of its ends
const EDGE_TOLERANCE_PX = 4;
// Mouse movement (px) after which a press on the strip becomes a drag, not a click
const DRAG_THRESHOLD_PX = 6;
// Set on the carousel while the strip is dragged with the mouse (leaderboard.css)
const DRAGGING_CLASS = 'is-dragging';

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderItem(game, isSelected, getThumbnailUrl) {
    const title = escapeHtml(game.title);
    const steemBadge = game.steem_rewards_enabled
        ? '<span class="game-carousel-steem" title="STEEM rewards"><img src="./icons/steem.png" alt="STEEM"></span>'
        : '';

    return `
        <button type="button" class="game-carousel-item ${isSelected ? 'active' : ''}"
                data-action="select-game" data-game-id="${escapeHtml(game.game_id)}"
                aria-pressed="${isSelected}" title="${title}">
            <span class="game-carousel-thumb">
                <img src="${escapeHtml(getThumbnailUrl(game))}" alt="" loading="lazy">
                ${steemBadge}
            </span>
            <span class="game-carousel-name">${title}</span>
        </button>
    `;
}

/**
 * Render the carousel markup.
 * @param {Object[]} games
 * @param {string|null} selectedGameId
 * @param {(game: Object) => string} getThumbnailUrl
 * @returns {string} HTML
 */
export function renderGameCarousel(games, selectedGameId, getThumbnailUrl) {
    const items = games
        .map(game => renderItem(game, game.game_id === selectedGameId, getThumbnailUrl))
        .join('');

    return `
        <div class="game-carousel" data-game-carousel>
            <button type="button" class="game-carousel-arrow game-carousel-arrow--prev" data-carousel-dir="-1" aria-label="Previous games">‹</button>
            <div class="game-carousel-track" role="group" aria-label="Choose a game">
                ${items}
            </div>
            <button type="button" class="game-carousel-arrow game-carousel-arrow--next" data-carousel-dir="1" aria-label="Next games">›</button>
        </div>
    `;
}

/**
 * Horizontal scroll position that centers `item` inside `track`.
 * @param {{ offsetLeft: number, offsetWidth: number }} item
 * @param {{ clientWidth: number, scrollWidth: number }} track
 * @returns {number}
 */
export function getCenteredScrollLeft(item, track) {
    const target = item.offsetLeft + item.offsetWidth / 2 - track.clientWidth / 2;
    const max = Math.max(track.scrollWidth - track.clientWidth, 0);
    return Math.min(Math.max(target, 0), max);
}

/**
 * Drag-to-scroll with the mouse (touch already scrolls natively).
 * A press becomes a drag only past DRAG_THRESHOLD_PX, so a plain click still
 * selects a game; the click that ends a drag is swallowed instead.
 * @param {HTMLElement} track - scrollable strip
 * @param {HTMLElement} carousel - carousel root, gets DRAGGING_CLASS while dragging
 * @returns {() => void} removes the listeners
 */
function enableMouseDragScroll(track, carousel) {
    let drag = null; // { pointerId, startX, startScroll, moved }
    let swallowNextClick = false;

    const onPointerDown = (event) => {
        swallowNextClick = false;
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        drag = { pointerId: event.pointerId, startX: event.clientX, startScroll: track.scrollLeft, moved: false };
    };

    const onPointerMove = (event) => {
        if (event.pointerId !== drag?.pointerId) return;

        const dx = event.clientX - drag.startX;
        if (!drag.moved) {
            if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
            // Captured only now: capturing on press would retarget plain clicks
            drag.moved = true;
            track.setPointerCapture(event.pointerId);
            carousel.classList.add(DRAGGING_CLASS);
        }
        track.scrollLeft = drag.startScroll - dx;
    };

    const onPointerEnd = (event) => {
        if (event.pointerId !== drag?.pointerId) return;
        if (drag.moved) {
            swallowNextClick = true;
            carousel.classList.remove(DRAGGING_CLASS);
        }
        drag = null;
    };

    // Capture phase: stops the click before the page's game selection sees it
    const onClickCapture = (event) => {
        if (!swallowNextClick) return;
        swallowNextClick = false;
        event.preventDefault();
        event.stopPropagation();
    };

    // The browser's own image drag would cancel ours
    const onDragStart = (event) => event.preventDefault();

    track.addEventListener('pointerdown', onPointerDown);
    track.addEventListener('pointermove', onPointerMove);
    track.addEventListener('pointerup', onPointerEnd);
    track.addEventListener('pointercancel', onPointerEnd);
    track.addEventListener('click', onClickCapture, true);
    track.addEventListener('dragstart', onDragStart);

    return () => {
        track.removeEventListener('pointerdown', onPointerDown);
        track.removeEventListener('pointermove', onPointerMove);
        track.removeEventListener('pointerup', onPointerEnd);
        track.removeEventListener('pointercancel', onPointerEnd);
        track.removeEventListener('click', onClickCapture, true);
        track.removeEventListener('dragstart', onDragStart);
        carousel.classList.remove(DRAGGING_CLASS);
    };
}

/**
 * Wire up arrows, mouse dragging and centering for a rendered carousel.
 * @param {HTMLElement} root - element containing the carousel markup
 * @returns {{ select: (gameId: string) => void, destroy: () => void } | null}
 */
export function initGameCarousel(root) {
    const carousel = root?.querySelector('[data-game-carousel]');
    const track = carousel?.querySelector('.game-carousel-track');
    if (!carousel || !track) return null;

    const prevBtn = carousel.querySelector('.game-carousel-arrow--prev');
    const nextBtn = carousel.querySelector('.game-carousel-arrow--next');

    const updateArrows = () => {
        const maxScroll = track.scrollWidth - track.clientWidth;
        const atStart = track.scrollLeft <= EDGE_TOLERANCE_PX;
        const atEnd = track.scrollLeft >= maxScroll - EDGE_TOLERANCE_PX;
        carousel.classList.toggle('is-at-start', atStart);
        carousel.classList.toggle('is-at-end', atEnd);
        if (prevBtn) prevBtn.disabled = atStart;
        if (nextBtn) nextBtn.disabled = atEnd;
    };

    const onArrowClick = (event) => {
        const dir = Number(event.currentTarget.dataset.carouselDir);
        track.scrollBy({ left: dir * track.clientWidth * ARROW_SCROLL_RATIO, behavior: 'smooth' });
    };

    const centerItem = (item, behavior) => {
        track.scrollTo({ left: getCenteredScrollLeft(item, track), behavior });
    };

    prevBtn?.addEventListener('click', onArrowClick);
    nextBtn?.addEventListener('click', onArrowClick);
    track.addEventListener('scroll', updateArrows, { passive: true });
    const disableMouseDragScroll = enableMouseDragScroll(track, carousel);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateArrows);
    resizeObserver?.observe(track);

    const initial = track.querySelector(`${ITEM_SELECTOR}.active`);
    if (initial) centerItem(initial, 'auto');
    updateArrows();

    return {
        select(gameId) {
            let selected = null;
            track.querySelectorAll(ITEM_SELECTOR).forEach(item => {
                const isSelected = item.dataset.gameId === gameId;
                item.classList.toggle('active', isSelected);
                item.setAttribute('aria-pressed', String(isSelected));
                if (isSelected) selected = item;
            });
            if (selected) centerItem(selected, 'smooth');
        },
        destroy() {
            prevBtn?.removeEventListener('click', onArrowClick);
            nextBtn?.removeEventListener('click', onArrowClick);
            track.removeEventListener('scroll', updateArrows);
            disableMouseDragScroll();
            resizeObserver?.disconnect();
        }
    };
}
