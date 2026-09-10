import { NextRequest, NextResponse } from "next/server";

const UNAUTHORIZED_RESPONSE = () =>
  new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="internal"' },
  });

export function middleware(request: NextRequest) {
  const dashboardUser = process.env.DASHBOARD_USER;
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;

  if (!dashboardUser || !dashboardPassword) {
    console.error(
      "DASHBOARD_USER / DASHBOARD_PASSWORD not configured — denying access to /internal."
    );
    return UNAUTHORIZED_RESPONSE();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return UNAUTHORIZED_RESPONSE();
  }

  const decoded = atob(authHeader.slice("Basic ".length));
  const separatorIndex = decoded.indexOf(":");
  const user = separatorIndex === -1 ? decoded : decoded.slice(0, separatorIndex);
  const password = separatorIndex === -1 ? "" : decoded.slice(separatorIndex + 1);

  if (user !== dashboardUser || password !== dashboardPassword) {
    return UNAUTHORIZED_RESPONSE();
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/internal/:path*",
};
