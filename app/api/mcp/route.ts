import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_URL = process.env.ACDOYLE_BASE_URL || "https://acdoyle.dev";

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
        "Get an api_key and top up credit at https://acdoyle.dev.",
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

  server.registerTool(
    "acdoyle_dispatch_x402",
    {
      title: "acdoyle dispatch (x402, no api_key)",
      description:
        "Send a task to acdoyle, an agent-to-agent gateway, with no pre-issued api_key required. acdoyle routes the task to one " +
        "of three specialist personas (Sherlock: general decisive research/recommendation; Watson: budget execution and " +
        "allocation, currently simulated; Moriarty: monetization/opportunity advice) and returns one confident, non-hedged " +
        "answer. This call is gated by the x402 payment protocol instead of a metered api_key: the underlying HTTP request " +
        "may come back as an HTTP 402 with a payment-required challenge (price, network, and payment details) instead of a " +
        "result. If that happens, this tool returns isError: true with the 402 challenge details in its content — the MCP " +
        "client's own HTTP layer (or the calling agent) must complete the x402 payment (sign and attach the payment header) " +
        "and retry the call for it to succeed. Currently Base Sepolia testnet only.",
      inputSchema: {
        task: z
          .string()
          .describe("The task or question for acdoyle to resolve, in plain language. acdoyle's router picks the right specialist."),
      },
    },
    async ({ task }) => {
      const res = await fetch(`${BASE_URL}/api/curate/x402`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ query: task }),
      });

      const text = await res.text();

      if (!res.ok) {
        // The actual 402 challenge (price, network, payTo, asset) travels in
        // the payment-required header, not the JSON body — decode it so the
        // caller gets something actionable instead of an empty "{}" body.
        let details = text;
        const paymentRequiredHeader = res.headers.get("payment-required");
        if (paymentRequiredHeader) {
          try {
            details = JSON.stringify(
              decodePaymentRequiredHeader(paymentRequiredHeader)
            );
          } catch {
            // Fall back to the raw body if the header can't be decoded.
          }
        }
        return {
          isError: true,
          content: [{ type: "text", text: `acdoyle returned ${res.status}: ${details}` }],
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
