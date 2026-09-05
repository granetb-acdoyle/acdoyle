"use client";

import { useState, type FormEvent } from "react";

type Recommendation = {
  name: string;
  category: string;
  rationale: string;
  exclusivity_signal: string;
  practical_notes: string;
};

type CurationResult = {
  query_summary: string;
  recommendations: Recommendation[];
  follow_up_questions: string[];
};

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

  const [pick, ...rest] = result?.recommendations ?? [];

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

        {result && !isLoading && (
          <div className="animate-fade-in mt-16">
            <p className="text-sm leading-relaxed text-sage">
              {result.query_summary}
            </p>

            {pick && (
              <div className="mt-8">
                <h2 className="font-serif text-4xl leading-tight text-parchment sm:text-5xl">
                  {pick.name}
                </h2>
                <p className="mt-2 text-sm text-sage">{pick.category}</p>
                <p className="mt-6 text-xl leading-relaxed text-parchment/90">
                  {pick.rationale}
                </p>
                {pick.practical_notes && (
                  <p className="mt-4 text-sm leading-relaxed text-sage">
                    {pick.practical_notes}
                  </p>
                )}
              </div>
            )}

            {rest.length > 0 && (
              <>
                <div className="mt-12 h-px bg-sage/20" />
                <div className="mt-8 flex flex-col gap-6">
                  {rest.map((rec) => (
                    <div key={rec.name}>
                      <p className="text-base text-parchment/80">
                        {rec.name}
                        <span className="text-sage"> · {rec.category}</span>
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-sage">
                        {rec.rationale}
                      </p>
                    </div>
                  ))}
                </div>
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
      </main>
    </div>
  );
}
