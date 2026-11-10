import { SignInRequired, fetchLeaderboard, fetchMyState } from './api.js';
import { LEAGUE_COLORS, progressText, rankText } from './leagues.js';

/** "Ranking": your trophies and league, and the best players. Your city stays in the background. */

const $ = (id) => document.getElementById(id);
const EMPTY_CITY = { grid: 18, buildings: [] };

export class RankingMode {
    constructor(renderer) {
        this.renderer = renderer;
    }

    async enter() {
        $('view-ranking').hidden = false;
        try {
            const [board, state] = await Promise.all([fetchLeaderboard(), fetchMyState()]);
            this.renderer.setCity(state.city);
            renderMe(board.me);
            renderTop(board.top);
            $('ranking-signin').hidden = true;
            $('ranking-body').hidden = false;
        } catch (error) {
            if (!(error instanceof SignInRequired)) throw error;
            this.renderer.setCity(EMPTY_CITY);
            $('ranking-signin').hidden = false;
            $('ranking-body').hidden = true;
        }
    }

    leave() {
        $('view-ranking').hidden = true;
    }

    frame(time) {
        this.renderer.draw(null, { time, showTraps: true });
    }
}

function renderMe(me) {
    const box = $('ranking-me');
    box.replaceChildren();
    box.style.setProperty('--accent', LEAGUE_COLORS[me.league]);
    const trophies = document.createElement('p');
    trophies.className = 'ranking-trophies';
    trophies.textContent = `${me.trophies} trophies`;
    const league = document.createElement('p');
    league.className = 'ranking-league';
    league.textContent = `${me.league} league · ${rankText(me)}`;
    const next = document.createElement('p');
    next.className = 'hint';
    next.textContent = progressText(me);
    box.append(trophies, league, next);
}

function renderTop(top) {
    const list = $('ranking-list');
    list.replaceChildren();
    $('ranking-empty').hidden = top.length > 0;
    for (const row of top) {
        const item = document.createElement('li');
        item.className = row.me ? 'me' : '';
        item.style.setProperty('--accent', LEAGUE_COLORS[row.league]);
        const rank = document.createElement('span');
        rank.className = 'rank';
        rank.textContent = `#${row.rank}`;
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = row.me ? `${row.name} (you)` : row.name;
        const score = document.createElement('span');
        score.className = 'score';
        score.textContent = String(row.trophies);
        score.title = `${row.league} league`;
        item.append(rank, name, score);
        list.append(item);
    }
}
