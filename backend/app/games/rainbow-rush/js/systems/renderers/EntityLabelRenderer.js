/**
 * EntityLabelRenderer - Centralized label rendering system
 * Single Responsibility: Manages rendering of entity identification labels
 * Open/Closed: Easy to extend with new label types without modifying existing code
 * Liskov Substitution: Can be used polymorphically with any entity type
 * Interface Segregation: Simple, focused interface for label rendering
 * Dependency Inversion: Depends on abstractions (entity interface) not concretions
 */

/**
 * Label configuration interface
 * @typedef {Object} LabelConfig
 * @property {string} text - Label text to display
 * @property {string} backgroundColor - CSS color for background
 * @property {string} borderColor - CSS color for border
 * @property {string} textColor - CSS color for text
 * @property {number} fontSize - Font size in pixels
 * @property {number} padding - Padding around text
 * @property {number} verticalOffset - Offset above entity
 */

/**
 * Entity category types
 */
export const EntityCategory = Object.freeze({
    PLAYER: 'player',
    ENEMY: 'enemy',
    PLATFORM: 'platform',
    COLLECTIBLE: 'collectible',
    OBSTACLE: 'obstacle',
    POWERUP: 'powerup',
    BONUS: 'bonus',
    UNKNOWN: 'unknown'
});

/**
 * Label style presets for different entity categories
 */
const LABEL_STYLES = Object.freeze({
    [EntityCategory.PLAYER]: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderColor: 'rgba(0, 255, 0, 0.8)',
        textColor: '#00ff00',
        fontSize: 18,
        padding: 4,
        verticalOffset: 15
    },
    [EntityCategory.ENEMY]: {
        backgroundColor: 'rgba(100, 0, 0, 0.7)',
        borderColor: 'rgba(255, 100, 100, 0.8)',
        textColor: '#ff6666',
        fontSize: 18,
        padding: 3,
        verticalOffset: 20
    },
    [EntityCategory.PLATFORM]: {
        backgroundColor: 'rgba(0, 50, 100, 0.7)',
        borderColor: 'rgba(100, 150, 255, 0.8)',
        textColor: '#66aaff',
        fontSize: 18,
        padding: 3,
        verticalOffset: 5
    },
    [EntityCategory.COLLECTIBLE]: {
        backgroundColor: 'rgba(100, 50, 0, 0.7)',
        borderColor: 'rgba(255, 200, 100, 0.8)',
        textColor: '#ffcc66',
        fontSize: 18,
        padding: 3,
        verticalOffset: 8
    },
    [EntityCategory.OBSTACLE]: {
        backgroundColor: 'rgba(80, 0, 0, 0.8)',
        borderColor: 'rgba(255, 50, 50, 0.9)',
        textColor: '#ff3333',
        fontSize: 18,
        padding: 3,
        verticalOffset: 8
    },
    [EntityCategory.POWERUP]: {
        backgroundColor: 'rgba(80, 0, 80, 0.7)',
        borderColor: 'rgba(200, 100, 200, 0.8)',
        textColor: '#cc88cc',
        fontSize: 18,
        padding: 3,
        verticalOffset: 10
    },
    [EntityCategory.BONUS]: {
        backgroundColor: 'rgba(100, 50, 0, 0.7)',
        borderColor: 'rgba(255, 200, 100, 0.8)',
        textColor: '#ffcc66',
        fontSize: 18,
        padding: 3,
        verticalOffset: 8
    },
    [EntityCategory.UNKNOWN]: {
        backgroundColor: 'rgba(50, 50, 50, 0.7)',
        borderColor: 'rgba(150, 150, 150, 0.8)',
        textColor: '#999999',
        fontSize: 18,
        padding: 3,
        verticalOffset: 10
    }
});

/**
 * Label text formatters for different entity types
 */
class LabelTextFormatter {
    /**
     * Format label text for an entity
     * @param {Object} entity - Entity to format label for
     * @param {string} category - Entity category
     * @returns {string} Formatted label text
     */
    static format(entity, category) {
        switch (category) {
            case EntityCategory.PLAYER:
                return 'PLAYER';
            
            case EntityCategory.ENEMY:
                return this.formatEnemyLabel(entity);
            
            case EntityCategory.PLATFORM:
                return this.formatPlatformLabel(entity);
            
            case EntityCategory.COLLECTIBLE:
            case EntityCategory.BONUS:
                return this.formatCollectibleLabel(entity);
            
            case EntityCategory.OBSTACLE:
                return this.formatObstacleLabel(entity);
            
            case EntityCategory.POWERUP:
                return this.formatPowerupLabel(entity);
            
            default:
                return 'ENTITY';
        }
    }

    static formatEnemyLabel(entity) {
        if (entity.id) {
            return entity.id.toUpperCase();
        }
        if (entity.category) {
            return entity.category.toUpperCase();
        }
        return 'ENEMY';
    }

    static formatPlatformLabel(entity) {
        if (entity.platformType) {
            return entity.platformType.toUpperCase();
        }
        if (entity.shape === 'RESCUE') {
            return 'RESCUE';
        }
        return 'PLATFORM';
    }

    static formatCollectibleLabel(entity) {
        let label = (entity.entityType || entity.type || 'ITEM').toUpperCase();
        
        // Apply abbreviations for long labels
        const abbreviations = {
            'INSTANTFLIGHT': 'FLIGHT',
            'HEARTRECHARGE': 'HEART+',
            'COINRAIN': 'COIN RAIN',
            'FLIGHTBONUS': 'FLIGHT',
            'RECHARGEBONUS': 'RECHARGE',
            'HEARTRECHARGEBONUS': 'HEART+'
        };
        
        return abbreviations[label] || label;
    }

    static formatObstacleLabel(entity) {
        if (entity.obstacleType) {
            return entity.obstacleType.toUpperCase();
        }
        return 'SPIKE';
    }

    static formatPowerupLabel(entity) {
        if (entity.powerupType) {
            return entity.powerupType.toUpperCase();
        }
        return 'POWERUP';
    }
}

/**
 * Entity category detector
 */
class EntityCategoryDetector {
    /**
     * Detect entity category from entity properties
     * @param {Object} entity - Entity to categorize
     * @returns {string} Entity category
     */
    static detect(entity) {
        if (!entity) {
            return EntityCategory.UNKNOWN;
        }

        // Check explicit category markers
        if (entity.isPlayer || entity.entityType === 'player') {
            return EntityCategory.PLAYER;
        }

        if (entity.type === 'enemy' || entity.entityType === 'enemy' || entity.category) {
            return EntityCategory.ENEMY;
        }

        if (entity.type === 'platform' || entity.platformType !== undefined) {
            return EntityCategory.PLATFORM;
        }

        if (entity.type === 'obstacle' || entity.type === 'spike' || 
            entity.entityType === 'spike' || entity.obstacleType) {
            return EntityCategory.OBSTACLE;
        }

        // Collectibles and bonuses
        const collectibleTypes = [
            'collectible', 'heart', 'health', 'boost', 'magnet',
            'coinrain', 'coinRain', 'shield', 'multiplier', 'rainbow',
            'instantflight', 'flightBonus', 'recharge', 'rechargeBonus',
            'heartrecharge', 'heartRechargeBonus'
        ];

        const entityType = entity.entityType || entity.type;
        if (collectibleTypes.includes(entityType)) {
            return EntityCategory.COLLECTIBLE;
        }

        if (entity.type === 'powerup' || entity.powerupType) {
            return EntityCategory.POWERUP;
        }

        return EntityCategory.UNKNOWN;
    }
}

/**
 * Main entity label renderer
 */
export class EntityLabelRenderer {
    /**
     * @param {CanvasRenderingContext2D} textCtx - 2D canvas context for text rendering
     */
    constructor(textCtx) {
        if (!textCtx) {
            throw new Error('EntityLabelRenderer requires a valid 2D canvas context');
        }
        this.textCtx = textCtx;
        this.enabled = true;
    }

    /**
     * Enable or disable label rendering
     * @param {boolean} enabled - Whether labels should be rendered
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Render label for an entity
     * @param {Object} entity - Entity to render label for
     * @param {number} x - X position for label center
     * @param {number} y - Y position for label bottom
     * @param {string} [forcedCategory] - Optional forced category override
     */
    render(entity, x, y, forcedCategory = null) {
        if (!this.enabled || !entity) {
            return;
        }

        const category = forcedCategory || EntityCategoryDetector.detect(entity);
        const text = LabelTextFormatter.format(entity, category);
        const style = LABEL_STYLES[category] || LABEL_STYLES[EntityCategory.UNKNOWN];

        this.renderLabel(x, y, text, style);
    }

    /**
     * Render label with specific configuration
     * @param {number} x - X position for label center
     * @param {number} y - Y position for label bottom
     * @param {string} text - Label text
     * @param {Object} style - Label style configuration
     */
    renderLabel(x, y, text, style) {
        const ctx = this.textCtx;
        
        ctx.save();
        ctx.font = `bold ${style.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Measure text for background sizing
        const metrics = ctx.measureText(text);
        const bgWidth = metrics.width + style.padding * 2;
        const bgHeight = style.fontSize + style.padding;

        // Render background
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(
            x - bgWidth / 2,
            y - bgHeight,
            bgWidth,
            bgHeight
        );

        // Render border
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(
            x - bgWidth / 2,
            y - bgHeight,
            bgWidth,
            bgHeight
        );

        // Render text
        ctx.fillStyle = style.textColor;
        ctx.fillText(text, x, y);

        ctx.restore();
    }

    /**
     * Render label for player entity
     * @param {Object} player - Player entity
     * @param {number} centerX - Center X position
     * @param {number} topY - Top Y position of player
     */
    renderPlayerLabel(player, centerX, topY) {
        const style = LABEL_STYLES[EntityCategory.PLAYER];
        this.render(player, centerX, topY - style.verticalOffset, EntityCategory.PLAYER);
    }

    /**
     * Render label for enemy entity
     * @param {Object} enemy - Enemy entity
     * @param {number} centerX - Center X position
     * @param {number} topY - Top Y position of enemy
     */
    renderEnemyLabel(enemy, centerX, topY) {
        const style = LABEL_STYLES[EntityCategory.ENEMY];
        this.render(enemy, centerX, topY - style.verticalOffset, EntityCategory.ENEMY);
    }

    /**
     * Render label for platform entity
     * @param {Object} platform - Platform entity
     * @param {number} centerX - Center X position
     * @param {number} topY - Top Y position of platform
     */
    renderPlatformLabel(platform, centerX, topY) {
        const style = LABEL_STYLES[EntityCategory.PLATFORM];
        this.render(platform, centerX, topY - style.verticalOffset, EntityCategory.PLATFORM);
    }

    /**
     * Render label for collectible entity
     * @param {Object} collectible - Collectible entity
     * @param {number} centerX - Center X position
     * @param {number} topY - Top Y position of collectible
     */
    renderCollectibleLabel(collectible, centerX, topY) {
        const style = LABEL_STYLES[EntityCategory.COLLECTIBLE];
        this.render(collectible, centerX, topY - style.verticalOffset, EntityCategory.COLLECTIBLE);
    }

    /**
     * Render label for obstacle entity
     * @param {Object} obstacle - Obstacle entity
     * @param {number} centerX - Center X position
     * @param {number} topY - Top Y position of obstacle
     */
    renderObstacleLabel(obstacle, centerX, topY) {
        const style = LABEL_STYLES[EntityCategory.OBSTACLE];
        this.render(obstacle, centerX, topY - style.verticalOffset, EntityCategory.OBSTACLE);
    }

    /**
     * Get label style for a category
     * @param {string} category - Entity category
     * @returns {Object} Label style configuration
     */
    static getStyle(category) {
        return { ...LABEL_STYLES[category] } || { ...LABEL_STYLES[EntityCategory.UNKNOWN] };
    }

    /**
     * Create a custom label style
     * @param {Object} customStyle - Custom style overrides
     * @returns {Object} Complete label style
     */
    static createCustomStyle(customStyle) {
        const defaultStyle = LABEL_STYLES[EntityCategory.UNKNOWN];
        return { ...defaultStyle, ...customStyle };
    }
}

/**
 * Factory for creating label renderers
 */
export class EntityLabelRendererFactory {
    /**
     * Create a label renderer instance
     * @param {CanvasRenderingContext2D} textCtx - 2D canvas context
     * @returns {EntityLabelRenderer} Label renderer instance
     */
    static create(textCtx) {
        return new EntityLabelRenderer(textCtx);
    }

    /**
     * Create a disabled label renderer (no-op)
     * @returns {Object} Disabled label renderer
     */
    static createDisabled() {
        return {
            enabled: false,
            setEnabled: () => {},
            render: () => {},
            renderLabel: () => {},
            renderPlayerLabel: () => {},
            renderEnemyLabel: () => {},
            renderPlatformLabel: () => {},
            renderCollectibleLabel: () => {},
            renderObstacleLabel: () => {}
        };
    }
}

export default EntityLabelRenderer;
