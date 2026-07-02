import logging
from src.ingestion.app_store import AppStoreCollector
import json

logging.basicConfig(level=logging.INFO)
collector = AppStoreCollector()
records = collector.fetch_live(limit=5)
print(f"Returned {len(records)} records")
if len(records) > 0:
    print(json.dumps(records[0], indent=2))
