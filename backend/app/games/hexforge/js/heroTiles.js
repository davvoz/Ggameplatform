import { icon } from './icons.js';
import { FORM_INFO, HERO_INFO } from './labels.js';
import { heroPortrait, thumbImg } from './thumbs.js';

/**
 * One tile per hero you own: its portrait, its own name ("Blade 2"), its
 * job or evolved form with stars for the tier, and how it is doing: ready,
 * in the squad, at the forge, or hurt with the time left to heal and a ring
 * that fills up as it heals. A hero that can evolve wears an arrow badge.
 * Used by the attack plan and the forge.
 */

export const INJURY_SECONDS = 900;   // as on the server: a fallen hero heals in 15 minutes

/** "Blade 1", "Blade 2"… numbered per class in the order they were forged. */
export function heroNames(heroes) {
    const seen = {};
    return new Map(heroes.map((h) => {
        seen[h.cls] = (seen[h.cls] ?? 0) + 1;
        return [h.id, `${HERO_INFO[h.cls].tag} ${seen[h.cls]}`];
    }));
}

/** True when the hero has the XP for its next tier and is not at the forge already. */
export function evolveReady(hero, tierXp) {
    const next = (hero.tier ?? 1) + 1;
    return next <= 3 && !hero.evolving && (hero.xp ?? 0) >= (tierXp?.[next] ?? Infinity);
}

/** The stars of a tier: ★ recruit, ★★ evolved, ★★★ ascended. */
export function stars(tier = 1) {
    return '★'.repeat(tier);
}

/** 'forge' while evolving, 'hurt' while healing, else 'picked' or 'ready'; plus the seconds left to heal. */
export function heroStatus(hero, picked, serverNow) {
    if (hero.evolving) return { state: 'forge', left: 0, healed: 1 };
    const left = hero.injured_until ? hero.injured_until - serverNow : 0;
    if (left > 0) return { state: 'hurt', left, healed: Math.max(0, Math.min(1, 1 - left / INJURY_SECONDS)) };
    return { state: picked ? 'picked' : 'ready', left: 0, healed: 1 };
}

export function formatHeal(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A tile; `onTap` makes it a button. `status.evolve` adds the "can evolve" badge. */
export function heroTile(hero, name, status, onTap = null) {
    const info = HERO_INFO[hero.cls];
    const form = (hero.tier ?? 1) > 1 ? FORM_INFO[hero.form] : null;
    const tile = document.createElement(onTap ? 'button' : 'div');
    tile.className = `hero-tile ${status.state}`;
    tile.dataset.hero = String(hero.id);
    tile.style.setProperty('--accent', info.color);
    tile.style.setProperty('--healed', `${Math.round(status.healed * 100)}%`);
    const portrait = document.createElement('span');
    portrait.className = 'ht-portrait';
    portrait.append(thumbImg(heroPortrait(hero, 52), '', ''));
    if (status.state === 'picked') portrait.append(badge('check', 'ht-badge picked'));
    if (status.state === 'hurt') portrait.append(badge('plus', 'ht-badge hurt'));
    if (status.state === 'forge') portrait.append(badge('anvil', 'ht-badge forge'));
    if (status.evolve && status.state !== 'forge') portrait.append(badge('arrow', 'ht-badge evolve'));
    const label = document.createElement('span');
    label.className = 'ht-name';
    label.textContent = name;
    const job = document.createElement('span');
    job.className = 'ht-job';
    job.textContent = form ? `${form.name} ${stars(hero.tier)}` : info.job;
    if (form) job.style.color = form.accent;
    const line = document.createElement('span');
    line.className = 'ht-status';
    line.textContent = { ready: 'Ready', picked: 'In squad', hurt: formatHeal(status.left), forge: 'Evolving' }[status.state];
    tile.append(portrait, label, job, line);
    const what = {
        ready: 'ready, tap to add to the squad', picked: 'in the squad, tap to take out',
        hurt: `hurt, healed in ${formatHeal(status.left)}`, forge: 'evolving at the forge',
    };
    tile.title = `${name} (${form ? form.what : info.what}) ${what[status.state]}${status.evolve ? '. Can evolve!' : ''}`;
    if (onTap) {
        tile.type = 'button';
        tile.setAttribute('aria-pressed', String(status.state === 'picked'));
        tile.setAttribute('aria-label', tile.title);
        tile.addEventListener('click', onTap);
    }
    return tile;
}

function badge(name, className) {
    const span = document.createElement('span');
    span.className = className;
    span.append(icon(name));
    return span;
}
