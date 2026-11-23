/**
 * Renders a card for an external Steem game.
 * Reuses the standard game card template so the look matches the platform games,
 * but clicking opens the game's own website in a new tab.
 */

const FALLBACK_THUMBNAIL = './icons/steem.png';

function openExternalGame(url) {
    globalThis.open(url, '_blank', 'noopener,noreferrer');
}

function addExternalBadge(card) {
    const badgesContainer = card.querySelector('.game-badges');
    if (!badgesContainer) return;
    const badge = document.createElement('span');
    badge.className = 'external-game-badge';
    badge.title = 'Opens the developer website';
    badge.textContent = 'External ↗';
    badgesContainer.appendChild(badge);
}

function addTags(card, tags) {
    const tagsContainer = card.querySelector('.game-tags');
    if (!tagsContainer || !Array.isArray(tags)) return;
    tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
    });
}

function setInfo(card, game) {
    card.querySelector('.game-title').textContent = game.title;
    card.querySelector('.game-description').textContent = game.description || '';
    card.querySelector('.game-author').textContent = game.author ? `By ${game.author}` : '';
    card.querySelector('.game-category').textContent = game.category || 'Steem';
}

/**
 * Create a card element for an external Steem game.
 * @param {Object} game - entry from steemGames.js
 * @returns {DocumentFragment}
 */
export function createSteemGameCard(game) {
    const template = document.getElementById('game-card-template');
    const card = template.content.cloneNode(true);

    const cardElement = card.querySelector('.game-card');
    cardElement.dataset.gameId = game.id;
    cardElement.classList.add('steem-game-card');

    const img = card.querySelector('.game-thumbnail img');
    img.src = game.thumbnail || FALLBACK_THUMBNAIL;
    img.alt = game.title;

    const playBtn = card.querySelector('.play-btn');
    playBtn.textContent = 'Visit Site ↗';

    addExternalBadge(card);
    setInfo(card, game);
    addTags(card, game.tags);

    cardElement.addEventListener('click', () => openExternalGame(game.url));
    playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openExternalGame(game.url);
    });

    return card;
}
