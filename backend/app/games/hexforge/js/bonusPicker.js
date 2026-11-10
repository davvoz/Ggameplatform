import { icon } from './icons.js';
import { BONUS_INFO } from './labels.js';

/**
 * A small card over everything: "Speed up Rune Tower" with one big button
 * per bonus the player can use there. Tapping one uses it; tapping outside
 * or Cancel closes it. Only one is open at a time.
 */

let open = null;

export function closeBonusPicker() {
    open?.remove();
    open = null;
}

/** `options` = bonus ids usable here (owned ones only); `onPick(bonus)` uses one. */
export function openBonusPicker({ title, line = '', options, owned, onPick }) {
    closeBonusPicker();
    const shade = document.createElement('div');
    shade.className = 'picker-shade';
    shade.addEventListener('click', (event) => {
        if (event.target === shade) closeBonusPicker();
    });
    const card = document.createElement('div');
    card.className = 'bonus-picker';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', title);
    const head = document.createElement('b');
    head.textContent = title;
    card.append(head);
    if (line) card.append(Object.assign(document.createElement('small'), { textContent: line }));
    const row = document.createElement('div');
    row.className = 'picker-options';
    for (const bonus of options) {
        const info = BONUS_INFO[bonus];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'picker-option';
        button.style.setProperty('--accent', info.color);
        const art = document.createElement('span');
        art.className = 'bonus-art';
        art.append(icon(info.icon), Object.assign(document.createElement('span'), { className: 'bonus-count', textContent: `×${owned[bonus] ?? 0}` }));
        button.append(art, Object.assign(document.createElement('b'), { textContent: info.effect }),
            Object.assign(document.createElement('small'), { textContent: info.name }));
        button.addEventListener('click', () => {
            closeBonusPicker();
            onPick(bonus);
        });
        row.append(button);
    }
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'button small';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', closeBonusPicker);
    card.append(row, cancel);
    shade.append(card);
    document.getElementById('app').append(shade);
    open = shade;
    row.querySelector('button')?.focus();
}
