# syntax=docker/dockerfile:1
# Multi-stage image:  --target dev  (hot reload, used by docker-compose.yml)
#                     --target prod (default; used by docker-compose.prod.yml)

# ---- builder: compile/install dependencies into a virtualenv --------------------------------
FROM python:3.12-slim AS builder
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
# Optional extra CA certificates (*.crt) for networks that re-sign HTTPS traffic, e.g. antivirus
# "web shield" scanning or a corporate proxy. Drop them into backend/certs/ (git-ignored).
# With no extra certificates this is a no-op that still uses the standard system CA bundle.
COPY certs/ /usr/local/share/ca-certificates/extra/
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates gcc default-libmysqlclient-dev pkg-config \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV PIP_CERT=/etc/ssl/certs/ca-certificates.crt
RUN python -m venv /opt/venv
COPY requirements.txt .
RUN /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ---- runtime base ---------------------------------------------------------------------------
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
# Same optional extra CAs at runtime (e.g. outbound HTTPS to the OpenAI API behind a scanning proxy)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

# ---- dev: source is bind-mounted by docker-compose.yml, reload on change -------------------
FROM base AS dev
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "python -m app.db.wait && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]

# ---- prod: non-root, no reload, no source mounts, no secrets baked in -----------------------
FROM base AS prod
RUN groupadd --system app && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app
COPY --chown=app:app . .
RUN rm -rf /app/certs   # build-time CAs are already merged into the system bundle
USER app
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4)"
# Migrations run in the separate one-shot `migrate` service; WEB_CONCURRENCY sets the worker count.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-2} --proxy-headers"]
