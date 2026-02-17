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
        this.authManager = options.authManager || window.AuthManager;
        
        // Services
        this.communityAPI = null;
        this.scrollManager = null;
        this.statsRenderer = null;
        
        // State
        this.messages = [];
        this.currentSection = 'chat';
        this.isInitialized = false;
        this.statsLoaded = false;
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
            onStatsUpdate: this._handleStatsUpdate.bind(this)
        };
    }

    /**
     * Initialize the community manager
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('[CommunityManager] Initializing...');
        
        // Cache DOM elements
        this._cacheElements();
        
        // Setup event listeners
        this._setupEventListeners();
        
        // Get user info
        const user = this.authManager?.getUser();
        
        // Initialize WebSocket API
        this.communityAPI = new CommunityAPI({
            userId: user?.user_id || `anon_${Date.now()}`,
            username: user?.username || 'Anonymous',
            onMessage: this._boundHandlers.onMessage,
            onConnect: this._boundHandlers.onConnect,
            onDisconnect: this._boundHandlers.onDisconnect,
            onError: this._boundHandlers.onError,
            onHistoryLoad: this._boundHandlers.onHistoryLoad,
            onStatsUpdate: this._boundHandlers.onStatsUpdate
        });
        
        // Connect to WebSocket
        try {
            await this.communityAPI.connect();
        } catch (error) {
            console.error('[CommunityManager] Failed to connect:', error);
            this._updateConnectionStatus('disconnected', 'Connection failed');
        }
        
        this.isInitialized = true;
        console.log('[CommunityManager] Initialized');
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
            
            // Header
            headerStatus: document.querySelector('.chat-header-status'),
            statusIndicator: document.getElementById('headerStatusIndicator'),
            statusText: document.getElementById('headerStatusText'),
            onlineCount: document.getElementById('onlineCount'),
            
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
    }

    /**
     * Handle new message from WebSocket
     * @private
     * @param {Object} message
     */
    _handleNewMessage(message) {
        console.log('[CommunityManager] New message:', message);
        
        // Add to messages array (at the end for chronological order)
        this.messages.push(message);
        
        // Keep only last 100 messages
        if (this.messages.length > 100) {
            this.messages = this.messages.slice(-100);
        }
        
        // Check if near bottom before adding message
        const wasNearBottom = this._isNearBottom();
        
        // Render new message
        const messageEl = this._renderMessage(message, 0);
        if (messageEl && this.elements.chatMessages) {
            this.elements.chatMessages.appendChild(messageEl);
            
            // Remove excess messages from DOM (oldest first)
            while (this.elements.chatMessages.children.length > 100) {
                this.elements.chatMessages.firstChild.remove();
            }
        }
        
        // Auto-scroll or show badge
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
        
        // Update stats
        this.stats.totalMessages++;
        this._updateStats();
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
        console.log('[CommunityManager] History loaded:', messages.length, 'messages');
        
        // Messages come from backend newest first, reverse for chronological order (oldest first)
        this.messages = [...messages].reverse();
        this._renderAllMessages();
        
        // Show empty state if no messages
        if (messages.length === 0) {
            this._showEmptyState();
        }
    }

    /**
     * Handle WebSocket connection
     * @private
     */
    _handleConnect() {
        console.log('[CommunityManager] Connected');
        this._updateConnectionStatus('connected', 'Connected');
        
        // Request message history
        this.communityAPI.requestHistory(0, 50);
    }

    /**
     * Handle WebSocket disconnection
     * @private
     */
    _handleDisconnect() {
        console.log('[CommunityManager] Disconnected');
        this._updateConnectionStatus('disconnected', 'Disconnected - Reconnecting...');
    }

    /**
     * Handle WebSocket error
     * @private
     * @param {Error} error
     */
    _handleError(error) {
        console.error('[CommunityManager] Error:', error);
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
        
        // Get avatar initial
        const initial = (message.username || 'A').charAt(0).toUpperCase();
        
        // Format timestamp
        const time = this._formatTime(message.timestamp || message.created_at);
        
        // Process message text (links, etc.)
        const processedText = this._processMessageText(message.text || '');
        
        // Build media HTML
        let mediaHtml = '';
        if (message.image_url) {
            mediaHtml += `<img class="message-image" src="${this._escapeHtml(message.image_url)}" alt="Shared image" loading="lazy" data-lightbox="true">`;
        }
        if (message.gif_url) {
            mediaHtml += `<img class="message-gif" src="${this._escapeHtml(message.gif_url)}" alt="GIF" loading="lazy" data-lightbox="true">`;
        }
        
        messageEl.innerHTML = `
            <div class="message-avatar">${initial}</div>
            <div class="message-bubble">
                <div class="message-header">
                    <span class="message-username">${this._escapeHtml(message.username || 'Anonymous')}</span>
                </div>
                ${processedText ? `<div class="message-text">${processedText}</div>` : ''}
                ${mediaHtml}
                <div class="message-footer">
                    <span class="message-time">${time}</span>
                </div>
            </div>
        `;
        
        // Add click handlers for images
        const images = messageEl.querySelectorAll('[data-lightbox="true"]');
        images.forEach(img => {
            img.addEventListener('click', () => this._openLightbox(img.src));
        });
        
        return messageEl;
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
        lightbox.innerHTML = `
            <button class="image-lightbox-close" title="Close">✕</button>
            <img src="${this._escapeHtml(imageUrl)}" alt="Full size image">
        `;
        
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
        
        this.elements.chatMessages.innerHTML = '';
        
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
        
        this.elements.chatMessages.innerHTML = `
            <div class="chat-empty-state">
                <div class="empty-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Be the first to say hello to the community!</p>
            </div>
        `;
    }

    /**
     * Process message text for links and formatting
     * @private
     * @param {string} text
     * @returns {string}
     */
    _processMessageText(text) {
        // Escape HTML first
        let processed = this._escapeHtml(text);
        
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s<]+)/gi;
        processed = processed.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        return processed;
    }

    /**
     * Escape HTML to prevent XSS
     * @private
     * @param {string} text
     * @returns {string}
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        
        if (picker) {
            picker.classList.toggle('active');
            return;
        }
        
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
        
        picker.classList.add('active');
        
        // Close on click outside (with delay to avoid immediate close)
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
                console.error('[CommunityManager] Upload error:', error);
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
        toast.className = `chat-toast chat-toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
        `;
        
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
     * Switch between chat and stats sections
     * @param {string} section - 'chat' or 'stats'
     * @private
     */
    _switchSection(section) {
        this.currentSection = section;

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

        // Lazy-load stats on first switch
        if (section === 'stats' && !this.statsLoaded) {
            this._initStats();
        }

        console.log(`[CommunityManager] Switched to section: ${section}`);
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
            console.error('[CommunityManager] Stats init error:', err);
            if (this.elements.statsSection) {
                this.elements.statsSection.innerHTML = `
                    <div class="cs-error">
                        <span class="cs-error-icon">⚠️</span>
                        <p>Failed to load community stats.</p>
                    </div>`;
            }
        }
    }

    /**
     * Cleanup and destroy manager
     */
    destroy() {
        console.log('[CommunityManager] Destroying...');
        
        // Disconnect WebSocket
        if (this.communityAPI) {
            this.communityAPI.disconnect();
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
        
        // Clear state
        this.messages = [];
        this.isInitialized = false;
        this.statsLoaded = false;
        this.elements = {};
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommunityManager;
}

// Global export for non-module scripts
if (typeof window !== 'undefined') {
    window.CommunityManager = CommunityManager;
}
