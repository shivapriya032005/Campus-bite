"""Test configuration and fixtures using an in-memory SQLite database."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User, UserRole

# SQLite in-memory database with static pool to retain state across connections in a test
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def test_settings(monkeypatch):
    """Keep the background scheduler off and rate limits generous unless a test overrides them."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "scheduler_enabled", False)
    for name in ("login", "register", "ai"):
        monkeypatch.setattr(settings, f"rate_limit_{name}_max", 10_000)
    yield


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    def _make_headers(user_id: int, role: str):
        token = create_access_token({"sub": str(user_id), "role": role})
        return {"Authorization": f"Bearer {token}"}

    return _make_headers



# ---------------------------------------------------------------------------
# "Real" database fixtures: file-based SQLite and one session per request, i.e. production-like
# transaction semantics (no outer test transaction), so rollbacks and races can be exercised.
# ---------------------------------------------------------------------------

@pytest.fixture
def real_engine(tmp_path):
    eng = create_engine(
        f"sqlite:///{tmp_path / 'real.db'}", connect_args={"check_same_thread": False, "timeout": 30}
    )
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def real_session_factory(real_engine):
    return sessionmaker(bind=real_engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def real_db(real_session_factory):
    session = real_session_factory()
    yield session
    session.close()


@pytest.fixture
def real_client(real_session_factory):
    def override_get_db():
        session = real_session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
