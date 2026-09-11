import { timingSafeEqual } from "node:crypto";
import { supabase } from "@/lib/supabase";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header) return false;

  const expected = `Bearer ${secret}`;
  const headerBuffer = Buffer.from(header);
  const expectedBuffer = Buffer.from(expected);
  if (headerBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(headerBuffer, expectedBuffer);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabase.from("usage_logs").select("id").limit(1);

  if (error) {
    return Response.json(
      { error: `Keep-alive query failed: ${error.message}` },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
