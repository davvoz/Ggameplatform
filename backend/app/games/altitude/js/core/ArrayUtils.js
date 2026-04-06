/**
 * ArrayUtils - Zero-allocation array helpers for hot paths.
 * Avoids GC pressure from Array.filter() which creates a new array every call.
 */

/**
 * Remove elements that fail the predicate, compacting the array in-place.
 * Equivalent to `arr = arr.filter(predicate)` but without allocation.
 *
 * @param {Array} arr       - The array to compact.
 * @param {Function} keep   - Predicate: return true to keep the element.
 * @returns {Array} The same array reference (for chaining convenience).
 */
export function compactInPlace(arr, keep) {
    let write = 0;
    for (let read = 0; read < arr.length; read++) {
        if (keep(arr[read])) {
            if (write !== read) arr[write] = arr[read];
            write++;
        }
    }
    arr.length = write;
    return arr;
}

/**
 * Update every element and keep only those whose updater returns true.
 * Combines update + compact in a single pass (avoids two iterations).
 *
 * @param {Array} arr       - The array to process.
 * @param {Function} updateAndKeep - Called with (element). Must return true to keep.
 * @returns {Array} The same array reference.
 */
export function updateAndCompact(arr, updateAndKeep) {
    let write = 0;
    for (let read = 0; read < arr.length; read++) {
        if (updateAndKeep(arr[read])) {
            if (write !== read) arr[write] = arr[read];
            write++;
        }
    }
    arr.length = write;
    return arr;
}
