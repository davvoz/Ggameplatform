/**
 * Database Viewer Configuration
 * Centralised configuration for all tables and their definitions
 * 
 * NOTE: This file maintains backward compatibility with the existing system.
 * The new centralized schema is defined in db-schema.js
 * For new tables, add them to DB_SCHEMA in db-schema.js instead.
 * 
 * To add a new table: simply add a new entry to TABLE_DEFINITIONS
 */

// Bridge to new schema system - SchemaManager provides utility methods
const schemaManager = typeof SchemaManager !== 'undefined' ? new SchemaManager() : null;

const TABLE_DEFINITIONS = {
    games: {
        name: 'games',
        label: 'Giochi',
        apiEndpoint: 'games',
        dataKey: 'games',
        icon: '🎮',
        color: '#4CAF50',
        erDiagram: {
            x: 50,
            y: 50,
            color: '#4CAF50'
        },
        columns: [
            {
                key: 'thumbnail',
                label: 'Thumb',
                type: 'image',
                width: '80px',
                render: (value, row) => {
                    // Costruisci il percorso completo del thumbnail
                    let src = 'https://via.placeholder.com/60x45?text=No+Image';
                    if (value && row.game_id) {
                        if (value.startsWith('http')) {
                            src = value;
                        } else {
                            src = `/games/${row.game_id}/${value}`;
                        }
                    }
                    return {
                        type: 'image',
                        src: src,
                        style: 'width:60px;height:45px;object-fit:cover;border-radius:4px;border:1px solid #333'
                    };
                }
            },
            {
                key: 'game_id',
                label: 'ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'title',
                label: 'Titolo',
                type: 'text',
                searchable: true
            },
            {
                key: 'author',
                label: 'Autore',
                type: 'text',
                searchable: true
            },
            {
                key: 'version',
                label: 'Versione',
                type: 'text'
            },
            {
                key: 'category',
                label: 'Categoria',
                type: 'badge',
                searchable: true
            },
            {
                key: 'status',
                label: 'Stato',
                type: 'custom',
                render: (value, item) => {
                    const statusObj = value || item?.status;
                    if (!statusObj) return { type: 'text', text: '-', style: 'color: #999;' };
                    const colors = {
                        'developed': '#28a745',
                        'in_development': '#ffc107',
                        'deprecated': '#dc3545',
                        'experimental': '#17a2b8'
                    };
                    return {
                        type: 'badge',
                        text: statusObj.status_name,
                        color: colors[statusObj.status_code] || '#6c757d'
                    };
                }
            },
            {
                key: 'steem_rewards_enabled',
                label: 'STEEM Rewards',
                type: 'custom',
                render: (value) => {
                    const enabled = Boolean(value);
                    return {
                        type: 'badge',
                        text: enabled ? 'ENABLED' : 'DISABLED',
                        color: enabled ? '#28a745' : '#6c757d'
                    };
                }
            },
            {
                key: 'metadata',
                label: 'Play Count',
                type: 'custom',
                render: (value) => ({
                    type: 'text',
                    text: value?.playCount || 0
                })
            },
            {
                key: 'entry_point',
                label: 'Entry Point',
                type: 'text'
            },
            {
                key: 'tags',
                label: 'Tags',
                type: 'json-preview',
                maxLength: 30
            },
            {
                key: 'extra_data',
                label: 'Extra Data',
                type: 'json-preview',
                maxLength: 30
            },
            {
                key: 'created_at',
                label: 'Data Creazione',
                type: 'date'
            },
            {
                key: 'updated_at',
                label: 'Data Modifica',
                type: 'date'
            },
            {
                key: 'actions',
                label: 'Azioni',
                type: 'actions'
            }
        ],
        fields: [
            { name: 'game_id', type: 'STRING', pk: true },
            { name: 'title', type: 'STRING' },
            { name: 'description', type: 'TEXT' },
            { name: 'author', type: 'STRING' },
            { name: 'version', type: 'STRING' },
            { name: 'thumbnail', type: 'STRING' },
            { name: 'entry_point', type: 'STRING' },
            { name: 'category', type: 'STRING' },
            { name: 'tags', type: 'JSON' },
            { name: 'status_id', type: 'INTEGER', fk: { table: 'game_statuses', column: 'status_id' } },
            { name: 'steem_rewards_enabled', type: 'BOOLEAN' },
            { name: 'extra_data', type: 'JSON' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'updated_at', type: 'DATETIME' }
        ]
    },

    users: {
        name: 'users',
        label: 'Utenti',
        apiEndpoint: 'users',
        dataKey: 'users',
        icon: '👤',
        color: '#2196F3',
        erDiagram: {
            x: 50,
            y: 350,
            color: '#2196F3'
        },
        columns: [
            {
                key: 'user_id',
                label: 'ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'username',
                label: 'Username',
                type: 'text',
                searchable: true
            },
            {
                key: 'email',
                label: 'Email',
                type: 'text',
                searchable: true
            },
            {
                key: 'is_anonymous',
                label: 'Tipo',
                type: 'custom',
                render: (value) => ({
                    type: 'text',
                    text: value ? 'Anonimo' : 'Registrato',
                    style: `color: ${value ? '#ff9800' : '#4caf50'}; font-weight: 500;`
                })
            },
            {
                key: 'total_xp_earned',
                label: 'XP',
                type: 'number',
                decimals: 0
            },
            {
                key: 'login_streak',
                label: 'Streak',
                type: 'custom',
                render: (value) => ({
                    type: 'text',
                    text: value > 0 ? `🔥 ${value}` : '-',
                    style: value > 0 ? 'font-weight: bold; color: #ff5722;' : 'color: #999;'
                })
            },
            {
                key: 'last_login',
                label: 'Ultimo Login',
                type: 'date'
            },
            {
                key: 'actions',
                label: 'Azioni',
                type: 'actions'
            }
        ],
        fields: [
            { name: 'user_id', type: 'STRING', pk: true, label: 'User ID' },
            { name: 'username', type: 'STRING', label: 'Username' },
            { name: 'email', type: 'STRING', label: 'Email' },
            { name: 'password_hash', type: 'STRING', label: 'Password Hash' },
            { name: 'steem_username', type: 'STRING', label: 'Steem Username' },
            { name: 'is_anonymous', type: 'BOOLEAN', label: 'Is Anonymous' },
            { name: 'cur8_multiplier', type: 'FLOAT', label: 'CUR8 Multiplier' },
            { name: 'votes_cur8_witness', type: 'BOOLEAN', label: 'Votes CUR8 Witness' },
            { name: 'delegation_amount', type: 'FLOAT', label: 'Delegation Amount (STEEM)' },
            { name: 'last_multiplier_check', type: 'STRING', label: 'Last Multiplier Check', readonly: true },
            { name: 'total_xp_earned', type: 'FLOAT', label: 'Total XP Earned' },
            { name: 'game_scores', type: 'JSON', label: 'Game Scores' },
            { name: 'avatar', type: 'STRING', label: 'Avatar' },
            { name: 'last_login', type: 'DATETIME', label: 'Last Login' },
            { name: 'login_streak', type: 'INTEGER', label: 'Login Streak' },
            { name: 'last_login_date', type: 'STRING', label: 'Last Login Date' },
            { name: 'extra_data', type: 'JSON', label: 'Extra Data' },
            { name: 'created_at', type: 'DATETIME', label: 'Created At', readonly: true }
        ]
    },

    sessions: {
        name: 'game_sessions',
        label: 'Sessioni',
        apiEndpoint: 'sessions',
        dataKey: 'sessions',
        icon: '🎯',
        color: '#FF9800',
        erDiagram: {
            x: 450,
            y: 200,
            color: '#FF9800'
        },
        columns: [
            {
                key: 'session_id',
                label: 'Session ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'user_id',
                label: 'User ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'game_id',
                label: 'Game ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'score',
                label: 'Score',
                type: 'number'
            },
            {
                key: 'xp_earned',
                label: 'XP Guadagnato',
                type: 'number',
                decimals: 2,
                style: 'font-weight: 600; color: #28a745;'
            },
            {
                key: 'duration_seconds',
                label: 'Durata',
                type: 'duration'
            },
            {
                key: 'started_at',
                label: 'Inizio',
                type: 'date'
            },
            {
                key: 'ended_at',
                label: 'Fine',
                type: 'custom',
                render: (value) => ({
                    type: 'text',
                    text: value ? Utils.formatDate(value) : 'In corso',
                    style: !value ? 'color: #ff9800; font-weight: 500;' : ''
                })
            },
            {
                key: 'extra_data',
                label: 'Extra Data',
                type: 'json-preview',
                maxLength: 30
            },
            {
                key: 'actions',
                label: 'Azioni',
                type: 'actions'
            }
        ],
        fields: [
            { name: 'session_id', type: 'STRING', pk: true },
            { name: 'user_id', type: 'STRING', fk: 'users.user_id' },
            { name: 'game_id', type: 'STRING', fk: 'games.game_id' },
            { name: 'score', type: 'INTEGER' },
            { name: 'xp_earned', type: 'FLOAT' },
            { name: 'duration_seconds', type: 'INTEGER' },
            { name: 'started_at', type: 'DATETIME' },
            { name: 'ended_at', type: 'DATETIME' },
            { name: 'extra_data', type: 'JSON' }
        ]
    },

    'xp-rules': {
        name: 'xp_rules',
        label: 'XP Rules',
        apiEndpoint: 'xp_rules',
        dataKey: 'xp_rules',
        icon: '⭐',
        color: '#9C27B0',
        erDiagram: {
            x: 450,
            y: 50,
            color: '#9C27B0'
        },
        columns: [
            {
                key: 'rule_id',
                label: 'Rule ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'game_id',
                label: 'Game ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'rule_name',
                label: 'Nome',
                type: 'text',
                searchable: true
            },
            {
                key: 'rule_type',
                label: 'Tipo',
                type: 'badge'
            },
            {
                key: 'priority',
                label: 'Priorità',
                type: 'number'
            },
            {
                key: 'is_active',
                label: 'Attivo',
                type: 'boolean',
                trueText: '✓ Attivo',
                falseText: '✗ Inattivo',
                trueColor: '#28a745',
                falseColor: '#dc3545'
            },
            {
                key: 'parameters',
                label: 'Parametri',
                type: 'json-preview',
                maxLength: 50
            },
            {
                key: 'created_at',
                label: 'Data Creazione',
                type: 'date'
            },
            {
                key: 'updated_at',
                label: 'Data Modifica',
                type: 'date'
            },
            {
                key: 'actions',
                label: 'Azioni',
                type: 'actions'
            }
        ],
        fields: [
            { name: 'rule_id', type: 'STRING', pk: true },
            { name: 'game_id', type: 'STRING', fk: 'games.game_id' },
            { name: 'rule_name', type: 'STRING' },
            { name: 'rule_type', type: 'STRING' },
            { name: 'parameters', type: 'JSON' },
            { name: 'priority', type: 'INTEGER' },
            { name: 'is_active', type: 'BOOLEAN' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'updated_at', type: 'DATETIME' }
        ]
    },

    quests: {
        name: 'quests',
        label: 'Quests',
        apiEndpoint: 'quests',
        dataKey: 'quests',
        icon: '🏆',
        color: '#F44336',
        erDiagram: {
            x: 800,
            y: 50,
            color: '#F44336'
        },
        columns: [
            {
                key: 'quest_id',
                label: '#',
                type: 'number'
            },
            {
                key: 'title',
                label: 'Titolo',
                type: 'text',
                searchable: true
            },
            {
                key: 'quest_type',
                label: 'Tipo',
                type: 'badge'
            },
            {
                key: 'target_value',
                label: 'Target',
                type: 'number'
            },
            {
                key: 'xp_reward',
                label: 'XP',
                type: 'number',
                style: 'font-weight: bold; color: #28a745;'
            },
            {
                key: 'reward_coins',
                label: '🪙 Coins',
                type: 'custom',
                render: (value) => ({
                    type: 'text',
                    text: value || 0,
                    style: value > 0 ? 'font-weight: bold; color: #FFD700;' : 'color: #999;'
                })
            },
            {
                key: 'description',
                label: 'Descrizione',
                type: 'text',
                searchable: true
            },
            {
                key: 'config',
                label: 'Config',
                type: 'json-preview',
                maxLength: 20
            },
            {
                key: 'is_active',
                label: 'Attivo',
                type: 'boolean',
                trueText: '✓ Attivo',
                falseText: '✗ Inattivo',
                trueColor: '#28a745',
                falseColor: '#dc3545'
            },
            {
                key: 'actions',
                label: 'Azioni',
                type: 'actions',
                customAction: 'showQuestDetails'
            }
        ],
        fields: [
            { name: 'quest_id', type: 'INTEGER', pk: true },
            { name: 'title', type: 'STRING' },
            { name: 'description', type: 'TEXT' },
            { name: 'quest_type', type: 'STRING' },
            { name: 'target_value', type: 'INTEGER' },
            { name: 'xp_reward', type: 'INTEGER' },
            { name: 'reward_coins', type: 'INTEGER' },
            { name: 'config', type: 'JSON' },
            { name: 'is_active', type: 'BOOLEAN' },
            { name: 'created_at', type: 'DATETIME' }
        ]
    },

    leaderboard: {
        name: 'leaderboards',
        label: 'Leaderboard',
        apiEndpoint: 'leaderboard',
        dataKey: 'leaderboard',
        icon: '🥇',
        color: '#FF5722',
        erDiagram: {
            x: 800,
            y: 500,
            color: '#FF5722'
        },
        columns: [
            {
                key: 'entry_id',
                label: 'Entry ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'rank',
                label: 'Posizione',
                type: 'rank'
            },
            {
                key: 'user_id',
                label: 'User ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'game_id',
                label: 'Game ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'score',
                label: 'Score',
                type: 'number',
                style: 'font-weight: 600; font-size: 1.1em;'
            },
            {
                key: 'created_at',
                label: 'Data',
                type: 'date'
            },
            {
                key: 'actions',
                label: 'Azioni',
                type: 'actions'
            }
        ],
        fields: [
            { name: 'entry_id', type: 'STRING', pk: true },
            { name: 'user_id', type: 'STRING', fk: 'users.user_id' },
            { name: 'game_id', type: 'STRING', fk: 'games.game_id' },
            { name: 'score', type: 'INTEGER' },
            { name: 'rank', type: 'INTEGER' },
            { name: 'created_at', type: 'DATETIME' }
        ]
    },

    'user-quests': {
        name: 'user_quests',
        label: 'User Quests',
        apiEndpoint: 'user_quests',
        dataKey: 'user_quests',
        icon: '📋',
        color: '#E91E63',
        erDiagram: {
            x: 800,
            y: 300,
            color: '#E91E63'
        },
        columns: [
            {
                key: 'id',
                label: 'ID',
                type: 'number'
            },
            {
                key: 'user_id',
                label: 'User',
                type: 'text',
                searchable: true
            },
            {
                key: 'quest_id',
                label: 'Quest',
                type: 'number'
            },
            {
                key: 'current_progress',
                label: 'Progresso',
                type: 'number'
            },
            {
                key: 'is_completed',
                label: 'Completato',
                type: 'boolean',
                trueText: '✓',
                falseText: '✗',
                trueColor: '#28a745',
                falseColor: '#6c757d'
            },
            {
                key: 'is_claimed',
                label: 'Reclamato',
                type: 'boolean',
                trueText: '✓',
                falseText: '✗',
                trueColor: '#69f0ae',
                falseColor: '#ffc107'
            },
            {
                key: 'extra_data',
                label: 'Extra',
                type: 'json-preview',
                maxLength: 20
            },
            {
                key: 'actions',
                label: 'Azioni',
                type: 'actions'
            }
        ],
        fields: [
            { name: 'id', type: 'INTEGER', pk: true },
            { name: 'user_id', type: 'STRING', fk: 'users.user_id' },
            { name: 'quest_id', type: 'INTEGER', fk: 'quests.quest_id' },
            { name: 'current_progress', type: 'INTEGER' },
            { name: 'is_completed', type: 'BOOLEAN' },
            { name: 'is_claimed', type: 'BOOLEAN' },
            { name: 'completed_at', type: 'DATETIME' },
            { name: 'claimed_at', type: 'DATETIME' },
            { name: 'started_at', type: 'DATETIME' },
            { name: 'extra_data', type: 'JSON' }
        ]
    },

    game_statuses: {
        name: 'game_statuses',
        label: 'Stati Giochi',
        apiEndpoint: 'game-statuses',
        dataKey: 'game_statuses',
        icon: '🏷️',
        color: '#9C27B0',
        detailTemplate: 'renderGameStatusDetails',
        erDiagram: {
            x: 450,
            y: 50,
            color: '#9C27B0'
        },
        columns: [
            {
                key: 'status_id',
                label: 'ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'status_name',
                label: 'Nome',
                type: 'text',
                searchable: true,
                render: (value, row) => ({
                    type: 'custom',
                    html: `<strong>${value}</strong>`
                })
            },
            {
                key: 'status_code',
                label: 'Codice',
                type: 'badge',
                searchable: true,
                render: (value) => ({
                    type: 'badge',
                    text: value,
                    color: {
                        'developed': '#28a745',
                        'in_development': '#ffc107',
                        'deprecated': '#dc3545',
                        'experimental': '#17a2b8'
                    }[value] || '#6c757d'
                })
            },
            {
                key: 'description',
                label: 'Descrizione',
                type: 'text',
                searchable: true
            },
            {
                key: 'display_order',
                label: 'Ordine',
                type: 'custom',
                render: (value) => ({
                    type: 'text',
                    text: value,
                    style: 'text-align: center; font-weight: 500;'
                })
            },
            {
                key: 'is_active',
                label: 'Attivo',
                type: 'custom',
                render: (value) => ({
                    type: 'text',
                    text: value ? '✅ Sì' : '❌ No',
                    style: `color: ${value ? '#4caf50' : '#f44336'}; font-weight: 500;`
                })
            },
            {
                key: 'created_at',
                label: 'Data Creazione',
                type: 'date'
            },
            {
                key: 'updated_at',
                label: 'Data Modifica',
                type: 'date'
            },
            {
                key: 'actions',
                label: 'Azioni',
                type: 'actions'
            }
        ],
        fields: [
            { name: 'status_id', type: 'INTEGER', pk: true },
            { name: 'status_name', type: 'STRING' },
            { name: 'status_code', type: 'STRING' },
            { name: 'description', type: 'TEXT' },
            { name: 'display_order', type: 'INTEGER' },
            { name: 'is_active', type: 'BOOLEAN' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'updated_at', type: 'DATETIME' }
        ]
    },
    user_coins: {
        name: 'user_coins',
        label: 'Monete Utenti',
        apiEndpoint: 'admin/user_coins',
        dataKey: 'user_coins',
        icon: '🪙',
        color: '#FFD700',
        erDiagram: {
            x: 50,
            y: 500,
            color: '#FFD700'
        },
        columns: [
            { key: 'user_id', label: 'User ID', type: 'text', searchable: true },
            { key: 'balance', label: 'Balance', type: 'number', sortable: true },
            { key: 'total_earned', label: 'Total Earned', type: 'number', sortable: true },
            { key: 'total_spent', label: 'Total Spent', type: 'number', sortable: true },
            { key: 'last_updated', label: 'Last Updated', type: 'datetime', sortable: true },
            { key: 'created_at', label: 'Created', type: 'datetime', sortable: true },
            { key: 'actions', label: 'Azioni', type: 'actions' }
        ],
        fields: [
            { name: 'user_id', type: 'STRING', pk: true, fk: { table: 'users', field: 'user_id' } },
            { name: 'balance', type: 'INTEGER' },
            { name: 'total_earned', type: 'INTEGER' },
            { name: 'total_spent', type: 'INTEGER' },
            { name: 'last_updated', type: 'DATETIME' },
            { name: 'created_at', type: 'DATETIME' }
        ]
    },
    coin_transactions: {
        name: 'coin_transactions',
        label: 'Transazioni Monete',
        apiEndpoint: 'admin/coin_transactions',
        dataKey: 'transactions',
        icon: '💸',
        color: '#FF9800',
        erDiagram: {
            x: 350,
            y: 500,
            color: '#FF9800'
        },
        columns: [
            { key: 'transaction_id', label: 'ID', type: 'text', searchable: true },
            { key: 'user_id', label: 'User', type: 'text', searchable: true },
            { 
                key: 'amount', 
                label: 'Amount', 
                type: 'number', 
                sortable: true,
                render: (value) => {
                    const color = value > 0 ? '#28a745' : '#dc3545';
                    return {
                        type: 'html',
                        content: `<span style="color: ${color}; font-weight: bold;">${value > 0 ? '+' : ''}${value}</span>`
                    };
                }
            },
            { key: 'transaction_type', label: 'Type', type: 'badge', searchable: true },
            { key: 'source_id', label: 'Source', type: 'text' },
            { key: 'description', label: 'Description', type: 'text', searchable: true },
            { key: 'balance_after', label: 'Balance After', type: 'number' },
            { key: 'created_at', label: 'Date', type: 'datetime', sortable: true },
            { key: 'actions', label: 'Azioni', type: 'actions' }
        ],
        fields: [
            { name: 'transaction_id', type: 'STRING', pk: true },
            { name: 'user_id', type: 'STRING', fk: { table: 'users', field: 'user_id' } },
            { name: 'amount', type: 'INTEGER' },
            { name: 'transaction_type', type: 'STRING' },
            { name: 'source_id', type: 'STRING' },
            { name: 'description', type: 'TEXT' },
            { name: 'balance_after', type: 'INTEGER' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'extra_data', type: 'JSON' }
        ]
    },

    level_milestones: {
        name: 'level_milestones',
        label: 'Livelli Milestone',
        apiEndpoint: 'admin/level-milestones',
        dataKey: 'milestones',
        icon: '🏆',
        color: '#6366f1',
        erDiagram: {
            x: 850,
            y: 350,
            color: '#6366f1'
        },
        columns: [
            { 
                key: 'level', 
                label: 'Livello', 
                type: 'number', 
                sortable: true,
                render: (value) => ({
                    type: 'html',
                    content: `<strong style="font-size: 16px; color: #6366f1;">Lv ${value}</strong>`
                })
            },
            { 
                key: 'badge', 
                label: 'Badge', 
                type: 'text',
                render: (value) => ({
                    type: 'html',
                    content: `<span style="font-size: 32px;">${value}</span>`
                })
            },
            { key: 'title', label: 'Titolo', type: 'text', searchable: true },
            { 
                key: 'color', 
                label: 'Colore', 
                type: 'text',
                render: (value) => ({
                    type: 'html',
                    content: `<span style="display: inline-block; width: 40px; height: 20px; background: ${value}; border-radius: 4px; border: 1px solid #333;"></span> <code>${value}</code>`
                })
            },
            { key: 'description', label: 'Descrizione', type: 'text', searchable: true },
            { 
                key: 'is_active', 
                label: 'Attivo', 
                type: 'boolean',
                render: (value) => ({
                    type: 'html',
                    content: value ? '<span style="color: #28a745;">✓ Attivo</span>' : '<span style="color: #dc3545;">✗ Disattivato</span>'
                })
            },
            { key: 'actions', label: 'Azioni', type: 'actions' }
        ],
        fields: [
            { name: 'level', type: 'INTEGER', pk: true },
            { name: 'title', type: 'STRING' },
            { name: 'badge', type: 'STRING' },
            { name: 'color', type: 'STRING' },
            { name: 'description', type: 'TEXT' },
            { name: 'is_active', type: 'BOOLEAN' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'updated_at', type: 'DATETIME' }
        ]
    },

    level_rewards: {
        name: 'level_rewards',
        label: 'Ricompense Livello',
        apiEndpoint: 'admin/level-rewards',
        dataKey: 'level_rewards',
        icon: '🎁',
        color: '#8b5cf6',
        erDiagram: {
            x: 1050,
            y: 350,
            color: '#8b5cf6'
        },
        columns: [
            { key: 'reward_id', label: 'ID', type: 'text', searchable: true },
            { 
                key: 'level', 
                label: 'Livello', 
                type: 'number', 
                sortable: true,
                render: (value) => ({
                    type: 'html',
                    content: `<strong style="color: #6366f1;">Lv ${value}</strong>`
                })
            },
            { key: 'reward_type', label: 'Tipo', type: 'badge', searchable: true },
            { 
                key: 'reward_amount', 
                label: 'Quantità', 
                type: 'number', 
                sortable: true,
                render: (value, row) => ({
                    type: 'html',
                    content: row.reward_type === 'coins' ? `🪙 ${value}` : value
                })
            },
            { key: 'description', label: 'Descrizione', type: 'text', searchable: true },
            { 
                key: 'is_active', 
                label: 'Attivo', 
                type: 'boolean',
                render: (value) => ({
                    type: 'html',
                    content: value ? '<span style="color: #28a745;">✓ Attivo</span>' : '<span style="color: #dc3545;">✗ Disattivato</span>'
                })
            },
            {
                key: 'created_at',
                label: 'Data Creazione',
                type: 'date'
            },
            {
                key: 'updated_at',
                label: 'Data Modifica',
                type: 'date'
            },
            { key: 'actions', label: 'Azioni', type: 'actions' }
        ],
        fields: [
            { name: 'reward_id', type: 'STRING', pk: true },
            { name: 'level', type: 'INTEGER', fk: 'level_milestones.level' },
            { name: 'reward_type', type: 'STRING' },
            { name: 'reward_amount', type: 'INTEGER' },
            { name: 'description', type: 'TEXT' },
            { name: 'is_active', type: 'BOOLEAN' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'updated_at', type: 'DATETIME' }
        ]
    },

    weekly_leaderboards: {
        name: 'weekly_leaderboards',
        label: 'Leaderboard Settimanale',
        apiEndpoint: 'admin/weekly-leaderboards',
        dataKey: 'weekly_leaderboards',
        icon: '📅',
        color: '#10b981',
        erDiagram: {
            x: 1050,
            y: 500,
            color: '#10b981'
        },
        columns: [
            { key: 'entry_id', label: 'ID', type: 'text', searchable: true },
            { 
                key: 'week_start', 
                label: 'Settimana Inizio', 
                type: 'date',
                render: (value) => ({
                    type: 'html',
                    content: `<strong style="color: #10b981;">${Utils.formatDate(value)}</strong>`
                })
            },
            { key: 'week_end', label: 'Settimana Fine', type: 'date' },
            { key: 'user_id', label: 'User ID', type: 'text', searchable: true },
            { key: 'game_id', label: 'Game ID', type: 'text', searchable: true },
            { 
                key: 'score', 
                label: 'Score', 
                type: 'number', 
                sortable: true,
                render: (value) => ({
                    type: 'html',
                    content: `<strong style="font-size: 1.1em; color: #fbbf24;">${value}</strong>`
                })
            },
            {
                key: 'rank',
                label: 'Rank',
                type: 'number'
            },
            { key: 'created_at', label: 'Data Creazione', type: 'date' },
            { key: 'updated_at', label: 'Data Modifica', type: 'date' },
            { key: 'actions', label: 'Azioni', type: 'actions' }
        ],
        fields: [
            { name: 'entry_id', type: 'STRING', pk: true },
            { name: 'week_start', type: 'DATE' },
            { name: 'week_end', type: 'DATE' },
            { name: 'user_id', type: 'STRING', fk: 'users.user_id' },
            { name: 'game_id', type: 'STRING', fk: 'games.game_id' },
            { name: 'score', type: 'INTEGER' },
            { name: 'rank', type: 'INTEGER' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'updated_at', type: 'DATETIME' }
        ]
    },

    leaderboard_rewards: {
        name: 'leaderboard_rewards',
        label: 'Ricompense Leaderboard',
        apiEndpoint: 'admin/leaderboard-rewards',
        dataKey: 'leaderboard_rewards',
        icon: '🏅',
        color: '#f59e0b',
        erDiagram: {
            x: 1250,
            y: 500,
            color: '#f59e0b'
        },
        columns: [
            { key: 'reward_id', label: 'ID', type: 'text' },
            { 
                key: 'rank_start', 
                label: 'Rank Inizio', 
                type: 'number',
                render: (value, row) => {
                    const medal = value === 1 ? '🥇' : value === 2 ? '🥈' : value === 3 ? '🥉' : '🏅';
                    return {
                        type: 'html',
                        content: `${medal} <strong>${value}${row.rank_end && row.rank_end !== value ? ` - ${row.rank_end}` : ''}</strong>`
                    };
                }
            },
            { key: 'rank_end', label: 'Rank Fine', type: 'number' },
            { 
                key: 'steem_reward', 
                label: 'STEEM', 
                type: 'number',
                render: (value) => ({
                    type: 'html',
                    content: `<strong style="color: #3b82f6; font-size: 1.1em;">${value} STEEM</strong>`
                })
            },
            { 
                key: 'coin_reward', 
                label: 'Coins', 
                type: 'number',
                render: (value) => ({
                    type: 'html',
                    content: `🪙 <strong style="color: #fbbf24;">${value}</strong>`
                })
            },
            { 
                key: 'game_id', 
                label: 'Game ID', 
                type: 'text',
                render: (value) => ({
                    type: 'html',
                    content: value || '<span style="color: #10b981;">🌐 Globale</span>'
                })
            },
            {
                key: 'description',
                label: 'Descrizione',
                type: 'text'
            },
            {
                key: 'is_active',
                label: 'Attivo',
                type: 'boolean',
                render: (value) => ({
                    type: 'html',
                    content: value ? '<span style="color: #28a745;">✓ Attivo</span>' : '<span style="color: #dc3545;">✗ Disattivato</span>'
                })
            },
            {
                key: 'created_at',
                label: 'Data Creazione',
                type: 'date'
            },
            {
                key: 'updated_at',
                label: 'Data Modifica',
                type: 'date'
            },
            { key: 'actions', label: 'Azioni', type: 'actions' }
        ],
        fields: [
            { name: 'reward_id', type: 'STRING', pk: true },
            { name: 'game_id', type: 'STRING', fk: 'games.game_id' },
            { name: 'rank_start', type: 'INTEGER' },
            { name: 'rank_end', type: 'INTEGER' },
            { name: 'steem_reward', type: 'FLOAT' },
            { name: 'coin_reward', type: 'INTEGER' },
            { name: 'description', type: 'TEXT' },
            { name: 'is_active', type: 'BOOLEAN' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'updated_at', type: 'DATETIME' }
        ]
    },

    weekly_winners: {
        name: 'weekly_winners',
        label: 'Vincitori Settimanali',
        apiEndpoint: 'admin/weekly-winners',
        dataKey: 'weekly_winners',
        icon: '🏆',
        color: '#ef4444',
        erDiagram: {
            x: 1450,
            y: 500,
            color: '#ef4444'
        },
        columns: [
            { key: 'winner_id', label: 'ID', type: 'number' },
            { 
                key: 'week_start', 
                label: 'Settimana', 
                type: 'date',
                render: (value) => ({
                    type: 'html',
                    content: `<strong style="color: #ef4444;">${Utils.formatDate(value)}</strong>`
                })
            },
            { key: 'user_id', label: 'User ID', type: 'text', searchable: true },
            { key: 'game_id', label: 'Game ID', type: 'text', searchable: true },
            { 
                key: 'rank', 
                label: 'Posizione', 
                type: 'number',
                render: (value) => {
                    const medal = value === 1 ? '🥇' : value === 2 ? '🥈' : value === 3 ? '🥉' : '🏅';
                    return {
                        type: 'html',
                        content: `${medal} <strong>${value}°</strong>`
                    };
                }
            },
            { 
                key: 'score', 
                label: 'Score', 
                type: 'number',
                render: (value) => ({
                    type: 'html',
                    content: `<strong style="font-size: 1.1em;">${value}</strong>`
                })
            },
            { 
                key: 'steem_reward', 
                label: 'STEEM', 
                type: 'number',
                render: (value) => ({
                    type: 'html',
                    content: `<span style="color: #3b82f6; font-weight: bold;">${value} STEEM</span>`
                })
            },
            { 
                key: 'coin_reward', 
                label: 'Coins', 
                type: 'number',
                render: (value) => ({
                    type: 'html',
                    content: `🪙 ${value}`
                })
            },
            { 
                key: 'reward_sent', 
                label: 'Inviato', 
                type: 'boolean',
                render: (value) => ({
                    type: 'html',
                    content: value ? '<span style="color: #10b981;">✓ Sì</span>' : '<span style="color: #fbbf24;">⏳ In sospeso</span>'
                })
            },
            { 
                key: 'steem_tx_id', 
                label: 'TX ID', 
                type: 'text',
                render: (value) => ({
                    type: 'html',
                    content: value ? `<code style="font-size: 0.8em;">${value.substring(0, 8)}...</code>` : '-'
                })
            },
            {
                key: 'reward_sent_at',
                label: 'Data Invio',
                type: 'date'
            },
            {
                key: 'week_end',
                label: 'Fine Settimana',
                type: 'date'
            },
            { key: 'created_at', label: 'Data', type: 'date' },
            { key: 'actions', label: 'Azioni', type: 'actions' }
        ],
        fields: [
            { name: 'winner_id', type: 'STRING', pk: true },
            { name: 'week_start', type: 'DATE' },
            { name: 'week_end', type: 'DATE' },
            { name: 'game_id', type: 'STRING', fk: 'games.game_id' },
            { name: 'user_id', type: 'STRING', fk: 'users.user_id' },
            { name: 'rank', type: 'INTEGER' },
            { name: 'score', type: 'INTEGER' },
            { name: 'steem_reward', type: 'FLOAT' },
            { name: 'coin_reward', type: 'INTEGER' },
            { name: 'steem_tx_id', type: 'STRING' },
            { name: 'reward_sent', type: 'BOOLEAN' },
            { name: 'reward_sent_at', type: 'DATETIME' },
            { name: 'created_at', type: 'DATETIME' }
        ]
    },

    user_login_streak: {
        name: 'user_login_streak',
        label: 'User Login Streak',
        apiEndpoint: 'admin/user_login_streak',
        dataKey: 'user_login_streak',
        icon: '🎁',
        color: '#667eea',
        erDiagram: {
            x: 450,
            y: 600,
            color: '#667eea'
        },
        columns: [
            { 
                key: 'user_id', 
                label: 'User', 
                type: 'text', 
                searchable: true,
                render: (value) => ({
                    type: 'html',
                    content: `<code style="font-size: 0.85em;">${value.substring(0, 16)}...</code>`
                })
            },
            { 
                key: 'current_day', 
                label: 'Giorno', 
                type: 'number', 
                sortable: true,
                render: (value) => ({
                    type: 'html',
                    content: `<strong style="color: #667eea; font-size: 16px;">Day ${value}/7</strong>`
                })
            },
            { 
                key: 'last_claim_date', 
                label: 'Ultimo Claim', 
                type: 'date',
                render: (value) => {
                    if (!value) return { type: 'text', content: '-' };
                    return {
                        type: 'html',
                        content: `<span style="color: #28a745;">${value}</span>`
                    };
                }
            },
            { 
                key: 'total_cycles_completed', 
                label: 'Cicli', 
                type: 'number', 
                sortable: true,
                render: (value) => ({
                    type: 'html',
                    content: value > 0 ? `<span style="color: #ffd700;">🏆 ${value}</span>` : '<span style="color: #666;">0</span>'
                })
            },
            { key: 'created_at', label: 'Creato', type: 'datetime' },
            { key: 'updated_at', label: 'Aggiornato', type: 'datetime' },
            { key: 'actions', label: 'Azioni', type: 'actions' }
        ],
        fields: [
            { name: 'user_id', type: 'STRING', pk: true, fk: { table: 'users', field: 'user_id' } },
            { name: 'current_day', type: 'INTEGER' },
            { name: 'last_claim_date', type: 'DATE' },
            { name: 'total_cycles_completed', type: 'INTEGER' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'updated_at', type: 'DATETIME' }
        ]
    },

    daily_login_reward_config: {
        name: 'daily_login_reward_config',
        label: 'Daily Reward Config',
        apiEndpoint: 'admin/daily_login_reward_config',
        dataKey: 'daily_login_reward_config',
        icon: '⚙️',
        color: '#9c27b0',
        erDiagram: {
            x: 550,
            y: 600,
            color: '#9c27b0'
        },
        columns: [
            { 
                key: 'day', 
                label: 'Giorno', 
                type: 'number', 
                sortable: true,
                render: (value) => ({
                    type: 'html',
                    content: `<strong style="color: #9c27b0; font-size: 16px;">Day ${value}</strong>`
                })
            },
            { 
                key: 'emoji', 
                label: 'Icon', 
                type: 'text',
                render: (value) => ({
                    type: 'html',
                    content: `<span style="font-size: 24px;">${value}</span>`
                })
            },
            { 
                key: 'coins_reward', 
                label: 'Coins', 
                type: 'number', 
                sortable: true,
                render: (value) => ({
                    type: 'html',
                    content: `<span style="color: #ffd700; font-weight: bold; font-size: 16px;">🪙 ${value}</span>`
                })
            },
            { 
                key: 'is_active', 
                label: 'Attivo', 
                type: 'boolean',
                render: (value) => ({
                    type: 'html',
                    content: value ? '<span style="color: #28a745;">✓ Sì</span>' : '<span style="color: #dc3545;">✗ No</span>'
                })
            },
            { key: 'created_at', label: 'Creato', type: 'datetime' },
            { key: 'updated_at', label: 'Aggiornato', type: 'datetime' },
            { key: 'actions', label: 'Azioni', type: 'actions' }
        ],
        fields: [
            { name: 'day', type: 'INTEGER', pk: true },
            { name: 'coins_reward', type: 'INTEGER' },
            { name: 'emoji', type: 'TEXT' },
            { name: 'is_active', type: 'BOOLEAN' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'updated_at', type: 'DATETIME' }
        ]
    }
};

// Configuration for stats cards (can be extended dynamically)
const STATS_CONFIG = [
    { key: 'total_games', label: 'Giochi', icon: '🎮' },
    { key: 'total_users', label: 'Utenti', icon: '👤' },
    { key: 'total_sessions', label: 'Sessioni', icon: '🎯' },
    { key: 'total_leaderboard_entries', label: 'Leaderboard', icon: '🥇' },
    { key: 'total_xp_rules', label: 'XP Rules', icon: '⭐' },
    { key: 'total_quests', label: 'Quests', icon: '🏆' },
    { key: 'total_game_statuses', label: 'Stati', icon: '🏷️' },
    { key: 'total_coins_circulation', label: 'Coins', icon: '🪙' },
    { key: 'total_level_milestones', label: 'Milestone', icon: '🏆' },
    { key: 'total_level_rewards', label: 'Ricompense', icon: '🎁' },
    { key: 'total_weekly_leaderboard_entries', label: 'Leaderboard Weekly', icon: '📅' },
    { key: 'total_leaderboard_rewards', label: 'Premi LB', icon: '🏅' },
    { key: 'total_weekly_winners', label: 'Vincitori', icon: '🏆' },
    { key: 'total_user_login_streak', label: 'Login Streaks', icon: '🎁' },
    { key: 'total_daily_login_reward_config', label: 'Daily Config', icon: '⚙️' }
];

// Global configuration
const CONFIG = {
    API_BASE: '/admin',
    REFRESH_INTERVAL: null,
    MAX_RECORDS: 100,
    PAGINATION_SIZE: 20,
    PAGINATION_THRESHOLD: 50, // Mostra paginazione solo se ci sono più di 50 record
    DATE_FORMAT: {
        locale: 'it-IT',
        options: {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }
    }
};
