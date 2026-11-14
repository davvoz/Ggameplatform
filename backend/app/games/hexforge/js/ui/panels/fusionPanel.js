import { costChips, formatDuration } from './forgePanel.js';
import { icon, withIcon } from '../icons.js';
import { BUILDING_INFO, FORM_INFO, HERO_INFO, MATERIAL_INFO, PATH_INFO } from '../../data/labels.js';
import { partColor } from '../../render/art/fusionArt.js';
import { buildingThumb, heroPortrait, heroThumb, thumbImg } from '../../render/thumbs.js';
import { gradeOf } from '../../core/fusion.js';

/**
 * The fusion sheet: the base (a building or a hero at the top level, or a
 * fusion), two more of the same grade picked from a grid, then what they
 * would make, with its stats, cost and time. The donors are used up; the
 * base keeps its body and gains their powers.
 */

const SQUAD_MIN = 4;

// ── pure helpers (tested) ──────────────────────────────────────────────
/**
 * Buildings of one type share a tile (sixteen walls are one "Wall ×16");
 * heroes each have their own. [{ key, ids, items, picked }].
 */
export function groupCandidates(kind, candidates, picked) {
    const groups = new Map();
    for (const c of candidates) {
        const key = kind === 'building' ? c.type : `h${c.id}`;
        if (!groups.has(key)) groups.set(key, { key, ids: [], items: [], picked: 0 });
        const g = groups.get(key);
        g.ids.push(c.id);
        g.items.push(c);
        if (picked.includes(c.id)) g.picked += 1;
    }
    return [...groups.values()];
}

/** Why the fusion cannot start, or null. */
export function fusionBlocker({ kind, picked, cost, materials, freeSlots, fighters }) {
    if (picked.length < 2) return `Pick ${2 - picked.length} more`;
    if (kind === 'hero' && fighters - 2 < SQUAD_MIN) return 'You need at least 4 fighters left for a squad.';
    if (freeSlots <= 0) return 'The forge is full: wait for a free slot.';
    if (Object.entries(cost).some(([m, n]) => (materials[m] ?? 0) < n)) return 'Not enough materials.';
    return null;
}

/** A part in words: "Lightning Tower ×1.2". */
export function partName(part) {
    const name = BUILDING_INFO[part.type]?.name ?? HERO_INFO[part.type]?.name ?? part.type;
    let style = null;
    if (part.path) style = PATH_INFO[part.path]?.name;
    else if (part.form) style = FORM_INFO[part.form]?.name;
    return `${style && HERO_INFO[part.type] ? style : name} ×${Math.round(part.power * 100) / 100}`;
}

/** The lines a fused building's stats make: ["4200 health", "Rune Tower: 160 dmg · 7 cells", …]. */
export function buildingLines(stats) {
    const lines = [`${stats.hp} health`];
    for (const w of stats.weapons ?? []) {
        let line = `${BUILDING_INFO[w.type].name}: ${w.damage} dmg every ${w.cooldown} s · ${w.range} cells`;
        if (w.chain) line += ` · hits ${w.chain}`;
        if (w.slow) line += ` · slows ${w.slow}%`;
        lines.push(line);
    }
    for (const p of stats.produces ?? []) lines.push(`+${p.per_hour} ${MATERIAL_INFO[p.material].name.toLowerCase()}/h`);
    if (stats.blast) lines.push(`Blast ${stats.blast} on the first hero close by`);
    if (stats.thorns) lines.push(`Spikes ${stats.thorns}`);
    return lines;
}

const HERO_LABELS = {
    hp: 'Health', damage: 'Damage', speed: 'Speed', range: 'Reach', cooldown: 'Hits every',
    nova_damage: 'Nova', taunt_radius: 'Draws fire', splash_radius: 'Smash area', tower_bonus: 'vs towers',
};

export function heroLines(stats) {
    return Object.entries(HERO_LABELS)
        .filter(([key]) => stats[key] && !(key === 'tower_bonus' && stats[key] <= 1))
        .map(([key, label]) => {
            const v = stats[key];
            if (key === 'cooldown') return `${label} ${v} s`;
            if (key === 'tower_bonus') return `×${v} ${label}`;
            if (key === 'range' || key === 'taunt_radius' || key === 'splash_radius') return `${label} ${v} cells`;
            return `${label} ${v}`;
        });
}

// ── DOM ────────────────────────────────────────────────────────────────
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function pictureOf(kind, x, px) {
    if (kind === 'building') return buildingThumb(x.type, px, x.level ?? 1, x.path ?? null, x.fusion ?? null);
    return heroPortrait(x, px);
}

function nameOf(kind, x, names) {
    if (kind === 'building') return BUILDING_INFO[x.type].name;
    return names?.get(x.id) ?? HERO_INFO[x.cls].name;
}

function gradeText(grade) {
    return grade ? `Fusion ${'◆'.repeat(grade)}` : 'Top level';
}

export function renderFusionCard(container, view, { onToggle, onFuse }) {
    const { kind, base, candidates, picked, names, busy } = view;
    container.replaceChildren();
    const grade = gradeOf(base);
    container.append(fusionHead(kind, base, names, grade));

    const pick = el('div', 'evolve');
    pick.append(el('h3', '', `Add 2 more · ${gradeText(grade).toLowerCase()}, any kind`));
    if (!candidates.length) {
        const tip = el('p', 'tip');
        tip.append(icon('info'), noCandidatesText(kind, grade));
        pick.append(tip);
        container.append(pick);
        return;
    }
    const grid = el('div', 'fuse-grid');
    for (const g of groupCandidates(kind, candidates, picked)) {
        grid.append(candidateTile(kind, g, { picked, names, busy, onToggle }));
    }
    pick.append(grid);
    container.append(pick);
    container.append(fusionResult(view, grade, onFuse));
}

function accentOf(kind, x) {
    return kind === 'building' ? BUILDING_INFO[x.type].glow : HERO_INFO[x.cls].color;
}

/** The base: portrait, name, grade, and what fusing does to it. */
function fusionHead(kind, base, names, grade) {
    const head = el('div', 'hero-head');
    head.style.setProperty('--accent', accentOf(kind, base));
    const art = el('span', 'hero-art');
    art.append(thumbImg(pictureOf(kind, base, 104), '', ''));
    const who = el('div', 'hero-who');
    who.append(el('b', 'hero-name', nameOf(kind, base, names)), el('span', 'hero-form', `Base · ${gradeText(grade)}`),
        el('small', 'hero-what', 'It keeps its body and its place. The two you add are used up: each gives it its power.'));
    head.append(art, who);
    return head;
}

/** One kind of candidate (alike ones grouped): tap to add or take out. */
function candidateTile(kind, g, { picked, names, busy, onToggle }) {
    const c = g.items[0];
    const tile = el('button', 'fuse-tile');
    tile.type = 'button';
    tile.setAttribute('aria-pressed', String(g.picked > 0));
    tile.style.setProperty('--accent', accentOf(kind, c));
    tile.append(thumbImg(pictureOf(kind, c, 64), '', ''), el('b', '', nameOf(kind, c, names)));
    if (kind === 'hero' && c.form) tile.append(el('small', '', FORM_INFO[c.form]?.name ?? ''));
    if (g.ids.length > 1) tile.append(el('small', '', `you have ${g.ids.length}`));
    if (g.picked) tile.append(el('span', 'fuse-pick', g.picked > 1 ? `×${g.picked}` : '✓'));
    tile.disabled = busy || (!g.picked && picked.length >= 2);
    tile.addEventListener('click', () => onToggle(g.ids));
    return tile;
}

/** What the fusion becomes, its price and the Fuse button. */
function fusionResult(view, grade, onFuse) {
    const { kind, base, picked, preview, materials, freeSlots, fighters, table, busy } = view;
    const { cost, seconds } = table.costs[String(grade + 1)];
    const result = el('div', 'evolve fuse-result');
    result.append(el('h3', '', `Becomes: ${gradeText(grade + 1)}`));
    if (preview) result.append(fusionPreview(kind, base, preview));
    else result.append(el('p', 'tip', picked.length < 2 ? 'Tap two to see what they make together.' : 'Working it out…'));
    const blocker = fusionBlocker({ kind, picked, cost, materials, freeSlots, fighters });
    const foot = el('div', 'evolve-foot');
    const price = el('span', 'evolve-price');
    price.append(costChips(cost, materials), withIcon(el('span', 'evolve-time'), 'clock', formatDuration(seconds)));
    const button = withIcon(el('button', 'button primary'), 'fuse', 'Fuse at the forge');
    button.type = 'button';
    button.disabled = Boolean(blocker) || busy || !preview;
    button.addEventListener('click', () => onFuse());
    foot.append(price, button);
    result.append(foot);
    const note = kind === 'hero'
        ? 'The base waits at the forge; the other two leave for good.'
        : 'The base keeps working meanwhile; the other two leave the map now.';
    result.append(el('small', 'evolve-note', blocker ?? note));
    return result;
}

/** The fused picture, its parts and how it will fight or produce. */
function fusionPreview(kind, base, preview) {
    const show = el('div', 'fuse-preview');
    const fusion = { grade: preview.grade, parts: preview.parts };
    const src = kind === 'building'
        ? buildingThumb(base.type, 120, 5, base.path ?? null, fusion)
        : heroThumb(base.cls, 120, base.form ?? null, 3, fusion);
    show.append(thumbImg(src, 'fuse-big', ''));
    const facts = el('div', 'fuse-facts');
    const chips = el('div', 'fuse-parts');
    for (const part of preview.parts) {
        const chip = el('span', 'fuse-part', partName(part));
        chip.style.setProperty('--accent', partColor(part));
        chips.append(chip);
    }
    facts.append(chips);
    const lines = kind === 'building' ? buildingLines(preview.stats) : heroLines(preview.stats);
    const list = el('ul', 'fuse-lines');
    for (const line of lines) list.append(el('li', '', line));
    facts.append(list);
    show.append(facts);
    return show;
}

/** Why there is nothing to fuse with yet, and what to do about it. */
function noCandidatesText(kind, grade) {
    if (kind === 'building') {
        const level = grade ? 'the same fusion grade' : '5';
        return `Nothing to add yet: bring other buildings to level ${level} first (towers, mines, walls, traps).`;
    }
    const todo = grade ? 'fuse more heroes to the same grade' : 'ascend more heroes (★★★)';
    return `No other hero ready: ${todo} first.`;
}
