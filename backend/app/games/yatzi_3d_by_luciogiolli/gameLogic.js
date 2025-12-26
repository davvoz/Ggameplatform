export const CATEGORIES = [
  "Uno",
  "Due",
  "Tre",
  "Quattro",
  "Cinque",
  "Sei",
  "Tris",
  "Poker",
  "Full",
  "Scala corta",
  "Scala lunga",
  "Yatzi",
  "Chance"
];

export const UPPER_CATEGORIES = CATEGORIES.slice(0, 6);

export function initialScoreState() {
  return {
    used: Object.fromEntries(CATEGORIES.map(c => [c, false])),
    scores: Object.fromEntries(CATEGORIES.map(c => [c, null])),
    upperSubtotal: 0,
    bonus: 0,
    lowerSubtotal: 0,
    total: 0
  };
}

export function computeTotals(scoreState) {
  let upperSubtotal = 0;
  let lowerSubtotal = 0;

  for (const [cat, val] of Object.entries(scoreState.scores)) {
    if (val == null) continue;
    if (UPPER_CATEGORIES.includes(cat)) {
      upperSubtotal += val;
    } else {
      lowerSubtotal += val;
    }
  }

  const bonus = upperSubtotal >= 63 ? 35 : 0;
  const total = upperSubtotal + bonus + lowerSubtotal;

  return { upperSubtotal, bonus, lowerSubtotal, total };
}

export function countValues(dice) {
  const counts = [0,0,0,0,0,0,0];
  for (const v of dice) counts[v]++;
  return counts;
}

export function scoreCategory(category, dice) {
  const counts = countValues(dice);
  const sum = dice.reduce((a,b)=>a+b,0);
  switch (category) {
    case "Uno": return counts[1] * 1;
    case "Due": return counts[2] * 2;
    case "Tre": return counts[3] * 3;
    case "Quattro": return counts[4] * 4;
    case "Cinque": return counts[5] * 5;
    case "Sei": return counts[6] * 6;
    case "Tris": {
      if (counts.some(c => c >= 3)) return sum;
      return 0;
    }
    case "Poker": {
      if (counts.some(c => c >= 4)) return sum;
      return 0;
    }
    case "Full": {
      const has3 = counts.some(c => c === 3);
      const has2 = counts.some(c => c === 2);
      return (has3 && has2) ? 25 : 0;
    }
    case "Scala corta": {
      const uniq = [...new Set(dice)].sort((a,b)=>a-b).join("");
      const patterns = ["1234","2345","3456","12345","23456"];
      return patterns.some(p => uniq.includes(p)) ? 30 : 0;
    }
    case "Scala lunga": {
      const uniq = [...new Set(dice)].sort((a,b)=>a-b).join("");
      return (uniq === "12345" || uniq === "23456") ? 40 : 0;
    }
    case "Yatzi": {
      return counts.some(c => c === 5) ? 50 : 0;
    }
    case "Chance": {
      return sum;
    }
    default:
      return 0;
  }
}

export function bestCategoryForDice(dice, scoreState) {
  let bestCat = null;
  let bestScore = -1;
  for (const cat of CATEGORIES) {
    if (scoreState.used[cat]) continue;
    const s = scoreCategory(cat, dice);
    if (s > bestScore) {
      bestScore = s;
      bestCat = cat;
    }
  }
  return { category: bestCat, score: bestScore };
}