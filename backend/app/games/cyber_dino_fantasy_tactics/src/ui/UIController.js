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
      eventBus.on("resources:changed", () => this.renderAll()), // Update UI when resources change
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
        this.playCastAnim(payload.actor, payload.ability);
      }),
      eventBus.on("character:dead", (payload) => {
        if (payload?.character) {
          this.playDeathAnim(payload.character);
          // Update UI to show zero resources
          this.renderAll();
          if (payload.character.isPlayer) {
            setTimeout(() => {
              this.renderAll(); // Update again before modal
              this.openGameOverModal();
            }, 1200);
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
      }),
      eventBus.on("player:levelup", (payload) => {
        this.showLevelUpNotification(payload);
        this.renderAll();
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

  playCastAnim(character, ability) {
    // HUD animation
    const hud = this.getHudForCharacter(character);
    if (hud) {
      hud.classList.remove("cast-anim");
      void hud.offsetHeight;
      hud.classList.add("cast-anim");
      setTimeout(() => hud.classList.remove("cast-anim"), 340);
    }

    // Canvas sprite animation - use specific animation type from ability
    if (this.battlefieldRenderer) {
      const animType = ability?.animationType || "cast";
      this.battlefieldRenderer.playAbilityAnimation(character?.isPlayer, animType);
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
    const hp = Math.max(0, character.currentHealth);
    const mp = Math.max(0, character.currentMana);
    const en = Math.max(0, character.currentEnergy);
    const sh = Math.max(0, character.currentShield);

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

      ${
        character.isPlayer
          ? `<div style="margin-top:4px">
          <div class="label-row"><span>XP</span><span>${Math.round(
            character.xp ?? 0
          )}/${Math.round(
            this.game.levelingSystem?.getXPForLevel(character.level) ?? 100
          )}</span></div>
          <div class="bar"><div class="bar-fill xp" style="transform:scaleX(${
            this.game.levelingSystem
              ? this.game.levelingSystem.getProgressPercent(character) / 100
              : 0
          })"></div></div>
        </div>`
          : ""
      }

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

    const btnAttack = this.makeButton("Attack", "btn-primary");
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

    // Pass Turn button - allows player to skip their turn
    const btnPassTurn = this.makeButton("Passa", "btn-pass");
    btnPassTurn.dataset.icon = "⏭";
    btnPassTurn.onclick = () => {
      this.game.playerPassTurn();
      this.renderAll();
    };

    const btnRestart = this.makeButton("Restart", "");
    btnRestart.onclick = () => {
      // reset game state and UI similar to Game Over retry
      this.modalRoot.innerHTML = "";
      this.logContainer.innerHTML = "";
      this.game.startNewRun();
      this.buildControls();
      this.renderAll();
    };

    const allButtons = [btnAttack, ...abilityButtons, btnPassTurn, btnLoadout, btnShop, btnRestart];
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
    const isPlayerTurn = this.game.turnOwner === "PLAYER";
    
    buttons.forEach((btn) => {
      const idx = Number(btn.dataset.abilityIndex);
      const ability = player.abilities[idx];
      if (!ability) return;
      const cd = player.getCooldown(ability);
      const canPay = player.canPayCost(ability.cost);
      const can = canPay && cd === 0 && isPlayerTurn;
      btn.textContent =
        cd > 0 ? `${ability.name} (${cd})` : ability.name;
      btn.classList.toggle("btn-disabled", !can);
    });

    // Also disable attack button when not player turn or not enough energy
    const btnAttack = this.controlsContainer.querySelector(".btn-primary");
    if (btnAttack) {
      const stats = player.getTotalStats();
      const energyCost = Math.ceil(stats.maxEnergy * 0.15);
      const hasEnergy = player.currentEnergy >= energyCost;
      const canAttack = isPlayerTurn && hasEnergy;
      
      btnAttack.classList.toggle("btn-disabled", !canAttack);
      if (!isPlayerTurn) {
        btnAttack.textContent = "Attack (Wait...)";
      } else if (!hasEnergy) {
        btnAttack.textContent = "Attack (No Energy)";
      } else {
        btnAttack.textContent = "Attack";
      }
    }

    // Update Pass Turn button - highlight it when no other actions are available
    const btnPass = this.controlsContainer.querySelector(".btn-pass");
    if (btnPass) {
      const actions = this.game.getPlayerAvailableActions();
      const stats = player.getTotalStats();
      const energyCost = Math.ceil(stats.maxEnergy * 0.15);
      const canAttack = player.currentEnergy >= energyCost;
      const noActionsAvailable = !canAttack && !actions.canUseAbility;
      
      btnPass.classList.toggle("btn-disabled", !isPlayerTurn);
      btnPass.classList.toggle("btn-highlight", noActionsAvailable && isPlayerTurn);
      
      if (noActionsAvailable && isPlayerTurn) {
        btnPass.textContent = "⚠ End Turn";
      } else {
        btnPass.textContent = "Pass";
      }
    }
  }

  renderAll() {
    this.renderHUDBox(this.hudPlayer, this.game.player, "You");
    this.renderHUDBox(this.hudEnemy, this.game.enemy, "Enemy");
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
    header.innerHTML = `<span>Tactical Build - Distribute 5 Points</span>`;

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "12px";

    const affinities = [
      { key: "magic", label: "Magic (Arcane)", color: "#64d2ff", affinity: "ARCANE" },
      { key: "tech", label: "Technology (Tech)", color: "#ffd60a", affinity: "TECH" },
      { key: "primal", label: "Life Force (Primal)", color: "#4cd964", affinity: "PRIMAL" },
    ];

    const MAX_POINTS = 5;
    const MAX_PER_AFFINITY = 5;

    // Get current affinities from player if exists
    let initialValues = { magic: 2, tech: 2, primal: 1 }; // Default distribution
    if (this.game.player && this.game.player.affinities) {
      const playerAffinities = this.game.player.affinities;
      const total = playerAffinities.ARCANE + playerAffinities.TECH + playerAffinities.PRIMAL;
      if (total > 0) {
        // Convert normalized affinities back to step points (0-5)
        initialValues.magic = Math.round((playerAffinities.ARCANE / total) * MAX_POINTS);
        initialValues.tech = Math.round((playerAffinities.TECH / total) * MAX_POINTS);
        initialValues.primal = Math.round((playerAffinities.PRIMAL / total) * MAX_POINTS);
        
        // Adjust to ensure total is exactly MAX_POINTS
        const currentTotal = initialValues.magic + initialValues.tech + initialValues.primal;
        if (currentTotal !== MAX_POINTS) {
          const diff = MAX_POINTS - currentTotal;
          if (initialValues.magic > 0) initialValues.magic += diff;
          else if (initialValues.tech > 0) initialValues.tech += diff;
          else if (initialValues.primal > 0) initialValues.primal += diff;
        }
      }
    }

    const values = { ...initialValues };
    const buttons = { magic: {}, tech: {}, primal: {} };

    const updateUI = () => {
      const totalPoints = values.magic + values.tech + values.primal;
      const remainingPoints = MAX_POINTS - totalPoints;

      affinities.forEach((aff) => {
        const valueDisplay = buttons[aff.key].display;
        const minusBtn = buttons[aff.key].minus;
        const plusBtn = buttons[aff.key].plus;

        valueDisplay.textContent = values[aff.key];

        // Update button states
        minusBtn.disabled = values[aff.key] <= 0;
        plusBtn.disabled = remainingPoints <= 0 || values[aff.key] >= MAX_PER_AFFINITY;

        // Update visual state
        minusBtn.style.opacity = minusBtn.disabled ? "0.3" : "1";
        plusBtn.style.opacity = plusBtn.disabled ? "0.3" : "1";
      });

      // Update remaining points display
      remainingDisplay.textContent = `Remaining points: ${remainingPoints}`;
      remainingDisplay.style.color = remainingPoints === 0 ? "#4cd964" : "#ff9500";
    };

    // Create rows for each affinity
    affinities.forEach((aff) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.padding = "8px";
      row.style.background = "rgba(255, 255, 255, 0.05)";
      row.style.borderRadius = "4px";

      const label = document.createElement("div");
      label.textContent = aff.label;
      label.style.color = aff.color;
      label.style.fontWeight = "bold";
      label.style.flex = "1";

      const controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.alignItems = "center";
      controls.style.gap = "8px";

      const minusBtn = document.createElement("button");
      minusBtn.className = "btn";
      minusBtn.textContent = "−";
      minusBtn.style.width = "32px";
      minusBtn.style.height = "32px";
      minusBtn.style.padding = "0";
      minusBtn.style.fontSize = "18px";
      minusBtn.onclick = () => {
        if (values[aff.key] > 0) {
          values[aff.key]--;
          updateUI();
        }
      };

      const valueDisplay = document.createElement("div");
      valueDisplay.style.width = "80px";
      valueDisplay.style.textAlign = "center";
      valueDisplay.style.fontSize = "16px";
      valueDisplay.style.fontWeight = "bold";
      valueDisplay.style.color = aff.color;

      const plusBtn = document.createElement("button");
      plusBtn.className = "btn";
      plusBtn.textContent = "+";
      plusBtn.style.width = "32px";
      plusBtn.style.height = "32px";
      plusBtn.style.padding = "0";
      plusBtn.style.fontSize = "18px";
      plusBtn.onclick = () => {
        const totalPoints = values.magic + values.tech + values.primal;
        if (totalPoints < MAX_POINTS && values[aff.key] < MAX_PER_AFFINITY) {
          values[aff.key]++;
          updateUI();
        }
      };

      buttons[aff.key] = { minus: minusBtn, display: valueDisplay, plus: plusBtn };

      controls.appendChild(minusBtn);
      controls.appendChild(valueDisplay);
      controls.appendChild(plusBtn);

      row.appendChild(label);
      row.appendChild(controls);

      content.appendChild(row);
    });

    // Remaining points display
    const remainingDisplay = document.createElement("div");
    remainingDisplay.style.fontSize = "14px";
    remainingDisplay.style.fontWeight = "bold";
    remainingDisplay.style.textAlign = "center";
    remainingDisplay.style.padding = "8px";
    content.appendChild(remainingDisplay);

    const footer = document.createElement("div");
    footer.className = "row";

    const btnCancel = document.createElement("button");
    btnCancel.className = "btn";
    btnCancel.textContent = "Close";
    btnCancel.onclick = () => {
      this.modalRoot.innerHTML = "";
    };

    const btnApply = document.createElement("button");
    btnApply.className = "btn btn-primary";
    btnApply.textContent = "Apply";
    btnApply.onclick = () => {
      const totalPoints = values.magic + values.tech + values.primal;
      if (totalPoints !== MAX_POINTS) {
        alert(`You must distribute exactly ${MAX_POINTS} points!`);
        return;
      }

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
        text: "New build applied.",
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

    updateUI();
  }

  isItemAlreadyOwned(player, item) {
    // Check if item is already equipped
    if (item.type === ItemType.WEAPON) {
      const equipped = player.equipment.weaponMain;
      if (equipped && equipped.name === item.name && equipped.rarity === item.rarity) {
        return true;
      }
    } else if (item.type === ItemType.ARMOR) {
      const slots = ['armorHead', 'armorChest', 'armorLegs', 'armorArms', 'armorCore'];
      for (const slot of slots) {
        const equipped = player.equipment[slot];
        if (equipped && equipped.name === item.name && equipped.rarity === item.rarity) {
          return true;
        }
      }
    }
    
    // Check if item is in inventory
    return player.inventory.some(invItem => 
      invItem.name === item.name && 
      invItem.rarity === item.rarity &&
      invItem.type === item.type
    );
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
      if (focus === Affinity.ARCANE) return "Magic";
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
        affinitySpan.textContent = "Potion";
        affinitySpan.style.borderColor = "#4cd964";
        affinitySpan.style.color = "#4cd964";
      } else {
        affinitySpan.textContent = "Hybrid";
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
        metaLine.textContent = "Consumable (instant heal)";
      }

      info.appendChild(titleRow);
      info.appendChild(metaLine);
      if (desc.textContent) {
        info.appendChild(desc);
      }

      const price = priceForRarity(item.rarity, item.type) + level * 8;
      item.meta = item.meta || {};
      item.meta.price = price;

      const isOwned = this.isItemAlreadyOwned(player, item);
      const canAfford = (player.credits ?? 0) >= price;

      const btnBuy = document.createElement("button");
      btnBuy.className = isOwned ? "btn btn-disabled" : (canAfford ? "btn btn-primary" : "btn");
      btnBuy.style.minWidth = "70px";
      btnBuy.textContent = isOwned ? "Owned" : `${price} C`;
      
      if (isOwned) {
        btnBuy.style.opacity = "0.5";
        btnBuy.style.cursor = "not-allowed";
      }
      
      btnBuy.onclick = () => {
        if (isOwned) {
          this.appendLog({
            type: "system",
            text: "You already have this item.",
          });
          return;
        }
        
        if ((player.credits ?? 0) < price) {
          this.appendLog({
            type: "system",
            text: "Not enough credits.",
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

        // Refresh resources after equipping
        player.refreshResourceMaximums();

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
          text: `Purchased ${item.name}.`,
        });
        
        // Update sprites to reflect new equipment
        this.initBattlefieldSprites();
        
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
    btnClose.textContent = "Close";
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

  showLevelUpNotification({ player, levelResult }) {
    // Create a temporary notification overlay
    const notification = document.createElement("div");
    notification.style.position = "fixed";
    notification.style.top = "50%";
    notification.style.left = "50%";
    notification.style.transform = "translate(-50%, -50%) scale(0.5)";
    notification.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    notification.style.padding = "30px 40px";
    notification.style.borderRadius = "15px";
    notification.style.border = "3px solid #ffd700";
    notification.style.boxShadow = "0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(255,215,0,0.5)";
    notification.style.zIndex = "10000";
    notification.style.textAlign = "center";
    notification.style.color = "#fff";
    notification.style.opacity = "0";
    notification.style.transition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
    notification.style.pointerEvents = "none";
    
    const { newLevel, statIncreases } = levelResult;
    
    notification.innerHTML = `
      <div style="font-size: 48px; font-weight: 800; text-shadow: 0 2px 10px rgba(0,0,0,0.3); margin-bottom: 10px;">
        🎉 LEVEL UP! 🎉
      </div>
      <div style="font-size: 32px; font-weight: 600; color: #ffd700; margin-bottom: 15px;">
        Livello ${newLevel}
      </div>
      <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px;">
        ${player.name} diventa più forte!
      </div>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 15px; font-size: 12px;">
        ${statIncreases.maxHealth ? `<div style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px;">❤️ HP +${Math.floor(statIncreases.maxHealth)}</div>` : ''}
        ${statIncreases.maxMana ? `<div style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px;">💙 Mana +${Math.floor(statIncreases.maxMana)}</div>` : ''}
        ${statIncreases.maxEnergy ? `<div style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px;">⚡ Energia +${Math.floor(statIncreases.maxEnergy)}</div>` : ''}
        ${statIncreases.attackPower ? `<div style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px;">⚔️ ATK +${Math.floor(statIncreases.attackPower)}</div>` : ''}
        ${statIncreases.magicPower ? `<div style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px;">✨ MAG +${Math.floor(statIncreases.magicPower)}</div>` : ''}
        ${statIncreases.techPower ? `<div style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px;">🔧 TEC +${Math.floor(statIncreases.techPower)}</div>` : ''}
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translate(-50%, -50%) scale(1)";
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translate(-50%, -50%) scale(0.8)";
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 3000);
  }
}