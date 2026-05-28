/**
 * Turns line hits into a final coin payout.
 *  total = Σ(line.baseCoinsPerLine * betPerLine)
 *  multiplied by freeSpinsMultiplier and hotStreakMultiplier when applicable.
 */
export class WinCalculator {
    compute(lineHits, betPerLine, freeSpinsMultiplier, hotStreakMultiplier) {
        let base = 0;
        for (const hit of lineHits) base += hit.baseCoinsPerLine * betPerLine;
        const mult = (freeSpinsMultiplier || 1) * (hotStreakMultiplier || 1);
        return Math.round(base * mult);
    }

    classifyTier(totalWon, totalBet, thresholds) {
        if (totalWon <= 0 || totalBet <= 0) return 'none';
        const ratio = totalWon / totalBet;
        if (ratio >= thresholds.mega)   return 'mega';
        if (ratio >= thresholds.super)  return 'super';
        if (ratio >= thresholds.big)    return 'big';
        if (ratio >= thresholds.medium) return 'medium';
        return 'small';
    }
}
