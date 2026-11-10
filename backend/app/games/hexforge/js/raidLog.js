import { formatCountdown } from './forgePanel.js';
import { signed } from './leagues.js';
import { materialChips } from './rivalPanel.js';

/** "Raids on your city" in the My city panel: who attacked, what it cost, replay and revenge. */

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function timeAgo(seconds) {
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
    const days = Math.floor(seconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

/** One line on how the raid went, from the defender's side. */
export function raidOutcome(raid) {
    const result = raid.breached ? 'Breached' : 'Held';
    const core = raid.core_destroyed ? ' · core destroyed' : '';
    return `${result} · ${raid.destruction}% destroyed${core}`;
}

export function unseenText(count) {
    return `You were raided ${count} time${count > 1 ? 's' : ''} while away.`;
}

/**
 * Fill the log. `actions` = { watch(raid), revenge(raid), seen() }.
 */
export function renderRaidLog({ banner, list }, log, pvp, serverNow, actions) {
    banner.replaceChildren();
    banner.hidden = log.unseen === 0;
    if (log.unseen) {
        const text = document.createElement('span');
        text.textContent = unseenText(log.unseen);
        const ok = button('Got it', actions.seen);
        banner.append(text, ok);
    }

    list.replaceChildren();
    if (pvp?.shield_until) {
        list.append(hint(`Shield up: nobody can raid you for ${formatCountdown(pvp.shield_until - serverNow)}.`));
    }
    if (!log.raids.length) {
        list.append(hint(pvp?.arena
            ? 'No raids yet. Test your defenses to be ready.'
            : 'Nobody can raid you until you clear the first outpost.'));
        return;
    }
    for (const raid of log.raids) list.append(raidCard(raid, serverNow, actions));
}

function raidCard(raid, serverNow, actions) {
    const card = document.createElement('div');
    card.className = `raid${raid.breached ? ' breached' : ' held'}${raid.seen ? '' : ' unseen'}`;
    const head = document.createElement('p');
    head.className = 'raid-head';
    const who = document.createElement('b');
    who.textContent = raid.raider;
    const when = document.createElement('span');
    when.textContent = timeAgo(serverNow - raid.at);
    head.append(who, when);

    const outcome = document.createElement('p');
    outcome.className = 'raid-outcome';
    outcome.textContent = `${raidOutcome(raid)} · ${signed(raid.trophies)} trophies`;

    card.append(head, outcome);
    if (Object.values(raid.loot).some((n) => n > 0)) {
        const lost = document.createElement('p');
        lost.className = 'loot-line';
        const label = document.createElement('span');
        label.textContent = 'They took';
        lost.append(label, materialChips(raid.loot));
        card.append(lost);
    }
    const controls = document.createElement('div');
    controls.className = 'controls';
    controls.append(button('Watch', () => actions.watch(raid)));
    if (raid.can_revenge) controls.append(button('Revenge', () => actions.revenge(raid), 'primary'));
    card.append(controls);
    return card;
}

function button(label, onClick, kind = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `button small ${kind}`.trim();
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
}

function hint(text) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = text;
    return p;
}
