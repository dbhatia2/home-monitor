#!/usr/bin/env python3
"""Scheduler — reads users from DB, schedules per alert_frequency."""

import sys
import time
import logging
import subprocess
from datetime import datetime

import schedule

logging.basicConfig(level=logging.INFO, format="%(asctime)s [scheduler] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
log = logging.getLogger(__name__)


def _run(cmd, label):
    log.info(f"Starting: {label}")
    t0 = time.time()
    result = subprocess.run(["python", "-u"] + cmd, capture_output=False)
    elapsed = round(time.time() - t0, 1)
    if result.returncode == 0:
        log.info(f"Done: {label} ({elapsed}s)")
    else:
        log.error(f"Failed: {label} (exit {result.returncode})")


def job_scrape():
    """Scrape all cities, all builders."""
    _run(["scraper.py"], "scrape all")


def job_emails():
    """Send emails to all daily users."""
    try:
        from db.user_store import get_active_users
        from email.digest import build_and_send as send_digest
        from email.personal import build_and_send as send_personal

        users = get_active_users(frequency="daily")
        log.info(f"Sending emails to {len(users)} daily users")

        for user in users:
            try:
                send_digest(user)
                send_personal(user, mode="personal")
                send_personal(user, mode="mir")
            except Exception as e:
                log.error(f"Email failed for {user['name']}: {e}")
    except Exception as e:
        log.error(f"Cannot load users from DB: {e}")
        # Fallback: run email scripts directly
        _run(["email_digest_standalone.py"], "digest fallback")


def run_all():
    """Run all jobs now (startup with --now)."""
    log.info("=" * 60)
    log.info("Running all jobs now...")
    log.info("=" * 60)
    job_scrape()
    job_emails()
    log.info("=" * 60)
    log.info("All jobs complete.")
    log.info("=" * 60)


def main():
    schedule.every().day.at("07:00").do(job_scrape)
    schedule.every().day.at("07:05").do(job_emails)

    log.info("Home Monitor Scheduler started")
    log.info("  07:00 — scrape all cities/builders")
    log.info("  07:05 — emails (digest + personal + MIR) to all daily users")

    if "--now" in sys.argv:
        run_all()

    log.info("Waiting for next scheduled run...")
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()
