import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema, CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { GoalTracker } from "../codemode/index.js";
import { GOAL_TRACKER_TOOL } from "./tools.js";

interface GoalInput {
  action: "add" | "complete" | "status";
  goal?: string;
}

export function createServer(): Server {
  const version = process.env.PKG_VERSION ?? "0.4.6";
  const server = new Server({ name: "goal-tracker-server", version }, { capabilities: { tools: {} } });
  const tracker = new GoalTracker();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [GOAL_TRACKER_TOOL] }));
  server.setRequestHandler(CallToolRequestSchema, async (req: CallToolRequest) => {
    if (req.params.name === "goalTracker") {
      const input = (req.params.arguments ?? {}) as unknown as GoalInput;
      const goal = input.goal?.trim();

      try {
        switch (input.action) {
          case "add":
            if (!goal) {
              return {
                content: [{ type: "text", text: "Missing parameter: 'goal' required for action 'add'." }],
                isError: true
              };
            }
            tracker.addGoal(goal);
            break;
          case "complete":
            if (!goal) {
              return {
                content: [{ type: "text", text: "Missing parameter: 'goal' required for action 'complete'." }],
                isError: true
              };
            }
            tracker.completeGoal(goal);
            break;
          case "status":
            break;
        }
        return {
          content: [{ type: "json", json: { goals: tracker.getGoals() } }]
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: errorMessage }],
          isError: true
        };
      }
    }
    return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
  });

  return server;
}
