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
                const rendered = column.render ? column.render(value, item) : { type: 'image', src: value };
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
        const isActive = quest.is_active;
        return `
            <div style="line-height:1.8">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px">
                    <div><strong style="color:#6c757d">ID:</strong><br>${quest.quest_id}</div>
                    <div><strong style="color:#6c757d">Tipo:</strong><br><code>${quest.quest_type}</code></div>
                    <div><strong style="color:#6c757d">Target:</strong><br><span style="font-size:1.2em;font-weight:bold;color:#007bff">${quest.target_value}</span></div>
                    <div><strong style="color:#6c757d">Stato:</strong><br><span style="color:${isActive ? '#28a745' : '#dc3545'};font-weight:600;font-size:1.1em">${isActive ? '✓ Attiva' : '✗ Inattiva'}</span></div>
                    <div><strong style="color:#6c757d">Game:</strong><br>${quest.game_id || '<em>Platform-wide</em>'}</div>
                </div>
                <div style="background:linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);padding:20px;border-radius:12px;margin-bottom:20px">
                    <h4 style="margin:0 0 16px 0;color:#1a1a1a;display:flex;align-items:center;gap:8px">🎁 Ricompense</h4>
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px">
                        <div style="background:#fff;padding:16px;border-radius:8px;text-align:center;border:2px solid #28a745">
                            <div style="font-size:2.5em;margin-bottom:8px">⭐</div>
                            <div style="font-size:1.8em;font-weight:bold;color:#28a745">${quest.xp_reward}</div>
                            <div style="color:#6c757d;font-size:0.9em;margin-top:4px">XP Points</div>
                        </div>
                        ${quest.sats_reward > 0 ? `
                        <div style="background:#fff;padding:16px;border-radius:8px;text-align:center;border:2px solid #ffc107">
                            <div style="font-size:2.5em;margin-bottom:8px">💰</div>
                            <div style="font-size:1.8em;font-weight:bold;color:#ffc107">${quest.sats_reward}</div>
                            <div style="color:#6c757d;font-size:0.9em;margin-top:4px">Satoshi</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ${quest.description ? `<div style="margin-top:16px"><strong style="color:#6c757d">Descrizione:</strong><p style="background:#fff;padding:16px;border-radius:4px;border-left:4px solid #007bff">${Utils.escapeHtml(quest.description)}</p></div>` : ''}
            </div>
        `;
    }

    static renderGameDetails(game) {
        return `
            <div style="line-height:1.8">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px">
                    <div><strong style="color:#6c757d">ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">${game.game_id}</code></div>
                    <div><strong style="color:#6c757d">Titolo:</strong><br><span style="font-size:1.1em;font-weight:600;color:#1a1a1a">${Utils.escapeHtml(game.title)}</span></div>
                    <div><strong style="color:#6c757d">Autore:</strong><br>${Utils.escapeHtml(game.author || '-')}</div>
                    <div><strong style="color:#6c757d">Versione:</strong><br><span style="color:#2563eb">${game.version}</span></div>
                    <div><strong style="color:#6c757d">Categoria:</strong><br><span class="badge" style="background:#e0f2fe;color:#0284c7;padding:4px 12px;border-radius:6px;font-size:0.875rem">${game.category}</span></div>
                    <div><strong style="color:#6c757d">Play Count:</strong><br><span style="font-size:1.2em;font-weight:bold;color:#2563eb">${game.metadata?.playCount || 0}</span></div>
                    <div style="grid-column:1/-1"><strong style="color:#6c757d">Thumbnail:</strong><br><img src="${game.thumbnail || 'https://via.placeholder.com/300x200'}" style="max-width:300px;border-radius:8px;border:1px solid #e5e5e5;margin-top:8px" alt="Game thumbnail"></div>
                </div>
                ${game.description ? `<div style="margin-top:16px"><strong style="color:#6c757d">Descrizione:</strong><p style="background:#f9fafb;padding:16px;border-radius:8px;border-left:4px solid #4CAF50;color:#404040;line-height:1.6">${Utils.escapeHtml(game.description)}</p></div>` : ''}
                ${game.metadata ? `<div style="margin-top:16px"><strong style="color:#6c757d">Metadata:</strong><pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow:auto;max-height:200px;font-size:0.875rem">${JSON.stringify(game.metadata, null, 2)}</pre></div>` : ''}
            </div>
        `;
    }

    static renderUserDetails(user) {
        return `
            <div style="line-height:1.8">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px">
                    <div><strong style="color:#6c757d">User ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">${user.user_id}</code></div>
                    <div><strong style="color:#6c757d">Username:</strong><br><span style="font-size:1.1em;font-weight:600;color:#1a1a1a">${Utils.escapeHtml(user.username)}</span></div>
                    <div><strong style="color:#6c757d">Email:</strong><br>${Utils.escapeHtml(user.email || '-')}</div>
                    <div><strong style="color:#6c757d">Steem Username:</strong><br>${Utils.escapeHtml(user.steem_username || '-')}</div>
                    <div><strong style="color:#6c757d">Tipo Account:</strong><br><span style="color:${user.is_anonymous ? '#ff9800' : '#4caf50'};font-weight:600">${user.is_anonymous ? '🔓 Anonimo' : '🔐 Registrato'}</span></div>
                    <div><strong style="color:#6c757d">XP Totale:</strong><br><span style="font-size:1.2em;font-weight:bold;color:#28a745">${parseFloat(user.total_xp_earned || 0).toFixed(2)}</span></div>
                    <div><strong style="color:#6c757d">Moltiplicatore CUR8:</strong><br><span style="font-size:1.2em;font-weight:bold;color:#9c27b0">${(user.cur8_multiplier || 1.0).toFixed(1)}x</span></div>
                    <div><strong style="color:#6c757d">Data Registrazione:</strong><br>${Utils.formatDate(user.created_at)}</div>
                </div>
            </div>
        `;
    }

    static renderSessionDetails(session) {
        const isOpen = !session.ended_at;
        return `
            <div style="line-height:1.8">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px">
                    <div><strong style="color:#6c757d">Session ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px;font-size:0.85em">${session.session_id}</code></div>
                    <div><strong style="color:#6c757d">Stato:</strong><br><span style="color:${isOpen ? '#ff9800' : '#28a745'};font-weight:600;font-size:1.1em">${isOpen ? '⏳ In Corso' : '✓ Completata'}</span></div>
                    <div><strong style="color:#6c757d">User ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">${session.user_id}</code></div>
                    <div><strong style="color:#6c757d">Game ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">${session.game_id}</code></div>
                    <div><strong style="color:#6c757d">Score:</strong><br><span style="font-size:1.3em;font-weight:bold;color:#2563eb">${session.score || 0}</span></div>
                    <div><strong style="color:#6c757d">XP Guadagnato:</strong><br><span style="font-size:1.3em;font-weight:bold;color:#28a745">${parseFloat(session.xp_earned || 0).toFixed(2)}</span></div>
                    <div><strong style="color:#6c757d">Durata:</strong><br><span style="font-size:1.1em;font-weight:600;color:#ff9800">${Utils.formatDuration(session.duration_seconds)}</span></div>
                    <div><strong style="color:#6c757d">Inizio:</strong><br>${Utils.formatDate(session.started_at)}</div>
                    ${!isOpen ? `<div style="grid-column:1/-1"><strong style="color:#6c757d">Fine:</strong><br>${Utils.formatDate(session.ended_at)}</div>` : ''}
                </div>
            </div>
        `;
    }

    static renderXPRuleDetails(rule) {
        return `
            <div style="line-height:1.8">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px">
                    <div><strong style="color:#6c757d">Rule ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">${rule.rule_id}</code></div>
                    <div><strong style="color:#6c757d">Nome:</strong><br><span style="font-size:1.1em;font-weight:600;color:#1a1a1a">${Utils.escapeHtml(rule.rule_name)}</span></div>
                    <div><strong style="color:#6c757d">Game ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">${rule.game_id}</code></div>
                    <div><strong style="color:#6c757d">Tipo:</strong><br><span class="badge" style="background:#e0e7ff;color:#4338ca;padding:4px 12px;border-radius:6px">${rule.rule_type}</span></div>
                    <div><strong style="color:#6c757d">Priorità:</strong><br><span style="font-size:1.2em;font-weight:bold;color:#2563eb">${rule.priority}</span></div>
                    <div><strong style="color:#6c757d">Stato:</strong><br><span style="color:${rule.is_active ? '#28a745' : '#dc3545'};font-weight:600;font-size:1.1em">${rule.is_active ? '✓ Attivo' : '✗ Inattivo'}</span></div>
                    <div style="grid-column:1/-1"><strong style="color:#6c757d">Data Creazione:</strong><br>${Utils.formatDate(rule.created_at)}</div>
                </div>
                ${rule.parameters ? `<div style="margin-top:16px"><strong style="color:#6c757d">Parametri:</strong><pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow:auto;max-height:300px;font-size:0.875rem;border-left:4px solid #9C27B0">${JSON.stringify(rule.parameters, null, 2)}</pre></div>` : ''}
            </div>
        `;
    }

    static renderLeaderboardDetails(entry) {
        return `
            <div style="line-height:1.8">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px">
                    <div><strong style="color:#6c757d">Entry ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px;font-size:0.85em">${entry.entry_id}</code></div>
                    <div><strong style="color:#6c757d">Score:</strong><br><span style="font-size:1.5em;font-weight:bold;color:#ff5722">${entry.score}</span></div>
                    <div><strong style="color:#6c757d">User ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">${entry.user_id}</code></div>
                    <div><strong style="color:#6c757d">Game ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">${entry.game_id}</code></div>
                    <div style="grid-column:1/-1"><strong style="color:#6c757d">Data Record:</strong><br>${Utils.formatDate(entry.created_at)}</div>
                </div>
            </div>
        `;
    }

    static renderUserQuestDetails(userQuest) {
        const isCompleted = userQuest.is_completed;
        const isClaimed = userQuest.is_claimed;
        
        return `
            <div style="line-height:1.8">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px">
                    <div><strong style="color:#6c757d">ID:</strong><br>${userQuest.id}</div>
                    <div><strong style="color:#6c757d">Stato:</strong><br><span style="color:${isCompleted ? '#28a745' : '#6c757d'};font-weight:600;font-size:1.1em">${isCompleted ? '✓ Completata' : '⏳ In Corso'}</span></div>
                    <div><strong style="color:#6c757d">User ID:</strong><br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">${userQuest.user_id}</code></div>
                    <div><strong style="color:#6c757d">Quest ID:</strong><br><span style="font-size:1.1em;font-weight:bold;color:#E91E63">${userQuest.quest_id}</span></div>
                    <div><strong style="color:#6c757d">Progresso:</strong><br><span style="font-size:1.2em;font-weight:bold;color:#2563eb">${userQuest.current_progress || 0}</span></div>
                    <div><strong style="color:#6c757d">Iniziata il:</strong><br>${Utils.formatDate(userQuest.started_at)}</div>
                    <div>
                        <strong style="color:#6c757d">Completata:</strong><br>
                        <span style="color:${isCompleted ? '#28a745' : '#6c757d'};font-weight:500">
                            ${isCompleted ? '✓ Sì' : '✗ No'}
                        </span>
                    </div>
                    <div>
                        <strong style="color:#6c757d">Ricompensa Reclamata:</strong><br>
                        <span style="color:${isClaimed ? '#69f0ae' : (isCompleted ? '#ffc107' : '#6c757d')};font-weight:500">
                            ${isClaimed ? '✓ Reclamata' : (isCompleted ? '⏳ Da Reclamare' : '✗ No')}
                        </span>
                    </div>
                    ${userQuest.completed_at ? `<div><strong style="color:#6c757d">Completata il:</strong><br>${Utils.formatDate(userQuest.completed_at)}</div>` : '<div></div>'}
                    ${userQuest.claimed_at ? `<div><strong style="color:#6c757d">Reclamata il:</strong><br><span style="color:#69f0ae;font-weight:500">${Utils.formatDate(userQuest.claimed_at)}</span></div>` : '<div></div>'}
                </div>
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
