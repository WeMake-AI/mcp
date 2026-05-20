import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { DECISION_FRAMEWORK_TOOL } from "./tools.js";
import { DecisionFramework } from "../codemode/index.js";

export class DecisionFrameworkMCPServer {
  private server: Server;
  private framework: DecisionFramework;

  constructor() {
    this.framework = new DecisionFramework();
    this.server = new Server(
      {
        name: "decision-framework-server",
        version: "0.4.6"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [DECISION_FRAMEWORK_TOOL]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "decisionFramework") {
        try {
          const validatedInput = this.framework.processDecision(request.params.arguments);

          // Generate visualization (side effect as per original implementation, printed to stderr)
          const visualization = this.framework.visualize(validatedInput);
          console.error(visualization);

          // Return the analysis result
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    decisionId: validatedInput.decisionId,
                    decisionStatement: validatedInput.decisionStatement,
                    analysisType: validatedInput.analysisType,
                    stage: validatedInput.stage,
                    iteration: validatedInput.iteration,
                    optionCount: validatedInput.options.length,
                    criteriaCount: validatedInput.criteria?.length || 0,
                    outcomesCount: validatedInput.possibleOutcomes?.length || 0,
                    nextStageNeeded: validatedInput.nextStageNeeded,
                    suggestedNextStage: validatedInput.suggestedNextStage
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
  }

  public async connect(transport: StdioServerTransport): Promise<void> {
    await this.server.connect(transport);
  }
}
