/**
 * TrackObjects — collectibles & interactive pads, placed BY DESIGN: the placer
 * reads `segmentInfo(k)` (the same source of truth the terrain shape uses) so
 * every object sits on the feature it belongs to:
 *
 *   jump/ramp → star at the flight apex + gem arc tracing the flight path
 *               (+ spring at the lip where the design says so)
 *   table     → gem line along the table top
 *   valley    → gem string through the dip (free speed → free pickups)
 *   whoops    → gems on the mogul tops
 *   flat      → turbo pad / extra heart exactly where the design plan says
 *
 * Deterministic + chunked (scales endless past the designed track).
 * Collectibles (one-shot):  'star' (200, +combo) · 'gem' (50) · 'life' (rare)
 * Triggers (persist, cooldown): 'boostpad' (ground turbo arrows) · 'spring'
 */
import { seedHash, terrainHeight, terrainSlope, segmentInfo, SEG_LEN, tunnelList, loopList, loopBaseAt, cannonList, cannonBaseY, gravityScale } from '../core/Terrain.js';

function crestIn(x0, x1) {
  let bx = x0, by = -1e9;
  for (let s = x0; s <= x1; s += 0.5) { const y = terrainHeight(s); if (y > by) { by = y; bx = s; } }
  return { x: bx, y: by };
}
function flattestIn(x0, x1) {
  let bx = (x0 + x1) / 2, bs = 1e9;
  for (let s = x0; s <= x1; s += 0.5) { const sl = Math.abs(terrainSlope(s)); if (sl < bs) { bs = sl; bx = s; } }
  return { x: bx, slope: bs };
}

export class TrackObjects {
  constructor() {
    this.active = new Map();
    this.collected = new Set();
    this._genSegs = new Set();
    this._genDecks = new Set();
  }

  reset() { this.active.clear(); this.collected.clear(); this._genSegs.clear(); this._genDecks.clear(); }

  ensure(carX) {
    const kc = Math.floor(carX / SEG_LEN);
    for (let k = kc - 1; k <= kc + 3; k++) this._genSegment(k);
    const tunnels = tunnelList();
    for (let ti = 0; ti < tunnels.length; ti++) {
      const t = tunnels[ti];
      if (!this._genDecks.has('t' + ti) && carX > t.x0 - 150 && carX < t.x1 + 50) {
        this._genDecks.add('t' + ti);
        this._genTunnelObjects(t, ti);
      }
    }
    const loops = loopList();
    for (let li = 0; li < loops.length; li++) {
      const l = loops[li];
      if (!this._genDecks.has('l' + li) && carX > l.x - 150 && carX < l.x + 50) {
        this._genDecks.add('l' + li);
        // star at the top of the ring — collected mid-loop
        const sid = 3000000 + li;
        if (!this.collected.has(sid)) {
          this.active.set(sid, { id: sid, type: 'star', x: l.x, y: loopBaseAt(l) + 2 * l.r - 1.0, r: 1.4, value: 200 });
        }
      }
    }
    for (const [id, o] of this.active) if (o.x < carX - 45) this.active.delete(id);
  }

  /** Underground loot: gem line along the bore floor (+ a heart in long tunnels). */
  _genTunnelObjects(t, ti) {
    const f0 = t.x0 + 12, f1 = t.x1 - 11;             // the flat part of the floor
    const n = Math.max(3, Math.round((f1 - f0) / 7));
    for (let i = 0; i < n; i++) {
      const gx = f0 + ((i + 0.5) / n) * (f1 - f0);
      const id = 2000000 + ti * 100 + i;
      if (this.collected.has(id)) continue;
      this.active.set(id, { id, type: 'gem', x: gx, y: terrainHeight(gx) + 1.1, r: 0.95, value: 50 });
    }
    if (t.x1 - t.x0 > 50) {                            // long bore → a heart hides inside
      const hx = (f0 + f1) / 2;
      const hid = 2000000 + ti * 100 + 99;
      if (!this.collected.has(hid)) {
        this.active.set(hid, { id: hid, type: 'life', x: hx, y: terrainHeight(hx) + 1.3, r: 1.2 });
      }
    }
  }


  _add(k, idx, o) {
    const id = k * 100 + idx;
    if (this.collected.has(id)) return;
    o.id = id;
    this.active.set(id, o);
  }

  /** Star + gem arc tracing the flight path over a launch crest. */
  _flightArc(k, crestX, crestY, height, spread) {
    this._add(k, 0, { type: 'star', x: crestX, y: crestY + height, r: 1.4, value: 200 });
    const pts = [[-6.0, 0.35], [-3.5, 0.62], [3.6, 0.72], [6.6, 0.42]]; // [dx, frac of apex height]
    for (let i = 0; i < pts.length; i++) {
      const gx = crestX + pts[i][0] * spread;
      this._add(k, 10 + i, { type: 'gem', x: gx, y: terrainHeight(gx) + 1.0 + height * pts[i][1] * 0.55, r: 0.95, value: 50 });
    }
  }

  _genSegment(k) {
    if (this._genSegs.has(k) || k < 1) { this._genSegs.add(k); return; }
    this._genSegs.add(k);

    const info = segmentInfo(k);
    const x0 = k * SEG_LEN, L = SEG_LEN;

    switch (info.t) {
      case 'jump': {
        const c = crestIn(x0 + 0.15 * L, x0 + 0.5 * L);
        if (info.spring) {
          this._add(k, 22, { type: 'spring', trigger: true, x: c.x - 1.2, y: terrainHeight(c.x - 1.2) + 0.2, r: 1.5, _squash: -1 });
        }
        this._flightArc(k, c.x, c.y, info.spring ? 5.6 : 3.2, 1.0);
        break;
      }
      case 'ramp': {
        const c = crestIn(x0 + 0.25 * L, x0 + 0.6 * L);
        if (info.cannon) {
          // CANNON shot: gems trace the exact ballistic arc, star at the apex,
          // a heart on the descent. (The cannon itself lives in Terrain/Vehicle.)
          const cn = cannonList().find((cc) => Math.abs(cc.x - (x0 + L / 2)) < L) || cannonList()[0];
          const vx = cn.power * Math.cos(cn.angle), vy = cn.power * Math.sin(cn.angle);
          const y0 = cannonBaseY(cn) + 1.3;
          const g = 16 * gravityScale(), gh = g / 2;   // gem arc must match the map's gravity
          // two guide gems on the jump toward the perch (the way is UP and FORWARD)
          this._add(k, 10, { type: 'gem', x: c.x + 2.5, y: c.y + 1.6, r: 0.95, value: 50 });
          this._add(k, 11, { type: 'gem', x: c.x + 5.0, y: c.y + 2.6, r: 0.95, value: 50 });
          const ts = [0.35, 0.7, 1.05, 1.4, 1.75, 2.1];
          for (let i = 0; i < ts.length; i++) {
            const gx = cn.x + vx * ts[i], gy = y0 + vy * ts[i] - gh * ts[i] * ts[i];
            this._add(k, 40 + i, { type: 'gem', x: gx, y: gy, r: 0.95, value: 50 });
          }
          const ta = vy / g;                           // apex time
          this._add(k, 0, { type: 'star', x: cn.x + vx * ta, y: y0 + vy * ta - gh * ta * ta + 1.6, r: 1.4, value: 200 });
          const th = ta + 0.8;                         // on the way down
          this._add(k, 30, { type: 'life', x: cn.x + vx * th, y: y0 + vy * th - gh * th * th, r: 1.2 });
          break;
        }
        const spring = info.spring || (k >= 36 && seedHash(k * 41 + 5) < 0.35);
        if (spring) {
          this._add(k, 22, { type: 'spring', trigger: true, x: c.x - 1.2, y: terrainHeight(c.x - 1.2) + 0.2, r: 1.5, _squash: -1 });
        }
        this._flightArc(k, c.x, c.y, spring ? 6.4 : 4.4, 1.25);
        break;
      }
      case 'kicker': {
        // ski-jump: spring at the lip optional, gem arc tracing the big launch
        const c = crestIn(x0 + 0.30 * L, x0 + 0.46 * L);
        if (info.spring) {
          this._add(k, 22, { type: 'spring', trigger: true, x: c.x - 1.0, y: terrainHeight(c.x - 1.0) + 0.2, r: 1.5, _squash: -1 });
        }
        this._flightArc(k, c.x, c.y, info.spring ? 6.0 : 4.0, 1.15);
        break;
      }
      case 'hill': {
        // star on the dune crest + gem arc over it (+ optional spring on the crest)
        const c = crestIn(x0 + 0.35 * L, x0 + 0.65 * L);
        if (info.spring) {
          this._add(k, 22, { type: 'spring', trigger: true, x: c.x, y: c.y + 0.2, r: 1.5, _squash: -1 });
        }
        this._add(k, 0, { type: 'star', x: c.x, y: c.y + 2.2, r: 1.4, value: 200 });
        for (let i = 0; i < 4; i++) {
          const gx = c.x - 6 + i * 4;
          this._add(k, 10 + i, { type: 'gem', x: gx, y: terrainHeight(gx) + 1.3, r: 0.95, value: 50 });
        }
        break;
      }
      case 'chasm': {
        // gems over the void: leap reward (star mid-air above the gorge)
        const lip = crestIn(x0 + 0.18 * L, x0 + 0.34 * L);
        this._add(k, 0, { type: 'star', x: x0 + 0.5 * L, y: lip.y + 3.2, r: 1.4, value: 200 });
        for (let i = 0; i < 4; i++) {
          const gx = x0 + (0.34 + i * 0.11) * L;
          this._add(k, 10 + i, { type: 'gem', x: gx, y: lip.y + 1.6 + 1.6 * Math.sin(Math.PI * (i + 0.5) / 4), r: 0.95, value: 50 });
        }
        break;
      }
      case 'bump': {
        // gem perched on top of the boulder
        const c = crestIn(x0 + 0.42 * L, x0 + 0.58 * L);
        this._add(k, 10, { type: 'gem', x: c.x, y: c.y + 1.3, r: 0.95, value: 50 });
        break;
      }
      case 'tabletop': {
        // gems along the flat top + a star to clear the whole table
        const t0 = x0 + 0.36 * L, t1 = x0 + 0.58 * L, n = 3;
        for (let i = 0; i < n; i++) {
          const gx = t0 + (i / (n - 1)) * (t1 - t0);
          this._add(k, 10 + i, { type: 'gem', x: gx, y: terrainHeight(gx) + 1.2, r: 0.95, value: 50 });
        }
        this._add(k, 0, { type: 'star', x: x0 + 0.47 * L, y: terrainHeight(x0 + 0.47 * L) + 3.4, r: 1.4, value: 200 });
        break;
      }
      case 'drop': {
        // gems leading off the ledge + down into the drop (reward the plunge)
        const xs = [0.26, 0.40, 0.55, 0.70];
        for (let i = 0; i < xs.length; i++) {
          const gx = x0 + xs[i] * L;
          this._add(k, 10 + i, { type: 'gem', x: gx, y: terrainHeight(gx) + 1.3, r: 0.95, value: 50 });
        }
        break;
      }
      case 'stepdown': {
        // a gem on each descending ledge
        const xs = [0.16, 0.30, 0.44, 0.72];
        for (let i = 0; i < xs.length; i++) {
          const gx = x0 + xs[i] * L;
          this._add(k, 10 + i, { type: 'gem', x: gx, y: terrainHeight(gx) + 1.2, r: 0.95, value: 50 });
        }
        break;
      }
      case 'table': {
        // gems along the raised table top
        const t0 = x0 + 0.32 * L, t1 = x0 + 0.54 * L, n = 4;
        for (let i = 0; i < n; i++) {
          const gx = t0 + (i / (n - 1)) * (t1 - t0);
          this._add(k, 10 + i, { type: 'gem', x: gx, y: terrainHeight(gx) + 1.2, r: 0.95, value: 50 });
        }
        break;
      }
      case 'valley': {
        // string of gems swooping through the dip
        const n = 5, v0 = x0 + 0.25 * L, v1 = x0 + 0.75 * L;
        for (let i = 0; i < n; i++) {
          const gx = v0 + (i / (n - 1)) * (v1 - v0);
          this._add(k, 10 + i, { type: 'gem', x: gx, y: terrainHeight(gx) + 1.1, r: 0.95, value: 50 });
        }
        break;
      }
      case 'whoops': {
        // gems hovering over the mogul tops
        for (let i = 0; i < 3; i++) {
          const c = crestIn(x0 + (0.2 + i * 0.25) * L, x0 + (0.35 + i * 0.25) * L);
          this._add(k, 10 + i, { type: 'gem', x: c.x, y: c.y + 1.5, r: 0.95, value: 50 });
        }
        break;
      }
      case 'gap': {
        // arc of gems over the gorge: lip → apex → landing (reward for clearing it)
        const lip = crestIn(x0 + 0.20 * L, x0 + 0.40 * L);
        this._add(k, 0, { type: 'star', x: (x0 + 0.5 * L), y: lip.y + 3.6, r: 1.4, value: 200 });
        const xs = [x0 + 0.30 * L, x0 + 0.42 * L, x0 + 0.58 * L, x0 + 0.70 * L];
        for (let i = 0; i < xs.length; i++) {
          this._add(k, 10 + i, { type: 'gem', x: xs[i], y: lip.y + 1.4 + 1.8 * Math.sin(Math.PI * (i + 0.5) / xs.length), r: 0.95, value: 50 });
        }
        break;
      }
      case 'steps': {
        // a gem on each plateau (climb and descent)
        const xs = [0.16, 0.28, 0.42, 0.58, 0.72, 0.84];
        for (let i = 0; i < xs.length; i++) {
          const gx = x0 + xs[i] * L;
          this._add(k, 10 + i, { type: 'gem', x: gx, y: terrainHeight(gx) + 1.2, r: 0.95, value: 50 });
        }
        break;
      }
      case 'crater': {
        // gems dipping through the crater + a star above the rim
        const n = 5, v0 = x0 + 0.28 * L, v1 = x0 + 0.72 * L;
        for (let i = 0; i < n; i++) {
          const gx = v0 + (i / (n - 1)) * (v1 - v0);
          this._add(k, 10 + i, { type: 'gem', x: gx, y: terrainHeight(gx) + 1.2, r: 0.95, value: 50 });
        }
        this._add(k, 0, { type: 'star', x: x0 + 0.5 * L, y: terrainHeight(x0 + 0.5 * L) + 4.5, r: 1.4, value: 200 });
        break;
      }
      case 'flat':
      case 'rolling':
      case 'intro': {
        if (info.spring) {
          // trampoline on gentle ground (dune top / clearing) — bounce signature
          const c = crestIn(x0 + 0.30 * L, x0 + 0.70 * L);
          this._add(k, 22, { type: 'spring', trigger: true, x: c.x, y: terrainHeight(c.x) + 0.2, r: 1.5, _squash: -1 });
        } else if (info.gate) {
          // SPEED GATE: cross it fast (≥18 m/s) for a combo bonus
          const f = flattestIn(x0 + 0.3 * L, x0 + 0.7 * L);
          this._add(k, 23, { type: 'gate', trigger: true, x: f.x, y: terrainHeight(f.x) + 1.3, r: 2.4 });
        } else if (info.pad) {
          const f = flattestIn(x0 + 0.3 * L, x0 + 0.7 * L);
          this._add(k, 21, { type: 'boostpad', trigger: true, x: f.x, y: terrainHeight(f.x), r: 2.2 });
        } else if (info.life) {
          const f = flattestIn(x0 + 0.35 * L, x0 + 0.65 * L);
          this._add(k, 30, { type: 'life', x: f.x, y: terrainHeight(f.x) + 1.3, r: 1.2 });
        } else if (k >= 36) {
          // procedural recovery segments: occasional pad / rare heart
          const r = seedHash(k * 131 + 7);
          if (r < 0.30) {
            const f = flattestIn(x0 + 0.3 * L, x0 + 0.7 * L);
            if (f.slope < 0.22) this._add(k, 21, { type: 'boostpad', trigger: true, x: f.x, y: terrainHeight(f.x), r: 2.2 });
          } else if (r < 0.37) {
            const f = flattestIn(x0 + 0.35 * L, x0 + 0.65 * L);
            this._add(k, 30, { type: 'life', x: f.x, y: terrainHeight(f.x) + 1.3, r: 1.2 });
          }
        }
        break;
      }
    }
  }

  update(car, onCollect) {
    this.ensure(car.x);
    const now = performance.now() / 1000, cr = 1.0;
    for (const [id, o] of this.active) {
      const dx = car.x - o.x, dy = car.y - o.y, rad = o.r + cr;
      if (dx * dx + dy * dy >= rad * rad) continue;
      if (o.trigger) {
        if ((o._next || 0) <= now) { o._next = now + 0.9; o._squash = now; onCollect(o); }
      } else {
        this.collected.add(id); this.active.delete(id); onCollect(o);
      }
    }
  }

  draw(ctx, w2s, pps, time) {
    for (const o of this.active.values()) {
      const s = w2s(o.x, o.y), r = o.r * pps;
      if (o.type === 'star') this._star(ctx, s, r, time);
      else if (o.type === 'gem') this._gem(ctx, s, r, time);
      else if (o.type === 'life') this._heart(ctx, s, r, time);
      else if (o.type === 'boostpad') this._pad(ctx, w2s, o, pps, time);
      else if (o.type === 'spring') this._spring(ctx, s, r, o, time);
      else if (o.type === 'gate') this._gate(ctx, w2s, o, pps, time);
    }
  }

  /** Gold five-point star with a soft pulsing halo — the premium pickup. */
  _star(ctx, s, r, time) {
    ctx.save(); ctx.translate(s.x, s.y);
    // halo
    const halo = r * (1.7 + 0.18 * Math.sin(time * 3));
    const hg = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, halo);
    hg.addColorStop(0, 'rgba(255,220,90,.45)'); hg.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, halo, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(time * 1.5);
    ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // inner sparkle
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.2, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _gem(ctx, s, r, time) {
    const bob = Math.sin(time * 2.6 + s.x * 0.05) * r * 0.12;
    ctx.save(); ctx.translate(s.x, s.y + bob); ctx.rotate(time * 2);
    ctx.fillStyle = '#ffe14a'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  _heart(ctx, s, r, time) {
    const p = 1 + 0.08 * Math.sin(time * 5);
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(p, p);
    // soft glow so hearts read from far away (they're rare and precious)
    const hg = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.9);
    hg.addColorStop(0, 'rgba(255,80,110,.4)'); hg.addColorStop(1, 'rgba(255,80,110,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff3b5b';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.6);
    ctx.bezierCurveTo(r * 1.1, -r * 0.3, r * 0.4, -r, 0, -r * 0.35);
    ctx.bezierCurveTo(-r * 0.4, -r, -r * 1.1, -r * 0.3, 0, r * 0.6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.45, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /** SPEED GATE: two checkered pylons + a shimmering light beam (no collision —
   *  it's a speed checkpoint: cross it fast to score). */
  _gate(ctx, w2s, o, pps, time) {
    const xs = [o.x - 1.6, o.x + 1.6];
    const h = 3.4;
    const gl = w2s(xs[0], terrainHeight(xs[0]));
    const gr = w2s(xs[1], terrainHeight(xs[1]));
    const topY = Math.min(gl.y, gr.y) - h * pps;
    // light beam
    const pulse = 0.10 + 0.06 * Math.sin(time * 5 + o.x);
    const grd = ctx.createLinearGradient(0, topY, 0, Math.max(gl.y, gr.y));
    grd.addColorStop(0, 'rgba(80,220,255,0)');
    grd.addColorStop(0.5, `rgba(80,220,255,${pulse})`);
    grd.addColorStop(1, `rgba(80,220,255,${pulse * 1.6})`);
    ctx.fillStyle = grd;
    ctx.fillRect(gl.x, topY, gr.x - gl.x, Math.max(gl.y, gr.y) - topY);
    // pylons with cyan bands and a blinking tip
    for (const px of xs) {
      const g = w2s(px, terrainHeight(px));
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(g.x - 2.5, g.y - h * pps, 5, h * pps);
      ctx.fillStyle = '#22b8e8';
      for (let y = g.y - h * pps + 4; y < g.y - 6; y += 16) ctx.fillRect(g.x - 2.5, y, 5, 7);
      ctx.fillStyle = `rgba(120,240,255,${0.6 + 0.4 * Math.sin(time * 6 + px)})`;
      ctx.beginPath(); ctx.arc(g.x, g.y - h * pps - 4, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.font = `700 ${Math.max(9, pps * 0.42)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('SPEED', (gl.x + gr.x) / 2, topY - 6);
    ctx.textAlign = 'left';
  }

  /** Turbo arrows painted ON the road surface (aligned to the slope). */
  _pad(ctx, w2s, o, pps, time) {
    const slope = terrainSlope(o.x);
    const s = w2s(o.x, terrainHeight(o.x));
    const r = o.r * pps;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(-Math.atan(slope));
    const shift = (time * 3) % 1;
    for (let i = -1; i <= 1; i++) {
      const x = (i + shift) * r * 0.72;
      ctx.fillStyle = `rgba(255,150,20,${0.35 + 0.2 * Math.sin(time * 6 + i)})`;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.32, -r * 0.26);
      ctx.lineTo(x + r * 0.22, 0);
      ctx.lineTo(x - r * 0.32, r * 0.26);
      ctx.lineTo(x - r * 0.14, 0);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  _spring(ctx, s, r, o, time) {
    let comp = 0;
    if (o._squash > 0) { const dt = time - o._squash; if (dt < 0.28) comp = 1 - dt / 0.28; }
    const h = r * (1.1 - comp * 0.6);
    ctx.save(); ctx.translate(s.x, s.y);
    if (o.super) {
      // golden glow — this one launches you to the SECRET ZONE
      const halo = r * (1.6 + 0.15 * Math.sin(time * 4));
      const hg = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, halo);
      hg.addColorStop(0, 'rgba(255,210,74,.4)'); hg.addColorStop(1, 'rgba(255,210,74,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(0, 0, halo, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = o.super ? '#e8c050' : '#cfd3da'; ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = 'round';
    ctx.beginPath();
    const coils = 4;
    for (let i = 0; i <= coils; i++) {
      const y = r * 0.5 - (i / coils) * h;
      ctx.moveTo(-r * 0.6, y); ctx.lineTo(r * 0.6, y - h / coils * 0.5);
    }
    ctx.stroke();
    ctx.fillStyle = o.super ? (comp > 0.05 ? '#ffe27a' : '#ffd24a') : (comp > 0.05 ? '#ff5252' : '#e23b3b');
    ctx.beginPath(); ctx.rect(-r * 0.85, r * 0.5 - h - r * 0.22, r * 1.7, r * 0.32); ctx.fill();
    ctx.restore();
  }
}
