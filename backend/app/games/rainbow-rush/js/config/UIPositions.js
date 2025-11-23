/**
 * UIPositions - Configurazione centralizzata per le posizioni degli elementi UI
 * Tutte le posizioni sono relative e si adattano al resize/fullscreen
 */

export const UI_LAYOUT = {
    // Bottoni flight e turbo (stessa altezza in basso)
    BUTTONS: {
        RADIUS: 40,
        MARGIN_FROM_EDGE: 60, // Distanza dal bordo laterale
        MARGIN_FROM_BOTTOM: 130, // Distanza dal bordo inferiore
    },
    
    // Safety platform (sotto i bottoni)
    SAFETY_PLATFORM: {
        WIDTH: 400,
        HEIGHT: 20,
        MARGIN_FROM_BOTTOM: 50, // Distanza dal bordo inferiore (sotto i bottoni)
        SIDE_MARGIN_MOBILE: 20,
        SIDE_MARGIN_DESKTOP: 40,
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
 */
export function calculateUIPositions(canvasWidth, canvasHeight) {
    const isMobile = canvasWidth < 600;
    
    return {
        // Bottone turbo (destra)
        turboButton: {
            x: canvasWidth - UI_LAYOUT.BUTTONS.MARGIN_FROM_EDGE,
            y: canvasHeight - UI_LAYOUT.BUTTONS.MARGIN_FROM_BOTTOM,
            radius: UI_LAYOUT.BUTTONS.RADIUS
        },
        
        // Bottone flight (sinistra, stessa Y)
        flightButton: {
            x: UI_LAYOUT.BUTTONS.MARGIN_FROM_EDGE,
            y: canvasHeight - UI_LAYOUT.BUTTONS.MARGIN_FROM_BOTTOM,
            radius: UI_LAYOUT.BUTTONS.RADIUS
        },
        
        // Safety platform (centrata, sotto i bottoni)
        safetyPlatform: {
            y: canvasHeight - UI_LAYOUT.SAFETY_PLATFORM.MARGIN_FROM_BOTTOM,
            width: Math.min(
                UI_LAYOUT.SAFETY_PLATFORM.WIDTH,
                canvasWidth - (isMobile ? UI_LAYOUT.SAFETY_PLATFORM.SIDE_MARGIN_MOBILE : UI_LAYOUT.SAFETY_PLATFORM.SIDE_MARGIN_DESKTOP) * 2
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
