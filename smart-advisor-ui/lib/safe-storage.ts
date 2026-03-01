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
    try {
        if (localStore && sessionStore) return { local: localStore, session: sessionStore };

        if (typeof window === 'undefined') {
            localStore = createFallbackStore();
            sessionStore = createFallbackStore();
        } else {
            // Test LocalStorage
            try {
                const ls = window.localStorage;
                if (!ls) throw new Error("no_ls");
                const x = '__storage_test__';
                ls.setItem(x, x);
                ls.removeItem(x);
                localStore = ls;
            } catch (e) {
                console.warn("[SafeStorage] LocalStorage restricted, using fallback");
                localStore = createFallbackStore();
            }

            // Test SessionStorage
            try {
                const ss = window.sessionStorage;
                if (!ss) throw new Error("no_ss");
                const x = '__storage_test__';
                ss.setItem(x, x);
                ss.removeItem(x);
                sessionStore = ss;
            } catch (e) {
                console.warn("[SafeStorage] SessionStorage restricted, using fallback");
                sessionStore = createFallbackStore();
            }
        }
    } catch (globalError) {
        localStore = createFallbackStore();
        sessionStore = createFallbackStore();
    }

    return { 
        local: localStore || createFallbackStore(), 
        session: sessionStore || createFallbackStore() 
    };
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
