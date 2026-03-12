from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum

class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ThreatType(str, Enum):
    PHISHING = "phishing"
    MALWARE = "malware"
    SPAM = "spam"
    CREDENTIAL_HARVESTING = "credential_harvesting"
    ZERO_DAY = "zero_day"

class UrlAnalysisPart(BaseModel):
    part: str
    value: str
    state: str
    note: Optional[str] = None

class AiReasoningItem(BaseModel):
    score: str
    state: str
    title: str
    desc: str

class IncidentReportBase(BaseModel):
    target_url: HttpUrl
    brand_impersonated: Optional[str] = "Unknown"
    source_ip: Optional[str] = None
    location: Optional[str] = None
    
class IncidentReportCreate(IncidentReportBase):
    pass

class IncidentReport(IncidentReportBase):
    id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    type: ThreatType
    status: str = "Blocked"
    severity: SeverityLevel
    threat_score: float = Field(..., ge=0, le=100)
    url_analysis: List[UrlAnalysisPart] = []
    ai_reasoning: List[AiReasoningItem] = []

    class Config:
        orm_mode = True

class ModelPerformanceMetrics(BaseModel):
    version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    accuracy: float
    loss: float
    training_data_size: int

class BlockedAttemptsStat(BaseModel):
    name: str # e.g., 'Mon', 'Tue' or actual date
    phishing: int = 0
    malware: int = 0
    spam: int = 0
