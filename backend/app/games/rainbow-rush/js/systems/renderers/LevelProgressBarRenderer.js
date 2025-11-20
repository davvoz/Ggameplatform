/**
 * LevelProgressBarRenderer - Renderer dedicato per la barra di progresso del livello
 * Single Responsibility: Visualizzazione della progress bar
 */
export class LevelProgressBarRenderer {
    constructor(webglRenderer, textCtx) {
        this.renderer = webglRenderer;
        this.textCtx = textCtx;
    }
    
    render(progressBar) {
        // Sfondo della barra verticale
        const bgColor = [1.0, 1.0, 1.0, 0.2];
        this.renderer.drawRect(
            progressBar.x, 
            progressBar.y, 
            progressBar.width, 
            progressBar.height, 
            bgColor
        );
        
        // Fill della barra - dal basso verso l'alto
        const fillHeight = progressBar.height * progressBar.animProgress;
        const fillY = progressBar.y + progressBar.height - fillHeight;
        const fillColor = [1.0, 0.8, 0.3, 0.4];
        
        if (fillHeight > 0) {
            this.renderer.drawRect(
                progressBar.x,
                fillY,
                progressBar.width,
                fillHeight,
                fillColor
            );
        }
        
        // Player icon come segnaposto sulla barra - si muove verticalmente
        const playerX = progressBar.x + progressBar.width / 2;
        const playerY = progressBar.y + progressBar.height - (progressBar.height * progressBar.animProgress);
        const playerSize = 18; // Più grande per essere simile al player reale
        
        // Renderizza il player in miniatura
        this.renderMiniPlayer(playerX, playerY, playerSize);
        
        // Numeri dei livelli (usando Canvas 2D)
        this.renderLevelNumbers(progressBar);
    }
    
    renderMiniPlayer(x, y, size) {
        const radius = size / 2;
        
        // Ombra più marcata
        const shadowColor = [0.0, 0.0, 0.0, 0.4];
        this.renderer.drawCircle(x + 2, y + 2, radius + 1, shadowColor);
        
        // Bordo esterno bianco
        const borderColor = [1.0, 1.0, 1.0, 1.0];
        this.renderer.drawCircle(x, y, radius + 1.5, borderColor);
        
        // Corpo principale verde (più saturato)
        const bodyColor = [0.3, 0.95, 0.5, 1.0];
        this.renderer.drawCircle(x, y, radius, bodyColor);
        
        // Highlight principale sul corpo (più grande)
        const highlightColor = [1.0, 1.0, 1.0, 0.7];
        this.renderer.drawCircle(x - radius * 0.25, y - radius * 0.25, radius * 0.4, highlightColor);
        
        // Occhi più grandi
        const eyeWhite = [1.0, 1.0, 1.0, 1.0];
        const eyeBlack = [0.0, 0.0, 0.0, 1.0];
        const eyeSize = radius * 0.4;
        const eyeY = y - radius * 0.2;
        const eyeSpacing = radius * 0.45;
        
        // Occhio sinistro con contorno
        this.renderer.drawCircle(x - eyeSpacing, eyeY, eyeSize + 0.5, [0.0, 0.0, 0.0, 0.3]);
        this.renderer.drawCircle(x - eyeSpacing, eyeY, eyeSize, eyeWhite);
        this.renderer.drawCircle(x - eyeSpacing, eyeY, eyeSize * 0.5, eyeBlack);
        // Riflesso negli occhi
        this.renderer.drawCircle(x - eyeSpacing - eyeSize * 0.2, eyeY - eyeSize * 0.2, eyeSize * 0.2, [1.0, 1.0, 1.0, 0.9]);
        
        // Occhio destro con contorno
        this.renderer.drawCircle(x + eyeSpacing, eyeY, eyeSize + 0.5, [0.0, 0.0, 0.0, 0.3]);
        this.renderer.drawCircle(x + eyeSpacing, eyeY, eyeSize, eyeWhite);
        this.renderer.drawCircle(x + eyeSpacing, eyeY, eyeSize * 0.5, eyeBlack);
        // Riflesso negli occhi
        this.renderer.drawCircle(x + eyeSpacing - eyeSize * 0.2, eyeY - eyeSize * 0.2, eyeSize * 0.2, [1.0, 1.0, 1.0, 0.9]);
        
        // Bocca sorridente con più punti
        const mouthY = y + radius * 0.35;
        const mouthColor = [0.0, 0.0, 0.0, 0.8];
        const mouthSize = 1.5;
        this.renderer.drawCircle(x - radius * 0.35, mouthY, mouthSize, mouthColor);
        this.renderer.drawCircle(x - radius * 0.15, mouthY + 1, mouthSize, mouthColor);
        this.renderer.drawCircle(x, mouthY + 1.5, mouthSize, mouthColor);
        this.renderer.drawCircle(x + radius * 0.15, mouthY + 1, mouthSize, mouthColor);
        this.renderer.drawCircle(x + radius * 0.35, mouthY, mouthSize, mouthColor);
    }
    
    renderLevelNumbers(progressBar) {
        if (!this.textCtx) return;
        
        this.textCtx.save();
        
        // Setup font
        this.textCtx.font = 'bold 20px Arial';
        this.textCtx.textAlign = 'center';
        this.textCtx.textBaseline = 'middle';
        
        // Numero livello corrente in basso (dove inizia il progresso)
        const bottomTextX = progressBar.x + progressBar.width / 2;
        const bottomTextY = progressBar.y + progressBar.height + 20;
        
        // Ombra marcata
        this.textCtx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
        this.textCtx.lineWidth = 4;
        this.textCtx.strokeText(progressBar.currentLevel.toString(), bottomTextX, bottomTextY);
        
        // Testo bianco brillante
        this.textCtx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        this.textCtx.fillText(progressBar.currentLevel.toString(), bottomTextX, bottomTextY);
        
        // Numero livello prossimo in alto (obiettivo)
        const topTextX = progressBar.x + progressBar.width / 2;
        const topTextY = progressBar.y - 15;
        
        this.textCtx.strokeText(progressBar.nextLevel.toString(), topTextX, topTextY);
        this.textCtx.fillText(progressBar.nextLevel.toString(), topTextX, topTextY);
        
        this.textCtx.restore();
    }
}
