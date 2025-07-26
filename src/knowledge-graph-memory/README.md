# Knowledge Graph Memory MCP Server

An improved implementation of persistent memory using a local knowledge graph
with a customizable `--memory-path`.

This lets AI models remember information about the user across chats. It works
with any AI model that supports the Model Context Protocol (MCP) or function
calling capabilities.

> [!NOTE] This is a fork of the original
> [Memory Server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
> and is intended to not use the ephemeral memory npx installation method.

## Server Name

```text
knowledge-graph-memory-server
```

## Core Concepts

### Entities

Entities are the primary nodes in the knowledge graph. Each entity has:

- A unique name (identifier)
- An entity type (e.g., "person", "organization", "event")
- A list of observations

Example:

```json
{
  "name": "John_Smith",
  "entityType": "person",
  "observations": ["Speaks fluent Spanish"]
}
```

### Relations

Relations define directed connections between entities. They are always stored
in active voice and describe how entities interact or relate to each other.

Example:

```json
{
  "from": "John_Smith",
  "to": "ExampleCorp",
  "relationType": "works_at"
}
```

### Observations

Observations are discrete pieces of information about an entity. They are:

- Stored as strings
- Attached to specific entities
- Can be added or removed independently
- Should be atomic (one fact per observation)

Example:

```json
{
  "entityName": "John_Smith",
  "observations": [
    "Speaks fluent Spanish",
    "Graduated in 2019",
    "Prefers morning meetings"
  ]
}
```

## API

### Tools

- **create_entities**
  - Create multiple new entities in the knowledge graph
  - Input: `entities` (array of objects)
    - Each object contains:
      - `name` (string): Entity identifier
      - `entityType` (string): Type classification
      - `observations` (string[]): Associated observations
  - Ignores entities with existing names

- **create_relations**
  - Create multiple new relations between entities
  - Input: `relations` (array of objects)
    - Each object contains:
      - `from` (string): Source entity name
      - `to` (string): Target entity name
      - `relationType` (string): Relationship type in active voice
  - Skips duplicate relations

- **add_observations**
  - Add new observations to existing entities
  - Input: `observations` (array of objects)
    - Each object contains:
      - `entityName` (string): Target entity
      - `contents` (string[]): New observations to add
  - Returns added observations per entity
  - Fails if entity doesn't exist

- **delete_entities**
  - Remove entities and their relations
  - Input: `entityNames` (string[])
  - Cascading deletion of associated relations
  - Silent operation if entity doesn't exist

- **delete_observations**
  - Remove specific observations from entities
  - Input: `deletions` (array of objects)
    - Each object contains:
      - `entityName` (string): Target entity
      - `observations` (string[]): Observations to remove
  - Silent operation if observation doesn't exist

- **delete_relations**
  - Remove specific relations from the graph
  - Input: `relations` (array of objects)
    - Each object contains:
      - `from` (string): Source entity name
      - `to` (string): Target entity name
      - `relationType` (string): Relationship type
  - Silent operation if relation doesn't exist

- **read_graph**
  - Read the entire knowledge graph
  - No input required
  - Returns complete graph structure with all entities and relations

- **search_nodes**
  - Search for nodes based on query
  - Input: `query` (string)
  - Searches across:
    - Entity names
    - Entity types
    - Observation content
  - Returns matching entities and their relations

- **open_nodes**
  - Retrieve specific nodes by name
  - Input: `names` (string[])
  - Returns:
    - Requested entities
    - Relations between requested entities
  - Silently skips non-existent nodes

## Configuration

### Trae IDE

Add this MCP via "Add Manually":

#### bunx

```json
{
  "mcpServers": {
    "Knowledge Graph Memory": {
      "command": "bunx",
      "args": ["-y", "@wemake-ai/mcpserver-knowledge-graph-memory"],
      "autoapprove": [
        "create_entities",
        "create_relations",
        "add_observations",
        "delete_entities",
        "delete_observations",
        "delete_relations",
        "read_graph",
        "search_nodes",
        "open_nodes"
      ]
    }
  }
}
```

### Custom Memory Path

You can specify a custom path for the memory file:

```json
{
  "mcpServers": {
    "Knowledge Graph Memory": {
      "command": "bunx",
      "args": [
        "-y",
        "@wemake-ai/mcpserver-knowledge-graph-memory",
        "--memory-path",
        "/home/alice/project/.wemake/knowledge-graph.json"
      ],
      "autoapprove": [
        "create_entities",
        "create_relations",
        "add_observations",
        "delete_entities",
        "delete_observations",
        "delete_relations",
        "read_graph",
        "search_nodes",
        "open_nodes"
      ]
    }
  }
}
```

If no path is specified, it will default to knowledge-graph.json in the server's
installation directory.

## Data Format

The knowledge graph is stored in a single JSON file with the following
structure:

```json
{
  "entities": [
    {
      "name": "John_Smith",
      "entityType": "person",
      "observations": ["Speaks fluent Spanish"]
    }
    // ... more entities
  ],
  "relations": [
    {
      "from": "John_Smith",
      "to": "ExampleCorp",
      "relationType": "works_at"
    }
    // ... more relations
  ]
}
```

## License

This MCP server is licensed under the MIT License. This means you are free to
use, modify, and distribute the software, subject to the terms and conditions of
the MIT License. For more details, please see the LICENSE file in the project
repository.
