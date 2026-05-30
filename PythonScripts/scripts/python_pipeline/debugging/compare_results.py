"""Side-by-side HTML: source text (left) vs adverse-event JSON (right).

Pairs each report with its post/comment via record_id (run pipeline.py first).
"""
from __future__ import annotations

import json
import re
import sys
import webbrowser
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from data_loader.loader import load_all

JSONL = _ROOT / "output" / "adverse_events.jsonl"
OUT_HTML = _ROOT / "output" / "compare_side_by_side.html"
N = 50


def _load_jsonl(limit: int) -> list[dict]:
    lines = JSONL.read_text(encoding="utf-8").splitlines()
    return [json.loads(line) for line in lines[:limit] if line.strip()]


def _record_map() -> dict[str, tuple[str, str]]:
    """record_id -> (original_text, source_type)."""
    _, _, posts, comments = load_all()
    return {
        r.record_id: (r.original_text, r.source_type)
        for r in posts + comments
    }


def _pair_reports(reports: list[dict], rmap: dict[str, tuple[str, str]]) -> list[tuple[str, str, dict]]:
    out: list[tuple[str, str, dict]] = []
    for rep in reports:
        rid = rep.get("record_id")
        if not rid or rid not in rmap:
            raise SystemExit(
                "Reports missing record_id. Re-run: python pipeline.py"
            )
        text, stype = rmap[rid]
        out.append((text, stype, rep))
    return out


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _highlight(text: str, symptom: str) -> str:
    if not symptom:
        return _esc(text)
    m = re.search(re.escape(symptom), text, re.I)
    if not m:
        return _esc(text)
    a, b = m.span()
    return f"{_esc(text[:a])}<mark>{_esc(text[a:b])}</mark>{_esc(text[b:])}"


def _html(rows: list[tuple[str, str, dict]]) -> str:
    body = []
    for i, (text, stype, rep) in enumerate(rows, 1):
        sym = rep.get("symptom", "")
        rid = rep.get("record_id", "?")
        body.append(
            f"""
<section class="card">
  <header>
    <span class="num">#{i}</span>
    <span class="tag tag-{stype}">{stype}</span>
    <span class="rid">id: {_esc(str(rid))}</span>
    <span class="pill">{_esc(rep.get('drug',''))} · {_esc(sym)}</span>
  </header>
  <div class="cols">
    <div class="col left">
      <h4>Source text</h4>
      <div class="textbox">{_highlight(text, sym)}</div>
    </div>
    <div class="col right">
      <h4>Report</h4>
      <pre class="json">{_esc(json.dumps(rep, indent=2))}</pre>
    </div>
  </div>
</section>"""
        )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Adverse events — side by side</title>
<style>
  :root {{
    --bg: #0f172a; --card: #fff; --muted: #64748b; --accent: #2563eb;
    --post: #059669; --comment: #7c3aed; --border: #e2e8f0;
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; font-family: "Segoe UI", system-ui, sans-serif;
          background: linear-gradient(160deg, #0f172a 0%, #1e293b 100%);
          color: #0f172a; min-height: 100vh; }}
  .hero {{ padding: 1.5rem 2rem; color: #f8fafc; }}
  .hero h1 {{ margin: 0 0 0.25rem; font-size: 1.5rem; font-weight: 600; }}
  .hero p {{ margin: 0; color: #94a3b8; font-size: 0.9rem; }}
  .wrap {{ max-width: 1400px; margin: 0 auto; padding: 0 1rem 2rem; }}
  .card {{ background: var(--card); border-radius: 12px; margin-bottom: 1.25rem;
           box-shadow: 0 4px 24px rgba(0,0,0,.25); overflow: hidden; }}
  header {{ display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
            padding: 0.75rem 1rem; background: #f8fafc; border-bottom: 1px solid var(--border); }}
  .num {{ font-weight: 700; color: var(--accent); }}
  .tag {{ font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.04em; padding: 0.2rem 0.5rem; border-radius: 4px; color: #fff; }}
  .tag-post {{ background: var(--post); }}
  .tag-comment {{ background: var(--comment); }}
  .rid {{ font-size: 0.75rem; color: var(--muted); font-family: ui-monospace, monospace; }}
  .pill {{ font-size: 0.8rem; color: #334155; margin-left: auto; }}
  .cols {{ display: grid; grid-template-columns: 1fr 1fr; }}
  @media (max-width: 900px) {{ .cols {{ grid-template-columns: 1fr; }} }}
  .col {{ padding: 1rem 1.25rem; min-width: 0; }}
  .left {{ border-right: 1px solid var(--border); }}
  h4 {{ margin: 0 0 0.6rem; font-size: 0.72rem; text-transform: uppercase;
        letter-spacing: 0.06em; color: var(--muted); }}
  .textbox {{ font-size: 0.88rem; line-height: 1.55; max-height: 22rem; overflow: auto;
              color: #1e293b; }}
  mark {{ background: #fef08a; padding: 0 2px; border-radius: 2px; }}
  pre.json {{ margin: 0; font-size: 0.8rem; line-height: 1.45; background: #f1f5f9;
              padding: 0.75rem; border-radius: 8px; overflow: auto; max-height: 22rem; }}
</style>
</head>
<body>
<div class="hero">
  <h1>Adverse events — source vs extraction</h1>
  <p>{len(rows)} reports · paired by record_id</p>
</div>
<div class="wrap">
{"".join(body)}
</div>
</body>
</html>"""


def main() -> None:
    if not JSONL.exists():
        raise SystemExit(f"Missing {JSONL}. Run: python pipeline.py")

    reports = _load_jsonl(N)
    limit = min(N, len(reports))
    reports = reports[:limit]
    print(f"Pairing {len(reports)} reports to source text...")
    rows = _pair_reports(reports, _record_map())

    OUT_HTML.parent.mkdir(exist_ok=True)
    OUT_HTML.write_text(_html(rows), encoding="utf-8")
    print(f"Wrote {OUT_HTML}")
    webbrowser.open(OUT_HTML.as_uri())


if __name__ == "__main__":
    main()
