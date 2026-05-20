import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { BiasDetectionClient } from "../codemode/index.js";
import { BIAS_DETECTION_TOOL } from "./tools.js";
import { BiasDetectionInput } from "../core/types.js";

/**
 * Creates and configures the MCP server.
 */
export function createServer(): Server {
  const server = new Server({ name: "bias-detection-server", version: "0.4.6" }, { capabilities: { tools: {} } });

  const client = new BiasDetectionClient();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [BIAS_DETECTION_TOOL]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req: CallToolRequest) => {
    if (req.params.name === "biasDetection") {
      if (!isValidBiasDetectionInput(req.params.arguments)) {
        return { content: [{ type: "text", text: "Invalid input" }], isError: true };
      }

      const result = await client.detectBias(req.params.arguments);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }]
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      isError: true
    };
  });

  return server;
}

function isValidBiasDetectionInput(args: unknown): args is BiasDetectionInput {
  return (
    typeof args === "object" &&
    args !== null &&
    "text" in args &&
    typeof (args as Record<string, unknown>).text === "string"
  );
}

export async function runServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Bias Detection MCP Server running on stdio");
}
