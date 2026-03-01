/**
 * Safe wrapper for localStorage and sessionStorage to prevent crashes in restricted contexts
 * (like iframes or browsers with disabled third-party storage/cookies).
 */

const isStorageAvailable = (type: 'localStorage' | 'sessionStorage') => {
    try {
        if (typeof window === 'undefined') return false;
        const storage = window[type];
        const x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return false;
    }
};

const storageActive = {
    local: isStorageAvailable('localStorage'),
    session: isStorageAvailable('sessionStorage')
};

export const safeStorage = {
    get: (key: string): string | null => {
        try {
            if (!storageActive.local) return null;
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },
    set: (key: string, value: string): boolean => {
        try {
            if (!storageActive.local) return false;
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    },
    remove: (key: string): boolean => {
        try {
            if (!storageActive.local) return false;
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    },
    session: {
        get: (key: string): string | null => {
            try {
                if (!storageActive.session) return null;
                return sessionStorage.getItem(key);
            } catch (e) {
                return null;
            }
        },
        set: (key: string, value: string): boolean => {
            try {
                if (!storageActive.session) return false;
                sessionStorage.setItem(key, value);
                return true;
            } catch (e) {
                return false;
            }
        }
    }
};
