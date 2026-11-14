import { play } from '../../fx/audio.js';
import { forgeSlotPop, rewardPop } from '../../fx/fx.js';
import { icon } from '../../ui/icons.js';
import { LEAGUE_COLORS, MATERIAL_INFO } from '../../data/labels.js';
import { $, bump } from './shared.js';

function bumpOnce(el) {
    el.classList.remove('bump');
    el.getBoundingClientRect();       // force a layout: restarts the animation
    el.classList.add('bump');
    el.addEventListener('animationend', () => el.classList.remove('bump'), { once: true });
}

/** The player plate, the material counters, XP and level-up, and the big cards shown one after the other. */
export class CityHud {
    constructor(city) {
        this.city = city;
        this.progress = null;             // last level and XP seen, kept across reloads to spot gains
        this.pops = Promise.resolve();    // big cards (forged, level up) wait for each other
    }

    renderPlayer() {
        const { pvp, progress } = this.city.state;
        const color = LEAGUE_COLORS[pvp.league] ?? '#c3cbdb';
        $('player-plate').style.setProperty('--league', color);
        $('league-badge').style.setProperty('--league', color);
        $('player-name').textContent = this.city.name || 'You';
        $('player-trophies').textContent = `${pvp.trophies} trophies · ${pvp.league}`;
        if (!progress) return;
        $('player-level').textContent = String(progress.level);
        $('xp-bar').style.width = `${Math.round((100 * progress.into_level) / progress.for_next)}%`;
        $('xp-text').textContent = `${progress.into_level} / ${progress.for_next} XP`;
        $('player-plate').setAttribute('aria-label',
            `Level ${progress.level}, ${progress.into_level} of ${progress.for_next} XP to the next. Open the ranking`);
    }

    // ── level and XP ───────────────────────────────────────────────────
    /** Compare with the last progress seen: "+XP" for a gain, a card for a new level. */
    noticeProgress(progress) {
        const before = this.progress;
        if (!progress) return;
        this.progress = progress;
        if (!before) return;
        if (progress.xp > before.xp) this.#xpPop(progress.xp - before.xp);
        if (progress.level > before.level) void this.queuePop(() => this.#levelPop(progress));
        // every fifth level the forge opens a slot: its own scene, after the level card
        if ((progress.forge_slots ?? 0) > (before.forge_slots ?? progress.forge_slots ?? 0)) {
            const slots = progress.forge_slots;
            void this.queuePop(() => forgeSlotPop(slots, { onSlam: () => play('slam') }));
        }
    }

    /** Big cards one after the other, never on top of each other. */
    queuePop(show) {
        const next = this.pops.then(show, show);
        this.pops = next.catch(() => {});
        return next;
    }

    #xpPop(amount) {
        const pop = document.createElement('span');
        pop.className = 'xp-pop';
        pop.textContent = `+${amount} XP`;
        pop.addEventListener('animationend', () => pop.remove());
        $('hud-city').append(pop);
    }

    #levelPop(progress) {
        play('levelup');
        bumpOnce($('league-badge'));
        const shield = document.createElement('div');
        shield.className = 'level-shield';
        shield.append(Object.assign(document.createElement('small'), { textContent: 'LEVEL' }),
            Object.assign(document.createElement('strong'), { textContent: String(progress.level) }));
        const perks = document.createElement('div');
        perks.className = 'level-perks';
        const perk = (iconName, text, color) => {
            const chip = document.createElement('span');
            if (color) chip.style.setProperty('--accent', color);
            chip.append(icon(iconName), text);
            perks.append(chip);
        };
        perk('hero', `+1 hero slot · ${progress.hero_slots}`);
        if (progress.unlocked_forge_slots) perk('anvil', `Forge slot ${progress.unlocked_forge_slots}`);
        for (const [m, amount] of Object.entries(progress.gift ?? {})) {
            perk(MATERIAL_INFO[m].icon, `+${amount}`, MATERIAL_INFO[m].color);
        }
        return rewardPop({ picture: shield, title: 'Level up!', extra: perks, line: 'Gifts added to your city', ms: 3600 });
    }

    renderResources() {
        const bar = $('resources');
        const fresh = bar.childElementCount === 0;
        if (fresh) {
            for (const [key, info] of Object.entries(MATERIAL_INFO)) {
                const item = document.createElement('span');
                item.className = 'resource';
                item.dataset.material = key;
                item.style.setProperty('--accent', info.color);
                item.title = info.name;
                item.append(icon(info.icon), document.createElement('b'));
                bar.append(item);
            }
        }
        for (const item of bar.children) {
            const key = item.dataset.material;
            const value = this.city.state.materials[key] ?? 0;
            if (this.city.heldMaterials.has(key)) continue;   // gems on their way: the counter waits for them
            item.querySelector('b').textContent = String(value);
            if (!fresh && value > (this.city.shownMaterials[key] ?? value)) bump(item);
            this.city.shownMaterials[key] = value;
        }
    }
}
