from datetime import date, time
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class AccidentCreate(BaseModel):
    date: date
    time: time
    state: str = "Andhra Pradesh"
    district: str = Field(min_length=1, max_length=100)
    location: str = Field(min_length=2, max_length=250)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    vehicle: str
    accident_type: str = "Collision"
    cause: str = "Unknown"
    severity: str = "Minor"
    injured: int = Field(default=0, ge=0)
    fatalities: int = Field(default=0, ge=0)
    weather: str = "Unknown"
    road_condition: str = "Unknown"
    description: str = ""
    reporter: str = "Anonymous"

class AccidentOut(AccidentCreate):
    id: int
    status: str
    admin_remarks: str = ""
    is_sample: bool = False
    model_config = ConfigDict(from_attributes=True)

class StatusUpdate(BaseModel):
    status: str
    admin_remarks: str = ""

class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)
