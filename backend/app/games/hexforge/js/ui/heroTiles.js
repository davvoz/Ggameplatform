import { icon } from './icons.js';
import { FORM_INFO, HERO_INFO } from '../data/labels.js';
import { heroPortrait, thumbImg } from '../render/thumbs.js';
import { tripProgress } from '../core/heroes.js';

/**
 * One tile per hero you own: its portrait, its own name ("Blade 2"), its
 * job or evolved form with stars for the tier, and how it is doing: ready,
 * in the squad, at the forge, or hurt with the time left to heal and a ring
 * that fills up as it heals. A hero that can evolve wears an arrow badge.
 * Used by the attack plan and the forge.
 */

/** "Blade 1", "Blade 2"… numbered per class in the order they were forged. */
export function heroNames(heroes) {
    const seen = {};
    return new Map(heroes.map((h) => {
        seen[h.cls] = (seen[h.cls] ?? 0) + 1;
        return [h.id, `${HERO_INFO[h.cls].tag} ${seen[h.cls]}`];
    }));
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
    tile.className = tileClass(hero, status, grade);
    tile.dataset.hero = String(hero.id);
    tile.style.setProperty('--accent', info.color);
    tile.style.setProperty('--healed', `${Math.round(status.healed * 100)}%`);
    const label = document.createElement('span');
    label.className = 'ht-name';
    label.textContent = name;
    const line = document.createElement('span');
    line.className = 'ht-status';
    line.textContent = {
        ready: 'Ready', picked: 'In squad', hurt: formatHeal(status.left), forge: hero.fusing ? 'Fusing' : 'Evolving',
        home: 'At home', away: formatAway(status.left), back: 'Back!',
    }[status.state];
    tile.append(tilePortrait(hero, status, grade), label, tileJob(hero, status, form), line);
    if (status.state === 'away') {
        tripLeft(line, hero.mission);
        tile.append(tripBar(hero.mission, hero.mission.ready_at - status.left));
    }
    tile.title = tileTitle(hero, name, status, form, grade);
    if (onTap) {
        tile.type = 'button';
        tile.setAttribute('aria-pressed', String(status.state === 'picked'));
        tile.setAttribute('aria-label', tile.title);
        tile.addEventListener('click', onTap);
    }
    return tile;
}

function tileClass(hero, status, grade) {
    const ascended = (hero.tier ?? 1) >= 3 ? ' ascended' : '';
    const fused = grade ? ' fused' : '';
    return `hero-tile ${status.state}${ascended}${fused}`;
}

/** The portrait with its badges: picked, hurt, at the forge, back with loot, can evolve, fusion grade. */
function tilePortrait(hero, status, grade) {
    const portrait = document.createElement('span');
    portrait.className = 'ht-portrait';
    portrait.append(thumbImg(heroPortrait(hero, 52), '', ''));
    const STATE_BADGES = {
        picked: ['check', 'ht-badge picked'], hurt: ['plus', 'ht-badge hurt'],
        forge: ['anvil', 'ht-badge forge'], back: ['chest', 'ht-badge evolve'],
    };
    const stateBadge = STATE_BADGES[status.state];
    if (stateBadge) portrait.append(badge(...stateBadge));
    if (status.evolve && status.state !== 'forge') portrait.append(badge('arrow', 'ht-badge evolve'));
    if (grade) portrait.append(Object.assign(document.createElement('span'), { className: 'ht-grade', textContent: `◆${grade}` }));
    return portrait;
}

/** Its job (or form) and stars; at the forge, what it is becoming with the new star lit up. */
function tileJob(hero, status, form) {
    const info = HERO_INFO[hero.cls];
    const job = document.createElement('span');
    job.className = 'ht-job';
    const coming = status.state === 'forge' && status.next ? FORM_INFO[status.next.form] : null;
    if (coming) {
        job.append(`${coming.name} `, nextStars(hero.tier ?? 1, status.next.tier));
        job.style.color = coming.accent;
        return job;
    }
    if (hero.cls === 'explorer') {
        job.textContent = info.job;
        return job;
    }
    job.textContent = `${form ? form.name : info.job} ${stars(hero.tier ?? 1)}`;
    if (form) job.style.color = form.accent;
    return job;
}

/** The tooltip (and the button's label): who it is and what tapping does. */
function tileTitle(hero, name, status, form, grade) {
    const info = HERO_INFO[hero.cls];
    const what = {
        ready: 'ready, tap to add to the squad', picked: 'in the squad, tap to take out',
        hurt: `hurt, healed in ${formatHeal(status.left)}`, forge: hero.fusing ? 'fusing at the forge' : 'evolving at the forge',
        home: 'at home, tap to send on a mission', away: `on a mission, back in ${formatAway(status.left)}`,
        back: 'back from a mission with loot',
    };
    const fused = grade ? `, fused ${'◆'.repeat(grade)}` : '';
    const evolve = status.evolve ? '. Can evolve!' : '';
    return `${name} (${form ? form.what : info.what})${fused}, ${what[status.state]}${evolve}`;
}

function badge(name, className) {
    const span = document.createElement('span');
    span.className = className;
    span.append(icon(name));
    return span;
}
