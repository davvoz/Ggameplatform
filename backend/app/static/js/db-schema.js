/**
 * Database Schema Definition
 * ===========================
 * Central source of truth for database schema matching ORM models.
 * This file defines ALL tables, fields, relationships, and display configurations.
 * 
 * PRINCIPLES:
 * - Single Responsibility: Each table definition is self-contained
 * - Open/Closed: Easy to add new tables without modifying existing code
 * - DRY: Reusable field types and render functions
 * - Scalable: Fields auto-generate CRUD forms, table columns, and detail views
 * 
 * TO ADD A NEW TABLE:
 * 1. Add entry to DB_SCHEMA with fields matching the ORM model
 * 2. That's it! The system auto-generates everything else.
 */

// ============ FIELD TYPE DEFINITIONS ============
// Reusable field configurations to avoid repetition
const FIELD_TYPES = {
    // Primary Key Types
    STRING_PK: { type: 'STRING', pk: true, required: true },
    INTEGER_PK: { type: 'INTEGER', pk: true, autoIncrement: true },
    
    // Common Field Types
    STRING: { type: 'STRING' },
    TEXT: { type: 'TEXT' },
    INTEGER: { type: 'INTEGER' },
    FLOAT: { type: 'FLOAT' },
    BOOLEAN: { type: 'BOOLEAN', default: false },
    DATETIME: { type: 'DATETIME' },
    DATE: { type: 'DATE' },
    JSON: { type: 'JSON', default: '{}' },
    
    // Specialized Types
    CREATED_AT: { type: 'DATETIME', readonly: true, autoSet: 'create' },
    UPDATED_AT: { type: 'DATETIME', readonly: true, autoSet: 'update' },
    IS_ACTIVE: { type: 'BOOLEAN', default: true }
};

// ============ RENDER HELPERS ============
// Reusable render functions for common patterns
const RENDERERS = {
    badge: (color) => (value) => ({
        type: 'badge',
        text: value || '-',
        color: color || '#6c757d'
    }),
    
    booleanStatus: (trueText, falseText, trueColor = '#28a745', falseColor = '#dc3545') => (value) => ({
        type: 'html',
        content: value 
            ? `<span style="color: ${trueColor}; font-weight: 600;">${trueText}</span>`
            : `<span style="color: ${falseColor}; font-weight: 600;">${falseText}</span>`
    }),
    
    truncateId: (length = 16) => (value) => ({
        type: 'html',
        content: value ? `<code style="font-size: 0.85em;">${value.substring(0, length)}${value.length > length ? '...' : ''}</code>` : '-'
    }),
    
    coins: (value) => ({
        type: 'html',
        content: value > 0 ? `<span style="color: #ffd700; font-weight: bold;">🪙 ${value}</span>` : '<span style="color: #999;">0</span>'
    }),
    
    xp: (value) => ({
        type: 'html',
        content: `<span style="color: #28a745; font-weight: bold;">⭐ ${parseFloat(value || 0).toFixed(0)}</span>`
    }),
    
    score: (value) => ({
        type: 'html',
        content: `<strong style="font-size: 1.1em; color: #2563eb;">${value || 0}</strong>`
    }),
    
    rank: (value) => {
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const medal = medals[value] || '🏅';
        return {
            type: 'html',
            content: `${medal} <strong>${value}°</strong>`
        };
    },
    
    amount: (value) => {
        const color = value > 0 ? '#28a745' : '#dc3545';
        const prefix = value > 0 ? '+' : '';
        return {
            type: 'html',
            content: `<span style="color: ${color}; font-weight: bold;">${prefix}${value}</span>`
        };
    },
    
    streakDays: (value) => ({
        type: 'html',
        content: value > 0 ? `<span style="font-weight: bold; color: #ff5722;">🔥 ${value}</span>` : '-'
    }),
    
    levelBadge: (emoji) => (value, row) => ({
        type: 'html',
        content: `<span style="font-size: 24px;">${emoji || row?.badge || '🏆'}</span>`
    }),
    
    colorPreview: (value) => ({
        type: 'html',
        content: value ? `<span style="display: inline-block; width: 20px; height: 20px; background: ${value}; border-radius: 4px; border: 1px solid #333; vertical-align: middle;"></span> <code style="font-size: 0.85em;">${value}</code>` : '-'
    }),
    
    thumbnail: (value, row) => {
        let src = 'https://via.placeholder.com/60x45?text=No+Image';
        if (value && row?.game_id) {
            src = value.startsWith('http') ? value : `/games/${row.game_id}/${value}`;
        }
        return {
            type: 'image',
            src: src,
            style: 'width:60px;height:45px;object-fit:cover;border-radius:4px;border:1px solid #333'
        };
    },
    
    gameStatus: (value, item) => {
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
    },
    
    statusCode: (value) => {
        const colors = {
            'developed': '#28a745',
            'in_development': '#ffc107',
            'deprecated': '#dc3545',
            'experimental': '#17a2b8'
        };
        return {
            type: 'badge',
            text: value,
            color: colors[value] || '#6c757d'
        };
    }
};

// ============ DATABASE SCHEMA ============
const DB_SCHEMA = {
    // ==================== CORE TABLES ====================
    
    games: {
        tableName: 'games',
        label: 'Giochi',
        icon: '🎮',
        color: '#4CAF50',
        apiEndpoint: 'games',
        dataKey: 'games',
        
        // Primary and Foreign Keys
        primaryKey: 'game_id',
        foreignKeys: {
            status_id: { table: 'game_statuses', field: 'status_id' }
        },
        
        // All fields (for ORM/CRUD)
        fields: {
            game_id: { ...FIELD_TYPES.STRING_PK, label: 'Game ID' },
            title: { ...FIELD_TYPES.STRING, label: 'Titolo', required: true },
            description: { ...FIELD_TYPES.TEXT, label: 'Descrizione' },
            author: { ...FIELD_TYPES.STRING, label: 'Autore' },
            version: { ...FIELD_TYPES.STRING, label: 'Versione', default: '1.0.0' },
            thumbnail: { ...FIELD_TYPES.STRING, label: 'Thumbnail' },
            entry_point: { ...FIELD_TYPES.STRING, label: 'Entry Point', required: true },
            category: { ...FIELD_TYPES.STRING, label: 'Categoria', default: 'uncategorized' },
            tags: { ...FIELD_TYPES.JSON, label: 'Tags', default: '[]' },
            status_id: { ...FIELD_TYPES.INTEGER, label: 'Stato', fk: 'game_statuses.status_id' },
            steem_rewards_enabled: { ...FIELD_TYPES.BOOLEAN, label: 'STEEM Rewards' },
            extra_data: { ...FIELD_TYPES.JSON, label: 'Extra Data' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' },
            updated_at: { ...FIELD_TYPES.UPDATED_AT, label: 'Aggiornato il' }
        },
        
        // Table columns (synthesis view - only essential info)
        tableColumns: ['thumbnail', 'game_id', 'title', 'category', 'status', 'version', 'actions'],
        
        // Column display overrides
        columnConfig: {
            thumbnail: { label: 'Immagine', width: '80px', type: 'custom', render: RENDERERS.thumbnail },
            game_id: { label: 'Game ID', width: '120px', searchable: true },
            title: { label: 'Titolo', searchable: true, style: 'font-weight: 600;' },
            category: { label: 'Categoria', type: 'badge' },
            status: { label: 'Stato', type: 'custom', render: RENDERERS.gameStatus },
            version: { label: 'Versione', style: 'color: #2563eb;' }
        },
        
        // ER Diagram position
        erPosition: { x: 50, y: 50 }
    },
    
    game_statuses: {
        tableName: 'game_statuses',
        label: 'Stati Giochi',
        icon: '🏷️',
        color: '#9C27B0',
        apiEndpoint: 'game-statuses',
        dataKey: 'game_statuses',
        
        primaryKey: 'status_id',
        foreignKeys: {},
        
        fields: {
            status_id: { ...FIELD_TYPES.INTEGER_PK, label: 'ID' },
            status_name: { ...FIELD_TYPES.STRING, label: 'Nome', required: true },
            status_code: { ...FIELD_TYPES.STRING, label: 'Codice', required: true },
            description: { ...FIELD_TYPES.TEXT, label: 'Descrizione' },
            display_order: { ...FIELD_TYPES.INTEGER, label: 'Ordine', default: 0 },
            is_active: { ...FIELD_TYPES.IS_ACTIVE, label: 'Attivo' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' },
            updated_at: { ...FIELD_TYPES.UPDATED_AT, label: 'Aggiornato il' }
        },
        
        tableColumns: ['status_id', 'status_name', 'status_code', 'display_order', 'is_active', 'actions'],
        
        columnConfig: {
            status_id: { width: '60px' },
            status_name: { searchable: true, style: 'font-weight: 600;' },
            status_code: { type: 'custom', render: RENDERERS.statusCode },
            display_order: { style: 'text-align: center;' },
            is_active: { type: 'custom', render: RENDERERS.booleanStatus('✅ Attivo', '❌ Inattivo') }
        },
        
        erPosition: { x: 50, y: 200 }
    },
    
    users: {
        tableName: 'users',
        label: 'Utenti',
        icon: '👤',
        color: '#2196F3',
        apiEndpoint: 'users',
        dataKey: 'users',
        
        primaryKey: 'user_id',
        foreignKeys: {},
        
        fields: {
            user_id: { ...FIELD_TYPES.STRING_PK, label: 'User ID' },
            username: { ...FIELD_TYPES.STRING, label: 'Username' },
            email: { ...FIELD_TYPES.STRING, label: 'Email' },
            password_hash: { ...FIELD_TYPES.STRING, label: 'Password Hash', hidden: true },
            steem_username: { ...FIELD_TYPES.STRING, label: 'Steem Username' },
            is_anonymous: { ...FIELD_TYPES.BOOLEAN, label: 'Anonimo' },
            cur8_multiplier: { ...FIELD_TYPES.FLOAT, label: 'CUR8 Multiplier', default: 1.0 },
            votes_cur8_witness: { ...FIELD_TYPES.BOOLEAN, label: 'Vota CUR8 Witness' },
            delegation_amount: { ...FIELD_TYPES.FLOAT, label: 'Delegation (STEEM)', default: 0.0 },
            last_multiplier_check: { ...FIELD_TYPES.DATETIME, label: 'Ultimo Check Multiplier', readonly: true },
            total_xp_earned: { ...FIELD_TYPES.FLOAT, label: 'XP Totale', default: 0.0 },
            game_scores: { ...FIELD_TYPES.JSON, label: 'Game Scores' },
            avatar: { ...FIELD_TYPES.STRING, label: 'Avatar' },
            login_streak: { ...FIELD_TYPES.INTEGER, label: 'Login Streak', default: 0 },
            last_login_date: { ...FIELD_TYPES.DATE, label: 'Ultima Data Login' },
            last_login: { ...FIELD_TYPES.DATETIME, label: 'Ultimo Login' },
            last_steem_post: { ...FIELD_TYPES.DATETIME, label: 'Ultimo Post Steem' },
            extra_data: { ...FIELD_TYPES.JSON, label: 'Extra Data' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' }
        },
        
        tableColumns: ['user_id', 'username', 'is_anonymous', 'total_xp_earned', 'login_streak', 'last_login', 'actions'],
        
        columnConfig: {
            user_id: { type: 'custom', render: RENDERERS.truncateId(12), searchable: true },
            username: { searchable: true, style: 'font-weight: 600;' },
            is_anonymous: { type: 'custom', render: RENDERERS.booleanStatus('🔓 Anonimo', '🔐 Registrato', '#ff9800', '#4caf50') },
            total_xp_earned: { type: 'custom', render: RENDERERS.xp },
            login_streak: { type: 'custom', render: RENDERERS.streakDays },
            last_login: { type: 'date' }
        },
        
        erPosition: { x: 50, y: 350 }
    },
    
    // ==================== GAMEPLAY TABLES ====================
    
    game_sessions: {
        tableName: 'game_sessions',
        label: 'Sessioni',
        icon: '🎯',
        color: '#FF9800',
        apiEndpoint: 'game-sessions',
        dataKey: 'sessions',
        
        primaryKey: 'session_id',
        foreignKeys: {
            user_id: { table: 'users', field: 'user_id' },
            game_id: { table: 'games', field: 'game_id' }
        },
        
        fields: {
            session_id: { ...FIELD_TYPES.STRING_PK, label: 'Session ID' },
            user_id: { ...FIELD_TYPES.STRING, label: 'User', required: true, fk: 'users.user_id' },
            game_id: { ...FIELD_TYPES.STRING, label: 'Game', required: true, fk: 'games.game_id' },
            score: { ...FIELD_TYPES.INTEGER, label: 'Score', default: 0 },
            xp_earned: { ...FIELD_TYPES.FLOAT, label: 'XP Guadagnato', default: 0 },
            duration_seconds: { ...FIELD_TYPES.INTEGER, label: 'Durata (sec)', default: 0 },
            started_at: { ...FIELD_TYPES.DATETIME, label: 'Inizio', required: true },
            ended_at: { ...FIELD_TYPES.DATETIME, label: 'Fine' },
            extra_data: { ...FIELD_TYPES.JSON, label: 'Extra Data' }
        },
        
        tableColumns: ['session_id', 'user_id', 'game_id', 'score', 'xp_earned', 'duration_seconds', 'ended_at', 'actions'],
        
        columnConfig: {
            session_id: { type: 'custom', render: RENDERERS.truncateId(10), searchable: true },
            user_id: { type: 'custom', render: RENDERERS.truncateId(10), searchable: true },
            game_id: { searchable: true },
            score: { type: 'custom', render: RENDERERS.score },
            xp_earned: { type: 'custom', render: RENDERERS.xp },
            duration_seconds: { type: 'duration' },
            ended_at: { type: 'custom', render: (v) => ({ type: 'html', content: v ? Utils.formatDate(v) : '<span style="color: #ff9800;">⏳ In corso</span>' }) }
        },
        
        erPosition: { x: 400, y: 200 }
    },
    
    leaderboards: {
        tableName: 'leaderboards',
        label: 'Leaderboard',
        icon: '🥇',
        color: '#FF5722',
        apiEndpoint: 'leaderboard-entries',
        dataKey: 'leaderboard',
        
        primaryKey: 'entry_id',
        foreignKeys: {
            user_id: { table: 'users', field: 'user_id' },
            game_id: { table: 'games', field: 'game_id' }
        },
        uniqueConstraints: [['user_id', 'game_id']],
        
        fields: {
            entry_id: { ...FIELD_TYPES.STRING_PK, label: 'Entry ID' },
            user_id: { ...FIELD_TYPES.STRING, label: 'User', required: true, fk: 'users.user_id' },
            game_id: { ...FIELD_TYPES.STRING, label: 'Game', required: true, fk: 'games.game_id' },
            score: { ...FIELD_TYPES.INTEGER, label: 'Score', required: true },
            rank: { ...FIELD_TYPES.INTEGER, label: 'Posizione' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Data' }
        },
        
        tableColumns: ['rank', 'user_id', 'game_id', 'score', 'created_at', 'actions'],
        
        columnConfig: {
            rank: { type: 'custom', render: RENDERERS.rank },
            user_id: { type: 'custom', render: RENDERERS.truncateId(12), searchable: true },
            game_id: { searchable: true },
            score: { type: 'custom', render: RENDERERS.score },
            created_at: { type: 'date' }
        },
        
        erPosition: { x: 400, y: 350 }
    },
    
    // ==================== QUEST SYSTEM ====================
    
    quests: {
        tableName: 'quests',
        label: 'Quests',
        icon: '🏆',
        color: '#F44336',
        apiEndpoint: 'quests-crud',
        dataKey: 'quests',
        
        primaryKey: 'quest_id',
        foreignKeys: {},
        
        fields: {
            quest_id: { ...FIELD_TYPES.INTEGER_PK, label: 'ID' },
            title: { ...FIELD_TYPES.STRING, label: 'Titolo', required: true },
            description: { ...FIELD_TYPES.TEXT, label: 'Descrizione' },
            quest_type: { ...FIELD_TYPES.STRING, label: 'Tipo', required: true },
            target_value: { ...FIELD_TYPES.INTEGER, label: 'Target', required: true },
            xp_reward: { ...FIELD_TYPES.INTEGER, label: 'XP Reward', required: true },
            reward_coins: { ...FIELD_TYPES.INTEGER, label: 'Coins Reward', default: 0 },
            is_active: { ...FIELD_TYPES.IS_ACTIVE, label: 'Attiva' },
            config: { ...FIELD_TYPES.JSON, label: 'Configurazione' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creata il' }
        },
        
        tableColumns: ['quest_id', 'title', 'quest_type', 'target_value', 'xp_reward', 'reward_coins', 'is_active', 'actions'],
        
        columnConfig: {
            quest_id: { width: '60px' },
            title: { searchable: true, style: 'font-weight: 600;' },
            quest_type: { type: 'badge' },
            target_value: { style: 'font-weight: bold; color: #2563eb;' },
            xp_reward: { type: 'custom', render: RENDERERS.xp },
            reward_coins: { type: 'custom', render: RENDERERS.coins },
            is_active: { type: 'custom', render: RENDERERS.booleanStatus('✓ Attiva', '✗ Inattiva') }
        },
        
        erPosition: { x: 750, y: 50 }
    },
    
    user_quests: {
        tableName: 'user_quests',
        label: 'User Quests',
        icon: '📋',
        color: '#E91E63',
        apiEndpoint: 'user-quests-crud',
        dataKey: 'user_quests',
        
        primaryKey: 'id',
        foreignKeys: {
            user_id: { table: 'users', field: 'user_id' },
            quest_id: { table: 'quests', field: 'quest_id' }
        },
        
        fields: {
            id: { ...FIELD_TYPES.INTEGER_PK, label: 'ID' },
            user_id: { ...FIELD_TYPES.STRING, label: 'User', required: true, fk: 'users.user_id' },
            quest_id: { ...FIELD_TYPES.INTEGER, label: 'Quest', required: true, fk: 'quests.quest_id' },
            current_progress: { ...FIELD_TYPES.INTEGER, label: 'Progresso', default: 0 },
            is_completed: { ...FIELD_TYPES.BOOLEAN, label: 'Completata' },
            is_claimed: { ...FIELD_TYPES.BOOLEAN, label: 'Reclamata' },
            completed_at: { ...FIELD_TYPES.DATETIME, label: 'Completata il' },
            claimed_at: { ...FIELD_TYPES.DATETIME, label: 'Reclamata il' },
            started_at: { ...FIELD_TYPES.DATETIME, label: 'Iniziata il', required: true },
            extra_data: { ...FIELD_TYPES.JSON, label: 'Extra Data' }
        },
        
        tableColumns: ['id', 'user_id', 'quest_id', 'current_progress', 'is_completed', 'is_claimed', 'actions'],
        
        columnConfig: {
            id: { width: '60px' },
            user_id: { type: 'custom', render: RENDERERS.truncateId(12), searchable: true },
            quest_id: { style: 'font-weight: bold; color: #E91E63;' },
            current_progress: { style: 'font-weight: bold; color: #2563eb;' },
            is_completed: { type: 'custom', render: RENDERERS.booleanStatus('✓', '✗', '#28a745', '#6c757d') },
            is_claimed: { type: 'custom', render: RENDERERS.booleanStatus('✓', '⏳', '#69f0ae', '#ffc107') }
        },
        
        erPosition: { x: 750, y: 200 }
    },
    
    // ==================== XP SYSTEM ====================
    
    xp_rules: {
        tableName: 'xp_rules',
        label: 'XP Rules',
        icon: '⭐',
        color: '#9C27B0',
        apiEndpoint: 'xp-rules',
        dataKey: 'xp_rules',
        
        primaryKey: 'rule_id',
        foreignKeys: {
            game_id: { table: 'games', field: 'game_id' }
        },
        
        fields: {
            rule_id: { ...FIELD_TYPES.STRING_PK, label: 'Rule ID' },
            game_id: { ...FIELD_TYPES.STRING, label: 'Game', required: true, fk: 'games.game_id' },
            rule_name: { ...FIELD_TYPES.STRING, label: 'Nome', required: true },
            rule_type: { ...FIELD_TYPES.STRING, label: 'Tipo', required: true },
            parameters: { ...FIELD_TYPES.JSON, label: 'Parametri' },
            priority: { ...FIELD_TYPES.INTEGER, label: 'Priorità', default: 0 },
            is_active: { ...FIELD_TYPES.IS_ACTIVE, label: 'Attivo' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' },
            updated_at: { ...FIELD_TYPES.UPDATED_AT, label: 'Aggiornato il' }
        },
        
        tableColumns: ['rule_id', 'game_id', 'rule_name', 'rule_type', 'priority', 'is_active', 'actions'],
        
        columnConfig: {
            rule_id: { type: 'custom', render: RENDERERS.truncateId(10), searchable: true },
            game_id: { searchable: true },
            rule_name: { searchable: true, style: 'font-weight: 600;' },
            rule_type: { type: 'badge' },
            priority: { style: 'text-align: center; font-weight: bold;' },
            is_active: { type: 'custom', render: RENDERERS.booleanStatus('✓ Attivo', '✗ Inattivo') }
        },
        
        erPosition: { x: 400, y: 50 }
    },
    
    // ==================== COIN SYSTEM ====================
    
    user_coins: {
        tableName: 'user_coins',
        label: 'Monete Utenti',
        icon: '🪙',
        color: '#FFD700',
        apiEndpoint: 'user-coins',
        dataKey: 'user_coins',
        
        primaryKey: 'user_id',
        foreignKeys: {
            user_id: { table: 'users', field: 'user_id' }
        },
        
        fields: {
            user_id: { ...FIELD_TYPES.STRING_PK, label: 'User ID', fk: 'users.user_id' },
            balance: { ...FIELD_TYPES.INTEGER, label: 'Saldo', default: 0 },
            total_earned: { ...FIELD_TYPES.INTEGER, label: 'Totale Guadagnato', default: 0 },
            total_spent: { ...FIELD_TYPES.INTEGER, label: 'Totale Speso', default: 0 },
            last_updated: { ...FIELD_TYPES.DATETIME, label: 'Ultimo Aggiornamento' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' }
        },
        
        tableColumns: ['user_id', 'balance', 'total_earned', 'total_spent', 'last_updated', 'actions'],
        
        columnConfig: {
            user_id: { type: 'custom', render: RENDERERS.truncateId(12), searchable: true },
            balance: { type: 'custom', render: RENDERERS.coins },
            total_earned: { type: 'custom', render: (v) => ({ type: 'html', content: `<span style="color:#28a745">+${v}</span>` }) },
            total_spent: { type: 'custom', render: (v) => ({ type: 'html', content: `<span style="color:#dc3545">-${v}</span>` }) },
            last_updated: { type: 'date' }
        },
        
        erPosition: { x: 50, y: 500 }
    },
    
    coin_transactions: {
        tableName: 'coin_transactions',
        label: 'Transazioni',
        icon: '💸',
        color: '#FF9800',
        apiEndpoint: 'coin-transactions',
        dataKey: 'transactions',
        
        primaryKey: 'transaction_id',
        foreignKeys: {
            user_id: { table: 'users', field: 'user_id' }
        },
        
        fields: {
            transaction_id: { ...FIELD_TYPES.STRING_PK, label: 'Transaction ID' },
            user_id: { ...FIELD_TYPES.STRING, label: 'User', required: true, fk: 'users.user_id' },
            amount: { ...FIELD_TYPES.INTEGER, label: 'Importo', required: true },
            transaction_type: { ...FIELD_TYPES.STRING, label: 'Tipo', required: true },
            source_id: { ...FIELD_TYPES.STRING, label: 'Source ID' },
            description: { ...FIELD_TYPES.TEXT, label: 'Descrizione' },
            balance_after: { ...FIELD_TYPES.INTEGER, label: 'Saldo Dopo', required: true },
            extra_data: { ...FIELD_TYPES.JSON, label: 'Extra Data' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Data' }
        },
        
        tableColumns: ['transaction_id', 'user_id', 'amount', 'transaction_type', 'balance_after', 'created_at', 'actions'],
        
        columnConfig: {
            transaction_id: { type: 'custom', render: RENDERERS.truncateId(10), searchable: true },
            user_id: { type: 'custom', render: RENDERERS.truncateId(10), searchable: true },
            amount: { type: 'custom', render: RENDERERS.amount },
            transaction_type: { type: 'badge', searchable: true },
            balance_after: { type: 'custom', render: RENDERERS.coins },
            created_at: { type: 'date' }
        },
        
        erPosition: { x: 250, y: 500 }
    },
    
    // ==================== LEVEL SYSTEM ====================
    
    level_milestones: {
        tableName: 'level_milestones',
        label: 'Livelli',
        icon: '🏆',
        color: '#6366f1',
        apiEndpoint: 'level-milestones',
        dataKey: 'milestones',
        
        primaryKey: 'level',
        foreignKeys: {},
        
        fields: {
            level: { ...FIELD_TYPES.INTEGER_PK, label: 'Livello' },
            title: { ...FIELD_TYPES.STRING, label: 'Titolo', required: true },
            badge: { ...FIELD_TYPES.STRING, label: 'Badge', required: true },
            color: { ...FIELD_TYPES.STRING, label: 'Colore', required: true },
            description: { ...FIELD_TYPES.TEXT, label: 'Descrizione' },
            is_active: { ...FIELD_TYPES.IS_ACTIVE, label: 'Attivo' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' },
            updated_at: { ...FIELD_TYPES.UPDATED_AT, label: 'Aggiornato il' }
        },
        
        tableColumns: ['level', 'badge', 'title', 'color', 'is_active', 'actions'],
        
        columnConfig: {
            level: { type: 'custom', render: (v) => ({ type: 'html', content: `<strong style="font-size: 16px; color: #6366f1;">Lv ${v}</strong>` }) },
            badge: { type: 'custom', render: (v) => ({ type: 'html', content: `<span style="font-size: 28px;">${v}</span>` }) },
            title: { searchable: true, style: 'font-weight: 600;' },
            color: { type: 'custom', render: RENDERERS.colorPreview },
            is_active: { type: 'custom', render: RENDERERS.booleanStatus('✓ Attivo', '✗ Inattivo') }
        },
        
        erPosition: { x: 750, y: 350 }
    },
    
    level_rewards: {
        tableName: 'level_rewards',
        label: 'Ricompense Livello',
        icon: '🎁',
        color: '#8b5cf6',
        apiEndpoint: 'level-rewards',
        dataKey: 'level_rewards',
        
        primaryKey: 'reward_id',
        foreignKeys: {
            level: { table: 'level_milestones', field: 'level' }
        },
        
        fields: {
            reward_id: { ...FIELD_TYPES.STRING_PK, label: 'Reward ID' },
            level: { ...FIELD_TYPES.INTEGER, label: 'Livello', required: true, fk: 'level_milestones.level' },
            reward_type: { ...FIELD_TYPES.STRING, label: 'Tipo', required: true },
            reward_amount: { ...FIELD_TYPES.INTEGER, label: 'Quantità', required: true },
            description: { ...FIELD_TYPES.TEXT, label: 'Descrizione' },
            is_active: { ...FIELD_TYPES.IS_ACTIVE, label: 'Attivo' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' },
            updated_at: { ...FIELD_TYPES.UPDATED_AT, label: 'Aggiornato il' }
        },
        
        tableColumns: ['reward_id', 'level', 'reward_type', 'reward_amount', 'is_active', 'actions'],
        
        columnConfig: {
            reward_id: { type: 'custom', render: RENDERERS.truncateId(10), searchable: true },
            level: { type: 'custom', render: (v) => ({ type: 'html', content: `<strong style="color: #6366f1;">Lv ${v}</strong>` }) },
            reward_type: { type: 'badge', searchable: true },
            reward_amount: { type: 'custom', render: (v, row) => ({ type: 'html', content: row?.reward_type === 'coins' ? `🪙 ${v}` : `${v}` }) },
            is_active: { type: 'custom', render: RENDERERS.booleanStatus('✓ Attivo', '✗ Inattivo') }
        },
        
        erPosition: { x: 950, y: 350 }
    },
    
    // ==================== WEEKLY COMPETITION ====================
    
    weekly_leaderboards: {
        tableName: 'weekly_leaderboards',
        label: 'Leaderboard Settimanale',
        icon: '📅',
        color: '#10b981',
        apiEndpoint: 'weekly-leaderboards',
        dataKey: 'weekly_leaderboards',
        
        primaryKey: 'entry_id',
        foreignKeys: {
            user_id: { table: 'users', field: 'user_id' },
            game_id: { table: 'games', field: 'game_id' }
        },
        uniqueConstraints: [['week_start', 'user_id', 'game_id']],
        
        fields: {
            entry_id: { ...FIELD_TYPES.STRING_PK, label: 'Entry ID' },
            week_start: { ...FIELD_TYPES.DATE, label: 'Inizio Settimana', required: true },
            week_end: { ...FIELD_TYPES.DATE, label: 'Fine Settimana', required: true },
            user_id: { ...FIELD_TYPES.STRING, label: 'User', required: true, fk: 'users.user_id' },
            game_id: { ...FIELD_TYPES.STRING, label: 'Game', required: true, fk: 'games.game_id' },
            score: { ...FIELD_TYPES.INTEGER, label: 'Score', required: true },
            rank: { ...FIELD_TYPES.INTEGER, label: 'Posizione' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' },
            updated_at: { ...FIELD_TYPES.UPDATED_AT, label: 'Aggiornato il' }
        },
        
        tableColumns: ['week_start', 'user_id', 'game_id', 'score', 'rank', 'actions'],
        
        columnConfig: {
            week_start: { type: 'custom', render: (v) => ({ type: 'html', content: `<strong style="color: #10b981;">${v}</strong>` }) },
            user_id: { type: 'custom', render: RENDERERS.truncateId(10), searchable: true },
            game_id: { searchable: true },
            score: { type: 'custom', render: RENDERERS.score },
            rank: { type: 'custom', render: RENDERERS.rank }
        },
        
        erPosition: { x: 400, y: 500 }
    },
    
    leaderboard_rewards: {
        tableName: 'leaderboard_rewards',
        label: 'Premi Leaderboard',
        icon: '🏅',
        color: '#f59e0b',
        apiEndpoint: 'leaderboard-rewards',
        dataKey: 'leaderboard_rewards',
        
        primaryKey: 'reward_id',
        foreignKeys: {
            game_id: { table: 'games', field: 'game_id' }
        },
        
        fields: {
            reward_id: { ...FIELD_TYPES.STRING_PK, label: 'Reward ID' },
            game_id: { ...FIELD_TYPES.STRING, label: 'Game', fk: 'games.game_id' },
            rank_start: { ...FIELD_TYPES.INTEGER, label: 'Rank Inizio', required: true },
            rank_end: { ...FIELD_TYPES.INTEGER, label: 'Rank Fine', required: true },
            steem_reward: { ...FIELD_TYPES.FLOAT, label: 'STEEM', default: 0 },
            coin_reward: { ...FIELD_TYPES.INTEGER, label: 'Coins', default: 0 },
            description: { ...FIELD_TYPES.TEXT, label: 'Descrizione' },
            is_active: { ...FIELD_TYPES.IS_ACTIVE, label: 'Attivo' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' },
            updated_at: { ...FIELD_TYPES.UPDATED_AT, label: 'Aggiornato il' }
        },
        
        tableColumns: ['rank_start', 'game_id', 'steem_reward', 'coin_reward', 'is_active', 'actions'],
        
        columnConfig: {
            rank_start: { type: 'custom', render: (v, row) => {
                const medal = v === 1 ? '🥇' : v === 2 ? '🥈' : v === 3 ? '🥉' : '🏅';
                const range = row?.rank_end && row.rank_end !== v ? ` - ${row.rank_end}` : '';
                return { type: 'html', content: `${medal} <strong>${v}${range}</strong>` };
            }},
            game_id: { type: 'custom', render: (v) => ({ type: 'html', content: v || '<span style="color: #10b981;">🌐 Globale</span>' }), searchable: true },
            steem_reward: { type: 'custom', render: (v) => ({ type: 'html', content: `<strong style="color: #3b82f6;">${v} STEEM</strong>` }) },
            coin_reward: { type: 'custom', render: RENDERERS.coins },
            is_active: { type: 'custom', render: RENDERERS.booleanStatus('✓ Attivo', '✗ Inattivo') }
        },
        
        erPosition: { x: 600, y: 500 }
    },
    
    weekly_winners: {
        tableName: 'weekly_winners',
        label: 'Vincitori Settimanali',
        icon: '🏆',
        color: '#ef4444',
        apiEndpoint: 'weekly-winners',
        dataKey: 'weekly_winners',
        
        primaryKey: 'winner_id',
        foreignKeys: {
            user_id: { table: 'users', field: 'user_id' },
            game_id: { table: 'games', field: 'game_id' }
        },
        
        fields: {
            winner_id: { ...FIELD_TYPES.STRING_PK, label: 'Winner ID' },
            week_start: { ...FIELD_TYPES.DATE, label: 'Inizio Settimana', required: true },
            week_end: { ...FIELD_TYPES.DATE, label: 'Fine Settimana', required: true },
            game_id: { ...FIELD_TYPES.STRING, label: 'Game', required: true, fk: 'games.game_id' },
            user_id: { ...FIELD_TYPES.STRING, label: 'User', required: true, fk: 'users.user_id' },
            rank: { ...FIELD_TYPES.INTEGER, label: 'Posizione', required: true },
            score: { ...FIELD_TYPES.INTEGER, label: 'Score', required: true },
            steem_reward: { ...FIELD_TYPES.FLOAT, label: 'STEEM', default: 0 },
            coin_reward: { ...FIELD_TYPES.INTEGER, label: 'Coins', default: 0 },
            steem_tx_id: { ...FIELD_TYPES.STRING, label: 'TX ID' },
            reward_sent: { ...FIELD_TYPES.BOOLEAN, label: 'Inviato' },
            reward_sent_at: { ...FIELD_TYPES.DATETIME, label: 'Inviato il' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' }
        },
        
        tableColumns: ['week_start', 'user_id', 'game_id', 'rank', 'score', 'steem_reward', 'reward_sent', 'actions'],
        
        columnConfig: {
            week_start: { type: 'custom', render: (v) => ({ type: 'html', content: `<strong style="color: #ef4444;">${v}</strong>` }) },
            user_id: { type: 'custom', render: RENDERERS.truncateId(10), searchable: true },
            game_id: { searchable: true },
            rank: { type: 'custom', render: RENDERERS.rank },
            score: { type: 'custom', render: RENDERERS.score },
            steem_reward: { type: 'custom', render: (v) => ({ type: 'html', content: `<span style="color: #3b82f6; font-weight: bold;">${v} STEEM</span>` }) },
            reward_sent: { type: 'custom', render: RENDERERS.booleanStatus('✓ Inviato', '⏳ In attesa', '#10b981', '#fbbf24') }
        },
        
        erPosition: { x: 800, y: 500 }
    },
    
    // ==================== LOGIN STREAK SYSTEM ====================
    
    user_login_streak: {
        tableName: 'user_login_streak',
        label: 'Login Streak',
        icon: '🎁',
        color: '#667eea',
        apiEndpoint: 'user_login_streak',
        dataKey: 'user_login_streak',
        
        primaryKey: 'user_id',
        foreignKeys: {
            user_id: { table: 'users', field: 'user_id' }
        },
        
        fields: {
            user_id: { ...FIELD_TYPES.STRING_PK, label: 'User ID', fk: 'users.user_id' },
            current_day: { ...FIELD_TYPES.INTEGER, label: 'Giorno Corrente', default: 1 },
            last_claim_date: { ...FIELD_TYPES.DATE, label: 'Ultimo Claim' },
            total_cycles_completed: { ...FIELD_TYPES.INTEGER, label: 'Cicli Completati', default: 0 },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' },
            updated_at: { ...FIELD_TYPES.UPDATED_AT, label: 'Aggiornato il' }
        },
        
        tableColumns: ['user_id', 'current_day', 'last_claim_date', 'total_cycles_completed', 'actions'],
        
        columnConfig: {
            user_id: { type: 'custom', render: RENDERERS.truncateId(12), searchable: true },
            current_day: { type: 'custom', render: (v) => ({ type: 'html', content: `<strong style="color: #667eea; font-size: 16px;">Day ${v}/7</strong>` }) },
            last_claim_date: { type: 'custom', render: (v) => ({ type: 'html', content: v ? `<span style="color: #28a745;">${v}</span>` : '-' }) },
            total_cycles_completed: { type: 'custom', render: (v) => ({ type: 'html', content: v > 0 ? `<span style="color: #ffd700;">🏆 ${v}</span>` : '0' }) }
        },
        
        erPosition: { x: 250, y: 650 }
    },
    
    daily_login_reward_config: {
        tableName: 'daily_login_reward_config',
        label: 'Daily Reward Config',
        icon: '⚙️',
        color: '#9c27b0',
        apiEndpoint: 'daily_login_reward_config',
        dataKey: 'daily_login_reward_config',
        
        primaryKey: 'day',
        foreignKeys: {},
        
        fields: {
            day: { ...FIELD_TYPES.INTEGER_PK, label: 'Giorno' },
            coins_reward: { ...FIELD_TYPES.INTEGER, label: 'Coins', required: true },
            emoji: { ...FIELD_TYPES.TEXT, label: 'Emoji', default: '🪙' },
            is_active: { ...FIELD_TYPES.IS_ACTIVE, label: 'Attivo' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' },
            updated_at: { ...FIELD_TYPES.UPDATED_AT, label: 'Aggiornato il' }
        },
        
        tableColumns: ['day', 'emoji', 'coins_reward', 'is_active', 'actions'],
        
        columnConfig: {
            day: { type: 'custom', render: (v) => ({ type: 'html', content: `<strong style="color: #9c27b0; font-size: 16px;">Day ${v}</strong>` }) },
            emoji: { type: 'custom', render: (v) => ({ type: 'html', content: `<span style="font-size: 24px;">${v}</span>` }) },
            coins_reward: { type: 'custom', render: (v) => ({ type: 'html', content: `<span style="color: #ffd700; font-weight: bold; font-size: 16px;">🪙 ${v}</span>` }) },
            is_active: { type: 'custom', render: RENDERERS.booleanStatus('✓ Attivo', '✗ Inattivo') }
        },
        
        erPosition: { x: 450, y: 650 }
    },
    
    // ==================== ADMIN ====================
    
    admin_users: {
        tableName: 'admin_users',
        label: 'Admin Users',
        icon: '🔐',
        color: '#1e3a5f',
        apiEndpoint: 'admin-users',
        dataKey: 'admin_users',
        
        primaryKey: 'admin_id',
        foreignKeys: {},
        
        fields: {
            admin_id: { ...FIELD_TYPES.INTEGER_PK, label: 'ID' },
            username: { ...FIELD_TYPES.STRING, label: 'Username', required: true },
            password_hash: { ...FIELD_TYPES.STRING, label: 'Password Hash', hidden: true },
            email: { ...FIELD_TYPES.STRING, label: 'Email' },
            is_active: { ...FIELD_TYPES.IS_ACTIVE, label: 'Attivo' },
            last_login: { ...FIELD_TYPES.DATETIME, label: 'Ultimo Login' },
            created_at: { ...FIELD_TYPES.CREATED_AT, label: 'Creato il' },
            updated_at: { ...FIELD_TYPES.UPDATED_AT, label: 'Aggiornato il' }
        },
        
        tableColumns: ['admin_id', 'username', 'email', 'is_active', 'last_login', 'actions'],
        
        columnConfig: {
            admin_id: { width: '60px' },
            username: { searchable: true, style: 'font-weight: 600;' },
            email: { searchable: true },
            is_active: { type: 'custom', render: RENDERERS.booleanStatus('✓ Attivo', '✗ Inattivo') },
            last_login: { type: 'date' }
        },
        
        erPosition: { x: 50, y: 650 }
    }
};

// ============ SCHEMA UTILITIES ============

/**
 * SchemaManager - Utility class for working with the schema
 * Following Single Responsibility Principle
 */
class SchemaManager {
    /**
     * Get a table definition by key
     */
    static getTable(tableKey) {
        return DB_SCHEMA[tableKey];
    }
    
    /**
     * Get all table keys
     */
    static getTableKeys() {
        return Object.keys(DB_SCHEMA);
    }
    
    /**
     * Get all tables as array
     */
    static getAllTables() {
        return Object.entries(DB_SCHEMA).map(([key, def]) => ({ key, ...def }));
    }
    
    /**
     * Get table columns for display (tableColumns property)
     */
    static getTableColumns(tableKey) {
        const table = DB_SCHEMA[tableKey];
        if (!table) return [];
        
        return table.tableColumns.map(colKey => {
            if (colKey === 'actions') {
                return { key: 'actions', label: 'Azioni', type: 'actions' };
            }
            
            const fieldDef = table.fields[colKey] || {};
            const columnConfig = table.columnConfig?.[colKey] || {};
            
            return {
                key: colKey,
                label: columnConfig.label || fieldDef.label || colKey,
                type: columnConfig.type || 'text',
                ...columnConfig
            };
        });
    }
    
    /**
     * Get all fields for a table (for CRUD forms and detail view)
     */
    static getFields(tableKey) {
        const table = DB_SCHEMA[tableKey];
        if (!table) return [];
        
        return Object.entries(table.fields).map(([key, def]) => ({
            name: key,
            ...def
        }));
    }
    
    /**
     * Get primary key field name for a table
     */
    static getPrimaryKey(tableKey) {
        const table = DB_SCHEMA[tableKey];
        return table?.primaryKey || 'id';
    }
    
    /**
     * Get foreign keys for a table
     */
    static getForeignKeys(tableKey) {
        const table = DB_SCHEMA[tableKey];
        return table?.foreignKeys || {};
    }
    
    /**
     * Check if a field is a foreign key
     */
    static isForeignKey(tableKey, fieldName) {
        const fks = this.getForeignKeys(tableKey);
        return !!fks[fieldName];
    }
    
    /**
     * Get API endpoint for a table
     */
    static getApiEndpoint(tableKey) {
        const table = DB_SCHEMA[tableKey];
        return table?.apiEndpoint || tableKey;
    }
    
    /**
     * Get data key for a table (for API responses)
     */
    static getDataKey(tableKey) {
        const table = DB_SCHEMA[tableKey];
        return table?.dataKey || tableKey;
    }
    
    /**
     * Generate stats config from schema
     */
    static generateStatsConfig() {
        return Object.entries(DB_SCHEMA).map(([key, def]) => ({
            key: `total_${def.dataKey || key}`,
            label: def.label,
            icon: def.icon
        }));
    }
    
    /**
     * Get ER diagram configuration
     */
    static getERConfig() {
        const tables = {};
        Object.entries(DB_SCHEMA).forEach(([key, def]) => {
            if (def.erPosition) {
                tables[def.tableName] = {
                    x: def.erPosition.x,
                    y: def.erPosition.y,
                    config: {
                        name: def.tableName,
                        icon: def.icon,
                        color: def.color,
                        erDiagram: { color: def.color },
                        fields: Object.entries(def.fields).map(([fKey, fDef]) => ({
                            name: fKey,
                            type: fDef.type,
                            pk: fDef.pk,
                            fk: fDef.fk
                        }))
                    }
                };
            }
        });
        return tables;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DB_SCHEMA = DB_SCHEMA;
    window.FIELD_TYPES = FIELD_TYPES;
    window.RENDERERS = RENDERERS;
    window.SchemaManager = SchemaManager;
}
