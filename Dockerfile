# syntax=docker/dockerfile:1

# ---- Stage 1: build the frontend into static files ----
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend runtime, serving the built frontend ----
# node:20-slim (glibc) rather than alpine: better-sqlite3 ships prebuilt
# glibc binaries, so this avoids a native compile step at image build time.
FROM node:20-slim AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

# SQLite file lives here; mount a volume at this path to persist messages
# across container restarts/redeploys.
RUN mkdir -p /app/backend/data
VOLUME ["/app/backend/data"]

EXPOSE 4000
# Seeding is an upsert (safe to repeat), so running it on every boot means
# a fresh volume gets the two accounts automatically and an existing one
# just has its password hashes refreshed if the env vars changed.
CMD ["sh", "-c", "node src/seed.js && node src/server.js"]
