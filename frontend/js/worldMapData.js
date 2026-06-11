/**
 * worldMapData.js
 * Lightweight, fully-offline world map geometry for the Community "World Activity Map".
 *
 * Continents are stored as simplified outlines in [longitude, latitude] pairs.
 * They are intentionally low-detail (a clean, minimal "data-map" aesthetic) and are
 * projected with the SAME equirectangular projection used to place activity markers,
 * which guarantees markers always land on the correct landmass.
 *
 * No external map library or network tiles are required.
 */

/** Equirectangular projection: [lon, lat] -> [x, y] within a (width x height) box. */
export function projectLonLat(lon, lat, width, height) {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
}

/** Simplified continent/landmass outlines as arrays of [lon, lat] vertices. */
export const CONTINENTS = [
    // North America
    [
        [-168, 65], [-160, 71], [-130, 70], [-95, 72], [-80, 68], [-64, 60],
        [-56, 52], [-66, 45], [-70, 41], [-81, 25], [-97, 18], [-105, 22],
        [-115, 30], [-124, 40], [-124, 48], [-135, 58], [-150, 59], [-168, 65]
    ],
    // Greenland
    [
        [-45, 60], [-22, 70], [-20, 80], [-30, 83], [-55, 82], [-58, 76], [-45, 60]
    ],
    // South America
    [
        [-80, 9], [-60, 11], [-50, 0], [-35, -6], [-38, -13], [-48, -25],
        [-54, -34], [-64, -41], [-74, -45], [-73, -52], [-71, -30],
        [-78, -8], [-81, 0], [-80, 9]
    ],
    // Europe
    [
        [-10, 36], [-9, 44], [0, 49], [4, 51], [8, 54], [12, 55], [20, 55],
        [30, 60], [40, 66], [28, 70], [10, 63], [4, 57], [-5, 48], [-10, 43], [-10, 36]
    ],
    // Africa
    [
        [-17, 21], [-5, 15], [10, 5], [10, -5], [13, -17], [20, -34], [26, -34],
        [33, -26], [40, -15], [51, 12], [43, 11], [33, 30], [20, 32], [10, 37],
        [-6, 36], [-17, 28], [-17, 21]
    ],
    // Asia
    [
        [30, 38], [45, 41], [60, 45], [80, 50], [100, 55], [120, 52], [135, 48],
        [142, 60], [160, 68], [180, 68], [180, 52], [150, 42], [140, 35],
        [122, 30], [110, 20], [100, 8], [95, 16], [88, 22], [70, 24],
        [58, 25], [46, 12], [43, 30], [35, 36], [30, 38]
    ],
    // Australia
    [
        [114, -22], [130, -12], [142, -11], [150, -25], [150, -37], [140, -38],
        [130, -32], [115, -35], [114, -22]
    ],
];
