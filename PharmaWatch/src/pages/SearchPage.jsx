import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { slugify } from "../data/mockData";
import SignalCard from "../components/SignalCard";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchMode, setSearchMode] = useState("drug"); // "drug" or "symptom"
  
  const [drugs, setDrugs] = useState([]);
  const [allSignals, setAllSignals] = useState([]);
  const [globalStats, setGlobalStats] = useState({ signalsDetected: 0, drugsMonitored: 0, reportsAnalyzed: 0 });
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const ref = useRef();

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        const snap = await getDoc(doc(db, "meta", "global"));
        if (snap.exists()) {
          const data = snap.data();
          setDrugs(data.drugs || []);
          setAllSignals(data.allSignals || []);
          setGlobalStats(data.GLOBAL_STATS || { signalsDetected: 0, drugsMonitored: 0, reportsAnalyzed: 0 });
        }
      } catch (err) {
        console.error("Error fetching global data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGlobalData();
  }, []);

  const [rxNormSuggestions, setRxNormSuggestions] = useState([]);
  const [isSearchingRxNorm, setIsSearchingRxNorm] = useState(false);

  const cleanDrugName = (name) => {
    if (!name) return null;
    const bracketMatch = name.match(/(.+?)\[(.+?)\]/);
    if (bracketMatch) {
      let gen = bracketMatch[1].trim();
      let br = bracketMatch[2].trim();
      gen = gen.replace(/\s+\d+(\.\d+)?\s*(mg|mcg|ml|g|%)\b.*/i, "").trim();
      gen = gen.replace(/\s+(?:Oral Tablet|Pen Injector|Injectable Product|Oral Product|Pill|Oral Suspension|Injection|Prefilled Syringe|Topical Cream|Tablet|Capsule|Solution)\b.*/i, "").trim();
      br = br.replace(/\s+\d+(\.\d+)?\s*(mg|mcg|ml|g|%)\b.*/i, "").trim();
      br = br.replace(/\s+(?:Oral Tablet|Pen Injector|Injectable Product|Oral Product|Pill|Oral Suspension|Injection|Prefilled Syringe|Topical Cream|Tablet|Capsule|Solution)\b.*/i, "").trim();
      return {
        brand: br.charAt(0).toUpperCase() + br.slice(1),
        generic: gen.charAt(0).toLowerCase() + gen.slice(1)
      };
    }
    let clean = name.trim();
    clean = clean.replace(/\s+(?:Oral Tablet|Pen Injector|Injectable Product|Oral Product|Pill|Oral Suspension|Injection|Prefilled Syringe|Topical Cream|Tablet|Capsule|Solution)\b.*/i, "").trim();
    clean = clean.replace(/\s+\d+(\.\d+)?\s*(mg|mcg|ml|g|%)\b.*/i, "").trim();
    return {
      brand: clean.charAt(0).toUpperCase() + clean.slice(1),
      generic: ""
    };
  };

  useEffect(() => {
    if (searchMode !== "drug" || query.trim().length < 2) {
      setRxNormSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingRxNorm(true);
      try {
        const response = await fetch(
          `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(query)}&maxEntries=10`
        );
        const data = await response.json();
        const candidates = data?.approximateGroup?.candidate || [];
        const parsed = candidates
          .map((c) => (c.name ? cleanDrugName(c.name) : null))
          .filter(Boolean);
        const unique = [];
        const seen = new Set();
        parsed.forEach((item) => {
          const key = item.brand.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        });
        setRxNormSuggestions(unique);
      } catch (err) {
        console.error("Error fetching RxNorm suggestions:", err);
      } finally {
        setIsSearchingRxNorm(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [query, searchMode]);

  const localMatches = query.trim()
    ? drugs.filter(
        (d) =>
          d.brand.toLowerCase().includes(query.toLowerCase()) ||
          d.generic.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const localMatchKeys = new Set(
    localMatches.flatMap((d) => [d.brand.toLowerCase(), d.generic.toLowerCase()])
  );

  const nonLocalRxNormSuggestions = rxNormSuggestions.filter((s) => {
    const brandKey = s.brand.toLowerCase();
    const genericKey = s.generic.toLowerCase();
    return !localMatchKeys.has(brandKey) && (!genericKey || !localMatchKeys.has(genericKey));
  });

  const filteredSymptoms = query.trim()
    ? allSignals.filter(
        (s) =>
          s.symptom.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const uniqueFilteredSymptoms = [];
  const seenSymptoms = new Set();
  filteredSymptoms.forEach(s => {
    const key = `${s.symptom.toLowerCase()}-${s.drugId}`;
    if (!seenSymptoms.has(key)) {
      seenSymptoms.add(key);
      uniqueFilteredSymptoms.push(s);
    }
  });

  const topSignals = allSignals.filter((s) => s.listedSimilarity < 0.5).slice(0, 6);

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

  const selectRxNormDrug = (brand, generic) => {
    setQuery("");
    setShowDropdown(false);
    const drugId = brand.toLowerCase().replace(/[^a-z0-9]/g, "-");
    navigate(`/drug/${drugId}`, { state: { brand, generic } });
  };

  const selectSymptom = (drugId, symptom) => {
    setQuery("");
    setShowDropdown(false);
    navigate(`/signal/${drugId}/${slugify(symptom)}`);
  };

  const handleSearchSubmit = () => {
    if (!query.trim()) return;
    if (searchMode === "drug") {
      const exactLocal = drugs.find(
        (d) =>
          d.brand.toLowerCase() === query.toLowerCase() ||
          d.generic.toLowerCase() === query.toLowerCase()
      );
      if (exactLocal) {
        selectDrug(exactLocal.id);
        return;
      }
      const partialLocal = drugs.find(
        (d) =>
          d.brand.toLowerCase().includes(query.toLowerCase()) ||
          d.generic.toLowerCase().includes(query.toLowerCase())
      );
      if (partialLocal) {
        selectDrug(partialLocal.id);
        return;
      }
      if (rxNormSuggestions.length > 0) {
        selectRxNormDrug(rxNormSuggestions[0].brand, rxNormSuggestions[0].generic);
        return;
      }
      selectRxNormDrug(query.trim(), "");
    } else {
      const exactSymptom = allSignals.find(
        (s) => s.symptom.toLowerCase() === query.toLowerCase()
      );
      if (exactSymptom) {
        selectSymptom(exactSymptom.drugId, exactSymptom.symptom);
        return;
      }
      const partialSymptom = allSignals.find(
        (s) => s.symptom.toLowerCase().includes(query.toLowerCase())
      );
      if (partialSymptom) {
        selectSymptom(partialSymptom.drugId, partialSymptom.symptom);
        return;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-base-100 dark:bg-mesh-dark relative overflow-hidden flex flex-col justify-center items-center min-h-[80vh] transition-colors duration-500">
        <div className="absolute inset-0 bg-mesh-light dark:opacity-0 transition-opacity duration-500 pointer-events-none" />
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-base-content/75 font-bold tracking-wide">Syncing with Firestore...</p>
        </div>
      </div>
    );
  }

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
          <div className="text-xl font-black text-base-content">{globalStats.signalsDetected}</div>
          <div className="text-[10px] text-success font-bold mt-1 flex items-center gap-1">
            <span className="bg-success/20 p-0.5 rounded">↑ 12</span> new this week
          </div>
        </div>

        {/* Floating Stat Card - Top Right */}
        <div className="hidden lg:block absolute top-24 right-10 xl:right-32 saas-card p-4 animate-float stagger-2 w-48 text-left bg-base-100/90 backdrop-blur-md" style={{ animationDelay: '1.5s' }}>
          <div className="text-[10px] font-bold uppercase text-base-content/50 tracking-wider mb-1">Drugs Monitored</div>
          <div className="text-xl font-black text-base-content">{globalStats.drugsMonitored}</div>
          <div className="text-[10px] text-base-content/50 font-medium mt-1">Across 8 categories</div>
        </div>

        {/* Floating Stat Card - Bottom Left */}
        <div className="hidden lg:block absolute bottom-24 left-4 xl:left-12 saas-card p-4 animate-float stagger-3 w-52 text-left bg-base-100/90 backdrop-blur-md" style={{ animationDelay: '0.8s' }}>
          <div className="text-[10px] font-bold uppercase text-base-content/50 tracking-wider mb-1">Reports Analyzed</div>
          <div className="text-xl font-black text-base-content">{globalStats.reportsAnalyzed.toLocaleString()}</div>
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

          {/* Search Toggle Options */}
          <div className="flex gap-2 mt-8 mb-4 animate-slide-up stagger-2 bg-base-200/50 p-1.5 rounded-full border border-base-300 max-w-[280px] mx-auto relative z-50">
            <button
              onClick={() => {
                setSearchMode("drug");
                setQuery("");
                setShowDropdown(false);
              }}
              className={`flex-1 px-5 py-2 rounded-full text-xs font-black transition-all duration-300 ${
                searchMode === "drug"
                  ? "bg-primary text-white shadow-md scale-[1.02]"
                  : "text-base-content/70 hover:text-base-content hover:bg-base-300/30"
              }`}
            >
              Search Drugs
            </button>
            <button
              onClick={() => {
                setSearchMode("symptom");
                setQuery("");
                setShowDropdown(false);
              }}
              className={`flex-1 px-5 py-2 rounded-full text-xs font-black transition-all duration-300 ${
                searchMode === "symptom"
                  ? "bg-primary text-white shadow-md scale-[1.02]"
                  : "text-base-content/70 hover:text-base-content hover:bg-base-300/30"
              }`}
            >
              Search Symptoms
            </button>
          </div>

          {/* Search Container */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit();
            }}
            className="w-full max-w-2xl mx-auto relative z-50 animate-slide-up stagger-3"
            ref={ref}
          >
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
                placeholder={
                  searchMode === "drug"
                    ? "Search a drug (e.g., Ozempic, Lexapro...)"
                    : "Search a symptom or side effect (e.g., Hair Loss...)"
                }
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => query && setShowDropdown(true)}
              />
              <button type="submit" className="absolute right-2 btn btn-primary rounded-full px-8 h-11 min-h-0 font-bold hover:scale-105 transition-transform text-white border-none bg-gradient-to-r from-primary to-teal-500">
                Search
              </button>
            </div>
 
            {/* Dropdown list for Drug mode */}
            {showDropdown && searchMode === "drug" && (localMatches.length > 0 || nonLocalRxNormSuggestions.length > 0 || isSearchingRxNorm) && (
              <div className="absolute left-0 right-0 mt-3 bg-base-100 border border-base-200 rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] overflow-hidden z-40 max-h-72 overflow-y-auto animate-fade-in">
                {/* Local Monitored Matches */}
                {localMatches.map((d) => (
                  <div
                    key={`local-${d.id}`}
                    className="flex justify-between items-center px-6 py-4 hover:bg-base-200/50 cursor-pointer border-b border-base-200/50 last:border-0 transition-colors"
                    onClick={() => selectDrug(d.id)}
                  >
                    <div className="text-left">
                      <span className="font-bold text-base-content text-base">{d.brand}</span>
                      {d.generic && <span className="text-xs text-base-content/50 font-medium ml-2">{d.generic}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge border-none bg-success/10 text-success font-bold text-[10px] py-2.5 px-2.5">
                        Monitored
                      </span>
                      <span className="badge border-none bg-primary/10 text-primary font-bold text-xs py-2.5 px-3">
                        {d.signalCount} signals
                      </span>
                    </div>
                  </div>
                ))}

                {/* RxNorm Non-monitored Suggestions */}
                {nonLocalRxNormSuggestions.map((s, idx) => (
                  <div
                    key={`rxnorm-${idx}-${s.brand}`}
                    className="flex justify-between items-center px-6 py-4 hover:bg-base-200/50 cursor-pointer border-b border-base-200/50 last:border-0 transition-colors"
                    onClick={() => selectRxNormDrug(s.brand, s.generic)}
                  >
                    <div className="text-left">
                      <span className="font-bold text-base-content text-base">{s.brand}</span>
                      {s.generic && <span className="text-xs text-base-content/50 font-medium ml-2">{s.generic}</span>}
                    </div>
                    <span className="badge border-none bg-base-200 text-base-content/60 font-bold text-xs py-2.5 px-3">
                      🔍 Scan Available
                    </span>
                  </div>
                ))}

                {/* Loading indicator inside dropdown */}
                {isSearchingRxNorm && (
                  <div className="flex items-center justify-center py-4 gap-2 text-base-content/50 border-t border-base-200/20 bg-base-200/10">
                    <span className="loading loading-spinner loading-xs text-primary animate-spin"></span>
                    <span className="text-xs font-semibold">Searching RxNorm database...</span>
                  </div>
                )}
                
                {/* No results */}
                {!isSearchingRxNorm && localMatches.length === 0 && nonLocalRxNormSuggestions.length === 0 && query.trim().length >= 2 && (
                  <div className="px-6 py-4 text-center text-sm text-base-content/50 font-semibold bg-base-200/10">
                    No drugs found matching "{query}"
                  </div>
                )}
              </div>
            )}
 
            {/* Dropdown list for Symptom mode */}
            {showDropdown && searchMode === "symptom" && uniqueFilteredSymptoms.length > 0 && (
              <div className="absolute left-0 right-0 mt-3 bg-base-100 border border-base-200 rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] overflow-hidden z-40 max-h-72 overflow-y-auto animate-fade-in">
                {uniqueFilteredSymptoms.map((s) => (
                  <div
                    key={`${s.drugId}-${s.symptom}`}
                    className="flex justify-between items-center px-6 py-4 hover:bg-base-200/50 cursor-pointer border-b border-base-200/50 last:border-0 transition-colors"
                    onClick={() => selectSymptom(s.drugId, s.symptom)}
                  >
                    <div className="text-left">
                      <span className="font-bold text-base-content text-base">{s.symptom}</span>
                      <span className="text-xs text-primary font-bold ml-2">on {s.drugBrand}</span>
                    </div>
                    <span className={`badge border-none font-bold text-xs py-3 px-3 ${
                      s.tier === 'validated' ? 'bg-success/20 text-success' :
                      s.tier === 'strong' ? 'bg-info/20 text-info' :
                      s.tier === 'moderate' ? 'bg-warning/20 text-warning' :
                      'bg-neutral/20 text-neutral'
                    }`}>
                      {s.tier}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </form>
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
