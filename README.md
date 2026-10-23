# Road Safety Insights

A starter college project with React + TypeScript, FastAPI, SQLAlchemy, PostgreSQL-compatible storage, interactive Leaflet map, Recharts analytics, report submission, search/filter, and safety tips.

## Folder structure
- `frontend/` React + TypeScript + Vite
- `backend/` FastAPI + SQLAlchemy API
- Default database is SQLite for a quick first run. To use PostgreSQL, set `DATABASE_URL` in `backend/.env`.

## 1. Prerequisites
Install Node.js LTS, Python 3.11+, and PostgreSQL (if using PostgreSQL). Open this folder in VS Code.

## 2. Start backend (Terminal 1)
Windows PowerShell:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload
```
If PowerShell blocks activation, run `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`, then `.\.venv\Scripts\python.exe -m uvicorn main:app --reload`.
API: http://127.0.0.1:8000
API docs: http://127.0.0.1:8000/docs

## 3. Start frontend (Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

## 4. PostgreSQL setup (optional for first run, recommended for final demo)
Create a database called `roadsafety_db` in pgAdmin or psql. Then edit `backend/.env`:
```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/roadsafety_db
```
Replace `YOUR_PASSWORD` with your PostgreSQL password. Restart uvicorn after changing `.env`.
Do not publish passwords or commit `.env`.

## Demo login
This starter uses a front-end demo login to let you explore the UI:
- Admin: `admin` / `Admin@123`
- User: `user` / `User@123`
This is for demonstration only, not production security. Authentication is not yet enforced by the API.

## Features
- Dashboard statistic cards
- Interactive map with report markers (OpenStreetMap tiles; internet required)
- Interactive bar and pie charts
- Submit accident reports to the API/database
- Search and severity/status filters
- CSV export
- Admin review status
- Road safety tips and emergency number information
- Seeded fictional demonstration records

## Important
Sample records are fictional and must not be presented as verified accident statistics. The map is an illustrative pin map based on sample coordinates, not a verified risk map. This is a starter project; verify inputs and secure authentication before real public use.
