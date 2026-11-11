import { icon, withIcon } from './icons.js';
import { BUILDING_INFO, FORM_INFO, HERO_INFO, ITEM_INFO, MATERIAL_INFO, effectText } from './labels.js';
import { evolveReady, heroNames, heroStatus, heroTile } from './heroTiles.js';
import { buildingThumb, heroThumb, itemPicture, thumbImg } from './thumbs.js';

/** DOM builders for the forge sheet and the "ready to place" tray. */

// ── pure helpers (tested) ──────────────────────────────────────────────
export function formatDuration(seconds) {
    const s = Math.max(0, Math.round(seconds));
    if (s < 60) return `${s} s`;
    const minutes = Math.ceil(s / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatCountdown(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Why this recipe cannot be forged right now, or null. */
export function forgeBlocker(recipe, materials, freeSlots) {
    if (freeSlots <= 0) return 'Both forge slots are busy';
    if (recipe.owned + recipe.yields > recipe.limit) return 'Limit reached';
    const short = Object.entries(recipe.cost).some(([m, amount]) => (materials[m] ?? 0) < amount);
    return short ? 'Not enough materials' : null;
}

export function itemName(item) {
    return BUILDING_INFO[item]?.name ?? HERO_INFO[item]?.name ?? ITEM_INFO[item]?.name ?? item;
}

/** What anything the forge makes is for, in one short line. */
export function itemWhat(item) {
    return BUILDING_INFO[item]?.what ?? HERO_INFO[item]?.what ?? ITEM_INFO[item]?.what ?? '';
}

/** The picture of anything the forge makes. */
export function itemThumb(item, px) {
    if (HERO_INFO[item]) return heroThumb(item, px);
    if (ITEM_INFO[item]) return itemPicture(item, px);
    return buildingThumb(item, px);
}

/** A forge job's name: what it makes, or the hero evolving ("Bastion ★★"). */
export function jobName(job) {
    if (job.recipe === 'build_up') return `${BUILDING_INFO[job.type].name} Lv ${job.level}`;
    if (job.recipe === 'upgrade') return `${ITEM_INFO[job.type].name} Lv ${job.level}`;
    if (job.recipe !== 'evolve') return itemName(job.recipe);
    return `${FORM_INFO[job.form].name} ${'★'.repeat(job.tier)}`;
}

/** A forge job's picture. */
export function jobThumb(job, px) {
    if (job.recipe === 'build_up') return buildingThumb(job.type, px);
    if (job.recipe === 'upgrade') return itemPicture(job.type, px);
    if (job.recipe !== 'evolve') return itemThumb(job.recipe, px);
    return heroThumb(FORM_INFO[job.form].cls, px, job.form, job.tier);
}

// ── DOM ────────────────────────────────────────────────────────────────
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/** Material amounts with their icons; amounts the player cannot pay are struck through. */
export function costChips(cost, materials) {
    const wrap = el('span', 'costs');
    for (const [m, amount] of Object.entries(cost)) {
        if (!amount) continue;
        const info = MATERIAL_INFO[m];
        const chip = el('span', 'cost');
        chip.append(icon(info.icon), String(amount));
        chip.style.setProperty('--accent', info.color);
        chip.title = info.name;
        if (materials && (materials[m] ?? 0) < amount) chip.classList.add('short');
        wrap.append(chip);
    }
    return wrap;
}

/** The forge's slots; `onSpeedUp(jobId)` (or null) offers an hourglass on a job still running. */
export function renderForgeSlots(container, forge, serverNow, onClaim, onSpeedUp = null) {
    container.replaceChildren();
    for (let i = 0; i < forge.slots; i++) {
        const job = forge.jobs[i];
        const slot = el('div', 'forge-slot');
        if (!job) {
            slot.classList.add('empty');
            slot.textContent = 'Free slot · pick something below';
            container.append(slot);
            continue;
        }
        const total = job.ready_at - job.started_at;
        const left = job.ready_at - serverNow;
        const ready = left <= 0;
        const ring = el('span', 'slot-ring');
        ring.style.setProperty('--done', `${ready ? 100 : Math.round((100 * (total - left)) / total)}%`);
        ring.append(thumbImg(jobThumb(job, 50), '', jobName(job)));
        const text = el('span', 'slot-text');
        text.append(el('span', '', jobName(job)));
        if (ready) {
            const button = withIcon(el('button', 'button primary small'), 'gift', 'Claim!');
            button.type = 'button';
            button.addEventListener('click', () => onClaim(job.id));
            text.append(button);
            slot.classList.add('ready');
        } else {
            text.append(el('small', '', `${formatCountdown(left)} left`));
            if (onSpeedUp) {
                const speed = withIcon(el('button', 'slot-speed'), 'hourglass', 'Speed up');
                speed.type = 'button';
                speed.addEventListener('click', () => onSpeedUp(job.id));
                text.append(speed);
            }
        }
        slot.append(ring, text);
        container.append(slot);
    }
}

/** One big card per recipe of `kind`: picture, cost, time; tap to forge. */
export function renderRecipes(container, recipes, materials, freeSlots, kind, onForge) {
    container.replaceChildren();
    for (const recipe of recipes.filter((r) => r.kind === kind)) {
        const card = el('button', 'recipe');
        card.type = 'button';
        card.dataset.recipe = recipe.id;
        const time = el('span', 'recipe-time');
        time.append(icon('clock'), formatDuration(recipe.seconds));
        const ped = el('span', 'ped');
        ped.append(thumbImg(itemThumb(recipe.id, 84), '', ''));
        const name = el('span', 'recipe-name', itemName(recipe.id) + (recipe.yields > 1 ? ` ×${recipe.yields}` : ''));
        const blocker = forgeBlocker(recipe, materials, freeSlots);
        const foot = el('span', `recipe-foot${blocker ? ' blocked' : ''}`, blocker ?? `You own ${recipe.owned}/${recipe.limit}`);
        const what = el('span', 'recipe-what', itemWhat(recipe.id));
        card.append(time, ped, name, what, costChips(recipe.cost, materials), foot);
        card.disabled = Boolean(blocker);
        card.setAttribute('aria-label', `Forge ${itemName(recipe.id)}${blocker ? `: ${blocker}` : ''}`);
        card.addEventListener('click', () => onForge(recipe.id));
        container.append(card);
    }
}

/** Forged buildings waiting to be placed: tap one, then tap the map. */
export function renderStorage(container, storage, placingType, onPlace) {
    container.replaceChildren();
    for (const [type, count] of Object.entries(storage)) {
        if (!count) continue;
        const chip = el('button');
        chip.type = 'button';
        chip.append(thumbImg(buildingThumb(type, 50), '', ''), el('span', '', itemName(type)), el('span', 'qty', `×${count}`));
        chip.setAttribute('aria-pressed', String(type === placingType));
        chip.setAttribute('aria-label', `Place ${itemName(type)}`);
        chip.style.setProperty('--accent', BUILDING_INFO[type]?.glow ?? '#ffb347');
        chip.addEventListener('click', () => onPlace(type));
        container.append(chip);
    }
}

/** Every hero you own; tap one for its card. `tierXp` marks those that can evolve. */
export function renderRoster(container, heroes, limit, serverNow, tierXp = null, onTap = null) {
    container.replaceChildren();
    const head = el('span', 'roster-total', `Your heroes ${heroes.length}/${limit}`);
    container.append(head);
    const names = heroNames(heroes);
    const tiles = el('div', 'roster-tiles');
    let ready = 0;
    for (const hero of heroes) {
        const status = { ...heroStatus(hero, false, serverNow), evolve: evolveReady(hero, tierXp) };
        if (status.evolve) ready += 1;
        tiles.append(heroTile(hero, names.get(hero.id), status, onTap ? () => onTap(hero.id) : null));
    }
    if (onTap) head.append(el('small', '', ready ? ` · ${ready} can evolve: tap them` : ' · tap a hero for its card'));
    container.append(tiles);
}

/** "+18% health" for an item at its level, from the server's table. */
export function itemEffect(table, item) {
    const row = table.items[item.type];
    return effectText(row.effect, row.levels[item.level - 1]);
}

/**
 * The armoury: every item owned, its level and effect, who carries it, and
 * Upgrade (cost and time) unless it is at the top level or at the forge.
 */
export function renderArmoury(container, { items, table, heroNameOf, materials, freeSlots, jobs }, onUpgrade) {
    container.replaceChildren();
    container.append(el('span', 'roster-total', `Your armoury ${items.length}/${table.limit}`));
    if (!items.length) {
        container.append(el('p', 'hint', 'Forge a weapon or a spell above, then give it to a hero from the hero\'s card.'));
        return;
    }
    const list = el('div', 'armoury');
    const upgrading = new Set(jobs.filter((j) => j.recipe === 'upgrade').map((j) => j.item));
    for (const item of [...items].sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : b.level - a.level))) {
        const info = ITEM_INFO[item.type];
        const row = el('div', 'armoury-item');
        row.style.setProperty('--accent', info.color);
        const text = el('span', 'armoury-text');
        text.append(el('b', '', `${info.name} · Lv ${item.level}`), el('small', '', itemEffect(table, item)),
            el('small', 'carrier', item.hero ? `Carried by ${heroNameOf(item.hero)}` : 'In the armoury'));
        const side = el('span', 'armoury-side');
        if (upgrading.has(item.id)) {
            side.append(el('small', '', 'At the forge'));
        } else if (item.level >= table.max_level) {
            side.append(el('small', '', 'Top level'));
        } else {
            const next = table.items[item.type].upgrades[String(item.level + 1)];
            const short = Object.entries(next.cost).some(([m, n]) => (materials[m] ?? 0) < n);
            const button = withIcon(el('button', 'button small'), 'anvil', `Lv ${item.level + 1}`);
            button.type = 'button';
            button.disabled = short || freeSlots <= 0;
            button.title = short ? 'Not enough materials' : freeSlots <= 0 ? 'Both forge slots are busy' : `Upgrade to level ${item.level + 1}`;
            button.addEventListener('click', () => onUpgrade(item.id));
            const price = el('span', 'armoury-price');
            price.append(costChips(next.cost, materials), withIcon(el('span', 'evolve-time'), 'clock', formatDuration(next.seconds)));
            side.append(button, price);
        }
        row.append(thumbImg(itemPicture(item.type, 46), '', ''), text, side);
        list.append(row);
    }
    container.append(list);
}
