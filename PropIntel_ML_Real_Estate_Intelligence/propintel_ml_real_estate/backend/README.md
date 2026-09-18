# PropIntel ML — Real Estate Intelligence

A portfolio-ready machine-learning application for property valuation, rental yield estimation, market demand classification, pricing anomaly detection, comparable-property analysis, and short-horizon market trend forecasting.

## What is included

- Random Forest property valuation model
- Random Forest rental estimation model
- Random Forest demand classification
- Isolation Forest pricing anomaly detection
- Comparable-property engine
- Area-level historical trend + 6-month linear forecast
- Model feature importance view
- FastAPI API for a modern frontend
- Synthetic demonstration dataset so the app works without external credentials

## Run

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: `http://127.0.0.1:8000`

Swagger: `http://127.0.0.1:8000/docs`

> Demo data is synthetic. Replace `generate_dataset()` with licensed/real transaction data before using outputs for real financial decisions.
