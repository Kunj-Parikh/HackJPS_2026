import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import SignalCard from "../components/SignalCard";
import TimelineChart from "../components/TimelineChart";
import { useUser } from "@clerk/clerk-react";

export default function DrugPage() {
  const { user } = useUser();
  const { drugName } = useParams();
  const location = useLocation();
  const [drug, setDrug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showListed, setShowListed] = useState(false);

  // States for reporting a symptom
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [newSymptomText, setNewSymptomText] = useState("");
  const [newSymptomDesc, setNewSymptomDesc] = useState("");
  const [newSymptomDuration, setNewSymptomDuration] = useState("");
  const [newSymptomOnset, setNewSymptomOnset] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // States for interactive analysis simulator
  const [isSimulated, setIsSimulated] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  const displayName = location.state?.brand || (drugName.charAt(0).toUpperCase() + drugName.slice(1).replace(/-/g, " "));
  const genericName = location.state?.generic || "";

  useEffect(() => {
    const cached = sessionStorage.getItem("simulated_drug_" + drugName);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setDrug(parsed);
        setIsSimulated(true);
        setLoading(false);
        return;
      } catch (e) {
        console.error("Error parsing cached simulated drug", e);
      }
    }

    const fetchDrugData = async () => {
      try {
        const snap = await getDoc(doc(db, "drugs", drugName));
        if (snap.exists()) {
          setDrug(snap.data());
        }
      } catch (err) {
        console.error("Error fetching drug details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrugData();
  }, [drugName]);

  const startAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisStep(0);
  };

  useEffect(() => {
    if (!isAnalyzing) return;
    if (analysisStep < 5) {
      const timer = setTimeout(() => {
        setAnalysisStep((prev) => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setIsAnalyzing(false);
      const simulatedDrug = {
        brand: displayName,
        generic: genericName || displayName.toLowerCase(),
        class: "Simulated Watchlist Drug",
        approvalDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * 5).toISOString().split('T')[0],
        indications: ["Patient Selected Watchlist"],
        listedEffects: ["Nausea", "Headache", "Fatigue", "Dizziness", "Dry mouth"],
        signals: [
          {
            symptom: "Anhedonia (Emotional Numbness)",
            tier: "validated",
            uniqueReporters: 184,
            avgOnsetDays: 45,
            onsetStdDev: 12,
            causalityAvg: 0.82,
            subreddits: [`r/${displayName.toLowerCase().replace(/\s+/g, "")}`, "r/AskDocs", "r/pharmacy"],
            firstSeen: "2024-08-15",
            faersFirstSeen: "2025-02-10",
            listedSimilarity: 0.18,
            quotes: [
              {
                text: `About 6 weeks after starting ${displayName}, I noticed I didn't feel anything anymore. I couldn't cry, couldn't get excited. Total anhedonia.`,
                sub: `r/${displayName.toLowerCase().replace(/\s+/g, "")}`,
                date: "2024-10-02"
              },
              {
                text: "Does this drug cause emotional blunting? I feel like a robot. 2 months in.",
                sub: "r/AskDocs",
                date: "2024-11-14"
              }
            ],
            timeline: [
              { month: "2024-08", reddit: 4, faers: 0 },
              { month: "2024-09", reddit: 12, faers: 0 },
              { month: "2024-10", reddit: 25, faers: 1 },
              { month: "2024-11", reddit: 38, faers: 3 },
              { month: "2024-12", reddit: 45, faers: 8 },
              { month: "2025-01", reddit: 32, faers: 14 },
              { month: "2025-02", reddit: 18, faers: 24 }
            ],
            onsetDistribution: [
              { range: "0-15", count: 12 },
              { range: "16-30", count: 28 },
              { range: "31-45", count: 82 },
              { range: "46-60", count: 48 },
              { range: "61+", count: 14 }
            ]
          },
          {
            symptom: "Night Sweats",
            tier: "strong",
            uniqueReporters: 98,
            avgOnsetDays: 14,
            onsetStdDev: 5,
            causalityAvg: 0.76,
            subreddits: [`r/${displayName.toLowerCase().replace(/\s+/g, "")}`, "r/medical"],
            firstSeen: "2024-09-01",
            faersFirstSeen: null,
            listedSimilarity: 0.28,
            quotes: [
              {
                text: `Waking up absolutely drenched in sweat every single night since starting ${displayName}. Never had this issue in my life.`,
                sub: `r/${displayName.toLowerCase().replace(/\s+/g, "")}`,
                date: "2024-09-20"
              }
            ],
            timeline: [
              { month: "2024-09", reddit: 8, faers: 0 },
              { month: "2024-10", reddit: 22, faers: 0 },
              { month: "2024-11", reddit: 35, faers: 0 },
              { month: "2024-12", reddit: 18, faers: 1 },
              { month: "2025-01", reddit: 10, faers: 2 }
            ],
            onsetDistribution: [
              { range: "0-7", count: 18 },
              { range: "8-14", count: 45 },
              { range: "15-21", count: 25 },
              { range: "22-28", count: 8 },
              { range: "29+", count: 2 }
            ]
          },
          {
            symptom: "Severe Joint Pain",
            tier: "moderate",
            uniqueReporters: 42,
            avgOnsetDays: 30,
            onsetStdDev: 10,
            causalityAvg: 0.64,
            subreddits: [`r/${displayName.toLowerCase().replace(/\s+/g, "")}`],
            firstSeen: "2024-10-10",
            faersFirstSeen: null,
            listedSimilarity: 0.35,
            quotes: [
              {
                text: `My knees and hips started aching like crazy about a month in. Doctor says it's unrelated, but the joint pain is so sudden.`,
                sub: `r/${displayName.toLowerCase().replace(/\s+/g, "")}`,
                date: "2024-11-05"
              }
            ],
            timeline: [
              { month: "2024-10", reddit: 5, faers: 0 },
              { month: "2024-11", reddit: 15, faers: 0 },
              { month: "2024-12", reddit: 12, faers: 0 },
              { month: "2025-01", reddit: 7, faers: 1 }
            ],
            onsetDistribution: [
              { range: "0-14", count: 6 },
              { range: "15-30", count: 22 },
              { range: "31-45", count: 10 },
              { range: "46+", count: 4 }
            ]
          }
        ]
      };
      sessionStorage.setItem("simulated_drug_" + drugName, JSON.stringify(simulatedDrug));
      setDrug(simulatedDrug);
      setIsSimulated(true);
    }
  }, [analysisStep, isAnalyzing]);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!newSymptomText.trim()) return;

    setIsSubmittingReport(true);
    
    // Format symptom string (Capitalize first letter)
    const formattedSymptom = newSymptomText.trim().charAt(0).toUpperCase() + newSymptomText.trim().slice(1).toLowerCase();
    
    try {
      // Create a deep copy of the current drug data to modify
      const updatedDrug = JSON.parse(JSON.stringify(drug));
      
      // Ensure userReports array exists
      updatedDrug.userReports = updatedDrug.userReports || [];
      
      // Check if symptom already exists
      const existingReportIndex = updatedDrug.userReports.findIndex(
        (s) => s.symptom.toLowerCase() === formattedSymptom.toLowerCase()
      );

      const reporterName = user?.firstName ? user.firstName : "A User";
      const todayStr = new Date().toISOString().split('T')[0];

      const newReportDetail = {
        reporter: reporterName,
        dateReported: todayStr,
        description: newSymptomDesc.trim(),
        duration: newSymptomDuration.trim(),
        onset: newSymptomOnset.trim()
      };

      if (existingReportIndex >= 0) {
        // Increment count
        updatedDrug.userReports[existingReportIndex].count = (updatedDrug.userReports[existingReportIndex].count || 1) + 1;
        updatedDrug.userReports[existingReportIndex].reports = updatedDrug.userReports[existingReportIndex].reports || [];
        updatedDrug.userReports[existingReportIndex].reports.push(newReportDetail);
      } else {
        // Create new user report entry
        const newEntry = {
          symptom: formattedSymptom,
          count: 1,
          reports: [newReportDetail]
        };
        updatedDrug.userReports.push(newEntry);
      }

      // Save changes
      if (isSimulated) {
        // Update local session storage
        sessionStorage.setItem("simulated_drug_" + drugName, JSON.stringify(updatedDrug));
        setDrug(updatedDrug);
      } else {
        // Update Firestore
        const docRef = doc(db, "drugs", drugName);
        await updateDoc(docRef, { userReports: updatedDrug.userReports });
        setDrug(updatedDrug);
      }
      
      // Close modal and reset
      setIsReportModalOpen(false);
      setNewSymptomText("");
      setNewSymptomDesc("");
      setNewSymptomDuration("");
      setNewSymptomOnset("");
      
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-base-100 dark:bg-mesh-dark relative overflow-hidden flex flex-col justify-center items-center min-h-[80vh] transition-colors duration-500">
        <div className="absolute inset-0 bg-mesh-light dark:opacity-0 transition-opacity duration-500 pointer-events-none" />
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-base-content/75 font-bold tracking-wide">Fetching safety signals...</p>
        </div>
      </div>
    );
  }

  if (!drug && !isSimulated) {
    return (
      <div className="flex-1 bg-base-100 dark:bg-mesh-dark relative overflow-hidden transition-colors duration-500">
        <div className="absolute inset-0 bg-mesh-light dark:opacity-0 transition-opacity duration-500 pointer-events-none" />
        <div className="absolute top-10 left-10 w-72 h-72 hero-glow-blob rounded-full pointer-events-none animate-float opacity-40" />
        
        <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
          <Link to="/" className="btn btn-ghost btn-sm gap-1 pl-1 text-base-content/75 hover:text-primary mb-6 font-semibold">
            ← Back to search
          </Link>

          {isAnalyzing ? (
            /* ANALYZING STEP-BY-STEP PROGRESS SCREEN */
            <div className="saas-card p-8 md:p-12 text-center max-w-2xl mx-auto mt-10">
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  {/* Outer spinning gradient border */}
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                  {/* Inner breathing orb */}
                  <div className="w-16 h-16 bg-gradient-to-tr from-primary to-teal-400 rounded-full animate-pulse flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/30">
                    AI
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-base-content tracking-tight">
                    Running PharmaWatch AI Scanner
                  </h2>
                  <p className="text-sm text-base-content/60 font-semibold max-w-md mx-auto">
                    Analyzing Reddit comments and FAERS data for {displayName} ({genericName || "generic"})
                  </p>
                </div>

                {/* Steps List */}
                <div className="w-full max-w-md space-y-3 mt-6 text-left border border-base-200/50 bg-base-200/20 p-5 rounded-2xl">
                  {[
                    "Discovering subreddits & patient communities...",
                    "Downloading latest patient posts & testimonies...",
                    "Extracting symptoms using BioBERT Named Entity Recognition...",
                    "Comparing signals with FDA labeled adverse events...",
                    "Synthesizing causality scores & timelines..."
                  ].map((step, idx) => {
                    const isDone = analysisStep > idx;
                    const isActive = analysisStep === idx;
                    return (
                      <div key={idx} className="flex items-center gap-3 transition-opacity duration-300">
                        {isDone ? (
                          <div className="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center font-bold text-xs shrink-0">
                            ✓
                          </div>
                        ) : isActive ? (
                          <div className="w-5 h-5 loading loading-spinner loading-xs text-primary shrink-0"></div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-base-content/20 flex items-center justify-center shrink-0"></div>
                        )}
                        <span className={`text-sm font-semibold transition-colors duration-300 ${
                          isDone ? "text-base-content/55 line-through decoration-base-content/30" : 
                          isActive ? "text-primary font-bold animate-pulse-slow" : "text-base-content/40"
                        }`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* PRE-ANALYSIS WELCOME SCREEN */
            <div className="saas-card p-8 md:p-12 text-center max-w-2xl mx-auto mt-10">
              <div className="badge border-none bg-warning/10 text-warning font-bold uppercase tracking-wider text-[10px] px-3.5 py-2 mb-6">
                ⚠️ Scan Available
              </div>
              <h2 className="text-3xl font-black text-base-content tracking-tight mb-2">
                {displayName}
              </h2>
              {genericName && (
                <div className="text-sm font-bold text-primary mb-6">
                  {genericName}
                </div>
              )}
              <p className="text-base text-base-content/70 max-w-md mx-auto leading-relaxed">
                PharmaWatch has not yet indexed side effect signals for this drug from Reddit patient forums. 
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mt-8 text-left text-xs font-semibold text-base-content/65">
                <div className="flex gap-3 items-center bg-base-200/40 p-3 rounded-xl border border-base-200/50">
                  <span className="text-lg">🤖</span>
                  <span>BioBERT NLP Entity Extraction</span>
                </div>
                <div className="flex gap-3 items-center bg-base-200/40 p-3 rounded-xl border border-base-200/50">
                  <span className="text-lg">📈</span>
                  <span>Causality Timeline Mapping</span>
                </div>
                <div className="flex gap-3 items-center bg-base-200/40 p-3 rounded-xl border border-base-200/50">
                  <span className="text-lg">💬</span>
                  <span>Patient Testimonial Scraper</span>
                </div>
                <div className="flex gap-3 items-center bg-base-200/40 p-3 rounded-xl border border-base-200/50">
                  <span className="text-lg">⭐</span>
                  <span>FDA FAERS Lag Cross-check</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={startAnalysis}
                  className="btn btn-primary rounded-full px-8 h-12 font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all text-white bg-gradient-to-r from-primary to-teal-500 border-none cursor-pointer"
                >
                  ✨ Run PharmaWatch NER Pipeline
                </button>
                <Link to="/" className="btn btn-ghost rounded-full px-8 h-12 font-bold hover:bg-base-200">
                  Cancel
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const unlistedSignals = (drug.signals || []).filter((s) => s.listedSimilarity < 0.5);
  const sortedSignals = [...unlistedSignals].sort((a, b) => {
    const order = { validated: 0, strong: 1, moderate: 2, weak: 3 };
    return (order[a.tier] ?? 4) - (order[b.tier] ?? 4);
  });

  const totalReporters = (drug.signals || []).reduce((s, sig) => s + sig.uniqueReporters, 0);
  const highestTier = (drug.signals || []).reduce((best, sig) => {
    const order = { validated: 0, strong: 1, moderate: 2, weak: 3 };
    return (order[sig.tier] ?? 4) < (order[best] ?? 4) ? sig.tier : best;
  }, "weak");

  const allTimeline = {};
  (drug.signals || []).forEach((s) => {
    (s.timeline || []).forEach((t) => {
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

      {/* User Reports Section */}
      <div className="mt-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
          <h2 className="text-xl md:text-2xl font-black text-base-content tracking-tight flex items-center gap-2">
            User Reported Symptoms
            {drug.userReports && drug.userReports.length > 0 && (
              <span className="badge badge-primary badge-sm font-bold">{drug.userReports.length}</span>
            )}
          </h2>
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="btn btn-primary btn-sm rounded-full shadow-md shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Report a Symptom
          </button>
        </div>

        {drug.userReports && drug.userReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drug.userReports.map((report, i) => (
              <div key={i} className="collapse collapse-arrow bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow saas-card">
                <input type="checkbox" />
                <div className="collapse-title p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start w-full">
                    <h3 className="font-bold text-base-content text-lg leading-tight pr-4">{report.symptom}</h3>
                    <span className="badge badge-neutral text-[10px] font-bold uppercase py-2 shrink-0">
                      {report.count} {report.count === 1 ? 'Report' : 'Reports'}
                    </span>
                  </div>
                  {report.reports && report.reports.length > 0 && (
                    <div className="text-xs text-base-content/60 font-medium">
                      Latest by: {report.reports[report.reports.length - 1].reporter}
                    </div>
                  )}
                </div>
                <div className="collapse-content px-4 pb-4">
                  <div className="border-t border-base-200 pt-3 flex flex-col gap-3">
                    {report.reports && report.reports.map((detail, idx) => (
                      <div key={idx} className="bg-base-200/40 p-3 rounded-xl border border-base-200/60">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold">{detail.reporter}</span>
                          <span className="text-[10px] text-base-content/50">{new Date(detail.dateReported).toLocaleDateString()}</span>
                        </div>
                        {detail.description && <p className="text-sm italic mb-2 text-base-content/80">"{detail.description}"</p>}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {detail.duration && <div><span className="font-bold opacity-60 block text-[9px] uppercase">Duration</span>{detail.duration}</div>}
                          {detail.onset && <div><span className="font-bold opacity-60 block text-[9px] uppercase">Onset</span>{detail.onset}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-base-200/50 rounded-2xl border border-base-200/50 border-dashed">
            <p className="text-sm font-semibold text-base-content/60">No community symptoms reported yet. Be the first to share your experience.</p>
          </div>
        )}
      </div>

      {/* Unlisted Signals Title */}
      <div className="mt-10 mb-5">
        <h2 className="text-xl md:text-2xl font-black text-base-content tracking-tight flex items-center gap-2">
          Unlisted Signals Detected
        </h2>
      </div>

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

      {/* Report Symptom Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-base-300/80 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-base-100 rounded-3xl shadow-2xl border border-base-200 p-6 w-full max-w-md animate-fade-in">
            <button 
              onClick={() => setIsReportModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>
            <h3 className="font-black text-xl mb-1 text-base-content tracking-tight">Report a Symptom</h3>
            <p className="py-2 text-sm text-base-content/70">
              Help crowdsource safety signals. If you experienced a side effect while taking <span className="font-bold text-primary">{drug.brand}</span>, let us know.
            </p>
            
            <form onSubmit={handleReportSubmit} className="mt-4 space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Symptom</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Brain fog, Severe joint pain" 
                  className="input input-bordered w-full focus:input-primary transition-colors"
                  value={newSymptomText}
                  onChange={(e) => setNewSymptomText(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Description</span>
                </label>
                <textarea 
                  placeholder="Exactly what is happening?" 
                  className="textarea textarea-bordered w-full h-20 focus:textarea-primary transition-colors"
                  value={newSymptomDesc}
                  onChange={(e) => setNewSymptomDesc(e.target.value)}
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Duration</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. 3 weeks" 
                    className="input input-sm input-bordered w-full focus:input-primary transition-colors"
                    value={newSymptomDuration}
                    onChange={(e) => setNewSymptomDuration(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Onset Time</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2 days after starting" 
                    className="input input-sm input-bordered w-full focus:input-primary transition-colors"
                    value={newSymptomOnset}
                    onChange={(e) => setNewSymptomOnset(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="modal-action mt-6">
                <button 
                  type="button" 
                  className="btn btn-ghost"
                  onClick={() => setIsReportModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmittingReport || !newSymptomText.trim()}
                >
                  {isSubmittingReport ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Submit Report"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
