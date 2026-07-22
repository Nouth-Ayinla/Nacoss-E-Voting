import { NextRequest, NextResponse } from "next/server";

// Lightweight, Edge-runtime checks only — no DB queries here.
// Election-state and eligibility checks happen inside the route handlers,
// which run on Node.js and can safely query Postgres.
//
// Note: /vote is intentionally NOT gated here. The page itself shows an
// OTP request/verify gate to unauthenticated voters — redirecting away
// at the edge would prevent them from ever reaching that gate.

import { jwtVerify } from "jose";

const ADMIN_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin/dashboard")) {
    const adminSession = req.cookies.get("admin_session")?.value;
    if (!adminSession) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    try {
      await jwtVerify(adminSession, ADMIN_SECRET);
    } catch {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if (pathname.startsWith("/api/admin/") && pathname !== "/api/admin/login") {
    const adminSession = req.cookies.get("admin_session")?.value;
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await jwtVerify(adminSession, ADMIN_SECRET);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*", "/api/admin/:path*"],
};

