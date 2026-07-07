# Multi-stage build for the Notification service.
# Build from repo root: docker build -f services/notification/Dockerfile .

FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
# Full monorepo copy: npm workspaces' lockfile validation needs every
# workspace's package.json present, not just this service's.
COPY . .
RUN npm ci
RUN npm run build -w @itms/common \
 && npm run build -w @itms/events \
 && npm run build -w @itms/auth \
 && npm run build -w @itms/notification-service

FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --uid 10001 --create-home --shell /usr/sbin/nologin itms
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/services/notification/dist ./services/notification/dist
COPY --from=builder /app/services/notification/package.json ./services/notification/package.json
USER itms
EXPOSE 3011
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "services/notification/dist/services/notification/src/main.js"]
