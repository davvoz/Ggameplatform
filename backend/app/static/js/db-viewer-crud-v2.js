/**
 * Enhanced CRUD Manager for Database Viewer
 * ==========================================
 * Dynamically generates CRUD forms from DB_SCHEMA definitions.
 * 
 * PRINCIPLES:
 * - DRY: Forms generated from schema - add table to schema, get CRUD for free
 * - OCP: Extensible via schema without modifying core code
 * - SRP: Each method handles one operation
 */

class CRUDManager {
    constructor(apiBase) {
        this.apiBase = apiBase;
        this.formOptions = {};
        this.loadFormOptions();
    }

    // ============ INITIALIZATION ============

    async loadFormOptions() {
        try {
            const response = await fetch(`${this.apiBase}/form-options`);
            if (response.ok) {
                this.formOptions = await response.json();
            }
        } catch (error) {

            // Fallback: generate from schema
            this.formOptions = this.generateFormOptionsFromSchema();
        }
    }
    
    generateFormOptionsFromSchema() {
        const options = {};
        
        Object.entries(DB_SCHEMA).forEach(([tableKey, schema]) => {
            // Generate options for FK dropdowns
            Object.entries(schema.foreignKeys || {}).forEach(([fieldName, fkDef]) => {
                const targetTable = fkDef.table;
                options[`${tableKey}_${fieldName}`] = {
                    source: targetTable,
                    labelField: this.getDisplayField(targetTable),
                    valueField: fkDef.field
                };
            });
        });
        
        return options;
    }
    
    getDisplayField(tableKey) {
        const displayFields = ['title', 'name', 'username', 'status_name', 'rule_name'];
        const schema = DB_SCHEMA[tableKey];
        if (!schema) return 'id';
        
        for (const field of displayFields) {
            if (schema.fields[field]) return field;
        }
        return schema.primaryKey;
    }

    // ============ TOAST NOTIFICATIONS ============

    showToast(message, type = 'success') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || '•'}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ============ CREATE MODAL ============

    showCreateModal(tableKey) {
        const schema = DB_SCHEMA[tableKey];
        if (!schema) {
            this.showToast('Schema non trovato', 'error');
            return;
        }

        const modal = document.getElementById('crudModal');
        const modalContent = modal.querySelector('.modal-content');

        const formHTML = this.generateFormHTML(tableKey, schema, 'create');

        modalContent.innerHTML = `
            <div class="modal-header" style="border-bottom-color: ${schema.color};">
                <div class="modal-title-group">
                    <span class="modal-icon">${schema.icon}</span>
                    <h2>Nuovo ${schema.label}</h2>
                </div>
                <button class="modal-close" onclick="closeCRUDModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="crudForm" onsubmit="event.preventDefault(); crudManager.handleCreate('${tableKey}')">
                    ${formHTML}
                    <div class="form-actions">
                        <button type="submit" class="btn-primary" style="background: ${schema.color};">
                            ➕ Crea
                        </button>
                        <button type="button" class="btn-secondary" onclick="closeCRUDModal()">
                            Annulla
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.openModal();
    }

    // ============ EDIT MODAL ============

    showEditModal(tableKey, item) {
        const schema = DB_SCHEMA[tableKey];
        if (!schema) {
            this.showToast('Schema non trovato', 'error');
            return;
        }

        const modal = document.getElementById('crudModal');
        const modalContent = modal.querySelector('.modal-content');

        const formHTML = this.generateFormHTML(tableKey, schema, 'edit', item);
        const pkValue = item[schema.primaryKey];

        modalContent.innerHTML = `
            <div class="modal-header" style="border-bottom-color: ${schema.color};">
                <div class="modal-title-group">
                    <span class="modal-icon">${schema.icon}</span>
                    <h2>Modifica ${schema.label}</h2>
                </div>
                <button class="modal-close" onclick="closeCRUDModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="crudForm" onsubmit="event.preventDefault(); crudManager.handleUpdate('${tableKey}', '${pkValue}')">
                    ${formHTML}
                    <div class="form-actions">
                        <button type="submit" class="btn-primary" style="background: ${schema.color};">
                            💾 Salva
                        </button>
                        <button type="button" class="btn-secondary" onclick="closeCRUDModal()">
                            Annulla
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.openModal();
    }

    // ============ DELETE MODAL ============

    showDeleteModal(tableKey, item) {
        const schema = DB_SCHEMA[tableKey];
        if (!schema) {
            this.showToast('Schema non trovato', 'error');
            return;
        }

        const pkValue = item[schema.primaryKey];
        const displayValue = this.getItemDisplayValue(schema, item);

        const modal = document.getElementById('crudModal');
        const modalContent = modal.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div class="modal-header delete-header">
                <div class="modal-title-group">
                    <span class="modal-icon">⚠️</span>
                    <h2>Elimina ${schema.label}</h2>
                </div>
                <button class="modal-close" onclick="closeCRUDModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="delete-confirmation">
                    <div class="delete-icon-container">
                        <div class="delete-icon-bg">
                            <span class="delete-icon">🗑️</span>
                        </div>
                    </div>
                    <p class="delete-message">Sei sicuro di voler eliminare questo record?</p>
                    <div class="delete-item-info">
                        <span class="item-icon">${schema.icon}</span>
                        <span class="item-name">${Utils.escapeHtml(displayValue)}</span>
                    </div>
                    <p class="delete-warning">⚠️ Questa azione non può essere annullata.</p>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-danger" onclick="crudManager.handleDelete('${tableKey}', '${pkValue}')">
                        🗑️ Elimina
                    </button>
                    <button type="button" class="btn-secondary" onclick="closeCRUDModal()">
                        Annulla
                    </button>
                </div>
            </div>
        `;

        this.openModal();
    }

    // Helper per aprire modal in modo pulito
    openModal() {
        // Chiudi tutte le altre modal prima
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        
        const modal = document.getElementById('crudModal');
        modal.style.display = 'flex';
        
        // Focus primo input dopo un attimo
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([readonly]), select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    // ============ FORM GENERATION ============

    generateFormHTML(tableKey, schema, mode, data = {}) {
        const fields = schema.fields;
        let html = '<div class="form-grid">';
        
        // Group fields
        const primaryFields = [];
        const regularFields = [];
        const jsonFields = [];
        const timestampFields = [];
        
        Object.entries(fields).forEach(([fieldName, fieldDef]) => {
            // Skip hidden fields
            if (fieldDef.hidden) return;
            
            // Skip auto-generated timestamps in create mode
            if (mode === 'create' && fieldDef.autoSet) return;
            
            const fieldData = { name: fieldName, ...fieldDef };
            
            if (fieldDef.pk) {
                primaryFields.push(fieldData);
            } else if (fieldDef.type === 'JSON') {
                jsonFields.push(fieldData);
            } else if (fieldDef.autoSet || fieldName.includes('_at')) {
                timestampFields.push(fieldData);
            } else {
                regularFields.push(fieldData);
            }
        });
        
        // Primary key fields (readonly in edit mode)
        primaryFields.forEach(field => {
            html += this.renderFormField(field, mode, data, schema);
        });
        
        // Regular fields
        regularFields.forEach(field => {
            html += this.renderFormField(field, mode, data, schema);
        });
        
        html += '</div>';
        
        // JSON fields (full width)
        if (jsonFields.length > 0) {
            html += '<div class="form-section-title">📦 Dati JSON</div>';
            jsonFields.forEach(field => {
                html += this.renderFormField(field, mode, data, schema, true);
            });
        }
        
        // Timestamp fields (readonly, edit mode only)
        if (mode === 'edit' && timestampFields.length > 0) {
            html += '<div class="form-section-title">📅 Timestamps</div>';
            html += '<div class="form-grid timestamps">';
            timestampFields.forEach(field => {
                html += this.renderFormField(field, mode, data, schema);
            });
            html += '</div>';
        }
        
        return html;
    }

    renderFormField(field, mode, data, schema, fullWidth = false) {
        const value = data[field.name] ?? field.default ?? '';
        const isReadonly = field.readonly || (mode === 'edit' && field.pk);
        const isRequired = field.required && !isReadonly;
        const isForeignKey = !!schema.foreignKeys?.[field.name];
        
        let inputHTML = '';
        const widthClass = fullWidth ? 'full-width' : '';
        
        // Determine input type
        if (isForeignKey) {
            inputHTML = this.renderSelectField(field, value, schema, isReadonly);
        } else {
            switch (field.type) {
                case 'TEXT':
                    inputHTML = `<textarea 
                        id="field_${field.name}" 
                        name="${field.name}" 
                        rows="3"
                        ${isReadonly ? 'readonly' : ''}
                        ${isRequired ? 'required' : ''}
                        placeholder="Inserisci ${field.label || field.name}..."
                    >${Utils.escapeHtml(String(value || ''))}</textarea>`;
                    break;
                    
                case 'JSON':
                    const jsonValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
                    inputHTML = `<textarea 
                        id="field_${field.name}" 
                        name="${field.name}" 
                        rows="5"
                        class="json-input"
                        ${isReadonly ? 'readonly' : ''}
                        placeholder='{"key": "value"}'
                    >${Utils.escapeHtml(String(jsonValue || '{}'))}</textarea>`;
                    break;
                    
                case 'BOOLEAN':
                    const checked = Boolean(value);
                    inputHTML = `
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" 
                                id="field_${field.name}" 
                                name="${field.name}" 
                                ${checked ? 'checked' : ''}
                                ${isReadonly ? 'disabled' : ''}
                                style="width: 18px; height: 18px; cursor: pointer;">
                            <span>${checked ? 'Sì' : 'No'}</span>
                        </label>`;
                    break;
                    
                case 'INTEGER':
                    inputHTML = `<input type="number" 
                        id="field_${field.name}" 
                        name="${field.name}" 
                        value="${value}" 
                        step="1"
                        ${isReadonly ? 'readonly' : ''}
                        ${isRequired ? 'required' : ''}>`;
                    break;
                    
                case 'FLOAT':
                    inputHTML = `<input type="number" 
                        id="field_${field.name}" 
                        name="${field.name}" 
                        value="${value}" 
                        step="0.01"
                        ${isReadonly ? 'readonly' : ''}
                        ${isRequired ? 'required' : ''}>`;
                    break;
                    
                case 'DATETIME':
                case 'DATE':
                    let dateValue = value;
                    if (value && !isReadonly) {
                        try {
                            dateValue = new Date(value).toISOString().slice(0, 16);
                        } catch (e) {
                            dateValue = value;
                        }
                    }
                    inputHTML = `<input type="${isReadonly ? 'text' : 'datetime-local'}" 
                        id="field_${field.name}" 
                        name="${field.name}" 
                        value="${dateValue || ''}" 
                        ${isReadonly ? 'readonly' : ''}
                        ${isRequired ? 'required' : ''}>`;
                    break;
                    
                default: // STRING
                    inputHTML = `<input type="text" 
                        id="field_${field.name}" 
                        name="${field.name}" 
                        value="${Utils.escapeHtml(String(value || ''))}" 
                        ${isReadonly ? 'readonly' : ''}
                        ${isRequired ? 'required' : ''}
                        placeholder="Inserisci ${field.label || field.name}...">`;
            }
        }
        
        const requiredBadge = isRequired ? '<span class="required-badge">*</span>' : '';
        const fkBadge = isForeignKey ? '<span class="fk-badge">🔗</span>' : '';
        const pkBadge = field.pk ? '<span class="pk-badge">🔑</span>' : '';
        
        return `
            <div class="form-group ${widthClass} ${isReadonly ? 'readonly' : ''}">
                <label for="field_${field.name}">
                    ${pkBadge}${fkBadge}${field.label || field.name}${requiredBadge}
                </label>
                ${inputHTML}
            </div>
        `;
    }

    renderSelectField(field, value, schema, isReadonly) {
        const fkDef = schema.foreignKeys[field.name];
        const targetTable = fkDef.table;
        const targetSchema = DB_SCHEMA[targetTable];
        
        // Get display field for target table
        const displayField = this.getDisplayField(targetTable);
        const valueField = fkDef.field;
        
        // Get options from loaded data (AppState)
        const options = this.getForeignKeyOptions(targetTable, valueField, displayField);
        
        let optionsHTML = `<option value="">-- Seleziona ${targetSchema?.label || targetTable} --</option>`;
        options.forEach(opt => {
            const selected = String(opt.value) === String(value) ? 'selected' : '';
            optionsHTML += `<option value="${Utils.escapeHtml(String(opt.value))}" ${selected}>${Utils.escapeHtml(opt.label)}</option>`;
        });
        
        return `
            <select 
                id="field_${field.name}" 
                name="${field.name}" 
                ${isReadonly ? 'disabled' : ''}
                style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                ${optionsHTML}
            </select>
            <small style="color: #666; font-size: 11px;">🔗 FK → ${targetTable}.${valueField}</small>`;
    }
    
    getForeignKeyOptions(targetTable, valueField, displayField) {
        // Try to get data from AppState (global)
        if (typeof AppState !== 'undefined' && AppState.data) {
            const targetSchema = DB_SCHEMA[targetTable];
            const dataKey = targetSchema?.dataKey || targetTable;
            const items = AppState.data[dataKey] || [];
            
            return items.map(item => ({
                value: item[valueField],
                label: item[displayField] || item[valueField] || 'N/A'
            }));
        }
        return [];
    }

    // ============ DATA COLLECTION ============

    collectFormData() {
        const form = document.getElementById('crudForm');
        if (!form) return {};
        
        const formData = {};
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            if (!input.name) return;
            
            let value;
            
            if (input.type === 'checkbox') {
                value = input.checked ? 1 : 0;
            } else if (input.classList.contains('json-input')) {
                try {
                    value = JSON.parse(input.value || '{}');
                } catch (e) {
                    value = input.value;
                }
            } else if (input.type === 'number') {
                value = input.value ? parseFloat(input.value) : null;
            } else {
                value = input.value;
            }
            
            // Skip readonly fields
            if (input.readOnly || input.disabled) return;
            
            formData[input.name] = value;
        });
        
        return formData;
    }

    // ============ API OPERATIONS ============

    async handleCreate(tableKey) {
        const schema = DB_SCHEMA[tableKey];
        if (!schema) return;

        const data = this.collectFormData();
        
        // Add timestamps
        const now = new Date().toISOString();
        if (schema.fields.created_at) {
            data.created_at = now;
        }
        if (schema.fields.updated_at) {
            data.updated_at = now;
        }
        
        // Generate ID if needed and not provided
        const pkField = schema.primaryKey;
        if (schema.fields[pkField]?.type === 'STRING' && !data[pkField]) {
            data[pkField] = Utils.generateUUID();
        }

        try {
            const endpoint = this.getAPIEndpoint(tableKey);
            const response = await fetch(`${this.apiBase}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Errore nella creazione');
            }

            this.showToast(`${schema.label} creato con successo!`, 'success');
            closeCRUDModal();
            
            // Refresh data
            if (typeof refreshData === 'function') {
                await refreshData();
            }
        } catch (error) {
            console.error('Create error:', error);
            this.showToast(`Errore: ${error.message}`, 'error');
        }
    }

    async handleUpdate(tableKey, pkValue) {
        const schema = DB_SCHEMA[tableKey];
        if (!schema) return;

        const data = this.collectFormData();
        
        // Update timestamp
        if (schema.fields.updated_at) {
            data.updated_at = new Date().toISOString();
        }

        try {
            const endpoint = this.getAPIEndpoint(tableKey);
            const response = await fetch(`${this.apiBase}/${endpoint}/${pkValue}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Errore nell\'aggiornamento');
            }

            this.showToast(`${schema.label} aggiornato con successo!`, 'success');
            closeCRUDModal();
            
            // Refresh data
            if (typeof refreshData === 'function') {
                await refreshData();
            }
        } catch (error) {
            console.error('Update error:', error);
            this.showToast(`Errore: ${error.message}`, 'error');
        }
    }

    async handleDelete(tableKey, pkValue) {
        const schema = DB_SCHEMA[tableKey];
        if (!schema) return;

        try {
            const endpoint = this.getAPIEndpoint(tableKey);
            const response = await fetch(`${this.apiBase}/${endpoint}/${pkValue}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Errore nell\'eliminazione');
            }

            this.showToast(`${schema.label} eliminato con successo!`, 'success');
            closeCRUDModal();
            
            // Refresh data
            if (typeof refreshData === 'function') {
                await refreshData();
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast(`Errore: ${error.message}`, 'error');
        }
    }

    // ============ UTILITIES ============

    getAPIEndpoint(tableKey) {
        const schema = DB_SCHEMA[tableKey];
        return schema?.apiEndpoint || tableKey;
    }

    getItemDisplayValue(schema, item) {
        const displayFields = ['title', 'name', 'username', 'status_name', 'rule_name'];
        
        for (const field of displayFields) {
            if (item[field]) return item[field];
        }
        
        return item[schema.primaryKey] || 'Record';
    }
}

// ============ GLOBAL INSTANCE & FUNCTIONS ============

let crudManager;

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    crudManager = new CRUDManager(CONFIG?.API_BASE || '/admin');
});

// Global functions for onclick handlers
function showCreateModal(tableKey) {
    if (crudManager) {
        crudManager.showCreateModal(tableKey);
    }
}

function showEditModal(tableKey, item) {
    if (crudManager) {
        crudManager.showEditModal(tableKey, item);
    }
}

function showDeleteModal(tableKey, item) {
    if (crudManager) {
        crudManager.showDeleteModal(tableKey, item);
    }
}

function closeCRUDModal() {
    const modal = document.getElementById('crudModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Export
if (typeof window !== 'undefined') {
    window.CRUDManager = CRUDManager;
    window.crudManager = crudManager;
}
