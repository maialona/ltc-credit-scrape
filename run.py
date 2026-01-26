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
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Uvicorn on port {port}...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port, 
        log_level="info"
    )
