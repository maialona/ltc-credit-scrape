from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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

@app.get("/")
def read_root():
    return {"status": "ok", "service": "LTC Credit Crawler"}

@app.post("/api/crawl/single", response_model=CrawlResult)
async def crawl_single(request: CrawlRequest):
    print(f"DEBUG: Processing request for {request.idno}")
    try:
        api_key = os.getenv("CAPTCHA_KEY")
        if not api_key:
             print("DEBUG: API Key missing in env")
             return JSONResponse(status_code=500, content={"error": "Server configuration error: CAPTCHA_KEY missing", "status": "failed"})
        
        print(f"DEBUG: Using API Key (starting with): {api_key[:4]}")
        result = await crawler.crawl_single(request.idno, request.dob, api_key)
        print(f"DEBUG: Crawl result status: {result.status}")
        # Check if we have gathered results even if status is success, sometimes parsing fails silently
        return result
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        with open("backend_error.log", "a", encoding="utf-8") as f:
            f.write(f"Error in crawl_single: {str(e)}\n{error_trace}\n{'-'*60}\n")
        return JSONResponse(status_code=500, content={"error": str(e), "status": "failed", "trace": error_trace})

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
            
            # Start event
            start_payload = json.dumps({"type": "start", "total": total}, ensure_ascii=False) + "\n"
            print(f"DEBUG: Yielding start event: {start_payload.strip()}")
            yield start_payload

            for index, row in df.iterrows():
                # Extract data
                emp_id = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ""
                name = str(row.iloc[1]) if pd.notna(row.iloc[1]) else ""
                idno = str(row.iloc[2]) if pd.notna(row.iloc[2]) else ""
                dob = str(row.iloc[3]) if pd.notna(row.iloc[3]) else ""
                organization = ""
                if len(row) > 4:
                    organization = str(row.iloc[4]) if pd.notna(row.iloc[4]) else ""
                
                # 1. Log Start
                yield json.dumps({
                    "type": "log", 
                    "message": f"[{index+1}/{total}] 正在查詢: {name} ({mask_id(idno)})..."
                }, ensure_ascii=False) + "\n"
                
                # Simple validation
                if not idno or not dob:
                    res_dict = CrawlResult(status="failed", error_message="Missing ID or DOB", idno=idno, dob=dob).dict()
                    res_dict["emp_id"] = emp_id
                    res_dict["name"] = name
                    res_dict["organization"] = organization
                    
                    yield json.dumps({"type": "result", "data": res_dict}, ensure_ascii=False) + "\n"
                    yield json.dumps({"type": "progress", "current": index + 1}, ensure_ascii=False) + "\n"
                    continue

                # Crawl
                await asyncio.sleep(1) # Small buffer
                try:
                    res = await crawler.crawl_single(idno, dob, api_key)
                    res.emp_id = emp_id
                    res.name = name
                    res.organization = organization
                    
                    # Yield Result
                    yield json.dumps({"type": "result", "data": res.dict()}, ensure_ascii=False) + "\n"
                    
                    # Log Success info
                    status_msg = "成功" if res.status == "success" else f"失敗: {res.error_message}"
                    yield json.dumps({
                        "type": "log", 
                        "message": f"➥ 查詢結果: {status_msg}"
                    }, ensure_ascii=False) + "\n"

                except Exception as e:
                    err_res = CrawlResult(
                        idno=idno, dob=dob, emp_id=emp_id, name=name, organization=organization,
                        status="failed", error_message=str(e)
                    )
                    yield json.dumps({"type": "result", "data": err_res.dict()}, ensure_ascii=False) + "\n"
                    yield json.dumps({"type": "log", "message": f"➥ 發生錯誤: {str(e)}"}, ensure_ascii=False) + "\n"
                
                # Yield Progress
                yield json.dumps({"type": "progress", "current": index + 1}, ensure_ascii=False) + "\n"
        
        except Exception as gen_e:
            import traceback
            print(f"CRITICAL ERROR in iter_crawl: {gen_e}")
            traceback.print_exc()
            yield json.dumps({
                "type": "log", 
                "message": f"伺服器內部錯誤 (Generator): {str(gen_e)}"
            }, ensure_ascii=False) + "\n"
    
    return StreamingResponse(iter_crawl(), media_type="application/x-ndjson")

def mask_id(idno):
    if len(idno) > 6:
        return idno[:3] + "***" + idno[-3:]
    return idno
