import { icon } from './icons.js';
import { HERO_INFO } from './labels.js';
import { heroThumb, thumbImg } from './thumbs.js';

/**
 * One tile per hero you own: its portrait, its own name ("Blade 2") and how
 * it is doing: ready, in the squad, or hurt with the time left to heal and a
 * ring that fills up as it heals. Used by the attack plan and the forge.
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

/** 'hurt' while healing, else 'picked' or 'ready'; plus the seconds left to heal. */
export function heroStatus(hero, picked, serverNow) {
    const left = hero.injured_until ? hero.injured_until - serverNow : 0;
    if (left > 0) return { state: 'hurt', left, healed: Math.max(0, Math.min(1, 1 - left / INJURY_SECONDS)) };
    return { state: picked ? 'picked' : 'ready', left: 0, healed: 1 };
}

export function formatHeal(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A tile; `onTap` makes it a button (attack plan), without it is a plain picture (forge). */
export function heroTile(hero, name, status, onTap = null) {
    const info = HERO_INFO[hero.cls];
    const tile = document.createElement(onTap ? 'button' : 'div');
    tile.className = `hero-tile ${status.state}`;
    tile.dataset.hero = String(hero.id);
    tile.style.setProperty('--accent', info.color);
    tile.style.setProperty('--healed', `${Math.round(status.healed * 100)}%`);
    const portrait = document.createElement('span');
    portrait.className = 'ht-portrait';
    portrait.append(thumbImg(heroThumb(hero.cls, 52), '', ''));
    if (status.state === 'picked') portrait.append(badge('check', 'ht-badge picked'));
    if (status.state === 'hurt') portrait.append(badge('plus', 'ht-badge hurt'));
    const label = document.createElement('span');
    label.className = 'ht-name';
    label.textContent = name;
    const job = document.createElement('span');
    job.className = 'ht-job';
    job.textContent = info.job;
    const line = document.createElement('span');
    line.className = 'ht-status';
    line.textContent = { ready: 'Ready', picked: 'In squad', hurt: formatHeal(status.left) }[status.state];
    tile.append(portrait, label, job, line);
    const what = { ready: 'ready, tap to add to the squad', picked: 'in the squad, tap to take out', hurt: `hurt, healed in ${formatHeal(status.left)}` };
    tile.title = `${name} (${info.what}) ${what[status.state]}`;
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
