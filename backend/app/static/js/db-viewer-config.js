/**
 * Database Viewer Configuration
 * Centralised configuration for all tables and their definitions
 * To add a new table: simply add a new entry to TABLE_DEFINITIONS
 */

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
                render: (value) => ({
                    type: 'image',
                    src: value || 'https://via.placeholder.com/60',
                    style: 'width:60px;height:45px;object-fit:cover;border-radius:4px'
                })
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
                key: 'metadata',
                label: 'Play Count',
                type: 'custom',
                render: (value) => ({
                    type: 'text',
                    text: value?.playCount || 0
                })
            },
            {
                key: 'created_at',
                label: 'Data Creazione',
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
            { name: 'category', type: 'STRING' },
            { name: 'thumbnail', type: 'STRING' },
            { name: 'metadata', type: 'JSON' },
            { name: 'created_at', type: 'DATETIME' }
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
                label: 'User ID',
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
                key: 'steem_username',
                label: 'Steem',
                type: 'text'
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
                label: 'XP Totale',
                type: 'number',
                decimals: 2
            },
            {
                key: 'cur8_multiplier',
                label: 'Moltiplicatore',
                type: 'custom',
                render: (value) => ({
                    type: 'text',
                    text: (value || 1.0).toFixed(1) + 'x',
                    style: 'font-weight: 600; color: #9c27b0;'
                })
            },
            {
                key: 'created_at',
                label: 'Registrato',
                type: 'date'
            },
            {
                key: 'actions',
                label: 'Azioni',
                type: 'actions'
            }
        ],
        fields: [
            { name: 'user_id', type: 'STRING', pk: true },
            { name: 'username', type: 'STRING' },
            { name: 'email', type: 'STRING' },
            { name: 'steem_username', type: 'STRING' },
            { name: 'is_anonymous', type: 'BOOLEAN' },
            { name: 'total_xp_earned', type: 'FLOAT' },
            { name: 'cur8_multiplier', type: 'FLOAT' },
            { name: 'created_at', type: 'DATETIME' }
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
            { name: 'ended_at', type: 'DATETIME' }
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
            { name: 'priority', type: 'INTEGER' },
            { name: 'is_active', type: 'BOOLEAN' },
            { name: 'parameters', type: 'JSON' },
            { name: 'created_at', type: 'DATETIME' }
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
                key: 'sats_reward',
                label: 'Sats',
                type: 'custom',
                render: (value) => ({
                    type: 'text',
                    text: value,
                    style: value > 0 ? 'font-weight: bold; color: #ffc107;' : ''
                })
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
            { name: 'sats_reward', type: 'INTEGER' },
            { name: 'game_id', type: 'STRING', fk: 'games.game_id' },
            { name: 'is_active', type: 'BOOLEAN' }
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
                label: 'User ID',
                type: 'text',
                searchable: true
            },
            {
                key: 'quest_id',
                label: 'Quest ID',
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
                trueText: '✓ Sì',
                falseText: '✗ No',
                trueColor: '#28a745',
                falseColor: '#6c757d'
            },
            {
                key: 'completed_at',
                label: 'Data Completamento',
                type: 'date'
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
            { name: 'completed_at', type: 'DATETIME' }
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
    { key: 'total_quests', label: 'Quests', icon: '🏆' }
];

// Global configuration
const CONFIG = {
    API_BASE: '/admin',
    REFRESH_INTERVAL: null,
    MAX_RECORDS: 100,
    PAGINATION_SIZE: 20,
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
