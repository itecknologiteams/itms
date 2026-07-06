# Multi-stage build for the Auth service.
# Built from the monorepo root context: docker build -f services/auth/Dockerfile .
# Produces a small, non-root, production image (docs/security.md §4).

# ---- Builder ----
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* tsconfig.base.json tsconfig.json ./
COPY libs ./libs
COPY services/auth ./services/auth
RUN npm ci
RUN npm run build -w @itms/common \
 && npm run build -w @itms/events \
 && npm run build -w @itms/auth \
 && npm run build -w @itms/auth-service

# ---- Runner ----
FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --uid 10001 --create-home --shell /usr/sbin/nologin itms

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/services/auth/dist ./services/auth/dist
COPY --from=builder /app/services/auth/package.json ./services/auth/package.json

USER itms
EXPOSE 3001
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "services/auth/dist/services/auth/src/main.js"]
