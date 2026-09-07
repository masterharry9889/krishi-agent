import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Protect Admin routes ──────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminToken = request.cookies.get("admin_token")?.value;
    if (!adminToken) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 2. Protect Farmer private routes ─────────────────────────────
  // (/farmer/dashboard and /farmer/[id]/...)
  if (
    pathname.startsWith("/farmer") &&
    pathname !== "/farmer/login"
  ) {
    const farmerToken = request.cookies.get("farmer_token")?.value;
    if (!farmerToken) {
      const loginUrl = new URL("/farmer/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/farmer/dashboard/:path*",
    "/farmer/:farmer_id/season/:season_id/:path*",
  ],
};
