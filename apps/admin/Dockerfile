# Multi-stage build for the Admin Panel.
# Build from repo root: docker build -f apps/admin/Dockerfile .

FROM node:20-slim AS builder
WORKDIR /app
# Full monorepo copy: npm workspaces' lockfile validation needs every
# workspace's package.json present, not just this app's.
COPY . .
RUN npm ci
WORKDIR /app/apps/admin
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not
# read at container runtime — so this MUST be a build arg, not a `docker
# compose` `environment:` entry (which would silently have no effect).
ARG NEXT_PUBLIC_MOCK_MODE=false
ENV NEXT_PUBLIC_MOCK_MODE=$NEXT_PUBLIC_MOCK_MODE
RUN npm run build

FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin itms

# Next.js standalone output: a minimal self-contained server.
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

USER itms
EXPOSE 3100
ENV PORT=3100
CMD ["node", "apps/admin/server.js"]
