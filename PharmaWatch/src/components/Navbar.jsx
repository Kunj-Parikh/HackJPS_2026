import { Link, useLocation } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useTheme } from "../ThemeContext";

export default function Navbar() {
  const { isSignedIn } = useUser();
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  const linkClass = (path) =>
    pathname === path
      ? "text-primary font-medium"
      : "text-base-content/70 hover:text-base-content";

  return (
    <header className="border-b border-base-300 bg-base-100 sticky top-0 z-50">
      <div className="navbar max-w-6xl mx-auto px-4 md:px-6 min-h-14">
        <div className="flex-1">
          <Link
            to="/"
            className="font-display text-lg font-semibold text-base-content tracking-tight normal-case hover:opacity-80"
          >
            PharmaWatch
          </Link>
        </div>

        <div className="flex-none flex items-center gap-3 md:gap-5">
          <nav className="hidden md:flex items-center gap-5 text-sm">
            <Link to="/" className={linkClass("/")}>
              Search
            </Link>
            <Link to="/methodology" className={linkClass("/methodology")}>
              Methodology
            </Link>
            {isSignedIn && (
              <Link to="/dashboard" className={linkClass("/dashboard")}>
                Dashboard
              </Link>
            )}
          </nav>

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === "night" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "night" ? "Light mode" : "Dark mode"}
          >
            {theme === "night" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <div className="flex items-center">
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <div className="flex gap-2">
                <Link to="/sign-in" className="btn btn-ghost btn-sm">
                  Sign in
                </Link>
                <Link to="/sign-up" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>

          <div className="dropdown dropdown-end md:hidden">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-square">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-2 z-[1] p-2 shadow-sm bg-base-100 border border-base-300 rounded-xl w-44">
              <li><Link to="/">Search</Link></li>
              <li><Link to="/methodology">Methodology</Link></li>
              {isSignedIn && <li><Link to="/dashboard">Dashboard</Link></li>}
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
