/**
 * Fullscreen manager for Sette e Mezzo.
 * Handles native Fullscreen API + iOS CSS fallback.
 */
(function () {
    'use strict';

    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.innerWidth <= 768;
    }

    function isIOS() {
        const ua = navigator.userAgent;
        return (/iPad|iPhone|iPod/.test(ua) && !window.MSStream)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    // --- Icon update ---
    function updateIcon() {
        const btn = document.getElementById('fullscreen-btn');
        if (!btn) return;
        const isFs = document.fullscreenElement
            || document.webkitFullscreenElement
            || document.mozFullScreenElement
            || document.msFullscreenElement
            || document.body.classList.contains('ios-game-fullscreen');

        btn.innerHTML = isFs
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
    }

    // --- Fullscreen change handler ---
    function handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement
            || document.webkitFullscreenElement
            || document.body.classList.contains('ios-game-fullscreen');

        if (isFullscreen) {
            document.body.classList.add('fullscreen-active');
            if (!isMobile()) {
                const height = window.innerHeight;
                const width = Math.floor(height * 9 / 16);
                const margin = Math.floor((window.innerWidth - width) / 2);
                document.body.style.setProperty('--game-width', width + 'px');
                document.body.style.setProperty('--game-margin', margin + 'px');
            }
        } else {
            document.body.classList.remove('fullscreen-active');
            document.body.style.removeProperty('--game-width');
            document.body.style.removeProperty('--game-margin');
        }
        updateIcon();
    }

    // --- iOS CSS workaround ---
    function toggleIOSFullscreen() {
        const isFs = document.body.classList.contains('ios-game-fullscreen');
        if (isFs) {
            document.documentElement.classList.remove('ios-game-fullscreen');
            document.body.classList.remove('ios-game-fullscreen', 'game-fullscreen', 'fullscreen-active');
            document.body.style.overflow = '';
            var exitBtn = document.getElementById('ios-fs-exit');
            if (exitBtn) exitBtn.remove();
            updateIcon();
        } else {
            document.documentElement.classList.add('ios-game-fullscreen');
            document.body.classList.add('ios-game-fullscreen', 'game-fullscreen', 'fullscreen-active');
            document.body.style.overflow = 'hidden';
            createIOSExitButton();
            updateIcon();
            setTimeout(function () { window.scrollTo(0, 1); }, 100);
            setTimeout(function () { window.scrollTo(0, 1); }, 300);
        }
    }

    function createIOSExitButton() {
        if (document.getElementById('ios-fs-exit')) return;
        var btn = document.createElement('button');
        btn.id = 'ios-fs-exit';
        btn.innerHTML = '\u2715';
        btn.setAttribute('aria-label', 'Exit fullscreen');
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggleIOSFullscreen();
        });
        document.body.appendChild(btn);
    }

    // --- Toggle ---
    function toggleFullscreen() {
        // Prefer Platform SDK if available (works on iOS)
        if (window.PlatformSDK && typeof window.PlatformSDK.toggleFullscreen === 'function') {
            window.PlatformSDK.toggleFullscreen();
            return;
        }

        var elem = document.documentElement;
        var fullscreenSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled;

        if ((isIOS()) && !fullscreenSupported) {
            toggleIOSFullscreen();
            return;
        }

        var fsElement = document.fullscreenElement
            || document.webkitFullscreenElement
            || document.mozFullScreenElement
            || document.msFullscreenElement;

        if (!fsElement) {
            var requestFs = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
            if (requestFs) {
                var promise = requestFs.call(elem);
                if (promise && promise.then) {
                    promise.then(function () {
                        document.body.classList.add('game-fullscreen');
                        handleFullscreenChange();
                    }).catch(function () {
                        toggleIOSFullscreen();
                    });
                } else {
                    document.body.classList.add('game-fullscreen');
                    handleFullscreenChange();
                }
            } else {
                toggleIOSFullscreen();
            }
        } else {
            var exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
            if (exitFs) {
                var promise2 = exitFs.call(document);
                if (promise2 && promise2.then) {
                    promise2.then(function () {
                        document.body.classList.remove('game-fullscreen');
                        handleFullscreenChange();
                    }).catch(function () {});
                } else {
                    document.body.classList.remove('game-fullscreen');
                    handleFullscreenChange();
                }
            }
        }
    }

    // --- Wire events ---
    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('fullscreen-btn');
        if (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleFullscreen();
            });
        }
        updateIcon();
    });

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    window.addEventListener('resize', function () {
        var isFs = document.fullscreenElement
            || document.webkitFullscreenElement
            || document.body.classList.contains('ios-game-fullscreen');
        if (isFs) handleFullscreenChange();
    });
})();
