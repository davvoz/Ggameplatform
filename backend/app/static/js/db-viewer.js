/**
 * Database Viewer - Refactored OOP Architecture
 * Scalable implementation with template-based rendering
 * 
 * To add a new table to the system:
 * 1. Add table definition to TABLE_DEFINITIONS in db-viewer-config.js
 * 2. That's it! The system will automatically generate UI and handle data
 */

// ============ DATA MODEL ============
class DataModel {
    constructor() {
        this.data = {};
        this.originalData = {};
        this.listeners = [];
        this.activeFilters = {}; // Store active filters per table
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
            
            // Reapply active filters after fetching new data
            this.reapplyFilters();
            
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
        const stats = {};
        STATS_CONFIG.forEach(stat => {
            stats[stat.key] = this.data[stat.key] || 0;
        });
        return stats;
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => listener(event, data));
    }

    filterData(key, searchTerm) {
        // Store the active filter
        if (searchTerm) {
            this.activeFilters[key] = searchTerm;
        } else {
            delete this.activeFilters[key];
        }
        
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
    
    /**
     * Reapply all active filters after data refresh
     * Following OCP: extensible filtering system
     */
    reapplyFilters() {
        Object.keys(this.activeFilters).forEach(key => {
            const searchTerm = this.activeFilters[key];
            if (searchTerm) {
                const original = this.originalData[key] || [];
                this.data[key] = original.filter(item => 
                    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
        });
    }
    
    /**
     * Get active filter for a table
     */
    getActiveFilter(key) {
        return this.activeFilters[key] || '';
    }
}

// ============ TABLE REGISTRY ============
class TableRegistry {
    constructor() {
        this.tables = TABLE_DEFINITIONS;
    }

    getTable(key) {
        return this.tables[key];
    }

    getAllTables() {
        return Object.keys(this.tables).map(key => ({
            key,
            definition: this.tables[key]
        }));
    }

    getTableKeys() {
        return Object.keys(this.tables).filter(key => key !== 'er-diagram');
    }

    // Method to dynamically register a new table (for future extensibility)
    registerTable(key, definition) {
        this.tables[key] = definition;
        console.log(`Table '${key}' registered successfully`);
    }
}

// ============ BASE VIEW CLASS ============
class BaseView {
    constructor(tableKey, tableDef) {
        this.tableKey = tableKey;
        this.tableDef = tableDef;
        this.container = null;
        this.emptyState = null;
    }

    show() {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        this.container?.classList.add('active');
    }

    hide() {
        this.container?.classList.remove('active');
    }

    showEmpty(message) {
        if (this.emptyState) {
            this.emptyState.style.display = 'flex';
            this.emptyState.innerHTML = TemplateEngine.renderEmptyState(message);
        }
    }

    hideEmpty() {
        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }
    }

    render(data) {
        throw new Error('render() must be implemented by subclass');
    }
}

// ============ TABLE VIEW ============
class TableView extends BaseView {
    constructor(tableKey, tableDef) {
        super(tableKey, tableDef);
        this.table = null;
        this.tbody = null;
        this.currentPage = 1;
        this.pageSize = CONFIG.PAGINATION_SIZE;
        this.totalRecords = 0;
        this.paginationContainer = null;
    }

    initialize() {
        this.container = document.getElementById(`${this.tableKey}Container`);
        this.table = document.getElementById(`${this.tableKey}Table`);
        this.tbody = this.table?.querySelector('tbody');
        // Each tab should have its own empty state element
        this.emptyState = this.container?.querySelector('.empty-state');
        
        // Create empty state if it doesn't exist
        if (this.container && !this.emptyState) {
            this.emptyState = document.createElement('div');
            this.emptyState.className = 'empty empty-state';
            this.emptyState.style.display = 'none';
            this.container.appendChild(this.emptyState);
        }
        
        // Initialize pagination container
        this.paginationContainer = this.container?.querySelector('.pagination-controls');
        if (this.container && !this.paginationContainer) {
            this.paginationContainer = document.createElement('div');
            this.paginationContainer.className = 'pagination-controls';
            this.container.appendChild(this.paginationContainer);
        }
    }

    render(data) {
        // Always re-initialize to ensure elements exist
        this.initialize();
        
        if (!this.table || !this.tbody) {
            console.warn(`Cannot render ${this.tableKey}: table or tbody not found`);
            return;
        }

        this.doRender(data);
    }

    doRender(data) {
        if (!data || data.length === 0) {
            this.table.style.display = 'none';
            this.hidePagination();
            this.showEmpty(`Nessun ${this.tableDef.label.toLowerCase()} trovato`);
            return;
        }

        this.hideEmpty();
        this.table.style.display = 'table';
        this.totalRecords = data.length;
        
        // Determina se mostrare la paginazione
        const needsPagination = this.totalRecords > CONFIG.PAGINATION_THRESHOLD;
        
        if (needsPagination) {
            // Calcola i dati per la pagina corrente
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = Math.min(startIndex + this.pageSize, this.totalRecords);
            const pageData = data.slice(startIndex, endIndex);
            
            this.tbody.innerHTML = '';
            pageData.forEach((item, index) => this.renderRow(item, startIndex + index));
            this.showPagination();
        } else {
            // Mostra tutti i dati senza paginazione
            this.tbody.innerHTML = '';
            data.forEach((item, index) => this.renderRow(item, index));
            this.hidePagination();
        }
    }

    renderRow(item, index) {
        const row = this.tbody.insertRow();
        
        this.tableDef.columns.forEach(column => {
            const value = item[column.key];
            const cell = TemplateEngine.renderTableCell(column, value, item, index);
            // Pass tableDef to the template engine for context
            cell.tableDef = this.tableDef;
            row.appendChild(cell);
        });
    }
    
    showPagination() {
        if (!this.paginationContainer) return;
        
        const totalPages = Math.ceil(this.totalRecords / this.pageSize);
        const startRecord = (this.currentPage - 1) * this.pageSize + 1;
        const endRecord = Math.min(this.currentPage * this.pageSize, this.totalRecords);
        
        this.paginationContainer.innerHTML = `
            <div class="pagination-info">
                Visualizzati ${startRecord}-${endRecord} di ${this.totalRecords} record
            </div>
            <div class="pagination-buttons">
                <button class="pagination-btn" onclick="app.views['${this.tableKey}'].goToPage(1)" ${this.currentPage === 1 ? 'disabled' : ''}>
                    ⏮ Prima
                </button>
                <button class="pagination-btn" onclick="app.views['${this.tableKey}'].goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                    ◀ Prec
                </button>
                <span class="pagination-page">Pagina ${this.currentPage} di ${totalPages}</span>
                <button class="pagination-btn" onclick="app.views['${this.tableKey}'].goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Succ ▶
                </button>
                <button class="pagination-btn" onclick="app.views['${this.tableKey}'].goToPage(${totalPages})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Ultima ⏭
                </button>
            </div>
            <div class="pagination-size">
                <label for="pageSize-${this.tableKey}">Record per pagina:</label>
                <select id="pageSize-${this.tableKey}" onchange="app.views['${this.tableKey}'].changePageSize(this.value)">
                    <option value="10" ${this.pageSize === 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${this.pageSize === 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100</option>
                </select>
            </div>
        `;
        
        this.paginationContainer.style.display = 'flex';
    }
    
    hidePagination() {
        if (this.paginationContainer) {
            this.paginationContainer.style.display = 'none';
        }
    }
    
    goToPage(pageNumber) {
        const totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.currentPage = Math.max(1, Math.min(pageNumber, totalPages));
        app.renderCurrentView();
    }
    
    changePageSize(newSize) {
        this.pageSize = parseInt(newSize);
        this.currentPage = 1; // Reset alla prima pagina
        app.renderCurrentView();
    }
}

// ============ ER DIAGRAM VIEW ============
class ERDiagramView extends BaseView {
    constructor() {
        super('er-diagram', { label: 'ER Diagram', name: 'er-diagram' });
        this.state = {
            scale: 1,
            translateX: 0,
            translateY: 0,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            tables: {}
        };
        this.registry = new TableRegistry();
    }

    initialize() {
        this.container = document.getElementById('er-diagramContainer');
        
        // Initialize table positions from config
        this.registry.getAllTables().forEach(({ key, definition }) => {
            if (definition.erDiagram) {
                this.state.tables[definition.name] = {
                    x: definition.erDiagram.x,
                    y: definition.erDiagram.y,
                    config: definition
                };
            }
        });
    }

    render() {
        if (!this.state.tables || Object.keys(this.state.tables).length === 0) {
            this.initialize();
        }
        this.updateDiagram();
        this.setupInteractions();
    }

    updateDiagram() {
        const svg = document.getElementById('erSvg');
        const showTypes = document.getElementById('showFieldTypes')?.checked ?? true;
        
        if (svg) {
            svg.innerHTML = this.generateSVG(showTypes);
        }
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
        Object.values(this.state.tables).forEach(table => {
            table.config.fields.forEach(field => {
                if (field.fk) {
                    const [targetTable, targetField] = field.fk.split('.');
                    svg += TemplateEngine.renderERDiagramRelationship(
                        table.config.name,
                        field.name,
                        targetTable,
                        targetField,
                        this.state.tables
                    );
                }
            });
        });

        // Draw tables
        Object.values(this.state.tables).forEach(table => {
            svg += TemplateEngine.renderERDiagramTable(table, showTypes);
        });

        svg += '</g>';
        return svg;
    }

    setupInteractions() {
        const canvas = document.getElementById('erDiagramCanvas');
        if (!canvas) return;

        let isDraggingTable = false;
        let currentTableName = null;
        let startX, startY;

        canvas.onmousedown = (e) => {
            const tableEl = e.target.closest('.er-table');
            if (tableEl) {
                isDraggingTable = true;
                currentTableName = tableEl.getAttribute('data-table');
                const pos = this.state.tables[currentTableName];
                startX = e.clientX / this.state.scale - pos.x;
                startY = e.clientY / this.state.scale - pos.y;
            } else {
                this.state.isDragging = true;
                this.state.dragStartX = e.clientX - this.state.translateX;
                this.state.dragStartY = e.clientY - this.state.translateY;
            }
        };

        canvas.onmousemove = (e) => {
            if (isDraggingTable && currentTableName) {
                this.state.tables[currentTableName].x = e.clientX / this.state.scale - startX;
                this.state.tables[currentTableName].y = e.clientY / this.state.scale - startY;
                this.updateDiagram();
            } else if (this.state.isDragging) {
                this.state.translateX = e.clientX - this.state.dragStartX;
                this.state.translateY = e.clientY - this.state.dragStartY;
                this.updateDiagram();
            }
        };

        canvas.onmouseup = () => {
            isDraggingTable = false;
            currentTableName = null;
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
        this.initialize();
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
        this.registry = new TableRegistry();
        this.currentView = 'games';
        this.views = {};

        this.model.subscribe(this.handleModelEvent.bind(this));
        this.init();
    }

    init() {
        this.initializeViews();
        this.setupEventListeners();
        // Don't load data immediately - wait for DOM to be ready
        console.log('Controller initialized, waiting for DOM ready signal');
    }

    startDataLoad() {
        console.log('Starting data load...');
        this.loadData();
    }

    initializeViews() {
        // Create views for all registered tables
        this.registry.getTableKeys().forEach(tableKey => {
            const tableDef = this.registry.getTable(tableKey);
            this.views[tableKey] = new TableView(tableKey, tableDef);
        });

        // Add ER Diagram view
        this.views['er-diagram'] = new ERDiagramView();
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
        if (loading) loading.style.display = 'flex';

        try {
            await this.model.fetchData();
            await this.updateOpenSessionsButton();
            // Loading will be hidden by handleModelEvent when data is rendered
        } catch (error) {
            console.error('Error loading data:', error);
            if (loading) loading.style.display = 'none';
            alert('Errore nel caricamento dei dati: ' + error.message);
        }
    }

    handleModelEvent(event, data) {
        switch (event) {
            case 'dataLoaded':
                this.updateStats(this.model.getStats());
                
                // Pre-render ALL views on first load so data is ready for all tabs
                this.registry.getTableKeys().forEach(tableKey => {
                    const view = this.views[tableKey];
                    const tableDef = this.registry.getTable(tableKey);
                    if (view && tableDef) {
                        const viewData = this.model.getData(tableDef.dataKey);
                        view.render(viewData);
                    }
                });
                
                // Make sure the first tab is active and visible
                const firstTabBtn = document.querySelector('.tab-btn');
                if (firstTabBtn && !document.querySelector('.tab-btn.active')) {
                    firstTabBtn.classList.add('active');
                }
                
                // Show the current view
                const currentContainer = document.getElementById(`${this.currentView}Container`);
                if (currentContainer) {
                    currentContainer.classList.add('active');
                }
                
                // Hide loading
                const loading = document.getElementById('loading');
                if (loading) loading.style.display = 'none';
                
                console.log('All views pre-rendered!');
                break;
                
            case 'dataFiltered':
                this.renderCurrentView();
                break;
                
            case 'error':
                console.error('Model error:', data);
                const loadingEl = document.getElementById('loading');
                if (loadingEl) loadingEl.style.display = 'none';
                break;
        }
    }

    updateStats(stats) {
        STATS_CONFIG.forEach(stat => {
            const el = document.getElementById(stat.key.replace('total_', 'total'));
            if (el) {
                el.textContent = stats[stat.key] || 0;
            }
        });
    }

    switchTab(tab) {
        this.currentView = tab;
        
        // Update search input to show active filter for this tab
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const tableDef = this.registry.getTable(tab);
            if (tableDef && tableDef.dataKey) {
                const activeFilter = this.model.getActiveFilter(tableDef.dataKey);
                searchInput.value = activeFilter || '';
            } else {
                searchInput.value = '';
            }
        }

        // Update UI
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Force render when switching tabs - this ensures data is always displayed
        this.renderCurrentView();
    }

    renderCurrentView() {
        const view = this.views[this.currentView];
        if (!view) {
            console.warn(`View not found for: ${this.currentView}`);
            return;
        }

        // Hide all tab contents first
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        
        // Show current view
        view.show();

        if (this.currentView === 'er-diagram') {
            view.render();
        } else {
            const tableDef = this.registry.getTable(this.currentView);
            if (!tableDef) {
                console.warn(`Table definition not found for: ${this.currentView}`);
                return;
            }
            const dataKey = tableDef.dataKey;
            const data = this.model.getData(dataKey);
            console.log(`Rendering ${this.currentView} with ${data?.length || 0} items`);
            view.render(data);
        }
    }

    handleSearch(term) {
        const tableDef = this.registry.getTable(this.currentView);
        if (tableDef && tableDef.dataKey) {
            this.model.filterData(tableDef.dataKey, term);
        }
    }

    showDetails(type, item) {
        const modal = document.getElementById('detailModal');
        const modalContent = modal.querySelector('.modal-content');

        // Determina quale template usare in base al tipo
        let title = `${type} - Dettagli`;
        let content = '';

        switch (type) {
            case 'Giochi':
                title = `🎮 ${item.title || 'Gioco'}`;
                content = TemplateEngine.renderGameDetails(item);
                break;
            case 'Utenti':
                title = `👤 ${item.username || 'Utente'}`;
                content = TemplateEngine.renderUserDetails(item);
                break;
            case 'Sessioni':
                title = `🎯 Sessione ${item.session_id.substring(0, 8)}...`;
                content = TemplateEngine.renderSessionDetails(item);
                break;
            case 'XP Rules':
                title = `⭐ ${item.rule_name || 'XP Rule'}`;
                content = TemplateEngine.renderXPRuleDetails(item);
                break;
            case 'Leaderboard':
                title = `🥇 Record Leaderboard`;
                content = TemplateEngine.renderLeaderboardDetails(item);
                break;
            case 'User Quests':
                title = `📋 User Quest #${item.id}`;
                content = TemplateEngine.renderUserQuestDetails(item);
                break;
            case 'Stati Giochi':
                title = `🏷️ ${item.status_name || 'Stato'}`;
                content = TemplateEngine.renderGameStatusDetails(item);
                break;
            default:
                content = TemplateEngine.renderJSONDetails(item);
        }

        const html = TemplateEngine.renderDetailModal(title, content);
        modalContent.innerHTML = html;
        modal.style.display = 'flex';
    }

    showQuestDetails(quest) {
        const modal = document.getElementById('detailModal');
        const modalContent = modal.querySelector('.modal-content');

        const html = TemplateEngine.renderDetailModal(
            `Quest #${quest.quest_id}: ${quest.title}`,
            TemplateEngine.renderQuestDetails(quest)
        );
        
        modalContent.innerHTML = html;
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
            Utils.downloadJSON(data, `db-export-${Date.now()}.json`);
        } catch (error) {
            alert('Errore esportazione: ' + error.message);
        }
    }

    exportCSV() {
        const tableDef = this.registry.getTable(this.currentView);
        if (!tableDef) return;

        const data = this.model.getData(tableDef.dataKey);
        
        if (!data || data.length === 0) {
            alert('Nessun dato da esportare');
            return;
        }

        const headers = Object.keys(data[0]);
        Utils.downloadCSV(data, `${this.currentView}-${Date.now()}.csv`, headers);
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

function handleCreateClick() {
    const currentView = app?.currentView;
    if (currentView && currentView !== 'er-diagram') {
        showCreateModal(currentView);
    } else {
        alert('Seleziona una tabella per creare un nuovo record');
    }
}

async function showOpenSessions() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/sessions/open`);
        const data = await response.json();
        
        if (!data.success) {
            alert('Errore nel caricamento delle sessioni aperte');
            return;
        }
        
        const modal = document.getElementById('detailModal');
        const modalContent = modal.querySelector('.modal-content');
        
        let html = `
            <div class="modal-header">
                <h2>Sessioni Aperte (${data.total_open})</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
        `;
        
        if (data.total_open === 0) {
            html += `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                    <h3>Nessuna sessione aperta</h3>
                    <p>Tutte le sessioni di gioco sono state chiuse correttamente.</p>
                </div>
            `;
        } else {
            html += `
                <div style="margin-bottom: 16px;">
                    <button onclick="closeAllOpenSessions()" 
                            style="background: #dc3545; border-color: #dc3545; color: white; width: 100%; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">
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
                        <td style="padding: 8px;">${Utils.formatDate(session.started_at)}</td>
                        <td style="padding: 8px; color: ${duration > 1800 ? '#dc3545' : '#28a745'};">${Utils.formatDuration(duration)}</td>
                        <td style="padding: 8px;">
                            <button onclick="closeSingleSession('${session.session_id}')" 
                                    style="font-size: 0.8em; padding: 4px 8px; background: #ffc107; border-color: #ffc107; color: #000; cursor: pointer; border-radius: 4px;">
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
        }
        
        html += '</div>';
        
        modalContent.innerHTML = html;
        modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading open sessions:', error);
        alert('Errore nel caricamento delle sessioni aperte: ' + error.message);
    }
}

async function closeAllOpenSessions() {

    try {
        const response = await fetch(`${CONFIG.API_BASE}/sessions/close-all`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal();
            if (crudManager) {
                crudManager.showToast(`${data.closed_count} sessioni chiuse con successo`, 'success');
            }
            await app?.updateOpenSessionsButton();
            await app?.loadData();
        } else {
            if (crudManager) {
                crudManager.showToast('Errore nella chiusura delle sessioni', 'error');
            }
        }
    } catch (error) {
        console.error('Error closing sessions:', error);
        if (crudManager) {
            crudManager.showToast('Errore: ' + error.message, 'error');
        }
    }
}

async function closeSingleSession(sessionId) {

    
    try {
        const response = await fetch(`${CONFIG.API_BASE}/sessions/${sessionId}/close`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            await showOpenSessions();
            await app?.updateOpenSessionsButton();
            await app?.loadData();
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

// ============ INITIALIZATION ============
function initializeDynamicUI() {
    // Generate Stats Cards
    const statsContainer = document.getElementById('statsContainer');
    STATS_CONFIG.forEach(stat => {
        statsContainer.innerHTML += TemplateEngine.renderStatCard(stat, '-');
    });

    // Generate Tabs
    const tabsContainer = document.getElementById('tabsContainer');
    const registry = new TableRegistry();
    let isFirst = true;
    
    registry.getAllTables().forEach(({ key, definition }) => {
        tabsContainer.innerHTML += TemplateEngine.renderTabButton(key, definition, isFirst);
        isFirst = false;
    });
    
    // Add ER Diagram tab
    tabsContainer.innerHTML += TemplateEngine.renderTabButton('er-diagram', { 
        label: 'ER Diagram', 
        icon: '📊' 
    }, false);

    // Generate Table Containers
    const dynamicTablesContainer = document.getElementById('dynamicTablesContainer');
    registry.getTableKeys().forEach(tableKey => {
        const tableDef = registry.getTable(tableKey);
        dynamicTablesContainer.innerHTML += TemplateEngine.renderTableContainer(tableKey, tableDef);
    });
    
    console.log('Dynamic UI initialized');
}

function initializeApp() {
    console.log('Initializing app...');
    app = new DBViewerController();
    
    // Wait another frame to ensure views are fully initialized
    requestAnimationFrame(() => {
        console.log('DOM is ready, starting data load');
        app.startDataLoad();
    });
}

window.addEventListener('DOMContentLoaded', () => {
    // Step 1: Create all dynamic UI elements
    initializeDynamicUI();
    
    // Step 2: Force browser to process DOM updates using double requestAnimationFrame
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Step 3: Now initialize the app when DOM is guaranteed to be ready
            initializeApp();
        });
    });
});
