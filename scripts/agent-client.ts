/**
 * Demonstrates agent-to-agent calling: one Claude agent decides to invoke a
 * "curate_travel" tool, this script executes that tool by calling the live
 * acdoyle API over HTTP, and the real API response is handed back to Claude as
 * a tool_result so it can synthesize a final answer grounded in that data.
 */
import Anthropic from "@anthropic-ai/sdk";

const ASFO_API_URL = "https://asfo-ten.vercel.app/api/curate";
const MODEL = "claude-sonnet-5";

const CURATE_TRAVEL_TOOL: Anthropic.Tool = {
  name: "curate_travel",
  description:
    "Get a curated, opinionated luxury travel recommendation for a specific traveler request.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The traveler's request, in natural language.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
};

function maskKey(key: string): string {
  if (key.length <= 8) return "*".repeat(key.length);
  return `${key.slice(0, 4)}...${key.slice(-4)} (${key.length} chars)`;
}

function logStage(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    console.error("Missing ANTHROPIC_API_KEY environment variable.");
    process.exit(1);
  }

  const asfoApiKey = process.env.ASFO_API_KEY;
  if (!asfoApiKey) {
    console.error("Missing ASFO_API_KEY environment variable.");
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  const userMessage: Anthropic.MessageParam = {
    role: "user",
    content:
      "I need a curated travel recommendation for a quiet week in the Dolomites in November.",
  };

  logStage("Stage 1: Sending the initial request to Claude");
  console.log(`Model: ${MODEL}`);
  console.log(`Tool available: ${CURATE_TRAVEL_TOOL.name}`);
  console.log(`User message: "${userMessage.content as string}"`);

  const firstResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "You are an orchestrating agent. When the user asks for a travel recommendation, call the curate_travel tool rather than answering directly.",
    tools: [CURATE_TRAVEL_TOOL],
    tool_choice: { type: "auto" },
    messages: [userMessage],
  });

  const toolUseBlock = firstResponse.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === CURATE_TRAVEL_TOOL.name
  );

  logStage("Stage 2: Claude's tool_use decision");
  if (!toolUseBlock) {
    const textBlock = firstResponse.content.find(
      (block) => block.type === "text"
    );
    console.log(
      "Claude did not call the tool. It responded directly instead:"
    );
    console.log(textBlock && textBlock.type === "text" ? textBlock.text : firstResponse.content);
    return;
  }
  console.log(`Tool: ${toolUseBlock.name}`);
  console.log(`tool_use id: ${toolUseBlock.id}`);
  console.log("Input:", JSON.stringify(toolUseBlock.input, null, 2));

  const toolInput = toolUseBlock.input as { query?: unknown };
  if (typeof toolInput.query !== "string") {
    console.error("Tool input did not include a string \"query\" field.");
    process.exit(1);
  }
  const query = toolInput.query;

  logStage("Stage 3: Making the live HTTP call to the acdoyle API");
  console.log(`POST ${ASFO_API_URL}`);
  console.log("Headers:", {
    "Content-Type": "application/json",
    "x-api-key": maskKey(asfoApiKey),
  });
  console.log("Body:", JSON.stringify({ query }, null, 2));

  const httpResponse = await fetch(ASFO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": asfoApiKey,
    },
    body: JSON.stringify({ query }),
  });

  const apiResult = await httpResponse.json();

  logStage("Stage 4: Raw response from the acdoyle API");
  console.log(`Status: ${httpResponse.status} ${httpResponse.statusText}`);
  console.log(JSON.stringify(apiResult, null, 2));

  logStage("Stage 5: Sending the tool_result back to Claude");
  const toolResultBlock: Anthropic.ToolResultBlockParam = {
    type: "tool_result",
    tool_use_id: toolUseBlock.id,
    content: JSON.stringify(apiResult),
    is_error: !httpResponse.ok,
  };
  console.log(
    "tool_result:",
    JSON.stringify({ ...toolResultBlock, content: "<omitted, see Stage 4>" }, null, 2)
  );

  const secondResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [CURATE_TRAVEL_TOOL],
    messages: [
      userMessage,
      { role: "assistant", content: firstResponse.content },
      { role: "user", content: [toolResultBlock] },
    ],
  });

  const finalTextBlock = secondResponse.content.find(
    (block) => block.type === "text"
  );

  logStage("Stage 6: Claude's final synthesized reply");
  console.log(
    finalTextBlock && finalTextBlock.type === "text"
      ? finalTextBlock.text
      : "(Claude returned no text content.)"
  );
}

main().catch((error) => {
  console.error("Agent-to-agent handshake failed:", error);
  process.exit(1);
});
