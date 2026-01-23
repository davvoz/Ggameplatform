/**
 * Game Core
 * Main game logic with advanced merge mechanics
 */

import { CONFIG, CANNON_TYPES, MERGE_LEVELS, ZOMBIE_TYPES, SHOP_ITEMS, SPECIAL_ABILITIES } from './config.js';
import { Utils } from './utils.js';
import { ParticleSystem } from './particles.js';
import { EntityManager } from './entities.js';
import { AudioEngine } from './audio.js';
import { CombatSystem } from './combat.js';

export class Game {
    constructor(graphics, input, ui) {
        this.graphics = graphics;
        this.input = input;
        this.ui = ui;
        
        // Tutorial system (will be set by main.js)
        this.tutorial = null;

        this.entities = new EntityManager();
        this.particles = new ParticleSystem();
        this.audio = new AudioEngine();

        this.state = this.createInitialState();

        // Initialize combat system (OOP-based)
        this.combatSystem = new CombatSystem(this);

        this.setupInputHandlers();
        this.performanceMonitor = Utils.createPerformanceMonitor();

        // Music will be started after tutorial prompt (in main.js)
    }

    createInitialState() {
        return {
            // Resources
            coins: CONFIG.INITIAL_COINS,
            energy: CONFIG.INITIAL_ENERGY,

            // Wave management
            wave: 1,
            waveInProgress: false,
            waveZombiesTotal: CONFIG.BASE_WAVE_ZOMBIES,
            waveZombiesSpawned: 0,
            lastSpawnTime: 0,
            waveClearBonus: 0,

            // Scoring
            score: 0,
            kills: 0,
            highestLevel: 1,
            combos: 0,

            // Session tracking for XP system
            towerMerges: 0,
            towersPlaced: 0,
            coinsEarned: 0,

            // Game state
            isPaused: false,
            isGameOver: false,
            playTime: 0,
            
            // Tutorial mode - prevents waves from starting
            tutorialMode: false,

            // Merge system
            selectedCannons: [],
            cannonLimit: CONFIG.COLS * CONFIG.DEFENSE_ZONE_ROWS,

            // UI state
            showMergeHint: false,
            mergeHintPos: null,

            // Energy display animation (displayEnergy si avvicina gradualmente a energy)
            displayEnergy: CONFIG.INITIAL_ENERGY,
            energyAnimSpeed: 50, // mattoncini al secondo (più lento = più visibile)

            // Shop and Bonus System
            activeBoosts: [], // Array di boost attivi: {id, type, effect, startTime, duration, endTime}
            shopOpen: false,

            // Screen shake for explosions
            screenShake: { x: 0, y: 0, intensity: 0, duration: 0 },

            // Tower drag state for visual feedback
            draggingTower: null,      // The cannon being dragged
            dragCurrentPos: null,     // Current screen position {x, y}
            dragTargetGrid: null,     // Current target grid position {col, row}

            // Special Abilities System
            specialAbilities: {
                BOMB: {
                    level: 1,
                    lastUsed: 0,
                    uses: 0, // Total uses for tracking/XP
                    kills: 0 // Kills with this ability
                },
                PUSHBACK: {
                    level: 1,
                    lastUsed: 0,
                    uses: 0,
                    enemiesPushed: 0
                },
                STUN: {
                    level: 1,
                    lastUsed: 0,
                    uses: 0,
                    enemiesStunned: 0
                }
            }
        };
    }

    setupInputHandlers() {
        // Tap handler
        this.input.onTap((gridPos, screenPos) => {
            // Handle tutorial prompt tap first (if tutorialPrompt is active via main.js)
            if (window.handleTutorialPromptTap && window.handleTutorialPromptTap(screenPos)) {
                return;
            }
            
            // Handle tutorial tap if active
            if (this.tutorial && this.tutorial.isActive) {
                if (this.tutorial.handleTap(screenPos)) {
                    return; // Tutorial consumed the tap
                }
                // If tutorial didn't consume it, let it pass through for action steps
            }
            
            if (this.state.isGameOver) {
                // Check if continue button was clicked
                if (this.ui.isContinueButtonClicked(screenPos.x, screenPos.y)) {
                    this.continueGame();
                    return;
                }
                // Check if retry button was clicked
                if (this.ui.isRetryButtonClicked(screenPos.x, screenPos.y)) {
                    this.restart();
                    return;
                }
                // Check if exit fullscreen button was clicked
                if (this.ui.isExitFullscreenButtonClicked(screenPos.x, screenPos.y)) {
                    this.exitFullscreen();
                }
                return;
            }

            // Check UI interaction (allow settings interaction even when paused)
            const uiAction = this.ui.handleTap(gridPos, screenPos, this.state);

            if (uiAction) {
                if (uiAction.type === 'settings') {
                    // Handle settings actions (always allowed)
                    if (uiAction.action === 'open') {
                        // Pause game when opening settings
                        this.pause();
                    } else if (uiAction.action === 'close') {
                        // Resume game when closing settings
                        this.resume();
                    } else if (uiAction.action === 'fullscreen') {
                        this.toggleFullscreen();
                    } else if (uiAction.action === 'music') {
                        this.audio.toggle();
                    } else if (uiAction.action === 'checkbox') {
                        // Checkbox toggled - handled in UI
                    } 
                    return;
                }
                
                // Handle info pages actions
                if (uiAction.type === 'info') {
                    if (uiAction.action === 'open') {
                        // Pause game when opening info pages
                        this.pause();
                        // Notify tutorial system
                        if (this.tutorial && this.tutorial.isActive) {
                            this.tutorial.onGameAction('mtdpedia_opened', {});
                        }
                    } else if (uiAction.action === 'close') {
                        // Resume game when closing info pages
                        this.resume();
                    }
                    // Other info page actions like tab_switch, drag_start are handled internally
                    return;
                }
                
                // Other actions blocked when paused
                if (this.state.isPaused) return;
                
                if (uiAction.type === 'ability') {
                    // Handle special ability actions
                    if (uiAction.action === 'activate') {
                        this.activateSpecialAbility(uiAction.abilityId);
                    } else if (uiAction.action === 'bomb_placed') {
                        // Bomb placement is handled via callback
                    } else if (uiAction.action === 'cancel_targeting') {
                        // Targeting cancelled - re-enable drag detection
                        this.input.setDragEnabled(true);
                    }
                } else if (uiAction.type === 'shop') {
                    // Handle shop actions
                    if (uiAction.action === 'purchase' && uiAction.item) {
                        this.purchaseShopItem(uiAction.item.id);
                    } else if (uiAction.action === 'select') {
                        // Shop tower button selected - visual feedback
                        this.particles.emit(gridPos.col, gridPos.row, {
                            text: '✓',
                            color: CONFIG.COLORS.TEXT_PRIMARY,
                            vy: -1,
                            life: 0.5
                        });
                    }
                } else if (uiAction.type === 'grid') {
                    this.handleGridTap(gridPos);
                }
            }
        });

        // Drag handler for merge system and info pages scrolling
        this.input.onDrag((gridPos, screenPos, isFirstDrag) => {
            // Check if info pages need to handle the drag (for scrolling)
            if (this.ui.handleDragMove(screenPos)) {
                return; // Info pages consumed the drag
            }
            
            // Track tower dragging for visual feedback
            if (this.state.isPaused || this.state.isGameOver) return;
            
            // Get the start grid position from input handler
            const startGridPos = this.input.getDragStartGridPos();
            if (!startGridPos) return;
            
            // Find the cannon at the start position (only on first drag)
            if (!this.state.draggingTower) {
                const cannon = this.entities.getCannon(startGridPos.col, startGridPos.row);
                if (cannon) {
                    this.state.draggingTower = cannon;
                }
            }
            
            // Update drag position
            if (this.state.draggingTower) {
                this.state.dragCurrentPos = { x: screenPos.x, y: screenPos.y };
                this.state.dragTargetGrid = gridPos;
            }
        });
        
        this.input.onDragEnd((startPos, endPos) => {
            // Handle info pages drag end
            this.ui.handleDragEnd();
            
            // Clear drag state
            this.state.draggingTower = null;
            this.state.dragCurrentPos = null;
            this.state.dragTargetGrid = null;
            
            if (this.state.isPaused || this.state.isGameOver) return;

            this.handleDragMerge(startPos, endPos);
        });
    }

    handleGridTap(gridPos) {
        const cannon = this.entities.getCannon(gridPos.col, gridPos.row);

        if (cannon) {
            // Check if we're in tower upgrade mode
            if (this.state.selectingTowerForUpgrade) {
                this.upgradeTower(cannon);
                return;
            }
            
            // Toggle cannon selection for merge
            this.toggleCannonSelection(cannon);
        } else {
            // Place new cannon
            this.placeCannon(gridPos.col, gridPos.row);
        }
    }

    placeCannon(col, row) {
        const cannonType = this.ui.getSelectedCannonType();
        const cannonDef = CANNON_TYPES[cannonType];
        // Meccanica: prezzo che aumenta ogni volta che si piazza una torretta di quel tipo
        if (!this.state.cannonPriceMultiplier) this.state.cannonPriceMultiplier = {};
        if (!this.state.cannonPriceMultiplier[cannonType]) this.state.cannonPriceMultiplier[cannonType] = 1;

        // Check if tutorial restricts this tower type
        if (this.ui.tutorialAllowedTowers && 
            this.ui.tutorialAllowedTowers.length > 0 && 
            !this.ui.tutorialAllowedTowers.includes(cannonType)) {
            // Force switch to allowed tower and show warning
            this.ui.selectedCannonType = this.ui.tutorialAllowedTowers[0];
            this.particles.createWarningEffect(col, row, '🔒 BASIC!');
            this.audio.uiError();
            return;
        }

        // Check if in defense zone
        if (!this.ui.isInDefenseZone(row)) {
            this.particles.createWarningEffect(col, row, '❌');
            this.audio.uiError();
            return;
        }

        // Check if position occupied
        if (this.entities.getCannon(col, row)) {
            this.audio.uiError();
            return;
        }

        // Calcola costo con moltiplicatore
        const baseCost = typeof calculateTowerCost === 'function' ?
            calculateTowerCost(cannonType, 1) : cannonDef.cost;
        const actualCost = Math.floor(baseCost * this.state.cannonPriceMultiplier[cannonType]);
        if (this.state.coins < actualCost) {
            this.particles.createWarningEffect(col, row, '💰');
            this.audio.uiError();
            return;
        }

        // Check cannon limit
        if (this.entities.cannons.length >= this.state.cannonLimit) {
            this.particles.createWarningEffect(col, row, 'FULL!');
            this.audio.uiError();
            return;
        }

        // Place cannon
        this.state.coins -= actualCost;
        this.entities.addCannon(col, row, cannonType);
        this.particles.createPlacementEffect(col, row);
        this.audio.towerPlace();

        // Aumenta il prezzo della torretta di 1/4 (25%)
        this.state.cannonPriceMultiplier[cannonType] = parseFloat((this.state.cannonPriceMultiplier[cannonType] * 1.25).toFixed(3));

        // Track for XP system
        this.state.towersPlaced++;
        
        // Notify tutorial system
        if (this.tutorial && this.tutorial.isActive) {
            this.tutorial.onGameAction('tower_placed', { col, row, type: cannonType });
        }
    }

    toggleCannonSelection(cannon) {
        const index = this.state.selectedCannons.indexOf(cannon);

        if (index >= 0) {
            // Deselect
            cannon.selected = false;
            this.state.selectedCannons.splice(index, 1);
            this.audio.uiClick();
        } else {
            // Select
            cannon.selected = true;
            this.state.selectedCannons.push(cannon);
            this.audio.uiClick();

            // Check for auto-merge (3 of same type and level)
            if (this.state.selectedCannons.length === 3) {
                this.checkMerge();
            }
        }
    }

    checkMerge() {
        const selected = this.state.selectedCannons;

        if (selected.length !== 3) return;

        const first = selected[0];
        const allSame = selected.every(c =>
            c.type === first.type && c.level === first.level
        );

        if (allSame && first.level < MERGE_LEVELS.length) {
            // MERGE!
            this.performMerge(selected);
        } else {
            // Not compatible - deselect all
            this.deselectAll();
            this.particles.createWarningEffect(first.col, first.row, '❌ NO MATCH');
            this.audio.uiError();
        }
    }

    performMerge(cannons) {
        // Use position of the last selected cannon
        const targetCannon = cannons[cannons.length - 1];
        const col = targetCannon.col;
        const row = targetCannon.row;
        const type = targetCannon.type;
        const newLevel = targetCannon.level + 1;

        // Remove all selected cannons first
        cannons.forEach(cannon => {
            this.entities.removeCannon(cannon);
        });

        // Create upgraded cannon at target position
        const newCannon = this.entities.addCannon(col, row, type);
        newCannon.level = newLevel;
        
        // Apply boosts to the new cannon if there are active boosts
        const hasActiveBoosts = this.state.activeBoosts && this.state.activeBoosts.length > 0;
        if (hasActiveBoosts) {
            const boostMultipliers = {
                damage: this.getBoostMultiplier('damage_multiplier'),
                range: this.getBoostMultiplier('range_multiplier'), 
                fireRate: this.getBoostMultiplier('firerate_multiplier')
            };
            newCannon.updateStats(boostMultipliers);
        } else {
            newCannon.updateStats();
        }

        // Update highest level reached
        if (newLevel > this.state.highestLevel) {
            this.state.highestLevel = newLevel;
        }

        // Visual feedback
        this.particles.createMergeEffect(col, row);
        this.audio.towerMerge();

        // Score bonus
        const mergeBonus = Math.floor(100 * Math.pow(2, newLevel - 1));
        this.state.score += mergeBonus;
        this.particles.emit(col, row, {
            text: `+${Utils.formatNumber(mergeBonus)}`,
            color: CONFIG.COLORS.TEXT_WARNING,
            vy: -2,
            life: 1.5,
            scale: 1.5,
            glow: true
        });

        // Track merges for XP system
        this.state.towerMerges++;
        
        // Notify tutorial system
        if (this.tutorial && this.tutorial.isActive) {
            this.tutorial.onGameAction('towers_merged', { col, row, type, newLevel });
        }

        // Clear selection
        this.deselectAll();
    }

    handleDragMerge(startPos, endPos) {
        // Drag merge disabled - merging is only allowed via selection
        // Only allow moving cannons to empty positions
        const sourceCannon = this.entities.getCannon(startPos.col, startPos.row);
        const targetCannon = this.entities.getCannon(endPos.col, endPos.row);

        if (!sourceCannon) return;

        // Only move if target position is empty (no merge via drag)
        if (!targetCannon) {
            // Move cannon to new position if valid
            if (this.ui.isInDefenseZone(endPos.row) &&
                this.ui.isValidGridPos(endPos)) {
                // Check if actually moved to a different position
                const didMove = sourceCannon.col !== endPos.col || sourceCannon.row !== endPos.row;
                
                sourceCannon.col = endPos.col;
                sourceCannon.row = endPos.row;
                this.particles.emit(endPos.col, endPos.row, {
                    text: '↔️',
                    color: CONFIG.COLORS.TEXT_PRIMARY,
                    vy: -0.5,
                    life: 0.5
                });
                
                // Notify tutorial system if tower was actually moved
                if (didMove && this.tutorial && this.tutorial.isActive) {
                    this.tutorial.onGameAction('tower_moved', { 
                        from: startPos, 
                        to: endPos, 
                        type: sourceCannon.type 
                    });
                }
            }
        }
        // If targetCannon exists, do nothing - merge only via selection
    }

    findMatchingCannons(cannon) {
        return this.entities.cannons.filter(c =>
            c !== cannon && c.canMergeWith(cannon)
        );
    }

    deselectAll() {
        this.state.selectedCannons.forEach(c => c.selected = false);
        this.state.selectedCannons = [];
    }

    // ========== WAVE MANAGEMENT ==========

    updateWaveSystem(dt, currentTime) {
        // Don't start waves during tutorial
        if (this.state.tutorialMode) {
            return;
        }
        
        // Start first wave
        if (!this.state.waveInProgress && this.state.wave === 1) {
            this.startWave();
        }

        // Spawn zombies
        if (this.state.waveInProgress) {
            if (this.state.waveZombiesSpawned < this.state.waveZombiesTotal) {
                const timeSinceLastSpawn = currentTime - this.state.lastSpawnTime;

                // Spawn più lento per le wave "Doppio Boss!" (ogni 10 wave)
                let spawnInterval = CONFIG.SPAWN_INTERVAL;
                if (this.state.specialWave === 'Doppio Boss!') {
                    spawnInterval = CONFIG.SPAWN_INTERVAL * 4.5; // 2.5x più lento
                }

                if (timeSinceLastSpawn >= spawnInterval) {
                    this.spawnZombie();
                    this.state.lastSpawnTime = currentTime;
                }
            }

            // Check if wave completed
            if (this.state.waveZombiesSpawned >= this.state.waveZombiesTotal &&
                this.entities.zombies.length === 0) {
                this.completeWave();
            }
        }
    }

    startWave() {
        this.state.waveInProgress = true;
        this.state.waveZombiesSpawned = 0;

        // Difficoltà progressiva BILANCIATA
        let zombieScalingFactor = 2.0 + Math.floor(this.state.wave / 8); // Scala più lentamente
        let zombieGrowthRate = 6.0 + Math.floor(this.state.wave / 10); // Scala più lentamente
        let additionalZombies = Math.floor(
            Math.log10(1 + (this.state.wave - 1) * zombieScalingFactor) * zombieGrowthRate
        );
        // Eventi speciali: ogni 6 ondate, "Assalto Speciale"
        if (this.state.wave % 6 === 0) {
            additionalZombies += 5 + this.state.wave; // Ridotto da 10 + wave*2
            this.state.specialWave = 'Assalto Speciale!';
        } else if (this.state.wave % 10 === 0) {
            additionalZombies += 8; // Ridotto da 20
            this.state.specialWave = 'Doppio Boss!';
        } else {
            this.state.specialWave = null;
        }
        this.state.waveZombiesTotal = CONFIG.BASE_WAVE_ZOMBIES + additionalZombies;

        this.state.lastSpawnTime = performance.now();

        // Annuncio ondata
        let waveText = `⚔️ WAVE ${this.state.wave} ⚔️`;
        if (this.state.specialWave) waveText += `\n${this.state.specialWave}`;
        this.particles.emit(CONFIG.COLS / 2, CONFIG.ROWS / 2 - 2, {
            text: waveText,
            color: CONFIG.COLORS.TEXT_WARNING,
            vy: -0.5,
            life: 2.0,
            scale: 2.0,
            glow: true
        });
        this.audio.waveStart();
    }

    spawnZombie() {
        const col = Utils.randomInt(0, CONFIG.COLS - 1);
        const type = this.selectZombieType();
        // Passa il numero della wave per applicare lo scaling logaritmico
        const zombie = this.entities.addZombie(col, type, this.state.wave);

        if (type === 'BOSS' || type === 'GOLEM') {
            this.audio.bossSpawn();
        } else {
            this.audio.enemySpawn();
        }
        // Potenziamento nemici speciali nelle ondate avanzate
        if (zombie && zombie.isHealer && this.state.wave >= 12) {
            zombie.healAmount = Math.floor(zombie.healAmount * (1 + (this.state.wave - 10) * 0.15));
            zombie.healInterval = Math.max(800, zombie.healInterval - (this.state.wave - 10) * 80);
        }
        if (zombie && zombie.canPhase && this.state.wave >= 15) {
            zombie.phaseInterval = Math.max(1200, zombie.phaseInterval - (this.state.wave - 14) * 150);
        }
        if (zombie && zombie.canSplit && this.state.wave >= 18) {
            zombie.splitCount = Math.min(6, zombie.splitCount + Math.floor((this.state.wave - 17) / 3));
        }
        this.state.waveZombiesSpawned++;
    }

    selectZombieType() {
        const wave = this.state.wave;
        //if (wave == 1) return 'RUSHER'; // Prima ondata più facile con vampiri

        let options = [
            { value: 'NORMAL', weight: Math.max(3, 15 - wave) },                      // Common early, rare late
            { value: 'TANK', weight: wave >= 3 ? 6 + Math.floor(wave / 3) : 0 },       // Wave 3+
            { value: 'RUSHER', weight: wave >= 3 ? 7 + Math.floor(wave / 3) : 0 },     // Wave 3+ (fast)
            { value: 'FLYER', weight: wave >= 4 ? 8 + Math.floor(wave / 2) : 0 },      // Wave 4+ (flying)
            { value: 'SPLITTER', weight: wave >= 5 ? 6 + Math.floor(wave / 3) : 0 },   // Wave 5+ (splits on death)
            { value: 'ARMORED', weight: wave >= 6 ? 5 + Math.floor(wave / 4) : 0 },    // Wave 6+ (tanky)
            { value: 'HEALER', weight: wave >= 6 ? 5 + Math.floor(wave / 4) : 0 },     // Wave 6+ (priority target)
            { value: 'BOMBER', weight: wave >= 7 ? 6 + Math.floor(wave / 3) : 0 },     // Wave 7+ (explodes)
            { value: 'VAMPIRE', weight: wave >= 7 ? 5 + Math.floor(wave / 4) : 0 },    // Wave 7+ (lifesteal)
            { value: 'SHADOW', weight: wave >= 8 ? 5 + Math.floor(wave / 4) : 0 },     // Wave 8+ (invisible)
            { value: 'PHASER', weight: wave >= 9 ? 6 + Math.floor(wave / 3) : 0 },     // Wave 9+ (teleports)
            { value: 'SIREN', weight: wave >= 8 ? 6 + Math.floor(wave / 4) : 0 },      // Wave 8+ (disables towers)
            { value: 'GOLEM', weight: wave >= 12 ? 3 + Math.floor(wave / 6) : 0 },     // Wave 12+ (massive)
            { value: 'BOSS', weight: (wave >= 10 && wave % 5 === 0) ? 5 + Math.floor(wave / 10) : 0 } // Every 5 waves from 10
        ];
        // Ondate speciali: bilanciato per essere difficile ma non impossibile
        if (this.state.specialWave === 'Assalto Speciale!') {
            options = [
                { value: 'RUSHER', weight: 15 },
                { value: 'SHADOW', weight: 10 },
                { value: 'NORMAL', weight: 8 },
                { value: 'FLYER', weight: 8 }
            ];
        } else if (this.state.specialWave === 'Doppio Boss!') {
            options = [
                { value: 'BOSS', weight: 8 },
                { value: 'GOLEM', weight: 6 },
                { value: 'TANK', weight: 15 },
                { value: 'ARMORED', weight: 12 },
                { value: 'NORMAL', weight: 10 }
            ];
        } else if (this.state.specialWave === 'Incubo Oscuro!') {
            // New special wave with new enemies
            options = [
                { value: 'VAMPIRE', weight: 15 },
                { value: 'SHADOW', weight: 12 },
                { value: 'SIREN', weight: 14 },
                { value: 'BOMBER', weight: 8 }
            ];
        }
        return Utils.weightedRandom(options.filter(o => o.weight > 0));
    }

    completeWave() {
        this.state.waveInProgress = false;

        // WAVE REWARDS - Più generose all'inizio
        const baseReward = 20; // Aumentato da 10
        const rewardScalingFactor = 1.0;
        const rewardGrowthRate = 0.8; // Aumentato da 0.4
        const logMultiplier = 1.0 + Math.log10(1 + (this.state.wave - 1) * rewardScalingFactor) * rewardGrowthRate;
        const waveBonus = Math.floor(baseReward * logMultiplier * 0.6); // *0.6 invece di *0.3

        const energyBonus = Math.floor(this.state.energy / 15); // Cambiato da /30 a /15
        const totalReward = baseReward + waveBonus + energyBonus;

        this.state.coins += totalReward;
        this.state.score += waveBonus * 2;
        this.state.coinsEarned += totalReward; // Track for XP system

        // Heal energy (displayEnergy seguirà automaticamente con animazione)
        this.state.energy = Math.min(CONFIG.INITIAL_ENERGY, this.state.energy + 20);

        // Visual feedback
        this.particles.createWaveClearEffect(CONFIG.COLS / 2, CONFIG.ROWS / 2);
        this.particles.emit(CONFIG.COLS / 2, CONFIG.ROWS / 2 + 1, {
            text: `+${totalReward} 💰`,
            color: CONFIG.COLORS.TEXT_WARNING,
            vy: -1,
            life: 2.0,
            scale: 1.5,
            glow: true
        });
        this.audio.waveComplete();

        // Next wave after delay
        setTimeout(() => {
            if (!this.state.isGameOver) {
                this.state.wave++;
                this.startWave();
            }
        }, 1500); // Ridotto da 3000 a 1500ms - wave più veloci
    }

    // ========== COMBAT SYSTEM ==========

    /**
     * Update combat - delegates to CombatSystem (OOP pattern)
     * The CombatSystem handles:
     * - Zombie abilities (Golem stomp, Siren scream, Vampire drain, Healer)
     * - Tower status effects (stun, disable)
     * - Tower targeting and firing
     * - Projectile collision detection
     */
    updateCombat(dt, currentTime) {
        this.combatSystem.update(dt, currentTime);
    }

    damageZombie(zombie, proj, currentTime) {
        // Apply tower effectiveness multiplier
        const cannonType = proj.cannonType || 'BASIC';
        const cannonConfig = CANNON_TYPES[cannonType];
        const effectiveness = (cannonConfig.effectiveness && cannonConfig.effectiveness[zombie.type]) || 1.0;

        const baseDamage = proj.damage * effectiveness;
        const result = zombie.takeDamage(baseDamage, currentTime);

        // Shield/Invulnerability block animation
        if (result.blocked) {
            if (result.type === 'shield') {
                // Shield absorb effect - blue shield icon with sparkles
                this.particles.emit(zombie.col, zombie.row - 0.3, {
                    text: '🛡️',
                    color: '#44aaff',
                    vy: -1.5,
                    life: 0.6,
                    scale: 1.2,
                    glow: true
                });
                this.particles.createShieldBlock(zombie.col, zombie.row);
            } else if (result.type === 'invulnerable') {
                // Phaser invulnerability - purple sparkle
                this.particles.emit(zombie.col, zombie.row - 0.3, {
                    text: '✨',
                    color: '#aa66ff',
                    vy: -1,
                    life: 0.4,
                    scale: 1.5,
                    glow: true
                });
            }
            return; // No damage number for blocked hits
        }

        const actualDamage = result.damage;

        // Visual feedback with effectiveness indicator
        if (effectiveness >= 1.5) {
            this.particles.createDamageNumber(zombie.col, zombie.row, actualDamage, '#00ff00'); // Green for effective
            this.audio.enemyHit(1.2);
        } else if (effectiveness <= 0.7) {
            this.particles.createDamageNumber(zombie.col, zombie.row, actualDamage, '#888888'); // Gray for ineffective
            this.audio.enemyHit(0.8);
        } else {
            this.particles.createDamageNumber(zombie.col, zombie.row, actualDamage);
            this.audio.enemyHit();
        }

        // Apply slow effect
        if (proj.slowFactor > 0) {
            zombie.applySlow(proj.slowFactor, proj.slowDuration, currentTime);
            this.particles.createFreezeEffect(zombie.col, zombie.row);
        }

        // Check death
        if (zombie.isDead()) {
            this.killZombie(zombie);
        }
    }

    applySplashDamage(epicenter, proj, currentTime) {
        this.particles.createExplosion(epicenter.col, epicenter.row, proj.splashRadius, proj.color);

        for (const zombie of this.entities.zombies) {
            if (zombie === epicenter) continue;

            const dist = Utils.distance(epicenter.col, epicenter.row, zombie.col, zombie.row);

            if (dist <= proj.splashRadius) {
                const splashDamage = proj.damage * 0.5;
                const result = zombie.takeDamage(splashDamage, currentTime);

                // Show damage/block effect
                if (result.blocked) {
                    if (result.type === 'shield') {
                        this.particles.createShieldBlock(zombie.col, zombie.row);
                    }
                } else {
                    this.particles.createDamageNumber(zombie.col, zombie.row, result.damage);
                }

                if (zombie.isDead()) {
                    this.killZombie(zombie);
                }
            }
        }
    }

    applyChainDamage(source, proj, currentTime) {
        let currentTarget = source;
        let chainsLeft = proj.chainTargets;
        const hitTargets = [source];

        while (chainsLeft > 0) {
            let nearestTarget = null;
            let nearestDist = Infinity;

            for (const zombie of this.entities.zombies) {
                if (hitTargets.includes(zombie)) continue;

                const dist = Utils.distance(currentTarget.col, currentTarget.row, zombie.col, zombie.row);

                if (dist < 3 && dist < nearestDist) {
                    nearestDist = dist;
                    nearestTarget = zombie;
                }
            }

            if (!nearestTarget) break;

            // Chain to next target
            this.particles.createLightningEffect(nearestTarget.col, nearestTarget.row);

            const chainDamage = proj.damage * 0.7;
            const result = nearestTarget.takeDamage(chainDamage, currentTime);

            // Show damage/block effect
            if (result.blocked) {
                if (result.type === 'shield') {
                    this.particles.createShieldBlock(nearestTarget.col, nearestTarget.row);
                }
            } else {
                this.particles.createDamageNumber(nearestTarget.col, nearestTarget.row, result.damage);
            }

            if (nearestTarget.isDead()) {
                this.killZombie(nearestTarget);
            }

            hitTargets.push(nearestTarget);
            currentTarget = nearestTarget;
            chainsLeft--;
        }
    }

    killZombie(zombie) {
        // BOMBER ability: explode on death, stunning nearby towers temporarily
        if (zombie.isBomber && zombie.explosionRadius > 0) {
            let towersHit = 0;

            this.entities.cannons.forEach(cannon => {
                const dist = Utils.distance(zombie.col, zombie.row, cannon.col, cannon.row);
                if (dist <= zombie.explosionRadius) {
                    // Stun tower for 2 seconds (disable shooting)
                    cannon.stunned = true;
                    cannon.stunDuration = 2000;
                    towersHit++;

                    // Visual feedback on tower
                    this.particles.emit(cannon.col, cannon.row, {
                        text: '💥STUN',
                        color: '#ff4500',
                        vy: -1.2,
                        life: 1.0,
                        scale: 1.1
                    });
                }
            });

            // Explosion visual effect
            this.particles.createExplosion(zombie.col, zombie.row, zombie.explosionRadius, '#ff4500');
            this.particles.emit(zombie.col, zombie.row, {
                text: '💣 BOOM!',
                color: '#ff4500',
                vy: -2,
                life: 1.2,
                scale: 1.4,
                glow: true
            });

            if (towersHit > 0) {
                this.audio.explosion?.();
            }
        }

        // SPLITTER ability: spawn smaller enemies on death
        if (zombie.canSplit && zombie.splitCount > 0) {
            const splitType = zombie.splitType;
            const splitHp = ZOMBIE_TYPES[splitType].hp * zombie.splitHpPercent;
            for (let i = 0; i < zombie.splitCount; i++) {
                const newZombie = this.entities.addZombie(zombie.col, splitType, this.state.wave);
                newZombie.hp = splitHp;
                newZombie.maxHp = splitHp;
                newZombie.row = zombie.row;
                newZombie.col += (Math.random() - 0.5) * 0.5;
            }
            this.particles.emit(zombie.col, zombie.row, {
                text: 'SPLIT!',
                color: '#ff00ff',
                vy: -1.5,
                life: 1.0,
                scale: 1.2
            });
        }

        // --- BONUS COMBO E KILL STREAK ---
        if (!this.state.lastKillTime) this.state.lastKillTime = performance.now();
        const now = performance.now();
        if (now - this.state.lastKillTime < 1200) {
            this.state.combo = (this.state.combo || 1) + 1;
        } else {
            this.state.combo = 1;
        }
        this.state.lastKillTime = now;
        if (!this.state.maxCombo || this.state.combo > this.state.maxCombo) this.state.maxCombo = this.state.combo;

        // Bonus per combo
        let comboBonus = 0;
        if (this.state.combo > 2) {
            comboBonus = Math.floor(zombie.reward * this.state.combo * 0.5);
            this.state.score += comboBonus;
            this.particles.emit(zombie.col, zombie.row, {
                text: `COMBO x${this.state.combo}! +${comboBonus}`,
                color: '#00ffff',
                vy: -2,
                life: 1.2,
                scale: 1.2,
                glow: true
            });
            this.audio.combo(this.state.combo);
        }

        // Kill streak bonus ogni 10 uccisioni senza perdere energia
        this.state.killsWithoutLeak = (this.state.killsWithoutLeak || 0) + 1;
        if (this.state.killsWithoutLeak % 10 === 0) {
            const streakBonus = 50 + 10 * this.state.wave;
            this.state.coins += streakBonus;
            this.particles.emit(zombie.col, zombie.row, {
                text: `STREAK! +${streakBonus}💰`,
                color: '#ffaa00',
                vy: -2,
                life: 1.5,
                scale: 1.3,
                glow: true
            });
        }

        // Rewards
        this.state.coins += zombie.reward;
        this.state.kills++;

        const scoreReward = Math.floor(zombie.reward * this.state.wave * 1.5);
        this.state.score += scoreReward;

        // Visual feedback
        this.particles.createDeathEffect(zombie.col, zombie.row, zombie.icon);
        this.particles.createCoinReward(zombie.col, zombie.row, zombie.reward);
        this.audio.enemyDeath();
        this.audio.coinCollect();

        // Remove zombie
        this.entities.removeZombie(zombie);
    }

    // ========== ENERGY SYSTEM ==========

    updateEnergy(dt) {
        // Consumo mattoni: solo i nemici fermi al muro (atWall === true)
        // Gli healer attaccano molto meno (ogni 5 secondi invece di 0.5)
        const zombiesAtWall = this.entities.zombies.filter(z => z.atWall);
        const regularZombiesAtWall = zombiesAtWall.filter(z => !z.isHealer);
        const healersAtWall = zombiesAtWall.filter(z => z.isHealer);
        const regularCount = regularZombiesAtWall.length;

        if (!this.state._wallEnergyTimer) this.state._wallEnergyTimer = 0;
        if (!this.state._healerWallTimer) this.state._healerWallTimer = 0;
        this.state._wallEnergyTimer += dt;
        this.state._healerWallTimer += dt;

        let totalBricksToRemove = 0;
        let zombiesToAnimate = [];

        // Nemici normali: ogni 0.5 secondi, ogni zombie al muro consuma 1 mattone
        if (this.state._wallEnergyTimer >= 0.5 && regularCount > 0) {
            const bricks = Math.min(regularCount, this.state.energy);
            totalBricksToRemove += bricks;
            zombiesToAnimate = zombiesToAnimate.concat(regularZombiesAtWall.slice(0, bricks));
            this.state._wallEnergyTimer = 0;
        }

        // Healer: ogni 5 secondi, ogni healer al muro consuma 1 mattone
        if (this.state._healerWallTimer >= 5.0 && healersAtWall.length > 0) {
            const bricks = Math.min(healersAtWall.length, this.state.energy - totalBricksToRemove);
            if (bricks > 0) {
                totalBricksToRemove += bricks;
                zombiesToAnimate = zombiesToAnimate.concat(healersAtWall.slice(0, bricks));
            }
            this.state._healerWallTimer = 0;
        }

        if (totalBricksToRemove > 0) {
            this.state.energy -= totalBricksToRemove;

            // Play wall damage sound
            this.audio.enemyDamageWall();

            // Effetto visivo: animazione di attacco su ogni nemico che consuma
            for (const zombie of zombiesToAnimate) {
                // Effetto particella
                this.particles.emit(zombie.col, zombie.row + 0.5, {
                    text: '💥',
                    color: '#ff5555',
                    vy: 0.3,
                    life: 0.5,
                    scale: 1.2,
                    glow: true
                });
                // Animazione: il nemico "colpisce" il muro
                if (!zombie._attackAnim) zombie._attackAnim = 0;
                zombie._attackAnim = 0.3;
            }
            // Penalità: azzera kill streak
            this.state.killsWithoutLeak = 0;
            if (this.state.energy <= 0) {
                this.state.energy = 0;
                this.gameOver();
            }
        }
        // Regen energy slowly when safe (nessun nemico al muro)
        if (zombiesAtWall.length === 0) {
            this.state.energy = Math.min(
                CONFIG.INITIAL_ENERGY,
                this.state.energy + CONFIG.ENERGY_REGEN_RATE * dt
            );
        }
    }

    // ========== GAME FLOW ==========

    update(dt) {
        // Always update UI (for info pages animations, settings, etc.) even when paused
        if (this.ui && this.ui.update) {
            this.ui.update(dt);
        }
        
        if (this.state.isPaused || this.state.isGameOver) return;

        const currentTime = performance.now();

        // Update energy display animation (displayEnergy si avvicina a energy)
        if (this.state.displayEnergy !== this.state.energy) {
            const diff = this.state.energy - this.state.displayEnergy;
            const step = this.state.energyAnimSpeed * dt;

            if (Math.abs(diff) <= step) {
                // Snap to target
                this.state.displayEnergy = this.state.energy;
            } else if (diff > 0) {
                // Guadagno energia - aumenta displayEnergy
                this.state.displayEnergy += step;
            } else {
                // Perdo energia - diminuisci displayEnergy
                this.state.displayEnergy -= step;
            }
        }

        // Update screen shake
        this.updateScreenShake(dt);

        // Update systems
        this.updateWaveSystem(dt, currentTime);
        this.updateCombat(dt, currentTime);
        this.updateEnergy(dt);
        this.updateBoosts(dt); // Aggiorna i bonus temporanei
        this.updateTowerBoosts(); // Applica i bonus alle torrette

        // Update entities
        this.entities.update(dt, currentTime);
        this.particles.update(dt);
        this.graphics.updateAnimation(dt);

        // Update play time
        this.state.playTime += dt;

        // Performance monitoring
        this.performanceMonitor.update();
    }

    render() {
        const ctx = this.graphics.ctx;
        const shake = this.state.screenShake;
        
        // Apply screen shake
        if (shake.duration > 0) {
            ctx.save();
            ctx.translate(shake.x, shake.y);
        }

        this.graphics.clear();
        this.graphics.drawGrid();

        // Render muro di mattoni dinamico (energia con animazione)
        const isGaining = this.state.displayEnergy < this.state.energy;
        const isLosing = this.state.displayEnergy > this.state.energy;
        this.graphics.drawBrickWall(
            this.state.displayEnergy,
            isGaining,
            isLosing,
            this.state.energy
        );

        // Render game entities (pass dragging tower for visual feedback)
        this.entities.render(this.graphics, performance.now(), this.state.draggingTower);
        this.particles.render(this.graphics);
        
        // Render tower drag ghost (before boost effects for proper layering)
        this.renderDragGhost();
        
        // Render boost effects on towers
        this.renderBoostEffects();

        // Restore from screen shake before UI rendering
        if (this.state.screenShake.duration > 0) {
            ctx.restore();
        }

        // Render UI
        this.ui.render(this.state);

        // Show game over popup if game is over
        if (this.state.isGameOver) {
            const platformBalance = window.platformBalance || 0;
            const continueCost = CONFIG.CONTINUE_COST || 100;
            this.ui.showGameOver(this.state, platformBalance, continueCost);
        }

        // Debug info (optional)
        if (window.location.search.includes('debug')) {
            this.renderDebugInfo();
        }
    }

    /**
     * Render the ghost/silhouette of a tower being dragged
     */
    renderDragGhost() {
        const { draggingTower, dragCurrentPos, dragTargetGrid } = this.state;
        
        if (!draggingTower || !dragCurrentPos || !dragTargetGrid) return;
        
        const ctx = this.graphics.ctx;
        const cellSize = this.graphics.getCellSize();
        
        // Check if target position is valid
        const isValidTarget = this.ui.isValidGridPos(dragTargetGrid) && 
                              this.ui.isInDefenseZone(dragTargetGrid.row);
        const isOccupied = this.entities.getCannon(dragTargetGrid.col, dragTargetGrid.row) !== null &&
                           this.entities.getCannon(dragTargetGrid.col, dragTargetGrid.row) !== draggingTower;
        const canPlace = isValidTarget && !isOccupied;
        
        // Draw target cell highlight
        if (isValidTarget) {
            const targetScreenPos = this.graphics.gridToScreen(dragTargetGrid.col, dragTargetGrid.row);
            
            ctx.save();
            
            // Draw cell highlight
            if (canPlace) {
                // Valid placement - green highlight
                ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
                ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
            } else {
                // Invalid (occupied) - red highlight
                ctx.fillStyle = 'rgba(255, 80, 80, 0.3)';
                ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)';
            }
            
            ctx.lineWidth = 2;
            ctx.fillRect(
                targetScreenPos.x - cellSize / 2,
                targetScreenPos.y - cellSize / 2,
                cellSize,
                cellSize
            );
            ctx.strokeRect(
                targetScreenPos.x - cellSize / 2,
                targetScreenPos.y - cellSize / 2,
                cellSize,
                cellSize
            );
            
            ctx.restore();
        }
        
        // Draw ghost tower at cursor position
        ctx.save();
        ctx.globalAlpha = 0.6;
        
        // Draw tower silhouette following the cursor
        if (draggingTower.multiSprite) {
            // Use multi-part sprite
            try {
                draggingTower.multiSprite.render(ctx, dragCurrentPos.x, dragCurrentPos.y, cellSize);
            } catch (e) {
                // Fallback to simple shape
                this.drawSimpleTowerGhost(ctx, dragCurrentPos.x, dragCurrentPos.y, cellSize, draggingTower.color);
            }
        } else if (draggingTower.sprite) {
            // Use regular sprite
            this.graphics.drawSpriteAt(draggingTower.sprite, dragCurrentPos.x, dragCurrentPos.y, {
                scale: 1.0,
                color: draggingTower.color
            });
        } else {
            // Fallback to simple shape
            this.drawSimpleTowerGhost(ctx, dragCurrentPos.x, dragCurrentPos.y, cellSize, draggingTower.color);
        }
        
        // Draw level indicator on ghost if level > 1
        if (draggingTower.level > 1) {
            ctx.font = `bold ${cellSize * 0.25}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeText(`Lv${draggingTower.level}`, dragCurrentPos.x, dragCurrentPos.y + cellSize * 0.35);
            ctx.fillText(`Lv${draggingTower.level}`, dragCurrentPos.x, dragCurrentPos.y + cellSize * 0.35);
        }
        
        ctx.restore();
        
        // Draw range preview at target position if valid
        if (canPlace) {
            this.graphics.drawRange(
                dragTargetGrid.col, 
                dragTargetGrid.row, 
                draggingTower.range, 
                'rgba(0, 255, 136, 0.1)'
            );
        }
    }
    
    /**
     * Draw a simple tower ghost shape as fallback
     */
    drawSimpleTowerGhost(ctx, x, y, cellSize, color) {
        const size = cellSize * 0.7;
        
        // Draw base
        ctx.fillStyle = color || '#00ff88';
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    renderDebugInfo() {
        const counts = this.entities.getCounts();
        const fps = this.performanceMonitor.getFPS();

        const debug = [
            `FPS: ${fps}`,
            `Cannons: ${counts.cannons}`,
            `Zombies: ${counts.zombies}`,
            `Projectiles: ${counts.projectiles}`,
            `Particles: ${this.particles.getCount()}`
        ];

        let y = 10;
        debug.forEach(line => {
            this.graphics.drawText(line, 10, y, {
                size: 12,
                color: '#ffff00',
                shadow: true
            });
            y += 15;
        });
    }

    pause() {
        // Don't pause during fullscreen transition
        if (this.isFullscreenTransition) return;
        
        this.state.isPaused = true;
        this.audio.pause();
    }

    resume() {
        this.state.isPaused = false;
        this.audio.resume();
    }

    gameOver() {
        if (this.state.isGameOver) return;

        this.state.isGameOver = true;
        this.audio.stop();
        this.audio.gameOverSound();

        // Note: gameOver is now handled by main.js with complete session management
        // This ensures proper tracking of session duration and all XP metrics
    }

    continueGame() {
        // This will be handled by main.js which has access to PlatformSDK
        if (window.handleContinueGame) {
            window.handleContinueGame();
        }
    }

    resumeAfterContinue() {
        // Resume game after continue
        this.state.isGameOver = false;

        // Restore energy to full
        this.state.energy = CONFIG.INITIAL_ENERGY;
        this.state.displayEnergy = CONFIG.INITIAL_ENERGY;

        // Clear all zombies - use slice to avoid modifying array during iteration
        const zombiesToRemove = [...this.entities.zombies];
        zombiesToRemove.forEach(zombie => {
            this.entities.removeZombie(zombie);
        });

        // Restart the current wave
        this.startWave();

        // Clear UI buttons
        this.ui.clearRetryButton();

        // Resume audio
        this.audio.play();

        console.log('[Game] Resumed after continue - wave restarted, zombies cleared:', zombiesToRemove.length);
    }

    restart() {
        // Reset everything
        this.state = this.createInitialState();
        this.entities.clear();
        this.particles.clear();
        this.deselectAll();
        this.ui.clearRetryButton();

        this.audio.play();

        // Reset session state (handled entirely in main.js)
        if (window.resetGameSession) {
            window.resetGameSession();
        }
    }

    getState() {
        return this.state;
    }



    toggleFullscreen() {
        const isFullscreen = document.body.classList.contains('game-fullscreen');

        if (isFullscreen) {
            this.exitFullscreen();
        } else {
            this.requestFullscreen();
        }
    }

    requestFullscreen() {
        // Close settings popup and resume game
        this.ui.closeSettingsPopup();
        this.resume();

        // Prevent pause during fullscreen transition
        this.isFullscreenTransition = true;
        setTimeout(() => { this.isFullscreenTransition = false; }, 500);

        // Apply CSS class for fullscreen styling
        document.body.classList.add('game-fullscreen');

        // Scroll to top to hide address bar on mobile
        window.scrollTo(0, 0);

        // Try native fullscreen API (works on desktop/Android)
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => { });
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }

        // Resize canvas after fullscreen
        setTimeout(() => {
            this.graphics.setupCanvas();
            this.ui.setupShopButtons();
        }, 100);
    }

    // Shop and Bonus System Methods
    purchaseShopItem(itemId) {
        const item = SHOP_ITEMS[itemId];
        if (!item) return false;

        // Check if temporary boost is already active
        if (item.type === 'temporary') {
            const isAlreadyActive = this.state.activeBoosts.some(b => b.type === item.effect.type);
            if (isAlreadyActive) {
                this.particles.createWarningEffect(3, 2, '⏳ Already active!');
                this.audio.uiError();
                return false;
            }
        }

        // Check if player has enough coins
        if (this.state.coins < item.cost) {
            this.particles.createWarningEffect(3, 2, '💰 Not enough coins!');
            this.audio.uiError();
            return false;
        }

        // Deduct coins
        this.state.coins -= item.cost;
        
        if (item.type === 'instant') {
            this.applyInstantBoost(item);
        } else if (item.type === 'temporary') {
            this.applyTemporaryBoost(item);
        } else if (item.type === 'special') {
            this.applySpecialBoost(item);
        }

        this.audio.uiClick();
        return true;
    }

    applyInstantBoost(item) {
        if (item.effect.type === 'energy') {
            this.state.energy = Math.min(CONFIG.INITIAL_ENERGY * 2, this.state.energy + item.effect.amount);
            
            // Use the new energy boost effect
            this.particles.createEnergyBoostEffect(CONFIG.COLS / 2, CONFIG.ROWS / 2 - 1, item.effect.amount);
        }
    }

    applyTemporaryBoost(item) {
        const now = Date.now();
        const boost = {
            id: item.id,
            type: item.effect.type,
            multiplier: item.effect.multiplier,
            startTime: now,
            duration: item.duration,
            endTime: now + item.duration,
            icon: item.icon,
            name: item.name
        };

        // Remove any existing boost of the same type
        this.state.activeBoosts = this.state.activeBoosts.filter(b => b.type !== item.effect.type);
        
        // Add new boost
        this.state.activeBoosts.push(boost);

        // Specific visual effects for each boost type
        const centerX = CONFIG.COLS / 2;
        const centerY = CONFIG.ROWS / 2 - 1;
        
        switch(item.effect.type) {
            case 'damage_multiplier':
                this.particles.createDamageBoostEffect(centerX, centerY);
                break;
            case 'range_multiplier':
                this.particles.createRangeBoostEffect(centerX, centerY);
                break;
            case 'firerate_multiplier':
                this.particles.createFireRateBoostEffect(centerX, centerY);
                break;
            default:
                this.particles.createShopEffect(centerX, centerY, item.icon, CONFIG.COLORS.TEXT_WARNING);
        }
    }

    applySpecialBoost(item) {
        if (item.effect.type === 'tower_upgrade') {
            // Enable tower selection mode for upgrade
            this.state.selectingTowerForUpgrade = true;
            this.state.pendingUpgradeItem = item;
            
            // Show instruction particle
            this.particles.emit(CONFIG.COLS / 2, CONFIG.ROWS / 2 - 1, {
                text: '⭐ CLICK A TOWER TO UPGRADE ⭐',
                color: '#ffdd00',
                vy: -1,
                life: 3.0,
                scale: 1.5,
                glow: true
            });
            
            // Close shop popup to allow tower selection
            this.ui.closeShopPopup();
        }
    }

    upgradeTower(cannon) {
        if (!cannon || !this.state.pendingUpgradeItem) return;
        
        // Check if tower is already max level (200)
        if (cannon.level >= MERGE_LEVELS.length) {
            this.particles.createWarningEffect(cannon.col, cannon.row, '⚠️ MAX LEVEL!');
            this.audio.uiError();
            return;
        }
        
        // Upgrade the tower
        cannon.level++;
        
        // Apply boosts if active
        const hasActiveBoosts = this.state.activeBoosts && this.state.activeBoosts.length > 0;
        if (hasActiveBoosts) {
            const boostMultipliers = {
                damage: this.getBoostMultiplier('damage_multiplier'),
                range: this.getBoostMultiplier('range_multiplier'), 
                fireRate: this.getBoostMultiplier('firerate_multiplier')
            };
            cannon.updateStats(boostMultipliers);
        } else {
            cannon.updateStats();
        }
        
        // Visual feedback
        this.particles.createTowerUpgradeEffect(cannon.col, cannon.row);
        this.audio.towerMerge(); // Reuse merge sound
        
        // Bonus score
        const upgradeBonus = Math.floor(500 * cannon.level);
        this.state.score += upgradeBonus;
        this.particles.emit(cannon.col, cannon.row, {
            text: `⭐ LEVEL ${cannon.level} ⭐`,
            color: '#ffdd00',
            vy: -2,
            life: 2.0,
            scale: 1.8,
            glow: true
        });
        
        // Clear selection mode
        this.state.selectingTowerForUpgrade = false;
        this.state.pendingUpgradeItem = null;
    }

    updateBoosts(deltaTime) {
        const now = Date.now();
        // Remove expired boosts
        const expiredBoosts = this.state.activeBoosts.filter(boost => now >= boost.endTime);
        
        expiredBoosts.forEach(boost => {
            this.particles.createBoostExpiredEffect(CONFIG.COLS / 2, CONFIG.ROWS / 2, boost.icon, boost.name);
        });

        this.state.activeBoosts = this.state.activeBoosts.filter(boost => now < boost.endTime);
    }

    updateTowerBoosts() {
        const boostMultipliers = {
            damage: this.getBoostMultiplier('damage_multiplier'),
            range: this.getBoostMultiplier('range_multiplier'), 
            fireRate: this.getBoostMultiplier('firerate_multiplier')
        };
        
        // Only update if there are active boosts
        const hasActiveBoosts = boostMultipliers.damage > 1 || boostMultipliers.range > 1 || boostMultipliers.fireRate > 1;
        
        if (hasActiveBoosts || this.state.lastBoostUpdate) {
            // Update all tower stats
            this.entities.cannons.forEach(cannon => {
                cannon.updateStats(hasActiveBoosts ? boostMultipliers : null);
            });
            
            this.state.lastBoostUpdate = hasActiveBoosts;
        }
    }

    renderBoostEffects() {
        if (this.state.activeBoosts.length === 0) return;
        
        const ctx = this.graphics.ctx;
        const currentTime = Date.now();
        const time = currentTime * 0.001;
        
        // Get boost effects
        const damageBoost = this.state.activeBoosts.find(b => b.type === 'damage_multiplier');
        const rangeBoost = this.state.activeBoosts.find(b => b.type === 'range_multiplier');
        const fireRateBoost = this.state.activeBoosts.find(b => b.type === 'firerate_multiplier');
        
        // Render effects on all towers
        this.entities.cannons.forEach((cannon, index) => {
            const screenPos = this.graphics.gridToScreen(cannon.col, cannon.row);
            const x = screenPos.x + this.graphics.cellSize / 2;
            const y = screenPos.y + this.graphics.cellSize / 2;
            const cellSize = this.graphics.cellSize;
            
            // Phase offset for each tower to create wave effect
            const phaseOffset = index * 0.5;
            
            // Damage boost effect - fiery pulsing aura with particles
            if (damageBoost) {
                const pulse = Math.sin(time * 6 + phaseOffset) * 0.5 + 0.5;
                const outerPulse = Math.sin(time * 4 + phaseOffset) * 0.3 + 0.7;
                
                // Outer glow ring
                ctx.save();
                ctx.shadowColor = '#ff4444';
                ctx.shadowBlur = 15 + pulse * 10;
                ctx.globalAlpha = 0.15 + pulse * 0.15;
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, cellSize * 0.7);
                gradient.addColorStop(0, 'rgba(255, 100, 50, 0.4)');
                gradient.addColorStop(0.5, 'rgba(255, 50, 50, 0.2)');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, cellSize * 0.7 * outerPulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Inner fire glow
                ctx.save();
                ctx.globalAlpha = 0.3 + pulse * 0.2;
                ctx.fillStyle = '#ff6644';
                ctx.beginPath();
                ctx.arc(x, y, cellSize * 0.35, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Rotating fire particles
                for (let i = 0; i < 4; i++) {
                    const angle = time * 3 + (i * Math.PI / 2) + phaseOffset;
                    const radius = cellSize * (0.35 + Math.sin(time * 8 + i) * 0.1);
                    const px = x + Math.cos(angle) * radius;
                    const py = y + Math.sin(angle) * radius;
                    
                    ctx.save();
                    ctx.globalAlpha = 0.7 + Math.sin(time * 10 + i) * 0.3;
                    ctx.fillStyle = i % 2 === 0 ? '#ff4400' : '#ffaa00';
                    ctx.beginPath();
                    ctx.arc(px, py, 3 + Math.sin(time * 5 + i) * 1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
            
            // Range boost effect - expanding radar waves
            if (rangeBoost) {
                const waveSpeed = time * 2;
                
                // Multiple expanding rings
                for (let ring = 0; ring < 3; ring++) {
                    const ringPhase = (waveSpeed + ring * 0.5 + phaseOffset) % 1.5;
                    const ringRadius = cellSize * (0.3 + ringPhase * 0.6);
                    const ringAlpha = Math.max(0, 0.5 - ringPhase * 0.35);
                    
                    ctx.save();
                    ctx.globalAlpha = ringAlpha;
                    ctx.strokeStyle = '#4488ff';
                    ctx.lineWidth = 2 - ringPhase;
                    ctx.beginPath();
                    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
                
                // Central radar glow
                ctx.save();
                ctx.shadowColor = '#4488ff';
                ctx.shadowBlur = 10;
                const radarGradient = ctx.createRadialGradient(x, y, 0, x, y, cellSize * 0.3);
                radarGradient.addColorStop(0, 'rgba(68, 136, 255, 0.3)');
                radarGradient.addColorStop(1, 'rgba(68, 136, 255, 0)');
                ctx.fillStyle = radarGradient;
                ctx.beginPath();
                ctx.arc(x, y, cellSize * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Rotating radar sweep
                const sweepAngle = time * 4 + phaseOffset;
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.strokeStyle = '#88ccff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.cos(sweepAngle) * cellSize * 0.5, y + Math.sin(sweepAngle) * cellSize * 0.5);
                ctx.stroke();
                ctx.restore();
            }
            
            // Fire rate boost effect - electric sparks and speed lines
            if (fireRateBoost) {
                const sparkIntensity = Math.sin(time * 12 + phaseOffset) * 0.5 + 0.5;
                
                // Central energy core
                ctx.save();
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 8 + sparkIntensity * 8;
                const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, cellSize * 0.25);
                coreGradient.addColorStop(0, 'rgba(255, 255, 100, 0.5)');
                coreGradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
                ctx.fillStyle = coreGradient;
                ctx.beginPath();
                ctx.arc(x, y, cellSize * 0.25, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Orbiting electric sparks
                for (let i = 0; i < 6; i++) {
                    const sparkAngle = time * 8 + (i * Math.PI / 3) + phaseOffset;
                    const orbitRadius = cellSize * 0.4;
                    const sparkX = x + Math.cos(sparkAngle) * orbitRadius;
                    const sparkY = y + Math.sin(sparkAngle) * orbitRadius;
                    
                    ctx.save();
                    ctx.shadowColor = '#ffff00';
                    ctx.shadowBlur = 5;
                    ctx.globalAlpha = 0.6 + Math.sin(time * 15 + i * 2) * 0.4;
                    ctx.fillStyle = '#ffee00';
                    ctx.beginPath();
                    ctx.arc(sparkX, sparkY, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                
                // Lightning arcs between sparks
                ctx.save();
                ctx.globalAlpha = 0.3 + sparkIntensity * 0.3;
                ctx.strokeStyle = '#ffff88';
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    const startAngle = time * 8 + (i * Math.PI * 2 / 3) + phaseOffset;
                    const endAngle = startAngle + Math.PI / 3;
                    const startX = x + Math.cos(startAngle) * cellSize * 0.35;
                    const startY = y + Math.sin(startAngle) * cellSize * 0.35;
                    const endX = x + Math.cos(endAngle) * cellSize * 0.35;
                    const endY = y + Math.sin(endAngle) * cellSize * 0.35;
                    const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 10;
                    const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 10;
                    
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.quadraticCurveTo(midX, midY, endX, endY);
                    ctx.stroke();
                }
                ctx.restore();
            }
        });
    }

    getBoostMultiplier(type) {
        const boost = this.state.activeBoosts.find(b => b.type === type);
        return boost ? boost.multiplier : 1;
    }

    getRemainingBoostTime(type) {
        const boost = this.state.activeBoosts.find(b => b.type === type);
        if (!boost) return 0;
        return Math.max(0, boost.endTime - Date.now());
    }

    getBoostProgress(type) {
        const boost = this.state.activeBoosts.find(b => b.type === type);
        if (!boost) return 0;
        const elapsed = Date.now() - boost.startTime;
        return Math.max(0, Math.min(1, elapsed / boost.duration));
    }

    // ========== SPECIAL ABILITIES SYSTEM ==========

    /**
     * Activate a special ability (Bomb or Pushback)
     */
    activateSpecialAbility(abilityId) {
        const abilityConfig = SPECIAL_ABILITIES[abilityId];
        if (!abilityConfig) return;

        const abilityState = this.state.specialAbilities[abilityId];
        const now = Date.now();
        const cooldown = abilityConfig.baseCooldown;
        const elapsed = now - abilityState.lastUsed;

        // Check cooldown
        if (elapsed < cooldown) {
            const remaining = Math.ceil((cooldown - elapsed) / 1000);
            this.particles.createWarningEffect(CONFIG.COLS / 2, CONFIG.ROWS / 2 - 1, `⏳ ${remaining}s`);
            this.audio.uiError();
            return;
        }

        // Execute ability based on type
        if (abilityId === 'BOMB') {
            this.activateBombAbility(abilityConfig, abilityState);
        } else if (abilityId === 'PUSHBACK') {
            this.activatePushbackAbility(abilityConfig, abilityState);
        } else if (abilityId === 'STUN') {
            this.activateStunAbility(abilityConfig, abilityState);
        }
    }

    /**
     * Activate Bomb ability - enters targeting mode
     */
    activateBombAbility(config, state) {
        // Disable drag detection during targeting
        this.input.setDragEnabled(false);
        
        // Enter targeting mode
        this.ui.enterBombTargetingMode((gridPos) => {
            // Re-enable drag detection
            this.input.setDragEnabled(true);
            this.executeBomb(gridPos, config, state);
        });

        // Audio feedback
        this.audio.uiClick();
    }

    /**
     * Execute the bomb at the target position
     */
    executeBomb(gridPos, config, state) {
        const now = Date.now();
        const level = state.level;
        const waveLevel = this.state.wave || 1;
        
        // Calculate damage based on ability level AND current wave
        // Base damage + level bonus + wave scaling (grows stronger each wave)
        const baseDamage = config.baseDamage + (level - 1) * config.damagePerLevel;
        const waveMultiplier = 1 + (waveLevel - 1) * 0.5; // +50% damage per wave
        const damage = Math.round(baseDamage * waveMultiplier);
        const radius = config.baseRadius;

        // Update ability state
        state.lastUsed = now;
        state.uses++;

        // Create spectacular explosion effect
        this.particles.createMegaBombEffect(gridPos.col, gridPos.row, radius, damage);

        // Screen shake for impact
        this.addScreenShake(8, 0.25);

        // Play explosion sound
        this.audio.explosion?.() || this.audio.towerMerge();

        // Damage all enemies in radius (4x4 area)
        let killCount = 0;
        const zombiesToCheck = [...this.entities.zombies]; // Copy to avoid modification during iteration
        
        for (const zombie of zombiesToCheck) {
            const dist = Utils.distance(gridPos.col, gridPos.row, zombie.col, zombie.row);
            
            if (dist <= radius) {
                // Full damage at center, reduced at edges
                const falloff = 1 - (dist / radius) * 0.3;
                const actualDamage = damage * falloff;
                
                const result = zombie.takeDamage(actualDamage, now);
                
                if (!result.blocked) {
                    this.particles.createDamageNumber(zombie.col, zombie.row, result.damage, '#ff4400');
                }

                if (zombie.isDead()) {
                    this.killZombie(zombie);
                    killCount++;
                }
            }
        }

        // Track kills
        state.kills += killCount;

        // Level up the ability every 5 uses (max level 10)
        if (state.uses % 5 === 0 && state.level < config.maxLevel) {
            state.level++;
            this.particles.createAbilityLevelUpEffect(
                gridPos.col, gridPos.row,
                state.level,
                config.icon,
                config.color
            );
        }

        // Score bonus for bomb kills
        if (killCount > 0) {
            const bombBonus = killCount * 25 * level;
            this.state.score += bombBonus;
            this.particles.emit(gridPos.col, gridPos.row - 1.2, {
                text: `+${bombBonus}`,
                color: '#ffaa00',
                vy: -1.5,
                life: 1.0,
                scale: 1.2,
                glow: true
            });
        }
    }

    /**
     * Add screen shake effect
     */
    addScreenShake(intensity, duration) {
        this.state.screenShake.intensity = intensity;
        this.state.screenShake.duration = duration;
    }

    /**
     * Update screen shake effect
     */
    updateScreenShake(dt) {
        const shake = this.state.screenShake;
        if (shake.duration > 0) {
            shake.duration -= dt;
            const progress = shake.duration > 0 ? 1 : 0;
            const currentIntensity = shake.intensity * progress;
            shake.x = (Math.random() - 0.5) * currentIntensity * 2;
            shake.y = (Math.random() - 0.5) * currentIntensity * 2;
        } else {
            shake.x = 0;
            shake.y = 0;
        }
    }

    /**
     * Activate Pushback ability - creates a force wave that pushes all enemies back
     */
    activatePushbackAbility(config, state) {
        const now = Date.now();
        const level = state.level;
        
        // Calculate push distance based on level
        const pushDistance = config.basePushDistance + (level - 1) * config.pushDistancePerLevel;

        // Update ability state
        state.lastUsed = now;
        state.uses++;

        // Create force wave effect at the defense line
        const defenseLineY = CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS;
        this.particles.createForceWaveEffect(defenseLineY, CONFIG.COLS);

        // Play wave sound
        this.audio.waveStart?.() || this.audio.towerMerge();

        // Push all enemies back
        let pushedCount = 0;
        
        for (const zombie of this.entities.zombies) {
            // Calculate new position (pushed toward spawn)
            const newRow = Math.max(-1, zombie.row - pushDistance);
            const actualPush = zombie.row - newRow;
            
            if (actualPush > 0) {
                // Create individual push effect
                this.particles.createEnemyPushbackEffect(zombie.col, zombie.row, actualPush);
                
                // Move the enemy
                zombie.row = newRow;
                zombie.atWall = false; // No longer at wall after being pushed
                
                pushedCount++;
            }
        }

        // Track pushed enemies
        state.enemiesPushed += pushedCount;

        // Level up the ability every 5 uses (max level 10)
        if (state.uses % 5 === 0 && state.level < config.maxLevel) {
            state.level++;
            this.particles.createAbilityLevelUpEffect(
                CONFIG.COLS / 2, CONFIG.ROWS / 2,
                state.level,
                config.icon,
                config.color
            );
        }

        // Score bonus for pushback
        if (pushedCount > 0) {
            const pushBonus = pushedCount * 10 * level;
            this.state.score += pushBonus;
            this.particles.emit(CONFIG.COLS / 2, defenseLineY - 0.5, {
                text: `+${pushBonus}`,
                color: '#00ccff',
                vy: -1.5,
                life: 1.0,
                scale: 1.2,
                glow: true
            });
        }
    }

    /**
     * Activate Stun ability - enters targeting mode
     */
    activateStunAbility(config, state) {
        // Disable drag detection during targeting
        this.input.setDragEnabled(false);
        
        // Enter targeting mode (same as bomb)
        this.ui.enterBombTargetingMode((gridPos) => {
            // Re-enable drag detection
            this.input.setDragEnabled(true);
            this.executeStun(gridPos, config, state);
        });

        // Audio feedback
        this.audio.uiClick();
    }

    /**
     * Execute the stun at the target position
     */
    executeStun(gridPos, config, state) {
        const gameTime = performance.now(); // For stun effect timing (matches game loop)
        const level = state.level;
        
        // Calculate stun parameters based on level
        const stunDuration = config.baseStunDuration + (level - 1) * config.stunDurationPerLevel;
        const radius = config.baseRadius + (level - 1) * config.radiusPerLevel;

        // Update ability state - use Date.now() for cooldown tracking
        state.lastUsed = Date.now();
        state.uses++;

        // Create stun shockwave effect
        this.particles.createStunWaveEffect(gridPos.col, gridPos.row, radius, stunDuration);

        // Screen shake for impact
        this.addScreenShake(5, 0.2);

        // Play stun sound
        this.audio.waveStart?.() || this.audio.towerMerge();

        // Stun all enemies in radius
        let stunnedCount = 0;
        
        for (const zombie of this.entities.zombies) {
            const dist = Utils.distance(gridPos.col, gridPos.row, zombie.col, zombie.row);
            
            if (dist <= radius) {
                // Apply CC resistance (reduce stun duration for resistant enemies)
                const effectiveDuration = stunDuration * (1 - (zombie.ccResistance || 0));
                
                if (effectiveDuration > 0) {
                    zombie.stunnedUntil = gameTime + effectiveDuration;
                    stunnedCount++;

                    // Individual stun indicator
                    this.particles.emit(zombie.col, zombie.row, {
                        text: '💫',
                        color: '#ffee00',
                        vy: -1,
                        life: 0.8,
                        scale: 1.0,
                        glow: true
                    });
                }
            }
        }

        // Track stunned enemies
        state.enemiesStunned += stunnedCount;

        // Level up the ability every 5 uses
        if (state.uses % 5 === 0 && state.level < config.maxLevel) {
            state.level++;
            this.particles.createAbilityLevelUpEffect(
                gridPos.col, gridPos.row,
                state.level,
                config.icon,
                config.color
            );
        }

        // Score bonus for stuns
        if (stunnedCount > 0) {
            const stunBonus = stunnedCount * 15 * level;
            this.state.score += stunBonus;
            this.particles.emit(gridPos.col, gridPos.row - 1, {
                text: `+${stunBonus}`,
                color: '#ffee00',
                vy: -1.5,
                life: 1.0,
                scale: 1.2,
                glow: true
            });

            // Show stun count
            this.particles.emit(gridPos.col, gridPos.row + 0.5, {
                text: `⚡${stunnedCount} STUNNED!`,
                color: '#ffffff',
                vy: -0.8,
                life: 1.5,
                scale: 1.3,
                glow: true
            });
        }
    }

    /**
     * Get ability cooldown progress (0-1, 1 = ready)
     */
    getAbilityCooldownProgress(abilityId) {
        const config = SPECIAL_ABILITIES[abilityId];
        const state = this.state.specialAbilities[abilityId];
        if (!config || !state) return 1;
        
        const elapsed = Date.now() - state.lastUsed;
        return Math.min(1, elapsed / config.baseCooldown);
    }

    /**
     * Check if ability is ready
     */
    isAbilityReady(abilityId) {
        return this.getAbilityCooldownProgress(abilityId) >= 1;
    }

    exitFullscreen() {
        // Close settings popup and resume game
        this.ui.closeSettingsPopup();
        this.resume();

        // Prevent pause during fullscreen transition
        this.isFullscreenTransition = true;
        setTimeout(() => { this.isFullscreenTransition = false; }, 500);

        // Remove CSS fullscreen class
        document.body.classList.remove('game-fullscreen');

        // Scroll to top
        window.scrollTo(0, 0);

        // Exit native fullscreen if active
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => { });
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        // Resize canvas after exiting fullscreen
        setTimeout(() => {
            this.graphics.setupCanvas();
            this.ui.setupShopButtons();
        }, 100);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
