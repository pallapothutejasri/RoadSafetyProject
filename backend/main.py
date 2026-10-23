

from models import User
from schemas import RegisterRequest, LoginRequest
from security import hash_password, verify_password
from sqlalchemy.exc import IntegrityError
from contextlib import asynccontextmanager
from datetime import date, time, timedelta
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import Base, engine, get_db
from models import Accident
from schemas import AccidentCreate, AccidentOut, StatusUpdate

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = next(get_db())
    try:
        if db.query(Accident).count() == 0:
            samples = [
                ("Tirupati", "Tirupati Main Road", 13.6288, 79.4192, "Car", "Moderate"),
                ("Guntur", "Guntur-Arundelpet Road", 16.3067, 80.4365, "Motorcycle", "Serious"),
                ("Vijayawada", "Benz Circle", 16.5062, 80.6480, "Bus", "Minor"),
                ("Chittoor", "Chittoor Bypass Road", 13.2172, 79.1003, "Truck", "Fatal"),
                ("Nellore", "Nellore Main Road", 14.4426, 79.9865, "Auto Rickshaw", "Minor"),
                ("Visakhapatnam", "Beach Road", 17.6868, 83.2185, "Motorcycle", "Serious"),
                ("Kadapa", "Kadapa Ring Road", 14.4673, 78.8242, "Car", "Minor"),
                ("Kurnool", "Kurnool Highway", 15.8281, 78.0373, "Truck", "Fatal"),
            ]
            for i, (district, location, lat, lon, vehicle, severity) in enumerate(samples):
                db.add(Accident(
                    date=date.today() - timedelta(days=i+1),
                    time=time(8 + (i % 10), (i * 7) % 60),
                    state="Andhra Pradesh", district=district, location=location,
                    latitude=lat, longitude=lon, vehicle=vehicle, severity=severity,
                    accident_type="Collision", cause="Unknown", injured=i % 3,
                    fatalities=1 if severity == "Fatal" else 0, weather="Clear",
                    road_condition="Dry", description="Fictional sample record for demonstration.",
                    reporter="Sample Dataset", status="Reviewed" if i % 2 else "Pending",
                    is_sample=True
                ))
            db.commit()
    finally:
        db.close()
    yield

app = FastAPI(title="Road Safety Insights API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

@app.post("/register")
def register_user(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email address")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered")

    user = User(
        full_name=data.full_name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        role="User"
    )

    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email is already registered")

    return {
        "message": "Registration successful",
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role
    }


@app.post("/login")
def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "message": "Login successful",
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role
    }

@app.get("/")
def root():
    return {"message": "Road Safety Insights API is running", "docs": "/docs"}

@app.get("/accidents", response_model=list[AccidentOut])
def list_accidents(
    search: str = Query(default=""),
    severity: str = Query(default="All"),
    status: str = Query(default="All"),
    db: Session = Depends(get_db),
):
    query = db.query(Accident)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (Accident.location.ilike(term)) |
            (Accident.district.ilike(term)) |
            (Accident.vehicle.ilike(term)) |
            (Accident.cause.ilike(term)) |
            (Accident.accident_type.ilike(term))
        )
    if severity != "All":
        query = query.filter(Accident.severity == severity)
    if status != "All":
        query = query.filter(Accident.status == status)
    return query.order_by(Accident.id.desc()).all()

@app.post("/accidents", response_model=AccidentOut, status_code=201)
def create_accident(payload: AccidentCreate, db: Session = Depends(get_db)):
    if payload.severity not in {"Minor", "Serious", "Fatal"}:
        raise HTTPException(status_code=422, detail="Severity must be Minor, Serious, or Fatal")
    record = Accident(**payload.model_dump(), status="Pending", is_sample=False)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@app.patch("/accidents/{accident_id}", response_model=AccidentOut)
def update_accident(accident_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    if payload.status not in {"Pending", "Reviewed"}:
        raise HTTPException(status_code=422, detail="Status must be Pending or Reviewed")
    record = db.query(Accident).filter(Accident.id == accident_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Accident report not found")
    record.status = payload.status
    record.admin_remarks = payload.admin_remarks
    db.commit()
    db.refresh(record)
    return record

@app.get("/stats")
def stats(db: Session = Depends(get_db)):
    records = db.query(Accident).all()
    return {
        "total": len(records),
        "minor": sum(1 for r in records if r.severity == "Minor"),
        "serious": sum(1 for r in records if r.severity == "Serious"),
        "fatal": sum(1 for r in records if r.severity == "Fatal"),
        "injured": sum(r.injured or 0 for r in records),
        "fatalities": sum(r.fatalities or 0 for r in records),
        "pending": sum(1 for r in records if r.status == "Pending"),
        "reviewed": sum(1 for r in records if r.status == "Reviewed"),
    }