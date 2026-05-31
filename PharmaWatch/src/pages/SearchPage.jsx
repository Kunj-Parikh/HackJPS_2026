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
      <div className="page-shell flex flex-col justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-md text-primary" />
        <p className="text-sm text-base-content/60 mt-4">Loading index…</p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="max-w-3xl mx-auto px-4 pt-12 pb-10 md:pt-16 md:pb-14">
        <p className="text-xs uppercase tracking-widest text-base-content/50 mb-4">
          Patient-reported safety signals
        </p>

        <h1 className="font-display text-3xl md:text-4xl lg:text-[2.75rem] font-semibold text-base-content leading-tight">
          Find unlisted side effects before they reach the label
        </h1>

        <p className="text-base text-base-content/65 max-w-xl mt-4 leading-relaxed">
          PharmaWatch scans Reddit patient discussions for adverse reactions that are not yet reflected in FDA labeling.
        </p>

        <dl className="stat-strip mt-8 gap-x-10 gap-y-3">
          <div>
            <dt>Signals</dt>
            <dd>{globalStats.signalsDetected}</dd>
          </div>
          <div>
            <dt>Drugs monitored</dt>
            <dd>{globalStats.drugsMonitored}</dd>
          </div>
          <div>
            <dt>Reports analyzed</dt>
            <dd>{globalStats.reportsAnalyzed.toLocaleString()}</dd>
          </div>
        </dl>

        <div className="flex border border-base-300 rounded-xl overflow-hidden mt-8 max-w-xs text-sm">
          <button
            type="button"
            onClick={() => {
              setSearchMode("drug");
              setQuery("");
              setShowDropdown(false);
            }}
            className={`flex-1 px-4 py-2 transition-colors ${
              searchMode === "drug"
                ? "bg-primary text-primary-content font-medium"
                : "bg-base-100 text-base-content/70 hover:bg-base-200"
            }`}
          >
            By drug
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchMode("symptom");
              setQuery("");
              setShowDropdown(false);
            }}
            className={`flex-1 px-4 py-2 border-l border-base-300 transition-colors ${
              searchMode === "symptom"
                ? "bg-primary text-primary-content font-medium"
                : "bg-base-100 text-base-content/70 hover:bg-base-200"
            }`}
          >
            By symptom
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchSubmit();
          }}
          className="mt-4 max-w-2xl relative"
          ref={ref}
        >
          <div className="flex gap-2 p-1.5 border border-base-300 rounded-xl bg-base-100 focus-within:ring-2 focus-within:ring-primary/20">
            <input
              id="drug-search"
              type="text"
              className="input input-ghost flex-1 rounded-lg border-0 focus:outline-none min-h-10"
              placeholder={
                searchMode === "drug"
                  ? "Drug name (e.g. Ozempic, Lexapro)"
                  : "Symptom (e.g. hair loss, brain fog)"
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => query && setShowDropdown(true)}
            />
            <button type="submit" className="btn btn-primary rounded-lg min-h-10 px-6">
              Search
            </button>
          </div>
 
            {/* Dropdown list for Drug mode */}
            {showDropdown && searchMode === "drug" && (localMatches.length > 0 || nonLocalRxNormSuggestions.length > 0 || isSearchingRxNorm) && (
              <div className="absolute left-0 right-0 mt-2 bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden z-40 max-h-72 overflow-y-auto">
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
                    <span className="text-xs text-base-content/50 font-medium">
                      Not indexed
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
              <div className="absolute left-0 right-0 mt-2 bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden z-40 max-h-72 overflow-y-auto">
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
      </section>

      <section className="border-t border-base-300 bg-base-200/40">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="font-display text-xl font-semibold text-base-content">
            Recent signals
          </h2>
          <p className="text-sm text-base-content/55 mt-1">
            Unlisted reactions with low FDA label similarity
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {topSignals.map((s) => (
              <SignalCard key={`${s.drugId}-${s.symptom}`} signal={s} drugId={s.drugId} showDrug />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
