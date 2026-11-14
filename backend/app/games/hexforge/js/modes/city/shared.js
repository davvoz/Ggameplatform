export const $ = (id) => document.getElementById(id);

export function bump(item) {
    item.classList.remove('bump');
    item.getBoundingClientRect();     // force a layout: restarts the animation
    item.classList.add('bump');
}
