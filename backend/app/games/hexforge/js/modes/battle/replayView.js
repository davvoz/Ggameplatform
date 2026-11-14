import { attackEnded } from '../../net/platform.js';
import { paintBattleCard } from '../../render/shareCard.js';
import { play, playBattleEvent } from '../../fx/audio.js';
import { icon } from '../../ui/icons.js';
import { regionAround } from '../../core/iso.js';
import { FORM_INFO, HERO_INFO, MATERIAL_INFO, signed } from '../../data/labels.js';
import { createReplay } from '../../core/replay.js';
import { toast } from '../../ui/sheets.js';
import { heroThumb, thumbImg } from '../../render/thumbs.js';
import { $, TAIL_SECONDS } from './shared.js';

const BATTLE_INSETS = { top: 70, right: 0, bottom: 110, left: 0 };

function resultNote(battle, unlocked) {
    if (battle.defense) return battle.note;
    if (battle.rival) return battle.summary.victory ? `You raided ${battle.rival}!` : `${battle.rival}'s core still stands`;
    if (battle.rewards?.new_world) return `World ${battle.rewards.new_world - 1} conquered!`;
    if (unlocked) return 'Outpost cleared!';
    return battle.summary.victory ? 'The core has fallen' : 'The core still stands: bring it down to win';
}

function verdictText(defense, won) {
    if (defense) return won ? 'Defense held' : 'Breached';
    return won ? 'Victory' : 'Defeat';
}

function chipName(hero) {
    return (hero.tier ?? 1) > 1 ? FORM_INFO[hero.form].name : HERO_INFO[hero.cls].name;
}

/** The report chip's tooltip: what the hero dealt and took, whether it fell, the XP it earned. */
function chipTitle(hero, gain) {
    let title = `${chipName(hero)}: dealt ${hero.dealt}, took ${hero.taken}`;
    if (!hero.survived) title += ', down';
    if (gain) {
        title += `, +${gain.xp} XP`;
        if (gain.ready) title += ', can evolve';
    }
    return title;
}

/** A hero of the fight (`{cls, form, tier}`): portrait, health bar, a caption, and the XP it earned. */
function heroChip(hero, caption = null, gain = null) {
    const info = HERO_INFO[hero.cls];
    const chip = document.createElement('div');
    chip.className = 'hero-chip';
    chip.style.setProperty('--accent', info.color);
    chip.title = chipName(hero);
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('div');
    fill.style.width = '100%';
    bar.append(fill);
    chip.append(thumbImg(heroThumb(hero.cls, 46, hero.form ?? null, hero.tier ?? 1), '', chipName(hero)), bar);
    if (caption) {
        const text = document.createElement('span');
        text.className = 'chip-caption';
        text.textContent = caption;
        chip.append(text);
    }
    if (gain) {
        const xp = document.createElement('small');
        xp.className = `chip-xp${gain.ready ? ' ready' : ''}`;
        xp.textContent = gain.ready ? `+${gain.xp} XP · evolve!` : `+${gain.xp} XP`;
        chip.append(xp);
    }
    return chip;
}

/** The result's badges: the core, what was unlocked, trophies, XP, a new level, hurt heroes. */
function renderBadges(badges, s, rewards, defense, next) {
    badges.replaceChildren();
    const badge = (text, kind, iconName) => {
        const span = document.createElement('span');
        span.className = kind;
        if (iconName) span.append(icon(iconName));
        span.append(text);
        badges.append(span);
    };
    badge(s.core_destroyed ? 'Core destroyed' : 'Core standing', s.core_destroyed === !defense ? 'good' : 'bad', s.core_destroyed ? 'flame' : 'shield');
    if (rewards?.new_world) badge(`World ${rewards.new_world} unlocked`, 'good', 'lock');
    else if (next) badge(`${next.name} unlocked`, 'good', 'lock');
    if (rewards?.trophies !== undefined) badge(`${signed(rewards.trophies)} trophies`, rewards.trophies >= 0 ? 'good' : 'bad', 'trophy');
    if (rewards?.xp) badge(`+${rewards.xp} XP`, 'good', 'star');
    if (rewards?.levels?.length) badge(`Level ${rewards.levels.at(-1).level}!`, 'good', 'star');
    const evolvable = (rewards?.hero_xp ?? []).filter((g) => g.ready).length;
    if (evolvable) badge(`${evolvable} hero${evolvable > 1 ? 'es' : ''} can evolve: Forge, Heroes`, 'good', 'arrow');
    if (rewards?.injured.length) badge(`${rewards.injured.length} hurt · back in 15 min`, 'bad', 'hero');
}

/** The battle replay (play, pause, speed, skip) with its HUD, then the result screen and the report to the platform. */
export class ReplayView {
    constructor(mode) {
        this.mode = mode;
        this.replay = null;
        this.playTick = 0;
        this.soundTick = 0;           // the last tick whose sounds have been played
        this.speed = 0;
        this.paused = false;
        this.ending = null;           // an attack the platform has not heard the end of yet
    }

    /** Play what happened since the last frame, in the order it happened. */
    sounds() {
        const from = this.soundTick;
        const to = Math.min(this.playTick, this.replay.duration);
        this.soundTick = to;
        if (to - from > 25) return;   // a jump (skip, or the tab was asleep): stay quiet
        for (const e of this.replay.events) {
            if (e.t > to) break;
            if (e.t <= from) continue;
            playBattleEvent(e, this.replay.squad[e.hero]?.cls);
        }
    }

    startReplay() {
        toast('');
        this.replay = createReplay(this.mode.battle);
        this.playTick = 0;
        this.soundTick = 0;
        this.paused = false;
        this.renderPause();
        const city = this.mode.battle.city;
        this.mode.renderer.setCity(city);
        this.mode.renderer.focus(regionAround(city.buildings, city.grid, 2.5, 10), BATTLE_INSETS);
        $('battle-title').textContent = this.mode.battle.defense ? 'Raiders' : 'Your squad';
        this.#buildHeroList();
        this.mode.show('battle');
    }

    renderPause() {
        const button = $('btn-pause');
        button.replaceChildren(icon(this.paused ? 'play' : 'pause'));
        button.setAttribute('aria-label', this.paused ? 'Play' : 'Pause');
    }

    #buildHeroList() {
        const list = $('hero-list');
        list.replaceChildren();
        for (const hero of this.mode.battle.squad) list.append(heroChip(hero));
    }

    updateHeroList(state) {
        const chips = $('hero-list').children;
        state.heroes.forEach((hero, i) => {
            const chip = chips[i];
            if (!chip) return;
            chip.classList.toggle('down', !hero.alive);
            chip.querySelector('.bar div').style.width = `${(100 * hero.hp) / hero.maxHp}%`;
        });
    }

    updateHud(state) {
        const seconds = Math.floor(state.seconds);
        $('hud-time').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        $('hud-destruction').textContent = `${state.destruction}%`;
        $('hud-bar').style.width = `${state.destruction}%`;
        const core = $('hud-core');
        core.textContent = state.coreDestroyed ? 'Core destroyed' : 'Core standing';
        core.classList.toggle('down', state.coreDestroyed);
    }

    showResult() {
        this.playTick = this.replay.duration + TAIL_SECONDS * this.replay.tickRate;
        const s = this.mode.battle.summary;
        const rewards = this.mode.battle.rewards;
        const defense = Boolean(this.mode.battle.defense);
        const won = defense ? !s.victory : s.victory;
        $('result').className = `result ${won ? 'win' : 'loss'}`;
        play(won ? 'victory' : 'defeat');
        $('verdict').textContent = verdictText(defense, won);
        const next = rewards?.unlocked && this.mode.data?.outposts.find((o) => o.id === rewards.unlocked);
        $('result-note').textContent = resultNote(this.mode.battle, next);
        $('result-ring').style.setProperty('--done', `${s.destruction}%`);
        $('result-percent').textContent = `${s.destruction}%`;

        renderBadges($('result-badges'), s, rewards, defense, next);

        const loot = $('result-loot');
        loot.replaceChildren();
        let delay = 0;
        for (const [m, amount] of Object.entries(rewards?.loot ?? {})) {
            if (!amount) continue;
            const info = MATERIAL_INFO[m];
            const tile = document.createElement('div');
            tile.className = 'loot-tile';
            tile.style.setProperty('--accent', info.color);
            tile.style.animationDelay = `${0.3 + delay}s`;
            tile.title = info.name;
            tile.append(icon(info.icon), `+${amount}`);
            loot.append(tile);
            delay += 0.12;
        }

        const report = $('report');
        report.replaceChildren();
        s.heroes.forEach((hero, i) => {
            const gain = rewards?.hero_xp?.[i];
            const chip = heroChip(hero, `${hero.dealt} dmg`, gain);
            chip.classList.toggle('down', !hero.survived);
            chip.title = chipTitle(hero, gain);
            report.append(chip);
        });
        let onward = 'Continue';
        if (defense) onward = 'Back to my city';
        else if (loot.childElementCount > 0) onward = 'Collect';
        $('btn-new').firstElementChild.textContent = onward;
        this.mode.show('result');
        void this.reportToPlatform();
    }

    /** Once per attack, at its report: the session ends, with a picture of the battle for a ping. */
    async reportToPlatform() {
        const ending = this.ending;
        if (!ending) return;
        this.ending = null;
        const s = this.mode.battle.summary;
        let image = null;
        try {
            image = await paintBattleCard({
                view: $('view'), won: s.victory, coreDown: s.core_destroyed, destruction: s.destruction,
                opponent: ending.opponent, pvp: ending.pvp, loot: this.mode.battle.rewards?.loot ?? {},
                trophies: this.mode.battle.rewards?.trophies ?? null,
                heroes: s.heroes.map((h, i) => ({ ...h, fusion: this.mode.battle.squad?.[i]?.fusion, grade: this.mode.battle.squad?.[i]?.grade })),
            });
        } catch (error) {
            console.error('[Hexforge] battle picture failed', error);
        }
        attackEnded(s, ending, image);
    }
}
