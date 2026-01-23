import asyncio
import sys
import os
import uvicorn

# Add project root to sys.path to ensure 'backend' module is found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Force ProactorEventLoopPolicy on Windows for Playwright
# This MUST be done before getting the event loop or importing libraries that might initialize it.
if sys.platform == 'win32':
    print("Setting WindowsProactorEventLoopPolicy...")
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Import app AFTER setting policy
from backend.main import app

if __name__ == "__main__":
    print("Starting Uvicorn...")
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        log_level="info"
    )
