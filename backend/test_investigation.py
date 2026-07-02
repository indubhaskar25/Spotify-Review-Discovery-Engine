import urllib.request
import ssl
import json
import traceback

app_id = "324684580"
page = 1
url = f"https://itunes.apple.com/us/rss/customerreviews/page={page}/id={app_id}/sortBy=mostRecent/json"
context = ssl._create_unverified_context()

# We test with the original User-Agent that was suspected to fail
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
req = urllib.request.Request(url, headers=headers)

print("--- INVESTIGATION RESULTS ---")
print(f"1. Exact request URL being called:\n   {url}")
print(f"   (With User-Agent: {headers['User-Agent']})")

try:
    with urllib.request.urlopen(req, context=context) as response:
        status_code = response.getcode()
        print(f"\n2. HTTP Status Code:\n   {status_code}")
        
        print("\n3. Response Headers:")
        for k, v in response.headers.items():
            print(f"   {k}: {v}")
            
        raw_body_bytes = response.read()
        raw_body = raw_body_bytes.decode("utf-8")
        print(f"\n4. First 1000 characters of raw response body:\n{raw_body[:1000]}...")
        
        try:
            data = json.loads(raw_body)
            feed = data.get("feed", {})
            
            print("\n5. Verify whether the response contains:")
            print(f"   - feed: {'feed' in data}")
            print(f"   - feed.entry: {'entry' in feed}")
            print(f"   - feed.author: {'author' in feed}")
            print(f"   - feed.title: {'title' in feed}")
            
            entries = feed.get("entry", [])
            if isinstance(entries, dict):
                entries = [entries]
            
            print(f"\n6. Total number of entries returned:\n   {len(entries)}")
            
            if len(entries) == 0:
                if 'entry' not in feed:
                    print("\n7. feed.entry is missing!")
                    print("   Reason: Apple's WAF (Web Application Firewall) or caching layer (Akamai) ")
                    print("   intermittently strips the 'entry' array and returns only the feed metadata ")
                    print("   when it detects a generic browser User-Agent (like Mozilla/5.0) on the RSS API.")
                else:
                    print("\n8. feed.entry exists but is empty!")
        except Exception as e:
            print("\nError parsing JSON:", e)
            
except Exception as e:
    print(f"\nError executing request: {e}")
    traceback.print_exc()

print("\n--- END OF INVESTIGATION ---")
