import logging
from src.ingestion.app_store import AppStoreCollector
from src.ingestion.normalizer import Normalizer
from src.ingestion.cleaner import ReviewCleaner
from src.models.schemas import ReviewSource

logging.basicConfig(level=logging.INFO)

collector = AppStoreCollector()
# Hack to fix the user agent in the instance
import urllib.request
_orig = urllib.request.Request
def _req(url, headers=None, **kwargs):
    if headers and "Mozilla" in headers.get("User-Agent", ""):
        headers = {}
    return _orig(url, headers=headers or {}, **kwargs)
urllib.request.Request = _req

records = collector.load(use_live=True, limit=5)
print(f"Loaded {len(records)} live records")

if records:
    print("\n--- FIRST 5 RAW RECORDS ---")
    for r in records[:5]:
        print(r)

    normalizer = Normalizer()
    norm_records = normalizer.normalize_many(records, ReviewSource.APP_STORE)
    
    print("\n--- NORMALIZED RECORDS ---")
    for r in norm_records[:5]:
        print(r.text)
        
    cleaner = ReviewCleaner()
    cleaned_records, stats = cleaner.clean(norm_records, ReviewSource.APP_STORE)
    print("\n--- STATS ---")
    print(stats)
