# Multi-stage build for the Payment service.
# Build from repo root: docker build -f services/payment/Dockerfile .

FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* tsconfig.base.json tsconfig.json ./
COPY libs ./libs
COPY services/payment ./services/payment
RUN npm ci
RUN npm run build -w @itms/common \
 && npm run build -w @itms/events \
 && npm run build -w @itms/auth \
 && npm run build -w @itms/payment-service

FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --uid 10001 --create-home --shell /usr/sbin/nologin itms
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/services/payment/dist ./services/payment/dist
COPY --from=builder /app/services/payment/package.json ./services/payment/package.json
USER itms
EXPOSE 3009
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "services/payment/dist/services/payment/src/main.js"]
