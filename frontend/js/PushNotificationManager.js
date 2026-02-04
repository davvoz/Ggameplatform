/**
 * Push Notification Manager
 * Handles Web Push notification subscription and permission management.
 */

import { config } from './config.js';

const API_BASE_URL = config.API_URL;

class PushNotificationManager {
    constructor() {
        this.swRegistration = null;
        this.vapidPublicKey = null;
        this.isSupported = this._checkSupport();
    }

    /**
     * Check if push notifications are supported in this browser
     */
    _checkSupport() {
        return (
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window
        );
    }

    /**
     * Initialize the push notification system
     * @returns {Promise<boolean>} Whether initialization was successful
     */
    async init() {
        if (!this.isSupported) {
            console.warn('⚠️ Push notifications not supported in this browser');
            return false;
        }

        try {
            // Get VAPID public key from backend
            const keyResponse = await fetch(`${API_BASE_URL}/push/vapid-public-key`);
            if (!keyResponse.ok) {
                console.error('Failed to fetch VAPID public key');
                return false;
            }

            const keyData = await keyResponse.json();
            if (!keyData.configured) {
                console.warn('⚠️ Push notifications not configured on server');
                return false;
            }

            this.vapidPublicKey = keyData.public_key;

            // Wait for service worker registration
            this.swRegistration = await navigator.serviceWorker.ready;
            console.log('✅ Push notification manager initialized');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize push notifications:', error);
            return false;
        }
    }

    /**
     * Get the current notification permission status
     * @returns {string} 'granted', 'denied', or 'default'
     */
    getPermissionStatus() {
        if (!this.isSupported) return 'unsupported';
        return Notification.permission;
    }

    /**
     * Check if user has granted notification permission
     * @returns {boolean}
     */
    hasPermission() {
        return this.getPermissionStatus() === 'granted';
    }

    /**
     * Check if user has denied notification permission
     * @returns {boolean}
     */
    isDenied() {
        return this.getPermissionStatus() === 'denied';
    }

    /**
     * Request notification permission from user
     * @returns {Promise<string>} The permission result
     */
    async requestPermission() {
        if (!this.isSupported) {
            return 'unsupported';
        }

        try {
            const permission = await Notification.requestPermission();
            console.log(`📬 Notification permission: ${permission}`);
            return permission;
        } catch (error) {
            console.error('❌ Error requesting notification permission:', error);
            return 'error';
        }
    }

    /**
     * Subscribe to push notifications
     * @param {string} userId - The user ID to associate with the subscription
     * @returns {Promise<Object|null>} Subscription response or null on failure
     */
    async subscribe(userId) {
        if (!this.isSupported || !this.vapidPublicKey) {
            console.error('Push notifications not initialized');
            return null;
        }

        if (!this.hasPermission()) {
            const permission = await this.requestPermission();
            if (permission !== 'granted') {
                console.warn('User denied notification permission');
                return null;
            }
        }

        try {
            // Check for existing subscription
            let subscription = await this.swRegistration.pushManager.getSubscription();

            if (!subscription) {
                // Create new subscription
                const applicationServerKey = this._urlBase64ToUint8Array(this.vapidPublicKey);
                subscription = await this.swRegistration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey
                });
                console.log('✅ Created new push subscription');
            } else {
                console.log('ℹ️ Using existing push subscription');
            }

            // Send subscription to backend
            const subscriptionJson = subscription.toJSON();
            const response = await fetch(`${API_BASE_URL}/push/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    endpoint: subscriptionJson.endpoint,
                    keys: {
                        p256dh: subscriptionJson.keys.p256dh,
                        auth: subscriptionJson.keys.auth
                    },
                    user_agent: navigator.userAgent
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('❌ Failed to register subscription:', error);
                return null;
            }

            const result = await response.json();
            console.log('✅ Push subscription registered:', result);
            
            // Store subscription status locally
            localStorage.setItem('pushSubscribed', 'true');
            localStorage.setItem('pushSubscriptionId', result.subscription_id);
            
            return result;

        } catch (error) {
            console.error('❌ Error subscribing to push notifications:', error);
            return null;
        }
    }

    /**
     * Unsubscribe from push notifications
     * @param {string} userId - The user ID
     * @returns {Promise<boolean>} Whether unsubscription was successful
     */
    async unsubscribe(userId) {
        try {
            // Unsubscribe from browser
            const subscription = await this.swRegistration?.pushManager?.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }

            // Notify backend
            const response = await fetch(`${API_BASE_URL}/push/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    endpoint: subscription?.endpoint
                })
            });

            // Clear local storage
            localStorage.removeItem('pushSubscribed');
            localStorage.removeItem('pushSubscriptionId');

            console.log('✅ Unsubscribed from push notifications');
            return response.ok;

        } catch (error) {
            console.error('❌ Error unsubscribing:', error);
            return false;
        }
    }

    /**
     * Check if user is currently subscribed
     * @returns {Promise<boolean>}
     */
    async isSubscribed() {
        if (!this.swRegistration) return false;
        
        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            return subscription !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Send a test notification to the current user
     * @param {string} userId - The user ID
     * @returns {Promise<Object>} Test result
     */
    async sendTestNotification(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/push/test/${userId}`, {
                method: 'POST'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Test notification failed');
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Test notification error:', error);
            throw error;
        }
    }

    /**
     * Convert VAPID public key from base64 URL to Uint8Array
     * @private
     */
    _urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * Show a UI prompt to enable notifications
     * Returns a promise that resolves when user makes a choice
     * @param {string} userId - The user ID
     * @returns {Promise<{subscribed: boolean, permission: string}>}
     */
    async promptForSubscription(userId) {
        // Don't prompt if already subscribed
        if (await this.isSubscribed()) {
            return { subscribed: true, permission: 'granted' };
        }

        // Don't prompt if denied (user must manually enable in browser settings)
        if (this.isDenied()) {
            return { subscribed: false, permission: 'denied' };
        }

        // Request permission and subscribe
        const permission = await this.requestPermission();
        if (permission === 'granted') {
            const result = await this.subscribe(userId);
            return { subscribed: !!result, permission };
        }

        return { subscribed: false, permission };
    }
}

// Export singleton instance
export const pushManager = new PushNotificationManager();
export default PushNotificationManager;
