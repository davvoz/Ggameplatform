/**
 * Star - Parallax star field background with per-level themes
 */

// ===== LEVEL THEMES =====
// Each level gets a unique visual theme with colors, effects I FX
const LEVEL_THEMES = {
    // Levels 1-5: Intro sector
    deepSpace:    { bg: '#06060f', stars: ['#8899bb','#aabbdd','#ddeeff'], nebula: ['rgba(40,50,100,1)','rgba(30,30,80,1)'], fx: null },
    asteroid:     { bg: '#0a0808', stars: ['#aa9977','#ccbb99','#ffeedd'], nebula: ['rgba(80,60,30,1)','rgba(60,40,20,1)'], fx: 'asteroids' },
    redNebula:    { bg: '#0f0508', stars: ['#cc8888','#ffaaaa','#ffdde0'], nebula: ['rgba(120,30,40,1)','rgba(80,20,40,1)','rgba(100,10,30,1)'], fx: null },
    swarmGreen:   { bg: '#050d05', stars: ['#77bb77','#99dd99','#ccffcc'], nebula: ['rgba(30,80,30,1)','rgba(20,60,40,1)'], fx: 'spores' },
    crimson:      { bg: '#100408', stars: ['#ff6666','#ff9999','#ffcccc'], nebula: ['rgba(140,20,30,1)','rgba(100,10,20,1)','rgba(80,5,15,1)'], fx: 'embers' },
    // Levels 6-10: Mid sector
    blueIce:      { bg: '#040810', stars: ['#88bbff','#aaddff','#ddeeff'], nebula: ['rgba(30,60,120,1)','rgba(20,40,100,1)'], fx: 'ice' },
    phantom:      { bg: '#08040f', stars: ['#aa77ee','#bb99ff','#ddccff'], nebula: ['rgba(60,20,100,1)','rgba(80,30,120,1)'], fx: 'shimmer' },
    sentinelBlue: { bg: '#030810', stars: ['#6688cc','#88aaee','#bbddff'], nebula: ['rgba(20,50,110,1)','rgba(30,60,130,1)'], fx: null },
    warzone:      { bg: '#0c0804', stars: ['#ffaa55','#ffcc88','#ffeebb'], nebula: ['rgba(100,60,10,1)','rgba(80,40,5,1)'], fx: 'embers' },
    ironOrange:   { bg: '#0d0804', stars: ['#ee9944','#ffbb66','#ffddaa'], nebula: ['rgba(110,50,0,1)','rgba(80,30,0,1)','rgba(60,20,0,1)'], fx: 'sparks' },
    // Levels 11-15: Advanced sector
    nebulaRun:    { bg: '#060410', stars: ['#9977dd','#bb99ff','#ddccff'], nebula: ['rgba(70,30,120,1)','rgba(50,15,100,1)','rgba(90,40,140,1)'], fx: 'shimmer' },
    minefield:    { bg: '#080604', stars: ['#ccaa44','#ddbb66','#eeddaa'], nebula: ['rgba(80,60,10,1)','rgba(60,40,5,1)'], fx: 'mines' },
    ambushDark:   { bg: '#040404', stars: ['#666666','#999999','#cccccc'], nebula: ['rgba(30,30,30,1)','rgba(50,50,50,1)'], fx: 'scanlines' },
    gauntlet:     { bg: '#0a0406', stars: ['#dd6688','#ff88aa','#ffbbcc'], nebula: ['rgba(100,20,50,1)','rgba(80,10,40,1)'], fx: 'embers' },
    voidPurple:   { bg: '#0a0414', stars: ['#8844dd','#aa66ff','#cc99ff'], nebula: ['rgba(50,10,100,1)','rgba(70,20,130,1)','rgba(40,5,80,1)'], fx: 'vortex' },
    // Levels 16-20: Hard sector
    reinforced:   { bg: '#080808', stars: ['#aaaacc','#ccccee','#eeeeff'], nebula: ['rgba(50,50,70,1)','rgba(40,40,60,1)'], fx: 'sparks' },
    crossfire:    { bg: '#0c0404', stars: ['#ff7744','#ffaa77','#ffddbb'], nebula: ['rgba(120,30,10,1)','rgba(90,20,5,1)'], fx: 'embers' },
    siege:        { bg: '#060a0c', stars: ['#66aacc','#88ccee','#bbddff'], nebula: ['rgba(20,60,80,1)','rgba(15,45,65,1)'], fx: 'sparks' },
    stormFront:   { bg: '#050308', stars: ['#9988dd','#bbaaff','#ddccff'], nebula: ['rgba(50,30,80,1)','rgba(70,40,100,1)'], fx: 'lightning' },
    omegaGold:    { bg: '#0c0804', stars: ['#ffcc33','#ffdd66','#ffeebb'], nebula: ['rgba(100,80,10,1)','rgba(80,60,0,1)','rgba(120,90,20,1)'], fx: 'embers' },
    // Levels 21-25: Endgame
    darkSector:   { bg: '#020204', stars: ['#445566','#667788','#88aabb'], nebula: ['rgba(15,20,40,1)','rgba(10,15,30,1)'], fx: 'scanlines' },
    deadZone:     { bg: '#030105', stars: ['#553377','#774499','#9966bb'], nebula: ['rgba(30,10,50,1)','rgba(20,5,40,1)'], fx: 'shimmer' },
    hellfire:     { bg: '#100200', stars: ['#ff4400','#ff7733','#ffaa66'], nebula: ['rgba(150,20,0,1)','rgba(100,10,0,1)','rgba(120,30,5,1)'], fx: 'fire' },
    exodus:       { bg: '#060608', stars: ['#7799bb','#99bbdd','#bbddff'], nebula: ['rgba(40,50,80,1)','rgba(30,40,70,1)'], fx: 'vortex' },
    nemesis:      { bg: '#0a0004', stars: ['#dd3355','#ff5577','#ff88aa'], nebula: ['rgba(120,0,30,1)','rgba(90,0,20,1)','rgba(150,10,40,1)'], fx: 'embers' },
    // Levels 26-30: Final
    oblivion:     { bg: '#020202', stars: ['#334455','#556677','#88aabb'], nebula: ['rgba(10,15,25,1)','rgba(8,10,20,1)'], fx: 'vortex' },
    entropy:      { bg: '#060008', stars: ['#6633aa','#8855cc','#bb88ee'], nebula: ['rgba(40,0,60,1)','rgba(60,5,80,1)'], fx: 'shimmer' },
    singularity:  { bg: '#000000', stars: ['#ffffff','#ddddff','#bbbbee'], nebula: ['rgba(0,0,0,1)','rgba(20,20,40,1)'], fx: 'blackhole' },
    eventHorizon: { bg: '#040204', stars: ['#ff3366','#ff6699','#ff99cc'], nebula: ['rgba(80,0,30,1)','rgba(100,5,40,1)'], fx: 'lightning' },
    apocalypse:   { bg: '#0c0000', stars: ['#ff2200','#ff6633','#ff9966'], nebula: ['rgba(180,10,0,1)','rgba(130,5,0,1)','rgba(100,0,0,1)'], fx: 'fire' },
};

// Map: level number (1-30) → theme key
const LEVEL_THEME_MAP = [
    'deepSpace','asteroid','redNebula','swarmGreen','crimson',
    'blueIce','phantom','sentinelBlue','warzone','ironOrange',
    'nebulaRun','minefield','ambushDark','gauntlet','voidPurple',
    'reinforced','crossfire','siege','stormFront','omegaGold',
    'darkSector','deadZone','hellfire','exodus','nemesis',
    'oblivion','entropy','singularity','eventHorizon','apocalypse',
];

function getThemeForLevel(level) {
    const key = LEVEL_THEME_MAP[Math.min(level - 1, LEVEL_THEME_MAP.length - 1)];
    return LEVEL_THEMES[key] || LEVEL_THEMES.deepSpace;
}

// ===== STAR =====

class Star {
    constructor(canvasWidth, canvasHeight, layer = 0, theme = null) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.layer = layer;
        this.size = 0.5 + layer * 0.8 + Math.random() * 0.5;
        this.speed = 15 + layer * 25 + Math.random() * 10;
        this.brightness = 0.3 + layer * 0.25 + Math.random() * 0.2;
        this.twinkleSpeed = 1 + Math.random() * 3;
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.color = (theme && theme.stars) ? theme.stars[layer] : ['#8899bb','#aabbdd','#ddeeff'][layer];
    }

    update(dt, canvasWidth, canvasHeight) {
        this.y += this.speed * dt;
        this.twinklePhase += this.twinkleSpeed * dt;
        if (this.y > canvasHeight + 5) {
            this.y = -5;
            this.x = Math.random() * canvasWidth;
        }
    }

    render(ctx) {
        const twinkle = 0.7 + 0.3 * Math.sin(this.twinklePhase);
        const alpha = this.brightness * twinkle;
        ctx.save();
        ctx.globalAlpha = alpha;

        if (this.layer === 2) {
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
            gradient.addColorStop(0, this.color + 'cc');
            gradient.addColorStop(0.5, this.color + '33');
            gradient.addColorStop(1, this.color + '00');
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x - this.size * 3, this.y - this.size * 3, this.size * 6, this.size * 6);
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ===== NEBULA =====

class Nebula {
    constructor(canvasWidth, canvasHeight, theme = null) {
        this.x = Math.random() * canvasWidth;
        this.y = -200 - Math.random() * 300;
        this.radius = 80 + Math.random() * 150;
        this.speed = 5 + Math.random() * 8;
        const colors = (theme && theme.nebula) ? theme.nebula : Nebula.DEFAULT_COLORS;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = 0.03 + Math.random() * 0.04;
    }

    update(dt, canvasWidth, canvasHeight) {
        this.y += this.speed * dt;
        if (this.y > canvasHeight + this.radius) {
            this.y = -this.radius * 2;
            this.x = Math.random() * canvasWidth;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        ctx.restore();
    }
}

Nebula.DEFAULT_COLORS = [
    'rgba(80,40,120,1)','rgba(40,60,140,1)','rgba(120,30,60,1)',
    'rgba(30,80,100,1)','rgba(60,100,40,1)'
];

// ===== BACKGROUND FX PARTICLES =====

class BgFxParticle {
    constructor(canvasWidth, canvasHeight, fxType) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.fxType = fxType;
        this.reset(true);
    }

    reset(initial = false) {
        const W = this.canvasWidth, H = this.canvasHeight;
        switch (this.fxType) {
            case 'asteroids':
                this.x = Math.random() * W;
                this.y = initial ? Math.random() * H : -30;
                this.size = 4 + Math.random() * 12;
                this.speed = 20 + Math.random() * 30;
                this.rot = Math.random() * Math.PI * 2;
                this.rotSpd = (Math.random() - 0.5) * 2;
                this.alpha = 0.15 + Math.random() * 0.15;
                this.vx = (Math.random() - 0.5) * 10;
                break;
            case 'spores':
                this.x = Math.random() * W;
                this.y = initial ? Math.random() * H : -10;
                this.size = 2 + Math.random() * 4;
                this.speed = 10 + Math.random() * 20;
                this.phase = Math.random() * Math.PI * 2;
                this.alpha = 0.1 + Math.random() * 0.15;
                break;
            case 'embers':
                this.x = Math.random() * W;
                this.y = initial ? Math.random() * H : H + 10;
                this.size = 1 + Math.random() * 3;
                this.speed = 30 + Math.random() * 40;
                this.alpha = 0.2 + Math.random() * 0.3;
                this.drift = (Math.random() - 0.5) * 30;
                this.life = 2 + Math.random() * 3;
                this.maxLife = this.life;
                break;
            case 'ice':
                this.x = Math.random() * W;
                this.y = initial ? Math.random() * H : -10;
                this.size = 2 + Math.random() * 5;
                this.speed = 15 + Math.random() * 20;
                this.rot = Math.random() * Math.PI * 2;
                this.rotSpd = (Math.random() - 0.5) * 3;
                this.alpha = 0.08 + Math.random() * 0.12;
                break;
            case 'shimmer':
                this.x = Math.random() * W;
                this.y = Math.random() * H;
                this.size = 1 + Math.random() * 2;
                this.speed = 0;
                this.phase = Math.random() * Math.PI * 2;
                this.phaseSpd = 1 + Math.random() * 3;
                this.alpha = 0;
                break;
            case 'sparks':
                this.x = Math.random() * W;
                this.y = initial ? Math.random() * H : -5;
                this.size = 1 + Math.random() * 2;
                this.speed = 40 + Math.random() * 60;
                this.alpha = 0.2 + Math.random() * 0.3;
                this.vx = (Math.random() - 0.5) * 40;
                break;
            case 'mines':
                this.x = Math.random() * W;
                this.y = initial ? Math.random() * H : -20;
                this.size = 5 + Math.random() * 8;
                this.speed = 12 + Math.random() * 18;
                this.phase = Math.random() * Math.PI * 2;
                this.alpha = 0.12 + Math.random() * 0.1;
                break;
            case 'scanlines':
                this.x = 0;
                this.y = initial ? Math.random() * H : -2;
                this.size = 1 + Math.random();
                this.speed = 50 + Math.random() * 30;
                this.alpha = 0.03 + Math.random() * 0.04;
                break;
            case 'vortex':
                this.angle = Math.random() * Math.PI * 2;
                this.radius = 50 + Math.random() * 200;
                this.speed = 0.3 + Math.random() * 0.5;
                this.size = 1 + Math.random() * 2;
                this.alpha = 0.06 + Math.random() * 0.08;
                break;
            case 'lightning':
                this.x = Math.random() * W;
                this.y = Math.random() * H;
                this.life = 0;
                this.maxLife = 0.1 + Math.random() * 0.15;
                this.cooldown = 3 + Math.random() * 5;
                this.alpha = 0;
                this.branches = [];
                break;
            case 'fire':
                this.x = Math.random() * W;
                this.y = initial ? Math.random() * H : H + 10;
                this.size = 3 + Math.random() * 6;
                this.speed = 40 + Math.random() * 50;
                this.alpha = 0.12 + Math.random() * 0.15;
                this.drift = (Math.random() - 0.5) * 20;
                break;
            case 'blackhole':
                this.angle = Math.random() * Math.PI * 2;
                this.radius = 30 + Math.random() * 250;
                this.speed = 0.4 + Math.random() * 0.8;
                this.size = 0.5 + Math.random() * 1.5;
                this.alpha = 0.04 + Math.random() * 0.06;
                this.spiralRate = 0.2 + Math.random() * 0.3;
                break;
            default:
                this.x = Math.random() * W;
                this.y = Math.random() * H;
                this.size = 1; this.speed = 10; this.alpha = 0.05;
        }
    }

    update(dt, canvasWidth, canvasHeight, time) {
        switch (this.fxType) {
            case 'asteroids':
                this.y += this.speed * dt;
                this.x += this.vx * dt;
                this.rot += this.rotSpd * dt;
                if (this.y > canvasHeight + 30) this.reset();
                break;
            case 'spores':
                this.y += this.speed * dt;
                this.phase += dt * 2;
                this.x += Math.sin(this.phase) * 15 * dt;
                if (this.y > canvasHeight + 10) this.reset();
                break;
            case 'embers':
                this.y -= this.speed * dt;
                this.x += this.drift * dt;
                this.life -= dt;
                this.alpha = 0.3 * (this.life / this.maxLife);
                if (this.life <= 0 || this.y < -10) this.reset();
                break;
            case 'ice':
                this.y += this.speed * dt;
                this.rot += this.rotSpd * dt;
                if (this.y > canvasHeight + 10) this.reset();
                break;
            case 'shimmer':
                this.phase += this.phaseSpd * dt;
                this.alpha = Math.max(0, Math.sin(this.phase) * 0.15);
                break;
            case 'sparks':
                this.y += this.speed * dt;
                this.x += this.vx * dt;
                this.alpha *= 0.995;
                if (this.y > canvasHeight + 5 || this.alpha < 0.01) this.reset();
                break;
            case 'mines':
                this.y += this.speed * dt;
                this.phase += dt * 2;
                if (this.y > canvasHeight + 20) this.reset();
                break;
            case 'scanlines':
                this.y += this.speed * dt;
                if (this.y > canvasHeight) this.reset();
                break;
            case 'vortex':
                this.angle += this.speed * dt;
                this.radius -= dt * 3;
                if (this.radius < 5) { this.radius = 50 + Math.random() * 200; this.angle = Math.random() * Math.PI * 2; }
                this.x = canvasWidth / 2 + Math.cos(this.angle) * this.radius;
                this.y = canvasHeight / 2 + Math.sin(this.angle) * this.radius;
                break;
            case 'lightning':
                this.cooldown -= dt;
                if (this.cooldown <= 0 && this.life <= 0) {
                    this.life = this.maxLife;
                    this.x = Math.random() * canvasWidth;
                    this.y = Math.random() * canvasHeight * 0.4;
                    this.alpha = 0.3;
                    this.branches = this._genBranches();
                }
                if (this.life > 0) {
                    this.life -= dt;
                    this.alpha = 0.3 * (this.life / this.maxLife);
                    if (this.life <= 0) { this.cooldown = 3 + Math.random() * 5; this.alpha = 0; }
                }
                break;
            case 'fire':
                this.y -= this.speed * dt;
                this.x += this.drift * dt;
                this.size *= 0.998;
                this.alpha *= 0.997;
                if (this.y < -10 || this.alpha < 0.01) this.reset();
                break;
            case 'blackhole':
                this.angle += this.speed * dt;
                this.radius -= this.spiralRate * dt * 10;
                if (this.radius < 5) { this.radius = 30 + Math.random() * 250; this.angle = Math.random() * Math.PI * 2; }
                this.x = canvasWidth / 2 + Math.cos(this.angle) * this.radius;
                this.y = canvasHeight / 2 + Math.sin(this.angle) * this.radius;
                break;
        }
    }

    render(ctx, canvasWidth, canvasHeight) {
        if (this.alpha <= 0.005) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        switch (this.fxType) {
            case 'asteroids':
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rot);
                ctx.fillStyle = '#665544';
                ctx.beginPath();
                const s = this.size;
                ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, -s * 0.3);
                ctx.lineTo(s, s * 0.4); ctx.lineTo(s * 0.3, s);
                ctx.lineTo(-s * 0.5, s * 0.8); ctx.lineTo(-s, s * 0.1);
                ctx.lineTo(-s * 0.7, -s * 0.6);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#887766'; ctx.lineWidth = 1; ctx.stroke();
                break;
            case 'spores':
                ctx.fillStyle = '#44dd44';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = this.alpha * 0.3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'embers':
                const eg = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
                eg.addColorStop(0, '#ffaa33');
                eg.addColorStop(0.5, '#ff4400');
                eg.addColorStop(1, 'rgba(255,0,0,0)');
                ctx.fillStyle = eg;
                ctx.fillRect(this.x - this.size * 2, this.y - this.size * 2, this.size * 4, this.size * 4);
                break;
            case 'ice':
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rot);
                ctx.strokeStyle = '#aaddff';
                ctx.lineWidth = 1;
                const hs = this.size;
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI * 2 / 6) * i;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * hs, Math.sin(a) * hs);
                    ctx.stroke();
                }
                break;
            case 'shimmer':
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'sparks':
                ctx.fillStyle = '#ffdd88';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'mines':
                const pulse = 0.6 + 0.4 * Math.sin(this.phase);
                ctx.strokeStyle = '#aa8833';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = this.alpha * pulse;
                ctx.fillStyle = '#ff4400';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'scanlines':
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, this.y, canvasWidth, this.size);
                break;
            case 'vortex':
                ctx.fillStyle = '#8866cc';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'lightning':
                if (this.branches && this.branches.length > 0) {
                    ctx.strokeStyle = '#aaccff';
                    ctx.lineWidth = 1.5;
                    ctx.shadowColor = '#88aaff';
                    ctx.shadowBlur = 6;
                    for (const branch of this.branches) {
                        ctx.beginPath();
                        ctx.moveTo(branch[0].x, branch[0].y);
                        for (let i = 1; i < branch.length; i++) {
                            ctx.lineTo(branch[i].x, branch[i].y);
                        }
                        ctx.stroke();
                    }
                    ctx.shadowBlur = 0;
                }
                break;
            case 'fire':
                const fg = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
                fg.addColorStop(0, '#ffcc00');
                fg.addColorStop(0.3, '#ff6600');
                fg.addColorStop(1, 'rgba(200,0,0,0)');
                ctx.fillStyle = fg;
                ctx.fillRect(this.x - this.size * 2, this.y - this.size * 2, this.size * 4, this.size * 4);
                break;
            case 'blackhole':
                ctx.fillStyle = '#6644aa';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        ctx.restore();
    }

    _genBranches() {
        const branches = [];
        const main = [{ x: this.x, y: this.y }];
        let cx = this.x, cy = this.y;
        const segs = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < segs; i++) {
            cx += (Math.random() - 0.5) * 30;
            cy += 10 + Math.random() * 20;
            main.push({ x: cx, y: cy });
        }
        branches.push(main);
        // Sub-branch
        if (main.length > 3) {
            const si = 1 + Math.floor(Math.random() * (main.length - 2));
            const sub = [{ x: main[si].x, y: main[si].y }];
            let sx = main[si].x, sy = main[si].y;
            for (let i = 0; i < 3; i++) {
                sx += (Math.random() - 0.5) * 25;
                sy += 8 + Math.random() * 15;
                sub.push({ x: sx, y: sy });
            }
            branches.push(sub);
        }
        return branches;
    }
}

// ===== STARFIELD =====

class StarField {
    constructor(canvasWidth, canvasHeight, quality = 'high') {
        this.stars = [];
        this.nebulae = [];
        this.fxParticles = [];
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.quality = quality;
        this.bgColor = '#0a0a1a';
        this.currentTheme = null;

        this._buildForTheme(getThemeForLevel(1));
    }

    /** Switch to a new level's theme — rebuilds stars/nebulae/fx */
    setLevel(level) {
        const theme = getThemeForLevel(level);
        if (theme === this.currentTheme) return;
        this._buildForTheme(theme);
    }

    /** Change quality setting and rebuild */
    setQuality(quality) {
        this.quality = quality;
        this._buildForTheme(this.currentTheme);
    }

    _buildForTheme(theme) {
        this.currentTheme = theme;
        this.bgColor = theme.bg;
        this.stars = [];
        this.nebulae = [];
        this.fxParticles = [];

        const starCounts = {
            high: [40, 25, 12],
            medium: [25, 15, 8],
            low: [15, 8, 4]
        };
        const counts = starCounts[this.quality] || starCounts.high;
        for (let layer = 0; layer < 3; layer++) {
            for (let i = 0; i < counts[layer]; i++) {
                this.stars.push(new Star(this.canvasWidth, this.canvasHeight, layer, theme));
            }
        }

        if (this.quality !== 'low') {
            for (let i = 0; i < 3; i++) {
                this.nebulae.push(new Nebula(this.canvasWidth, this.canvasHeight, theme));
            }
        }

        // FX particles
        if (theme.fx && this.quality !== 'low') {
            const fxCount = this.quality === 'high' ? 18 : 10;
            for (let i = 0; i < fxCount; i++) {
                this.fxParticles.push(new BgFxParticle(this.canvasWidth, this.canvasHeight, theme.fx));
            }
        }
    }

    update(dt) {
        for (const star of this.stars) {
            star.update(dt, this.canvasWidth, this.canvasHeight);
        }
        for (const nebula of this.nebulae) {
            nebula.update(dt, this.canvasWidth, this.canvasHeight);
        }
        const time = performance.now() * 0.001;
        for (const fx of this.fxParticles) {
            fx.update(dt, this.canvasWidth, this.canvasHeight, time);
        }
    }

    render(ctx, time) {
        // Background fill
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Nebulae
        for (const nebula of this.nebulae) {
            nebula.render(ctx);
        }
        // Stars
        for (const star of this.stars) {
            star.render(ctx);
        }
        // FX
        for (const fx of this.fxParticles) {
            fx.render(ctx, this.canvasWidth, this.canvasHeight);
        }

        // Black hole center glow for blackhole theme
        if (this.currentTheme && this.currentTheme.fx === 'blackhole') {
            ctx.save();
            const cx = this.canvasWidth / 2, cy = this.canvasHeight / 2;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
            g.addColorStop(0, 'rgba(0,0,0,0.9)');
            g.addColorStop(0.6, 'rgba(20,0,40,0.3)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }
}

export { Star, Nebula, StarField, getThemeForLevel, LEVEL_THEMES };
export default StarField;
