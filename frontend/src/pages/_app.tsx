import type { AppProps } from "next/app";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  AlertTriangle,
  Users,
  Lightbulb,
  Search,
  Sun,
  Moon,
} from "lucide-react";
import "../styles/globals.css";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/ask", label: "Ask AI", icon: MessageSquare },
  { href: "/pain-points", label: "Pain Points", icon: AlertTriangle },
  { href: "/segments", label: "User Segments", icon: Users },
  { href: "/opportunities", label: "AI Opportunities", icon: Lightbulb },
  { href: "/semantic-search", label: "Semantic Search", icon: Search },
];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Theme state — default to dark, load persisted preference from localStorage
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Load saved theme on mount (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("spotify-ai-theme") as "dark" | "light" | null;
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
      }
    }
  }, []);

  const toggleTheme = () => {
    const next: "dark" | "light" = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("spotify-ai-theme", next);
    }
  };

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={`app-shell ${theme}`}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <span
              className="logo-icon"
              style={{ display: "inline-flex", alignSelf: "center", color: "var(--green)" }}
            >
              🎧
            </span>
            <div>
              <span className="logo-text" style={{ fontSize: "16px", display: "block" }}>
                Spotify Compass
              </span>
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--text-faint)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  marginTop: "2px",
                }}
              >
                AI Discovery Companion
              </span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${router.pathname === item.href ? "active" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <span className="model-badge">Spotify Compass</span>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <>
                  <Sun size={14} />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={14} />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="main-content">
          <Component {...pageProps} />
        </main>
      </div>
    </>
  );
}
