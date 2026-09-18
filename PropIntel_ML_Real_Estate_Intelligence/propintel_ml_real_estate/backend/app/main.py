from __future__ import annotations

from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .ml import PropIntel

app = FastAPI(title="PropIntel ML", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = PropIntel()


class PropertyInput(BaseModel):
    city: str
    area: str
    property_type: str
    size_sqft: float = Field(gt=100)
    bedrooms: int = Field(ge=0, le=12)
    bathrooms: int = Field(ge=0, le=12)
    age_years: int = Field(ge=0, le=100)
    asking_price: float = Field(gt=0)
    floor: int = Field(default=0, ge=0, le=100)
    parking: int = Field(default=1, ge=0, le=10)
    distance_school_km: float = Field(default=1.5, ge=0)
    distance_hospital_km: float = Field(default=2.0, ge=0)
    distance_market_km: float = Field(default=1.5, ge=0)
    distance_transit_km: float = Field(default=1.5, ge=0)
    amenities_score: float = Field(default=6, ge=0, le=10)


@app.get("/")
def root() -> Dict[str, Any]:
    return {"name": "PropIntel ML", "status": "ready"}


@app.get("/api/summary")
def summary() -> Dict[str, Any]:
    return engine.summary()


@app.get("/api/meta")
def meta() -> Dict[str, Any]:
    return {"cities": engine.cities(), "areas": engine.areas(), "property_types": ["House", "Apartment", "Villa", "Plot"]}


@app.get("/api/market")
def market(city: str = Query(default="All")) -> Any:
    return engine.market(city)


@app.get("/api/listings")
def listings(city: str = "All", property_type: str = "All", limit: int = 20) -> Any:
    return engine.listings(city=city, ptype=property_type, limit=min(max(limit, 1), 100))


@app.get("/api/trend")
def trend(city: str, area: str) -> Any:
    return engine.trend(city, area)


@app.get("/api/insights")
def insights() -> Any:
    return {"feature_importance": engine.feature_importance()}


@app.post("/api/valuation")
def valuation(payload: PropertyInput) -> Any:
    try:
        data = payload.model_dump()
        comparables = engine.comparables(data)
        result = engine.valuation(data)
        result["comparables"] = comparables
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Valuation failed: {exc}") from exc


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "model_trained": engine.trained}
