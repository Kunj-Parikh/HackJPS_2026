import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer footer-center bg-base-200 text-base-content p-8 md:p-12 border-t border-base-300 mt-auto">
      <nav className="grid grid-flow-col gap-6 font-medium">
        <Link to="/" className="link link-hover text-base-content/80 hover:text-primary">
          Search
        </Link>
        <Link to="/methodology" className="link link-hover text-base-content/80 hover:text-primary">
          Methodology
        </Link>
        <Link to="/dashboard" className="link link-hover text-base-content/80 hover:text-primary">
          Dashboard
        </Link>
      </nav>
      <aside className="max-w-xl text-center text-xs text-base-content/70 leading-relaxed">
        <p className="mb-3">
          PharmaWatch is a research tool and does not provide medical advice. Signals detected are statistical patterns and should not replace consultation with a healthcare professional. Always talk to your doctor about medication concerns.
        </p>
        <p className="font-semibold">
          Built by <span className="text-primary font-bold">PharmaWatch</span> — Hackathon 2026
        </p>
      </aside>
    </footer>
  );
}
