"""Single connection factory — used by all DB modules."""

import os
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

load_dotenv()

_CFG = dict(
    host=os.environ.get("DB_HOST", "127.0.0.1"),
    port=int(os.environ.get("DB_PORT", 3310)),
    user=os.environ.get("DB_USER", "monitor"),
    password=os.environ.get("DB_PASS", "monitor123"),
    database=os.environ.get("DB_NAME", "home_monitor"),
    charset="utf8mb4",
    connect_timeout=10,
    cursorclass=pymysql.cursors.DictCursor,
    autocommit=False,
)


def get_connection():
    """Return a new pymysql connection. Caller is responsible for closing."""
    return pymysql.connect(**_CFG)
