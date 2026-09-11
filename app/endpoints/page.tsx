import Nav from "@/components/Nav";

type Row = { label: string; value: string; href?: string };

const GROUPS: { heading: string; rows: Row[] }[] = [
  {
    heading: "MCP server",
    rows: [
      { label: "Endpoint", value: "https://acdoyle.dev/api/mcp" },
      { label: "Transport", value: "Streamable HTTP" },
      {
        label: "Tool: acdoyle_dispatch",
        value: "Requires api_key, metered per call.",
      },
      {
        label: "Tool: acdoyle_dispatch_x402",
        value: "No key needed, pay-per-call over x402.",
      },
      {
        label: "Registry",
        value:
          "Registered on the official MCP Registry as io.github.granetb-acdoyle/acdoyle.",
      },
    ],
  },
  {
    heading: "REST",
    rows: [
      { label: "POST /api/curate", value: "Requires x-api-key." },
      {
        label: "POST /api/curate/x402",
        value: "x402 pay-per-call, no key needed.",
      },
    ],
  },
  {
    heading: "Discovery",
    rows: [
      { label: "/llms.txt", value: "Machine-readable summary for agents." },
      {
        label: "/.well-known/acdoyle-agent.json",
        value: "Machine-readable agent manifest.",
      },
    ],
  },
  {
    heading: "Source",
    rows: [
      {
        label: "GitHub",
        value: "https://github.com/granetb-acdoyle/acdoyle",
        href: "https://github.com/granetb-acdoyle/acdoyle",
      },
    ],
  },
];

export default function EndpointsPage() {
  return (
    <div className="flex flex-1 flex-col bg-ink">
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-8 py-16 sm:px-16 sm:py-24">
        <h1 className="font-serif text-4xl leading-tight text-parchment sm:text-5xl">
          Endpoints
        </h1>
        <p className="mt-6 max-w-prose text-xl leading-relaxed text-parchment/90">
          Every calling point, catalogued.
        </p>

        <div className="mt-16 flex flex-col gap-16">
          {GROUPS.map((group) => (
            <section key={group.heading}>
              <h2 className="font-serif text-2xl text-parchment">
                {group.heading}
              </h2>
              <dl className="mt-6 flex max-w-prose flex-col gap-3">
                {group.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-0.5 border-b border-sage/10 pb-3 sm:flex-row sm:gap-6"
                  >
                    <dt className="w-56 shrink-0 text-sm text-sage">
                      {row.label}
                    </dt>
                    <dd className="text-sm text-parchment/90">
                      {row.href ? (
                        <a
                          href={row.href}
                          className="text-brass transition-colors hover:text-parchment"
                        >
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
