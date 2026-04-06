/**
 * PlayingState - Main gameplay state
 * Handles player, platforms, enemies, collectibles, and all game logic.
 */

import { State } from './State.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT, COLORS, GAME_SETTINGS, UPGRADE_CATALOG, TIME_BONUS } from '../config/Constants.js';
import { drawUpgradeIcon } from '../graphics/UpgradeIcons.js';
import { bitmapFont } from '../graphics/BitmapFont.js';
import { getLevelData, generateInfiniteScreen } from '../config/LevelData.js';
import { Player } from '../entities/Player.js';
import { PlatformFactory } from '../entities/Platform.js';
import { EnemyFactory } from '../entities/Enemy.js';
import { CollectibleFactory } from '../entities/Collectible.js';
import { PowerUpFactory } from '../entities/PowerUp.js';

export class PlayingState extends State {
    // Entities
    #player = null;
    #platforms = [];
    #enemies = [];
    #collectibles = [];
    #powerUps = [];

    // Camera
    #cameraY = 0;
    #targetCameraY = 0;

    // Level data
    #levelData = null;
    #levelGoalY = 0;       // world y the player must climb above to finish the level
    #levelTotalClimb = 0; // total vertical distance for progress bar
    #levelComplete = false;
    #levelCompleteTimer = 0;

    // Infinite mode
    #infScreensLoaded = 0;

    // HUD
    #hudFlash = 0;
    #comboDisplay = 0;

    // Speed-run timer (level mode)
    #levelTimer = 0;
    #parScreenCount = 1;

    // Infinite mode checkpoint timer (per-screen)
    #infScreenTimer = 0;    // total time elapsed in infinite mode
    #infLastCpTime = 0;    // #infScreenTimer value when player entered current screen
    #infScreenCleared = 0;    // last checkpoint index that was awarded a bonus
    #infCheckpointAnim = null; // { text, color, life, maxLife }

    // Floating texts (e.g. +❤️)
    #floatingTexts = [];

    enter() {
        this._game.startSession();
        this.#initGame();
    }

    exit() {
        this.#player = null;
        this.#platforms = [];
        this.#enemies = [];
        this.#collectibles = [];
        this.#powerUps = [];
        this.#levelComplete = false;
        this.#floatingTexts = [];
        this.#infScreensLoaded = 0;
        this.#infScreenTimer = 0;
        this.#infLastCpTime = 0;
        this.#infScreenCleared = 0;
        this.#infCheckpointAnim = null;
    }

    #initGame() {
        const stats = this._game.getPlayerStats();

        if (this._game.infiniteMode) {
            this.#initInfiniteGame(stats);
            return;
        }

        const levelIndex = this._game.currentLevel;
        this.#levelData = getLevelData(levelIndex);

        // Fall back to random-ish generation on missing level data
        if (!this.#levelData) {
            this.#levelData = getLevelData(0);
        }

        // Goal: player must reach the TOP of the last screen.
        // Screen 0 occupies world y = [0, DESIGN_HEIGHT].
        // Screen 1 occupies world y = [-DESIGN_HEIGHT, 0], etc.
        // Top of last screen (s = screens.length-1) = -(screens.length-1)*DESIGN_HEIGHT.
        const screenCount = this.#levelData.screens.length;
        const playerStartY = DESIGN_HEIGHT - 120;
        this.#levelGoalY = -((screenCount - 1) * DESIGN_HEIGHT);
        this.#levelTotalClimb = playerStartY - this.#levelGoalY;

        // Camera starts at bottom (y=0 is world-bottom, negative is up)
        this.#cameraY = 0;
        this.#targetCameraY = 0;

        this.#levelComplete = false;
        this.#levelCompleteTimer = 0;
        this.#levelTimer = 0;
        this.#parScreenCount = this.#levelData?.screens?.length ?? 1;

        // Build all platforms/enemies/collectibles/power-ups from screens
        this.#platforms = [];
        this.#enemies = [];
        this.#collectibles = [];
        this.#powerUps = [];

        // Always place a safe starting platform at very bottom
        this.#platforms.push(
            PlatformFactory.createType(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 50, 'normal')
        );

        this.#loadScreens();

        // Create player just above the starting platform
        this.#player = new Player(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 120, stats);

        // Carry over lives lost in the previous level (if any)
        if (this._game.pendingLives !== null) {
            this.#player.setLives(this._game.pendingLives);
            this._game.pendingLives = null;
        }

        this._game.particles.clear();
    }

    // ─── Infinite mode ───────────────────────────────────────────────────────

    #initInfiniteGame(stats) {
        this.#infScreensLoaded = 0;
        this.#cameraY = 0;
        this.#targetCameraY = 0;
        this.#levelComplete = false;
        this.#levelCompleteTimer = 0;
        this.#levelTimer = 0;
        this.#parScreenCount = 1;
        this.#infScreenTimer = 0;
        this.#infLastCpTime = 0;
        this.#infScreenCleared = 0;
        this.#infCheckpointAnim = null;
        this.#levelGoalY = -Infinity; // never ends
        this.#levelTotalClimb = -1;   // disables progress bar
        this.#levelData = null;

        this.#platforms = [];
        this.#enemies = [];
        this.#collectibles = [];
        this.#powerUps = [];

        // Safe starting platform
        this.#platforms.push(
            PlatformFactory.createType(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 50, 'normal')
        );

        // Pre-load first 3 screens
        for (let i = 0; i < 3; i++) this.#appendInfiniteScreen();

        this.#player = new Player(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 120, stats);
        this._game.particles.clear();
    }

    #appendInfiniteScreen() {
        const s = this.#infScreensLoaded;
        const screen = generateInfiniteScreen(s);
        const toWorldY = (fracY) => DESIGN_HEIGHT * (1 - fracY - s);

        for (const pd of screen.platforms) {
            this.#platforms.push(PlatformFactory.createType(pd.x * DESIGN_WIDTH, toWorldY(pd.y), pd.type));
        }
        for (const ed of screen.enemies) {
            const worldY = toWorldY(ed.y);
            this.#enemies.push(EnemyFactory.createType(ed.x * DESIGN_WIDTH, worldY, ed.type, -worldY));
        }
        for (const cd of screen.collectibles) {
            const worldY = toWorldY(cd.y);
            this.#collectibles.push(CollectibleFactory.createType(cd.x * DESIGN_WIDTH, worldY, cd.type, -worldY));
        }
        for (const upd of screen.powerUps) {
            this.#powerUps.push(PowerUpFactory.createType(upd.x * DESIGN_WIDTH, toWorldY(upd.y), upd.type));
        }
        this.#infScreensLoaded++;
    }

    update(dt) {
        if (!this.#player) return;

        // Handle pause
        if (this._game.input.pauseJustPressed) {
            this._game.input.consumePause();
            this._game.fsm.transition('pause');
            return;
        }

        // Level timer — counts while the level is in progress
        if (!this._game.infiniteMode && !this.#levelComplete) {
            this.#levelTimer += dt;
        }

        // Infinite mode per-screen checkpoint timer
        if (this._game.infiniteMode) {
            this.#infScreenTimer += dt;
            this.#checkInfiniteCheckpoint();
        }

        // Update player
        this.#updatePlayer(dt);

        // Update camera
        this.#updateCamera(dt);

        // Check level complete
        if (this.#checkLevelComplete(dt)) return;

        // Update entities
        this.#updatePlatforms(dt);
        this.#updateEnemies(dt);
        this.#updateCollectibles(dt);
        this.#updatePowerUps(dt);

        // Check collisions
        this.#checkCollisions();

        // Check death
        this.#checkDeath();

        // Update score
        this.#updateScore();

        // Cleanup off-screen entities
        this.#cleanup();

        // Update HUD effects
        if (this.#hudFlash > 0) this.#hudFlash -= dt * 2;
        this.#comboDisplay = this.#player.combo;

        // Tick floating texts
        this.#floatingTexts = this.#floatingTexts.filter(ft => {
            ft.life -= dt;
            ft.screenY += ft.vy * dt;
            return ft.life > 0;
        });

        // Tick checkpoint animation
        if (this.#infCheckpointAnim) {
            this.#infCheckpointAnim.life -= dt;
            if (this.#infCheckpointAnim.life <= 0) this.#infCheckpointAnim = null;
        }
    }

    #updatePlayer(dt) {
        const input = this._game.input;

        // Handle jump
        if (input.jumpJustPressed) {
            if (this.#player.jump(this._game.sound)) {
                this._game.particles.jumpDust(this.#player.x, this.#player.bottom);
            }
            input.consumeJump();
        }

        // Double jump via quick tap (touchend) — fires even when holding screen for movement
        // justTapped = touchend-based, so it doesn't double-fire with jumpJustPressed (different frames)
        // The canDoubleJump guard prevents double-trigger on the same bounce
        if (input.justTapped && this.#player.canDoubleJump) {
            if (this.#player.jump(this._game.sound)) {
                this._game.particles.jumpDust(this.#player.x, this.#player.bottom);
            }
        }

        // Air dash — triggered by double-tap/double-press or horizontal swipe
        if (input.dashLeft) {
            this.#player.dash(-1, this._game.sound);
            input.consumeDash();
        } else if (input.dashRight) {
            this.#player.dash(1, this._game.sound);
            input.consumeDash();
        }

        // Update player physics
        const timeScale = this.#player.hasSlowTime ? 0.3 : 1;
        this.#player.update(dt, input, DESIGN_WIDTH);
    }

    #updateCamera(dt) {
        // Keep the player vertically centred — always track upward,
        // never pull the camera down when the player falls.
        const targetY = this.#player.y - DESIGN_HEIGHT * 0.50;
        if (targetY < this.#targetCameraY) {
            this.#targetCameraY = targetY;
        }

        // Smooth camera movement
        const diff = this.#targetCameraY - this.#cameraY;
        this.#cameraY += diff * GAME_SETTINGS.CAMERA_LERP * 60 * dt;
    }

    /**
     * Convert level screen definitions to absolute world entities.
     * Screen 0 = bottom, screen N-1 = top.
     * World y=0 is the very bottom; negative y values are higher.
     */
    #loadScreens() {
        const screens = this.#levelData.screens;
        for (let s = 0; s < screens.length; s++) {
            const screen = screens[s];
            // Coordinate system:
            //   pd.y = 0  → bottom of this screen viewport
            //   pd.y = 1  → top    of this screen viewport
            // Screen 0 occupies world y = [DESIGN_HEIGHT, 0]  (initial viewport).
            // Screen 1 occupies world y = [0, -DESIGN_HEIGHT] (one viewport up).
            // Formula: worldY = (1 - pd.y) * DESIGN_HEIGHT - s * DESIGN_HEIGHT
            //                 = DESIGN_HEIGHT * (1 - pd.y - s)

            const toWorldY = (fracY) => DESIGN_HEIGHT * (1 - fracY - s);

            for (const pd of screen.platforms) {
                const worldX = pd.x * DESIGN_WIDTH;
                const worldY = toWorldY(pd.y);
                this.#platforms.push(PlatformFactory.createType(worldX, worldY, pd.type));
            }

            for (const ed of screen.enemies) {
                const worldX = ed.x * DESIGN_WIDTH;
                const worldY = toWorldY(ed.y);
                this.#enemies.push(EnemyFactory.createType(worldX, worldY, ed.type, -worldY));
            }

            for (const cd of screen.collectibles) {
                const worldX = cd.x * DESIGN_WIDTH;
                const worldY = toWorldY(cd.y);
                this.#collectibles.push(CollectibleFactory.createType(worldX, worldY, cd.type, -worldY));
            }

            for (const upd of screen.powerUps) {
                const worldX = upd.x * DESIGN_WIDTH;
                const worldY = toWorldY(upd.y);
                this.#powerUps.push(PowerUpFactory.createType(worldX, worldY, upd.type));
            }
        }
    }

    /**
     * Returns true when level-complete transition has been triggered.
     * The goal is to reach the top of the last screen.
     */
    #checkLevelComplete(dt) {
        // Infinite mode: never completes — expand world as player climbs
        if (this._game.infiniteMode) {
            const loadedTop = -(this.#infScreensLoaded - 1) * DESIGN_HEIGHT;
            if (this.#player.y < loadedTop + DESIGN_HEIGHT * 2) {
                this.#appendInfiniteScreen();
            }
            return false;
        }

        if (this.#levelComplete) {
            this.#levelCompleteTimer -= dt;
            if (this.#levelCompleteTimer <= 0) {
                this._game.endSession();
                this._game.fsm.transition('levelComplete');
            }
            return true;
        }

        // Goal: player climbs above the top of the last screen
        if (this.#player.y < this.#levelGoalY) {
            this.#levelComplete = true;
            this.#levelCompleteTimer = 0.6; // brief pause then cinematic

            // Persist the player's current lives so the next level starts with them
            this._game.pendingLives = this.#player.lives;

            // ── Time bonus ──────────────────────────────────────────────
            const bonus = this.#computeTimeBonus();
            this._game.levelTime = this.#levelTimer;
            this._game.timeMedal = bonus.medal;
            this._game.timeBonusScore = bonus.score;
            this._game.timeBonusCoins = bonus.coins;
            if (bonus.score > 0) this._game.addScore(bonus.score);
            if (bonus.coins > 0) this._game.addCoins(bonus.coins);
            // ────────────────────────────────────────────────────────────

            this._game.sound.playUpgrade();
            this._game.particles.burst(this.#player.x, this.#player.y, {
                color: COLORS.NEON_YELLOW,
                size: 10,
                sizeEnd: 0,
                life: 1.2,
                speed: 250,
                spread: 360,
            }, 40);
        }
        return false;
    }

    /**
     * Called every frame in infinite mode.
     * Awards score/coin bonus when the player clears a screen quickly.
     * Uses #infScreenTimer as total elapsed time, #infLastCpTime as entry time of current screen.
     */
    #checkInfiniteCheckpoint() {
        // Checkpoint index = how many 2-screen intervals the player has climbed
        const currentScreen = Math.floor(-this.#player.y / (5 * DESIGN_HEIGHT));
        if (currentScreen <= this.#infScreenCleared) return;

        // Player just crossed into a new screen — measure time for the screen just cleared
        const screenTime = this.#infScreenTimer - this.#infLastCpTime;
        this.#infLastCpTime = this.#infScreenTimer;
        this.#infScreenCleared = currentScreen;

        // Award bonus based on speed (×2 since covering 2 screens per checkpoint)
        const G = TIME_BONUS.GOLD_PER_SCREEN * 5;
        const S = TIME_BONUS.SILVER_PER_SCREEN * 5;
        const B = TIME_BONUS.BRONZE_PER_SCREEN * 5;

        let medal, scoreBonus, coinsBonus, color, icon;
        if (screenTime <= G) {
            medal = 'gold'; scoreBonus = TIME_BONUS.GOLD_SCORE_PER_SCREEN * 5; coinsBonus = TIME_BONUS.GOLD_COINS_PER_SCREEN * 5;
            color = TIME_BONUS.GOLD_COLOR; icon = '🥇';
        } else if (screenTime <= S) {
            medal = 'silver'; scoreBonus = TIME_BONUS.SILVER_SCORE_PER_SCREEN * 5; coinsBonus = TIME_BONUS.SILVER_COINS_PER_SCREEN * 5;
            color = TIME_BONUS.SILVER_COLOR; icon = '🥈';
        } else if (screenTime <= B) {
            medal = 'bronze'; scoreBonus = TIME_BONUS.BRONZE_SCORE_PER_SCREEN * 5; coinsBonus = TIME_BONUS.BRONZE_COINS_PER_SCREEN * 5;
            color = TIME_BONUS.BRONZE_COLOR; icon = '🥉';
        } else {
            medal = 'none'; scoreBonus = 0; coinsBonus = 0;
            color = '#888'; icon = '';
        }

        if (scoreBonus > 0) this._game.addScore(scoreBonus);
        if (coinsBonus > 0) this._game.addCoins(coinsBonus);

        // Particle burst at player position
        this._game.particles.burst(this.#player.x, this.#player.y, {
            color,
            size: 9, sizeEnd: 0, life: 0.9, speed: 180, spread: 360, shape: 'star',
        }, 22);

        // Floating medal popup (screen-space, anchored to center-top)
        const popLines = medal !== 'none'
            ? [`CHECKPOINT`, `+${scoreBonus} pts  +${coinsBonus} `]
            : ['CHECKPOINT', `${PlayingState.#formatTime(screenTime)}`];

        popLines.forEach((text, i) => {
            this.#floatingTexts.push({
                x: DESIGN_WIDTH / 2,
                screenY: DESIGN_HEIGHT * 0.18 + i * 26,
                text,
                life: 2.0,
                maxLife: 2.0,
                vy: -30,
                color,
                large: i === 0,
            });
        });

        // Banner anim stored for HUD
        this.#infCheckpointAnim = { text: medal.toUpperCase(), color, life: 1.8, maxLife: 1.8 };
    }

    #updatePlatforms(dt) {
        for (const platform of this.#platforms) {
            platform.update(dt);
        }
    }

    #updateEnemies(dt) {
        const timeScale = this.#player?.hasSlowTime ? 0.3 : 1;
        for (const enemy of this.#enemies) {
            enemy.update(dt * timeScale, this.#player);
        }
    }

    #updateCollectibles(dt) {
        const magnetRange = this.#player?.magnetRange || 0;

        for (const collectible of this.#collectibles) {
            collectible.update(dt);

            // Magnet attraction
            if (magnetRange > 0 && !collectible.isCollected) {
                const dx = this.#player.x - collectible.x;
                const dy = this.#player.y - collectible.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < magnetRange) {
                    collectible.attractTo(this.#player.x, this.#player.y, 400, dt);
                }
            }
        }
    }

    #updatePowerUps(dt) {
        for (const powerUp of this.#powerUps) {
            powerUp.update(dt);
        }
    }

    #checkCollisions() {
        if (!this.#player) return;

        // Platform collisions
        this.#checkPlatformCollisions();

        // Enemy collisions
        this.#checkEnemyCollisions();

        // Collectible collisions
        this.#checkCollectibleCollisions();

        // Power-up collisions
        this.#checkPowerUpCollisions();

        // Enemy bullet collisions
        this.#checkBulletCollisions();
    }

    #checkPlatformCollisions() {
        if (this.#player.vy <= 0) return; // Only when falling

        for (const platform of this.#platforms) {
            if (!platform.active || !platform.canLand(this.#player)) continue;

            // Check collision
            if (this.#player.bottom >= platform.top &&
                this.#player.bottom <= platform.top + 20 &&
                this.#player.right > platform.left &&
                this.#player.left < platform.right) {

                // Handle landing
                const isDeadly = platform.onLand(this.#player, this._game.particles, this._game.sound);

                if (isDeadly) {
                    // Player hit deadly platform
                    const died = this.#player.takeDamage(this._game.sound);
                    this._game.shake.shake(15, 0.3);
                    if (died) {
                        this.#gameOver();
                    }
                } else if (platform.type !== 'cloud' || platform.isSolid) {
                    // Land on platform
                    const bounce = platform.getBounceMultiplier();
                    this.#player.land(platform.top, bounce);

                    // Particles
                    if (platform.type === 'bouncy') {
                        this._game.sound.playBounce();
                    }
                }
                break;
            }
        }
    }

    #checkEnemyCollisions() {
        for (const enemy of this.#enemies) {
            if (!enemy.active) continue;
            if (!this.#player.intersects(enemy)) continue;

            // Check if stomping (falling down onto enemy)
            if (this.#player.vy > 0 &&
                this.#player.top < enemy.centerY &&
                enemy.canBeStomped) {

                // Stomp enemy
                enemy.onStomp(this._game.particles, this._game.sound);
                this.#player.stomp(this._game.sound);
                this._game.addScore(enemy.scoreValue * (1 + this.#player.combo * 0.5));
                this._game.enemiesDefeated++;
                this._game.shake.shake(5, 0.1);
                this._game.sound.playCombo();

                // Shockwave perk
                if (this.#player.stats.hasShockwave) {
                    this.#createShockwave(enemy.x, enemy.y);
                }

                // Spike headbutt: moving UP, player's head brushes enemy's bottom
            } else if (this.#player.vy < 0 &&
                this.#player.top >= enemy.bottom - 22 &&
                this.#player.spikeCount > 0 &&
                this.#player.fireSpike()) {

                // Spike pierces enemy — player keeps upward momentum, no bounce
                enemy.onStomp(this._game.particles, this._game.sound);
                this._game.addScore(enemy.scoreValue * (1 + this.#player.combo * 0.5));
                this._game.enemiesDefeated++;
                this._game.shake.shake(4, 0.1);
                this._game.sound.playCombo?.();

            } else if (!this.#player.isInvincible) {
                // Ghost Repel perk: auto-repel ghost on contact
                if (enemy.type === 'ghost' && this.#player.ghostRepelReady) {
                    enemy.onStomp(this._game.particles, this._game.sound);
                    this._game.addScore(enemy.scoreValue);
                    this._game.enemiesDefeated++;
                    this.#player.triggerGhostRepel();
                    this._game.shake.shake(8, 0.2);
                    this.#floatingTexts.push({
                        x: enemy.x,
                        screenY: enemy.y - this.#cameraY - 20,
                        text: 'REPELLED!',
                        life: 1.2, maxLife: 1.2, vy: -50,
                    });
                } else {
                    // Player hit by enemy
                    const died = this.#player.takeDamage(this._game.sound);
                    this._game.shake.shake(15, 0.3);
                    if (died) {
                        this.#gameOver();
                    }
                }
            }
        }
    }

    #createShockwave(x, y) {
        // Damage nearby enemies
        for (const enemy of this.#enemies) {
            if (!enemy.active) continue;
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 80) {
                enemy.onStomp(this._game.particles, this._game.sound);
                this._game.addScore(enemy.scoreValue);
                this._game.enemiesDefeated++;
            }
        }

        // Visual effect
        this._game.particles.burst(x, y, {
            color: COLORS.NEON_CYAN,
            size: 10,
            sizeEnd: 0,
            life: 0.4,
            speed: 200,
            spread: 360,
        }, 20);
    }

    #checkCollectibleCollisions() {
        for (const collectible of this.#collectibles) {
            if (!collectible.active || collectible.isCollected) continue;
            if (!this.#player.intersects(collectible)) continue;

            collectible.collect(this._game.particles, this._game.sound);
            const multiplier = this.#player.coinMultiplier;
            this._game.addCoins(collectible.value, multiplier);
            this._game.addScore(collectible.scoreValue);
            this.#player.coinCollect();
            this.#hudFlash = 1;
        }
    }

    #checkPowerUpCollisions() {
        for (const powerUp of this.#powerUps) {
            if (!powerUp.active || powerUp.isCollected) continue;
            if (!this.#player.intersects(powerUp)) continue;

            const isExtraLife = powerUp.type === 'extra_life';
            powerUp.collect(this.#player, this._game.particles, this._game.sound);
            this.#hudFlash = 1;

            if (isExtraLife) {
                // Replace generic burst with heart-specific effect
                this._game.particles.extraLifeCollect(powerUp.x, powerUp.y);
                // Floating "+❤️" text rising from collection point
                const screenY = powerUp.y - this.#cameraY;
                this.#floatingTexts.push({
                    x: powerUp.x, screenY,
                    text: '+❤️',
                    life: 1.4,
                    maxLife: 1.4,
                    vy: -55,
                });
            }
        }
    }

    #checkBulletCollisions() {
        for (const enemy of this.#enemies) {
            for (const bullet of enemy.bullets) {
                if (!bullet.active) continue;

                // Simple circle collision
                const dx = bullet.x - this.#player.x;
                const dy = bullet.y - this.#player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 20 && !this.#player.isInvincible) {
                    bullet.active = false;
                    const died = this.#player.takeDamage(this._game.sound);
                    this._game.shake.shake(10, 0.2);
                    if (died) {
                        this.#gameOver();
                    }
                }
            }
        }
    }

    #checkDeath() {
        // Fell below screen
        const deathThreshold = this.#cameraY + DESIGN_HEIGHT + GAME_SETTINGS.DEATH_FALL_THRESHOLD;
        if (this.#player.y > deathThreshold) {
            this.#gameOver();
        }
    }

    #updateScore() {
        // Score based on altitude
        const altitude = -this.#player.y;
        this._game.setAltitude(altitude);
    }

    #cleanup() {
        const cleanupThreshold = this.#cameraY + DESIGN_HEIGHT + 200;

        this.#platforms = this.#platforms.filter(p => p.active && p.y < cleanupThreshold);
        this.#enemies = this.#enemies.filter(e => e.active && e.y < cleanupThreshold);
        this.#collectibles = this.#collectibles.filter(c => c.active && c.y < cleanupThreshold);
        this.#powerUps = this.#powerUps.filter(p => p.active && p.y < cleanupThreshold);
    }

    /**
     * Compute the time bonus when the level is completed.
     * Returns { medal, score, coins }.
     */
    #computeTimeBonus() {
        const t = this.#levelTimer;
        const s = this.#parScreenCount;
        const gold = TIME_BONUS.GOLD_PER_SCREEN * s;
        const silver = TIME_BONUS.SILVER_PER_SCREEN * s;
        const bronze = TIME_BONUS.BRONZE_PER_SCREEN * s;

        if (t <= gold) return { medal: 'gold', score: Math.round(TIME_BONUS.GOLD_SCORE_PER_SCREEN * s), coins: TIME_BONUS.GOLD_COINS_PER_SCREEN * s };
        if (t <= silver) return { medal: 'silver', score: Math.round(TIME_BONUS.SILVER_SCORE_PER_SCREEN * s), coins: TIME_BONUS.SILVER_COINS_PER_SCREEN * s };
        if (t <= bronze) return { medal: 'bronze', score: Math.round(TIME_BONUS.BRONZE_SCORE_PER_SCREEN * s), coins: TIME_BONUS.BRONZE_COINS_PER_SCREEN * s };
        return { medal: 'none', score: 0, coins: 0 };
    }

    /**
     * Format seconds → "MM:SS" string (e.g., 75.3 → "1:15").
     */
    static #formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    #gameOver() {
        this._game.sound.playDeath();
        this._game.shake.shake(20, 0.5);

        // Death particles
        this._game.particles.burst(this.#player.x, this.#player.y, {
            color: COLORS.PLAYER_PRIMARY,
            size: 8,
            sizeEnd: 0,
            life: 1,
            speed: 200,
            spread: 360,
        }, 30);

        // Transition
        setTimeout(() => {
            this._game.endSession();
            this._game.fsm.transition('gameOver');
        }, 800);
    }

    draw(ctx) {
        // Background
        this.#drawBackground(ctx);

        // Game objects
        this.#drawPlatforms(ctx);
        this.#drawCollectibles(ctx);
        this.#drawPowerUps(ctx);
        this.#drawEnemies(ctx);

        // Infinite mode checkpoint lines (drawn on top of platforms, below player)
        if (this._game.infiniteMode) this.#drawInfiniteCheckpoints(ctx);

        this.#drawPlayer(ctx);

        // Particles
        this._game.particles.draw(ctx, this.#cameraY);

        // HUD
        this.#drawHUD(ctx);
    }

    /**
     * Draw black-and-white checkered finish lines at every screen boundary
     * in infinite mode.  Each boundary is at worldY = -N * DESIGN_HEIGHT.
     */
    #drawInfiniteCheckpoints(ctx) {
        const SQ_W = 20;   // square width
        const SQ_H = 14;   // square height (2 rows of height SQ_H/2 staggered → racing flag)
        const HALF = SQ_H / 2;
        const cols = Math.ceil(DESIGN_WIDTH / SQ_W);

        // Find which boundary indices N are currently visible on screen — every 2 screens
        const CP = 5 * DESIGN_HEIGHT;
        const nMin = Math.ceil((-DESIGN_HEIGHT - this.#cameraY) / CP);
        const nMax = Math.floor(-this.#cameraY / CP);

        ctx.save();

        for (let n = Math.max(1, nMin); n <= nMax; n++) {
            const worldY = -n * CP;
            const sy = worldY - this.#cameraY;   // top of the checkered band

            // ── Glow + shadow line ────────────────────────────────────────
            ctx.shadowColor = 'rgba(255,255,255,0.8)';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, sy); ctx.lineTo(DESIGN_WIDTH, sy);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // ── Two-row racing-flag checker ───────────────────────────────
            for (let col = 0; col < cols; col++) {
                const x = col * SQ_W;
                // Row 1 (top half)
                const top1dark = col % 2 === 0;
                ctx.fillStyle = top1dark ? '#000000' : '#ffffff';
                ctx.globalAlpha = 0.90;
                ctx.fillRect(x, sy, SQ_W, HALF);
                // Row 2 (bottom half) — inverted checkerboard
                ctx.fillStyle = top1dark ? '#ffffff' : '#000000';
                ctx.fillRect(x, sy + HALF, SQ_W, HALF);
            }
            ctx.globalAlpha = 1;

            // ── Floor label ───────────────────────────────────────────────
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            bitmapFont.drawText(ctx, `FLOOR ${n * 5}`, DESIGN_WIDTH / 2, sy - 7, 10, { align: 'center', color: '#ffffff' });
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    #drawBackground(ctx) {
        const zone = this._game.getCurrentZone();

        // Gradient based on zone
        const gradient = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
        gradient.addColorStop(0, zone.bgColor);
        gradient.addColorStop(1, COLORS.BG_SECONDARY);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        // Parallax stars
        this.#drawStars(ctx);

        // Zone indicator
        bitmapFont.drawText(ctx, zone.name, 10, DESIGN_HEIGHT - 16, 12, { alpha: 0.3 });
    }

    #drawStars(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        const starOffset = (this.#cameraY * 0.1) % 100;

        for (let i = 0; i < 30; i++) {
            const x = (i * 47 + 23) % DESIGN_WIDTH;
            const y = ((i * 73 + starOffset) % (DESIGN_HEIGHT + 100)) - 50;
            const size = 1 + (i % 3);
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    #drawPlatforms(ctx) {
        for (const platform of this.#platforms) {
            if (platform.isVisible(this.#cameraY, DESIGN_HEIGHT)) {
                platform.draw(ctx, this.#cameraY);
            }
        }
    }

    #drawCollectibles(ctx) {
        for (const collectible of this.#collectibles) {
            if (collectible.isVisible(this.#cameraY, DESIGN_HEIGHT)) {
                collectible.draw(ctx, this.#cameraY);
            }
        }
    }

    #drawPowerUps(ctx) {
        for (const powerUp of this.#powerUps) {
            if (powerUp.isVisible(this.#cameraY, DESIGN_HEIGHT)) {
                powerUp.draw(ctx, this.#cameraY);
            }
        }
    }

    #drawEnemies(ctx) {
        for (const enemy of this.#enemies) {
            if (enemy.isVisible(this.#cameraY, DESIGN_HEIGHT)) {
                enemy.draw(ctx, this.#cameraY);
            }
        }
    }

    #drawPlayer(ctx) {
        if (this.#player?.active) {
            this.#player.draw(ctx, this.#cameraY);
        }
    }

    #drawHUD(ctx) {
        ctx.save();

        if (this._game.infiniteMode) {
            // ── Infinite mode HUD ──────────────────────────────────────────
            // Top-left: current altitude in meters (live, not max)
            const currentAlt = Math.max(0, Math.floor(-this.#player.y));
            bitmapFont.drawText(ctx, `${currentAlt} m`, 31, 26, 22, {
                color: COLORS.NEON_CYAN,
                alpha: 0.9,
                letterSpacing: 1

            });


            bitmapFont.drawText(ctx, 'INFINITE', 15, 53, 20, {
                color: COLORS.NEON_ORANGE,
                alpha: 0.9,
                letterSpacing: 1
            });
        } else {
            // ── Normal mode HUD ────────────────────────────────────────────
            // Score
            bitmapFont.drawText(ctx, `${Math.floor(this._game.score)}`, 15, 26, 24, { color: '#ffffff' });

            // Level label
            bitmapFont.drawText(ctx, `LEVEL ${(this._game.currentLevel ?? 0) + 1}`, 15, 49, 13, { color: COLORS.NEON_CYAN });

            // Level progress bar (right side, vertical)
            if (this.#levelTotalClimb > 0) {
                const startY = DESIGN_HEIGHT - 120;
                const climbed = startY - (this.#player?.y ?? startY);
                const pct = Math.min(1, Math.max(0, climbed / this.#levelTotalClimb));
                const barH = 120;
                const barX = DESIGN_WIDTH - 8;
                const barY = 80;

                // Track
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(barX - 3, barY, 6, barH);

                // Fill
                const fillH = barH * pct;
                ctx.fillStyle = COLORS.NEON_CYAN;
                ctx.fillRect(barX - 3, barY + (barH - fillH), 6, fillH);

                // Goal marker
                ctx.fillStyle = COLORS.NEON_YELLOW;
                ctx.fillRect(barX - 5, barY, 10, 3);
            }

            // Speed-run timer capsule (top-center)
            this.#drawTimerHUD(ctx);
        }

        // Infinite mode: per-screen clock always visible
        if (this._game.infiniteMode) {
            this.#drawInfiniteTimerHUD(ctx);
        }

        // Coins (right side — both modes)
        ctx.fillStyle = this.#hudFlash > 0 ? '#ffffff' : COLORS.COIN_GOLD;
        ctx.textAlign = 'right';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`\uD83D\uDCB0 ${this._game.coins}`, DESIGN_WIDTH - 15, 35);

        // Lives (right side — both modes, max 5 per row)
        {
            const totalLives = this.#player?.lives || 0;
            const perRow = 5;
            const heartStr = '\u2764\uFE0F';
            ctx.fillStyle = COLORS.NEON_RED;
            ctx.textAlign = 'right';
            ctx.font = '16px monospace';
            const rows = Math.ceil(totalLives / perRow);
            for (let r = 0; r < rows; r++) {
                const count = Math.min(perRow, totalLives - r * perRow);
                ctx.fillText(heartStr.repeat(count), DESIGN_WIDTH - 15, 55 + r * 18);
            }
        }

        // Combo
        if (this.#comboDisplay > 1) {
            bitmapFont.drawText(ctx, `${this.#comboDisplay}x COMBO!`, DESIGN_WIDTH / 2, 88, 28, { align: 'center', color: COLORS.NEON_ORANGE });
        }

        // Active power-ups
        this.#drawActivePowerUps(ctx);

        // Purchased upgrades column
        this.#drawUpgradeIcons(ctx);

        // Floating texts (+❤️ etc.)
        this.#drawFloatingTexts(ctx);

        ctx.restore();
    }

    // Category → border colour mapping (mirrors shop category colours)
    static #CATEGORY_COLORS = {
        mobility: '#00ffaa',
        combat: '#ff4466',
        collection: '#ffcc00',
        score: '#aa88ff',
    };

    #drawGhostRepelHUD(ctx) { }

    #drawFloatingTexts(ctx) {
        if (this.#floatingTexts.length === 0) return;
        ctx.save();
        for (const ft of this.#floatingTexts) {
            const t = ft.life / ft.maxLife;          // 1 → 0
            const alpha = t < 0.3 ? t / 0.3 : 1;    // fade in fast, fade out last 30%
            const scale = 1 + (1 - t) * 0.6;        // grows slightly as it rises
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(ft.x, ft.screenY);
            ctx.scale(scale, scale);
            const col = ft.color ?? '#ffffff';
            const size = ft.large ? 24 : 18;
            ctx.shadowColor = col;
            ctx.shadowBlur = 12;
            // Use bitmap font for pure ASCII text; fall back to canvas for emoji/Unicode
            const hasUnicode = [...ft.text].some(ch => ch.codePointAt(0) > 127);
            if (!hasUnicode) {
                bitmapFont.drawText(ctx, ft.text, 0, 0, size, {
                    align: 'center',
                    color: ft.large ? col : '#ffffff',
                });
            } else {
                ctx.font = `bold ${size}px sans-serif`;
                ctx.fillStyle = ft.large ? col : '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ft.text, 0, 0);
            }
            ctx.shadowBlur = 0;
            ctx.restore();
        }
        ctx.restore();
    }

    #drawUpgradeIcons(ctx) {
        const upgrades = Object.values(UPGRADE_CATALOG);
        const owned = upgrades.filter(u => (this._game.getUpgradeLevel(u.id) ?? 0) > 0);
        if (owned.length === 0) return;

        const SIZE = 22;
        const GAP = 3;
        const X = 8;
        let Y = 68; // just below score text

        ctx.save();

        for (const upg of owned) {
            const lvl = this._game.getUpgradeLevel(upg.id);
            const color = PlayingState.#CATEGORY_COLORS[upg.category] ?? '#ffffff';

            // Badge background
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(X, Y, SIZE, SIZE);

            // Coloured border
            ctx.globalAlpha = 1;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(X, Y, SIZE, SIZE);

            // Canvas-drawn icon
            drawUpgradeIcon(ctx, upg.id, X, Y, SIZE);

            // Level badge (bottom-right corner) — only if > 1
            if (lvl > 1) {
                ctx.globalAlpha = 1;
                bitmapFont.drawText(ctx, `${lvl}`, X + SIZE - 1, Y + SIZE - 5, 8, { align: 'right', color });
            }

            Y += SIZE + GAP;
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /**
     * Draw the analog-clock speed-run timer at the top-center of the screen.
     * Ring zones: gold (fast) → silver → bronze. Sweep hand shows elapsed time.
     */
    #drawTimerHUD(ctx) {
        const t = this.#levelTimer;
        const s = this.#parScreenCount;
        const gold = TIME_BONUS.GOLD_PER_SCREEN * s;
        const silver = TIME_BONUS.SILVER_PER_SCREEN * s;
        const bronze = TIME_BONUS.BRONZE_PER_SCREEN * s;

        let color, medalIcon;
        if (t <= gold) { color = TIME_BONUS.GOLD_COLOR; medalIcon = '\uD83E\uDD47'; } // 🥇
        else if (t <= silver) { color = TIME_BONUS.SILVER_COLOR; medalIcon = '\uD83E\uDD48'; } // 🥈
        else if (t <= bronze) { color = TIME_BONUS.BRONZE_COLOR; medalIcon = '\uD83E\uDD49'; } // 🥉
        else { color = TIME_BONUS.NONE_COLOR; medalIcon = '\u23F1'; } // ⏱

        const cx = DESIGN_WIDTH / 2;
        const cy = 40;
        const OR = 29;   // outer track radius
        const IR = 20;   // inner track radius  →  ring width = 9 px
        const HR = 25;   // clock-hand tip radius

        const START = -Math.PI / 2;                      // 12 o'clock
        const goldAng = (gold / bronze) * Math.PI * 2;
        const silverAng = (silver / bronze) * Math.PI * 2;
        const fullAng = Math.PI * 2;
        const currentAng = Math.min((t / bronze) * Math.PI * 2, fullAng);

        // helper: filled donut-arc segment (ring only)
        const donutArc = (fromA, toA, fillColor, alpha) => {
            if (toA <= fromA) return;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.arc(cx, cy, OR, START + fromA, START + toA);
            ctx.arc(cx, cy, IR, START + toA, START + fromA, true);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        };

        ctx.save();

        // ── 1  Background disc ───────────────────────────────────────
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(6, 12, 38, 0.90)';
        ctx.beginPath();
        ctx.arc(cx, cy, OR + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // ── 2  Dim zone arcs ─────────────────────────────────────────
        donutArc(0, goldAng, TIME_BONUS.GOLD_COLOR, 0.22);
        donutArc(goldAng, silverAng, TIME_BONUS.SILVER_COLOR, 0.18);
        donutArc(silverAng, fullAng, TIME_BONUS.BRONZE_COLOR, 0.14);

        // ── 3  Glowing progress sweep ────────────────────────────────
        if (t > 0) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            donutArc(0, currentAng, color, 0.90);
            ctx.shadowBlur = 0;
        }

        // ── 4  Inner disc re-fill (clear the hole) ───────────────────
        ctx.fillStyle = 'rgba(6, 12, 38, 0.94)';
        ctx.beginPath();
        ctx.arc(cx, cy, IR - 1, 0, Math.PI * 2);
        ctx.fill();

        // ── 5  Outer rim border ──────────────────────────────────────
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, OR + 2, 0, Math.PI * 2);
        ctx.stroke();

        // ── 6  Threshold tick marks (gold & silver transitions) ──────
        [[goldAng, TIME_BONUS.GOLD_COLOR], [silverAng, TIME_BONUS.SILVER_COLOR]].forEach(([ang, col]) => {
            const a = START + ang;
            ctx.strokeStyle = col;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.shadowColor = col;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * (IR - 3), cy + Math.sin(a) * (IR - 3));
            ctx.lineTo(cx + Math.cos(a) * (OR + 4), cy + Math.sin(a) * (OR + 4));
            ctx.stroke();
            ctx.shadowBlur = 0;
        });

        // ── 7  Digital time inside clock ─────────────────────────────
        bitmapFont.drawText(ctx, PlayingState.#formatTime(t), cx, cy + 1, 11, { align: 'center', color });

        // ── 8  Clock hand ────────────────────────────────────────────
        const handAng = START + currentAng;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(handAng) * 5, cy - Math.sin(handAng) * 5); // short tail
        ctx.lineTo(cx + Math.cos(handAng) * HR, cy + Math.sin(handAng) * HR);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // ── 9  Center pivot ──────────────────────────────────────────
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // ── 10  Medal icon below clock ───────────────────────────────
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(medalIcon, cx, cy + OR + 5);

        ctx.restore();
    }

    /**
     * Infinite mode analog clock: shows time on current screen.
     * The ring fills from 0 to bronze limit.  Medal colour changes live.
     * Also draws a checkpoint banner when a screen was just cleared.
     */
    #drawInfiniteTimerHUD(ctx) {
        const screenTime = this.#infScreenTimer - this.#infLastCpTime;
        const G = TIME_BONUS.GOLD_PER_SCREEN * 5;
        const S = TIME_BONUS.SILVER_PER_SCREEN * 5;
        const B = TIME_BONUS.BRONZE_PER_SCREEN * 5;

        let color, medalIcon;
        if (screenTime <= G) { color = TIME_BONUS.GOLD_COLOR; medalIcon = ''; }
        else if (screenTime <= S) { color = TIME_BONUS.SILVER_COLOR; medalIcon = ''; }
        else if (screenTime <= B) { color = TIME_BONUS.BRONZE_COLOR; medalIcon = ''; }
        else { color = TIME_BONUS.NONE_COLOR; medalIcon = ''; }

        const cx = DESIGN_WIDTH / 2;
        const cy = 40;
        const OR = 29, IR = 20, HR = 25;
        const START = -Math.PI / 2;
        const goldAng = (G / B) * Math.PI * 2;
        const silverAng = (S / B) * Math.PI * 2;
        const fullAng = Math.PI * 2;
        const currentAng = Math.min((screenTime / B) * Math.PI * 2, fullAng);

        const donutArc = (fromA, toA, fillColor, alpha) => {
            if (toA <= fromA) return;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.arc(cx, cy, OR, START + fromA, START + toA);
            ctx.arc(cx, cy, IR, START + toA, START + fromA, true);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        };

        ctx.save();

        // Background disc
        ctx.shadowColor = color; ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(6, 12, 38, 0.90)';
        ctx.beginPath(); ctx.arc(cx, cy, OR + 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Dim zone arcs
        donutArc(0, goldAng, TIME_BONUS.GOLD_COLOR, 0.22);
        donutArc(goldAng, silverAng, TIME_BONUS.SILVER_COLOR, 0.18);
        donutArc(silverAng, fullAng, TIME_BONUS.BRONZE_COLOR, 0.14);

        // Progress sweep
        if (screenTime > 0) {
            ctx.shadowColor = color; ctx.shadowBlur = 10;
            donutArc(0, currentAng, color, 0.90);
            ctx.shadowBlur = 0;
        }

        // Inner re-fill
        ctx.fillStyle = 'rgba(6, 12, 38, 0.94)';
        ctx.beginPath(); ctx.arc(cx, cy, IR - 1, 0, Math.PI * 2); ctx.fill();

        // Outer rim
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, OR + 2, 0, Math.PI * 2); ctx.stroke();

        // Threshold ticks
        [[goldAng, TIME_BONUS.GOLD_COLOR], [silverAng, TIME_BONUS.SILVER_COLOR]].forEach(([ang, col]) => {
            const a = START + ang;
            ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
            ctx.shadowColor = col; ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * (IR - 3), cy + Math.sin(a) * (IR - 3));
            ctx.lineTo(cx + Math.cos(a) * (OR + 4), cy + Math.sin(a) * (OR + 4));
            ctx.stroke(); ctx.shadowBlur = 0;
        });

        // Screen number chip (top-left of clock disc)
        const screenNum = (this.#infScreenCleared + 1) * 5; // next checkpoint floor number
        ctx.fillStyle = 'rgba(6,12,38,0.85)';
        ctx.strokeStyle = color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(cx - OR - 3, cy - OR - 3, 24, 14, 4); ctx.fill(); ctx.stroke();
        bitmapFont.drawText(ctx, `F${screenNum}`, cx - OR + 9, cy - OR + 4, 9, { align: 'center', color });

        // Digital time
        bitmapFont.drawText(ctx, PlayingState.#formatTime(screenTime), cx, cy + 1, 11, { align: 'center', color });

        // Clock hand
        const handAng = START + currentAng;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.shadowColor = color; ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(handAng) * 5, cy - Math.sin(handAng) * 5);
        ctx.lineTo(cx + Math.cos(handAng) * HR, cy + Math.sin(handAng) * HR);
        ctx.stroke(); ctx.shadowBlur = 0;

        // Center pivot
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = color; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

        // Medal icon below
        ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(medalIcon, cx, cy + OR + 5);

        // ── Checkpoint cleared banner ─────────────────────────────────────
        const anim = this.#infCheckpointAnim;
        if (anim && anim.life > 0) {
            const t = anim.life / anim.maxLife;
            const scale = t > 0.8 ? 1 + (1 - (t - 0.8) / 0.2) * 0.6 : 1; // pop in
            const alpha = t < 0.25 ? t / 0.25 : 1;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(cx, cy + OR + 100);
            ctx.scale(scale, scale);
            ctx.shadowColor = anim.color; ctx.shadowBlur = 18;
            ctx.strokeStyle = anim.color; ctx.lineWidth = 1.5;
            const bw = 110, bh = 22;
            ctx.fillStyle = 'rgba(6,12,38,0.92)';
            ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 8); ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 0;
            bitmapFont.drawText(ctx, anim.text, 0, 0, 13, { align: 'center', color: anim.color });
            ctx.restore();
        }

        ctx.restore();
    }

    #drawActivePowerUps(ctx) {
        if (!this.#player) return;

        const powerUps = [];
        if (this.#player.hasJetpack) powerUps.push({ icon: '🚀', color: COLORS.NEON_ORANGE });
        if (this.#player.hasShield) powerUps.push({ icon: '🛡️', color: COLORS.NEON_CYAN });
        if (this.#player.hasMagnet) powerUps.push({ icon: '🧲', color: COLORS.NEON_PURPLE });
        if (this.#player.hasSpringBoots) powerUps.push({ icon: '🥾', color: COLORS.NEON_GREEN });
        if (this.#player.hasSlowTime) powerUps.push({ icon: '⏱️', color: COLORS.NEON_BLUE });
        if (this.#player.hasDoubleCoins) powerUps.push({ icon: '💰', color: COLORS.NEON_YELLOW });
        // extra_life is instant — no active state to show

        powerUps.forEach((p, i) => {
            const x = 20 + i * 30;
            const y = 80;

            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.icon, x, y);
        });
    }
}
