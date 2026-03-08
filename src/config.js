// src/config.js

/**
 * ✅ CORRECTED Configuration
 * This now points to your Django backend at port 8000
 * NOT your React frontend at port 3000!
 */

const config = {
  // ✅ FIXED: Changed from localhost:3000 (frontend) to 127.0.0.1:8000 (Django backend)
  // Don't change the window.__ENV__. as it needed for prod env
  apiUrl: window.__ENV__.VITE_API_URL || "http://127.0.0.1:8000/api",
};

export default config;
