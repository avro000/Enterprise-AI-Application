"""APScheduler setup for scheduled exception detection."""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.database import async_session_maker
from app.services.exception_detector import ExceptionDetectorService

logger = logging.getLogger("scheduler")

scheduler = AsyncIOScheduler()


async def scheduled_exception_detection():
    """Periodic job invoking ExceptionDetectorService to identify SLA risks."""
    logger.info("Running scheduled operational exception detection...")
    try:
        async with async_session_maker() as session:
            detected = await ExceptionDetectorService.detect_exceptions(session)
            logger.info(f"Scheduled detection cycle complete: {len(detected)} exceptions created.")
    except Exception as e:
        logger.error(f"Error during scheduled exception detection cycle: {e}")


def start_scheduler() -> None:
    """Configures jobs and starts the background AsyncIOScheduler."""
    if not scheduler.running:
        interval_mins = settings.EXCEPTION_CHECK_INTERVAL_MINUTES or 15
        scheduler.add_job(
            scheduled_exception_detection,
            "interval",
            minutes=interval_mins,
            id="exception_detection_job",
            replace_existing=True,
        )
        scheduler.start()
        logger.info(f"Exception detector scheduler started (interval: {interval_mins} mins).")


def stop_scheduler() -> None:
    """Gracefully terminates background scheduler execution."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Exception detector scheduler stopped.")

