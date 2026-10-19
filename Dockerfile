# ============================================================
# Multi-stage Dockerfile – PAIN.001 Generator (Express)
# ============================================================

# ── Stage 1: Build ───────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ── Stage 2: Frontend build (Svelte + Vite) ──────────────────
FROM node:24-alpine AS frontend

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

# ── Stage 3: Production image ────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=frontend /frontend/dist ./frontend/dist

EXPOSE 8080

CMD ["node", "dist/src/server.js"]

