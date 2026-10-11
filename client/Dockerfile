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


EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
