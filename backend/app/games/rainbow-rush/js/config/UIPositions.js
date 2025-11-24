/**
 * UIPositions - Configurazione centralizzata per le posizioni degli elementi UI
 * Tutte le posizioni sono relative e si adattano al resize/fullscreen
 */

export const UI_LAYOUT = {
    // Bottoni flight e turbo (stessa altezza in basso) - valori relativi
    BUTTONS: {
        RADIUS_RATIO: 0.089, // 40px su 450px width = ~0.089
        MARGIN_FROM_EDGE_RATIO: 0.133, // 60px su 450px = ~0.133
        MARGIN_FROM_BOTTOM_RATIO: 0.1625, // 130px su 800px = ~0.1625
    },
    
    // Safety platform (sotto i bottoni) - valori relativi
    SAFETY_PLATFORM: {
        WIDTH_RATIO: 0.889, // 400px su 450px = ~0.889
        HEIGHT: 20,
        MARGIN_FROM_BOTTOM_RATIO: 0.0625, // 50px su 800px = ~0.0625
        SIDE_MARGIN_RATIO: 0.044, // 20px su 450px mobile, 40px su 450px desktop
    },
    
    // HUD (in alto)
    HUD: {
        MARGIN_TOP: 15,
        MARGIN_SIDE: 15,
        PAUSE_BUTTON_SIZE: 45,
    },
    
    // Level progress bar (lato sinistro)
    PROGRESS_BAR: {
        MARGIN_LEFT: 10,
        MARGIN_TOP: 80,
        WIDTH: 20,
        MAX_HEIGHT_RATIO: 0.6, // 60% dell'altezza del canvas
    }
};

/**
 * Calcola le posizioni effettive degli elementi UI in base alle dimensioni del canvas
 * Usa valori proporzionali per garantire uniformità tra mobile e desktop
 */
export function calculateUIPositions(canvasWidth, canvasHeight) {
    const isMobile = canvasWidth < 600;
    
    // Calcola dimensioni proporzionali basate sulla larghezza del canvas
    const buttonRadius = Math.round(canvasWidth * UI_LAYOUT.BUTTONS.RADIUS_RATIO);
    const marginFromEdge = Math.round(canvasWidth * UI_LAYOUT.BUTTONS.MARGIN_FROM_EDGE_RATIO);
    const marginFromBottom = Math.round(canvasHeight * UI_LAYOUT.BUTTONS.MARGIN_FROM_BOTTOM_RATIO);
    
    const platformWidth = Math.round(canvasWidth * UI_LAYOUT.SAFETY_PLATFORM.WIDTH_RATIO);
    const platformMarginFromBottom = Math.round(canvasHeight * UI_LAYOUT.SAFETY_PLATFORM.MARGIN_FROM_BOTTOM_RATIO);
    const platformSideMargin = Math.round(canvasWidth * UI_LAYOUT.SAFETY_PLATFORM.SIDE_MARGIN_RATIO);
    
    return {
        // Bottone turbo (destra)
        turboButton: {
            x: canvasWidth - marginFromEdge,
            y: canvasHeight - marginFromBottom,
            radius: buttonRadius
        },
        
        // Bottone flight (sinistra, stessa Y)
        flightButton: {
            x: marginFromEdge,
            y: canvasHeight - marginFromBottom,
            radius: buttonRadius
        },
        
        // Safety platform (centrata, sotto i bottoni)
        safetyPlatform: {
            y: canvasHeight - platformMarginFromBottom,
            width: Math.min(
                platformWidth,
                canvasWidth - platformSideMargin * 2
            ),
            height: UI_LAYOUT.SAFETY_PLATFORM.HEIGHT,
            getX: function(width) {
                return (canvasWidth - this.width) / 2;
            }
        },
        
        // HUD elements
        hud: {
            marginTop: UI_LAYOUT.HUD.MARGIN_TOP,
            marginSide: UI_LAYOUT.HUD.MARGIN_SIDE,
            pauseButtonSize: UI_LAYOUT.HUD.PAUSE_BUTTON_SIZE
        },
        
        // Progress bar
        progressBar: {
            marginLeft: UI_LAYOUT.PROGRESS_BAR.MARGIN_LEFT,
            marginTop: UI_LAYOUT.PROGRESS_BAR.MARGIN_TOP,
            width: UI_LAYOUT.PROGRESS_BAR.WIDTH,
            maxHeight: canvasHeight * UI_LAYOUT.PROGRESS_BAR.MAX_HEIGHT_RATIO
        }
    };
}
