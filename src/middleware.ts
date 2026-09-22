import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight edge guard: only checks that the session cookie exists.
 * better-sqlite3 cannot run in middleware, so real session validation
 * happens per page via requireAdmin() -> getSessionAdmin(token).
 */
const SESSION_COOKIE = "bb_admin";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
