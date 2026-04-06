/**
 * Renderer - Canvas rendering abstraction
 * Single Responsibility: Handle canvas sizing and coordinate transformation.
 */

import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../config/Constants.js';

export class Renderer {
    #canvas;
    #ctx;
    #designWidth;
    #designHeight;
    #scale = 1;

    constructor(canvas) {
        this.#canvas = canvas;
        this.#ctx = canvas.getContext('2d');
        this.#designWidth = DESIGN_WIDTH;
        this.#designHeight = DESIGN_HEIGHT;
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
    }

    get ctx() { return this.#ctx; }
    get width() { return this.#designWidth; }
    get height() { return this.#designHeight; }
    get canvas() { return this.#canvas; }
    get scale() { return this.#scale; }

    resize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const aspect = this.#designWidth / this.#designHeight;
        
        let w, h;
        if (vw / vh < aspect) {
            w = vw;
            h = vw / aspect;
        } else {
            h = vh;
            w = vh * aspect;
        }
        
        this.#scale = w / this.#designWidth;
        
        this.#canvas.style.width = `${w}px`;
        this.#canvas.style.height = `${h}px`;
        this.#canvas.width = this.#designWidth;
        this.#canvas.height = this.#designHeight;
        
        this.#ctx.imageSmoothingEnabled = false;
    }

    clear() {
        this.#ctx.clearRect(0, 0, this.#designWidth, this.#designHeight);
    }

    /**
     * Convert page coordinates to logical canvas coordinates.
     */
    pageToCanvas(pageX, pageY) {
        const rect = this.#canvas.getBoundingClientRect();
        const scaleX = this.#designWidth / rect.width;
        const scaleY = this.#designHeight / rect.height;
        return {
            x: (pageX - rect.left) * scaleX,
            y: (pageY - rect.top) * scaleY,
        };
    }
}
