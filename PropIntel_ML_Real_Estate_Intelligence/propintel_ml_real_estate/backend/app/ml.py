from __future__ import annotations

from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression

from .data import build_history, generate_dataset

FEATURES = [
    "city",
    "area",
    "property_type",
    "size_sqft",
    "bedrooms",
    "bathrooms",
    "age_years",
    "floor",
    "parking",
    "distance_school_km",
    "distance_hospital_km",
    "distance_market_km",
    "distance_transit_km",
    "amenities_score",
]

NUMERIC_FEATURES = [f for f in FEATURES if f not in {"city", "area", "property_type"}]


class PropIntel:
    def __init__(self) -> None:
        self.df = generate_dataset()
        self.history = build_history(self.df)
        self.feature_columns: List[str] = []
        self.price_model: RandomForestRegressor
        self.rent_model: RandomForestRegressor
        self.demand_model: RandomForestClassifier
        self.anomaly_model: IsolationForest
        self.scaler = StandardScaler()
        self.trained = False
        self.metrics: Dict[str, float] = {}
        self._train()

    def _encode(self, df: pd.DataFrame) -> pd.DataFrame:
        x = pd.get_dummies(df[FEATURES], columns=["city", "area", "property_type"], dtype=float)
        if self.feature_columns:
            x = x.reindex(columns=self.feature_columns, fill_value=0.0)
        return x

    def _train(self) -> None:
        x = self._encode(self.df)
        self.feature_columns = list(x.columns)

        X_train, X_test, y_train, y_test = train_test_split(
            x, self.df["price"], test_size=0.2, random_state=42
        )
        self.price_model = RandomForestRegressor(
            n_estimators=220, max_depth=18, min_samples_leaf=2, random_state=42, n_jobs=-1
        )
        self.price_model.fit(X_train, y_train)
        pred = self.price_model.predict(X_test)
        mape = float(np.mean(np.abs((y_test - pred) / y_test)) * 100)
        self.metrics["price_mape"] = round(mape, 2)

        self.rent_model = RandomForestRegressor(
            n_estimators=180, max_depth=16, min_samples_leaf=2, random_state=43, n_jobs=-1
        )
        self.rent_model.fit(x, self.df["monthly_rent"])

        demand_labels = pd.cut(
            self.df["demand_score"], bins=[0, 55, 75, 100], labels=["Low", "Medium", "High"]
        ).astype(str)
        self.demand_model = RandomForestClassifier(
            n_estimators=180, max_depth=14, min_samples_leaf=2, random_state=44, n_jobs=-1
        )
        self.demand_model.fit(x, demand_labels)

        self.anomaly_model = IsolationForest(
            n_estimators=180, contamination=0.06, random_state=45
        )
        self.anomaly_model.fit(x)

        self.trained = True

    def _prepare_one(self, record: Dict[str, Any]) -> pd.DataFrame:
        row = {
            "city": record["city"],
            "area": record["area"],
            "property_type": record["property_type"],
            "size_sqft": record["size_sqft"],
            "bedrooms": record["bedrooms"],
            "bathrooms": record["bathrooms"],
            "age_years": record["age_years"],
            "floor": record.get("floor", 0),
            "parking": record.get("parking", 0),
            "distance_school_km": record.get("distance_school_km", 1.5),
            "distance_hospital_km": record.get("distance_hospital_km", 2.0),
            "distance_market_km": record.get("distance_market_km", 1.5),
            "distance_transit_km": record.get("distance_transit_km", 1.5),
            "amenities_score": record.get("amenities_score", 6),
        }
        return self._encode(pd.DataFrame([row]))

    def valuation(self, record: Dict[str, Any]) -> Dict[str, Any]:
        x = self._prepare_one(record)
        estimated = float(self.price_model.predict(x)[0])
        rent = float(self.rent_model.predict(x)[0])
        anomaly_raw = float(self.anomaly_model.decision_function(x)[0])
        anomaly_score = float(np.clip(50 - anomaly_raw * 220, 0, 100))
        demand = str(self.demand_model.predict(x)[0])
        demand_probs = self.demand_model.predict_proba(x)[0]
        labels = list(self.demand_model.classes_)
        probs = {k: round(float(v), 3) for k, v in zip(labels, demand_probs)}

        asking = float(record["asking_price"])
        delta_pct = ((asking - estimated) / estimated) * 100
        yield_pct = (rent * 12 / asking) * 100
        risk = "High" if anomaly_score >= 70 or abs(delta_pct) >= 20 else "Medium" if anomaly_score >= 50 or abs(delta_pct) >= 10 else "Low"
        confidence = int(np.clip(92 - abs(delta_pct) * 0.7 - anomaly_score * 0.15, 58, 95))

        return {
            "estimated_market_value": round(estimated, 0),
            "monthly_rent": round(rent, 0),
            "rental_yield_pct": round(yield_pct, 2),
            "asking_price": round(asking, 0),
            "price_gap_pct": round(delta_pct, 2),
            "demand": demand,
            "demand_probabilities": probs,
            "anomaly_score": round(anomaly_score, 2),
            "risk": risk,
            "confidence": confidence,
            "fair_value_low": round(estimated * 0.95, 0),
            "fair_value_high": round(estimated * 1.05, 0),
            "drivers": self._drivers(record),
        }

    def _drivers(self, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        numeric = {
            "Property size": (record["size_sqft"], float(self.df["size_sqft"].median()), "sq ft"),
            "Amenities": (record.get("amenities_score", 6), float(self.df["amenities_score"].median()), "score"),
            "Distance to market": (record.get("distance_market_km", 1.5), float(self.df["distance_market_km"].median()), "km"),
            "Property age": (record["age_years"], float(self.df["age_years"].median()), "years"),
            "Bedrooms": (record["bedrooms"], float(self.df["bedrooms"].median()), "beds"),
        }
        weights = {"Property size": 0.35, "Amenities": 0.20, "Distance to market": 0.18, "Property age": 0.15, "Bedrooms": 0.12}
        drivers = []
        for name, (value, median, unit) in numeric.items():
            diff = (value - median) / (median or 1)
            impact = diff * weights[name]
            drivers.append({"name": name, "value": round(value, 2), "unit": unit, "impact": round(impact * 100, 1)})
        return sorted(drivers, key=lambda x: abs(x["impact"]), reverse=True)

    def comparables(self, record: Dict[str, Any], limit: int = 6) -> List[Dict[str, Any]]:
        subset = self.df[(self.df["city"] == record["city"]) & (self.df["area"] == record["area"])].copy()
        subset["distance"] = (
            (subset["size_sqft"] - record["size_sqft"]).abs() / max(record["size_sqft"], 1)
            + (subset["bedrooms"] - record["bedrooms"]).abs() * 0.08
            + (subset["bathrooms"] - record["bathrooms"]).abs() * 0.05
        )
        cols = ["id", "property_type", "size_sqft", "bedrooms", "bathrooms", "price", "monthly_rent", "demand_score", "listing_days", "distance"]
        result = subset.sort_values("distance").head(limit)[cols].copy()
        return result.to_dict(orient="records")

    def market(self, city: str | None = None) -> List[Dict[str, Any]]:
        df = self.df if not city or city == "All" else self.df[self.df["city"] == city]
        out = (
            df.groupby(["city", "area"], as_index=False)
            .agg(
                avg_price=("price", "mean"),
                median_price=("price", "median"),
                avg_rent=("monthly_rent", "mean"),
                demand=("demand_score", "mean"),
                listings=("id", "count"),
                avg_days=("listing_days", "mean"),
            )
            .sort_values("demand", ascending=False)
        )
        out["growth_pct"] = out.apply(self._growth_for_area, axis=1)
        records = out.round(0).to_dict(orient="records")
        for row in records:
            row["city"] = str(row["city"])
            row["area"] = str(row["area"])
        return records

    def _growth_for_area(self, row: pd.Series) -> float:
        h = self.history[(self.history["city"] == row["city"]) & (self.history["area"] == row["area"])].copy()
        if len(h) < 2:
            return 0.0
        first = float(h.iloc[0]["median_price"])
        last = float(h.iloc[-1]["median_price"])
        return round(((last - first) / first) * 100, 2)

    def trend(self, city: str, area: str) -> Dict[str, Any]:
        h = self.history[(self.history["city"] == city) & (self.history["area"] == area)].copy()
        if h.empty:
            return {"city": city, "area": area, "history": [], "forecast": []}
        x = np.arange(len(h)).reshape(-1, 1)
        y = h["median_price"].values
        model = LinearRegression().fit(x, y)
        future_x = np.arange(len(h), len(h) + 6).reshape(-1, 1)
        future = model.predict(future_x)
        slope = float(model.coef_[0])
        base = float(y[-1])
        growth = float((future[-1] / base - 1) * 100)
        return {
            "city": city,
            "area": area,
            "history": h.to_dict(orient="records"),
            "forecast": [
                {
                    "month": (pd.Timestamp(h["month"].iloc[-1] + "-01") + pd.DateOffset(months=i + 1)).strftime("%Y-%m"),
                    "median_price": round(float(v), 0),
                }
                for i, v in enumerate(future)
            ],
            "annualized_growth_signal": round(growth, 2),
            "trend_slope": round(slope, 2),
        }

    def summary(self) -> Dict[str, Any]:
        median_price = float(self.df["price"].median())
        avg_rent = float(self.df["monthly_rent"].mean())
        high_demand = int((self.df["demand_score"] >= 75).sum())
        anomalies = int((self.anomaly_model.predict(self._encode(self.df)) == -1).sum())
        top = self.market()[:5]
        return {
            "properties_analyzed": int(len(self.df)),
            "median_property_value": round(median_price, 0),
            "average_monthly_rent": round(avg_rent, 0),
            "high_demand_listings": high_demand,
            "pricing_anomalies": anomalies,
            "model_mape_pct": self.metrics.get("price_mape", 0),
            "top_markets": top,
        }

    def listings(self, city: str | None = None, ptype: str | None = None, limit: int = 20) -> List[Dict[str, Any]]:
        df = self.df.copy()
        if city and city != "All":
            df = df[df["city"] == city]
        if ptype and ptype != "All":
            df = df[df["property_type"] == ptype]
        cols = [
            "id", "city", "area", "property_type", "size_sqft", "bedrooms", "bathrooms",
            "price", "monthly_rent", "demand_score", "listing_days"
        ]
        return df.sort_values("demand_score", ascending=False).head(limit)[cols].to_dict(orient="records")

    def feature_importance(self) -> List[Dict[str, Any]]:
        importance = self.price_model.feature_importances_
        pairs = sorted(zip(self.feature_columns, importance), key=lambda x: x[1], reverse=True)
        grouped = []
        for name, value in pairs[:14]:
            pretty = name.replace("city_", "City: ").replace("area_", "Area: ").replace("property_type_", "Type: ").replace("_", " ").title()
            grouped.append({"feature": pretty, "importance": round(float(value) * 100, 2)})
        return grouped

    def cities(self) -> List[str]:
        return sorted(self.df["city"].unique().tolist())

    def areas(self, city: str | None = None) -> List[str]:
        df = self.df if not city or city == "All" else self.df[self.df["city"] == city]
        return sorted(df["area"].unique().tolist())
