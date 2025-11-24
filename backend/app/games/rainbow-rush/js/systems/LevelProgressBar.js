/**
 * LevelProgressBar - Barra di progresso del livello
 * Mostra quanto manca per completare il livello corrente
 */
export class LevelProgressBar {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Posizione e dimensioni - verticale a sinistra (inizializzate, poi aggiornate da updateDimensions)
        this.width = 8;
        this.height = 200;
        this.x = 10;
        this.y = 90;
        
        // Aggiorna subito con le dimensioni corrette
        this.updateDimensions(canvasWidth, canvasHeight);
        
        // Animazione
        this.animProgress = 0;
        this.targetProgress = 0;
        this.pulsePhase = 0;
        
        // Livelli per i numeri
        this.currentLevel = 1;
        this.nextLevel = 2;
    }
    
    update(deltaTime, platformCounter, platformsPerLevel, currentLevel) {
        // Aggiorna livelli
        if (currentLevel !== undefined && currentLevel !== this.currentLevel) {
            // Nuovo livello - reset animProgress
            this.currentLevel = currentLevel;
            this.nextLevel = currentLevel + 1;
            this.animProgress = 0;
            this.targetProgress = 0;
        }
        
        // Calcola progresso target (0.0 a 1.0)
        this.targetProgress = Math.min(platformCounter / platformsPerLevel, 1.0);
        
        // Smooth animation verso il target
        const speed = 3.0;
        if (this.animProgress < this.targetProgress) {
            this.animProgress += deltaTime * speed;
            if (this.animProgress > this.targetProgress) {
                this.animProgress = this.targetProgress;
            }
        }
        
        // Pulse animation
        this.pulsePhase += deltaTime * 4;
    }
    
    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        // Dimensioni responsive basate sulla viewport
        this.width = 8;
        
        // Altezza proporzionale: 40% dell'altezza disponibile, max 300px
        const availableHeight = height - 200;
        this.height = Math.min(300, Math.max(150, availableHeight * 0.4));
        
        // Sposta più a sinistra per evitare sovrapposizioni
        this.x = 10;
        
        // Posizione Y più in basso per non sovrapporsi all'HUD e powerup
        const topMargin = 150;
        this.y = topMargin;
    }
    
    reset() {
        this.animProgress = 0;
        this.targetProgress = 0;
    }
}
