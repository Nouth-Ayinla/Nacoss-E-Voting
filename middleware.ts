import { NextRequest, NextResponse } from "next/server";

// Lightweight, Edge-runtime checks only — no DB queries here.
// Election-state and eligibility checks happen inside the route handlers,
// which run on Node.js and can safely query Postgres.
//
// Note: /vote is intentionally NOT gated here. The page itself shows an
// OTP request/verify gate to unauthenticated voters — redirecting away
// at the edge would prevent them from ever reaching that gate.

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin/dashboard")) {
    const adminSession = req.cookies.get("admin_session");
    if (!adminSession) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};

