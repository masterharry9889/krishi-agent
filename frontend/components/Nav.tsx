"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFarmerToken, clearFarmerToken } from "@/lib/api";
import { Menu, X, Wheat, ArrowRight, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Nav() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsLoggedIn(!!getFarmerToken());
    });
  }, []);

  const navLinks = [
    { href: "#pipeline", label: "Pipeline" },
    { href: "#data-sources", label: "Data Sources" },
    { href: "#feedback-loop", label: "Feedback Loop" },
    { href: "#built-for-real", label: "Field Architecture" },
  ];

  return (
    <header
      role="banner"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border/80 shadow-2xs"
          : "bg-background/60 backdrop-blur-xs border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-1"
          aria-label="Krishi Agent Home"
        >
          <div className="size-8 rounded-lg bg-[#1F3D2B] flex items-center justify-center text-[#D8A94F] shadow-xs group-hover:bg-[#14291D] transition-colors">
            <Wheat className="size-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
              Krishi Agent
              <span className="text-[10px] font-mono font-normal uppercase px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/60">
                v2.4
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Precision Multi-Agent Agronomy
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/admin"
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Shield className="size-3" />
            Admin
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isLoggedIn ? (
            <>
              <Link href="/farmer/dashboard">
                <Button size="sm" variant="default" className="font-medium text-xs">
                  <Wheat className="size-3.5 mr-1" />
                  My Farm
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearFarmerToken();
                  setIsLoggedIn(false);
                  router.push("/farmer/login");
                }}
                className="text-xs"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/farmer/login">
                <Button size="sm" variant="outline" className="text-xs">
                  Farmer Sign In
                </Button>
              </Link>
              <a href="#cta" className="hidden sm:inline-flex">
                <Button size="sm" variant="default" className="text-xs">
                  Register Acreage
                  <ArrowRight className="size-3.5" />
                </Button>
              </a>
            </>
          )}

          {/* Mobile menu trigger */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="md:hidden border-b border-border bg-background/95 backdrop-blur-md px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground py-1.5 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground py-1.5 flex items-center gap-1.5 transition-colors"
            >
              <Shield className="size-3.5" />
              Admin Portal
            </Link>
          </nav>
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            {!isLoggedIn && (
              <a href="#cta" onClick={() => setMenuOpen(false)}>
                <Button size="sm" className="w-full justify-center">
                  Register Acreage
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
