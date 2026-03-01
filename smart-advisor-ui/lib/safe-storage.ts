/**
 * Safe wrapper for localStorage and sessionStorage to prevent crashes in restricted contexts
 * (like iframes or browsers with disabled third-party storage/cookies).
 */

export const safeStorage = {
    get: (key: string): string | null => {
        try {
            if (typeof window === 'undefined') return null;
            return localStorage.getItem(key);
        } catch (e) {
            console.warn(`[SafeStorage] Could not read ${key} from localStorage:`, e);
            return null;
        }
    },
    set: (key: string, value: string): boolean => {
        try {
            if (typeof window === 'undefined') return false;
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`[SafeStorage] Could not write ${key} to localStorage:`, e);
            return false;
        }
    },
    remove: (key: string): boolean => {
        try {
            if (typeof window === 'undefined') return false;
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn(`[SafeStorage] Could not remove ${key} from localStorage:`, e);
            return false;
        }
    },
    session: {
        get: (key: string): string | null => {
            try {
                if (typeof window === 'undefined') return null;
                return sessionStorage.getItem(key);
            } catch (e) {
                console.warn(`[SafeStorage] Could not read ${key} from sessionStorage:`, e);
                return null;
            }
        },
        set: (key: string, value: string): boolean => {
            try {
                if (typeof window === 'undefined') return false;
                sessionStorage.setItem(key, value);
                return true;
            } catch (e) {
                console.warn(`[SafeStorage] Could not write ${key} to sessionStorage:`, e);
                return false;
            }
        }
    }
};
