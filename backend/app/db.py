import os
from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine


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
    return engine


def get_db(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine) as session:
        yield session
