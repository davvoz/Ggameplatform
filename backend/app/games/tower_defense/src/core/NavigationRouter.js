export class NavigationRouter {
  constructor({ uiManager, startGame }) {
    this.uiManager = uiManager;
    this.startGame = startGame;
  }

  showMainMenu() {
    this.uiManager.showMainMenu(() => {
      this.startGame();
    });
  }
}

