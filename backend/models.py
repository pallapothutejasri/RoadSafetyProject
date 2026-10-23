from sqlalchemy import Column, Integer, String, Text, Date, Time, Float, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class Accident(Base):
    __tablename__ = "accidents"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    state = Column(String(100), default="Andhra Pradesh")
    district = Column(String(100), nullable=False)
    location = Column(String(250), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    vehicle = Column(String(80), nullable=False)
    accident_type = Column(String(100), default="Collision")
    cause = Column(String(120), default="Unknown")
    severity = Column(String(30), nullable=False, default="Minor")
    injured = Column(Integer, default=0)
    fatalities = Column(Integer, default=0)
    weather = Column(String(50), default="Unknown")
    road_condition = Column(String(50), default="Unknown")
    description = Column(Text, default="")
    reporter = Column(String(120), default="Anonymous")
    status = Column(String(30), default="Pending")
    admin_remarks = Column(Text, default="")
    is_sample = Column(Boolean, default=False)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="User", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
