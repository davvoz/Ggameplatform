export class EnemySpawner {
  constructor(enemies, levelManager) {
    this.enemies = enemies;
    this.levelManager = levelManager;

    this.pathPoints = [];
    this.timeSinceLastSpawn = 0;
    this.spawnInterval = 1.2; // Slightly faster for mixed waves
    this.groupSpawnProgress = {}; // Track spawned per group
    this.lastWaveIndex = -1;
  }

  reset(pathPoints) {
    this.pathPoints = pathPoints;
    this.timeSinceLastSpawn = 0;
    this.groupSpawnProgress = {};
    this.lastWaveIndex = -1;
  }

  update(deltaTime, world) {
    // Stop spawning if game is over
    if (world.gameOver) return;
    
    const wave = this.levelManager.getCurrentWave();
    if (!wave) return;

    // Reset group progress when wave changes
    const currentWaveIndex = this.levelManager.currentWaveIndex;
    if (currentWaveIndex !== this.lastWaveIndex) {
      this.groupSpawnProgress = {};
      this.lastWaveIndex = currentWaveIndex;
    }

    // Wave can be array of groups or single group
    const waveGroups = Array.isArray(wave) ? wave : [wave];
    const totalEnemies = this.levelManager.getTotalWaveEnemies();
    const spawned = this.levelManager.waveProgress.spawned;
    
    if (spawned >= totalEnemies) {
      // All enemies for this wave have been spawned; wait for defeats
      return;
    }

    this.timeSinceLastSpawn += deltaTime;
    if (this.timeSinceLastSpawn >= this.spawnInterval) {
      this.timeSinceLastSpawn = 0;
      
      // Find a group that still has enemies to spawn
      const groupToSpawn = this._selectGroupToSpawn(waveGroups);
      if (groupToSpawn) {
        world.spawnEnemyFromWave(groupToSpawn);
      }
    }
  }

  _selectGroupToSpawn(waveGroups) {
    // Initialize tracking for this wave's groups
    waveGroups.forEach(group => {
      const key = `${group.type}_${group.index}`;
      if (!(key in this.groupSpawnProgress)) {
        this.groupSpawnProgress[key] = 0;
      }
    });

    // Filter groups that still have enemies to spawn
    const availableGroups = waveGroups.filter(group => {
      const key = `${group.type}_${group.index}`;
      return this.groupSpawnProgress[key] < group.count;
    });

    if (availableGroups.length === 0) return null;

    // Weighted random selection (prefer groups with more enemies remaining)
    const weights = availableGroups.map(group => {
      const key = `${group.type}_${group.index}`;
      const remaining = group.count - this.groupSpawnProgress[key];
      return remaining;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < availableGroups.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        const selected = availableGroups[i];
        const key = `${selected.type}_${selected.index}`;
        this.groupSpawnProgress[key]++;
        return selected;
      }
    }

    // Fallback
    const selected = availableGroups[0];
    const key = `${selected.type}_${selected.index}`;
    this.groupSpawnProgress[key]++;
    return selected;
  }
}

