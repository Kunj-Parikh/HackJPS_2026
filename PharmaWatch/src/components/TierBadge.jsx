import { TIER_CONFIG } from "../data/mockData";

const tierStyles = {
  weak: "border-error/40 text-error bg-error/5",
  moderate: "border-warning/40 text-warning bg-warning/5",
  strong: "border-success/40 text-success bg-success/5",
  validated: "border-info/40 text-info bg-info/5",
};

export default function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier];
  if (!cfg) return null;
  const style = tierStyles[tier] || "border-base-300 text-base-content";
  return (
    <span className={`inline-flex items-center text-[11px] uppercase tracking-wide font-medium px-2.5 py-1 rounded-lg border shrink-0 ${style}`}>
      {cfg.label}
    </span>
  );
}
