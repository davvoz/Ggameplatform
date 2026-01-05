/**
 * Briscola Game Engine
 * 
 * Core game logic and state management
 */

import { Deck, Card, SUIT_LIST, calculatePoints } from './Cards.js';
import { AIPlayer } from '../ai/AIPlayer.js';

export class GameEngine {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.deck = new Deck();
        this.briscola = null;
        this.briscolaCard = null;
        
        this.player1Hand = [];
        this.player2Hand = [];
        this.player1Captured = [];
        this.player2Captured = [];
        
        this.player1Score = 0;
        this.player2Score = 0;
        this.player1HandsWon = 0;
        this.player2HandsWon = 0;
        this.totalHands = 0;
        
        this.currentPlayer = 1; // 1 or 2
        this.firstPlayerInRound = 1;
        this.playedCard1 = null; // Card played by first player in round
        this.playedCard2 = null; // Card played by second player in round
        this.roundLeadSuit = null;
        
        this.mode = 'ai';
        this.difficulty = 'medium';
        this.player1Name = 'Tu';
        this.player2Name = 'CPU';
        
        // Per multiplayer: deck remaining gestito dal server
        this._onlineDeckRemaining = null;
        
        this.isGameOver = false;
        this.isPaused = false;
        this.winner = null;
        
        this.ai = null;
        
        // Event callbacks
        this.onStateChange = null;
        this.onRoundEnd = null;
        this.onGameOver = null;
    }
    
    init(config = {}) {
        this.mode = config.mode || 'ai';
        this.difficulty = config.difficulty || 'medium';
        this.player1Name = config.player1Name || 'Tu';
        this.player2Name = config.player2Name || 'CPU';
        
        // Initialize AI if needed
        if (this.mode === 'ai') {
            this.ai = new AIPlayer(this.difficulty);
        }
        
        // Shuffle and deal
        this.deck.shuffle();
        
        // Deal 3 cards to each player
        this.player1Hand = this.deck.drawMultiple(3);
        this.player2Hand = this.deck.drawMultiple(3);
        
        // Set briscola (the 7th card, shown under the deck)
        this.briscolaCard = this.deck.peekBottom();
        this.briscola = this.briscolaCard.suit;
        
        // First player is random
        this.currentPlayer = Math.random() < 0.5 ? 1 : 2;
        this.firstPlayerInRound = this.currentPlayer;
        
        this.isGameOver = false;
        this.isPaused = false;
        
        console.log('[GameEngine] Game initialized');
        console.log('[GameEngine] Briscola:', this.briscolaCard?.name);
        console.log('[GameEngine] First player:', this.currentPlayer);
    }
    
    /**
     * Deserialize a card from server format
     * @param {Object} cardData - Card data from server {suit, value, id}
     * @returns {Card} Card object
     */
    deserializeCard(cardData) {
        if (!cardData) return null;
        
        // Find the suit object
        const suit = SUIT_LIST.find(s => s.id === cardData.suit);
        if (!suit) {
            console.warn('[GameEngine] Unknown suit:', cardData.suit);
            return null;
        }
        
        return new Card(suit, cardData.value);
    }
    
    /**
     * Play a card
     * @param {number} player - Player number (1 or 2)
     * @param {Card} card - Card to play
     * @returns {Object} Result of the play
     */
    playCard(player, card) {
        if (this.isPaused || this.isGameOver) {
            return { success: false, reason: 'Game is paused or over' };
        }
        
        if (player !== this.currentPlayer) {
            return { success: false, reason: 'Not your turn' };
        }
        
        const hand = player === 1 ? this.player1Hand : this.player2Hand;
        const cardIndex = hand.findIndex(c => c.id === card.id);
        
        if (cardIndex === -1) {
            return { success: false, reason: 'Card not in hand' };
        }
        
        // Remove card from hand
        hand.splice(cardIndex, 1);
        
        // Place on table
        if (this.playedCard1 === null) {
            // First card of the round
            this.playedCard1 = card;
            this.roundLeadSuit = card.suit;
            this.firstPlayerInRound = player;
            this.currentPlayer = player === 1 ? 2 : 1;
            
            this.notifyStateChange();
            
            return {
                success: true,
                isRoundComplete: false,
                nextPlayer: this.currentPlayer
            };
        } else {
            // Second card of the round
            this.playedCard2 = card;
            
            // Determine winner
            const result = this.resolveRound();
            
            return {
                success: true,
                isRoundComplete: true,
                ...result
            };
        }
    }
    
    /**
     * Resolve the current round
     */
    resolveRound() {
        const card1 = this.playedCard1;
        const card2 = this.playedCard2;
        
        // The first player in round played card1
        // Compare cards: positive means card2 wins, negative means card1 wins
        const comparison = card2.compareWith(card1, this.briscola, this.roundLeadSuit);
        
        // If comparison <= 0, first player (who played card1) wins
        // If comparison > 0, second player (who played card2) wins
        const roundWinner = comparison > 0 ? 
            (this.firstPlayerInRound === 1 ? 2 : 1) : 
            this.firstPlayerInRound;
        
        // Points in this round
        const pointsWon = card1.points + card2.points;
        this.totalHands++;
        
        // Award points and cards
        if (roundWinner === 1) {
            this.player1Score += pointsWon;
            this.player1Captured.push(card1, card2);
            this.player1HandsWon++;
        } else {
            this.player2Score += pointsWon;
            this.player2Captured.push(card1, card2);
            this.player2HandsWon++;
        }
        
        console.log(`[GameEngine] Round winner: Player ${roundWinner}, Points: ${pointsWon}`);
        
        // Draw new cards (winner draws first)
        this.drawCards(roundWinner);
        
        // Clear table
        const played1 = this.playedCard1;
        const played2 = this.playedCard2;
        this.playedCard1 = null;
        this.playedCard2 = null;
        this.roundLeadSuit = null;
        
        // Winner starts next round
        this.currentPlayer = roundWinner;
        this.firstPlayerInRound = roundWinner;
        
        // Check for game over
        if (this.player1Hand.length === 0 && this.player2Hand.length === 0) {
            // Ricalcola i punteggi dalle carte catturate per sicurezza
            const calculatedP1 = this.player1Captured.reduce((sum, c) => sum + c.points, 0);
            const calculatedP2 = this.player2Captured.reduce((sum, c) => sum + c.points, 0);
            
            console.log(`[GameEngine] Final score verification - P1: ${this.player1Score} (calculated: ${calculatedP1}), P2: ${this.player2Score} (calculated: ${calculatedP2})`);
            
            // Usa i punteggi calcolati
            this.player1Score = calculatedP1;
            this.player2Score = calculatedP2;
            
            this.endGame();
        }
        
        const result = {
            roundWinner,
            pointsWon,
            card1: played1,
            card2: played2,
            player1Score: this.player1Score,
            player2Score: this.player2Score,
            isGameOver: this.isGameOver,
            gameWinner: this.winner
        };
        
        if (this.onRoundEnd) {
            this.onRoundEnd(result);
        }
        
        this.notifyStateChange();
        
        return result;
    }
    
    /**
     * Draw cards after a round
     * @param {number} winner - The round winner (draws first)
     */
    drawCards(winner) {
        // No cards left to draw
        if (this.deck.remaining === 0) return;
        
        const firstDrawer = winner;
        const secondDrawer = winner === 1 ? 2 : 1;
        
        // Winner draws first
        if (this.deck.remaining > 0) {
            const card = this.deck.draw();
            if (card) {
                if (firstDrawer === 1) {
                    this.player1Hand.push(card);
                } else {
                    this.player2Hand.push(card);
                }
                console.log(`[GameEngine] Player ${firstDrawer} drew ${card.name}`);
            }
        }
        
        // Loser draws second
        if (this.deck.remaining > 0) {
            const card = this.deck.draw();
            if (card) {
                if (secondDrawer === 1) {
                    this.player1Hand.push(card);
                } else {
                    this.player2Hand.push(card);
                }
                console.log(`[GameEngine] Player ${secondDrawer} drew ${card.name}`);
            }
        }
        
        // Clear briscola reference when deck is empty
        if (this.deck.remaining === 0) {
            this.briscolaCard = null;
        }
    }
    
    /**
     * End the game and determine winner
     */
    endGame() {
        this.isGameOver = true;
        
        // Determine winner (need more than 60 points to win)
        if (this.player1Score > this.player2Score) {
            this.winner = 1;
        } else if (this.player2Score > this.player1Score) {
            this.winner = 2;
        } else {
            this.winner = 0; // Draw (both have 60)
        }
        
        console.log(`[GameEngine] Game Over - Winner: ${this.winner}`);
        console.log(`[GameEngine] Final Score: ${this.player1Score} - ${this.player2Score}`);
        
        if (this.onGameOver) {
            this.onGameOver({
                winner: this.winner,
                player1Score: this.player1Score,
                player2Score: this.player2Score
            });
        }
    }
    
    /**
     * Get AI move
     * @returns {Card}
     */
    getAIMove() {
        if (!this.ai) return null;
        
        return this.ai.chooseCard(
            this.player2Hand,
            this.playedCard1,
            this.briscola,
            {
                player1Score: this.player1Score,
                player2Score: this.player2Score,
                deckRemaining: this.deck.remaining,
                player1Captured: this.player1Captured,
                player2Captured: this.player2Captured,
                briscolaCard: this.briscolaCard
            }
        );
    }
    
    /**
     * Pause the game
     */
    pause() {
        this.isPaused = true;
    }
    
    /**
     * Resume the game
     */
    resume() {
        this.isPaused = false;
    }
    
    /**
     * Get current game state
     */
    getState() {
        return {
            mode: this.mode,
            difficulty: this.difficulty,
            player1Name: this.player1Name,
            player2Name: this.player2Name,
            
            briscola: this.briscola,
            briscolaCard: this.briscolaCard,
            
            player1Hand: [...this.player1Hand],
            player2Hand: [...this.player2Hand],
            player1HandCount: this.player1Hand.length,
            player2HandCount: this.player2Hand.length,
            
            player1Score: this.player1Score,
            player2Score: this.player2Score,
            player1HandsWon: this.player1HandsWon,
            player2HandsWon: this.player2HandsWon,
            totalHands: this.totalHands,
            
            currentPlayer: this.currentPlayer,
            firstPlayerInRound: this.firstPlayerInRound,
            playedCard1: this.playedCard1,
            playedCard2: this.playedCard2,
            
            deckRemaining: this._onlineDeckRemaining !== null ? this._onlineDeckRemaining : (this.deck.remaining + (this.briscolaCard ? 1 : 0)),
            
            isGameOver: this.isGameOver,
            isPaused: this.isPaused,
            winner: this.winner
        };
    }
    
    /**
     * Notify state change
     */
    notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.getState());
        }
    }
    
    /**
     * Apply a move from online multiplayer
     */
    applyRemoteMove(player, cardData) {
        // For opponent moves in online mode, we don't have the actual cards
        // Just create the card from server data and process the play
        
        if (player === 2 && this.mode === 'online') {
            // Create card from server data
            const card = this.deserializeCard(cardData);
            if (!card) {
                return { success: false, reason: 'Invalid card data' };
            }
            
            // Remove a placeholder from opponent's hand
            if (this.player2Hand.length > 0) {
                this.player2Hand.pop();
            }
            
            // Place on table
            if (this.playedCard1 === null) {
                this.playedCard1 = card;
                this.roundLeadSuit = card.suit;
                this.firstPlayerInRound = player;
                this.currentPlayer = 1;
                
                this.notifyStateChange();
                
                return {
                    success: true,
                    isRoundComplete: false,
                    nextPlayer: this.currentPlayer,
                    card: card
                };
            } else {
                this.playedCard2 = card;
                // Round will be resolved by server
                return {
                    success: true,
                    isRoundComplete: true,
                    card: card
                };
            }
        }
        
        // For local player
        const hand = player === 1 ? this.player1Hand : this.player2Hand;
        const cardFromHand = hand.find(c => c.id === cardData.id);
        
        if (cardFromHand) {
            return this.playCard(player, cardFromHand);
        }
        
        return { success: false, reason: 'Invalid card' };
    }
    
    /**
     * Serialize game state for network transmission
     */
    serialize() {
        return JSON.stringify({
            briscola: this.briscola.id,
            briscolaCard: this.briscolaCard?.toJSON(),
            player1Hand: this.player1Hand.map(c => c.toJSON()),
            player2Hand: this.player2Hand.map(c => c.toJSON()),
            player1Score: this.player1Score,
            player2Score: this.player2Score,
            currentPlayer: this.currentPlayer,
            firstPlayerInRound: this.firstPlayerInRound,
            playedCard1: this.playedCard1?.toJSON(),
            playedCard2: this.playedCard2?.toJSON(),
            deckRemaining: this.deck.remaining,
            isGameOver: this.isGameOver
        });
    }
}
