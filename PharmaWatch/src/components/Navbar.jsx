import { Link, useLocation } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useTheme } from "../ThemeContext";

export default function Navbar() {
  const { isSignedIn } = useUser();
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="navbar bg-base-100 border-b border-base-300 px-4 md:px-8 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      {/* Brand logo */}
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl font-black gap-1 tracking-tight text-primary normal-case">
          ⚕ PharmaWatch
        </Link>
      </div>

      {/* Right nav group */}
      <div className="flex-none flex items-center gap-2 md:gap-4 flex-nowrap">
        {/* Desktop Menu */}
        <ul className="menu menu-horizontal px-1 gap-1 hidden md:flex font-medium">
          <li>
            <Link to="/" className={pathname === "/" ? "active text-primary" : "text-base-content/80"}>
              Search
            </Link>
          </li>
          <li>
            <Link to="/methodology" className={pathname === "/methodology" ? "active text-primary" : "text-base-content/80"}>
              Methodology
            </Link>
          </li>
          {isSignedIn && (
            <li>
              <Link to="/dashboard" className={pathname === "/dashboard" ? "active text-primary" : "text-base-content/80"}>
                Dashboard
              </Link>
            </li>
          )}
        </ul>

        {/* Theme Toggle Slider */}
        <label className="theme-switch" aria-label="Toggle Theme">
          <input 
            type="checkbox" 
            checked={theme === "night"} 
            onChange={toggleTheme} 
          />
          <span className="theme-slider"></span>
        </label>

        {/* User Auth Info */}
        <div className="flex items-center">
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <div className="flex gap-2 flex-nowrap">
              <Link to="/sign-in" className="btn btn-outline btn-sm font-semibold whitespace-nowrap">
                Sign In
              </Link>
              <Link to="/sign-up" className="btn btn-primary btn-sm font-bold text-white whitespace-nowrap">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Dropdown Menu */}
        <div className="dropdown dropdown-end md:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 border border-base-300 rounded-box w-52 gap-1"
          >
            <li>
              <Link to="/" className={pathname === "/" ? "active" : ""}>
                Search
              </Link>
            </li>
            <li>
              <Link to="/methodology" className={pathname === "/methodology" ? "active" : ""}>
                Methodology
              </Link>
            </li>
            {isSignedIn && (
              <li>
                <Link to="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
                  Dashboard
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
