// Check if the code is running in a browser extension environment or regular browser
const isExtension = typeof browser !== 'undefined'; // Detects if we're in a Firefox extension, for example

// Save to storage depending on the environment
export function saveToStorage(key, value) {
    if (isExtension) {
        // If we're in a browser extension, use browser.storage.local (for Firefox/Chrome extensions)
        browser.storage.local.set({ [key]: value }).catch(console.error);
    } else {
        // Otherwise, use localStorage (for regular browsers)
        localStorage.setItem(key, JSON.stringify(value));
    }
}

// Retrieve from storage depending on the environment
export function getFromStorage(key) {
    if (isExtension) {
        // If we're in a browser extension, use browser.storage.local
        return browser.storage.local.get(key)
            .then(result => result[key] || null)
            .catch(console.error);
    } else {
        // Otherwise, use localStorage
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    }
}
