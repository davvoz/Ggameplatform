/**
 * CommunityAPI
 * WebSocket service for real-time community chat
 * Single Responsibility: Handles WebSocket connection, message transport, uploads and GIPHY
 */

class CommunityAPI {
    /**
     * @param {Object} options Configuration options
     * @param {string} options.userId - Current user ID
     * @param {string} options.username - Current username
     * @param {Function} options.onMessage - Callback for new messages
     * @param {Function} options.onConnect - Callback when connected
     * @param {Function} options.onDisconnect - Callback when disconnected
     * @param {Function} options.onError - Callback for errors
     * @param {Function} options.onUserJoin - Callback when user joins
     * @param {Function} options.onUserLeave - Callback when user leaves
     * @param {Function} options.onHistoryLoad - Callback when message history is loaded
     */
    constructor(options = {}) {
        this.userId = options.userId || null;
        this.username = options.username || 'Anonymous';
        this.onMessage = options.onMessage || (() => {});
        this.onConnect = options.onConnect || (() => {});
        this.onDisconnect = options.onDisconnect || (() => {});
        this.onError = options.onError || (() => {});
        this.onUserJoin = options.onUserJoin || (() => {});
        this.onUserLeave = options.onUserLeave || (() => {});
        this.onHistoryLoad = options.onHistoryLoad || (() => {});
        this.onStatsUpdate = options.onStatsUpdate || (() => {});

        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.pingInterval = null;
        this.messageQueue = [];
        
        // API base URL for REST endpoints
        this.apiBaseUrl = window.ENV?.API_URL || '';
        
        this._boundHandlers = {
            onOpen: this._handleOpen.bind(this),
            onMessage: this._handleMessage.bind(this),
            onClose: this._handleClose.bind(this),
            onError: this._handleError.bind(this)
        };
    }

    /**
     * Get WebSocket URL based on current environment
     * @private
     * @returns {string}
     */
    _getWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.ENV?.API_URL 
            ? new URL(window.ENV.API_URL).host 
            : window.location.host;
        return `${protocol}//${host}/ws/community`;
    }

    /**
     * Connect to WebSocket server
     * @returns {Promise<void>}
     */
    async connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[CommunityAPI] Already connected');
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                const url = this._getWebSocketUrl();
                console.log('[CommunityAPI] Connecting to:', url);
                
                this.ws = new WebSocket(url);
                
                this.ws.onopen = (event) => {
                    this._boundHandlers.onOpen(event);
                    resolve();
                };
                
                this.ws.onmessage = this._boundHandlers.onMessage;
                this.ws.onclose = this._boundHandlers.onClose;
                this.ws.onerror = (error) => {
                    this._boundHandlers.onError(error);
                    reject(error);
                };
            } catch (error) {
                console.error('[CommunityAPI] Connection error:', error);
                reject(error);
            }
        });
    }

    /**
     * Handle WebSocket open event
     * @private
     */
    _handleOpen() {
        console.log('[CommunityAPI] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send authentication/join message
        this._sendRaw({
            type: 'join',
            user_id: this.userId,
            username: this.username
        });
        
        // Start ping interval
        this._startPing();
        
        // Process queued messages
        this._processQueue();
        
        this.onConnect();
    }

    /**
     * Handle incoming WebSocket messages
     * @private
     * @param {MessageEvent} event
     */
    _handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'message':
                    this.onMessage(data.message);
                    break;
                    
                case 'history':
                    this.onHistoryLoad(data.messages || []);
                    break;
                    
                case 'user_join':
                    this.onUserJoin(data.user);
                    break;
                    
                case 'user_leave':
                    this.onUserLeave(data.user);
                    break;
                    
                case 'stats':
                    this.onStatsUpdate(data.stats);
                    break;
                    
                case 'error':
                    console.error('[CommunityAPI] Server error:', data.error);
                    this.onError(data.error);
                    break;
                    
                case 'pong':
                    // Keep-alive response
                    break;
                    
                default:
                    console.log('[CommunityAPI] Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('[CommunityAPI] Error parsing message:', error);
        }
    }

    /**
     * Handle WebSocket close event
     * @private
     * @param {CloseEvent} event
     */
    _handleClose(event) {
        console.log('[CommunityAPI] Disconnected:', event.code, event.reason);
        this.isConnected = false;
        this._stopPing();
        
        this.onDisconnect(event);
        
        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
            console.log(`[CommunityAPI] Reconnecting in ${delay}ms...`);
            
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect().catch(console.error);
            }, delay);
        }
    }

    /**
     * Handle WebSocket error
     * @private
     * @param {Event} error
     */
    _handleError(error) {
        console.error('[CommunityAPI] WebSocket error:', error);
        this.onError(error);
    }

    /**
     * Start ping interval for keep-alive
     * @private
     */
    _startPing() {
        this._stopPing();
        this.pingInterval = setInterval(() => {
            if (this.isConnected) {
                this._sendRaw({ type: 'ping' });
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Stop ping interval
     * @private
     */
    _stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Send raw data through WebSocket
     * @private
     * @param {Object} data
     */
    _sendRaw(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    /**
     * Process queued messages
     * @private
     */
    _processQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            this._sendRaw(message);
        }
    }

    /**
     * Send a chat message
     * @param {string} text - Message text
     * @param {Object} options - Additional options
     * @param {string} options.imageUrl - Optional image URL
     * @param {string} options.gifUrl - Optional GIF URL
     * @returns {boolean} Whether the message was sent/queued
     */
    sendMessage(text, options = {}) {
        const message = {
            type: 'message',
            user_id: this.userId,
            username: this.username,
            text: text.trim(),
            image_url: options.imageUrl || null,
            gif_url: options.gifUrl || null,
            timestamp: Date.now()
        };

        if (this.isConnected) {
            this._sendRaw(message);
            return true;
        } else {
            // Queue message for later
            this.messageQueue.push(message);
            console.log('[CommunityAPI] Message queued (not connected)');
            return false;
        }
    }

    /**
     * Request message history
     * @param {number} offset - Offset for pagination
     * @param {number} limit - Number of messages to fetch
     */
    requestHistory(offset = 0, limit = 20) {
        this._sendRaw({
            type: 'history',
            offset,
            limit
        });
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        this.maxReconnectAttempts = 0; // Prevent reconnection
        this._stopPing();
        
        if (this.ws) {
            this.ws.close(1000, 'User disconnected');
            this.ws = null;
        }
        
        this.isConnected = false;
    }

    /**
     * Get connection state
     * @returns {boolean}
     */
    getIsConnected() {
        return this.isConnected;
    }

    /**
     * Update user info
     * @param {string} userId
     * @param {string} username
     */
    setUser(userId, username) {
        this.userId = userId;
        this.username = username;
    }

    // =========================================================================
    // Media Upload
    // =========================================================================

    /**
     * Upload an image or GIF file
     * @param {File} file - File to upload
     * @returns {Promise<{success: boolean, url?: string, is_gif?: boolean, error?: string}>}
     */
    async uploadMedia(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/community/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                return { 
                    success: false, 
                    error: data.detail || 'Upload failed' 
                };
            }

            return {
                success: true,
                url: this.apiBaseUrl + data.url,
                filename: data.filename,
                is_gif: data.is_gif
            };
        } catch (error) {
            console.error('[CommunityAPI] Upload error:', error);
            return { 
                success: false, 
                error: 'Network error during upload' 
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommunityAPI;
}

// Global export for non-module scripts
if (typeof window !== 'undefined') {
    window.CommunityAPI = CommunityAPI;
}
