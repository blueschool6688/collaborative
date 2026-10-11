# ==========================================
# STAGE 1: Build TypeScript & Generate Prisma
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source code and compile
COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate
RUN npm run build

# ==========================================
# STAGE 2: Install Production Dependencies Only
# ==========================================
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --omit=peer --no-audit --no-fund && npm cache clean --force

# ==========================================
# STAGE 3: Production Runner
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy package metadata
COPY package.json ./

# Copy production node_modules from prod-deps stage
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy Prisma generated client artifacts from builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled JavaScript and prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Security: Run as non-root user
USER node

EXPOSE 4000

CMD ["node", "dist/index.js"]
