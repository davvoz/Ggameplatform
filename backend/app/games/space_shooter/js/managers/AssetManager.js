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
        this.generatedSprites.set('enemy4', this.createAdvancedEnemy4());
        this.generatedSprites.set('enemy5', this.createAdvancedEnemy5());
        this.generatedSprites.set('enemy6', this.createAdvancedEnemy6());
        this.generatedSprites.set('boss', this.createAdvancedBoss());
        this.generatedSprites.set('boss_hydra', this.createBossHydra());
        this.generatedSprites.set('boss_fortress', this.createBossFortress());
        this.generatedSprites.set('boss_void', this.createBossVoid());
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

    /**
     * Enemy4 - Phantom: ghostly, translucent ship with ethereal wisps
     */
    createAdvancedEnemy4() {
        const canvas = document.createElement('canvas');
        canvas.width = 44;
        canvas.height = 44;
        const ctx = canvas.getContext('2d');

        // Outer ethereal glow
        const glow = ctx.createRadialGradient(22, 22, 0, 22, 22, 22);
        glow.addColorStop(0, 'rgba(80, 180, 255, 0.25)');
        glow.addColorStop(1, 'rgba(80, 180, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 44, 44);

        // Main body - sleek crescent shape
        const bodyGrad = ctx.createRadialGradient(22, 18, 0, 22, 22, 22);
        bodyGrad.addColorStop(0, '#aaddff');
        bodyGrad.addColorStop(0.4, '#4488cc');
        bodyGrad.addColorStop(0.8, '#224466');
        bodyGrad.addColorStop(1, '#112233');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(22, 4);
        ctx.bezierCurveTo(36, 6, 42, 18, 38, 32);
        ctx.bezierCurveTo(34, 38, 28, 40, 22, 36);
        ctx.bezierCurveTo(16, 40, 10, 38, 6, 32);
        ctx.bezierCurveTo(2, 18, 8, 6, 22, 4);
        ctx.closePath();
        ctx.fill();

        // Inner light streaks (wisps)
        ctx.strokeStyle = 'rgba(150, 220, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(14, 14);
        ctx.quadraticCurveTo(22, 20, 30, 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(12, 22);
        ctx.quadraticCurveTo(22, 28, 32, 22);
        ctx.stroke();

        // Core eye - cyan energy
        const coreGrad = ctx.createRadialGradient(22, 18, 0, 22, 18, 8);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, '#88ddff');
        coreGrad.addColorStop(1, '#2266aa');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#44bbff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(22, 18, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Pupil slit
        ctx.fillStyle = '#003366';
        ctx.beginPath();
        ctx.ellipse(22, 18, 2, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(20, 16, 1.5, 0, Math.PI * 2);
        ctx.fill();

        return canvas;
    }

    /**
     * Enemy5 - Sentinel: heavy armored mech with angular plating
     */
    createAdvancedEnemy5() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Warm glow
        const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 34);
        glow.addColorStop(0, 'rgba(255, 160, 30, 0.2)');
        glow.addColorStop(1, 'rgba(255, 160, 30, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 64, 64);

        // Shoulder armour left
        ctx.fillStyle = '#5a5a6a';
        ctx.beginPath();
        ctx.moveTo(4, 24);
        ctx.lineTo(14, 16);
        ctx.lineTo(20, 24);
        ctx.lineTo(18, 42);
        ctx.lineTo(4, 38);
        ctx.closePath();
        ctx.fill();

        // Shoulder armour right
        ctx.beginPath();
        ctx.moveTo(60, 24);
        ctx.lineTo(50, 16);
        ctx.lineTo(44, 24);
        ctx.lineTo(46, 42);
        ctx.lineTo(60, 38);
        ctx.closePath();
        ctx.fill();

        // Main body - heavy hexagonal torso
        const bodyGrad = ctx.createLinearGradient(16, 8, 48, 58);
        bodyGrad.addColorStop(0, '#7a7a8a');
        bodyGrad.addColorStop(0.3, '#9a9aa8');
        bodyGrad.addColorStop(0.6, '#6a6a7a');
        bodyGrad.addColorStop(1, '#4a4a5a');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(32, 6);
        ctx.lineTo(48, 16);
        ctx.lineTo(50, 40);
        ctx.lineTo(40, 56);
        ctx.lineTo(24, 56);
        ctx.lineTo(14, 40);
        ctx.lineTo(16, 16);
        ctx.closePath();
        ctx.fill();

        // Armour edge highlight
        ctx.strokeStyle = '#b0b0c0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Chest vent lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(23, 28 + i * 5);
            ctx.lineTo(41, 28 + i * 5);
            ctx.stroke();
        }

        // Core reactor
        const coreGrad = ctx.createRadialGradient(32, 30, 0, 32, 30, 10);
        coreGrad.addColorStop(0, '#fff8e0');
        coreGrad.addColorStop(0.3, '#ffaa22');
        coreGrad.addColorStop(0.7, '#dd6600');
        coreGrad.addColorStop(1, '#882200');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#ffaa22';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(32, 30, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Core inner ring
        ctx.strokeStyle = '#ffdd88';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(32, 30, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Weapon mounts (small red dots)
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff2222';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(8, 32, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(56, 32, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        return canvas;
    }

    /**
     * Enemy6 - Swarm: tiny insectoid ship with wings
     */
    createAdvancedEnemy6() {
        const canvas = document.createElement('canvas');
        canvas.width = 28;
        canvas.height = 28;
        const ctx = canvas.getContext('2d');

        // Tiny glow
        const glow = ctx.createRadialGradient(14, 14, 0, 14, 14, 14);
        glow.addColorStop(0, 'rgba(100, 255, 100, 0.2)');
        glow.addColorStop(1, 'rgba(100, 255, 100, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 28, 28);

        // Wings (translucent)
        ctx.fillStyle = 'rgba(120, 255, 120, 0.35)';
        // Left wing
        ctx.beginPath();
        ctx.moveTo(14, 10);
        ctx.bezierCurveTo(6, 6, 1, 12, 4, 20);
        ctx.lineTo(12, 16);
        ctx.closePath();
        ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(14, 10);
        ctx.bezierCurveTo(22, 6, 27, 12, 24, 20);
        ctx.lineTo(16, 16);
        ctx.closePath();
        ctx.fill();

        // Body - small elongated teardrop
        const bodyGrad = ctx.createLinearGradient(14, 4, 14, 24);
        bodyGrad.addColorStop(0, '#88ff88');
        bodyGrad.addColorStop(0.5, '#33aa44');
        bodyGrad.addColorStop(1, '#116622');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(14, 4);
        ctx.bezierCurveTo(19, 8, 19, 18, 14, 24);
        ctx.bezierCurveTo(9, 18, 9, 8, 14, 4);
        ctx.closePath();
        ctx.fill();

        // Eyes - two small red dots
        ctx.fillStyle = '#ff6644';
        ctx.shadowColor = '#ff4422';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(11, 11, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(17, 11, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Wing line details
        ctx.strokeStyle = 'rgba(200, 255, 200, 0.5)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(12, 12);
        ctx.lineTo(5, 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(16, 12);
        ctx.lineTo(23, 14);
        ctx.stroke();

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

    /**
     * Boss Hydra - Multi-headed serpentine boss, green/toxic theme
     */
    createBossHydra() {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 140;
        const ctx = canvas.getContext('2d');

        // Toxic glow
        const glow = ctx.createRadialGradient(90, 70, 0, 90, 70, 100);
        glow.addColorStop(0, 'rgba(50, 255, 80, 0.2)');
        glow.addColorStop(1, 'rgba(30, 200, 50, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 180, 140);

        // Main body - organic serpentine shape
        const bodyGrad = ctx.createRadialGradient(90, 75, 0, 90, 75, 70);
        bodyGrad.addColorStop(0, '#44aa44');
        bodyGrad.addColorStop(0.5, '#227733');
        bodyGrad.addColorStop(1, '#0a3a1a');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(90, 20);
        ctx.bezierCurveTo(140, 25, 165, 55, 160, 90);
        ctx.bezierCurveTo(155, 115, 130, 130, 90, 130);
        ctx.bezierCurveTo(50, 130, 25, 115, 20, 90);
        ctx.bezierCurveTo(15, 55, 40, 25, 90, 20);
        ctx.closePath();
        ctx.fill();

        // Scale pattern
        ctx.strokeStyle = 'rgba(100, 200, 80, 0.3)';
        ctx.lineWidth = 1;
        for (let r = 20; r < 60; r += 12) {
            ctx.beginPath();
            ctx.arc(90, 75, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Three heads (necks extending up)
        const headPositions = [
            { x: 50, y: 25, neckX: 60, neckY: 50 },
            { x: 90, y: 15, neckX: 90, neckY: 45 },
            { x: 130, y: 25, neckX: 120, neckY: 50 }
        ];
        headPositions.forEach(h => {
            // Neck
            ctx.strokeStyle = '#2a7a2a';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(h.neckX, h.neckY);
            ctx.quadraticCurveTo(h.x, h.y + 15, h.x, h.y);
            ctx.stroke();

            // Head
            const headGrad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 14);
            headGrad.addColorStop(0, '#66dd66');
            headGrad.addColorStop(1, '#1a5a1a');
            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.ellipse(h.x, h.y, 14, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Eyes - menacing red
            ctx.fillStyle = '#ff2222';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(h.x - 5, h.y - 2, 3, 0, Math.PI * 2);
            ctx.arc(h.x + 5, h.y - 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Mouth slit
            ctx.strokeStyle = '#003300';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(h.x - 6, h.y + 4);
            ctx.lineTo(h.x + 6, h.y + 4);
            ctx.stroke();
        });

        // Central core - toxic orb
        const coreGrad = ctx.createRadialGradient(90, 75, 0, 90, 75, 18);
        coreGrad.addColorStop(0, '#88ff44');
        coreGrad.addColorStop(0.5, '#44cc22');
        coreGrad.addColorStop(1, '#115500');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#44ff22';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(90, 75, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Regen symbol inside core
        ctx.strokeStyle = '#ccffcc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(90, 68);
        ctx.lineTo(90, 82);
        ctx.moveTo(83, 75);
        ctx.lineTo(97, 75);
        ctx.stroke();

        // Engine vents
        ctx.fillStyle = '#00cc66';
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(60, 125, 10, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(90, 128, 12, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(120, 125, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        return canvas;
    }

    /**
     * Boss Fortress - Massive armored station, gold/steel theme
     */
    createBossFortress() {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');

        // Golden glow
        const glow = ctx.createRadialGradient(100, 80, 0, 100, 80, 110);
        glow.addColorStop(0, 'rgba(255, 200, 50, 0.15)');
        glow.addColorStop(1, 'rgba(255, 180, 30, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 200, 160);

        // Outer hull - octagonal fortress
        const hullGrad = ctx.createLinearGradient(0, 0, 200, 160);
        hullGrad.addColorStop(0, '#5a5a6a');
        hullGrad.addColorStop(0.3, '#8a8a9a');
        hullGrad.addColorStop(0.5, '#6a6a7a');
        hullGrad.addColorStop(0.7, '#8a8a9a');
        hullGrad.addColorStop(1, '#4a4a5a');
        ctx.fillStyle = hullGrad;
        ctx.beginPath();
        ctx.moveTo(100, 8);
        ctx.lineTo(155, 25);
        ctx.lineTo(185, 65);
        ctx.lineTo(185, 110);
        ctx.lineTo(155, 145);
        ctx.lineTo(100, 155);
        ctx.lineTo(45, 145);
        ctx.lineTo(15, 110);
        ctx.lineTo(15, 65);
        ctx.lineTo(45, 25);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#cccc88';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner armor plate
        ctx.fillStyle = '#3a3a4a';
        ctx.beginPath();
        ctx.moveTo(100, 30);
        ctx.lineTo(140, 45);
        ctx.lineTo(155, 80);
        ctx.lineTo(140, 120);
        ctx.lineTo(100, 135);
        ctx.lineTo(60, 120);
        ctx.lineTo(45, 80);
        ctx.lineTo(60, 45);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Panel lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(55, 50 + i * 18);
            ctx.lineTo(145, 50 + i * 18);
            ctx.stroke();
        }

        // Central command core
        const coreGrad = ctx.createRadialGradient(100, 80, 0, 100, 80, 25);
        coreGrad.addColorStop(0, '#ffffcc');
        coreGrad.addColorStop(0.3, '#ffcc44');
        coreGrad.addColorStop(0.7, '#cc8800');
        coreGrad.addColorStop(1, '#664400');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(100, 80, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Core rings
        ctx.strokeStyle = '#ffdd88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(100, 80, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.4)';
        ctx.beginPath();
        ctx.arc(100, 80, 32, 0, Math.PI * 2);
        ctx.stroke();

        // 4 turret mounts
        const turrets = [
            { x: 30, y: 50 }, { x: 170, y: 50 },
            { x: 30, y: 115 }, { x: 170, y: 115 }
        ];
        turrets.forEach(t => {
            ctx.fillStyle = '#4a4a5a';
            ctx.beginPath();
            ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Turret barrel
            ctx.fillStyle = '#333';
            ctx.fillRect(t.x - 3, t.y, 6, 15);
            // Turret glow
            ctx.fillStyle = '#ff6622';
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Engine exhausts
        ctx.fillStyle = '#4488ff';
        ctx.shadowColor = '#2266ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(65, 148, 12, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(100, 152, 14, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(135, 148, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        return canvas;
    }

    /**
     * Boss Void - Dark energy entity, purple/black hole theme
     */
    createBossVoid() {
        const canvas = document.createElement('canvas');
        canvas.width = 150;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');

        // Dark void aura
        const aura = ctx.createRadialGradient(75, 75, 0, 75, 75, 75);
        aura.addColorStop(0, 'rgba(60, 0, 120, 0.4)');
        aura.addColorStop(0.5, 'rgba(40, 0, 80, 0.2)');
        aura.addColorStop(1, 'rgba(20, 0, 40, 0)');
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, 150, 150);

        // Outer energy ring
        ctx.strokeStyle = 'rgba(150, 80, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(75, 75, 65, 0, Math.PI * 2);
        ctx.stroke();

        // Swirling arms (4 spiral arms)
        for (let arm = 0; arm < 4; arm++) {
            const baseAngle = (arm / 4) * Math.PI * 2;
            ctx.strokeStyle = `rgba(${120 + arm * 30}, ${40 + arm * 15}, 255, 0.5)`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let t = 0; t < 30; t++) {
                const angle = baseAngle + t * 0.15;
                const r = 10 + t * 1.8;
                const px = 75 + Math.cos(angle) * r;
                const py = 75 + Math.sin(angle) * r;
                if (t === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Dark core - event horizon
        const coreGrad = ctx.createRadialGradient(75, 75, 0, 75, 75, 30);
        coreGrad.addColorStop(0, '#000000');
        coreGrad.addColorStop(0.4, '#110022');
        coreGrad.addColorStop(0.7, '#330066');
        coreGrad.addColorStop(1, '#550099');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(75, 75, 28, 0, Math.PI * 2);
        ctx.fill();

        // Accretion disk (bright ring around core)
        const diskGrad = ctx.createRadialGradient(75, 75, 20, 75, 75, 38);
        diskGrad.addColorStop(0, 'rgba(200, 100, 255, 0)');
        diskGrad.addColorStop(0.3, 'rgba(200, 100, 255, 0.6)');
        diskGrad.addColorStop(0.5, 'rgba(255, 150, 255, 0.8)');
        diskGrad.addColorStop(0.7, 'rgba(200, 100, 255, 0.6)');
        diskGrad.addColorStop(1, 'rgba(100, 50, 200, 0)');
        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.ellipse(75, 75, 38, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Central singularity glow
        ctx.fillStyle = '#bb66ff';
        ctx.shadowColor = '#9933ff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(75, 75, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(75, 75, 3, 0, Math.PI * 2);
        ctx.fill();

        // Floating rune particles
        const runePositions = [
            { x: 40, y: 40 }, { x: 110, y: 40 },
            { x: 40, y: 110 }, { x: 110, y: 110 },
            { x: 75, y: 25 }, { x: 75, y: 125 }
        ];
        runePositions.forEach(p => {
            ctx.fillStyle = 'rgba(180, 100, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

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
        
        switch (type) {
            case 'health':
            ctx.fillRect(cx - 2, cy - 8, 4, 16);
            ctx.fillRect(cx - 8, cy - 2, 16, 4);
            break;
            case 'weapon':
                
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
            break;
            case 'shield':
            ctx.beginPath();
            ctx.moveTo(cx, cy - 8);
            ctx.lineTo(cx + 8, cy - 3);
            ctx.lineTo(cx + 6, cy + 5);
            ctx.lineTo(cx, cy + 10);
            ctx.lineTo(cx - 6, cy + 5);
            ctx.lineTo(cx - 8, cy - 3);
            ctx.closePath();
            ctx.fill();
            break;
            case 'speed':
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
            break;
            case 'rapid':
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
            break;
            case 'magnet':
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
            break;
            case 'life':
            // Cuore per vita extra
            ctx.beginPath();
            ctx.moveTo(cx, cy + 6);
            ctx.bezierCurveTo(cx - 8, cy, cx - 8, cy - 6, cx - 4, cy - 6);
            ctx.bezierCurveTo(cx, cy - 6, cx, cy - 2, cx, cy - 2);
            ctx.bezierCurveTo(cx, cy - 6, cx + 4, cy - 6, cx + 4, cy - 6);
            ctx.bezierCurveTo(cx + 8, cy - 6, cx + 8, cy, cx, cy + 6);
            ctx.closePath();
            ctx.fill();
            break;
            case 'bomb':
            // Bomba
            ctx.beginPath();
            ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - 2, cy - 8, 4, 6);
            break;
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
