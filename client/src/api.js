// Central API base URL; auto-detects hostname for cross-browser compatibility.
const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
export const API = import.meta.env.VITE_API_URL || `http://${hostname}:5000`;

