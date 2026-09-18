"use client";

import { useMemo, useState } from "react";
import { Calculator, ChevronRight, LoaderCircle, Sparkles } from "lucide-react";
import { runValuation, ValuationPayload } from "@/lib/api";

const money = (n: number) => `PKR ${(n / 10000000).toFixed(2)} Cr`;

export default function ValuationDrawer({ cities, areas, propertyTypes, selectedCity, selectedArea }: {
  cities: string[]; areas: string[]; propertyTypes: string[]; selectedCity: string; selectedArea: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [city, setCity] = useState(selectedCity || cities[0] || "Karachi");
  const [area, setArea] = useState(selectedArea || areas[0] || "DHA Phase 6");
  const [ptype, setPtype] = useState("House");
  const [size, setSize] = useState(2500);
  const [beds, setBeds] = useState(4);
  const [baths, setBaths] = useState(4);
  const [age, setAge] = useState(6);
  const [asking, setAsking] = useState(8.5e7);
  const currentAreas = useMemo(() => city === selectedCity ? areas : areas, [city, selectedCity, areas]);

  const submit = async () => {
    setLoading(true);
    try {
      const payload: ValuationPayload = {
        city, area, property_type: ptype, size_sqft: size, bedrooms: beds, bathrooms: baths,
        age_years: age, asking_price: asking, floor: 0, parking: 2,
        distance_school_km: 1.2, distance_hospital_km: 2.1, distance_market_km: 1.1,
        distance_transit_km: 1.4, amenities_score: 8,
      };
      setResult(await runValuation(payload));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="primary-btn" onClick={() => setOpen(true)}><Calculator size={17} /> Analyze property <ChevronRight size={16} /></button>
      {open && (
        <div className="drawer-overlay" onClick={() => setOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head"><div><div className="eyebrow">VALUATION LAB</div><h2>Analyze a property</h2><p>Run the ML stack against a new listing.</p></div><button className="close-btn" onClick={() => setOpen(false)}>×</button></div>
            <div className="form-grid">
              <label>City<select value={city} onChange={(e) => setCity(e.target.value)}>{cities.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label>Area<select value={area} onChange={(e) => setArea(e.target.value)}>{currentAreas.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label>Property type<select value={ptype} onChange={(e) => setPtype(e.target.value)}>{propertyTypes.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label>Size (sq ft)<input type="number" value={size} onChange={(e) => setSize(Number(e.target.value))} /></label>
              <label>Bedrooms<input type="number" value={beds} onChange={(e) => setBeds(Number(e.target.value))} /></label>
              <label>Bathrooms<input type="number" value={baths} onChange={(e) => setBaths(Number(e.target.value))} /></label>
              <label>Age (years)<input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} /></label>
              <label>Asking price (PKR)<input type="number" value={asking} onChange={(e) => setAsking(Number(e.target.value))} /></label>
            </div>
            <button className="analyze-btn" onClick={submit} disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} {loading ? "Running ML models…" : "Run property intelligence"}</button>
            {result && (
              <div className="valuation-result">
                <div className="result-hero"><div><span>Estimated market value</span><strong>{money(result.estimated_market_value)}</strong><small>Fair range {money(result.fair_value_low)} — {money(result.fair_value_high)}</small></div><span className={`risk-pill ${result.risk.toLowerCase()}`}>{result.risk} risk</span></div>
                <div className="mini-grid">
                  <div><span>Price gap</span><strong className={result.price_gap_pct > 0 ? "warn" : "good"}>{result.price_gap_pct > 0 ? "+" : ""}{result.price_gap_pct}%</strong></div>
                  <div><span>Rental yield</span><strong>{result.rental_yield_pct}%</strong></div>
                  <div><span>Demand</span><strong>{result.demand}</strong></div>
                  <div><span>Confidence</span><strong>{result.confidence}%</strong></div>
                </div>
                <div className="driver-box"><div className="section-label">What drives the estimate</div>{result.drivers.slice(0, 4).map((d: any) => <div className="driver" key={d.name}><span>{d.name}</span><b>{d.impact > 0 ? "+" : ""}{d.impact}%</b></div>)}</div>
                <div className="section-label">Closest comparables</div>
                <div className="compare-mini">{result.comparables.slice(0, 4).map((c: any) => <div key={c.id} className="compare-row"><span>{c.id} · {c.size_sqft.toLocaleString()} sq ft</span><strong>{money(c.price)}</strong></div>)}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
