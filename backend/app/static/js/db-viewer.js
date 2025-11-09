const API_BASE = '/admin';
let allData = {};
let currentTab = 'games';

// Load data on page load
window.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    
    try {
        const response = await fetch(`${API_BASE}/db-stats`);
        if (!response.ok) throw new Error('Failed to fetch data');
        
        allData = await response.json();
        
        // Update stats
        document.getElementById('totalGames').textContent = allData.total_games || 0;
        document.getElementById('totalUsers').textContent = allData.total_users || 0;
        document.getElementById('totalSessions').textContent = allData.total_sessions || 0;
        document.getElementById('totalAchievements').textContent = allData.total_achievements || 0;
        document.getElementById('totalLeaderboard').textContent = allData.total_leaderboard_entries || 0;
        
        // Check for open sessions and update button visibility
        await updateOpenSessionsButton();
        
        // Display current tab data
        displayCurrentTab();
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Errore nel caricamento dei dati: ' + error.message);
    } finally {
        loading.style.display = 'none';
    }
}

async function updateOpenSessionsButton() {
    try {
        const response = await fetch(`${API_BASE}/sessions/open`);
        const data = await response.json();
        
        const openSessionsBtn = document.getElementById('openSessionsBtn');
        if (!openSessionsBtn) return;
        
        if (data.success && data.total_open > 0) {
            openSessionsBtn.style.display = 'inline-block';
            openSessionsBtn.innerHTML = `⚠️ Sessioni Aperte (${data.total_open})`;
        } else {
            openSessionsBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking open sessions:', error);
    }
}

function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}Container`).classList.add('active');
    
    // Display data
    displayCurrentTab();
}

function displayCurrentTab() {
    switch(currentTab) {
        case 'games':
            displayGames();
            break;
        case 'users':
            displayUsers();
            break;
        case 'sessions':
            displaySessions();
            break;
        case 'achievements':
            displayAchievements();
            break;
        case 'leaderboard':
            displayLeaderboard();
            break;
    }
}

function displayGames() {
    const table = document.getElementById('gamesTable');
    const tbody = document.getElementById('gamesTableBody');
    const emptyState = document.getElementById('emptyState');
    
    const games = allData.games || [];
    
    if (games.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    table.style.display = 'table';
    tbody.innerHTML = '';
    
    games.forEach(game => {
        const row = tbody.insertRow();
        
        // Thumbnail
        const thumbCell = row.insertCell();
        const thumb = document.createElement('img');
        thumb.src = game.thumbnail || 'https://via.placeholder.com/60';
        thumb.style.width = '60px';
        thumb.style.height = '45px';
        thumb.style.objectFit = 'cover';
        thumb.style.borderRadius = '4px';
        thumbCell.appendChild(thumb);
        
        // Data cells
        row.insertCell().textContent = game.game_id;
        row.insertCell().textContent = game.title;
        row.insertCell().textContent = game.author || '-';
        row.insertCell().textContent = game.version || '1.0.0';
        row.insertCell().textContent = game.category || '-';
        row.insertCell().textContent = game.metadata?.playCount || 0;
        row.insertCell().textContent = formatDate(game.created_at);
        
        // Actions
        const actionsCell = row.insertCell();
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Dettagli';
        viewBtn.style.fontSize = '0.85em';
        viewBtn.style.padding = '6px 12px';
        viewBtn.onclick = () => showDetails('Game', game);
        actionsCell.appendChild(viewBtn);
    });
}

function displayUsers() {
    const table = document.getElementById('usersTable');
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyState');
    
    const users = allData.users || [];
    
    if (users.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    table.style.display = 'table';
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = tbody.insertRow();
        
        row.insertCell().textContent = user.user_id;
        row.insertCell().textContent = user.username || '-';
        row.insertCell().textContent = user.email || '-';
        row.insertCell().textContent = user.steem_username || '-';
        row.insertCell().textContent = user.is_anonymous ? 'Anonimo' : 'Registrato';
        row.insertCell().textContent = (user.total_cur8_earned || 0).toFixed(2);
        row.insertCell().textContent = (user.cur8_multiplier || 1.0).toFixed(1) + 'x';
        row.insertCell().textContent = formatDate(user.created_at);
        
        // Actions
        const actionsCell = row.insertCell();
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Dettagli';
        viewBtn.style.fontSize = '0.85em';
        viewBtn.style.padding = '6px 12px';
        viewBtn.onclick = () => showDetails('User', user);
        actionsCell.appendChild(viewBtn);
    });
}

function displaySessions() {
    const table = document.getElementById('sessionsTable');
    const tbody = document.getElementById('sessionsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    const sessions = allData.sessions || [];
    
    if (sessions.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    table.style.display = 'table';
    tbody.innerHTML = '';
    
    // DEBUG: Log first session to see what we receive
    if (sessions.length > 0) {
        console.log('First session object:', sessions[0]);
        console.log('First session score:', sessions[0].score);
    }
    
    sessions.forEach(session => {
        const row = tbody.insertRow();
        
        row.insertCell().textContent = session.session_id;
        row.insertCell().textContent = session.user_id;
        row.insertCell().textContent = session.game_id;
        row.insertCell().textContent = session.score || '-';
        row.insertCell().textContent = session.cur8_earned ? session.cur8_earned.toFixed(2) : '-';
        row.insertCell().textContent = session.duration_seconds ? formatDuration(session.duration_seconds) : '-';
        row.insertCell().textContent = formatDate(session.started_at);
        row.insertCell().textContent = session.ended_at ? formatDate(session.ended_at) : 'In corso';
        
        // Actions
        const actionsCell = row.insertCell();
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Dettagli';
        viewBtn.style.fontSize = '0.85em';
        viewBtn.style.padding = '6px 12px';
        viewBtn.onclick = () => showDetails('Session', session);
        actionsCell.appendChild(viewBtn);
    });
}

function displayAchievements() {
    const table = document.getElementById('achievementsTable');
    const tbody = document.getElementById('achievementsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    const achievements = allData.achievements || [];
    
    if (achievements.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    table.style.display = 'table';
    tbody.innerHTML = '';
    
    achievements.forEach(achievement => {
        const row = tbody.insertRow();
        
        row.insertCell().textContent = achievement.achievement_id;
        row.insertCell().textContent = achievement.user_id;
        row.insertCell().textContent = achievement.game_id;
        row.insertCell().textContent = achievement.achievement_title || '-';
        row.insertCell().textContent = achievement.achievement_description || '-';
        row.insertCell().textContent = formatDate(achievement.earned_at);
        
        // Actions
        const actionsCell = row.insertCell();
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Dettagli';
        viewBtn.style.fontSize = '0.85em';
        viewBtn.style.padding = '6px 12px';
        viewBtn.onclick = () => showDetails('Achievement', achievement);
        actionsCell.appendChild(viewBtn);
    });
}

function displayLeaderboard() {
    const table = document.getElementById('leaderboardTable');
    const tbody = document.getElementById('leaderboardTableBody');
    const emptyState = document.getElementById('emptyState');
    
    const leaderboard = allData.leaderboard || [];
    
    if (leaderboard.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    table.style.display = 'table';
    tbody.innerHTML = '';
    
    leaderboard.forEach((entry, index) => {
        const row = tbody.insertRow();
        
        // Position with medal emoji
        const posCell = row.insertCell();
        let posText = index + 1;
        if (index === 0) posText = '🥇 1';
        else if (index === 1) posText = '🥈 2';
        else if (index === 2) posText = '🥉 3';
        posCell.textContent = posText;
        
        row.insertCell().textContent = entry.user_id;
        row.insertCell().textContent = entry.game_id;
        row.insertCell().textContent = entry.score || 0;
        row.insertCell().textContent = entry.cur8_earned ? entry.cur8_earned.toFixed(2) : '-';
        row.insertCell().textContent = formatDate(entry.created_at);
        
        // Actions
        const actionsCell = row.insertCell();
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Dettagli';
        viewBtn.style.fontSize = '0.85em';
        viewBtn.style.padding = '6px 12px';
        viewBtn.onclick = () => showDetails('Leaderboard Entry', entry);
        actionsCell.appendChild(viewBtn);
    });
}

function showDetails(type, data) {
    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = `Dettagli ${type}`;
    
    // Format JSON data
    const formatted = JSON.stringify(data, null, 2);
    modalBody.innerHTML = `<pre style="overflow: auto; max-height: 500px; background: #f6f8fa; padding: 16px; border-radius: 4px;">${formatted}</pre>`;
    
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

function refreshData() {
    loadData();
}

async function exportData() {
    try {
        const response = await fetch(`${API_BASE}/db-export`);
        if (!response.ok) throw new Error('Export failed');
        
        const data = await response.json();
        
        // Download as JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Export error:', error);
        alert('Errore durante l\'export: ' + error.message);
    }
}

function exportCSV() {
    const data = getCurrentTabData();
    if (!data || data.length === 0) {
        alert('Nessun dato da esportare');
        return;
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            
            // Handle objects and arrays
            if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value);
            }
            
            // Escape quotes and wrap in quotes if contains comma
            if (value && (value.toString().includes(',') || value.toString().includes('"'))) {
                value = '"' + value.toString().replace(/"/g, '""') + '"';
            }
            
            return value || '';
        });
        csv += values.join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTab}-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function getCurrentTabData() {
    switch(currentTab) {
        case 'games': return allData.games;
        case 'users': return allData.users;
        case 'sessions': return allData.sessions;
        case 'achievements': return allData.achievements;
        case 'leaderboard': return allData.leaderboard;
        default: return [];
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDuration(seconds) {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const data = getCurrentTabData();
    
    if (!searchTerm) {
        displayCurrentTab();
        return;
    }
    
    // Filter data based on search term
    const filtered = data.filter(item => {
        return Object.values(item).some(value => {
            if (value === null || value === undefined) return false;
            return value.toString().toLowerCase().includes(searchTerm);
        });
    });
    
    // Update allData with filtered results temporarily
    const originalData = { ...allData };
    allData[getCurrentTabKey()] = filtered;
    displayCurrentTab();
    
    // If search is cleared, restore original data
    if (!searchTerm) {
        allData = originalData;
    }
});

function getCurrentTabKey() {
    const keyMap = {
        'games': 'games',
        'users': 'users',
        'sessions': 'sessions',
        'achievements': 'achievements',
        'leaderboard': 'leaderboard'
    };
    return keyMap[currentTab];
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Open Sessions Management
async function showOpenSessions() {
    try {
        const response = await fetch(`${API_BASE}/sessions/open`);
        const data = await response.json();
        
        if (!data.success) {
            alert('Errore nel caricamento delle sessioni aperte');
            return;
        }
        
        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = `Sessioni Aperte (${data.total_open})`;
        
        if (data.total_open === 0) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                    <h3>Nessuna sessione aperta</h3>
                    <p>Tutte le sessioni di gioco sono state chiuse correttamente.</p>
                </div>
            `;
        } else {
            let html = `
                <div style="margin-bottom: 16px;">
                    <button onclick="closeAllOpenSessions()" 
                            style="background: #dc3545; border-color: #dc3545; width: 100%;">
                        🔒 Chiudi Tutte le ${data.total_open} Sessioni Aperte
                    </button>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                    <thead>
                        <tr style="background: #f6f8fa; border-bottom: 2px solid #e1e4e8;">
                            <th style="padding: 8px; text-align: left;">Session ID</th>
                            <th style="padding: 8px; text-align: left;">User</th>
                            <th style="padding: 8px; text-align: left;">Game</th>
                            <th style="padding: 8px; text-align: left;">Inizio</th>
                            <th style="padding: 8px; text-align: left;">Durata</th>
                            <th style="padding: 8px; text-align: left;">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.sessions.forEach(session => {
                const duration = calculateDuration(session.started_at);
                html += `
                    <tr style="border-bottom: 1px solid #e1e4e8;">
                        <td style="padding: 8px; font-family: monospace; font-size: 0.85em;">${session.session_id.substring(0, 12)}...</td>
                        <td style="padding: 8px;">${session.username || session.user_id.substring(0, 12)}</td>
                        <td style="padding: 8px;">${session.game_title || session.game_id}</td>
                        <td style="padding: 8px;">${formatDate(session.started_at)}</td>
                        <td style="padding: 8px; color: ${duration > 1800 ? '#dc3545' : '#28a745'};">${formatDuration(duration)}</td>
                        <td style="padding: 8px;">
                            <button onclick="closeSingleSession('${session.session_id}')" 
                                    style="font-size: 0.8em; padding: 4px 8px; background: #ffc107; border-color: #ffc107; color: #000;">
                                Chiudi
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            
            modalBody.innerHTML = html;
        }
        
        modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading open sessions:', error);
        alert('Errore nel caricamento delle sessioni aperte: ' + error.message);
    }
}

async function closeAllOpenSessions() {
    if (!confirm('Sei sicuro di voler chiudere TUTTE le sessioni aperte?\n\nQuesto calcolerà il CUR8 guadagnato e chiuderà forzatamente tutte le sessioni in corso.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/sessions/close-all`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ ${data.closed_count} sessioni chiuse con successo!`);
            closeModal();
            await updateOpenSessionsButton(); // Update button visibility
            loadData(); // Refresh data
        } else {
            alert('Errore nella chiusura delle sessioni');
        }
    } catch (error) {
        console.error('Error closing sessions:', error);
        alert('Errore: ' + error.message);
    }
}

async function closeSingleSession(sessionId) {
    if (!confirm('Chiudere questa sessione?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/sessions/${sessionId}/close`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Sessione chiusa!');
            showOpenSessions(); // Refresh the modal
            await updateOpenSessionsButton(); // Update button visibility
            loadData(); // Refresh main data
        } else {
            alert('Errore nella chiusura della sessione');
        }
    } catch (error) {
        console.error('Error closing session:', error);
        alert('Errore: ' + error.message);
    }
}

function calculateDuration(startedAt) {
    const started = new Date(startedAt);
    const now = new Date();
    return Math.floor((now - started) / 1000);
}
