/** Calls to the Hexforge backend (same origin as the game). */

const BASE = '/api/hexforge';

async function request(path, options) {
    const response = await fetch(`${BASE}${path}`, options);
    if (!response.ok) {
        throw new Error(`Hexforge server answered ${response.status}`);
    }
    return response.json();
}

export function fetchDemoCity() {
    return request('/city/demo');
}

export function runBattle(setup) {
    return request('/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setup),
    });
}
