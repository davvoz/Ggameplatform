import { costChips, formatDuration, itemEffect } from './forgePanel.js';
import { nextStars, stars, tripBar, tripLeft } from '../heroTiles.js';
import { partName } from './fusionPanel.js';
import { icon, withIcon } from '../icons.js';
import { BONUS_INFO, FORM_INFO, HERO_INFO, ITEM_INFO, MISSION_INFO, TIER_NAMES, times } from '../../data/labels.js';
import { heroPortrait, heroThumb, itemPicture, thumbImg } from '../../render/thumbs.js';

/**
 * The hero card (a sheet): portrait, form and stars, XP towards the next
 * tier, fighting stats, and the evolution: the two forms to pick from (with
 * what changes), or the ascension, and the button that sends the hero to
 * the forge. Plus its gear: one weapon of its class and one spell.
 */

const STAT_LABELS = {
    hp: 'Health', damage: 'Damage', speed: 'Speed', range: 'Reach', cooldown: 'Blow every',
    nova_damage: 'Nova', nova_radius: 'Nova area', taunt_radius: 'Draws fire', splash_radius: 'Hammer area',
    tower_bonus: 'vs towers', barrier: 'Shield', regen: 'Heals',
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
    if (key === 'regen') return `${value}/s`;
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
    if (stats.barrier > 0) keys.push('barrier');
    if (stats.regen > 0) keys.push('regen');
    return keys;
}

/** What changes from `from` to `to`: [{ key, label, from, to }] for every stat that moved. */
export function statChanges(from, to) {
    return Object.keys(STAT_LABELS)
        .filter((key) => key in to && key in from && to[key] !== from[key])
        .map((key) => ({ key, label: STAT_LABELS[key], from: formatStat(key, from[key]), to: formatStat(key, to[key]) }));
}

/**
 * The stats of a new form or tier, carrying the same gear: each stat keeps
 * the share the items add now (`base` = without items, `shown` = with them).
 */
export function withGear(target, base, shown) {
    const out = { ...target };
    for (const key of Object.keys(target)) {
        if (!(key in shown) || !(key in base) || typeof target[key] !== 'number') continue;
        if (key === 'barrier' || key === 'regen') continue;
        const ratio = base[key] ? shown[key] / base[key] : 1;
        const value = base[key] ? target[key] * ratio : target[key] + (shown[key] - base[key]);
        out[key] = Number.isInteger(target[key]) ? Math.round(value) : Math.round(value * 100) / 100;
    }
    return out;
}

/** The items that fit `slot` of a hero of `cls`: weapons of its class, or any spell. */
export function fittingItems(items, table, cls, slot) {
    return items.filter((i) => {
        const row = table.items[i.type];
        if (row.slot !== slot) return false;
        if (cls === 'explorer') return row.cls === 'explorer';      // the Explorer carries only its own gear
        return row.cls === null || row.cls === cls;
    });
}

/**
 * What the item picker shows for a hero's slot: the items that fit, free ones
 * first; one another hero carries is greyed (it stays with that hero).
 * `names` maps hero ids to names. Returns { title, line, options, empty }.
 */
export function gearChoices({ items, table, names, hero, name, slot, current }) {
    const carrier = (i) => (i.hero && names.has(i.hero) ? i.hero : null);
    const options = fittingItems(items, table, hero.cls, slot)
        .filter((i) => i.id !== current?.id)
        .sort((a, b) => Number(Boolean(carrier(a))) - Number(Boolean(carrier(b))) || b.level - a.level)
        .map((i) => ({
            id: i.id,
            picture: itemPicture(i.type, 40),
            title: `${ITEM_INFO[i.type].name} · Lv ${i.level}`,
            line: carrier(i) ? `Carried by ${names.get(i.hero)}: take it off there first`
                : `${itemEffect(table, i)} · in the armoury`,
            accent: ITEM_INFO[i.type].color,
            disabled: Boolean(carrier(i)),
        }));
    const what = slot === 'weapon' ? `weapon for a ${HERO_INFO[hero.cls].name}` : 'spell';
    return {
        title: `${name}: ${slot}`,
        line: current ? `Now: ${ITEM_INFO[current.type].name} · Lv ${current.level}` : '',
        options,
        empty: `No other ${what} yet: forge one in the forge's Items tab.`,
    };
}

/** Why the hero cannot go to the forge now, or null. */
export function evolveBlocker({ hero, table, materials, freeSlots, serverNow }) {
    const next = (hero.tier ?? 1) + 1;
    if (next > 3) return 'Fully ascended';
    if (hero.evolving) return 'Already at the forge';
    const need = table.tier_xp[String(next)];
    if ((hero.xp ?? 0) < need) return `${need - (hero.xp ?? 0)} more XP from fighting`;
    if (hero.injured_until && hero.injured_until > serverNow) return 'Hurt: wait until healed';
    if (freeSlots <= 0) return 'All forge slots are busy';
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
export function renderHeroCard(container, data, actions) {
    renderHeroBody(container, data, actions);
    if (data.dismiss) container.append(dismissBox(data.dismiss, actions.onDismiss ?? (() => {})));
}

/** "Hourglass ×1 · Salve ×1" */
export function giftText(gift) {
    return Object.entries(gift).map(([b, n]) => BONUS_INFO[b].name + times(n)).join(' · ');
}

/** Letting the hero go: what it leaves, why not now, and a second tap to be sure. */
function dismissBox({ gift, blocker, confirming }, onDismiss) {
    const box = el('div', 'dismiss');
    const text = el('span', 'dismiss-text');
    text.append(el('b', '', 'Free this slot'), el('small', '', blocker ?? `The hero leaves for good and gives you: ${giftText(gift)}. Its items go back to the armoury.`));
    const button = withIcon(el('button', `button${confirming ? ' danger' : ''}`), 'hammer', confirming ? 'Sure? Tap again' : 'Dismiss');
    button.type = 'button';
    button.disabled = Boolean(blocker);
    button.addEventListener('click', () => onDismiss());
    box.append(text, button);
    return box;
}

/**
 * The card a hero shows on the attack screen: who it is, its fusion, its
 * mastery, how it fights now and what it carries. `onGear(slot)` lets a tap
 * on a slot change the item. The caller adds the squad button.
 */
export function renderSquadCard(container, { hero, name, table, stats = null, gear = null, itemTable = null, training = null },
    { onGear = null } = {}) {
    container.replaceChildren();
    container.append(heroHead(hero, name));
    const tier = hero.tier ?? 1;
    if (tier >= 3 && training) {
        const box = el('div', 'hero-xp');
        box.append(...masteryLine(hero, training));
        container.append(box);
    }
    container.append(statsGrid(hero, table, stats));
    if (gear && itemTable) container.append(gearBox(gear, itemTable, onGear));
}

/** Portrait, name, form and stars, and the fusion's parts if it is fused. */
function heroHead(hero, name) {
    const info = HERO_INFO[hero.cls];
    const tier = hero.tier ?? 1;
    const form = tier > 1 ? FORM_INFO[hero.form] : null;
    const head = el('div', 'hero-head');
    head.style.setProperty('--accent', form?.accent ?? info.color);
    const art = el('span', 'hero-art');
    art.append(thumbImg(heroPortrait(hero, 104), '', ''));
    const who = el('div', 'hero-who');
    const fused = hero.fusion
        ? `Fusion ${'◆'.repeat(hero.fusion.grade)}: ${hero.fusion.parts.map(partName).join(' + ')}` : null;
    let formLine = info.role;
    if (hero.cls !== 'explorer') {
        const formName = form ? form.name : info.name;
        formLine = `${formName} ${stars(tier)} · ${fused ? 'Fused' : TIER_NAMES[tier]}`;
    }
    const what = form ? form.what : info.what;
    who.append(el('b', 'hero-name', name), el('span', 'hero-form', formLine), el('small', 'hero-what', fused ?? what));
    head.append(art, who);
    return head;
}

/** How it fights now (items, fusion and mastery included), else from the table. */
function statsGrid(hero, table, now) {
    const shown = now ?? statsOf(table, hero.cls, hero.form, hero.tier ?? 1);
    const grid = el('div', 'hero-stats');
    for (const key of shownStats(hero.cls, shown)) {
        const cell = el('span', 'hero-stat');
        cell.append(el('small', '', STAT_LABELS[key]), el('b', '', formatStat(key, shown[key])));
        grid.append(cell);
    }
    return grid;
}

function renderHeroBody(container, {
    hero, name, table, materials, freeSlots, serverNow, job, picked, stats: now = null, gear = null, itemTable = null,
    missions = null, training = null,
}, { onPick, onEvolve, onGear = () => {}, onExplore = () => {}, onReturn = () => {}, onTrain = () => {} }) {
    container.replaceChildren();
    const tier = hero.tier ?? 1;
    const form = tier > 1 ? FORM_INFO[hero.form] : null;
    container.append(heroHead(hero, name));

    if (hero.cls === 'explorer') {
        if (gear && itemTable) container.append(gearBox(gear, itemTable, onGear));
        if (missions) container.append(missionBox(hero, missions, gear, itemTable, serverNow, onExplore, onReturn));
        return;
    }

    const next = tier + 1;
    container.append(xpBox(hero, table, training));
    if (training) container.append(trainBox(hero, training, serverNow, onTrain));

    // stats: as it fights now (items included), else from the table
    const stats = statsOf(table, hero.cls, hero.form, tier);
    const shown = now ?? stats;
    container.append(statsGrid(hero, table, now));

    if (gear && itemTable) container.append(gearBox(gear, itemTable, onGear));

    // evolution
    if (hero.evolving) {
        container.append(forgeTip(hero, job, serverNow));
        return;
    }
    if (next > 3) return;
    container.append(evolveBox({ hero, table, materials, freeSlots, serverNow, picked, stats, shown, form, onPick, onEvolve }));
}

/** XP towards the next tier; at the top, mastery (or just the XP when there is no training). */
function xpBox(hero, table, training) {
    const next = (hero.tier ?? 1) + 1;
    const xp = hero.xp ?? 0;
    const box = el('div', 'hero-xp');
    if (next <= 3) {
        const need = table.tier_xp[String(next)];
        const meter = el('span', 'xp-meter wide');
        const fill = el('span');
        fill.style.width = `${Math.min(100, Math.round((100 * xp) / need))}%`;
        meter.append(fill);
        box.append(el('small', '', `${Math.min(xp, need)} / ${need} XP to ${next === 2 ? 'evolve' : 'ascend'}`), meter);
    } else if (training) {
        box.append(...masteryLine(hero, training));
    } else {
        box.append(el('small', '', `${xp} XP · fully ascended`));
    }
    return box;
}

/** A hero at the forge: what it is becoming and when it is ready. */
function forgeTip(hero, job, serverNow) {
    const left = job ? job.ready_at - serverNow : 0;
    const tip = el('p', 'tip');
    let doing = (hero.tier ?? 1) + 1 === 3 ? 'ascending' : 'evolving';
    if (hero.fusing) doing = 'fusing';
    tip.append(icon('anvil'), `At the forge: ${doing}, ready in ${formatDuration(left)}. An hourglass speeds it up.`);
    return tip;
}

/** A top-tier hero's mastery: its level, what it adds, and the bar inside the level. */
export function masteryOf(points, { perLevel, levels, bonus }) {
    const level = Math.min(levels, Math.floor(points / perLevel));
    const maxed = level >= levels;
    return { level, maxed, into: maxed ? perLevel : points - level * perLevel, pct: Math.round(bonus * 100 * level) };
}

function masteryLine(hero, training) {
    const m = masteryOf(hero.mastery ?? 0, training);
    const text = masteryText(m, training.perLevel);
    const meter = el('span', 'xp-meter wide mastery');
    const fill = el('span');
    fill.style.width = `${Math.round((100 * m.into) / training.perLevel)}%`;
    meter.append(fill);
    return [el('small', '', text), meter];
}

/** Why this hero cannot train right now, or null. */
export function trainBlocker(hero, training, serverNow) {
    if (hero.evolving) return 'At the forge';
    if (hero.injured_until && hero.injured_until > serverNow) return 'Hurt: heal first';
    if (training.left <= 0) return 'Rested for today: back tomorrow';
    return null;
}

function trainPrize(training) {
    return training.maxMastery ? `+${training.maxMastery} mastery` : `+${training.maxXp} XP`;
}

/** The training box: sessions left today and the XP or mastery at stake; tap to play. */
function trainBox(hero, training, serverNow, onTrain) {
    const box = el('div', 'train-box');
    const text = el('span', 'train-text');
    const blocker = trainBlocker(hero, training, serverNow);
    text.append(el('b', '', 'Training'),
        el('small', '', blocker ?? `${training.left} of ${training.sessions} left today · up to ${trainPrize(training)}`));
    const button = withIcon(el('button', 'button small primary'), 'dagger', 'Train');
    button.type = 'button';
    button.disabled = Boolean(blocker);
    button.addEventListener('click', onTrain);
    box.append(icon('dagger'), text, button);
    return box;
}

/** How long a mission takes for this Explorer: the Trail Boots shorten it. */
export function tripSeconds(seconds, gear, itemTable) {
    const boots = gear?.spell?.type === 'trail_boots' ? gear.spell : null;
    const cut = boots ? itemTable.items.trail_boots.levels[boots.level - 1] : 0;
    return Math.round(seconds * (1 - cut / 100));
}

/** The Explorer's trips: three to pick from, the one under way, or the loot waiting. */
function missionBox(hero, missions, gear, itemTable, serverNow, onExplore, onReturn) {
    const section = el('div', 'evolve missions');
    const trip = hero.mission;
    if (trip) {
        const left = trip.ready_at - serverNow;
        const what = MISSION_INFO[trip.kind].name;
        if (left > 0) {
            section.append(el('h3', '', `Away: ${what}`));
            const row = el('div', 'trip-row');
            const when = el('b', 'trip-when');
            const countdown = tripLeft(el('span'), trip, 'Back in ');
            countdown.textContent = `Back in ${formatDuration(left)}`;
            when.append(icon('clock'), countdown);
            row.append(when, tripBar(trip, serverNow));
            section.append(row, el('small', 'evolve-note', 'What it brings is a surprise!'));
        } else {
            section.append(el('h3', '', `Back from: ${what}`));
            const button = withIcon(el('button', 'button primary'), 'chest', 'See what it found');
            button.type = 'button';
            button.addEventListener('click', () => onReturn());
            section.append(button);
        }
        return section;
    }
    section.append(el('h3', '', 'Send on a mission'));
    const row = el('div', 'mission-cards');
    for (const [kind, m] of Object.entries(missions)) {
        const card = el('button', 'mission-card');
        card.type = 'button';
        const odds = `Bonus ${Math.round(m.bonus_chance * 100)}% · Item ${Math.round(m.item_chance * 100)}%`;
        card.append(withIcon(el('b', 'mission-time'), 'clock', formatDuration(tripSeconds(m.seconds, gear, itemTable))),
            el('b', '', MISSION_INFO[kind].name), el('small', 'form-what', MISSION_INFO[kind].line),
            el('small', 'mission-odds', odds));
        card.addEventListener('click', () => onExplore(kind));
        row.append(card);
    }
    section.append(row, el('small', 'evolve-note', 'The Explorer never fights. The loot stays a surprise until it is back.'));
    return section;
}

function gearBox(gear, itemTable, onGear) {
    const box = el('div', 'gear');
    for (const [slot, label] of [['weapon', 'Weapon'], ['spell', 'Spell']]) {
        box.append(gearSlot(slot, label, gear[slot], itemTable, onGear));
    }
    return box;
}

/** One gear slot: the item and what it does, or an empty slot; a button when `onGear` can change it. */
function gearSlot(slot, label, item, itemTable, onGear) {
    const empty = item ? '' : ' empty';
    const still = onGear ? '' : ' still';
    const cell = el(onGear ? 'button' : 'div', `gear-slot${empty}${still}`);
    if (onGear) cell.type = 'button';
    const text = el('span', 'gear-text');
    if (item) {
        const info = ITEM_INFO[item.type];
        cell.style.setProperty('--accent', info.color);
        text.append(el('small', '', label), el('b', '', `${info.name} · Lv ${item.level}`),
            el('small', 'gear-effect', itemEffect(itemTable, item)));
        cell.append(thumbImg(itemPicture(item.type, 44), '', ''), text);
        if (onGear) cell.setAttribute('aria-label', `${label}: ${info.name}, level ${item.level}. Tap to change`);
    } else {
        const plus = el('span', 'gear-plus');
        plus.append(icon('plus'));
        text.append(el('small', '', label), el('b', '', 'Empty'),
            el('small', 'gear-effect', onGear ? 'Tap to equip' : 'Equip it from its card in the Forge'));
        cell.append(plus, text);
    }
    if (onGear) cell.addEventListener('click', () => onGear(slot));
    return cell;
}

function evolveBox({ hero, table, materials, freeSlots, serverNow, picked, stats, shown, form, onPick, onEvolve }) {
    const next = (hero.tier ?? 1) + 1;
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
        const target = withGear(statsOf(table, hero.cls, f, next), stats, shown);
        for (const c of statChanges(shown, target).slice(0, 4)) {
            const line = el('span', 'change');
            line.append(el('small', '', c.label), el('b', '', `${c.from} → ${c.to}`));
            changes.append(line);
        }
        const title = el('b', 'form-title', `${finfo.name} `);
        title.append(nextStars(next - 1, next));
        title.setAttribute('aria-label', `${finfo.name}, ${TIER_NAMES[next]}: ${stars(next)}`);
        card.append(el('span', 'form-next', 'Next'), thumbImg(heroThumb(hero.cls, 84, f, next), '', ''), title,
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
    return section;
}


/** The mastery line: the level, its bonus and the way to the next one. */
function masteryText(m, perLevel) {
    if (m.maxed) return `Mastery ${m.level} · the top: +${m.pct}% health and damage`;
    const bonus = m.level ? ` · +${m.pct}% health and damage` : '';
    return `Mastery ${m.level}${bonus} · ${m.into} / ${perLevel} to the next`;
}
