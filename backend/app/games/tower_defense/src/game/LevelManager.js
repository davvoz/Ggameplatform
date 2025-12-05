export class LevelManager {
  constructor(levelsConfig, gameplayConfig) {
    this.levelsConfig = levelsConfig;
    this.gameplayConfig = gameplayConfig;

    this.currentLevel = null;
    this.currentWaveIndex = 0;
    this.credits = gameplayConfig.startingCredits;
    this.health = gameplayConfig.startingHealth;
    this.pendingTowerType = null;

    this.waveProgress = {
      spawned: 0,
      defeated: 0
    };

    this.listeners = {
      towerPlacementRequested: []
    };
  }

  startLevel(levelId) {
    this.currentLevel = this.levelsConfig.find((lvl) => lvl.id === levelId);
    this.currentWaveIndex = 0;
    this.credits = this.gameplayConfig.startingCredits;
    this.health = this.gameplayConfig.startingHealth;
    this.pendingTowerType = null;
    this.waveProgress = { spawned: 0, defeated: 0 };
  }

  getCurrentWave() {
    if (!this.currentLevel) return null;
    const waves = this.currentLevel.waves;
    if (!waves || waves.length === 0) return null;

    // Group waves by index to support mixed enemy types
    const currentIndex = this.currentWaveIndex + 1; // waves use 1-based indexing
    const waveGroups = waves.filter(w => w.index === currentIndex);
    
    if (waveGroups.length > 0) {
      // Return array of enemy groups for this wave
      return waveGroups;
    }

    // Generate infinite waves based on the last wave index
    const maxIndex = Math.max(...waves.map(w => w.index));
    if (currentIndex <= maxIndex) {
      return null; // Wave doesn't exist
    }

    // For infinite mode, use last wave as template
    const lastWaveGroups = waves.filter(w => w.index === maxIndex);
    const extraIndex = currentIndex - maxIndex;

    const hpScale = 1 + extraIndex * 0.35;
    const countScale = 1 + extraIndex * 0.15;
    const rewardScale = 1 + extraIndex * 0.25;
    const speedBonus = extraIndex * 0.05;

    return lastWaveGroups.map(group => ({
      ...group,
      index: currentIndex,
      count: Math.round(group.count * countScale),
      baseHp: Math.round(group.baseHp * hpScale),
      reward: Math.round(group.reward * rewardScale),
      speed: (group.speed || 1) + speedBonus
    }));
  }

  onTowerPlacementRequested(callback) {
    this.listeners.towerPlacementRequested.push(callback);
  }

  requestTowerPlacement(towerTypeId) {
    console.log("[LEVEL MGR] requestTowerPlacement:", towerTypeId);
    this.pendingTowerType = towerTypeId;
    console.log("[LEVEL MGR] pendingTowerType SET to:", this.pendingTowerType);
    this.listeners.towerPlacementRequested.forEach((cb) =>
      cb(towerTypeId)
    );
  }

  clearTowerPlacementRequest() {
    this.pendingTowerType = null;
  }

  isTowerAffordable(towerTypeId) {
    const type = this.gameplayConfig.towerTypes.find(
      (t) => t.id === towerTypeId
    );
    if (!type) return false;
    return this.credits >= type.baseCost;
  }

  canAfford(amount) {
    return this.credits >= amount;
  }

  spendCredits(amount) {
    this.credits = Math.max(0, this.credits - amount);
  }

  gainCredits(amount) {
    this.credits += amount;
  }

  damagePlayer(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  registerEnemySpawn() {
    this.waveProgress.spawned += 1;
  }

  registerEnemyDefeat(reward) {
    this.waveProgress.defeated += 1;
    this.gainCredits(reward);
    
    // Notify score callback (will be forwarded from World)
    if (this.scoreCallback) {
      this.scoreCallback(reward);
    }
  }
  
  setScoreCallback(callback) {
    this.scoreCallback = callback;
  }

  getTotalWaveEnemies() {
    const wave = this.getCurrentWave();
    if (!wave) return 0;
    
    // Wave can be array of groups or single group
    if (Array.isArray(wave)) {
      return wave.reduce((sum, group) => sum + group.count, 0);
    }
    return wave.count;
  }

  advanceWaveIfNeeded() {
    const totalEnemies = this.getTotalWaveEnemies();
    if (!totalEnemies) return false;
    
    if (this.waveProgress.defeated >= totalEnemies) {
      this.currentWaveIndex += 1;
      this.waveProgress = { spawned: 0, defeated: 0 };
      return true;
    }
    return false;
  }
}