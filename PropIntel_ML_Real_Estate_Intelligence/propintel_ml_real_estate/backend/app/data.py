from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import numpy as np
import pandas as pd

SEED = 42
CITIES = {
    "Karachi": ["DHA Phase 6", "Gulshan-e-Iqbal", "Clifton", "North Nazimabad"],
    "Lahore": ["DHA Phase 5", "Gulberg", "Johar Town", "Bahria Town"],
    "Islamabad": ["F-7", "F-8", "DHA Phase 2", "Bahria Town"],
}
PROPERTY_TYPES = ["House", "Apartment", "Villa", "Plot"]

BASE_PRICE_PER_SQFT = {
    ("Karachi", "DHA Phase 6"): 30000,
    ("Karachi", "Gulshan-e-Iqbal"): 18500,
    ("Karachi", "Clifton"): 26000,
    ("Karachi", "North Nazimabad"): 16000,
    ("Lahore", "DHA Phase 5"): 24500,
    ("Lahore", "Gulberg"): 22500,
    ("Lahore", "Johar Town"): 16500,
    ("Lahore", "Bahria Town"): 14500,
    ("Islamabad", "F-7"): 32000,
    ("Islamabad", "F-8"): 28500,
    ("Islamabad", "DHA Phase 2"): 17500,
    ("Islamabad", "Bahria Town"): 15000,
}

AREA_MULTIPLIER = {
    "House": 1.00,
    "Apartment": 0.92,
    "Villa": 1.12,
    "Plot": 0.72,
}


def _property_size(rng: np.random.Generator, ptype: str) -> float:
    if ptype == "Apartment":
        return float(rng.integers(650, 2800))
    if ptype == "Plot":
        return float(rng.choice([1000, 1200, 2000, 2400, 3000, 5000]))
    return float(rng.choice([900, 1200, 1500, 2000, 2500, 3500, 4500, 6000]))


def generate_dataset(n: int = 3200) -> pd.DataFrame:
    rng = np.random.default_rng(SEED)
    rows: List[Dict] = []
    city_names = list(CITIES.keys())

    for i in range(n):
        city = rng.choice(city_names)
        area = rng.choice(CITIES[city])
        ptype = rng.choice(PROPERTY_TYPES, p=[0.38, 0.30, 0.16, 0.16])
        size = _property_size(rng, ptype)
        beds = 0 if ptype == "Plot" else int(np.clip(np.round(size / 650 + rng.normal(0, 0.6)), 1, 8))
        baths = 0 if ptype == "Plot" else int(np.clip(beds + rng.integers(-1, 2), 1, 7))
        age = 0 if ptype == "Plot" else int(rng.integers(0, 26))
        floor = int(rng.integers(1, 12)) if ptype == "Apartment" else 0
        parking = int(rng.integers(0, 4)) if ptype != "Plot" else 0
        dist_school = float(np.round(rng.uniform(0.2, 4.5), 2))
        dist_hospital = float(np.round(rng.uniform(0.3, 6.0), 2))
        dist_market = float(np.round(rng.uniform(0.2, 5.0), 2))
        transit = float(np.round(rng.uniform(0.1, 5.5), 2))
        amenities = int(np.clip(np.round(rng.normal(5, 2)), 1, 10))
        demand_score = (
            62
            + (8 if city == "Islamabad" else 4 if city == "Lahore" else 2)
            + amenities * 1.7
            + (4 if ptype in {"Apartment", "House"} else -2)
            - dist_market * 2.2
            - dist_school * 0.9
            + rng.normal(0, 8)
        )
        demand_score = float(np.clip(demand_score, 25, 97))

        base = BASE_PRICE_PER_SQFT[(city, area)]
        age_discount = max(0.72, 1 - age * 0.009)
        amenity_premium = 1 + amenities * 0.018
        location_premium = 1 + max(0, 3.5 - dist_market) * 0.018
        price = size * base * AREA_MULTIPLIER[ptype] * age_discount * amenity_premium * location_premium
        if ptype == "Plot":
            price *= 1.12
        price *= rng.normal(1.0, 0.075)
        price = max(price, 1_500_000)

        rent_factor = {"House": 0.0037, "Apartment": 0.0045, "Villa": 0.0033, "Plot": 0.0002}[ptype]
        rent = price * rent_factor * rng.normal(1.0, 0.10)
        rent = max(rent, 7000)

        listing_days = int(np.clip(145 - demand_score * 1.1 + rng.normal(0, 16), 8, 260))

        rows.append(
            {
                "id": f"P-{i+1:05d}",
                "city": city,
                "area": area,
                "property_type": ptype,
                "size_sqft": round(size),
                "bedrooms": beds,
                "bathrooms": baths,
                "age_years": age,
                "floor": floor,
                "parking": parking,
                "distance_school_km": dist_school,
                "distance_hospital_km": dist_hospital,
                "distance_market_km": dist_market,
                "distance_transit_km": transit,
                "amenities_score": amenities,
                "demand_score": round(demand_score, 2),
                "price": round(price, 0),
                "monthly_rent": round(rent, 0),
                "listing_days": listing_days,
            }
        )
    return pd.DataFrame(rows)


def build_history(df: pd.DataFrame) -> pd.DataFrame:
    rng = np.random.default_rng(SEED + 10)
    months = pd.date_range(end=pd.Timestamp("2026-08-01"), periods=24, freq="MS")
    rows = []
    for (city, area), group in df.groupby(["city", "area"]):
        current = group["price"].median()
        trend = rng.uniform(0.004, 0.014)
        for idx, month in enumerate(months):
            factor = (1 + trend) ** (idx - len(months) + 1)
            noise = rng.normal(1.0, 0.025)
            rows.append(
                {
                    "city": city,
                    "area": area,
                    "month": month.strftime("%Y-%m"),
                    "median_price": round(current * factor * noise, 0),
                }
            )
    return pd.DataFrame(rows)
