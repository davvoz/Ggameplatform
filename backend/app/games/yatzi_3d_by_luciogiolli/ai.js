import {
  CATEGORIES,
  scoreCategory,
  countValues
} from "./gameLogic.js";

/* ================== CONFIG ================== */

const SIMULATIONS = 200;      // Più simulazioni = decisioni migliori
const BONUS_TARGET = 63;
const BONUS_VALUE = 35;

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
function evaluateKeepMask(mask, dice, scoreState, rollsLeft) {
  if (rollsLeft === 0) {
    return getBestScoreForDice(dice, scoreState);
  }
  
  let totalScore = 0;
  
  for (let sim = 0; sim < SIMULATIONS; sim++) {
    // Simula i lanci rimanenti
    let simDice = dice.slice();
    
    for (let r = 0; r < rollsLeft; r++) {
      simDice = simDice.map((v, i) => mask[i] ? v : rollDie());
    }
    
    // Trova il miglior punteggio possibile
    totalScore += getBestScoreForDice(simDice, scoreState);
  }
  
  return totalScore / SIMULATIONS;
}

// Calcola il miglior punteggio possibile per i dadi attuali
function getBestScoreForDice(dice, scoreState) {
  let best = 0;
  let bestCat = null;
  
  for (const cat of CATEGORIES) {
    if (scoreState.used[cat]) continue;
    
    const score = scoreCategory(cat, dice);
    const adjustedScore = adjustScoreForStrategy(cat, score, dice, scoreState);
    
    if (adjustedScore > best) {
      best = adjustedScore;
      bestCat = cat;
    }
  }
  
  return best;
}

// Aggiusta il punteggio in base alla strategia
function adjustScoreForStrategy(category, rawScore, dice, scoreState) {
  let score = rawScore;
  const upperCats = getUpperCategories();
  const isUpper = upperCats.includes(category);
  
  // Calcola stato bonus
  const currentUpper = currentUpperSum(scoreState);
  const remaining = upperRemaining(scoreState);
  const expectedRemaining = expectedUpperFromRemaining(remaining.filter(c => c !== category));
  
  if (isUpper) {
    // Bonus per stare in linea con il target 63
    const expectedForThis = UPPER_EXPECTED[category];
    
    if (rawScore >= expectedForThis) {
      // Sopra la media: bonus proporzionale
      score += (rawScore - expectedForThis) * 0.5;
    } else if (rawScore < expectedForThis) {
      // Sotto la media: penalità se rischia il bonus
      const projectedTotal = currentUpper + rawScore + expectedRemaining;
      if (projectedTotal < BONUS_TARGET) {
        score -= (expectedForThis - rawScore) * 0.8;
      }
    }
    
    // Bonus se questa mossa ci fa raggiungere il bonus
    if (currentUpper + rawScore >= BONUS_TARGET && currentUpper < BONUS_TARGET) {
      score += BONUS_VALUE * 0.5;  // Anticipa metà del bonus
    }
  }
  
  // Bonus per combinazioni rare e preziose
  if (category === "Yatzi" && rawScore === 50) {
    score += 15;  // Yatzi è prezioso, non sacrificarlo
  }
  
  if (category === "Scala lunga" && rawScore === 40) {
    score += 10;
  }
  
  if (category === "Full" && rawScore === 25) {
    score += 5;
  }
  
  // Penalità per sacrificare categorie importanti con 0
  if (rawScore === 0) {
    if (category === "Yatzi") score -= 8;
    else if (category === "Scala lunga") score -= 6;
    else if (category === "Scala corta") score -= 4;
    else if (category === "Full") score -= 3;
    else if (category === "Poker") score -= 2;
    else if (!isUpper) score -= 1;
  }
  
  // Chance è una categoria di fallback, penalizzala leggermente
  if (category === "Chance") {
    score -= 3;
  }
  
  return score;
}

/* ================== MAIN AI DECISIONS ================== */

export function aiDecideKeep(dice, scoreState, rollIndex) {
  // Dopo l'ultimo lancio, tieni tutto
  if (rollIndex >= 2) {
    return dice.map(() => true);
  }
  
  const rollsLeft = 2 - rollIndex;
  const masks = generateAllMasks(dice);
  
  let bestMask = dice.map(() => false);
  let bestEV = -Infinity;
  
  // Valuta il punteggio attuale (se teniamo tutto)
  const currentBest = getBestScoreForDice(dice, scoreState);
  
  // Se abbiamo già un punteggio eccellente, tieni tutto
  if (currentBest >= 40) {
    return dice.map(() => true);
  }
  
  for (const mask of masks) {
    const ev = evaluateKeepMask(mask, dice, scoreState, rollsLeft);
    
    if (ev > bestEV) {
      bestEV = ev;
      bestMask = mask;
    }
  }
  
  // Se la miglior EV non è molto migliore del punteggio attuale,
  // e il punteggio attuale è già buono, tieni tutto
  if (currentBest >= 25 && bestEV < currentBest + 5) {
    return dice.map(() => true);
  }
  
  return bestMask;
}

export function aiChooseCategory(dice, scoreState) {
  let bestCat = null;
  let bestScore = -Infinity;
  
  const upperCats = getUpperCategories();
  const currentUpper = currentUpperSum(scoreState);
  const remaining = upperRemaining(scoreState);
  
  for (const cat of CATEGORIES) {
    if (scoreState.used[cat]) continue;
    
    const rawScore = scoreCategory(cat, dice);
    let adjustedScore = rawScore;
    
    // Strategia upper section / bonus
    if (upperCats.includes(cat)) {
      const expectedForThis = UPPER_EXPECTED[cat];
      const otherRemaining = remaining.filter(c => c !== cat);
      const expectedFromOthers = expectedUpperFromRemaining(otherRemaining);
      const projectedTotal = currentUpper + rawScore + expectedFromOthers;
      
      if (rawScore >= expectedForThis) {
        // Buon punteggio per questa categoria
        adjustedScore += (rawScore - expectedForThis) * 0.3;
      } else {
        // Sotto la media
        if (projectedTotal < BONUS_TARGET) {
          // Rischiamo di perdere il bonus
          adjustedScore -= (expectedForThis - rawScore) * 0.5;
        }
      }
      
      // Bonus se raggiungiamo il 63
      if (currentUpper + rawScore >= BONUS_TARGET && currentUpper < BONUS_TARGET) {
        adjustedScore += BONUS_VALUE * 0.3;
      }
    }
    
    // Yatzi: molto prezioso
    if (cat === "Yatzi") {
      if (rawScore === 50) {
        adjustedScore += 20;
      } else {
        // Non sacrificare Yatzi se non necessario
        const usedCount = Object.values(scoreState.used).filter(Boolean).length;
        if (usedCount < 10) {
          adjustedScore -= 15;
        }
      }
    }
    
    // Scale: preziose
    if (cat === "Scala lunga") {
      if (rawScore === 40) {
        adjustedScore += 10;
      } else {
        adjustedScore -= 8;
      }
    }
    
    if (cat === "Scala corta") {
      if (rawScore === 30) {
        adjustedScore += 5;
      } else {
        adjustedScore -= 5;
      }
    }
    
    // Full
    if (cat === "Full") {
      if (rawScore === 25) {
        adjustedScore += 5;
      } else {
        adjustedScore -= 4;
      }
    }
    
    // Poker/Tris: usa se hai un buon punteggio
    if (cat === "Poker" && rawScore > 0) {
      adjustedScore += 2;
    }
    
    if (cat === "Tris" && rawScore > 0) {
      adjustedScore += 1;
    }
    
    // Chance: categoria di fallback
    if (cat === "Chance") {
      const sum = dice.reduce((a, b) => a + b, 0);
      if (sum >= 25) {
        adjustedScore += 2;
      } else {
        adjustedScore -= 2;
      }
    }
    
    // Penalità per sacrificare con 0
    if (rawScore === 0) {
      adjustedScore -= 3;
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
