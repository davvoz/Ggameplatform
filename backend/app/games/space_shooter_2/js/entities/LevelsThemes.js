/**
 * Star - Parallax star field background with per-level themes
 */

import { Nebula } from "./worlds/space/Nebula.js";
    

// ===== LEVEL THEMES =====
// Each level gets a unique visual theme with colors, effects I FX
const LEVEL_THEMES = {
    // Levels 1-5: Intro sector
    deepSpace: { bg: '#06060f', stars: ['#8899bb', '#aabbdd', '#ddeeff'], nebula: ['rgba(40,50,100,1)', 'rgba(30,30,80,1)'], fx: null },
    asteroid: { bg: '#0a0808', stars: ['#aa9977', '#ccbb99', '#ffeedd'], nebula: ['rgba(80,60,30,1)', 'rgba(60,40,20,1)'], fx: 'asteroids' },
    redNebula: { bg: '#0f0508', stars: ['#cc8888', '#ffaaaa', '#ffdde0'], nebula: ['rgba(120,30,40,1)', 'rgba(80,20,40,1)', 'rgba(100,10,30,1)'], fx: null },
    swarmGreen: { bg: '#050d05', stars: ['#77bb77', '#99dd99', '#ccffcc'], nebula: ['rgba(30,80,30,1)', 'rgba(20,60,40,1)'], fx: 'spores' },
    crimson: { bg: '#100408', stars: ['#ff6666', '#ff9999', '#ffcccc'], nebula: ['rgba(140,20,30,1)', 'rgba(100,10,20,1)', 'rgba(80,5,15,1)'], fx: 'embers' },
    // Levels 6-10: Mid sector
    blueIce: { bg: '#040810', stars: ['#88bbff', '#aaddff', '#ddeeff'], nebula: ['rgba(30,60,120,1)', 'rgba(20,40,100,1)'], fx: 'ice' },
    phantom: { bg: '#08040f', stars: ['#aa77ee', '#bb99ff', '#ddccff'], nebula: ['rgba(60,20,100,1)', 'rgba(80,30,120,1)'], fx: 'shimmer' },
    sentinelBlue: { bg: '#030810', stars: ['#6688cc', '#88aaee', '#bbddff'], nebula: ['rgba(20,50,110,1)', 'rgba(30,60,130,1)'], fx: null },
    warzone: { bg: '#0c0804', stars: ['#ffaa55', '#ffcc88', '#ffeebb'], nebula: ['rgba(100,60,10,1)', 'rgba(80,40,5,1)'], fx: 'embers' },
    ironOrange: { bg: '#0d0804', stars: ['#ee9944', '#ffbb66', '#ffddaa'], nebula: ['rgba(110,50,0,1)', 'rgba(80,30,0,1)', 'rgba(60,20,0,1)'], fx: 'sparks' },
    // Levels 11-15: Advanced sector
    nebulaRun: { bg: '#060410', stars: ['#9977dd', '#bb99ff', '#ddccff'], nebula: ['rgba(70,30,120,1)', 'rgba(50,15,100,1)', 'rgba(90,40,140,1)'], fx: 'shimmer' },
    minefield: { bg: '#080604', stars: ['#ccaa44', '#ddbb66', '#eeddaa'], nebula: ['rgba(80,60,10,1)', 'rgba(60,40,5,1)'], fx: 'mines' },
    ambushDark: { bg: '#040404', stars: ['#666666', '#999999', '#cccccc'], nebula: ['rgba(30,30,30,1)', 'rgba(50,50,50,1)'], fx: 'scanlines' },
    gauntlet: { bg: '#0a0406', stars: ['#dd6688', '#ff88aa', '#ffbbcc'], nebula: ['rgba(100,20,50,1)', 'rgba(80,10,40,1)'], fx: 'embers' },
    voidPurple: { bg: '#0a0414', stars: ['#8844dd', '#aa66ff', '#cc99ff'], nebula: ['rgba(50,10,100,1)', 'rgba(70,20,130,1)', 'rgba(40,5,80,1)'], fx: 'vortex' },
    // Levels 16-20: Hard sector
    reinforced: { bg: '#080808', stars: ['#aaaacc', '#ccccee', '#eeeeff'], nebula: ['rgba(50,50,70,1)', 'rgba(40,40,60,1)'], fx: 'sparks' },
    crossfire: { bg: '#0c0404', stars: ['#ff7744', '#ffaa77', '#ffddbb'], nebula: ['rgba(120,30,10,1)', 'rgba(90,20,5,1)'], fx: 'embers' },
    siege: { bg: '#060a0c', stars: ['#66aacc', '#88ccee', '#bbddff'], nebula: ['rgba(20,60,80,1)', 'rgba(15,45,65,1)'], fx: 'sparks' },
    stormFront: { bg: '#050308', stars: ['#9988dd', '#bbaaff', '#ddccff'], nebula: ['rgba(50,30,80,1)', 'rgba(70,40,100,1)'], fx: 'lightning' },
    omegaGold: { bg: '#0c0804', stars: ['#ffcc33', '#ffdd66', '#ffeebb'], nebula: ['rgba(100,80,10,1)', 'rgba(80,60,0,1)', 'rgba(120,90,20,1)'], fx: 'embers' },
    // Levels 21-25: Endgame
    darkSector: { bg: '#020204', stars: ['#445566', '#667788', '#88aabb'], nebula: ['rgba(15,20,40,1)', 'rgba(10,15,30,1)'], fx: 'scanlines' },
    deadZone: { bg: '#030105', stars: ['#553377', '#774499', '#9966bb'], nebula: ['rgba(30,10,50,1)', 'rgba(20,5,40,1)'], fx: 'shimmer' },
    hellfire: { bg: '#100200', stars: ['#ff4400', '#ff7733', '#ffaa66'], nebula: ['rgba(150,20,0,1)', 'rgba(100,10,0,1)', 'rgba(120,30,5,1)'], fx: 'fire' },
    exodus: { bg: '#060608', stars: ['#7799bb', '#99bbdd', '#bbddff'], nebula: ['rgba(40,50,80,1)', 'rgba(30,40,70,1)'], fx: 'vortex' },
    nemesis: { bg: '#0a0004', stars: ['#dd3355', '#ff5577', '#ff88aa'], nebula: ['rgba(120,0,30,1)', 'rgba(90,0,20,1)', 'rgba(150,10,40,1)'], fx: 'embers' },
    // Levels 26-30: Final
    oblivion: { bg: '#020202', stars: ['#334455', '#556677', '#88aabb'], nebula: ['rgba(10,15,25,1)', 'rgba(8,10,20,1)'], fx: 'vortex' },
    entropy: { bg: '#060008', stars: ['#6633aa', '#8855cc', '#bb88ee'], nebula: ['rgba(40,0,60,1)', 'rgba(60,5,80,1)'], fx: 'shimmer' },
    singularity: { bg: '#000000', stars: ['#ffffff', '#ddddff', '#bbbbee'], nebula: ['rgba(0,0,0,1)', 'rgba(20,20,40,1)'], fx: 'blackhole' },
    eventHorizon: { bg: '#040204', stars: ['#ff3366', '#ff6699', '#ff99cc'], nebula: ['rgba(80,0,30,1)', 'rgba(100,5,40,1)'], fx: 'lightning' },
    apocalypse: { bg: '#0c0000', stars: ['#ff2200', '#ff6633', '#ff9966'], nebula: ['rgba(180,10,0,1)', 'rgba(130,5,0,1)', 'rgba(100,0,0,1)'], fx: 'fire' },

    // ═══════════════════════════════════════════════
    //  WORLD 2 — PLANETARY FLYOVER (Levels 31-60)
    // ═══════════════════════════════════════════════

    // ─── Planet 1: Alien Jungle (31-35) ───
    // Each level has a unique biome feel via jungleConfig
    // dist = cumulative thresholds [canopy, rock, dirt, river] — remainder = swamp
    // L31: Normal jungle — balanced mix
    jungleNormal: {
        bg: '#1f150c', stars: [], nebula: [], fx: 'jungle', jungleOverlay: true,
        jungleConfig: {
            dist: [0.50, 0.68, 0.85, 0.85], riverW: [16, 24], riverCount: 1, canopyMul: 1,
            fxN: 42, edgeN: 14, edgeReach: [25, 45], vigCol: '20,14,8'
        }
    },
    // L32: Swamp — lots of murky water puddles and mud, few trees
    jungleSwamp: {
        bg: '#121510', stars: [], nebula: [], fx: 'jungle', jungleOverlay: true,
        jungleConfig: {
            dist: [0.15, 0.20, 0.45, 0.45], riverW: [12, 20], riverCount: 1, canopyMul: 0.8,
            fxN: 48, edgeN: 8, edgeReach: [20, 35], vigCol: '15,18,10',
            edgeHue: [100, 125], edgeLit: [10, 16]
        }
    },
    // L33: Wide rivers — many wide waterways, moderate jungle
    jungleRivers: {
        bg: '#14121a', stars: [], nebula: [], fx: 'jungle', jungleOverlay: true,
        jungleConfig: {
            dist: [0.35, 0.45, 0.60, 0.60], riverW: [30, 50], riverCount: 3, canopyMul: 1,
            fxN: 42, edgeN: 10, edgeReach: [25, 40], vigCol: '12,16,18'
        }
    },
    // L34: Dense thick jungle — massive canopy coverage
    jungleDense: {
        bg: '#0e1608', stars: [], nebula: [], fx: 'jungle', jungleOverlay: true,
        jungleConfig: {
            dist: [0.74, 0.82, 0.95, 0.95], riverW: [10, 18], riverCount: 1, canopyMul: 1.35,
            fxN: 55, edgeN: 20, edgeReach: [35, 60], vigCol: '8,18,4',
            edgeHue: [105, 140], edgeLit: [12, 20]
        }
    },
    // L35: Rocky dry — many rocks, sparse trees, few thin rivers
    jungleRocky: {
        bg: '#1c1812', stars: [], nebula: [], fx: 'jungle', jungleOverlay: true,
        jungleConfig: {
            dist: [0.10, 0.65, 0.95, 0.95], riverW: [6, 10], riverCount: 0, canopyMul: 0.7,
            fxN: 38, edgeN: 5, edgeReach: [15, 30], vigCol: '22,18,12',
            edgeHue: [90, 120], edgeLit: [18, 26]
        }
    },

    // ─── Planet 2: Volcanic (36-40) ───
    // Each level has a unique volcanic biome via volcanicConfig
    // dist = cumulative thresholds [lavaRock, obsidian, ash, crater] — remainder = scorched
    // L36: Volcanic Plains — balanced volcanic terrain, moderate lava
    volcanicPlains: {
        bg: '#1a0c04', stars: [], nebula: [], fx: 'volcanic', volcanicOverlay: true,
        volcanicConfig: {
            dist: [0.40, 0.55, 0.75, 0.90], craterW: [14, 28], canyonCount: 1, lavaRockMul: 1,
            fxN: 40, edgeN: 12, edgeReach: [25, 45], vigCol: '30,10,4',
            edgeHue: [15, 30], edgeLit: [12, 20]
        }
    },
    // L37: Magma Fields — heavy lava pools and craters, orange glow
    magmaFields: {
        bg: '#200800', stars: [], nebula: [], fx: 'volcanic', volcanicOverlay: true,
        volcanicConfig: {
            dist: [0.20, 0.30, 0.50, 0.80], craterW: [18, 40], canyonCount: 2, lavaRockMul: 0.8,
            fxN: 48, edgeN: 10, edgeReach: [20, 40], vigCol: '40,12,0',
            edgeHue: [10, 25], edgeLit: [10, 16]
        }
    },
    // L38: Caldera Zone — massive craters, deep red glow, lots of canyons
    calderaZone: {
        bg: '#160400', stars: [], nebula: [], fx: 'volcanic', volcanicOverlay: true,
        volcanicConfig: {
            dist: [0.25, 0.35, 0.50, 0.85], craterW: [25, 55], canyonCount: 3, lavaRockMul: 0.9,
            fxN: 45, edgeN: 14, edgeReach: [30, 55], vigCol: '35,8,2',
            edgeHue: [0, 20], edgeLit: [8, 14]
        }
    },
    // L39: Obsidian Waste — black glass rocks, sharp purple highlights
    obsidianWaste: {
        bg: '#0e0610', stars: [], nebula: [], fx: 'volcanic', volcanicOverlay: true,
        volcanicConfig: {
            dist: [0.25, 0.65, 0.80, 0.92], craterW: [12, 22], canyonCount: 1, lavaRockMul: 1.2,
            fxN: 42, edgeN: 16, edgeReach: [28, 50], vigCol: '18,8,20',
            edgeHue: [270, 300], edgeLit: [10, 18]
        }
    },
    // L40: Inferno Core — maximum intensity, fire everywhere
    infernoCore: {
        bg: '#220400', stars: [], nebula: [], fx: 'volcanic', volcanicOverlay: true,
        volcanicConfig: {
            dist: [0.30, 0.40, 0.55, 0.85], craterW: [20, 45], canyonCount: 2, lavaRockMul: 1,
            fxN: 55, edgeN: 8, edgeReach: [20, 40], vigCol: '50,10,0',
            edgeHue: [5, 20], edgeLit: [14, 22]
        }
    },

    // ─── Planet 3: Frozen (41-45) ───
    // Each level has a unique frozen biome via frozenConfig
    // dist = cumulative thresholds [iceSheet, snowDrift, crystal, crevasse] — remainder = frost
    // L41: Frozen Tundra — snowy rolling hills, moderate ice, visible snowfall
    frozenTundra: {
        bg: '#0e1828', stars: [], nebula: [], fx: 'frozen', frozenOverlay: true,
        frozenConfig: {
            dist: [0.30, 0.60, 0.75, 0.88], crevasseW: [12, 24], crevasseCount: 1, iceSheetMul: 1.1, crystalMul: 1,
            fxN: 50, edgeN: 14, edgeReach: [30, 55], vigCol: '20,35,60',
            edgeHue: [195, 215], edgeLit: [30, 45], edgeSat: [25, 45],
            snowfall: true, snowCount: 35, frozenLakes: 1
        }
    },
    // L42: Snow Fields — thick white blanket, lots of soft snow, bright
    snowFields: {
        bg: '#121e30', stars: [], nebula: [], fx: 'frozen', frozenOverlay: true,
        frozenConfig: {
            dist: [0.12, 0.60, 0.68, 0.82], crevasseW: [8, 16], crevasseCount: 0, iceSheetMul: 0.9, crystalMul: 0.7,
            fxN: 55, edgeN: 12, edgeReach: [28, 50], vigCol: '25,40,65',
            edgeHue: [200, 215], edgeLit: [35, 50], edgeSat: [20, 40],
            snowfall: true, snowCount: 50, frozenLakes: 0
        }
    },
    // L43: Crystal Caverns — vivid blue-purple crystals shimmering, deep crevasses
    crystalCaverns: {
        bg: '#0c1030', stars: [], nebula: [], fx: 'frozen', frozenOverlay: true,
        frozenConfig: {
            dist: [0.18, 0.28, 0.65, 0.85], crevasseW: [14, 30], crevasseCount: 2, iceSheetMul: 0.9, crystalMul: 1.5,
            fxN: 55, edgeN: 16, edgeReach: [30, 55], vigCol: '18,22,55',
            edgeHue: [215, 260], edgeLit: [22, 36], edgeSat: [30, 55],
            snowfall: true, snowCount: 20, frozenLakes: 1
        }
    },
    // L44: Glacial Rift — massive blue glaciers, wide icy crevasses, frozen lakes
    glacialRift: {
        bg: '#0a1625', stars: [], nebula: [], fx: 'frozen', frozenOverlay: true,
        frozenConfig: {
            dist: [0.48, 0.58, 0.72, 0.92], crevasseW: [22, 50], crevasseCount: 3, iceSheetMul: 1.4, crystalMul: 0.9,
            fxN: 52, edgeN: 18, edgeReach: [35, 60], vigCol: '15,30,55',
            edgeHue: [198, 218], edgeLit: [26, 40], edgeSat: [30, 50],
            snowfall: true, snowCount: 25, frozenLakes: 2
        }
    },
    // L45: Frost Core — boss level, everything at peak, blizzard
    frostCore: {
        bg: '#08122a', stars: [], nebula: [], fx: 'frozen', frozenOverlay: true,
        frozenConfig: {
            dist: [0.28, 0.45, 0.62, 0.84], crevasseW: [18, 40], crevasseCount: 2, iceSheetMul: 1.2, crystalMul: 1.3,
            fxN: 60, edgeN: 12, edgeReach: [25, 48], vigCol: '12,25,50',
            edgeHue: [190, 225], edgeLit: [28, 42], edgeSat: [30, 50],
            snowfall: true, snowCount: 60, frozenLakes: 1
        }
    },

    // ─── Planet 4: Desert (46-50) ───
    // dist = cumulative thresholds [sandMass, sandPatch, rock, oasis] — remainder = cactus
    // L46: Desert Landing — gentle sand terrain, sparse rocks, one oasis
    desertLanding: {
        bg: '#1a1408', stars: [], nebula: [], fx: 'desert', desertOverlay: true,
        desertConfig: {
            dist: [0.45, 0.65, 0.85, 0.95], sandMul: 1,
            fxN: 45, edgeN: 12, edgeReach: [25, 48], vigCol: '45,30,10',
            edgeHue: [30, 45], edgeLit: [28, 42], edgeSat: [35, 45],
            oasisPools: 1, sandstorm: false, sandstormCount: 0
        }
    },
    // L47: Dune Crossing — big sand masses, wind-swept, more rocks
    duneCrossing: {
        bg: '#181206', stars: [], nebula: [], fx: 'desert', desertOverlay: true,
        desertConfig: {
            dist: [0.55, 0.75, 0.92, 0.96], sandMul: 1.15,
            fxN: 50, edgeN: 14, edgeReach: [28, 52], vigCol: '50,35,12',
            edgeHue: [28, 42], edgeLit: [25, 40], edgeSat: [36, 44],
            oasisPools: 0, sandstorm: false, sandstormCount: 0
        }
    },
    // L48: Oasis Siege — more oasis pools, lush accents
    oasisSiege: {
        bg: '#14100a', stars: [], nebula: [], fx: 'desert', desertOverlay: true,
        desertConfig: {
            dist: [0.35, 0.55, 0.72, 0.90], sandMul: 0.9,
            fxN: 48, edgeN: 10, edgeReach: [22, 45], vigCol: '35,28,14',
            edgeHue: [32, 48], edgeLit: [30, 45], edgeSat: [33, 42],
            oasisPools: 2, sandstorm: false, sandstormCount: 0
        }
    },
    // L49: Temple Storms — sandstorm active, lots of sand masses
    templeStorms: {
        bg: '#120e06', stars: [], nebula: [], fx: 'desert', desertOverlay: true,
        desertConfig: {
            dist: [0.50, 0.72, 0.90, 0.96], sandMul: 1.2,
            fxN: 52, edgeN: 16, edgeReach: [30, 58], vigCol: '40,25,8',
            edgeHue: [20, 38], edgeLit: [22, 36], edgeSat: [38, 45],
            oasisPools: 0, sandstorm: true, sandstormCount: 40
        }
    },
    // L50: Desert Boss — peak intensity, all elements dense
    desertBoss: {
        bg: '#1c1004', stars: [], nebula: [], fx: 'desert', desertOverlay: true,
        desertConfig: {
            dist: [0.45, 0.65, 0.82, 0.93], sandMul: 1.1,
            fxN: 58, edgeN: 14, edgeReach: [28, 55], vigCol: '55,30,5',
            edgeHue: [25, 42], edgeLit: [24, 38], edgeSat: [38, 45],
            oasisPools: 1, sandstorm: true, sandstormCount: 55
        }
    },

    // ─── Planet 5: Mechanical (51-55) ───
    // Each level has a unique factory biome via mechanicalConfig
    // dist = cumulative thresholds [gears, pipes, plates, sparks] — remainder = vents
    // L51: Factory Floor — balanced factory terrain, one pipeline, no steam
    factoryFloor: {
        bg: '#060808', stars: [], nebula: [], fx: 'mechanical', mechanicalOverlay: true,
        mechanicalConfig: {
            dist: [0.30, 0.55, 0.75, 0.90], pipeW: [16, 26], pipelineCount: 1,
            fxN: 42, edgeN: 12, edgeReach: [25, 45], vigCol: '20,25,35',
            edgeHue: [200, 225], edgeLit: [18, 28], edgeSat: [5, 15],
            junctions: 1, steam: false, steamCount: 0
        }
    },
    // L52: Assembly Line — multiple pipelines, junction plates
    assemblyLine: {
        bg: '#040a0c', stars: [], nebula: [], fx: 'mechanical', mechanicalOverlay: true,
        mechanicalConfig: {
            dist: [0.25, 0.55, 0.78, 0.92], pipeW: [14, 22], pipelineCount: 2,
            fxN: 48, edgeN: 14, edgeReach: [28, 50], vigCol: '18,28,40',
            edgeHue: [205, 230], edgeLit: [16, 26], edgeSat: [6, 14],
            junctions: 2, steam: false, steamCount: 0
        }
    },
    // L53: Control Core — green-tinted tech panels, scanlines feel
    controlCore: {
        bg: '#040604', stars: [], nebula: [], fx: 'mechanical', mechanicalOverlay: true,
        mechanicalConfig: {
            dist: [0.20, 0.40, 0.70, 0.88], pipeW: [12, 20], pipelineCount: 1,
            fxN: 45, edgeN: 16, edgeReach: [30, 55], vigCol: '12,25,18',
            edgeHue: [150, 185], edgeLit: [20, 32], edgeSat: [8, 18],
            junctions: 2, steam: true, steamCount: 15
        }
    },
    // L54: Reactor Chamber — warm orange glow, heavy steam, wide pipes
    reactorChamber: {
        bg: '#0a0604', stars: [], nebula: [], fx: 'mechanical', mechanicalOverlay: true,
        mechanicalConfig: {
            dist: [0.35, 0.50, 0.72, 0.85], pipeW: [22, 38], pipelineCount: 2,
            fxN: 50, edgeN: 10, edgeReach: [22, 42], vigCol: '35,18,8',
            edgeHue: [20, 45], edgeLit: [22, 34], edgeSat: [15, 28],
            junctions: 3, steam: true, steamCount: 35
        }
    },
    // L55: Mech Boss — peak intensity, all elements, blue-cold tech
    mechBoss: {
        bg: '#020608', stars: [], nebula: [], fx: 'mechanical', mechanicalOverlay: true,
        mechanicalConfig: {
            dist: [0.28, 0.52, 0.74, 0.90], pipeW: [18, 32], pipelineCount: 3,
            fxN: 55, edgeN: 14, edgeReach: [28, 52], vigCol: '10,18,40',
            edgeHue: [210, 240], edgeLit: [20, 30], edgeSat: [10, 22],
            junctions: 2, steam: true, steamCount: 45
        }
    },

    // ─── Planet 6: Toxic (56-60) ───
    // Each level has a unique toxic biome via toxicConfig
    // dist = cumulative thresholds [sludge, bubbles, fumes, pools] — remainder = spikes
    // L56: Toxic Shores — gentle toxic terrain, one acid river, sparse pools
    toxicShores: {
        bg: '#080c02', stars: [], nebula: [], fx: 'toxic', toxicOverlay: true,
        toxicConfig: {
            dist: [0.25, 0.50, 0.70, 0.88], acidRiverW: [14, 22], acidRiverCount: 1,
            fxN: 42, edgeN: 12, edgeReach: [25, 45], vigCol: '15,30,5',
            edgeHue: [80, 115], edgeLit: [14, 22], edgeSat: [30, 50],
            toxicPools: 1, acidRain: false, acidRainCount: 0
        }
    },
    // L57: Acid Rain — persistent rain, moderate rivers
    acidRain: {
        bg: '#060a04', stars: [], nebula: [], fx: 'toxic', toxicOverlay: true,
        toxicConfig: {
            dist: [0.20, 0.45, 0.68, 0.86], acidRiverW: [16, 26], acidRiverCount: 1,
            fxN: 48, edgeN: 10, edgeReach: [22, 42], vigCol: '12,28,8',
            edgeHue: [85, 120], edgeLit: [12, 20], edgeSat: [35, 55],
            toxicPools: 0, acidRain: true, acidRainCount: 35
        }
    },
    // L58: Mutation Zone — lots of toxic pools, thick formations
    mutationZone: {
        bg: '#080a06', stars: [], nebula: [], fx: 'toxic', toxicOverlay: true,
        toxicConfig: {
            dist: [0.30, 0.48, 0.65, 0.85], acidRiverW: [12, 20], acidRiverCount: 1,
            fxN: 50, edgeN: 18, edgeReach: [30, 58], vigCol: '10,35,6',
            edgeHue: [75, 110], edgeLit: [10, 18], edgeSat: [38, 58],
            toxicPools: 2, acidRain: false, acidRainCount: 0
        }
    },
    // L59: Ground Zero — wide acid rivers, heavy rain, dense formations
    groundZero: {
        bg: '#040802', stars: [], nebula: [], fx: 'toxic', toxicOverlay: true,
        toxicConfig: {
            dist: [0.22, 0.42, 0.60, 0.80], acidRiverW: [24, 42], acidRiverCount: 2,
            fxN: 52, edgeN: 14, edgeReach: [28, 52], vigCol: '8,32,4',
            edgeHue: [90, 125], edgeLit: [12, 22], edgeSat: [40, 60],
            toxicPools: 1, acidRain: true, acidRainCount: 40
        }
    },
    // L60: Toxic Boss — maximum intensity, all toxic elements
    toxicBoss: {
        bg: '#061004', stars: [], nebula: [], fx: 'toxic', toxicOverlay: true,
        toxicConfig: {
            dist: [0.25, 0.45, 0.62, 0.82], acidRiverW: [20, 36], acidRiverCount: 2,
            fxN: 58, edgeN: 16, edgeReach: [30, 55], vigCol: '5,35,2',
            edgeHue: [85, 120], edgeLit: [10, 20], edgeSat: [42, 62],
            toxicPools: 2, acidRain: true, acidRainCount: 55
        }
    },

    // ═══════════════════════════════════════════════
    //  WORLD 3 — SIMULATION BREAK (Levels 61-90)
    //  The game engine is malfunctioning: corrupted grids,
    //  glitch artifacts, data streams, broken geometry.
    //  intensity ramps from 0.0 → 1.0 as levels advance.
    // ═══════════════════════════════════════════════

    // ─── Sector 1: First Cracks (61-65) ───
    // L61: Boot Sequence — faint grid, first signs of corruption
    bootSequence: {
        bg: '#060810', stars: ['#6688aa', '#88aacc', '#aaddee'], nebula: ['rgba(20,30,60,1)', 'rgba(15,20,50,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.05, gridHue: 200, dist: [0.40, 0.55, 0.70, 0.88] }
    },
    // L62: Memory Leak — cyan-hued data fragments appearing
    memoryLeak: {
        bg: '#04080e', stars: ['#55aacc', '#77ccee', '#bbddff'], nebula: ['rgba(15,40,70,1)', 'rgba(10,25,55,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.08, gridHue: 190, dist: [0.32, 0.52, 0.72, 0.88] }
    },
    // L63: Stutter — slight glitch frequency increase, magenta hints
    stutter: {
        bg: '#080610', stars: ['#9977cc', '#bb99ee', '#ddbbff'], nebula: ['rgba(40,20,70,1)', 'rgba(30,10,55,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.12, gridHue: 270, dist: [0.35, 0.52, 0.70, 0.87] }
    },
    // L64: Debug Mode — green data streams become prominent
    debugMode: {
        bg: '#040a06', stars: ['#55cc77', '#77ee99', '#aaffcc'], nebula: ['rgba(15,50,25,1)', 'rgba(10,35,15,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.15, gridHue: 140, dist: [0.30, 0.55, 0.70, 0.85] }
    },
    // L65: Stack Overflow — first mini-boss, moderate corruption
    stackOverflow: {
        bg: '#0a060c', stars: ['#cc5588', '#ee77aa', '#ffaacc'], nebula: ['rgba(60,15,40,1)', 'rgba(45,10,30,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.20, gridHue: 330, dist: [0.35, 0.52, 0.68, 0.85] }
    },

    // ─── Sector 2: Corruption Spreads (66-70) ───
    // L66: Null Pointer — dark, sparse, with sudden pixel pops
    nullPointer: {
        bg: '#040408', stars: ['#445566', '#667788', '#88aabb'], nebula: ['rgba(12,14,28,1)', 'rgba(8,10,22,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.25, gridHue: 210, dist: [0.28, 0.48, 0.68, 0.88] }
    },
    // L67: Fragmented — broken polygons dominate
    fragmented: {
        bg: '#06040a', stars: ['#8866bb', '#aa88dd', '#ccaaff'], nebula: ['rgba(30,15,50,1)', 'rgba(20,8,40,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.28, gridHue: 280, dist: [0.25, 0.42, 0.72, 0.88] }
    },
    // L68: Syntax Error — red/orange error hues, many blocks
    syntaxError: {
        bg: '#0c0406', stars: ['#ee6644', '#ff8866', '#ffbb99'], nebula: ['rgba(70,18,12,1)', 'rgba(50,10,8,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.32, gridHue: 15, dist: [0.42, 0.55, 0.70, 0.86] }
    },
    // L69: Infinite Loop — green cycling data streams
    infiniteLoop: {
        bg: '#040c04', stars: ['#44dd66', '#66ff88', '#aaffbb'], nebula: ['rgba(10,55,18,1)', 'rgba(8,40,12,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.35, gridHue: 130, dist: [0.25, 0.58, 0.72, 0.86] }
    },
    // L70: Core Dump — boss level, mixed corruption
    coreDump: {
        bg: '#08040c', stars: ['#bb44cc', '#dd66ee', '#ff99ff'], nebula: ['rgba(50,10,60,1)', 'rgba(35,5,45,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.40, gridHue: 290, dist: [0.35, 0.52, 0.68, 0.84] }
    },

    // ─── Sector 3: System Failure (71-75) ───
    // L71: Buffer Overflow — heavy block corruption, cyan-dominant
    bufferOverflow: {
        bg: '#040a10', stars: ['#44bbdd', '#66ddff', '#99eeff'], nebula: ['rgba(12,45,65,1)', 'rgba(8,30,50,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.45, gridHue: 195, dist: [0.42, 0.55, 0.68, 0.84], glitchMul: 1.1 }
    },
    // L72: Race Condition — fast particles, flickering pixels
    raceCondition: {
        bg: '#060606', stars: ['#aaaaaa', '#cccccc', '#eeeeee'], nebula: ['rgba(25,25,25,1)', 'rgba(18,18,18,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.48, gridHue: 0, dist: [0.28, 0.45, 0.62, 0.88] }
    },
    // L73: Deadlock — purple-dark, heavy broken polys
    deadlock: {
        bg: '#0a0418', stars: ['#7744bb', '#9966dd', '#cc99ff'], nebula: ['rgba(35,10,65,1)', 'rgba(25,5,50,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.52, gridHue: 270, dist: [0.25, 0.42, 0.72, 0.86] }
    },
    // L74: Segfault — red crashes, code fragments flying
    segfault: {
        bg: '#100408', stars: ['#dd4444', '#ff6666', '#ff9999'], nebula: ['rgba(65,12,20,1)', 'rgba(50,8,15,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.55, gridHue: 0, dist: [0.30, 0.45, 0.62, 0.82] }
    },
    // L75: Heap Corruption — boss, multi-color chaos
    heapCorruption: {
        bg: '#080608', stars: ['#dd77aa', '#ff99cc', '#ffbbee'], nebula: ['rgba(50,18,40,1)', 'rgba(35,10,28,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.60, gridHue: 320, dist: [0.35, 0.52, 0.68, 0.84], glitchMul: 1.15 }
    },

    // ─── Sector 4: Critical Failure (76-80) ───
    // L76: Blue Screen — deep blue, dense grid lines
    blueScreen: {
        bg: '#020820', stars: ['#3366dd', '#5588ff', '#88bbff'], nebula: ['rgba(5,20,80,1)', 'rgba(3,12,60,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.65, gridHue: 220, dist: [0.40, 0.55, 0.70, 0.85], glitchMul: 1.2 }
    },
    // L77: Kernel Panic — dark with bright flashes
    kernelPanic: {
        bg: '#040204', stars: ['#ee3355', '#ff5577', '#ff88aa'], nebula: ['rgba(55,6,18,1)', 'rgba(40,3,12,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.68, gridHue: 350, dist: [0.30, 0.48, 0.65, 0.84] }
    },
    // L78: Bit Rot — faded, desaturated, decaying blocks
    bitRot: {
        bg: '#080806', stars: ['#998866', '#bbaa88', '#ddccaa'], nebula: ['rgba(35,30,22,1)', 'rgba(25,20,15,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.72, gridHue: 45, dist: [0.38, 0.55, 0.68, 0.82] }
    },
    // L79: Overflow — magenta/cyan chromatic overload
    overflow: {
        bg: '#0a0412', stars: ['#cc44ff', '#dd77ff', '#eeaaff'], nebula: ['rgba(50,10,70,1)', 'rgba(35,5,55,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.75, gridHue: 290, dist: [0.32, 0.48, 0.65, 0.85], glitchMul: 1.2 }
    },
    // L80: Fatal Exception — boss, high intensity
    fatalException: {
        bg: '#0c0204', stars: ['#ff3333', '#ff6655', '#ff9988'], nebula: ['rgba(70,8,10,1)', 'rgba(55,4,6,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.80, gridHue: 5, dist: [0.35, 0.52, 0.68, 0.84], glitchMul: 1.25 }
    },

    // ─── Sector 5: Meltdown (81-85) ───
    // L81: Data Corruption — warped green-cyan grid
    dataCorruption: {
        bg: '#040c0a', stars: ['#33ddaa', '#55ffcc', '#88ffee'], nebula: ['rgba(8,50,40,1)', 'rgba(5,35,28,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.82, gridHue: 165, dist: [0.38, 0.52, 0.66, 0.82], glitchMul: 1.25 }
    },
    // L82: Ghost Process — faint, ethereal white on dark
    ghostProcess: {
        bg: '#050508', stars: ['#aabbcc', '#ccddee', '#eeeeff'], nebula: ['rgba(18,20,30,1)', 'rgba(12,14,22,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.85, gridHue: 220, dist: [0.25, 0.45, 0.68, 0.88] }
    },
    // L83: Malware — aggressive red/yellow, many pixel noise
    malware: {
        bg: '#100804', stars: ['#ff8800', '#ffaa33', '#ffcc66'], nebula: ['rgba(65,30,8,1)', 'rgba(50,20,4,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.88, gridHue: 30, dist: [0.30, 0.45, 0.60, 0.85], glitchMul: 1.3 }
    },
    // L84: Worm Hole — dark purple void, code fragments
    wormHole: {
        bg: '#08021a', stars: ['#6622dd', '#8844ff', '#bb77ff'], nebula: ['rgba(30,5,75,1)', 'rgba(20,2,55,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.90, gridHue: 270, dist: [0.28, 0.42, 0.58, 0.82] }
    },
    // L85: System Halt — boss, near-maximum corruption
    systemHalt: {
        bg: '#0a0206', stars: ['#dd2244', '#ff4466', '#ff7799'], nebula: ['rgba(55,6,16,1)', 'rgba(40,3,10,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.92, gridHue: 345, dist: [0.35, 0.50, 0.65, 0.82], glitchMul: 1.35 }
    },

    // ─── Sector 6: Total Collapse (86-90) ───
    // L86: Cascade Failure — multi-hue chaos, everything breaking
    cascadeFailure: {
        bg: '#080408', stars: ['#cc55cc', '#ee77ee', '#ffaaff'], nebula: ['rgba(45,12,45,1)', 'rgba(30,8,30,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.93, gridHue: 300, dist: [0.35, 0.50, 0.65, 0.80], glitchMul: 1.35 }
    },
    // L87: Zero Day — bright white flashes, maximum pixel noise
    zeroDay: {
        bg: '#060606', stars: ['#dddddd', '#eeeeee', '#ffffff'], nebula: ['rgba(22,22,22,1)', 'rgba(15,15,15,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.95, gridHue: 0, dist: [0.25, 0.40, 0.55, 0.85], glitchMul: 1.4 }
    },
    // L88: Entropy Max — desaturated, heavy distortion bands
    entropyMax: {
        bg: '#0a0808', stars: ['#bb8877', '#ddaa99', '#ffccbb'], nebula: ['rgba(40,28,25,1)', 'rgba(30,20,18,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.96, gridHue: 20, dist: [0.35, 0.52, 0.68, 0.82], glitchMul: 1.4 }
    },
    // L89: Last Signal — deep void, faint cyan flickers
    lastSignal: {
        bg: '#020408', stars: ['#225588', '#3377aa', '#55aadd'], nebula: ['rgba(5,14,30,1)', 'rgba(3,10,22,1)'], fx: 'glitch',
        glitchConfig: { intensity: 0.98, gridHue: 200, dist: [0.30, 0.48, 0.65, 0.84] }
    },
    // L90: The Kernel — final boss, total system collapse
    theKernel: {
        bg: '#020002', stars: ['#ff0044', '#ff3366', '#ff6699'], nebula: ['rgba(60,0,15,1)', 'rgba(40,0,8,1)', 'rgba(80,0,20,1)'], fx: 'glitch',
        glitchConfig: { intensity: 1.0, gridHue: 350, dist: [0.35, 0.50, 0.65, 0.80], glitchMul: 1.5 }
    },
};

// Map: level number (1-60) → theme key
const LEVEL_THEME_MAP = [
    // World 1 (1-30)
    'deepSpace', 'asteroid', 'redNebula', 'swarmGreen', 'crimson',
    'blueIce', 'phantom', 'sentinelBlue', 'warzone', 'ironOrange',
    'nebulaRun', 'minefield', 'ambushDark', 'gauntlet', 'voidPurple',
    'reinforced', 'crossfire', 'siege', 'stormFront', 'omegaGold',
    'darkSector', 'deadZone', 'hellfire', 'exodus', 'nemesis',
    'oblivion', 'entropy', 'singularity', 'eventHorizon', 'apocalypse',
    // World 2 — Alien Jungle (31-35)
    'jungleNormal', 'jungleSwamp', 'jungleRivers', 'jungleDense', 'jungleRocky',
    // World 2 — Volcanic (36-40)
    'volcanicPlains', 'magmaFields', 'calderaZone', 'obsidianWaste', 'infernoCore',
    // World 2 — Frozen (41-45)
    'frozenTundra', 'snowFields', 'crystalCaverns', 'glacialRift', 'frostCore',
    // World 2 — Desert (46-50)
    'desertLanding', 'duneCrossing', 'oasisSiege', 'templeStorms', 'desertBoss',
    // World 2 — Mechanical (51-55)
    'factoryFloor', 'assemblyLine', 'controlCore', 'reactorChamber', 'mechBoss',
    // World 2 — Toxic (56-60)
    'toxicShores', 'acidRain', 'mutationZone', 'groundZero', 'toxicBoss',
    // World 3 — Simulation Break: First Cracks (61-65)
    'bootSequence', 'memoryLeak', 'stutter', 'debugMode', 'stackOverflow',
    // World 3 — Corruption Spreads (66-70)
    'nullPointer', 'fragmented', 'syntaxError', 'infiniteLoop', 'coreDump',
    // World 3 — System Failure (71-75)
    'bufferOverflow', 'raceCondition', 'deadlock', 'segfault', 'heapCorruption',
    // World 3 — Critical Failure (76-80)
    'blueScreen', 'kernelPanic', 'bitRot', 'overflow', 'fatalException',
    // World 3 — Meltdown (81-85)
    'dataCorruption', 'ghostProcess', 'malware', 'wormHole', 'systemHalt',
    // World 3 — Total Collapse (86-90)
    'cascadeFailure', 'zeroDay', 'entropyMax', 'lastSignal', 'theKernel',
];

function getThemeForLevel(level) {
    const key = LEVEL_THEME_MAP[Math.min(level - 1, LEVEL_THEME_MAP.length - 1)];
    return LEVEL_THEMES[key] || LEVEL_THEMES.deepSpace;
}

Nebula.DEFAULT_COLORS = [
    'rgba(80,40,120,1)', 'rgba(40,60,140,1)', 'rgba(120,30,60,1)',
    'rgba(30,80,100,1)', 'rgba(60,100,40,1)'
];

export   { getThemeForLevel };
