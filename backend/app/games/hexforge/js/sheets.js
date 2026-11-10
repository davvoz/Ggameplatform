/**
 * Sheets (forge, defense, ranking) rise from the bottom over the map, one at
 * a time; on wide screens they are a side panel. Plus the toast: one short
 * line at the top that fades away by itself.
 */

import { play } from './audio.js';

const $ = (id) => document.getElementById(id);
let current = null;
let whenClosed = null;
let toastTimer = 0;

export function wireSheets() {
    $('backdrop').addEventListener('click', closeSheet);
    for (const button of document.querySelectorAll('.sheet [data-close]')) {
        button.addEventListener('click', closeSheet);
    }
}

/** Open sheet `id`; `onClose` runs when it closes for any reason. */
export function openSheet(id, onClose = null) {
    if (current === id) return;
    closeSheet();
    current = id;
    whenClosed = onClose;
    $(id).hidden = false;
    $('backdrop').hidden = false;
    play('open');
}

export function closeSheet() {
    if (!current) return;
    $(current).hidden = true;
    $('backdrop').hidden = true;
    const callback = whenClosed;
    current = null;
    whenClosed = null;
    play('close');
    callback?.();
}

export function isSheetOpen(id = null) {
    return id ? current === id : current !== null;
}

export function toast(text, ms = 2800) {
    const box = $('toast');
    clearTimeout(toastTimer);
    box.textContent = text;
    box.classList.toggle('show', Boolean(text));
    if (text) toastTimer = setTimeout(() => box.classList.remove('show'), ms);
}
