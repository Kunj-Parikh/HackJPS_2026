import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDrugs, getAllSignals, GLOBAL_STATS } from "../data/mockData";
import SignalCard from "../components/SignalCard";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const drugs = getDrugs();
  const topSignals = getAllSignals().slice(0, 6);
  const ref = useRef();

  const filtered = query.trim()
    ? drugs.filter(
        (d) =>
          d.brand.toLowerCase().includes(query.toLowerCase()) ||
          d.generic.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectDrug = (id) => {
    setQuery("");
    setShowDropdown(false);
    navigate(`/drug/${id}`);
  };

  return (
    <div className="flex-1 bg-base-100 dark:bg-mesh-dark relative overflow-hidden transition-colors duration-500">
      {/* SaaS mesh light overlay - visible only in light mode */}
      <div className="absolute inset-0 bg-mesh-light dark:opacity-0 transition-opacity duration-500 pointer-events-none" />

      {/* Animated Glow Blobs in the background */}
      <div className="absolute top-10 left-10 md:left-1/4 w-72 h-72 hero-glow-blob rounded-full pointer-events-none animate-float opacity-50" />
      <div 
        className="absolute top-48 right-10 md:right-1/4 w-80 h-80 hero-glow-blob rounded-full pointer-events-none animate-float opacity-50" 
        style={{ animationDelay: "2s" }}
      />

      {/* Hero Section */}
      <section className="py-20 px-4 md:py-32 relative overflow-visible flex flex-col justify-center items-center text-center z-10 min-h-[70vh]">
        
        {/* Floating Stat Card - Top Left */}
        <div className="hidden lg:block absolute top-16 left-10 xl:left-32 saas-card p-4 animate-float stagger-1 w-48 text-left bg-base-100/90 backdrop-blur-md">
          <div className="text-[10px] font-bold uppercase text-base-content/50 tracking-wider mb-1">Signals Detected</div>
          <div className="text-xl font-black text-base-content">{GLOBAL_STATS.signalsDetected}</div>
          <div className="text-[10px] text-success font-bold mt-1 flex items-center gap-1">
            <span className="bg-success/20 p-0.5 rounded">↑ 12</span> new this week
          </div>
        </div>

        {/* Floating Stat Card - Top Right */}
        <div className="hidden lg:block absolute top-24 right-10 xl:right-32 saas-card p-4 animate-float stagger-2 w-48 text-left bg-base-100/90 backdrop-blur-md" style={{ animationDelay: '1.5s' }}>
          <div className="text-[10px] font-bold uppercase text-base-content/50 tracking-wider mb-1">Drugs Monitored</div>
          <div className="text-xl font-black text-base-content">{GLOBAL_STATS.drugsMonitored}</div>
          <div className="text-[10px] text-base-content/50 font-medium mt-1">Across 15 categories</div>
        </div>

        {/* Floating Stat Card - Bottom Left */}
        <div className="hidden lg:block absolute bottom-24 left-4 xl:left-12 saas-card p-4 animate-float stagger-3 w-52 text-left bg-base-100/90 backdrop-blur-md" style={{ animationDelay: '0.8s' }}>
          <div className="text-[10px] font-bold uppercase text-base-content/50 tracking-wider mb-1">Reports Analyzed</div>
          <div className="text-xl font-black text-base-content">{GLOBAL_STATS.reportsAnalyzed.toLocaleString()}</div>
          <div className="text-[10px] text-success font-bold mt-1 flex items-center gap-1">
            <span className="bg-success/20 p-0.5 rounded">↑ 5.2k</span> today
          </div>
        </div>

        {/* Floating Stat Card - Bottom Right */}
        <div className="hidden lg:block absolute bottom-32 right-4 xl:right-12 saas-card p-4 animate-float stagger-4 w-48 text-left bg-base-100/90 backdrop-blur-md" style={{ animationDelay: '2.2s' }}>
          <div className="text-[10px] font-bold uppercase text-base-content/50 tracking-wider mb-1">Confidence Score</div>
          <div className="text-xl font-black text-base-content">94% <span className="text-success text-sm">↑</span></div>
          <div className="text-[10px] text-base-content/50 font-medium mt-1">Avg causality rating</div>
        </div>

        <div className="max-w-3xl flex flex-col items-center relative z-20">
          {/* Signal Badge */}
          <div className="badge border-none bg-primary/10 text-primary font-bold uppercase tracking-wider text-xs px-4 py-3 animate-slide-up mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-2" />
            Live Signal Detection
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-base-content leading-[1.1] animate-slide-up stagger-1">
            Discover drug side effects <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
              before they're official
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-base-content/70 max-w-xl mx-auto mt-6 leading-relaxed animate-slide-up stagger-2 font-medium">
            PharmaWatch analyzes millions of patient reports across Reddit to detect unlisted adverse drug reactions — months before they appear in FDA labels.
          </p>

          {/* Search Container */}
          <div className="w-full max-w-2xl mx-auto mt-10 relative z-50 animate-slide-up stagger-3" ref={ref}>
            <div className="relative flex items-center bg-base-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-full p-1.5 border border-base-200 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/20 transition-all duration-300">
              <span className="absolute left-6 text-base-content/40 text-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                id="drug-search"
                type="text"
                className="input border-none w-full pl-14 pr-32 rounded-full bg-transparent focus:outline-none transition-all text-base font-medium h-14"
                placeholder="Search a drug (e.g., Ozempic, Lexapro...)"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => query && setShowDropdown(true)}
              />
              <button className="absolute right-2 btn btn-primary rounded-full px-8 h-11 min-h-0 font-bold hover:scale-105 transition-transform">
                Search
              </button>
            </div>

            {/* Dropdown list */}
            {showDropdown && filtered.length > 0 && (
              <div className="absolute left-0 right-0 mt-3 bg-base-100 border border-base-200 rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] overflow-hidden z-40 max-h-72 overflow-y-auto animate-fade-in">
                {filtered.map((d) => (
                  <div
                    key={d.id}
                    className="flex justify-between items-center px-6 py-4 hover:bg-base-200/50 cursor-pointer border-b border-base-200/50 last:border-0 transition-colors"
                    onClick={() => selectDrug(d.id)}
                  >
                    <div className="text-left">
                      <span className="font-bold text-base-content text-base">{d.brand}</span>
                      <span className="text-xs text-base-content/50 font-medium ml-2">{d.generic}</span>
                    </div>
                    <span className="badge border-none bg-base-200 text-base-content/70 font-bold text-xs py-3 px-3">
                      {d.signalCount} signals
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="bg-base-200/25 border-t border-base-300 relative z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-black text-center text-base-content tracking-tight animate-fade-in">
            Trending Signals
          </h2>
          <p className="text-center text-sm text-base-content/60 mt-2 animate-fade-in stagger-1">
            Recently detected unlisted adverse reactions, ranked by confidence
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {topSignals.map((s, i) => (
              <div key={`${s.drugId}-${s.symptom}`} className={`animate-fade-in stagger-${(i % 5) + 1}`}>
                <SignalCard signal={s} drugId={s.drugId} showDrug />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
