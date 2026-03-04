// src/config.js

/**
 * ✅ CORRECTED Configuration
 * This now points to your Django backend at port 8000
 * NOT your React frontend at port 3000!
 */

const config = {
  // ✅ FIXED: Changed from localhost:3000 (frontend) to 127.0.0.1:8000 (Django backend)
  apiUrl: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
};

export default config;