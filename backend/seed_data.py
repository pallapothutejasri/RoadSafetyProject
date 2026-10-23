
from datetime import date, time, timedelta
import random

from database import Base, engine, SessionLocal
from models import Accident

# Reproducible fictional demonstration data
random.seed(42)

Base.metadata.create_all(bind=engine)

locations = [
    ("Tirupati", "Tirupati Main Road", 13.6288, 79.4192),
    ("Tirupati", "Renigunta Junction", 13.6515, 79.5120),
    ("Guntur", "Arundelpet Road", 16.3067, 80.4365),
    ("Vijayawada", "Benz Circle", 16.5062, 80.6480),
    ("Visakhapatnam", "Beach Road", 17.6868, 83.2185),
    ("Nellore", "Nellore Main Road", 14.4426, 79.9865),
    ("Chittoor", "Chittoor Bypass Road", 13.2172, 79.1003),
    ("Kadapa", "Kadapa Ring Road", 14.4673, 78.8242),
    ("Kurnool", "Kurnool Highway", 15.8281, 78.0373),
    ("Anantapur", "Anantapur Main Road", 14.6819, 77.6006),
    ("Rajahmundry", "Godavari Road", 17.0005, 81.8040),
    ("Eluru", "Eluru Bypass Road", 16.7107, 81.0952),
    ("Ongole", "Ongole Main Road", 15.5057, 80.0499),
    ("Srikakulam", "Srikakulam Road", 18.2949, 83.8938),
    ("Machilipatnam", "Market Road", 16.1809, 81.1300),
]

vehicles = [
    "Motorcycle", "Car", "Bus", "Truck",
    "Auto Rickshaw", "Bicycle", "Van"
]

severities = ["Minor", "Serious", "Fatal"]
severity_weights = [60, 32, 8]

causes = [
    "Overspeeding", "Poor road condition", "Low visibility",
    "Traffic violation", "Weather conditions",
    "Driver error", "Unknown"
]

accident_types = [
    "Collision", "Single vehicle", "Vehicle rollover",
    "Pedestrian accident", "Rear-end collision"
]

weather_options = ["Clear", "Rainy", "Cloudy", "Foggy"]
road_options = ["Dry", "Wet", "Damaged", "Uneven"]

db = SessionLocal()

try:
    existing = db.query(Accident).count()
    target_total = 200

    if existing >= target_total:
        print(f"Database already contains {existing} records.")
        print("No additional sample records were inserted.")
    else:
        needed = target_total - existing

        for i in range(needed):
            district, road, lat, lon = random.choice(locations)
            severity = random.choices(
                severities, weights=severity_weights, k=1
            )[0]

            accident_date = date.today() - timedelta(
                days=random.randint(0, 729)
            )

            hour = random.randint(0, 23)
            minute = random.choice([0, 10, 15, 20, 30, 40, 45, 50])

            record = Accident(
                date=accident_date,
                time=time(hour, minute),
                state="Andhra Pradesh",
                district=district,
                location=road,
                latitude=lat + random.uniform(-0.008, 0.008),
                longitude=lon + random.uniform(-0.008, 0.008),
                vehicle=random.choice(vehicles),
                accident_type=random.choice(accident_types),
                cause=random.choice(causes),
                severity=severity,
                injured=(
                    random.randint(1, 5)
                    if severity != "Minor"
                    else random.randint(0, 2)
                ),
                fatalities=1 if severity == "Fatal" else 0,
                weather=random.choice(weather_options),
                road_condition=random.choice(road_options),
                description="Fictional sample record for project demonstration.",
                reporter="Sample Dataset",
                status=random.choice(["Pending", "Reviewed"]),
                is_sample=True,
            )

            db.add(record)

        db.commit()
        print(f"Added {needed} sample records.")
        print(f"Total accident records: {db.query(Accident).count()}")
        print("These records are fictional demonstration data.")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
