import { GameApp } from "./core/GameApp.js";
import { GameConfig } from "./config/GameConfig.js";

const rootElement = document.getElementById("app-root");

const app = new GameApp({
  rootElement,
  config: GameConfig
});

app.start();

