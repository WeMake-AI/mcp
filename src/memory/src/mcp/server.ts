import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import { fileURLToPath } from "url";
import { MemoryGraph, Entity, Relation } from "../codemode/index.js";
import { tools } from "./tools.js";

// Define memory file path using environment variable with fallback
const defaultMemoryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../memory.jsonl");

export function createServer(): Server {
  const MEMORY_FILE_PATH = process.env.MEMORY_FILE_PATH
    ? path.isAbsolute(process.env.MEMORY_FILE_PATH)
      ? process.env.MEMORY_FILE_PATH
      : path.join(path.dirname(fileURLToPath(import.meta.url)), "../../", process.env.MEMORY_FILE_PATH)
    : defaultMemoryPath;

  const memoryGraph = new MemoryGraph(MEMORY_FILE_PATH);

  const server = new Server(
    {
      name: "memory-server",
      version: "0.4.6"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Validation helper functions
    const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
    const validateArray = <T>(value: unknown, validator: (item: unknown) => item is T): value is T[] => {
      return Array.isArray(value) && value.every(validator);
    };
    const validateEntity = (item: unknown): item is Entity => {
      return (
        isObj(item) &&
        typeof (item as Record<string, unknown>).name === "string" &&
        typeof (item as Record<string, unknown>).entityType === "string" &&
        Array.isArray((item as Record<string, unknown>).observations)
      );
    };
    const validateRelation = (item: unknown): item is Relation => {
      return (
        isObj(item) &&
        typeof (item as Record<string, unknown>).from === "string" &&
        typeof (item as Record<string, unknown>).to === "string" &&
        typeof (item as Record<string, unknown>).relationType === "string"
      );
    };
    const validateObservation = (item: unknown): item is { entityName: string; contents: string[] } => {
      return (
        isObj(item) &&
        typeof (item as Record<string, unknown>).entityName === "string" &&
        Array.isArray((item as Record<string, unknown>).contents)
      );
    };
    const validateDeletion = (item: unknown): item is { entityName: string; observations: string[] } => {
      return (
        isObj(item) &&
        typeof (item as Record<string, unknown>).entityName === "string" &&
        Array.isArray((item as Record<string, unknown>).observations)
      );
    };

    if (name === "read_graph") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(await memoryGraph.readGraph(), null, 2)
          }
        ]
      };
    }

    if (!isObj(args)) {
      throw new Error(`No arguments provided for tool: ${name}`);
    }

    switch (name) {
      case "create_entities":
        if (!validateArray(args.entities, validateEntity)) {
          throw new Error(`Invalid entities array for tool: ${name}`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await memoryGraph.createEntities(args.entities), null, 2)
            }
          ]
        };
      case "create_relations":
        if (!validateArray(args.relations, validateRelation)) {
          throw new Error(`Invalid relations array for tool: ${name}`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await memoryGraph.createRelations(args.relations), null, 2)
            }
          ]
        };
      case "add_observations":
        if (!validateArray(args.observations, validateObservation)) {
          throw new Error(`Invalid observations array for tool: ${name}`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await memoryGraph.addObservations(args.observations), null, 2)
            }
          ]
        };
      case "search_nodes":
        if (typeof args.query !== "string") {
          throw new Error(`Invalid query parameter for tool: ${name}`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await memoryGraph.searchNodes(args.query), null, 2)
            }
          ]
        };
      case "open_nodes":
        if (!Array.isArray(args.names) || !args.names.every((n: unknown) => typeof n === "string")) {
          throw new Error(`Invalid names array for tool: ${name}`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await memoryGraph.openNodes(args.names as string[]), null, 2)
            }
          ]
        };
      case "delete_entities":
        if (!Array.isArray(args.entityNames) || !args.entityNames.every((n: unknown) => typeof n === "string")) {
          throw new Error(`Invalid entityNames array for tool: ${name}`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await memoryGraph.deleteEntities(args.entityNames as string[]), null, 2)
            }
          ]
        };
      case "delete_observations":
        if (!validateArray(args.deletions, validateDeletion)) {
          throw new Error(`Invalid deletions array for tool: ${name}`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await memoryGraph.deleteObservations(args.deletions), null, 2)
            }
          ]
        };
      case "delete_relations":
        if (!validateArray(args.relations, validateRelation)) {
          throw new Error(`Invalid relations array for tool: ${name}`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await memoryGraph.deleteRelations(args.relations), null, 2)
            }
          ]
        };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

export async function runServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Knowledge Graph MCP Server running on stdio");
}
