// Base URL for generating absolute URLs in Schema (REPLACE WITH YOUR ACTUAL LIVE URL)
const BASE_URL = 'YOUR_ABSOLUTE_URL'; // e.g., 'https://www.reelsense.com' - NO trailing slash needed

// Make BASE_URL available globally
if (typeof window !== 'undefined') {
    window.BASE_URL = BASE_URL || '';
    console.log('[ReelSense] BASE_URL loaded.');
} else {
    console.error('[ReelSense] Window object not available for BASE_URL assignment.');
}