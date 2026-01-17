/**
 * Creates a debounced version of a function.
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
    let timeoutId = null;

    const debounced = function (...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            timeoutId = null;
            fn.apply(this, args);
        }, delay);
    };

    debounced.cancel = function () {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    debounced.flush = function (...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
            fn.apply(this, args);
        }
    };

    return debounced;
}

/**
 * Creates a debounce manager for multiple keys.
 * Useful for managing debounced persistence per tab.
 */
export class DebounceManager {
    constructor(delay = 300) {
        this.delay = delay;
        this.timeouts = new Map();
    }

    /**
     * Schedule a debounced function call for a specific key.
     * @param {string} key - Unique key for this debounced operation
     * @param {Function} fn - Function to call
     */
    schedule(key, fn) {
        if (this.timeouts.has(key)) {
            clearTimeout(this.timeouts.get(key));
        }

        const timeoutId = setTimeout(() => {
            this.timeouts.delete(key);
            fn();
        }, this.delay);

        this.timeouts.set(key, timeoutId);
    }

    /**
     * Cancel a pending debounced call.
     * @param {string} key
     */
    cancel(key) {
        if (this.timeouts.has(key)) {
            clearTimeout(this.timeouts.get(key));
            this.timeouts.delete(key);
        }
    }

    /**
     * Cancel all pending calls.
     */
    cancelAll() {
        for (const timeoutId of this.timeouts.values()) {
            clearTimeout(timeoutId);
        }
        this.timeouts.clear();
    }
}
