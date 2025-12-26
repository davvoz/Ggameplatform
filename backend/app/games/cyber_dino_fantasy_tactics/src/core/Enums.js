export const DamageType = Object.freeze({
  PHYSICAL: "PHYSICAL",
  FIRE: "FIRE",
  ICE: "ICE",
  TOXIC: "TOXIC",
  ELECTRIC: "ELECTRIC",
  PSYCHIC: "PSYCHIC",
  VOID: "VOID",
});

export const ResourceType = Object.freeze({
  HEALTH: "HEALTH",
  MANA: "MANA",
  ENERGY: "ENERGY",
  SHIELD: "SHIELD",
});

export const ItemType = Object.freeze({
  WEAPON: "WEAPON",
  ARMOR: "ARMOR",
  IMPLANT: "IMPLANT",
  RELIC: "RELIC",
  VEHICLE: "VEHICLE",
  CONSUMABLE: "CONSUMABLE",
});

export const WeaponSlot = Object.freeze({
  MAIN_HAND: "MAIN_HAND",
  OFF_HAND: "OFF_HAND",
  TWO_HAND: "TWO_HAND",
});

export const ArmorSlot = Object.freeze({
  HEAD: "HEAD",
  CHEST: "CHEST",
  LEGS: "LEGS",
  ARMS: "ARMS",
  CORE: "CORE",
});

export const Rarity = Object.freeze({
  COMMON: "COMMON",
  RARE: "RARE",
  EPIC: "EPIC",
  LEGENDARY: "LEGENDARY",
});

export const Affinity = Object.freeze({
  ARCANE: "ARCANE", // magie fantasy
  TECH: "TECH", // tecnologia cyberpunk
  PRIMAL: "PRIMAL", // dinosauri / vita
});

export const AbilityCategory = Object.freeze({
  ATTACK: "ATTACK",
  DEFENSE: "DEFENSE",
  CONTROL: "CONTROL",
  SUMMON: "SUMMON",
  SUPPORT: "SUPPORT",
  MOVEMENT: "MOVEMENT",
});

export const TargetType = Object.freeze({
  SELF: "SELF",
  ENEMY: "ENEMY",
  ALLY: "ALLY",
  AREA: "AREA",
  GLOBAL: "GLOBAL",
});

export const TurnOwner = Object.freeze({
  PLAYER: "PLAYER",
  ENEMY: "ENEMY",
});