from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PRODUCTION_ENVS = {"production", "prod", "staging"}
MIN_JWT_SECRET_LENGTH = 32
_PLACEHOLDER_MARKERS = (
    "change", "replace", "development", "example", "your_", "your-",
)
_DEV_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)


class ConfigurationError(ValueError):
    """Raised when the application is configured insecurely for its environment."""


def _is_placeholder(value: str) -> bool:
    lowered = value.lower()
    return any(marker in lowered for marker in _PLACEHOLDER_MARKERS)


class Settings(BaseSettings):
    app_name: str = "CampusBite API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"

    # CORS: comma-separated list. FRONTEND_ORIGIN is kept as a backwards-compatible alias.
    cors_origins: str = ""
    frontend_origin: str = "http://localhost:5173"

    mysql_database: str = "campusbite"
    mysql_user: str = "campusbite_user"
    mysql_password: str = Field("change_this_local_password", repr=False)
    mysql_host: str = "db"
    mysql_port: int = 3306

    jwt_secret_key: str = Field("development-only-change-me", repr=False)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    database_url_override: str | None = Field(None, repr=False)

    openai_api_key: str | None = Field(None, repr=False)

    # Admin approval of owner / delivery accounts (header X-Admin-Key). Disabled when unset.
    admin_api_key: str | None = Field(None, repr=False)

    # Rate limits: "<max requests>" per "<window seconds>", stored in the database so they hold
    # across multiple API workers/instances.
    trust_proxy_headers: bool = False
    rate_limit_login_max: int = 10
    rate_limit_login_window_seconds: int = 60
    rate_limit_register_max: int = 5
    rate_limit_register_window_seconds: int = 3600
    rate_limit_ai_max: int = 20
    rate_limit_ai_window_seconds: int = 3600

    # Background scheduler. In production run it as its own process (python -m app.scheduler)
    # and set SCHEDULER_ENABLED=false for the API.
    scheduler_enabled: bool = True
    reminder_threshold_minutes: int = 15
    reminder_check_interval_minutes: int = 5

    model_config = SettingsConfigDict(env_file=[".env", "../.env"], extra="ignore", case_sensitive=False)

    # ------------------------------------------------------------------ validation
    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() in PRODUCTION_ENVS

    @model_validator(mode="after")
    def _validate_environment(self) -> "Settings":
        origins = self.cors_origin_list
        if "*" in origins:
            raise ConfigurationError("CORS_ORIGINS must not contain '*' because credentials are allowed")
        if self.is_production:
            secret = self.jwt_secret_key
            if len(secret) < MIN_JWT_SECRET_LENGTH or _is_placeholder(secret):
                raise ConfigurationError(
                    f"JWT_SECRET_KEY must be a random value of at least {MIN_JWT_SECRET_LENGTH} "
                    "characters in production (generate one with: openssl rand -hex 32)"
                )
            if not self.database_url_override and _is_placeholder(self.mysql_password):
                raise ConfigurationError("MYSQL_PASSWORD must be set to a real secret in production")
            if not origins:
                raise ConfigurationError("CORS_ORIGINS must list the allowed frontend origin(s) in production")
            if self.admin_api_key is not None and len(self.admin_api_key) < MIN_JWT_SECRET_LENGTH:
                raise ConfigurationError("ADMIN_API_KEY must be at least 32 characters in production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        """Explicit origins from the environment; local dev origins are added outside production."""
        raw = [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]
        legacy = [o.strip().rstrip("/") for o in self.frontend_origin.split(",") if o.strip()]
        if self.is_production:
            # The localhost default of FRONTEND_ORIGIN must never leak into production.
            legacy = [o for o in legacy if "localhost" not in o and "127.0.0.1" not in o]
        else:
            legacy = legacy + list(_DEV_CORS_ORIGINS)
        origins: list[str] = []
        for origin in raw + legacy:
            if origin not in origins:
                origins.append(origin)
        return origins

    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self.database_url_override
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
            "?charset=utf8mb4"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
