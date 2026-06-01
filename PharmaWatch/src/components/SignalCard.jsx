import { Link } from "react-router-dom";
import TierBadge from "./TierBadge";
import { slugify } from "../data/dataService";

export default function SignalCard({ signal, drugId, showDrug = false }) {
  const path = `/signal/${drugId}/${slugify(signal.symptom)}`;

  return (
    <Link
      to={path}
      className="panel-card panel-card-hover h-full block overflow-hidden transition-colors"
    >
      <div className="p-6 flex flex-col justify-between h-full relative z-10">
        <div>
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="flex-1">
              {showDrug && (
                <div className="text-[10px] text-base-content/50 uppercase tracking-wide">
                  {signal.drugBrand || drugId}
                </div>
              )}
              <h3 className="card-title text-base-content text-base font-bold leading-snug mt-0.5">
                {signal.symptom}
              </h3>
            </div>
            <TierBadge tier={signal.tier} />
          </div>

          <div className="grid grid-cols-3 gap-1 text-center py-2 bg-base-200/60 rounded-lg border border-base-300/50 text-sm">
            <div>
              <span className="block font-bold text-xs text-base-content">
                {signal.uniqueReporters}
              </span>
              <span className="text-[9px] font-medium text-base-content/60 uppercase">Reporters</span>
            </div>
            <div>
              <span className="block font-bold text-xs text-base-content">
                {signal.avgOnsetDays}d
              </span>
              <span className="text-[9px] font-medium text-base-content/60 uppercase">Onset</span>
            </div>
            <div>
              <span className="block font-bold text-xs text-base-content">
                {Math.round(signal.causalityAvg * 100)}%
              </span>
              <span className="text-[9px] font-medium text-base-content/60 uppercase">Causality</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {signal.subreddits.map((s) => (
            <span key={s} className="badge badge-ghost badge-sm text-[10px] font-bold py-2.5 px-2.5 bg-base-200/60 text-base-content/70">
              r/{s.replace(/^r\//, "")}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
