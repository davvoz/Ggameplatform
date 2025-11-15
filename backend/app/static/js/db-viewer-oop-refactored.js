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
    }

    initialize() {
        this.container = document.getElementById(`${this.tableKey}Container`);
        this.table = document.getElementById(`${this.tableKey}Table`);
        this.tbody = this.table?.querySelector('tbody');
        this.emptyState = document.getElementById('emptyState');
    }

    render(data) {
        if (!this.table || !this.tbody) {
            this.initialize();
        }

        if (!data || data.length === 0) {
            if (this.table) this.table.style.display = 'none';
            this.showEmpty(`Nessun ${this.tableDef.label.toLowerCase()} trovato`);
            return;
        }

        this.hideEmpty();
        if (this.table) this.table.style.display = 'table';
        this.tbody.innerHTML = '';

        data.forEach((item, index) => this.renderRow(item, index));
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
        STATS_CONFIG.forEach(stat => {
            const el = document.getElementById(stat.key.replace('total_', 'total'));
            if (el) {
                el.textContent = stats[stat.key] || 0;
            }
        });
    }

    switchTab(tab) {
        this.currentView = tab;
        
        // Clear search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';

        // Update UI
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        this.renderCurrentView();
    }

    renderCurrentView() {
        const view = this.views[this.currentView];
        if (!view) return;

        view.show();

        if (this.currentView === 'er-diagram') {
            view.render();
        } else {
            const tableDef = this.registry.getTable(this.currentView);
            const dataKey = tableDef.dataKey;
            const data = this.model.getData(dataKey);
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

        const html = TemplateEngine.renderDetailModal(
            `${type} Details`,
            TemplateEngine.renderJSONDetails(item)
        );
        
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

// ============ INITIALIZATION ============
window.addEventListener('DOMContentLoaded', () => {
    app = new DBViewerController();
});
