let allGames = [];

async function loadGames() {
    try {
        const response = await fetch('/admin/db-stats');
        const data = await response.json();
        allGames = data.games;
        updateStats(data);
        displayGames(allGames);
    } catch (error) {
        console.error('Error loading games:', error);
        alert('Errore nel caricamento dei dati');
    }
}

function updateStats(data) {
    document.getElementById('totalGames').textContent = data.total_games;
    document.getElementById('totalCategories').textContent = data.total_categories;
    document.getElementById('totalAuthors').textContent = data.total_authors;
    document.getElementById('dbSize').textContent = data.total_games;
}

function displayGames(games) {
    const loading = document.getElementById('loading');
    const table = document.getElementById('gamesTable');
    const empty = document.getElementById('emptyState');
    const tbody = document.getElementById('tableBody');
    
    loading.style.display = 'none';
    
    if (games.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    empty.style.display = 'none';
    
    tbody.innerHTML = games.map(game => `
        <tr>
            <td>
                ${game.thumbnail ? 
                    `<img src="${game.thumbnail}" class="thumbnail" alt="${game.title}">` :
                    `<div class="thumbnail" style="background: #dee2e6; display: flex; align-items: center; justify-content: center; color: #6c757d; font-size: 1.2em;">—</div>`
                }
            </td>
            <td><span class="badge">${game.game_id}</span></td>
            <td><strong>${game.title}</strong></td>
            <td>${game.author || '—'}</td>
            <td>${game.version}</td>
            <td><span class="tag">${game.category}</span></td>
            <td>
                <div class="tags">
                    ${game.tags.length > 0 ? game.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '—'}
                </div>
            </td>
            <td>${formatDate(game.created_at)}</td>
            <td>
                <div class="actions">
                    <button class="btn-small btn-view" onclick="viewDetails('${game.game_id}')">Visualizza</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }) + ' ' + date.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function viewDetails(gameId) {
    const game = allGames.find(g => g.game_id === gameId);
    if (!game) return;
    
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-label">ID Gioco</div>
            <div class="detail-value"><code>${game.game_id}</code></div>
            
            <div class="detail-label">Titolo</div>
            <div class="detail-value"><strong>${game.title}</strong></div>
            
            <div class="detail-label">Descrizione</div>
            <div class="detail-value">${game.description || '—'}</div>
            
            <div class="detail-label">Autore</div>
            <div class="detail-value">${game.author || '—'}</div>
            
            <div class="detail-label">Versione</div>
            <div class="detail-value">${game.version}</div>
            
            <div class="detail-label">Entry Point</div>
            <div class="detail-value"><code>${game.entry_point}</code></div>
            
            <div class="detail-label">Categoria</div>
            <div class="detail-value">${game.category}</div>
            
            <div class="detail-label">Tags</div>
            <div class="detail-value">${game.tags.length > 0 ? game.tags.join(', ') : '—'}</div>
            
            <div class="detail-label">Data Creazione</div>
            <div class="detail-value">${new Date(game.created_at).toLocaleString('it-IT')}</div>
            
            <div class="detail-label">Ultimo Aggiornamento</div>
            <div class="detail-value">${new Date(game.updated_at).toLocaleString('it-IT')}</div>
            
            <div class="detail-label">Thumbnail</div>
            <div class="detail-value">${game.thumbnail ? `<img src="${game.thumbnail}" style="max-width: 200px; border-radius: 4px; border: 1px solid #e1e4e8;">` : '—'}</div>
            
            <div class="detail-label">Metadata</div>
            <div class="detail-value">
                <div class="json-view">${JSON.stringify(game.metadata, null, 2)}</div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

function refreshData() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('gamesTable').style.display = 'none';
    loadGames();
}

function exportData() {
    const dataStr = JSON.stringify(allGames, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `games_export_${new Date().toISOString()}.json`;
    link.click();
}

function exportCSV() {
    const headers = ['game_id', 'title', 'author', 'version', 'category', 'entry_point', 'created_at'];
    const csv = [
        headers.join(','),
        ...allGames.map(game => 
            headers.map(h => JSON.stringify(game[h] || '')).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `games_export_${new Date().toISOString()}.csv`;
    link.click();
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allGames.filter(game => 
        game.title.toLowerCase().includes(searchTerm) ||
        game.game_id.toLowerCase().includes(searchTerm) ||
        game.author.toLowerCase().includes(searchTerm) ||
        game.category.toLowerCase().includes(searchTerm)
    );
    displayGames(filtered);
});

// Close modal on click outside
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Load data on page load
loadGames();
