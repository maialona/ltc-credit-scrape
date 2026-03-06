"""SQLAlchemy ORM models for persistent storage."""
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, UniqueConstraint
from .database import Base


class QueryRecord(Base):
    __tablename__ = "query_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Person info
    idno_masked = Column(String(20), index=True)  # Masked: A12***789
    name = Column(String(50), default="")
    emp_id = Column(String(50), default="")
    organization = Column(String(100), default="")
    dob = Column(String(20), default="")  # ROC date format
    valid_period = Column(String(50), default="")
    
    # Points summary
    total_points = Column(Float, default=0.0)
    professional_points = Column(Float, default=0.0)
    quality_points = Column(Float, default=0.0)
    ethics_points = Column(Float, default=0.0)
    laws_points = Column(Float, default=0.0)
    fire_safety_points = Column(Float, default=0.0)
    emergency_points = Column(Float, default=0.0)
    infection_points = Column(Float, default=0.0)
    gender_points = Column(Float, default=0.0)
    indigenous_points = Column(Float, default=0.0)
    
    # Full data as JSON
    raw_data_json = Column(Text, default="{}")
    courses_json = Column(Text, default="[]")
    
    # Metadata
    status = Column(String(20), default="success")
    queried_at = Column(DateTime, default=datetime.utcnow)
    
    # Unique constraint: same person + same valid period = update instead of duplicate
    __table_args__ = (
        UniqueConstraint('idno_masked', 'valid_period', name='uq_person_period'),
    )

    def to_dict(self):
        """Convert to dict matching CrawlResult format for frontend compatibility."""
        return {
            "id": self.id,
            "emp_id": self.emp_id or "",
            "name": self.name or "",
            "organization": self.organization or "",
            "idno": self.idno_masked or "",
            "dob": self.dob or "",
            "valid_period": self.valid_period or "",
            "total_points": self.total_points or 0.0,
            "professional_points": self.professional_points or 0.0,
            "quality_points": self.quality_points or 0.0,
            "ethics_points": self.ethics_points or 0.0,
            "laws_points": self.laws_points or 0.0,
            "fire_safety_points": self.fire_safety_points or 0.0,
            "emergency_points": self.emergency_points or 0.0,
            "infection_points": self.infection_points or 0.0,
            "gender_points": self.gender_points or 0.0,
            "indigenous_points": self.indigenous_points or 0.0,
            "raw_data": json.loads(self.raw_data_json) if self.raw_data_json else {},
            "courses": json.loads(self.courses_json) if self.courses_json else [],
            "status": self.status or "success",
            "queried_at": self.queried_at.isoformat() if self.queried_at else None,
        }
