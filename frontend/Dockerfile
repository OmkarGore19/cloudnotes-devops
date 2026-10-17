# ── Stage 1: build the React app ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

# ── Stage 2: serve with nginx & proxy to backend ──────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built React assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx config (serves React SPA + reverse proxies /api/ to Django)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
