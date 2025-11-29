/**
 * Game Status Integration Example for Frontend
 * 
 * This file demonstrates how to integrate game statuses in the frontend
 */

// ========== API CALLS ==========

/**
 * Fetch all game statuses
 */
async function fetchGameStatuses(activeOnly = false) {
    try {
        const url = activeOnly 
            ? '/game-statuses/?active_only=true' 
            : '/game-statuses/';
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch statuses');
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching game statuses:', error);
        return [];
    }
}

/**
 * Fetch games with their status information
 */
async function fetchGamesWithStatus() {
    try {
        const response = await fetch('/games/list');
        if (!response.ok) throw new Error('Failed to fetch games');
        
        const data = await response.json();
        return data.games; // Each game includes status object
    } catch (error) {
        console.error('Error fetching games:', error);
        return [];
    }
}

/**
 * Update game status
 */
async function updateGameStatus(gameId, statusId) {
    try {
        const response = await fetch(`/games/${gameId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ statusId })
        });
        
        if (!response.ok) throw new Error('Failed to update game status');
        
        return await response.json();
    } catch (error) {
        console.error('Error updating game status:', error);
        throw error;
    }
}

// ========== UI RENDERING ==========

/**
 * Create a status badge element
 */
function createStatusBadge(status) {
    if (!status) return null;
    
    const badge = document.createElement('span');
    badge.className = `status-badge status-${status.status_code}`;
    badge.textContent = status.status_name;
    badge.title = status.description;
    
    return badge;
}

/**
 * Get CSS class for status badge
 */
function getStatusBadgeClass(statusCode) {
    const classes = {
        'developed': 'badge-success',
        'in_development': 'badge-warning',
        'deprecated': 'badge-danger',
        'experimental': 'badge-info'
    };
    
    return classes[statusCode] || 'badge-secondary';
}

/**
 * Get icon for status
 */
function getStatusIcon(statusCode) {
    const icons = {
        'developed': '✅',
        'in_development': '🚧',
        'deprecated': '⚠️',
        'experimental': '🧪'
    };
    
    return icons[statusCode] || '📋';
}

/**
 * Render game card with status
 */
function renderGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    
    let statusHTML = '';
    if (game.status) {
        const icon = getStatusIcon(game.status.status_code);
        const badgeClass = getStatusBadgeClass(game.status.status_code);
        
        statusHTML = `
            <div class="game-status">
                <span class="status-icon">${icon}</span>
                <span class="badge ${badgeClass}">${game.status.status_name}</span>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="game-thumbnail">
            <img src="${game.thumbnail || '/static/default-thumbnail.png'}" 
                 alt="${game.title}">
            ${statusHTML}
        </div>
        <div class="game-info">
            <h3>${game.title}</h3>
            <p>${game.description}</p>
            <div class="game-meta">
                <span class="category">${game.category}</span>
                <span class="author">${game.author}</span>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * Render status filter dropdown
 */
async function renderStatusFilter(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const statuses = await fetchGameStatuses(true); // Only active statuses
    
    const select = document.createElement('select');
    select.id = 'status-filter';
    select.className = 'form-control';
    
    // Add "All" option
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'Tutti gli stati';
    select.appendChild(allOption);
    
    // Add status options
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status.status_code;
        option.textContent = `${getStatusIcon(status.status_code)} ${status.status_name}`;
        select.appendChild(option);
    });
    
    container.appendChild(select);
    
    // Add event listener for filtering
    select.addEventListener('change', filterGamesByStatus);
}

/**
 * Filter games by status
 */
function filterGamesByStatus(event) {
    const selectedStatus = event.target.value;
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        if (!selectedStatus) {
            card.style.display = 'block';
            return;
        }
        
        const statusBadge = card.querySelector('.status-badge');
        if (!statusBadge) {
            card.style.display = 'none';
            return;
        }
        
        const cardStatus = statusBadge.className.match(/status-(\w+)/)?.[1];
        card.style.display = cardStatus === selectedStatus ? 'block' : 'none';
    });
}

// ========== ADMIN PANEL ==========

/**
 * Render status management panel (Admin only)
 */
async function renderStatusManagementPanel(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const statuses = await fetchGameStatuses();
    
    const panel = document.createElement('div');
    panel.className = 'status-management-panel';
    
    panel.innerHTML = `
        <h2>Gestione Stati Giochi</h2>
        <button class="btn btn-primary" onclick="showCreateStatusModal()">
            ➕ Nuovo Stato
        </button>
        <div class="status-list"></div>
    `;
    
    const statusList = panel.querySelector('.status-list');
    
    statuses.forEach(status => {
        const statusItem = document.createElement('div');
        statusItem.className = 'status-item';
        statusItem.innerHTML = `
            <div class="status-info">
                <span class="status-icon">${getStatusIcon(status.status_code)}</span>
                <span class="status-name">${status.status_name}</span>
                <code>${status.status_code}</code>
                <span class="badge ${status.is_active ? 'badge-success' : 'badge-secondary'}">
                    ${status.is_active ? 'Attivo' : 'Inattivo'}
                </span>
            </div>
            <div class="status-actions">
                <button onclick="editStatus(${status.status_id})" class="btn btn-sm btn-warning">
                    ✏️ Modifica
                </button>
                <button onclick="deleteStatus(${status.status_id})" class="btn btn-sm btn-danger">
                    🗑️ Elimina
                </button>
            </div>
        `;
        
        statusList.appendChild(statusItem);
    });
    
    container.appendChild(panel);
}

/**
 * Create new game status (Admin)
 */
async function createGameStatus(statusData) {
    try {
        const response = await fetch('/game-statuses/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(statusData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail);
        }
        
        const result = await response.json();
        console.log('Status created:', result);
        
        return result.data;
    } catch (error) {
        console.error('Error creating status:', error);
        alert(`Errore nella creazione dello stato: ${error.message}`);
        throw error;
    }
}

/**
 * Delete game status (Admin)
 */
async function deleteStatus(statusId) {
    if (!confirm('Sei sicuro di voler eliminare questo stato?')) {
        return;
    }
    
    try {
        const response = await fetch(`/game-statuses/${statusId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail);
        }
        
        alert('Stato eliminato con successo');
        location.reload(); // Refresh page
    } catch (error) {
        console.error('Error deleting status:', error);
        alert(`Errore nell'eliminazione: ${error.message}`);
    }
}

// ========== CSS STYLES ==========

const statusStyles = `
<style>
.status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 600;
    text-transform: uppercase;
}

.status-developed {
    background-color: #28a745;
    color: white;
}

.status-in_development {
    background-color: #ffc107;
    color: #212529;
}

.status-deprecated {
    background-color: #dc3545;
    color: white;
}

.status-experimental {
    background-color: #17a2b8;
    color: white;
}

.game-card {
    position: relative;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.2s;
}

.game-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.game-status {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.status-icon {
    font-size: 1.2em;
}

.status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    margin-bottom: 8px;
}

.status-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.status-actions {
    display: flex;
    gap: 8px;
}
</style>
`;

// ========== INITIALIZATION ==========

/**
 * Initialize game status features
 */
async function initGameStatusFeatures() {
    // Inject styles
    const styleElement = document.createElement('div');
    styleElement.innerHTML = statusStyles;
    document.head.appendChild(styleElement.firstElementChild);
    
    // Render status filter if container exists
    if (document.getElementById('status-filter-container')) {
        await renderStatusFilter('status-filter-container');
    }
    
    // Render admin panel if container exists
    if (document.getElementById('status-management-container')) {
        await renderStatusManagementPanel('status-management-container');
    }
    
    console.log('✅ Game status features initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameStatusFeatures);
} else {
    initGameStatusFeatures();
}

// Export for use in other modules
export {
    fetchGameStatuses,
    fetchGamesWithStatus,
    updateGameStatus,
    createStatusBadge,
    getStatusBadgeClass,
    getStatusIcon,
    renderGameCard,
    renderStatusFilter,
    createGameStatus
};
