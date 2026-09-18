import { ArrowUpRight, BadgeDollarSign, Building2, Gauge, House, TriangleAlert } from "lucide-react";

type Props = { label: string; value: string; hint: string; icon: string; tone?: "green" | "blue" | "amber" | "rose" };

const icons = { building: Building2, dollar: BadgeDollarSign, gauge: Gauge, house: House, alert: TriangleAlert };

export default function MetricCard({ label, value, hint, icon, tone = "blue" }: Props) {
  const Icon = icons[icon as keyof typeof icons] || Building2;
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="icon-wrap"><Icon size={18} /></span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-hint"><ArrowUpRight size={14} /> {hint}</div>
    </div>
  );
}
