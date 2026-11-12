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
    if (hero.cls === 'explorer') return false;
    const next = (hero.tier ?? 1) + 1;
    return next <= 3 && !hero.evolving && (hero.xp ?? 0) >= (tierXp?.[next] ?? Infinity);
}

/** The stars of a tier: ★ recruit, ★★ evolved, ★★★ ascended. */
export function stars(tier = 1) {
    return '★'.repeat(tier);
}

/** The stars of the tier to come: those already earned, then the new ones lit up. */
export function nextStars(have, next) {
    const row = document.createElement('span');
    row.className = 'next-stars';
    for (let i = 1; i <= next; i++) {
        const star = document.createElement('span');
        star.className = i > have ? 'star new' : 'star';
        star.textContent = '★';
        row.append(star);
    }
    return row;
}

/** 'forge' while evolving, 'hurt' while healing, else 'picked' or 'ready'; plus the seconds left to heal. */
export function heroStatus(hero, picked, serverNow) {
    if (hero.cls === 'explorer') {
        if (!hero.mission) return { state: 'home', left: 0, healed: 1 };
        const left = hero.mission.ready_at - serverNow;
        return left > 0 ? { state: 'away', left, healed: 1 } : { state: 'back', left: 0, healed: 1 };
    }
    if (hero.evolving) return { state: 'forge', left: 0, healed: 1 };
    const left = hero.injured_until ? hero.injured_until - serverNow : 0;
    if (left > 0) return { state: 'hurt', left, healed: Math.max(0, Math.min(1, 1 - left / INJURY_SECONDS)) };
    return { state: picked ? 'picked' : 'ready', left: 0, healed: 1 };
}

/** How far through its trip an Explorer is, 0..1. */
export function tripProgress(trip, now) {
    const span = trip.ready_at - trip.started_at;
    return span > 0 ? Math.max(0, Math.min(1, (now - trip.started_at) / span)) : 1;
}

/** A bar filling up while the Explorer is away; `updateTrips` keeps it moving. */
export function tripBar(trip, now) {
    const bar = document.createElement('span');
    bar.className = 'trip-bar';
    bar.dataset.start = String(trip.started_at);
    bar.dataset.ready = String(trip.ready_at);
    bar.append(document.createElement('span'));
    updateTrips(bar.parentElement ?? document.createElement('div'), now, [bar]);
    return bar;
}

/** "Back in 3h 20m" text that `updateTrips` keeps counting down. */
export function tripLeft(el, trip, prefix = '') {
    el.classList.add('trip-left');
    el.dataset.ready = String(trip.ready_at);
    el.dataset.prefix = prefix;
    return el;
}

/** Move every trip bar and countdown under `root` to `now`. */
export function updateTrips(root, now, bars = root.querySelectorAll('.trip-bar')) {
    for (const bar of bars) {
        const trip = { started_at: Number(bar.dataset.start), ready_at: Number(bar.dataset.ready) };
        bar.firstElementChild.style.width = `${(tripProgress(trip, now) * 100).toFixed(1)}%`;
        bar.classList.toggle('done', now >= trip.ready_at);
    }
    for (const text of root.querySelectorAll('.trip-left')) {
        const left = Number(text.dataset.ready) - now;
        text.textContent = left > 0 ? `${text.dataset.prefix}${formatAway(left)}` : 'Back!';
    }
}

/** Time left on a mission: 3h 20m, or 12:05 under an hour. */
export function formatAway(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
    return formatHeal(s);
}

export function formatHeal(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * A tile; `onTap` makes it a button. `status.evolve` adds the "can evolve" badge;
 * `status.next` ({ form, tier }) is what a hero at the forge is becoming.
 * A fused hero has its own frame and a ◆ badge with its grade.
 */
export function heroTile(hero, name, status, onTap = null) {
    const info = HERO_INFO[hero.cls];
    const form = (hero.tier ?? 1) > 1 ? FORM_INFO[hero.form] : null;
    const tile = document.createElement(onTap ? 'button' : 'div');
    const grade = hero.fusion?.grade ?? 0;
    tile.className = `hero-tile ${status.state}${(hero.tier ?? 1) >= 3 ? ' ascended' : ''}${grade ? ' fused' : ''}`;
    tile.dataset.hero = String(hero.id);
    tile.style.setProperty('--accent', info.color);
    tile.style.setProperty('--healed', `${Math.round(status.healed * 100)}%`);
    const portrait = document.createElement('span');
    portrait.className = 'ht-portrait';
    portrait.append(thumbImg(heroPortrait(hero, 52), '', ''));
    if (status.state === 'picked') portrait.append(badge('check', 'ht-badge picked'));
    if (status.state === 'hurt') portrait.append(badge('plus', 'ht-badge hurt'));
    if (status.state === 'forge') portrait.append(badge('anvil', 'ht-badge forge'));
    if (status.state === 'back') portrait.append(badge('chest', 'ht-badge evolve'));
    if (status.evolve && status.state !== 'forge') portrait.append(badge('arrow', 'ht-badge evolve'));
    if (grade) portrait.append(Object.assign(document.createElement('span'), { className: 'ht-grade', textContent: `◆${grade}` }));
    const label = document.createElement('span');
    label.className = 'ht-name';
    label.textContent = name;
    const job = document.createElement('span');
    job.className = 'ht-job';
    const coming = status.state === 'forge' && status.next ? FORM_INFO[status.next.form] : null;
    if (coming) {
        // at the forge: show what it is becoming, the new star lit up
        job.append(`${coming.name} `, nextStars(hero.tier ?? 1, status.next.tier));
        job.style.color = coming.accent;
    } else {
        job.textContent = hero.cls === 'explorer' ? info.job : `${form ? form.name : info.job} ${stars(hero.tier ?? 1)}`;
        if (form) job.style.color = form.accent;
    }
    const line = document.createElement('span');
    line.className = 'ht-status';
    line.textContent = {
        ready: 'Ready', picked: 'In squad', hurt: formatHeal(status.left), forge: hero.fusing ? 'Fusing' : 'Evolving',
        home: 'At home', away: formatAway(status.left), back: 'Back!',
    }[status.state];
    tile.append(portrait, label, job, line);
    if (status.state === 'away') {
        tripLeft(line, hero.mission);
        tile.append(tripBar(hero.mission, hero.mission.ready_at - status.left));
    }
    const what = {
        ready: 'ready, tap to add to the squad', picked: 'in the squad, tap to take out',
        hurt: `hurt, healed in ${formatHeal(status.left)}`, forge: hero.fusing ? 'fusing at the forge' : 'evolving at the forge',
        home: 'at home, tap to send on a mission', away: `on a mission, back in ${formatAway(status.left)}`,
        back: 'back from a mission with loot',
    };
    tile.title = `${name} (${form ? form.what : info.what})${grade ? `, fused ${'◆'.repeat(grade)}` : ''}, ${what[status.state]}${status.evolve ? '. Can evolve!' : ''}`;
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
