# syntax=docker/dockerfile:1
# Multi-stage image:  --target dev  (hot reload, used by docker-compose.yml)
#                     --target prod (default; used by docker-compose.prod.yml)

# ---- builder: compile/install dependencies into a virtualenv --------------------------------
FROM python:3.12-slim AS builder
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc default-libmysqlclient-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*
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

# ---- dev: source is bind-mounted by docker-compose.yml, reload on change -------------------
FROM base AS dev
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "python -m app.db.wait && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]

# ---- prod: non-root, no reload, no source mounts, no secrets baked in -----------------------
FROM base AS prod
RUN groupadd --system app && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app
COPY --chown=app:app . .
USER app
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4)"
# Migrations run in the separate one-shot `migrate` service; WEB_CONCURRENCY sets the worker count.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-2} --proxy-headers"]
