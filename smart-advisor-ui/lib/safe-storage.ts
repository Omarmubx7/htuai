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

type FallbackStore = ReturnType<typeof createFallbackStore>;
type StorageLike = Storage | FallbackStore;

let localStore: StorageLike | undefined;
let sessionStore: StorageLike | undefined;

const isStorageLike = (value: unknown): value is Storage => {
    return !!value && typeof (value as Storage).getItem === "function" && typeof (value as Storage).setItem === "function" && typeof (value as Storage).removeItem === "function";
};

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
                if (!isStorageLike(ls)) throw new Error("no_ls");
                const x = '__storage_test__';
                ls.setItem(x, x);
                ls.removeItem(x);
                localStore = ls;
            } catch (_e) {
                console.warn("[SafeStorage] LocalStorage restricted, using fallback");
                localStore = createFallbackStore();
            }

            // Test SessionStorage
            try {
                const ss = window.sessionStorage;
                if (!isStorageLike(ss)) throw new Error("no_ss");
                const x = '__storage_test__';
                ss.setItem(x, x);
                ss.removeItem(x);
                sessionStore = ss;
            } catch (_e) {
                console.warn("[SafeStorage] SessionStorage restricted, using fallback");
                sessionStore = createFallbackStore();
            }
        }
    } catch (_globalError) {
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
        } catch (_e) {
            return null;
        }
    },
    set: (key: string, value: string): boolean => {
        try {
            getStores().local.setItem(key, value);
            // Mirror native storage event for other tabs and listeners
            try {
                if (typeof StorageEvent !== 'undefined') {
                    const event = new StorageEvent('storage', { key, newValue: value, oldValue: null });
                    window.dispatchEvent(event);
                }
            } catch (_e) { /* ignore in non-window contexts */ }
            // Dispatch a custom event so app components can react to MUBXAI-specific saves
            try {
                if (typeof CustomEvent !== 'undefined') {
                    const custom = new CustomEvent('mubxai-synced', { detail: { key, value } });
                    window.dispatchEvent(custom);
                }
            } catch (_e) { /* ignore */ }

            return true;
        } catch (e) {
            return false;
        }
    },
    remove: (key: string): boolean => {
        try {
            getStores().local.removeItem(key);
            return true;
            } catch (_e) {
                return false;
            }
        },
        session: {
            get: (key: string): string | null => {
                try {
                    return getStores().session.getItem(key);
                } catch (_e) {
                    return null;
                }
            },
            set: (key: string, value: string): boolean => {
                try {
                    getStores().session.setItem(key, value);
                    return true;
                } catch (_e) {
                    return false;
                }
            }
        }
    };
