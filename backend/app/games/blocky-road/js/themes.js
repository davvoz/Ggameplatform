// themes.js - Map themes configuration for Blocky Road
// Each theme defines colors for terrain, decorations, sky, and gameplay modifiers

const MapThemes = {
    // ==========================================
    // DEFAULT - Classic green meadow (FREE)
    // ==========================================
    classic: {
        id: 'classic',
        name: 'Classic Meadow',
        description: 'The original green fields',
        icon: '🌿',
        price: 0, // Free
        xpMultiplier: 1.0,
        unlocked: true, // Always available

        sky: {
            background: 0x87CEEB,
            fog: null,
            hemiSkyColor: 0x87CEEB,
            hemiGroundColor: 0x5FAD56,
            bodyBackground: '#87CEEB'
        },

        terrain: {
            grass: 0x5FAD56,
            road: 0x555555,
            water: 0x2196F3,
            rail: 0x8B7355,
            roadMarkings: 0xFFFFFF
        },

        decorations: {
            trunkColor: 0x8B4513,
            foliageColor: 0x228B22,
            rockColor: 0x696969,
            grassTuftColor: 0x5FAD56,
            flowerStemColor: 0x2F8B2D,
            flowerColors: [0xFF69B4, 0xFFFF00, 0xFF6347, 0xFF00FF, 0xFFA500],
            lilyPadColor: 0x2E7D32,
            lilyFlowerColor: 0xFFB6C1,
            logColor: 0x8B4513,
            logStripeColor: 0x654321,
            // Decoration style: what spawns on grass
            smallDecor: 'flowers',     // flowers, snowdrift, tumbleweed, neon_shard, petals, embers
            groundDecor: 'grass'       // grass, snow_tuft, dry_scrub, neon_tuft, moss, ash
        },

        water: {
            surfaceColor: 0x2196F3,
            waterfallColor: 0xAADDFF,
            foamColor: 0xFFFFFF,
            opacity: 0.9
        },

        particles: {
            splashColor: 0x4FC3F7
        },

        models: {
            // Player: White rabbit
            player: {
                style: 'rabbit',
                bodyColor: 0xF8F8FF,
                headColor: 0xF8F8FF,
                accentColor: 0xFFE4E1,
                noseColor: 0xFFC0CB,
                pawColor: 0xF8F8FF,
                tailColor: 0xF8F8FF
            },
            tree: { style: 'leafy' },
            vehicleColors: [
                0xFFFFFF, 0xC0C0C0, 0x1E88E5, 0xB71C1C, 0x388E3C,
                0xFFD600, 0x757575, 0xF5F5DC, 0x003366, 0xFF0000,
                0xFF9900, 0xA0522D, 0x444444, 0x87CEEB, 0x20B2AA
            ],
            trainColors: [
                0xB71C1C, 0x1E88E5, 0x757575, 0xFFD600, 0xC0C0C0,
                0x8D6E63, 0xFF0000, 0xFF9900, 0x444444
            ],
            log: { style: 'wood' },
            lilyPad: { style: 'lily' }
        }
    },

    // ==========================================
    // CHRISTMAS - Snowy winter wonderland
    // ==========================================
    christmas: {
        id: 'christmas',
        name: 'Winter Wonderland',
        description: 'Snowy fields with festive decorations',
        icon: '🎄',
        price: 150,
        xpMultiplier: 1.25,
        unlocked: false,

        sky: {
            background: 0xB0C4DE,
            fog: { color: 0xD6E4F0, near: 30, far: 80 },
            hemiSkyColor: 0xB0C4DE,
            hemiGroundColor: 0xE8E8E8,
            bodyBackground: '#B0C4DE'
        },

        terrain: {
            grass: 0xE8E8E8,   // Snow white
            road: 0x6B6B6B,    // Icy dark road
            water: 0x5B9BD5,   // Cold blue water
            rail: 0x9E9E9E,    // Frosty gravel
            roadMarkings: 0xFFFFFF
        },

        decorations: {
            trunkColor: 0x5D4037,
            foliageColor: 0x1B5E20,  // Dark evergreen
            rockColor: 0x9E9E9E,     // Snow-covered grey
            grassTuftColor: 0xE0E0E0, // Snow tufts
            flowerStemColor: 0x795548,
            flowerColors: [0xFF0000, 0xFFD700, 0xFF0000, 0x00E676, 0xFFD700], // Red, Gold, Green (Christmas)
            lilyPadColor: 0x5B9BD5,
            lilyFlowerColor: 0xE3F2FD,
            logColor: 0x6D4C41,
            logStripeColor: 0x4E342E,
            smallDecor: 'snowdrift',
            groundDecor: 'snow_tuft'
        },

        water: {
            surfaceColor: 0x5B9BD5,
            waterfallColor: 0xBBDEFB,
            foamColor: 0xE3F2FD,
            opacity: 0.85
        },

        particles: {
            splashColor: 0x90CAF9
        },

        models: {
            // Player: Penguin
            player: {
                style: 'penguin',
                bodyColor: 0x1A1A1A,
                headColor: 0x1A1A1A,
                accentColor: 0xFFFFFF,
                noseColor: 0xFF8C00,
                pawColor: 0xFF8C00,
                tailColor: 0x1A1A1A
            },
            tree: { style: 'pine' },
            vehicleColors: [
                0xCC0000, 0x006400, 0xFFD700, 0xFFFFFF, 0xCC0000,
                0x8B0000, 0x006400, 0xB22222, 0xC0C0C0, 0xFFD700
            ],
            trainColors: [
                0xCC0000, 0x006400, 0xFFD700, 0xFFFFFF, 0x8B0000
            ],
            log: { style: 'ice' },
            lilyPad: { style: 'ice_platform' }
        }
    },

    // ==========================================
    // DESERT - Hot sandy dunes
    // ==========================================
    desert: {
        id: 'desert',
        name: 'Scorching Desert',
        description: 'Hot sandy dunes and dry riverbeds',
        icon: '🏜️',
        price: 150,
        xpMultiplier: 1.25,
        unlocked: false,

        sky: {
            background: 0xFFCC80,
            fog: { color: 0xFFE0B2, near: 40, far: 90 },
            hemiSkyColor: 0xFFCC80,
            hemiGroundColor: 0xD2B48C,
            bodyBackground: '#FFCC80'
        },

        terrain: {
            grass: 0xD2B48C,   // Sandy ground
            road: 0x8D6E63,    // Dirt road
            water: 0x26A69A,   // Oasis water (teal)
            rail: 0xA1887F,    // Sandy gravel
            roadMarkings: 0xFFECB3
        },

        decorations: {
            trunkColor: 0x6D4C41,
            foliageColor: 0x558B2F,  // Cactus green
            rockColor: 0xBCAAA4,     // Sandstone
            grassTuftColor: 0xA5D6A7, // Desert scrub
            flowerStemColor: 0x558B2F,
            flowerColors: [0xFFEB3B, 0xFF7043, 0xFFCA28, 0xFFA726, 0xEF5350], // Warm desert flowers
            lilyPadColor: 0x2E7D32,
            lilyFlowerColor: 0xFFB6C1,
            logColor: 0xA1887F,
            logStripeColor: 0x8D6E63,
            smallDecor: 'tumbleweed',
            groundDecor: 'dry_scrub'
        },

        water: {
            surfaceColor: 0x26A69A,
            waterfallColor: 0x80CBC4,
            foamColor: 0xB2DFDB,
            opacity: 0.8
        },

        particles: {
            splashColor: 0x4DB6AC
        },

        models: {
            // Player: Lizard
            player: {
                style: 'lizard',
                bodyColor: 0x7CB342,
                headColor: 0x8BC34A,
                accentColor: 0xCDDC39,
                noseColor: 0x558B2F,
                pawColor: 0x689F38,
                tailColor: 0x7CB342
            },
            tree: { style: 'cactus' },
            vehicleColors: [
                0xD2B48C, 0xA0522D, 0x8D6E63, 0xBCAAA4, 0xFFD600,
                0xF5F5DC, 0x795548, 0xA1887F, 0xD7CCC8, 0xFF8F00
            ],
            trainColors: [
                0x8D6E63, 0xA1887F, 0xD2B48C, 0x795548, 0xFFD600
            ],
            log: { style: 'sandstone' },
            lilyPad: { style: 'flat_stone' }
        }
    },

    // ==========================================
    // NEON CITY - Cyberpunk night city
    // ==========================================
    neon: {
        id: 'neon',
        name: 'Neon City',
        description: 'A glowing cyberpunk nightscape',
        icon: '🌃',
        price: 250,
        xpMultiplier: 1.5,
        unlocked: false,

        sky: {
            background: 0x0D0D2B,
            fog: { color: 0x1A1A3E, near: 25, far: 70 },
            hemiSkyColor: 0x0D0D2B,
            hemiGroundColor: 0x1A0A2E,
            bodyBackground: '#0D0D2B'
        },

        terrain: {
            grass: 0x1A1A2E,    // Dark ground
            road: 0x2C2C3E,     // Dark asphalt
            water: 0x1A237E,    // Deep neon blue
            rail: 0x37474F,     // Dark metal
            roadMarkings: 0x00E5FF
        },

        decorations: {
            trunkColor: 0x4A148C,
            foliageColor: 0x00E676,  // Neon green
            rockColor: 0x37474F,
            grassTuftColor: 0x00E676,
            flowerStemColor: 0x7C4DFF,
            flowerColors: [0xFF00FF, 0x00FFFF, 0xFF4081, 0x7C4DFF, 0x00E5FF], // Neon colors
            lilyPadColor: 0x7C4DFF,
            lilyFlowerColor: 0xFF00FF,
            logColor: 0x37474F,
            logStripeColor: 0x263238,
            smallDecor: 'neon_shard',
            groundDecor: 'neon_tuft'
        },

        water: {
            surfaceColor: 0x1A237E,
            waterfallColor: 0x7C4DFF,
            foamColor: 0xB388FF,
            opacity: 0.85
        },

        particles: {
            splashColor: 0x7C4DFF
        },

        models: {
            // Player: Robot
            player: {
                style: 'robot',
                bodyColor: 0x37474F,
                headColor: 0x455A64,
                accentColor: 0x00E5FF,
                noseColor: 0x00E5FF,
                pawColor: 0x546E7A,
                tailColor: 0x37474F
            },
            tree: { style: 'neon_pole' },
            vehicleColors: [
                0x1A1A2E, 0x0D0D2B, 0x2C2C3E, 0x16213E, 0x1A1A2E,
                0x263238, 0x37474F, 0x0D0D1A, 0x1B1B3A, 0x2C2C4E
            ],
            train: { style: 'neon' },
            trainColors: [
                0x1A1A2E, 0x0D0D2B, 0x37474F, 0x263238, 0x2C2C3E
            ],
            log: { style: 'neon_platform' },
            lilyPad: { style: 'holo_pad' }
        }
    },

    // ==========================================
    // SAKURA - Japanese cherry blossom
    // ==========================================
    sakura: {
        id: 'sakura',
        name: 'Sakura Garden',
        description: 'Peaceful cherry blossom gardens',
        icon: '🌸',
        price: 200,
        xpMultiplier: 1.35,
        unlocked: false,

        sky: {
            background: 0xFCE4EC,
            fog: { color: 0xFFF0F5, near: 35, far: 80 },
            hemiSkyColor: 0xFCE4EC,
            hemiGroundColor: 0x81C784,
            bodyBackground: '#FCE4EC'
        },

        terrain: {
            grass: 0x66BB6A,   // Bright spring green
            road: 0x8D6E63,    // Stone path
            water: 0x4DD0E1,   // Crystal water
            rail: 0xA1887F,    // Wooden rail
            roadMarkings: 0xF8BBD0
        },

        decorations: {
            trunkColor: 0x5D4037,
            foliageColor: 0xF48FB1,  // Cherry blossom pink
            rockColor: 0x78909C,     // Zen stone grey
            grassTuftColor: 0x81C784,
            flowerStemColor: 0x388E3C,
            flowerColors: [0xF48FB1, 0xF06292, 0xEC407A, 0xFFFFFF, 0xFCE4EC], // Pink blossoms
            lilyPadColor: 0x388E3C,
            lilyFlowerColor: 0xF8BBD0,
            logColor: 0x795548,
            logStripeColor: 0x5D4037,
            smallDecor: 'petals',
            groundDecor: 'moss'
        },

        water: {
            surfaceColor: 0x4DD0E1,
            waterfallColor: 0xB2EBF2,
            foamColor: 0xE0F7FA,
            opacity: 0.75
        },

        particles: {
            splashColor: 0x80DEEA
        },

        models: {
            // Player: Fox (Kitsune)
            player: {
                style: 'fox',
                bodyColor: 0xE65100,
                headColor: 0xF57C00,
                accentColor: 0xFFFFFF,
                noseColor: 0x222222,
                pawColor: 0x4E342E,
                tailColor: 0xE65100
            },
            tree: { style: 'cherry' },
            vehicleColors: [
                0xF8BBD0, 0xF48FB1, 0xCE93D8, 0xB39DDB, 0x90CAF9,
                0xFFFFFF, 0xE0E0E0, 0xBCAAA4, 0x80CBC4, 0xA5D6A7
            ],
            trainColors: [
                0xF8BBD0, 0xFFFFFF, 0xE0E0E0, 0x80CBC4, 0xBCAAA4
            ],
            log: { style: 'bamboo' },
            lilyPad: { style: 'lotus' }
        }
    },

    // ==========================================
    // LAVA - Volcanic hellscape
    // ==========================================
    lava: {
        id: 'lava',
        name: 'Volcanic Inferno',
        description: 'A fiery volcanic wasteland',
        icon: '🌋',
        price: 300,
        xpMultiplier: 1.75,
        unlocked: false,

        sky: {
            background: 0x1A0A00,
            fog: { color: 0x2D1B0E, near: 20, far: 60 },
            hemiSkyColor: 0x1A0A00,
            hemiGroundColor: 0x4E342E,
            bodyBackground: '#1A0A00'
        },

        terrain: {
            grass: 0x3E2723,    // Dark volcanic rock
            road: 0x4E342E,     // Scorched path
            water: 0xFF5722,    // Lava river!
            rail: 0x5D4037,     // Charred sleepers
            roadMarkings: 0xFF8A65
        },

        decorations: {
            trunkColor: 0x212121,
            foliageColor: 0xFF6F00,  // Fire/ember glow
            rockColor: 0x424242,     // Obsidian
            grassTuftColor: 0xBF360C, // Ember grass
            flowerStemColor: 0x4E342E,
            flowerColors: [0xFF5722, 0xFF9800, 0xFFEB3B, 0xFF3D00, 0xFF6E40], // Fire colors
            lilyPadColor: 0x4E342E,
            lilyFlowerColor: 0xFF6F00,
            logColor: 0x3E2723,
            logStripeColor: 0x212121,
            smallDecor: 'embers',
            groundDecor: 'ash'
        },

        water: {
            surfaceColor: 0xFF5722,
            waterfallColor: 0xFF9800,
            foamColor: 0xFFCC80,
            opacity: 0.95
        },

        particles: {
            splashColor: 0xFF6E40
        },

        models: {
            // Player: Fire Demon/Imp
            player: {
                style: 'demon',
                bodyColor: 0x8B0000,
                headColor: 0xB71C1C,
                accentColor: 0xFF6F00,
                noseColor: 0xFF3D00,
                pawColor: 0x4E342E,
                tailColor: 0x8B0000
            },
            tree: { style: 'dead' },
            vehicleColors: [
                0x3E2723, 0x212121, 0x424242, 0x4E342E, 0x5D4037,
                0x37474F, 0x263238, 0x1B1B1B, 0x333333, 0x4A4A4A
            ],
            trainColors: [
                0x3E2723, 0x212121, 0x4E342E, 0x424242, 0x5D4037
            ],
            log: { style: 'obsidian' },
            lilyPad: { style: 'basalt' }
        }
    }
};

// ==========================================
// Theme Manager - handles selection and persistence
// ==========================================
class ThemeManager {
    constructor() {
        this.currentTheme = MapThemes.classic;
        this.unlockedThemes = ['classic']; // Always includes classic
        // Trust localStorage preference immediately so setupScene() uses correct theme
        this.loadSelectedThemeFromCache();
        // Load purchases from backend (source of truth) — async, will re-validate + apply
        this.syncPurchasesFromBackend();
    }

    // Load theme preference from cache WITHOUT ownership check (for instant load before backend sync)
    loadSelectedThemeFromCache() {
        try {
            const saved = localStorage.getItem('blockyroad_selected_theme');
            if (saved && MapThemes[saved]) {
                this.currentTheme = MapThemes[saved];
                // Temporarily unlock so getTheme() works before backend confirms
                if (!this.unlockedThemes.includes(saved)) {
                    this.unlockedThemes.push(saved);
                }
            }
        } catch(e) {}
    }

    // Save selected theme to localStorage (just preference, not ownership)
    saveSelectedTheme(themeId) {
        try { localStorage.setItem('blockyroad_selected_theme', themeId); } catch(e) {}
    }

    // Load purchased themes from backend coin transactions (source of truth)
    async syncPurchasesFromBackend() {
        // Wait for platformConfig to be available (SDK init)
        let retries = 0;
        while (!window.platformConfig?.userId && retries < 20) {
            await new Promise(r => setTimeout(r, 250));
            retries++;
        }
        const userId = window.platformConfig?.userId;
        if (!userId) return;

        try {
            const response = await fetch(`/api/coins/${userId}/purchases/blockyroad`);
            if (!response.ok) return;
            const data = await response.json();
            const serverThemes = data.purchased_themes || [];

            // Backend is the source of truth — rebuild from server data
            this.unlockedThemes = ['classic'];
            serverThemes.forEach(themeId => {
                if (MapThemes[themeId] && !this.unlockedThemes.includes(themeId)) {
                    this.unlockedThemes.push(themeId);
                }
            });

            // Re-validate selected theme against actual ownership
            const prevThemeId = this.currentTheme.id;
            this.loadSelectedTheme();
            console.log('[ThemeManager] Loaded purchases from backend:', this.unlockedThemes);

            // If backend validation changed the theme (e.g. not actually owned), apply to live game
            if (this.currentTheme.id !== prevThemeId) {
                if (window.game && window.game.applyTheme) {
                    window.game.applyTheme();
                }
            }
            this.updateStartScreenThemeInfo();
        } catch (e) {
            console.warn('[ThemeManager] Failed to load purchases from backend:', e);
        }
    }

    // Get userId from PlatformSDK config
    getUserId() {
        return window.platformConfig?.userId || null;
    }

    // Get current theme
    getTheme() {
        return this.currentTheme;
    }

    // Set active theme
    setTheme(themeId) {
        if (MapThemes[themeId] && this.unlockedThemes.includes(themeId)) {
            this.currentTheme = MapThemes[themeId];
            this.saveSelectedTheme(themeId);
            return true;
        }
        return false;
    }

    // Load last selected theme
    loadSelectedTheme() {
        const saved = localStorage.getItem('blockyroad_selected_theme');
        if (saved && MapThemes[saved] && this.unlockedThemes.includes(saved)) {
            this.currentTheme = MapThemes[saved];
        }
    }

    // Unlock a theme (after purchase — adds to runtime list, backend transaction is the persistent record)
    unlockTheme(themeId) {
        if (!this.unlockedThemes.includes(themeId)) {
            this.unlockedThemes.push(themeId);
        }
    }

    // Check if theme is unlocked
    isUnlocked(themeId) {
        return this.unlockedThemes.includes(themeId);
    }

    // Get all themes with unlock status
    getAllThemes() {
        return Object.values(MapThemes).map(theme => ({
            ...theme,
            unlocked: this.isUnlocked(theme.id)
        }));
    }

    // Purchase a theme via platform API
    async purchaseTheme(themeId) {
        const theme = MapThemes[themeId];
        if (!theme) return { success: false, error: 'Theme not found' };
        if (this.isUnlocked(themeId)) return { success: false, error: 'Already owned' };
        if (theme.price === 0) {
            this.unlockTheme(themeId);
            return { success: true };
        }

        const userId = this.getUserId();
        if (!userId) return { success: false, error: 'Not logged in' };

        try {
            // Double-check with backend that it's not already purchased
            const checkResp = await fetch(`/api/coins/${userId}/purchases/blockyroad`);
            if (checkResp.ok) {
                const checkData = await checkResp.json();
                if ((checkData.purchased_themes || []).includes(themeId)) {
                    // Already purchased on server — just unlock locally
                    this.unlockTheme(themeId);
                    return { success: true, already_owned: true };
                }
            }

            const response = await fetch(`/api/coins/${userId}/spend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: theme.price,
                    transaction_type: 'shop_purchase',
                    source_id: `blockyroad_theme_${themeId}`,
                    description: `Purchased Blocky Road map: ${theme.name}`,
                    extra_data: { game: 'blocky-road', theme_id: themeId, theme_name: theme.name }
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.unlockTheme(themeId);
                return { success: true, balance_after: data.balance_after };
            } else if (response.status === 400) {
                return { success: false, error: 'Insufficient coins' };
            } else {
                return { success: false, error: 'Purchase failed' };
            }
        } catch (e) {
            console.error('Purchase error:', e);
            return { success: false, error: 'Network error' };
        }
    }

    // Get user's coin balance
    async getCoinBalance() {
        const userId = this.getUserId();
        if (!userId) return 0;

        try {
            const response = await fetch(`/api/coins/${userId}/balance`);
            if (response.ok) {
                const data = await response.json();
                return data.balance || 0;
            }
            return 0;
        } catch (e) {
            return 0;
        }
    }

    // ============ MAP SELECTOR UI ============

    // Open map selector overlay
    async openMapSelector() {
        const selector = document.getElementById('mapSelector');
        if (!selector) return;

        selector.style.display = 'flex';

        // Fetch balance
        const balance = await this.getCoinBalance();
        const balanceEl = document.getElementById('mapCoinBalance');
        if (balanceEl) balanceEl.textContent = `🪙 ${balance}`;

        this.renderMapGrid(balance);

        // Close button
        const closeBtn = document.getElementById('mapCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeMapSelector();
        }
    }

    // Close map selector
    closeMapSelector() {
        const selector = document.getElementById('mapSelector');
        if (selector) selector.style.display = 'none';
    }

    // Render the map grid cards
    renderMapGrid(balance) {
        const grid = document.getElementById('mapGrid');
        if (!grid) return;

        grid.innerHTML = '';
        const themes = this.getAllThemes();
        const selectedId = this.currentTheme.id;

        themes.forEach(theme => {
            const card = document.createElement('div');
            card.className = 'map-card';
            if (theme.id === selectedId) card.classList.add('selected');
            if (!theme.unlocked) card.classList.add('locked');

            // Selected badge
            let badgeHTML = '';
            if (theme.id === selectedId) {
                badgeHTML = '<div class="map-card-selected-badge">✓</div>';
            }

            // Lock icon
            let lockHTML = '';
            if (!theme.unlocked) {
                lockHTML = '<div class="map-card-lock">🔒</div>';
            }

            // Price label
            let priceHTML = '';
            if (theme.price === 0) {
                priceHTML = '<span class="map-card-price free">FREE</span>';
            } else if (theme.unlocked) {
                priceHTML = '<span class="map-card-price owned">✓ Owned</span>';
            } else {
                priceHTML = `<span class="map-card-price coins">🪙 ${theme.price}</span>`;
            }

            // XP multiplier display
            let xpText = `${theme.xpMultiplier}x XP`;
            if (theme.xpMultiplier > 1.0) {
                xpText = `⚡ ${theme.xpMultiplier}x XP`;
            }

            card.innerHTML = `
                ${badgeHTML}
                ${lockHTML}
                <div class="map-card-icon">${theme.icon}</div>
                <div class="map-card-info">
                    <div class="map-card-name">${theme.name}</div>
                    <div class="map-card-desc">${theme.description}</div>
                    <div class="map-card-meta">
                        <span class="map-card-xp">${xpText}</span>
                        ${priceHTML}
                    </div>
                </div>
            `;

            card.addEventListener('click', () => this.onMapCardClick(theme, balance));
            grid.appendChild(card);
        });
    }

    // Handle map card click
    async onMapCardClick(theme, currentBalance) {
        if (theme.unlocked) {
            // Select this theme
            this.setTheme(theme.id);
            this.updateStartScreenThemeInfo();

            // Apply theme to game if already initialized
            if (window.game && window.game.applyTheme) {
                window.game.applyTheme();
            }

            this.closeMapSelector();
        } else {
            // Try to purchase
            if (currentBalance < theme.price) {
                this.showMapMessage(`Not enough coins! Need 🪙 ${theme.price}, have 🪙 ${currentBalance}`, 'error');
                return;
            }

            // Show inline confirm (confirm() is blocked in iframes)
            this.showPurchaseConfirm(theme, currentBalance);
        }
    }

    // Show inline purchase confirmation (replaces blocked confirm() in iframe)
    showPurchaseConfirm(theme, currentBalance) {
        const content = document.querySelector('.map-selector-content');
        if (!content) return;

        // Remove existing confirm
        const existing = content.querySelector('.map-confirm-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'map-confirm-overlay';
        overlay.style.cssText = `
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85); z-index: 10;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            border-radius: 16px; padding: 24px; text-align: center;
        `;
        overlay.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 12px;">${theme.icon}</div>
            <div style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                Purchase "${theme.name}"?
            </div>
            <div style="color: #ffd700; font-size: 16px; margin-bottom: 4px;">
                🪙 ${theme.price} coins
            </div>
            <div style="color: #aaa; font-size: 14px; margin-bottom: 20px;">
                ⚡ ${theme.xpMultiplier}x XP multiplier
            </div>
            <div style="display: flex; gap: 12px;">
                <button id="confirmBuyBtn" style="
                    background: #4CAF50; color: white; border: none; padding: 12px 28px;
                    font-size: 16px; border-radius: 8px; cursor: pointer; font-weight: bold;
                ">✓ BUY</button>
                <button id="cancelBuyBtn" style="
                    background: #555; color: white; border: none; padding: 12px 28px;
                    font-size: 16px; border-radius: 8px; cursor: pointer; font-weight: bold;
                ">✕ CANCEL</button>
            </div>
        `;

        content.style.position = 'relative';
        content.appendChild(overlay);

        document.getElementById('cancelBuyBtn').addEventListener('click', () => {
            overlay.remove();
        });

        document.getElementById('confirmBuyBtn').addEventListener('click', async () => {
            overlay.remove();
            const result = await this.purchaseTheme(theme.id);
            if (result.success) {
                this.setTheme(theme.id);
                this.updateStartScreenThemeInfo();

                if (window.game && window.game.applyTheme) {
                    window.game.applyTheme();
                }

                const newBalance = result.balance_after !== undefined
                    ? result.balance_after : (currentBalance - theme.price);
                const balanceEl = document.getElementById('mapCoinBalance');
                if (balanceEl) balanceEl.textContent = `🪙 ${newBalance}`;

                this.renderMapGrid(newBalance);
                this.showMapMessage(`🎉 "${theme.name}" unlocked!`, 'success');
            } else {
                this.showMapMessage(result.error || 'Purchase failed', 'error');
            }
        });
    }

    // Show a temporary message on the map selector
    showMapMessage(text, type) {
        const content = document.querySelector('.map-selector-content');
        if (!content) return;

        // Remove existing message
        const existing = content.querySelector('.map-message');
        if (existing) existing.remove();

        const msg = document.createElement('div');
        msg.className = 'map-message';
        msg.style.cssText = `
            padding: 10px 16px;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            color: ${type === 'error' ? '#ff4444' : '#4CAF50'};
            background: ${type === 'error' ? 'rgba(255,68,68,0.1)' : 'rgba(76,175,80,0.1)'};
        `;
        msg.textContent = text;
        content.insertBefore(msg, content.querySelector('.map-grid'));

        setTimeout(() => msg.remove(), 3000);
    }

    // Update start screen theme info display
    updateStartScreenThemeInfo() {
        const theme = this.getTheme();
        const iconEl = document.getElementById('currentThemeIcon');
        const nameEl = document.getElementById('currentThemeName');
        const xpEl = document.getElementById('currentThemeXP');

        if (iconEl) iconEl.textContent = theme.icon;
        if (nameEl) nameEl.textContent = theme.name;
        if (xpEl) {
            xpEl.textContent = theme.xpMultiplier > 1.0
                ? `⚡ ${theme.xpMultiplier}x XP`
                : `${theme.xpMultiplier}x XP`;
        }
    }

    // Initialize UI bindings (call after DOM ready)
    initUI() {
        // Map select button on start screen
        const mapBtn = document.getElementById('mapSelectBtn');
        if (mapBtn) {
            mapBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openMapSelector();
            });
        }

        // Map select button on game over screen
        const mapBtnGameOver = document.getElementById('mapSelectBtnGameOver');
        if (mapBtnGameOver) {
            mapBtnGameOver.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openMapSelector();
            });
        }

        // Update theme display on start screen
        this.updateStartScreenThemeInfo();
    }
}

// Global theme manager instance
const themeManager = new ThemeManager();
