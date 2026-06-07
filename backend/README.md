# ReasonsForALL - Backend

This is the FastAPI backend reasoning core for ReasonsForALL.

## Features
- Dynamic database schema extraction (SQLAlchemy)
- Semantic Rule Generation and Quad-Store conversion
- Real-time OWL inference (Owlready2)

## Setup
1. Create a virtual environment: `python -m venv venv`
2. Activate the environment: `.\venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
3. Install dependencies: `pip install -r requirements.txt`
4. Run the server: `uvicorn app.main:app --reload`
