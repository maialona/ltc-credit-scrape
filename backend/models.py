from pydantic import BaseModel
from typing import List, Optional

class CrawlRequest(BaseModel):
    idno: str
    dob: str  # Format: YYY/MM/DD (ROC year)

class BatchCrawlRequest(BaseModel):
    pass

class CourseRecord(BaseModel):
    date: str
    name: str
    mode: str # 實施方式
    unit: str # 開課單位
    attribute: str # 課程屬性
    category: str # 課程類別
    training_course: str # 訓練課程
    points: float
    status: str # 認可狀態

class CrawlResult(BaseModel):
    emp_id: Optional[str] = None
    name: Optional[str] = None
    organization: Optional[str] = None # Added organization field
    idno: str
    dob: str
    valid_period: str = "" # e.g. "111/05/01-117/04/30"
    
    # Detailed points
    professional_points: float = 0.0
    quality_points: float = 0.0
    ethics_points: float = 0.0
    laws_points: float = 0.0
    
    # Special categories
    indigenous_points: float = 0.0
    gender_points: float = 0.0
    infection_points: float = 0.0
    emergency_points: float = 0.0
    fire_safety_points: float = 0.0

    # List of detailed course records
    courses: List[CourseRecord] = []

    raw_data: dict = {} # Full parsed structure
    status: str = "pending" # success, failed, pending
    error_message: Optional[str] = None
