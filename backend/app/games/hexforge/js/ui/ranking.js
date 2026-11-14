import { SignInRequired, fetchLeaderboard } from '../net/api.js';
import { LEAGUE_COLORS, progressText, rankText } from '../core/leagues.js';
import { openSheet } from './sheets.js';

/** The ranking sheet: your trophies and league, and the best players. */

const $ = (id) => document.getElementById(id);

export class RankingPanel {
    async open() {
        openSheet('sheet-ranking');
        try {
            const board = await fetchLeaderboard();
            renderMe(board.me);
            renderTop(board.top);
            $('ranking-signin').hidden = true;
            $('ranking-body').hidden = false;
        } catch (error) {
            if (!(error instanceof SignInRequired)) throw error;
            $('ranking-signin').hidden = false;
            $('ranking-body').hidden = true;
        }
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
