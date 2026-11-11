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
let soundAt = -Infinity;     // when a sheet last made a sound

/** One sound per sheet change: the tap's click and the sheet's own sound would overlap. */
function sound(name) {
    play(name);
    soundAt = performance.now();
}

/** True right after a sheet opened or closed with a sound (the button's click is then skipped). */
export function sheetJustSounded() {
    return performance.now() - soundAt < 120;
}

export function wireSheets() {
    $('backdrop').addEventListener('click', closeSheet);
    for (const button of document.querySelectorAll('.sheet [data-close]')) {
        button.addEventListener('click', closeSheet);
    }
}

/**
 * Open sheet `id`; `onClose` runs when it closes for any reason. Going from
 * one sheet to another makes one sound, not a close and an open; `silent`
 * opens without a sound (a sheet coming back after another one closed).
 */
export function openSheet(id, onClose = null, { silent = false } = {}) {
    if (current === id) return;
    closeSheet({ silent: true });
    current = id;
    whenClosed = onClose;
    $(id).hidden = false;
    $('backdrop').hidden = false;
    if (!silent) sound('open');
}

/** Close the open sheet. Also a click listener, so anything but `{ silent: true }` sounds. */
export function closeSheet(options = null) {
    if (!current) return;
    $(current).hidden = true;
    $('backdrop').hidden = true;
    const callback = whenClosed;
    current = null;
    whenClosed = null;
    if (options?.silent !== true) sound('close');
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
