"""APScheduler setup for scheduled exception detection."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()


def start_scheduler() -> None:
    """Start background scheduler placeholder."""
    pass


def stop_scheduler() -> None:
    """Shut down background scheduler placeholder."""
    pass
