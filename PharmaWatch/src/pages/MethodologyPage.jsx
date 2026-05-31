import { TIER_CONFIG } from "../data/mockData";

export default function MethodologyPage() {
  const tiers = Object.values(TIER_CONFIG);

  return (
    <div className="page-shell">
      <div className="page-container max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-base-content">
        Methodology
      </h1>
      <p className="text-base text-base-content/65 mt-3 leading-relaxed">
        How we separate genuine adverse reaction signals from noise in patient forums.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-base-content mb-4">
          The verification problem
        </h2>
        <p className="text-sm text-base-content/85 leading-relaxed mb-6 font-medium">
          Not every Reddit post mentioning a drug and a symptom is a valid adverse reaction report. Our system addresses three core challenges:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="panel-card p-5">
            <h3 className="card-title text-base font-bold text-base-content mb-2">Deduplication</h3>
            <p className="text-xs text-base-content/75 leading-relaxed">
              A single user posting in 3 subreddits counts as 1 report, not 3. We hash by (user_id, drug, symptom_cluster) to ensure each person is counted once regardless of how many times or places they post.
            </p>
          </div>
          <div className="panel-card p-5">
            <h3 className="card-title text-base font-bold text-base-content mb-2">Temporal Spike Suppression</h3>
            <p className="text-xs text-base-content/75 leading-relaxed">
              When a news article goes viral, hundreds of "me too" posts appear within 48 hours. If more than 40% of reports arrive within a 7-day window, the spike is flagged as media-driven and suppressed. Organic ADR signals accumulate gradually.
            </p>
          </div>
          <div className="panel-card p-5">
            <h3 className="card-title text-base font-bold text-base-content mb-2">Onset Consistency</h3>
            <p className="text-xs text-base-content/75 leading-relaxed">
              Real pharmacological effects produce consistent timing patterns. If dozens of users independently report "hair loss 3 months after starting," that tight clustering is a strong biological signal. Random timing weakens credibility.
            </p>
          </div>
        </div>
      </section>

      {/* Confidence Tiers */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-base-content mb-4">
          Confidence tiers
        </h2>
        <p className="text-sm text-base-content/85 leading-relaxed mb-5 font-medium">
          Every signal is assigned to one of four confidence tiers based on reporter count, subreddit diversity, and timing consistency:
        </p>
        <div className="overflow-x-auto border border-base-300 rounded-xl">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200 text-base-content/80 text-xs font-bold border-b border-base-300">
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Unique Reporters</th>
                <th className="py-3 px-4">Criteria</th>
              </tr>
            </thead>
            <tbody className="text-xs md:text-sm font-medium">
              {tiers.map((t) => (
                <tr key={t.label} className="border-b border-base-300/60 hover:bg-base-200/20 last:border-0">
                  <td className="py-3.5 px-4 font-medium text-base-content">
                    {t.label}
                  </td>
                  <td className="py-3.5 px-4 text-base-content/80">
                    {t.max ? `${t.min}–${t.max}` : `${t.min}+`}
                  </td>
                  <td className="py-3.5 px-4 text-base-content/70 max-w-sm leading-normal">
                    {t.criteria}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-base-content/60 font-semibold mt-3 italic text-center">
          * Nothing surfaces below 10 unique reporters — this hard floor eliminates anecdotal noise.
        </p>
      </section>

      {/* NLP Extraction Pipeline */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-base-content mb-4">
          NLP extraction pipeline
        </h2>
        <p className="text-sm text-base-content/85 leading-relaxed mb-6 font-medium">
          Raw Reddit text goes through four extraction layers:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="panel-card p-5">
            <h3 className="card-title text-base font-bold text-base-content mb-2">Drug + Symptom NER</h3>
            <p className="text-xs text-base-content/75 leading-relaxed">
              A BioBERT model fine-tuned on the ADE Corpus (23k annotated sentences) identifies drug entities and adverse effect entities in each post. This handles informal language — "the GLP-1 shot," "sema," "Wegovy" all map to semaglutide via RxNorm normalization.
            </p>
          </div>
          <div className="panel-card p-5">
            <h3 className="card-title text-base font-bold text-base-content mb-2">Causality Classifier</h3>
            <p className="text-xs text-base-content/75 leading-relaxed">
              Not every co-mention is a causal report. A binary BERT classifier distinguishes between actual experiences ("Ever since I started Lexapro I've been grinding my teeth") and general questions ("I heard Lexapro can cause teeth grinding, has anyone else had this?").
            </p>
          </div>
          <div className="panel-card p-5">
            <h3 className="card-title text-base font-bold text-base-content mb-2">Onset Extractor</h3>
            <p className="text-xs text-base-content/75 leading-relaxed">
              Regex + dependency parsing extracts time expressions near drug mentions: "after 3 weeks," "two months in," "day 4" — all normalized to onset_days. This enables the onset consistency analysis that separates real signals from noise.
            </p>
          </div>
          <div className="panel-card p-5">
            <h3 className="card-title text-base font-bold text-base-content mb-2">Severity Scorer</h3>
            <p className="text-xs text-base-content/75 leading-relaxed">
              A 1–3 scale based on language cues: "minor annoyance" (1) vs. "had to stop the medication" (2) vs. "went to the ER" (3). Uses rule-based extraction plus sentiment analysis.
            </p>
          </div>
        </div>
      </section>

      {/* Signal Scoring Formula */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-base-content mb-4">
          Signal scoring formula
        </h2>
        <p className="text-sm text-base-content/85 leading-relaxed mb-5 font-medium">
          For each (drug, symptom) pair that passes the minimum threshold, the final score is computed as:
        </p>
        <div className="mockup-code bg-base-200 text-xs md:text-sm border border-base-300 p-4 pl-6 text-primary font-mono shadow-sm">
          <pre><code>signal_score = log(unique_reporters) × causality_avg × onset_consistency × subreddit_diversity_weight</code></pre>
        </div>
        <div className="panel-card p-5 mt-5 text-xs md:text-sm">
          <span className="font-bold text-base-content mb-2 block">Variables explained:</span>
          <ul className="list-disc list-inside space-y-2 text-base-content/75 leading-relaxed">
            <li>
              <strong className="text-base-content">onset_consistency</strong> = 1 / (1 + normalized_std_dev) — tighter onset distributions score higher.
            </li>
            <li>
              <strong className="text-base-content">subreddit_diversity_weight</strong> = 1.5x for 3+ subreddits, 1.2x for 2, 1.0x for 1.
            </li>
            <li>
              <strong className="text-base-content">causality_avg</strong> = mean causality confidence across all reports.
            </li>
          </ul>
        </div>
      </section>

      {/* FDA Label Cross-Reference */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-base-content mb-4">
          FDA label cross-reference
        </h2>
        <p className="text-sm text-base-content/85 leading-relaxed mb-5 font-medium">
          For each detected signal, we query the DailyMed API for the drug's official label and extract the "Adverse Reactions" and "Warnings" sections. We use sentence-transformer embeddings (all-MiniLM-L6-v2) to compute semantic similarity between the detected symptom and every listed side effect.
        </p>
        <div className="panel-card p-5">
          <h3 className="text-base font-semibold text-base-content mb-3">Classification thresholds</h3>
          <div className="space-y-3 text-xs md:text-sm font-medium">
            <div className="flex gap-2 items-center">
              <span className="badge badge-error py-2.5 px-3 font-bold text-error-content w-40 justify-center whitespace-nowrap flex-shrink-0">Similarity &gt; 0.85</span>
              <span className="text-base-content/70">Already listed (filtered out of primary dashboard)</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="badge badge-warning py-2.5 px-3 font-bold text-warning-content w-40 justify-center whitespace-nowrap flex-shrink-0">Similarity 0.5–0.85</span>
              <span className="text-base-content/70">Possibly related (labeled separately in details)</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="badge badge-success py-2.5 px-3 font-bold text-success-content w-40 justify-center whitespace-nowrap flex-shrink-0">Similarity &lt; 0.5</span>
              <span className="text-base-content/70">Unlisted — this is classified as a new safety signal</span>
            </div>
          </div>
          <p className="text-xs text-base-content/65 leading-relaxed mt-4 border-t border-base-200 pt-3">
            Semantic similarity catches equivalences that string matching misses: "jaw clenching" ↔ "bruxism," "hair loss" ↔ "alopecia."
          </p>
        </div>
      </section>

      {/* FAERS Validation */}
      <section className="mt-12 mb-8">
        <h2 className="font-display text-xl font-semibold text-base-content mb-4">
          FAERS validation
        </h2>
        <p className="text-sm text-base-content/85 leading-relaxed mb-5 font-medium">
          The FDA Adverse Event Reporting System (FAERS) is the gold standard for post-market drug safety surveillance. We cross-reference each Reddit signal against FAERS quarterly data dumps to measure detection lag.
        </p>
        <div className="panel-card p-5">
          <h3 className="text-base font-semibold text-base-content mb-2">Example</h3>
          <p className="text-xs md:text-sm text-base-content/75 leading-relaxed">
            <strong>Ozempic (semaglutide) and hair loss:</strong> Reddit communities were discussing this signal in early 2023 with over 200 unique reporters. FAERS didn't cross the threshold until late 2023. The effect is now officially acknowledged. PharmaWatch would have flagged it months earlier.
          </p>
        </div>
      </section>
      </div>
    </div>
  );
}
