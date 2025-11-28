/**
 * CRUD Operations for Database Viewer
 * Handles Create, Update, Delete operations for all tables
 * Following OOP principles and modular design
 */

class CRUDManager {
    constructor(apiBase) {
        this.apiBase = apiBase;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? '✓' : '✕';
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Show create modal for a specific table
     */
    showCreateModal(tableKey, tableDef) {
        const modal = document.getElementById('crudModal');
        const modalContent = modal.querySelector('.modal-content');

        const fields = this.getFieldsForTable(tableKey, tableDef);
        const formHTML = this.generateFormHTML(tableKey, fields, 'create');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>Create New ${tableDef.label}</h2>
                <button class="modal-close" onclick="closeCRUDModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="crudForm" onsubmit="event.preventDefault(); crudManager.handleCreate('${tableKey}')">
                    ${formHTML}
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Create</button>
                        <button type="button" class="btn-secondary" onclick="closeCRUDModal()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        modal.style.display = 'flex';
    }

    /**
     * Show edit modal for a specific record
     */
    showEditModal(tableKey, tableDef, item) {
        const modal = document.getElementById('crudModal');
        const modalContent = modal.querySelector('.modal-content');

        const fields = this.getFieldsForTable(tableKey, tableDef);
        const formHTML = this.generateFormHTML(tableKey, fields, 'edit', item);

        const idField = this.getIdField(tableKey);
        const idValue = item[idField];

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>Edit ${tableDef.label}</h2>
                <button class="modal-close" onclick="closeCRUDModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="crudForm" onsubmit="event.preventDefault(); crudManager.handleUpdate('${tableKey}', '${idValue}')">
                    ${formHTML}
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Save</button>
                        <button type="button" class="btn-secondary" onclick="closeCRUDModal()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        modal.style.display = 'flex';
    }

    /**
     * Show delete confirmation
     */
    showDeleteModal(tableKey, tableDef, item) {
        const idField = this.getIdField(tableKey);
        const idValue = item[idField];
        const displayValue = this.getDisplayValue(tableKey, item);

        const modal = document.getElementById('crudModal');
        const modalContent = modal.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>Delete ${tableDef.label}</h2>
                <button class="modal-close" onclick="closeCRUDModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="delete-confirmation">
                    <div class="delete-warning-icon">⚠</div>
                    <p class="delete-message">Are you sure you want to delete this ${tableDef.label.toLowerCase()}?</p>
                    <p class="delete-item-name">${displayValue}</p>
                    <p class="delete-warning-text">This action cannot be undone.</p>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-danger" onclick="crudManager.handleDelete('${tableKey}', '${idValue}')">Delete</button>
                    <button type="button" class="btn-secondary" onclick="closeCRUDModal()">Cancel</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    /**
     * Get field definitions for a table
     */
    getFieldsForTable(tableKey, tableDef) {
        const fieldMappings = {
            'games': [
                { key: 'game_id', label: 'Game ID', type: 'text', required: true, readonly: false },
                { key: 'title', label: 'Titolo', type: 'text', required: true },
                { key: 'description', label: 'Descrizione', type: 'textarea' },
                { key: 'author', label: 'Autore', type: 'text' },
                { key: 'version', label: 'Versione', type: 'text' },
                { key: 'thumbnail', label: 'Thumbnail URL', type: 'text' },
                { key: 'entry_point', label: 'Entry Point', type: 'text', required: true },
                { key: 'category', label: 'Categoria', type: 'text' }
            ],
            'users': [
                { key: 'user_id', label: 'User ID', type: 'text', readonly: true },
                { key: 'username', label: 'Username', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'steem_username', label: 'Steem Username', type: 'text' },
                { key: 'is_anonymous', label: 'Anonimo', type: 'checkbox' },
                { key: 'cur8_multiplier', label: 'Moltiplicatore CUR8', type: 'number', step: '0.1', min: '0' },
                { key: 'total_xp_earned', label: 'XP Totale', type: 'number', step: '0.01', min: '0' },
                { key: 'avatar', label: 'Avatar URL', type: 'text' }
            ],
            'sessions': [
                { key: 'session_id', label: 'Session ID', type: 'text', readonly: true },
                { key: 'user_id', label: 'User ID', type: 'text', required: true },
                { key: 'game_id', label: 'Game ID', type: 'text', required: true },
                { key: 'score', label: 'Score', type: 'number', min: '0' },
                { key: 'xp_earned', label: 'XP Guadagnato', type: 'number', step: '0.01', min: '0' },
                { key: 'duration_seconds', label: 'Durata (secondi)', type: 'number', min: '0' },
                { key: 'ended_at', label: 'Fine', type: 'datetime-local' }
            ],
            'xp-rules': [
                { key: 'rule_id', label: 'Rule ID', type: 'text', readonly: true },
                { key: 'game_id', label: 'Game ID', type: 'text', required: true },
                { key: 'rule_name', label: 'Nome', type: 'text', required: true },
                { key: 'rule_type', label: 'Tipo', type: 'select', options: ['score_multiplier', 'time_bonus', 'threshold', 'achievement'], required: true },
                { key: 'priority', label: 'Priorità', type: 'number', min: '0' },
                { key: 'is_active', label: 'Attivo', type: 'checkbox' },
                { key: 'parameters', label: 'Parametri (JSON)', type: 'textarea', isJSON: true }
            ],
            'leaderboard': [
                { key: 'entry_id', label: 'Entry ID', type: 'text', readonly: true },
                { key: 'user_id', label: 'User ID', type: 'text', required: true },
                { key: 'game_id', label: 'Game ID', type: 'text', required: true },
                { key: 'score', label: 'Score', type: 'number', min: '0', required: true },
                { key: 'rank', label: 'Rank', type: 'number', min: '1' }
            ],
            'quests': [
                { key: 'quest_id', label: 'Quest ID', type: 'number', readonly: true },
                { key: 'title', label: 'Titolo', type: 'text', required: true },
                { key: 'description', label: 'Descrizione', type: 'textarea' },
                { key: 'quest_type', label: 'Tipo', type: 'select', options: ['play_games', 'play_time', 'login', 'score', 'level', 'xp', 'complete_quests'], required: true },
                { key: 'target_value', label: 'Target', type: 'number', min: '0', required: true },
                { key: 'xp_reward', label: 'Ricompensa XP', type: 'number', min: '0', required: true },
                { key: 'sats_reward', label: 'Ricompensa Sats', type: 'number', min: '0' },
                { key: 'is_active', label: 'Attivo', type: 'checkbox' }
            ],
            'user-quests': [
                { key: 'id', label: 'ID', type: 'number', readonly: true },
                { key: 'user_id', label: 'User ID', type: 'text', required: true },
                { key: 'quest_id', label: 'Quest ID', type: 'number', required: true },
                { key: 'current_progress', label: 'Progresso', type: 'number', min: '0' },
                { key: 'is_completed', label: 'Completato', type: 'checkbox' },
                { key: 'is_claimed', label: 'Reclamato', type: 'checkbox' },
                { key: 'completed_at', label: 'Data Completamento', type: 'datetime-local' },
                { key: 'claimed_at', label: 'Data Reclamo', type: 'datetime-local' }
            ]
        };

        return fieldMappings[tableKey] || [];
    }

    /**
     * Generate HTML form for fields
     */
    generateFormHTML(tableKey, fields, mode, data = {}) {
        const formFields = fields.filter(field => {
            // Skip readonly fields in create mode
            return !(mode === 'create' && field.readonly);
        });

        // Separate textarea fields (full width) from regular fields
        const textareaFields = formFields.filter(f => f.type === 'textarea');
        const regularFields = formFields.filter(f => f.type !== 'textarea');

        // Generate regular fields in 2-column grid
        const regularFieldsHTML = regularFields.map(field => {
            const value = data[field.key] || '';
            const disabled = field.readonly && mode === 'edit' ? 'disabled' : '';
            const required = field.required ? 'required' : '';

            let inputHTML = '';

            switch (field.type) {
                case 'checkbox':
                    const checked = value ? 'checked' : '';
                    inputHTML = `<input type="checkbox" name="${field.key}" ${checked} ${disabled}>`;
                    break;

                case 'select':
                    const options = field.options || [];
                    inputHTML = `
                        <select name="${field.key}" ${required} ${disabled}>
                            <option value="">-- Select --</option>
                            ${options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                        </select>
                    `;
                    break;

                case 'datetime-local':
                    const dtValue = value ? new Date(value).toISOString().slice(0, 16) : '';
                    inputHTML = `<input type="datetime-local" name="${field.key}" value="${dtValue}" ${disabled}>`;
                    break;

                default:
                    inputHTML = `<input type="${field.type}" name="${field.key}" value="${value}" 
                        ${required} ${disabled} ${field.min ? `min="${field.min}"` : ''} 
                        ${field.max ? `max="${field.max}"` : ''} ${field.step ? `step="${field.step}"` : ''}>`;
            }

            return `
                <div class="form-group">
                    <label for="${field.key}">${field.label}${field.required ? ' *' : ''}:</label>
                    ${inputHTML}
                </div>
            `;
        }).join('');

        // Generate textarea fields (full width)
        const textareaFieldsHTML = textareaFields.map(field => {
            const value = data[field.key] || '';
            const disabled = field.readonly && mode === 'edit' ? 'disabled' : '';
            const required = field.required ? 'required' : '';
            const displayValue = field.isJSON && value ? JSON.stringify(value, null, 2) : value;

            return `
                <div class="form-group form-group-full">
                    <label for="${field.key}">${field.label}${field.required ? ' *' : ''}:</label>
                    <textarea name="${field.key}" ${required} ${disabled} rows="4">${displayValue}</textarea>
                </div>
            `;
        }).join('');

        return `
            <div class="form-grid">
                ${regularFieldsHTML}
            </div>
            ${textareaFieldsHTML}
        `;
    }

    /**
     * Get ID field name for a table
     */
    getIdField(tableKey) {
        const idFields = {
            'games': 'game_id',
            'users': 'user_id',
            'sessions': 'session_id',
            'leaderboard': 'entry_id',
            'xp-rules': 'rule_id',
            'quests': 'quest_id',
            'user-quests': 'id'
        };
        return idFields[tableKey] || 'id';
    }

    /**
     * Get display value for confirmation
     */
    getDisplayValue(tableKey, item) {
        const idField = this.getIdField(tableKey);
        const displayFields = {
            'games': item.title || item.game_id,
            'users': item.username || item.user_id,
            'sessions': item.session_id ? `Session ${item.session_id.substring(0, 12)}...` : 'Session',
            'leaderboard': `Score ${item.score} - ${item.game_id}`,
            'xp-rules': item.rule_name || item.rule_id,
            'quests': item.title || `Quest #${item.quest_id}`,
            'user-quests': `User Quest #${item.id}`
        };
        return displayFields[tableKey] || String(item[idField] || 'Record');
    }

    /**
     * Get API endpoint for table
     */
    getAPIEndpoint(tableKey) {
        const endpoints = {
            'games': '/admin/games',
            'users': '/admin/users',
            'sessions': '/admin/game-sessions',
            'leaderboard': '/admin/leaderboard-entries',
            'xp-rules': '/admin/xp-rules',
            'quests': '/admin/quests-crud',
            'user-quests': '/admin/user-quests-crud'
        };
        return endpoints[tableKey];
    }

    /**
     * Collect form data
     */
    collectFormData() {
        const form = document.getElementById('crudForm');
        const formData = new FormData(form);
        const data = {};

        // First, handle all checkboxes explicitly (FormData skips unchecked ones)
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            data[checkbox.name] = checkbox.checked;
        });

        // Then handle all other fields
        for (let [key, value] of formData.entries()) {
            const input = form.elements[key];
            
            if (input.type === 'checkbox') {
                // Already handled above
                continue;
            } else if (input.type === 'number') {
                data[key] = value ? parseFloat(value) : 0;
            } else if (input.dataset.json || key === 'parameters') {
                // Parse JSON fields
                try {
                    data[key] = value ? JSON.parse(value) : {};
                } catch (e) {
                    data[key] = {};
                }
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    /**
     * Handle create operation
     */
    async handleCreate(tableKey) {
        try {
            const data = this.collectFormData();
            const endpoint = this.getAPIEndpoint(tableKey);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                closeCRUDModal();
                this.showToast('Record created successfully', 'success');
                await refreshData();
            } else {
                throw new Error(result.detail || result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Create error:', error);
            this.showToast('Error creating record: ' + error.message, 'error');
        }
    }

    /**
     * Handle update operation
     */
    async handleUpdate(tableKey, idValue) {
        try {
            const data = this.collectFormData();
            const endpoint = this.getAPIEndpoint(tableKey);

            const response = await fetch(`${endpoint}/${idValue}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                closeCRUDModal();
                this.showToast('Record updated successfully', 'success');
                await refreshData();
            } else {
                throw new Error(result.detail || result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Update error:', error);
            this.showToast('Error updating record: ' + error.message, 'error');
        }
    }

    /**
     * Handle delete operation
     */
    async handleDelete(tableKey, idValue) {
        try {
            const endpoint = this.getAPIEndpoint(tableKey);

            const response = await fetch(`${endpoint}/${idValue}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                closeCRUDModal();
                this.showToast('Record deleted successfully', 'success');
                await refreshData();
            } else {
                throw new Error(result.detail || result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Error deleting record: ' + error.message, 'error');
        }
    }
}

// Global instance
let crudManager;

// Initialize CRUD manager when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    crudManager = new CRUDManager(CONFIG.API_BASE);
});

// Global functions for UI
function showCreateModal(tableKey) {
    const tableDef = TABLE_DEFINITIONS[tableKey];
    if (crudManager && tableDef) {
        crudManager.showCreateModal(tableKey, tableDef);
    }
}

function showEditModal(tableKey, item) {
    const tableDef = TABLE_DEFINITIONS[tableKey];
    if (crudManager && tableDef) {
        crudManager.showEditModal(tableKey, tableDef, item);
    }
}

function showDeleteModal(tableKey, item) {
    const tableDef = TABLE_DEFINITIONS[tableKey];
    if (crudManager && tableDef) {
        crudManager.showDeleteModal(tableKey, tableDef, item);
    }
}

function closeCRUDModal() {
    const modal = document.getElementById('crudModal');
    if (modal) modal.style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('crudModal');
    if (e.target === modal) {
        closeCRUDModal();
    }
});
