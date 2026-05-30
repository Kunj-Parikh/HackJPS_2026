import { TIER_CONFIG } from "../data/mockData";

const badgeClasses = {
  weak: "badge badge-error badge-soft gap-1 text-[11px] uppercase tracking-wider font-bold py-3 px-3 shadow-sm",
  moderate: "badge badge-warning badge-soft gap-1 text-[11px] uppercase tracking-wider font-bold py-3 px-3 shadow-sm",
  strong: "badge badge-success badge-soft gap-1 text-[11px] uppercase tracking-wider font-bold py-3 px-3 shadow-sm",
  validated: "badge badge-info badge-soft gap-1 text-[11px] uppercase tracking-wider font-bold py-3 px-3 shadow-sm"
};

export default function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier];
  if (!cfg) return null;
  const cls = badgeClasses[tier] || "badge";
  return <span className={cls}>{cfg.emoji} {cfg.label}</span>;
}
