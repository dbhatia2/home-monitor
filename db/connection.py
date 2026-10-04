"""Single connection factory — used by all DB modules."""

import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# Support both direct connection and connection string
_connection_string = os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL")

if _connection_string:
    # Use connection string (for Supabase)
    _CFG = {
        "dsn": _connection_string,
        "cursor_factory": psycopg2.extras.RealDictCursor,
        "connect_timeout": 10,
    }
else:
    # Use individual parameters (for local)
    _CFG = {
        "host": os.environ.get("DB_HOST", "127.0.0.1"),
        "port": int(os.environ.get("DB_PORT", 5432)),
        "user": os.environ.get("DB_USER", "monitor"),
        "password": os.environ.get("DB_PASS", "monitor123"),
        "database": os.environ.get("DB_NAME", "home_monitor"),
        "cursor_factory": psycopg2.extras.RealDictCursor,
        "connect_timeout": 10,
    }


def get_connection():
    """Return a new PostgreSQL connection. Caller is responsible for closing."""
    return psycopg2.connect(**_CFG)
