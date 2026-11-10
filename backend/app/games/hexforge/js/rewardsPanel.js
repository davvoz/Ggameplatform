import { formatCountdown } from './forgePanel.js';
import { icon } from './icons.js';
import { BONUS_INFO, BONUS_TARGETS, MATERIAL_INFO, TASK_INFO } from './labels.js';

/**
 * DOM builders for the Rewards sheet: the 7-day calendar, today's tasks,
 * the weekly chest and the bonus inventory; plus the chips that show any
 * reward (XP, bonuses, materials) and the medal of the "you got" card.
 */

// ── pure helpers (tested) ──────────────────────────────────────────────
/** The bonuses the player owns that work on `target` ('job' | 'hero' | 'energy'), best fit first. */
export function usableBonuses(target, owned) {
    return BONUS_TARGETS[target].filter((b) => (owned?.[b] ?? 0) > 0);
}

/** The most telling part of a reward, for a small calendar tile: { icon, color, text }. */
export function headline(reward) {
    const bonuses = Object.entries(reward.bonuses ?? {});
    if (bonuses.length) {
        const [bonus, count] = bonuses[0];
        const more = bonuses.length > 1 || Object.keys(reward.materials ?? {}).length > 0;
        return { icon: BONUS_INFO[bonus].icon, color: BONUS_INFO[bonus].color, text: `×${count}${more ? '+' : ''}` };
    }
    const [material, amount] = Object.entries(reward.materials ?? {})[0] ?? ['rune_stone', 0];
    const more = Object.keys(reward.materials).length > 1;
    return { icon: MATERIAL_INFO[material].icon, color: MATERIAL_INFO[material].color, text: `${amount}${more ? '+' : ''}` };
}

// ── DOM ────────────────────────────────────────────────────────────────
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/** Chips for everything in a reward: XP, bonuses, materials. */
export function rewardChips(reward, { big = false } = {}) {
    const wrap = el('span', `reward-chips${big ? ' big' : ''}`);
    const chip = (iconName, text, color, title) => {
        const c = el('span', 'reward-chip');
        c.style.setProperty('--accent', color);
        c.append(icon(iconName), text);
        c.title = title;
        wrap.append(c);
    };
    if (reward.xp) chip('star', `${reward.xp} XP`, '#ffd27a', 'Experience');
    for (const [bonus, count] of Object.entries(reward.bonuses ?? {})) {
        const info = BONUS_INFO[bonus];
        chip(info.icon, `×${count}`, info.color, info.name);
    }
    for (const [m, amount] of Object.entries(reward.materials ?? {})) {
        if (amount) chip(MATERIAL_INFO[m].icon, `+${amount}`, MATERIAL_INFO[m].color, MATERIAL_INFO[m].name);
    }
    return wrap;
}

/** The round medal at the top of a "you got" card. */
export function medal(iconName, color = '#ffb347') {
    const m = el('div', 'reward-medal');
    m.style.setProperty('--accent', color);
    m.append(icon(iconName));
    return m;
}

/** Seven days; today's tile glows and claims when tapped. */
export function renderCalendar(container, login, onClaim) {
    container.replaceChildren();
    login.calendar.forEach((reward, i) => {
        const day = i + 1;
        const today = day === login.day;
        const claimed = day < login.day || (today && !login.claimable);
        const tile = el(today && login.claimable ? 'button' : 'div', 'day-tile');
        tile.classList.toggle('today', today && login.claimable);
        tile.classList.toggle('claimed', claimed);
        tile.classList.toggle('last', day === login.calendar.length);
        const top = headline(reward);
        tile.style.setProperty('--accent', top.color);
        tile.append(el('span', 'day-label', `Day ${day}`), claimed ? icon('check') : icon(top.icon), el('span', 'day-amount', top.text));
        if (today && login.claimable) {
            tile.type = 'button';
            tile.setAttribute('aria-label', `Claim the day ${day} gift`);
            tile.addEventListener('click', onClaim);
        }
        container.append(tile);
    });
}

/** Today's three tasks: line, progress, reward, and Claim once done. */
export function renderTasks(container, tasks, onClaim) {
    container.replaceChildren();
    for (const task of tasks) {
        const info = TASK_INFO[task.id];
        const done = task.progress >= task.goal;
        const card = el('div', `task${task.claimed ? ' claimed' : ''}${done && !task.claimed ? ' done' : ''}`);
        const badge = el('span', 'task-icon');
        badge.append(icon(task.claimed ? 'check' : info.icon));
        const text = el('span', 'task-text');
        const meter = el('span', 'task-meter');
        const fill = el('span');
        fill.style.width = `${Math.round((100 * Math.min(task.progress, task.goal)) / task.goal)}%`;
        meter.append(fill);
        text.append(el('b', '', info.text(task.goal)), meter, rewardChips(task.reward));
        const side = el('span', 'task-side');
        if (task.claimed) {
            side.append(el('small', '', 'Done'));
        } else if (done) {
            const button = el('button', 'button primary small', 'Claim');
            button.type = 'button';
            button.addEventListener('click', () => onClaim(task.id));
            side.append(button);
        } else {
            side.append(el('small', '', `${task.progress}/${task.goal}`));
        }
        card.append(badge, text, side);
        container.append(card);
    }
}

/** The weekly chest: how many tasks so far, what is inside, Open! when full. */
export function renderChest(container, weekly, serverNow, onClaim) {
    container.replaceChildren();
    const ready = weekly.done >= weekly.goal && !weekly.claimed;
    container.classList.toggle('ready', ready);
    container.classList.toggle('claimed', weekly.claimed);
    const art = el('span', 'chest-art');
    art.append(icon('chest'));
    const body = el('div', 'chest-body');
    const head = el('h3', '', 'Weekly chest');
    const note = el('small', 'panel-note chest-reset', `new in ${formatLong(weekly.reset_at - serverNow)}`);
    head.append(note);
    const meter = el('span', 'task-meter wide');
    const fill = el('span');
    fill.style.width = `${Math.round((100 * Math.min(weekly.done, weekly.goal)) / weekly.goal)}%`;
    meter.append(fill);
    const line = weekly.claimed ? 'Opened. A new chest comes on Monday.' : `${Math.min(weekly.done, weekly.goal)}/${weekly.goal} daily tasks this week`;
    body.append(head, meter, el('small', 'chest-line', line), rewardChips(weekly.reward));
    if (ready) {
        const button = el('button', 'button primary small chest-open', 'Open the chest!');
        button.type = 'button';
        button.addEventListener('click', onClaim);
        body.append(button);
    }
    container.append(art, body);
}

/** The bonuses the player owns, with what each one does. */
export function renderBonuses(container, owned) {
    container.replaceChildren();
    for (const [bonus, info] of Object.entries(BONUS_INFO)) {
        const count = owned?.[bonus] ?? 0;
        const tile = el('div', `bonus-tile${count ? '' : ' none'}`);
        tile.style.setProperty('--accent', info.color);
        const art = el('span', 'bonus-art');
        art.append(icon(info.icon));
        art.append(el('span', 'bonus-count', `×${count}`));
        tile.append(art, el('b', '', info.name), el('small', '', info.effect));
        tile.title = info.what;
        container.append(tile);
    }
}

/** "5 h 12 min", "2 d 3 h": countdowns that may run for days. */
export function formatLong(seconds) {
    const s = Math.max(0, Math.round(seconds));
    const days = Math.floor(s / 86400);
    if (days) return `${days} d ${Math.floor((s % 86400) / 3600)} h`;
    return formatCountdown(s);
}
