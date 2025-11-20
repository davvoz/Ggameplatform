/**
 * ProceduralLevelGenerator - Generates platforms and obstacles procedurally
 * Implements Builder Pattern and Dependency Inversion
 */

// Platform types with different speeds and behaviors
export const PlatformTypes = {
    NORMAL: 'normal',
    FAST: 'fast',
    SLOW: 'slow',
    BOUNCY: 'bouncy',
    CRUMBLING: 'crumbling',
    SPRING: 'spring',
    ICY: 'icy'
};

// Bonus types for collectibles
export const BonusTypes = {
    BOOST: 'boost',
    MAGNET: 'magnet'
};

export class ProceduralLevelGenerator {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.difficulty = 0.6; // Balanced start
        this.platformPool = [];
        this.obstaclePool = [];
        this.lastPlatformX = 0;
        this.lastPlatformY = 0;
        this.lastPlatformWidth = 0;
        this.lastPlatformHeight = 20;
        this.platformSpacing = { min: 50, max: 100 }; // FISSO - non cresce con i livelli
        this.platformWidth = { min: 220, max: 380 }; // Piattaforme larghe sempre
        this.platformHeight = 20;
        this.maxJumpHeight = 180; // Altezza massima salto del player
        this.maxJumpDistance = 170; // Distanza orizzontale massima saltabile 
        this.minVerticalGap = 15; // Gap verticale minimo per evitare sovrapposizioni
        this.maxVerticalGap = 100; // Gap verticale massimo - più conservativo
        this.safeJumpRatio = 0.75; // 75% della capacità massima per più margine
        this.colors = this.generateRainbowColors();
        this.seed = Date.now();
        this.platformsGenerated = 0;
        this.baseSpeed = 180; // Aumentato da 120 a 180 per più velocità
        this.recentPlatforms = []; // Traccia ultime piattaforme per evitare sovrapposizioni
        this.maxRecentPlatforms = 8; // Più piattaforme da controllare per sovrapposizioni
        
        // Sistema per sequenze di piattaforme dritte
        this.straightSequenceActive = false;
        this.straightSequenceRemaining = 0;
        this.straightSequenceY = 0;
        this.straightSequenceBaseChance = 0.10; // 10% base di probabilità (cresce 0.5% per livello)
        this.straightSequenceBaseMinLength = 4; // Minimo base 4 piattaforme (cresce con livello)
        this.straightSequenceBaseMaxLength = 8; // Massimo base 8 piattaforme (cresce con livello)
        
        // Sistema per scalette (piattaforme che salgono/scendono a gradini)
        this.stairSequenceActive = false;
        this.stairSequenceRemaining = 0;
        this.stairSequenceY = 0;
        this.stairSequenceDirection = 1; // 1 = salita, -1 = discesa
        this.stairSequenceBaseChance = 0.12; // 12% base di probabilità (cresce 0.5% per livello)
        this.stairSequenceLength = 6; // Numero fisso di piattaforme
        this.stairStepHeight = 40; // Altezza di ogni gradino
        this.stairStepSpacing = 10; // Spazio orizzontale tra gradini
    }

    generateRainbowColors() {
        return [
            [1.0, 0.2, 0.2, 1.0],  // Red
            [1.0, 0.5, 0.0, 1.0],  // Orange
            [1.0, 0.9, 0.0, 1.0],  // Yellow
            [0.2, 0.8, 0.2, 1.0],  // Green
            [0.2, 0.5, 1.0, 1.0],  // Blue
            [0.5, 0.2, 0.8, 1.0],  // Purple
            [1.0, 0.2, 0.8, 1.0]   // Pink
        ];
    }

    setDifficulty(level) {
        // Extremely slow difficulty progression (0.3 to 1.2 over many levels)
        this.difficulty = Math.min(0.3 + level * 0.02, 1.2);
        this.currentLevel = level; // Track current level
        
        // DISTANZE PROGRESSIVE - Aumentano gradualmente fino al livello 15, poi si stabilizzano
        // Livelli 1-4: Più spazio per imparare
        // Livelli 5-15: Aumento graduale della difficoltà
        // Livelli 16+: Distanza massima ma gestibile
        
        let spacingMultiplier, widthReduction, verticalGapIncrease;
        
        if (level <= 4) {
            // Livelli iniziali: più spazio orizzontale e verticale
            spacingMultiplier = 1.4 - (level * 0.05); // Da 1.4 a 1.2
            widthReduction = 0; // Piattaforme larghe
            verticalGapIncrease = 0; // Gap verticale standard
        } else if (level <= 15) {
            // Livelli intermedi: aumento graduale della difficoltà
            const progressInRange = (level - 4) / 11; // Da 0 a 1 nel range 5-15
            spacingMultiplier = 1.2 - (progressInRange * 0.3); // Da 1.2 a 0.9
            widthReduction = progressInRange * 40; // Da 0 a 40
            verticalGapIncrease = progressInRange * 15; // Da 0 a 15
        } else if (level <= 30) {
            // Livelli avanzati: difficoltà stabile
            spacingMultiplier = 0.9;
            widthReduction = 40;
            verticalGapIncrease = 15;
        } else {
            // Livelli 30+: NON aumentare troppo la distanza, mantieni giocabile
            const extraLevels = level - 30;
            // Aumenta MOLTO lentamente dopo il livello 30
            spacingMultiplier = 0.9 + Math.min(extraLevels * 0.01, 0.15); // Max 1.05
            widthReduction = 40 + Math.min(extraLevels * 0.3, 20); // Max 60
            verticalGapIncrease = 15 + Math.min(extraLevels * 0.2, 10); // Max 25
        }
        
        // Applica i moltiplicatori
        this.platformSpacing.min = Math.floor(50 * spacingMultiplier);
        this.platformSpacing.max = Math.floor(100 * spacingMultiplier);
        
        // Larghezza piattaforme
        this.platformWidth.min = Math.max(180, 220 - widthReduction);
        this.platformWidth.max = Math.max(300, 380 - widthReduction);
        
        // Gap verticale
        this.maxVerticalGap = Math.min(100 + verticalGapIncrease, 125);
        this.minVerticalGap = 15;
    }

    generatePlatform(x = null) {
        if (x === null) {
            const spacing = this.random(this.platformSpacing.min, this.platformSpacing.max);
            x = this.lastPlatformX + spacing;
        }

        const width = this.random(this.platformWidth.min, this.platformWidth.max);
        const height = this.platformHeight;
        
        // Controlla se iniziare una sequenza dritta
        if (!this.straightSequenceActive && !this.stairSequenceActive && this.platformsGenerated >= 5) {
            // Non nelle prime 5 piattaforme
            // Probabilità cresce con il livello: +0.5% per livello, max 50%
            const levelBonus = this.currentLevel || 1;
            const straightChance = Math.min(0.50, this.straightSequenceBaseChance + (levelBonus * 0.005));
            
            if (this.random(0, 1) < straightChance) {
                this.straightSequenceActive = true;
                // Lunghezza cresce con il livello: +1 per ogni livello
                const minLength = this.straightSequenceBaseMinLength + levelBonus;
                const maxLength = this.straightSequenceBaseMaxLength + levelBonus;
                this.straightSequenceRemaining = Math.floor(
                    this.random(minLength, maxLength + 1)
                );
                this.straightSequenceY = this.lastPlatformY; // Mantieni la Y corrente
                console.log(`🎯 Starting straight sequence of ${this.straightSequenceRemaining} platforms! (Level ${levelBonus}, Chance: ${(straightChance * 100).toFixed(1)}%)`);
            }
        }
        
        // Controlla se iniziare una scaletta
        if (!this.straightSequenceActive && !this.stairSequenceActive && this.platformsGenerated >= 5) {
            // Probabilità cresce con il livello: +0.5% per livello, max 50%
            const levelBonus = this.currentLevel || 1;
            const stairChance = Math.min(0.50, this.stairSequenceBaseChance + (levelBonus * 0.005));
            
            if (this.random(0, 1) < stairChance) {
                this.stairSequenceActive = true;
                this.stairSequenceRemaining = this.stairSequenceLength;
                this.stairSequenceY = this.lastPlatformY;
                // Decidi direzione: salita o discesa casualmente
                this.stairSequenceDirection = this.random(0, 1) < 0.5 ? -1 : 1; // -1 = salita, 1 = discesa
                const direction = this.stairSequenceDirection === -1 ? 'UP ⬆️' : 'DOWN ⬇️';
                console.log(`🪜 Starting stair sequence of ${this.stairSequenceRemaining} platforms going ${direction}! (Level ${levelBonus}, Chance: ${(stairChance * 100).toFixed(1)}%)`);
            }
        }
        
        let y;
        
        // Se in sequenza dritta, usa Y fisso e piattaforme adiacenti
        if (this.straightSequenceActive && this.straightSequenceRemaining > 0) {
            y = this.straightSequenceY;
            // Piattaforme adiacenti: nessuno spazio tra loro
            x = this.lastPlatformX + this.lastPlatformWidth;
            this.straightSequenceRemaining--;
            
            if (this.straightSequenceRemaining === 0) {
                this.straightSequenceActive = false;
                console.log(`✅ Straight sequence completed!`);
            }
        } 
        // Se in scaletta, crea gradini che salgono/scendono
        else if (this.stairSequenceActive && this.stairSequenceRemaining > 0) {
            // Ogni piattaforma è un gradino più alto/basso della precedente
            this.stairSequenceY += this.stairStepHeight * this.stairSequenceDirection;
            y = this.stairSequenceY;
            
            // Piccolo spazio orizzontale tra gradini
            x = this.lastPlatformX + this.lastPlatformWidth + this.stairStepSpacing;
            
            this.stairSequenceRemaining--;
            
            // Assicurati che rimanga nella zona giocabile
            const minY = this.canvasHeight * 0.2;
            const maxY = this.canvasHeight * 0.75;
            y = Math.max(minY, Math.min(maxY, y));
            this.stairSequenceY = y; // Aggiorna per il prossimo gradino
            
            if (this.stairSequenceRemaining === 0) {
                this.stairSequenceActive = false;
                console.log(`✅ Stair sequence completed!`);
            }
        } 
        else {
            // Generazione normale con logica esistente
            // Calcola variazione verticale intelligente
            // Alterna tra salite e discese per creare un pattern piacevole
            const shouldGoUp = (this.platformsGenerated % 3) === 0;
            const shouldGoDown = (this.platformsGenerated % 3) === 2;
            
            // Calcola Y ottimale per evitare sovrapposizioni e garantire saltabilità
            let attempts = 0;
            const maxAttempts = 15; // Più tentativi per trovare posizione valida
            
            do {
                if (this.lastPlatformY === 0) {
                    // Prima piattaforma
                    const baseY = this.canvasHeight * 0.65;
                    y = baseY;
                } else {
                    let yOffset;
                    if (shouldGoUp) {
                        // Salita graduale - negativo
                        yOffset = this.random(-this.maxVerticalGap * 0.6, -this.minVerticalGap * 2);
                    } else if (shouldGoDown) {
                        // Discesa graduale - positivo
                        yOffset = this.random(this.minVerticalGap * 2, this.maxVerticalGap * 0.6);
                    } else {
                        // Movimento casuale ma controllato - preferisce il piano
                        yOffset = this.random(-this.maxVerticalGap * 0.4, this.maxVerticalGap * 0.4);
                    }
                    
                    y = this.lastPlatformY + yOffset;
                    
                    // Clamp a zona giocabile
                    const minY = this.canvasHeight * 0.2;
                    const maxY = this.canvasHeight * 0.75;
                    y = Math.max(minY, Math.min(maxY, y));
                }
                
                // Verifica che non si sovrapponga con piattaforme recenti
                const overlaps = this.checkOverlapWithRecentPlatforms(x, y, width, height);
                
                if (!overlaps) {
                    break; // Posizione valida trovata
                }
                
                attempts++;
                
                // Se troppi tentativi, forza una posizione sicura spostata verticalmente
                if (attempts >= maxAttempts) {
                    // Sposta drasticamente in verticale per evitare sovrapposizione
                    const offset = attempts * 15; // Ogni tentativo sposta più in alto/basso
                    y = this.lastPlatformY + (shouldGoUp ? -offset : offset);
                    const minY = this.canvasHeight * 0.2;
                    const maxY = this.canvasHeight * 0.75;
                    y = Math.max(minY, Math.min(maxY, y));
                    break;
                }
            } while (attempts < maxAttempts);
            
            // VALIDAZIONE SALTABILITÀ STRETTA - Garantisce SEMPRE che il salto sia possibile
            const horizontalDist = x - this.lastPlatformX;
            const verticalDist = Math.abs(y - this.lastPlatformY);
            
            // Limiti di sicurezza molto conservativi
            const safeHorizontalDist = this.maxJumpDistance * this.safeJumpRatio; // ~128px
            const safeVerticalHeight = this.maxJumpHeight * this.safeJumpRatio; // ~135px
            
            const isJumpingUp = y < this.lastPlatformY;
            const isJumpingDown = y > this.lastPlatformY;
            
            // REGOLA CRITICA: Relazione inversa tra distanza orizzontale e verticale
            // Più è lontano orizzontalmente, meno può essere alto
            const horizontalRatio = horizontalDist / safeHorizontalDist; // 0.0 a 1.0
            
            if (isJumpingUp) {
                // Salto verso l'alto - il più difficile
                // Riduci altezza massima in base alla distanza orizzontale
                const maxAllowedUp = safeVerticalHeight * (1.0 - horizontalRatio * 0.7);
                
                if (verticalDist > maxAllowedUp) {
                    y = this.lastPlatformY - maxAllowedUp;
                }
            } else if (isJumpingDown) {
                // Salto verso il basso - più facile, permetti più libertà
                const maxAllowedDown = safeVerticalHeight * (1.0 - horizontalRatio * 0.3);
                
                if (verticalDist > maxAllowedDown) {
                    y = this.lastPlatformY + maxAllowedDown;
                }
            }
            
            // Forza distanza orizzontale nei limiti se troppo lontana
            if (horizontalDist > safeHorizontalDist) {
                // Se supera il limite, metti la piattaforma più vicina verticalmente
                y = this.lastPlatformY + this.random(-20, 20);
            }
            
            // Clamp finale alla zona giocabile
            const minY = this.canvasHeight * 0.2;
            const maxY = this.canvasHeight * 0.75;
            y = Math.max(minY, Math.min(maxY, y));
        }
        
        // Determine platform type based on difficulty and randomness
        const platformType = this.determinePlatformType();
        
        const colorIndex = Math.floor(this.random(0, this.colors.length));
        const baseColor = this.colors[colorIndex];
        
        // Adjust color and properties based on type
        const platform = this.createTypedPlatform(x, y, width, platformType, baseColor);

        // Aggiorna tracciamento ultime piattaforme
        this.recentPlatforms.push({
            x: x,
            y: y,
            width: width,
            height: height
        });
        
        // Mantieni solo le ultime N piattaforme
        if (this.recentPlatforms.length > this.maxRecentPlatforms) {
            this.recentPlatforms.shift();
        }

        this.lastPlatformX = x;
        this.lastPlatformY = y;
        this.lastPlatformWidth = width;
        this.lastPlatformHeight = height;
        this.platformsGenerated++;
        
        return platform;
    }
    
    /**
     * Verifica se una nuova piattaforma si sovrappone con quelle recenti
     */
    checkOverlapWithRecentPlatforms(x, y, width, height) {
        for (const recent of this.recentPlatforms) {
            // Controllo sovrapposizione con margini di sicurezza più ampi
            const horizontalMargin = 25; // Margine orizzontale più ampio
            const verticalMargin = 25; // Margine verticale più ampio
            
            const xOverlap = (x < recent.x + recent.width + horizontalMargin) && 
                           (x + width + horizontalMargin > recent.x);
            const yOverlap = (y < recent.y + recent.height + verticalMargin) && 
                           (y + height + verticalMargin > recent.y);
            
            if (xOverlap && yOverlap) {
                return true; // C'è sovrapposizione
            }
        }
        
        return false; // Nessuna sovrapposizione
    }
    
    determinePlatformType() {
        // First platforms are always normal
        if (this.platformsGenerated < 5) {
            return PlatformTypes.NORMAL;
        }
        
        const rand = this.random(0, 1);
        const difficultyFactor = Math.min(this.difficulty, 1.0);
        const level = this.currentLevel || 1;
        
        // Icy platforms only from level 5
        const icyChance = level >= 5 ? 0.15 : 0; // 15% chance from level 5
        
        // Higher difficulty = more varied platforms
        if (rand < 0.45 - difficultyFactor * 0.1) {
            return PlatformTypes.NORMAL;
        } else if (rand < 0.55) {
            return PlatformTypes.FAST;
        } else if (rand < 0.68) {
            return PlatformTypes.SLOW;
        } else if (rand < 0.78) {
            return PlatformTypes.BOUNCY;
        } else if (rand < 0.86) {
            return PlatformTypes.SPRING;
        } else if (rand < 0.86 + icyChance) {
            return PlatformTypes.ICY; // Piattaforme ghiacciate!
        } else {
            return PlatformTypes.CRUMBLING;
        }
    }
    
    createTypedPlatform(x, y, width, platformType, baseColor) {
        let velocity, color, height;
        
        switch (platformType) {
            case PlatformTypes.FAST:
                velocity = -this.baseSpeed * this.difficulty * 1.6; // 60% faster
                color = [baseColor[0] * 1.2, baseColor[1] * 0.8, baseColor[2] * 0.8, 1.0]; // Reddish tint
                height = this.platformHeight;
                break;
                
            case PlatformTypes.SLOW:
                velocity = -this.baseSpeed * this.difficulty * 0.6; // 40% slower
                color = [baseColor[0] * 0.8, baseColor[1] * 1.1, baseColor[2] * 1.1, 1.0]; // Blueish tint
                height = this.platformHeight;
                break;
                
            case PlatformTypes.BOUNCY:
                velocity = -this.baseSpeed * this.difficulty;
                color = [baseColor[0], baseColor[1] * 1.2, baseColor[2] * 0.9, 1.0]; // Greenish tint
                height = this.platformHeight;
                break;
                
            case PlatformTypes.CRUMBLING:
                velocity = -this.baseSpeed * this.difficulty * 0.8;
                color = [baseColor[0] * 0.7, baseColor[1] * 0.7, baseColor[2] * 0.7, 1.0]; // Grayish
                height = this.platformHeight;
                break;
                
            case PlatformTypes.SPRING:
                velocity = -this.baseSpeed * this.difficulty;
                color = [1.0, 0.4, 0.9, 1.0]; // Vivid magenta/purple
                height = this.platformHeight * 1.3; // Leggermente più alta
                break;
                
            case PlatformTypes.ICY:
                velocity = -this.baseSpeed * this.difficulty;
                color = [0.7, 0.9, 1.0, 0.9]; // Light blue/cyan icy color
                height = this.platformHeight;
                break;
                
            default: // NORMAL
                velocity = -this.baseSpeed * this.difficulty;
                color = baseColor;
                height = this.platformHeight;
        }
        
        return {
            x,
            y,
            width,
            height,
            color,
            type: 'platform',
            platformType,
            velocity,
            originalVelocity: velocity,
            bounceMultiplier: platformType === PlatformTypes.BOUNCY ? 1.3 : (platformType === PlatformTypes.SPRING ? 2.5 : 1.0),
            crumbleTimer: 0,
            crumbleDuration: 1.0, // 1 second before crumbling
            isCrumbling: false,
            springCompression: 0, // Per animazione compressione molla
            springAnimationTime: 0,
            icyShimmer: 0 // Per effetto shimmer ghiaccio
        };
    }

    generateObstacle(platformX, platformY, platformWidth, platformVelocity) {
        const obstacleTypes = ['spike', 'enemy'];
        const type = obstacleTypes[Math.floor(this.random(0, obstacleTypes.length))];
        
        const x = platformX + this.random(platformWidth * 0.3, platformWidth * 0.7);
        const y = platformY - 20; // Even lower
        
        const obstacle = {
            x,
            y,
            width: 12,
            height: 20,
            type,
            color: type === 'spike' ? [0.8, 0.1, 0.1, 1.0] : [0.4, 0.1, 0.6, 1.0],
            velocity: platformVelocity, // Match platform speed
            animationOffset: Math.random() * Math.PI * 2
        };

        return obstacle;
    }

    generateCollectible(platformX, platformY, platformWidth, platformVelocity) {
        const x = platformX + this.random(platformWidth * 0.3, platformWidth * 0.7);
        const y = platformY - 60;
        
        return {
            x,
            y,
            radius: 15,
            type: 'collectible',
            color: [1.0, 0.84, 0.0, 1.0], // Gold
            velocity: platformVelocity, // Match platform speed
            value: 10,
            pulsePhase: Math.random() * Math.PI * 2
        };
    }
    
    getPlatformsGenerated() {
        return this.platformsGenerated;
    }
    
    resetPlatformCount() {
        this.platformsGenerated = 0;
        this.recentPlatforms = []; // Reset anche le piattaforme recenti
        this.lastPlatformX = 0;
        this.lastPlatformY = 0;
        this.lastPlatformWidth = 0;
        // Reset sequenze dritte
        this.straightSequenceActive = false;
        this.straightSequenceRemaining = 0;
        // Reset scalette
        this.stairSequenceActive = false;
        this.stairSequenceRemaining = 0;
    }

    shouldGenerateObstacle() {
        // Gradual obstacles (20% at start, up to 40% at high difficulty)
        const threshold = 1.0 - (0.2 + this.difficulty * 0.2);
        return this.random(0, 1) > threshold;
    }

    shouldGenerateCollectible() {
        // Many collectibles at start (70% at start, 50% at high difficulty)
        const threshold = 0.7 - this.difficulty * 0.2;
        return this.random(0, 1) < threshold;
    }
    
    shouldGenerateHeart() {
        // 12% chance di generare cuoricini
        return this.random(0, 1) < 0.12;
    }
    
    shouldGenerateBoost() {
        // 30% chance di generare boost (aumentato per più combo)
        return this.random(0, 1) < 0.30;
    }
    
    generateBoost(platformX, platformY, platformWidth, platformVelocity) {
        const x = platformX + this.random(platformWidth * 0.25, platformWidth * 0.75);
        const y = platformY - 65;
        
        return {
            x,
            y,
            radius: 18,
            type: 'boost',
            bonusType: BonusTypes.BOOST,
            color: [0.0, 1.0, 0.9, 1.0], // Cyan brillante
            velocity: platformVelocity,
            pulsePhase: this.random(0, Math.PI * 2),
            rotationAngle: 0,
            trailParticles: []
        };
    }
    
    generateHeart(platformX, platformY, platformWidth, platformVelocity) {
        const x = platformX + this.random(platformWidth * 0.3, platformWidth * 0.7);
        const y = platformY - 70;
        
        return {
            x,
            y,
            radius: 12,
            type: 'heart',
            color: [1.0, 0.1, 0.3, 1.0], // Rosso cuore
            velocity: platformVelocity,
            pulsePhase: Math.random() * Math.PI * 2,
            floatAmplitude: 8
        };
    }

    random(min, max) {
        // Simple pseudo-random using seed for consistency
        this.seed = (this.seed * 9301 + 49297) % 233280;
        const rnd = this.seed / 233280;
        return min + rnd * (max - min);
    }

    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
}
