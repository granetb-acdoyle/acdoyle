import Nav from "@/components/Nav";
import { LedgerIcon } from "@/components/icons";

type Row = { label: string; value: string; href?: string };

type DirectoryEntry = {
  label: string;
  href: string;
  linkText: string;
  status: string;
  note: string;
  badgeSrc?: string;
};

const DIRECTORIES: DirectoryEntry[] = [
  {
    label: "Official MCP Registry",
    href: "https://registry.modelcontextprotocol.io/v0.1/servers/io.github.granetb-acdoyle%2Facdoyle/versions/1.0.1",
    linkText: "io.github.granetb-acdoyle/acdoyle",
    status: "Active",
    note: "Direct JSON record on the official registry.",
  },
  {
    label: "Glama MCP Connector directory",
    href: "https://glama.ai/mcp/connectors/io.github.granetb-acdoyle/acdoyle",
    linkText: "acdoyle on Glama",
    status: "Graded A",
    note: "Auto-indexed and independently scored by Glama, not self-reported.",
    badgeSrc:
      "https://glama.ai/mcp/connectors/io.github.granetb-acdoyle/acdoyle/badges/score.svg",
  },
  {
    label: "Community directory submission",
    href: "https://github.com/punkpeye/awesome-remote-mcp-servers/pull/228",
    linkText: "awesome-remote-mcp-servers PR #228",
    status: "Submission open, checks passing",
    note: "Open pull request with all automated checks passing (endpoint verified, connector badge verified), pending maintainer merge. Not yet merged.",
  },
];

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

function GroupSection({ group }: { group: (typeof GROUPS)[number] }) {
  return (
    <section>
      <h2 className="font-serif text-2xl text-parchment">{group.heading}</h2>
      <dl className="mt-6 flex max-w-prose flex-col gap-3">
        {group.rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-0.5 border-b border-sage/10 pb-3 sm:flex-row sm:gap-6"
          >
            <dt className="w-56 shrink-0 text-sm text-sage">{row.label}</dt>
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
  );
}

export default function EndpointsPage() {
  return (
    <div className="flex flex-1 flex-col bg-ink-gradient">
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-8 py-16 sm:px-16 sm:py-24">
        <div className="flex items-center gap-3">
          <LedgerIcon className="h-9 w-9 text-brass" />
          <h1 className="font-serif text-4xl leading-tight text-parchment sm:text-5xl">
            Endpoints
          </h1>
        </div>
        <p className="mt-6 max-w-prose text-xl leading-relaxed text-parchment/90">
          Every calling point, catalogued.
        </p>

        <div className="mt-16 flex flex-col gap-16">
          {GROUPS.slice(0, -1).map((group) => (
            <GroupSection key={group.heading} group={group} />
          ))}

          <section>
            <h2 className="font-serif text-2xl text-parchment">
              Directories
            </h2>
            <div className="mt-6 flex max-w-prose flex-col gap-4">
              {DIRECTORIES.map((entry) => (
                <div
                  key={entry.label}
                  className="border border-sage/20 px-6 py-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-sage">{entry.label}</p>
                    <span className="text-xs text-brass">{entry.status}</span>
                  </div>
                  <a
                    href={entry.href}
                    className="mt-1 inline-block text-sm text-brass transition-colors hover:text-parchment"
                  >
                    {entry.linkText}
                  </a>
                  <p className="mt-2 text-sm leading-relaxed text-parchment/90">
                    {entry.note}
                  </p>
                  {entry.badgeSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.badgeSrc}
                      alt={`${entry.label} score badge`}
                      className="mt-3 h-5"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          <GroupSection group={GROUPS[GROUPS.length - 1]} />
        </div>
      </main>
    </div>
  );
}
