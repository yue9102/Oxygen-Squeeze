# ── Stage 1: build the frontend (PWA) ──
FROM node:20-slim AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Same-origin API in the hosted build → VITE_API_BASE stays empty.
RUN npm run build

# ── Stage 2: python backend that also serves the built PWA ──
FROM python:3.11-slim AS app
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
# Place built web where main.py looks for it: <repo>/frontend/dist
COPY --from=web /web/dist /app/frontend/dist

# Writable data dir (HF Spaces / containers run as non-root user)
RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 8000
# Render provides $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
