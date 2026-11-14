import { icon } from '../icons.js';
import { MATERIAL_INFO } from '../../data/labels.js';

/** Helpers for raiding players: what blocks the raid, and loot amounts with their icons. */

/** What blocks an attack on this rival, or null; also used for the Fight hint. */
export function rivalBlocker(pvp, rival) {
    if (!pvp.arena) return 'Clear Scrap Hollow to enter the arena';
    if (!rival) return 'Find a rival first';
    if (!rival.available) return 'This rival is shielded now. Find another';
    return null;
}

export function materialChips(amounts) {
    const wrap = document.createElement('span');
    wrap.className = 'costs';
    for (const [m, amount] of Object.entries(amounts)) {
        if (!amount) continue;
        const info = MATERIAL_INFO[m];
        const item = document.createElement('span');
        item.className = 'cost';
        item.style.setProperty('--accent', info.color);
        item.title = info.name;
        item.append(icon(info.icon), String(amount));
        wrap.append(item);
    }
    return wrap;
}
