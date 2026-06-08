/**
 * Minimal DOM construction helpers for HUD/menu overlays. Centralizes element
 * creation so UI views stay terse and consistent (DRY). Not used inside the
 * render loop — overlays are built on state change only.
 * @module Dom
 */

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/**
 * @param {string} className
 * @param {string} text
 * @param {(e:Event)=>void} onClick
 * @returns {HTMLButtonElement}
 */
export function button(className, text, onClick) {
    const b = el('button', className, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
}

/**
 * Wire a press-and-hold control (pointer + touch) to a setter.
 * @param {HTMLElement} node
 * @param {(active:boolean)=>void} setActive
 */
export function holdable(node, setActive) {
    const down = (e) => { e.preventDefault(); setActive(true); };
    const up = (e) => { e.preventDefault(); setActive(false); };
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointerleave', up);
    node.addEventListener('pointercancel', up);
}
