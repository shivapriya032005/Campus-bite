import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.restaurants import router as restaurant_router
from app.api.v1.endpoints.menu_items import router as menu_router
from app.api.v1.endpoints.orders import router as order_router
from app.api.v1.endpoints.deliveries import router as delivery_router
from app.api.v1.endpoints.reviews_refunds import router as reviews_refunds_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.insights import router as insights_router
from app.api.v1.endpoints.admin import router as admin_router
from app.core.config import settings
from app.scheduler import build_background_scheduler

# Import models so they are registered with SQLAlchemy metadata
import app.models  # noqa: F401

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("campusbite.api")

@asynccontextmanager
async def lifespan(application: FastAPI):
    """Start the in-process scheduler (dev / single-instance) unless a dedicated one is used."""
    scheduler = None
    if settings.scheduler_enabled:
        scheduler = build_background_scheduler()
        scheduler.start()
        logger.info("In-process scheduler started (jobs are guarded by a database lease)")
    else:
        logger.info("In-process scheduler disabled (SCHEDULER_ENABLED=false)")
    yield
    if scheduler is not None:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Restaurant ordering and delivery platform API",
    lifespan=lifespan,
)

cors_origins = settings.cors_origin_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    started_at = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started_at) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"
    logger.info(
        "%s %s -> %s (%.2f ms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


# --- health (unversioned under /api/v1 for backward compat) ---
app.include_router(health_router, prefix=settings.api_v1_prefix)

# --- versioned API routes ---
prefix = settings.api_v1_prefix
app.include_router(auth_router, prefix=prefix)
app.include_router(restaurant_router, prefix=prefix)
app.include_router(menu_router, prefix=prefix)
app.include_router(order_router, prefix=prefix)
app.include_router(delivery_router, prefix=prefix)
app.include_router(reviews_refunds_router, prefix=prefix)
app.include_router(dashboard_router, prefix=prefix)
app.include_router(insights_router, prefix=prefix)
app.include_router(admin_router, prefix=prefix)


@app.get("/", tags=["Root"])
def root():
    return {"message": "Welcome to CampusBite API", "docs": "/docs"}
