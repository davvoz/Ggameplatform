import { Collisions } from '../physics/Collisions.js';
import { GameConfig as C } from '../config/GameConfig.js';
import { Bumper }       from '../entities/Bumper.js';
import { CurvedWall }   from '../entities/CurvedWall.js';
import { DropTarget }   from '../entities/DropTarget.js';
import { Flipper }      from '../entities/Flipper.js';
import { Slingshot }    from '../entities/Slingshot.js';
import { Gate }         from '../entities/Gate.js';
import { Light }        from '../entities/Light.js';
import { WarpHole }     from '../entities/WarpHole.js';
import { Kicker }       from '../entities/Kicker.js';
import { SpinningGear } from '../entities/SpinningGear.js';
import { Pendulum }     from '../entities/Pendulum.js';
import { Corridor }      from '../entities/Corridor.js';
import { CurvedCorridor } from '../entities/CurvedCorridor.js';
import { Spring }        from '../entities/Spring.js';
import { LaunchSpring }  from '../entities/LaunchSpring.js';
import { DemonBoss }     from '../bosses/DemonBoss.js';
import { DragonBoss }    from '../bosses/DragonBoss.js';
import { GolemBoss }     from '../bosses/GolemBoss.js';
import { WitchBoss }     from '../bosses/WitchBoss.js';

/**
 * Data-driven section. Reads all entity definitions and boss config from a
 * level JSON config object. No subclasses needed — adding a new floor only
 * requires a new JSON file and a CONFIG_KEY entry in SectionRegistry.
 *
 * The section knows nothing about scoring; it forwards events through
 * onScore(amount) and onEvent(type, amount?) callbacks.
 */
export class Section {
    /**
     * @param {number} top  world Y of section top
     * @param {object} cfg  parsed level JSON (palette, entities…)
     */
    constructor(top, cfg) {
        this.sectionKey  = cfg.section ?? '';   // e.g. 'main_table' — used for named lookups
        this.top    = top;
        this.bottom = top + C.SECTION_HEIGHT;
        this.width  = C.WORLD_WIDTH;
        this.height = C.SECTION_HEIGHT;
        this.palette      = cfg.palette;
        this.background   = cfg.background ?? null;
        // Per-section right playfield boundary (from JSON "boundary.right").
        // Sections with a hard right wall at x<WORLD_WIDTH declare it so
        // _clampToBoundary can catch balls that tunnelled through the wall.
        // Sections that legitimately share the right edge (e.g. launch channel
        // in main_table) omit it, defaulting to WORLD_WIDTH.
        this._rightBound  = cfg.boundary?.right ?? C.WORLD_WIDTH;
        /** @type {string} Audio profile id — drives SoundManager.applyProfile() on section entry. */
        this.audioProfile = cfg.audioProfile ?? C.AUDIO_DEFAULT_PROFILE;

        // Outer wall segments [ax, ay, bx, by, restitution]
        this.walls = [];
        this.curves = [];
        this.bumpers = [];
        this.targets = [];
        this.slings = [];
        this.flippers = [];
        this.kickers = [];
        this.gates = [];
        this.lights = [];
        this.warps = [];
        this.warpExits = [];   // raw exit descriptors — consumed once by WarpWirer
        this.gears = [];
        this.pendulums = [];
        this.corridors = [];
        this.curvedCorridors = [];
        this.springs = [];
        this.launchSprings = [];
        this.deathLines = [];
        this.boss = null;
        this._bankResetting = false;

        this.onScore   = null;
        this.onEvent   = null;
        this.onGatePass = null;

        this._buildEntitiesFromConfig(cfg, top);
        this._buildBoss(cfg.boss, top);
        for (const bg of cfg.brickGrids ?? []) {
            this._buildBrickGrid(bg, top);
        }
    }

    _emit(score, type) {
        if (score && this.onScore) this.onScore(score);
        if (type && this.onEvent) this.onEvent(type);
    }

    update(dt) {
        for (const b of this.bumpers) b.update(dt);
        for (const t of this.targets) t.update(dt);
        for (const s of this.slings) s.update(dt);
        for (const f of this.flippers) f.update(dt);
        for (const k of this.kickers) k.update(dt);
        for (const g of this.gates) g.update(dt);
        for (const l of this.lights) l.update(dt);
        for (const w of this.warps) w.update(dt);
        for (const g of this.gears)      g.update(dt);
        for (const pd of this.pendulums) pd.update(dt);
        for (const sp of this.springs)      sp.update(dt);
        for (const ls of this.launchSprings) ls.update(dt);
        // corridors and curvedCorridors are static — no update needed
        if (this.boss) this.boss.update(dt);
    }

    /**
     * Resolve ball collisions against all owned colliders. Called by physics.
     * @param {import('../physics/Ball.js').Ball} ball
     * @param {number} [dt=0] substep delta-time (used by environmental forces, e.g. boss wind)
     */
    resolve(ball, dt = 0) {
        if (this._resolveInterceptors(ball)) return;

        const prevY = ball.pos.y - ball.vel.y * (1 / 60);

        // Environmental forces (boss wind etc.) — applied before collisions
        // so the resolved velocity already accounts for the push this substep.
        if (this.boss?.applyWindToBall) this.boss.applyWindToBall(ball, dt);

        // Walls (static lines)
        this.resolveWallCollisions(ball);
        for (const c of this.curves) c.resolve(ball);
        this._resolveCorridors(ball);

        this._resolveDynamicEntities(ball);

        // One-way gates physically block the wrong-direction crossing
        for (const g of this.gates) g.block(ball);

        this._resolveBoss(ball);

        for (const g of this.gates) g.checkCrossing(ball, prevY);

        this._clampToBoundary(ball);
           const allDown = this.targets.length > 0 &&
            this.targets.every(t => !t.standing && !t.respawning);
        if (!this._bankResetting && allDown) {
            this._bankResetting = true;
            this._emit(C.TARGET_BANK_BONUS, 'target_bank');
            this.targets.forEach((t, i) => t.beginRespawn(0.5 + i * 0.18));
        }
        if (this._bankResetting && this.targets.every(t => t.standing)) {
            this._bankResetting = false;
        }
    }

    /** Resolve corridor (straight + curved) collisions. */
    _resolveCorridors(ball) {
        for (const co of this.corridors) co.resolve(ball);
        for (const cc of this.curvedCorridors) cc.resolve(ball);
    }

    /** Resolve dynamic (moving/reactive) entity collisions. */
    _resolveDynamicEntities(ball) {
        for (const f  of this.flippers)  f.resolve(ball);
        for (const s  of this.slings)    s.resolve(ball);
        for (const b  of this.bumpers)   b.resolve(ball);
        for (const g  of this.gears)     g.resolve(ball);
        for (const pd of this.pendulums) pd.resolve(ball);
        for (const t  of this.targets)   t.resolve(ball);
        for (const k  of this.kickers)   k.resolve(ball);
        for (const sp of this.springs)      sp.resolve(ball);
        for (const ls of this.launchSprings) ls.resolve(ball);
    }

    /**
     * Hard-clamp ball to the playfield boundary. Last-resort safety net for
     * wall tunneling: circleVsSegment uses zero-thickness walls, so a fast
     * ball can cross a wall in one substep and land on the wrong side. When
     * that happens the collision normal flips and the pushout drives the ball
     * further outside. This method fires AFTER all normal resolution and
     * catches the rare case where circleVsSegment has already failed.
     * Safe to use here (instance fields only) — avoids the static class-field
     * initialization issue that broke collisions in the PhysicsWorld approach.
     * @param {import('../physics/Ball.js').Ball} ball
     */
    _clampToBoundary(ball) {
        const r    = ball.radius;
        const xMin = 20 + r;              // inside left wall at x=20
        const xMax = this._rightBound - r; // right playfield wall (or canvas edge if no wall declared)
        if (ball.pos.x < xMin) {
            ball.pos.x = xMin;
            if (ball.vel.x < 0) ball.vel.x = Math.abs(ball.vel.x) * C.BALL_RESTITUTION_WALL;
        } else if (ball.pos.x > xMax) {
            ball.pos.x = xMax;
            if (ball.vel.x > 0) ball.vel.x = -Math.abs(ball.vel.x) * C.BALL_RESTITUTION_WALL;
        }
    }

    resolveWallCollisions(ball) {
        for (const w of this.walls) {
            Collisions.circleVsSegment(ball, w[0], w[1], w[2], w[3], w[4]);
        }
    }

    /** Warp priority interceptors. Returns true if ball was captured. */
    _resolveInterceptors(ball) {
        for (const w of this.warps) {
            if (w.resolve(ball)) return true;
        }
        return false;
    }

    /** Boss circle collision — extracted to keep resolve() complexity low. */
    _resolveBoss(ball) {
        if (!this.boss?.isAlive()) return;
        if (this.boss.state < 1 || this.boss.state === 4) return;
        const hit = Collisions.circleVsCircle(ball, this.boss.x, this.boss.y, this.boss.radius, 0.9);
        if (hit) {
            // Contact normal pointing from ball toward boss center — drives the
            // boss animation rig (recoil, squash) in the correct direction.
            const dx = this.boss.x - ball.pos.x;
            const dy = this.boss.y - ball.pos.y;
            const len = Math.hypot(dx, dy) || 1;
            this.boss.hit(1, dx / len, dy / len);
        }
    }

    /** Helper: build a wall segment with default restitution. */
    addWall(ax, ay, bx, by, restitution = 0.55) {
        this.walls.push([ax, ay, bx, by, restitution]);
    }

    /**
     * Build standard entities from a parsed level JSON config.
     * All Y values in `cfg` are section-local (0 = top of section).
     * @param {object} cfg  parsed level JSON
     * @param {number} top  world-Y of this section's top edge
     */
    _buildEntitiesFromConfig(cfg, top) {
        if (!cfg) return;
        this._buildWalls(cfg.walls, top);
        this._buildCurves(cfg.curves, top);
        this._buildBumpers(cfg.bumpers, top);
        this._buildDropTargets(cfg.dropTargets, top);
        this._buildSlingshots(cfg.slingshots, top);
        this._buildFlippers(cfg.flippers, top);
        this._buildKickers(cfg.kickers, top);
        this._buildGates(cfg.gates, top);
        this._buildWarps(cfg.warps, top);
        this._buildWarpExits(cfg.warpExits, top);
        this._buildGears(cfg.gears, top);
        this._buildPendulums(cfg.pendulums, top);
        this._buildCorridors(cfg.corridors, top);
        this._buildCurvedCorridors(cfg.curvedCorridors, top);
        this._buildSprings(cfg.springs, top);
        this._buildLaunchSprings(cfg.launchSprings, top);
        this._buildDeathLines(cfg.deathLines, top);
        this._buildLights(cfg.lights, cfg.lightRings, top);
    }

    /** @private */
    _buildWalls(walls, top) {
        for (const w of walls ?? []) {
            this.addWall(w.ax, top + w.ay, w.bx, top + w.by, w.restitution);
        }
    }

    /** @private */
    _buildCurves(curves, top) {
        for (const c of curves ?? []) {
            this.curves.push(new CurvedWall(
                c.cx, top + c.cy, c.radius,
                c.startAngle, c.endAngle,
                c.segments, c.restitution
            ));
        }
    }

    /** @private */
    _buildBumpers(bumpers, top) {
        for (const b of bumpers ?? []) {
            const bumper = new Bumper(b.x, top + b.y, b.score);
            bumper.onHit = (s) => this._emit(s, 'bumper');
            this.bumpers.push(bumper);
        }
    }

    /** @private */
    _buildDropTargets(dropTargets, top) {
        for (const d of dropTargets ?? []) {
            const tgt = new DropTarget(d.x, top + d.y);
            if (d.w != null) tgt.w = d.w;
            if (d.h != null) tgt.h = d.h;
            tgt.onHit = (s) => this._emit(s, d.eventType ?? 'drop_target');
            this.targets.push(tgt);
        }
    }

    /** @private */
    _buildSlingshots(slingshots, top) {
        for (const s of slingshots ?? []) {
            const sl = new Slingshot(s.ax, top + s.ay, s.bx, top + s.by, s.nx, s.ny);
            sl.onHit = (score) => this._emit(score, 'slingshot');
            this.slings.push(sl);
        }
    }

    /** @private */
    _buildFlippers(flippers, top) {
        for (const f of flippers ?? []) {
            const side = f.side === 'LEFT' ? Flipper.SIDE.LEFT : Flipper.SIDE.RIGHT;
            const fl   = new Flipper(f.x, top + f.y, side);
            if (f.length    != null) fl.length = f.length;
            if (f.restAngle != null) {
                fl.restAngle   = f.restAngle;
                fl.angle       = f.restAngle;
                fl.targetAngle = f.restAngle;
            }
            if (f.activeAngle != null) fl.activeAngle = f.activeAngle;
            this.flippers.push(fl);
        }
    }

    /** @private */
    _buildKickers(kickers, top) {
        for (const k of kickers ?? []) {
            const kicker = new Kicker({
                x: k.x,
                y: top + k.y,
                w: k.w,
                h: k.h,
                dirX: k.dirX,
                dirY: k.dirY,
                cooldown: k.cooldown,
                angleDeg: k.angleDeg ?? 0,
            });
            kicker.onHit = (s) => this._emit(s, 'kicker');
            if (k.circleRadius != null) kicker.circleRadius = k.circleRadius;
            if (k.circleSpeed  != null) kicker.circleSpeed  = k.circleSpeed;
            if (k.slideRange   != null) kicker.slideRange   = k.slideRange;
            if (k.slideSpeed   != null) kicker.slideSpeed   = k.slideSpeed;
            this.kickers.push(kicker);
        }
    }

    /** @private */
    _buildGates(gates, top) {
        for (const g of gates ?? []) {
            this.gates.push(new Gate(g.x1, g.x2, top + g.y, g.dir, g.isEvent ?? false));
        }
    }

    /** @private */
    _buildWarps(warps, top) {
        for (const w of warps ?? []) {
            const warp = new WarpHole(w.x, top + w.y, w.radius);
            warp.name      = w.name ?? '';
            warp.onWarp    = (s) => this._emit(s, 'warp');
            warp.onCapture = ()  => this._emit(0, 'warp_enter');
            this.warps.push(warp);
        }
    }

    /**
     * Stores raw warpExit descriptors so WarpWirer can resolve cross-section links.
     * Each exit lives in the DESTINATION section and references its source by name.
     * @private
     */
    _buildWarpExits(warpExits, top) {
        for (const e of warpExits ?? []) {
            this.warpExits.push({
                fromSection: e.fromSection,
                x:  e.x,
                y:  top + e.y,
                vx: e.vx ?? 0,
                vy: e.vy ?? -650,
            });
        }
    }

    /** @private */
    _buildGears(gears, top) {
        for (const g of gears ?? []) {
            // Constructor signature is (x, y, radius, teethCount, angularSpeed).
            // JSON keys: x, y, radius?, teeth, angularSpeed.
            const gear = new SpinningGear(
                g.x,
                top + g.y,
                g.radius,
                g.teeth,
                g.angularSpeed,
            );
            gear.onHit = (s) => this._emit(s, 'bumper');
            this.gears.push(gear);
        }
    }

    /** @private */
    _buildPendulums(pendulums, top) {
        for (const p of pendulums ?? []) {
            const pendulum = new Pendulum(p.x, top + p.y, p.armLength, p.velX, p.velY);
            pendulum.onHit = (s) => this._emit(s, 'slingshot');
            if (p.slideRange != null) pendulum.slideRange = p.slideRange;
            if (p.slideSpeed != null) pendulum.slideSpeed = p.slideSpeed;
            this.pendulums.push(pendulum);
        }
    }

    /** @private */
    _buildCorridors(corridors, top) {
        const D2R = Math.PI / 180;
        for (const c of corridors ?? []) {
            const angle = (c.angleDeg ?? 0) * D2R;
            const cos   = Math.cos(angle);
            const sin   = Math.sin(angle);
            const half  = (c.length ?? 120) / 2;
            const ax    = c.cx - cos * half;
            const ay    = top + c.cy - sin * half;
            const bx    = c.cx + cos * half;
            const by    = top + c.cy + sin * half;
            this.corridors.push(new Corridor(ax, ay, bx, by, c.width, c.restitution));
        }
    }

    /** @private */
    _buildCurvedCorridors(curvedCorridors, top) {
        const D2R = Math.PI / 180;
        for (const c of curvedCorridors ?? []) {
            this.curvedCorridors.push(new CurvedCorridor(
                c.cx, top + c.cy, c.midRadius, c.width,
                c.startAngleDeg * D2R, c.angularSpanDeg * D2R,
                { segments: c.segments, restitution: c.restitution }
            ));
        }
    }

    /** @private */
    _buildSprings(springs, top) {
        for (const s of springs ?? []) {
            const sp = new Spring(s.x, top + s.y, s.radius, s.angleDeg, s.power ?? C.SPRING_POWER, s.cooldown);
            sp.onHit = (score) => this._emit(score, 'spring');
            this.springs.push(sp);
        }
    }

    /** @private */
    _buildLaunchSprings(launchSprings, top) {
        for (const s of launchSprings ?? []) {
            const ls = new LaunchSpring(
                s.x, top + s.y, s.radius, s.angleDeg,
                s.maxPower     ?? C.LAUNCH_SPRING_MAX_POWER,
                s.chargeTime   ?? C.LAUNCH_SPRING_CHARGE_TIME,
                s.maxExtension ?? C.LAUNCH_SPRING_MAX_EXT,
            );
            this.launchSprings.push(ls);
        }
    }

    /** @private */
    _buildDeathLines(deathLines, top) {
        for (const d of deathLines ?? []) {
            this.deathLines.push({
                ax: d.ax, ay: top + d.ay,
                bx: d.bx, by: top + d.by,
            });
        }
    }

    /**
     * Returns true if the ball is touching any death line in this section.
     * @param {import('../physics/Ball.js').Ball} ball
     */
    touchesDeathLine(ball) {
        const r = ball.radius;
        for (const d of this.deathLines) {
            const lineY = (d.ay + d.by) / 2;
            if (ball.pos.y + r < lineY) continue;
            const x1 = Math.min(d.ax, d.bx);
            const x2 = Math.max(d.ax, d.bx);
            if (ball.pos.x >= x1 && ball.pos.x <= x2) return true;
        }
        return false;
    }

    /** @private */
    _buildLights(lights, lightRings, top) {
        for (const l of lights ?? []) {
            const light = new Light(l.x, top + l.y, this._resolveColor(l.colorKey), l.radius ?? 4);
            if (l.cycleSpeed != null) light.cycleSpeed = l.cycleSpeed;
            light.on = l.on ?? true;
            this.lights.push(light);
        }
        for (const r of lightRings ?? []) {
            const color = this._resolveColor(r.colorKey);
            for (let i = 0; i < r.count; i++) {
                const ang   = (i / r.count) * Math.PI * 2;
                const light = new Light(
                    r.cx + Math.cos(ang) * r.radius,
                    top + r.cy + Math.sin(ang) * r.radius,
                    color,
                    r.lightRadius ?? 4
                );
                if (r.cycleSpeed != null) light.cycleSpeed = r.cycleSpeed;
                light.on = r.on ?? true;
                this.lights.push(light);
            }
        }
    }

    /**
     * Resolve a palette color key to a CSS colour string.
     * - `"accent"`       → `this.palette.accent`
     * @param {string|undefined} colorKey  key of this.palette (e.g. 'accent', 'wall')
     * @returns {string}
     */
    _resolveColor(colorKey) {
        if (!colorKey) return this.palette.accent;
        return this.palette[colorKey] ?? this.palette.accent;
    }

    /**
     * Instantiate and wire the boss declared in the level JSON.
     * Dispatches on `bossCfg.type`; WitchBoss receives world-space anchors.
     * @param {object|undefined} bossCfg  cfg.boss from the level JSON
     * @param {number}           top      world-Y of section top
     */
    _buildBoss(bossCfg, top) {
        if (!bossCfg) return;
        if (bossCfg.enabled === false) return;
        switch (bossCfg.type) {
            case 'DemonBoss':
                this.boss = new DemonBoss(bossCfg.x, top + bossCfg.y, bossCfg.radius);
                break;
            case 'DragonBoss':
                this.boss = new DragonBoss(bossCfg.x, top + bossCfg.y, bossCfg.radius);
                break;
            case 'GolemBoss':
                this.boss = new GolemBoss(bossCfg.x, top + bossCfg.y, bossCfg.radius);
                break;
            case 'WitchBoss':
                this.boss = new WitchBoss(bossCfg.x, top + bossCfg.y, bossCfg.radius);
                break;
            default: return;
        }
        this.boss.onScore = (s) => this._emit(s, 'boss_hit');
        if (bossCfg.killEvent) {
            this.boss.onDefeated = () => this._emit(C.MINI_BOSS_BONUS, bossCfg.killEvent);
        }
    }

    /**
     * Build a parametric brick grid from a brickGrids[] entry.
     * @param {object} bg   one entry from cfg.brickGrids
     * @param {number} top  world-Y of section top
     */
    _buildBrickGrid(bg, top) {
        if (!bg) return;
        const cx      = bg.x ?? this.width / 2;
        const totalW  = bg.cols * bg.brickW + (bg.cols - 1) * bg.gapX;
        const startX  = cx - totalW / 2;
        const startY  = top + bg.startY;
        for (let row = 0; row < bg.rows; row++) {
            for (let col = 0; col < bg.cols; col++) {
                const bx    = startX + col * (bg.brickW + bg.gapX);
                const by    = startY + row * (bg.brickH + bg.gapY);
                const brick = new DropTarget(bx, by);
                brick.w     = bg.brickW;
                brick.h     = bg.brickH;
                brick.onHit = (s) => this._emit(s, 'brick');
                this.targets.push(brick);
            }
        }
    }

}
