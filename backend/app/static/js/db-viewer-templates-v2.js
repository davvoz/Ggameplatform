/**
 * Enhanced Template System for Database Viewer
 * =============================================
 * Dynamically generates UI components from DB_SCHEMA definitions.
 * 
 * PRINCIPLES:
 * - DRY: Single source of truth from db-schema.js
 * - OCP: Easy to extend without modifying core code
 * - SRP: Each method has a single responsibility
 */

class TemplateEngine {
    // ============ STAT CARDS ============
    
    static renderStatCard(stat, value) {
        return `
            <div class="stat-card" style="border-left: 4px solid ${this.getStatColor(stat)};">
                <div class="stat-value" id="${stat.key.replace('total_', 'total')}">${value || '-'}</div>
                <div class="stat-label">${stat.icon || ''} ${stat.label}</div>
            </div>
        `;
    }
    
    static getStatColor(stat) {
        // Try to get color from schema
        const tableKey = Object.keys(DB_SCHEMA).find(k => 
            DB_SCHEMA[k].dataKey === stat.key.replace('total_', '') ||
            k === stat.key.replace('total_', '')
        );
        return tableKey ? DB_SCHEMA[tableKey].color : '#6c757d';
    }

    // ============ TAB BUTTONS ============
    
    static renderTabButton(tableKey, tableDef, isActive = false) {
        return `
            <button class="tab-btn ${isActive ? 'active' : ''}" 
                    onclick="switchTab('${tableKey}')" 
                    data-tab="${tableKey}"
                    style="--tab-color: ${tableDef.color}">
                ${tableDef.icon || ''} ${tableDef.label}
            </button>
        `;
    }

    // ============ TABLE CONTAINER ============
    
    static renderTableContainer(tableKey, tableDef) {
        const columns = SchemaManager.getTableColumns(tableKey);
        return `
            <div id="${tableKey}Container" class="tab-content ${tableKey === 'games' ? 'active' : ''}">
                <div class="table-header-bar">
                    <div class="table-title">
                        <span class="table-icon">${tableDef.icon}</span>
                        <h3>${tableDef.label}</h3>
                        <span class="record-count" id="${tableKey}Count"></span>
                    </div>
                    <button class="btn-create" onclick="showCreateModal('${tableKey}')">
                        ➕ Nuovo
                    </button>
                </div>
                <div class="table-wrapper">
                    <table id="${tableKey}Table" style="display: none;">
                        <thead>
                            <tr>
                                ${columns.map(col => `<th>${col.label}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody id="${tableKey}TableBody"></tbody>
                    </table>
                </div>
                <div class="empty empty-state" style="display: none;"></div>
                <div class="pagination-controls" style="display: none;"></div>
            </div>
        `;
    }

    // ============ TABLE CELL RENDERING ============
    
    static renderTableCell(column, value, item, index) {
        const cell = document.createElement('td');

        // Apply column-level styles
        if (column.style) {
            cell.style.cssText = column.style;
        }
        if (column.width) {
            cell.style.width = column.width;
        }

        // Handle custom render function first
        if (column.render && typeof column.render === 'function') {
            const rendered = column.render(value, item);
            this.applyRenderedContent(cell, rendered);
            return cell;
        }

        // Handle by type
        switch (column.type) {
            case 'image':
                this.renderImageCell(cell, value, item);
                break;

            case 'text':
                cell.textContent = value ?? '-';
                break;

            case 'number':
                const numValue = parseFloat(value);
                cell.textContent = isNaN(numValue) ? '-' : 
                    (column.decimals !== undefined ? numValue.toFixed(column.decimals) : numValue);
                break;

            case 'date':
            case 'datetime':
                cell.textContent = Utils.formatDate(value);
                break;

            case 'duration':
                cell.textContent = Utils.formatDuration(value);
                break;

            case 'badge':
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.textContent = value ?? '-';
                cell.appendChild(badge);
                break;

            case 'boolean':
                const span = document.createElement('span');
                span.textContent = value ? (column.trueText || '✓') : (column.falseText || '✗');
                span.style.cssText = `color: ${value ? (column.trueColor || '#28a745') : (column.falseColor || '#dc3545')}; font-weight: bold;`;
                cell.appendChild(span);
                break;

            case 'json-preview':
                this.renderJSONPreview(cell, value, column.maxLength || 50);
                break;

            case 'rank':
                this.renderRank(cell, value, index);
                break;

            case 'actions':
                this.renderActions(cell, item, column);
                break;

            case 'custom':
                cell.textContent = value ?? '-';
                break;

            default:
                cell.textContent = value ?? '-';
        }

        return cell;
    }
    
    static applyRenderedContent(cell, rendered) {
        if (!rendered) {
            cell.textContent = '-';
            return;
        }
        
        switch (rendered.type) {
            case 'text':
                cell.textContent = rendered.text ?? '-';
                if (rendered.style) cell.style.cssText = rendered.style;
                break;
                
            case 'badge':
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.textContent = rendered.text ?? '-';
                badge.style.cssText = `background: ${rendered.color || '#6c757d'}; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 0.875rem;`;
                cell.appendChild(badge);
                break;
                
            case 'html':
                cell.innerHTML = rendered.content || rendered.html || '-';
                break;
                
            case 'image':
                const img = document.createElement('img');
                img.src = rendered.src || '';
                if (rendered.style) img.style.cssText = rendered.style;
                img.alt = 'Image';
                img.onerror = () => { img.src = 'https://via.placeholder.com/60x45?text=Error'; };
                cell.appendChild(img);
                break;
                
            default:
                cell.textContent = rendered.text || rendered.content || '-';
        }
    }
    
    static renderImageCell(cell, value, item) {
        const img = document.createElement('img');
        let src = 'https://via.placeholder.com/60x45?text=No+Image';
        
        if (value) {
            if (value.startsWith('http')) {
                src = value;
            } else if (item?.game_id) {
                src = `/games/${item.game_id}/${value}`;
            }
        }
        
        img.src = src;
        img.style.cssText = 'width:60px;height:45px;object-fit:cover;border-radius:4px;border:1px solid #333';
        img.alt = 'Thumbnail';
        img.onerror = () => { img.src = 'https://via.placeholder.com/60x45?text=Error'; };
        cell.appendChild(img);
    }
    
    static renderJSONPreview(cell, value, maxLength) {
        if (value === undefined || value === null) {
            cell.textContent = '-';
            cell.style.color = '#999';
            return;
        }
        
        try {
            const jsonStr = typeof value === 'string' ? value : JSON.stringify(value);
            const preview = jsonStr.substring(0, maxLength);
            cell.textContent = preview + (jsonStr.length > maxLength ? '...' : '');
            cell.title = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
            cell.style.cursor = 'help';
        } catch (e) {
            cell.textContent = String(value || '-');
            cell.style.color = '#999';
        }
    }
    
    static renderRank(cell, value, index) {
        const rank = value ?? (index + 1);
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const medal = medals[rank];
        cell.innerHTML = medal ? `${medal} ${rank}` : `🏅 ${rank}`;
        cell.style.fontWeight = 'bold';
    }
    
    static renderActions(cell, item, column) {
        cell.className = 'actions-cell';
        
        const btnView = document.createElement('button');
        btnView.textContent = 'View';
        btnView.className = 'btn-small btn-view';
        btnView.onclick = () => {
            if (typeof app !== 'undefined') {
                app.showDetails(app.currentView, item);
            }
        };
        
        const btnEdit = document.createElement('button');
        btnEdit.textContent = 'Edit';
        btnEdit.className = 'btn-small btn-edit';
        btnEdit.onclick = () => {
            const tableKey = typeof app !== 'undefined' ? app.currentView : '';
            showEditModal(tableKey, item);
        };
        
        const btnDelete = document.createElement('button');
        btnDelete.textContent = 'Delete';
        btnDelete.className = 'btn-small btn-delete';
        btnDelete.onclick = () => {
            const tableKey = typeof app !== 'undefined' ? app.currentView : '';
            showDeleteModal(tableKey, item);
        };
        
        cell.appendChild(btnView);
        cell.appendChild(btnEdit);
        cell.appendChild(btnDelete);
    }

    // ============ DETAIL MODAL - DYNAMIC FROM SCHEMA ============
    
    static renderDetailModal(title, content) {
        return `
            <div class="modal-header">
                <h2 id="modalTitle">${title}</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body" id="modalBody">${content}</div>
        `;
    }
    
    /**
     * Dynamically render details from schema definition
     * No more per-table methods needed!
     */
    static renderDetails(tableKey, item) {
        const schema = DB_SCHEMA[tableKey];
        if (!schema) {
            return this.renderJSONDetails(item);
        }
        
        const fields = schema.fields;
        const primaryKey = schema.primaryKey;
        const color = schema.color || '#6c757d';
        
        // Group fields by category
        const mainFields = [];
        const detailFields = [];
        const jsonFields = [];
        const timestampFields = [];
        
        Object.entries(fields).forEach(([key, def]) => {
            if (def.hidden) return;
            
            const value = item[key];
            const fieldData = { key, def, value };
            
            if (def.type === 'JSON') {
                jsonFields.push(fieldData);
            } else if (key.includes('created_at') || key.includes('updated_at') || def.autoSet) {
                timestampFields.push(fieldData);
            } else if (def.pk || key === primaryKey || this.isImportantField(key, def)) {
                mainFields.push(fieldData);
            } else {
                detailFields.push(fieldData);
            }
        });
        
        let html = `<div class="detail-view" style="--accent-color: ${color};">`;
        
        // Header section with primary key
        html += this.renderDetailHeader(schema, item, primaryKey, color);
        
        // Main fields grid
        if (mainFields.length > 0) {
            html += `<div class="detail-section">
                <div class="detail-grid">
                    ${mainFields.map(f => this.renderDetailField(f, color)).join('')}
                </div>
            </div>`;
        }
        
        // Detail fields grid
        if (detailFields.length > 0) {
            html += `<div class="detail-section">
                <h4 class="section-title">📋 Dettagli</h4>
                <div class="detail-grid">
                    ${detailFields.map(f => this.renderDetailField(f, color)).join('')}
                </div>
            </div>`;
        }
        
        // JSON fields
        if (jsonFields.length > 0) {
            html += `<div class="detail-section">
                <h4 class="section-title">📦 Dati Aggiuntivi</h4>
                ${jsonFields.map(f => this.renderJSONField(f, color)).join('')}
            </div>`;
        }
        
        // Timestamps
        if (timestampFields.length > 0) {
            html += `<div class="detail-section timestamp-section">
                <div class="timestamp-grid">
                    ${timestampFields.map(f => this.renderTimestampField(f)).join('')}
                </div>
            </div>`;
        }
        
        html += '</div>';
        return html;
    }
    
    static renderDetailHeader(schema, item, primaryKey, color) {
        const pkValue = item[primaryKey];
        const displayValue = this.getDisplayValue(schema, item);
        
        return `
            <div class="detail-header" style="border-left: 4px solid ${color}; background: linear-gradient(135deg, ${color}15 0%, transparent 100%);">
                <div class="detail-icon">${schema.icon}</div>
                <div class="detail-header-info">
                    <h3 class="detail-title">${Utils.escapeHtml(displayValue)}</h3>
                    <code class="detail-id">${primaryKey}: ${pkValue}</code>
                </div>
            </div>
        `;
    }
    
    static getDisplayValue(schema, item) {
        // Try common display fields
        const displayFields = ['title', 'name', 'username', 'status_name', 'rule_name'];
        for (const field of displayFields) {
            if (item[field]) return item[field];
        }
        return item[schema.primaryKey] || 'Record';
    }
    
    static isImportantField(key, def) {
        const importantPatterns = ['title', 'name', 'username', 'score', 'xp', 'reward', 'type', 'status', 'is_active', 'balance'];
        return importantPatterns.some(p => key.toLowerCase().includes(p)) || def.required;
    }
    
    static renderDetailField(fieldData, color) {
        const { key, def, value } = fieldData;
        const formattedValue = this.formatFieldValue(value, def);
        
        return `
            <div class="detail-field">
                <label class="field-label">${def.label || key}</label>
                <div class="field-value">${formattedValue}</div>
            </div>
        `;
    }
    
    static formatFieldValue(value, def) {
        if (value === null || value === undefined) return '<span class="empty-value">-</span>';
        
        switch (def.type) {
            case 'BOOLEAN':
                return value 
                    ? '<span class="status-badge success">✓ Sì</span>'
                    : '<span class="status-badge danger">✗ No</span>';
                    
            case 'INTEGER':
            case 'FLOAT':
                const numVal = parseFloat(value);
                if (def.label?.toLowerCase().includes('xp')) {
                    return `<span class="value-highlight success">⭐ ${numVal.toFixed(def.type === 'FLOAT' ? 2 : 0)}</span>`;
                }
                if (def.label?.toLowerCase().includes('coin') || def.label?.toLowerCase().includes('balance')) {
                    return `<span class="value-highlight gold">🪙 ${numVal}</span>`;
                }
                if (def.label?.toLowerCase().includes('steem')) {
                    return `<span class="value-highlight primary">${numVal} STEEM</span>`;
                }
                return `<span class="value-number">${numVal.toFixed(def.type === 'FLOAT' ? 2 : 0)}</span>`;
                
            case 'DATETIME':
            case 'DATE':
                return Utils.formatDate(value) || '-';
                
            case 'STRING':
                if (def.fk) {
                    return `<code class="fk-value">${Utils.escapeHtml(String(value))}</code>`;
                }
                return Utils.escapeHtml(String(value));
                
            default:
                return Utils.escapeHtml(String(value));
        }
    }
    
    static renderJSONField(fieldData, color) {
        const { key, def, value } = fieldData;
        
        let jsonStr = '-';
        let isEmpty = true;
        
        if (value !== null && value !== undefined) {
            try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                jsonStr = JSON.stringify(parsed, null, 2);
                isEmpty = Object.keys(parsed).length === 0 || (Array.isArray(parsed) && parsed.length === 0);
            } catch (e) {
                jsonStr = String(value);
                isEmpty = !value;
            }
        }
        
        if (isEmpty) {
            return `
                <div class="json-field empty">
                    <label class="field-label">${def.label || key}</label>
                    <div class="json-empty">Nessun dato</div>
                </div>
            `;
        }
        
        return `
            <div class="json-field">
                <label class="field-label">${def.label || key}</label>
                <pre class="json-content" style="border-left: 3px solid ${color};">${Utils.escapeHtml(jsonStr)}</pre>
            </div>
        `;
    }
    
    static renderTimestampField(fieldData) {
        const { key, def, value } = fieldData;
        const icon = key.includes('created') ? '📅' : '🔄';
        
        return `
            <div class="timestamp-field">
                <span class="timestamp-icon">${icon}</span>
                <span class="timestamp-label">${def.label || key}:</span>
                <span class="timestamp-value">${Utils.formatDate(value) || '-'}</span>
            </div>
        `;
    }

    // ============ LEGACY SUPPORT - SPECIFIC DETAIL RENDERERS ============
    // These are kept for backward compatibility but now delegate to renderDetails
    
    static renderQuestDetails(quest) {
        return this.renderDetails('quests', quest);
    }

    static renderGameDetails(game) {
        return this.renderDetails('games', game);
    }

    static renderUserDetails(user) {
        return this.renderDetails('users', user);
    }

    static renderSessionDetails(session) {
        return this.renderDetails('game_sessions', session);
    }

    static renderXPRuleDetails(rule) {
        return this.renderDetails('xp_rules', rule);
    }

    static renderLeaderboardDetails(entry) {
        return this.renderDetails('leaderboards', entry);
    }

    static renderUserQuestDetails(userQuest) {
        return this.renderDetails('user_quests', userQuest);
    }

    static renderGameStatusDetails(status) {
        return this.renderDetails('game_statuses', status);
    }

    static renderJSONDetails(item) {
        return `<pre class="json-fallback">${JSON.stringify(item, null, 2)}</pre>`;
    }

    // ============ ER DIAGRAM ============
    
    static renderERDiagramTable(table, showTypes = true) {
        const tableConfig = table.config;
        const pos = { x: table.x, y: table.y };
        const width = 250;
        const headerHeight = 40;
        const rowHeight = showTypes ? 24 : 20;
        const height = headerHeight + (tableConfig.fields.length * rowHeight);

        return `
            <g class="er-table" data-table="${tableConfig.name}" transform="translate(${pos.x}, ${pos.y})" style="cursor:move">
                <rect width="${width}" height="${height}" fill="#fff" stroke="${tableConfig.erDiagram.color}" stroke-width="2" rx="8" 
                      style="filter:drop-shadow(0 2px 8px rgba(0,0,0,0.1))"/>
                <rect width="${width}" height="${headerHeight}" fill="${tableConfig.erDiagram.color}" rx="8"/>
                <rect width="${width}" height="8" y="${headerHeight - 8}" fill="${tableConfig.erDiagram.color}"/>
                <text x="${width/2}" y="${headerHeight/2 + 5}" text-anchor="middle" fill="#fff" font-weight="bold" font-size="16">
                    ${tableConfig.icon || ''} ${tableConfig.name}
                </text>
                ${tableConfig.fields.map((field, i) => {
                    const y = headerHeight + (i * rowHeight);
                    const bg = i % 2 === 1 ? `<rect x="0" y="${y}" width="${width}" height="${rowHeight}" fill="#f9f9f9"/>` : '';
                    const icon = field.pk ? '🔑 ' : (field.fk ? '🔗 ' : '');
                    return `
                        ${bg}
                        <text x="10" y="${y + rowHeight/2 + 4}" font-size="12" fill="#333">${icon}${field.name}</text>
                        ${showTypes ? `<text x="${width - 10}" y="${y + rowHeight/2 + 4}" text-anchor="end" font-size="10" fill="#999">${field.type}</text>` : ''}
                    `;
                }).join('')}
            </g>
        `;
    }

    static renderERDiagramRelationship(fromTable, fromField, toTable, toField, positions) {
        const from = positions[fromTable];
        const to = positions[toTable];
        if (!from || !to) return '';

        const fromConfig = from.config;
        const toConfig = to.config;

        if (!fromConfig || !toConfig) return '';

        const fromX = from.x + 250;
        const fromFieldIndex = fromConfig.fields.findIndex(f => f.name === fromField);
        const fromY = from.y + 40 + (fromFieldIndex * 22) + 11;
        
        const toX = to.x;
        const toFieldIndex = toConfig.fields.findIndex(f => f.name === toField);
        const toY = to.y + 40 + (toFieldIndex * 22) + 11;
        
        const midX = (fromX + toX) / 2;

        return `<path d="M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}" 
                      class="er-relationship" stroke="#666" stroke-width="2" fill="none" marker-end="url(#arrowhead)"/>`;
    }

    // ============ UTILITY RENDERS ============
    
    static renderEmptyState(message = 'Nessun record nel database') {
        return `
            <div class="empty-icon">📋</div>
            <h3>${message}</h3>
            <p>I dati verranno visualizzati qui quando disponibili</p>
        `;
    }

    static renderLoading() {
        return `
            <div class="loading-spinner"></div>
            <p>Caricamento dati in corso...</p>
        `;
    }

    static renderSearchBox(placeholder = 'Cerca...') {
        return `
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input type="text" 
                       id="searchInput" 
                       placeholder="${placeholder}"
                       autocomplete="off">
            </div>
        `;
    }

    static renderButton(text, onclick, className = '', icon = '') {
        return `
            <button onclick="${onclick}" class="${className}">
                ${icon} ${text}
            </button>
        `;
    }
}

// ============ UTILITY CLASS ============

class Utils {
    static formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleString(CONFIG?.DATE_FORMAT?.locale || 'it-IT', 
            CONFIG?.DATE_FORMAT?.options || {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }
        );
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
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
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

    static downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    static downloadCSV(data, filename, headers) {
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.TemplateEngine = TemplateEngine;
    window.Utils = Utils;
}
