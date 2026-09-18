# PropIntel ML — Real Estate Intelligence Platform

PropIntel is a full-stack, portfolio-ready machine-learning system for modern real-estate decision support.

## Business problem

Property teams often have listings and historical market data but lack a unified workflow for answering:

- Is this property fairly priced?
- What comparable properties support the estimate?
- Is the listing unusually priced?
- What rental yield could the property generate?
- Is demand low, medium, or high?
- How is a local market trending?

## Solution

PropIntel combines several models into one product:

1. **Property valuation** — Random Forest regression
2. **Rental estimation** — Random Forest regression
3. **Demand classification** — Random Forest classifier
4. **Pricing anomaly detection** — Isolation Forest
5. **Comparable-property analysis** — similarity ranking
6. **Trend forecasting** — area-level linear trend baseline
7. **Explainability** — feature importance + property drivers

## UI

The Next.js frontend is designed as an enterprise analytics product rather than a notebook demo:

- KPI cards
- market trajectory chart
- ML feature importance panel
- area performance table
- high-signal listing feed
- property valuation drawer
- responsive mobile layout

## Run backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Run frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Demo data

The packaged application uses deterministic **synthetic** real-estate data for demonstration. This is deliberate so the project starts without API credentials or copyrighted property feeds.

For a real deployment, replace the synthetic data generator with licensed transaction/listing data and add geographic enrichment from a permitted source.

## Portfolio positioning

> **PropIntel — ML-powered Real Estate Valuation & Investment Intelligence Platform**
>
> A machine-learning system that helps property marketplaces, agencies, investors and developers evaluate property value, compare nearby listings, detect pricing anomalies, estimate rental economics, classify demand and monitor local market trends.
