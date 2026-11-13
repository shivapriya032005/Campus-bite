"""Migration validation: Alembic must build exactly the schema the ORM models expect."""

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.core.config import settings
from app.db.base import Base

import app.models  # noqa: F401

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _alembic_config() -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return cfg


def _schema(engine):
    insp = inspect(engine)
    tables = {t for t in insp.get_table_names() if t != "alembic_version"}
    columns = {(t, c["name"]) for t in tables for c in insp.get_columns(t)}
    uniques = {
        (t, tuple(ix["column_names"]))
        for t in tables
        for ix in insp.get_indexes(t)
        if ix.get("unique")
    } | {(t, tuple(u["column_names"])) for t in tables for u in insp.get_unique_constraints(t)}
    return tables, columns, uniques


def test_migrations_match_models_on_sqlite(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'migrated.db'}"
    monkeypatch.setattr(settings, "database_url_override", url)
    command.upgrade(_alembic_config(), "head")

    migrated = create_engine(url)
    from_models = create_engine(f"sqlite:///{tmp_path / 'models.db'}")
    Base.metadata.create_all(from_models)

    m_tables, m_columns, m_uniques = _schema(migrated)
    o_tables, o_columns, o_uniques = _schema(from_models)
    assert m_tables == o_tables
    assert m_columns == o_columns
    assert m_uniques == o_uniques  # includes uq(order_id, entry_type) and uq(order_id, trigger_status)


def test_migrations_upgrade_downgrade_roundtrip_on_sqlite(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'roundtrip.db'}"
    monkeypatch.setattr(settings, "database_url_override", url)
    cfg = _alembic_config()
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "001_initial")
    assert not inspect(create_engine(url)).has_table("rate_limit_counters")
    command.upgrade(cfg, "head")
    assert inspect(create_engine(url)).has_table("rate_limit_counters")


def test_orders_have_the_required_composite_indexes(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'idx.db'}")
    Base.metadata.create_all(engine)
    indexes = {tuple(ix["column_names"]) for ix in inspect(engine).get_indexes("orders")}
    assert ("status", "updated_at") in indexes
    assert ("restaurant_id", "created_at") in indexes
    assert ("customer_id", "created_at") in indexes


@pytest.mark.skipif(settings.is_production, reason="never mutate a production database in tests")
def test_single_alembic_head():
    from alembic.script import ScriptDirectory

    heads = ScriptDirectory.from_config(_alembic_config()).get_heads()
    assert heads == ["002_integrity"]
