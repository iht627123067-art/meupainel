import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for managing localStorage with error handling and type safety
 * @param key - The localStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns [value, setValue, error] tuple
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((val: T) => T)) => void, Error | null] {
    const [error, setError] = useState<Error | null>(null);

    // Get initial value from localStorage with error handling
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            if (typeof window === "undefined") {
                return initialValue;
            }

            const item = window.localStorage.getItem(key);

            if (item === null) {
                return initialValue;
            }

            try {
                return JSON.parse(item) as T;
            } catch (parseError) {
                console.error(`Error parsing localStorage key "${key}":`, parseError);
                setError(parseError as Error);
                return initialValue;
            }
        } catch (err) {
            console.error(`Error reading localStorage key "${key}":`, err);
            setError(err as Error);
            return initialValue;
        }
    });

    // Memoized setValue function to prevent unnecessary re-renders
    const setValue = useCallback(
        (value: T | ((val: T) => T)) => {
            try {
                setError(null);

                // Allow value to be a function for same API as useState
                const valueToStore = value instanceof Function ? value(storedValue) : value;

                setStoredValue(valueToStore);

                if (typeof window !== "undefined") {
                    try {
                        window.localStorage.setItem(key, JSON.stringify(valueToStore));
                    } catch (storageError) {
                        // Handle quota exceeded error
                        if (
                            storageError instanceof DOMException &&
                            (storageError.code === 22 ||
                                storageError.code === 1014 ||
                                storageError.name === "QuotaExceededError" ||
                                storageError.name === "NS_ERROR_DOM_QUOTA_REACHED")
                        ) {
                            const quotaError = new Error(
                                "LocalStorage quota exceeded. Please clear some data."
                            );
                            console.error(quotaError);
                            setError(quotaError);
                        } else {
                            throw storageError;
                        }
                    }
                }
            } catch (err) {
                console.error(`Error setting localStorage key "${key}":`, err);
                setError(err as Error);
            }
        },
        [key, storedValue]
    );

    // Listen for changes in other tabs/windows
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setStoredValue(JSON.parse(e.newValue) as T);
                    setError(null);
                } catch (parseError) {
                    console.error(`Error parsing storage event for key "${key}":`, parseError);
                    setError(parseError as Error);
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [key]);

    return [storedValue, setValue, error];
}

/**
 * Helper function to safely clear a localStorage key
 */
export function clearLocalStorageKey(key: string): boolean {
    try {
        if (typeof window !== "undefined") {
            window.localStorage.removeItem(key);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error clearing localStorage key "${key}":`, error);
        return false;
    }
}

/**
 * Helper function to safely check if a key exists in localStorage
 */
export function hasLocalStorageKey(key: string): boolean {
    try {
        if (typeof window !== "undefined") {
            return window.localStorage.getItem(key) !== null;
        }
        return false;
    } catch (error) {
        console.error(`Error checking localStorage key "${key}":`, error);
        return false;
    }
}
