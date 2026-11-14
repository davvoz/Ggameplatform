import { platformFullscreen } from '../net/platform.js';

/** Full screen: inside the platform it asks the platform, alone the browser. */
export function toggleFullscreen() {
    if (platformFullscreen()) return;
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    } else {
        document.documentElement.requestFullscreen?.().catch(() => {});
    }
}
