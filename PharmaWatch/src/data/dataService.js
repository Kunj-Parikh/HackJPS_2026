import DRUGS from './realData.json';

export function getDrugs() {
  return Object.entries(DRUGS).map(([key, d]) => ({ id: key, brand: d.brand, generic: d.generic, class: d.class, signalCount: d.signals.length }));
}

export function getDrug(id) {
  return DRUGS[id] || null;
}

export function getSignal(drugId, symptom) {
  const drug = DRUGS[drugId];
  if (!drug) return null;
  const s = drug.signals.find(s => s.symptom.toLowerCase().replace(/[^a-z0-9]/g, "-") === symptom);
  return s ? { ...s, drugBrand: drug.brand, drugGeneric: drug.generic } : null;
}

export function getAllSignals() {
  const all = [];
  Object.entries(DRUGS).forEach(([id, d]) => {
    d.signals.forEach(s => {
      all.push({ ...s, drugId: id, drugBrand: d.brand, drugGeneric: d.generic });
    });
  });
  return all.sort((a, b) => {
    const order = { validated: 0, strong: 1, moderate: 2, weak: 3 };
    return (order[a.tier] ?? 4) - (order[b.tier] ?? 4) || b.uniqueReporters - a.uniqueReporters;
  });
}

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

export const TIER_CONFIG = {
  weak: { emoji: "🔴", label: "Weak", min: 10, max: 25, criteria: "Single subreddit, varied timing" },
  moderate: { emoji: "🟡", label: "Moderate", min: 25, max: 75, criteria: "2+ subreddits, some timing consistency" },
  strong: { emoji: "🟢", label: "Strong", min: 75, max: 200, criteria: "Multiple subreddits, consistent onset window" },
  validated: { emoji: "⭐", label: "Validated", min: 200, max: null, criteria: "Also appears in FAERS with a lag" }
};

export const GLOBAL_STATS = {
  signalsDetected: getAllSignals().length,
  drugsMonitored: Object.keys(DRUGS).length,
  reportsAnalyzed: getAllSignals().reduce((sum, s) => sum + s.uniqueReporters, 0)
};
