self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('period-tracker-cache').then(async (cache) => {
            const urlsToCache = [
                '/LunaCycle/index.html',  // Explicitly reference index.html
                '/LunaCycle/styles.css',
                '/LunaCycle/main.js',
                '/LunaCycle/icons/AppIcon128.png'
            ];
            
            for (const url of urlsToCache) {
                try {
                    await cache.add(url);
                } catch (error) {
                    console.error(`Failed to cache ${url}:`, error);
                }
            }
        })
    );
});

// Fetch event to serve files from cache if available
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
