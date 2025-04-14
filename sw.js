// Import Workbox scripts (use CDN for simplicity without build step)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js'); // Use a specific version

// Optional: Set up logging level
workbox.setConfig({ debug: false }); // Set to true for development debugging

// --- Precache Strategy ---
// Precache core assets defined during the build (or manually listed here)
// '__WB_MANIFEST' is replaced by workbox-build or workbox-cli during build process.
// For static setup, list core files manually:
const precacheManifest = [
  { url: '/', revision: 'core-v1' }, // Revision helps trigger updates
  { url: '/index.html', revision: 'core-v1' },
  { url: '/all-reviews.html', revision: 'core-v1' },
  { url: '/offline.html', revision: 'offline-v1' },
  { url: '/styles.css', revision: 'css-v1' },
  { url: '/script.js', revision: 'js-v1' },
  // reviews-data.js removed
  { url: '/reviews.json', revision: 'reviews-v1' }, // Cache the JSON data
  // Add core images (favicon, logo, placeholders) if desired
  { url: '/favicon.ico', revision: 'icon-v1'},
  { url: '/apple-touch-icon.png', revision: 'icon-v1'},
   // Add placeholder images if you use them:
  // { url: '/placeholder-image.jpg', revision: 'placeholder-v1'},
  // Add font files if self-hosting, or rely on network for Google Fonts
];

// Add routes to precache
workbox.precaching.precacheAndRoute(precacheManifest);

// Clean up old caches
workbox.precaching.cleanupOutdatedCaches();

// --- Runtime Caching Strategies ---

// 1. Page Cache (StaleWhileRevalidate: Serve from cache first, update in background)
//    This includes individual review pages like interstellar-review.html etc.
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate', // Cache navigation requests (HTML pages)
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'reelsense-pages-cache',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200], // Cache successful responses and opaque responses (like CDN)
      }),
      // Optional: Limit number of pages cached
      // new workbox.expiration.ExpirationPlugin({ maxEntries: 50 }),
    ],
  })
);

// 2. Static Assets Cache (CacheFirst: Serve from cache, fetch only if not found)
// CSS, JS - Should ideally be precached, but this catches any missed ones
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
  new workbox.strategies.CacheFirst({
    cacheName: 'reelsense-static-assets-cache',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new workbox.expiration.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }), // Cache for 30 days
    ],
  })
);

// 3. Image Cache (CacheFirst: Good for posters, etc.)
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'reelsense-image-cache',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100, // Store more images
        maxAgeSeconds: 60 * 24 * 60 * 60, // Cache images for 60 days
      }),
    ],
  })
);

// 4. Google Fonts Cache (StaleWhileRevalidate for stylesheets, CacheFirst for font files)
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new workbox.strategies.StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new workbox.strategies.CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new workbox.expiration.ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }), // Cache fonts for a year
    ],
  })
);

// 5. Font Awesome Cache (StaleWhileRevalidate)
workbox.routing.registerRoute(
    ({url}) => url.origin === 'https://cdnjs.cloudflare.com' && url.pathname.startsWith('/ajax/libs/font-awesome/'),
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: 'font-awesome-cache'
    })
);

// --- Offline Fallback ---
// Use the precached offline.html page when navigation fails
workbox.routing.setCatchHandler(({ event }) => {
  switch (event.request.destination) {
    case 'document':
      // Return the precached offline page
      return workbox.precaching.matchPrecache('/offline.html');
    // Add fallbacks for images, etc. if desired
    // case 'image':
    //   return workbox.precaching.matchPrecache('/placeholder-image.jpg');
    default:
      // Return an empty response with an error status for other types
      return Response.error();
  }
});

// --- Activate Skip Waiting & Clients Claim ---
// Force the waiting service worker to become the active service worker.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Take control of uncontrolled clients as soon as the SW activates.
workbox.core.clientsClaim();

console.log('[ReelSense SW] Service Worker Loaded with Workbox');