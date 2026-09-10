import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type UsageLogRow = {
  created_at: string;
  persona: string | null;
  payment_method: string | null;
  query: string | null;
  tx_hash: string | null;
};

type WatsonDecisionRow = {
  category: string;
  target: string;
  amount_recommended: number;
  status: string;
  created_at: string;
};

type TopupIntentRow = {
  status: string;
  expected_amount: number;
  credits_to_grant: number;
  created_at: string;
  fulfilled_at: string | null;
};

function truncate(text: string | null, maxLength: number): string {
  if (!text) return "—";
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function getDashboardData() {
  const [
    totalCalls,
    sherlockCalls,
    watsonCalls,
    moriartyCalls,
    creditCalls,
    x402Calls,
    totalWatsonDecisions,
    totalFulfilledTopups,
    recentUsageLogs,
    recentWatsonDecisions,
    recentTopups,
  ] = await Promise.all([
    supabase.from("usage_logs").select("*", { count: "exact", head: true }),
    supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("persona", "sherlock"),
    supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("persona", "watson"),
    supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("persona", "moriarty"),
    supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("payment_method", "credit"),
    supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("payment_method", "x402"),
    supabase
      .from("watson_decisions")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("topup_intents")
      .select("*", { count: "exact", head: true })
      .eq("status", "fulfilled"),
    supabase
      .from("usage_logs")
      .select("created_at, persona, payment_method, query, tx_hash")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("watson_decisions")
      .select("category, target, amount_recommended, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("topup_intents")
      .select("status, expected_amount, credits_to_grant, created_at, fulfilled_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    counts: {
      totalCalls: totalCalls.count ?? 0,
      sherlockCalls: sherlockCalls.count ?? 0,
      watsonCalls: watsonCalls.count ?? 0,
      moriartyCalls: moriartyCalls.count ?? 0,
      creditCalls: creditCalls.count ?? 0,
      x402Calls: x402Calls.count ?? 0,
      totalWatsonDecisions: totalWatsonDecisions.count ?? 0,
      totalFulfilledTopups: totalFulfilledTopups.count ?? 0,
    },
    recentUsageLogs: (recentUsageLogs.data ?? []) as UsageLogRow[],
    recentWatsonDecisions: (recentWatsonDecisions.data ?? []) as WatsonDecisionRow[],
    recentTopups: (recentTopups.data ?? []) as TopupIntentRow[],
  };
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-sage/20 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-sage">{label}</p>
      <p className="mt-1 font-serif text-2xl text-parchment">{value}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-serif text-lg text-parchment">{children}</h2>
  );
}

export default async function InternalDashboardPage() {
  const { counts, recentUsageLogs, recentWatsonDecisions, recentTopups } =
    await getDashboardData();

  return (
    <div className="flex flex-1 flex-col bg-ink">
      <main className="mx-auto w-full max-w-5xl px-8 py-16 sm:px-16 sm:py-24">
        <h1 className="font-serif text-xl text-parchment">
          acdoyle — internal dashboard
        </h1>
        <p className="mt-2 text-sm text-sage">
          Read-only activity view. No actions are taken from this page.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total calls" value={counts.totalCalls} />
          <StatCard label="Sherlock calls" value={counts.sherlockCalls} />
          <StatCard label="Watson calls" value={counts.watsonCalls} />
          <StatCard label="Moriarty calls" value={counts.moriartyCalls} />
          <StatCard label="Paid via credit" value={counts.creditCalls} />
          <StatCard label="Paid via x402" value={counts.x402Calls} />
          <StatCard
            label="Watson decisions"
            value={counts.totalWatsonDecisions}
          />
          <StatCard
            label="Fulfilled top-ups"
            value={counts.totalFulfilledTopups}
          />
        </div>

        <div className="mt-16">
          <SectionHeading>Recent activity</SectionHeading>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-sage/20 text-left text-xs uppercase tracking-wide text-sage">
                  <th className="py-2 pr-4 font-normal">Time</th>
                  <th className="py-2 pr-4 font-normal">Persona</th>
                  <th className="py-2 pr-4 font-normal">Payment</th>
                  <th className="py-2 pr-4 font-normal">Query</th>
                  <th className="py-2 pr-4 font-normal">Tx</th>
                </tr>
              </thead>
              <tbody>
                {recentUsageLogs.length === 0 && (
                  <tr>
                    <td className="py-3 text-sage" colSpan={5}>
                      No activity yet.
                    </td>
                  </tr>
                )}
                {recentUsageLogs.map((row, index) => (
                  <tr
                    key={`${row.created_at}-${index}`}
                    className="border-b border-sage/10 text-parchment/90"
                  >
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatTimestamp(row.created_at)}
                    </td>
                    <td className="py-2 pr-4">{row.persona ?? "—"}</td>
                    <td className="py-2 pr-4">{row.payment_method ?? "—"}</td>
                    <td className="py-2 pr-4">{truncate(row.query, 80)}</td>
                    <td className="py-2 pr-4">
                      {row.tx_hash ? (
                        <a
                          href={`https://sepolia.basescan.org/tx/${row.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brass underline underline-offset-2 hover:text-brass/80"
                        >
                          {truncate(row.tx_hash, 10)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-16">
          <SectionHeading>Watson decisions</SectionHeading>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-sage/20 text-left text-xs uppercase tracking-wide text-sage">
                  <th className="py-2 pr-4 font-normal">Category</th>
                  <th className="py-2 pr-4 font-normal">Target</th>
                  <th className="py-2 pr-4 font-normal">Amount</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                  <th className="py-2 pr-4 font-normal">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentWatsonDecisions.length === 0 && (
                  <tr>
                    <td className="py-3 text-sage" colSpan={5}>
                      No Watson decisions yet.
                    </td>
                  </tr>
                )}
                {recentWatsonDecisions.map((row, index) => (
                  <tr
                    key={`${row.created_at}-${index}`}
                    className="border-b border-sage/10 text-parchment/90"
                  >
                    <td className="py-2 pr-4">{row.category}</td>
                    <td className="py-2 pr-4">{row.target}</td>
                    <td className="py-2 pr-4">
                      ${row.amount_recommended.toFixed(2)}
                    </td>
                    <td className="py-2 pr-4">{row.status}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatTimestamp(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-16">
          <SectionHeading>Credit top-ups</SectionHeading>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-sage/20 text-left text-xs uppercase tracking-wide text-sage">
                  <th className="py-2 pr-4 font-normal">Status</th>
                  <th className="py-2 pr-4 font-normal">Expected amount</th>
                  <th className="py-2 pr-4 font-normal">Credits granted</th>
                  <th className="py-2 pr-4 font-normal">Created</th>
                  <th className="py-2 pr-4 font-normal">Fulfilled</th>
                </tr>
              </thead>
              <tbody>
                {recentTopups.length === 0 && (
                  <tr>
                    <td className="py-3 text-sage" colSpan={5}>
                      No top-ups yet.
                    </td>
                  </tr>
                )}
                {recentTopups.map((row, index) => (
                  <tr
                    key={`${row.created_at}-${index}`}
                    className="border-b border-sage/10 text-parchment/90"
                  >
                    <td className="py-2 pr-4">{row.status}</td>
                    <td className="py-2 pr-4">
                      ${Number(row.expected_amount).toFixed(3)}
                    </td>
                    <td className="py-2 pr-4">{row.credits_to_grant}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatTimestamp(row.created_at)}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatTimestamp(row.fulfilled_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
