import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { FocusGroupServer } from "../codemode/index.js";
import { FOCUS_GROUP_TOOL } from "./tools.js";

/**
 * Creates and configures the Focus Group MCP server instance.
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: "focus-group-server",
      version: "0.4.6"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  const focusGroupServer = new FocusGroupServer();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [FOCUS_GROUP_TOOL]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "focusGroup") {
      try {
        const result = focusGroupServer.processFocusGroup(request.params.arguments);

        // Construct the summary object for the LLM
        const summary = {
          sessionId: result.sessionId,
          targetServer: result.targetServer,
          stage: result.stage,
          iteration: result.iteration,
          personaCount: result.personas.length,
          feedbackCount: result.feedback.length,
          focusAreaCount: result.focusAreaAnalyses?.length || 0,
          activePersonaId: result.activePersonaId,
          nextPersonaId: result.nextPersonaId,
          nextFeedbackNeeded: result.nextFeedbackNeeded,
          suggestedFeedbackTypes: result.suggestedFeedbackTypes,
          suggestedFocusArea: result.suggestedFocusArea
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
