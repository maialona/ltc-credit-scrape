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

    async def crawl_single(self, idno: str, dob: str, captcha_key: str) -> CrawlResult:
        result = CrawlResult(idno=idno, dob=dob, status="failed")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context()
            page = await context.new_page()
            
            try:
                logger.info(f"Navigating to {self.BASE_URL}")
                await page.goto(self.BASE_URL)
                
                # 1. Get Captcha
                captcha_el = await page.wait_for_selector("#simpleCaptcha_image")
                if not captcha_el:
                    raise Exception("Captcha element not found")
                
                await asyncio.sleep(1)
                img_bytes = await captcha_el.screenshot()
                
                # 2. Solve Captcha
                logger.info("Solving captcha...")
                captcha_text = await self.solve_captcha_2captcha(captcha_key, img_bytes)
                logger.info(f"Captcha solved: {captcha_text}")
                
                # 3. Fill Form
                await page.fill("input[name='idno']", idno)
                await page.fill("input[name='brDt']", dob) 
                await page.fill("input[name='captcha']", captcha_text)
                
                # 4. Submit
                await page.press("input[name='captcha']", "Enter")
                
                # 5. Wait for result
                try:
                    await page.wait_for_function(
                        "document.getElementById('cpL11I3E') && document.getElementById('cpL11I3E').textContent.trim() !== ''",
                        timeout=60000
                    )
                    logger.info("Login successful and Total Points populated.")
                    
                    await asyncio.sleep(5)
                    
                    html = await page.content()
                    result = parse_ltc_html(html, idno, dob)
                    result.status = "success"
                    
                    # --- NEW: Fetch Course Details ---
                    try:
                        logger.info("Fetching course details (Clicking 總查詢)...")
                        
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
                            
                        except Exception as wait_err:
                             logger.error(f"Timeout waiting for content on popup: {wait_err}")
                        finally:
                            await course_page.close()
                            
                    except Exception as course_error:
                        logger.error(f"Failed to fetch course details: {course_error}")
                    # ---------------------------------
                    
                except Exception as wait_error:
                    logger.error(f"Wait failed: {wait_error}")
                    logger.error("Login failed or data did not load in time.")
                    
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
                result.error_message = str(e)
            finally:
                await browser.close()
                
        return result
