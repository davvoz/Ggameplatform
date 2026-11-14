import { costChips, formatDuration } from './forgePanel.js';
import { icon, withIcon } from './icons.js';
import { BUILDING_INFO, PATH_INFO } from './labels.js';
import { buildingThumb, thumbImg } from './thumbs.js';

/**
 * The upgrade card (a sheet) for a building type: its level and path, what
 * it does now, and the next level, with the choice of two paths at level 3.
 * A level counts for every building of the type.
 */

const LABELS = {
    hp: 'Health', damage: 'Damage', range: 'Reach', cooldown: 'Shot every', chain: 'Hits', area: 'Area',
    slow: 'Slows', slow_seconds: 'Held for', thorns: 'Spikes', per_hour: 'Per hour', capacity: 'Holds',
    protects: 'Keeps safe',
};

// ── pure helpers (tested) ──────────────────────────────────────────────
export function formatBuildingStat(key, value) {
    if (key === 'cooldown' || key === 'slow_seconds') return `${value} s`;
    if (key === 'range' || key === 'area') return `${value} cells`;
    if (key === 'slow') return `${value}%`;
    if (key === 'chain') return `${value} heroes`;
    return String(value);
}

/** The stats of a type at a level (and path, from level 3). */
export function statsAt(table, level, path) {
    const row = table.stats[String(level)];
    return path && row[path] ? row[path] : row;
}

/** What moves from `from` to `to`: [{ key, label, from, to }]. */
export function buildingChanges(from, to) {
    return Object.keys(LABELS)
        .filter((key) => key in to && to[key] !== from[key])
        .map((key) => ({
            key, label: LABELS[key],
            from: key in from ? formatBuildingStat(key, from[key]) : '–', to: formatBuildingStat(key, to[key]),
        }));
}

const BONUS_WORDS = {
    hp: 'health', damage: 'damage', per_hour: 'production', capacity: 'storage', protects: 'kept safe',
    range: 'reach', area: 'area', chain: 'heroes hit', slow: 'slow', slow_seconds: 's held', thorns: 'spike damage',
};

/**
 * What the upgrades add over level 1, in short words:
 * ['+30% health', '+42% damage', '+1.75 reach', 'shoots 26% faster'].
 */
export function upgradeBonuses(table, level, path) {
    const base = statsAt(table, 1, null);
    const now = statsAt(table, level, path);
    const out = [];
    for (const [key, word] of Object.entries(BONUS_WORDS)) {
        if (!(key in now) || now[key] === base[key]) continue;
        const from = base[key] ?? 0;
        if (['hp', 'damage', 'per_hour', 'capacity', 'protects'].includes(key) && from > 0) {
            out.push(`+${Math.round((100 * (now[key] - from)) / from)}% ${word}`);
        } else if (key === 'slow') {
            out.push(`slows ${now[key]}%`);
        } else if (key === 'slow_seconds' && !from) {
            out.push(`holds ${now[key]} s`);
        } else if (key === 'slow_seconds') {
            out.push(`+${Math.round((now[key] - from) * 100) / 100} s of slow`);
        } else {
            out.push(`+${Math.round((now[key] - from) * 100) / 100} ${word}`);
        }
    }
    if (now.cooldown && base.cooldown && now.cooldown < base.cooldown) {
        out.push(`shoots ${Math.round((100 * (base.cooldown - now.cooldown)) / base.cooldown)}% faster`);
    }
    return out;
}

/** Why the type cannot be upgraded now, or null. */
export function upgradeBlocker({ type, level, coreLevel, maxLevel, cost, materials, freeSlots, busy }) {
    if (busy) return 'Already at the forge.';
    if (level >= maxLevel) return null;
    if (type !== 'core' && level + 1 > coreLevel) return `Upgrade the Core to level ${level + 1} first.`;
    if (freeSlots <= 0) return 'The forge is full: wait for a free slot.';
    if (Object.entries(cost).some(([m, n]) => (materials[m] ?? 0) < n)) return 'Not enough materials.';
    return null;
}

// ── DOM ────────────────────────────────────────────────────────────────
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function statGrid(stats) {
    const grid = el('div', 'hero-stats');
    for (const key of Object.keys(LABELS).filter((k) => k in stats)) {
        const cell = el('span', 'hero-stat');
        cell.append(el('small', '', LABELS[key]), el('b', '', formatBuildingStat(key, stats[key])));
        grid.append(cell);
    }
    return grid;
}

export function renderUpgradeCard(container, { type, upgrades, materials, freeSlots, serverNow, job, picked, count },
    { onPick, onUpgrade }) {
    container.replaceChildren();
    const info = BUILDING_INFO[type];
    const table = upgrades.table[type];
    const { level, path } = upgrades.levels[type];
    const pathInfo = path ? PATH_INFO[path] : null;
    const accent = pathInfo?.accent ?? info.glow ?? '#ffb347';
    container.append(upgradeHead(type, level, path, accent));

    const now = statsAt(table, level, path);
    container.append(statGrid(now));

    if (job) {
        const tip = el('p', 'tip');
        tip.append(icon('anvil'), `At the forge: reaching level ${job.level}, ready in ${formatDuration(job.ready_at - serverNow)}. An hourglass speeds it up.`);
        container.append(tip);
        return;
    }
    if (level >= upgrades.max_level) {
        container.append(el('p', 'tip', 'Top level reached.'));
        return;
    }

    const next = level + 1;
    const choosing = next === upgrades.path_level;
    const choice = choosing ? picked : path;
    const section = el('div', 'evolve');
    section.append(el('h3', '', choosing ? `Level ${next}: pick a path` : `Level ${next}`));
    const row = el('div', 'form-cards');
    for (const p of choosing ? table.paths : [path]) {
        row.append(pathCard({ type, table, now, next, p, accent }, choosing ? { chosen: p === choice, onPick } : null));
    }
    section.append(row);

    const { cost, seconds } = table.costs[String(next)];
    const blocker = upgradeBlocker({
        type, level, coreLevel: upgrades.levels.core.level, maxLevel: upgrades.max_level, cost, materials, freeSlots, busy: false,
    });
    const foot = el('div', 'evolve-foot');
    const price = el('span', 'evolve-price');
    price.append(costChips(cost, materials), withIcon(el('span', 'evolve-time'), 'clock', formatDuration(seconds)));
    const button = withIcon(el('button', 'button primary'), 'anvil', 'Upgrade at the forge');
    button.type = 'button';
    button.disabled = Boolean(blocker) || (choosing && !choice);
    button.addEventListener('click', () => onUpgrade(choosing ? choice : null));
    foot.append(price, button);
    section.append(foot);
    section.append(el('small', 'evolve-note', upgradeNote(blocker, choosing && !choice, count)));
    container.append(section);
}

/** The building as it is: picture, level, path. */
function upgradeHead(type, level, path, accent) {
    const info = BUILDING_INFO[type];
    const pathInfo = path ? PATH_INFO[path] : null;
    const head = el('div', 'hero-head');
    head.style.setProperty('--accent', accent);
    const art = el('span', 'hero-art');
    art.append(thumbImg(buildingThumb(type, 104, level, path), '', ''));
    const who = el('div', 'hero-who');
    const pathName = pathInfo ? ` · ${pathInfo.name}` : '';
    who.append(el('b', 'hero-name', info.name),
        el('span', 'hero-form', `Level ${level}${pathName}`),
        el('small', 'hero-what', pathInfo ? pathInfo.what : info.what));
    head.append(art, who);
    return head;
}

/** The next level along path `p`, with what changes; `pick` ({ chosen, onPick }) makes it a choice. */
function pathCard({ type, table, now, next, p, accent }, pick) {
    const target = statsAt(table, next, p);
    const card = el(pick ? 'button' : 'div', 'form-card');
    const pinfo = p ? PATH_INFO[p] : null;
    card.style.setProperty('--accent', pinfo?.accent ?? accent);
    if (pick) {
        card.type = 'button';
        card.setAttribute('aria-pressed', String(pick.chosen));
        card.addEventListener('click', () => pick.onPick(p));
    }
    const changes = el('span', 'form-changes');
    for (const c of buildingChanges(now, target).slice(0, 4)) {
        const line = el('span', 'change');
        line.append(el('small', '', c.label), el('b', '', `${c.from} → ${c.to}`));
        changes.append(line);
    }
    card.append(thumbImg(buildingThumb(type, 84, next, p), '', ''),
        el('b', '', pinfo ? `${pinfo.name} · Lv ${next}` : `Level ${next}`));
    if (pinfo) card.append(el('small', 'form-what', pinfo.what));
    card.append(changes);
    return card;
}

/** Under the button: why it cannot start, a nudge to pick a path, or who gets the new level. */
function upgradeNote(blocker, mustPick, count) {
    if (blocker) return blocker;
    if (mustPick) return 'Tap a path to choose it';
    return count > 1 ? `All ${count} of them get the new level, and so will new ones.` : 'New ones you build will have this level too.';
}
