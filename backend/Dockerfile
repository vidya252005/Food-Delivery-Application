# --- deps: install dependencies in an isolated layer so `npm ci` is only
#     re-run when package*.json actually changes, not on every source edit ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- runtime: copy only node_modules + source into a fresh slim image ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Run as an unprivileged user rather than root inside the container.
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY scripts ./scripts
COPY docker-entrypoint.sh ./
USER nodeusr

EXPOSE 5001

# Docker/Kubernetes/orchestrators use this to know when the container is
# actually ready for traffic (not just "process started") - the same
# /health endpoint the app exposes for humans, polled from inside the
# container so it also proves the container's own networking works.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["./docker-entrypoint.sh"]
