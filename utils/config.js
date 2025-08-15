// Centralized runtime configuration for API and WebSocket URLs
// Set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_WS_URL in your environment for production

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://100.112.30.225:3000';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || API_URL.replace(/^http/, 'ws');

export default { API_URL, WS_URL };


