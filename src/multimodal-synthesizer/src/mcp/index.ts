import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema, CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { MultimodalSynthesizer } from "../codemode/index.js";
import { MULTIMODAL_SYNTH_TOOL } from "./tools.js";
import { MultimodalInput } from "../core/types.js";

export function createServer(): Server {
  const server = new Server(
    { name: "multimodal-synthesizer-server", version: "0.4.6" },
    { capabilities: { tools: {} } }
  );
  const synthesizer = new MultimodalSynthesizer();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [MULTIMODAL_SYNTH_TOOL] }));
  server.setRequestHandler(CallToolRequestSchema, async (req: CallToolRequest) => {
    if (req.params.name === "multimodalSynth") {
      try {
        const input = req.params.arguments as unknown as MultimodalInput;
        const result = await synthesizer.synthesize(input);
        return { content: [{ type: "json", json: result }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown error" }],
          isError: true
        };
      }
    }
    return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
  });

  return server;
}
