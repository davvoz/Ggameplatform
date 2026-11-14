/** Inline SVG icons from the sprite in index.html (`<symbol id="i-…">`). */

const SVG = 'http://www.w3.org/2000/svg';

export function icon(name, className = 'icon') {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG, 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.append(use);
    return svg;
}

/** A button or chip's content: an icon followed by a label. */
export function withIcon(node, name, label) {
    node.replaceChildren(icon(name), Object.assign(document.createElement('span'), { textContent: label }));
    return node;
}
