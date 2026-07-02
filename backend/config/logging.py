import logging
import sys
from typing import Literal


def setup_logging(
    level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO",
) -> logging.Logger:
    """Configure structured console logging for the application."""
    log_level = getattr(logging, level.upper(), logging.INFO)
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(log_level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)

    return logging.getLogger("spotify_review_engine")
