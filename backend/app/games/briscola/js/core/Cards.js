/**
 * Briscola Card Definitions
 * 
 * Italian card deck with 40 cards:
 * - 4 suits: Denari (Coins), Coppe (Cups), Bastoni (Clubs), Spade (Swords)
 * - 10 cards per suit: 1(Asso), 2, 3, 4, 5, 6, 7, Fante(8), Cavallo(9), Re(10)
 */

// Suits definition
export const SUITS = {
    DENARI: { id: 'denari', name: 'Denari', symbol: '🪙', row: 0 },
    COPPE: { id: 'coppe', name: 'Coppe', symbol: '🏆', row: 1 },
    BASTONI: { id: 'bastoni', name: 'Bastoni', symbol: '🪵', row: 2 },
    SPADE: { id: 'spade', name: 'Spade', symbol: '⚔️', row: 3 }
};

export const SUIT_LIST = [SUITS.DENARI, SUITS.COPPE, SUITS.BASTONI, SUITS.SPADE];

// Card values and strength (for game logic)
// In Briscola, the order of strength is: Asso, Tre, Re, Cavallo, Fante, 7, 6, 5, 4, 2
export const CARD_VALUES = {
    1: { name: 'Asso', points: 11, strength: 10 },      // Ace - highest
    2: { name: 'Due', points: 0, strength: 1 },
    3: { name: 'Tre', points: 10, strength: 9 },        // Three - second highest
    4: { name: 'Quattro', points: 0, strength: 2 },
    5: { name: 'Cinque', points: 0, strength: 3 },
    6: { name: 'Sei', points: 0, strength: 4 },
    7: { name: 'Sette', points: 0, strength: 5 },
    8: { name: 'Fante', points: 2, strength: 6 },       // Jack
    9: { name: 'Cavallo', points: 3, strength: 7 },     // Knight/Horse
    10: { name: 'Re', points: 4, strength: 8 }          // King
};

// Card rank order in sprite sheet (left to right)
// Looking at the image: 1, 2, 3, 4, 5, 6, 7, Fante, Cavallo, Re
export const SPRITE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Card class representing a single playing card
 */
export class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
        this.id = `${suit.id}_${value}`;
    }
    
    get points() {
        return CARD_VALUES[this.value].points;
    }
    
    get strength() {
        return CARD_VALUES[this.value].strength;
    }
    
    get name() {
        return `${CARD_VALUES[this.value].name} di ${this.suit.name}`;
    }
    
    get shortName() {
        const valueStr = this.value <= 7 ? this.value : CARD_VALUES[this.value].name.charAt(0);
        return `${valueStr}${this.suit.symbol}`;
    }
    
    /**
     * Get sprite sheet position for this card
     * Returns { row, col } where row is suit (0-3) and col is value position (0-9)
     */
    getSpritePosition() {
        return {
            row: this.suit.row,
            col: SPRITE_ORDER.indexOf(this.value)
        };
    }
    
    /**
     * Compare strength with another card
     * @param {Card} other - Card to compare with
     * @param {Object} briscola - The briscola suit
     * @param {Object} leadSuit - The suit that was played first (optional)
     * @returns {number} 1 if this wins, -1 if other wins, 0 if equal
     */
    compareWith(other, briscola, leadSuit = null) {
        const thisIsBriscola = this.suit.id === briscola.id;
        const otherIsBriscola = other.suit.id === briscola.id;
        
        // Briscola beats non-briscola
        if (thisIsBriscola && !otherIsBriscola) return 1;
        if (!thisIsBriscola && otherIsBriscola) return -1;
        
        // Both are briscola or both are not
        if (thisIsBriscola && otherIsBriscola) {
            // Compare strength
            return this.strength > other.strength ? 1 : (this.strength < other.strength ? -1 : 0);
        }
        
        // Neither is briscola
        // If we have a lead suit, only lead suit can win
        if (leadSuit) {
            const thisIsLead = this.suit.id === leadSuit.id;
            const otherIsLead = other.suit.id === leadSuit.id;
            
            if (thisIsLead && !otherIsLead) return 1;
            if (!thisIsLead && otherIsLead) return -1;
        }
        
        // Same suit - compare strength
        if (this.suit.id === other.suit.id) {
            return this.strength > other.strength ? 1 : (this.strength < other.strength ? -1 : 0);
        }
        
        // Different non-briscola suits - first played wins (return 0 means lead wins)
        return 0;
    }
    
    toString() {
        return this.name;
    }
    
    toJSON() {
        return {
            suit: this.suit.id,
            value: this.value,
            id: this.id
        };
    }
    
    static fromJSON(data) {
        const suit = SUIT_LIST.find(s => s.id === data.suit);
        return new Card(suit, data.value);
    }
}

/**
 * Deck class for managing a deck of cards
 */
export class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }
    
    /**
     * Reset deck with all 40 cards
     */
    reset() {
        this.cards = [];
        for (const suit of SUIT_LIST) {
            for (let value = 1; value <= 10; value++) {
                this.cards.push(new Card(suit, value));
            }
        }
    }
    
    /**
     * Shuffle the deck using Fisher-Yates algorithm
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    /**
     * Draw a card from the top of the deck
     * @returns {Card|null}
     */
    draw() {
        return this.cards.pop() || null;
    }
    
    /**
     * Draw multiple cards
     * @param {number} count
     * @returns {Card[]}
     */
    drawMultiple(count) {
        const drawn = [];
        for (let i = 0; i < count && this.cards.length > 0; i++) {
            drawn.push(this.draw());
        }
        return drawn;
    }
    
    /**
     * Get remaining cards count
     */
    get remaining() {
        return this.cards.length;
    }
    
    /**
     * Check if deck is empty
     */
    get isEmpty() {
        return this.cards.length === 0;
    }
    
    /**
     * Peek at the bottom card (briscola card)
     */
    peekBottom() {
        return this.cards.length > 0 ? this.cards[0] : null;
    }
    
    /**
     * Take the bottom card (briscola)
     */
    takeBottom() {
        return this.cards.shift() || null;
    }
}

/**
 * Calculate total points in a set of cards
 * @param {Card[]} cards
 * @returns {number}
 */
export function calculatePoints(cards) {
    return cards.reduce((sum, card) => sum + card.points, 0);
}

/**
 * Get total possible points in a game (120)
 */
export function getTotalPossiblePoints() {
    return 120; // 11*4 + 10*4 + 4*4 + 3*4 + 2*4 = 44 + 40 + 16 + 12 + 8 = 120
}
