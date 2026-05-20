import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { SEQUENTIAL_THINKING_TOOL } from "./tools.js";
import { SequentialThinking } from "../codemode/index.js";
import { ThoughtData } from "../core/types.js";

/**
 * Factory function that creates and configures a sequential thinking MCP server instance.
 *
 * This function initializes a Server with the name "sequential-thinking-server" and version "0.4.6",
 * registers the SEQUENTIAL_THINKING_TOOL, and sets up request handlers.
 *
 * @returns A configured Server instance ready for MCP communication
 */
export default function createServer(): Server {
  const server = new Server(
    {
      name: "sequential-thinking-server",
      version: "0.4.6"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // We use the Code Mode API to handle the logic
  const thinking = new SequentialThinking();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [SEQUENTIAL_THINKING_TOOL]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "sequentialthinking") {
      // Cast the arguments to ThoughtData (runtime validation happens inside the tracker)
      const args = request.params.arguments as unknown as ThoughtData;
      return thinking.think(args);
    }

    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${request.params.name}`
        }
      ],
      isError: true
    };
  });

  return server;
}
