import { Game } from "./systems/Game.js";
import { UIController } from "./ui/UIController.js";

const appRoot = document.getElementById("app");
const hudPlayer = document.getElementById("player-hud");
const hudEnemy = document.getElementById("enemy-hud");
const logContainer = document.getElementById("log-inner");
const controlsContainer = document.getElementById("controls");
const modalRoot = document.getElementById("modal-root");

const game = new Game();
const ui = new UIController({
  game,
  hudPlayer,
  hudEnemy,
  logContainer,
  controlsContainer,
  modalRoot,
});

game.startNewRun();
ui.init();