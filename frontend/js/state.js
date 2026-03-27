/**
 * Shared State Module
 * Centralizes cross-module state management without polluting window object
 */

// Game runtime state
let currentGameRuntime = null;

// Community state
let currentCommunityManager = null;
let communityWS = null;

// Private Messages state
let pmWS = null;

// Wallet state
let coinAPI = null;
let walletRenderer = null;
let coinBalanceWidget = null;

// UI Components
let dailyLoginBanner = null;

// Game Runtime
export function getCurrentGameRuntime() {
    return currentGameRuntime;
}

export function setCurrentGameRuntime(runtime) {
    currentGameRuntime = runtime;
}

// Community Manager
export function getCurrentCommunityManager() {
    return currentCommunityManager;
}

export function setCurrentCommunityManager(manager) {
    currentCommunityManager = manager;
}

// Community WebSocket
export function getCommunityWS() {
    return communityWS;
}

export function setCommunityWS(ws) {
    communityWS = ws;
}

// Private Messages WebSocket
export function getPMWS() {
    return pmWS;
}

export function setPMWS(ws) {
    pmWS = ws;
}

// Coin API
export function getCoinAPI() {
    return coinAPI;
}

export function setCoinAPI(api) {
    coinAPI = api;
}

// Wallet Renderer
export function getWalletRenderer() {
    return walletRenderer;
}

export function setWalletRenderer(renderer) {
    walletRenderer = renderer;
}

// Coin Balance Widget
export function getCoinBalanceWidget() {
    return coinBalanceWidget;
}

export function setCoinBalanceWidget(widget) {
    coinBalanceWidget = widget;
}

// Daily Login Banner
export function getDailyLoginBanner() {
    return dailyLoginBanner;
}

export function setDailyLoginBanner(banner) {
    dailyLoginBanner = banner;
}
