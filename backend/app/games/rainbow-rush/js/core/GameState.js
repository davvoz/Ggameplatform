/**
 * GameState - Manages game states (Menu, Playing, GameOver, Paused)
 * Implements State Pattern
 */
export const GameStates = {
    MENU: 'menu',
    LEVEL_SELECT: 'levelSelect',
    PLAYING: 'playing',
    PAUSED: 'paused',
    LEVEL_SUMMARY: 'levelSummary',
    GAME_OVER: 'gameOver'
};

export class GameState {
    constructor() {
        this.currentState = GameStates.MENU;
        this.previousState = null;
        this.listeners = new Map();
    }

    setState(newState) {
        if (this.currentState === newState) return;
        
        this.previousState = this.currentState;
        this.currentState = newState;
        
        this.notifyListeners(newState);
    }

    getState() {
        return this.currentState;
    }

    isPlaying() {
        return this.currentState === GameStates.PLAYING;
    }

    isPaused() {
        return this.currentState === GameStates.PAUSED;
    }

    isGameOver() {
        return this.currentState === GameStates.GAME_OVER;
    }

    isMenu() {
        return this.currentState === GameStates.MENU;
    }

    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    notifyListeners(state) {
        const callbacks = this.listeners.get(state);
        if (callbacks) {
            callbacks.forEach(callback => callback(state));
        }
    }
}
