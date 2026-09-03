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
      const res = await fetch("/api/curate", {
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
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16 sm:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            asfo
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Tell us what you&apos;re looking for, and we&apos;ll curate it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="A quiet week in the Dolomites for two, mid-October, no crowds"
            disabled={isLoading}
            className="flex-1 rounded-full border border-black/[.08] bg-white px-5 py-3 text-base text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-950 disabled:opacity-60 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="flex h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {isLoading ? "Curating…" : "Curate"}
          </button>
        </form>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950 dark:border-zinc-700 dark:border-t-zinc-50" />
            Curating your recommendations…
          </div>
        )}

        {result && !isLoading && (
          <div className="flex flex-col gap-6">
            <p className="text-lg text-zinc-800 dark:text-zinc-200">
              {result.query_summary}
            </p>

            {result.recommendations.length > 0 && (
              <div className="flex flex-col gap-4">
                {result.recommendations.map((rec) => (
                  <article
                    key={rec.name}
                    className="flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-900"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                        {rec.name}
                      </h2>
                      <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {rec.category}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {rec.rationale}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-500">
                      {rec.practical_notes}
                    </p>
                  </article>
                ))}
              </div>
            )}

            {result.follow_up_questions.length > 0 && (
              <div className="flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-900">
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Follow-up questions
                </h3>
                <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {result.follow_up_questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
