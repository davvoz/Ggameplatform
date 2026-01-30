/**
 * UI Manager
 * 
 * Handles all UI rendering and updates
 */

export class UIManager {
    constructor(spriteSheet) {
        this.spriteSheet = spriteSheet;
        
        // Cache DOM elements
        this.elements = {
            playerHand: document.getElementById('player-hand'),
            opponentHand: document.getElementById('opponent-hand'),
            firstPlayed: document.getElementById('first-played'),
            secondPlayed: document.getElementById('second-played'),
            
            playerName: document.getElementById('player-name'),
            opponentName: document.getElementById('opponent-name'),
            playerScore: document.getElementById('player-score'),
            opponentScore: document.getElementById('opponent-score'),
            opponentCards: document.getElementById('opponent-cards'),
            
            deckCount: document.getElementById('deck-count'),
            briscolaCard: document.getElementById('briscola-card'),
            turnIndicator: document.getElementById('turn-indicator'),
            
            turnScreen: document.getElementById('turn-screen'),
            turnPlayerName: document.getElementById('turn-player-name')
        };
    }
    
    /**
     * Render player's hand
     * @param {Card[]} cards - Cards in hand
     * @param {boolean} interactive - Whether cards should be visually active (but always clickable)
     * @param {Function} onCardClick - Click handler
     */
    renderPlayerHand(cards, interactive = true, onCardClick = null) {

        this.elements.playerHand.innerHTML = '';
        
        cards.forEach((card, index) => {
            const element = this.spriteSheet.createCardElement(card, true);
            
            // Always add event listeners so they work when enabled
            element.style.animationDelay = `${index * 0.1}s`;
            element.classList.add('dealing');
            
            // Touch support
            element.addEventListener('touchstart', (e) => {
                if (element.classList.contains('disabled')) return;
                e.preventDefault();
                element.classList.add('touch-active');
            });
            
            element.addEventListener('touchend', (e) => {
                if (element.classList.contains('disabled')) return;
                e.preventDefault();
                element.classList.remove('touch-active');

                if (onCardClick) onCardClick(card, element);
            });
            
            element.addEventListener('touchcancel', () => {
                element.classList.remove('touch-active');
            });
            
            // Mouse support
            element.addEventListener('click', () => {
                if (element.classList.contains('disabled')) {

                    return;
                }

                if (onCardClick) onCardClick(card, element);
            });
            
            // Set initial state
            if (interactive) {
                element.classList.add('playable');
            } else {
                element.classList.add('disabled');
            }
            
            this.elements.playerHand.appendChild(element);
            
            // Trigger animation
            setTimeout(() => {
                element.classList.remove('dealing');
            }, 300 + index * 100);
        });
    }
    
    /**
     * Render opponent's hand (face down)
     * @param {number} cardCount - Number of cards
     */
    renderOpponentHand(cardCount) {
        this.elements.opponentHand.innerHTML = '';
        
        for (let i = 0; i < cardCount; i++) {
            const element = document.createElement('div');
            element.className = 'card face-down';
            element.style.animationDelay = `${i * 0.1}s`;
            element.classList.add('dealing');
            
            this.elements.opponentHand.appendChild(element);
            
            // Trigger animation
            setTimeout(() => {
                element.classList.remove('dealing');
            }, 300 + i * 100);
        }
        
        this.elements.opponentCards.textContent = cardCount;
    }
    
    /**
     * Play a card to the table
     * @param {Card} card - Card to play
     * @param {number} position - 1 for first, 2 for second
     * @param {boolean} fromOpponent - If true, show reveal animation
     * @returns {Promise}
     */
    async playCardToTable(card, position, fromOpponent = false) {
        const slot = position === 1 ? this.elements.firstPlayed : this.elements.secondPlayed;
        
        // Create card element
        const element = this.spriteSheet.createCardElement(card, true);
        element.classList.add('playing');
        
        slot.innerHTML = '';
        slot.appendChild(element);
        slot.classList.add('has-card');
        
        // Wait for animation
        await this.wait(400);
        element.classList.remove('playing');
    }
    
    /**
     * Remove a card from player's hand
     * @param {string} cardId - Card ID to remove
     */
    removeCardFromHand(cardId) {
        const cards = this.elements.playerHand.querySelectorAll('.card');
        cards.forEach(card => {
            if (card.dataset.cardId === cardId) {
                card.classList.add('playing');
                setTimeout(() => card.remove(), 400);
            }
        });
    }
    
    /**
     * Remove a card from opponent's hand (visual only)
     */
    removeOpponentCard() {
        const cards = this.elements.opponentHand.querySelectorAll('.card');
        if (cards.length > 0) {
            const lastCard = cards[cards.length - 1];
            lastCard.classList.add('playing');
            setTimeout(() => lastCard.remove(), 400);
            
            // Update count
            const newCount = cards.length - 1;
            this.elements.opponentCards.textContent = newCount;
        }
    }
    
    /**
     * Clear the table
     * @param {number} winner - Winner player number (for animation direction)
     */
    async clearTable(winner) {
        const firstCard = this.elements.firstPlayed.querySelector('.card');
        const secondCard = this.elements.secondPlayed.querySelector('.card');
        
        // Animate cards toward winner
        const captureY = winner === 1 ? 100 : -100;
        
        if (firstCard) {
            firstCard.style.setProperty('--capture-x', '0px');
            firstCard.style.setProperty('--capture-y', `${captureY}px`);
            firstCard.classList.add('capturing');
        }
        
        if (secondCard) {
            secondCard.style.setProperty('--capture-x', '0px');
            secondCard.style.setProperty('--capture-y', `${captureY}px`);
            secondCard.classList.add('capturing');
        }
        
        await this.wait(600);
        
        this.elements.firstPlayed.innerHTML = '';
        this.elements.secondPlayed.innerHTML = '';
        this.elements.firstPlayed.classList.remove('has-card');
        this.elements.secondPlayed.classList.remove('has-card');
    }
    
    /**
     * Show points popup
     * @param {number} points - Points won
     * @param {number} winner - Winner player number
     */
    showPointsPopup(points, winner) {
        if (points === 0) return;
        
        const popup = document.createElement('div');
        popup.className = 'points-float';
        popup.textContent = `+${points}`;
        
        const playArea = document.querySelector('.play-area');
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = `translate(-50%, ${winner === 1 ? '50px' : '-50px'})`;
        
        playArea.appendChild(popup);
        
        setTimeout(() => popup.remove(), 1000);
    }
    
    /**
     * Update scores display
     * @param {number} playerScore
     * @param {number} opponentScore
     */
    updateScores(playerScore, opponentScore) {
        this.elements.playerScore.textContent = playerScore;
        this.elements.opponentScore.textContent = opponentScore;
    }
    
    /**
     * Update player names
     */
    updateNames(playerName, opponentName) {
        this.elements.playerName.textContent = playerName;
        this.elements.opponentName.textContent = opponentName;
    }
    
    /**
     * Update deck count display
     */
    updateDeckCount(count) {
        this.elements.deckCount.textContent = count;
    }
    
    /**
     * Set briscola card display
     * @param {Card} card
     */
    setBriscolaCard(card) {
        this.elements.briscolaCard.innerHTML = '';
        
        if (card) {
            // Create full-sized briscola card (it will be rotated via CSS)
            const cardElement = this.spriteSheet.createCardElement(card, true);
            cardElement.classList.add('briscola-display');
            this.elements.briscolaCard.appendChild(cardElement);
            this.elements.briscolaCard.classList.add('has-card');
        } else {
            this.elements.briscolaCard.classList.remove('has-card');
        }
    }
    
    /**
     * Update turn indicator
     * @param {boolean} isPlayerTurn
     * @param {string} text - Optional custom text
     */
    updateTurnIndicator(isPlayerTurn, text = null) {
        const indicator = this.elements.turnIndicator;
        
        if (text) {
            indicator.textContent = text;
        } else {
            indicator.textContent = isPlayerTurn ? 'Your turn!' : 'Opponent\'s turn...';
        }
        
        indicator.classList.toggle('waiting', !isPlayerTurn);
        indicator.classList.add('pulse');
        setTimeout(() => indicator.classList.remove('pulse'), 500);
    }
    
    /**
     * Disable all cards in player hand
     */
    disablePlayerHand() {
        const cards = this.elements.playerHand.querySelectorAll('.card');
        cards.forEach(card => {
            card.classList.remove('playable');
            card.classList.add('disabled');
        });
    }
    
    /**
     * Enable all cards in player hand
     */
    enablePlayerHand() {
        const cards = this.elements.playerHand.querySelectorAll('.card');


        cards.forEach(card => {
            card.classList.add('playable');
            card.classList.remove('disabled');
        });

    }
    
    /**
     * Show turn screen (for local 2P)
     * @param {string} playerName
     */
    showTurnScreen(playerName) {
        this.elements.turnPlayerName.textContent = playerName;
        document.getElementById('turn-screen').classList.add('active');
    }
    
    /**
     * Hide turn screen
     */
    hideTurnScreen() {
        document.getElementById('turn-screen').classList.remove('active');
    }
    
    /**
     * Helper: wait for milliseconds
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Reset UI for new game
     */
    reset() {
        this.elements.playerHand.innerHTML = '';
        this.elements.opponentHand.innerHTML = '';
        this.elements.firstPlayed.innerHTML = '';
        this.elements.secondPlayed.innerHTML = '';
        this.elements.firstPlayed.classList.remove('has-card');
        this.elements.secondPlayed.classList.remove('has-card');
        this.updateScores(0, 0);
        this.updateDeckCount(33);
    }
}
