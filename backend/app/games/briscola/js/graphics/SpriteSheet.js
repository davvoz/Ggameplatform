/**
 * Sprite Sheet Handler
 * 
 * Manages the Italian card sprite sheet and provides
 * methods to render individual cards
 */

import { SUIT_LIST, SPRITE_ORDER } from '../core/Cards.js';

// Available deck types
export const DECK_TYPES = {
    PIACENTINO: { id: '', name: 'Piacentino', file: 'cards.jpg' },
    BRESCIANO: { id: 'br', name: 'Bresciano', file: 'cards_br.jpg' },
    BOLOGNESE: { id: 'bo', name: 'Bolognese', file: 'cards_bo.jpg' }
};

export class SpriteSheet {
    constructor() {
        this.image = null;
        this.loaded = false;
        this.currentDeck = DECK_TYPES.PIACENTINO;
        
        // Card dimensions in sprite sheet (will be calculated)
        this.cardWidth = 0;
        this.cardHeight = 0;
        
        // Number of cards per row and column
        this.cols = 10; // 10 cards per suit
        this.rows = 4;  // 4 suits
    }
    
    /**
     * Get file path for a deck type
     * @param {string} deckSuffix - Deck suffix ('' for piacentino, 'br' for bresciano, 'bo' for bolognese)
     * @returns {string} File path
     */
    getDeckFilePath(deckSuffix = '') {
        if (deckSuffix === 'br') return 'assets/cards_br.jpg';
        if (deckSuffix === 'bo') return 'assets/cards_bo.jpg';
        return 'assets/cards.jpg';
    }

    /**
     * Load the sprite sheet image
     * @param {string} src - Image source path
     * @param {string} deckSuffix - Optional deck suffix to load specific deck
     * @returns {Promise}
     */
    load(src, deckSuffix = null) {
        // If deckSuffix is provided, use it to determine the file
        const finalSrc = deckSuffix !== null ? this.getDeckFilePath(deckSuffix) : src;
        
        return new Promise((resolve, reject) => {
            this.image = new Image();
            
            this.image.onload = () => {
                // Calculate card dimensions
                this.cardWidth = this.image.width / this.cols;
                this.cardHeight = this.image.height / this.rows;
                
                this.loaded = true;



                resolve();
            };
            
            this.image.onerror = () => {
                reject(new Error(`Failed to load sprite sheet: ${finalSrc}`));
            };
            
            this.image.src = finalSrc;
        });
    }

    /**
     * Change deck type and reload sprite sheet
     * @param {string} deckSuffix - Deck suffix
     * @returns {Promise}
     */
    async changeDeck(deckSuffix) {
        this.loaded = false;
        await this.load(null, deckSuffix);
        return this;
    }
    
    /**
     * Get the background style for a specific card
     * @param {Card} card - The card to get style for
     * @returns {Object} CSS style object
     */
    getCardStyle(card) {
        if (!this.loaded || !card) {
            return {};
        }
        
        const pos = card.getSpritePosition();
        
        // Calculate position in percentage for responsive sizing
        const bgPosX = -(pos.col * 100);  // Percentage
        const bgPosY = -(pos.row * 100);  // Percentage
        
        return {
            backgroundImage: `url(${this.image.src})`,
            backgroundSize: `${this.cols * 100}% ${this.rows * 100}%`,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`
        };
    }
    
    /**
     * Apply card style to an element
     * @param {HTMLElement} element - Element to style
     * @param {Card} card - Card to display
     */
    applyCardStyle(element, card) {
        if (!this.loaded || !card) return;
        
        const pos = card.getSpritePosition();
        
        // Calculate pixel positions
        // We need to use percentages for responsive sizing
        const bgPosX = (pos.col / (this.cols - 1)) * 100;
        const bgPosY = (pos.row / (this.rows - 1)) * 100;
        
        element.style.backgroundImage = `url(${this.image.src})`;
        element.style.backgroundSize = `${this.cols * 100}% ${this.rows * 100}%`;
        element.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
    }
    
    /**
     * Create a card element
     * @param {Card} card - Card to create element for
     * @param {boolean} faceUp - Whether to show face up
     * @returns {HTMLElement}
     */
    createCardElement(card, faceUp = true) {
        const element = document.createElement('div');
        element.className = `card ${faceUp ? 'face-up' : 'face-down'}`;
        element.dataset.cardId = card.id;
        element.dataset.suit = card.suit.id;
        element.dataset.value = card.value;
        
        if (faceUp) {
            this.applyCardStyle(element, card);
        }
        
        return element;
    }
    
    /**
     * Update card element to show or hide
     * @param {HTMLElement} element - Card element
     * @param {Card} card - Card data
     * @param {boolean} faceUp - Whether to show face up
     */
    updateCardElement(element, card, faceUp = true) {
        element.classList.remove('face-up', 'face-down');
        element.classList.add(faceUp ? 'face-up' : 'face-down');
        
        if (faceUp) {
            this.applyCardStyle(element, card);
        } else {
            element.style.backgroundImage = '';
            element.style.backgroundSize = '';
            element.style.backgroundPosition = '';
        }
    }
    
    /**
     * Get the sprite sheet image element
     * @returns {HTMLImageElement}
     */
    getImage() {
        return this.image;
    }
    
    /**
     * Draw a card onto a canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Card} card - Card to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Draw width
     * @param {number} height - Draw height
     */
    drawCard(ctx, card, x, y, width, height) {
        if (!this.loaded || !card) return;
        
        const pos = card.getSpritePosition();
        const sx = pos.col * this.cardWidth;
        const sy = pos.row * this.cardHeight;
        
        ctx.drawImage(
            this.image,
            sx, sy, this.cardWidth, this.cardHeight,
            x, y, width, height
        );
    }
    
    /**
     * Create a mini card representation for the briscola indicator
     * @param {Card} card 
     * @returns {HTMLElement}
     */
    createMiniCard(card) {
        const element = document.createElement('div');
        element.className = 'mini-card';
        this.applyCardStyle(element, card);
        return element;
    }
}
