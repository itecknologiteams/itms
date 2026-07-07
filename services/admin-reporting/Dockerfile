# Multi-stage build for the Admin/Reporting service.
# Build from repo root: docker build -f services/admin-reporting/Dockerfile .

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
 && npm run build -w @itms/admin-reporting-service

FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --uid 10001 --create-home --shell /usr/sbin/nologin itms
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/services/admin-reporting/dist ./services/admin-reporting/dist
COPY --from=builder /app/services/admin-reporting/package.json ./services/admin-reporting/package.json
USER itms
EXPOSE 3012
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "services/admin-reporting/dist/services/admin-reporting/src/main.js"]
