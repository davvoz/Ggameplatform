import { icon, withIcon } from './icons.js';
import { BUILDING_INFO, HERO_INFO, MATERIAL_INFO } from './labels.js';
import { buildingThumb, heroThumb, thumbImg } from './thumbs.js';

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
    return BUILDING_INFO[item]?.name ?? HERO_INFO[item]?.name ?? item;
}

/** The picture of anything the forge makes. */
export function itemThumb(item, px) {
    return HERO_INFO[item] ? heroThumb(item, px) : buildingThumb(item, px);
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

export function renderForgeSlots(container, forge, serverNow, onClaim) {
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
        ring.append(thumbImg(itemThumb(job.recipe, 50), '', itemName(job.recipe)));
        const text = el('span', 'slot-text');
        text.append(el('span', '', itemName(job.recipe)));
        if (ready) {
            const button = withIcon(el('button', 'button primary small'), 'gift', 'Claim!');
            button.type = 'button';
            button.addEventListener('click', () => onClaim(job.id));
            text.append(button);
            slot.classList.add('ready');
        } else {
            text.append(el('small', '', `${formatCountdown(left)} left`));
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
        const time = el('span', 'recipe-time');
        time.append(icon('clock'), formatDuration(recipe.seconds));
        const ped = el('span', 'ped');
        ped.append(thumbImg(itemThumb(recipe.id, 84), '', ''));
        const name = el('span', 'recipe-name', itemName(recipe.id) + (recipe.yields > 1 ? ` ×${recipe.yields}` : ''));
        const blocker = forgeBlocker(recipe, materials, freeSlots);
        const foot = el('span', `recipe-foot${blocker ? ' blocked' : ''}`, blocker ?? `You own ${recipe.owned}/${recipe.limit}`);
        card.append(time, ped, name, costChips(recipe.cost, materials), foot);
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

export function renderRoster(container, heroes, limit) {
    container.replaceChildren();
    const counts = {};
    for (const h of heroes) counts[h.cls] = (counts[h.cls] ?? 0) + 1;
    container.append(el('span', 'roster-total', `Your heroes ${heroes.length}/${limit}:`));
    for (const [cls, info] of Object.entries(HERO_INFO)) {
        const item = el('span', 'roster-item');
        item.append(thumbImg(heroThumb(cls, 40), '', info.name), el('span', '', `${info.tag} ×${counts[cls] ?? 0}`));
        item.style.setProperty('--accent', info.color);
        container.append(item);
    }
}
