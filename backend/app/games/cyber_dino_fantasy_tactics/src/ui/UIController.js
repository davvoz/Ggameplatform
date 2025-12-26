import { Affinity, Rarity, ItemType } from "../core/Enums.js";
import { BattlefieldRenderer } from "../rendering/BattlefieldRenderer.js";

export class UIController {
  constructor({
    game,
    hudPlayer,
    hudEnemy,
    logContainer,
    controlsContainer,
    modalRoot,
  }) {
    this.game = game;
    this.hudPlayer = hudPlayer;
    this.hudEnemy = hudEnemy;
    this.logContainer = logContainer;
    this.controlsContainer = controlsContainer;
    this.modalRoot = modalRoot;
    this.fxLayer = document.getElementById("fx-layer");

    this.battlefield = document.getElementById("battlefield");
    
    // Canvas-based battlefield renderer
    this.battlefieldCanvas = document.getElementById("battlefield-canvas");
    this.battlefieldRenderer = null;
    
    // Initialize canvas renderer if available
    if (this.battlefieldCanvas) {
      this.battlefieldRenderer = new BattlefieldRenderer(this.battlefieldCanvas);
      // Handle resize
      window.addEventListener('resize', () => {
        if (this.battlefieldRenderer) {
          this.battlefieldRenderer.resize();
        }
      });
    }

    this.unsubscribeFns = [];
  }

  init() {
    this.buildHUD();
    this.buildControls();
    this.bindEvents();
    this.renderAll();
    this.openAffinityModal();
    
    // Start battlefield renderer and initialize sprites immediately
    if (this.battlefieldRenderer) {
      this.battlefieldRenderer.start();
      this.initBattlefieldSprites();
    }
  }

  bindEvents() {
    const { eventBus } = this.game;
    this.unsubscribeFns.push(
      eventBus.on("log", (payload) => this.appendLog(payload)),
      eventBus.on("turn:start", () => this.renderAll()),
      eventBus.on("turn:end", () => this.renderAll()),
      eventBus.on("combat:basicHit", (payload) => {
        if (!payload) return;
        this.playHitAnim(payload.defender);
        this.playAttackAnim(payload.attacker);
        if (payload.amount && this.fxLayer) {
          this.spawnFloatingText({
            character: payload.defender,
            text: `-${payload.amount}`,
            type: payload.isCrit ? "crit" : "damage",
          });
        }
      }),
      eventBus.on("combat:abilityCast", (payload) => {
        if (!payload) return;
        this.playCastAnim(payload.actor);
      }),
      eventBus.on("character:dead", (payload) => {
        if (payload?.character) {
          this.playDeathAnim(payload.character);
          if (payload.character.isPlayer) {
            setTimeout(() => this.openGameOverModal(), 1200);
          } else {
            // Enemy died - play victory animation for player
            setTimeout(() => {
              if (this.battlefieldRenderer && this.game.player?.isAlive()) {
                this.battlefieldRenderer.playVictory(true);
              }
            }, 800);
          }
        }
      }),
      eventBus.on("enemy:spawned", () => {
        this.renderAll();
        this.initBattlefieldSprites();
        this.appendLog({
          type: "system",
          text: "Un nuovo nemico entra in scena.",
        });
      })
    );
  }

  destroy() {
    this.unsubscribeFns.forEach((fn) => fn());
    this.unsubscribeFns = [];
    if (this.battlefieldRenderer) {
      this.battlefieldRenderer.destroy();
    }
  }

  appendLog({ type, text }) {
    const line = document.createElement("div");
    line.className = `log-line ${type}`;
    line.textContent = text;
    this.logContainer.prepend(line);
    const maxLines = 40;
    while (this.logContainer.children.length > maxLines) {
      this.logContainer.removeChild(
        this.logContainer.lastElementChild
      );
    }
  }

  // ========================================================================
  // SPRITE ANIMATION METHODS - Using Canvas-based BattlefieldRenderer
  // ========================================================================

  initBattlefieldSprites() {
    if (!this.battlefieldRenderer) return;
    
    if (this.game.player) {
      this.battlefieldRenderer.initPlayerSprite(this.game.player);
    }
    if (this.game.enemy) {
      this.battlefieldRenderer.initEnemySprite(this.game.enemy);
    }
  }

  playHitAnim(character) {
    // HUD animation
    const hud = this.getHudForCharacter(character);
    if (hud) {
      hud.classList.remove("hit-anim");
      void hud.offsetHeight;
      hud.classList.add("hit-anim");
      setTimeout(() => hud.classList.remove("hit-anim"), 260);
    }

    // Canvas sprite animation
    if (this.battlefieldRenderer) {
      this.battlefieldRenderer.playHit(character?.isPlayer);
    }
  }

  playCastAnim(character) {
    // HUD animation
    const hud = this.getHudForCharacter(character);
    if (hud) {
      hud.classList.remove("cast-anim");
      void hud.offsetHeight;
      hud.classList.add("cast-anim");
      setTimeout(() => hud.classList.remove("cast-anim"), 340);
    }

    // Canvas sprite animation
    if (this.battlefieldRenderer) {
      this.battlefieldRenderer.playCast(character?.isPlayer);
    }
  }

  playAttackAnim(character) {
    // Canvas sprite animation
    if (this.battlefieldRenderer) {
      this.battlefieldRenderer.playAttack(character?.isPlayer);
    }
  }

  playDeathAnim(character) {
    // Canvas sprite animation
    if (this.battlefieldRenderer) {
      this.battlefieldRenderer.playDeath(character?.isPlayer);
    }
  }

  playGuardAnim(character) {
    // Canvas sprite animation
    if (this.battlefieldRenderer) {
      this.battlefieldRenderer.playGuard(character?.isPlayer);
    }
  }

  spawnFloatingText({ character, text, type }) {
    if (!this.fxLayer) return;
    const el = document.createElement("div");
    el.className = "floating-text";
    if (type === "heal") el.classList.add("heal");
    if (type === "crit") el.classList.add("crit");
    el.textContent = text;

    // Position based on battlefield canvas position
    const isPlayer = character?.isPlayer;
    const xPercent = isPlayer ? 25 : 75;
    const yPercent = 40;
    el.style.left = `${xPercent}%`;
    el.style.bottom = `${yPercent}%`;

    this.fxLayer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode === this.fxLayer) {
        this.fxLayer.removeChild(el);
      }
    }, 750);
  }

  buildHUD() {
    this.hudPlayer.innerHTML = "";
    this.hudEnemy.innerHTML = "";
  }

  getHudForCharacter(character) {
    if (!character) return null;
    return character.isPlayer ? this.hudPlayer : this.hudEnemy;
  }

  renderHUDBox(container, character, label) {
    if (!character) {
      container.textContent = "";
      return;
    }
    const stats = character.getTotalStats();
    const hp = character.currentHealth;
    const mp = character.currentMana;
    const en = character.currentEnergy;
    const sh = character.currentShield;

    container.innerHTML = `
      <div class="label-row">
        <span style="font-weight:600">${label}</span>
        <span style="font-size:10px;opacity:.7">Lv ${character.level}</span>
      </div>
      <div style="font-size:11px;margin-top:2px">${character.name}</div>

      <div style="margin-top:2px;font-size:10px;opacity:.85;display:flex;justify-content:space-between">
        <span>${character.isPlayer ? "Crediti" : "Focus"}</span>
        <span>${character.isPlayer ? (character.credits ?? 0) : ""}</span>
      </div>

      <div style="margin-top:4px;display:flex;flex-direction:column;gap:3px">
        <div>
          <div class="label-row"><span>HP</span><span>${Math.round(
            hp
          )}/${Math.round(stats.maxHealth)}</span></div>
          <div class="bar"><div class="bar-fill hp" style="transform:scaleX(${
            stats.maxHealth ? hp / stats.maxHealth : 0
          })"></div></div>
        </div>

        <div>
          <div class="label-row"><span>Mana</span><span>${Math.round(
            mp
          )}/${Math.round(stats.maxMana)}</span></div>
          <div class="bar"><div class="bar-fill mana" style="transform:scaleX(${
            stats.maxMana ? mp / stats.maxMana : 0
          })"></div></div>
        </div>

        <div>
          <div class="label-row"><span>Energia</span><span>${Math.round(
            en
          )}/${Math.round(stats.maxEnergy)}</span></div>
          <div class="bar"><div class="bar-fill energy" style="transform:scaleX(${
            stats.maxEnergy ? en / stats.maxEnergy : 0
          })"></div></div>
        </div>

        <div class="label-row" style="margin-top:2px;font-size:10px;opacity:.8">
          <span>ATK ${Math.round(
            stats.attackPower
          )} • MAG ${Math.round(stats.magicPower)} • TEC ${Math.round(
      stats.techPower
    )}</span>
          <span>ARM ${Math.round(stats.armor)}</span>
        </div>
      </div>
    `;

    const affinityRow = document.createElement("div");
    affinityRow.className = "affinity-row";

    const affs = character.affinities || {};
    const keys = [Affinity.ARCANE, Affinity.TECH, Affinity.PRIMAL];
    for (const key of keys) {
      const v = affs[key] ?? 0;
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = `${key}: ${(v * 100).toFixed(0)}%`;
      affinityRow.appendChild(chip);
    }
    container.appendChild(affinityRow);
  }

  buildControls() {
    this.controlsContainer.innerHTML = "";

    const btnAttack = this.makeButton("Attacco", "btn-primary");
    btnAttack.dataset.icon = "⚔";
    btnAttack.onclick = () => {
      this.game.playerBasicAttack();
      this.renderAll();
    };

    const iconByCategory = {
      ATTACK: "✦",
      DEFENSE: "⛨",
      SUPPORT: "✚",
      CONTROL: "⌖",
      SUMMON: "◈",
      MOVEMENT: "➤",
    };

    const abilityButtons = this.game.player.abilities.map((ability, idx) => {
      const btn = this.makeButton(ability.name);
      const icon = iconByCategory[ability.category] || "✦";
      btn.dataset.icon = icon;
      if (ability.affinity) {
        btn.dataset.affinity = ability.affinity;
      }
      btn.onclick = () => {
        this.game.playerUseAbility(idx);
        this.renderAll();
      };
      btn.dataset.abilityIndex = String(idx);
      return btn;
    });

    const btnLoadout = this.makeButton("Build", "");
    btnLoadout.onclick = () => this.openAffinityModal();

    const btnShop = this.makeButton("Shop", "");
    btnShop.onclick = () => this.openShopModal();

    const btnRestart = this.makeButton("Restart", "");
    btnRestart.onclick = () => {
      // reset game state and UI similar to Game Over retry
      this.modalRoot.innerHTML = "";
      this.logContainer.innerHTML = "";
      this.game.startNewRun();
      this.buildControls();
      this.renderAll();
    };

    const allButtons = [btnAttack, ...abilityButtons, btnLoadout, btnShop, btnRestart];
    for (const btn of allButtons) {
      this.controlsContainer.appendChild(btn);
    }
    while (this.controlsContainer.children.length < 8) {
      this.controlsContainer.appendChild(this.makeButton(""));
    }
  }

  updateAbilityButtons() {
    const buttons = Array.from(
      this.controlsContainer.querySelectorAll("[data-ability-index]")
    );
    const player = this.game.player;
    buttons.forEach((btn) => {
      const idx = Number(btn.dataset.abilityIndex);
      const ability = player.abilities[idx];
      if (!ability) return;
      const cd = player.getCooldown(ability);
      const can = player.canPayCost(ability.cost) && cd === 0;
      btn.textContent =
        cd > 0 ? `${ability.name} (${cd})` : ability.name;
      btn.classList.toggle("btn-disabled", !can);
    });
  }

  renderAll() {
    this.renderHUDBox(this.hudPlayer, this.game.player, "Tu");
    this.renderHUDBox(this.hudEnemy, this.game.enemy, "Nemico");
    this.updateAbilityButtons();
    this.renderSprites();
  }

  renderSprites() {
    // Player
    this.renderSpriteForCharacter(this.game.player, this.playerSprite);
    // Enemy
    this.renderSpriteForCharacter(this.game.enemy, this.enemySprite);
  }

  renderSpriteForCharacter(character, spriteEl) {
    if (!spriteEl) return;
    spriteEl.innerHTML = "";
    if (!character) return;

    const weapon = character.equipment?.weaponMain || null;
    const armor = character.equipment?.armorChest || null;
    const abilities = character.abilities || [];

    // Decide main weapon icon based on focus/affinity and rough type
    let weaponIcon = "⚔";
    let weaponLabel = "Melee";

    const focus = weapon?.meta?.focus || abilities[0]?.affinity || null;
    if (focus === Affinity.ARCANE) {
      weaponIcon = "✧";
      weaponLabel = "Arcane";
    } else if (focus === Affinity.TECH) {
      weaponIcon = "✦";
      weaponLabel = "Tech";
    } else if (focus === Affinity.PRIMAL) {
      weaponIcon = "🦖";
      weaponLabel = "Primal";
    }

    // Map ability categories to icons
    const iconByCategory = {
      ATTACK: "⚔",
      DEFENSE: "⛨",
      SUPPORT: "✚",
      CONTROL: "⌖",
      SUMMON: "◈",
      MOVEMENT: "➤",
    };

    const abilityIcons = abilities
      .slice(0, 3)
      .map((a) => iconByCategory[a.category] || "✦");

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";

    const core = document.createElement("div");
    core.textContent = weaponIcon;
    core.style.fontSize = "26px";
    core.style.filter = "drop-shadow(0 0 4px rgba(0,0,0,0.6))";

    const weaponText = document.createElement("div");
    weaponText.textContent = weapon ? weapon.name : weaponLabel;
    weaponText.style.fontSize = "8px";
    weaponText.style.opacity = "0.85";
    weaponText.style.marginTop = "1px";
    weaponText.style.textAlign = "center";
    weaponText.style.padding = "0 2px";

    // small armor badge under weapon name, so bought armor is visible on sprite
    const armorText = document.createElement("div");
    armorText.style.fontSize = "7px";
    armorText.style.opacity = "0.8";
    armorText.style.marginTop = "0px";
    armorText.style.textAlign = "center";
    if (armor) {
      armorText.textContent = `ARM ${armor.mitigation} • ${armor.rarity}`;
    } else {
      armorText.textContent = "";
    }

    const abilitiesRow = document.createElement("div");
    abilitiesRow.style.display = "flex";
    abilitiesRow.style.gap = "2px";
    abilitiesRow.style.fontSize = "9px";
    abilitiesRow.style.marginTop = "2px";

    abilityIcons.forEach((ic) => {
      const span = document.createElement("span");
      span.textContent = ic;
      abilitiesRow.appendChild(span);
    });

    wrapper.appendChild(core);
    wrapper.appendChild(weaponText);
    if (armorText.textContent) {
      wrapper.appendChild(armorText);
    }
    if (abilityIcons.length > 0) {
      wrapper.appendChild(abilitiesRow);
    }

    spriteEl.appendChild(wrapper);
  }

  makeButton(label, extraClass = "") {
    const btn = document.createElement("button");
    btn.className = `btn ${extraClass}`.trim();
    btn.textContent = label;
    btn.type = "button";
    return btn;
  }

  openAffinityModal() {
    this.modalRoot.innerHTML = "";

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "modal";

    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<span>Build Tattica</span>`;

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "6px";

    const sliders = [
      { key: "magic", label: "Magia (Arcane)", color: "#64d2ff" },
      { key: "tech", label: "Tecnologia (Tech)", color: "#ffd60a" },
      { key: "primal", label: "Spinta Vitale (Primal)", color: "#4cd964" },
    ];

    const values = { magic: 1, tech: 1, primal: 1 };

    sliders.forEach((s) => {
      const row = document.createElement("div");
      row.className = "slider-row";
      const label = document.createElement("div");
      label.textContent = s.label;
      label.style.color = s.color;
      const input = document.createElement("input");
      input.type = "range";
      input.min = "0";
      input.max = "100";
      input.value = "33";
      input.oninput = () => {
        values[s.key] = Number(input.value) || 0.1;
        updatePreview();
      };
      row.appendChild(label);
      row.appendChild(input);
      content.appendChild(row);
    });

    const preview = document.createElement("div");
    preview.style.fontSize = "10px";
    preview.style.opacity = "0.9";
    preview.style.marginTop = "2px";
    content.appendChild(preview);

    const footer = document.createElement("div");
    footer.className = "row";

    const btnCancel = document.createElement("button");
    btnCancel.className = "btn";
    btnCancel.textContent = "Chiudi";
    btnCancel.onclick = () => {
      this.modalRoot.innerHTML = "";
    };

    const btnApply = document.createElement("button");
    btnApply.className = "btn btn-primary";
    btnApply.textContent = "Applica";
    btnApply.onclick = () => {
      // preserve current credits when changing build
      const existingCredits = this.game.player ? this.game.player.credits : 100;
      this.game.createPlayer(values);
      this.game.player.credits = existingCredits;
      this.buildControls();
      this.renderAll();
      
      // Update player sprite based on new affinities
      this.initBattlefieldSprites();
      
      this.appendLog({
        type: "system",
        text: "Nuova build applicata.",
      });
      this.modalRoot.innerHTML = "";
    };

    footer.appendChild(btnCancel);
    footer.appendChild(btnApply);

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);

    this.modalRoot.appendChild(backdrop);
    this.modalRoot.appendChild(modal);

    const updatePreview = () => {
      const total = values.magic + values.tech + values.primal || 1;
      preview.innerHTML = `
        <div class="tag-list">
          <span class="chip chip-primary">Arcane: ${Math.round(
            (values.magic / total) * 100
          )}%</span>
          <span class="chip chip-primary">Tech: ${Math.round(
            (values.tech / total) * 100
          )}%</span>
          <span class="chip chip-primary">Primal: ${Math.round(
            (values.primal / total) * 100
          )}%</span>
        </div>
      `;
    };

    updatePreview();
  }

  openShopModal() {
    this.modalRoot.innerHTML = "";
    const player = this.game.player;
    if (!player) return;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "modal modal-full";

    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<span>Shop</span><span style="font-size:11px;opacity:.8">Crediti: ${
      player.credits ?? 0
    }</span>`;

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "6px";
    content.style.flex = "1";
    content.style.overflowY = "auto";

    // prepara offerte per tutte le classi: magica (ARCANE), cyber (TECH), bio (PRIMAL)
    const level = player.level || 1;
    const focuses = [Affinity.ARCANE, Affinity.TECH, Affinity.PRIMAL];

    const offers = [];
    focuses.forEach((focus) => {
      // arma e armatura per ogni focus
      offers.push(this.game.generator.generateWeapon({ level, focus }));
      offers.push(this.game.generator.generateArmor({ level, focus }));
    });
    // aggiungi alcune pozioni / consumabili generici
    for (let i = 0; i < 3; i++) {
      offers.push(this.game.generator.generateConsumable({ level }));
    }

    const priceForRarity = (rarity, type) => {
      // le pozioni costano un po' meno
      if (type === ItemType.CONSUMABLE) {
        switch (rarity) {
          case Rarity.LEGENDARY:
            return 120;
          case Rarity.EPIC:
            return 90;
          case Rarity.RARE:
            return 60;
          default:
            return 40;
        }
      }
      switch (rarity) {
        case Rarity.LEGENDARY:
          return 220;
        case Rarity.EPIC:
          return 160;
        case Rarity.RARE:
          return 100;
        default:
          return 60;
      }
    };

    const affinityLabel = (focus) => {
      if (focus === Affinity.ARCANE) return "Magico";
      if (focus === Affinity.TECH) return "Cyber";
      if (focus === Affinity.PRIMAL) return "Bio";
      return "";
    };

    const affinityColor = (focus) => {
      if (focus === Affinity.ARCANE) return "#64d2ff";
      if (focus === Affinity.TECH) return "#ffd60a";
      if (focus === Affinity.PRIMAL) return "#4cd964";
      return "#ffffff";
    };

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "4px";

    offers.forEach((item) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.fontSize = "10px";
      row.style.gap = "4px";

      const info = document.createElement("div");
      info.style.display = "flex";
      info.style.flexDirection = "column";
      info.style.gap = "2px";

      const titleRow = document.createElement("div");
      titleRow.style.display = "flex";
      titleRow.style.alignItems = "center";
      titleRow.style.gap = "4px";

      const title = document.createElement("div");
      title.textContent = item.name;
      title.style.fontSize = "11px";

      const raritySpan = document.createElement("span");
      raritySpan.textContent = item.rarity;
      raritySpan.className = "chip";
      raritySpan.style.marginRight = "2px";

      const affinitySpan = document.createElement("span");
      affinitySpan.className = "chip";
      const focus = item.meta?.focus;
      if (focus) {
        affinitySpan.textContent = affinityLabel(focus);
        affinitySpan.style.borderColor = affinityColor(focus);
        affinitySpan.style.color = affinityColor(focus);
      } else if (item.type === ItemType.CONSUMABLE) {
        affinitySpan.textContent = "Pozione";
        affinitySpan.style.borderColor = "#4cd964";
        affinitySpan.style.color = "#4cd964";
      } else {
        affinitySpan.textContent = "Ibrido";
      }

      titleRow.appendChild(title);
      titleRow.appendChild(raritySpan);
      titleRow.appendChild(affinitySpan);

      const desc = document.createElement("div");
      desc.style.opacity = "0.8";
      desc.textContent = item.description || "";

      const metaLine = document.createElement("div");
      metaLine.style.opacity = "0.8";

      if (item.type === ItemType.WEAPON) {
        metaLine.textContent = `DMG ${item.baseDamage}`;
      } else if (item.type === ItemType.ARMOR) {
        metaLine.textContent = `ARM ${item.mitigation}`;
      } else {
        metaLine.textContent = "Consumabile (cura immediata)";
      }

      info.appendChild(titleRow);
      info.appendChild(metaLine);
      if (desc.textContent) {
        info.appendChild(desc);
      }

      const price = priceForRarity(item.rarity, item.type) + level * 8;
      item.meta = item.meta || {};
      item.meta.price = price;

      const btnBuy = document.createElement("button");
      btnBuy.className = "btn btn-primary";
      btnBuy.style.minWidth = "70px";
      btnBuy.textContent = `${price} C`;
      btnBuy.onclick = () => {
        if ((player.credits ?? 0) < price) {
          this.appendLog({
            type: "system",
            text: "Non hai abbastanza crediti.",
          });
          return;
        }
        player.credits -= price;
        player.inventory.push(item);

        // auto-equip su slot base (sempre aggiorna arma/armatura per riflettersi sullo sprite)
        if (item.type === ItemType.WEAPON) {
          player.equipment.weaponMain = item;
        } else if (item.type === ItemType.ARMOR) {
          player.equipment.armorChest = item;
        }

        // le pozioni applicano subito l'effetto
        if (item.type === ItemType.CONSUMABLE && typeof item.effect === "function") {
          item.effect({
            target: player,
            log: (text) =>
              this.game.eventBus.emit("log", {
                type: "heal",
                text,
              }),
          });

          if (typeof item.charges === "number") {
            item.charges -= 1;
            if (item.charges <= 0) {
              const idxInInventory = player.inventory.indexOf(item);
              if (idxInInventory >= 0) {
                player.inventory.splice(idxInInventory, 1);
              }
            }
          }
        }

        this.appendLog({
          type: "system",
          text: `Hai comprato ${item.name}.`,
        });
        this.renderAll();
        this.modalRoot.innerHTML = "";
      };

      row.appendChild(info);
      row.appendChild(btnBuy);
      list.appendChild(row);
    });

    content.appendChild(list);

    const footer = document.createElement("div");
    footer.className = "row";

    const btnClose = document.createElement("button");
    btnClose.className = "btn";
    btnClose.textContent = "Chiudi";
    btnClose.onclick = () => {
      this.modalRoot.innerHTML = "";
    };

    footer.appendChild(btnClose);

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);

    this.modalRoot.appendChild(backdrop);
    this.modalRoot.appendChild(modal);
  }

  openGameOverModal() {
    this.modalRoot.innerHTML = "";

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "modal";

    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<span style="color:#ff6b6b;font-weight:600">Game Over</span>`;

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "6px";
    content.style.fontSize = "11px";

    const msg = document.createElement("div");
    msg.textContent = "Sei caduto nel Nexus. Vuoi ritentare la run?";
    msg.style.opacity = "0.9";

    content.appendChild(msg);

    const footer = document.createElement("div");
    footer.className = "row";

    const btnQuit = document.createElement("button");
    btnQuit.className = "btn";
    btnQuit.textContent = "Chiudi";
    btnQuit.onclick = () => {
      this.modalRoot.innerHTML = "";
    };

    const btnRetry = document.createElement("button");
    btnRetry.className = "btn btn-primary";
    btnRetry.textContent = "Retry";
    btnRetry.onclick = () => {
      // reset UI & game state
      this.modalRoot.innerHTML = "";
      this.logContainer.innerHTML = "";
      this.game.startNewRun();
      this.buildControls();
      this.renderAll();
    };

    footer.appendChild(btnQuit);
    footer.appendChild(btnRetry);

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);

    this.modalRoot.appendChild(backdrop);
    this.modalRoot.appendChild(modal);
  }
}