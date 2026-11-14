import { icon } from '../icons.js';
import { MATERIAL_INFO } from '../../data/labels.js';

/** Helpers for raiding players: what blocks the raid, and loot amounts with their icons. */

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
