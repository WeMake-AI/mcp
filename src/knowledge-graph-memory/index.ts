#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import minimist from "minimist";
import { isAbsolute } from "path";

// Parse args and handle paths safely
const argv = minimist(process.argv.slice(2));
let memoryPath = argv["memory-path"];

// If a custom path is provided, ensure it's absolute
// Before:
// if (memoryPath && !isAbsolute(memoryPath)) {
//   memoryPath = path.resolve(process.cwd(), memoryPath);
// }

// After:
if (memoryPath) {
  // Handle tilde expansion
  if (memoryPath.startsWith("~/")) {
    memoryPath = path.join(
      process.env.HOME || process.env.USERPROFILE || "",
      memoryPath.slice(2)
    );
  }
  if (!isAbsolute(memoryPath)) {
    memoryPath = path.resolve(process.cwd(), memoryPath);
  }
}

// Define the path to the JSON file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// We are storing our memory using entities, relations, and observations in a graph structure
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
export class KnowledgeGraphManager {
  private memoryFilePath: string;

  constructor(memoryFilePath: string) {
    this.memoryFilePath = memoryFilePath;
  }
  private async loadGraph(): Promise<KnowledgeGraph> {
    try {
      const data = await fs.readFile(this.memoryFilePath, "utf-8");
      if (!data.trim()) {
        return { entities: [], relations: [] };
      }
      const graph = JSON.parse(data) as KnowledgeGraph;
      return {
        entities: Array.isArray(graph.entities)
          ? graph.entities.map((e) => ({
              ...e,
              observations: Array.isArray(e.observations) ? e.observations : []
            }))
          : [],
        relations: Array.isArray(graph.relations) ? graph.relations : []
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (("code" in error &&
          (error as Error & { code: string }).code === "ENOENT") ||
          error.name === "SyntaxError")
      ) {
        return { entities: [], relations: [] };
      }
      throw error;
    }
  }

  private async saveGraph(graph: KnowledgeGraph): Promise<void> {
    // Create a clean graph object
    const jsonGraph = {
      entities: graph.entities.map(({ name, entityType, observations }) => ({
        name,
        entityType,
        observations
      })),
      relations: graph.relations.map(({ from, to, relationType }) => ({
        from,
        to,
        relationType
      }))
    };

    await fs.writeFile(this.memoryFilePath, JSON.stringify(jsonGraph, null, 2));
  }

  async createEntities(entities: Entity[]): Promise<Entity[]> {
    // Validate entities
    for (const entity of entities) {
      if (!entity.name || typeof entity.name !== "string") {
        throw new Error("Entity name must be a non-empty string");
      }
      if (!entity.entityType || typeof entity.entityType !== "string") {
        throw new Error("Entity type must be a non-empty string");
      }
      if (!Array.isArray(entity.observations)) {
        throw new Error("Entity observations must be an array");
      }
    }
    const graph = await this.loadGraph();
    const existingNames = new Set(graph.entities.map((e) => e.name));
    const newEntities: Entity[] = [];
    for (const e of entities) {
      if (!existingNames.has(e.name)) {
        newEntities.push(e);
        existingNames.add(e.name);
      }
    }
    graph.entities.push(...newEntities);
    await this.saveGraph(graph);
    return newEntities;
  }

  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const graph = await this.loadGraph();
    const existingRelations = new Set(
      graph.relations.map((r) => `${r.from}|${r.to}|${r.relationType}`)
    );
    const newRelations: Relation[] = [];
    for (const r of relations) {
      const key = `${r.from}|${r.to}|${r.relationType}`;
      if (!existingRelations.has(key)) {
        newRelations.push(r);
        existingRelations.add(key);
      }
    }
    graph.relations.push(...newRelations);
    await this.saveGraph(graph);
    return newRelations;
  }

  async addObservations(
    observations: { entityName: string; contents: string[] }[]
  ): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const graph = await this.loadGraph();
    const results = observations.map((o) => {
      const entity = graph.entities.find((e) => e.name === o.entityName);
      if (!entity) {
        console.error(`Entity with name ${o.entityName} not found`);
        return {
          entityName: o.entityName,
          addedObservations: [],
          error: "Entity not found"
        };
      }
      const newObservations = o.contents.filter(
        (content) => !entity.observations.includes(content)
      );
      entity.observations.push(...newObservations);
      return { entityName: o.entityName, addedObservations: newObservations };
    });
    await this.saveGraph(graph);
    return results;
  }

  async deleteEntities(entityNames: string[]): Promise<number> {
    const graph = await this.loadGraph();
    const setToDelete = new Set(entityNames);
    const initialLength = graph.entities.length;
    graph.entities = graph.entities.filter((e) => !setToDelete.has(e.name));
    graph.relations = graph.relations.filter(
      (r) => !setToDelete.has(r.from) && !setToDelete.has(r.to)
    );
    await this.saveGraph(graph);
    return initialLength - graph.entities.length;
  }

  async deleteObservations(
    deletions: { entityName: string; observations: string[] }[]
  ): Promise<void> {
    const graph = await this.loadGraph();
    deletions.forEach((d) => {
      const entity = graph.entities.find((e) => e.name === d.entityName);
      if (entity) {
        entity.observations = entity.observations.filter(
          (o) => !d.observations.includes(o)
        );
      }
    });
    await this.saveGraph(graph);
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.relations = graph.relations.filter(
      (r) =>
        !relations.some(
          (delRelation) =>
            r.from === delRelation.from &&
            r.to === delRelation.to &&
            r.relationType === delRelation.relationType
        )
    );
    await this.saveGraph(graph);
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return this.loadGraph();
  }

  // Very basic search function
  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();

    // Filter entities
    const filteredEntities = graph.entities.filter(
      (e) =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.entityType.toLowerCase().includes(query.toLowerCase()) ||
        e.observations.some((o) =>
          o.toLowerCase().includes(query.toLowerCase())
        )
    );

    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map((e) => e.name));

    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(
      (r) => filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );

    const filteredGraph: KnowledgeGraph = {
      entities: filteredEntities,
      relations: filteredRelations
    };

    return filteredGraph;
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();

    // Filter entities
    const filteredEntities = graph.entities.filter((e) =>
      names.includes(e.name)
    );

    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map((e) => e.name));

    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(
      (r) => filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );

    const filteredGraph: KnowledgeGraph = {
      entities: filteredEntities,
      relations: filteredRelations
    };

    return filteredGraph;
  }
}

// The server instance and tools exposed to AI models
const server = new Server(
  {
    name: "knowledge-graph-memory-server",
    version: "1.1.4"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);
const listToolsHandler = async () => {
  return { tools: toolSchemas };
};

// Tool argument interfaces
interface CreateEntitiesArgs {
  entities: Entity[];
}

interface CreateRelationsArgs {
  relations: Relation[];
}

interface AddObservationsArgs {
  observations: { entityName: string; contents: string[] }[];
}

interface DeleteEntitiesArgs {
  entityNames: string[];
}

interface DeleteObservationsArgs {
  deletions: { entityName: string; observations: string[] }[];
}

interface DeleteRelationsArgs {
  relations: Relation[];
}

interface SearchNodesArgs {
  query: string;
}

interface OpenNodesArgs {
  names: string[];
}

// Add proper type to request parameter
const callToolHandler = async (request: {
  params: { name: string; arguments?: Record<string, unknown> };
}) => {
  const memoryFilePath =
    process.env.KNOWLEDGE_GRAPH_MEMORY_FILE ||
    path.join(__dirname, "knowledge-graph.json");
  const manager = new KnowledgeGraphManager(memoryFilePath);
  const { name, arguments: args } = request.params;
  if (!args) throw new Error("No arguments provided");
  let result:
    | string
    | Entity[]
    | Relation[]
    | KnowledgeGraph
    | { entityName: string; addedObservations: string[] }[];
  switch (name) {
    case "create_entities":
      result = await manager.createEntities(
        (args as unknown as CreateEntitiesArgs).entities
      );
      break;
    case "create_relations":
      result = await manager.createRelations(
        (args as unknown as CreateRelationsArgs).relations
      );
      break;
    case "add_observations":
      result = await manager.addObservations(
        (args as unknown as AddObservationsArgs).observations
      );
      break;
    case "delete_entities":
      await manager.deleteEntities(
        (args as unknown as DeleteEntitiesArgs).entityNames
      );
      result = "Entities deleted successfully";
      break;
    case "delete_observations":
      await manager.deleteObservations(
        (args as unknown as DeleteObservationsArgs).deletions
      );
      result = "Observations deleted successfully";
      break;
    case "delete_relations":
      await manager.deleteRelations(
        (args as unknown as DeleteRelationsArgs).relations
      );
      result = "Relations deleted successfully";
      break;
    case "read_graph":
      result = await manager.readGraph();
      break;
    case "search_nodes":
      result = await manager.searchNodes(
        (args as unknown as SearchNodesArgs).query
      );
      break;
    case "open_nodes":
      result = await manager.openNodes(
        (args as unknown as OpenNodesArgs).names
      );
      break;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
  return {
    content: [
      { text: typeof result === "string" ? result : JSON.stringify(result) }
    ]
  };
};

// Register handlers with the server
server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);
server.setRequestHandler(CallToolRequestSchema, callToolHandler);

export const testExports =
  process.env.NODE_ENV === "test" || process.env.VITEST
    ? { listToolsHandler, callToolHandler }
    : undefined;

// Define the main function
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Knowledge Graph Memory MCP Server running");
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  main().catch((error: Error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}

const toolSchemas = [
  {
    name: "create_entities",
    description: `Use create_entities to add multiple new entities to the knowledge graph.

MANDATORY PARAMETERS:
- entities (array): List of entity objects, each containing:
  - name (string): Unique identifier for the entity (max 100 characters)
  - entityType (string): Category of the entity (e.g., 'person', 'organization')
  - observations (array of strings): Initial facts or notes about the entity

EXECUTION PROTOCOL:

1. VALIDATION
   - Ensure all entities have unique names not existing in the graph
   - Validate required fields and types for each entity
   - Skip duplicates without error

2. INTEGRATION
   - Add valid entities to the graph
   - Update persistent storage
   - Maintain graph integrity

3. USE CASES
   - Initial population of graph with new concepts
   - Batch addition of related entities
   - Expanding knowledge base with verified information

OUTPUT:
- Array of successfully created entities
- Empty array if all were duplicates or invalid`,
    inputSchema: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              entityType: { type: "string" },
              observations: { type: "array", items: { type: "string" } }
            },
            required: ["name", "entityType", "observations"]
          }
        }
      },
      required: ["entities"]
    }
  },
  {
    name: "create_relations",
    description: `Use create_relations to establish multiple connections between entities.

MANDATORY PARAMETERS:
- relations (array): List of relation objects, each containing:
  - from (string): Source entity name
  - to (string): Target entity name
  - relationType (string): Type of relationship (e.g., 'works_at', 'parent_of')

EXECUTION PROTOCOL:

1. VALIDATION
   - Verify both from and to entities exist
   - Ensure relation doesn't already exist
   - Validate relationType is meaningful

2. INTEGRATION
   - Add valid relations to graph
   - Maintain directed graph structure
   - Update storage

3. USE CASES
   - Defining relationships in knowledge base
   - Building complex entity networks
   - Updating graph structure

OUTPUT:
- Array of successfully created relations`,
    inputSchema: {
      type: "object",
      properties: {
        relations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              relationType: { type: "string" }
            },
            required: ["from", "to", "relationType"]
          }
        }
      },
      required: ["relations"]
    }
  },
  {
    name: "add_observations",
    description: `Use add_observations to append new facts or notes to existing entities in the knowledge graph.

MANDATORY PARAMETERS:
- observations (array): List of observation objects, each containing:
  - entityName (string): Name of the entity to update
  - contents (array of strings): New observations to add

EXECUTION PROTOCOL:

1. VALIDATION
   - Verify each entity exists in the graph
   - Ensure observations are not duplicates
   - Validate input types and structures

2. INTEGRATION
   - Append new observations to matching entities
   - Update persistent storage
   - Maintain data integrity

3. USE CASES
   - Updating entity information with new insights
   - Recording evolving knowledge about entities
   - Enhancing graph with additional details

OUTPUT:
- Array of objects with entityName and addedObservations
- Skips non-existent entities`,
    inputSchema: {
      type: "object",
      properties: {
        observations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityName: { type: "string" },
              contents: { type: "array", items: { type: "string" } }
            },
            required: ["entityName", "contents"]
          }
        }
      },
      required: ["observations"]
    }
  },
  {
    name: "delete_entities",
    description: `Use delete_entities to remove specified entities and their associated relations from the graph.

MANDATORY PARAMETERS:
- entityNames (array of strings): Names of entities to delete

EXECUTION PROTOCOL:

1. VALIDATION
   - Confirm entities exist
   - Identify associated relations

2. DELETION
   - Remove entities and linked relations
   - Update storage

3. USE CASES
   - Cleaning obsolete data
   - Correcting errors in graph

OUTPUT:
- Number of deleted entities`,
    inputSchema: {
      type: "object",
      properties: { entityNames: { type: "array", items: { type: "string" } } },
      required: ["entityNames"]
    }
  },
  {
    name: "delete_observations",
    description: `Use delete_observations to remove specific observations from entities.

MANDATORY PARAMETERS:
- deletions (array): List of deletion objects, each containing:
  - entityName (string): Target entity
  - observations (array of strings): Observations to remove

EXECUTION PROTOCOL:

1. VALIDATION
   - Verify entity and observations exist

2. DELETION
   - Remove matching observations
   - Update storage

3. USE CASES
   - Removing outdated information
   - Correcting inaccurate data

OUTPUT:
- Confirmation message`,
    inputSchema: {
      type: "object",
      properties: {
        deletions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityName: { type: "string" },
              observations: { type: "array", items: { type: "string" } }
            },
            required: ["entityName", "observations"]
          }
        }
      },
      required: ["deletions"]
    }
  },
  {
    name: "delete_relations",
    description: `Use delete_relations to remove specific relationships between entities.

MANDATORY PARAMETERS:
- relations (array): List of relation objects to delete, each with from, to, relationType

EXECUTION PROTOCOL:

1. VALIDATION
   - Confirm relations exist

2. DELETION
   - Remove matching relations
   - Update storage

3. USE CASES
   - Updating graph structure
   - Removing invalid connections

OUTPUT:
- Confirmation message`,
    inputSchema: {
      type: "object",
      properties: {
        relations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              relationType: { type: "string" }
            },
            required: ["from", "to", "relationType"]
          }
        }
      },
      required: ["relations"]
    }
  },
  {
    name: "read_graph",
    description: `Use read_graph to retrieve the entire knowledge graph.

PARAMETERS: None required

EXECUTION PROTOCOL:

1. RETRIEVAL
   - Load complete graph from storage

2. USE CASES
   - Full graph inspection
   - Backup or export

OUTPUT:
- Complete KnowledgeGraph object`,
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "search_nodes",
    description: `Use search_nodes to find entities and relations matching a query.

MANDATORY PARAMETERS:
- query (string): Search term

EXECUTION PROTOCOL:

1. SEARCH
   - Filter entities by name, type, observations
   - Include connected relations

2. USE CASES
   - Querying specific information
   - Discovering related entities

OUTPUT:
- Filtered KnowledgeGraph`,
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"]
    }
  },
  {
    name: "open_nodes",
    description: `Use open_nodes to retrieve specific entities and their direct relations.

MANDATORY PARAMETERS:
- names (array of strings): Entity names to retrieve

EXECUTION PROTOCOL:

1. RETRIEVAL
   - Fetch specified entities
   - Include relations between them

2. USE CASES
   - Detailed view of select entities
   - Analyzing subsets of graph

OUTPUT:
- Filtered KnowledgeGraph with requested nodes`,
    inputSchema: {
      type: "object",
      properties: { names: { type: "array", items: { type: "string" } } },
      required: ["names"]
    }
  }
];

// Remove all unused const wrapper functions and interfaces below this point
// End of file
