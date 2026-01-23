import os
from dotenv import load_dotenv
import asyncio
from playwright.async_api import async_playwright

async def main():
    print("--- Checking Environment ---")
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    print(f"Loading .env from: {env_path}")
    load_dotenv(env_path)
    
    key = os.getenv("CAPTCHA_KEY")
    if key:
        print(f"CAPTCHA_KEY found: {key[:5]}... (length: {len(key)})")
    else:
        print("ERROR: CAPTCHA_KEY is missing or empty.")

    print("\n--- Checking Playwright ---")
    try:
        async with async_playwright() as p:
            print("Playwright launched.")
            browser = await p.chromium.launch(headless=True)
            print("Chromium launched successfully.")
            await browser.close()
            print("Chromium closed.")
    except Exception as e:
        print(f"ERROR: Playwright failed: {e}")
        print("Try running: playwright install chromium")

if __name__ == "__main__":
    asyncio.run(main())
