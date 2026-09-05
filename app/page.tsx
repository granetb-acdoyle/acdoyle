"use client";

import { useState, type FormEvent } from "react";

type SherlockResult = {
  problem_summary: string;
  recommendation: string;
  rationale: string;
  caveats: string;
  follow_up_questions: string[];
};

type WatsonDecision = {
  category: string;
  target: string;
  amount: number;
  action: string;
};

type WatsonResult = {
  budget_summary: string;
  decisions: WatsonDecision[];
  total_allocated: number;
  unallocated_remainder: number;
  notes: string;
  commission_rate: number;
  commission_amount: number;
};

type MoriartyResult = {
  opportunity_summary: string;
  recommendation: string;
  rationale: string;
  risk_level: "low" | "medium" | "high";
  follow_up_questions: string[];
  disclaimer: string;
};

type CurationResult = SherlockResult | WatsonResult | MoriartyResult;

function isWatsonResult(result: CurationResult): result is WatsonResult {
  return "decisions" in result;
}

function isMoriartyResult(result: CurationResult): result is MoriartyResult {
  return "risk_level" in result;
}

function isSherlockResult(result: CurationResult): result is SherlockResult {
  return "problem_summary" in result;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CurationResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/demo-curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong.");
      }

      setResult(data as CurationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-ink">
      <main className="max-w-prose px-8 py-16 sm:px-16 sm:py-24">
        <h1 className="font-serif text-xl text-parchment">asfo</h1>

        <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-3">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="A quiet week in the Dolomites for two, mid-October, no crowds"
            disabled={isLoading}
            className="border border-sage/30 bg-transparent px-4 py-3 text-base text-parchment outline-none placeholder:text-sage focus:border-brass disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="self-start border border-sage/30 bg-ink-deep px-5 py-2.5 text-base text-parchment transition-colors hover:border-brass disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className={isLoading ? "animate-pulse" : undefined}>
              {isLoading ? "Curating…" : "Curate"}
            </span>
          </button>
        </form>

        {error && <p className="mt-8 text-sm text-parchment/70">{error}</p>}

        {result && !isLoading && isSherlockResult(result) && (
          <div className="animate-fade-in mt-16">
            <p className="text-sm leading-relaxed text-sage">
              {result.problem_summary}
            </p>

            <div className="mt-8">
              <h2 className="font-serif text-4xl leading-tight text-parchment sm:text-5xl">
                {result.recommendation}
              </h2>
              <p className="mt-6 text-xl leading-relaxed text-parchment/90">
                {result.rationale}
              </p>
            </div>

            {result.caveats && (
              <>
                <div className="mt-12 h-px bg-sage/20" />
                <p className="mt-8 text-sm leading-relaxed text-sage">
                  {result.caveats}
                </p>
              </>
            )}

            {result.follow_up_questions.length > 0 && (
              <div className="mt-12 flex flex-col gap-1.5">
                {result.follow_up_questions.map((question) => (
                  <p key={question} className="text-xs leading-relaxed text-sage/70">
                    {question}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {result && !isLoading && isWatsonResult(result) && (
          <div className="animate-fade-in mt-16 flex flex-col gap-1">
            <p className="text-sm leading-relaxed text-sage">
              {result.budget_summary}
            </p>

            <div className="mt-6 flex flex-col gap-4">
              {result.decisions.map((decision, index) => (
                <div
                  key={`${decision.category}-${decision.target}-${index}`}
                  className="flex flex-col gap-0.5 text-sm leading-relaxed text-parchment/90"
                >
                  <p>
                    <span className="text-sage">Category: </span>
                    {decision.category}
                  </p>
                  <p>
                    <span className="text-sage">Target: </span>
                    {decision.target}
                  </p>
                  <p>
                    <span className="text-sage">Amount: </span>$
                    {decision.amount}
                  </p>
                  <p>
                    <span className="text-sage">Action: </span>
                    {decision.action}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-0.5 text-sm leading-relaxed text-parchment/90">
              <p>
                <span className="text-sage">Total allocated: </span>$
                {result.total_allocated}
              </p>
              <p>
                <span className="text-sage">Unallocated remainder: </span>$
                {result.unallocated_remainder}
              </p>
              <p>
                <span className="text-sage">
                  Commission ({(result.commission_rate * 100).toFixed(0)}%):{" "}
                </span>
                ${result.commission_amount.toFixed(2)}
              </p>
              {result.notes && (
                <p>
                  <span className="text-sage">Notes: </span>
                  {result.notes}
                </p>
              )}
            </div>
          </div>
        )}

        {result && !isLoading && isMoriartyResult(result) && (
          <div className="animate-fade-in mt-16 flex flex-col gap-1">
            <p className="text-sm leading-relaxed text-sage">
              {result.opportunity_summary}
            </p>

            <div className="mt-6 flex flex-col gap-0.5 text-sm leading-relaxed text-parchment/90">
              <p>
                <span className="text-sage">Recommendation: </span>
                {result.recommendation}
              </p>
              <p>
                <span className="text-sage">Rationale: </span>
                {result.rationale}
              </p>
              <p>
                <span className="text-sage">Risk level: </span>
                {result.risk_level}
              </p>
            </div>

            {result.follow_up_questions.length > 0 && (
              <div className="mt-8 flex flex-col gap-1.5">
                {result.follow_up_questions.map((question) => (
                  <p key={question} className="text-xs leading-relaxed text-sage/70">
                    {question}
                  </p>
                ))}
              </div>
            )}

            <p className="mt-8 text-xs leading-relaxed text-sage/70">
              {result.disclaimer}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
