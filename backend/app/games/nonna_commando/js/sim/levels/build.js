import { View } from '../../config/Tuning.js';

/** Ground level of a flat street. */
export const GROUND = 184;

/** Just past the right edge of the screen when the camera is at `at`. */
export const edge = (at, extra = 0) => at + View.width + 16 + extra;

/** Small builders that keep mission files readable. */
export const spawn = (type, x, opts = {}, y = undefined) => ({ type, x, y, opts });
export const fromSky = (type, x, height = -20, opts = {}) => ({ type, x, y: height, opts: { state: 'enter', ...opts } });
export const party = (type, x, y = undefined) => ({ type, x, y, opts: { state: 'party' } });
export const prop = (type, x, drop = '', y = undefined) => ({ type, x, y, drop });
export const platform = (x, y, w) => ({ x, y, w });
export const hostage = (x, gift, y = undefined) => ({ x, y, gift });
export const pickup = (type, x, y = undefined) => ({ type, x, y });

/** Total length of a mission whose final boss arena starts at `at`. */
export const lengthFor = (at) => at + View.width;
