/**
 * Database Viewer - OOP Architecture
 * Professional and scalable implementation with Model-View-Controller pattern
 */

// ============ CONFIGURATION ============
const CONFIG = {
    API_BASE: '/admin',
    REFRESH_INTERVAL: null, // Auto-refresh disabled by default
    MAX_RECORDS: 100,
    PAGINATION_SIZE: 20
};

// ============ UTILITIES ============
class Utils {
    static formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleString('it-IT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatDuration(seconds) {
        if (!seconds) return '0s';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    }

    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text?.toString().replace(/[&<>"']/g, m => map[m]) || '';
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// ============ DATA MODEL ============
class DataModel {
    constructor() {
        this.data = {};
        this.originalData = {};
        this.listeners = [];
    }

    async fetchData() {
        try {
            const timestamp = Date.now();
            const response = await fetch(`${CONFIG.API_BASE}/db-stats?t=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch data');
            
            this.data = await response.json();
            this.originalData = JSON.parse(JSON.stringify(this.data));
            this.notifyListeners('dataLoaded', this.data);
            return this.data;
        } catch (error) {
            this.notifyListeners('error', error);
            throw error;
        }
    }

    getData(key) {
        return this.data[key] || [];
    }

    getStats() {
        return {
            total_games: this.data.total_games || 0,
            total_users: this.data.total_users || 0,
            total_sessions: this.data.total_sessions || 0,
            total_leaderboard_entries: this.data.total_leaderboard_entries || 0,
            total_xp_rules: this.data.total_xp_rules || 0,
            total_quests: this.data.total_quests || 0,
            total_user_quests: this.data.total_user_quests || 0
        };
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => listener(event, data));
    }

    filterData(key, searchTerm) {
        if (!searchTerm) {
            this.data[key] = JSON.parse(JSON.stringify(this.originalData[key]));
        } else {
            const original = this.originalData[key] || [];
            this.data[key] = original.filter(item => 
                JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        this.notifyListeners('dataFiltered', { key, searchTerm });
    }
}

// ============ VIEW BASE CLASS ============
class BaseView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.emptyState = document.getElementById('emptyState');
    }

    show() {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        this.container?.classList.add('active');
    }

    hide() {
        this.container?.classList.remove('active');
    }

    showEmpty() {
        this.emptyState.style.display = 'flex';
    }

    hideEmpty() {
        this.emptyState.style.display = 'none';
    }

    createButton(text, onClick, className = '') {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = className;
        btn.style.fontSize = '0.85em';
        btn.style.padding = '6px 12px';
        btn.onclick = onClick;
        return btn;
    }

    render(data) {
        throw new Error('render() must be implemented by subclass');
    }
}

// ============ TABLE VIEW ============
class TableView extends BaseView {
    constructor(containerId, tableId, columns) {
        super(containerId);
        this.table = document.getElementById(tableId);
        this.tbody = this.table?.querySelector('tbody');
        this.columns = columns;
    }

    render(data) {
        if (!this.table || !this.tbody) return;

        if (!data || data.length === 0) {
            this.table.style.display = 'none';
            this.showEmpty();
            return;
        }

        this.hideEmpty();
        this.table.style.display = 'table';
        this.tbody.innerHTML = '';

        data.forEach(item => this.renderRow(item));
    }

    renderRow(item) {
        const row = this.tbody.insertRow();
        this.columns.forEach(col => {
            const cell = row.insertCell();
            if (col.render) {
                col.render(cell, item[col.key], item);
            } else {
                cell.textContent = item[col.key] || '-';
            }
        });
    }
}

// ============ SPECIFIC VIEWS ============
class GamesView extends TableView {
    constructor() {
        super('gamesContainer', 'gamesTable', [
            {
                key: 'thumbnail',
                render: (cell, value) => {
                    const img = document.createElement('img');
                    img.src = value || 'https://via.placeholder.com/60';
                    img.style.cssText = 'width:60px;height:45px;object-fit:cover;border-radius:4px';
                    cell.appendChild(img);
                }
            },
            { key: 'game_id' },
            { key: 'title' },
            { key: 'author' },
            { key: 'version' },
            { key: 'category' },
            {
                key: 'metadata',
                render: (cell, value) => {
                    cell.textContent = value?.playCount || 0;
                }
            },
            {
                key: 'created_at',
                render: (cell, value) => {
                    cell.textContent = Utils.formatDate(value);
                }
            },
            {
                key: 'actions',
                render: (cell, value, item) => {
                    cell.appendChild(this.createButton('Dettagli', () => 
                        app.showDetails('Game', item)
                    ));
                }
            }
        ]);
    }
}

class UsersView extends TableView {
    constructor() {
        super('usersContainer', 'usersTable', [
            { key: 'user_id' },
            { key: 'username' },
            { key: 'email' },
            { key: 'steem_username' },
            {
                key: 'is_anonymous',
                render: (cell, value) => {
                    cell.textContent = value ? 'Anonimo' : 'Registrato';
                }
            },
            {
                key: 'total_xp_earned',
                render: (cell, value) => {
                    cell.textContent = (parseFloat(value) || 0).toFixed(2);
                }
            },
            {
                key: 'cur8_multiplier',
                render: (cell, value) => {
                    cell.textContent = (value || 1.0).toFixed(1) + 'x';
                }
            },
            {
                key: 'created_at',
                render: (cell, value) => {
                    cell.textContent = Utils.formatDate(value);
                }
            },
            {
                key: 'actions',
                render: (cell, value, item) => {
                    cell.appendChild(this.createButton('Dettagli', () => 
                        app.showDetails('User', item)
                    ));
                }
            }
        ]);
    }
}

class SessionsView extends TableView {
    constructor() {
        super('sessionsContainer', 'sessionsTable', [
            { key: 'session_id' },
            { key: 'user_id' },
            { key: 'game_id' },
            { key: 'score' },
            {
                key: 'xp_earned',
                render: (cell, value) => {
                    cell.textContent = value ? value.toFixed(2) : '-';
                }
            },
            {
                key: 'duration_seconds',
                render: (cell, value) => {
                    cell.textContent = Utils.formatDuration(value);
                }
            },
            {
                key: 'started_at',
                render: (cell, value) => {
                    cell.textContent = Utils.formatDate(value);
                }
            },
            {
                key: 'ended_at',
                render: (cell, value) => {
                    cell.textContent = value ? Utils.formatDate(value) : 'In corso';
                }
            },
            {
                key: 'actions',
                render: (cell, value, item) => {
                    cell.appendChild(this.createButton('Dettagli', () => 
                        app.showDetails('Session', item)
                    ));
                }
            }
        ]);
    }
}

class XPRulesView extends TableView {
    constructor() {
        super('xp-rulesContainer', 'xpRulesTable', [
            { key: 'rule_id' },
            { key: 'game_id' },
            { key: 'rule_name' },
            { key: 'rule_type' },
            { key: 'priority' },
            {
                key: 'is_active',
                render: (cell, value) => {
                    const span = document.createElement('span');
                    span.textContent = value ? '✓ Attivo' : '✗ Inattivo';
                    span.style.cssText = `color:${value ? '#28a745' : '#dc3545'};font-weight:bold`;
                    cell.appendChild(span);
                }
            },
            {
                key: 'parameters',
                render: (cell, value) => {
                    const preview = JSON.stringify(value).substring(0, 50);
                    cell.textContent = preview + (preview.length === 50 ? '...' : '');
                }
            },
            {
                key: 'created_at',
                render: (cell, value) => {
                    cell.textContent = Utils.formatDate(value);
                }
            },
            {
                key: 'actions',
                render: (cell, value, item) => {
                    cell.appendChild(this.createButton('Dettagli', () => 
                        app.showDetails('XP Rule', item)
                    ));
                }
            }
        ]);
    }
}

class QuestsView extends TableView {
    constructor() {
        super('questsContainer', 'questsTable', [
            { key: 'quest_id' },
            { key: 'title' },
            { key: 'quest_type' },
            { key: 'target_value' },
            {
                key: 'xp_reward',
                render: (cell, value) => {
                    cell.textContent = value;
                    cell.style.cssText = 'font-weight:bold;color:#28a745';
                }
            },
            {
                key: 'sats_reward',
                render: (cell, value) => {
                    cell.textContent = value;
                    if (value > 0) {
                        cell.style.cssText = 'font-weight:bold;color:#ffc107';
                    }
                }
            },
            {
                key: 'is_active',
                render: (cell, value) => {
                    const span = document.createElement('span');
                    span.textContent = value ? '✓ Attivo' : '✗ Inattivo';
                    span.style.cssText = `color:${value ? '#28a745' : '#dc3545'};font-weight:bold`;
                    cell.appendChild(span);
                }
            },
            {
                key: 'actions',
                render: (cell, value, item) => {
                    cell.appendChild(this.createButton('Dettagli', () => 
                        app.showQuestDetails(item)
                    ));
                }
            }
        ]);
    }
}

class LeaderboardView extends TableView {
    constructor() {
        super('leaderboardContainer', 'leaderboardTable', [
            {
                key: 'rank',
                render: (cell, value, item, index) => {
                    let posText = index + 1;
                    if (index === 0) posText = '🥇 1';
                    else if (index === 1) posText = '🥈 2';
                    else if (index === 2) posText = '🥉 3';
                    cell.textContent = posText;
                }
            },
            { key: 'user_id' },
            { key: 'game_id' },
            { key: 'score' },
            {
                key: 'created_at',
                render: (cell, value) => {
                    cell.textContent = Utils.formatDate(value);
                }
            },
            {
                key: 'actions',
                render: (cell, value, item) => {
                    cell.appendChild(this.createButton('Dettagli', () => 
                        app.showDetails('Leaderboard Entry', item)
                    ));
                }
            }
        ]);
    }

    renderRow(item, index) {
        const row = this.tbody.insertRow();
        this.columns.forEach(col => {
            const cell = row.insertCell();
            if (col.render) {
                col.render(cell, item[col.key], item, index);
            } else {
                cell.textContent = item[col.key] || '-';
            }
        });
    }

    render(data) {
        if (!this.table || !this.tbody) return;

        if (!data || data.length === 0) {
            this.table.style.display = 'none';
            this.showEmpty();
            return;
        }

        this.hideEmpty();
        this.table.style.display = 'table';
        this.tbody.innerHTML = '';

        data.forEach((item, index) => this.renderRow(item, index));
    }
}

// ============ ER DIAGRAM VIEW ============
class ERDiagramView extends BaseView {
    constructor() {
        super('er-diagramContainer');
        this.state = {
            scale: 1,
            translateX: 0,
            translateY: 0,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            tables: {}
        };
        this.schema = this.initSchema();
    }

    initSchema() {
        return {
            games: {
                name: 'games', color: '#4CAF50', x: 50, y: 50,
                fields: [
                    { name: 'game_id', type: 'STRING', pk: true },
                    { name: 'title', type: 'STRING' },
                    { name: 'description', type: 'TEXT' },
                    { name: 'author', type: 'STRING' },
                    { name: 'version', type: 'STRING' },
                    { name: 'created_at', type: 'STRING' }
                ]
            },
            users: {
                name: 'users', color: '#2196F3', x: 50, y: 350,
                fields: [
                    { name: 'user_id', type: 'STRING', pk: true },
                    { name: 'username', type: 'STRING' },
                    { name: 'email', type: 'STRING' },
                    { name: 'total_xp_earned', type: 'FLOAT' },
                    { name: 'created_at', type: 'STRING' }
                ]
            },
            game_sessions: {
                name: 'game_sessions', color: '#FF9800', x: 450, y: 200,
                fields: [
                    { name: 'session_id', type: 'STRING', pk: true },
                    { name: 'user_id', type: 'STRING', fk: 'users.user_id' },
                    { name: 'game_id', type: 'STRING', fk: 'games.game_id' },
                    { name: 'score', type: 'INTEGER' },
                    { name: 'xp_earned', type: 'FLOAT' }
                ]
            },
            xp_rules: {
                name: 'xp_rules', color: '#9C27B0', x: 450, y: 50,
                fields: [
                    { name: 'rule_id', type: 'STRING', pk: true },
                    { name: 'game_id', type: 'STRING', fk: 'games.game_id' },
                    { name: 'rule_name', type: 'STRING' },
                    { name: 'rule_type', type: 'STRING' }
                ]
            },
            quests: {
                name: 'quests', color: '#F44336', x: 800, y: 50,
                fields: [
                    { name: 'quest_id', type: 'INTEGER', pk: true },
                    { name: 'title', type: 'STRING' },
                    { name: 'quest_type', type: 'STRING' },
                    { name: 'xp_reward', type: 'INTEGER' },
                    { name: 'sats_reward', type: 'INTEGER' },
                    { name: 'is_active', type: 'BOOLEAN' }
                ]
            },
            user_quests: {
                name: 'user_quests', color: '#E91E63', x: 800, y: 300,
                fields: [
                    { name: 'id', type: 'INTEGER', pk: true },
                    { name: 'user_id', type: 'STRING', fk: 'users.user_id' },
                    { name: 'quest_id', type: 'INTEGER', fk: 'quests.quest_id' },
                    { name: 'current_progress', type: 'INTEGER' }
                ]
            },
            leaderboards: {
                name: 'leaderboards', color: '#FF5722', x: 800, y: 500,
                fields: [
                    { name: 'entry_id', type: 'STRING', pk: true },
                    { name: 'user_id', type: 'STRING', fk: 'users.user_id' },
                    { name: 'game_id', type: 'STRING', fk: 'games.game_id' },
                    { name: 'score', type: 'INTEGER' }
                ]
            }
        };
    }

    render() {
        Object.keys(this.schema).forEach(tableName => {
            if (!this.state.tables[tableName]) {
                this.state.tables[tableName] = {
                    x: this.schema[tableName].x,
                    y: this.schema[tableName].y
                };
            }
        });
        this.updateDiagram();
        this.setupInteractions();
    }

    updateDiagram() {
        const svg = document.getElementById('erSvg');
        const showTypes = document.getElementById('showFieldTypes')?.checked ?? true;
        
        svg.innerHTML = this.generateSVG(showTypes);
    }

    generateSVG(showTypes) {
        let svg = `
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#666"/>
                </marker>
            </defs>
            <g transform="translate(${this.state.translateX}, ${this.state.translateY}) scale(${this.state.scale})">
        `;

        // Draw relationships
        Object.values(this.schema).forEach(table => {
            table.fields.forEach(field => {
                if (field.fk) {
                    const [targetTable, targetField] = field.fk.split('.');
                    svg += this.drawRelationship(table.name, field.name, targetTable, targetField);
                }
            });
        });

        // Draw tables
        Object.values(this.schema).forEach(table => {
            svg += this.drawTable(table, showTypes);
        });

        svg += '</g>';
        return svg;
    }

    drawTable(table, showTypes) {
        const pos = this.state.tables[table.name];
        const width = 250;
        const headerHeight = 40;
        const rowHeight = showTypes ? 24 : 20;
        const height = headerHeight + (table.fields.length * rowHeight);

        return `
            <g class="er-table" data-table="${table.name}" transform="translate(${pos.x}, ${pos.y})" style="cursor:move">
                <rect width="${width}" height="${height}" fill="#fff" stroke="${table.color}" stroke-width="2" rx="8" 
                      style="filter:drop-shadow(0 2px 8px rgba(0,0,0,0.1))"/>
                <rect width="${width}" height="${headerHeight}" fill="${table.color}" rx="8"/>
                <rect width="${width}" height="8" y="${headerHeight - 8}" fill="${table.color}"/>
                <text x="${width/2}" y="${headerHeight/2 + 5}" text-anchor="middle" fill="#fff" font-weight="bold" font-size="16">
                    ${table.name}
                </text>
                ${table.fields.map((field, i) => {
                    const y = headerHeight + (i * rowHeight);
                    const bg = i % 2 === 1 ? '<rect x="0" y="' + y + '" width="' + width + '" height="' + rowHeight + '" fill="#f9f9f9"/>' : '';
                    const icon = field.pk ? '🔑 ' : (field.fk ? '🔗 ' : '');
                    return `
                        ${bg}
                        <text x="10" y="${y + rowHeight/2 + 4}" font-size="12" fill="#333">${icon}${field.name}</text>
                        ${showTypes ? '<text x="' + (width - 10) + '" y="' + (y + rowHeight/2 + 4) + '" text-anchor="end" font-size="10" fill="#999">' + field.type + '</text>' : ''}
                    `;
                }).join('')}
            </g>
        `;
    }

    drawRelationship(fromTable, fromField, toTable, toField) {
        const from = this.state.tables[fromTable];
        const to = this.state.tables[toTable];
        if (!from || !to) return '';

        const fromX = from.x + 250;
        const fromY = from.y + 40 + (this.schema[fromTable].fields.findIndex(f => f.name === fromField) * 22) + 11;
        const toX = to.x;
        const toY = to.y + 40 + (this.schema[toTable].fields.findIndex(f => f.name === toField) * 22) + 11;
        const midX = (fromX + toX) / 2;

        return `<path d="M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}" 
                      class="er-relationship" stroke="#666" stroke-width="2" fill="none" marker-end="url(#arrowhead)"/>`;
    }

    setupInteractions() {
        const canvas = document.getElementById('erDiagramCanvas');
        if (!canvas) return;

        let isDraggingTable = false;
        let currentTable = null;
        let startX, startY;

        canvas.onmousedown = (e) => {
            const tableEl = e.target.closest('.er-table');
            if (tableEl) {
                isDraggingTable = true;
                currentTable = tableEl.getAttribute('data-table');
                const pos = this.state.tables[currentTable];
                startX = e.clientX / this.state.scale - pos.x;
                startY = e.clientY / this.state.scale - pos.y;
            } else {
                this.state.isDragging = true;
                this.state.dragStartX = e.clientX - this.state.translateX;
                this.state.dragStartY = e.clientY - this.state.translateY;
            }
        };

        canvas.onmousemove = (e) => {
            if (isDraggingTable && currentTable) {
                this.state.tables[currentTable].x = e.clientX / this.state.scale - startX;
                this.state.tables[currentTable].y = e.clientY / this.state.scale - startY;
                this.updateDiagram();
            } else if (this.state.isDragging) {
                this.state.translateX = e.clientX - this.state.dragStartX;
                this.state.translateY = e.clientY - this.state.dragStartY;
                this.updateDiagram();
            }
        };

        canvas.onmouseup = () => {
            isDraggingTable = false;
            currentTable = null;
            this.state.isDragging = false;
        };

        canvas.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.state.scale = Math.max(0.3, Math.min(2, this.state.scale * delta));
            this.updateDiagram();
        };
    }

    reset() {
        this.state.scale = 1;
        this.state.translateX = 0;
        this.state.translateY = 0;
        Object.keys(this.schema).forEach(tableName => {
            this.state.tables[tableName] = {
                x: this.schema[tableName].x,
                y: this.schema[tableName].y
            };
        });
        this.updateDiagram();
    }

    zoom(factor) {
        this.state.scale = Math.max(0.3, Math.min(2, this.state.scale * factor));
        this.updateDiagram();
    }
}

// ============ CONTROLLER ============
class DBViewerController {
    constructor() {
        this.model = new DataModel();
        this.currentView = 'games';
        this.views = {
            games: new GamesView(),
            users: new UsersView(),
            sessions: new SessionsView(),
            'xp-rules': new XPRulesView(),
            quests: new QuestsView(),
            leaderboard: new LeaderboardView(),
            'er-diagram': new ERDiagramView()
        };

        this.model.subscribe(this.handleModelEvent.bind(this));
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadData();
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }

        // ER Diagram controls
        const showFieldTypes = document.getElementById('showFieldTypes');
        if (showFieldTypes) {
            showFieldTypes.addEventListener('change', () => {
                if (this.currentView === 'er-diagram') {
                    this.views['er-diagram'].updateDiagram();
                }
            });
        }
    }

    async loadData() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'block';

        try {
            await this.model.fetchData();
            await this.updateOpenSessionsButton();
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Errore nel caricamento dei dati: ' + error.message);
        } finally {
            if (loading) loading.style.display = 'none';
        }
    }

    handleModelEvent(event, data) {
        switch (event) {
            case 'dataLoaded':
                this.updateStats(this.model.getStats());
                this.renderCurrentView();
                break;
            case 'dataFiltered':
                this.renderCurrentView();
                break;
            case 'error':
                console.error('Model error:', data);
                break;
        }
    }

    updateStats(stats) {
        Object.keys(stats).forEach(key => {
            const el = document.getElementById(key.replace('total_', 'total') + 's'.replace('ss', 's'));
            if (el) el.textContent = stats[key];
        });
        
        document.getElementById('totalGames').textContent = stats.total_games;
        document.getElementById('totalUsers').textContent = stats.total_users;
        document.getElementById('totalSessions').textContent = stats.total_sessions;
        document.getElementById('totalLeaderboard').textContent = stats.total_leaderboard_entries;
        document.getElementById('totalXPRules').textContent = stats.total_xp_rules;
        document.getElementById('totalQuests').textContent = stats.total_quests;
    }

    switchTab(tab) {
        this.currentView = tab;
        
        // Clear search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';

        // Update UI
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event?.target?.classList.add('active');

        this.renderCurrentView();
    }

    renderCurrentView() {
        const view = this.views[this.currentView];
        if (!view) return;

        view.show();

        if (this.currentView === 'er-diagram') {
            view.render();
        } else {
            const dataKey = this.getDataKey(this.currentView);
            const data = this.model.getData(dataKey);
            view.render(data);
        }
    }

    getDataKey(viewName) {
        const keyMap = {
            'games': 'games',
            'users': 'users',
            'sessions': 'sessions',
            'xp-rules': 'xp_rules',
            'quests': 'quests',
            'leaderboard': 'leaderboard'
        };
        return keyMap[viewName];
    }

    handleSearch(term) {
        const dataKey = this.getDataKey(this.currentView);
        if (dataKey) {
            this.model.filterData(dataKey, term);
        }
    }

    showDetails(type, item) {
        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = `${type} Details`;
        modalBody.innerHTML = `<pre style="background:#f5f5f5;padding:16px;border-radius:4px;overflow:auto;max-height:400px;">${JSON.stringify(item, null, 2)}</pre>`;
        modal.style.display = 'flex';
    }

    showQuestDetails(quest) {
        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = `Quest #${quest.quest_id}: ${quest.title}`;
        
        const html = `
            <div style="line-height:1.8">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px">
                    <div><strong style="color:#6c757d">ID:</strong><br>${quest.quest_id}</div>
                    <div><strong style="color:#6c757d">Tipo:</strong><br><code>${quest.quest_type}</code></div>
                    <div><strong style="color:#6c757d">Target:</strong><br><span style="font-size:1.2em;font-weight:bold;color:#007bff">${quest.target_value}</span></div>
                    <div><strong style="color:#6c757d">XP Reward:</strong><br><span style="font-size:1.2em;font-weight:bold;color:#28a745">${quest.xp_reward}</span></div>
                    <div><strong style="color:#6c757d">Sats:</strong><br><span style="font-size:1.2em;font-weight:bold;color:#ffc107">${quest.sats_reward}</span></div>
                    <div><strong style="color:#6c757d">Game:</strong><br>${quest.game_id || '<em>Platform-wide</em>'}</div>
                </div>
                ${quest.description ? `<div style="margin-top:16px"><strong style="color:#6c757d">Descrizione:</strong><p style="background:#fff;padding:16px;border-radius:4px;border-left:4px solid #007bff">${Utils.escapeHtml(quest.description)}</p></div>` : ''}
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.style.display = 'flex';
    }

    async updateOpenSessionsButton() {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/sessions/open`);
            const data = await response.json();
            const btn = document.getElementById('openSessionsBtn');
            
            if (btn && data.success && data.total_open > 0) {
                btn.style.display = 'inline-block';
                btn.innerHTML = `⚠️ Sessioni Aperte (${data.total_open})`;
            } else if (btn) {
                btn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking open sessions:', error);
        }
    }

    async exportData() {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/db-export`);
            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `db-export-${Date.now()}.json`;
            a.click();
        } catch (error) {
            alert('Errore esportazione: ' + error.message);
        }
    }

    exportCSV() {
        const dataKey = this.getDataKey(this.currentView);
        const data = this.model.getData(dataKey);
        
        if (!data || data.length === 0) {
            alert('Nessun dato da esportare');
            return;
        }

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentView}-${Date.now()}.csv`;
        a.click();
    }
}

// ============ GLOBAL FUNCTIONS ============
let app;

function refreshData() {
    app?.loadData();
}

function switchTab(tab) {
    app?.switchTab(tab);
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.style.display = 'none';
}

function exportData() {
    app?.exportData();
}

function exportCSV() {
    app?.exportCSV();
}

function resetERDiagram() {
    app?.views['er-diagram']?.reset();
}

function zoomIn() {
    app?.views['er-diagram']?.zoom(1.2);
}

function zoomOut() {
    app?.views['er-diagram']?.zoom(1 / 1.2);
}

function updateERDiagram() {
    app?.views['er-diagram']?.updateDiagram();
}

// ============ INITIALIZATION ============
window.addEventListener('DOMContentLoaded', () => {
    app = new DBViewerController();
});
