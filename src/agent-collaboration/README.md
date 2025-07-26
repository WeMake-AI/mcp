# Agent Collaboration MCP Server

An enhanced implementation of persistent memory using a local knowledge graph
with comprehensive agent collaboration capabilities and a customizable
`--memory-path`.

This server enables AI models to remember information across chats and provides
advanced features for multi-agent collaboration, including agent registration,
communication, task delegation, resource sharing, and workflow coordination. It
works with any AI model that supports the Model Context Protocol (MCP) or
function calling capabilities.

> [!NOTE] This is a fork of the original
> [Memory Server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
> and is intended to not use the ephemeral memory npx installation method.

## Key Features

- **Knowledge Graph Storage**: Persistent entity-relation-observation model
- **Agent Management**: Registration, status tracking, and discovery
- **Inter-Agent Communication**: Direct messaging, broadcasting, and channels
- **Task Delegation**: Hierarchical task assignment and tracking
- **Resource Sharing**: Secure resource sharing with permission controls
- **Workflow Coordination**: Multi-agent collaborative workflows
- **Event System**: Publish-subscribe event architecture
- **Query & Search**: Advanced search capabilities across agents and workflows

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

### Agent Management Tools

- **register_agent**
  - Register a new agent in the knowledge graph
  - Input: `agentId` (string), `agentType` (string), `capabilities` (string[]),
    `metadata` (object)
  - Creates agent entity with registration timestamp
  - Enables agent discovery and collaboration

- **update_agent_status**
  - Update an agent's current status
  - Input: `agentId` (string), `status` (string), `statusMessage` (string)
  - Tracks agent availability and current activities
  - Supports status types: active, idle, busy, offline, error

- **get_agent_info**
  - Retrieve detailed information about a specific agent
  - Input: `agentId` (string)
  - Returns agent metadata, capabilities, status, and activity history

- **list_active_agents**
  - Get all currently active agents
  - No input required
  - Returns agents with status "active" or "busy"
  - Useful for agent discovery and load balancing

### Workflow Coordination Tools

- **create_workflow**
  - Create a new workflow for task coordination
  - Input: `workflowId` (string), `creatorAgent` (string), `title` (string),
    `description` (string)
  - Establishes workflow entity for task organization

- **assign_task_to_agent**
  - Assign a task within a workflow to a specific agent
  - Input: `workflowId` (string), `taskId` (string), `agentId` (string),
    `taskDescription` (string)
  - Creates task-agent relationships for tracking

- **get_agent_tasks**
  - Retrieve all tasks assigned to a specific agent
  - Input: `agentId` (string)
  - Returns active task assignments across all workflows

### Communication Tools

- **send_agent_message**
  - Send a direct message from one agent to another
  - Input: `fromAgent` (string), `toAgent` (string), `messageContent` (string)
  - Creates timestamped message entities with sender-receiver relations

- **get_agent_messages**
  - Retrieve all messages for a specific agent
  - Input: `agentId` (string)
  - Returns both sent and received messages with timestamps

- **discover_agents**
  - Find agents based on capabilities or type
  - Input: `capabilities` (string[]), `agentType` (string)
  - Enables dynamic agent discovery for task delegation

- **broadcast_message**
  - Send a message to multiple agents simultaneously
  - Input: `fromAgent` (string), `messageContent` (string), `targetAgentTypes`
    (string[])
  - Efficient multi-agent communication

- **subscribe_to_events**
  - Subscribe an agent to specific event types
  - Input: `agentId` (string), `eventTypes` (string[])
  - Enables event-driven agent coordination

- **publish_event**
  - Publish an event to subscribed agents
  - Input: `publisherAgent` (string), `eventType` (string), `eventData` (object)
  - Triggers notifications to relevant agents

- **get_agent_events**
  - Retrieve events for an agent, optionally filtered
  - Input: `agentId` (string), `eventTypes` (string[])
  - Returns relevant events for agent processing

- **create_communication_channel**
  - Create a persistent communication channel
  - Input: `channelId` (string), `creatorAgent` (string), `participants`
    (string[]), `channelType` (string)
  - Supports direct, group, and broadcast channel types

- **send_channel_message**
  - Send a message to a communication channel
  - Input: `channelId` (string), `fromAgent` (string), `messageContent` (string)
  - Enables group communication and message history

- **get_channel_messages**
  - Retrieve messages from a communication channel
  - Input: `channelId` (string), `limit` (number)
  - Returns channel message history

### Resource Management Tools

- **lock_resource**
  - Lock a resource for exclusive or shared access
  - Input: `resourceId` (string), `agentId` (string), `lockType` (string)
  - Prevents resource conflicts in multi-agent environments
  - Supports "exclusive" and "shared" lock types

- **unlock_resource**
  - Release a resource lock
  - Input: `resourceId` (string), `agentId` (string)
  - Frees resources for other agents to use

- **check_resource_status**
  - Check the current lock status of a resource
  - Input: `resourceId` (string)
  - Returns lock information and availability

### Agent Collaboration Utilities

- **delegate_task**
  - Delegate a task from one agent to another
  - Input: `fromAgent` (string), `toAgent` (string), `taskId` (string),
    `taskDescription` (string), `priority` (string), `deadline` (string)
  - Supports hierarchical task delegation with priority and deadline tracking

- **accept_delegation**
  - Accept a delegated task
  - Input: `delegationId` (string), `agentId` (string)
  - Confirms task acceptance and updates delegation status

- **reject_delegation**
  - Reject a delegated task with reason
  - Input: `delegationId` (string), `agentId` (string), `reason` (string)
  - Allows agents to decline tasks with explanation

- **get_agent_delegations**
  - Retrieve all delegations for an agent
  - Input: `agentId` (string), `status` (string)
  - Returns delegations filtered by status: pending, accepted, rejected,
    completed

- **share_resource**
  - Share a resource with other agents
  - Input: `resourceId` (string), `ownerAgent` (string), `sharedWithAgents`
    (string[]), `permissions` (string[]), `expiresAt` (string)
  - Granular permission control: read, write, execute
  - Optional expiration for temporary sharing

- **revoke_resource_share**
  - Revoke resource sharing permissions
  - Input: `resourceId` (string), `ownerAgent` (string), `revokeFromAgents`
    (string[])
  - Removes access for specified agents

- **get_shared_resources**
  - Get all resources shared with an agent
  - Input: `agentId` (string)
  - Returns accessible resources with permission details

- **get_resource_shares**
  - Get sharing information for a specific resource
  - Input: `resourceId` (string)
  - Returns all agents with access and their permissions

- **create_collaborative_workflow**
  - Create a multi-agent collaborative workflow
  - Input: `workflowId` (string), `creatorAgent` (string), `title` (string),
    `description` (string), `participants` (string[]), `workflowType` (string),
    `deadline` (string)
  - Establishes coordinated multi-agent workflows

- **join_workflow**
  - Join an existing collaborative workflow
  - Input: `workflowId` (string), `agentId` (string), `role` (string)
  - Allows dynamic workflow participation

- **leave_workflow**
  - Leave a collaborative workflow
  - Input: `workflowId` (string), `agentId` (string), `reason` (string)
  - Graceful workflow exit with reason tracking

- **update_workflow_status**
  - Update workflow status
  - Input: `workflowId` (string), `agentId` (string), `status` (string),
    `statusMessage` (string)
  - Status types: planning, active, paused, completed, cancelled

- **get_workflow_participants**
  - Get all participants in a workflow
  - Input: `workflowId` (string)
  - Returns participant list with roles and status

- **get_agent_workflows**
  - Get all workflows an agent participates in
  - Input: `agentId` (string), `status` (string)
  - Returns workflow participation filtered by status

### Enhanced Query Tools

- **search_by_agent**
  - Search for entities and relations by agent
  - Input: `agentId` (string)
  - Returns all content created or modified by the specified agent

- **search_by_workflow**
  - Search for entities and relations by workflow
  - Input: `workflowId` (string)
  - Returns all content related to the specified workflow

## Usage Examples

### Basic Agent Registration and Discovery

```javascript
// Register a new agent
register_agent({
  agentId: "data-processor-01",
  agentType: "DataProcessor",
  capabilities: ["data-analysis", "report-generation", "csv-processing"],
  metadata: {
    version: "1.2.0",
    maxConcurrentTasks: 5,
    supportedFormats: ["csv", "json", "xml"]
  }
});

// Discover agents with specific capabilities
discover_agents({
  capabilities: ["data-analysis"],
  agentType: "DataProcessor"
});
```

### Task Delegation Workflow

```javascript
// Agent A delegates a task to Agent B
delegate_task({
  fromAgent: "coordinator-01",
  toAgent: "data-processor-01",
  taskId: "process-sales-data",
  taskDescription: "Process Q4 sales data and generate summary report",
  priority: "high",
  deadline: "2024-01-15T18:00:00Z"
});

// Agent B accepts the delegation
accept_delegation({
  delegationId: "del-12345",
  agentId: "data-processor-01"
});

// Check delegation status
get_agent_delegations({
  agentId: "data-processor-01",
  status: "accepted"
});
```

### Resource Sharing and Management

```javascript
// Share a dataset with multiple agents
share_resource({
  resourceId: "sales-dataset-q4",
  ownerAgent: "data-manager-01",
  sharedWithAgents: ["data-processor-01", "analyst-02"],
  permissions: ["read", "write"],
  expiresAt: "2024-02-01T00:00:00Z"
});

// Lock resource for exclusive access
lock_resource({
  resourceId: "sales-dataset-q4",
  agentId: "data-processor-01",
  lockType: "exclusive"
});

// Check what resources are available to an agent
get_shared_resources({
  agentId: "analyst-02"
});
```

### Collaborative Workflow Management

```javascript
// Create a multi-agent workflow
create_collaborative_workflow({
  workflowId: "quarterly-report-generation",
  creatorAgent: "coordinator-01",
  title: "Q4 Quarterly Report Generation",
  description: "Collaborative workflow for generating comprehensive Q4 reports",
  participants: ["data-processor-01", "analyst-02", "report-generator-03"],
  workflowType: "sequential",
  deadline: "2024-01-20T17:00:00Z"
});

// Agent joins the workflow
join_workflow({
  workflowId: "quarterly-report-generation",
  agentId: "quality-checker-04",
  role: "reviewer"
});

// Update workflow status
update_workflow_status({
  workflowId: "quarterly-report-generation",
  agentId: "coordinator-01",
  status: "active",
  statusMessage: "Data processing phase initiated"
});
```

### Communication and Event System

```javascript
// Create a communication channel
create_communication_channel({
  channelId: "quarterly-report-team",
  creatorAgent: "coordinator-01",
  participants: ["data-processor-01", "analyst-02", "report-generator-03"],
  channelType: "group"
});

// Send message to channel
send_channel_message({
  channelId: "quarterly-report-team",
  fromAgent: "coordinator-01",
  messageContent: "Data processing completed. Ready for analysis phase."
});

// Subscribe to workflow events
subscribe_to_events({
  agentId: "quality-checker-04",
  eventTypes: ["task-completed", "workflow-status-changed"]
});

// Publish an event
publish_event({
  publisherAgent: "data-processor-01",
  eventType: "task-completed",
  eventData: {
    taskId: "process-sales-data",
    status: "completed",
    outputLocation: "/data/processed/sales-q4.json",
    recordsProcessed: 15420
  }
});
```

### Advanced Querying

```javascript
// Search all content created by a specific agent
search_by_agent({
  agentId: "data-processor-01"
});

// Search all content related to a workflow
search_by_workflow({
  workflowId: "quarterly-report-generation"
});

// Search for specific entities with complex criteria
search_nodes({
  query: "agent:data-processor AND status:active AND capability:data-analysis"
});
```

## Configuration

### Trae IDE

Add this MCP via "Add Manually":

#### bunx

```json
{
  "mcpServers": {
    "Agent Collaboration": {
      "command": "bunx",
      "args": ["-y", "@wemake-ai/mcpserver-agent-collaboration"],
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
    "Agent Collaboration": {
      "command": "bunx",
      "args": [
        "-y",
        "@wemake-ai/mcpserver-agent-collaboration",
        "--memory-path",
        "/home/alice/project/.wemake/collaboration.json"
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

If no path is specified, it will default to collaboration.json in the server's
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
