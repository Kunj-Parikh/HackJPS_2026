import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-base-300 bg-base-200/50 mt-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-6">
          <Link to="/" className="text-base-content/70 hover:text-base-content">
            Search
          </Link>
          <Link to="/methodology" className="text-base-content/70 hover:text-base-content">
            Methodology
          </Link>
          <Link to="/dashboard" className="text-base-content/70 hover:text-base-content">
            Dashboard
          </Link>
        </nav>
        <p className="text-xs text-base-content/60 leading-relaxed max-w-2xl">
          PharmaWatch is a research tool, not medical advice. Detected signals are statistical patterns from patient reports and should not replace consultation with a healthcare professional.
        </p>
        <p className="text-xs text-base-content/45 mt-4">
          HackJPS 2026
        </p>
      </div>
    </footer>
  );
}
