/**
 * UI Component for managing tower targeting policies
 */
export class TargetingPolicyUI {
  constructor(gameApp) {
    this.gameApp = gameApp;
    this.container = null;
    this.selectedTower = null;
    this._createUI();
  }

  _createUI() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'targeting-policy-panel';
    this.container.style.cssText = `
      position: absolute;
      bottom: 180px;
      left: 20px;
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid #00ffff;
      border-radius: 8px;
      padding: 15px;
      color: white;
      font-family: 'Orbitron', monospace;
      min-width: 250px;
      display: none;
      z-index: 100;
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = '🎯 TARGETING POLICY';
    title.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #00ffff;
      text-align: center;
      border-bottom: 1px solid #00ffff;
      padding-bottom: 8px;
    `;
    this.container.appendChild(title);

    // Policy buttons container
    this.buttonsContainer = document.createElement('div');
    this.buttonsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;
    this.container.appendChild(this.buttonsContainer);

    document.body.appendChild(this.container);
  }

  show(tower) {
    this.selectedTower = tower;
    this.container.style.display = 'block';
    this._updatePolicyButtons();
  }

  hide() {
    this.container.style.display = 'none';
    this.selectedTower = null;
  }

  isVisible() {
    return this.container.style.display !== 'none';
  }

  _updatePolicyButtons() {
    if (!this.selectedTower) return;

    // Clear existing buttons
    this.buttonsContainer.innerHTML = '';

    // Get available policies
    const policies = this.selectedTower.getAvailableTargetingPolicies();
    const currentPolicy = this.selectedTower.targetingPolicy.name;

    // Create button for each policy
    for (const policyName of policies) {
      const isActive = policyName === currentPolicy;
      
      const button = document.createElement('button');
      button.textContent = this._getPolicyIcon(policyName) + ' ' + policyName;
      button.style.cssText = `
        background: ${isActive ? '#00ffff' : 'rgba(0, 255, 255, 0.2)'};
        color: ${isActive ? '#000' : '#00ffff'};
        border: 2px solid ${isActive ? '#00ffff' : 'rgba(0, 255, 255, 0.5)'};
        border-radius: 4px;
        padding: 8px 12px;
        font-family: 'Orbitron', monospace;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: ${isActive ? 'bold' : 'normal'};
      `;

      button.addEventListener('mouseenter', () => {
        if (!isActive) {
          button.style.background = 'rgba(0, 255, 255, 0.4)';
          button.style.borderColor = '#00ffff';
        }
      });

      button.addEventListener('mouseleave', () => {
        if (!isActive) {
          button.style.background = 'rgba(0, 255, 255, 0.2)';
          button.style.borderColor = 'rgba(0, 255, 255, 0.5)';
        }
      });

      button.addEventListener('click', () => {
        this._onPolicySelected(policyName);
      });

      this.buttonsContainer.appendChild(button);
    }
  }

  _getPolicyIcon(policyName) {
    const icons = {
      'Weakest': '💔',
      'Strongest': '💪',
      'Closest': '📍',
      'Nearest to Base': '🏁',
      'First': '1️⃣',
      'Last': '🔚'
    };
    return icons[policyName] || '🎯';
  }

  _onPolicySelected(policyName) {
    if (!this.selectedTower) return;

    this.selectedTower.setTargetingPolicy(policyName);
    this._updatePolicyButtons();

    // Show feedback
    this._showFeedback(`Policy changed to: ${policyName}`);
  }

  _showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.cssText = `
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 255, 255, 0.9);
      color: #000;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      animation: fadeOut 2s forwards;
    `;

    this.container.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 2000);
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    0% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  }
`;
document.head.appendChild(style);
