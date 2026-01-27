#!/bin/sh

cat <<EOF > /usr/share/nginx/html/env.js
window.__ENV__ = {
  VITE_API_URL: "${VITE_API_URL}"
};
EOF

exec "$@"
