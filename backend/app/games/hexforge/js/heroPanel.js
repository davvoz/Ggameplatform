import { costChips, formatDuration } from './forgePanel.js';
import { stars } from './heroTiles.js';
import { icon, withIcon } from './icons.js';
import { FORM_INFO, HERO_INFO, TIER_NAMES } from './labels.js';
import { heroPortrait, heroThumb, thumbImg } from './thumbs.js';

/**
 * The hero card (a sheet): portrait, form and stars, XP towards the next
 * tier, fighting stats, and the evolution: the two forms to pick from (with
 * what changes), or the ascension, and the button that sends the hero to
 * the forge.
 */

const STAT_LABELS = {
    hp: 'Health', damage: 'Damage', speed: 'Speed', range: 'Reach', cooldown: 'Blow every',
    nova_damage: 'Nova', nova_radius: 'Nova area', taunt_radius: 'Draws fire', splash_radius: 'Hammer area',
    tower_bonus: 'vs towers',
};

// ── pure helpers (tested) ──────────────────────────────────────────────
/** The stats of a hero as it is (or as `form` at `tier`), from the server's table. */
export function statsOf(table, cls, form = null, tier = 1) {
    if (!form || tier <= 1) return table.stats[cls].base;
    return table.stats[cls][form][String(tier)];
}

export function formatStat(key, value) {
    if (key === 'cooldown') return `${value} s`;
    if (key === 'tower_bonus') return `×${value}`;
    if (key.endsWith('radius') || key === 'range') return `${value} cells`;
    return String(value);
}

/** The stats worth showing for this class: the four basics plus what the class or form is about. */
export function shownStats(cls, stats) {
    const keys = ['hp', 'damage', 'speed', 'range'];
    if (cls === 'guardian') keys.push('taunt_radius');
    if (cls === 'neon_blade') keys.push('cooldown');
    if (cls === 'technomancer') keys.push('nova_damage');
    if (stats.splash_radius > 0) keys.push('splash_radius');
    if (stats.tower_bonus > 1) keys.push('tower_bonus');
    return keys;
}

/** What changes from `from` to `to`: [{ key, label, from, to }] for every stat that moved. */
export function statChanges(from, to) {
    return Object.keys(STAT_LABELS)
        .filter((key) => to[key] !== from[key])
        .map((key) => ({ key, label: STAT_LABELS[key], from: formatStat(key, from[key]), to: formatStat(key, to[key]) }));
}

/** Why the hero cannot go to the forge now, or null. */
export function evolveBlocker({ hero, table, materials, freeSlots, serverNow }) {
    const next = (hero.tier ?? 1) + 1;
    if (next > 3) return 'Fully ascended';
    if (hero.evolving) return 'Already at the forge';
    const need = table.tier_xp[String(next)];
    if ((hero.xp ?? 0) < need) return `Needs ${need} XP: ${need - (hero.xp ?? 0)} more from fighting`;
    if (hero.injured_until && hero.injured_until > serverNow) return 'Hurt: wait until healed';
    if (freeSlots <= 0) return 'Both forge slots are busy';
    const { cost } = table.costs[hero.cls][String(next)];
    if (Object.entries(cost).some(([m, n]) => (materials[m] ?? 0) < n)) return 'Not enough materials';
    return null;
}

// ── DOM ────────────────────────────────────────────────────────────────
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/**
 * Fill `container` with the card of `hero`. `picked` is the form chosen so
 * far (tier 1 only); `onPick(form)` changes it, `onEvolve(form)` sends the
 * hero to the forge.
 */
export function renderHeroCard(container, { hero, name, table, materials, freeSlots, serverNow, job, picked },
    { onPick, onEvolve }) {
    container.replaceChildren();
    const info = HERO_INFO[hero.cls];
    const tier = hero.tier ?? 1;
    const form = tier > 1 ? FORM_INFO[hero.form] : null;
    const accent = form?.accent ?? info.color;

    // who
    const head = el('div', 'hero-head');
    head.style.setProperty('--accent', accent);
    const art = el('span', 'hero-art');
    art.append(thumbImg(heroPortrait(hero, 104), '', ''));
    const who = el('div', 'hero-who');
    who.append(el('b', 'hero-name', name),
        el('span', 'hero-form', `${form ? form.name : info.name} ${stars(tier)} · ${TIER_NAMES[tier]}`),
        el('small', 'hero-what', form ? form.what : info.what));
    head.append(art, who);
    container.append(head);

    // XP
    const next = tier + 1;
    const xp = hero.xp ?? 0;
    const xpBox = el('div', 'hero-xp');
    if (next <= 3) {
        const need = table.tier_xp[String(next)];
        const meter = el('span', 'xp-meter wide');
        const fill = el('span');
        fill.style.width = `${Math.min(100, Math.round((100 * xp) / need))}%`;
        meter.append(fill);
        xpBox.append(el('small', '', `${Math.min(xp, need)} / ${need} XP to ${next === 2 ? 'evolve' : 'ascend'}`), meter);
    } else {
        xpBox.append(el('small', '', `${xp} XP · fully ascended`));
    }
    container.append(xpBox);

    // stats
    const stats = statsOf(table, hero.cls, hero.form, tier);
    const grid = el('div', 'hero-stats');
    for (const key of shownStats(hero.cls, stats)) {
        const cell = el('span', 'hero-stat');
        cell.append(el('small', '', STAT_LABELS[key]), el('b', '', formatStat(key, stats[key])));
        grid.append(cell);
    }
    container.append(grid);

    // evolution
    if (hero.evolving) {
        const left = job ? job.ready_at - serverNow : 0;
        const tip = el('p', 'tip');
        tip.append(icon('anvil'), `At the forge: ${tier + 1 === 3 ? 'ascending' : 'evolving'}, ready in ${formatDuration(left)}. An hourglass speeds it up.`);
        container.append(tip);
        return;
    }
    if (next > 3) return;

    const section = el('div', 'evolve');
    section.append(el('h3', '', next === 2 ? 'Evolve: pick a form' : `Ascend: a stronger ${form.name}`));
    const options = next === 2 ? table.forms[hero.cls] : [hero.form];
    const choice = next === 2 ? picked : hero.form;
    const row = el('div', 'form-cards');
    for (const f of options) {
        const finfo = FORM_INFO[f];
        const card = el(next === 2 ? 'button' : 'div', 'form-card');
        card.style.setProperty('--accent', finfo.accent);
        if (next === 2) {
            card.type = 'button';
            card.setAttribute('aria-pressed', String(f === choice));
            card.addEventListener('click', () => onPick(f));
        }
        const changes = el('span', 'form-changes');
        for (const c of statChanges(stats, statsOf(table, hero.cls, f, next)).slice(0, 4)) {
            const line = el('span', 'change');
            line.append(el('small', '', c.label), el('b', '', `${c.from} → ${c.to}`));
            changes.append(line);
        }
        card.append(thumbImg(heroThumb(hero.cls, 84, f, next), '', ''), el('b', '', `${finfo.name} ${stars(next)}`),
            el('small', 'form-what', finfo.what), changes);
        row.append(card);
    }
    section.append(row);

    const { cost, seconds } = table.costs[hero.cls][String(next)];
    const blocker = evolveBlocker({ hero, table, materials, freeSlots, serverNow });
    const foot = el('div', 'evolve-foot');
    const price = el('span', 'evolve-price');
    price.append(costChips(cost, materials), withIcon(el('span', 'evolve-time'), 'clock', formatDuration(seconds)));
    const button = withIcon(el('button', 'button primary'), 'anvil', next === 2 ? 'Evolve at the forge' : 'Ascend at the forge');
    button.type = 'button';
    button.disabled = Boolean(blocker) || (next === 2 && !choice);
    button.addEventListener('click', () => onEvolve(next === 2 ? choice : null));
    foot.append(price, button);
    section.append(foot);
    let note = blocker;
    if (!note && next === 2 && !choice) note = 'Tap a form to choose it';
    if (note) section.append(el('small', 'evolve-note', note));
    container.append(section);
}

