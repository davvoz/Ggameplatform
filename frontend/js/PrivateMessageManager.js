/**
 * PrivateMessageManager
 *
 * Manages private messaging UI: connection list, pending requests,
 * and 1-on-1 chat conversations.
 *
 * Single Responsibility: Handles the "Messages" tab within Community.
 * Open/Closed: Extends community without modifying CommunityManager internals.
 */

import AuthManager from './auth.js';
import { config } from './config.js';
import { getPMWS, setPMWS } from './state.js';
import ConfirmModal from './ConfirmModal.js';

// =============================================================================
// PrivateMessageAPI — WebSocket + REST transport layer
// =============================================================================

class PrivateMessageAPI {
    /**
     * @param {Object} options
     * @param {string} options.userId
     * @param {Function} options.onMessage
     * @param {Function} options.onConnectionRequest
     * @param {Function} options.onError
     */
    constructor(options = {}) {
        this.userId = options.userId || null;
        this.onMessage = options.onMessage || (() => {});
        this.onMessageEdited = options.onMessageEdited || (() => {});
        this.onConnectionRequest = options.onConnectionRequest || (() => {});
        this.onUnreadSummary = options.onUnreadSummary || (() => {});
        this.onError = options.onError || (() => {});

        this.ws = null;
        this.isConnected = false;
        this.pingInterval = null;
    }

    /** @returns {string} REST API base */
    get apiBase() {
        return config.getApiEndpoint('/api/private-messages');
    }

    // ─── WebSocket ───

    async connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = globalThis.ENV?.API_URL
            ? new URL(globalThis.ENV.API_URL).host
            : globalThis.location.host;
        const url = `${protocol}//${host}/ws/private-messages`;

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.isConnected = true;
                this.ws.send(JSON.stringify({ type: 'join', user_id: this.userId }));
                this._startPing();
                resolve();
            };

            this.ws.onmessage = (event) => this._handleMessage(event);
            this.ws.onclose = () => this._handleClose();
            this.ws.onerror = (err) => {
                this.onError(err);
                reject(err instanceof Error ? err : new Error('PM WebSocket error'));
            };
        });
    }

    disconnect() {
        this._stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    sendMessage(receiverId, text) {
        this._send({
            type: 'private_message',
            receiver_id: receiverId,
            text: text.trim(),
        });
    }

    markRead(senderId) {
        this._send({ type: 'mark_read', sender_id: senderId });
    }

    sendEditMessage(messageId, newText) {
        this._send({
            type: 'edit_message',
            message_id: messageId,
            text: newText.trim(),
        });
    }

    // ─── REST ───

    /** GET that returns `fallback` on failure. */
    async _fetchJson(url, fallback) {
        const res = await fetch(url);
        if (!res.ok) return fallback;
        return res.json();
    }

    /** POST / DELETE that throws on failure. */
    async _mutateJson(url, method, errorLabel) {
        const res = await fetch(url, { method });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.detail || errorLabel);
        }
        return res.json();
    }

    async fetchConnections() {
        return this._fetchJson(`${this.apiBase}/connections?user_id=${encodeURIComponent(this.userId)}`, []);
    }

    async fetchPendingRequests() {
        return this._fetchJson(`${this.apiBase}/connections/pending?user_id=${encodeURIComponent(this.userId)}`, []);
    }

    async fetchConversation(peerId) {
        return this._fetchJson(
            `${this.apiBase}/conversation?user_id=${encodeURIComponent(this.userId)}&peer_id=${encodeURIComponent(peerId)}`, []
        );
    }

    async fetchConnectionStatus(otherId) {
        return this._fetchJson(
            `${this.apiBase}/connections/status?user_id=${encodeURIComponent(this.userId)}&other_id=${encodeURIComponent(otherId)}`,
            { status: 'none' }
        );
    }

    async requestConnection(receiverId) {
        return this._mutateJson(
            `${this.apiBase}/connections/request?requester_id=${encodeURIComponent(this.userId)}&receiver_id=${encodeURIComponent(receiverId)}`,
            'POST', 'Request failed'
        );
    }

    async acceptConnection(connectionId) {
        return this._mutateJson(
            `${this.apiBase}/connections/${connectionId}/accept?user_id=${encodeURIComponent(this.userId)}`,
            'POST', 'Accept failed'
        );
    }

    async rejectConnection(connectionId) {
        return this._mutateJson(
            `${this.apiBase}/connections/${connectionId}/reject?user_id=${encodeURIComponent(this.userId)}`,
            'POST', 'Reject failed'
        );
    }

    async disconnectConnection(connectionId) {
        return this._mutateJson(
            `${this.apiBase}/connections/${connectionId}?user_id=${encodeURIComponent(this.userId)}`,
            'DELETE', 'Disconnect failed'
        );
    }

    async fetchUnreadCount() {
        return this._fetchJson(
            `${this.apiBase}/unread-count?user_id=${encodeURIComponent(this.userId)}`,
            { unread: 0 }
        );
    }

    // ─── Private helpers ───

    _send(data) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    _handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'private_message':
                    this.onMessage(data.message);
                    break;
                case 'message_edited':
                    this.onMessageEdited(data);
                    break;
                case 'connection_request':
                    this.onConnectionRequest(data.connection);
                    break;
                case 'unread_summary':
                    this.onUnreadSummary(data);
                    break;
                case 'error':
                    this.onError(data.error);
                    break;
                case 'pong':
                    break;
                default:
                    break;
            }
        } catch {
            // Malformed message — ignore
        }
    }

    _handleClose() {
        this.isConnected = false;
        this._stopPing();
    }

    _startPing() {
        this._stopPing();
        this.pingInterval = setInterval(() => {
            if (this.isConnected) {
                this._send({ type: 'ping' });
            }
        }, 30000);
    }

    _stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
}


// =============================================================================
// PrivateMessageManager — UI Controller
// =============================================================================

class PrivateMessageManager {
    /**
     * @param {HTMLElement} container - The messages section DOM element
     */
    constructor(container) {
        this.container = container;
        this.api = null;
        this.connections = [];
        this.pendingRequests = [];
        this.unreadCounts = {}; // peer_id -> count
        this.activePeerId = null;
        this.activePeerUsername = null;
        this.messages = [];
        this.isInitialized = false;
    }

    // ─── Public API ───

    async init() {
        if (this.isInitialized) {
            return;
        }
        this.isInitialized = true;

        const user = AuthManager.getUser();
        if (!user || user.is_anonymous) {
            this._renderLoginRequired();
            return;
        }

        // Reuse the global PM WebSocket if available; otherwise create one
        const globalWS = getPMWS();
        if (globalWS) {
            this.api = globalWS;
            this._ownsWS = false;
        } else {
            this.api = new PrivateMessageAPI({ userId: user.user_id });
            setPMWS(this.api);
            this._ownsWS = true;
        }

        // Take over callbacks
        this.api.onMessage = (msg) => this._handleIncomingMessage(msg);
        this.api.onMessageEdited = (data) => this._handleMessageEdited(data);
        this.api.onConnectionRequest = (conn) => this._handleConnectionRequest(conn);
        this.api.onUnreadSummary = () => {}; // already loaded via REST
        this.api.onError = () => {};

        this._renderLoading();

        // Connect if not already connected
        if (!this.api.isConnected) {
            try {
                await this.api.connect();
            } catch {
                // WS failed; REST still works
            }
        }

        await this._loadData();
        this._renderMain();
    }

    destroy() {
        if (this.api) {
            if (this._ownsWS) {
                // We created this WS — disconnect and clear global
                this.api.disconnect();
                if (getPMWS() === this.api) {
                    setPMWS(null);
                }
                // Reboot global PM WS so nav badges keep working
                import('./nav.js').then(nav => nav.bootPMWS());
            } else {
                // Hand callbacks back to lightweight nav handlers
                import('./nav.js').then(nav => nav.installNavPMHandlers());
            }
            this.api = null;
        }
        this.isInitialized = false;
    }

    // ─── Data Loading ───

    async _loadData() {
        const [connections, pending] = await Promise.all([
            this.api.fetchConnections(),
            this.api.fetchPendingRequests(),
        ]);
        this.connections = connections;
        this.pendingRequests = pending;

        // Build unread counts from enriched connections response
        this.unreadCounts = {};
        for (const conn of this.connections) {
            if (conn.unread_count > 0) {
                this.unreadCounts[conn.peer_id] = conn.unread_count;
            }
        }
    }

    // ─── Rendering: Main View ───

    _renderLoginRequired() {
        this.container.replaceChildren(
            this._buildEmptyState('🔒', 'Log in to use private messages.')
        );
    }

    _renderLoading() {
        this.container.replaceChildren(
            this._buildEmptyState('⏳', 'Loading messages...')
        );
    }

    _renderMain() {
        const pmContainer = document.createElement('div');
        pmContainer.className = 'pm-container';

        const pendingEl = this._buildPendingSection();
        if (pendingEl) {
            pmContainer.appendChild(pendingEl);
        }

        const connectionsList = document.createElement('div');
        connectionsList.className = 'pm-connections-list';
        connectionsList.id = 'pmConnectionsList';

        const connTitle = document.createElement('h3');
        connTitle.className = 'pm-section-title';
        connTitle.textContent = '💬 Conversations';
        connectionsList.appendChild(connTitle);

        this._buildConnectionElements(connectionsList);

        pmContainer.appendChild(connectionsList);

        const chatArea = document.createElement('div');
        chatArea.className = 'pm-chat-area';
        chatArea.id = 'pmChatArea';
        chatArea.style.display = 'none';
        pmContainer.appendChild(chatArea);

        this.container.replaceChildren(pmContainer);

        this._bindMainEvents();
    }

    _buildPendingSection() {
        if (this.pendingRequests.length === 0) {
            return null;
        }

        const section = document.createElement('div');
        section.className = 'pm-pending-section';
        section.id = 'pmPendingSection';

        const title = document.createElement('h3');
        title.className = 'pm-section-title';
        title.textContent = '📨 Connection Requests';
        section.appendChild(title);

        this.pendingRequests.forEach(req => {
            const item = document.createElement('div');
            item.className = 'pm-pending-item';
            item.dataset.connectionId = req.id;

            const info = document.createElement('div');
            info.className = 'pm-pending-info';

            info.appendChild(this._buildSteemAvatar(req.requester_username, {
                className: 'pm-pending-avatar',
                profileId: req.requester_id,
            }));

            const name = document.createElement('span');
            name.className = 'pm-pending-name';
            name.textContent = req.requester_username || '';
            info.appendChild(name);

            const label = document.createElement('span');
            label.className = 'pm-pending-label';
            label.textContent = 'wants to connect';
            info.appendChild(label);

            item.appendChild(info);

            const actions = document.createElement('div');
            actions.className = 'pm-pending-actions';

            const acceptBtn = document.createElement('button');
            acceptBtn.className = 'pm-btn pm-btn--accept';
            acceptBtn.dataset.action = 'accept';
            acceptBtn.dataset.id = req.id;
            acceptBtn.textContent = 'Accept';
            actions.appendChild(acceptBtn);

            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'pm-btn pm-btn--reject';
            rejectBtn.dataset.action = 'reject';
            rejectBtn.dataset.id = req.id;
            rejectBtn.textContent = 'Decline';
            actions.appendChild(rejectBtn);

            item.appendChild(actions);
            section.appendChild(item);
        });

        return section;
    }

    _buildConnectionElements(container) {
        if (this.connections.length === 0) {
            container.appendChild(
                this._buildEmptyState('👥', "No connections yet. Visit a user's profile to send a connection request.")
            );
            return;
        }

        this.connections.forEach(conn => {
            const unread = this.unreadCounts[conn.peer_id] || 0;

            const item = document.createElement('div');
            item.className = 'pm-connection-item';
            item.dataset.peerId = conn.peer_id;
            item.dataset.peerUsername = conn.peer_username || '';
            item.dataset.connectionId = conn.id;

            item.appendChild(this._buildSteemAvatar(conn.peer_username, {
                className: 'pm-connection-avatar',
                profileId: conn.peer_id,
            }));

            const name = document.createElement('span');
            name.className = 'pm-connection-name';
            name.textContent = conn.peer_username || '';
            item.appendChild(name);

            if (unread > 0) {
                const badge = document.createElement('span');
                badge.className = 'pm-unread-badge';
                badge.textContent = unread > 9 ? '9+' : String(unread);
                item.appendChild(badge);
            }

            const arrow = document.createElement('span');
            arrow.className = 'pm-connection-arrow';
            arrow.textContent = '›';
            item.appendChild(arrow);

            container.appendChild(item);
        });
    }

    _bindMainEvents() {
        // Pending request buttons
        const pendingSection = this.container.querySelector('#pmPendingSection');
        pendingSection?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) {
                return;
            }
            const action = btn.dataset.action;
            const connectionId = Number.parseInt(btn.dataset.id, 10);
            if (action === 'accept') {
                this._acceptRequest(connectionId);
            } else if (action === 'reject') {
                this._rejectRequest(connectionId);
            }
        });

        // Connection items → open chat
        const list = this.container.querySelector('#pmConnectionsList');
        list?.addEventListener('click', (e) => {
            const item = e.target.closest('.pm-connection-item');
            if (!item) {
                return;
            }
            const peerId = item.dataset.peerId;
            const peerUsername = item.dataset.peerUsername;
            const connectionId = Number.parseInt(item.dataset.connectionId, 10);
            this._openChat(peerId, peerUsername, connectionId);
        });
    }

    // ─── Pending Request Actions ───

    async _acceptRequest(connectionId) {
        try {
            await this.api.acceptConnection(connectionId);
            await this._loadData();
            this._renderMain();
            this._fireNotificationEvent('read');
        } catch {
            // Silently handle
        }
    }

    async _rejectRequest(connectionId) {
        try {
            await this.api.rejectConnection(connectionId);
            this.pendingRequests = this.pendingRequests.filter(r => r.id !== connectionId);
            this._renderMain();
            this._fireNotificationEvent('read');
        } catch {
            // Silently handle
        }
    }

    // ─── Disconnect ───

    async _confirmDisconnect() {
        if (!this.activeConnectionId) return;

        const peerName = this.activePeerUsername || 'this user';
        const confirmed = await ConfirmModal.show({
            title: 'Remove Connection',
            message: `Remove connection with ${peerName}? This will delete the conversation.`,
            confirmText: 'Remove',
            cancelText: 'Cancel',
            variant: 'danger',
        });
        if (!confirmed) {
            return;
        }
        this._disconnectUser(this.activeConnectionId);
    }

    async _disconnectUser(connectionId) {
        try {
            await this.api.disconnectConnection(connectionId);
            this.connections = this.connections.filter(c => c.id !== connectionId);
            delete this.unreadCounts[this.activePeerId];
            this._closeChat();
            this._renderMain();
        } catch {
            // Silently handle
        }
    }

    // ─── Chat View ───

    async _openChat(peerId, peerUsername, connectionId) {
        this.activePeerId = peerId;
        this.activePeerUsername = peerUsername;
        this.activeConnectionId = connectionId || null;

        // Clear unread count for this peer
        delete this.unreadCounts[peerId];
        this._updateConnectionBadge(peerId);
        this._fireNotificationEvent('read', peerId);

        const listEl = this.container.querySelector('#pmConnectionsList');
        const pendingEl = this.container.querySelector('#pmPendingSection');
        const chatArea = this.container.querySelector('#pmChatArea');

        if (listEl) {
            listEl.style.display = 'none';
        }
        if (pendingEl) {
            pendingEl.style.display = 'none';
        }
        if (chatArea) {
            chatArea.style.display = 'flex';
        }

        this._renderChatLoading(chatArea, peerUsername, peerId);

        try {
            this.messages = await this.api.fetchConversation(peerId);
            this.api.markRead(peerId);
        } catch {
            this.messages = [];
        }

        this._renderChat(chatArea, peerUsername, peerId);
    }

    _renderChatLoading(chatArea, peerUsername, peerId) {
        const header = this._buildChatHeader(peerUsername, peerId);

        const messagesArea = document.createElement('div');
        messagesArea.className = 'pm-chat-messages';
        messagesArea.appendChild(this._buildEmptyState('⏳', 'Loading...'));

        chatArea.replaceChildren(header, messagesArea);
    }

    _renderChat(chatArea, peerUsername, peerId) {
        const user = AuthManager.getUser();
        const userId = user?.user_id;

        const header = this._buildChatHeader(peerUsername, peerId);

        const messagesArea = document.createElement('div');
        messagesArea.className = 'pm-chat-messages';
        messagesArea.id = 'pmChatMessages';

        if (this.messages.length === 0) {
            messagesArea.appendChild(this._buildEmptyState('💬', 'No messages yet. Say hello!'));
        } else {
            this.messages.forEach(m => {
                messagesArea.appendChild(this._buildMessageElement(m, userId));
            });
        }

        const inputArea = document.createElement('div');
        inputArea.className = 'pm-chat-input-area';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'pm-chat-input';
        input.id = 'pmChatInput';
        input.placeholder = 'Message...';
        input.maxLength = 500;
        input.autocomplete = 'off';
        inputArea.appendChild(input);

        const sendBtn = document.createElement('button');
        sendBtn.className = 'pm-send-btn';
        sendBtn.id = 'pmSendBtn';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '20');
        svg.setAttribute('height', '20');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'currentColor');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z');
        svg.appendChild(path);
        sendBtn.appendChild(svg);
        inputArea.appendChild(sendBtn);

        chatArea.replaceChildren(header, messagesArea, inputArea);

        this._bindChatEvents(chatArea);
        this._scrollChatToBottom();
    }

    _buildMessageElement(message, currentUserId) {
        const isOwn = message.sender_id === currentUserId;
        const time = this._formatTime(message.timestamp);

        const msgDiv = document.createElement('div');
        msgDiv.className = `pm-message${isOwn ? ' pm-message--own' : ''}`;
        msgDiv.dataset.msgId = message.message_id;

        const bubble = document.createElement('div');
        bubble.className = 'pm-message-bubble';

        const textDiv = document.createElement('div');
        textDiv.className = 'pm-message-text';
        textDiv.textContent = message.text;
        bubble.appendChild(textDiv);

        const footer = document.createElement('div');
        footer.className = 'pm-message-footer';

        if (message.is_edited) {
            const editedLabel = document.createElement('span');
            editedLabel.className = 'pm-message-edited-label';
            editedLabel.textContent = 'edited';
            footer.appendChild(editedLabel);
        }

        const timeSpan = document.createElement('span');
        timeSpan.className = 'pm-message-time';
        timeSpan.textContent = time;
        footer.appendChild(timeSpan);

        if (isOwn) {
            const editBtn = document.createElement('button');
            editBtn.className = 'pm-message-edit-btn';
            editBtn.title = 'Edit';
            editBtn.textContent = '✏️';
            footer.appendChild(editBtn);
        }

        bubble.appendChild(footer);
        msgDiv.appendChild(bubble);
        return msgDiv;
    }

    _bindChatEvents(chatArea) {
        const backBtn = chatArea.querySelector('#pmBackBtn');
        backBtn?.addEventListener('click', () => this._closeChat());

        const disconnectBtn = chatArea.querySelector('#pmDisconnectBtn');
        disconnectBtn?.addEventListener('click', () => this._confirmDisconnect());

        const input = chatArea.querySelector('#pmChatInput');
        const sendBtn = chatArea.querySelector('#pmSendBtn');

        sendBtn?.addEventListener('click', () => this._sendCurrentMessage(input));

        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._sendCurrentMessage(input);
            }
        });

        // Edit button delegation
        const messagesEl = chatArea.querySelector('#pmChatMessages');
        messagesEl?.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.pm-message-edit-btn');
            if (!editBtn) return;
            const msgEl = editBtn.closest('.pm-message');
            if (!msgEl) return;
            const messageId = msgEl.dataset.msgId;
            const textEl = msgEl.querySelector('.pm-message-text');
            const currentText = textEl?.textContent || '';
            this._startEditMessage(msgEl, messageId, currentText);
        });

        input?.focus();
    }

    _sendCurrentMessage(inputEl) {
        if (!inputEl || !this.activePeerId) {
            return;
        }
        const text = inputEl.value.trim();
        if (!text) {
            return;
        }
        inputEl.value = '';
        this.api.sendMessage(this.activePeerId, text);
    }

    _closeChat() {
        this.activePeerId = null;
        this.activePeerUsername = null;
        this.activeConnectionId = null;
        this.messages = [];

        const listEl = this.container.querySelector('#pmConnectionsList');
        const pendingEl = this.container.querySelector('#pmPendingSection');
        const chatArea = this.container.querySelector('#pmChatArea');

        if (chatArea) {
            chatArea.style.display = 'none';
            chatArea.replaceChildren();
        }
        if (listEl) {
            listEl.style.display = '';
        }
        if (pendingEl) {
            pendingEl.style.display = '';
        }
    }

    _scrollChatToBottom() {
        const messagesEl = this.container.querySelector('#pmChatMessages');
        if (messagesEl) {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    }

    // ─── Real-time Handlers ───

    _handleMessageEdited(data) {
        const { message_id, text, is_edited, edited_at } = data;

        // Update in-memory
        const msg = this.messages.find(m => m.message_id === message_id);
        if (msg) {
            msg.text = text;
            msg.is_edited = is_edited;
            msg.edited_at = edited_at;
        }

        // If we are currently editing this message, tear down edit UI first
        if (this._editingMessageId === message_id) {
            this._finishEditUI(text);
        }

        // Update DOM
        const msgEl = this.container.querySelector(`.pm-message[data-msg-id="${CSS.escape(message_id)}"]`);
        if (!msgEl) return;

        const textEl = msgEl.querySelector('.pm-message-text');
        if (textEl) {
            textEl.textContent = text;
        }

        // Show "edited" label if not already present
        if (is_edited) {
            const footer = msgEl.querySelector('.pm-message-footer');
            if (footer && !footer.querySelector('.pm-message-edited-label')) {
                const label = document.createElement('span');
                label.className = 'pm-message-edited-label';
                label.textContent = 'edited';
                footer.prepend(label);
            }
        }
    }

    _handleIncomingMessage(message) {
        // If chat is open with this user, append
        const isActiveConversation =
            this.activePeerId &&
            (message.sender_id === this.activePeerId || message.receiver_id === this.activePeerId);

        if (isActiveConversation) {
            this.messages.push(message);
            const messagesEl = this.container.querySelector('#pmChatMessages');
            if (messagesEl) {
                const user = AuthManager.getUser();
                const msgEl = this._buildMessageElement(message, user?.user_id);
                messagesEl.appendChild(msgEl);
                this._scrollChatToBottom();
            }
            // Mark as read since we're viewing
            if (message.sender_id === this.activePeerId) {
                this.api.markRead(this.activePeerId);
            }
        } else {
            // Not viewing this conversation — increment unread badge
            const user = AuthManager.getUser();
            const peerId = message.sender_id === user?.user_id
                ? message.receiver_id
                : message.sender_id;

            // Only count unread for messages we received (not our own echoes)
            if (message.sender_id !== user?.user_id) {
                this.unreadCounts[peerId] = (this.unreadCounts[peerId] || 0) + 1;
                this._updateConnectionBadge(peerId);
                this._fireNotificationEvent('message', peerId);
            }
        }
    }

    _handleConnectionRequest(connection) {
        this.pendingRequests.push(connection);
        this._fireNotificationEvent('connection_request');
        // Only re-render if we're on the main view (no active chat)
        if (!this.activePeerId) {
            this._renderMain();
        }
    }

    // ─── Message Editing ───

    _startEditMessage(messageEl, messageId, currentText) {
        if (this._editingMessageId) {
            this._cancelEdit();
        }

        this._editingMessageId = messageId;
        this._editingOriginalText = currentText;
        this._editingElement = messageEl;

        const bubble = messageEl.querySelector('.pm-message-bubble');
        const textEl = bubble?.querySelector('.pm-message-text');
        if (!textEl || !bubble) return;

        // Replace text div with a textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'pm-message-edit-input';
        textarea.value = currentText;
        textarea.rows = Math.min(5, Math.max(1, Math.ceil(currentText.length / 40)));
        textEl.replaceWith(textarea);
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        // Hide edit button, show save/cancel
        const editBtn = bubble.querySelector('.pm-message-edit-btn');
        if (editBtn) editBtn.style.display = 'none';

        const footer = bubble.querySelector('.pm-message-footer');
        if (footer) {
            const actions = document.createElement('div');
            actions.className = 'pm-message-edit-actions';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'pm-message-edit-save';
            saveBtn.textContent = 'Save';
            saveBtn.addEventListener('click', () => {
                this._submitEditMessage(messageId, textarea.value);
            });
            actions.appendChild(saveBtn);

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'pm-message-edit-cancel';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => {
                this._cancelEdit();
            });
            actions.appendChild(cancelBtn);

            footer.prepend(actions);
        }

        bubble.classList.add('pm-message-bubble--editing');

        // Keyboard: Enter to save, Escape to cancel
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this._cancelEdit();
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._submitEditMessage(messageId, textarea.value);
            }
        });
    }

    _submitEditMessage(messageId, newText) {
        const trimmed = newText.trim();
        if (!trimmed) return;
        if (trimmed.length > 500) return;
        if (trimmed === this._editingOriginalText) {
            this._cancelEdit();
            return;
        }
        this.api.sendEditMessage(messageId, trimmed);
        // UI update deferred to _handleMessageEdited broadcast
    }

    _cancelEdit() {
        if (!this._editingElement) return;
        this._finishEditUI(this._editingOriginalText);
    }

    _finishEditUI(text) {
        const el = this._editingElement;
        if (!el) return;

        const bubble = el.querySelector('.pm-message-bubble');
        if (bubble) {
            bubble.classList.remove('pm-message-bubble--editing');

            // Replace textarea with text div
            const textarea = bubble.querySelector('.pm-message-edit-input');
            if (textarea) {
                const textDiv = document.createElement('div');
                textDiv.className = 'pm-message-text';
                textDiv.textContent = text;
                textarea.replaceWith(textDiv);
            }

            // Remove save/cancel actions
            const actions = bubble.querySelector('.pm-message-edit-actions');
            actions?.remove();

            // Restore edit button
            const editBtn = bubble.querySelector('.pm-message-edit-btn');
            if (editBtn) editBtn.style.display = '';
        }

        this._editingMessageId = null;
        this._editingOriginalText = null;
        this._editingElement = null;
    }

    // ─── Badge Helpers ───

    /**
     * Update the unread badge on a specific connection item in the DOM.
     * @param {string} peerId
     * @private
     */
    _updateConnectionBadge(peerId) {
        const item = this.container.querySelector(`.pm-connection-item[data-peer-id="${peerId}"]`);
        if (!item) return;

        let badge = item.querySelector('.pm-unread-badge');
        const count = this.unreadCounts[peerId] || 0;

        if (count <= 0) {
            badge?.remove();
            return;
        }

        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'pm-unread-badge';
            const arrow = item.querySelector('.pm-connection-arrow');
            arrow.before(badge);
        }
        badge.textContent = count > 9 ? '9+' : count;
    }

    /**
     * Fire a custom event so CommunityManager can show tab / nav badges.
     * @param {string} reason - 'message' | 'connection_request'
     * @param {string} [peerId]
     * @private
     */
    _fireNotificationEvent(reason, peerId) {
        globalThis.dispatchEvent(new CustomEvent('pm:notification', {
            detail: { reason, peerId, total: this.getTotalUnreadCount() },
        }));
    }

    /**
     * Return total number of unread messages + pending requests.
     * Used externally by CommunityManager / nav.
     * @returns {number}
     */
    getTotalUnreadCount() {
        const msgCount = Object.values(this.unreadCounts).reduce((s, n) => s + n, 0);
        return msgCount + this.pendingRequests.length;
    }

    // ─── Utilities ───

    /**
     * Build a Steem avatar <img> element.
     * @param {string} username
     * @param {Object} [opts]
     * @param {string} opts.className      - CSS class(es)
     * @param {string} [opts.profileId]    - If set, avatar is clickable and navigates to user profile
     * @returns {HTMLImageElement}
     */
    _buildSteemAvatar(username, { className = '', profileId = null } = {}) {
        const avatar = document.createElement('img');
        avatar.className = className;
        avatar.src = `https://steemitimages.com/u/${encodeURIComponent(username || 'anonymous')}/avatar/small`;
        avatar.alt = username || '';
        avatar.addEventListener('error', () => { avatar.style.display = 'none'; });
        if (profileId) {
            avatar.classList.add('pm-clickable-avatar');
            avatar.title = `View profile of ${username || ''}`;
            avatar.addEventListener('click', (e) => {
                e.stopPropagation();
                globalThis.location.hash = `#/user/${encodeURIComponent(profileId)}`;
            });
        }
        return avatar;
    }

    _buildEmptyState(icon, text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'pm-empty-state';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'pm-empty-icon';
        iconSpan.textContent = icon;
        wrapper.appendChild(iconSpan);

        const p = document.createElement('p');
        p.textContent = text;
        wrapper.appendChild(p);

        return wrapper;
    }

    _buildChatHeader(peerUsername, peerId) {
        const header = document.createElement('div');
        header.className = 'pm-chat-header';

        const backBtn = document.createElement('button');
        backBtn.className = 'pm-back-btn';
        backBtn.id = 'pmBackBtn';
        backBtn.textContent = '←';
        header.appendChild(backBtn);

        const profileLink = document.createElement('a');
        profileLink.className = 'pm-chat-header-profile';
        profileLink.href = `#/user/${encodeURIComponent(peerId || peerUsername || '')}`;
        profileLink.title = `View profile of ${peerUsername || ''}`;

        profileLink.appendChild(this._buildSteemAvatar(peerUsername, {
            className: 'pm-chat-header-avatar',
        }));

        const name = document.createElement('span');
        name.className = 'pm-chat-header-name';
        name.textContent = peerUsername || '';
        profileLink.appendChild(name);

        header.appendChild(profileLink);

        const disconnectBtn = document.createElement('button');
        disconnectBtn.className = 'pm-disconnect-btn';
        disconnectBtn.id = 'pmDisconnectBtn';
        disconnectBtn.title = 'Remove connection';
        disconnectBtn.textContent = '\u2715';
        header.appendChild(disconnectBtn);

        return header;
    }

    _formatTime(timestamp) {
        if (!timestamp) {
            return '';
        }
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        if (isToday) {
            return timeStr;
        }
        return `${date.getDate()}/${date.getMonth() + 1} ${timeStr}`;
    }
}

export default PrivateMessageManager;
export { PrivateMessageAPI };
