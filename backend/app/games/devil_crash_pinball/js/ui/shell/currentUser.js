/**
 * Resolve the platform's currently-authenticated user_id.
 *
 * Source of truth: {@link PlatformIdentity}, populated by PlatformBridge when
 * it receives the platform's `config` postMessage. NO localStorage reads —
 * the game owns no persisted identity.
 *
 * @returns {string|null} the user_id, or null if no platform identity yet.
 */
import { PlatformIdentity } from '../../platform/PlatformIdentity.js';

export function getCurrentUserId() {
    return PlatformIdentity.getUserId();
}
