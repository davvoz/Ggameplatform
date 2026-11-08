/**
 * The Supremo's birthday army. Stats only; behaviour lives in sim/enemies.
 *
 *  hp       hit points (pistol bullet = 1)
 *  w, h     hitbox
 *  points   base score before style and multiplier
 *  melee    the slipper can reach it
 *  flying   ignores gravity and ground
 *  material sound and sparks when hit: flesh | metal | wood
 *
 * The house rule of the army, so the player can read every shot:
 * standing soldiers shoot high (crouch under it), kneeling ones shoot low
 * (jump over it), anything that arcs can be outrun, anything with a red
 * glow can be shot down.
 */
export const EnemyDefs = Object.freeze({
    grunt: { hp: 3, w: 14, h: 26, points: 100, melee: true, material: 'flesh' },
    grenadier: { hp: 3, w: 14, h: 26, points: 150, melee: true, material: 'flesh' },
    shield: { hp: 4, w: 16, h: 26, points: 300, melee: true, material: 'flesh', tray: 10 },
    bazooka: { hp: 4, w: 16, h: 18, points: 200, melee: true, material: 'flesh' },
    clown: { hp: 2, w: 14, h: 26, points: 150, melee: true, material: 'flesh' },
    balloon: { hp: 2, w: 14, h: 26, points: 200, melee: true, material: 'flesh', balloons: 3 },
    drone: { hp: 3, w: 16, h: 10, points: 150, flying: true, material: 'metal' },
    gull: { hp: 1, w: 14, h: 9, points: 80, flying: true, material: 'flesh' },
    mortar: { hp: 5, w: 22, h: 20, points: 250, melee: true, material: 'flesh' },
    turret: { hp: 16, w: 22, h: 20, points: 500, material: 'metal' },
    sniper: { hp: 2, w: 14, h: 26, points: 300, melee: true, material: 'flesh' },
    guard: { hp: 8, w: 16, h: 30, points: 400, melee: true, material: 'metal' },

    // mini bosses and bosses: points are fixed, not multiplied
    panzerpig: { hp: 110, w: 62, h: 36, points: 8000, material: 'metal', boss: true, name: 'PANZERPIG' },
    torta: { hp: 300, w: 70, h: 92, points: 25000, material: 'wood', boss: true, name: 'TORTA MAXIMA' },
    gelato: { hp: 150, w: 70, h: 40, points: 10000, material: 'metal', boss: true, name: 'GELATO ASSAULT VAN' },
    pinata: { hp: 340, w: 80, h: 40, points: 30000, flying: true, material: 'wood', boss: true, name: 'PINATA CHOPPER' },
    baffone: { hp: 190, w: 30, h: 46, points: 12000, material: 'flesh', boss: true, name: 'CAPITANO BAFFONE' },
    throne: { hp: 620, w: 76, h: 104, points: 60000, material: 'metal', boss: true, name: 'THE SUPREMO' },
});
