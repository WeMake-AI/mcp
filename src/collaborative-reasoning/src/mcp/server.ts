import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CollaborativeReasoning } from "../codemode/index.js";
import { COLLABORATIVE_REASONING_TOOL } from "./tools.js";

/**
 * Factory function that creates and configures a collaborative reasoning MCP server instance.
 */
export default function createServer(): Server {
  const server = new Server(
    {
      name: "collaborative-reasoning-server",
      version: "0.4.6"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  const collaborativeReasoning = new CollaborativeReasoning();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [COLLABORATIVE_REASONING_TOOL]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "collaborativeReasoning") {
      try {
        const result = await collaborativeReasoning.collaborate(request.params.arguments);

        // Generate visualization
        const visualization = collaborativeReasoning.visualize(result);
        if (process.env.MCP_VISUALIZE !== "0") {
          console.error(visualization);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  sessionId: result.sessionId,
                  topic: result.topic,
                  stage: result.stage,
                  iteration: result.iteration,
                  personaCount: result.personas.length,
                  contributionCount: result.contributions.length,
                  disagreementCount: result.disagreements?.length || 0,
                  activePersonaId: result.activePersonaId,
                  nextPersonaId: result.nextPersonaId,
                  nextContributionNeeded: result.nextContributionNeeded,
                  suggestedContributionTypes: result.suggestedContributionTypes
                },
                null,
                2
              )
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
