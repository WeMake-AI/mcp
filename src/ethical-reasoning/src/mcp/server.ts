import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { EthicalReasoningAPI } from "../codemode/index.js";
import { ETHICAL_REASONING_TOOL } from "./tools.js";

/**
 * Creates and configures the MCP server instance.
 */
export function createServer(): Server {
  const server = new Server({ name: "ethical-reasoning-server", version: "0.4.6" }, { capabilities: { tools: {} } });
  const api = new EthicalReasoningAPI();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [ETHICAL_REASONING_TOOL] }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name === "ethicalReasoning") {
      try {
        const result = await api.analyze(req.params.arguments);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: (error as Error).message }) }],
          isError: true
        };
      }
    }
    return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
  });

  return server;
}
