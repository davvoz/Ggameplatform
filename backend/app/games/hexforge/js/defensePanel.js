import { HERO_INFO, PRIORITY_INFO, SIDE_INFO, TACTIC_INFO } from './labels.js';

/** The defence test report in the My city panel. Pure helpers first, then the DOM. */

const RATINGS = [
    [75, 'Fortress'],
    [50, 'Strong'],
    [25, 'Solid'],
    [1, 'Fragile'],
    [0, 'Wide open'],
];

export function percentHeld(report) {
    return report.total ? Math.round((100 * report.held) / report.total) : 0;
}

/** A one-word verdict for the share of raids held. */
export function ratingOf(report) {
    const percent = report.held > 0 ? Math.max(percentHeld(report), 1) : 0;
    return RATINGS.find(([from]) => percent >= from)[1];
}

/** The side that holds the fewest raids, or null when every side holds as many. */
export function weakestSide(sides) {
    const entries = Object.entries(sides);
    const counts = entries.map(([, s]) => s.held);
    if (counts.every((n) => n === counts[0])) return null;
    return entries.reduce((low, entry) => (entry[1].held < low[1].held ? entry : low))[0];
}

export function describeWorst(worst) {
    return `${worst.raid_name} from the ${SIDE_INFO[worst.side].toLowerCase()}, `
        + `going for ${PRIORITY_INFO[worst.priority].name.toLowerCase()}, ${TACTIC_INFO[worst.tactic].name.toLowerCase()}`;
}

/** What to try next, from the report. */
export function adviceFor(report) {
    if (report.held === 0) return 'Every raid breaks through. Forge towers and traps, then test again.';
    const side = weakestSide(report.sides);
    if (side) return `Your ${SIDE_INFO[side].toLowerCase()} side is the weakest: strengthen it, or move towers there.`;
    return 'Try another aim on your towers, or move them, and test again.';
}

/** "Stage 3 · Ascended ★★★" */
export function stageTitle(stage) {
    return `Stage ${stage.number} · ${stage.name}`;
}

/** What the stage result means: the next stage unlocked, or how far there is still to go. */
export function stageNote(report) {
    if (report.advanced) return `Every raid held: stage ${report.unlocked} unlocked, ${report.next.name}. The next test sends them.`;
    if (report.stage.number < report.unlocked) return `You already passed this stage: your top is stage ${report.unlocked}.`;
    const left = report.total - report.held;
    return `Hold ${left} more raid${left > 1 ? 's' : ''} to unlock stage ${report.unlocked + 1}: ${report.next.name}.`;
}

export function renderDefenseReport(container, report, onWatch, onStage = () => {}) {
    container.replaceChildren();
    const head = document.createElement('p');
    head.className = 'defense-stage';
    head.textContent = stageTitle(report.stage);

    const note = document.createElement('p');
    note.className = `stage-note${report.advanced ? ' advanced' : ''}`;
    note.textContent = stageNote(report);

    const score = document.createElement('p');
    score.className = 'defense-score';
    const rating = document.createElement('b');
    rating.textContent = ratingOf(report);
    score.append(rating, ` · holds ${report.held} of ${report.total} raids (${percentHeld(report)}%)`);

    const stats = document.createElement('dl');
    stats.className = 'stats';
    const row = (label, value) => {
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.append(value);
        stats.append(dt, dd);
    };
    row('Average destruction', `${report.avg_destruction}%`);
    row('Heroes downed per raid', String(report.heroes_downed));
    for (const raid of report.raids) row(raid.name, squadChips(raid.squad, `${raid.held}/${raid.total}`));

    const advice = document.createElement('p');
    advice.className = 'hint';
    advice.textContent = adviceFor(report);

    const worst = document.createElement('p');
    worst.className = 'hint';
    worst.textContent = `Worst raid: ${describeWorst(report.worst)} (${report.worst.summary.destruction}%).`;

    const watch = document.createElement('button');
    watch.type = 'button';
    watch.className = 'button wide-plain';
    watch.textContent = 'Watch the worst raid';
    watch.addEventListener('click', onWatch);

    container.append(head, score, note, stats, advice, worst, watch);
    if (report.unlocked > 1) container.append(stagePicker(report, onStage));
}

/** One chip per unlocked stage: tap one to run that stage again. */
function stagePicker(report, onStage) {
    const wrap = document.createElement('div');
    wrap.className = 'stage-picker';
    const label = document.createElement('small');
    label.textContent = 'Run a stage:';
    wrap.append(label);
    for (let n = 1; n <= report.unlocked; n++) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'stage-chip';
        chip.textContent = String(n);
        chip.setAttribute('aria-pressed', String(n === report.stage.number));
        chip.setAttribute('aria-label', `Run stage ${n}`);
        chip.addEventListener('click', () => onStage(n));
        wrap.append(chip);
    }
    return wrap;
}

function squadChips(squad, text) {
    const wrap = document.createElement('span');
    wrap.className = 'raid-line';
    for (const cls of squad) {
        const dot = document.createElement('span');
        dot.className = 'raid-hero';
        dot.style.setProperty('--accent', HERO_INFO[cls].color);
        dot.title = HERO_INFO[cls].name;
        dot.textContent = HERO_INFO[cls].short;
        wrap.append(dot);
    }
    wrap.append(` ${text}`);
    return wrap;
}
