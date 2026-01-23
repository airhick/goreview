import requests
import re
import json
import time
import random
import os

def fetch_and_save_data(cids):
    results = {}
    
    # 1. HEADERS: Crucial to look like a real browser
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
    }

    # 2. COOKIES: Bypass "Before you continue" in Europe
    cookies = {
        "CONSENT": "YES+cb.20230117-07-p0.en+FX+117" 
    }

    if not os.path.exists("debug_html"):
        os.makedirs("debug_html")

    for cid in cids:
        try:
            print(f"\n⚡️ Fetching CID: {cid}...")
            
            # Search specifically for the CID to trigger Knowledge Graph
            url = f"https://www.google.com/search?q={cid}&hl=en"
            
            response = requests.get(url, headers=headers, cookies=cookies, timeout=10)
            
            if response.status_code != 200:
                print(f"❌ HTTP Error: {response.status_code}")
                continue

            html_content = response.text

            # --- STEP A: SAVE RAW HTML (Hydration) ---
            # We save this so you can inspect it manually if needed
            filename = f"debug_html/google_{cid}.html"
            with open(filename, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"📄 HTML saved to: {filename}")

            # --- STEP B: LOCATE DATA ---
            print("🔍 Scanning HTML for data...")

            # Pattern 1: JSON-LD (Best Source)
            # Google often embeds a clean JSON object for SEO
            json_match = re.search(r'"ratingValue":\s*"(\d+\.?\d*)".*?"reviewCount":\s*"(\d+)"', html_content, re.DOTALL)
            
            # Pattern 2: Meta Tags
            # Sometimes data is in <div class="Ob2kfd"><span aria-label="4.2 stars">
            aria_match = re.search(r'aria-label="([\d\.]+)\s+stars,\s+([\d,]+)\s+reviews"', html_content)

            if json_match:
                rating = float(json_match.group(1))
                reviews = int(json_match.group(2))
                print(f"✅ Found (JSON-LD): {rating} stars | {reviews} reviews")
                results[cid] = {"rating": rating, "reviews": reviews}

            elif aria_match:
                rating = float(aria_match.group(1))
                reviews = int(aria_match.group(2).replace(',', ''))
                print(f"✅ Found (Aria Label): {rating} stars | {reviews} reviews")
                results[cid] = {"rating": rating, "reviews": reviews}
            
            else:
                print(f"⚠️ Data not found automatically. Check {filename} manually.")
                results[cid] = {"rating": 0.0, "reviews": 0}

        except Exception as e:
            print(f"❌ Error: {e}")
            results[cid] = {"rating": 0.0, "reviews": 0}

        # Sleep to avoid blocks
        time.sleep(random.uniform(1, 3))

    return results

if __name__ == "__main__":
    # Example CIDs
    my_cids = [
        "15003369668478335036", # The Louvre
        "5179836334687664689",  # Eiffel Tower
    ]

    data = fetch_and_save_data(my_cids)

    # Save final JSON
    with open('map_data.json', 'w') as f:
        json.dump(data, f, indent=4)