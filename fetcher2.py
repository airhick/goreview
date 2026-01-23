import time
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def get_google_maps_data(place_id):
    # 1. Setup Chrome Options (Headless = No visible UI, faster)
    chrome_options = Options()
    chrome_options.add_argument("--headless=new") # Comment this out to see the browser work
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # Fake a real user agent to avoid being blocked immediately
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36")

    # 2. Initialize Driver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # URL construction that forces the specific place panel to open
    url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
    
    try:
        print(f"Loading URL for Place ID: {place_id}...")
        driver.get(url)

        # 3. Handle 'Before you continue' Cookie Consent (If in EU/UK)
        try:
            # Wait briefly to see if the consent modal appears
            wait = WebDriverWait(driver, 3)
            consent_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(@aria-label, 'Accept all')]")))
            consent_button.click()
            print("Cookie consent accepted.")
        except:
            # If no popup, just continue
            pass

        # 4. Wait for the main content to load
        wait = WebDriverWait(driver, 10)
        # We wait for the main header element (usually h1)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))

        # 5. Extract Data using robust selectors (Accessibility labels)
        # Note: Google changes Class Names (like 'F7nice') frequently. 
        # We rely on 'aria-label' which is used for screen readers and changes less often.
        
        # Rating is usually in a span with an aria-label like "4.5 stars"
        rating_element = driver.find_element(By.XPATH, '//span[@role="img" and contains(@aria-label, "stars")]')
        rating_text = rating_element.get_attribute("aria-label")
        
        # Reviews count is usually inside a button near the rating
        # We look for a button that contains the text "reviews" inside its aria-label
        reviews_element = driver.find_element(By.XPATH, '//button[contains(@aria-label, "reviews")]')
        reviews_text = reviews_element.get_attribute("aria-label")

        # 6. Parse the text (Clean it up)
        # Extract number from "4.5 stars"
        rating_val = re.search(r"(\d+\.\d+)", rating_text).group(1) if rating_text else "N/A"
        
        # Extract number from "1,234 reviews" (remove commas)
        reviews_val = re.search(r"([\d,]+)", reviews_text).group(1).replace(',', '') if reviews_text else "N/A"

        return {
            "place_id": place_id,
            "rating": rating_val,
            "reviews": reviews_val
        }

    except Exception as e:
        print(f"Error: {e}")
        # Debugging: Save screenshot if it fails
        driver.save_screenshot("debug_error.png")
        return None
        
    finally:
        driver.quit()

# --- RUN IT ---
target_id = "ChIJ3zGc_3jT9EcRdspFKy4qrzI"
data = get_google_maps_data(target_id)

if data:
    print("-" * 30)
    print(f"SUCCESS!")
    print(f"Rating:  {data['rating']}")
    print(f"Reviews: {data['reviews']}")
    print("-" * 30)
else:
    print("Failed to fetch data.")