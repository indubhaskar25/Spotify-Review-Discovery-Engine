import pandas as pd
import glob
from pathlib import Path

# Get latest parquet files for each source
latest_files = {}
for source in ["app_store", "play_store", "reddit", "forum"]:
    files = sorted(glob.glob(f"data/processed/{source}_*.parquet"))
    if files:
        latest_files[source] = files[-1]

all_reviews = []
for source, path in latest_files.items():
    df = pd.read_parquet(path)
    
    # For app/play store, prefer low ratings
    if source in ["app_store", "play_store"]:
        # Filter low rating or just take a sample if rating is null
        if "rating" in df.columns:
            try:
                df["rating"] = pd.to_numeric(df["rating"])
                df = df.sort_values(by="rating", ascending=True)
            except:
                pass
        sample = df.head(50)
    else:
        # For reddit and forum, just sample randomly or take the longest
        df["text_len"] = df["text"].fillna("").str.len()
        df = df.sort_values(by="text_len", ascending=False)
        sample = df.head(25)
    
    for _, row in sample.iterrows():
        title = row.get("title", "")
        text = row.get("text", "")
        rating = row.get("rating", "N/A")
        all_reviews.append(f"[{source}] Rating: {rating} | Title: {title} | Text: {text}")

print("\n---\n".join(all_reviews))
