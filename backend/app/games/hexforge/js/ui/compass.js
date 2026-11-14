import { northBearing } from '../core/iso.js';

/**
 * The compass on the city screen: a round brass dial seen from above. Its
 * card turns so the red point aims at the city's north on screen; when the
 * city turns, the card swings round with it. It only shows the way: the turn
 * button turns the city.
 */

const LETTERS_AT = 30;      // radius of N, E, S, W on the card
const TURN_MS = 450;
const DIRS = ['N', 'E', 'S', 'W'];

export class Compass {
    constructor(svg) {
        this.svg = svg;
        this.turns = null;      // quarter turns shown, fractional while swinging
        this.frame = 0;
        svg.innerHTML = dial();
        this.card = svg.querySelector('.cp-card');
        this.letters = [...svg.querySelectorAll('.cp-letter')];
    }

    /** Aim the card at north for view `rot` (0..3); swings there unless it is the first time. */
    show(rot) {
        cancelAnimationFrame(this.frame);
        const still = this.turns === null
            || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (still) {
            this.turns = rot;
            this.#draw(rot);
            return;
        }
        const from = this.turns;
        const to = from + ((rot - from) % 4 + 4) % 4;      // always the way the city turns
        const start = performance.now();
        const step = (now) => {
            const k = Math.min(1, (now - start) / TURN_MS);
            const eased = 1 - (1 - k) ** 3;
            this.turns = from + (to - from) * eased;
            this.#draw(this.turns);
            if (k < 1) this.frame = requestAnimationFrame(step);
            else this.turns = to % 4;
        };
        this.frame = requestAnimationFrame(step);
    }

    #draw(turns) {
        const bearing = northBearing(turns);
        this.card.setAttribute('transform', `rotate(${bearing.toFixed(2)})`);
        this.letters.forEach((t, i) => {         // letters ride the card but stay upright
            const a = (bearing + i * 90) * Math.PI / 180;
            t.setAttribute('x', (Math.sin(a) * LETTERS_AT).toFixed(2));
            t.setAttribute('y', (-Math.cos(a) * LETTERS_AT).toFixed(2));
        });
    }
}

/** The dial's SVG: bezel, face, ring of ticks, eight-pointed rose, letters. */
function dial() {
    const ticks = [];
    for (let i = 0; i < 32; i++) {
        let inner = 39.5;                     // small tick
        if (i % 8 === 0) inner = 37;          // the four points
        else if (i % 4 === 0) inner = 38;     // the four in between
        const big = i % 4 === 0 ? ' cp-tick-big' : '';
        ticks.push(`<line class="cp-tick${big}" x1="0" y1="${-inner}" x2="0" y2="-42" transform="rotate(${i * 11.25})"/>`);
    }
    const point = (angle, length, width, light, dark) => `
        <g transform="rotate(${angle})">
            <path d="M0 0 L0 ${-length} L${-width} ${-width} Z" fill="${light}"/>
            <path d="M0 0 L0 ${-length} L${width} ${-width} Z" fill="${dark}"/>
        </g>`;
    const between = [45, 135, 225, 315].map((a) => point(a, 13, 3.4, '#b48e5c', '#6d4d2c')).join('');
    const main = [90, 180, 270].map((a) => point(a, 19, 4.6, '#f6e2b8', '#c08c48')).join('');
    const north = point(0, 21, 5.2, '#ff8a66', '#c62e1a');
    const letters = DIRS
        .map((name) => `<text class="cp-letter${name === 'N' ? ' cp-north' : ''}">${name}</text>`)
        .join('');
    return `
        <defs>
            <radialGradient id="cp-face" cx="42%" cy="35%" r="75%">
                <stop offset="0" stop-color="#4a3220"/>
                <stop offset="0.7" stop-color="#22150c"/>
                <stop offset="1" stop-color="#120a05"/>
            </radialGradient>
            <linearGradient id="cp-bezel" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#ffe2a6"/>
                <stop offset="0.35" stop-color="#c8913f"/>
                <stop offset="0.7" stop-color="#7a4f22"/>
                <stop offset="1" stop-color="#e3b263"/>
            </linearGradient>
            <radialGradient id="cp-pin" cx="35%" cy="30%" r="80%">
                <stop offset="0" stop-color="#fff0c8"/>
                <stop offset="1" stop-color="#9a6a2e"/>
            </radialGradient>
        </defs>
        <circle r="47" fill="url(#cp-bezel)"/>
        <circle r="47" fill="none" stroke="#2a1708" stroke-width="1"/>
        <circle r="43" fill="url(#cp-face)" stroke="#2a1708" stroke-width="1.2"/>
        <circle r="43" fill="none" stroke="rgba(255, 220, 160, 0.18)" stroke-width="0.8" transform="translate(0.6 0.8)"/>
        <g class="cp-card">
            ${ticks.join('')}
            <circle r="15" class="cp-ring"/>
            ${between}${main}${north}
            <circle r="3.8" fill="url(#cp-pin)" stroke="#3a240f" stroke-width="0.7"/>
            <circle r="1.3" fill="#3a240f"/>
        </g>
        ${letters}
        <ellipse cx="-14" cy="-22" rx="20" ry="9" fill="rgba(255, 245, 225, 0.07)" transform="rotate(-30 -14 -22)"/>`;
}
