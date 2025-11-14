const API_BASE = '/admin';
let allData = {};
let originalData = {}; // Keep original data separate from filtered data
let currentTab = 'games';

// Load data on page load
window.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    
    try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_BASE}/db-stats?t=${timestamp}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch data');
        
        allData = await response.json();
        originalData = JSON.parse(JSON.stringify(allData)); // Deep copy of original data
        
        console.log('[DEBUG] Loaded data:', allData.users?.length, 'users');
        if (allData.users?.[0]) {
            console.log('[DEBUG] First user:', allData.users[0]);
        }
        
        // Update stats
        document.getElementById('totalGames').textContent = allData.total_games || 0;
        document.getElementById('totalUsers').textContent = allData.total_users || 0;
        document.getElementById('totalSessions').textContent = allData.total_sessions || 0;
        document.getElementById('totalAchievements').textContent = allData.total_achievements || 0;
        document.getElementById('totalLeaderboard').textContent = allData.total_leaderboard_entries || 0;
        document.getElementById('totalXPRules').textContent = allData.total_xp_rules || 0;
        
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
    
    // Clear search input when switching tabs
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    
    // Restore original data for all tabs
    allData = JSON.parse(JSON.stringify(originalData));
    
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
        case 'xp-rules':
            displayXPRules();
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
        
        // Debug XP value
        const xpValue = user.total_xp_earned;
        console.log(`User ${user.username}: total_xp_earned =`, xpValue, typeof xpValue);
        
        row.insertCell().textContent = (parseFloat(xpValue) || 0).toFixed(2);
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
        row.insertCell().textContent = session.xp_earned ? session.xp_earned.toFixed(2) : '-';
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

function displayXPRules() {
    const table = document.getElementById('xpRulesTable');
    const tbody = document.getElementById('xpRulesTableBody');
    const emptyState = document.getElementById('emptyState');
    
    const rules = allData.xp_rules || [];
    
    if (rules.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    table.style.display = 'table';
    tbody.innerHTML = '';
    
    rules.forEach(rule => {
        const row = tbody.insertRow();
        
        row.insertCell().textContent = rule.rule_id;
        row.insertCell().textContent = rule.game_id;
        row.insertCell().textContent = rule.rule_name;
        row.insertCell().textContent = rule.rule_type;
        
        // Priority with badge
        const priorityCell = row.insertCell();
        const priorityBadge = document.createElement('span');
        priorityBadge.textContent = rule.priority;
        priorityBadge.style.padding = '3px 8px';
        priorityBadge.style.borderRadius = '12px';
        priorityBadge.style.fontSize = '0.85em';
        priorityBadge.style.fontWeight = 'bold';
        if (rule.priority >= 20) {
            priorityBadge.style.background = '#dc3545';
            priorityBadge.style.color = 'white';
        } else if (rule.priority >= 10) {
            priorityBadge.style.background = '#ffc107';
            priorityBadge.style.color = '#000';
        } else {
            priorityBadge.style.background = '#6c757d';
            priorityBadge.style.color = 'white';
        }
        priorityCell.appendChild(priorityBadge);
        
        // Active status
        const statusCell = row.insertCell();
        const statusBadge = document.createElement('span');
        statusBadge.textContent = rule.is_active ? '✓ Attiva' : '✗ Disattiva';
        statusBadge.style.padding = '3px 8px';
        statusBadge.style.borderRadius = '12px';
        statusBadge.style.fontSize = '0.85em';
        statusBadge.style.fontWeight = 'bold';
        if (rule.is_active) {
            statusBadge.style.background = '#28a745';
            statusBadge.style.color = 'white';
        } else {
            statusBadge.style.background = '#6c757d';
            statusBadge.style.color = 'white';
        }
        statusCell.appendChild(statusBadge);
        
        // Parameters (truncated)
        const paramsCell = row.insertCell();
        const paramsText = JSON.stringify(rule.parameters);
        paramsCell.textContent = paramsText.length > 50 ? paramsText.substring(0, 50) + '...' : paramsText;
        paramsCell.style.fontFamily = 'monospace';
        paramsCell.style.fontSize = '0.85em';
        paramsCell.title = paramsText; // Full text on hover
        
        row.insertCell().textContent = formatDate(rule.created_at);
        
        // Actions
        const actionsCell = row.insertCell();
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Dettagli';
        viewBtn.style.fontSize = '0.85em';
        viewBtn.style.padding = '6px 12px';
        viewBtn.onclick = () => showXPRuleDetails(rule);
        actionsCell.appendChild(viewBtn);
    });
}

function showXPRuleDetails(rule) {
    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = `Regola XP: ${rule.rule_name}`;
    
    // Create a formatted view
    let html = `
        <div style="background: #f6f8fa; padding: 20px; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div>
                    <strong style="color: #6c757d;">Rule ID:</strong><br>
                    <code style="background: white; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;">${rule.rule_id}</code>
                </div>
                <div>
                    <strong style="color: #6c757d;">Game ID:</strong><br>
                    <code style="background: white; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;">${rule.game_id}</code>
                </div>
                <div>
                    <strong style="color: #6c757d;">Tipo:</strong><br>
                    <span style="background: #0366d6; color: white; padding: 4px 12px; border-radius: 12px; display: inline-block; margin-top: 4px;">${rule.rule_type}</span>
                </div>
                <div>
                    <strong style="color: #6c757d;">Priorità:</strong><br>
                    <span style="background: ${rule.priority >= 20 ? '#dc3545' : rule.priority >= 10 ? '#ffc107' : '#6c757d'}; color: ${rule.priority >= 10 && rule.priority < 20 ? '#000' : 'white'}; padding: 4px 12px; border-radius: 12px; display: inline-block; margin-top: 4px; font-weight: bold;">${rule.priority}</span>
                </div>
                <div>
                    <strong style="color: #6c757d;">Stato:</strong><br>
                    <span style="background: ${rule.is_active ? '#28a745' : '#6c757d'}; color: white; padding: 4px 12px; border-radius: 12px; display: inline-block; margin-top: 4px;">${rule.is_active ? '✓ Attiva' : '✗ Disattiva'}</span>
                </div>
                <div>
                    <strong style="color: #6c757d;">Creata:</strong><br>
                    <span style="margin-top: 4px; display: inline-block;">${formatDate(rule.created_at)}</span>
                </div>
            </div>
            
            <div style="margin-top: 16px;">
                <strong style="color: #6c757d; margin-bottom: 8px; display: block;">Parametri:</strong>
                <pre style="background: white; padding: 16px; border-radius: 4px; overflow: auto; max-height: 300px; margin: 0;">${JSON.stringify(rule.parameters, null, 2)}</pre>
            </div>
            
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e1e4e8;">
                <strong style="color: #6c757d; margin-bottom: 8px; display: block;">JSON Completo:</strong>
                <pre style="background: white; padding: 16px; border-radius: 4px; overflow: auto; max-height: 200px; font-size: 0.85em; margin: 0;">${JSON.stringify(rule, null, 2)}</pre>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = html;
    modal.style.display = 'flex';
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
        console.log(`Leaderboard Entry ${index + 1}:`, entry);
        row.insertCell().textContent = entry.user_id;
        row.insertCell().textContent = entry.game_id;
        row.insertCell().textContent = entry.score || 0;
        //row.insertCell().textContent = entry.xp_earned ? entry.xp_earned.toFixed(2) : '-';
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
    // Clear search on refresh
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
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
        case 'xp-rules': return allData.xp_rules;
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
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        // Restore original data
        allData = JSON.parse(JSON.stringify(originalData));
        displayCurrentTab();
        return;
    }
    
    // Get current tab key
    const tabKey = getCurrentTabKey();
    const originalTabData = originalData[tabKey] || [];
    
    // Filter data based on search term
    const filtered = originalTabData.filter(item => {
        return Object.entries(item).some(([key, value]) => {
            if (value === null || value === undefined) return false;
            
            // Handle nested objects (like metadata)
            if (typeof value === 'object') {
                return JSON.stringify(value).toLowerCase().includes(searchTerm);
            }
            
            return value.toString().toLowerCase().includes(searchTerm);
        });
    });
    
    // Update allData with filtered results
    allData[tabKey] = filtered;
    displayCurrentTab();
});

function getCurrentTabKey() {
    const keyMap = {
        'games': 'games',
        'users': 'users',
        'sessions': 'sessions',
        'xp-rules': 'xp_rules',
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
