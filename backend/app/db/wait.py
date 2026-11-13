"""Block until the database accepts connections (used before migrations / the scheduler start)."""

import sys
import time

from sqlalchemy import text

from app.db.session import engine


def wait_for_database(timeout_seconds: int = 90, interval_seconds: float = 2.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    while True:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Database is ready.", flush=True)
            return
        except Exception as exc:  # noqa: BLE001 - any connection failure means "not ready yet"
            if time.monotonic() >= deadline:
                print(f"Database not reachable after {timeout_seconds}s: {type(exc).__name__}", file=sys.stderr)
                raise SystemExit(1)
            time.sleep(interval_seconds)


if __name__ == "__main__":
    wait_for_database()
