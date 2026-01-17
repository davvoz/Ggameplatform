/**
 * AssetManager - Gestisce il caricamento e caching degli asset
 * Versione con grafica avanzata
 */
class AssetManager {
    constructor() {
        this.images = new Map();
        this.sprites = new Map();
        this.loadedCount = 0;
        this.totalCount = 0;
        this.generatedSprites = new Map();
    }

    async loadAll() {
        this.generateAdvancedSprites();
        return true;
    }

    generateAdvancedSprites() {
        this.generatedSprites.set('player', this.createAdvancedPlayerSprite());
        this.generatedSprites.set('enemy1', this.createAdvancedEnemy1());
        this.generatedSprites.set('enemy2', this.createAdvancedEnemy2());
        this.generatedSprites.set('enemy3', this.createAdvancedEnemy3());
        this.generatedSprites.set('boss', this.createAdvancedBoss());
        this.generatedSprites.set('bullet_player', this.createAdvancedBullet('player'));
        this.generatedSprites.set('bullet_enemy', this.createAdvancedBullet('enemy'));
        for (let i = 0; i < 8; i++) {
            this.generatedSprites.set(`explosion_${i}`, this.createAdvancedExplosionFrame(i));
        }
        this.generatedSprites.set('powerup_health', this.createAdvancedPowerUp('health'));
        this.generatedSprites.set('powerup_weapon', this.createAdvancedPowerUp('weapon'));
        this.generatedSprites.set('powerup_shield', this.createAdvancedPowerUp('shield'));
        this.generatedSprites.set('powerup_speed', this.createAdvancedPowerUp('speed'));
        this.generatedSprites.set('powerup_rapid', this.createAdvancedPowerUp('rapid'));
        this.generatedSprites.set('powerup_magnet', this.createAdvancedPowerUp('magnet'));
        this.generatedSprites.set('powerup_life', this.createAdvancedPowerUp('life'));
        this.generatedSprites.set('powerup_bomb', this.createAdvancedPowerUp('bomb'));
    }

    createAdvancedPlayerSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        const glowGradient = ctx.createRadialGradient(32, 35, 0, 32, 35, 35);
        glowGradient.addColorStop(0, 'rgba(0, 150, 255, 0.3)');
        glowGradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, 64, 64);
        
        const bodyGradient = ctx.createLinearGradient(15, 0, 49, 0);
        bodyGradient.addColorStop(0, '#1a4a7a');
        bodyGradient.addColorStop(0.3, '#3a8acd');
        bodyGradient.addColorStop(0.5, '#5abaff');
        bodyGradient.addColorStop(0.7, '#3a8acd');
        bodyGradient.addColorStop(1, '#1a4a7a');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(32, 4);
        ctx.lineTo(48, 45);
        ctx.lineTo(42, 48);
        ctx.lineTo(32, 42);
        ctx.lineTo(22, 48);
        ctx.lineTo(16, 45);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#88ddff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        const cockpitGradient = ctx.createLinearGradient(26, 12, 38, 30);
        cockpitGradient.addColorStop(0, '#00ffff');
        cockpitGradient.addColorStop(0.5, '#0088aa');
        cockpitGradient.addColorStop(1, '#004455');
        
        ctx.fillStyle = cockpitGradient;
        ctx.beginPath();
        ctx.moveTo(32, 12);
        ctx.lineTo(38, 28);
        ctx.lineTo(32, 32);
        ctx.lineTo(26, 28);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(32, 14);
        ctx.lineTo(35, 22);
        ctx.lineTo(32, 24);
        ctx.lineTo(29, 22);
        ctx.closePath();
        ctx.fill();
        
        const wingGradient = ctx.createLinearGradient(0, 35, 20, 55);
        wingGradient.addColorStop(0, '#2a5a9a');
        wingGradient.addColorStop(1, '#1a3a6a');
        
        ctx.fillStyle = wingGradient;
        ctx.beginPath();
        ctx.moveTo(16, 45);
        ctx.lineTo(4, 52);
        ctx.lineTo(6, 58);
        ctx.lineTo(18, 52);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#5599cc';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(48, 45);
        ctx.lineTo(60, 52);
        ctx.lineTo(58, 58);
        ctx.lineTo(46, 52);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#aaccee';
        ctx.fillRect(28, 35, 8, 3);
        ctx.fillRect(25, 40, 14, 2);
        
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(26, 52, 3, 0, Math.PI * 2);
        ctx.arc(38, 52, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(32, 6, 2, 0, Math.PI * 2);
        ctx.fill();
        
        return canvas;
    }

    createAdvancedEnemy1() {
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        
        const glow = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
        glow.addColorStop(0, 'rgba(50, 255, 100, 0.2)');
        glow.addColorStop(1, 'rgba(50, 255, 100, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 48, 48);
        
        const bodyGrad = ctx.createRadialGradient(24, 20, 0, 24, 24, 25);
        bodyGrad.addColorStop(0, '#66ff88');
        bodyGrad.addColorStop(0.5, '#33aa55');
        bodyGrad.addColorStop(1, '#115533');
        
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(24, 5);
        ctx.bezierCurveTo(40, 10, 45, 30, 40, 42);
        ctx.lineTo(24, 38);
        ctx.lineTo(8, 42);
        ctx.bezierCurveTo(3, 30, 8, 10, 24, 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(0, 50, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(24, 20 + i * 5, 10 - i * 2, 0, Math.PI);
            ctx.stroke();
        }
        
        ctx.fillStyle = '#ff3333';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(24, 18, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(24, 18, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(21, 16, 2, 0, Math.PI * 2);
        ctx.fill();
        
        return canvas;
    }

    createAdvancedEnemy2() {
        const canvas = document.createElement('canvas');
        canvas.width = 56;
        canvas.height = 56;
        const ctx = canvas.getContext('2d');
        
        const glow = ctx.createRadialGradient(28, 28, 0, 28, 28, 30);
        glow.addColorStop(0, 'rgba(255, 50, 50, 0.3)');
        glow.addColorStop(1, 'rgba(255, 50, 50, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 56, 56);
        
        const bodyGrad = ctx.createLinearGradient(8, 0, 48, 56);
        bodyGrad.addColorStop(0, '#aa3333');
        bodyGrad.addColorStop(0.5, '#dd5555');
        bodyGrad.addColorStop(1, '#882222');
        
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(28, 4);
        ctx.lineTo(50, 20);
        ctx.lineTo(48, 45);
        ctx.lineTo(28, 52);
        ctx.lineTo(8, 45);
        ctx.lineTo(6, 20);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#ff8888';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#661111';
        ctx.fillRect(18, 15, 20, 25);
        
        const coreGrad = ctx.createRadialGradient(28, 27, 0, 28, 27, 12);
        coreGrad.addColorStop(0, '#ffff00');
        coreGrad.addColorStop(0.3, '#ff8800');
        coreGrad.addColorStop(1, '#ff0000');
        
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(28, 27, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#444';
        ctx.fillRect(2, 25, 8, 15);
        ctx.fillRect(46, 25, 8, 15);
        
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(6, 38, 3, 0, Math.PI * 2);
        ctx.arc(50, 38, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        return canvas;
    }

    createAdvancedEnemy3() {
        const canvas = document.createElement('canvas');
        canvas.width = 72;
        canvas.height = 72;
        const ctx = canvas.getContext('2d');
        
        const glow = ctx.createRadialGradient(36, 36, 0, 36, 36, 40);
        glow.addColorStop(0, 'rgba(150, 50, 200, 0.3)');
        glow.addColorStop(1, 'rgba(150, 50, 200, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 72, 72);
        
        const bodyGrad = ctx.createLinearGradient(0, 0, 72, 72);
        bodyGrad.addColorStop(0, '#2a2a4a');
        bodyGrad.addColorStop(0.5, '#4a4a7a');
        bodyGrad.addColorStop(1, '#2a2a4a');
        
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(36, 5);
        ctx.lineTo(65, 25);
        ctx.lineTo(68, 50);
        ctx.lineTo(50, 68);
        ctx.lineTo(36, 65);
        ctx.lineTo(22, 68);
        ctx.lineTo(4, 50);
        ctx.lineTo(7, 25);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#8888cc';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#3a3a5a';
        ctx.beginPath();
        ctx.moveTo(36, 15);
        ctx.lineTo(55, 30);
        ctx.lineTo(50, 55);
        ctx.lineTo(36, 58);
        ctx.lineTo(22, 55);
        ctx.lineTo(17, 30);
        ctx.closePath();
        ctx.fill();
        
        const coreGrad = ctx.createRadialGradient(36, 40, 0, 36, 40, 15);
        coreGrad.addColorStop(0, '#ff66ff');
        coreGrad.addColorStop(0.5, '#aa00aa');
        coreGrad.addColorStop(1, '#550055');
        
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(36, 40, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = '#ff88ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(36, 40, 16, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = '#555577';
        const turretPositions = [[15, 35], [57, 35], [25, 58], [47, 58]];
        turretPositions.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#555577';
        });
        
        return canvas;
    }

    createAdvancedBoss() {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 140;
        const ctx = canvas.getContext('2d');
        
        const glow = ctx.createRadialGradient(90, 70, 0, 90, 70, 100);
        glow.addColorStop(0, 'rgba(255, 100, 50, 0.2)');
        glow.addColorStop(1, 'rgba(255, 50, 50, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 180, 140);
        
        const bodyGrad = ctx.createLinearGradient(0, 0, 180, 140);
        bodyGrad.addColorStop(0, '#2a3a4a');
        bodyGrad.addColorStop(0.5, '#4a5a6a');
        bodyGrad.addColorStop(1, '#2a3a4a');
        
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(90, 10);
        ctx.bezierCurveTo(150, 15, 175, 50, 170, 90);
        ctx.lineTo(150, 120);
        ctx.lineTo(90, 130);
        ctx.lineTo(30, 120);
        ctx.lineTo(10, 90);
        ctx.bezierCurveTo(5, 50, 30, 15, 90, 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#8899aa';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = '#3a4a5a';
        ctx.beginPath();
        ctx.ellipse(90, 60, 50, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6677aa';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const coreGrad = ctx.createRadialGradient(90, 55, 0, 90, 55, 25);
        coreGrad.addColorStop(0, '#ff0000');
        coreGrad.addColorStop(0.5, '#cc0000');
        coreGrad.addColorStop(1, '#660000');
        
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(90, 55, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(90, 55, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ff666688';
        ctx.beginPath();
        ctx.arc(90, 55, 35, 0, Math.PI * 2);
        ctx.stroke();
        
        const cannonGrad = ctx.createLinearGradient(0, 40, 0, 100);
        cannonGrad.addColorStop(0, '#3a4a5a');
        cannonGrad.addColorStop(1, '#2a3a4a');
        
        ctx.fillStyle = cannonGrad;
        ctx.fillRect(5, 45, 30, 50);
        ctx.fillRect(0, 60, 15, 25);
        ctx.fillRect(145, 45, 30, 50);
        ctx.fillRect(165, 60, 15, 25);
        
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(7, 72, 5, 0, Math.PI * 2);
        ctx.arc(173, 72, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(60, 45, 6, 0, Math.PI * 2);
        ctx.arc(120, 45, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#00ccff';
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(50, 115, 10, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(90, 120, 12, 8, 0, 0, Math.PI * 2);
        ctx.ellipse(130, 115, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        return canvas;
    }

    createAdvancedBullet(owner) {
        const canvas = document.createElement('canvas');
        canvas.width = 12;
        canvas.height = 28;
        const ctx = canvas.getContext('2d');
        
        const isPlayer = owner === 'player';
        const color1 = isPlayer ? '#00ffff' : '#ff4444';
        const color2 = isPlayer ? '#0088ff' : '#ff0000';
        
        const glowGrad = ctx.createRadialGradient(6, 14, 0, 6, 14, 14);
        glowGrad.addColorStop(0, isPlayer ? 'rgba(0, 200, 255, 0.5)' : 'rgba(255, 100, 100, 0.5)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, 12, 28);
        
        const bodyGrad = ctx.createLinearGradient(0, 0, 0, 28);
        bodyGrad.addColorStop(0, color1);
        bodyGrad.addColorStop(0.5, '#ffffff');
        bodyGrad.addColorStop(1, color2);
        
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(6, 14, 4, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(6, 14, 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        return canvas;
    }

    createAdvancedExplosionFrame(frame) {
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        
        const progress = frame / 7;
        const cx = 40, cy = 40;
        
        if (frame < 4) {
            const shockRadius = 15 + frame * 15;
            ctx.strokeStyle = `rgba(255, 200, 100, ${0.8 - frame * 0.2})`;
            ctx.lineWidth = 3 - frame * 0.5;
            ctx.beginPath();
            ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        const coreRadius = frame < 3 ? 15 + frame * 8 : 35 - (frame - 3) * 6;
        const coreAlpha = 1 - progress * 0.7;
        
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha})`);
        coreGrad.addColorStop(0.2, `rgba(255, 255, 150, ${coreAlpha * 0.9})`);
        coreGrad.addColorStop(0.5, `rgba(255, 150, 50, ${coreAlpha * 0.7})`);
        coreGrad.addColorStop(0.8, `rgba(255, 80, 0, ${coreAlpha * 0.4})`);
        coreGrad.addColorStop(1, 'rgba(100, 30, 0, 0)');
        
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        
        if (frame > 1) {
            const flameCount = 8;
            for (let i = 0; i < flameCount; i++) {
                const angle = (i / flameCount) * Math.PI * 2 + frame * 0.3;
                const flameLen = (20 + frame * 5) * (0.5 + Math.random() * 0.5);
                const flameX = cx + Math.cos(angle) * flameLen;
                const flameY = cy + Math.sin(angle) * flameLen;
                
                const flameGrad = ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, 10);
                flameGrad.addColorStop(0, `rgba(255, 200, 50, ${0.8 - progress * 0.6})`);
                flameGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
                
                ctx.fillStyle = flameGrad;
                ctx.beginPath();
                ctx.arc(flameX, flameY, 8 - frame * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        if (frame > 3) {
            const smokeAlpha = (frame - 3) / 4 * 0.4;
            const smokeRadius = 20 + (frame - 3) * 10;
            
            ctx.fillStyle = `rgba(80, 80, 80, ${smokeAlpha})`;
            for (let i = 0; i < 5; i++) {
                const sx = cx + (Math.random() - 0.5) * 30;
                const sy = cy + (Math.random() - 0.5) * 30 - frame * 3;
                ctx.beginPath();
                ctx.arc(sx, sy, smokeRadius * (0.3 + Math.random() * 0.4), 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        return canvas;
    }

    createAdvancedPowerUp(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        
        const colors = {
            health: { primary: '#44ff44', secondary: '#00aa00', glow: 'rgba(50, 255, 50, 0.5)' },
            weapon: { primary: '#ffaa00', secondary: '#ff6600', glow: 'rgba(255, 170, 0, 0.5)' },
            shield: { primary: '#4488ff', secondary: '#0044aa', glow: 'rgba(68, 136, 255, 0.5)' }
        };
        
        const c = colors[type] || colors.weapon;
        const cx = 20, cy = 20;
        
        // Supporta anche nuovi tipi
        const extColors = {
            speed: { primary: '#00ffff', secondary: '#0088aa', glow: 'rgba(0, 255, 255, 0.5)' },
            rapid: { primary: '#ffff00', secondary: '#aaaa00', glow: 'rgba(255, 255, 0, 0.5)' },
            magnet: { primary: '#cc66ff', secondary: '#8833aa', glow: 'rgba(200, 100, 255, 0.5)' },
            life: { primary: '#ff66cc', secondary: '#aa3388', glow: 'rgba(255, 100, 200, 0.5)' },
            bomb: { primary: '#ff4444', secondary: '#aa0000', glow: 'rgba(255, 68, 68, 0.5)' }
        };
        const finalC = extColors[type] || c;
        
        const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
        glowGrad.addColorStop(0, finalC.glow);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, 40, 40);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.strokeStyle = finalC.primary;
        ctx.lineWidth = 2;
        this.drawHexagon(ctx, cx, cy, 16);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = finalC.primary;
        ctx.shadowColor = finalC.primary;
        ctx.shadowBlur = 10;
        
        if (type === 'health') {
            ctx.fillRect(cx - 2, cy - 8, 4, 16);
            ctx.fillRect(cx - 8, cy - 2, 16, 4);
        } else if (type === 'weapon') {
            ctx.beginPath();
            ctx.moveTo(cx, cy - 8);
            ctx.lineTo(cx + 7, cy + 4);
            ctx.lineTo(cx + 2, cy + 4);
            ctx.lineTo(cx + 2, cy + 8);
            ctx.lineTo(cx - 2, cy + 8);
            ctx.lineTo(cx - 2, cy + 4);
            ctx.lineTo(cx - 7, cy + 4);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'shield') {
            ctx.beginPath();
            ctx.moveTo(cx, cy - 8);
            ctx.lineTo(cx + 8, cy - 3);
            ctx.lineTo(cx + 6, cy + 5);
            ctx.lineTo(cx, cy + 10);
            ctx.lineTo(cx - 6, cy + 5);
            ctx.lineTo(cx - 8, cy - 3);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'speed') {
            // Fulmine per velocità
            ctx.beginPath();
            ctx.moveTo(cx + 2, cy - 8);
            ctx.lineTo(cx - 4, cy);
            ctx.lineTo(cx + 1, cy);
            ctx.lineTo(cx - 2, cy + 8);
            ctx.lineTo(cx + 4, cy);
            ctx.lineTo(cx - 1, cy);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'rapid') {
            // Frecce multiple per rapid fire
            ctx.beginPath();
            ctx.moveTo(cx - 4, cy - 6);
            ctx.lineTo(cx - 4, cy + 2);
            ctx.lineTo(cx - 7, cy + 2);
            ctx.lineTo(cx - 2, cy + 8);
            ctx.lineTo(cx + 3, cy + 2);
            ctx.lineTo(cx, cy + 2);
            ctx.lineTo(cx, cy - 6);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 1, cy - 8);
            ctx.lineTo(cx + 1, cy);
            ctx.lineTo(cx - 2, cy);
            ctx.lineTo(cx + 3, cy + 6);
            ctx.lineTo(cx + 8, cy);
            ctx.lineTo(cx + 5, cy);
            ctx.lineTo(cx + 5, cy - 8);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'magnet') {
            // U per magnete
            ctx.beginPath();
            ctx.arc(cx, cy + 2, 6, 0, Math.PI);
            ctx.lineTo(cx - 6, cy - 6);
            ctx.lineTo(cx - 3, cy - 6);
            ctx.lineTo(cx - 3, cy);
            ctx.arc(cx, cy, 3, Math.PI, 0, true);
            ctx.lineTo(cx + 3, cy - 6);
            ctx.lineTo(cx + 6, cy - 6);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'life') {
            // Cuore per vita extra
            ctx.beginPath();
            ctx.moveTo(cx, cy + 6);
            ctx.bezierCurveTo(cx - 8, cy, cx - 8, cy - 6, cx - 4, cy - 6);
            ctx.bezierCurveTo(cx, cy - 6, cx, cy - 2, cx, cy - 2);
            ctx.bezierCurveTo(cx, cy - 6, cx + 4, cy - 6, cx + 4, cy - 6);
            ctx.bezierCurveTo(cx + 8, cy - 6, cx + 8, cy, cx, cy + 6);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'bomb') {
            // Bomba
            ctx.beginPath();
            ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - 2, cy - 8, 4, 6);
        }
        
        ctx.shadowBlur = 0;
        
        return canvas;
    }

    drawHexagon(ctx, cx, cy, radius) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    }

    getSprite(key) {
        if (this.generatedSprites.has(key)) {
            return { canvas: this.generatedSprites.get(key) };
        }
        return null;
    }

    drawSprite(ctx, key, x, y, width, height, rotation = 0) {
        const sprite = this.getSprite(key);
        if (!sprite) return;

        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate(rotation);

        if (sprite.canvas) {
            ctx.drawImage(sprite.canvas, -width / 2, -height / 2, width, height);
        }

        ctx.restore();
    }
}
