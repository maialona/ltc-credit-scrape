from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import io
import asyncio
from typing import List
import shutil
import os

from .models import CrawlRequest, CrawlResult
from .crawler import LtcCrawler
from dotenv import load_dotenv
import sys

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Fix for Playwright on Windows: Handled in run.py
# if sys.platform == 'win32':
#     asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI()

# Global Exception Handler
from fastapi import Request
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = f"GLOBAL CRASH: {str(exc)}\n{traceback.format_exc()}"
    print(error_msg, flush=True)
    with open("fatal_error.log", "a", encoding="utf-8") as f:
        f.write(error_msg + "\n" + "-"*60 + "\n")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

crawler = LtcCrawler(headless=True)

# Serve Static Files
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

# API routes are defined above this. 
# Anything that isn't an API route will be handled by the static files/React Router.
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")
else:
    @app.get("/")
    def read_root():
        return {"status": "ok", "service": "LTC Credit Crawler (Static files not found)"}

@app.post("/api/crawl/single")
async def crawl_single(request: CrawlRequest):
    from fastapi.responses import StreamingResponse
    import json

    print(f"DEBUG: Processing request for {request.idno}")
    
    async def iter_crawl():
        try:
            api_key = os.getenv("CAPTCHA_KEY")
            if not api_key:
                 yield json.dumps({"type": "log", "message": "錯誤: CAPTCHA_KEY 未設定"}, ensure_ascii=False) + "\n"
                 yield json.dumps({"type": "error", "message": "Server Config Error"}, ensure_ascii=False) + "\n"
                 return
            
            queue = asyncio.Queue()

            # Initial logs
            await queue.put({"type": "start", "total": 100})
            await queue.put({"type": "log", "message": f"準備查詢: {request.idno} (API Key: {api_key[:4]}...)"})
            
            # Callback: Puts events into Queue
            async def progress_bridge(cur, total, msg):
                await queue.put({"type": "progress", "current": cur})
                await queue.put({"type": "log", "message": msg})

            # Worker Task
            async def worker():
                try:
                    result = await crawler.crawl_single(request.idno, request.dob, api_key, progress_callback=progress_bridge)
                    if result.status == "success":
                         await queue.put({"type": "log", "message": "查詢成功！"})
                         await queue.put({"type": "result", "data": result.dict()})
                    else:
                         await queue.put({"type": "log", "message": f"查詢失敗: {result.error_message}"})
                         await queue.put({"type": "error", "message": result.error_message})
                except Exception as worker_e:
                     await queue.put({"type": "log", "message": f"執行錯誤: {str(worker_e)}"})
                     await queue.put({"type": "error", "message": str(worker_e)})
                finally:
                     await queue.put(None) # Sentinel

            # Start worker background task
            asyncio.create_task(worker())
            
            # Consumer Loop
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield json.dumps(item, ensure_ascii=False) + "\n"
                
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            with open("backend_error.log", "a", encoding="utf-8") as f:
                f.write(f"Error in crawl_single: {str(e)}\n{error_trace}\n{'-'*60}\n")
            
            yield json.dumps({"type": "log", "message": f"系统發生錯誤: {str(e)}"}, ensure_ascii=False) + "\n"
            yield json.dumps({"type": "error", "message": str(e)}, ensure_ascii=False) + "\n"
            
    return StreamingResponse(iter_crawl(), media_type="application/x-ndjson")

@app.post("/api/crawl/batch")
async def crawl_batch(
    file: UploadFile = File(...)
):
    from fastapi.responses import StreamingResponse
    import json

    api_key = os.getenv("CAPTCHA_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Server configuration error: CAPTCHA_KEY missing")
        
    # Read Excel (Blocking I/O but acceptable for small files)
    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Excel file: {str(e)}")

    async def iter_crawl():
        try:
            print(f"DEBUG: Starting iter_crawl. DF shape: {df.shape}")
            total = len(df)
            
            # Queue for collecting events from workers
            queue = asyncio.Queue()
            # Semaphore to control concurrency (e.g., 4 parallel browsers)
            sem = asyncio.Semaphore(4) 
            
            async def worker(index, row):
                async with sem:
                    # Extract data
                    emp_id = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ""
                    name = str(row.iloc[1]) if pd.notna(row.iloc[1]) else ""
                    idno = str(row.iloc[2]) if pd.notna(row.iloc[2]) else ""
                    dob = str(row.iloc[3]) if pd.notna(row.iloc[3]) else ""
                    organization = ""
                    if len(row) > 4:
                        organization = str(row.iloc[4]) if pd.notna(row.iloc[4]) else ""
                    
                    # Log Start
                    await queue.put({
                        "type": "log", 
                        "message": f"[{index+1}/{total}] 正在查詢: {name} ({mask_id(idno)})..."
                    })

                    # Simple validation
                    if not idno or not dob:
                        res_dict = CrawlResult(status="failed", error_message="Missing ID or DOB", idno=idno, dob=dob).dict()
                        res_dict["emp_id"] = emp_id
                        res_dict["name"] = name
                        res_dict["organization"] = organization
                        
                        await queue.put({"type": "result", "data": res_dict})
                        await queue.put({"type": "progress_increment"})
                        return

                    # Crawl
                    try:
                        # Add random small delay to prevent exact simultaneous hits if needed
                        await asyncio.sleep(0.1) 
                        
                        res = await crawler.crawl_single(idno, dob, api_key)
                        res.emp_id = emp_id
                        res.name = name
                        res.organization = organization
                        
                        # Result
                        await queue.put({"type": "result", "data": res.dict()})
                        
                        # Log Status
                        status_msg = "成功" if res.status == "success" else f"失敗: {res.error_message}"
                        await queue.put({
                            "type": "log", 
                            "message": f"➥ {name} 查詢結果: {status_msg}"
                        })

                    except Exception as e:
                        err_res = CrawlResult(
                            idno=idno, dob=dob, emp_id=emp_id, name=name, organization=organization,
                            status="failed", error_message=str(e)
                        )
                        await queue.put({"type": "result", "data": err_res.dict()})
                        await queue.put({"type": "log", "message": f"➥ {name} 發生錯誤: {str(e)}"})
                    
                    await queue.put({"type": "progress_increment"})

            # Yield Start Event
            yield json.dumps({"type": "start", "total": total}, ensure_ascii=False) + "\n"

            # Use crawler as context manager to share browser instance
            async with crawler:
                # Launch all workers
                tasks = []
                for index, row in df.iterrows():
                    tasks.append(asyncio.create_task(worker(index, row)))
                
                # Background waiter to signal when all are done
                async def waiter():
                    await asyncio.gather(*tasks)
                    await queue.put(None) # Sentinel
                
                asyncio.create_task(waiter())

                # Consumer Loop
                completed_count = 0
                while True:
                    item = await queue.get()
                    if item is None:
                        break
                    
                    if item.get("type") == "progress_increment":
                        completed_count += 1
                        yield json.dumps({"type": "progress", "current": completed_count}, ensure_ascii=False) + "\n"
                    else:
                        yield json.dumps(item, ensure_ascii=False) + "\n"
        
        except Exception as gen_e:
            import traceback
            print(f"CRITICAL ERROR in iter_crawl: {gen_e}")
            traceback.print_exc()
            yield json.dumps({
                "type": "log", 
                "message": f"伺服器內部錯誤: {str(gen_e)}"
            }, ensure_ascii=False) + "\n"
    
    return StreamingResponse(iter_crawl(), media_type="application/x-ndjson")

def mask_id(idno):
    if len(idno) > 6:
        return idno[:3] + "***" + idno[-3:]
    return idno
