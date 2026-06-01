import { useState, useEffect, useRef, useCallback } from "react";
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

  // States for live pipeline analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisMode, setAnalysisMode] = useState(null);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisError, setAnalysisError] = useState(null);
  const pollRef = useRef(null);

  const STAGE_INDEX = {
    collecting: 0,
    extracting: 1,
    linking: 2,
    aggregating: 3,
    done: 4,
  };

  const ANALYSIS_STEPS = [
    "Discovering subreddits & patient communities…",
    "Downloading patient posts & testimonies…",
    "Extracting symptoms (fast lexicon matching)…",
    "Linking drugs to symptoms & filtering reports…",
    "Synthesizing causality scores & timelines…",
  ];

  const displayName = location.state?.brand || (drugName.charAt(0).toUpperCase() + drugName.slice(1).replace(/-/g, " "));
  const genericName = location.state?.generic || "";

  useEffect(() => {
    const cached = sessionStorage.getItem("simulated_drug_" + drugName);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setDrug(parsed);
        setLoading(false);
        return;
      } catch (e) {
        console.error("Error parsing cached scanned drug", e);
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

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollJobStatus = useCallback(
    (jobId) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/analyze/${jobId}`);
          if (!res.ok) throw new Error("Failed to check analysis status");
          const data = await res.json();

          if (data.message) setAnalysisMessage(data.message);
          if (data.stage && STAGE_INDEX[data.stage] !== undefined) {
            setAnalysisStep(STAGE_INDEX[data.stage]);
          }

          if (data.status === "complete" && data.result) {
            stopPolling();
            sessionStorage.setItem("simulated_drug_" + drugName, JSON.stringify(data.result));
            setDrug(data.result);
            setIsAnalyzing(false);
            setAnalysisMode(null);
          } else if (data.status === "error") {
            stopPolling();
            setAnalysisError(data.error || "Analysis failed.");
            setIsAnalyzing(false);
            setAnalysisMode(null);
          }
        } catch (err) {
          stopPolling();
          setAnalysisError(err.message || "Could not reach analysis server.");
          setIsAnalyzing(false);
          setAnalysisMode(null);
        }
      }, 1500);
    },
    [drugName, stopPolling]
  );

  const startAnalysis = async (mode = "quick", isRerun = false) => {
    if (isRerun) {
      sessionStorage.removeItem("simulated_drug_" + drugName);
      setDrug(null);
    }
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setAnalysisMode(mode);
    setAnalysisError(null);
    setAnalysisMessage(mode === "full" ? "Starting full corpus scan…" : "Starting quick scan…");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugName: genericName || displayName,
          brand: displayName,
          generic: genericName || "",
          mode,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Failed to start analysis");
      }

      const { jobId } = await res.json();
      pollJobStatus(jobId);
    } catch (err) {
      setAnalysisError(err.message || "Could not reach analysis server. Is the API running?");
      setIsAnalyzing(false);
      setAnalysisMode(null);
    }
  };

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
      if (drug.isLiveScan) {
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
      <div className="page-shell flex flex-col justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-md text-primary" />
        <p className="text-sm text-base-content/60 mt-4">Loading drug data…</p>
      </div>
    );
  }

  if (!drug) {
    return (
      <div className="page-shell">
        <div className="page-container max-w-4xl">
          <Link to="/" className="btn btn-ghost btn-sm gap-1 pl-1 text-base-content/75 hover:text-primary mb-6 font-semibold">
            ← Back to search
          </Link>

          {isAnalyzing ? (
            /* ANALYZING STEP-BY-STEP PROGRESS SCREEN */
            <div className="panel-card p-8 md:p-10 text-center max-w-2xl mx-auto mt-10">
              <div className="flex flex-col items-center gap-6">
                <span className="loading loading-spinner loading-lg text-primary" />

                <div className="space-y-2">
                  <h2 className="font-display text-xl font-semibold text-base-content">
                    {analysisMode === "full" ? "Running full corpus scan" : "Running quick scan"}
                  </h2>
                  <p className="text-sm text-base-content/60 max-w-md mx-auto">
                    Indexing patient reports for {displayName}
                    {genericName ? ` (${genericName})` : ""}
                  </p>
                  {analysisMessage && (
                    <p className="text-xs text-primary/80 max-w-md mx-auto">{analysisMessage}</p>
                  )}
                </div>

                <div className="w-full max-w-md space-y-2 mt-4 text-left border border-base-300 bg-base-200/40 p-5 rounded-xl">
                  {ANALYSIS_STEPS.map((step, idx) => {
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
                          isActive ? "text-primary font-medium" : "text-base-content/40"
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
            <div className="panel-card p-8 md:p-10 text-center max-w-2xl mx-auto mt-10">
              <p className="text-xs uppercase tracking-wide text-base-content/50 mb-4">
                Not yet indexed
              </p>
              <h2 className="font-display text-2xl font-semibold text-base-content mb-1">
                {displayName}
              </h2>
              {genericName && (
                <p className="text-sm text-primary mb-4">{genericName}</p>
              )}
              <p className="text-sm text-base-content/65 max-w-md mx-auto leading-relaxed">
                We have not pulled Reddit safety signals for this drug yet. Run a quick scan (~200 posts, under a minute) for a fast preview, or a full corpus scan if you have more time.
              </p>

              {analysisError && (
                <div className="alert alert-error text-sm mt-4 max-w-md mx-auto">
                  <span>{analysisError}</span>
                </div>
              )}

              <ul className="text-left text-xs text-base-content/60 max-w-sm mx-auto mt-6 space-y-2 list-disc list-inside">
                <li>Subreddit discovery & post collection</li>
                <li>Symptom extraction (BioBERT NER)</li>
                <li>Drug–symptom linking & filtering</li>
                <li>Signal aggregation & timelines</li>
              </ul>

              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <button type="button" onClick={() => startAnalysis("quick")} className="btn btn-primary px-6">
                  Quick scan (~200 posts)
                </button>
                <button type="button" onClick={() => startAnalysis("full")} className="btn btn-outline btn-primary px-6">
                  Full corpus scan
                </button>
                <Link to="/" className="btn btn-ghost px-6">
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
    <div className="page-shell">
      <div className="page-container">
      {/* Back button */}
      <Link to="/" className="btn btn-ghost btn-sm gap-1 pl-1 text-base-content/75 hover:text-primary mb-6 font-semibold">
        ← Back to search
      </Link>

      {drug.isLiveScan && (
        <div className="alert alert-info mb-6 text-sm">
          <span>
            Live scan preview
            {drug.scanMode === "full" ? " (full corpus)" : " (quick, ~200 posts)"}
            {drug.records_analyzed != null && ` — ${drug.records_analyzed} Reddit records analyzed`}
            . Results are session-only and not FDA-validated.
          </span>
          {!isAnalyzing && (
            <div className="flex gap-2 shrink-0">
              {drug.scanMode !== "full" && (
                <button
                  type="button"
                  className="btn btn-xs btn-primary"
                  onClick={() => startAnalysis("full", true)}
                >
                  Full corpus scan
                </button>
              )}
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={() => startAnalysis(drug.scanMode === "full" ? "full" : "quick", true)}
              >
                Re-run scan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Drug Header Card */}
      <div className="panel-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="font-display text-3xl font-semibold text-base-content">{drug.brand}</h1>
            <div className="text-sm font-bold text-primary mt-1">
              {drug.generic} • <span className="opacity-90">{drug.class}</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-xs font-semibold text-base-content/70">
              <div>
                <span className="block text-[10px] uppercase tracking-wide text-base-content/50 mb-0.5">
                  FDA Approved
                </span>
                <span>
                  {drug.approvalDate && drug.approvalDate !== "Unknown"
                    ? new Date(drug.approvalDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wide text-base-content/50 mb-0.5">
                  Indications
                </span>
                <span>{(drug.indications || []).length ? drug.indications.join(", ") : "—"}</span>
              </div>
            </div>
          </div>

          {/* Stats widget inside header */}
          <div className="stats stats-horizontal bg-base-100 border border-base-300/60 w-full md:w-auto rounded-xl overflow-hidden">
            <div className="stat text-center py-3 px-4 md:px-6">
              <div className="stat-title text-[9px] uppercase tracking-wide text-base-content/50">
                Unlisted Signals
              </div>
              <div className="stat-value text-lg md:text-xl font-extrabold text-base-content mt-0.5">
                {unlistedSignals.length}
              </div>
            </div>
            <div className="stat text-center py-3 px-4 md:px-6 border-x border-base-300/60">
              <div className="stat-title text-[9px] uppercase tracking-wide text-base-content/50">
                Total Reporters
              </div>
              <div className="stat-value text-lg md:text-xl font-extrabold text-base-content mt-0.5">
                {totalReporters.toLocaleString()}
              </div>
            </div>
            <div className="stat text-center py-3 px-4 md:px-6">
              <div className="stat-title text-[9px] uppercase tracking-wide text-base-content/50">
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
      <div className="collapse collapse-plus border border-base-300 bg-base-100 mt-6 rounded-xl overflow-hidden">
        <input type="checkbox" checked={showListed} onChange={() => setShowListed(!showListed)} />
        <div className="collapse-title text-sm font-bold text-base-content flex justify-between items-center pr-12">
          <span>Known Side Effects (FDA Label)</span>
          <span className="badge badge-neutral font-bold text-xs py-2.5 px-3 bg-base-200">
            {(drug.listedEffects || []).length} listed
          </span>
        </div>
        <div className="collapse-content">
          <div className="flex flex-wrap gap-1.5 pt-2">
            {(drug.listedEffects || []).map((e) => (
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
          <h2 className="font-display text-lg font-semibold text-base-content flex items-center gap-2">
            User-reported symptoms
            {drug.userReports && drug.userReports.length > 0 && (
              <span className="badge badge-primary badge-sm font-bold">{drug.userReports.length}</span>
            )}
          </h2>
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="btn btn-primary btn-sm"
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
              <div key={i} className="collapse collapse-arrow panel-card">
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

      {timelineData.length > 0 && (
        <div className="mt-10">
          <TimelineChart data={timelineData} />
        </div>
      )}

      {/* Unlisted Signals Title */}
      <div className="mt-10 mb-5">
        <h2 className="font-display text-lg font-semibold text-base-content">
          Unlisted signals
        </h2>
      </div>

      {/* Grid of Signals */}
      {sortedSignals.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedSignals.map((s, i) => (
          <SignalCard key={s.symptom} signal={s} drugId={drugName} />
        ))}
      </div>
      ) : (
        <div className="text-center p-8 bg-base-200/50 rounded-2xl border border-base-200/50 border-dashed">
          <p className="text-sm font-semibold text-base-content/60">
            No unlisted signals detected in this scan. Try the full corpus scan for more coverage.
          </p>
        </div>
      )}

      {/* Charts Section */}
      {timelineData.length > 0 && (
        <div className="mt-12">
          <TimelineChart data={timelineData} />
        </div>
      )}

      </div>

      {/* Report Symptom Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-base-300/80 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-base-100 rounded-2xl shadow-lg border border-base-300 p-6 w-full max-w-md">
            <button 
              onClick={() => setIsReportModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>
            <h3 className="font-display text-lg font-semibold mb-1 text-base-content">Report a symptom</h3>
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
