"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, BarChart3, Bell, Building2, ChevronDown, CircleDollarSign, FileSearch, House, LayoutDashboard, Map, Menu, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingUp, TriangleAlert, Users, X } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import TrendChart from "@/components/TrendChart";
import ValuationDrawer from "@/components/ValuationDrawer";
import { getInsights, getListings, getMarket, getMeta, getSummary, getTrend, Summary, Trend } from "@/lib/api";

const money = (n: number) => `PKR ${(n / 10000000).toFixed(2)} Cr`;

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [meta, setMeta] = useState<{ cities: string[]; areas: string[]; property_types: string[] } | null>(null);
  const [market, setMarket] = useState<Summary["top_markets"]>([]);
  const [trend, setTrend] = useState<Trend | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [city, setCity] = useState("All");
  const [area, setArea] = useState("DHA Phase 6");
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, m, i] = await Promise.all([getSummary(), getMeta(), getInsights()]);
        setSummary(s); setMeta(m); setInsights(i.feature_importance);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const loadMarket = async () => {
      try {
        const selected = city === "All" ? "All" : city;
        const [mk, ls] = await Promise.all([getMarket(selected), getListings(selected, "All")]);
        setMarket(mk); setListings(ls);
        const nextArea = area === "DHA Phase 6" && mk.length ? mk[0].area : area;
        if (nextArea) setArea(nextArea);
      } catch {}
    };
    loadMarket();
  }, [city]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!meta || !area || city === "All") return;
    const loadTrend = async () => {
      try { setTrend(await getTrend(city, area)); } catch { setTrend(null); }
    };
    loadTrend();
  }, [city, area, meta]);

  const chart = useMemo(() => {
    if (!trend) return [];
    return [
      ...trend.history.map((x) => ({ month: x.month.slice(5), history: x.median_price })),
      ...trend.forecast.map((x) => ({ month: x.month.slice(5), forecast: x.median_price })),
    ];
  }, [trend]);

  const shownMarket = city === "All" ? summary?.top_markets || market : market;
  const areas = meta?.areas || [];

  return (
    <div className="app-shell">
      {mobileOpen && <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Target size={20} /></div><div><strong>PropIntel</strong><span>REAL ESTATE AI</span></div></div>
        <nav>
          <div className="nav-caption">WORKSPACE</div>
          {[
            ["Overview", LayoutDashboard], ["Valuation", CircleDollarSign], ["Market explorer", Map], ["Listings", House], ["Model insights", BarChart3]
          ].map(([label, Icon]: any) => <button className={`nav-item ${active === label ? "active" : ""}`} key={label} onClick={() => { setActive(label); setMobileOpen(false); }}><Icon size={17} /><span>{label}</span>{label === "Overview" && <span className="live-dot" />}</button>)}
        </nav>
        <div className="sidebar-card"><div className="side-icon"><ShieldCheck size={18} /></div><strong>ML engine online</strong><span>3 models + anomaly detector</span><div className="status-line"><i /> Real-time demo data</div></div>
        <div className="side-bottom"><button className="nav-item"><Settings2 size={17} /><span>Settings</span></button><div className="user-chip"><div className="avatar">PI</div><div><strong>PropIntel Lab</strong><span>Portfolio workspace</span></div></div></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="crumb"><span>Workspace</span><ChevronDown size={14} /><strong>{active}</strong></div>
          <div className="top-actions"><div className="search"><Search size={16} /><input placeholder="Search property, area, ID…" /></div><button className="icon-btn"><Bell size={17} /></button><div className="top-avatar">PA</div></div>
        </header>

        <div className="content">
          <section className="hero-head">
            <div><div className="eyebrow">PROPERTY INTELLIGENCE PLATFORM</div><h1>See the market before you buy.</h1><p>ML-powered valuation, demand signals, anomaly detection and market trends in one workspace.</p></div>
            {meta && <ValuationDrawer cities={meta.cities} areas={areas} propertyTypes={meta.property_types} selectedCity={city === "All" ? meta.cities[0] : city} selectedArea={area} />}
          </section>

          <section className="metrics">
            <MetricCard label="Properties analyzed" value={summary ? summary.properties_analyzed.toLocaleString() : "—"} hint="Synthetic market corpus" icon="building" tone="blue" />
            <MetricCard label="Median property value" value={summary ? money(summary.median_property_value) : "—"} hint="Across tracked markets" icon="dollar" tone="green" />
            <MetricCard label="High-demand listings" value={summary ? summary.high_demand_listings.toLocaleString() : "—"} hint="Demand score ≥ 75" icon="gauge" tone="amber" />
            <MetricCard label="Pricing anomalies" value={summary ? summary.pricing_anomalies.toLocaleString() : "—"} hint="Isolation Forest flags" icon="alert" tone="rose" />
          </section>

          <section className="grid-main">
            <div className="panel trend-panel">
              <div className="panel-head"><div><div className="panel-kicker">MARKET MOMENTUM</div><h2>{city === "All" ? "Top market trajectory" : `${city} market trajectory`}</h2><p>{trend ? `${trend.area} · median transaction signal` : "Select a city to inspect an area trend."}</p></div><div className="segmented"><button className="active">2Y</button><button>6M</button><button>30D</button></div></div>
              {city !== "All" && trend ? <TrendChart data={chart} /> : <div className="empty-chart"><TrendingUp size={28} /><strong>Pick a city to unlock trend analytics</strong><span>Historical signal + 6-month forecast</span></div>}
              {trend && <div className="trend-footer"><div><span>Forecast signal</span><strong>{trend.annualized_growth_signal > 0 ? "+" : ""}{trend.annualized_growth_signal}%</strong></div><div><span>Current area</span><strong>{trend.area}</strong></div><div><span>Model note</span><strong>Linear trend baseline</strong></div></div>}
            </div>

            <div className="panel signal-panel">
              <div className="panel-head"><div><div className="panel-kicker">MODEL SIGNALS</div><h2>Why the model cares</h2><p>Global property valuation feature importance.</p></div><Sparkles size={18} className="purple-icon" /></div>
              <div className="bars">{insights.slice(0, 7).map((item) => <div className="bar-row" key={item.feature}><div className="bar-label"><span>{item.feature}</span><b>{item.importance.toFixed(1)}%</b></div><div className="bar-track"><i style={{ width: `${Math.min(item.importance * 4, 100)}%` }} /></div></div>)}</div>
              <div className="model-note"><Activity size={15} /><span>Validation MAPE</span><strong>{summary?.model_mape_pct ?? "—"}%</strong></div>
            </div>
          </section>

          <section className="grid-bottom">
            <div className="panel table-panel">
              <div className="panel-head"><div><div className="panel-kicker">MARKET MAP</div><h2>Area performance</h2><p>Demand, liquidity and indicative pricing across your markets.</p></div><div className="filter-wrap"><SlidersHorizontal size={15} /><select value={city} onChange={(e) => setCity(e.target.value)}><option>All</option>{meta?.cities.map((c) => <option key={c}>{c}</option>)}</select></div></div>
              <div className="table-scroll"><table><thead><tr><th>Market</th><th>Median value</th><th>Demand</th><th>Growth</th><th>Listings</th><th>Days live</th></tr></thead><tbody>{(shownMarket || []).slice(0, 8).map((m) => <tr key={`${m.city}-${m.area}`}><td><div className="market-cell"><div className="market-avatar">{m.area.slice(0, 1)}</div><div><strong>{m.area}</strong><span>{m.city}</span></div></div></td><td>{money(m.median_price)}</td><td><span className={`demand ${m.demand >= 75 ? "high" : m.demand >= 55 ? "med" : "low"}`}>{m.demand.toFixed(0)} / 100</span></td><td className="growth"><ArrowUpRight size={14} /> {m.growth_pct.toFixed(1)}%</td><td>{m.listings}</td><td>{m.avg_days.toFixed(0)}d</td></tr>)}</tbody></table></div>
            </div>

            <div className="panel listing-panel">
              <div className="panel-head"><div><div className="panel-kicker">OPPORTUNITY FEED</div><h2>High-signal listings</h2><p>Ranked by demand score in the selected market.</p></div><button className="ghost-btn">View all <ArrowUpRight size={14} /></button></div>
              <div className="listing-list">{listings.slice(0, 6).map((l) => <div className="listing" key={l.id}><div className="listing-img"><Building2 size={19} /></div><div className="listing-main"><div className="listing-top"><strong>{l.id}</strong><span className="type-pill">{l.property_type}</span></div><span>{l.area} · {l.size_sqft.toLocaleString()} sq ft · {l.bedrooms} bd</span><div className="listing-price"><strong>{money(l.price)}</strong><span>yield {(l.monthly_rent * 12 / l.price * 100).toFixed(1)}%</span></div></div><div className="score-ring">{l.demand_score.toFixed(0)}</div></div>)}</div>
            </div>
          </section>

          <section className="footer-callout"><div className="callout-icon"><FileSearch size={19} /></div><div><strong>Built for decisions, not demos.</strong><span>PropIntel combines valuation, comparables, anomalies, rental economics and demand classification into one decision-support workflow.</span></div><div className="callout-tags"><span>Price model</span><span>Demand model</span><span>Anomaly model</span></div></section>
          <div className="disclaimer"><TriangleAlert size={13} /> Demo data is synthetic for portfolio demonstration. Predictions are not financial advice or guaranteed market outcomes.</div>
        </div>
      </main>
    </div>
  );
}
