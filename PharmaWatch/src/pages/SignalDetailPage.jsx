import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { slugify } from "../data/mockData";
import TierBadge from "../components/TierBadge";
import TimelineChart from "../components/TimelineChart";
import OnsetHistogram from "../components/OnsetHistogram";

export default function SignalDetailPage() {
  const { drugName, symptom } = useParams();
  const [drug, setDrug] = useState(null);
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check sessionStorage for simulated drug data first
    const cached = sessionStorage.getItem("simulated_drug_" + drugName);
    if (cached) {
      try {
        const drugData = JSON.parse(cached);
        setDrug(drugData);
        if (drugData.signals) {
          const sig = drugData.signals.find(
            (s) => slugify(s.symptom) === symptom
          );
          setSignal(sig || null);
        }
        setLoading(false);
        return;
      } catch (e) {
        console.error("Error parsing cached simulated drug", e);
      }
    }

    const fetchSignalData = async () => {
      try {
        const snap = await getDoc(doc(db, "drugs", drugName));
        if (snap.exists()) {
          const drugData = snap.data();
          setDrug(drugData);
          if (drugData.signals) {
            const sig = drugData.signals.find(
              (s) => slugify(s.symptom) === symptom
            );
            setSignal(sig || null);
          }
        }
      } catch (err) {
        console.error("Error fetching signal details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSignalData();
  }, [drugName, symptom]);

  if (loading) {
    return (
      <div className="flex-1 bg-base-100 dark:bg-mesh-dark relative overflow-hidden flex flex-col justify-center items-center min-h-[80vh] transition-colors duration-500">
        <div className="absolute inset-0 bg-mesh-light dark:opacity-0 transition-opacity duration-500 pointer-events-none" />
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-base-content/75 font-bold tracking-wide">Analyzing safety signal details...</p>
        </div>
      </div>
    );
  }

  if (!signal || !drug) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-xl">
        <h2 className="text-2xl font-black text-base-content">Signal not found</h2>
        <p className="mt-4">
          <Link to="/" className="btn btn-primary font-bold">
            ← Back to Search
          </Link>
        </p>
      </div>
    );
  }

  const onsetConsistency = (1 / (1 + (signal.onsetStdDev || 5) / (signal.avgOnsetDays || 14))).toFixed(3);
  const subDiversity = (signal.subreddits || []).length >= 3 ? 1.5 : (signal.subreddits || []).length >= 2 ? 1.2 : 1.0;
  const logReporters = Math.log(signal.uniqueReporters || 1).toFixed(2);
  const finalScore = (
    Math.log(signal.uniqueReporters || 1) *
    (signal.causalityAvg || 0.5) *
    parseFloat(onsetConsistency) *
    subDiversity
  ).toFixed(2);

  const faersLag = signal.faersFirstSeen && signal.firstSeen
    ? Math.round((new Date(signal.faersFirstSeen) - new Date(signal.firstSeen)) / (1000 * 60 * 60 * 24 * 30))
    : null;

  return (
    <div className="flex-1 bg-base-100 dark:bg-mesh-dark relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-mesh-light dark:opacity-0 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 hero-glow-blob rounded-full pointer-events-none animate-float opacity-40" />
      <div className="container mx-auto px-4 py-8 max-w-5xl relative z-10">
      {/* Back button */}
      <Link
        to={`/drug/${drugName}`}
        className="btn btn-ghost btn-sm gap-1 pl-1 text-base-content/75 hover:text-primary mb-6 font-semibold"
      >
        ← Back to {drug.brand}
      </Link>

      {/* Signal Details Header */}
      <div className="card bg-base-200 border border-base-300 p-6 md:p-8 animate-fade-in shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="text-xs font-black text-primary uppercase tracking-widest">
              {drug.brand} ({drug.generic})
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-base-content tracking-tight mt-1">
              {signal.symptom}
            </h1>
          </div>
          <TierBadge tier={signal.tier} />
        </div>

        {/* Dynamic Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          <div className="card bg-base-100 border border-base-300/60 p-3.5 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-base-content/50">
              Unique Reporters
            </span>
            <span className="text-lg font-extrabold text-base-content mt-1">{signal.uniqueReporters}</span>
          </div>
          <div className="card bg-base-100 border border-base-300/60 p-3.5 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-base-content/50">
              Avg Onset
            </span>
            <span className="text-lg font-extrabold text-base-content mt-1">~{signal.avgOnsetDays}d</span>
          </div>
          <div className="card bg-base-100 border border-base-300/60 p-3.5 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-base-content/50">
              Onset Std Dev
            </span>
            <span className="text-lg font-extrabold text-base-content mt-1">± {signal.onsetStdDev}d</span>
          </div>
          <div className="card bg-base-100 border border-base-300/60 p-3.5 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-base-content/50">
              Causality
            </span>
            <span className="text-lg font-extrabold text-base-content mt-1">
              {Math.round(signal.causalityAvg * 100)}%
            </span>
          </div>
          <div className="card bg-base-100 border border-base-300/60 p-3.5 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-base-content/50">
              Subreddits
            </span>
            <span className="text-lg font-extrabold text-base-content mt-1">{signal.subreddits.length}</span>
          </div>
        </div>

        {/* FAERS Lag Alert Banner */}
        {faersLag !== null && (
          <div className="alert alert-info border border-info/20 shadow-sm mt-5 text-xs md:text-sm font-semibold flex items-start gap-2">
            <span>Note:</span>
            <div>
              <span className="font-extrabold">{faersLag} Months Early Detection:</span>
              <span className="opacity-90 ml-1">
                PharmaWatch flagged this safety signal on Reddit {faersLag} months before FAERS crossed the critical reporting threshold.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Grid containing charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="animate-fade-in stagger-1">
          <TimelineChart data={signal.timeline} height={260} />
        </div>
        <div className="animate-fade-in stagger-2">
          <OnsetHistogram data={signal.onsetDistribution} height={260} />
        </div>
      </div>

      {/* Detailed analysis breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Quotes list */}
        <div className="card bg-base-100 border border-base-300 p-6 shadow-sm animate-fade-in stagger-3">
          <h3 className="card-title text-sm font-bold text-base-content mb-4">
            Anonymized Patient Reports
          </h3>
          <div className="flex flex-col gap-3.5">
            {signal.quotes.map((q, i) => (
              <div key={i} className="card bg-base-200/40 border border-base-300/60 p-4 rounded-xl hover:bg-base-200/70 transition-all">
                <p className="italic text-sm text-base-content/90 leading-relaxed font-medium">"{q.text}"</p>
                <div className="flex justify-between items-center text-[10px] font-bold text-base-content/50 mt-3.5">
                  <span className="badge badge-ghost badge-sm text-[9px] font-bold px-2 py-2">r/{q.sub}</span>
                  <span>{q.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score calculations */}
        <div className="card bg-base-100 border border-base-300 p-6 shadow-sm animate-fade-in stagger-4 flex flex-col gap-6">
          <div>
            <h3 className="card-title text-sm font-bold text-base-content mb-3">
              Signal Score Formula & Breakdown
            </h3>
            <div className="divide-y divide-base-300/50 text-sm font-medium">
              <div className="flex justify-between py-2.5">
                <span className="text-base-content/75">log(Unique Reporters)</span>
                <span className="font-bold text-base-content">{logReporters}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-base-content/75">Causality Average</span>
                <span className="font-bold text-base-content">{signal.causalityAvg}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-base-content/75">Onset Consistency</span>
                <span className="font-bold text-base-content">{onsetConsistency}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-base-content/75">Subreddit Diversity Weight</span>
                <span className="font-bold text-base-content">{subDiversity}x</span>
              </div>
              <div className="flex justify-between py-3 text-base font-black text-primary border-t border-base-300">
                <span>Final Signal Score</span>
                <span>{finalScore}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-base-content/60 mb-2">
              Source Subreddits
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {signal.subreddits.map((s) => (
                <span key={s} className="badge badge-neutral font-bold text-xs py-2.5 px-3">
                  r/{s}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-base-300/60 pt-4 flex flex-col gap-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-base-content/60">
              Detection Metadata
            </h4>
            <div className="text-xs text-base-content/80 space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span>First Reddit mention:</span>
                <strong className="text-base-content">{signal.firstSeen}</strong>
              </div>
              <div className="flex justify-between">
                <span>FAERS reporting threshold crossed:</span>
                <strong className="text-base-content">{signal.faersFirstSeen || "Not yet reached"}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>FDA label semantic similarity:</span>
                <span
                  className={`badge font-black text-[10px] px-2.5 py-2.5 ${
                    signal.listedSimilarity < 0.5 ? "badge-success text-success-content" : "badge-warning text-warning-content"
                  }`}
                >
                  {(signal.listedSimilarity * 100).toFixed(0)}% — {signal.listedSimilarity < 0.5 ? "Unlisted" : "Possibly Related"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
