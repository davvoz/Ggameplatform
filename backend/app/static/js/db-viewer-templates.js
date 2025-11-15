/**
 * HTML Template System for Database Viewer
 * All HTML templates are defined here for reusability and scalability
 */

class TemplateEngine {
    static renderStatCard(stat, value) {
        return `
            <div class="stat-card">
                <div class="stat-value" id="${stat.key.replace('total_', 'total')}">${value || '-'}</div>
                <div class="stat-label">${stat.icon || ''} ${stat.label}</div>
            </div>
        `;
    }

    static renderTabButton(tableKey, tableDef, isActive = false) {
        return `
            <button class="tab-btn ${isActive ? 'active' : ''}" 
                    onclick="switchTab('${tableKey}')" 
                    data-tab="${tableKey}">
                ${tableDef.icon || ''} ${tableDef.label}
            </button>
        `;
    }

    static renderTableContainer(tableKey, tableDef) {
        return `
            <div id="${tableKey}Container" class="tab-content ${tableKey === 'games' ? 'active' : ''}">
                <table id="${tableKey}Table" style="display: none;">
                    <thead>
                        <tr>
                            ${tableDef.columns.map(col => `<th>${col.label}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody id="${tableKey}TableBody"></tbody>
                </table>
            </div>
        `;
    }

    static renderTableCell(column, value, item, index) {
        const cell = document.createElement('td');

        // Apply column-level styles
        if (column.style) {
            cell.style.cssText = column.style;
        }
        if (column.width) {
            cell.style.width = column.width;
        }

        switch (column.type) {
            case 'image':
                const rendered = column.render ? column.render(value) : { type: 'image', src: value };
                const img = document.createElement('img');
                img.src = rendered.src;
                if (rendered.style) img.style.cssText = rendered.style;
                img.alt = 'Thumbnail';
                cell.appendChild(img);
                break;

            case 'text':
                cell.textContent = value || '-';
                break;

            case 'number':
                const numValue = parseFloat(value);
                cell.textContent = isNaN(numValue) ? '-' : 
                    (column.decimals !== undefined ? numValue.toFixed(column.decimals) : numValue);
                break;

            case 'date':
                cell.textContent = Utils.formatDate(value);
                break;

            case 'duration':
                cell.textContent = Utils.formatDuration(value);
                break;

            case 'badge':
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.textContent = value || '-';
                cell.appendChild(badge);
                break;

            case 'boolean':
                const span = document.createElement('span');
                span.textContent = value ? (column.trueText || 'Yes') : (column.falseText || 'No');
                span.style.cssText = `color: ${value ? (column.trueColor || '#28a745') : (column.falseColor || '#dc3545')}; font-weight: bold;`;
                cell.appendChild(span);
                break;

            case 'json-preview':
                const preview = JSON.stringify(value).substring(0, column.maxLength || 50);
                cell.textContent = preview + (preview.length === (column.maxLength || 50) ? '...' : '');
                cell.title = JSON.stringify(value, null, 2);
                break;

            case 'rank':
                let rankText = index + 1;
                if (index === 0) rankText = '🥇 1';
                else if (index === 1) rankText = '🥈 2';
                else if (index === 2) rankText = '🥉 3';
                cell.textContent = rankText;
                cell.style.fontWeight = 'bold';
                break;

            case 'actions':
                const btn = document.createElement('button');
                btn.textContent = 'Dettagli';
                btn.className = 'btn-small btn-view';
                btn.onclick = () => {
                    const tableDef = cell.tableDef || { label: 'Item' };
                    if (column.customAction === 'showQuestDetails') {
                        app.showQuestDetails(item);
                    } else {
                        app.showDetails(tableDef.label, item);
                    }
                };
                cell.appendChild(btn);
                break;

            case 'custom':
                if (column.render) {
                    const rendered = column.render(value, item);
                    if (rendered.type === 'text') {
                        cell.textContent = rendered.text;
                        if (rendered.style) cell.style.cssText = rendered.style;
                    } else if (rendered.type === 'html') {
                        cell.innerHTML = rendered.html;
                    }
                } else {
                    cell.textContent = value || '-';
                }
                break;

            default:
                cell.textContent = value || '-';
        }

        return cell;
    }

    static renderDetailModal(title, content) {
        return `
            <div class="modal-header">
                <h2 id="modalTitle">${title}</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body" id="modalBody">${content}</div>
        `;
    }

    static renderQuestDetails(quest) {
        return `
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
    }

    static renderJSONDetails(item) {
        return `<pre style="background:#f5f5f5;padding:16px;border-radius:4px;overflow:auto;max-height:400px;">${JSON.stringify(item, null, 2)}</pre>`;
    }

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

    static renderERDiagramRelationship(fromTable, fromField, toTable, toField, positions) {
        const from = positions[fromTable];
        const to = positions[toTable];
        if (!from || !to) return '';

        const fromTableConfig = TABLE_DEFINITIONS[Object.keys(TABLE_DEFINITIONS).find(k => TABLE_DEFINITIONS[k].name === fromTable)];
        const toTableConfig = TABLE_DEFINITIONS[Object.keys(TABLE_DEFINITIONS).find(k => TABLE_DEFINITIONS[k].name === toTable)];

        if (!fromTableConfig || !toTableConfig) return '';

        const fromX = from.x + 250;
        const fromY = from.y + 40 + (fromTableConfig.fields.findIndex(f => f.name === fromField) * 22) + 11;
        const toX = to.x;
        const toY = to.y + 40 + (toTableConfig.fields.findIndex(f => f.name === toField) * 22) + 11;
        const midX = (fromX + toX) / 2;

        return `<path d="M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}" 
                      class="er-relationship" stroke="#666" stroke-width="2" fill="none" marker-end="url(#arrowhead)"/>`;
    }

    static renderEmptyState(message = 'Nessun record nel database') {
        return `
            <div class="empty-icon">📋</div>
            <h3>${message}</h3>
            <p>I dati verranno visualizzati qui quando disponibili</p>
        `;
    }

    static renderLoading() {
        return 'Caricamento dati in corso...';
    }

    static renderSearchBox(placeholder = 'Cerca...') {
        return `
            <div class="search-box">
                <input type="text" 
                       id="searchInput" 
                       placeholder="${placeholder}">
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

// Utility class for common operations
class Utils {
    static formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleString(CONFIG.DATE_FORMAT.locale, CONFIG.DATE_FORMAT.options);
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
}
