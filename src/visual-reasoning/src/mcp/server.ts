import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";
import chalk from "chalk";
import { VisualReasoning } from "../codemode/index.js";
import { VISUAL_REASONING_TOOL } from "./tools.js";

/**
 * Factory function that creates and configures a visual reasoning MCP server instance.
 */
export default function createServer(): Server {
  const server = new Server(
    {
      name: "visual-reasoning-server",
      version: "0.4.6"
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    }
  );

  const visualReasoning = new VisualReasoning();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [VISUAL_REASONING_TOOL]
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: []
  }));

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: []
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    if (request.params.name === "visualReasoning") {
      try {
        const result = visualReasoning.processOperation(request.params.arguments);

        // Log the ASCII diagram (which already contains colors from the engine)
        console.error(result.asciiDiagram);

        // Log observations or insights if provided
        if (result.observation) {
          console.error(chalk.cyan("\nOBSERVATION:"));
          console.error(`  ${result.observation}`);
        }

        if (result.insight) {
          console.error(chalk.magenta("\nINSIGHT:"));
          console.error(`  ${result.insight}`);
        }

        if (result.hypothesis) {
          console.error(chalk.yellow("\nHYPOTHESIS:"));
          console.error(`  ${result.hypothesis}`);
        }

        // Return the structured result (excluding the large ASCII string to keep it clean, or maybe keep it?)
        // The original implementation returned a summary.
        // Let's return the summary as JSON.
        const summary = {
          diagramId: result.diagramId,
          diagramType: result.diagramType,
          iteration: result.iteration,
          operation: result.operation,
          elementCount: result.elementCount,
          historyLength: result.historyLength,
          nextOperationNeeded: result.nextOperationNeeded
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2)
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
