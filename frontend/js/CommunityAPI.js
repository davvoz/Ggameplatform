/**
 * CommunityAPI
 * WebSocket service for real-time community chat
 * Single Responsibility: Handles WebSocket connection, message transport, uploads and GIPHY
 */

const CONNECT_TIMEOUT_MS = 10000;

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
        this.onMessage = options.onMessage || (() => { });
        this.onConnect = options.onConnect || (() => { });
        this.onDisconnect = options.onDisconnect || (() => { });
        this.onError = options.onError || (() => { });
        this.onUserJoin = options.onUserJoin || (() => { });
        this.onUserLeave = options.onUserLeave || (() => { });
        this.onHistoryLoad = options.onHistoryLoad || (() => { });
        this.onStatsUpdate = options.onStatsUpdate || (() => { });
        this.onMessageEdited = options.onMessageEdited || (() => { });
        this.onMessageDeleted = options.onMessageDeleted || (() => { });

        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.reconnectTimer = null;
        this.pingInterval = null;
        this.messageQueue = [];
        // Set only by disconnect(); every other close is retried, forever.
        this.closedByUser = false;
        this._connectPromise = null;

        // Phones drop sockets when the screen locks or the app goes to the
        // background. Reconnect as soon as the page is visible or back online
        // instead of waiting out the backoff.
        this._onWake = () => {
            if (document.visibilityState === 'visible') this._reconnectNow();
        };

        // API base URL for REST endpoints
        this.apiBaseUrl = globalThis.ENV?.API_URL || '';

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
        const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = globalThis.ENV?.API_URL
            ? new URL(globalThis.ENV.API_URL).host
            : globalThis.location.host;
        return `${protocol}//${host}/ws/community`;
    }

    /**
     * Connect to WebSocket server
     * @returns {Promise<void>}
     */
    async connect() {
        this.closedByUser = false;
        // Re-arm after a disconnect(); adding the same listener twice is a no-op.
        document.addEventListener('visibilitychange', this._onWake);
        globalThis.addEventListener('online', this._onWake);
        globalThis.addEventListener('pageshow', this._onWake);

        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }
        // A socket is already on its way: share it instead of opening a
        // second one for the same user.
        if (this.ws?.readyState === WebSocket.CONNECTING && this._connectPromise) {
            return this._connectPromise;
        }

        this._clearReconnectTimer();

        this._connectPromise = new Promise((resolve, reject) => {
            let ws;
            try {
                ws = new WebSocket(this._getWebSocketUrl());
            } catch (error) {
                this._connectPromise = null;
                reject(error);
                return;
            }
            this.ws = ws;

            // Runs once per socket. Some clients fire `error` without a later
            // `close`, or hang in CONNECTING; both would stall reconnection.
            let closed = false;
            const handleDown = (event) => {
                if (closed) return;
                closed = true;
                clearTimeout(openTimeout);
                if (this.ws !== ws) return;
                this._connectPromise = null;
                this._boundHandlers.onClose(event);
                reject(new Error('WebSocket closed'));
            };
            const openTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.CONNECTING) return;
                handleDown({ code: 4008, reason: 'Connect timeout' });
                try { ws.close(); } catch { /* already closing */ }
            }, CONNECT_TIMEOUT_MS);

            // Events from a socket we already replaced are ignored, so a late
            // close cannot flip a live connection to "disconnected".
            ws.onopen = (event) => {
                clearTimeout(openTimeout);
                if (this.ws !== ws) return;
                this._connectPromise = null;
                this._boundHandlers.onOpen(event);
                resolve();
            };
            ws.onmessage = (event) => {
                if (this.ws === ws) this._boundHandlers.onMessage(event);
            };
            ws.onclose = handleDown;
            ws.onerror = (error) => {
                if (this.ws !== ws) return;
                this._boundHandlers.onError(error);
                if (ws.readyState !== WebSocket.OPEN) handleDown({ code: 1006, reason: 'Connection error' });
            };
        });
        return this._connectPromise;
    }

    /**
     * Reconnect right away if the socket is down (page became visible,
     * network came back).
     * @private
     */
    _reconnectNow() {
        if (this.closedByUser) return;
        if (this.isConnected) {
            this.requestStats(); // refresh who's online after the tab was hidden
            return;
        }
        // Use our own state, not readyState: a failed socket can linger in
        // CONNECTING after its error.
        if (this._connectPromise) return;
        this.reconnectAttempts = 0;
        this.connect().catch(() => { });
    }

    /** @private */
    _clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * Handle WebSocket open event
     * @private
     */
    _handleOpen() {
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
                if (data.stats) this.onStatsUpdate(data.stats);
                break;

            case 'user_leave':
                this.onUserLeave(data.user);
                if (data.stats) this.onStatsUpdate(data.stats);
                break;

            case 'stats':
                this.onStatsUpdate(data.stats);
                break;

            case 'message_edited':
                this.onMessageEdited({
                    message_id: data.message_id,
                    text: data.text,
                    is_edited: data.is_edited,
                    edited_at: data.edited_at
                });
                break;

            case 'message_deleted':
                this.onMessageDeleted({ message_id: data.message_id });
                break;

            case 'error':
                this.onError(data.error);
                break;

            case 'pong':
                // Keep-alive response
                break;

            default:
            // Unknown message type
        }
    }

    /**
     * Handle WebSocket close event
     * @private
     * @param {CloseEvent} event
     */
    _handleClose(event) {
        this.isConnected = false;
        this._stopPing();

        this.onDisconnect(event);

        if (this.closedByUser) return;

        // Keep retrying with capped backoff; the old cap of 5 attempts left
        // the chat dead until a manual refresh.
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );
        this._clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.reconnectAttempts++;
            this.connect().catch(() => { });
        }, delay);
    }

    /**
     * Handle WebSocket error
     * @private
     * @param {Event} error
     */
    _handleError(error) {
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
        if (this.ws?.readyState === WebSocket.OPEN) {
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
            reply_to_id: options.replyToId || null,
            timestamp: Date.now()
        };

        if (this.isConnected) {
            this._sendRaw(message);
            return true;
        } else {
            // Queue message for later
            this.messageQueue.push(message);
            return false;
        }
    }

    /**
     * Send an edit for an existing own message
     * @param {string} messageId - ID of the message to edit
     * @param {string} newText - New text content
     */
    sendEditMessage(messageId, newText) {
        this._sendRaw({
            type: 'edit_message',
            message_id: messageId,
            text: newText.trim()
        });
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
     * Request current stats (online users count, etc.)
     */
    requestStats() {
        this._sendRaw({ type: 'request_stats' });
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        this.closedByUser = true;
        this._clearReconnectTimer();
        this._stopPing();
        this._connectPromise = null;

        document.removeEventListener('visibilitychange', this._onWake);
        globalThis.removeEventListener('online', this._onWake);
        globalThis.removeEventListener('pageshow', this._onWake);

        if (this.ws) {
            const ws = this.ws;
            this.ws = null; // detach first so its close event is ignored
            ws.close(1000, 'User disconnected');
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
            console.error('Upload error:', error);
            // Network error during upload
            return {
                success: false,
                error: 'Network error during upload'
            };
        }
    }
}

export default CommunityAPI;