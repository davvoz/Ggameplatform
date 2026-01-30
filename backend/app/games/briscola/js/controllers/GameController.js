/**
 * Game Controller
 * 
 * Handles game flow, player interactions, and AI turns
 */

export class GameController {
    constructor(app) {
        this.app = app;
        this.isProcessing = false;
        this.currentPlayerInLocalMode = 1; // For local 2P mode
    }
    
    /**
     * Setup the game UI with initial state
     * @param {Object} state - Initial game state
     */
    setup(state) {
        const ui = this.app.uiManager;
        
        // Reset UI
        ui.reset();
        
        // Set names
        ui.updateNames(state.player1Name, state.player2Name);
        
        // Set briscola
        ui.setBriscolaCard(state.briscolaCard);
        
        // Update deck count
        ui.updateDeckCount(state.deckRemaining);
        
        // Set opponent avatar based on mode
        const opponentAvatar = document.querySelector('.opponent-info .player-avatar span');
        if (opponentAvatar) {
            if (this.app.currentMode === 'ai') {
                opponentAvatar.textContent = '🤖';
            } else if (this.app.currentMode === 'online') {
                opponentAvatar.textContent = '🌐';
            } else {
                opponentAvatar.textContent = '👤';
            }
        }
    }
    
    /**
     * Start the game
     */
    startGame() {
        const state = this.app.gameEngine.getState();
        const ui = this.app.uiManager;
        
        // Set up engine callbacks
        this.app.gameEngine.onStateChange = (state) => this.onStateChange(state);
        this.app.gameEngine.onRoundEnd = (result) => this.onRoundEnd(result);
        this.app.gameEngine.onGameOver = (result) => this.onGameOver(result);
        
        // Initial render
        this.renderGameState(state);
        
        // Check if AI should play first
        if (this.app.currentMode === 'ai' && state.currentPlayer === 2) {
            setTimeout(() => this.playAITurn(), 1000);
        }
        
        // For local 2P, show turn screen
        if (this.app.currentMode === 'local') {
            this.showLocalTurnScreen(state.currentPlayer);
        }
    }
    
    /**
     * Render the current game state
     */
    renderGameState(state) {
        const ui = this.app.uiManager;

        
        // Render hands
        if (this.app.currentMode === 'local') {
            // In local mode, show current player's hand
            const hand = this.currentPlayerInLocalMode === 1 ? state.player1Hand : state.player2Hand;
            const isCurrentTurn = state.currentPlayer === this.currentPlayerInLocalMode;
            ui.renderPlayerHand(hand, isCurrentTurn, (card, el) => this.onCardClick(card, el));
            
            const otherCount = this.currentPlayerInLocalMode === 1 ? state.player2HandCount : state.player1HandCount;
            ui.renderOpponentHand(otherCount);
        } else {
            // Normal mode - player 1 is the human
            const isPlayerTurn = state.currentPlayer === 1;

            ui.renderPlayerHand(state.player1Hand, isPlayerTurn, (card, el) => this.onCardClick(card, el));
            ui.renderOpponentHand(state.player2HandCount);
        }
        
        // Update scores
        if (this.app.currentMode === 'local') {
            // Swap display based on current viewer
            if (this.currentPlayerInLocalMode === 1) {
                ui.updateScores(state.player1Score, state.player2Score);
            } else {
                ui.updateScores(state.player2Score, state.player1Score);
            }
        } else {
            ui.updateScores(state.player1Score, state.player2Score);
        }
        
        // Update deck count
        ui.updateDeckCount(state.deckRemaining);
        
        // Update briscola display
        ui.setBriscolaCard(state.briscolaCard);
        
        // Update turn indicator
        if (this.app.currentMode === 'local') {
            const isMyTurn = state.currentPlayer === this.currentPlayerInLocalMode;
            ui.updateTurnIndicator(isMyTurn);
        } else {
            ui.updateTurnIndicator(state.currentPlayer === 1);
        }
        
        // Show played cards
        if (state.playedCard1) {
            ui.playCardToTable(state.playedCard1, 1, false);
        }
        if (state.playedCard2) {
            ui.playCardToTable(state.playedCard2, 2, false);
        }
    }
    
    /**
     * Handle card click
     */
    async onCardClick(card, element) {
        if (this.isProcessing) {

            return;
        }
        
        // Determine which player is clicking
        let player;
        if (this.app.currentMode === 'local') {
            player = this.currentPlayerInLocalMode;
        } else {
            player = 1;
        }
        
        // In online mode, check if card is enabled (the server controls turns)
        if (this.app.currentMode === 'online') {
            if (element.classList.contains('disabled')) {

                return;
            }
        } else {
            // For local/AI modes, check game engine state
            const state = this.app.gameEngine.getState();
            
            // Check if it's this player's turn
            if (state.currentPlayer !== player) {

                return;
            }
        }
        
        this.isProcessing = true;

        
        // Disable hand immediately to prevent double clicks
        this.app.uiManager.disablePlayerHand();
        
        // Play card sound
        this.app.soundManager?.play('cardPlay');
        
        // Animate card removal
        this.app.uiManager.removeCardFromHand(card.id);
        
        // Show card on table first (before calling playCard which triggers onRoundEnd)
        // Check if first slot already has a card (for online mode where engine state may not be updated)
        const firstSlot = document.getElementById('first-played');
        const hasFirstCard = firstSlot && firstSlot.querySelector('.card');
        const position = hasFirstCard ? 2 : 1;
        await this.app.uiManager.playCardToTable(card, position, false);
        
        // For online mode, send to server instead of local engine
        if (this.app.currentMode === 'online') {
            this.app.multiplayerController.sendPlayCard(card);
            this.app.uiManager.updateTurnIndicator(false);
            this.isProcessing = false;
            return;
        }
        
        // Now play the card in the engine (this may trigger onRoundEnd callback)
        const result = this.app.gameEngine.playCard(player, card);
        
        if (result.success) {
            // Update turn indicator
            if (!result.isRoundComplete) {
                if (this.app.currentMode === 'ai') {
                    this.app.uiManager.updateTurnIndicator(false);
                    
                    // AI plays after a delay
                    this.isProcessing = false;
                    setTimeout(() => this.playAITurn(), 800 + Math.random() * 500);
                    return;
                } else if (this.app.currentMode === 'local') {
                    // Switch to other player view
                    this.isProcessing = false;
                    setTimeout(() => {
                        this.currentPlayerInLocalMode = this.currentPlayerInLocalMode === 1 ? 2 : 1;
                        this.showLocalTurnScreen(this.currentPlayerInLocalMode);
                    }, 500);
                    return;
                }
                // For online mode, wait for server response
            }
            // If round is complete, onRoundEnd handles the rest
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Play AI turn
     */
    async playAITurn() {
        if (this.app.gameEngine.isGameOver) return;
        
        const state = this.app.gameEngine.getState();
        if (state.currentPlayer !== 2) {

            return;
        }
        
        if (this.isProcessing) {

            setTimeout(() => this.playAITurn(), 500);
            return;
        }
        
        this.isProcessing = true;

        
        // Get AI move
        const aiCard = this.app.gameEngine.getAIMove();
        if (!aiCard) {

            this.isProcessing = false;
            return;
        }
        

        
        // Play card sound
        this.app.soundManager?.play('cardPlay');
        
        // Animate opponent card removal
        this.app.uiManager.removeOpponentCard();
        
        await this.app.uiManager.wait(300);
        
        // Show card on table first
        const position = state.playedCard1 === null ? 1 : 2;
        await this.app.uiManager.playCardToTable(aiCard, position, true);
        
        // Now play the card in the engine
        const result = this.app.gameEngine.playCard(2, aiCard);
        
        if (result.success) {
            if (!result.isRoundComplete) {
                // Player's turn - just enable the existing hand, don't re-render

                this.app.uiManager.updateTurnIndicator(true);
                this.app.uiManager.enablePlayerHand();
            }
            // If round is complete, onRoundEnd callback handles it
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Handle state change
     */
    onStateChange(state) {
        // Could update UI elements here if needed
    }
    
    /**
     * Handle round end
     */
    async onRoundEnd(result) {
        this.isProcessing = true;

        
        const ui = this.app.uiManager;
        
        // Wait a moment to show both cards
        await ui.wait(1000);
        
        // Play round result sound
        if (result.pointsWon > 0) {
            if (result.roundWinner === 1) {
                this.app.soundManager?.play('roundWin');
            } else {
                this.app.soundManager?.play('roundLose');
            }
        }
        
        // Show points popup
        ui.showPointsPopup(result.pointsWon, result.roundWinner);
        
        // Clear table with animation
        await ui.clearTable(result.roundWinner);
        
        // Check for game over
        if (result.isGameOver) {
            this.onGameOver({
                winner: result.gameWinner,
                player1Score: result.player1Score,
                player2Score: result.player2Score
            });
            this.isProcessing = false;
            return;
        }
        
        // Render new state
        const newState = this.app.gameEngine.getState();

        
        if (this.app.currentMode === 'local') {
            // In local mode, switch view to winner
            this.currentPlayerInLocalMode = result.roundWinner;
            this.showLocalTurnScreen(result.roundWinner);
            this.isProcessing = false;
        } else {
            this.renderGameState(newState);
            
            // If AI's turn, trigger AI play
            if (this.app.currentMode === 'ai' && newState.currentPlayer === 2) {
                this.isProcessing = false;
                setTimeout(() => this.playAITurn(), 800);
            } else {
                // Player's turn - enable hand

                this.isProcessing = false;
            }
        }
    }
    
    /**
     * Handle game over
     */
    onGameOver(result) {

        
        // Play game over sound
        if (result.winner === 1) {
            this.app.soundManager?.play('gameWin');
        } else if (result.winner === 2) {
            this.app.soundManager?.play('gameLose');
        }
        
        // Map winner to player perspective
        let winner = result.winner;
        if (this.app.currentMode === 'local') {
            // In local mode, just show the result as-is
        }
        
        this.app.endGame(winner);
    }
    
    /**
     * Show turn screen for local 2P mode
     */
    showLocalTurnScreen(player) {
        const state = this.app.gameEngine.getState();
        const playerName = player === 1 ? state.player1Name : state.player2Name;
        this.app.uiManager.showTurnScreen(playerName);
    }
    
    /**
     * Handle player ready in local 2P mode
     */
    onPlayerReady() {
        this.app.uiManager.hideTurnScreen();
        
        const state = this.app.gameEngine.getState();
        this.renderGameState(state);
    }
    
    /**
     * Handle online move received
     */
    async handleOnlineMove(player, cardData, isMyTurn) {
        if (player === 1) {
            // This shouldn't happen in normal flow
            return;
        }
        

        
        // Don't set isProcessing for opponent moves - we need to allow player to click
        
        // Play card sound
        this.app.soundManager?.play('cardPlay');
        
        // Animate opponent card removal
        this.app.uiManager.removeOpponentCard();
        
        await this.app.uiManager.wait(300);
        
        // In online mode, just show the card visually - don't modify engine state
        // The server will send stateUpdate with the correct state
        const card = this.app.gameEngine.deserializeCard(cardData);
        
        if (card) {
            // Determine position based on what's visually on the table
            const firstSlot = document.getElementById('first-played');
            const hasFirstCard = firstSlot && firstSlot.querySelector('.card');
            const position = hasFirstCard ? 2 : 1;
            await this.app.uiManager.playCardToTable(card, position, true);
            
            // Update turn indicator based on server info
            this.app.uiManager.updateTurnIndicator(isMyTurn);
            if (isMyTurn) {
                this.app.uiManager.enablePlayerHand();
            } else {
                this.app.uiManager.disablePlayerHand();
            }
        }
    }
}
