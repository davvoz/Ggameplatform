import GameObject from '../GameObject.js';
import { ENEMY_TYPES } from "./types/ENEMY_TYPES.js";
import { MOVEMENT } from "./types/MOVEMENT.js";
import { drawW4Sprite } from './types/QuantumSprites.js';


// Shared performance mode (set once via Enemy.setPerformanceMode)
let _enemyPerfMode = 'high';
/**
 * Enemy - All enemy entities
 */
class Enemy extends GameObject {
    static setPerformanceMode(mode) { _enemyPerfMode = mode; }

    constructor(x, y, type, pattern, canvasWidth, difficultyConfig, level = 1) {
        const config = ENEMY_TYPES[type] || ENEMY_TYPES.scout;
        super(x, y, config.width, config.height);
        this.tag = 'enemy';
        this.type = type;
        this.config = { ...config }; // clone so we can modify
        
        // Apply difficulty multipliers
        const diff = difficultyConfig || {};
        const hpMult = diff.enemyHpMult || 1;
        const spdMult = diff.enemySpeedMult || 1;
        const frMult = diff.enemyFireRateMult || 1;

        // Level-based scaling: enemies get tougher each level within a world
        // Use world-relative level so W2L1 (level 31) scales like L1, not L31
        // HP: +6% per level (1.0x at L1, ~2.74x at L30)
        // Speed: +2% per level (1.0x at L1, ~1.58x at L30) 
        const worldRelLevel = ((level - 1) % 30) + 1; // 1-30 per world
        const levelHpMult = 1 + (worldRelLevel - 1) * 0.06;
        const levelSpdMult = 1 + (worldRelLevel - 1) * (level > 30 ? 0.012 : 0.02);
        
        this.health = Math.ceil(config.health * hpMult * levelHpMult);
        this.maxHealth = this.health;
        this.speed = config.speed * spdMult * levelSpdMult;
        this.score = config.score;
        this.canvasWidth = canvasWidth;
        this.pattern = pattern || 'straight';
        this.moveTimer = 0;
        this.movePhase = Math.random() > 0.5 ? 1 : -1;
        this.startX = x;
        this.startY = y;
        this.strafeY = 100 + Math.random() * 100; // for strafe pattern
        this.shootTimer = config.shootRate > 0 ? Math.random() * (config.shootRate * frMult) : 999;
        this.config.shootRate = config.shootRate * frMult; // adjusted fire rate
        this.dropChance = config.dropChance;
        this.targetX = 0;
        this.hitFlash = 0;

        // Stealth enemy — starts nearly invisible
        if (config.stealth) {
            this.alpha = 0.08;
        }
        // Spawner nest — limited spawn count
        if (config.spawner) {
            this.spawnTimer = 3 + Math.random() * 2;
            this.spawnsLeft = 2;
        }
        // Toxic blob — flag for split-on-death
        this._splits = !!config.splits;

        // ── W4 emergence animation ──
        if (config.w4behaviour) {
            this._emergeTimer = 0;
            this._emergeDuration = 0.7 + Math.random() * 0.25; // 0.7-0.95s
            const types = ['quantumTunnel', 'particleCondense', 'dimensionTear', 'latticeForm'];
            this._emergeType = types[Math.floor(Math.random() * types.length)];
            this._emergeComplete = false;
            // Start invisible — will materialise via the animation
            this._savedAlpha = this.alpha;
            this.alpha = 0;
        }
    }

    update(deltaTime, game) {
        // Allies are fully managed by AllyController — skip normal AI
        if (this._isAlly) return false;

        const dt = deltaTime * (game.timeScale || 1);
        this.moveTimer += dt;

        if (game.player && game.player.active) {
            this.targetX = game.player.position.x + game.player.width / 2;
        }

        // ── W4 emergence phase: block movement & shooting until complete ──
        if (this._emergeComplete === false) {
            this._emergeTimer += dt;
            const p = Math.min(1, this._emergeTimer / this._emergeDuration);
            // Ease-in alpha so the sprite materialises
            this.alpha = (this._savedAlpha || 1) * (p * p);
            // Suppress position changes — enemy holds at spawn Y
            this._invulnerable = true; // can't be hit during emergence
            if (p >= 1) {
                this._emergeComplete = true;
                this._invulnerable = false;
                this.alpha = this._savedAlpha || 1;
            }
            return false; // skip rest of update during emergence
        }

        // W4 quantum field: distortion zones freeze enemies
        if (this._quantumFrozen) {
            // Skip movement entirely — enemy is frozen in distortion
            return;
        }

        // W4 quantum field boost: enemies in danger zones move 30% faster
        let _savedSpeed;
        if (this._quantumBoosted) {
            _savedSpeed = this.speed;
            this.speed *= 1.3;
        }

        const moveFn = MOVEMENT[this.pattern];
        if (moveFn) moveFn(this, dt);

        // Restore speed after movement
        if (_savedSpeed !== undefined) this.speed = _savedSpeed;

        // ── Clamp visual position to screen bounds (don't move startX anchor) ──
        const margin = 10;
        this.position.x = Math.max(-margin, Math.min(this.canvasWidth - this.width + margin, this.position.x));

        if (this.config.shootRate > 0) {
            this.shootTimer -= dt;
            if (this.shootTimer <= 0) {
                this.shoot(game);
                this.shootTimer = this.config.shootRate + (Math.random() - 0.5) * 0.5;
            }
        }

        if (this.hitFlash > 0) this.hitFlash -= deltaTime * 5;

        // ── Stealth behaviour ──
        if (this.config.stealth && game.player && game.player.active) {
            const dx = (this.position.x + this.width / 2) - (game.player.position.x + game.player.width / 2);
            const dy = (this.position.y + this.height / 2) - (game.player.position.y + game.player.height / 2);
            const dist = Math.hypot(dx, dy);
            const targetAlpha = dist < 180 ? 1 : 0.08;
            this.alpha += (targetAlpha - this.alpha) * 3 * dt;
        }

        // ── Spawner nest behaviour ──
        if (this.config.spawner && this.spawnsLeft > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnTimer = 3.5 + Math.random();
                this.spawnsLeft--;
                const level = game.levelManager ? game.levelManager.currentLevel : 1;
                for (let i = 0; i < 2; i++) {
                    const sx = this.position.x + this.width / 2 + (Math.random() - 0.5) * 40;
                    const sy = this.position.y + this.height;
                    const spawn = new Enemy(sx, sy, 'swarm', 'straight', this.canvasWidth, game.difficulty, level);
                    game.entityManager.enemies.push(spawn);
                }
                game.particles.emit(this.position.x + this.width / 2, this.position.y + this.height / 2, 'hit', 6);
            }
        }

        // ── W3 special behaviours ──
        const w3b = this.config.w3behaviour;
        if (w3b) {
            const cx = this.position.x + this.width / 2;
            const cy = this.position.y + this.height / 2;

            if (w3b === 'blinker') {
                // Shoot immediately after a teleport blink
                if (this._justBlinked > 0 && this._justBlinked === 6 && this.config.shootRate > 0) {
                    this.shoot(game);
                }
            }

            if (w3b === 'phaser') {
                // Cycle visible/invisible every ~2.5s
                if (this._phaseTimer === undefined) this._phaseTimer = Math.random() * 2.5;
                this._phaseTimer -= dt;
                if (this._phaseTimer <= 0) {
                    this._phaseTimer = 2.0 + Math.random();
                    this._phaseVisible = !this._phaseVisible;
                }
                if (this._phaseVisible === undefined) this._phaseVisible = true;
                this.alpha = this._phaseVisible ? 1 : 0.08;
                this._invulnerable = !this._phaseVisible;
            }

            if (w3b === 'beacon') {
                // Boost speed of enemies within 120px radius
                if (!this._beaconTimer) this._beaconTimer = 0;
                this._beaconTimer -= dt;
                if (this._beaconTimer <= 0) {
                    this._beaconTimer = 0.5; // check twice per second
                    const enemies = game.entityManager ? game.entityManager.enemies : [];
                    for (const e of enemies) {
                        if (e === this || !e.active) continue;
                        const dx = (e.position.x + e.width / 2) - cx;
                        const dy = (e.position.y + e.height / 2) - cy;
                        if (dx * dx + dy * dy < 14400) { // 120px radius
                            e._boosted = 1.5; // will decay
                        }
                    }
                }
            }

            if (w3b === 'mirror') {
                // Mirror player X position (opposite side of screen)
                if (game.player && game.player.active) {
                    const playerCx = game.player.position.x + game.player.width / 2;
                    const mirrorX = this.canvasWidth - playerCx;
                    this.position.x += (mirrorX - this.width / 2 - this.position.x) * 3 * dt;
                }
            }

            if (w3b === 'shielder') {
                // Link shield with nearby data_cubes — reduce damage taken
                this._shieldLinked = false;
                const enemies = game.entityManager ? game.entityManager.enemies : [];
                for (const e of enemies) {
                    if (e === this || !e.active || e.config.w3behaviour !== 'shielder') continue;
                    const dx = (e.position.x + e.width / 2) - cx;
                    const dy = (e.position.y + e.height / 2) - cy;
                    if (dx * dx + dy * dy < 22500) { // 150px radius
                        this._shieldLinked = true;
                        this._shieldPartner = e;
                        break;
                    }
                }
            }
        }

        // ── W4 special behaviours ──
        const w4b = this.config.w4behaviour;
        if (w4b) {
            const cx = this.position.x + this.width / 2;
            const cy = this.position.y + this.height / 2;
            const enemies = game.entityManager ? game.entityManager.enemies : [];

            if (w4b === 'triplet') {
                // Quark triplet — linked to 2 nearest quark_triplet allies.
                // If a kin dies, other kin have 3s to die or dead kin reforms.
                if (!this._tripletLinked) this._tripletLinked = false;
                if (!this._tripletKin) {
                    // Find nearest 2 quark_triplet allies on first tick
                    const kin = enemies.filter(e => e !== this && e.active && e.config.w4behaviour === 'triplet');
                    kin.sort((a, b) => {
                        const da = Math.hypot(a.position.x - cx, a.position.y - cy);
                        const db = Math.hypot(b.position.x - cx, b.position.y - cy);
                        return da - db;
                    });
                    this._tripletKin = kin.slice(0, 2);
                    this._tripletLinked = this._tripletKin.length > 0;
                }
                // Reform timer: if a kin died, count down
                if (this._reformTimer !== undefined && this._reformTimer > 0) {
                    this._reformTimer -= dt;
                    if (this._reformTimer <= 0) {
                        // Reform dead kin
                        const level = game.levelManager ? game.levelManager.currentLevel : 1;
                        for (let i = 0; i < 2; i++) {
                            const sx = cx + (i === 0 ? -25 : 25);
                            const reformed = new Enemy(sx, cy - 20, 'quark_triplet', 'orbital', this.canvasWidth, game.difficulty, level);
                            reformed._tripletKin = null; // re-link next frame
                            enemies.push(reformed);
                        }
                        this._reformTimer = undefined;
                        game.particles.emit(cx, cy, 'hit', 8);
                    }
                }
            }

            if (w4b === 'oscillator') {
                // Neutrino oscillation — 3 flavor states, only 1 is vulnerable
                if (this._flavorIdx === undefined) this._flavorIdx = 0;
                if (this._flavorTimer === undefined) this._flavorTimer = 2;
                this._flavorTimer -= dt;
                if (this._flavorTimer <= 0) {
                    this._flavorTimer = 1.8 + Math.random() * 0.5;
                    this._flavorIdx = (this._flavorIdx + 1) % 3;
                }
                // Only vulnerable in flavor 0 (electron neutrino)
                this._invulnerable = this._flavorIdx !== 0;
                // Visual: alpha indicates vulnerability
                const flavors = ['#aa88ff', '#88ddff', '#ffaa55'];
                this.config.color = flavors[this._flavorIdx];
                this.alpha = this._flavorIdx === 0 ? 1 : 0.35;
            }

            if (w4b === 'forcelink') {
                // Boson carrier — link 2 nearest enemies, granting them 50% damage resist
                if (!this._forceLinkTimer) this._forceLinkTimer = 0;
                this._forceLinkTimer -= dt;
                if (this._forceLinkTimer <= 0) {
                    this._forceLinkTimer = 0.5;
                    this._forceLinked = [];
                    const nearby = enemies.filter(e => e !== this && e.active && !e._isAlly);
                    nearby.sort((a, b) => {
                        const da = Math.hypot(a.position.x - cx, a.position.y - cy);
                        const db = Math.hypot(b.position.x - cx, b.position.y - cy);
                        return da - db;
                    });
                    for (let i = 0; i < Math.min(2, nearby.length); i++) {
                        if (Math.hypot(nearby[i].position.x - cx, nearby[i].position.y - cy) < 160) {
                            nearby[i]._forceBoosted = true;
                            this._forceLinked.push(nearby[i]);
                        }
                    }
                }
            }

            if (w4b === 'massfield') {
                // Higgs field — expanding aura that slows nearby player bullets
                if (this._fieldRadius === undefined) this._fieldRadius = 30;
                this._fieldRadius = Math.min(120, this._fieldRadius + 8 * dt); // grows over time
                // Slow player bullets within the field
                if (game.entityManager) {
                    for (const b of game.entityManager.bullets) {
                        if (!b.active || b.tag !== 'player') continue;
                        const bx = b.position.x + b.width / 2;
                        const by = b.position.y + b.height / 2;
                        const dist = Math.hypot(bx - cx, by - cy);
                        if (dist < this._fieldRadius) {
                            // Slow bullets by 40%
                            b.velocity.y *= 0.96;
                        }
                    }
                }
            }

            if (w4b === 'antimatter') {
                // Positron mirror — track twin. If twin dies, start 2s timer. If self dies first, twin starts timer.
                if (this._annihilateTimer !== undefined && this._annihilateTimer > 0) {
                    this._annihilateTimer -= dt;
                    if (this._annihilateTimer <= 0) {
                        // Twin not killed in time — reform twin
                        const level = game.levelManager ? game.levelManager.currentLevel : 1;
                        const sx = this.canvasWidth - cx; // mirror position
                        const reformed = new Enemy(sx, cy, 'positron_mirror', 'superposition', this.canvasWidth, game.difficulty, level);
                        enemies.push(reformed);
                        this._annihilateTimer = undefined;
                        game.particles.emit(sx, cy, 'hit', 6);
                    }
                }
            }

            if (w4b === 'chain') {
                // Gluon chain — only endpoints take damage. Middle links are invulnerable.
                if (!this._chainInit) {
                    this._chainInit = true;
                    // Find all gluon_chain enemies and determine position in chain by Y
                    const chains = enemies.filter(e => e.active && e.config.w4behaviour === 'chain');
                    chains.sort((a, b) => a.position.y - b.position.y);
                    const idx = chains.indexOf(this);
                    // Endpoints are first and last
                    this._isEndpoint = (idx === 0 || idx === chains.length - 1 || chains.length <= 2);
                }
                this._invulnerable = !this._isEndpoint;
            }
        }

        // Clear force boost each frame (re-applied by active boson_carriers)
        if (this._forceBoosted) {
            this._forceBoostedVisual = true; // for rendering
            this._forceBoosted = false;
        } else {
            this._forceBoostedVisual = false;
        }

        // Apply beacon boost and decay it
        if (this._boosted && this._boosted > 1) {
            this.position.y += this.speed * 0.5 * dt; // extra downward speed
            this._boosted -= dt;
            if (this._boosted <= 1) this._boosted = 0;
        }

        if (this.position.y > game.logicalHeight + 50) {
            this.destroy();
        }
    }

    shoot(game) {
        const cx = this.position.x + this.width / 2;
        const by = this.position.y + this.height;
        const bsMult = (game.difficulty && game.difficulty.enemyBulletSpeedMult) || 1;
        game.spawnBullet(cx, by, 0, 200 * bsMult, 'enemy');
        game.sound.playEnemyShoot();
    }

    takeDamage(amount, game) {
        // Phaser invulnerability
        if (this._invulnerable) return false;
        // Shielder damage reduction when linked
        if (this._shieldLinked) amount = Math.max(1, Math.ceil(amount * 0.4));
        // W4 force-boosted damage reduction (boson_carrier link)
        if (this._forceBoostedVisual) amount = Math.max(1, Math.ceil(amount * 0.5));
        // W4 quantum field weakness — info zone amplifies damage by 50%
        if (this._quantumWeak) amount = Math.ceil(amount * 1.5);

        this.health -= amount;
        this.hitFlash = 1;

        game.particles.emit(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2,
            'hit', 4
        );

        if (this.health <= 0) {
            this.health = 0;

            // W4 triplet: start reform timer on surviving kin
            if (this.config.w4behaviour === 'triplet' && this._tripletKin) {
                for (const kin of this._tripletKin) {
                    if (kin.active && kin._reformTimer === undefined) {
                        kin._reformTimer = 3; // 3s to kill remaining kin
                    }
                }
            }

            // W4 antimatter: start annihilate timer on twin
            if (this.config.w4behaviour === 'antimatter' && game.entityManager) {
                const enemies = game.entityManager.enemies;
                const twins = enemies.filter(e => e !== this && e.active && e.config.w4behaviour === 'antimatter');
                for (const twin of twins) {
                    if (twin._annihilateTimer === undefined) {
                        twin._annihilateTimer = 2; // 2s to kill twin
                    }
                }
            }

            // W4 chain: when endpoint dies, re-evaluate chain endpoints
            if (this.config.w4behaviour === 'chain' && game.entityManager) {
                const chains = game.entityManager.enemies.filter(e => e !== this && e.active && e.config.w4behaviour === 'chain');
                for (const c of chains) c._chainInit = false; // force re-evaluation
            }

            // Fragmenter: splits into 3 fast micro-shards on death
            if (this.config.w3behaviour === 'fragmenter' && !this._isShard && game.entityManager) {
                const level = game.levelManager ? game.levelManager.currentLevel : 1;
                for (let i = 0; i < 3; i++) {
                    const angle = (i - 1) * 0.5; // -0.5, 0, 0.5 spread
                    const sx = this.position.x + this.width / 2 + (i - 1) * 18;
                    const sy = this.position.y;
                    const shard = new Enemy(sx, sy, 'fragment_shard', 'straight', this.canvasWidth, game.difficulty, level);
                    shard.health = 1;
                    shard.maxHealth = 1;
                    shard.speed *= 1.8;
                    shard.width = 12;
                    shard.height = 12;
                    shard._isShard = true; // prevent recursive splitting
                    shard.config = { ...shard.config, w3behaviour: null }; // no further splits
                    shard.startX = sx;
                    // Give some horizontal velocity via phase
                    shard.movePhase = angle > 0 ? 1 : -1;
                    shard.pattern = 'sine';
                    game.entityManager.enemies.push(shard);
                }
                game.particles.emit(this.position.x + this.width / 2, this.position.y + this.height / 2, 'hit', 10);
            }

            // Toxic blob splits into 2 mini swarm enemies on death
            if (this._splits && game.entityManager) {
                const level = game.levelManager ? game.levelManager.currentLevel : 1;
                for (let i = 0; i < 2; i++) {
                    const ox = (i === 0 ? -20 : 20);
                    const spawn = new Enemy(
                        this.position.x + ox, this.position.y,
                        'swarm', 'sine', this.canvasWidth, game.difficulty, level
                    );
                    spawn._splits = false; // prevent infinite recursion
                    game.entityManager.enemies.push(spawn);
                }
            }
            this.destroy();
            return true;
        }
        return false;
    }

    /** Spectacular W4 enemy background-emergence animation */
    _drawEmergeFX(ctx, cx, cy, progress) {
        const t = Date.now() * 0.001;
        const r = Math.max(this.width, this.height) * 0.7;
        const col = this.config.color || '#8888ff';

        ctx.save();
        switch (this._emergeType) {
            case 'quantumTunnel': {
                // Expanding ring of probability waves, glitchy flashes
                const rings = 4;
                for (let i = 0; i < rings; i++) {
                    const rp = (progress + i * 0.15) % 1;
                    const rr = r * 0.3 + r * 1.2 * (1 - rp);
                    ctx.globalAlpha = rp * 0.3 * (1 - progress);
                    ctx.strokeStyle = col;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
                    ctx.stroke();
                }
                // Central flash intensifying
                ctx.globalAlpha = progress * progress * 0.4;
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(cx, cy, r * (0.1 + progress * 0.5), 0, Math.PI * 2);
                ctx.fill();
                // Glitch lines
                if (progress < 0.7) {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = (0.7 - progress) * 0.5;
                    ctx.strokeStyle = col;
                    ctx.lineWidth = 1;
                    for (let i = 0; i < 6; i++) {
                        const yOff = (Math.sin(t * 20 + i * 5) * r * 0.4);
                        const xSpread = r * progress;
                        ctx.beginPath();
                        ctx.moveTo(cx - xSpread, cy + yOff);
                        ctx.lineTo(cx + xSpread, cy + yOff);
                        ctx.stroke();
                    }
                }
                break;
            }
            case 'particleCondense': {
                // Particles converging from all directions into center
                const count = 16;
                ctx.globalCompositeOperation = 'lighter';
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 / count) * i + t * 2;
                    const dist = r * 2.5 * (1 - progress);
                    const px = cx + Math.cos(angle) * dist;
                    const py = cy + Math.sin(angle) * dist;
                    const size = 2 + progress * 3;
                    ctx.globalAlpha = progress * 0.5;
                    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : col;
                    ctx.beginPath();
                    ctx.arc(px, py, size, 0, Math.PI * 2);
                    ctx.fill();
                    // Trail
                    if (progress > 0.2) {
                        ctx.globalAlpha = progress * 0.15;
                        ctx.strokeStyle = col;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        const trailDist = dist + 15;
                        ctx.lineTo(cx + Math.cos(angle) * trailDist, cy + Math.sin(angle) * trailDist);
                        ctx.stroke();
                    }
                }
                // Core forming
                ctx.globalAlpha = progress * progress * 0.3;
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(cx, cy, r * progress * 0.6, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'dimensionTear': {
                // A vertical crack in space-time opens and the enemy steps through
                const crackH = r * 2.5 * Math.min(1, progress * 2);
                const crackO = progress > 0.5 ? (progress - 0.5) * 2 : 0;
                const crackW = 3 + crackO * r * 0.8;
                // Dark rift
                ctx.globalAlpha = 0.5 * Math.min(1, progress * 3);
                ctx.fillStyle = '#000011';
                ctx.beginPath();
                ctx.ellipse(cx, cy, crackW * 0.5, crackH * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Rift edges — glowing
                ctx.strokeStyle = col;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6 * Math.min(1, progress * 3);
                ctx.shadowColor = col;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                const segs = 12;
                for (let side = -1; side <= 1; side += 2) {
                    ctx.beginPath();
                    for (let i = 0; i <= segs; i++) {
                        const f = i / segs;
                        const yp = cy - crackH / 2 + crackH * f;
                        const xp = cx + side * crackW * 0.5 + Math.sin(f * Math.PI * 3 + t * 5) * 2;
                        i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
                    }
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                // Energy sparks at edges
                if (progress > 0.3) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = (progress - 0.3) * 0.5;
                    for (let i = 0; i < 8; i++) {
                        const sparkA = Math.sin(t * 12 + i * 4) * crackW * 0.6;
                        const sparkY = cy + (i / 7 - 0.5) * crackH * 0.8;
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(cx + sparkA, sparkY, 1.5 + Math.sin(t * 15 + i) * 0.8, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
            }
            case 'latticeForm': {
                // Hexagonal lattice grid materialises, then collapses into the enemy
                const baseAlpha = Math.min(1, progress * 2);
                const collapse = progress > 0.5 ? (progress - 0.5) * 2 : 0;
                const gridR = r * 1.8 * (1 - collapse * 0.7);
                ctx.globalAlpha = baseAlpha * 0.25 * (1 - collapse);
                ctx.strokeStyle = col;
                ctx.lineWidth = 0.8;
                // Hex grid
                const hexSize = 10;
                const rows = 5;
                for (let row = -rows; row <= rows; row++) {
                    for (let col2 = -rows; col2 <= rows; col2++) {
                        const hx = cx + col2 * hexSize * 1.5;
                        const hy = cy + row * hexSize * 1.73 + (col2 % 2) * hexSize * 0.87;
                        if (Math.hypot(hx - cx, hy - cy) > gridR) continue;
                        ctx.beginPath();
                        for (let v = 0; v < 6; v++) {
                            const a = Math.PI / 3 * v;
                            const vx = hx + Math.cos(a) * hexSize * 0.45;
                            const vy = hy + Math.sin(a) * hexSize * 0.45;
                            v === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
                        }
                        ctx.closePath();
                        ctx.stroke();
                    }
                }
                // Bright nodes at vertices that light up in sequence
                ctx.globalAlpha = baseAlpha * 0.4;
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = col;
                const nodeCount = 12;
                for (let i = 0; i < nodeCount; i++) {
                    const na = (Math.PI * 2 / nodeCount) * i;
                    const nr = gridR * 0.6;
                    const nx = cx + Math.cos(na) * nr * (1 - collapse);
                    const ny = cy + Math.sin(na) * nr * (1 - collapse);
                    const bright = Math.sin(t * 8 + i * 1.3) > 0 ? 1 : 0.3;
                    ctx.globalAlpha = baseAlpha * 0.5 * bright;
                    ctx.beginPath();
                    ctx.arc(nx, ny, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
        }
        ctx.restore();
    }

    render(ctx, assets) {
        if (!this.active) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;

        // ── W4 emergence FX — drawn BEFORE the enemy body ──
        if (this._emergeComplete === false && this._emergeTimer !== undefined) {
            const ep = Math.min(1, this._emergeTimer / this._emergeDuration);
            this._drawEmergeFX(ctx, cx, cy, ep);
        }

        // Glow aura — always rendered, shadowBlur only on high
        if (_enemyPerfMode === 'high') {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.shadowColor = this.config.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = this.config.color;
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            // Cheap glow: semi-transparent circle, no shadowBlur (visually close)
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = this.config.color;
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = this.alpha;
        }

        const sprite = assets.getSprite(`enemy_${this.type}`);
        const pad = 8;
        if (sprite) {
            ctx.drawImage(sprite, this.position.x - pad, this.position.y - pad, this.width + pad * 2, this.height + pad * 2);
        } else if (this.config.w4behaviour) {
            // Rich procedural cartoon sprite for W4 enemies
            const t = Date.now() * 0.001;
            drawW4Sprite(ctx, this.type, cx, cy, this.width, this.height, t, {
                flavorIdx: this._flavorIdx || 0,
                fieldRadius: this._fieldRadius || 0,
                annihilateTimer: this._annihilateTimer || 0,
                reformTimer: this._reformTimer || 0,
                isEndpoint: this._isEndpoint !== false,
                forceBoosted: !!this._forceBoostedVisual,
            });
        } else {
            ctx.fillStyle = this.config.color;
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        }

        if (this.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = this.hitFlash * 0.6;
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.maxHealth > 1 && this.health < this.maxHealth) {
            const barW = this.width + 4;
            const barH = 4;
            const barX = this.position.x - 2;
            const barY = this.position.y - 8;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 2);
            ctx.fill();
            const hpRatio = this.health / this.maxHealth;
            const hpColor = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
            ctx.fillStyle = hpColor;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * hpRatio, barH, 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 2);
            ctx.stroke();
        }

        // ── W3 visual effects ──
        const w3b = this.config.w3behaviour;
        if (w3b) {
            // Blinker: bright cyan flash after teleport
            if (w3b === 'blinker' && this._justBlinked > 0) {
                ctx.save();
                ctx.globalAlpha = this._justBlinked / 8;
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = '#00ffff';
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Phaser: shimmer ring when invisible
            if (w3b === 'phaser' && !this._phaseVisible) {
                ctx.save();
                ctx.globalAlpha = 0.3 + 0.15 * Math.sin(Date.now() * 0.008);
                ctx.strokeStyle = '#ff44ff';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * 0.6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Beacon: pulsing orange aura
            if (w3b === 'beacon') {
                ctx.save();
                const pulse = 0.12 + 0.08 * Math.sin(Date.now() * 0.005);
                ctx.globalAlpha = pulse;
                ctx.fillStyle = '#ff8800';
                ctx.beginPath();
                ctx.arc(cx, cy, 60, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Shielder: draw link line to partner
            if (w3b === 'shielder' && this._shieldLinked && this._shieldPartner && this._shieldPartner.active) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.strokeStyle = '#44aaff';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 3]);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                const px = this._shieldPartner.position.x + this._shieldPartner.width / 2;
                const py = this._shieldPartner.position.y + this._shieldPartner.height / 2;
                ctx.lineTo(px, py);
                ctx.stroke();
                // Small shield hexagon around self
                ctx.globalAlpha = 0.2;
                ctx.strokeStyle = '#88ccff';
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3;
                    const r = this.width * 0.55;
                    const method = i === 0 ? 'moveTo' : 'lineTo';
                    ctx[method](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }

            // Mirror: vertical mirror line indicator
            if (w3b === 'mirror') {
                ctx.save();
                ctx.globalAlpha = 0.15;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 6]);
                ctx.beginPath();
                ctx.moveTo(cx, 0);
                ctx.lineTo(cx, ctx.canvas ? ctx.canvas.height : 800);
                ctx.stroke();
                ctx.restore();
            }
        }

        // ── W4 visual effects ──
        const w4b = this.config.w4behaviour;
        if (w4b) {
            // Triplet: draw gluon lines to kin
            if (w4b === 'triplet' && this._tripletKin) {
                ctx.save();
                const quarkColors = ['#ff3355', '#33ff77', '#3366ff'];
                for (let i = 0; i < this._tripletKin.length; i++) {
                    const kin = this._tripletKin[i];
                    if (!kin.active) continue;
                    ctx.globalAlpha = 0.3;
                    ctx.strokeStyle = quarkColors[i % 3];
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    // Wavy gluon line
                    const kx = kin.position.x + kin.width / 2;
                    const ky = kin.position.y + kin.height / 2;
                    const segs = 8;
                    for (let s = 0; s <= segs; s++) {
                        const t = s / segs;
                        const mx = cx + (kx - cx) * t;
                        const my = cy + (ky - cy) * t;
                        const perp = Math.sin(t * Math.PI * 3 + Date.now() * 0.005) * 5;
                        const ndx = ky - cy, ndy = -(kx - cx);
                        const nLen = Math.hypot(ndx, ndy) || 1;
                        const px = mx + (ndx / nLen) * perp;
                        const py = my + (ndy / nLen) * perp;
                        if (s === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                }
                // Reform warning: pulsing glow when reform timer active
                if (this._reformTimer !== undefined) {
                    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.015);
                    ctx.fillStyle = '#ff3355';
                    ctx.beginPath();
                    ctx.arc(cx, cy, this.width * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            // Oscillator: flavor ring indicator
            if (w4b === 'oscillator') {
                ctx.save();
                const flavors = ['#aa88ff', '#88ddff', '#ffaa55'];
                // Draw 3 small dots showing which flavor is active
                for (let i = 0; i < 3; i++) {
                    const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
                    const dx = Math.cos(angle) * (this.width * 0.45);
                    const dy = Math.sin(angle) * (this.width * 0.45);
                    ctx.globalAlpha = (i === this._flavorIdx) ? 0.8 : 0.15;
                    ctx.fillStyle = flavors[i];
                    ctx.beginPath();
                    ctx.arc(cx + dx, cy + dy, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Vulnerable flash when in flavor 0
                if (this._flavorIdx === 0) {
                    ctx.globalAlpha = 0.15 + 0.1 * Math.sin(Date.now() * 0.01);
                    ctx.strokeStyle = '#aa88ff';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(cx, cy, this.width * 0.55, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Forcelink: draw force lines to linked enemies
            if (w4b === 'forcelink' && this._forceLinked) {
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = '#ffee33';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 3]);
                for (const linked of this._forceLinked) {
                    if (!linked.active) continue;
                    const lx = linked.position.x + linked.width / 2;
                    const ly = linked.position.y + linked.height / 2;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(lx, ly);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
                // Boson glow
                ctx.globalAlpha = 0.12;
                ctx.fillStyle = '#ffee33';
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Massfield: expanding golden field
            if (w4b === 'massfield' && this._fieldRadius) {
                ctx.save();
                ctx.globalAlpha = 0.08 + 0.04 * Math.sin(Date.now() * 0.004);
                const fieldGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, this._fieldRadius);
                fieldGrad.addColorStop(0, '#ffd700');
                fieldGrad.addColorStop(0.7, 'rgba(255,215,0,0.05)');
                fieldGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fieldGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, this._fieldRadius, 0, Math.PI * 2);
                ctx.fill();
                // Concentric rings
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 0.5;
                ctx.globalAlpha = 0.12;
                for (let r = 30; r < this._fieldRadius; r += 25) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Antimatter: annihilation countdown ring
            if (w4b === 'antimatter' && this._annihilateTimer !== undefined) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.strokeStyle = '#ff4488';
                ctx.lineWidth = 2;
                const remaining = this._annihilateTimer / 2; // 0..1
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * 0.6, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Chain: invulnerable glow on middle links
            if (w4b === 'chain' && !this._isEndpoint) {
                ctx.save();
                ctx.globalAlpha = 0.2 + 0.1 * Math.sin(Date.now() * 0.006);
                ctx.strokeStyle = '#33ff77';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * 0.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Quantum tunnel flash
            if (this._justTunneled > 0) {
                ctx.save();
                ctx.globalAlpha = this._justTunneled / 10;
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = '#4488ff';
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Wave function collapse flash
            if (this._wfCollapse > 0) {
                ctx.save();
                ctx.globalAlpha = this._wfCollapse / 8;
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = '#aa88ff';
                ctx.beginPath();
                ctx.arc(cx, cy, this.width * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Superposition ghost rendering
            if (this._ghostX !== undefined) {
                ctx.save();
                ctx.globalAlpha = 0.2;
                const ghostSprite = assets.getSprite(`enemy_${this.type}`);
                const gpd = 8;
                if (ghostSprite) {
                    ctx.drawImage(ghostSprite, this._ghostX - this.width / 2 - gpd, this._ghostY - this.height / 2 - gpd, this.width + gpd * 2, this.height + gpd * 2);
                } else {
                    ctx.fillStyle = this.config.color;
                    ctx.fillRect(this._ghostX - this.width / 2, this._ghostY - this.height / 2, this.width, this.height);
                }
                // Dashed line connecting real and ghost
                ctx.globalAlpha = 0.1;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([3, 5]);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(this._ghostX, this._ghostY);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        // Force-boosted visual (from boson carrier)
        if (this._forceBoostedVisual) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = '#ffee33';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.55, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Virus infection: purple pulsing glow
        if (this._virusInfected) {
            ctx.save();
            const vCx = this.position.x + this.width / 2;
            const vCy = this.position.y + this.height / 2;
            const vR = Math.max(this.width, this.height) * 0.7;
            const vPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
            ctx.globalAlpha = 0.25 + vPulse * 0.2;
            ctx.fillStyle = '#b400ff';
            ctx.beginPath();
            ctx.arc(vCx, vCy, vR, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.6 + vPulse * 0.3;
            ctx.strokeStyle = '#d060ff';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(vCx, vCy, vR * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Phase drift afterimages
        if (this._afterimages && this._afterimages.length > 0) {
            ctx.save();
            const sprite = assets.getSprite(`enemy_${this.type}`);
            const pad = 8;
            for (let i = 0; i < this._afterimages.length; i++) {
                const ai = this._afterimages[i];
                ctx.globalAlpha = ai.a * 0.3;
                if (sprite) {
                    ctx.drawImage(sprite, ai.x - pad, ai.y - pad, this.width + pad * 2, this.height + pad * 2);
                } else {
                    ctx.fillStyle = this.config.color;
                    ctx.fillRect(ai.x, ai.y, this.width, this.height);
                }
            }
            ctx.restore();
        }

        // ── W4 Quantum field zone visual indicators ──
        if (this._quantumWeak) {
            // Weakened: blue cracking aura — enemy takes more damage
            ctx.save();
            const qp = 0.3 + 0.2 * Math.sin(Date.now() * 0.008);
            ctx.globalAlpha = qp;
            ctx.strokeStyle = '#66aaff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.55, 0, Math.PI * 2);
            ctx.stroke();
            // Fracture lines
            ctx.globalAlpha = qp * 0.6;
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const a = Math.PI / 2 * i + Date.now() * 0.002;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * this.width * 0.3, cy + Math.sin(a) * this.width * 0.3);
                ctx.lineTo(cx + Math.cos(a) * this.width * 0.6, cy + Math.sin(a) * this.width * 0.6);
                ctx.stroke();
            }
            ctx.restore();
        }
        if (this._quantumBoosted) {
            // Boosted: red pulsing aura — enemy is empowered
            ctx.save();
            const rp = 0.2 + 0.15 * Math.sin(Date.now() * 0.01);
            ctx.globalAlpha = rp;
            ctx.fillStyle = '#ff3333';
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        if (this._quantumFrozen) {
            // Frozen: purple glitch distortion — enemy can't move
            ctx.save();
            const fp = 0.35 + 0.2 * Math.sin(Date.now() * 0.012);
            ctx.globalAlpha = fp;
            ctx.strokeStyle = '#cc44ff';
            ctx.lineWidth = 2;
            // Distorted ring
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.15) {
                const warp = 1 + 0.15 * Math.sin(a * 5 + Date.now() * 0.006);
                const r = this.width * 0.55 * warp;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            // Glitch lines
            ctx.globalAlpha = fp * 0.5;
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const offset = (Math.sin(Date.now() * 0.003 + i * 2) * 4);
                ctx.beginPath();
                ctx.moveTo(cx - this.width * 0.5, cy + offset + (i - 1) * 6);
                ctx.lineTo(cx + this.width * 0.5, cy + offset + (i - 1) * 6);
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.restore();
    }
}

export default Enemy;