import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getDrug } from "../data/mockData";
import SignalCard from "../components/SignalCard";
import TimelineChart from "../components/TimelineChart";

export default function DrugPage() {
  const { drugName } = useParams();
  const drug = getDrug(drugName);
  const [showListed, setShowListed] = useState(false);

  if (!drug) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-xl">
        <h2 className="text-2xl font-black text-base-content">Drug not found</h2>
        <p className="mt-4">
          <Link to="/" className="btn btn-primary font-bold">
            ← Back to Search
          </Link>
        </p>
      </div>
    );
  }

  const unlistedSignals = drug.signals.filter((s) => s.listedSimilarity < 0.5);
  const sortedSignals = [...unlistedSignals].sort((a, b) => {
    const order = { validated: 0, strong: 1, moderate: 2, weak: 3 };
    return (order[a.tier] ?? 4) - (order[b.tier] ?? 4);
  });

  const totalReporters = drug.signals.reduce((s, sig) => s + sig.uniqueReporters, 0);
  const highestTier = drug.signals.reduce((best, sig) => {
    const order = { validated: 0, strong: 1, moderate: 2, weak: 3 };
    return (order[sig.tier] ?? 4) < (order[best] ?? 4) ? sig.tier : best;
  }, "weak");

  const allTimeline = {};
  drug.signals.forEach((s) => {
    s.timeline.forEach((t) => {
      if (!allTimeline[t.month]) allTimeline[t.month] = { month: t.month, reddit: 0, faers: 0 };
      allTimeline[t.month].reddit += t.reddit;
      allTimeline[t.month].faers += t.faers;
    });
  });
  const timelineData = Object.values(allTimeline).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="flex-1 bg-base-100 dark:bg-mesh-dark relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-mesh-light dark:opacity-0 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 hero-glow-blob rounded-full pointer-events-none animate-float opacity-40" />
      <div className="container mx-auto px-4 py-8 max-w-5xl relative z-10">
      {/* Back button */}
      <Link to="/" className="btn btn-ghost btn-sm gap-1 pl-1 text-base-content/75 hover:text-primary mb-6 font-semibold">
        ← Back to search
      </Link>

      {/* Drug Header Card */}
      <div className="saas-card p-6 md:p-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-base-content tracking-tight">{drug.brand}</h1>
            <div className="text-sm font-bold text-primary mt-1">
              {drug.generic} • <span className="opacity-90">{drug.class}</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-xs font-semibold text-base-content/70">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-base-content/50 font-black mb-0.5">
                  FDA Approved
                </span>
                <span>
                  {new Date(drug.approvalDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-base-content/50 font-black mb-0.5">
                  Indications
                </span>
                <span>{drug.indications.join(", ")}</span>
              </div>
            </div>
          </div>

          {/* Stats widget inside header */}
          <div className="stats stats-horizontal bg-base-100 border border-base-300/60 shadow-sm w-full md:w-auto">
            <div className="stat text-center py-3 px-4 md:px-6">
              <div className="stat-title text-[9px] font-black uppercase tracking-wider text-base-content/50">
                Unlisted Signals
              </div>
              <div className="stat-value text-lg md:text-xl font-extrabold text-base-content mt-0.5">
                {unlistedSignals.length}
              </div>
            </div>
            <div className="stat text-center py-3 px-4 md:px-6 border-x border-base-300/60">
              <div className="stat-title text-[9px] font-black uppercase tracking-wider text-base-content/50">
                Total Reporters
              </div>
              <div className="stat-value text-lg md:text-xl font-extrabold text-base-content mt-0.5">
                {totalReporters.toLocaleString()}
              </div>
            </div>
            <div className="stat text-center py-3 px-4 md:px-6">
              <div className="stat-title text-[9px] font-black uppercase tracking-wider text-base-content/50">
                Highest Tier
              </div>
              <div className="stat-value text-lg md:text-xl font-extrabold text-primary capitalize mt-0.5">
                {highestTier}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapse component for listed side effects */}
      <div className="collapse collapse-plus border border-base-300 bg-base-100 mt-6 shadow-sm">
        <input type="checkbox" checked={showListed} onChange={() => setShowListed(!showListed)} />
        <div className="collapse-title text-sm font-bold text-base-content flex justify-between items-center pr-12">
          <span>Known Side Effects (FDA Label)</span>
          <span className="badge badge-neutral font-bold text-xs py-2.5 px-3 bg-base-200">
            {drug.listedEffects.length} listed
          </span>
        </div>
        <div className="collapse-content">
          <div className="flex flex-wrap gap-1.5 pt-2">
            {drug.listedEffects.map((e) => (
              <span key={e} className="badge badge-ghost font-bold text-xs py-2.5 px-3 bg-base-200/50">
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Unlisted Signals Title */}
      <h2 className="text-xl md:text-2xl font-black text-base-content tracking-tight mt-10 mb-5 flex items-center gap-2">
        Unlisted Signals Detected
      </h2>

      {/* Grid of Signals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedSignals.map((s, i) => (
          <div key={s.symptom} className={`animate-fade-in stagger-${(i % 5) + 1}`}>
            <SignalCard signal={s} drugId={drugName} />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      {timelineData.length > 0 && (
        <div className="animate-fade-in mt-12">
          <TimelineChart data={timelineData} />
        </div>
      )}
      </div>
    </div>
  );
}
