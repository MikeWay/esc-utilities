# ── Angular build ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS angular-builder
WORKDIR /angular
COPY package*.json angular.json tsconfig*.json ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm ci
RUN npx ng build --base-href /ribmanager/ --configuration production

# ── Server build ─────────────────────────────────────────────────
FROM node:22-bookworm-slim AS server-builder
WORKDIR /build
COPY server/package*.json server/tsconfig.json server/tsconfig.prod.json ./
COPY server/src/ ./src/
RUN npm ci
RUN mkdir -p dist/keys && npm run build:prod

# ── Runtime ──────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
COPY --from=server-builder /build/package*.json ./
RUN npm ci --omit=dev
COPY --from=server-builder /build/dist/ ./dist/
COPY server/views/ ./views/
COPY --from=angular-builder /angular/server/public/browser/ ./public/browser/
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh
ENV PORT=3002
EXPOSE 3002
ENTRYPOINT ["./entrypoint.sh"]
