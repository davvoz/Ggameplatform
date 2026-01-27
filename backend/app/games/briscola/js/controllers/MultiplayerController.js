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
        this.waitingForRematch = false;
        this.opponentWantsRematch = false;
        
        // WebSocket server URL (would need to be configured)
        this.serverUrl = this.getWebSocketUrl();
    }
    
    /**
     * Get WebSocket URL from environment
     */
    getWebSocketUrl() {
        // Auto-detect backend URL based on current page location
        // This works for both local development and production behind reverse proxy
        const hostname = window.location.hostname;
        const port = window.location.port;
        const isSecure = window.location.protocol === 'https:';
        const wsProtocol = isSecure ? 'wss:' : 'ws:';
        
        // In production (no port or standard ports), don't add port
        // In development (e.g., :3000), the backend is on :8000
        let wsHost = hostname;
        if (port && port !== '80' && port !== '443') {
            // Development: frontend on :3000, backend on :8000
            wsHost = `${hostname}:8000`;
        }
        
        const wsUrl = `${wsProtocol}//${wsHost}/ws/briscola`;
        console.log('[Multiplayer] WebSocket URL:', wsUrl);
        return wsUrl;
    }
    
    /**
     * Connect to WebSocket server
     */
    connect() {
        return new Promise((resolve, reject) => {
            console.log('[Multiplayer] Tentativo connessione a:', this.serverUrl);
            
            try {
                this.socket = new WebSocket(this.serverUrl);
                
                // Timeout per la connessione
                const connectionTimeout = setTimeout(() => {
                    console.error('[Multiplayer] Timeout connessione WebSocket');
                    this.socket.close();
                    reject(new Error('Timeout connessione - il server non risponde'));
                }, 10000);
                
                this.socket.onopen = () => {
                    clearTimeout(connectionTimeout);
                    console.log('[Multiplayer] Connessione WebSocket stabilita');
                    resolve();
                };
                
                this.socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('[Multiplayer] Messaggio ricevuto:', data.type);
                        this.handleMessage(data);
                    } catch (e) {
                        console.error('[Multiplayer] Errore parsing messaggio:', e);
                    }
                };
                
                this.socket.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    console.error('[Multiplayer] WebSocket error:', error);
                    console.error('[Multiplayer] ReadyState:', this.socket?.readyState);
                    reject(new Error('Errore WebSocket - verifica che il server sia attivo'));
                };
                
                this.socket.onclose = (event) => {
                    clearTimeout(connectionTimeout);
                    console.log('[Multiplayer] WebSocket chiuso - code:', event.code, 'reason:', event.reason);
                    if (event.code !== 1000) {
                        console.warn('[Multiplayer] Chiusura anomala:', event.code);
                    }
                    this.handleDisconnect();
                };
                
            } catch (error) {
                console.error('[Multiplayer] Errore creazione WebSocket:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Disconnect from server
     */
    disconnect() {
        console.log('[Multiplayer] disconnect() chiamato');
        
        // Invia messaggio 'leave' al server prima di chiudere
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            try {
                this.send({
                    type: 'leave'
                });
                console.log('[Multiplayer] Messaggio leave inviato al server');
            } catch (e) {
                console.warn('[Multiplayer] Errore invio messaggio leave:', e);
            }
        }
        
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        // Pulisci completamente lo stato
        this.cleanup();
    }
    
    /**
     * Cleanup multiplayer state
     * Resetta tutte le variabili e lo stato UI
     */
    cleanup() {
        console.log('[Multiplayer] cleanup() - resetting all state');
        
        this.roomCode = null;
        this.isHost = false;
        this.opponentName = null;
        this.playerId = null;
        this.pendingStateUpdate = null;
        this.isProcessingRound = false;
        this.waitingForRematch = false;
        this.opponentWantsRematch = false;
        
        // Ripristina lo stato della lobby UI
        const roomCodeDisplay = document.getElementById('room-code-display');
        const joinRoomForm = document.getElementById('join-room-form');
        const lobbyOptions = document.querySelector('.lobby-options');
        const waitingText = document.querySelector('.waiting-text');
        const roomInput = document.getElementById('room-input');
        const roomCode = document.getElementById('room-code');
        
        if (roomCodeDisplay) roomCodeDisplay.style.display = 'none';
        if (joinRoomForm) joinRoomForm.style.display = 'none';
        if (lobbyOptions) lobbyOptions.style.display = 'flex';
        if (waitingText) waitingText.textContent = 'Waiting for an opponent...';
        if (roomInput) roomInput.value = '';
        if (roomCode) roomCode.textContent = '----';
        
        console.log('[Multiplayer] cleanup completato');
    }
    
    /**
     * Create a new room
     */
    async createRoom() {
        console.log('[Multiplayer] Tentativo di creazione stanza...');
        console.log('[Multiplayer] WebSocket URL:', this.serverUrl);
        
        // Pulisci lo stato precedente prima di creare una nuova stanza
        this.cleanup();
        
        try {
            await this.connect();
            console.log('[Multiplayer] Connessione WebSocket riuscita');
            
            const username = this.app.platformBridge.getUsername() || 'Player';
            console.log('[Multiplayer] Invio richiesta createRoom per utente:', username);
            
            this.send({
                type: 'createRoom',
                username: username
            });
            
            this.isHost = true;
            
            // Show waiting UI
            document.getElementById('room-code-display').style.display = 'block';
            document.querySelector('.lobby-options').style.display = 'none';
            
        } catch (error) {
            console.error('[Multiplayer] Errore creazione stanza:', error);
            this.showConnectionError('CREATE_ROOM_FAILED', error);
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
        console.log('[Multiplayer] Tentativo di unirsi alla stanza:', code);
        
        if (!code || code.length !== 4) {
            console.warn('[Multiplayer] Codice stanza non valido:', code);
            this.showConnectionError('INVALID_CODE', 'Il codice deve essere di 4 caratteri');
            return;
        }
        
        // Pulisci lo stato precedente prima di unirsi a una nuova stanza
        this.cleanup();
        
        try {
            await this.connect();
            console.log('[Multiplayer] Connessione riuscita, invio joinRoom');
            
            const username = this.app.platformBridge.getUsername() || 'Player';
            
            this.send({
                type: 'joinRoom',
                roomCode: code.toUpperCase(),
                username: username
            });
            
            this.roomCode = code.toUpperCase();
            console.log('[Multiplayer] Richiesta joinRoom inviata per stanza:', this.roomCode);
            
        } catch (error) {
            console.error('[Multiplayer] Errore join room:', error);
            this.showConnectionError('JOIN_ROOM_FAILED', error);
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
                
            case 'rematchRequested':
                this.handleRematchRequested(message);
                break;
                
            case 'rematchStart':
                this.handleRematchStart(message);
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
            player2Name: this.opponentName || 'Opponent'
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
        // Reset rematch flags when game ends
        this.waitingForRematch = false;
        this.opponentWantsRematch = false;
        
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
     * Request rematch
     */
    requestRematch() {
        console.log('[Multiplayer] ===== REMATCH REQUEST START =====');
        console.log('[Multiplayer] socket:', this.socket);
        console.log('[Multiplayer] socket.readyState:', this.socket?.readyState);
        console.log('[Multiplayer] roomCode:', this.roomCode);
        console.log('[Multiplayer] opponentWantsRematch:', this.opponentWantsRematch);
        
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('[Multiplayer] Socket non connesso! readyState:', this.socket?.readyState);
            this.app.showError('Connection lost. Return to menu and reconnect.');
            return;
        }
        
        this.waitingForRematch = true;
        
        this.send({
            type: 'rematch'
        });
        
        console.log('[Multiplayer] Messaggio rematch inviato');
        
        // Aggiorna UI SOLO se l'avversario non ha già richiesto
        // Otherwise wait for rematchStart message from server
        if (!this.opponentWantsRematch) {
            this.updateRematchUI();
        } else {
            // Both clicked, show "Starting game..."
            const playAgainBtn = document.getElementById('play-again');
            if (playAgainBtn) {
                playAgainBtn.disabled = true;
                playAgainBtn.textContent = 'Starting game...';
            }
        }
    }
    
    /**
     * Handle rematch requested by opponent
     */
    handleRematchRequested(message) {
        console.log('[Multiplayer] Avversario ha richiesto rematch, waitingForRematch:', this.waitingForRematch);
        this.opponentWantsRematch = true;
        
        // Aggiorna sempre la UI per mostrare lo stato corretto
        this.updateRematchUI();
    }
    
    /**
     * Handle rematch start
     */
    handleRematchStart(message) {
        console.log('[Multiplayer] Rematch avviato dal server');
        
        // Reset rematch flags
        this.waitingForRematch = false;
        this.opponentWantsRematch = false;
        
        // Start the new game with server state
        this.startOnlineGame(message.gameState);
    }
    
    /**
     * Update rematch UI
     */
    updateRematchUI() {
        console.log('[Multiplayer] updateRematchUI - waitingForRematch:', this.waitingForRematch, 'opponentWantsRematch:', this.opponentWantsRematch);
        
        const playAgainBtn = document.getElementById('play-again');
        const announcement = document.getElementById('winner-announcement');
        
        if (!playAgainBtn) {
            console.warn('[Multiplayer] playAgainBtn non trovato!');
            return;
        }
        
        if (this.waitingForRematch && this.opponentWantsRematch) {
            // Entrambi vogliono rigiocare - il server sta avviando il gioco
            console.log('[Multiplayer] Entrambi vogliono rematch - mostro Avvio partita...');
            playAgainBtn.disabled = true;
            playAgainBtn.textContent = 'Starting game...';
        } else if (this.waitingForRematch) {
            // Stiamo aspettando l'avversario
            console.log('[Multiplayer] In attesa avversario...');
            playAgainBtn.disabled = true;
            playAgainBtn.textContent = 'Waiting for opponent...';
            
            if (announcement) {
                const waitMsg = document.createElement('div');
                waitMsg.id = 'rematch-wait-msg';
                waitMsg.style.cssText = `
                    margin-top: 15px;
                    padding: 10px 20px;
                    background: rgba(241, 196, 15, 0.2);
                    border: 1px solid rgba(241, 196, 15, 0.4);
                    border-radius: 8px;
                    color: #f39c12;
                    font-size: 14px;
                    text-align: center;
                `;
                waitMsg.textContent = "Waiting for opponent to accept rematch...";
                
                // Rimuovi messaggio precedente se esiste
                const oldMsg = document.getElementById('rematch-wait-msg');
                if (oldMsg) oldMsg.remove();
                
                announcement.appendChild(waitMsg);
            }
        } else if (this.opponentWantsRematch) {
            // L'avversario vuole rigiocare
            console.log('[Multiplayer] Avversario vuole rigiocare - mostro Accetta Rematch');
            playAgainBtn.disabled = false;
            playAgainBtn.innerHTML = '<span class=\"btn-icon-svg\">↻</span> Accetta Rematch';
            
            if (announcement) {
                const acceptMsg = document.createElement('div');
                acceptMsg.id = 'rematch-wait-msg';
                acceptMsg.style.cssText = `
                    margin-top: 15px;
                    padding: 10px 20px;
                    background: rgba(46, 204, 113, 0.2);
                    border: 1px solid rgba(46, 204, 113, 0.4);
                    border-radius: 8px;
                    color: #27ae60;
                    font-size: 14px;
                    text-align: center;
                `;
                acceptMsg.textContent = "Opponent wants to play again!";
                
                // Rimuovi messaggio precedente se esiste
                const oldMsg = document.getElementById('rematch-wait-msg');
                if (oldMsg) oldMsg.remove();
                
                announcement.appendChild(acceptMsg);
            }
        }
    }
    
    /**
     * Handle error
     */
    handleError(message) {
        console.error('[Multiplayer] Errore dal server:', JSON.stringify(message));
        
        // Logging dettagliato
        const errorInfo = {
            code: message.code || 'UNKNOWN',
            message: message.message || 'Errore sconosciuto',
            timestamp: new Date().toISOString(),
            roomCode: this.roomCode,
            playerId: this.playerId,
            isHost: this.isHost
        };
        console.error('[Multiplayer] Error details:', JSON.stringify(errorInfo));
        
        // Mostra banner errore dettagliato
        this.showConnectionError(message.code, message.message);
        
        if (message.code === 'ROOM_NOT_FOUND' || message.code === 'ROOM_FULL') {
            document.getElementById('join-room-form').style.display = 'none';
            document.querySelector('.lobby-options').style.display = 'flex';
        }
    }
    
    /**
     * Show connection error banner with details
     */
    showConnectionError(code, details) {
        const errorMessages = {
            'ROOM_NOT_FOUND': 'Room does not exist. Check the code entered.',
            'ROOM_FULL': 'Room is already full. Try creating a new one.',
            'CREATE_ROOM_FAILED': 'Unable to create room. Server may be unreachable.',
            'JOIN_ROOM_FAILED': 'Unable to join room. Check your connection.',
            'WEBSOCKET_ERROR': 'WebSocket connection error.',
            'CONNECTION_CLOSED': 'Connection was closed.',
            'UNKNOWN': 'An unexpected error occurred.'
        };
        
        const friendlyMessage = errorMessages[code] || errorMessages['UNKNOWN'];
        const errorDetail = details instanceof Error ? details.message : (details || '');
        
        // Log per debug
        console.error(`[Multiplayer] CONNECTION ERROR\n  Code: ${code}\n  Message: ${friendlyMessage}\n  Detail: ${errorDetail}\n  URL: ${this.serverUrl}`);
        
        // Crea banner errore
        const existingBanner = document.getElementById('mp-error-banner');
        if (existingBanner) existingBanner.remove();
        
        const banner = document.createElement('div');
        banner.id = 'mp-error-banner';
        banner.innerHTML = `
            <div class="mp-error-header">
                <span class="mp-error-icon">⚠️</span>
                <span class="mp-error-title">Multiplayer Error</span>
                <button class="mp-error-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
            <div class="mp-error-body">
                <div class="mp-error-message">${friendlyMessage}</div>
                <div class="mp-error-details">
                    <strong>Code:</strong> ${code}<br>
                    <strong>Server URL:</strong> ${this.serverUrl}<br>
                    ${errorDetail ? `<strong>Detail:</strong> ${errorDetail}<br>` : ''}
                    <strong>Timestamp:</strong> ${new Date().toLocaleTimeString()}
                </div>
            </div>
        `;
        banner.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #8B0000 0%, #B22222 100%);
            color: white;
            padding: 0;
            border-radius: 12px;
            z-index: 3000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            min-width: 320px;
            max-width: 90vw;
            font-family: sans-serif;
            animation: slideDown 0.3s ease-out;
        `;
        
        // Aggiungi stili per il banner
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            .mp-error-header {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                background: rgba(0,0,0,0.2);
                border-radius: 12px 12px 0 0;
            }
            .mp-error-icon { font-size: 20px; margin-right: 8px; }
            .mp-error-title { font-weight: bold; flex: 1; }
            .mp-error-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            .mp-error-close:hover { opacity: 1; }
            .mp-error-body { padding: 16px; }
            .mp-error-message {
                font-size: 16px;
                margin-bottom: 12px;
                font-weight: 500;
            }
            .mp-error-details {
                font-size: 12px;
                opacity: 0.85;
                background: rgba(0,0,0,0.2);
                padding: 10px;
                border-radius: 6px;
                font-family: monospace;
                line-height: 1.6;
            }
        `;
        banner.appendChild(style);
        
        document.body.appendChild(banner);
        
        // Rimuovi dopo 10 secondi
        setTimeout(() => {
            if (banner.parentElement) {
                banner.style.animation = 'slideDown 0.3s ease-out reverse';
                setTimeout(() => banner.remove(), 300);
            }
        }, 10000);
    }
    
    /**
     * Handle opponent disconnect
     */
    handleOpponentDisconnect() {
        console.log('[Multiplayer] Avversario disconnesso');
        this.showConnectionError('OPPONENT_DISCONNECTED', 'Opponent has left the game');
        setTimeout(() => {
            this.disconnect();
            this.cleanup();
            this.app.backToMenu();
        }, 3000);
    }
    
    /**
     * Handle our disconnect
     */
    handleDisconnect() {
        console.log('[Multiplayer] handleDisconnect chiamato, currentMode:', this.app.currentMode);
        
        if (this.app.currentMode === 'online') {
            console.error('[Multiplayer] Disconnessione durante partita online');
            this.showConnectionError('CONNECTION_CLOSED', 'Server connection was interrupted');
            setTimeout(() => {
                this.cleanup();
                this.app.backToMenu();
            }, 3000);
        } else {
            // Disconnessione quando non siamo in gioco, pulisci lo stato
            this.cleanup();
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
