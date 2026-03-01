/**
 * Safe wrapper for localStorage and sessionStorage to prevent crashes in restricted contexts.
 * "Solve it from the root": Uses an in-memory fallback if the browser blocks storage access.
 */

const createFallbackStore = () => {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) || null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        length: 0,
        key: () => null
    };
};

let localStore: any;
let sessionStore: any;

const getStores = () => {
    if (localStore && sessionStore) return { local: localStore, session: sessionStore };

    if (typeof window === 'undefined') {
        localStore = createFallbackStore();
        sessionStore = createFallbackStore();
    } else {
        try {
            localStore = window.localStorage;
            const x = '__storage_test__';
            localStore.setItem(x, x);
            localStore.removeItem(x);
        } catch (e) {
            localStore = createFallbackStore();
        }

        try {
            sessionStore = window.sessionStorage;
            const x = '__storage_test__';
            sessionStore.setItem(x, x);
            sessionStore.removeItem(x);
        } catch (e) {
            sessionStore = createFallbackStore();
        }
    }

    return { local: localStore, session: sessionStore };
};

export const safeStorage = {
    get: (key: string): string | null => {
        try {
            return getStores().local.getItem(key);
        } catch (e) {
            return null;
        }
    },
    set: (key: string, value: string): boolean => {
        try {
            getStores().local.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    },
    remove: (key: string): boolean => {
        try {
            getStores().local.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    },
    session: {
        get: (key: string): string | null => {
            try {
                return getStores().session.getItem(key);
            } catch (e) {
                return null;
            }
        },
        set: (key: string, value: string): boolean => {
            try {
                getStores().session.setItem(key, value);
                return true;
            } catch (e) {
                return false;
            }
        }
    }
};
