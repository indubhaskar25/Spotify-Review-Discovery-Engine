import urllib.request
import ssl
import json

url = "https://itunes.apple.com/us/rss/customerreviews/page=1/id=324684580/sortBy=mostRecent/json"
context = ssl._create_unverified_context()

# We test with the original User-Agent that was suspected to fail
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

req = urllib.request.Request(url, headers=headers)
print(f"1. Request URL: {url}")
print(f"   User-Agent: {headers['User-Agent']}")

try:
    with urllib.request.urlopen(req, context=context) as response:
        status_code = response.getcode()
        print(f"\n2. HTTP Status Code: {status_code}")
        
        print("\n3. Response Headers:")
        for k, v in response.headers.items():
            print(f"   {k}: {v}")
            
        raw_body = response.read().decode("utf-8")
        print(f"\n4. First 1000 characters of raw response body:\n{raw_body[:1000]}...\n")
        
        data = json.loads(raw_body)
        feed = data.get("feed", {})
        
        print("5. Feed contents:")
        print(f"   Has 'feed': {'feed' in data}")
        print(f"   Has 'feed.entry': {'entry' in feed}")
        print(f"   Has 'feed.author': {'author' in feed}")
        print(f"   Has 'feed.title': {'title' in feed}")
        print(f"   All feed keys: {list(feed.keys())}")
        
        entries = feed.get("entry", [])
        if isinstance(entries, dict):
            entries = [entries]
        print(f"\n6. Total number of entries returned: {len(entries)}")
        
except Exception as e:
    print(f"Error: {e}")

