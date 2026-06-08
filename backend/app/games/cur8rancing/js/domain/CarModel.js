/**
 * Immutable data holder for one car. Pure data, no behavior (SRP):
 * it describes how a car performs and which 3D model represents it.
 */
export class CarModel {
    /**
     * @param {object} data
     * @param {string} data.id            unique car id
     * @param {string} data.name          display name
     * @param {string} data.modelUrl      path to the .glb model (relative to game root)
     * @param {number} data.color         hex tint used for HUD / shadow / fallback
     * @param {number} data.maxSpeed      top speed on tarmac (world u/s)
     * @param {number} data.acceleration  nominal acceleration (world u/s^2)
     * @param {number} data.grip          cornering grip, 0..1
     * @param {number} data.mass          mass in kg (affects acceleration)
     * @param {number} [data.modelYaw]    extra yaw applied to align the model's front to +Z
     */
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.modelUrl = data.modelUrl;
        this.color = data.color;
        this.maxSpeed = data.maxSpeed;
        this.acceleration = data.acceleration;
        this.grip = data.grip;
        this.mass = data.mass;
        this.modelYaw = data.modelYaw ?? 0;
        Object.freeze(this);
    }

    /**
     * Normalized stat (0..1) for HUD bars.
     * @param {'speed'|'accel'|'grip'} key
     * @returns {number}
     */
    statRatio(key) {
        switch (key) {
            case 'speed': return this.maxSpeed / 70;
            case 'accel': return this.acceleration / 40;
            case 'grip':  return this.grip;
            default:      return 0;
        }
    }
}
