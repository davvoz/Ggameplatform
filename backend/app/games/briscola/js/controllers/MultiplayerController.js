/**
 * Multiplayer Controller
 * 
 * Handles WebSocket-based online multiplayer functionality
 */

export class MultiplayerController {
    constructor(app) {
        this.app = app;
        this.socket = null;
        this.roomCode = null;
        this.isHost = false;
        this.opponentName = null;
        this.playerId = null;
        this.pendingStateUpdate = null;
        this.isProcessingRound = false;
        
        // WebSocket server URL (would need to be configured)
        this.serverUrl = this.getWebSocketUrl();
    }
    
    /**
     * Get WebSocket URL from environment
     */
    getWebSocketUrl() {
        // Get API URL from environment or default to port 8000
        const apiUrl = window.ENV?.API_URL || 'http://localhost:8000';
        const wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
        const host = new URL(apiUrl).host;
        return `${wsProtocol}//${host}/ws/briscola`;
    }
    
    /**
     * Connect to WebSocket server
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = new WebSocket(this.serverUrl);
                
                this.socket.onopen = () => {
                    console.log('[Multiplayer] Connected to server');
                    resolve();
                };
                
                this.socket.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };
                
                this.socket.onerror = (error) => {
                    console.error('[Multiplayer] WebSocket error:', error);
                    reject(error);
                };
                
                this.socket.onclose = () => {
                    console.log('[Multiplayer] Disconnected from server');
                    this.handleDisconnect();
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.roomCode = null;
        this.isHost = false;
        this.opponentName = null;
        
        // Ripristina lo stato della lobby UI
        document.getElementById('room-code-display').style.display = 'none';
        document.getElementById('join-room-form').style.display = 'none';
        document.querySelector('.lobby-options').style.display = 'flex';
        document.querySelector('.waiting-text').textContent = 'In attesa di un avversario...';
    }
    
    /**
     * Create a new room
     */
    async createRoom() {
        try {
            await this.connect();
            
            const username = this.app.platformBridge.getUsername() || 'Giocatore';
            
            this.send({
                type: 'createRoom',
                username: username
            });
            
            this.isHost = true;
            
            // Show waiting UI
            document.getElementById('room-code-display').style.display = 'block';
            document.querySelector('.lobby-options').style.display = 'none';
            
        } catch (error) {
            this.app.showError('Impossibile connettersi al server');
        }
    }
    
    /**
     * Show join room form
     */
    showJoinForm() {
        document.getElementById('join-room-form').style.display = 'flex';
        document.querySelector('.lobby-options').style.display = 'none';
        document.getElementById('room-input').focus();
    }
    
    /**
     * Join an existing room
     */
    async joinRoom(code) {
        if (!code || code.length !== 4) {
            this.app.showError('Codice stanza non valido');
            return;
        }
        
        try {
            await this.connect();
            
            const username = this.app.platformBridge.getUsername() || 'Giocatore';
            
            this.send({
                type: 'joinRoom',
                roomCode: code.toUpperCase(),
                username: username
            });
            
            this.roomCode = code.toUpperCase();
            
        } catch (error) {
            this.app.showError('Impossibile connettersi al server');
        }
    }
    
    /**
     * Send message to server
     */
    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }
    
    /**
     * Send play card to server
     */
    sendPlayCard(card) {
        console.log('[Multiplayer] Sending play card:', card.id);
        this.send({
            type: 'playCard',
            card: {
                id: card.id,
                suit: card.suit.id,
                value: card.value
            }
        });
    }
    
    /**
     * Handle incoming messages
     */
    handleMessage(message) {
        console.log('[Multiplayer] Received:', message);
        
        switch (message.type) {
            case 'roomCreated':
                this.handleRoomCreated(message);
                break;
                
            case 'playerJoined':
                this.handlePlayerJoined(message);
                break;
                
            case 'gameStart':
                this.handleGameStart(message);
                break;
                
            case 'cardPlayed':
                this.handleCardPlayed(message);
                break;
                
            case 'roundEnd':
                this.handleRoundEnd(message);
                break;
                
            case 'stateUpdate':
                this.handleStateUpdate(message);
                break;
                
            case 'gameEnd':
                this.handleGameEnd(message);
                break;
                
            case 'error':
                this.handleError(message);
                break;
                
            case 'opponentDisconnected':
                this.handleOpponentDisconnect();
                break;
        }
    }
    
    /**
     * Handle room created
     */
    handleRoomCreated(message) {
        this.roomCode = message.roomCode;
        this.playerId = message.playerId;
        
        document.getElementById('room-code').textContent = this.roomCode;
    }
    
    /**
     * Handle player joined
     */
    handlePlayerJoined(message) {
        this.opponentName = message.username;
        
        if (!this.playerId) {
            this.playerId = message.playerId;
        }
        
        // Game will start soon
        document.querySelector('.waiting-text').textContent = `${this.opponentName} si è unito!`;
    }
    
    /**
     * Handle game start
     */
    handleGameStart(message) {
        console.log('[Multiplayer] handleGameStart - full message:', JSON.stringify(message));
        console.log('[Multiplayer] gameState.is_your_turn:', message.gameState?.is_your_turn);
        
        // Store game state from server
        this.opponentName = message.opponentName;
        
        // Configure app for online play
        this.app.currentMode = 'online';
        
        // Start the game with server state
        this.startOnlineGame(message.gameState);
    }
    
    /**
     * Start online game with server state
     */
    startOnlineGame(serverState) {
        console.log('[Multiplayer] Starting online game with server state:', serverState);
        
        // Reset game engine but don't init new game
        this.app.gameEngine.reset();
        
        // Configure game
        const config = {
            mode: 'online',
            player1Name: this.app.platformBridge.getUsername() || 'Tu',
            player2Name: this.opponentName || 'Avversario'
        };
        
        // Initialize game engine
        this.app.gameEngine.init(config);
        
        // Apply server state to override local state
        this.applyServerState(serverState);
        
        // Setup UI
        this.app.gameController.setup(this.app.gameEngine.getState());
        
        // Show game screen
        this.app.showScreen('game');
        
        // Render the correct state
        this.app.gameController.renderGameState(this.app.gameEngine.getState());
        
        // Set correct turn indicator based on server state
        const isMyTurn = serverState.is_your_turn === true;
        this.app.uiManager.updateTurnIndicator(isMyTurn);
        if (isMyTurn) {
            this.app.uiManager.enablePlayerHand();
        } else {
            this.app.uiManager.disablePlayerHand();
        }
        
        // Report to platform
        this.app.platformBridge.reportGameStart();
    }
    
    /**
     * Apply server game state
     */
    applyServerState(serverState) {
        console.log('[Multiplayer] Applying server state - is_your_turn:', serverState.is_your_turn, 'type:', typeof serverState.is_your_turn);
        
        const engine = this.app.gameEngine;
        
        // Clear and set player hand from server
        engine.player1Hand = [];
        if (serverState.your_hand) {
            serverState.your_hand.forEach(cardData => {
                const card = engine.deserializeCard(cardData);
                if (card) engine.player1Hand.push(card);
            });
        }
        
        // Set opponent card count
        engine.player2Hand = [];
        for (let i = 0; i < (serverState.opponent_card_count || 3); i++) {
            // Create placeholder cards for opponent
            engine.player2Hand.push({ id: `opp_${i}`, hidden: true });
        }
        
        // Set briscola - gestisci sia presenza che assenza
        if (serverState.briscola) {
            engine.briscolaCard = engine.deserializeCard(serverState.briscola);
            engine.briscola = serverState.briscola_suit;
        } else {
            // Briscola non più disponibile (mazzo esaurito)
            engine.briscolaCard = null;
        }
        
        // Set scores
        engine.player1Score = serverState.your_score || 0;
        engine.player2Score = serverState.opponent_score || 0;
        
        // Set deck count (per multiplayer)
        engine._onlineDeckRemaining = serverState.deck_remaining ?? 0;
        
        // Set current turn - be explicit about the boolean check
        const isMyTurn = serverState.is_your_turn === true;
        engine.currentPlayer = isMyTurn ? 1 : 2;
        console.log('[Multiplayer] Set currentPlayer to:', engine.currentPlayer);
        
        // Set played cards
        engine.playedCard1 = serverState.played_card_1 ? engine.deserializeCard(serverState.played_card_1) : null;
        engine.playedCard2 = serverState.played_card_2 ? engine.deserializeCard(serverState.played_card_2) : null;
    }
    
    /**
     * Handle card played by opponent
     */
    handleCardPlayed(message) {
        const roundComplete = message.roundComplete === true;
        const isMyTurn = message.isYourTurn === true;
        
        console.log('[Multiplayer] handleCardPlayed - playerId:', message.playerId, 'myId:', this.playerId, 'isYourTurn:', isMyTurn, 'roundComplete:', roundComplete);
        
        if (message.playerId === this.playerId) {
            // We played our card
            // If round is not complete, opponent will play next - show their turn
            // If round is complete, wait for stateUpdate
            if (!roundComplete) {
                console.log('[Multiplayer] We played first card, waiting for opponent');
                this.app.uiManager.updateTurnIndicator(false);
                this.app.uiManager.disablePlayerHand();
            }
            // If roundComplete, don't update - stateUpdate will handle it
        } else {
            // Opponent played their card
            console.log('[Multiplayer] Opponent played, roundComplete:', roundComplete);
            
            // Show opponent's card on table
            this.app.gameController.handleOnlineMove(2, message.card, !roundComplete);
            
            // If round is NOT complete, it means opponent played first - it's our turn!
            // If round IS complete, wait for stateUpdate
        }
    }
    
    /**
     * Handle round end from server
     */
    async handleRoundEnd(message) {
        console.log('[Multiplayer] Round end:', message);
        
        this.isProcessingRound = true;
        
        // Determine who won from our perspective
        const weWon = message.winner === this.playerId;
        const roundWinner = weWon ? 1 : 2;
        
        // Play sound
        if (message.points > 0) {
            if (weWon) {
                this.app.soundManager?.play('roundWin');
            } else {
                this.app.soundManager?.play('roundLose');
            }
        }
        
        // Wait for cards to display
        await this.app.uiManager.wait(800);
        
        // Show points popup
        this.app.uiManager.showPointsPopup(message.points, roundWinner);
        
        // Clear table
        await this.app.uiManager.clearTable(roundWinner);
        
        this.isProcessingRound = false;
        
        // Process pending state update if any
        if (this.pendingStateUpdate) {
            console.log('[Multiplayer] Processing pending state update');
            this.applyStateUpdate(this.pendingStateUpdate);
            this.pendingStateUpdate = null;
        }
    }
    
    /**
     * Handle state update from server (after round end)
     */
    handleStateUpdate(message) {
        console.log('[Multiplayer] State update received, isProcessingRound:', this.isProcessingRound);
        
        if (this.isProcessingRound) {
            // Store for later processing
            console.log('[Multiplayer] Storing state update for later');
            this.pendingStateUpdate = message;
            return;
        }
        
        this.applyStateUpdate(message);
    }
    
    /**
     * Apply state update to game
     */
    applyStateUpdate(message) {
        const serverState = message.state;
        if (!serverState) return;
        
        console.log('[Multiplayer] Applying state update:');
        console.log('  - is_your_turn:', serverState.is_your_turn);
        console.log('  - your_hand length:', serverState.your_hand?.length);
        console.log('  - opponent_card_count:', serverState.opponent_card_count);
        console.log('  - deck_remaining:', serverState.deck_remaining);
        
        // Apply the new state
        this.applyServerState(serverState);
        
        // Get state and log it
        const engineState = this.app.gameEngine.getState();
        console.log('[Multiplayer] Engine state after apply:');
        console.log('  - player1Hand:', engineState.player1Hand.length);
        console.log('  - player2HandCount:', engineState.player2HandCount);
        
        // Render the updated game
        this.app.gameController.renderGameState(engineState);
        
        // Update turn indicator
        const isMyTurn = serverState.is_your_turn === true;
        console.log('[Multiplayer] Setting turn indicator to:', isMyTurn);
        this.app.uiManager.updateTurnIndicator(isMyTurn);
        
        if (isMyTurn) {
            this.app.uiManager.enablePlayerHand();
        } else {
            this.app.uiManager.disablePlayerHand();
        }
    }
    
    /**
     * Handle game end from server
     */
    handleGameEnd(message) {
        // Aggiorna i punteggi del gameEngine con quelli finali dal server
        if (message.player1Score !== undefined && message.player2Score !== undefined) {
            // Determina quale score è il nostro
            const isHost = this.playerId === message.winner || 
                           (this.isHost && message.winner === null);
            
            // Il server invia player1Score e player2Score dove player1 è l'host
            if (this.isHost) {
                this.app.gameEngine.player1Score = message.player1Score;
                this.app.gameEngine.player2Score = message.player2Score;
            } else {
                // Siamo il guest, quindi i nostri punti sono player2Score
                this.app.gameEngine.player1Score = message.player2Score;
                this.app.gameEngine.player2Score = message.player1Score;
            }
        }
        
        // Play end game sound
        if (message.winner === this.playerId) {
            this.app.soundManager?.play('gameWin');
        } else if (message.winner) {
            this.app.soundManager?.play('gameLose');
        }
        
        this.app.endGame(message.winner === this.playerId ? 1 : (message.winner ? 2 : 0));
    }
    
    /**
     * Handle error
     */
    handleError(message) {
        this.app.showError(message.message || 'Errore di connessione');
        
        if (message.code === 'ROOM_NOT_FOUND') {
            document.getElementById('join-room-form').style.display = 'none';
            document.querySelector('.lobby-options').style.display = 'flex';
        }
    }
    
    /**
     * Handle opponent disconnect
     */
    handleOpponentDisconnect() {
        this.app.showError('L\'avversario si è disconnesso');
        setTimeout(() => {
            this.disconnect();
            this.app.backToMenu();
        }, 2000);
    }
    
    /**
     * Handle our disconnect
     */
    handleDisconnect() {
        if (this.app.currentMode === 'online') {
            this.app.showError('Connessione persa');
            setTimeout(() => {
                this.app.backToMenu();
            }, 2000);
        }
    }
    
    /**
     * Send card played to server
     */
    sendCardPlayed(card) {
        this.send({
            type: 'playCard',
            roomCode: this.roomCode,
            playerId: this.playerId,
            card: card.toJSON()
        });
    }
}

/**
 * Simple fallback for when WebSocket server is not available
 * Uses localStorage for local testing
 */
export class LocalMultiplayerFallback {
    constructor(app) {
        this.app = app;
        this.roomCode = null;
        this.isHost = false;
        this.pollInterval = null;
    }
    
    createRoom() {
        this.roomCode = this.generateRoomCode();
        this.isHost = true;
        
        localStorage.setItem(`briscola_room_${this.roomCode}`, JSON.stringify({
            host: this.app.platformBridge.getUsername() || 'Host',
            guest: null,
            gameState: null,
            moves: []
        }));
        
        document.getElementById('room-code').textContent = this.roomCode;
        document.getElementById('room-code-display').style.display = 'block';
        document.querySelector('.lobby-options').style.display = 'none';
        
        // Poll for guest
        this.startPolling();
    }
    
    joinRoom(code) {
        const roomData = localStorage.getItem(`briscola_room_${code}`);
        if (!roomData) {
            this.app.showError('Stanza non trovata');
            return;
        }
        
        const room = JSON.parse(roomData);
        room.guest = this.app.platformBridge.getUsername() || 'Guest';
        localStorage.setItem(`briscola_room_${code}`, JSON.stringify(room));
        
        this.roomCode = code;
        this.isHost = false;
        
        // Start game
        setTimeout(() => {
            this.app.multiplayerController.opponentName = room.host;
            this.app.startGame();
        }, 500);
    }
    
    startPolling() {
        this.pollInterval = setInterval(() => {
            const roomData = localStorage.getItem(`briscola_room_${this.roomCode}`);
            if (roomData) {
                const room = JSON.parse(roomData);
                if (room.guest) {
                    clearInterval(this.pollInterval);
                    this.app.multiplayerController.opponentName = room.guest;
                    this.app.startGame();
                }
            }
        }, 1000);
    }
    
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    disconnect() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        if (this.roomCode) {
            localStorage.removeItem(`briscola_room_${this.roomCode}`);
        }
        this.roomCode = null;
    }
}
