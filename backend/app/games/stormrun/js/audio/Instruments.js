/** Sound building blocks, all synthesised: wood, paper and rain, nothing to download. */

/** C major, one note per rainbow colour. A full rainbow is a whole scale. */
export const SCALE = Object.freeze([523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77]);

/**
 * A soft struck note, like a marimba bar.
 * @param {AudioContext} context
 * @param {AudioNode} output
 * @param {number} frequency
 * @param {number} when
 * @param {number} volume
 * @param {number} length seconds
 */
export function strike(context, output, frequency, when, volume, length = 0.28) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    gain.connect(output);

    for (const [ratio, level] of [[1, 1], [3.9, 0.18]]) {
        const oscillator = context.createOscillator();
        const partial = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency * ratio;
        partial.gain.value = level;
        oscillator.connect(partial).connect(gain);
        oscillator.start(when);
        oscillator.stop(when + length);
    }
}

/** A low wooden knock with falling pitch. */
export function thud(context, output, when, volume, from = 150, to = 55) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(from, when);
    oscillator.frequency.exponentialRampToValueAtTime(to, when + 0.12);
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
    oscillator.connect(gain).connect(output);
    oscillator.start(when);
    oscillator.stop(when + 0.2);
}

/** A springy rising note: the jump. */
export function boing(context, output, when, volume, from) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(from, when);
    oscillator.frequency.exponentialRampToValueAtTime(from * 2.4, when + 0.13);
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.17);
    oscillator.connect(gain).connect(output);
    oscillator.start(when);
    oscillator.stop(when + 0.18);
}

/** @returns {AudioBuffer} two seconds of white noise, for rain and wind */
export function noiseBuffer(context) {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return buffer;
}

/** A short burst of filtered noise: splashes and paper tears. */
export function burst(context, output, noise, when, volume, frequency, length = 0.22) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    source.connect(filter).connect(gain).connect(output);
    source.start(when, Math.random());
    source.stop(when + length);
}

/** A looping filtered noise whose level can be changed live. */
export function createLoop(context, output, noise, type, frequency) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    source.loop = true;
    filter.type = type;
    filter.frequency.value = frequency;
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(output);
    source.start();
    return gain.gain;
}
