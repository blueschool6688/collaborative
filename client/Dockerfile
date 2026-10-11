# ==========================================
# STAGE 1: Build React 19 + Vite Frontend
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer — only re-runs when package files change)
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy everything else and build (`.dockerignore` excludes node_modules, dist, .env, .git)
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Run as non-root user for K8s security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
