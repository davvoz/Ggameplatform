/**
 * Stunt Hill — entry point.
 * Bootstraps the app and wires the SDK (see PlatformBridge).
 */
import { Game } from './core/Game.js';
import { setMap } from './core/Terrain.js';
import { weeklyMapIndex } from './config/maps.js';
import { Menu } from './ui/Menu.js';
import { Garage } from './core/Garage.js';
import { initPlatformNotifications } from './platform/PlatformNotifications.js';

document.addEventListener('DOMContentLoaded', async () => {
  initPlatformNotifications();   // XP badge + level-up modal from the platform
  const canvas = document.getElementById('game-canvas');
  if (!canvas) { console.error('[StuntHill] canvas not found'); return; }

  // map of the week (5-track roster) — backdrop for the menu; ?map=N forces
  // one (dev/testing); the ranked backend will dictate map+seed later.
  const qp = new URLSearchParams(location.search);
  const mq = qp.get('map');
  setMap(mq != null ? parseInt(mq, 10) : weeklyMapIndex());

  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      const sdk = globalThis.PlatformSDK;
      if (sdk && typeof sdk.toggleFullscreen === 'function') sdk.toggleFullscreen();
      else if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
      fullscreenBtn.blur(); // drop focus so Space (boost) doesn't re-trigger the button
    });
  }

  globalThis.game = await Game.create(canvas);

  // garage (cars bought with platform coins) — loads saved selection + ownership
  const garage = new Garage();
  garage.init();   // async; sets the active car from the saved selection right away

  // menu ↔ game wiring
  const menu = new Menu(garage);
  menu.onPlay = (i, mode, rankedMeta) => { menu.hide(); globalThis.game.startMatch(i, mode, rankedMeta); };
  menu.previewCar = (cv, id) => globalThis.game.renderer.drawCarPreview(cv, id);
  globalThis.game.onOpenMenu = () => menu.show();

  // dev params (?map / ?start) jump straight into a run; otherwise show the menu
  if (mq != null || qp.get('start') != null) {
    globalThis.game.startMatch(mq != null ? parseInt(mq, 10) : weeklyMapIndex(), 'story');
  } else {
    menu.show();
  }

  const loading = document.getElementById('loading-screen');
  if (loading) { loading.classList.add('fade-out'); setTimeout(() => (loading.style.display = 'none'), 400); }
});
