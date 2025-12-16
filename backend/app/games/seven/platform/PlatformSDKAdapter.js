/**
 * Platform SDK Adapter
 * Dependency Inversion Principle: Abstracts external SDK dependency
 */

export class PlatformSDKAdapter {
  constructor() {
    this._sdk = window.PlatformSDK;
    this._userId = null;
    this._config = null;
    this._sessionId = null;
  }

  isAvailable() {
    return Boolean(this._sdk);
  }

  async sendScore(score, extraData) {
    if (!this.isAvailable()) {
      return;
    }

    try {
      await this._sdk.sendScore(score, { extra_data: extraData });
    } catch (error) {
      // Silent fail - non-blocking
    }
  }

  sendGameStarted() {
    try {
      console.log('[PlatformSDKAdapter] Sending gameStarted event');
      window.parent.postMessage({
        type: 'gameStarted',
        payload: {},
        timestamp: Date.now(),
        protocolVersion: '1.0.0'
      }, '*');
    } catch (error) {
      console.error('[PlatformSDKAdapter] Error sending gameStarted:', error);
    }
  }

  async gameOver(score, extraData) {
    if (!this.isAvailable()) {
      return;
    }

    try {
      await this._sdk.gameOver(score, { extra_data: extraData });
    } catch (error) {
      // Silent fail - non-blocking
    }
  }

  async resetSession() {
    if (!this.isAvailable()) {
      return;
    }

    try {
      await this._sdk.resetSession();
    } catch (error) {
      // Silent fail - non-blocking
    }
  }



  async initialize(callbacks) {
    if (!this.isAvailable()) {
      throw new Error('Platform SDK not available');
    }

    // Listen for config event to capture userId
    this._sdk.on('config', (config) => {
      console.log('[PlatformSDKAdapter] Config received:', config);
      this._config = config;
      if (config && config.userId) {
        this._userId = config.userId;
        console.log('[PlatformSDKAdapter] ✅ UserId saved:', this._userId);
      } else {
        console.warn('[PlatformSDKAdapter] ⚠️ No userId in config');
      }
    });

    await this._sdk.init(callbacks);
    
    // Multiple fallback checks for userId
    if (!this._userId) {
      // Check window.platformConfig
      if (window.platformConfig && window.platformConfig.userId) {
        this._userId = window.platformConfig.userId;
        this._config = window.platformConfig;
        console.log('[PlatformSDKAdapter] ✅ UserId from window.platformConfig:', this._userId);
      }
      // Check if SDK has getConfig method
      else if (this._sdk.getConfig && typeof this._sdk.getConfig === 'function') {
        const config = this._sdk.getConfig();
        if (config && config.userId) {
          this._userId = config.userId;
          this._config = config;
          console.log('[PlatformSDKAdapter] ✅ UserId from SDK.getConfig():', this._userId);
        }
      }
      // Try localStorage
      else {
        const storedUserId = localStorage.getItem('platformUserId');
        if (storedUserId) {
          this._userId = storedUserId;
          console.log('[PlatformSDKAdapter] ✅ UserId from localStorage:', this._userId);
        } else {
          console.warn('[PlatformSDKAdapter] ⚠️ Could not find userId from any source');
        }
      }
    }
  }
  
  _ensureUserId() {
    if (this._userId) return this._userId;
    
    // Try multiple sources
    if (window.platformConfig?.userId) {
      this._userId = window.platformConfig.userId;
      return this._userId;
    }
    
    if (this._sdk?.getConfig) {
      const config = this._sdk.getConfig();
      if (config?.userId) {
        this._userId = config.userId;
        return this._userId;
      }
    }
    
    const stored = localStorage.getItem('platformUserId');
    if (stored) {
      this._userId = stored;
      return this._userId;
    }
    
    return null;
  }

  async getUserBalance() {
    try {
      const userId = this._ensureUserId();
      if (!userId) {
        console.error('[PlatformSDKAdapter] No userId available');
        return null;
      }
      
      console.log('[PlatformSDKAdapter] Fetching balance for user:', userId);
      
      // Call platform coin API with actual user ID
      const response = await fetch(`/api/coins/${userId}/balance`, {
        credentials: 'include'
      });
      
      console.log('[PlatformSDKAdapter] Balance response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PlatformSDKAdapter] Failed to get balance:', response.status, errorText);
        return null;
      }
      
      const data = await response.json();
      console.log('[PlatformSDKAdapter] Balance data received:', data);
      return data.balance;
    } catch (error) {
      console.error('[PlatformSDKAdapter] Exception getting user balance:', error);
      return null;
    }
  }

  async spendCoins(amount, description = 'Game bet') {
    try {
      const userId = this._ensureUserId();
      if (!userId) {
        console.error('[PlatformSDKAdapter] No userId available for spending');
        return false;
      }
      
      const response = await fetch(`/api/coins/${userId}/spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount,
          transaction_type: 'game_bet',
          source_id: 'seven',
          description
        })
      });
      
      if (!response.ok) {
        console.warn('Failed to spend coins, status:', response.status);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to spend coins:', error);
      return false;
    }
  }

  async awardCoins(amount, description = 'Game win') {
    try {
      const userId = this._ensureUserId();
      if (!userId) {
        console.error('[PlatformSDKAdapter] No userId available for awarding');
        return false;
      }
      
      const payload = {
        amount: parseInt(amount),
        transaction_type: 'game_win',
        source_id: 'seven',
        description: String(description)
      };

      console.log('[PlatformSDKAdapter] Awarding coins:', payload);
      
      const response = await fetch(`/api/coins/${userId}/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to award coins:', response.status, errorText);
        return false;
      }
      
      const result = await response.json();
      console.log('[PlatformSDKAdapter] Award successful:', result);
      return true;
    } catch (error) {
      console.error('Failed to award coins:', error);
      return false;
    }
  }

  async startSession() {
    try {
      const userId = this._ensureUserId();
      if (!userId) {
        console.error('[PlatformSDKAdapter] No userId available for starting session');
        return null;
      }

      console.log('[PlatformSDKAdapter] Starting session for user:', userId);

      const response = await fetch('/users/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          game_id: 'seven'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PlatformSDKAdapter] Failed to start session:', response.status, errorText);
        return null;
      }

      const result = await response.json();
      this._sessionId = result.session.session_id;
      console.log('[PlatformSDKAdapter] Session started:', this._sessionId);
      return result.session;
    } catch (error) {
      console.error('[PlatformSDKAdapter] Exception starting session:', error);
      return null;
    }
  }

  async endSession(score, extraData = null) {
    try {
      if (!this._sessionId) {
        console.warn('[PlatformSDKAdapter] No active session to end');
        return null;
      }

      console.log('[PlatformSDKAdapter] Ending session:', this._sessionId, 'with score:', score);

      const payload = {
        session_id: this._sessionId,
        score: Math.floor(score),  // Ensure integer
        duration_seconds: 1,  // Minimum 1 second
        extra_data: extraData || {}
      };

      console.log('[PlatformSDKAdapter] Payload to send:', payload);

      const response = await fetch('/users/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PlatformSDKAdapter] Failed to end session:', response.status, errorText);
        return null;
      }

      const result = await response.json();
      console.log('[PlatformSDKAdapter] Session ended successfully');
      
      const sessionId = this._sessionId;
      this._sessionId = null;
      
      return result.session;
    } catch (error) {
      console.error('[PlatformSDKAdapter] Exception ending session:', error);
      return null;
    }
  }

  showXPNotification(xpAmount, sessionData) {
    if (!this.isAvailable()) {
      return;
    }

    try {
      console.log('[PlatformSDKAdapter] Showing XP notification:', xpAmount);
      
      // Send message to RuntimeShell to show XP banner
      window.parent.postMessage({
        type: 'showXPBanner',
        payload: {
          xp_earned: xpAmount,
          xp_breakdown: sessionData?.xp_breakdown || [],
          extra_data: sessionData?.metadata || sessionData?.extra_data || null
        },
        timestamp: Date.now(),
        protocolVersion: '1.0.0'
      }, '*');
    } catch (error) {
      console.error('[PlatformSDKAdapter] Error showing XP notification:', error);
    }
  }
}
