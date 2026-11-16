/**
 * The look of a place: its sky, the layers of scenery beyond the road
 * (render/Backdrop.js paints each kind), the road's colours and the props'.
 * A world names its theme (config/Worlds.js); a new place is a new entry
 * here, with no code to change.
 *
 * `layers` go far to near; each slides `factor` times the road's turning
 * and stands `lift` pixels above the horizon.
 */
export const THEMES = {
    dusk: {
        /** Sky bands, from the top of the screen down to the horizon. */
        sky: ['#1b1440', '#24185a', '#35207a', '#4f2a8c', '#74338f', '#9c3c88', '#c84a78', '#e9606a', '#f8845c', '#ffaa5e'],
        /** Where the road fades to in the distance, and the land below the hills. */
        fog: '#5a3474',
        sun: { heading: -1.2, radius: 14, core: '#fff3b0', rim: '#ffc861', lift: 22 },
        layers: [
            { kind: 'clouds', factor: 0.5, lift: 34 },
            { kind: 'mountains', factor: 1, lift: 0 },
            { kind: 'hills', factor: 1.6, lift: -2 },
        ],
        clouds: { light: '#ffb8a0', shade: '#d77a8e' },
        mountains: { lit: '#8c4aa0', shade: '#5e3082', base: '#4a2870', snow: '#f4c8e8' },
        hills: { top: '#2e3a6e', body: '#232a58', trees: '#161a3e' },
        road: {
            grass: ['#2f6b4f', '#285e46'],
            rumble: ['#f2eef6', '#d22f4a'],
            asphalt: ['#5c5a70', '#56546a'],
            lane: '#f2eef6',
            start: '#f2eef6',
        },
        /** The props by the road (render/art/PropArt.js). */
        props: {
            trunk: '#3a2030',
            leaf: '#1f3a4a',
            leafLight: '#2f5a5a',
            rock: '#5a4a72',
            rockLight: '#7a6a96',
            rockDark: '#2a2040',
            metal: '#8a8aa8',
            metalDark: '#3a3a52',
            glow: '#fff3b0',
            glowHalo: '#ffc861',
            board: '#2a1a4e',
            boardEdge: '#f2eef6',
            boardStripe: '#d22f4a',
            boardText: '#ffd34a',
            signBack: '#f2eef6',
            signArrow: '#d22f4a',
        },
    },
    /** A city at night: stars and a full moon over two skylines of lit windows, neon by the road. */
    night: {
        sky: ['#04030c', '#070514', '#0a071c', '#0d0924', '#110b2e', '#160d38', '#1d1044', '#271452', '#351a62', '#4a2272'],
        fog: '#140e2a',
        sun: { shape: 'moon', heading: 0.9, radius: 9, core: '#f4f0dc', rim: '#d0c8b4', seas: '#dcd4c0', lift: 60 },
        stars: { colors: ['#ffffff', '#c8d0ff', '#8890c0', '#5a6094'], bright: '#ffffff' },
        layers: [
            { kind: 'stars', factor: 0.3, lift: 8, height: 96, perPixel: 0.07 },
            { kind: 'skyline', look: 'far', factor: 1, lift: 0, height: 70, tall: [16, 56], wide: [8, 20], lit: 0.22, body: true },
            { kind: 'skyline', look: 'near', factor: 1.6, lift: -2, height: 40, tall: [8, 30], wide: [10, 26], lit: 0.4 },
        ],
        tunnel: { wall: ['#34324c', '#2e2c46'], ceiling: ['#1e1c30', '#1a182c'], lamp: '#ffe9a0', face: '#1c1634' },
        city: {
            far: { body: '#1a1432', edge: '#2a2050', windows: ['#5a4a8a', '#7a5aa8', '#b08a4a'], beacon: '#ff3048' },
            near: { body: '#0f0b22', edge: '#2c2256', windows: ['#ffd36a', '#ffe8a0', '#7ad8ff', '#ff7ad8'], beacon: '#ff3048' },
        },
        road: {
            grass: ['#2c2840', '#27233a'],
            rumble: ['#d8d4e4', '#4a4466'],
            asphalt: ['#3a384e', '#353349'],
            lane: '#e8cf6a',
            start: '#f2eef6',
        },
        props: {
            metal: '#7a7a9a',
            metalDark: '#2e2c44',
            glow: '#fff6c8',
            glowHalo: '#ffcf6a',
            board: '#120a26',
            boardEdge: '#ff4ad8',
            boardStripe: '#4af0ff',
            boardText: '#ffe04a',
            signBack: '#f2eef6',
            signArrow: '#ff4ad8',
            building: '#1c1634',
            buildingEdge: '#30285a',
            window: '#ffd36a',
            windowDark: '#2a2448',
            windowCool: '#7ad8ff',
            shop: '#ff4ad8',
            shopLight: '#4af0ff',
            cone: '#ff6a1a',
            coneStripe: '#f2eef6',
            coneBase: '#2a2236',
            barrierRed: '#e8303c',
            barrierWhite: '#f2eef6',
            barrierLegs: '#3a3850',
            barrierLamp: '#ffb02a',
        },
    },
    /**
     * The polar night: an aurora rippling over snowy peaks, a small moon,
     * moonlit snow banks, an ice tunnel through the glacier. Its road can be
     * broken: patched asphalt (`patch`) and potholes (`hole`).
     */
    aurora: {
        sky: ['#03050f', '#050a1a', '#081024', '#0b1630', '#0f1d3c', '#132548', '#182e55', '#1e3a62', '#27486e', '#335878'],
        fog: '#3a5274',
        sun: { shape: 'moon', heading: -2.1, radius: 7, core: '#eef2ff', rim: '#c4cce4', seas: '#d4dcf0', lift: 52 },
        stars: { colors: ['#ffffff', '#d0f0ff', '#8aa0c8', '#5a6c94'], bright: '#ffffff' },
        /** The aurora's curtains, from their bright lower edge up to where they fade. */
        aurora: { colors: ['#e0fff2', '#86ffc8', '#44e6a4', '#22bc9c', '#1a8496', '#30508e', '#5a3a96'] },
        layers: [
            { kind: 'stars', factor: 0.3, lift: 8, height: 96, perPixel: 0.05 },
            /** Curtains drifting `drift` pixels a second and pulsing (`pulse`: how fast, how much they dim). */
            { kind: 'aurora', factor: 0.45, lift: 30, height: 44, curtains: 2, drift: 1.6, pulse: { rate: 0.9, depth: 0.3 } },
            { kind: 'mountains', factor: 1, lift: 0, snowAbove: 26, snowDepth: 9 },
            { kind: 'hills', factor: 1.6, lift: -2 },
        ],
        mountains: { lit: '#5a6c9c', shade: '#38456e', base: '#2a3458', snow: '#e4eeff' },
        hills: { top: '#e4eeff', body: '#8a9cc4', trees: '#1a2840' },
        tunnel: { wall: ['#6a9ad4', '#5c8cc6'], ceiling: ['#2a4c80', '#264674'], lamp: '#d8f8ff', face: '#a8c8f0' },
        road: {
            grass: ['#c4d2ea', '#b4c4e0'],
            rumble: ['#f2eef6', '#d22f4a'],
            asphalt: ['#454c64', '#40475e'],
            lane: '#f2eef6',
            start: '#f2eef6',
            /** Broken road: old asphalt, worn grey. */
            patch: ['#535970', '#4e546a'],
            /** A pothole: its dark floor, its far wall in the light, its near lip, and the cracks. */
            hole: { inside: '#0c0e18', wall: '#6a7494', rim: '#a8b4d0', crack: '#22263a' },
        },
        props: {
            trunk: '#3a2a2a',
            leaf: '#1e3448',
            leafLight: '#2c4a5e',
            snow: '#eef4ff',
            snowShade: '#a8bcdc',
            rock: '#4a5a7a',
            rockLight: '#6a7a9a',
            rockDark: '#232a40',
            metal: '#8a94b0',
            metalDark: '#30364c',
            glow: '#fff3c8',
            glowHalo: '#ffd36a',
            signBack: '#f2eef6',
            signArrow: '#d22f4a',
            signInk: '#140c1c',
            pole: '#ff5a2a',
            poleBand: '#1a1a2a',
            poleTop: '#ffe04a',
            cabinWall: '#7a4a32',
            cabinLog: '#4e2c1e',
            window: '#ffd36a',
            windowGlow: '#ff9a3a',
            door: '#3a2018',
            carrot: '#ff8a2a',
            coal: '#140c1c',
            scarf: '#d22f4a',
        },
    },
};
