/**
 * Evaluation: mystery morph → wild substitution → paylines → scatters/bonuses → jackpot.
 * Branches to WinState / FreeSpinsState / BonusState / IdleState.
 */
import { WinState } from './WinState.js';
import { FreeSpinsState } from './FreeSpinsState.js';
import { BonusState } from './BonusState.js';
import { JackpotState } from './JackpotState.js';
import { IdleState } from './IdleState.js';
import { SoundEvent } from '../audio/SoundEvent.js';
import { GameConfig } from '../config/GameConfig.js';

export class EvaluationState {
    constructor(game, grid) {
        this.game = game;
        this.rawGrid = grid;
    }

    enter() {
        const ctx = this.game.runCtx;
        const tier = this.game.data.bets.tiers[ctx.betTierIndex];
        const betPerLine = tier.perLine;
        const betTotal = betPerLine * tier.activeLines;

        // Grid is final as-is (no morph step). Aliased for clarity.
        const grid = this.rawGrid;

        // Paylines (note: bonuses.json says only the first activeLines paylines count)
        const hits = this.game.paylineEvaluator.evaluate(grid, tier.activeLines);
        const rawWin = this.game.winCalculator.compute(
            hits, betPerLine, ctx.freeSpinsMultiplier, ctx.hotStreakMultiplier
        );
        let baseWin = this.game.powerUpManager.multiplyWin(rawWin);

        // Coin Cash scatter-pays: each $ on grid awards a flat bonus (no payline,
        // no multipliers — keeps the math transparent for the player).
        baseWin = this.calculateCashWin(grid, betPerLine, baseWin);

        // Update consecutive wins + hot streak (only based on regular wins)
        if (baseWin > 0) {
            ctx.consecutiveWins++;
        } else {
            ctx.consecutiveWins = 0;
        }
        const hs = this.game.comboTracker.resolve(ctx.consecutiveWins);
        ctx.hotStreakMultiplier = hs.multiplier;
        ctx.hotStreakLabel = hs.label;
        if (hs.multiplier > 1 && baseWin > 0) this.game.sound.play(SoundEvent.HOT_STREAK);

        // Scatters & bonuses (counted on resolved grid)
        const scatterCount = this.game.scatterHandler.countScatter(grid);
        const bonusCount   = this.game.scatterHandler.countBonus(grid);

        // Jackpot check (5×7 on max bet)
        const isJackpot = this._isJackpotHit(grid, ctx, betTotal);

        ctx.lastWin = baseWin;
        ctx.totalWon += baseWin;
        ctx.balance += baseWin;
        ctx.pushLastWin(baseWin);

        if (baseWin > 0) {
            this.game.platform.sendScore(ctx.totalWon, { reason: 'win', amount: baseWin });
            this.game.platform.awardCoins(baseWin, `Slot win: ${baseWin} coins`)
                .catch(err => console.warn('[EvaluationState] awardCoins failed:', err));
        }

        // Close the per-spin session opened in IdleState._spin().
        // This triggers XP calculation on the backend and fires showXPBanner.
        if (this.game.platform.isAvailable()) {
            this.game.platform.gameOver(baseWin, {
                reason: 'spin_end',
                bet: betTotal,
                win: baseWin,
                free_spin: ctx.freeSpinsRemaining > 0
            });
        }

        // One spin consumed by every active powerup.
        this.game.powerUpManager.consumeOne();

        // After a win, LOCK is auto-disabled and put on cooldown so the player
        // cannot lock-in winning reels for free.
        if (baseWin > 0) {
            const hadLock = this.game.powerUpManager.forceExpire('reel_lock');
            ctx.lockCooldown = 3;
            if (hadLock) {
                this.game.marquee.push('🔓 LOCK released — cooldown 3 spins', '#00ffff', 2000);
            }
        }

        // Branching: jackpot has top priority
        if (isJackpot) {
            this.game.fsm.set(new JackpotState(this.game));
            return;
        }
        // Then bonus mini-game
        if (bonusCount >= this.game.data.bonuses.treasureVault.minBonus) {
            this.game.fsm.set(new BonusState(this.game, betTotal, baseWin > 0 ? hits : null));
            return;
        }
        // Then free spins
        if (scatterCount >= this.game.data.bonuses.freeSpins.minScatters) {
            this.game.fsm.set(new FreeSpinsState(this.game, scatterCount));
            return;
        }
        // Then win celebration if any
        if (baseWin > 0) {
            this.game.paylineRenderer.setHits(hits);
            const tierKey = this.game.winCalculator.classifyTier(baseWin, betTotal,
                this.game.data.config.wins.thresholds);
            this.game.fsm.set(new WinState(this.game, baseWin, tierKey, hits));
            return;
        }
        // Otherwise back to idle
        this.game.checkGameOverOnBroke();
        this.game.fsm.set(new IdleState(this.game));
    }

    calculateCashWin(grid, betPerLine, baseWin) {
        const cashSym = this.game.data.symbolList.find(s => s.isCash);
        const cashPayout = cashSym?.cashPayout ?? 0;

        // Collect positions of every $ on the grid
        const cashPositions = [];
        for (let col = 0; col < grid.length; col++) {
            for (let row = 0; row < grid[col].length; row++) {
                if (this.game.data.getSymbol(grid[col][row]).isCash) {
                    cashPositions.push({ col, row });
                }
            }
        }

        if (cashPositions.length === 0) return baseWin;

        const L = GameConfig.LAYOUT;
        const perCoin = Math.round(cashPayout * betPerLine);
        const cashWin = cashPositions.length * perCoin;
        if (cashWin <= 0) return baseWin;

        // VFX burst + per-coin popup on each $ cell
        for (const { col, row } of cashPositions) {
            const cx = L.REEL_AREA_X + col * (L.CELL_W + L.CELL_GAP_X) + L.CELL_W / 2;
            const cy = L.REEL_AREA_Y + row * (L.CELL_H + L.CELL_GAP_Y) + L.CELL_H / 2;
            this.game.vfx.emitBurst(cx, cy, 22, GameConfig.COLOR.NEON_GOLD,
                { speedMax: 260, upBias: 90, lifeMin: 0.5, lifeMax: 1.1 });
            this.game.vfx.popup(cx, cy, `+${perCoin}`,
                GameConfig.COLOR.NEON_GOLD, { size: 18, life: 1.3, vy: -65 });
        }

        // Central COIN CASH popup
        this.game.vfx.popup(
            GameConfig.VIEW_WIDTH / 2,
            L.REEL_AREA_Y + L.REEL_AREA_H / 2,
            `💰 COIN CASH  +${cashWin.toLocaleString('en-US')}`,
            GameConfig.COLOR.NEON_GOLD,
            { size: 24, life: 2, vy: -40 }
        );

        baseWin += cashWin;
        this.game.marquee.push(
            `💰 ${cashPositions.length}× COIN CASH — +${cashWin.toLocaleString('en-US')}`,
            '#ffd700',
            2200
        );
        this.game.sound.play(SoundEvent.COIN_DROP);
        return baseWin;
    }

    _isJackpotHit(grid, ctx, betTotal) {
        const jp = this.game.data.bonuses.jackpot;
        if (jp.requireMaxBet) {
            const max = this.game.data.bets.tiers[this.game.data.bets.maxBetTierIndex];
            if (betTotal < max.perLine * max.activeLines) return false;
        }
        const triggerId = jp.trigger;
        const activeLines = this.game.data.bets.tiers[ctx.betTierIndex].activeLines;
        const paylines = this.game.data.paylines.slice(0, activeLines);
        for (const line of paylines) {
            let triggerSeen = false;
            let ok = true;
            for (const [r, row] of line.cells) {
                const sId = grid[r][row];
                const isWild = this.game.data.getSymbol(sId).isWild;
                if (sId === triggerId) triggerSeen = true;
                else if (!isWild) { ok = false; break; }
            }
            if (ok && triggerSeen) return true;
        }
        return false;
    }

    exit() {
        //nothing to clean up
    }
    update() {
            //no dynamic elements to update in this state
    }
    handleInput() {
        //no player input expected in this state
    }
    render(ctx) { this.game.renderWorld(ctx, { canSpin: false }); }
}
