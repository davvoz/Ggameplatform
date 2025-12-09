/**
 * CRUD Operations for Database Viewer
 * Handles Create, Update, Delete operations for all tables
 * Following OOP principles and modular design
 */

class CRUDManager {
    constructor(apiBase) {
        this.apiBase = apiBase;
        this.formOptions = null;
        this.loadFormOptions();
    }

    /**
     * Load form options from backend (foreign key relationships)
     * Following Dependency Inversion: depends on API contract, not implementation
     */
    async loadFormOptions() {
        try {
            const response = await fetch(`${this.apiBase}/form-options`);
            if (response.ok) {
                const result = await response.json();
                this.formOptions = result.data;
                console.log('Form options loaded:', this.formOptions);
            }
        } catch (error) {
            console.error('Error loading form options:', error);
            this.formOptions = {
                user_ids: [],
                game_ids: [],
                quest_ids: [],
                session_ids: [],
                categories: [],
                quest_types: [
                    'play_games',
                    'play_games_weekly',
                    'play_time',
                    'play_time_daily',
                    'play_time_cumulative',
                    'play_same_game',
                    'score_threshold_per_game',
                    'score_ends_with',
                    'login_after_24h',
                    'login_streak',
                    'leaderboard_top',
                    'reach_level',
                    'xp_daily',
                    'xp_weekly',
                    'complete_quests'
                ],
                rule_types: []
            };
        }
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
                { key: 'category', label: 'Categoria', type: 'select', foreignKey: 'categories', allowCustom: true },
                { key: 'status_id', label: 'Stato', type: 'select', foreignKey: 'status_ids' },
                { key: 'steem_rewards_enabled', label: 'STEEM Rewards Enabled', type: 'checkbox' }
            ],
            'users': [
                { key: 'user_id', label: 'User ID', type: 'text', readonly: true },
                { key: 'username', label: 'Username', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'password_hash', label: 'Password Hash', type: 'text' },
                { key: 'steem_username', label: 'Steem Username', type: 'text' },
                { key: 'is_anonymous', label: 'Anonimo', type: 'checkbox' },
                { key: 'cur8_multiplier', label: 'CUR8 Multiplier', type: 'number', step: '0.01', min: '1', max: '4' },
                { key: 'votes_cur8_witness', label: 'Votes CUR8 Witness', type: 'checkbox' },
                { key: 'delegation_amount', label: 'Delegation Amount (STEEM)', type: 'number', step: '0.001', min: '0' },
                { key: 'last_multiplier_check', label: 'Last Multiplier Check', type: 'text', readonly: true },
                { key: 'total_xp_earned', label: 'XP Totale', type: 'number', step: '0.01', min: '0' },
                { key: 'game_scores', label: 'Game Scores', type: 'json' },
                { key: 'avatar', label: 'Avatar URL', type: 'text' },
                { key: 'last_login', label: 'Last Login', type: 'datetime-local' },
                { key: 'login_streak', label: 'Login Streak', type: 'number', min: '0' },
                { key: 'last_login_date', label: 'Last Login Date', type: 'text' },
                { key: 'extra_data', label: 'Extra Data', type: 'json' },
                { key: 'created_at', label: 'Created At', type: 'datetime-local', readonly: true }
            ],
            'sessions': [
                { key: 'session_id', label: 'Session ID', type: 'text', readonly: true },
                { key: 'user_id', label: 'User ID', type: 'select', required: true, foreignKey: 'user_ids' },
                { key: 'game_id', label: 'Game ID', type: 'select', required: true, foreignKey: 'game_ids' },
                { key: 'score', label: 'Score', type: 'number', min: '0' },
                { key: 'xp_earned', label: 'XP Guadagnato', type: 'number', step: '0.01', min: '0' },
                { key: 'duration_seconds', label: 'Durata (secondi)', type: 'number', min: '0' },
                { key: 'ended_at', label: 'Fine', type: 'datetime-local' }
            ],
            'xp-rules': [
                { key: 'rule_id', label: 'Rule ID', type: 'text', readonly: true },
                { key: 'game_id', label: 'Game ID', type: 'select', required: true, foreignKey: 'game_ids' },
                { key: 'rule_name', label: 'Nome', type: 'text', required: true },
                { key: 'rule_type', label: 'Tipo', type: 'select', required: true, foreignKey: 'rule_types' },
                { key: 'priority', label: 'Priorità', type: 'number', min: '0' },
                { key: 'is_active', label: 'Attivo', type: 'checkbox' },
                { key: 'parameters', label: 'Parametri (JSON)', type: 'textarea', isJSON: true }
            ],
            'leaderboard': [
                { key: 'entry_id', label: 'Entry ID', type: 'text', readonly: true },
                { key: 'user_id', label: 'User ID', type: 'select', required: true, foreignKey: 'user_ids' },
                { key: 'game_id', label: 'Game ID', type: 'select', required: true, foreignKey: 'game_ids' },
                { key: 'score', label: 'Score', type: 'number', min: '0', required: true },
                { key: 'rank', label: 'Rank', type: 'number', min: '1' }
            ],
            'quests': [
                { key: 'quest_id', label: 'Quest ID', type: 'number', readonly: true },
                { key: 'title', label: 'Titolo', type: 'text', required: true },
                { key: 'description', label: 'Descrizione', type: 'textarea' },
                { key: 'quest_type', label: 'Tipo', type: 'select', required: true, foreignKey: 'quest_types' },
                { key: 'target_value', label: 'Target', type: 'number', min: '0', required: true },
                { key: 'xp_reward', label: 'Ricompensa XP', type: 'number', min: '0', required: true },
                { key: 'reward_coins', label: 'Ricompensa 🪙 Coins', type: 'number', min: '0' },
                { key: 'is_active', label: 'Attivo', type: 'checkbox' }
            ],
            'user-quests': [
                { key: 'id', label: 'ID', type: 'number', readonly: true },
                { key: 'user_id', label: 'User ID', type: 'select', required: true, foreignKey: 'user_ids' },
                { key: 'quest_id', label: 'Quest ID', type: 'select', required: true, foreignKey: 'quest_ids' },
                { key: 'current_progress', label: 'Progresso', type: 'number', min: '0' },
                { key: 'is_completed', label: 'Completato', type: 'checkbox' },
                { key: 'is_claimed', label: 'Reclamato', type: 'checkbox' },
                { key: 'completed_at', label: 'Data Completamento', type: 'datetime-local' },
                { key: 'claimed_at', label: 'Data Reclamo', type: 'datetime-local' }
            ],
            'game_statuses': [
                { key: 'status_id', label: 'Status ID', type: 'number', readonly: true },
                { key: 'status_name', label: 'Nome', type: 'text', required: true },
                { key: 'status_code', label: 'Codice', type: 'text', required: true },
                { key: 'description', label: 'Descrizione', type: 'textarea' },
                { key: 'color', label: 'Colore', type: 'text' },
                { key: 'display_order', label: 'Ordine Visualizzazione', type: 'number', min: '0' },
                { key: 'is_active', label: 'Attivo', type: 'checkbox' }
            ],
            'user_coins': [
                { key: 'user_id', label: 'User ID', type: 'select', required: true, foreignKey: 'user_ids', readonly: true },
                { key: 'balance', label: 'Saldo', type: 'number', min: '0', required: true },
                { key: 'total_earned', label: 'Totale Guadagnato', type: 'number', min: '0', required: true },
                { key: 'total_spent', label: 'Totale Speso', type: 'number', min: '0', required: true }
            ],
            'coin_transactions': [
                { key: 'transaction_id', label: 'Transaction ID', type: 'text', readonly: true },
                { key: 'user_id', label: 'User ID', type: 'select', required: true, foreignKey: 'user_ids' },
                { key: 'amount', label: 'Importo', type: 'number', required: true },
                { key: 'transaction_type', label: 'Tipo Transazione', type: 'select', required: true, options: ['quest_reward', 'leaderboard_reward', 'level_milestone', 'daily_login', 'shop_purchase', 'admin_adjustment'] },
                { key: 'source_id', label: 'Source ID', type: 'text' },
                { key: 'description', label: 'Descrizione', type: 'textarea' },
                { key: 'balance_after', label: 'Saldo Dopo', type: 'number', min: '0', required: true }
            ],
            'level_milestones': [
                { key: 'level', label: 'Livello', type: 'number', min: '1', required: true, readonly: false },
                { key: 'title', label: 'Titolo', type: 'text', required: true },
                { key: 'badge', label: 'Badge (emoji)', type: 'text', required: true },
                { key: 'color', label: 'Colore', type: 'text', required: true },
                { key: 'description', label: 'Descrizione', type: 'textarea' },
                { key: 'is_active', label: 'Attivo', type: 'checkbox' }
            ],
            'level_rewards': [
                { key: 'reward_id', label: 'Reward ID', type: 'text', readonly: true },
                { key: 'level', label: 'Livello', type: 'number', min: '1', required: true },
                { key: 'reward_type', label: 'Tipo Ricompensa', type: 'select', required: true, options: ['coins', 'item', 'badge', 'multiplier'] },
                { key: 'reward_amount', label: 'Quantità', type: 'number', min: '0', required: true },
                { key: 'description', label: 'Descrizione', type: 'textarea' },
                { key: 'is_active', label: 'Attivo', type: 'checkbox' }
            ],
            'weekly_leaderboards': [
                { key: 'entry_id', label: 'Entry ID', type: 'text', readonly: true },
                { key: 'week_start', label: 'Inizio Settimana', type: 'date', required: true },
                { key: 'week_end', label: 'Fine Settimana', type: 'date', required: true },
                { key: 'user_id', label: 'User ID', type: 'select', required: true, foreignKey: 'user_ids' },
                { key: 'game_id', label: 'Game ID', type: 'select', required: true, foreignKey: 'game_ids' },
                { key: 'score', label: 'Score', type: 'number', min: '0', required: true },
                { key: 'rank', label: 'Rank', type: 'number', min: '1' }
            ],
            'leaderboard_rewards': [
                { key: 'reward_id', label: 'Reward ID', type: 'text', readonly: true },
                { key: 'game_id', label: 'Game ID', type: 'select', foreignKey: 'game_ids' },
                { key: 'rank_start', label: 'Rank Start', type: 'number', min: '1', required: true },
                { key: 'rank_end', label: 'Rank End', type: 'number', min: '1', required: true },
                { key: 'steem_reward', label: 'Ricompensa STEEM', type: 'number', step: '0.001', min: '0' },
                { key: 'coin_reward', label: 'Ricompensa Coins', type: 'number', min: '0' },
                { key: 'description', label: 'Descrizione', type: 'textarea' },
                { key: 'is_active', label: 'Attivo', type: 'checkbox' }
            ],
            'weekly_winners': [
                { key: 'winner_id', label: 'Winner ID', type: 'text', readonly: true },
                { key: 'week_start', label: 'Inizio Settimana', type: 'date', required: true },
                { key: 'week_end', label: 'Fine Settimana', type: 'date', required: true },
                { key: 'game_id', label: 'Game ID', type: 'select', required: true, foreignKey: 'game_ids' },
                { key: 'user_id', label: 'User ID', type: 'select', required: true, foreignKey: 'user_ids' },
                { key: 'rank', label: 'Rank', type: 'number', min: '1', required: true },
                { key: 'score', label: 'Score', type: 'number', min: '0', required: true },
                { key: 'steem_reward', label: 'Ricompensa STEEM', type: 'number', step: '0.001', min: '0' },
                { key: 'coin_reward', label: 'Ricompensa Coins', type: 'number', min: '0' },
                { key: 'steem_tx_id', label: 'STEEM Transaction ID', type: 'text' },
                { key: 'reward_sent', label: 'Ricompensa Inviata', type: 'checkbox' },
                { key: 'reward_sent_at', label: 'Data Invio Ricompensa', type: 'datetime-local' }
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
                    // Check if this is a foreign key field
                    if (field.foreignKey && this.formOptions && this.formOptions[field.foreignKey]) {
                        const options = this.formOptions[field.foreignKey];
                        
                        // For array of strings (like categories)
                        if (options.length > 0 && typeof options[0] === 'string') {
                            inputHTML = `
                                <select name="${field.key}" ${required} ${disabled}>
                                    <option value="">-- Select --</option>
                                    ${options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                                    ${field.allowCustom ? '<option value="__custom__">+ Custom...</option>' : ''}
                                </select>
                            `;
                        } else {
                            // For array of objects with value and label
                            inputHTML = `
                                <select name="${field.key}" ${required} ${disabled}>
                                    <option value="">-- Select --</option>
                                    ${options.map(opt => `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                                </select>
                            `;
                        }
                    } else {
                        // Fallback to static options
                        const options = field.options || [];
                        inputHTML = `
                            <select name="${field.key}" ${required} ${disabled}>
                                <option value="">-- Select --</option>
                                ${options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                            </select>
                        `;
                    }
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
            'user-quests': 'id',
            'game_statuses': 'status_id',
            'user_coins': 'user_id',
            'coin_transactions': 'transaction_id',
            'level_milestones': 'level',
            'level_rewards': 'reward_id',
            'weekly_leaderboards': 'entry_id',
            'leaderboard_rewards': 'reward_id',
            'weekly_winners': 'winner_id'
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
            'user-quests': `User Quest #${item.id}`,
            'game_statuses': item.status_name || `Status #${item.status_id}`,
            'user_coins': `User ${item.user_id} - Balance: ${item.balance}`,
            'coin_transactions': `Transaction ${item.transaction_id ? item.transaction_id.substring(0, 12) : 'N/A'}... - ${item.amount > 0 ? '+' : ''}${item.amount} coins`,
            'level_milestones': `Level ${item.level} - ${item.title}`,
            'level_rewards': `Reward for Level ${item.level} - ${item.reward_type}`,
            'weekly_leaderboards': `Week ${item.week_start} - ${item.game_id} - Score: ${item.score}`,
            'leaderboard_rewards': `Rank ${item.rank_start}-${item.rank_end} - ${item.steem_reward || 0} STEEM`,
            'weekly_winners': `Winner ${item.winner_id} - Week ${item.week_start} - Rank ${item.rank}`
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
            'user-quests': '/admin/user-quests-crud',
            'game_statuses': '/admin/game-statuses',
            'user_coins': '/admin/user-coins',
            'coin_transactions': '/admin/coin-transactions',
            'level_milestones': '/admin/level-milestones',
            'level_rewards': '/admin/level-rewards',
            'weekly_leaderboards': '/admin/weekly-leaderboards',
            'leaderboard_rewards': '/admin/leaderboard-rewards',
            'weekly_winners': '/admin/weekly-winners'
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
            // Skip readonly/disabled checkboxes
            if (!checkbox.disabled && !checkbox.readOnly) {
                data[checkbox.name] = checkbox.checked;
            }
        });

        // Then handle all other fields
        for (let [key, value] of formData.entries()) {
            const input = form.elements[key];
            
            // Skip readonly/disabled fields (primary keys, etc.)
            if (input.readOnly || input.disabled) {
                continue;
            }
            
            if (input.type === 'checkbox') {
                // Already handled above
                continue;
            } else if (input.type === 'number') {
                data[key] = value ? parseFloat(value) : 0;
            } else if (input.type === 'select-one' && key === 'status_id') {
                // Convert status_id to integer
                data[key] = value ? parseInt(value) : null;
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
            
            // Convert snake_case to camelCase ONLY for games table
            if (tableKey === 'games') {
                if ('status_id' in data) {
                    data['statusId'] = data['status_id'];
                    delete data['status_id'];
                }
                // Convert boolean to integer for steem_rewards_enabled
                if ('steem_rewards_enabled' in data) {
                    data['steem_rewards_enabled'] = data['steem_rewards_enabled'] ? 1 : 0;
                }
            }
            
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
            
            // Convert snake_case to camelCase ONLY for games table
            if (tableKey === 'games') {
                if ('status_id' in data) {
                    data['statusId'] = data['status_id'];
                    delete data['status_id'];
                }
                // Convert boolean to integer for steem_rewards_enabled
                if ('steem_rewards_enabled' in data) {
                    data['steem_rewards_enabled'] = data['steem_rewards_enabled'] ? 1 : 0;
                }
            }
            
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
                // Better error handling for validation errors
                let errorMsg = 'Unknown error';
                if (result.detail) {
                    if (Array.isArray(result.detail)) {
                        errorMsg = result.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
                    } else if (typeof result.detail === 'string') {
                        errorMsg = result.detail;
                    } else {
                        errorMsg = JSON.stringify(result.detail);
                    }
                } else if (result.error) {
                    errorMsg = result.error;
                }
                throw new Error(errorMsg);
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
                // Better error handling for validation errors
                let errorMsg = 'Unknown error';
                if (result.detail) {
                    if (Array.isArray(result.detail)) {
                        errorMsg = result.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
                    } else if (typeof result.detail === 'string') {
                        errorMsg = result.detail;
                    } else {
                        errorMsg = JSON.stringify(result.detail);
                    }
                } else if (result.error) {
                    errorMsg = result.error;
                }
                throw new Error(errorMsg);
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
