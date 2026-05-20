import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { StructuredArgumentation } from "../codemode/index.js";
import { STRUCTURED_ARGUMENTATION_TOOL } from "./tools.js";

/**
 * Factory function that creates and configures a structured argumentation MCP server instance.
 *
 * @returns A configured Server instance ready for MCP communication
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: "structured-argumentation-server",
      version: "0.4.6"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  const argumentation = new StructuredArgumentation();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [STRUCTURED_ARGUMENTATION_TOOL]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "structuredArgumentation") {
      try {
        const result = await argumentation.processArgument(request.params.arguments);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                  status: "failed"
                },
                null,
                2
              )
            }
          ],
          isError: true
        };
      }
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
