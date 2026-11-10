import { BUILDING_INFO, HERO_INFO, MATERIAL_INFO } from './labels.js';

/** DOM builders for the forge, storage and roster blocks of the city panel. */

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

// ── DOM ────────────────────────────────────────────────────────────────
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function costChips(cost, materials) {
    const wrap = el('span', 'costs');
    for (const [m, amount] of Object.entries(cost)) {
        const chip = el('span', 'cost', String(amount));
        chip.style.setProperty('--accent', MATERIAL_INFO[m].color);
        chip.title = MATERIAL_INFO[m].name;
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
            slot.append(el('span', 'job-name', 'Empty slot'));
            container.append(slot);
            continue;
        }
        const total = job.ready_at - job.started_at;
        const left = job.ready_at - serverNow;
        const ready = left <= 0;
        slot.append(el('span', 'job-name', itemName(job.recipe)));
        if (ready) {
            const button = el('button', 'button primary small', 'Claim');
            button.addEventListener('click', () => onClaim(job.id));
            slot.append(button);
            slot.classList.add('ready');
        } else {
            slot.append(el('span', 'job-left', formatCountdown(left)));
        }
        const bar = el('div', 'job-bar');
        const fill = el('div');
        fill.style.width = `${ready ? 100 : (100 * (total - left)) / total}%`;
        bar.append(fill);
        slot.append(bar);
        container.append(slot);
    }
}

export function renderRecipes(container, recipes, materials, freeSlots, onForge) {
    container.replaceChildren();
    for (const kind of ['building', 'hero']) {
        container.append(el('h3', 'recipe-group', kind === 'building' ? 'Buildings' : 'Heroes'));
        for (const recipe of recipes.filter((r) => r.kind === kind)) {
            const row = el('div', 'recipe');
            const title = el('span', 'recipe-name', itemName(recipe.id) + (recipe.yields > 1 ? ` ×${recipe.yields}` : ''));
            const meta = el('span', 'recipe-meta', `${formatDuration(recipe.seconds)} · ${recipe.owned}/${recipe.limit}`);
            const blocker = forgeBlocker(recipe, materials, freeSlots);
            const button = el('button', 'button small', 'Forge');
            button.disabled = Boolean(blocker);
            if (blocker) button.title = blocker;
            button.addEventListener('click', () => onForge(recipe.id));
            row.append(title, button, costChips(recipe.cost, materials), meta);
            container.append(row);
        }
    }
}

export function renderStorage(container, storage, placingType, onPlace) {
    container.replaceChildren();
    const items = Object.entries(storage);
    if (!items.length) {
        container.append(el('p', 'hint', 'Forged buildings wait here until you place them.'));
        return;
    }
    for (const [type, count] of items) {
        const chip = el('button', 'chip', `${itemName(type)} ×${count}`);
        chip.type = 'button';
        chip.setAttribute('aria-pressed', String(type === placingType));
        chip.style.setProperty('--accent', BUILDING_INFO[type]?.glow ?? '#39e6ff');
        chip.addEventListener('click', () => onPlace(type));
        container.append(chip);
    }
}

export function renderRoster(container, heroes, limit) {
    container.replaceChildren();
    const counts = {};
    for (const h of heroes) counts[h.cls] = (counts[h.cls] ?? 0) + 1;
    for (const [cls, info] of Object.entries(HERO_INFO)) {
        const item = el('span', 'roster-item', `${info.name} ×${counts[cls] ?? 0}`);
        item.style.setProperty('--accent', info.color);
        container.append(item);
    }
    container.append(el('span', 'roster-total', `${heroes.length}/${limit} heroes`));
}
