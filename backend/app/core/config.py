from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CampusBite API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    frontend_origin: str = "http://localhost:5173"

    mysql_database: str = "campusbite"
    mysql_user: str = "campusbite_user"
    mysql_password: str = "change_this_local_password"
    mysql_host: str = "db"
    mysql_port: int = 3306

    jwt_secret_key: str = "development-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    database_url_override: str | None = None

    openai_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=[".env", "../.env"], extra="ignore", case_sensitive=False)

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
