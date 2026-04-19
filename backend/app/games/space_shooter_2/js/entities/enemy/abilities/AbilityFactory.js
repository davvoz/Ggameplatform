// ============================================================
//  AbilityFactory — creates BossAbility instances from config
// ============================================================
import PeriodicToggleAbility from './PeriodicToggleAbility.js';
import PeriodicActionAbility from './PeriodicActionAbility.js';
import ModeSwitchAbility from './ModeSwitchAbility.js';
import HPThresholdAbility from './HPThresholdAbility.js';
import PartReviveAbility from './PartReviveAbility.js';
import DamageBalanceAbility from './DamageBalanceAbility.js';

const ABILITY_TYPES = {
    periodicToggle: PeriodicToggleAbility,
    periodicAction: PeriodicActionAbility,
    modeSwitch:     ModeSwitchAbility,
    hpThreshold:    HPThresholdAbility,
    partRevive:     PartReviveAbility,
    damageBalance:  DamageBalanceAbility
};

const AbilityFactory = {
    create(config) {
        if (!config?.type) return null;
        const AbilityClass = ABILITY_TYPES[config.type];
        if (!AbilityClass) {
            console.warn(`Unknown ability type: ${config.type}`);
            return null;
        }
        return new AbilityClass(config);
    }
};

export default AbilityFactory;
