import Nav from "@/components/Nav";
import { FingerprintIcon, LedgerIcon } from "@/components/icons";

const STACK = [
  { label: "Runtime", value: "Next.js + TypeScript on Vercel" },
  { label: "Database", value: "Supabase (Postgres)" },
  { label: "Model", value: "Claude (Anthropic API)" },
  { label: "Chain", value: "Base, Sepolia testnet today" },
  { label: "On-chain detection", value: "Alchemy" },
  { label: "x402 settlement", value: "Coinbase Developer Platform" },
];

export default function TechPage() {
  return (
    <div className="flex flex-1 flex-col bg-ink-gradient">
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-8 py-16 sm:px-16 sm:py-24">
        <h1 className="font-serif text-4xl leading-tight text-parchment sm:text-5xl">
          Built for agents, not humans reading a dashboard
        </h1>

        <div className="mt-16 flex flex-col gap-16">
          <section className="max-w-prose">
            <h2 className="font-serif text-2xl text-parchment">
              A gateway, not a chatbot
            </h2>
            <p className="mt-4 text-base leading-relaxed text-parchment/90">
              One dispatch endpoint (/api/curate). Forced tool-choice across
              three tool definitions means Claude picks exactly one
              specialist and answers fully within that same call: no
              separate classification round-trip, no extra cost burned on
              routing.
            </p>
          </section>

          <section className="max-w-prose">
            <div className="flex items-center gap-3">
              <FingerprintIcon className="h-8 w-8 text-brass" />
              <h2 className="font-serif text-2xl text-parchment">
                Findable without a human reading docs
              </h2>
            </div>
            <p className="mt-4 text-base leading-relaxed text-parchment/90">
              /llms.txt and /.well-known/acdoyle-agent.json give any agent a
              machine-readable summary of what acdoyle does and how to pay.
              It&apos;s also registered on the official MCP Registry as
              io.github.granetb-acdoyle/acdoyle, and reachable directly as an
              MCP tool over streamable HTTP. Two tools are exposed there:
              acdoyle_dispatch, metered by API key, and
              acdoyle_dispatch_x402, pay-per-call with no key needed.
            </p>
          </section>

          <section className="max-w-prose">
            <h2 className="font-serif text-2xl text-parchment">
              No hedging, by construction
            </h2>
            <p className="mt-4 text-base leading-relaxed text-parchment/90">
              Numbers and disclaimers never come from the model:
              Watson&apos;s commission, Moriarty&apos;s disclaimer, and
              upsell pricing are all computed server-side and spliced into
              the response afterward. Every persona is instructed to assume
              and proceed on anything unstated rather than ask a follow-up
              question.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3">
              <LedgerIcon className="h-8 w-8 text-brass" />
              <h2 className="font-serif text-2xl text-parchment">Stack</h2>
            </div>
            <dl className="mt-6 flex max-w-prose flex-col gap-3">
              {STACK.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-0.5 border-b border-sage/10 pb-3 sm:flex-row sm:gap-6"
                >
                  <dt className="w-48 shrink-0 text-sm text-sage">
                    {item.label}
                  </dt>
                  <dd className="text-sm text-parchment/90">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
