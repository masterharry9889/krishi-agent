"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getFarmerToken, clearFarmerToken } from "@/lib/api";

import { useRouter } from "next/navigation";

export default function Nav() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsLoggedIn(!!getFarmerToken());
    });
  }, []);

  const links = [
    { href: "#pipeline", label: "The Pipeline" },
    { href: "#data-sources", label: "Data Sources" },
    { href: "#feedback-loop", label: "How It Learns" },
    { href: "#built-for-real", label: "Built For Real" },
  ];

  return (
    <header
      role="banner"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
        background: scrolled
          ? "rgba(248, 244, 238, 0.92)"
          : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(74, 46, 26, 0.12)"
          : "1px solid transparent",
      }}
    >
      <nav
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <a
          href="#"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
          aria-label="Krishi Agent home"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="13" stroke="#C8893A" strokeWidth="1.5" />
            <path
              d="M14 6c0 0-5 4-5 9a5 5 0 0010 0c0-5-5-9-5-9z"
              fill="#2D5A3D"
              opacity="0.9"
            />
            <path d="M14 6v14" stroke="#C8893A" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M9 11c2 1 3 3 5 3s3-2 5-3" stroke="#6BAE85" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              fontSize: "1.125rem",
              color: "var(--green-900)",
              letterSpacing: "0.01em",
            }}
          >
            Krishi Agent
          </span>
        </a>

        {/* Desktop links */}
        <ul
          style={{
            display: "flex",
            gap: "2rem",
            listStyle: "none",
            alignItems: "center",
          }}
          className="hidden-mobile"
        >
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "var(--ink-muted)",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--green-700)")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--ink-muted)")}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isLoggedIn ? (
            <>
              <Link
                href="/farmer/dashboard"
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--green-900)",
                  background: "var(--gold-500)",
                  textDecoration: "none",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "6px",
                  transition: "background 0.2s",
                }}
              >
                🌾 My Farm
              </Link>
              <button
                onClick={() => {
                  clearFarmerToken();
                  setIsLoggedIn(false);
                  router.push("/farmer/login");
                }}
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.7)",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/farmer/login"
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--green-900)",
                background: "var(--gold-500)",
                textDecoration: "none",
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.background = "var(--gold-300)")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.background = "var(--gold-500)")
              }
            >
              Farmer Login
            </Link>
          )}
          <a
            href="#cta"
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "var(--green-700)",
              textDecoration: "none",
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.background = "var(--green-100)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.background = "transparent")
            }
          >
            Partner / FPO
          </a>
          <a
            href="#cta"
            id="nav-cta"
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              background: "var(--green-900)",
              color: "var(--gold-300)",
              textDecoration: "none",
              padding: "0.45rem 1rem",
              borderRadius: "6px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.background = "var(--green-700)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.background = "var(--green-900)")
            }
          >
            Get started
          </a>
          {/* Mobile menu button */}
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "var(--ink)",
            }}
            className="show-mobile"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              {menuOpen ? (
                <>
                  <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <line x1="3" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="3" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="3" y1="17" x2="19" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          style={{
            background: "rgba(248,244,238,0.97)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid var(--dawn-100)",
            padding: "1rem 1.5rem 1.5rem",
          }}
        >
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    fontSize: "1rem",
                    fontWeight: 500,
                    color: "var(--green-800)",
                    textDecoration: "none",
                    display: "block",
                    padding: "0.25rem 0",
                  }}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
        @media (min-width: 768px) {
          .show-mobile { display: none !important; }
          .hidden-mobile { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
