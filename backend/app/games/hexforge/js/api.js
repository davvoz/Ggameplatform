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

export function claimLoginReward() {
    return post('/me/rewards/login', {});
}

export function claimTaskReward(taskId) {
    return post(`/me/rewards/tasks/${encodeURIComponent(taskId)}/claim`, {});
}

export function claimWeeklyChest() {
    return post('/me/rewards/chest', {});
}

/** `target` is { job_id }, { hero_id } or { energy: true }. */
export function useBonus(bonus, target) {
    return post('/me/bonuses/use', { bonus, ...target });
}

/** Send a hero to the forge to evolve into `form` (null when ascending). */
export function evolveHero(heroId, form) {
    return post(`/me/heroes/${heroId}/evolve`, { form });
}

/** A round at the anvil on a forge job: the state plus `hammer` {cut, bonus, rounds_left}. */
export function hammerJob(jobId, perfect, good) {
    return post(`/me/forge/${jobId}/hammer`, { perfect, good });
}

/** Buy one of the merchant's offers of the day: the state plus `bought`. */
export function buyOffer(offerId) {
    return post(`/me/merchant/${offerId}/buy`, {});
}

/** Let a hero go for a bonus: the state plus `gift`. */
export function dismissHero(heroId) {
    return post(`/me/heroes/${heroId}/dismiss`, {});
}

/** Send a building type to the forge to gain a level; `path` when it reaches level 3. */
export function upgradeBuilding(buildingId, path = null) {
    return post(`/me/buildings/${buildingId}/upgrade`, { path });
}

/** Fuse three maxed buildings or heroes ('building' | 'hero'): `base` keeps its body, `donors` (2 ids) are used up. */
export function fuse(kind, base, donors) {
    return post('/me/fuse', { kind, base, donors });
}

/** What that fusion would make, with its stats; changes nothing. */
export function fusePreview(kind, base, donors) {
    return post('/me/fuse/preview', { kind, base, donors });
}

/** Send an Explorer on a mission: 'scout', 'expedition' or 'voyage'. */
export function sendExplorer(heroId, mission) {
    return post(`/me/heroes/${heroId}/explore`, { mission });
}

/** Bring an Explorer home: the state plus `loot`. */
export function explorerReturn(heroId) {
    return post(`/me/heroes/${heroId}/return`, {});
}

/** Give a hero an item from the armoury. */
export function equipItem(heroId, itemId) {
    return post(`/me/heroes/${heroId}/equip`, { item_id: itemId });
}

/** Put an item back in the armoury. */
export function unequipItem(itemId) {
    return post(`/me/items/${itemId}/unequip`, {});
}

/** Send an item to the forge to gain a level. */
export function upgradeItem(itemId) {
    return post(`/me/items/${itemId}/upgrade`, {});
}
