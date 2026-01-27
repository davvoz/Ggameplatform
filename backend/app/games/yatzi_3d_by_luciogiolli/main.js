import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DiceManager } from "./dice.js";
import { CATEGORIES, initialScoreState, scoreCategory, computeTotals } from "./gameLogic.js";
import { aiDecideKeep, aiChooseCategory } from "./ai.js";

// DOM Elements
const container = document.getElementById("three-container");
const statusBox = document.getElementById("status-box");
const statusLine = document.getElementById("status-line");
const rollLabel = document.getElementById("roll-label");
const roundLabel = document.getElementById("round-label");
const rollBtn = document.getElementById("roll-btn");
const endTurnBtn = document.getElementById("end-turn-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const zoomBtn = document.getElementById("zoom-btn");
const playerUpperList = document.getElementById("player-score-list-upper");
const playerLowerList = document.getElementById("player-score-list-lower");
const aiUpperList = document.getElementById("ai-score-list-upper");
const aiLowerList = document.getElementById("ai-score-list-lower");
const playerUpperSumEl = document.getElementById("player-upper-sum");
const playerBonusEl = document.getElementById("player-bonus");
const playerLowerSumEl = document.getElementById("player-lower-sum");
const playerTotalEl = document.getElementById("player-total");
const aiUpperSumEl = document.getElementById("ai-upper-sum");
const aiBonusEl = document.getElementById("ai-bonus");
const aiLowerSumEl = document.getElementById("ai-lower-sum");
const aiTotalEl = document.getElementById("ai-total");
const scoreWrapperEl = document.getElementById("score-wrapper");
const toastEl = document.getElementById("toast");
const loadingScreen = document.getElementById("loadingScreen");
const gameOverOverlay = document.getElementById("game-over-overlay");
const gameOverTitle = document.getElementById("game-over-title");
const gameOverScore = document.getElementById("game-over-score");
const restartBtn = document.getElementById("restart-btn");
const difficultyPanel = document.getElementById("difficulty-panel");
const difficultyCards = Array.from(document.querySelectorAll(".difficulty-card"));

let renderer, scene, camera, controls;
let diceMgr;
let raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let gameState;
let lastTime = performance.now();
let sessionStarted = false;
let isZoomedOut = false;
let aiDifficulty = null;
let gameStarted = false;

const DIFFICULTY_LABEL = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard"
};

// Camera positions
const CAMERA_NORMAL = { y: 7, z: 9, fov: 45 };
const CAMERA_ZOOMED = { y: 11, z: 14, fov: 52 };
const CAMERA_TARGET_Y = -2;

// SDK Integration
async function initSDK() {
  if (typeof PlatformSDK !== 'undefined') {
    try {
      await PlatformSDK.init({
        onStart: () => {
          console.log('[Yatzi 3D] Platform requested start');
        },
        onPause: () => {
          console.log('[Yatzi 3D] Platform requested pause');
        }
      });
      console.log('📡 Platform SDK initialized for Yatzi 3D');
    } catch (error) {
      console.warn('⚠️ PlatformSDK init failed:', error);
    }
  } else {
    console.warn('⚠️ PlatformSDK not available');
  }
}

function startGameSession() {
  if (sessionStarted) return;
  sessionStarted = true;
  
  if (typeof PlatformSDK !== 'undefined') {
    try {
      window.parent.postMessage({
        type: 'gameStarted',
        payload: {},
        timestamp: Date.now(),
        protocolVersion: '1.0.0'
      }, '*');
      console.log('🎮 Game session started for Yatzi 3D');
    } catch (error) {
      console.error('⚠️ Failed to start game session:', error);
    }
  }
}

function sendScoreToPlatform(playerScore, aiScore) {
  if (typeof PlatformSDK !== 'undefined') {
    try {
      // Send gameOver with achievements for quest tracking
      PlatformSDK.gameOver(playerScore, {
        extra_data: {
          ai_score: aiScore,
          winner: playerScore > aiScore ? 'player' : (playerScore < aiScore ? 'ai' : 'tie'),
          rounds_played: gameState.maxRounds,
          // Quest-specific achievements
          roll_yatzi: gameState.achievements?.roll_yatzi || false,
          full_house: gameState.achievements?.full_house || false,
          large_straight: gameState.achievements?.large_straight || false,
          upper_bonus: gameState.achievements?.upper_bonus || false
        }
      });
      console.log(`📊 Score sent: Player=${playerScore}, AI=${aiScore}`, gameState.achievements);
    } catch (error) {
      console.error('⚠️ Failed to send score:', error);
    }
  }
}

function getDifficultyLabel(value) {
  return DIFFICULTY_LABEL[value] || DIFFICULTY_LABEL.medium;
}

function closeDifficultyPanel() {
  if (difficultyPanel) {
    difficultyPanel.classList.add("hidden");
  }
}

function setDifficulty(newDifficulty, options = {}) {
  const { announce = true, startGame = false } = options;
  const normalized = DIFFICULTY_LABEL[newDifficulty] ? newDifficulty : "medium";
  aiDifficulty = normalized;

  if (announce) {
    showToast(`AI: ${getDifficultyLabel(normalized)}`);
    statusLine.textContent = `CPU ${getDifficultyLabel(normalized)} ready to play`;
  }

  if (startGame && !gameStarted) {
    gameStarted = true;
    closeDifficultyPanel();
    // Initialize game state on first start
    resetGameState();
  } else if (gameStarted) {
    // Change difficulty mid-game: reset
    hideGameOver();
    resetGameState();
  }
}

function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b1b1b);

  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 7, 9);
  camera.lookAt(0, -2, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 22;
  controls.minPolarAngle = 0.4;
  controls.maxPolarAngle = 1.3;
  controls.target.set(0, -2, 0);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(4, 10, 4);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 2;
  dir.shadow.camera.far = 30;
  scene.add(dir);

  const planeGeo = new THREE.PlaneGeometry(8, 5);
  const planeMat = new THREE.MeshStandardMaterial({
    color: 0x175c2a,
    roughness: 0.9,
    metalness: 0.0
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);

  diceMgr = new DiceManager(scene);

  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
}

function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function onPointerDown(event) {
  if (!gameState || !isPlayerTurn() || gameState.rollsUsed === 0 || diceMgr.isRolling) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  pointer.set(x * 2 - 1, -(y * 2 - 1));
  raycaster.setFromCamera(pointer, camera);
  const idx = diceMgr.toggleHoldByRay(raycaster, pointer, camera);
  if (idx >= 0) {
    showToast(diceMgr.held[idx] ? "Bloccato" : "Sbloccato");
  }
}

function createScoreRows() {
  playerUpperList.innerHTML = "";
  playerLowerList.innerHTML = "";
  aiUpperList.innerHTML = "";
  aiLowerList.innerHTML = "";

  const upperCats = CATEGORIES.slice(0, 6);

  for (const cat of CATEGORIES) {
    const isUpper = upperCats.includes(cat);

    const rowP = document.createElement("div");
    rowP.className = "score-row player-row";
    rowP.dataset.category = cat;
    rowP.innerHTML = `<span class="cat-name">${cat}</span><span class="cat-score">-</span>`;
    (isUpper ? playerUpperList : playerLowerList).appendChild(rowP);

    const rowA = document.createElement("div");
    rowA.className = "score-row";
    rowA.dataset.category = cat;
    rowA.innerHTML = `<span class="cat-name">${cat}</span><span class="cat-score">-</span>`;
    (isUpper ? aiUpperList : aiLowerList).appendChild(rowA);
  }
}

function resetGameState() {
  hideGameOver();
  gameState = {
    round: 1,
    maxRounds: CATEGORIES.length,
    currentPlayer: "player",
    rollsUsed: 0,
    playerScores: initialScoreState(),
    aiScores: initialScoreState(),
    selectedCategory: null,
    gameOver: false,
    // Quest tracking: achievements during this game
    achievements: {
      roll_yatzi: false,
      full_house: false,
      large_straight: false,
      upper_bonus: false
    }
  };
  diceMgr.resetHeld();
  diceMgr.resetValues();
  sessionStarted = false;
  updateUI();
}

function isPlayerTurn() {
  return gameState && gameState.currentPlayer === "player";
}

function updateScoreLists() {
  for (const cat of CATEGORIES) {
    const playerRow = document.querySelector(
      `.score-row.player-row[data-category="${cat}"]`
    );
    const aiRow = document.querySelector(
      `.score-column:nth-child(2) .score-row[data-category="${cat}"], .score-row[data-category="${cat}"]:not(.player-row)`
    );
    const pUsed = gameState.playerScores.used[cat];
    const aUsed = gameState.aiScores.used[cat];
    const pScore = gameState.playerScores.scores[cat];
    const aScore = gameState.aiScores.scores[cat];

    if (!playerRow || !aiRow) continue;

    playerRow.classList.remove(
      "player-available",
      "selected",
      "taken",
      "positive-hint"
    );
    aiRow.classList.remove("taken");

    const pScoreEl = playerRow.querySelector(".cat-score");
    const aScoreEl = aiRow.querySelector(".cat-score");

    // Calcola suggerimento solo per il giocatore, categoria libera, con dadi lanciati
    let hintScore = null;
    if (!pUsed && isPlayerTurn() && gameState.rollsUsed > 0) {
      hintScore = scoreCategory(cat, diceMgr.values.slice());
    }

    if (pScore != null) {
      pScoreEl.textContent = pScore;
    } else if (hintScore != null) {
      pScoreEl.textContent = hintScore;
    } else {
      pScoreEl.textContent = "-";
    }

    aScoreEl.textContent = aScore == null ? "-" : aScore;

    if (pUsed) {
      playerRow.classList.add("taken");
    } else {
      playerRow.classList.add("player-available");
      if (hintScore != null && hintScore > 0) {
        playerRow.classList.add("positive-hint");
      }
    }

    if (aUsed) {
      aiRow.classList.add("taken");
    }
  }

  playerUpperSumEl.textContent = gameState.playerScores.upperSubtotal;
  playerBonusEl.textContent = gameState.playerScores.bonus;
  playerLowerSumEl.textContent = gameState.playerScores.lowerSubtotal;
  playerTotalEl.textContent = gameState.playerScores.total;

  aiUpperSumEl.textContent = gameState.aiScores.upperSubtotal;
  aiBonusEl.textContent = gameState.aiScores.bonus;
  aiLowerSumEl.textContent = gameState.aiScores.lowerSubtotal;
  aiTotalEl.textContent = gameState.aiScores.total;
}

function updateUI() {
  if (!gameState) {
    rollBtn.disabled = true;
    endTurnBtn.disabled = true;
    return;
  }
  
  roundLabel.textContent = `${gameState.round}/${gameState.maxRounds}`;
  rollLabel.textContent = `${gameState.rollsUsed}/3`;
  updateScoreLists();

  if (gameState.gameOver) {
    const p = gameState.playerScores.total;
    const a = gameState.aiScores.total;
    
    // Show game over overlay
    showGameOver(p, a);
    
    rollBtn.disabled = true;
    
    // Send final score to platform
    sendScoreToPlatform(p, a);
    endTurnBtn.disabled = true;
    return;
  }

  if (isPlayerTurn()) {
    statusLine.textContent =
      gameState.rollsUsed === 0 ? "Your turn: roll the dice" : "Your turn";
    statusBox.dataset.tone = "neutral";
  } else {
    statusLine.textContent = "CPU turn...";
    statusBox.dataset.tone = "warn";
  }

  rollBtn.disabled =
    !isPlayerTurn() || diceMgr.isRolling || gameState.rollsUsed >= 3;
  endTurnBtn.disabled =
    !isPlayerTurn() || diceMgr.isRolling || gameState.rollsUsed === 0;
}

function showToast(text, ms = 900) {
  toastEl.textContent = text;
  toastEl.classList.add("visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(
    () => toastEl.classList.remove("visible"),
    ms
  );
}

function handleRoll() {
  if (!gameState || !isPlayerTurn() || diceMgr.isRolling || gameState.rollsUsed >= 3) return;
  
  // Start session on first roll
  if (!sessionStarted) {
    startGameSession();
  }
  
  const unheld = diceMgr.getUnheldIndices();
  gameState.rollsUsed += 1;
  updateUI(); // immediately reflect that a roll was used
  diceMgr.roll(unheld, 600, () => {
    // when physics roll ends, refresh UI so buttons become active again
    updateUI();
  });
}

function handleCategoryClick(e) {
  if (!gameState || !isPlayerTurn() || gameState.gameOver) return;
  const row = e.target.closest(".score-row.player-row");
  if (!row) return;
  const cat = row.dataset.category;
  if (gameState.playerScores.used[cat]) return;
  document
    .querySelectorAll(".score-row.player-row")
    .forEach(r => r.classList.remove("selected"));
  row.classList.add("selected");
  gameState.selectedCategory = cat;

  // Show the score of the selected category with current dice
  const dice = diceMgr.values.slice();
  const s = scoreCategory(cat, dice);
  showToast(`${cat}: ${s} pts`);
}

function commitScore(playerId, category, diceValues) {
  const target =
    playerId === "player" ? gameState.playerScores : gameState.aiScores;
  const s = scoreCategory(category, diceValues);
  target.used[category] = true;
  target.scores[category] = s;

  const totals = computeTotals(target);
  target.upperSubtotal = totals.upperSubtotal;
  target.bonus = totals.bonus;
  target.lowerSubtotal = totals.lowerSubtotal;
  target.total = totals.total;

  // Track achievements for quest system (player only)
  if (playerId === "player" && s > 0) {
    if (category === "Yatzi") {
      gameState.achievements.roll_yatzi = true;
      console.log("🎯 Achievement: Yatzi!");
    }
    if (category === "Full") {
      gameState.achievements.full_house = true;
      console.log("🎯 Achievement: Full House!");
    }
    if (category === "Scala lunga") {
      gameState.achievements.large_straight = true;
      console.log("🎯 Achievement: Large Straight!");
    }
  }
  
  // Check for upper bonus achievement (player only)
  if (playerId === "player" && totals.bonus > 0 && !gameState.achievements.upper_bonus) {
    gameState.achievements.upper_bonus = true;
    console.log("🎯 Achievement: Upper Bonus!");
  }

  return s;
}

function nextTurn() {
  if (
    gameState.round >= gameState.maxRounds &&
    gameState.currentPlayer === "ai"
  ) {
    gameState.gameOver = true;
    updateUI();
    return;
  }
  if (gameState.currentPlayer === "ai") {
    gameState.round += 1;
  }
  gameState.currentPlayer =
    gameState.currentPlayer === "player" ? "ai" : "player";
  gameState.rollsUsed = 0;
  gameState.selectedCategory = null;
  diceMgr.resetHeld();
  diceMgr.resetValues();
  updateUI();
  if (!isPlayerTurn() && !gameState.gameOver) {
    setTimeout(aiTurnStart, 450);
  }
}

function handleEndTurn() {
  if (!gameState || !isPlayerTurn() || gameState.rollsUsed === 0 || !gameState.selectedCategory) {
    showToast("Choose a category");
    return;
  }
  const cat = gameState.selectedCategory;
  if (gameState.playerScores.used[cat]) return;
  const dice = diceMgr.values.slice();
  const s = commitScore("player", cat, dice);
  showToast(`${cat}: +${s}`);
  updateUI();
  setTimeout(() => {
    nextTurn();
  }, 500);
}

function rollDiceAsync(indices) {
  return new Promise(resolve => {
    diceMgr.roll(indices, 600, () => {
      resolve();
    });
  });
}

// Helper function to get the best available score for current dice
function getBestAvailableScore(dice, scoreState) {
  let best = 0;
  for (const cat of CATEGORIES) {
    if (!scoreState.used[cat]) {
      const s = scoreCategory(cat, dice);
      if (s > best) best = s;
    }
  }
  return best;
}

async function aiTurnStart() {
  if (gameState.gameOver) return;
  gameState.rollsUsed = 0;
  diceMgr.resetHeld();
  diceMgr.resetValues();
  updateUI();

  for (let r = 0; r < 3; r++) {
    if (gameState.gameOver || isPlayerTurn()) return;

    statusLine.textContent = `CPU turn ${getDifficultyLabel(aiDifficulty)}... roll ${r + 1}`;

    const unheld = diceMgr.getUnheldIndices();
    // If everything is already held and it's not the very first roll, stop early
    if (unheld.length === 0 && r > 0) {
      gameState.rollsUsed = r + 1;
      updateUI();
      break;
    }

    await rollDiceAsync(unheld);
    gameState.rollsUsed = r + 1;
    updateUI();

    // Decide which dice to keep (only after rolls 1 and 2, not after the last one)
    if (r < 2) {
      const keepMask = aiDecideKeep(
        diceMgr.values.slice(),
        gameState.aiScores,
        r + 1,
        aiDifficulty
      );
      // Only apply the mask if not all dice are kept (to allow third roll)
      const keptCount = keepMask.filter(k => k).length;
      if (keptCount < 5 || r === 0) {
        diceMgr.setHeldMask(keepMask);
      } else {
        // After roll 2, if AI wants to keep all, let it try the third roll anyway
        // unless the score is already very good
        const currentBestScore = getBestAvailableScore(diceMgr.values.slice(), gameState.aiScores);
        if (currentBestScore >= 25) {
          // Good enough, keep all
          diceMgr.setHeldMask(keepMask);
        } else {
          // Not great, might as well try again - keep most but not all
          const modifiedMask = keepMask.slice();
          const randomIdx = Math.floor(Math.random() * 5);
          modifiedMask[randomIdx] = false;
          diceMgr.setHeldMask(modifiedMask);
        }
      }
      await waitMs(300);
    }
  }

  const { category, score } = aiChooseCategory(
    diceMgr.values.slice(),
    gameState.aiScores,
    aiDifficulty
  );
  commitScore("ai", category, diceMgr.values.slice());
  statusLine.textContent = `CPU scores on ${category} (+${score})`;
  showToast(`🤖 CPU: ${category} +${score}`, 1200);
  updateUI();
  await waitMs(1000);
  nextTurn();
}

function waitMs(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  diceMgr.update(dt);
  controls.update();
  renderer.render(scene, camera);
}

// ===== FULLSCREEN FUNCTIONALITY =====
function toggleFullscreen() {
  // Use Platform SDK if available (works on iOS!)
  if (window.PlatformSDK && typeof window.PlatformSDK.toggleFullscreen === 'function') {
    window.PlatformSDK.toggleFullscreen();
    return;
  }
  
  // Fallback for standalone mode
  const elem = document.documentElement;
  
  // iOS/iPadOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const fullscreenSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  
  if ((isIOS || isIPadOS) && !fullscreenSupported) {
    // iOS doesn't support Fullscreen API - use CSS workaround
    toggleIOSFullscreen();
    return;
  }
  
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    // Enter fullscreen
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    } else {
      // Fallback to iOS method
      toggleIOSFullscreen();
    }
    document.body.classList.add('game-fullscreen');
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    document.body.classList.remove('game-fullscreen');
  }
}

// iOS Fullscreen CSS workaround (since iOS Safari doesn't support Fullscreen API)
function toggleIOSFullscreen() {
  const isFullscreen = document.body.classList.contains('ios-game-fullscreen');
  
  if (isFullscreen) {
    // Exit fullscreen
    document.body.classList.remove('ios-game-fullscreen');
    document.body.classList.remove('game-fullscreen');
    document.body.style.overflow = '';
    const exitBtn = document.getElementById('ios-fs-exit');
    if (exitBtn) exitBtn.remove();
  } else {
    // Enter fullscreen
    injectIOSFullscreenStyles();
    document.body.classList.add('ios-game-fullscreen');
    document.body.classList.add('game-fullscreen');
    document.body.style.overflow = 'hidden';
    createIOSExitButton();
    setTimeout(() => window.scrollTo(0, 1), 100);
  }
}

function injectIOSFullscreenStyles() {
  if (document.getElementById('ios-fullscreen-styles')) return;
  const style = document.createElement('style');
  style.id = 'ios-fullscreen-styles';
  style.textContent = `
    .ios-game-fullscreen {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      height: 100dvh !important;
      overflow: hidden !important;
      z-index: 999999 !important;
    }
    .ios-game-fullscreen canvas {
      width: 100vw !important;
      height: 100vh !important;
      height: 100dvh !important;
    }
    #ios-fs-exit {
      position: fixed !important;
      top: max(10px, env(safe-area-inset-top)) !important;
      right: max(10px, env(safe-area-inset-right)) !important;
      z-index: 9999999 !important;
      background: rgba(0,0,0,0.7) !important;
      color: white !important;
      border: none !important;
      border-radius: 50% !important;
      width: 44px !important;
      height: 44px !important;
      font-size: 24px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      -webkit-tap-highlight-color: transparent;
    }
  `;
  document.head.appendChild(style);
}

function createIOSExitButton() {
  if (document.getElementById('ios-fs-exit')) return;
  const btn = document.createElement('button');
  btn.id = 'ios-fs-exit';
  btn.innerHTML = '✕';
  btn.setAttribute('aria-label', 'Exit fullscreen');
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleIOSFullscreen();
  });
  document.body.appendChild(btn);
}

// Update fullscreen button icon based on state
function updateFullscreenIcon() {
  // Check both native fullscreen and iOS CSS fullscreen
  const isFullscreen = document.fullscreenElement || 
                       document.webkitFullscreenElement || 
                       document.body.classList.contains('ios-game-fullscreen');
  fullscreenBtn.innerHTML = isFullscreen 
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
      </svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>`;
}

// ===== ZOOM FUNCTIONALITY =====
function toggleZoom() {
  isZoomedOut = !isZoomedOut;
  
  const target = isZoomedOut ? CAMERA_ZOOMED : CAMERA_NORMAL;
  
  // Animate camera position
  animateCamera(target);
  
  // Update button state
  if (zoomBtn) {
    zoomBtn.classList.toggle('zoomed-out', isZoomedOut);
    zoomBtn.innerHTML = isZoomedOut 
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
          <path d="M8 11h6"/>
          <path d="M11 8v6"/>
        </svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
          <path d="M8 11h6"/>
        </svg>`;
  }
  
  showToast(isZoomedOut ? "Zoom out" : "Zoom in");
}

function animateCamera(target) {
  const startY = camera.position.y;
  const startZ = camera.position.z;
  const startFov = camera.fov;
  const duration = 400;
  const startTime = performance.now();
  
  function animate() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out cubic)
    const eased = 1 - Math.pow(1 - progress, 3);
    
    camera.position.y = startY + (target.y - startY) * eased;
    camera.position.z = startZ + (target.z - startZ) * eased;
    camera.fov = startFov + (target.fov - startFov) * eased;
    camera.updateProjectionMatrix();
    camera.lookAt(0, CAMERA_TARGET_Y, 0);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

// ===== GAME OVER OVERLAY =====
function showGameOver(playerScore, aiScore) {
  // Update title and class
  if (playerScore > aiScore) {
    gameOverTitle.textContent = "🎉 You Won!";
    gameOverTitle.className = "game-over-title win";
    statusBox.dataset.tone = "ok";
    statusLine.textContent = "Congratulations!";
  } else if (aiScore > playerScore) {
    gameOverTitle.textContent = "💔 You Lost";
    gameOverTitle.className = "game-over-title lose";
    statusBox.dataset.tone = "bad";
    statusLine.textContent = "Try again!";
  } else {
    gameOverTitle.textContent = "🤝 Draw";
    gameOverTitle.className = "game-over-title tie";
    statusBox.dataset.tone = "warn";
    statusLine.textContent = "Good game!";
  }
  
  // Update score display
  gameOverScore.textContent = `${playerScore} - ${aiScore}`;
  
  // Show overlay with animation
  gameOverOverlay.style.display = 'flex';
  requestAnimationFrame(() => {
    gameOverOverlay.classList.add('visible');
  });
}

function hideGameOver() {
  gameOverOverlay.classList.remove('visible');
  setTimeout(() => {
    gameOverOverlay.style.display = 'none';
  }, 400);
}

function handleRestart() {
  hideGameOver();
  gameStarted = false;
  gameState = null;
  aiDifficulty = null;
  diceMgr.resetHeld();
  diceMgr.resetValues();
  if (difficultyPanel) {
    difficultyPanel.classList.remove("hidden");
  }
  statusLine.textContent = "Choose difficulty";
  rollBtn.disabled = true;
  endTurnBtn.disabled = true;
}

// ===== LOADING SCREEN =====
function hideLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
}

function initDifficultySelector() {
  if (!difficultyCards.length) return;
  difficultyCards.forEach(btn => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.difficulty;
      if (!gameStarted) {
        // First selection: start game
        setDifficulty(next, { announce: true, startGame: true });
      } else {
        // Subsequent selections: change difficulty and reset
        if (next === aiDifficulty) return;
        setDifficulty(next, { announce: true, startGame: false });
      }
    });
  });
}

function initEvents() {
  rollBtn.addEventListener("click", handleRoll);
  endTurnBtn.addEventListener("click", handleEndTurn);
  scoreWrapperEl.addEventListener("click", handleCategoryClick);
  
  // Fullscreen button
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", toggleFullscreen);
  }
  
  // Zoom button
  if (zoomBtn) {
    zoomBtn.addEventListener("click", toggleZoom);
  }
  
  // Restart button
  if (restartBtn) {
    restartBtn.addEventListener("click", handleRestart);
  }
  
  // Fullscreen change listeners
  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
}

// Initialize game
async function init() {
  await initSDK();
  initThree();
  createScoreRows();
  initDifficultySelector();
  initEvents();
  animate();
  
  // Disable buttons until game starts
  rollBtn.disabled = true;
  endTurnBtn.disabled = true;
  
  // Hide loading screen after everything is ready
  hideLoadingScreen();
}

init();