import CommunityAPI from './CommunityAPI.js';
import CommunityStatsRenderer from './CommunityStatsRenderer.js';
import { installNavCommunityHandlers, bootCommunityWS, removeCommunityBadge, markCommunityAsSeen } from './nav.js';
import AuthManager from './auth.js';
import { getCommunityWS, setCommunityWS, getCurrentCommunityManager } from './state.js';
import PrivateMessageManager from './PrivateMessageManager.js';
import { config } from './config.js';

/**
 * CommunityManager
 * Main controller for the Community page
 * Follows SOLID principles - Orchestrates chat, users, and UI interactions
 */

class CommunityManager {
    /**
     * @param {Object} options Configuration options
     * @param {HTMLElement} options.container - Main container element
     * @param {Object} options.authManager - Authentication manager instance
     */
    constructor(options = {}) {
        this.container = options.container;
        this.authManager = options.authManager || AuthManager;

        // Services
        this.communityAPI = null;
        this.scrollManager = null;
        this.statsRenderer = null;
        this.privateMessageManager = null;

        // State
        this.messages = [];
        this.currentSection = 'chat';
        this.isInitialized = false;
        this.statsLoaded = false;
        this.messagesLoaded = false;
        this.stats = {
            onlineUsers: 0,
            totalMessages: 0,
            totalMembers: 0
        };

        // DOM Elements
        this.elements = {};

        // Emoji data
        this.commonEmojis = [
            '😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤔',
            '😭', '😱', '🔥', '❤️', '💯', '👍', '👎', '👏',
            '🎮', '🎯', '🏆', '⭐', '💎', '🚀', '💪', '🙏',
            '😈', '👀', '🤝', '✌️', '🎉', '🎊', '💥', '⚡'
        ];

        // Bound methods
        this._boundHandlers = {
            onMessage: this._handleNewMessage.bind(this),
            onConnect: this._handleConnect.bind(this),
            onDisconnect: this._handleDisconnect.bind(this),
            onError: this._handleError.bind(this),
            onHistoryLoad: this._handleHistoryLoad.bind(this),
            onStatsUpdate: this._handleStatsUpdate.bind(this),
            onMessageEdited: this._handleMessageEdited.bind(this),
            onMessageDeleted: this._handleMessageDeleted.bind(this)
        };

        // Edit-in-place state
        this._editingMessageId = null;
        this._editingOriginalText = null;
        this._editingElement = null;
    }

    /**
     * Initialize the community manager
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) return;


        // Cache DOM elements
        this._cacheElements();

        // Setup event listeners
        this._setupEventListeners();

        // Get user info
        const user = this.authManager?.getUser();

        // ── Reuse the global CommunityAPI WebSocket if available ──
        if (getCommunityWS()?.isConnected) {
            // Take over the existing connection
            this.communityAPI = getCommunityWS();
            this._ownsWS = false; // we must NOT disconnect on destroy

            // Swap callbacks to the full CommunityManager handlers
            this.communityAPI.onMessage = this._boundHandlers.onMessage;
            this.communityAPI.onConnect = this._boundHandlers.onConnect;
            this.communityAPI.onDisconnect = this._boundHandlers.onDisconnect;
            this.communityAPI.onError = this._boundHandlers.onError;
            this.communityAPI.onHistoryLoad = this._boundHandlers.onHistoryLoad;
            this.communityAPI.onStatsUpdate = this._boundHandlers.onStatsUpdate;
            this.communityAPI.onMessageEdited = this._boundHandlers.onMessageEdited;
            this.communityAPI.onMessageDeleted = this._boundHandlers.onMessageDeleted;


            // Trigger the connect handler manually (WS is already open)
            this._boundHandlers.onConnect();
        } else {
            // Fallback: create a new connection (first visit / not logged in)
            this.communityAPI = new CommunityAPI({
                userId: user?.user_id || `anon_${Date.now()}`,
                username: user?.username || 'Anonymous',
                onMessage: this._boundHandlers.onMessage,
                onConnect: this._boundHandlers.onConnect,
                onDisconnect: this._boundHandlers.onDisconnect,
                onError: this._boundHandlers.onError,
                onHistoryLoad: this._boundHandlers.onHistoryLoad,
                onStatsUpdate: this._boundHandlers.onStatsUpdate,
                onMessageEdited: this._boundHandlers.onMessageEdited,
                onMessageDeleted: this._boundHandlers.onMessageDeleted
            });
            this._ownsWS = true;

            try {
                await this.communityAPI.connect();
                // Store as global so future navigations can reuse it
                setCommunityWS(this.communityAPI);
                this.communityAPI._lastKnownMsgId = null;
            } catch (error) {
                console.error('Failed to connect to community WebSocket:', error);
                this._updateConnectionStatus('disconnected', 'Connection failed');
            }
        }

        this.isInitialized = true;

        // Mark community messages as seen (clears the nav badge)
        markCommunityAsSeen();

        // Check for existing unread PMs → show Messages tab badge
        if (user?.user_id && this.currentSection !== 'messages') {
            const pmBase = config.getApiEndpoint('/api/private-messages');
            fetch(`${pmBase}/unread-summary?user_id=${encodeURIComponent(user.user_id)}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data) {
                        const total = (data.unread_messages || 0) + (data.pending_connections || 0);
                        if (total > 0) {
                            this._showMessagesTabBadge(total);
                        }
                    }
                })
                .catch(() => { /* ignore */ });
        }

        // Restore previously active tab (if any)
        const savedSection = sessionStorage.getItem('community_active_tab');
        if (savedSection && savedSection !== this.currentSection) {
            this._switchSection(savedSection);
        }
    }

    /**
     * Cache DOM elements for quick access
     * @private
     */
    _cacheElements() {
        this.elements = {
            // Navigation tabs
            navTabs: this.container?.querySelectorAll('.community-nav-tab'),
            chatSection: this.container?.querySelector('.community-chat-section'),
            statsSection: this.container?.querySelector('.community-stats-section'),
            messagesSection: this.container?.querySelector('.community-messages-section'),

            // Header
            headerStatus: document.querySelector('.chat-header-status'),
            statusIndicator: document.getElementById('headerStatusIndicator'),
            statusText: document.getElementById('headerStatusText'),
            onlineCount: document.getElementById('onlineCount'),
            onlineAvatars: document.getElementById('onlineAvatars'),

            // Messages
            chatMessagesArea: document.getElementById('chatMessagesArea'),
            chatMessages: document.getElementById('chatMessages'),

            // Scroll FAB
            scrollBottomFab: document.getElementById('scrollBottomFab'),
            newMessagesBadge: document.getElementById('newMessagesBadge'),

            // Input
            chatInput: document.getElementById('chatInput'),
            sendBtn: document.getElementById('sendBtn'),
            emojiBtn: document.getElementById('emojiBtn'),
            gifBtn: document.getElementById('gifBtn'),
            imageBtn: document.getElementById('imageBtn'),

            // Media preview
            mediaPreviewBar: document.getElementById('mediaPreviewBar'),
            mediaPreviewImg: document.getElementById('mediaPreviewImg'),
            mediaPreviewName: document.getElementById('mediaPreviewName'),
            mediaPreviewRemove: document.getElementById('mediaPreviewRemove')
        };
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // Navigation tabs (Chat / Stats)
        this.elements.navTabs?.forEach(tab => {
            tab.addEventListener('click', () => {
                const section = tab.dataset.section;
                if (section && section !== this.currentSection) {
                    this._switchSection(section);
                }
            });
        });

        // Chat input
        if (this.elements.chatInput) {
            this.elements.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this._sendMessage();
                }
            });
        }

        // Send button
        if (this.elements.sendBtn) {
            this.elements.sendBtn.addEventListener('click', () => {
                this._sendMessage();
            });
        }

        // Emoji button
        if (this.elements.emojiBtn) {
            this.elements.emojiBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._toggleEmojiPicker();
            });
        }

        // Image button
        if (this.elements.imageBtn) {
            this.elements.imageBtn.addEventListener('click', () => {
                this._handleImageUpload();
            });
        }

        // GIF button - opens file picker for GIF files
        if (this.elements.gifBtn) {
            this.elements.gifBtn.addEventListener('click', () => {
                this._handleGifUpload();
            });
        }

        // Media preview remove button
        if (this.elements.mediaPreviewRemove) {
            this.elements.mediaPreviewRemove.addEventListener('click', () => {
                this._removeMediaPreview();
            });
        }

        // Scroll to bottom FAB
        if (this.elements.scrollBottomFab) {
            this.elements.scrollBottomFab.addEventListener('click', () => {
                this._scrollToBottom();
            });
        }

        // Track scroll position for FAB visibility
        if (this.elements.chatMessagesArea) {
            this.elements.chatMessagesArea.addEventListener('scroll', () => {
                this._handleScroll();
            });
        }

        // Private Messages notifications → show/update/hide badge on Messages tab
        this._boundHandlers.onPMNotification = (e) => {
            const count = e.detail?.total ?? 0;
            if (this.currentSection === 'messages' || count <= 0) {
                this._hideMessagesTabBadge();
            } else {
                this._showMessagesTabBadge(count);
            }
        };
        globalThis.addEventListener('pm:notification', this._boundHandlers.onPMNotification);
    }

    /**
     * Handle new message from WebSocket
     * @private
     * @param {Object} message
     */
    _handleNewMessage(message) {

        // Add to messages array (at the end for chronological order)
        this.messages.push(message);

        // Keep only last 100 messages
        if (this.messages.length > 100) {
            this.messages = this.messages.slice(-100);
        }

        // Check if near bottom before adding message
        const wasNearBottom = this._isNearBottom();

        // Render new message
        this.renderNewMessage(message);

        // Auto-scroll or show badge
        this.handleScrollOrBadge(wasNearBottom);

        // Update stats
        this.stats.totalMessages++;
        this._updateStats();

        // If the user is viewing the chat tab, mark as seen immediately.
        // Otherwise (e.g. on Stats tab) show a badge on the Chat tab.
        this.updateLastSeenMessage(message);
    }

    updateLastSeenMessage(message) {
        if (this.currentSection === 'chat') {
            if (message?.id) {
                localStorage.setItem('community_last_seen_msg', message.id);
                if (getCommunityWS()) {
                    getCommunityWS()._lastKnownMsgId = message.id;
                }
            }
        } else {
            this._showChatTabBadge();
        }
    }

    handleScrollOrBadge(wasNearBottom) {
        if (wasNearBottom) {
            this._scrollToBottom();
        } else {
            // Show new message indicator
            this._newMessagesCount = (this._newMessagesCount || 0) + 1;
            if (this.elements.newMessagesBadge) {
                this.elements.newMessagesBadge.style.display = 'flex';
                this.elements.newMessagesBadge.textContent = this._newMessagesCount;
            }
            this._showScrollFab();
        }
    }

    renderNewMessage(message) {
        const messageEl = this._renderMessage(message, 0);
        if (messageEl && this.elements.chatMessages) {
            this.elements.chatMessages.appendChild(messageEl);

            // Remove excess messages from DOM (oldest first)
            while (this.elements.chatMessages.children.length > 100) {
                this.elements.chatMessages.firstChild.remove();
            }
        }
    }

    /**
     * Check if scroll is near bottom
     * @private
     * @returns {boolean}
     */
    _isNearBottom() {
        if (!this.elements.chatMessagesArea) return true;
        const area = this.elements.chatMessagesArea;
        return area.scrollHeight - area.scrollTop - area.clientHeight < 100;
    }

    /**
     * Handle message history load
     * @private
     * @param {Array} messages
     */
    _handleHistoryLoad(messages) {

        // Messages come from backend newest first, reverse for chronological order (oldest first)
        this.messages = [...messages].reverse();
        this._renderAllMessages();

        // Show empty state if no messages
        if (messages.length === 0) {
            this._showEmptyState();
        }

        // Mark the latest message as seen so the nav badge clears
        if (this.messages.length > 0) {
            const latest = this.messages.at(-1);
            if (latest?.id) {
                localStorage.setItem('community_last_seen_msg', latest.id);
                if (getCommunityWS()) {
                    getCommunityWS()._lastKnownMsgId = latest.id;
                }
            }
        }
        // Remove any existing community badge since we're viewing the page
        removeCommunityBadge();
    }

    /**
     * Handle WebSocket connection
     * @private
     */
    _handleConnect() {
        this._updateConnectionStatus('connected', 'Connected');

        // Request message history
        this.communityAPI.requestHistory(0, 50);

        // Always request fresh stats (needed when reusing existing WebSocket on SPA navigation)
        this.communityAPI.requestStats();
    }

    /**
     * Handle WebSocket disconnection
     * @private
     */
    _handleDisconnect() {
        this._updateConnectionStatus('disconnected', 'Disconnected - Reconnecting...');
    }

    /**
     * Handle WebSocket error
     * @private
     * @param {Error} error
     */
    _handleError(error) {
        this._updateConnectionStatus('disconnected', 'Connection error');
    }

    /**
     * Handle stats update
     * @private
     * @param {Object} stats
     */
    _handleStatsUpdate(stats) {
        this.stats = { ...this.stats, ...stats };
        this._updateStats();
        if (stats.onlineUsersList) {
            this._renderOnlineAvatars(stats.onlineUsersList);
        }
    }

    /**
     * Update connection status UI
     * @private
     * @param {string} status - 'connected', 'disconnected', 'connecting'
     * @param {string} text
     */
    _updateConnectionStatus(status, text) {
        if (this.elements.headerStatus) {
            this.elements.headerStatus.className = `chat-header-status ${status}`;
        }
        if (this.elements.statusText) {
            this.elements.statusText.textContent = text;
        }
    }

    /**
     * Update stats in header
     * @private
     */
    _updateStats() {
        if (this.elements.onlineCount) {
            const count = this.stats.onlineUsers || 0;
            this.elements.onlineCount.textContent = `${count} online`;
        }
    }

    /**
     * Render mini avatars of online users in the chat header
     * @private
     * @param {Array} users - Array of {user_id, username}
     */
    _renderOnlineAvatars(users) {
        const container = this.elements.onlineAvatars;
        if (!container) return;

        container.replaceChildren();
        const MAX_VISIBLE = 8;

        const visible = users.slice(0, MAX_VISIBLE);
        const overflow = users.length - MAX_VISIBLE;

        visible.forEach((user, i) => {
            const steemAvatarUrl = `https://steemitimages.com/u/${encodeURIComponent(user.username || 'anonymous')}/avatar/small`;

            const el = document.createElement('div');
            el.className = 'mini-avatar mini-avatar--clickable';
            el.style.zIndex = MAX_VISIBLE - i;
            el.dataset.userId = user.user_id || '';
            el.setAttribute('role', 'link');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', `View profile of ${user.username}`);

            const img = document.createElement('img');
            img.src = steemAvatarUrl;
            img.alt = user.username;
            img.className = 'mini-avatar-img';
            el.appendChild(img);

            const tooltip = document.createElement('span');
            tooltip.className = 'mini-avatar-tooltip';
            tooltip.textContent = user.username;
            el.appendChild(tooltip);

            this._bindAvatarNavigation(el);
            container.appendChild(el);
        });

        if (overflow > 0) {
            const more = document.createElement('div');
            more.className = 'mini-avatar-overflow';
            more.textContent = `+${overflow}`;
            container.appendChild(more);
        }
    }

    /**
     * Simple hash code for consistent avatar colors
     * @private
     * @param {string} str
     * @returns {number}
     */
    _hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.codePointAt(i);
            hash = Math.trunc(hash);
        }
        return hash;
    }

    /**
     * Scroll to bottom of messages
     * @private
     */
    _scrollToBottom() {
        if (this.elements.chatMessagesArea) {
            this.elements.chatMessagesArea.scrollTop = this.elements.chatMessagesArea.scrollHeight;
            this._hideScrollFab();
        }
    }

    /**
     * Handle scroll events for FAB visibility
     * @private
     */
    _handleScroll() {
        if (!this.elements.chatMessagesArea) return;

        const area = this.elements.chatMessagesArea;
        const isNearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 100;

        if (isNearBottom) {
            this._hideScrollFab();
        } else {
            this._showScrollFab();
        }
    }

    /**
     * Show scroll to bottom FAB
     * @private
     */
    _showScrollFab() {
        if (this.elements.scrollBottomFab) {
            this.elements.scrollBottomFab.style.display = 'flex';
        }
    }

    /**
     * Hide scroll to bottom FAB
     * @private
     */
    _hideScrollFab() {
        if (this.elements.scrollBottomFab) {
            this.elements.scrollBottomFab.style.display = 'none';
        }
        // Reset new messages badge
        if (this.elements.newMessagesBadge) {
            this.elements.newMessagesBadge.style.display = 'none';
            this.elements.newMessagesBadge.textContent = '0';
        }
        this._newMessagesCount = 0;
    }

    /**
     * Update character count display (no longer shown in new UI but kept for validation)
     * @private
     * @param {number} count
     */
    _updateCharCount(count) {
        // Character count is not shown in new minimal UI
        // But we still validate message length in _sendMessage
    }

    /**
     * Send a message
     * @private
     */
    _sendMessage() {
        const text = this.elements.chatInput?.value?.trim() || '';

        // Check for media preview from inline bar
        const mediaUrl = this.elements.mediaPreviewBar?.dataset.mediaUrl || null;
        const isGif = this.elements.mediaPreviewBar?.dataset.isGif === 'true';

        // Must have either text or media
        if (!text && !mediaUrl) return;

        if (text.length > 500) {
            this._showNotification('Message too long (max 500 characters)', 'error');
            return;
        }

        // Send through API
        const sent = this.communityAPI.sendMessage(text, {
            imageUrl: isGif ? null : mediaUrl,
            gifUrl: isGif ? mediaUrl : null
        });

        if (sent) {
            this.elements.chatInput.value = '';
            this._removeMediaPreview();
        } else {
            this._showNotification('Message queued - waiting for connection', 'warning');
        }
    }

    /**
     * Render a single message
     * @private
     * @param {Object} message
     * @param {number} index
     * @returns {HTMLElement}
     */
    _renderMessage(message, index) {
        const user = this.authManager?.getUser();
        const isOwnMessage = message.user_id === user?.user_id;

        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${isOwnMessage ? 'own-message' : ''}`;
        messageEl.dataset.msgId = message.id;

        // Steem avatar URL
        const steemAvatarUrl = `https://steemitimages.com/u/${encodeURIComponent(message.username || 'anonymous')}/avatar/small`;

        // Format timestamp
        const time = this._formatTime(message.timestamp || message.created_at);

        // Build avatar
        const username = message.username || 'Anonymous';
        const userId = message.user_id || '';

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar message-avatar--clickable';
        avatarDiv.dataset.userId = userId;
        avatarDiv.setAttribute('role', 'link');
        avatarDiv.setAttribute('tabindex', '0');
        avatarDiv.setAttribute('aria-label', `View profile of ${username}`);

        const avatarImg = document.createElement('img');
        avatarImg.src = steemAvatarUrl;
        avatarImg.alt = username;
        avatarDiv.appendChild(avatarImg);

        const avatarTooltip = document.createElement('span');
        avatarTooltip.className = 'message-avatar-tooltip';
        avatarTooltip.textContent = username;
        avatarDiv.appendChild(avatarTooltip);

        messageEl.appendChild(avatarDiv);

        // Build bubble
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        const header = document.createElement('div');
        header.className = 'message-header';
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'message-username';
        usernameSpan.textContent = username;
        header.appendChild(usernameSpan);
        bubble.appendChild(header);

        // Process message text (links, etc.)
        if (message.text) {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.appendChild(this._processMessageText(message.text));
            bubble.appendChild(textDiv);
        }

        // Build media elements
        if (message.image_url) {
            const img = document.createElement('img');
            img.className = 'message-image';
            img.src = message.image_url;
            img.alt = 'Shared image';
            img.loading = 'lazy';
            img.dataset.lightbox = 'true';
            bubble.appendChild(img);
        }
        if (message.gif_url) {
            const gif = document.createElement('img');
            gif.className = 'message-gif';
            gif.src = message.gif_url;
            gif.alt = 'GIF';
            gif.loading = 'lazy';
            gif.dataset.lightbox = 'true';
            bubble.appendChild(gif);
        }

        // Build footer
        const footer = document.createElement('div');
        footer.className = 'message-footer';

        if (isOwnMessage && message.text) {
            const editBtnEl = document.createElement('button');
            editBtnEl.className = 'message-edit-btn';
            editBtnEl.title = 'Edit message';
            editBtnEl.setAttribute('aria-label', 'Edit message');
            editBtnEl.textContent = '✏️';
            footer.appendChild(editBtnEl);
        }

        if (message.is_edited) {
            const editedSpan = document.createElement('span');
            editedSpan.className = 'message-edited-label';
            editedSpan.textContent = 'edited';
            footer.appendChild(editedSpan);
        }

        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = time;
        footer.appendChild(timeSpan);

        bubble.appendChild(footer);
        messageEl.appendChild(bubble);

        // Bind avatar click → navigate to user profile
        const avatarEl = messageEl.querySelector('.message-avatar--clickable');
        if (avatarEl) {
            this._bindAvatarNavigation(avatarEl);
        }

        // Bind edit button
        if (isOwnMessage && message.text) {
            const btn = messageEl.querySelector('.message-edit-btn');
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this._startEditMessage(messageEl, message.id, message.text);
            });
        }

        // Add click handlers for images
        const images = messageEl.querySelectorAll('[data-lightbox="true"]');
        images.forEach(img => {
            img.addEventListener('click', () => this._openLightbox(img.src));
        });

        return messageEl;
    }

    // ========================================================================
    // Message Editing
    // ========================================================================

    /**
     * Handle a message_edited broadcast from the server.
     * Updates the in-memory array and the live DOM element for all clients.
     * @private
     * @param {{ message_id: string, text: string, is_edited: boolean, edited_at: number }} data
     */
    _handleMessageDeleted(data) {
        const { message_id } = data;

        // Remove from in-memory list
        this.messages = this.messages.filter(m => m.id !== message_id);

        // If the user was editing this message, cancel edit mode
        if (this._editingMessageId === message_id) {
            this._finishEditUI();
        }

        // Remove from DOM with a brief fade-out
        const msgEl = this.elements.chatMessages?.querySelector(`[data-msg-id="${CSS.escape(message_id)}"]`);
        if (msgEl) {
            msgEl.style.transition = 'opacity 0.3s ease';
            msgEl.style.opacity = '0';
            setTimeout(() => msgEl.remove(), 300);
        }
    }

    _handleMessageEdited(data) {
        const { message_id, text, is_edited, edited_at } = data;

        // Update in-memory
        const msg = this.messages.find(m => m.id === message_id);
        if (msg) {
            msg.text = text;
            msg.is_edited = is_edited;
            msg.edited_at = edited_at;
        }

        // If the current user was editing this message, restore the DOM first
        // (the textarea has replaced .message-text, so we must teardown before querying)
        if (this._editingMessageId === message_id) {
            this._finishEditUI(text);
        }

        // Update DOM text for all clients (safe: .message-text is now present)
        const msgEl = this.elements.chatMessages?.querySelector(`[data-msg-id="${CSS.escape(message_id)}"]`);
        if (!msgEl) return;

        const textEl = msgEl.querySelector('.message-text');
        if (textEl) {
            textEl.replaceChildren(this._processMessageText(text));
        }

        // Show "edited" label if not already present
        if (is_edited) {
            const footer = msgEl.querySelector('.message-footer');
            if (footer && !footer.querySelector('.message-edited-label')) {
                const label = document.createElement('span');
                label.className = 'message-edited-label';
                label.textContent = 'edited';
                const timeEl = footer.querySelector('.message-time');
                if (timeEl) {
                    timeEl.before(label);
                } else {
                    footer.appendChild(label);
                }
            }
        }
    }

    /**
     * Enter edit mode for a message bubble.
     * @private
     * @param {HTMLElement} messageEl
     * @param {string} messageId
     * @param {string} currentText
     */
    _startEditMessage(messageEl, messageId, currentText) {
        if (this._editingMessageId) {
            this._cancelEdit();
        }

        this._editingMessageId = messageId;
        this._editingOriginalText = currentText;
        this._editingElement = messageEl;

        const bubble = messageEl.querySelector('.message-bubble');
        const textEl = bubble?.querySelector('.message-text');
        if (!textEl || !bubble) return;

        // Replace text div with a textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'message-edit-input';
        textarea.value = currentText;
        textarea.rows = Math.min(5, Math.max(1, Math.ceil(currentText.length / 40)));
        textEl.replaceWith(textarea);
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        // Replace edit button with save/cancel actions inside the footer
        const editBtn = bubble.querySelector('.message-edit-btn');
        if (editBtn) editBtn.style.display = 'none';

        const footer = bubble.querySelector('.message-footer');
        if (footer) {
            const actions = document.createElement('div');
            actions.className = 'message-edit-actions';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'message-edit-save';
            saveBtn.textContent = 'Save';
            saveBtn.addEventListener('click', () => {
                this._submitEditMessage(messageId, textarea.value);
            });
            actions.appendChild(saveBtn);

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'message-edit-cancel';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => {
                this._cancelEdit();
            });
            actions.appendChild(cancelBtn);

            footer.prepend(actions);
        }

        bubble.classList.add('message-bubble--editing');

        // Keyboard shortcuts: Enter to save, Escape to cancel
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

    /**
     * Submit an edited message to the server.
     * The UI update is deferred to _handleMessageEdited (server echo).
     * @private
     * @param {string} messageId
     * @param {string} newText
     */
    _submitEditMessage(messageId, newText) {
        const trimmed = newText.trim();

        if (!trimmed) {
            this._showNotification('Message cannot be empty', 'error');
            return;
        }
        if (trimmed.length > 500) {
            this._showNotification('Message too long (max 500 characters)', 'error');
            return;
        }
        if (trimmed === this._editingOriginalText) {
            this._cancelEdit();
            return;
        }

        this.communityAPI.sendEditMessage(messageId, trimmed);
        // UI will update via _handleMessageEdited broadcast from server
    }

    /**
     * Cancel the current in-progress edit and restore the original UI.
     * @private
     */
    _cancelEdit() {
        if (!this._editingMessageId) return;
        this._finishEditUI();
    }

    /**
     * Tear down the edit-mode UI regardless of outcome.
     * @private
     * @param {string|null} confirmedText - When provided, renders this text instead of the original.
     */
    _finishEditUI(confirmedText = null) {
        const messageEl = this._editingElement;
        const textToRender = confirmedText ?? this._editingOriginalText;

        this._editingMessageId = null;
        this._editingOriginalText = null;
        this._editingElement = null;

        if (!messageEl) return;

        const bubble = messageEl.querySelector('.message-bubble');
        const textarea = bubble?.querySelector('.message-edit-input');

        if (textarea) {
            const textEl = document.createElement('div');
            textEl.className = 'message-text';
            textEl.appendChild(this._processMessageText(textToRender || ''));
            textarea.replaceWith(textEl);
        }

        bubble?.querySelector('.message-edit-actions')?.remove();

        const editBtn = bubble?.querySelector('.message-edit-btn');
        if (editBtn) editBtn.style.display = '';

        bubble?.classList.remove('message-bubble--editing');
    }

    /**
     * Open image lightbox
     * @private
     * @param {string} imageUrl
     */
    _openLightbox(imageUrl) {
        // Remove existing lightbox
        let lightbox = document.querySelector('.image-lightbox');
        if (lightbox) {
            lightbox.remove();
        }

        // Create lightbox
        lightbox = document.createElement('div');
        lightbox.className = 'image-lightbox';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'image-lightbox-close';
        closeBtn.title = 'Close';
        closeBtn.textContent = '✕';
        lightbox.appendChild(closeBtn);

        const lbImg = document.createElement('img');
        lbImg.src = imageUrl;
        lbImg.alt = 'Full size image';
        lightbox.appendChild(lbImg);

        // Close on click
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('image-lightbox-close')) {
                lightbox.classList.remove('active');
                setTimeout(() => lightbox.remove(), 300);
            }
        });

        // Close on ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                lightbox.classList.remove('active');
                setTimeout(() => lightbox.remove(), 300);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        document.body.appendChild(lightbox);

        // Trigger animation
        requestAnimationFrame(() => {
            lightbox.classList.add('active');
        });
    }

    /**
     * Render all messages
     * @private
     */
    _renderAllMessages() {
        if (!this.elements.chatMessages) return;

        this.elements.chatMessages.replaceChildren();

        const fragment = document.createDocumentFragment();

        // Render in chronological order (oldest first)
        this.messages.forEach((message, index) => {
            const messageEl = this._renderMessage(message, index);
            fragment.appendChild(messageEl);
        });

        this.elements.chatMessages.appendChild(fragment);

        // Scroll to bottom after loading history
        requestAnimationFrame(() => {
            this._scrollToBottom();
        });
    }

    /**
     * Show empty state when no messages
     * @private
     */
    _showEmptyState() {
        if (!this.elements.chatMessages) return;

        const emptyState = document.createElement('div');
        emptyState.className = 'chat-empty-state';

        const emptyIcon = document.createElement('div');
        emptyIcon.className = 'empty-icon';
        emptyIcon.textContent = '💬';
        emptyState.appendChild(emptyIcon);

        const emptyTitle = document.createElement('h3');
        emptyTitle.textContent = 'No messages yet';
        emptyState.appendChild(emptyTitle);

        const emptyDesc = document.createElement('p');
        emptyDesc.textContent = 'Be the first to say hello to the community!';
        emptyState.appendChild(emptyDesc);

        this.elements.chatMessages.replaceChildren(emptyState);
    }

    /**
     * Process message text for links and formatting
     * @private
     * @param {string} text
     * @returns {DocumentFragment}
     */
    _processMessageText(text) {
        const fragment = document.createDocumentFragment();
        const urlRegex = /(https?:\/\/[^\s<]+)/gi;
        let lastIndex = 0;
        let match;

        while ((match = urlRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            }
            const a = document.createElement('a');
            a.href = match[1];
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = match[1];
            fragment.appendChild(a);
            lastIndex = urlRegex.lastIndex;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        return fragment;
    }

    /**
     * Bind click and keyboard navigation to an avatar element.
     * Navigates to the user's public profile.
     * @private
     * @param {HTMLElement} avatarEl - The avatar container with data-user-id
     */
    _bindAvatarNavigation(avatarEl) {
        const userId = avatarEl.dataset.userId;
        if (!userId) {
            return;
        }

        const navigate = () => {
            globalThis.location.hash = `#/user/${encodeURIComponent(userId)}`;
        };

        avatarEl.addEventListener('click', navigate);
        avatarEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate();
            }
        });
    }

    /**
     * Escape HTML to prevent XSS
     * @private
     * @param {string} text
     * @returns {string}
     */
    _escapeHtml(text) {
        return String(text)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    /**
     * Format timestamp to relative or absolute time
     * @private
     * @param {number|string} timestamp
     * @returns {string}
     */
    _formatTime(timestamp) {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }

        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }

        // More than 24 hours - show date
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Toggle emoji picker
     * @private
     */
    _toggleEmojiPicker() {
        let picker = document.querySelector('.emoji-picker-container');

        if (!picker) {
            // Create emoji picker
            picker = document.createElement('div');
            picker.className = 'emoji-picker-container';

            const grid = document.createElement('div');
            grid.className = 'emoji-grid';

            this.commonEmojis.forEach(emoji => {
                const btn = document.createElement('button');
                btn.className = 'emoji-btn';
                btn.textContent = emoji;
                btn.addEventListener('click', () => {
                    this._insertEmoji(emoji);
                });
                grid.appendChild(btn);
            });

            picker.appendChild(grid);

            // Position relative to input area
            const inputArea = document.querySelector('.chat-input-area');
            if (inputArea) {
                inputArea.style.position = 'relative';
                inputArea.appendChild(picker);
            }
        }

        const isNowActive = !picker.classList.contains('active');
        picker.classList.toggle('active');

        // Register click-outside handler when opening
        if (isNowActive) {
            setTimeout(() => {
                const closeHandler = (e) => {
                    if (!picker.contains(e.target) && !this.elements.emojiBtn.contains(e.target)) {
                        picker.classList.remove('active');
                        document.removeEventListener('click', closeHandler);
                    }
                };
                document.addEventListener('click', closeHandler);
            }, 10);
        }
    }

    /**
     * Insert emoji at cursor position
     * @private
     * @param {string} emoji
     */
    _insertEmoji(emoji) {
        if (!this.elements.chatInput) return;

        const input = this.elements.chatInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;

        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
    }

    /**
     * Handle image upload
     * @private
     */
    _handleImageUpload() {
        this._openMediaPicker('image/*', 'image');
    }

    /**
     * Handle GIF upload
     * @private
     */
    _handleGifUpload() {
        this._openMediaPicker('image/gif', 'gif');
    }

    /**
     * Open media file picker
     * @private
     * @param {string} accept - File types to accept
     * @param {string} type - 'image' or 'gif'
     */
    _openMediaPicker(accept, type) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this._showNotification('File too large (max 5MB)', 'error');
                input.remove();
                return;
            }

            // Show loading
            this._showNotification(`Uploading ${type}...`, 'info');
            this.elements.sendBtn.disabled = true;

            try {
                const result = await this.communityAPI.uploadMedia(file);

                if (result.success) {
                    this._showMediaPreview(result.url, file.name, result.is_gif);
                } else {
                    this._showNotification(result.error || 'Upload failed', 'error');
                }
            } catch (error) {
                console.error('Upload error:', error);
                this._showNotification('Failed to upload file', 'error');
            } finally {
                this.elements.sendBtn.disabled = false;
                input.remove();
            }
        });

        document.body.appendChild(input);
        input.click();
    }

    /**
     * Show media preview before sending
     * @private
     * @param {string} url
     * @param {string} filename
     * @param {boolean} isGif
     */
    _showMediaPreview(url, filename, isGif = false) {
        // Use the inline preview bar from HTML
        if (this.elements.mediaPreviewBar) {
            this.elements.mediaPreviewBar.style.display = 'flex';
            this.elements.mediaPreviewBar.dataset.mediaUrl = url;
            this.elements.mediaPreviewBar.dataset.isGif = isGif;

            if (this.elements.mediaPreviewImg) {
                this.elements.mediaPreviewImg.src = url;
            }
            if (this.elements.mediaPreviewName) {
                this.elements.mediaPreviewName.textContent = `${isGif ? '🎬 ' : '🖼️ '}${filename}`;
            }
        }

        this.elements.chatInput?.focus();
    }

    /**
     * Remove media preview
     * @private
     */
    _removeMediaPreview() {
        if (this.elements.mediaPreviewBar) {
            this.elements.mediaPreviewBar.style.display = 'none';
            this.elements.mediaPreviewBar.dataset.mediaUrl = '';
            this.elements.mediaPreviewBar.dataset.isGif = '';

            if (this.elements.mediaPreviewImg) {
                this.elements.mediaPreviewImg.src = '';
            }
            if (this.elements.mediaPreviewName) {
                this.elements.mediaPreviewName.textContent = '';
            }
        }
    }

    /**
     * Show a notification toast
     * @private
     * @param {string} message
     * @param {string} type - 'info', 'success', 'warning', 'error'
     */
    _showNotification(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `chat-toast chat-toast-${this._escapeHtml(type)}`;
        const toastMsg = document.createElement('span');
        toastMsg.className = 'toast-message';
        toastMsg.textContent = message;
        toast.appendChild(toastMsg);

        // Add styles if not present
        if (!document.querySelector('#toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'toast-styles';
            styles.textContent = `
                .chat-toast {
                    position: fixed;
                    bottom: 120px;
                    left: 50%;
                    transform: translateX(-50%) translateY(20px);
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    z-index: 9999;
                    opacity: 0;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                }
                .chat-toast.show {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                .chat-toast-info { background: var(--primary-color); color: white; }
                .chat-toast-success { background: var(--success); color: white; }
                .chat-toast-warning { background: var(--warning); color: #000; }
                .chat-toast-error { background: var(--error); color: white; }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========================================================================
    // Section Switching (Chat / Stats)
    // ========================================================================

    /**
     * Show a notification dot on the Chat tab when user is on another tab
     * @private
     */
    _showChatTabBadge() {
        const chatTab = this.container?.querySelector('.community-nav-tab[data-section="chat"]');
        if (!chatTab || chatTab.querySelector('.chat-tab-badge')) return;
        const dot = document.createElement('span');
        dot.className = 'chat-tab-badge';
        chatTab.appendChild(dot);
    }

    /**
     * Remove the Chat tab notification dot
     * @private
     */
    _hideChatTabBadge() {
        this.container?.querySelectorAll('.chat-tab-badge').forEach(b => b.remove());
    }

    /**
     * Show a notification dot on the Messages tab when user is on another tab
     * @private
     */
    _showMessagesTabBadge(count) {
        const msgTab = this.container?.querySelector('.community-nav-tab[data-section="messages"]');
        if (!msgTab) return;
        let badge = msgTab.querySelector('.messages-tab-badge');
        if (badge) {
            if (count != null) badge.textContent = count > 99 ? '99+' : String(count);
            return;
        }
        badge = document.createElement('span');
        badge.className = 'messages-tab-badge';
        let badgeText = '';
        if (count != null && count > 0) {
            badgeText = count > 99 ? '99+' : String(count);
        }
        badge.textContent = badgeText;
        msgTab.appendChild(badge);
    }

    /**
     * Remove the Messages tab notification dot
     * @private
     */
    _hideMessagesTabBadge() {
        this.container?.querySelectorAll('.messages-tab-badge').forEach(b => b.remove());
    }

    /**
     * Switch between chat, stats, and messages sections
     * @param {string} section - 'chat', 'stats', or 'messages'
     * @private
     */
    _switchSection(section) {
        this.currentSection = section;

        // Persist choice for navigation back
        sessionStorage.setItem('community_active_tab', section);

        // Update tab active state
        this.elements.navTabs?.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === section);
        });

        // Toggle section visibility
        if (this.elements.chatSection) {
            this.elements.chatSection.classList.toggle('active', section === 'chat');
        }
        if (this.elements.statsSection) {
            this.elements.statsSection.classList.toggle('active', section === 'stats');
        }
        if (this.elements.messagesSection) {
            this.elements.messagesSection.classList.toggle('active', section === 'messages');
        }

        // Lazy-load stats on first switch
        if (section === 'stats' && !this.statsLoaded) {
            this._initStats();
        }

        // Lazy-load private messages on first switch
        if (section === 'messages' && !this.messagesLoaded) {
            this._initPrivateMessages();
        }

        // Switching to messages → clear messages tab badge
        if (section === 'messages') {
            this._hideMessagesTabBadge();
        }

        // Switching to chat → clear the tab badge and mark messages as seen
        if (section === 'chat') {
            this.clearChatBadgeAndUpdateLastSeen();
        }

    }

    clearChatBadgeAndUpdateLastSeen() {
        this._hideChatTabBadge();
        const latest = this.messages.length > 0 ? this.messages.at(-1) : null;
        if (latest?.id) {
            localStorage.setItem('community_last_seen_msg', latest.id);
            if (getCommunityWS()) {
                getCommunityWS()._lastKnownMsgId = latest.id;
            }
        }
        removeCommunityBadge();
    }

    /**
     * Initialize private messages (lazy, first time only)
     * @private
     */
    async _initPrivateMessages() {
        if (this.messagesLoaded) return;
        this.messagesLoaded = true;

        try {
            this.privateMessageManager = new PrivateMessageManager(this.elements.messagesSection);
            await this.privateMessageManager.init();
        } catch (err) {
            console.error('Failed to initialize private messages:', err);

            if (this.elements.messagesSection) {
                this.elements.messagesSection.replaceChildren(
                    this._buildErrorBlock('Failed to load private messages.')
                );
            }
        }
    }

    /**
     * Initialize the stats renderer (lazy, first time only)
     * @private
     */
    async _initStats() {
        if (this.statsLoaded) return;
        this.statsLoaded = true;

        try {
            this.statsRenderer = new CommunityStatsRenderer();
            await this.statsRenderer.mount(this.elements.statsSection);
        } catch (err) {
            console.error('Failed to initialize community stats:', err);
            if (this.elements.statsSection) {
                this.elements.statsSection.replaceChildren(
                    this._buildErrorBlock('Failed to load community stats.')
                );
            }
        }
    }

    /**
     * Build a DOM error block element
     * @private
     * @param {string} text
     * @returns {HTMLElement}
     */
    _buildErrorBlock(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'cs-error';

        const icon = document.createElement('span');
        icon.className = 'cs-error-icon';
        icon.textContent = '⚠️';
        wrapper.appendChild(icon);

        const p = document.createElement('p');
        p.textContent = text;
        wrapper.appendChild(p);

        return wrapper;
    }

    /**
     * Cleanup and destroy manager
     */
    destroy() {

        // Hand the WebSocket back to the global nav notifier instead of
        // disconnecting it, so we keep receiving messages for the badge.
        if (this.communityAPI) {
            if (this._ownsWS) {
                // Rare fallback path – we created the WS ourselves
                this.communityAPI.disconnect();
                // Clear the global reference so bootCommunityWS can create a fresh one
                if (getCommunityWS() === this.communityAPI) {
                    setCommunityWS(null);
                }
                // Schedule a global WS boot so badge notifications resume
                setTimeout(() => {
                    if (!getCurrentCommunityManager()) {
                        bootCommunityWS();
                    }
                }, 100);
            } else {
                // Restore lightweight nav handlers (badge-only)
                installNavCommunityHandlers();
            }
            this.communityAPI = null;
        }

        // Destroy scroll manager
        if (this.scrollManager) {
            this.scrollManager.destroy();
            this.scrollManager = null;
        }

        // Destroy stats renderer
        if (this.statsRenderer) {
            this.statsRenderer.destroy();
            this.statsRenderer = null;
        }

        // Destroy private message manager
        if (this.privateMessageManager) {
            this.privateMessageManager.destroy();
            this.privateMessageManager = null;
        }

        // Remove PM notification listener
        if (this._boundHandlers.onPMNotification) {
            globalThis.removeEventListener('pm:notification', this._boundHandlers.onPMNotification);
        }

        // Clear state
        this.messages = [];
        this.isInitialized = false;
        this.statsLoaded = false;
        this.messagesLoaded = false;
        this.elements = {};
    }
}

export default CommunityManager;
