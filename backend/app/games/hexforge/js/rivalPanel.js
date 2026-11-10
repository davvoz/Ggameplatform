import { formatCountdown } from './forgePanel.js';
import { MATERIAL_INFO } from './labels.js';

/** The "Rivals" side of the Attack tab: the scouted player, the loot at stake, your shield. */

/** What blocks an attack on this rival, or null; also used for the launch hint. */
export function rivalBlocker(pvp, rival) {
    if (!pvp.arena) return 'Clear Scrap Hollow to enter the arena';
    if (!rival) return 'Find a rival first';
    if (!rival.available) return 'This rival is shielded now. Find another';
    return null;
}

export function renderRival(container, data, serverNow) {
    container.replaceChildren();
    const { pvp, rival } = data;
    if (!pvp.arena) {
        container.append(hint('Clear the first outpost, Scrap Hollow, to enter the arena. Until then nobody can attack you either.'));
        return;
    }
    if (rival) {
        const name = document.createElement('p');
        name.className = 'rival-name';
        name.textContent = rival.name;
        container.append(
            name,
            hint(`Strength ${rival.strength} · their towers aim in secret and their traps are hidden.`),
            lootRow('Loot if you win', rival.loot_on_win),
            lootRow('If the core falls', rival.loot_on_core),
        );
        if (!rival.available) container.append(warning('Shielded now: someone attacked them first. Find another rival.'));
    } else {
        container.append(hint('Find a player of similar strength to raid. Their vault keeps 400 of each material safe.'));
    }
    if (pvp.shield_until) {
        container.append(hint(`Your shield: ${formatCountdown(pvp.shield_until - serverNow)} left. Attacking a player ends it.`));
    }
}

export function lootRow(label, amounts) {
    const row = document.createElement('p');
    row.className = 'loot-line';
    const name = document.createElement('span');
    name.textContent = label;
    const got = Object.values(amounts).some((n) => n > 0);
    row.append(name, got ? materialChips(amounts) : 'Nothing above the vault');
    return row;
}

export function materialChips(amounts) {
    const wrap = document.createElement('span');
    wrap.className = 'costs';
    for (const [m, amount] of Object.entries(amounts)) {
        if (!amount) continue;
        const item = document.createElement('span');
        item.className = 'cost';
        item.style.setProperty('--accent', MATERIAL_INFO[m].color);
        item.title = MATERIAL_INFO[m].name;
        item.textContent = String(amount);
        wrap.append(item);
    }
    return wrap;
}

function hint(text) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = text;
    return p;
}

function warning(text) {
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = text;
    return p;
}
