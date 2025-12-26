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
    rarityWeight: 1.0,
    zeroPenalty: 1.0,
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
  let bestCat = null;
  
  for (const cat of CATEGORIES) {
    if (scoreState.used[cat]) continue;
    
    const score = scoreCategory(cat, dice);
    const adjustedScore = adjustScoreForStrategy(cat, score, dice, scoreState, config);
    
    if (adjustedScore > best) {
      best = adjustedScore;
      bestCat = cat;
    }
  }
  
  return best;
}

// Aggiusta il punteggio in base alla strategia
function adjustScoreForStrategy(category, rawScore, dice, scoreState, config) {
  let score = rawScore;
  const upperCats = getUpperCategories();
  const isUpper = upperCats.includes(category);
  const rarityWeight = config.rarityWeight || 1;
  const bonusWeight = config.bonusWeight || 1;
  const zeroPenalty = config.zeroPenalty || 1;
  
  // Calcola stato bonus
  const currentUpper = currentUpperSum(scoreState);
  const remaining = upperRemaining(scoreState);
  const expectedRemaining = expectedUpperFromRemaining(remaining.filter(c => c !== category));
  const riskBias = config.riskBias || 0;
  const mistakeChance = config.mistakeChance || 0;
  
  if (isUpper) {
    // Bonus per stare in linea con il target 63
    const expectedForThis = UPPER_EXPECTED[category];
    const projectedTotal = currentUpper + rawScore + expectedRemaining;
    
    if (rawScore >= expectedForThis) {
      // Sopra la media: bonus proporzionale
      score += (rawScore - expectedForThis) * (0.5 + 0.2 * riskBias);
    } else if (rawScore < expectedForThis) {
      // Sotto la media: penalità se rischia il bonus
      if (projectedTotal < BONUS_TARGET) {
        score -= (expectedForThis - rawScore) * (0.8 + 0.3 * (1 - riskBias));
      } else {
        // Leggera penalità se siamo ancora in corsa per il bonus
        score -= (expectedForThis - rawScore) * 0.2;
      }
    }
    
    // Bonus se questa mossa ci fa raggiungere il bonus
    if (currentUpper + rawScore >= BONUS_TARGET && currentUpper < BONUS_TARGET) {
      score += BONUS_VALUE * 0.5 * bonusWeight;  // Anticipa parte del bonus
    } else if (riskBias > 0 && projectedTotal >= BONUS_TARGET - 6) {
      // Se siamo vicini al bonus, incoraggia la scelta
      score += BONUS_VALUE * 0.15 * bonusWeight;
    }
  }
  
  // Bonus per combinazioni rare e preziose
  if (category === "Yatzi" && rawScore === 50) {
    score += 15 * rarityWeight;  // Yatzi è prezioso, non sacrificarlo
    if (config.chaseYahtzee && remaining.length <= 4) {
      // Aggiungi un po' di appetito nel finale partita
      score += 5;
    }
  }
  
  if (category === "Scala lunga" && rawScore === 40) {
    score += 10 * rarityWeight;
  }
  
  if (category === "Full" && rawScore === 25) {
    score += 5 * rarityWeight;
  }
  
  // Penalità per sacrificare categorie importanti con 0
  if (rawScore === 0) {
    let penalty = 0;
    if (category === "Yatzi") penalty = 8;
    else if (category === "Scala lunga") penalty = 6;
    else if (category === "Scala corta") penalty = 4;
    else if (category === "Full") penalty = 3;
    else if (category === "Poker") penalty = 2;
    else if (!isUpper) penalty = 1;
    score -= penalty * zeroPenalty;
  }
  
  // Chance è una categoria di fallback, penalizzala leggermente
  if (category === "Chance") {
    score -= 3;
  }

  // Rischio controllato: somma alta incoraggia la scelta se siamo aggressivi
  if (riskBias !== 0) {
    const sum = dice.reduce((a, b) => a + b, 0);
    score += (sum - 18) * 0.05 * riskBias;
  }

  // Margine di errore deliberato per livelli facili
  if (mistakeChance && Math.random() < mistakeChance) {
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
  let bestCat = null;
  let bestScore = -Infinity;
  
  const upperCats = getUpperCategories();
  const currentUpper = currentUpperSum(scoreState);
  const remaining = upperRemaining(scoreState);
  
  for (const cat of CATEGORIES) {
    if (scoreState.used[cat]) continue;
    
    const rawScore = scoreCategory(cat, dice);
    let adjustedScore = adjustScoreForStrategy(cat, rawScore, dice, scoreState, config);

    // Chance: leggero boost se abbiamo somma alta
    if (cat === "Chance") {
      const sum = dice.reduce((a, b) => a + b, 0);
      adjustedScore += (sum - 20) * 0.12;
    }

    // Margine di errore per la difficoltà easy
    if (config.mistakeChance && Math.random() < config.mistakeChance * 0.35) {
      adjustedScore -= 5;
    }
    
    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestCat = cat;
    }
  }
  
  // Fallback: scegli la categoria con minor danno
  if (!bestCat) {
    let minLoss = Infinity;
    for (const cat of CATEGORIES) {
      if (scoreState.used[cat]) continue;
      
      // Calcola quanto "perdiamo" sacrificando questa categoria
      let potentialLoss = 0;
      if (cat === "Yatzi") potentialLoss = 50;
      else if (cat === "Scala lunga") potentialLoss = 40;
      else if (cat === "Scala corta") potentialLoss = 30;
      else if (cat === "Full") potentialLoss = 25;
      else if (cat === "Poker") potentialLoss = 20;
      else if (cat === "Tris") potentialLoss = 15;
      else if (cat === "Chance") potentialLoss = 20;
      else potentialLoss = UPPER_EXPECTED[cat] || 10;
      
      if (potentialLoss < minLoss) {
        minLoss = potentialLoss;
        bestCat = cat;
      }
    }
  }
  
  const finalScore = scoreCategory(bestCat, dice);
  return { category: bestCat, score: finalScore };
}
