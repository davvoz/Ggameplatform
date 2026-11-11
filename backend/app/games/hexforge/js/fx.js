import { icon } from './icons.js';

/**
 * Interface animations over the map (DOM, Web Animations API):
 *  - flyMaterial: material gems burst out of a building and fly into their
 *    counter at the top, which bumps and counts up as they land
 *  - flyPicture: a picture glides from one place on screen to another
 *  - rewardPop: a big "forged!" card with rays, for what the forge made
 *    (or any picture: the level-up shield)
 * Everything respects "reduce motion": the result is shown without the trip.
 */

const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function layer() {
    let box = document.getElementById('fx');
    if (!box) {
        box = document.createElement('div');
        box.id = 'fx';
        box.className = 'fx-layer';
        document.getElementById('app').append(box);
    }
    return box;
}

function centre(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Count the number shown in `el` up from `from` to `to`. */
export function countUp(el, from, to, ms = 700) {
    if (reduced() || from === to) {
        el.textContent = String(to);
        return;
    }
    const start = performance.now();
    const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        el.textContent = String(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
        if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

/**
 * Gems of `material` (icon name, colour) burst from screen point `from` and
 * fly into `target`; `onLand` runs when the first one lands, `onDone` after the last.
 */
export function flyMaterial(from, target, { iconName, color, count = 6, onGem = () => {}, onLand = () => {}, onDone = () => {} }) {
    if (reduced() || !target) {
        onLand();
        onDone();
        return;
    }
    const to = centre(target);
    const box = layer();
    let landed = 0;
    for (let i = 0; i < count; i++) {
        const gem = document.createElement('span');
        gem.className = 'fly-gem';
        gem.style.setProperty('--accent', color);
        gem.append(icon(iconName));
        box.append(gem);
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
        const burst = 26 + Math.random() * 22;
        const bx = from.x + Math.cos(angle) * burst;
        const by = from.y + Math.sin(angle) * burst * 0.7 - 18;
        const anim = gem.animate([
            { transform: `translate(${from.x}px, ${from.y}px) scale(0.3)`, opacity: 0 },
            { transform: `translate(${bx}px, ${by}px) scale(1.15)`, opacity: 1, offset: 0.3, easing: 'cubic-bezier(.5,0,.9,.6)' },
            { transform: `translate(${to.x}px, ${to.y}px) scale(0.55)`, opacity: 0.9 },
        ], { duration: 820 + i * 45, delay: i * 40, easing: 'ease-out', fill: 'forwards' });
        anim.onfinish = () => {
            gem.remove();
            landed += 1;
            onGem();
            if (landed === 1) onLand();
            if (landed === count) onDone();
        };
    }
}

/** A picture (an <img> src) glides from element/point `from` to element `to`, shrinking. */
export function flyPicture(src, from, to, { size = 64, ms = 650 } = {}) {
    if (reduced() || !to) return Promise.resolve();
    const a = from instanceof Element ? centre(from) : from;
    const b = centre(to);
    const img = document.createElement('img');
    img.className = 'fly-picture';
    img.src = src;
    img.alt = '';
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    layer().append(img);
    const half = size / 2;
    const anim = img.animate([
        { transform: `translate(${a.x - half}px, ${a.y - half}px) scale(1)`, opacity: 1 },
        { transform: `translate(${(a.x + b.x) / 2 - half}px, ${Math.min(a.y, b.y) - 70 - half}px) scale(1.15)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${b.x - half}px, ${b.y - half}px) scale(0.4)`, opacity: 0.2 },
    ], { duration: ms, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' });
    return anim.finished.then(() => img.remove(), () => img.remove());
}

/**
 * "Forged!": the item's picture rises over spinning rays with its name and a
 * line under it. Resolves when it is gone (after `ms`, or sooner on a tap).
 */
export function rewardPop({ src, picture = null, title, extra = null, line, color = '#ffb347', ms = 1700 }) {
    const box = layer();
    const card = document.createElement('div');
    card.className = 'reward-pop';
    card.style.setProperty('--accent', color);
    card.setAttribute('role', 'status');
    const rays = document.createElement('span');
    rays.className = 'reward-rays';
    let art = picture;                   // any element, or an image from `src`
    if (!art) {
        art = document.createElement('img');
        art.src = src;
        art.alt = '';
    }
    const name = document.createElement('b');
    name.textContent = title;
    const sub = document.createElement('span');
    sub.textContent = line;
    card.append(rays, art, name, ...(extra ? [extra] : []), sub);
    box.append(card);
    return new Promise((resolve) => {
        let done = false;
        const close = () => {
            if (done) return;
            done = true;
            const out = card.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.7) translateY(60px)' }],
                { duration: reduced() ? 1 : 260, easing: 'ease-in', fill: 'forwards' });
            out.onfinish = () => {
                card.remove();
                resolve();
            };
        };
        card.addEventListener('click', close);
        setTimeout(close, reduced() ? 900 : ms);
    });
}
