import * as THREE from "three";

/**
 * Lane Switching Strategy - Manages intelligent lane changing behavior
 * Follows Strategy Pattern for clean AI behavior separation
 */
export class LaneSwitchingStrategy {
  constructor(config = {}) {
    // Detection parameters
    this.lookAheadDistance = config.lookAheadDistance || 1.5;
    this.blockDetectionRange = config.blockDetectionRange || 0.15; // progress range
    this.speedThreshold = config.speedThreshold || 1.15; // only switch if blocked by 15%+ slower enemy
    
    // Safety parameters
    this.minLaneClearance = config.minLaneClearance || 0.2; // progress tolerance for safe lane
    this.transitionSpeed = config.transitionSpeed || 0.08; // how fast to move between lanes
    
    // Cooldown parameters
    this.switchCooldown = config.switchCooldown || 1.0;
    this.failedSwitchPenalty = config.failedSwitchPenalty || 0.5; // extra cooldown if switch fails
  }

  /**
   * Evaluate if enemy should switch lanes
   * @returns {number|null} New lane index or null if should stay
   */
  evaluateLaneSwitch(enemy, allEnemies) {
    // Can't switch if on cooldown
    if (enemy.laneChangeTimer > 0) return null;
    if (!enemy.pathLanes || enemy.pathLanes.length < 2) return null;
    if (allEnemies.length <= 1) return null;

    // Check if blocked
    const blockingEnemy = this._detectBlockingEnemy(enemy, allEnemies);
    if (!blockingEnemy) return null;

    // Find best alternative lane
    const availableLanes = this._getAvailableLanes(enemy);
    const bestLane = this._findBestLane(enemy, allEnemies, availableLanes);
    
    if (bestLane === null || bestLane === enemy.currentLane) return null;

    // Verify lane is safe before switching
    if (!this._isLaneSafe(enemy, bestLane, allEnemies)) return null;

    return bestLane;
  }

  /**
   * Detect if there's a slower enemy blocking this lane
   */
  _detectBlockingEnemy(enemy, allEnemies) {
    const myPosition = enemy.mesh.position;

    for (const other of allEnemies) {
      if (other === enemy || other.isDisposed) continue;
      if (other.currentLane !== enemy.currentLane) continue;

      // Check if enemy is ahead
      const progressDiff = other.progress - enemy.progress;
      if (progressDiff > 0 && progressDiff < this.blockDetectionRange) {
        const distance = myPosition.distanceTo(other.mesh.position);
        
        // Check if blocking (slower or similar speed within threshold)
        if (distance < this.lookAheadDistance && other.speed <= enemy.speed * this.speedThreshold) {
          return other;
        }
      }
    }

    return null;
  }

  /**
   * Get list of lanes enemy can switch to
   */
  _getAvailableLanes(enemy) {
    const totalLanes = enemy.pathLanes.length;
    const lanes = [];
    for (let i = 0; i < totalLanes; i++) {
      if (i !== enemy.currentLane) {
        lanes.push(i);
      }
    }
    return lanes;
  }

  /**
   * Find the best lane based on traffic density
   */
  _findBestLane(enemy, allEnemies, availableLanes) {
    if (availableLanes.length === 0) return null;

    // Score each lane based on traffic ahead
    const laneScores = {};
    availableLanes.forEach(lane => {
      laneScores[lane] = this._scoreLane(lane, enemy, allEnemies);
    });

    // Find lane with lowest traffic
    let bestLane = null;
    let lowestScore = Infinity;
    
    for (const lane of availableLanes) {
      if (laneScores[lane] < lowestScore) {
        lowestScore = laneScores[lane];
        bestLane = lane;
      }
    }

    return bestLane;
  }

  /**
   * Score a lane based on enemy density (lower is better)
   */
  _scoreLane(laneIndex, enemy, allEnemies) {
    let score = 0;
    const checkRange = 0.25; // progress range to check

    for (const other of allEnemies) {
      if (other === enemy || other.isDisposed) continue;
      if (other.currentLane !== laneIndex) continue;

      // Enemies ahead count more
      const progressDiff = other.progress - enemy.progress;
      if (Math.abs(progressDiff) < checkRange) {
        const weight = progressDiff > 0 ? 2.0 : 1.0; // ahead enemies count double
        score += weight;
      }
    }

    return score;
  }

  /**
   * Check if a lane is safe to switch to (no enemies too close)
   */
  _isLaneSafe(enemy, laneIndex, allEnemies) {
    for (const other of allEnemies) {
      if (other === enemy || other.isDisposed) continue;
      if (other.currentLane !== laneIndex) continue;

      // Check if enemy is too close in progress
      const progressDiff = Math.abs(other.progress - enemy.progress);
      if (progressDiff < this.minLaneClearance) {
        return false; // Too close, not safe
      }
    }

    return true;
  }

  /**
   * Execute lane switch with smooth interpolation
   */
  executeLaneSwitch(enemy, targetLane, deltaTime) {
    if (!enemy.pathLanes || !enemy.pathLanes[targetLane]) return false;

    // Initialize transition if just starting
    if (!enemy.laneTransition) {
      enemy.laneTransition = {
        fromLane: enemy.currentLane,
        toLane: targetLane,
        progress: 0,
        startPosition: enemy.mesh.position.clone()
      };
    }

    const transition = enemy.laneTransition;
    transition.progress += this.transitionSpeed;

    if (transition.progress >= 1.0) {
      // Transition complete
      enemy.currentLane = targetLane;
      enemy.pathPoints = enemy.pathLanes[targetLane];
      enemy.laneTransition = null;
      enemy.laneChangeTimer = this.switchCooldown;
      return true;
    }

    // Smooth interpolation between lanes
    this._interpolateLanePosition(enemy, transition);
    return false;
  }

  /**
   * Smoothly interpolate position between lanes during transition
   */
  _interpolateLanePosition(enemy, transition) {
    const fromPath = enemy.pathLanes[transition.fromLane];
    const toPath = enemy.pathLanes[transition.toLane];

    // Get current position on both paths
    const fromPos = this._getPositionOnPath(fromPath, enemy.progress);
    const toPos = this._getPositionOnPath(toPath, enemy.progress);

    // Smooth easing
    const t = this._easeInOutCubic(transition.progress);
    
    // Interpolate between the two positions
    const interpolatedPos = new THREE.Vector3().lerpVectors(fromPos, toPos, t);
    
    // Maintain hover animation
    const time = performance.now() * 0.001;
    interpolatedPos.y = enemy.hoverBase + Math.sin(time * enemy.hoverFrequency) * enemy.hoverAmplitude;
    
    enemy.mesh.position.copy(interpolatedPos);
  }

  /**
   * Get position on path at given progress
   */
  _getPositionOnPath(pathPoints, progress) {
    const totalSegments = pathPoints.length - 1;
    const clampedProg = Math.max(0, Math.min(1, progress));
    const fIndex = clampedProg * totalSegments;
    const index = Math.floor(fIndex);
    const localT = fIndex - index;

    const p0 = pathPoints[index];
    const p1 = pathPoints[Math.min(index + 1, pathPoints.length - 1)];

    return new THREE.Vector3().lerpVectors(p0, p1, localT);
  }

  /**
   * Smooth easing function
   */
  _easeInOutCubic(t) {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
