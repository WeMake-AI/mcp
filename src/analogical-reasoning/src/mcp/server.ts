import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { AnalogicalReasoning } from "../codemode/index.js";
import { ANALOGICAL_REASONING_TOOL, AnalogicalReasoningSchema } from "./tools.js";

export class AnalogicalReasoningMcpServer {
  private server: Server;
  private reasoning: AnalogicalReasoning;

  constructor() {
    this.reasoning = new AnalogicalReasoning();
    this.server = new Server(
      {
        name: "analogical-reasoning-server",
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
      tools: [ANALOGICAL_REASONING_TOOL]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: toolArgs } = request.params;

      if (name === "analogicalReasoning") {
        const parsed = AnalogicalReasoningSchema.safeParse(toolArgs);
        if (!parsed.success) {
          throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${parsed.error.message}`);
        }

        try {
          const result = this.reasoning.process(parsed.data);

          // Visualization
          const visualization = this.reasoning.visualize(result);
          if (!process.env.AR_SILENT) {
            console.error(visualization);
          }

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    analogyId: result.analogyId,
                    purpose: result.purpose,
                    iteration: result.iteration,
                    sourceDomain: result.sourceDomain.name,
                    targetDomain: result.targetDomain.name,
                    mappingCount: result.mappings.length,
                    inferenceCount: result.inferences.length,
                    nextOperationNeeded: result.nextOperationNeeded,
                    suggestedOperations: result.suggestedOperations
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
                type: "text" as const,
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

      throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${name}`);
    });
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  public async close(): Promise<void> {
    await this.server.close();
  }
}
