import asyncio
import base64
import logging
from playwright.async_api import async_playwright, Page, BrowserContext
import httpx
from .models import CrawlResult
from .utils import parse_ltc_html, parse_course_list

logger = logging.getLogger(__name__)

class LtcCrawler:
    BASE_URL = "https://ltcpap.mohw.gov.tw/molc/eg999/index"
    CAPTCHA_URL = "https://ltcpap.mohw.gov.tw/molc/eg999/captcha"

    def __init__(self, headless: bool = True):
        self.headless = headless

    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=self.headless)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if hasattr(self, 'browser') and self.browser:
            await self.browser.close()
            self.browser = None
        if hasattr(self, 'playwright') and self.playwright:
            await self.playwright.stop()
            self.playwright = None

    async def solve_captcha_2captcha(self, api_key: str, image_bytes: bytes) -> str:
        """
        Solves captcha using 2captcha API.
        """
        if not api_key:
            raise ValueError("2captcha API Key is missing")

        b64_img = base64.b64encode(image_bytes).decode('utf-8')
        
        async with httpx.AsyncClient() as client:
            # 1. Submit
            payload = {
                'key': api_key,
                'method': 'base64',
                'body': b64_img,
                'json': 1
            }
            resp = await client.post('http://2captcha.com/in.php', json=payload)
            data = resp.json()
            
            if data.get('status') != 1:
                raise Exception(f"2captcha submission failed: {data}")
            
            req_id = data['request']
            
            # 2. Poll result
            for _ in range(20): # Try for 60 seconds (3s * 20)
                await asyncio.sleep(3)
                resp = await client.get(f"http://2captcha.com/res.php?key={api_key}&action=get&id={req_id}&json=1")
                res_data = resp.json()
                
                if res_data.get('status') == 1:
                    return res_data['request']
                
                if res_data.get('request') != 'CAPCHA_NOT_READY':
                    raise Exception(f"2captcha error: {res_data.get('request')}")
            
            raise Exception("Captcha solution timed out")

    async def crawl_single(self, idno: str, dob: str, captcha_key: str, progress_callback=None) -> CrawlResult:
        """
        Crawls a single record.
        progress_callback: async function(current: int, total: int, message: str)
        """
        result = CrawlResult(idno=idno, dob=dob, status="failed")
        
        async def report(cur, tot, msg):
             if progress_callback:
                 await progress_callback(cur, tot, msg)

        await report(5, 100, "Initializing Browser...")
        
        # Ensure browser is initialized and connected
        if not hasattr(self, 'browser') or self.browser is None or not self.browser.is_connected():
             logger.warning("Browser not initialized or disconnected. Launching new instance...")
             await report(10, 100, "Relaunching Browser...")
             
             # Re-initialize Playwright if it was stopped
             if not hasattr(self, 'playwright') or self.playwright is None:
                 self.playwright = await async_playwright().start()
             
             # Re-launch Browser
             self.browser = await self.playwright.chromium.launch(headless=self.headless)

        return await self._crawl_with_browser(self.browser, idno, dob, captcha_key, result, report_fn=report)

    async def _crawl_with_browser(self, browser, idno: str, dob: str, captcha_key: str, result: CrawlResult, report_fn=None) -> CrawlResult:
        # Helper to simplify reporting
        async def r(c, t, m):
            if report_fn: await report_fn(c, t, m)
            
        context = await browser.new_context()
        page = await context.new_page()
            
        try:
            logger.info(f"Navigating to {self.BASE_URL}")
            await r(15, 100, "Navigating to LTC website...")
            await page.goto(self.BASE_URL)
            
            # 1. Get Captcha
            await r(25, 100, "Waiting for Captcha...")
            captcha_el = await page.wait_for_selector("#simpleCaptcha_image")
            if not captcha_el:
                raise Exception("Captcha element not found")
            
            await asyncio.sleep(1)
            img_bytes = await captcha_el.screenshot()
            
            # 2. Solve Captcha
            logger.info("Solving captcha...")
            await r(30, 100, "Solving Captcha (this may take 10-20s)...")
            captcha_text = await self.solve_captcha_2captcha(captcha_key, img_bytes)
            logger.info(f"Captcha solved: {captcha_text}")
            await r(50, 100, f"Captcha Solved: {captcha_text}")
            
            # 3. Fill Form
            await page.fill("input[name='idno']", idno)
            await page.fill("input[name='brDt']", dob) 
            await page.fill("input[name='captcha']", captcha_text)
            
            # 4. Submit
            await r(60, 100, "Submitting form...")
            await page.press("input[name='captcha']", "Enter")
            
            # 5. Wait for result
            await r(70, 100, "Waiting for query results...")
            try:
                await page.wait_for_function(
                    "document.getElementById('cpL11I3E') && document.getElementById('cpL11I3E').textContent.trim() !== ''",
                    timeout=60000
                )
                logger.info("Login successful and Total Points populated.")
                
                await asyncio.sleep(2) # Reduced from 5
                
                html = await page.content()
                result = parse_ltc_html(html, idno, dob)
                result.status = "success"
                
                # --- NEW: Fetch Course Details ---
                try:
                    logger.info("Fetching course details (Clicking 總查詢)...")
                    await r(85, 100, "Fetching detailed course records...")
                    
                    # The button opens a new tab (target='_blank'), so we need to wait for the new page
                    async with context.expect_page() as new_page_info:
                        await page.click("text=總查詢")
                        
                    course_page = await new_page_info.value
                    await course_page.wait_for_load_state()
                    
                    # Wait for the table container on the NEW page
                    try:
                        await course_page.wait_for_selector("div.course-content", timeout=10000)
                        await asyncio.sleep(2) # Buffer for table rendering
                        
                        course_html = await course_page.content()
                        courses = parse_course_list(course_html)
                        result.courses = courses
                        logger.info(f"Successfully parsed {len(courses)} courses from popup.")
                        await r(95, 100, f"Parsed {len(courses)} course records.")
                        
                    except Exception as wait_err:
                            logger.error(f"Timeout waiting for content on popup: {wait_err}")
                            await r(95, 100, "Timeout waiting for details popup.")
                    finally:
                        await course_page.close()
                        
                except Exception as course_error:
                    logger.error(f"Failed to fetch course details: {course_error}")
                # ---------------------------------
                
                await r(100, 100, "Done!")

            except Exception as wait_error:
                # ... existing error handling ...
                logger.error(f"Wait failed: {wait_error}")
                await r(100, 100, "Query failed or timed out.")
                # (keep existing fallback logic logic roughly same, omitted for brevity in this specific replacement but effectively we are replacing the block) 
                
                try:
                    await page.screenshot(path="debug_login_fail.png")
                except:
                    pass
                
                try:
                    html = await page.content()
                    if "登出" in html or "會員中心" in html:
                            result = parse_ltc_html(html, idno, dob)
                            result.status = "success" 
                    else:
                            result.error_message = "登入失敗或資料遺失 (連線逾時)"
                except:
                    result.error_message = "登入失敗：身分證字號/生日錯誤或驗證碼失敗"

        except Exception as e:
            logger.exception("Crawl error")
            await r(100, 100, f"Error: {e}")
            result.error_message = str(e)
        finally:
            await context.close()
            
        return result
