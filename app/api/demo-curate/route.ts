import { POST as curateRoute } from "../curate/route";

const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Per-instance in-memory rate limit. This is a public demo endpoint backed
// by a single capped-credit key — good enough to blunt casual abuse, not a
// substitute for real production rate limiting (resets on redeploy/cold
// start and isn't shared across instances).
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function POST(request: Request) {
  const demoApiKey = process.env.DEMO_API_KEY;
  if (!demoApiKey) {
    return Response.json(
      { error: "DEMO_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const bodyText = await request.text();

  // Forward straight into the real /api/curate handler in-process — same
  // validation, same curation logic, same response shape — just with the
  // server-only demo key attached, so the browser never sees or sends one.
  const forwardedRequest = new Request(new URL("/api/curate", request.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": demoApiKey,
    },
    body: bodyText,
  });

  return curateRoute(forwardedRequest);
}
