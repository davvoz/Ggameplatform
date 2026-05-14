import { GameConfig } from '../config/GameConfig.js';
import { UIPainter } from '../ui/UIPainter.js';
import { CardArt } from '../ui/CardArt.js';
import { HeroSelectState } from './HeroSelectState.js';
import { CampaignSelectState } from './CampaignSelectState.js';
import { MultiplayerLobbyState } from './MultiplayerLobbyState.js';
import { SoundEvent } from '../audio/SoundEvent.js';
import { MP_SUPPORTED_CARD_IDS } from '../platform/MultiplayerSupport.js';

/**
 * Pick exactly ROSTER_SIZE cards from the catalog. Toggle by tap.
 * Scrollable list (3 columns).
 */
export class DeckBuilderState {
    constructor(game) {
        this._game = game;
        this._allCards = [];
        this._selected = new Set();
        this._cardRects = [];        // recomputed each render
        this._scrollY = 0;
        this._maxScroll = 0;
        this._dragStart = null;
        this._dragMoved = false;
        this._tap = null;
        this._backBtn = null;
        this._nextBtn = null;
        this._listRect = null;
        // ── Deck slots (server-backed, 4 per user) ──
        this._slots = [null, null, null, null];   // server payloads
        this._activeSlot = 0;
        this._slotRects = [];
        this._saveBtn = null;
        this._loadBtn = null;
        this._deleteBtn = null;
        this._statusMsg = '';
        this._statusMsgUntil = 0;
    }

    enter() {
        this._allCards = this._game.data.getAllCards();
        // Multiplayer (A2.1) supports a curated subset of cards. Filter the
        // catalog so users can't pick something the server would reject.
        if (this._game.run?.mode === 'multiplayer') {
            this._allCards = this._allCards.filter((c) => MP_SUPPORTED_CARD_IDS.has(c.id));
        }
        const W = GameConfig.VIEW_WIDTH;
        this._backBtn = { id: 'back', label: '◀ BACK', x: 16, y: 16, w: 90, h: 36, enabled: true };

        // Slot tabs row
        const slotW = 100, slotH = 36, gap = 8;
        const totalW = slotW * 4 + gap * 3;
        const startX = (W - totalW) / 2;
        this._slotRects = [];
        for (let i = 0; i < 4; i++) {
            this._slotRects.push({
                id: `slot-${i}`, slot: i,
                x: startX + i * (slotW + gap), y: 100, w: slotW, h: slotH,
            });
        }

        // Action buttons row
        const actY = 146, actH = 30;
        this._saveBtn   = { id: 'save',   label: 'SAVE',   x: W / 2 - 134, y: actY, w: 80, h: actH, enabled: false };
        this._loadBtn   = { id: 'load',   label: 'LOAD',   x: W / 2 -  44, y: actY, w: 80, h: actH, enabled: false };
        this._deleteBtn = { id: 'delete', label: 'DELETE', x: W / 2 +  46, y: actY, w: 88, h: actH, enabled: false };

        // Card list shifted down to make room
        this._listRect = { x: 12, y: 192, w: W - 24, h: 478 };
        this._nextBtn = { id: 'next', label: 'START MATCH',
            x: W / 2 - 110, y: 730, w: 220, h: 50, enabled: false };

        // Async fetch saved slots from backend (idempotent — UI stays usable while pending)
        this._fetchSlots();
    }

    async _fetchSlots() {
        try {
            const res = await this._game.platform?.loadDecks?.();
            if (!res || !Array.isArray(res.decks)) return;
            this._slots = [null, null, null, null];
            for (const d of res.decks) {
                if (typeof d.slot === 'number' && d.slot >= 0 && d.slot < 4) {
                    this._slots[d.slot] = d.is_empty ? null : d;
                }
            }
            this._refreshActionState();
        } catch (err) {
            console.warn('[minion_clash] failed to fetch slots', err);
        }
    }

    _refreshActionState() {
        const target = GameConfig.BATTLE.ROSTER_SIZE;
        const hasFullDeck = this._selected.size === target;
        const slot = this._slots[this._activeSlot];
        const slotFilled = !!slot;
        const authed = !!this._game.platform?.isAuthenticated?.();
        this._saveBtn.enabled   = authed && hasFullDeck;
        this._loadBtn.enabled   = authed && slotFilled;
        this._deleteBtn.enabled = authed && slotFilled;
    }

    _flashStatus(msg, ms = 2500) {
        this._statusMsg = msg;
        this._statusMsgUntil = performance.now() + ms;
    }

    handleInput(ev) {
        if (ev.type === 'down') {
            this._dragStart = { x: ev.x, y: ev.y, scroll: this._scrollY, t: performance.now() };
            this._dragMoved = false;
        } else if (ev.type === 'move' && this._dragStart) {
            const dy = ev.y - this._dragStart.y;
            if (Math.abs(dy) > 5) this._dragMoved = true;
            if (this._dragMoved && this._listRect && UIPainter.isInside(this._dragStart, this._listRect)) {
                this._scrollY = this._clampScroll(this._dragStart.scroll - dy);
            }
        } else if (ev.type === 'up') {
            if (!this._dragMoved) this._tap = { x: ev.x, y: ev.y };
            this._dragStart = null;
        }
    }

    update() {
        const target = GameConfig.BATTLE.ROSTER_SIZE;
        this._nextBtn.enabled = this._selected.size === target;
        this._refreshActionState();
        if (!this._tap) return;
        const t = this._tap; this._tap = null;
        this._dispatchTap(t);
    }

    _dispatchTap(t) {
        const click = () => this._game.sound?.play(SoundEvent.UI_CLICK);
        const handlers = [
            { rect: this._backBtn,   guard: () => true,
              run: () => { click(); this._game.transitionTo(new HeroSelectState(this._game)); } },
            { rect: this._saveBtn,   guard: () => this._saveBtn.enabled,
              run: () => { click(); this._onSave(); } },
            { rect: this._loadBtn,   guard: () => this._loadBtn.enabled,
              run: () => { click(); this._onLoad(); } },
            { rect: this._deleteBtn, guard: () => this._deleteBtn.enabled,
              run: () => { click(); this._onDelete(); } },
            { rect: this._nextBtn,   guard: () => this._nextBtn.enabled,
              run: () => {
                  click();
                  this._game.run.deckIds = Array.from(this._selected);
                  const next = this._game.run.mode === 'multiplayer'
                      ? new MultiplayerLobbyState(this._game)
                      : new CampaignSelectState(this._game);
                  this._game.transitionTo(next);
              } },
        ];
        for (const h of handlers) {
            if (h.guard() && UIPainter.isInside(t, h.rect)) { h.run(); return; }
        }
        for (const r of this._slotRects) {
            if (UIPainter.isInside(t, r)) {
                click(); this._activeSlot = r.slot; this._refreshActionState(); return;
            }
        }
        for (const r of this._cardRects) {
            if (UIPainter.isInside(t, r)) { click(); this._toggle(r.cardId); return; }
        }
    }

    async _onSave() {
        const slot = this._activeSlot;
        const cardIds = Array.from(this._selected);
        try {
            const saved = await this._game.platform.saveDeck(slot, {
                name: `Deck ${slot + 1}`,
                card_ids: cardIds,
            });
            if (saved) {
                this._slots[slot] = saved;
                this._flashStatus(`Saved to slot ${slot + 1}`);
            }
        } catch (err) {
            this._flashStatus(`Save failed: ${err.message ?? err}`, 4000);
        } finally {
            this._refreshActionState();
        }
    }

    _onLoad() {
        const slot = this._slots[this._activeSlot];
        if (!slot) return;
        const ids = slot.card_ids ?? [];
        const isMp = this._game.run?.mode === 'multiplayer';
        const filtered = isMp ? ids.filter((id) => MP_SUPPORTED_CARD_IDS.has(id)) : ids;
        this._selected = new Set(filtered);
        const dropped = ids.length - filtered.length;
        if (isMp && dropped > 0) {
            this._flashStatus(`Loaded slot ${this._activeSlot + 1} (${dropped} card(s) not MP-ready, pick replacements)`, 3500);
        } else {
            this._flashStatus(`Loaded slot ${this._activeSlot + 1}`);
        }
        this._refreshActionState();
    }

    async _onDelete() {
        const slot = this._activeSlot;
        const ok = await this._game.platform.deleteDeck(slot);
        if (ok) {
            this._slots[slot] = null;
            this._flashStatus(`Cleared slot ${slot + 1}`);
        } else {
            this._flashStatus('Delete failed', 3000);
        }
        this._refreshActionState();
    }

    _toggle(cardId) {
        if (this._selected.has(cardId)) {
            this._selected.delete(cardId);
            return;
        }
        if (this._selected.size >= GameConfig.BATTLE.ROSTER_SIZE) return;
        this._selected.add(cardId);
    }

    _clampScroll(v) { return Math.max(0, Math.min(this._maxScroll, v)); }

    render(ctx) {
        UIPainter.button(ctx, this._backBtn);
        UIPainter.text(ctx, 'BUILD YOUR DECK', GameConfig.VIEW_WIDTH / 2, 50,
            { font: 'bold 20px system-ui', color: GameConfig.COLOR.GOLD, align: 'center' });
        const counter = `${this._selected.size}/${GameConfig.BATTLE.ROSTER_SIZE} cards`;
        UIPainter.text(ctx, counter, GameConfig.VIEW_WIDTH / 2, 80,
            { font: '14px system-ui',
              color: this._selected.size === GameConfig.BATTLE.ROSTER_SIZE ? GameConfig.COLOR.GOLD : GameConfig.COLOR.TEXT_DIM,
              align: 'center' });

        this._renderSlotRow(ctx);
        UIPainter.button(ctx, this._saveBtn);
        UIPainter.button(ctx, this._loadBtn);
        UIPainter.button(ctx, this._deleteBtn);

        // Transient status message under action buttons
        if (this._statusMsg && performance.now() < this._statusMsgUntil) {
            UIPainter.text(ctx, this._statusMsg, GameConfig.VIEW_WIDTH / 2, 184,
                { font: '11px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center' });
        }

        this._renderCardList(ctx);
        UIPainter.button(ctx, this._nextBtn);
    }

    _renderSlotRow(ctx) {
        for (const r of this._slotRects) {
            const isActive = r.slot === this._activeSlot;
            const filled = !!this._slots[r.slot];
            const stroke = isActive ? GameConfig.COLOR.GOLD : 'rgba(255,255,255,0.18)';
            const fill = isActive ? 'rgba(255,209,102,0.18)' : 'rgba(28,22,52,0.92)';
            UIPainter.panel(ctx, r.x, r.y, r.w, r.h, { fill, stroke, lineWidth: isActive ? 2 : 1, radius: 6 });
            UIPainter.text(ctx, `Slot ${r.slot + 1}`, r.x + r.w / 2, r.y + 14,
                { font: 'bold 11px system-ui', align: 'center', color: GameConfig.COLOR.TEXT });
            UIPainter.text(ctx, filled ? '● saved' : 'empty', r.x + r.w / 2, r.y + 28,
                { font: '10px system-ui', align: 'center',
                  color: filled ? GameConfig.COLOR.GOLD : GameConfig.COLOR.TEXT_DIM });
        }
    }

    _renderCardList(ctx) {
        const lr = this._listRect;
        ctx.save();
        ctx.beginPath();
        ctx.rect(lr.x, lr.y, lr.w, lr.h);
        ctx.clip();

        const cols = 3, gap = 8;
        const cardW = (lr.w - (cols + 1) * gap) / cols;
        const cardH = 110;
        this._cardRects = [];
        for (let i = 0; i < this._allCards.length; i++) {
            const card = this._allCards[i];
            const c = i % cols, r = Math.floor(i / cols);
            const x = lr.x + gap + c * (cardW + gap);
            const y = lr.y + gap + r * (cardH + gap) - this._scrollY;
            const rect = { x, y, w: cardW, h: cardH, cardId: card.id };
            this._cardRects.push(rect);
            if (y + cardH < lr.y || y > lr.y + lr.h) continue; // cull
            this._drawCardTile(ctx, rect, card);
        }
        const totalRows = Math.ceil(this._allCards.length / cols);
        const contentH = gap + totalRows * (cardH + gap);
        this._maxScroll = Math.max(0, contentH - lr.h);
        ctx.restore();

        // border
        UIPainter.panel(ctx, lr.x, lr.y, lr.w, lr.h, { fill: 'rgba(0,0,0,0)', stroke: 'rgba(255,255,255,0.12)' });
    }

    _drawCardTile(ctx, rect, card) {
        const isSel = this._selected.has(card.id);
        const rarity = CardArt.rarityStyle(card.rarity);
        UIPainter.panel(ctx, rect.x, rect.y, rect.w, rect.h, {
            fill: isSel ? 'rgba(255,209,102,0.18)' : 'rgba(28,22,52,0.92)',
            stroke: isSel ? GameConfig.COLOR.GOLD : rarity.stroke,
            lineWidth: isSel ? 2 : 1, radius: 6
        });

        // Portrait top-left (sprite for summons, fxColor disc for spells)
        const portraitSize = 48;
        const px = rect.x + 6;
        const py = rect.y + 6;
        UIPainter.panel(ctx, px, py, portraitSize, portraitSize, {
            fill: 'rgba(0,0,0,0.35)', stroke: 'rgba(0,0,0,0)', radius: 5
        });
        const sheetId = CardArt.cardSheetId(card);
        const sheet = sheetId ? this._game.assets.peekSheet(sheetId) : null;
        if (!UIPainter.spriteFrame(ctx, sheet, 0, px + 1, py + 1, portraitSize - 2, portraitSize - 2)) {
            const color = card.spell?.fxColor ?? '#9be3ff';
            ctx.save();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(px + portraitSize / 2, py + portraitSize / 2, portraitSize / 2 - 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Mana gem on portrait top-left corner (frees the whole name row)
        this._drawCostGem(ctx, px + 2, py + 2, card.cost);

        // Right column: name + kind, full width
        const tx = px + portraitSize + 6;
        const tw = rect.x + rect.w - tx - 4;
        UIPainter.text(ctx, this._fitText(card.name, tw, 9), tx, py + 8,
            { font: 'bold 11px system-ui', align: 'left', color: GameConfig.COLOR.TEXT });
        UIPainter.text(ctx, card.kind.toUpperCase(), tx, py + 26,
            { font: '9px system-ui', color: rarity.stroke, align: 'left' });

        // Description below the portrait, 3 lines max
        const lines = this._wrap(card.description ?? '', Math.floor(rect.w / 7) - 1, 3);
        let y = py + portraitSize + 8;
        for (const ln of lines) {
            UIPainter.text(ctx, ln, rect.x + rect.w / 2, y,
                { font: '9px system-ui', color: GameConfig.COLOR.TEXT_DIM, align: 'center' });
            y += 11;
        }
    }

    _drawCostGem(ctx, x, y, cost) {
        const r = 10;
        const cx = x + r;
        const cy = y + r;
        ctx.save();
        ctx.fillStyle = GameConfig.COLOR.MANA;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        UIPainter.text(ctx, `${cost}`, cx, cy + 4,
            { font: 'bold 12px system-ui', color: '#fff', align: 'center' });
    }

    _fitText(s, maxWidthPx, charPx) {
        const maxChars = Math.max(3, Math.floor(maxWidthPx / charPx));
        return s.length <= maxChars ? s : s.slice(0, Math.max(1, maxChars - 1)) + '\u2026';
    }

    _wrap(text, maxChars, maxLines) {
        const words = text.split(' ');
        const lines = [];
        let line = '';
        for (const w of words) {
            const test = line ? `${line} ${w}` : w;
            if (test.length > maxChars) {
                if (line) lines.push(line);
                line = w;
                if (lines.length >= maxLines) break;
            } else {
                line = test;
            }
        }
        if (line && lines.length < maxLines) lines.push(line);
        return lines.slice(0, maxLines);
    }
}
