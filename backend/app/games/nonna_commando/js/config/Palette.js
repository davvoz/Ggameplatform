/**
 * The colours of the game. One warm, dusty palette for the world, saturated
 * accents for whatever matters in a fight: Nonna's red bandana, the Supremo's
 * purple and gold army, party pink and cyan, and the magenta of enemy fire,
 * used for nothing else so a dangerous shot is always readable.
 */
export const C = Object.freeze({
    ink: '#1a0f1e',
    inkSoft: '#2e1c33',
    white: '#fff8ec',
    black: '#0d0710',

    // Nonna
    skin: '#f0b38a', skinShade: '#c97f5e', skinDark: '#8c4f3d',
    hair: '#ebe5dc', hairShade: '#b3a9a7',
    dress: '#2f2838', dressShade: '#1f1828', dressLight: '#4d4259',
    apron: '#efe3c8', apronShade: '#c8b791',
    bandana: '#e0343c', bandanaShade: '#9c1f2c',
    strap: '#6e6b2c', strapShade: '#4a481c', brass: '#f0bb4a',
    stocking: '#c9a27e', boot: '#5b3b27', bootShade: '#3b2418',
    glass: '#d8f2ff',

    // weapons
    metal: '#5d6b78', metalDark: '#343d48', metalLight: '#a3b1bd',
    wood: '#8a5a34', woodDark: '#5e3a1f', woodLight: '#b07a48',

    // the Supremo's army
    uni: '#6e3c8f', uniShade: '#4b2563', uniLight: '#9a66bb',
    gold: '#f2c14e', goldShade: '#b8862c', goldLight: '#fff0a8',
    helmet: '#55603a', helmetShade: '#3a4228',
    pink: '#ff5fa2', pinkShade: '#c23a78', cyan: '#46d3e0', cyanShade: '#2a93a8',
    yellow: '#ffd93d', yellowShade: '#d19a1c', lime: '#8be04e', orange: '#ff8f3d',
    clownWhite: '#f6efe6', clownRed: '#e8323a',

    // fire and smoke
    fireWhite: '#fff6c8', fireYellow: '#ffd23f', fireOrange: '#ff8a2b', fireRed: '#df3f2a',
    smoke: '#6b5a63', smokeLight: '#9b8b91', smokeDark: '#433740',

    // shots
    shotCore: '#fffbe0', shotGlow: '#ffb02e',
    enemyShot: '#ff2f86', enemyShotCore: '#fff0f6',

    // town at sunset
    sky0: '#ffd88a', sky1: '#ffb36b', sky2: '#f2805e', sky3: '#c4566a', sky4: '#7c3b6e', sky5: '#432a5c',
    sea: '#3d6f8f', seaLight: '#78aec0', seaDark: '#284a66',
    volcano: '#6e4a63', volcanoShade: '#523a52', volcanoFar: '#8e6178',
    stone: '#d6b28c', stoneShade: '#ae8763', stoneDark: '#7d5c45',
    plaster: '#e7c49b', plasterShade: '#bf9a75', plasterB: '#d99a80', plasterBShade: '#b07462',
    plasterC: '#e9d6a6', plasterCShade: '#c2ad7f',
    terracotta: '#c8623c', terracottaShade: '#91432a',
    shutter: '#4f7a4a', shutterShade: '#355534',
    windowDark: '#3a2a3e', lemon: '#f7e04a', leaf: '#5b8a3c', leafDark: '#3d6230',

    // harbour at night
    night0: '#0f1630', night1: '#18234a', night2: '#24346a', night3: '#33478a',
    moon: '#f6eab8', moonShade: '#d9c98e',
    water: '#183150', waterLight: '#2d5a80', waterDark: '#0e1f38',
    dock: '#6a5446', dockShade: '#4a3a33', dockLight: '#8a7260',
    concrete: '#7e7a86', concreteShade: '#5a5664',
    contRed: '#a8392f', contRedShade: '#7a2722', contBlue: '#2f5d8a', contBlueShade: '#20405f',
    contGreen: '#3f7a4a', contGreenShade: '#2b5534', contYellow: '#c9a02e', contYellowShade: '#94741e',
    lamp: '#ffe9a0',

    // palace
    marble: '#efe5d6', marbleShade: '#c8baa5', marbleDark: '#9a8b78',
    crimson: '#a3202f', crimsonShade: '#6e1220', crimsonLight: '#d0404e',
    palaceWall: '#5b2a4a', palaceWallShade: '#421d36', palaceWallLight: '#7a3c62',
    checkA: '#e9dfcf', checkB: '#3c2a3c',
});

/** Confetti, balloons and party favours cycle through these. */
export const PARTY = Object.freeze([C.pink, C.cyan, C.yellow, C.lime, C.orange]);
