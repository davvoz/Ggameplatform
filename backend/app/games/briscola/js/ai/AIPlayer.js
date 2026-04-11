/**
 * Briscola AI Player
 * 
 * Implements different difficulty levels:
 * - Easy: Random play
 * - Medium: Basic strategy (take points, save briscola)
 * - Hard: Advanced strategy with card counting
 */

export class AIPlayer {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.playedCards = []; // For card counting in hard mode
    }
    
    /**
     * Choose a card to play
     * @param {Card[]} hand - AI's current hand
     * @param {Card|null} opponentCard - Card played by opponent (null if AI plays first)
     * @param {Object} briscola - The briscola suit
     * @param {Object} gameState - Additional game state info
     * @returns {Card}
     */
    chooseCard(hand, opponentCard, briscola, gameState) {
        if (hand.length === 0) return null;
        if (hand.length === 1) return hand[0];
        
        switch (this.difficulty) {
            case 'easy':
                return this.playEasy(hand);
            case 'medium':
                return this.playMedium(hand, opponentCard, briscola, gameState);
            case 'hard':
                return this.playHard(hand, opponentCard, briscola, gameState);
            default:
                return this.playMedium(hand, opponentCard, briscola, gameState);
        }
    }
    
    /**
     * Easy AI: Random play
     */
    playEasy(hand) {
        const index = Math.floor(Math.random() * hand.length);
        return hand[index];
    }
    
    /**
     * Medium AI: Basic strategy
     * - If playing first: play low-value cards, save briscola
     * - If playing second: try to win valuable hands, let go of low-value ones
     */
    playMedium(hand, opponentCard, briscola, gameState) {
        const nonBriscolaCards = hand.filter(c => c.suit.id !== briscola.id);
        const safeHand = nonBriscolaCards.length > 0 ? nonBriscolaCards : hand;

        if (opponentCard === null) {
            // Playing first - play lowest non-briscola card
            return this.selectLowestCard(safeHand);
        }

        // Playing second
        const pointsOnTable = opponentCard.points;

        // If opponent played a high-value card (>= 10 points), try to win
        if (pointsOnTable >= 10) {
            const winningCard = this.findCheapestWinningCard(hand, opponentCard, briscola);
            if (winningCard) return winningCard;
        }

        // If opponent played briscola, try to avoid losing good cards
        if (opponentCard.suit.id === briscola.id) {
            return this.selectLowestCard(safeHand);
        }

        // If we can win cheaply (without briscola), do it
        const sameSuitCards = hand.filter(c => c.suit.id === opponentCard.suit.id);
        const winningNonBriscola = sameSuitCards.filter(c => c.strength > opponentCard.strength);

        if (winningNonBriscola.length > 0 && pointsOnTable > 0) {
            return this.selectLowestCard(winningNonBriscola);
        }

        // Play lowest card
        return this.selectLowestCard(safeHand);
    }
    
    /**
     * Hard AI: Advanced strategy with card counting
     */
    playHard(hand, opponentCard, briscola, gameState) {
        
        // Late game adjustments
        const isLateGame = gameState.deckRemaining <= 6;
        const isEndGame = gameState.deckRemaining === 0;
        const scoreDiff = gameState.player2Score - gameState.player1Score;
        
        if (opponentCard === null) {
            // Playing first
            return this.playFirstHard(hand, briscola, gameState, isLateGame, isEndGame, scoreDiff);
        } else {
            // Playing second
            return this.playSecondHard(hand, opponentCard, briscola, gameState, isLateGame, isEndGame, scoreDiff);
        }
    }
    
    /**
     * Hard AI: Play first
     */
    playFirstHard(hand, briscola, gameState, isLateGame, isEndGame, scoreDiff) {
        const nonBriscolaCards = hand.filter(c => c.suit.id !== briscola.id);

        if (isEndGame && scoreDiff > 0) return this.selectLowestCard(hand);

        if (isEndGame && scoreDiff < -10) {
            const card = this.#endGameAggressiveCard(hand, briscola);
            if (card) return card;
        }

        if (isLateGame) {
            const card = this.#lateGameAceBait(hand, briscola);
            if (card) return card;
        }

        if (nonBriscolaCards.length > 0) return this.#cheapestNonBriscola(nonBriscolaCards);

        return this.selectLowestCard(hand.filter(c => c.suit.id === briscola.id));
    }

    #endGameAggressiveCard(hand, briscola) {
        const highCards = hand.filter(c => c.points >= 10 && c.suit.id !== briscola.id);
        return highCards.length > 0 ? highCards[0] : null;
    }

    #lateGameAceBait(hand, briscola) {
        for (const card of hand) {
            if (card.value === 1 && card.suit.id !== briscola.id) {
                const hasTre = hand.some(c => c.value === 3 && c.suit.id === card.suit.id);
                if (hasTre) return card;
            }
        }
        return null;
    }

    #cheapestNonBriscola(nonBriscolaCards) {
        const suitCounts = {};
        for (const c of nonBriscolaCards) {
            suitCounts[c.suit.id] = (suitCounts[c.suit.id] || 0) + 1;
        }
        return [...nonBriscolaCards].sort((a, b) => {
            const valueA = a.points + a.strength * 0.1;
            const valueB = b.points + b.strength * 0.1;
            if (Math.abs(valueA - valueB) > 1) return valueA - valueB;
            return suitCounts[b.suit.id] - suitCounts[a.suit.id];
        })[0];
    }
    
    #cheapestWorthyWin(winningOptions, pointsOnTable, isEndGame, briscola, gameState) {
        if (winningOptions.length === 0) return null;
        const sorted = [...winningOptions].sort((a, b) =>
            this.calculateCardCost(a, briscola, gameState) - this.calculateCardCost(b, briscola, gameState)
        );
        const cheapest = sorted[0];
        const cost = this.calculateCardCost(cheapest, briscola, gameState);
        if (pointsOnTable >= cost || isEndGame || pointsOnTable >= 10) return cheapest;
        return null;
    }

    /**
     * Hard AI: Play second
     */
    playSecondHard(hand, opponentCard, briscola, gameState, isLateGame, isEndGame, scoreDiff) {
        const briscolaCards = hand.filter(c => c.suit.id === briscola.id);
        const nonBriscolaCards = hand.filter(c => c.suit.id !== briscola.id);
        const pointsOnTable = opponentCard.points;
        const winningOptions = this.findAllWinningCards(hand, opponentCard, briscola);

        // If opponent played a valuable card (Ace, 3, King), try to win it
        if (pointsOnTable >= 4) {
            const winner = this.#cheapestWorthyWin(winningOptions, pointsOnTable, isEndGame, briscola, gameState);
            if (winner) return winner;
        }

        // Opponent played briscola - don't waste our briscola
        if (opponentCard.suit.id === briscola.id) {
            return this.#handleOpponentBriscola(hand, briscolaCards, nonBriscolaCards, opponentCard, pointsOnTable);
        }

        // If we can win without briscola and there are points
        const sameSuitWinners = hand.filter(c =>
            c.suit.id === opponentCard.suit.id && c.strength > opponentCard.strength
        );
        if (sameSuitWinners.length > 0 && pointsOnTable > 0) {
            return this.selectLowestCard(sameSuitWinners);
        }

        // End game - must win if behind
        if (isEndGame && scoreDiff < 0 && winningOptions.length > 0) {
            return winningOptions.sort((a, b) => a.points - b.points || a.strength - b.strength)[0];
        }

        // Nothing valuable - play lowest
        return this.selectLowestCard(nonBriscolaCards.length > 0 ? nonBriscolaCards : hand);
    }

    #handleOpponentBriscola(hand, briscolaCards, nonBriscolaCards, opponentCard, pointsOnTable) {
        // Only beat with higher briscola if very valuable on table
        if (pointsOnTable >= 10) {
            const higherBriscola = briscolaCards.filter(c => c.strength > opponentCard.strength);
            if (higherBriscola.length > 0) return this.selectLowestCard(higherBriscola);
        }
        return this.selectLowestCard(nonBriscolaCards.length > 0 ? nonBriscolaCards : hand);
    }
    
    /**
     * Find the cheapest card that wins
     */
    findCheapestWinningCard(hand, opponentCard, briscola) {
        const winners = this.findAllWinningCards(hand, opponentCard, briscola);
        if (winners.length === 0) return null;
        
        // Sort by points (ascending), then by strength (ascending)
        winners.sort((a, b) => {
            // Prefer non-briscola
            const aIsBriscola = a.suit.id === briscola.id ? 1 : 0;
            const bIsBriscola = b.suit.id === briscola.id ? 1 : 0;
            if (aIsBriscola !== bIsBriscola) return aIsBriscola - bIsBriscola;
            
            // Then by points
            if (a.points !== b.points) return a.points - b.points;
            
            // Then by strength
            return a.strength - b.strength;
        });
        
        return winners[0];
    }
    
    /**
     * Find all cards that would win
     */
    findAllWinningCards(hand, opponentCard, briscola) {
        return hand.filter(card => {
            if (opponentCard.suit.id === briscola.id) {
                // Opponent played briscola - need higher briscola
                return card.suit.id === briscola.id && card.strength > opponentCard.strength;
            } else if (card.suit.id === briscola.id) {
                // Our briscola beats their non-briscola
                return true;
            } else if (card.suit.id === opponentCard.suit.id) {
                // Same suit - need higher strength
                return card.strength > opponentCard.strength;
            }
            // Different non-briscola suits - can't win
            return false;
        });
    }
    
    /**
     * Select lowest value card from a set
     */
    selectLowestCard(cards) {
        if (cards.length === 0) return null;
        
        return cards.reduce((lowest, card) => {
            const lowestValue = lowest.points * 10 + lowest.strength;
            const cardValue = card.points * 10 + card.strength;
            return cardValue < lowestValue ? card : lowest;
        });
    }
    
    /**
     * Calculate the "cost" of playing a card
     */
    calculateCardCost(card, briscola, gameState) {
        let cost = card.points;
        
        // Briscola is more valuable
        if (card.suit.id === briscola.id) {
            cost += 5;
            // High briscola even more
            if (card.strength >= 9) cost += 10;
        }
        
        // Aces and Threes are valuable
        if (card.value === 1) cost += 8;
        if (card.value === 3) cost += 7;
        
        // Late game, briscola is crucial
        if (gameState.deckRemaining <= 3) {
            if (card.suit.id === briscola.id) {
                cost += 15;
            }
        }
        
        return cost;
    }
    
    /**
     * Remember a played card (for card counting)
     */
    rememberCard(card) {
        this.playedCards.push(card);
    }
    
    /**
     * Reset memory
     */
    reset() {
        this.playedCards = [];
    }
}
