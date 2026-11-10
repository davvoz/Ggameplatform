/** Calls to the Hexforge backend (same origin as the game; the session cookie rides along). */

const BASE = '/api/hexforge';

/** The player is not signed in to the platform. */
export class SignInRequired extends Error {}

/** The server refused an action; `code` is its reason (e.g. 'occupied'). */
export class Refused extends Error {
    constructor(code) {
        super(code);
        this.code = code;
    }
}

async function request(path, options) {
    const response = await fetch(`${BASE}${path}`, { credentials: 'same-origin', ...options });
    if (response.status === 401) throw new SignInRequired('sign in required');
    if (response.status === 400 || response.status === 409) {
        const body = await response.json().catch(() => ({}));
        throw new Refused(typeof body.detail === 'string' ? body.detail : 'refused');
    }
    if (!response.ok) throw new Error(`Hexforge server answered ${response.status}`);
    return response.json();
}

function post(path, body) {
    return request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export function fetchDemoCity() {
    return request('/city/demo');
}

export function runBattle(setup) {
    return post('/battle', setup);
}

export function fetchMyState() {
    return request('/me');
}

export function collect(buildingIds) {
    return post('/me/collect', buildingIds ? { building_ids: buildingIds } : {});
}

export function moveBuilding(id, x, y) {
    return post(`/me/buildings/${id}/move`, { x, y });
}

export function startForging(recipe) {
    return post('/me/forge', { recipe });
}

export function claimJob(jobId) {
    return post(`/me/forge/${jobId}/claim`, {});
}

export function placeBuilding(type, x, y) {
    return post('/me/place', { type, x, y });
}

export function dismantleBuilding(id) {
    return post(`/me/buildings/${id}/dismantle`, {});
}

export function fetchOutposts() {
    return request('/me/outposts');
}

export function attackOutpost(outpostId, setup) {
    return post(`/me/outposts/${outpostId}/attack`, setup);
}

export function setAim(id, aim) {
    return post(`/me/buildings/${id}/aim`, { aim });
}

export function testDefense() {
    return post('/me/defense/test', {});
}

export function findRival() {
    return post('/me/rivals/find', {});
}

export function attackRival(setup) {
    return post('/me/rivals/attack', setup);
}

export function fetchLeaderboard() {
    return request('/me/leaderboard');
}

export function fetchDefenseLog() {
    return request('/me/defenses');
}

export function markDefensesSeen() {
    return post('/me/defenses/seen', {});
}

export function fetchRaidReplay(raidId) {
    return request(`/me/defenses/${raidId}/replay`);
}

export function revengeRaid(raidId) {
    return post(`/me/defenses/${raidId}/revenge`, {});
}
