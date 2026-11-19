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
    /**
     * XENO WASTES: a hostile world under a blood-red sky, a ringed gas giant
     * hanging over it, a small white sun. Basalt spires veined with magma,
     * hive lights glowing in the near ones. Its roads cross the abyss on
     * pillars of rock, a sea of magma far below (`abyss`, render/road/abyss.js),
     * with striped ramps before the gaps (`road.ramp`).
     */
    xeno: {
        sky: ['#06020a', '#0e0312', '#19051a', '#28081f', '#3c0c24', '#541226', '#701a26', '#8e2622', '#b23a1e', '#d8561c'],
        fog: '#3a0e1c',
        sun: { heading: 2.3, radius: 5, core: '#f4fcff', rim: '#9ae0ff', lift: 62 },
        stars: { colors: ['#ffd8cc', '#d08a9a', '#8a4a6a', '#5a2a4a'], bright: '#fff2e8' },
        /** The gas giant: its bands top to bottom, the night side, its ring (lit, mid, shade), where it hangs. */
        planet: {
            heading: -0.75,
            radius: 24,
            bands: ['#7ae0b4', '#4ab494', '#62cca4', '#2e8a7e', '#58c09c', '#2a7470', '#46a68e'],
            night: '#14343c',
            ring: ['#f0dca0', '#b8986a', '#6e5440'],
            y: 34,
        },
        layers: [
            { kind: 'stars', factor: 0.3, lift: 8, height: 96, perPixel: 0.03 },
            { kind: 'planet', factor: 0.4, lift: 6, height: 66 },
            /** Spires: `perPixel` of them a column, `tall` their heights, `wide` their bases. */
            { kind: 'spires', look: 'far', factor: 1, lift: 0, height: 58, perPixel: 0.05, tall: [14, 54], wide: [5, 14] },
            { kind: 'spires', look: 'near', factor: 1.6, lift: -2, height: 40, perPixel: 0.035, tall: [10, 38], wide: [7, 18] },
        ],
        spires: {
            far: { body: '#2c0c24', lit: '#4e1a36', base: '#220a1e', vein: '#b82c1c', veins: 0.5 },
            near: { body: '#130410', lit: '#2c0c20', base: '#0e030b', vein: '#ff5a1a', veins: 0.35, eyes: '#b8ff3a' },
        },
        road: {
            grass: ['#2a1230', '#25102a'],
            rumble: ['#b8ff3a', '#1a0c1e'],
            asphalt: ['#3c3246', '#372d40'],
            lane: '#b8ff3a',
            start: '#efe6ff',
            /** A ramp before a gap: yellow and black stripes, a segment each. */
            ramp: ['#ffc81a', '#1c1018'],
        },
        abyss: {
            /** The floor far below: crust (dark, plain, rims), magma, white-hot. */
            floor: ['#16060e', '#2c0c16', '#5e1c16', '#ff5a14', '#ffe066'],
            /** What the depths fade into. */
            haze: '#4a1024',
            /** Rock walls and pillars: lit, face, strata, shade. */
            rock: ['#6a4c72', '#3e2a4a', '#33233f', '#170e1f'],
            glow: '#ff4a1a',
            /** The floor clears from this far (world units) and is lost in the haze at that. */
            fog: [18000, 170000],
            /** World units a second the magma flows. */
            flow: 700,
        },
        props: {
            crystal: '#a8ff4a',
            crystalLight: '#eaffb0',
            crystalDark: '#3e8a2a',
            basalt: '#2a1028',
            basaltLight: '#4e2244',
            vein: '#ff5a1a',
            veinHot: '#ffd84a',
            stalk: '#3a1a3a',
            stalkLight: '#5e2e56',
            bulb: '#ff3a8a',
            bulbLight: '#ffb0d8',
            bone: '#e8dcc0',
            boneShade: '#a8987a',
            boneDark: '#4a3e34',
            metal: '#7a7090',
            metalDark: '#2a2236',
            hazard: '#ffc81a',
            hazardDark: '#1c1018',
            signInk: '#140c1c',
            glow: '#ff3a1a',
            glowHalo: '#ff9a4a',
            signBack: '#f2eef6',
            signArrow: '#ff3a1a',
        },
    },
    /**
     * SUNKEN CITY: a drowned metropolis on the sea floor. Light falls from the
     * surface in shafts and ripples over everything (`water`: caustics, the
     * currents' arrows, render/road/water.js); towers lean where they sank,
     * domes and windows lit by living light; the reef nearer, kelp rising;
     * shoals of fish drifting by. Roads run in glass tubes (`tube`) and over
     * the trenches (`abyss`: a dark floor, vents glowing cyan).
     */
    sunken: {
        sky: ['#5ec8d8', '#48b2cc', '#389cbe', '#2c86ae', '#24729c', '#1e628c', '#1a557e', '#174a71', '#154166', '#133a5c'],
        fog: '#123a5c',
        /** The sun seen from the floor: a pale disc high up, its edge broken by the waves; the shafts start round it. */
        sun: { heading: 0.5, radius: 9, core: '#f0fffc', rim: '#a8f4f0', lift: 0 },
        rays: { colors: ['rgba(210, 255, 250, 0.24)', 'rgba(170, 240, 240, 0.15)', 'rgba(140, 220, 235, 0.08)'], slant: 0.22 },
        ruins: { body: '#0f3248', edge: '#1f4c64', windows: ['#5af0e0', '#9affff', '#3ab8d0'], lit: 0.2, coral: ['#ff6a7a', '#ffa04a', '#c86ad8'] },
        reef: { body: '#0a2638', coral: ['#ff6a7a', '#ffa04a', '#c86ad8', '#ffd86a'], kelp: '#1e5a46', kelpLight: '#2e7a5a', glow: '#6affe8' },
        fish: { body: '#a8d8e4', fin: '#6a9aaa', eye: '#0a1a24' },
        layers: [
            /** Shafts of light from the surface, pulsing as the waves pass over. */
            { kind: 'rays', factor: 0.25, lift: 18, height: 104, count: 24, pulse: { rate: 0.7, depth: 0.35 } },
            { kind: 'fish', factor: 0.5, lift: 34, height: 40, shoals: 9, drift: 5 },
            { kind: 'ruins', factor: 1, lift: 0, height: 66, tall: [14, 60], wide: [7, 18] },
            { kind: 'reef', factor: 1.6, lift: -2, height: 44, kelpTall: [14, 40] },
        ],
        road: {
            grass: ['#4c7676', '#477070'],
            rumble: ['#e8f4f0', '#ff6a7a'],
            asphalt: ['#2e4656', '#2a4252'],
            lane: '#7af0e8',
            start: '#e8f4f0',
        },
        /** The light from the surface and the currents' arrows (render/road/water.js). */
        water: { light: '#9afff0', strength: 0.42, reach: 9000, drift: [160, 110], streak: '#e8fffa', flow: 1600 },
        tube: { ring: '#1e3440', ringLight: '#8ab8c8', shine: 'rgba(220, 255, 255, 0.5)', glass: 'rgba(110, 220, 255, 0.07)', collar: '#30485a' },
        abyss: {
            floor: ['#020a14', '#061628', '#0c2438', '#2ad8c8', '#d0fff8'],
            haze: '#0a2840',
            rock: ['#3a6878', '#22485a', '#1c3e50', '#0a1e2c'],
            glow: '#2ad0c0',
            fog: [18000, 170000],
            flow: 160,
        },
        props: {
            coral: '#ff6a7a',
            coralLight: '#ff9aa8',
            coralTip: '#ffe0e8',
            rock: '#2e4a58',
            rockLight: '#4a6a78',
            kelp: '#2e6a4a',
            kelpLight: '#4a9a62',
            bladder: '#c8a03a',
            shell: '#c8b8d8',
            shellDark: '#7a6a9a',
            flesh: '#e88aa0',
            pearl: '#f0ffff',
            pearlGlow: '#7af0ff',
            stone: '#6a8a92',
            stoneLight: '#9ab8be',
            stoneDark: '#34505a',
            eyes: '#7affe8',
            sand: '#7a9a90',
            sandLight: '#9ab8aa',
            metal: '#4a6a72',
            metalDark: '#22383e',
            glow: '#c8fff4',
            glowHalo: '#4ae0d0',
            signBack: '#e8f4f0',
            signArrow: '#ff6a7a',
        },
    },
    /**
     * GRID VORTEX: roads of light over a dark plain ruled in neon, rolling up
     * into tubes (`vortex`: the walls' panels in bands, a ring of light every
     * few segments, the seams between the panels, a turbo strip's flashes,
     * render/road/vortex.js).
     */
    vortex: {
        sky: ['#05010c', '#0a0216', '#110320', '#19052c', '#22063a', '#2e0848', '#3e0a56', '#540e62', '#70146c', '#921c74'],
        fog: '#2a0838',
        sun: { heading: 0.2, radius: 16, core: '#ffd36a', rim: '#ff5aa8', lift: 18 },
        /** The setting sun in bands, top to bottom, and its halo (render/NeonScenery.js). */
        neonSun: { radius: 34, bands: ['#fff07a', '#ffd24a', '#ffaa3a', '#ff7a4a', '#ff4a7a', '#ff2aa8'], halo: '#4a0a5a' },
        stars: { colors: ['#ffffff', '#ff9ae8', '#9ad8ff', '#6a5aa8'], bright: '#ffffff' },
        layers: [
            { kind: 'stars', factor: 0.3, lift: 8, height: 96, perPixel: 0.05 },
            { kind: 'neonSun', factor: 0.6, lift: 4, height: 60 },
            /** Mountains drawn in light: `peaks` across a turn. */
            { kind: 'gridPeaks', look: 'far', factor: 1, lift: 0, height: 34, peaks: 26 },
            { kind: 'gridPeaks', look: 'near', factor: 1.6, lift: -2, height: 20, peaks: 30 },
        ],
        /** The mountains' bodies, their glowing crests and the lines of their wireframe, one every `every` pixels. */
        peaks: {
            far: { body: '#12052a', crest: '#ff3ad8', wire: '#3a0e5a', every: 6 },
            near: { body: '#08021a', crest: '#3af0ff', wire: '#123a5a', every: 5 },
        },
        road: {
            grass: ['#1a0a2e', '#160828'],
            rumble: ['#3af0ff', '#ff3ad8'],
            asphalt: ['#1c1838', '#191534'],
            lane: '#3af0ff',
            start: '#f0f0ff',
        },
        vortex: {
            wall: ['#241050', '#1e0c46'],
            ring: '#ff3ad8',
            seam: '#3af0ff',
            turbo: ['#ffe24a', '#ff8a1a'],
            /** The neon grid on the ground beside a flat road. */
            grid: '#5a1a8a',
        },
        props: {
            metal: '#120a22',
            metalLight: '#2a1a48',
            cyan: '#3af0ff',
            cyanDark: '#1a8aa8',
            pink: '#ff3ad8',
            pinkDark: '#a81a8a',
            white: '#f4f0ff',
            glowHalo: '#5a1a7a',
            data: '#5affb0',
            holoBack: '#1a1a48',
            holoLine: '#2a3a78',
            beam: '#b07aff',
            signBack: '#120a22',
            signArrow: '#3af0ff',
        },
    },
};
