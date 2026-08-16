"use client";
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      style={{
        background: "var(--soil-900)",
        borderTop: "1px solid rgba(200,137,58,0.12)",
        padding: "2.5rem 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "2rem",
          alignItems: "center",
        }}
        className="footer-grid"
      >
        {/* Left */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <circle cx="14" cy="14" r="13" stroke="#C8893A" strokeWidth="1.5" />
              <path d="M14 6c0 0-5 4-5 9a5 5 0 0010 0c0-5-5-9-5-9z" fill="#2D5A3D" />
              <path d="M14 6v14" stroke="#C8893A" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-instrument-serif), Georgia, serif",
                fontSize: "1rem",
                color: "var(--gold-300)",
              }}
            >
              Krishi Agent
            </span>
          </div>
          <p
            style={{
              fontSize: "0.8rem",
              color: "rgba(255,255,255,0.3)",
              lineHeight: 1.6,
              maxWidth: "44ch",
            }}
          >
            A LangGraph multi-agent system for Indian agriculture. Soil Health Card ·
            Agmarknet · NDVI · PMFBY · e-NAM. Season-long, not one-shot.
          </p>
        </div>

        {/* Right: links */}
        <nav aria-label="Footer navigation">
          <ul
            style={{
              listStyle: "none",
              display: "flex",
              gap: "1.5rem",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {[
              { label: "Pipeline", href: "#pipeline" },
              { label: "Data Sources", href: "#data-sources" },
              { label: "GitHub", href: "https://github.com", rel: "noopener noreferrer" },
              { label: "Partners", href: "mailto:partners@krishiagent.in" },
            ].map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  rel={l.rel}
                  style={{
                    fontSize: "0.8125rem",
                    color: "rgba(255,255,255,0.35)",
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.color = "var(--gold-300)")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.35)")
                  }
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Bottom */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "1.5rem auto 0",
          paddingTop: "1.25rem",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            color: "rgba(255,255,255,0.2)",
          }}
        >
          © {currentYear} Krishi Agent. Built for the Indian farmer.
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            color: "rgba(255,255,255,0.15)",
          }}
        >
          FarmerState · LangGraph · FastAPI
        </span>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
          .footer-grid nav ul {
            justify-content: flex-start !important;
          }
        }
      `}</style>
    </footer>
  );
}
