import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_URL = process.env.ASFO_BASE_URL || "https://asfo-ten.vercel.app";

function buildServer() {
  const server = new McpServer({
    name: "acdoyle",
    version: "1.0.0",
  });

  server.registerTool(
    "acdoyle_dispatch",
    {
      title: "acdoyle dispatch",
      description:
        "Send a task to acdoyle, an agent-to-agent gateway. acdoyle routes the task to one of three specialist personas " +
        "(Sherlock: general decisive research/recommendation; Watson: budget execution and allocation, currently simulated; " +
        "Moriarty: monetization/opportunity advice) and returns one confident, non-hedged answer. " +
        "Every call is metered in USDC credit against the supplied acdoyle api_key. " +
        "Get an api_key and top up credit at https://asfo-ten.vercel.app.",
      inputSchema: {
        task: z
          .string()
          .describe("The task or question for acdoyle to resolve, in plain language. acdoyle's router picks the right specialist."),
        api_key: z
          .string()
          .describe("Your acdoyle API key, used to meter and authorize this call."),
      },
    },
    async ({ task, api_key }) => {
      const res = await fetch(`${BASE_URL}/api/curate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": api_key,
        },
        body: JSON.stringify({ query: task }),
      });

      const text = await res.text();

      if (!res.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `acdoyle returned ${res.status}: ${text}` }],
        };
      }

      return { content: [{ type: "text", text }] };
    }
  );

  return server;
}

async function handle(req: NextRequest) {
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export { handle as GET, handle as POST, handle as DELETE };
