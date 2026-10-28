import os
from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine

from . import models  # noqa: F401  (registers the tables on SQLModel.metadata)


def resolve_database_url(url: str | None = None) -> str:
    """DATABASE_URL (or Vercel/Neon's POSTGRES_URL), else a local SQLite file.

    On Vercel without a database the only writable place is /tmp, which is per-instance and
    temporary: fine for a quick look, not for a demo across devices. Add Postgres for that.
    """
    url = url or os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if not url:
        url = "sqlite:////tmp/recoverlens.db" if os.environ.get("VERCEL") else "sqlite:///recoverlens.db"
    # Hosted Postgres URLs use postgres:// or postgresql://; SQLAlchemy needs the psycopg driver named.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def make_engine(url: str) -> Engine:
    url = resolve_database_url(url)
    if url.startswith("sqlite"):
        engine = create_engine(url, connect_args={"check_same_thread": False})
    else:
        # Serverless: small pool, drop dead connections between invocations.
        engine = create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=2)
    SQLModel.metadata.create_all(engine)
    add_missing_columns(engine)
    return engine


def add_missing_columns(engine: Engine) -> list[str]:
    """create_all never changes an existing table, so a database made by an older version would
    reject new fields. Add any missing nullable column (no data is touched or removed)."""
    insp = inspect(engine)
    added: list[str] = []
    for table in SQLModel.metadata.sorted_tables:
        if not insp.has_table(table.name):
            continue
        existing = {c["name"] for c in insp.get_columns(table.name)}
        for col in table.columns:
            if col.name in existing or not col.nullable:
                continue
            ddl = col.type.compile(dialect=engine.dialect)
            try:
                with engine.begin() as conn:
                    conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN "{col.name}" {ddl}'))
                added.append(f"{table.name}.{col.name}")
            except Exception:  # noqa: BLE001
                pass  # another serverless instance added it first
    return added


def get_db(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine) as session:
        yield session
