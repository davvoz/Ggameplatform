import {
  CATEGORIES,
  scoreCategory,
  countValues
} from "./gameLogic.js";

/* ================== CONFIG ================== */

const BONUS_TARGET = 63;
const BONUS_VALUE = 35;

// Profili di difficoltà: modificano profondità di ricerca e aggressività
const DIFFICULTIES = {
  easy: {
    simulations: 80,
    bonusWeight: 0.45,
    rarityWeight: 0.6,
    zeroPenalty: 0.6,
    riskBias: -0.25,
    mistakeChance: 0.12,
    holdGreed: 32
  },
  medium: {
    simulations: 200,
    bonusWeight: 0.75,
    rarityWeight: 1,
    zeroPenalty: 1,
    riskBias: 0,
    mistakeChance: 0.05,
    holdGreed: 30
  },
  hard: {
    simulations: 420,
    bonusWeight: 1.2,
    rarityWeight: 1.35,
    zeroPenalty: 1.2,
    riskBias: 0.25,
    mistakeChance: 0.01,
    holdGreed: 24,
    chaseYahtzee: true
  }
};

function getConfig(difficulty = "medium") {
  return DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
}

// Valori attesi per categoria upper (per valutare se siamo in linea con il bonus)
const UPPER_EXPECTED = {
  "Uno": 3,      // ~3 dadi su 5 in media
  "Due": 6,
  "Tre": 9,
  "Quattro": 12,
  "Cinque": 15,
  "Sei": 18
};

/* ================== UTILS ================== */

function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

function rollDice(mask, dice) {
  return dice.map((v, i) => mask[i] ? v : rollDie());
}

// Genera tutte le possibili maschere basate sui valori dei dadi
function generateAllMasks(dice) {
  const masks = new Set();
  const counts = countValues(dice);
  
  // Maschera vuota (rilancia tutto)
  masks.add(JSON.stringify(dice.map(() => false)));
  
  // Maschera piena (tieni tutto)
  masks.add(JSON.stringify(dice.map(() => true)));
  
  // Maschere per ogni valore presente
  for (let face = 1; face <= 6; face++) {
    generateValueMasks(face);
  }
  
  // Maschere per scale parziali
  const straights = [
    [1, 2, 3, 4, 5],
    [2, 3, 4, 5, 6],
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6]
  ];
  
  for (const straight of straights) {
    masks.add(JSON.stringify(dice.map(v => straight.includes(v))));
  }
  
  // Maschere per coppie e tris (per full)
  for (let face = 1; face <= 6; face++) {
    if (counts[face] >= 2) {
      // Tieni la coppia
      let kept = 0;
      masks.add(JSON.stringify(dice.map(v => {
        if (v === face && kept < 2) { kept++; return true; }
        return false;
      })));
    }
    if (counts[face] >= 3) {
      // Tieni il tris
      let kept = 0;
      masks.add(JSON.stringify(dice.map(v => {
        if (v === face && kept < 3) { kept++; return true; }
        return false;
      })));
    }
  }
  
  return Array.from(masks).map(m => JSON.parse(m));

  function generateValueMasks(face) {
    if (counts[face] > 0) {
      // Tieni tutti i dadi con questo valore
      masks.add(JSON.stringify(dice.map(v => v === face)));

      // Tieni i dadi con questo valore + altri valori comuni
      for (let face2 = 1; face2 <= 6; face2++) {
        if (face2 !== face && counts[face2] > 0) {
          masks.add(JSON.stringify(dice.map(v => v === face || v === face2)));
        }
      }
    }
  }
}

function getUpperCategories() {
  return ["Uno", "Due", "Tre", "Quattro", "Cinque", "Sei"];
}

function getLowerCategories() {
  return ["Tris", "Poker", "Full", "Scala corta", "Scala lunga", "Yatzi", "Chance"];
}

function upperRemaining(scoreState) {
  return getUpperCategories().filter(c => !scoreState.used[c]);
}

function lowerRemaining(scoreState) {
  return getLowerCategories().filter(c => !scoreState.used[c]);
}

function currentUpperSum(scoreState) {
  return getUpperCategories()
    .filter(c => scoreState.used[c])
    .reduce((sum, c) => sum + (scoreState.scores[c] || 0), 0);
}

function expectedUpperFromRemaining(remaining) {
  return remaining.reduce((sum, c) => sum + UPPER_EXPECTED[c], 0);
}

/* ================== EVALUATION ================== */

// Calcola il valore atteso di una maschera con simulazioni Monte Carlo
function evaluateKeepMask(mask, dice, scoreState, rollsLeft, config) {
  if (rollsLeft === 0) {
    return getBestScoreForDice(dice, scoreState, config);
  }
  
  let totalScore = 0;

  for (let sim = 0; sim < config.simulations; sim++) {
    // Simula i lanci rimanenti
    let simDice = dice.slice();
    
    for (let r = 0; r < rollsLeft; r++) {
      simDice = simDice.map((v, i) => mask[i] ? v : rollDie());
    }
    
    // Trova il miglior punteggio possibile
    totalScore += getBestScoreForDice(simDice, scoreState, config);
  }
  
  return totalScore / config.simulations;
}

// Calcola il miglior punteggio possibile per i dadi attuali
function getBestScoreForDice(dice, scoreState, config) {
  let best = 0;
  
  for (const cat of CATEGORIES) {
    if (scoreState.used[cat]) continue;
    
    const score = scoreCategory(cat, dice);
    const adjustedScore = adjustScoreForStrategy(cat, score, dice, scoreState, config);
    
    if (adjustedScore > best) {
      best = adjustedScore;
    }
  }
  
  return best;
}

// Calcola penalità per 0 punti in base alla categoria
function calculateZeroPenalty(category, isUpper, zeroPenalty) {
  let penalty = 0;
  if (category === "Yatzi") penalty = 8;
  else if (category === "Scala lunga") penalty = 6;
  else if (category === "Scala corta") penalty = 4;
  else if (category === "Full") penalty = 3;
  else if (category === "Poker") penalty = 2;
  else if (!isUpper) penalty = 1;
  return penalty * zeroPenalty;
}

// Aggiusta il punteggio per categorie rare
function applyRarityBonus(category, rawScore, config) {
  let bonus = 0;
  if (category === "Yatzi" && rawScore === 50) {
    bonus += 15 * config.rarityWeight;
  } else if (category === "Scala lunga" && rawScore === 40) {
    bonus += 10 * config.rarityWeight;
  } else if (category === "Full" && rawScore === 25) {
    bonus += 5 * config.rarityWeight;
  }
  return bonus;
}

function getCategoryPotentialLoss(category) {
  if (category === "Yatzi") return 50;
  if (category === "Scala lunga") return 40;
  if (category === "Scala corta") return 30;
  if (category === "Full") return 25;
  if (category === "Poker") return 20;
  if (category === "Tris") return 15;
  if (category === "Chance") return 20;
  return UPPER_EXPECTED[category] || 10;
}

function calculateCategoryScore(cat, dice, scoreState, config) {
  const rawScore = scoreCategory(cat, dice);
  let adjustedScore = adjustScoreForStrategy(cat, rawScore, dice, scoreState, config);

  if (cat === "Chance") {
    const sum = dice.reduce((a, b) => a + b, 0);
    adjustedScore += (sum - 20) * 0.12;
  }

  if (config.mistakeChance && Math.random() < config.mistakeChance * 0.35) {
    adjustedScore -= 5;
  }
  
  return adjustedScore;
}

function findBestCategoryByScore(dice, scoreState, config) {
  let bestCat = null;
  let bestScore = -Infinity;
  
  for (const cat of CATEGORIES) {
    if (scoreState.used[cat]) continue;
    
    const adjustedScore = calculateCategoryScore(cat, dice, scoreState, config);
    
    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestCat = cat;
    }
  }
  
  return bestCat;
}

function findBestCategoryByMinLoss(scoreState) {
  let bestCat = null;
  let minLoss = Infinity;
  
  for (const cat of CATEGORIES) {
    if (scoreState.used[cat]) continue;
    const potentialLoss = getCategoryPotentialLoss(cat);
    if (potentialLoss < minLoss) {
      minLoss = potentialLoss;
      bestCat = cat;
    }
  }
  
  return bestCat;
}

function findBestCategoryWithFallback(dice, scoreState, config) {
  let bestCat = findBestCategoryByScore(dice, scoreState, config);
  
  if (!bestCat) {
    bestCat = findBestCategoryByMinLoss(scoreState);
  }
  
  return bestCat;
}

// Calcola bonus per il target 63
function calculateBonusAdjustment(category, rawScore, currentUpper, config) {
  let bonus = 0;
  if (currentUpper + rawScore >= BONUS_TARGET && currentUpper < BONUS_TARGET) {
    bonus += BONUS_VALUE * 0.5 * config.bonusWeight;
  } else if (config.riskBias > 0) {
    const remaining = upperRemaining({ used: Object.keys(CATEGORIES).reduce((acc, c) => ({ ...acc, [c]: true }), {}) });
    const expectedRemaining = expectedUpperFromRemaining(remaining.filter(c => c !== category));
    const projectedTotal = currentUpper + rawScore + expectedRemaining;
    if (projectedTotal >= BONUS_TARGET - 6) {
      bonus += BONUS_VALUE * 0.15 * config.bonusWeight;
    }
  }
  return bonus;
}

// Aggiusta il punteggio in base alla strategia
function adjustScoreForStrategy(category, rawScore, dice, scoreState, config) {
  let score = rawScore;
  const upperCats = getUpperCategories();
  const isUpper = upperCats.includes(category);
  const currentUpper = currentUpperSum(scoreState);
  
  if (isUpper) {
    score += calculateBonusAdjustment(category, rawScore, currentUpper, config);
  }
  
  score += applyRarityBonus(category, rawScore, config);
  
  if (rawScore === 0) {
    score -= calculateZeroPenalty(category, isUpper, config.zeroPenalty || 1);
  }
  
  if (category === "Chance") {
    score -= 3;
  }

  if (config.riskBias !== 0) {
    const sum = dice.reduce((a, b) => a + b, 0);
    score += (sum - 18) * 0.05 * config.riskBias;
  }

  if (config.mistakeChance && Math.random() < config.mistakeChance) {
    score -= 3 + Math.random() * 4;
  }
  
  return score;
}

/* ================== MAIN AI DECISIONS ================== */

export function aiDecideKeep(dice, scoreState, rollIndex, difficulty = "medium") {
  const config = getConfig(difficulty);

  // Dopo l'ultimo lancio, tieni tutto
  if (rollIndex >= 2) {
    return dice.map(() => true);
  }
  
  const rollsLeft = 2 - rollIndex;
  const masks = generateAllMasks(dice);
  
  let bestMask = dice.map(() => false);
  let bestEV = -Infinity;
  
  // Valuta il punteggio attuale (se teniamo tutto)
  const currentBest = getBestScoreForDice(dice, scoreState, config);
  
  // Se abbiamo già un punteggio eccellente, tieni tutto
  if (currentBest >= config.holdGreed) {
    return dice.map(() => true);
  }
  
  for (const mask of masks) {
    const ev = evaluateKeepMask(mask, dice, scoreState, rollsLeft, config);
    
    if (ev > bestEV) {
      bestEV = ev;
      bestMask = mask;
    }
  }
  
  // Se la miglior EV non è molto migliore del punteggio attuale,
  // e il punteggio attuale è già buono, tieni tutto
  if (currentBest >= config.holdGreed - 8 && bestEV < currentBest + 5) {
    return dice.map(() => true);
  }
  
  // Margine di errore: l'AI easy può prendere decisioni meno ottimali
  if (config.mistakeChance && Math.random() < config.mistakeChance * 0.6) {
    return masks[Math.floor(Math.random() * masks.length)] || bestMask;
  }
  
  return bestMask;
}

export function aiChooseCategory(dice, scoreState, difficulty = "medium") {
  const config = getConfig(difficulty);
  const bestCat = findBestCategoryWithFallback(dice, scoreState, config);
  const finalScore = scoreCategory(bestCat, dice);
  return { category: bestCat, score: finalScore };
}
